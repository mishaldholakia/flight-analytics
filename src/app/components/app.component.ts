import { Component, OnInit } from '@angular/core';
import {FormControl} from '@angular/forms';


declare var mapboxgl: any;
declare var turf: any;
declare var ApexCharts: any;


declare function require(arg:string): any;
const environment = require('../../assets/auth/token.json');
const airports = 'https://raw.githubusercontent.com/mishaldholakia/large-airports/master/airport.geojson'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  public title = 'flight-analytics';
  source = [];
  minDate: Date;
  maxDate: Date;
  tmpDate = '';



  // Select calendar
  updateCalcs(event){
    var date_test = new Date(event.value);
    this.tmpDate = (date_test.getFullYear()).toString() + (('0' + (date_test.getMonth() + 1)).slice(-2)).toString() + (('0' + date_test.getDate()).slice(-2)).toString();
    // console.log(this.tmpDate);
    localStorage.setItem('date', this.tmpDate);
  }

  constructor() {
    // Set the minimum to January 1st 20 years in the past and December 31st a year in the future.
    const currentYear = new Date().getFullYear();
    this.minDate = new Date(currentYear, 0, 1);
    this.maxDate = new Date(currentYear, 2, 31);
  }

  async ngOnInit() {

    localStorage.setItem('tmpChartFlag', 'false');
    

    mapboxgl.accessToken =environment.access_token;
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v10',
        center: [-50, -10.8],
        zoom: 1,
        minZoom: 1,
      });
      
      map.on('load', function() {
        window.setInterval(function() {
        map.getSource('airports').setData(airports);
        }, 2000);
        map.addSource('airports', { type: 'geojson', data: airports});
        map.addLayer({
          'id': 'airports',
          'source': 'airports',
          'type': 'symbol',
          'layout': {
          'icon-image': 'airport-15'
          }
          });
        });

        map.on('click', 'airports', async function (e) {

          let tmpDate = localStorage.getItem('date');
          if(!tmpDate)
          tmpDate = '20200123';
          let tmpSource = e.features[0].geometry.coordinates
          this.source=[...tmpSource];
          
          // Selected airport code clicked on Map
          let airportCode = e.features[0].properties.iata_code;

          localStorage.setItem('airport', e.features[0].properties.name);
          console.log(e.features[0].properties,);

          
          
          
          // Parse the date to match the API
          let apiDate = tmpDate
          apiDate = apiDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
          

          // Returns an array of dates between the two dates
          var getDates = function(startDate, endDate) {
            var dates = [],
                currentDate = startDate,
                addDays = function(days) {
                  var date = new Date(this.valueOf());
                  date.setDate(date.getDate() + days);
                  return date;
                };
            while (currentDate <= endDate) {
              dates.push(currentDate);
              currentDate = addDays.call(currentDate, 1);
            }
            return dates;
          };

          // Usage
          var dates = getDates(new Date(2019,12,1), new Date());
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
          ];
          let calendarData = [];
          calendarData.push(`31-Dec-19`)
          dates.forEach(function(date) {
            let tmp = date.getMonth();
            let currentDay = (date.getDate()).toString();
            let currentMonth = monthNames[tmp];
            let currentYear = (date.getFullYear().toString().substr(-2)).toString();
            let currentDate = `${currentDay}-${currentMonth}-${currentYear}`;
            calendarData.push(currentDate);
          });

          let countryAllUrl = `${environment.url}covid-aggregated?date=${apiDate}&country=${e.features[0].properties.iso_country}`

          let totalCovidData = new Promise(function(resolve, reject) {
            // Fetch countryAll covid data
            fetch(countryAllUrl)
            .then((response) => {
              return response.json();
            }).then((data) => {
              resolve(data.data);
            })
          })


          let getTotalFlightsUrl = `https://covid19-flight.hpai.cloud/allFlights?airport=${airportCode}`;

          let totalFlightsData = new Promise(function(resolve, reject) {
            
          // Fetch total country flights data
            fetch(getTotalFlightsUrl)
            .then((response) => {              
              return response.json();
            }).then((data) => {
              let income = [];

              for(var propName in data) {
                if(data.hasOwnProperty(propName)) {
                  var propValue = data[propName];
                  income.push(propValue);
                }
              }
              if(income.length>0)
              {
                resolve(income);
              }
            })
          })

          Promise.all([totalFlightsData, totalCovidData]).then((values: any[]) => {

            let airport = localStorage.getItem('airport');
            let country = localStorage.getItem('country');

            let heading = `Airport: ${airport} & Country: ${country}`;
      
            let flight = values[0];
            flight.length=values[1].length;

            var options = {
              series: [{
              name: 'Flight',
              type: 'line',
              data: values[0]
            }, {
              name: 'COVID',
              type: 'line',
              data: values[1]
            }],
              chart: {
              height: 300,
              type: 'line',
              stacked: false,
              zoom: {
                type: 'x',
                enabled: true,
                autoScaleYaxis: true
              }
            },
            colors: ['#0f6dff', '#d6316c'],
            stroke: {
              width: [1, 1]
            },
            xaxis: {
              type: 'datetime',
              categories: calendarData
            },
            yaxis: [
              {
                axisTicks: {
                  show: true,
                },
                axisBorder: {
                  show: true,
                  color: '#0f6dff'
                },
                labels: {
                  style: {
                    colors: '#0f6dff',
                  }
                },
                title: {
                  text: "Total flights",
                  style: {
                    color: '#0f6dff',
                  }
                },
                tooltip: {
                  enabled: true
                },
              },
              {
                opposite: true,
                axisTicks: {
                  show: true,
                },
                axisBorder: {
                  show: true,
                  color: '#d6316c'
                },
                labels: {
                  style: {
                    colors: '#d6316c',
                  }
                },
                title: {
                  text: "Total COVID confirmed cases",
                  style: {
                    color: '#d6316c',
                  }
                },
                tooltip: {
                  enabled: true
                }
              },
            ],
            tooltip: {
              fixed: {
                enabled: true,
                shared: true,
                intersect: false,
                position: 'topLeft', // topRight, topLeft, bottomRight, bottomLeft
                offsetY: 30,
                offsetX: 60,
                followCursor: true,
              },
            },
            title: {
              text: heading,
              align: 'left',
              margin: 10,
              offsetX: 0,
              offsetY: 0,
              floating: false,
              style: {
                fontSize:  '14px',
                fontWeight:  'bold',
                fontFamily:  undefined,
                color:  '#263238'
              },
          },
            legend: {
              horizontalAlign: 'right',
              offsetY: 10,
              position: 'top',
              tooltipHoverFormatter: function(seriesName, opts) {
                return seriesName + ' - <strong>' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + '</strong>'
            }
            }
            };
  
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
  
            let tmpflag = localStorage.getItem('tmpChartFlag')
            if(tmpflag==='true'){
              chart.updateOptions(options);
            }
            localStorage.setItem('tmpChartFlag', 'true');


          });
          
          let worldUrl = `${environment.url}worldwide-aggregated?date=${apiDate}`
          document.getElementById("dateData").innerHTML = apiDate;


          // Fetch world covid data
          fetch(worldUrl)
          .then((response) => {
            return response.json();
          }).then((data) => {
            // console.log(data);
            document.getElementById("worldConfirmedData").innerHTML = data.Confirmed;
            document.getElementById("worldRecoveredData").innerHTML = data.Recovered;
            document.getElementById("worldDeathData").innerHTML = data.Deaths;
          })

          // Fetch country covid data
          let countryUrl = `${environment.url}country-aggregated?date=${apiDate}&country=${e.features[0].properties.iso_country}`
          fetch(countryUrl)
          .then((response) => {
            return response.json();
          }).then((data) => {
            // console.log(data);
            localStorage.setItem('country', data.Country);
            document.getElementById("countryName").innerHTML = data.Country;
            document.getElementById("countryConfirmedData").innerHTML = data.Confirmed;
            document.getElementById("countryRecoveredData").innerHTML = data.Recovered;
            document.getElementById("countryDeathData").innerHTML = data.Deaths;
          })

          // Fetch the total flights
          // let url = `https://cors-anywhere.herokuapp.com/https://covid19-flight.hpai.cloud/?airport=${airportCode}&date=${dateStr}`;
          let url = `https://covid19-flight.hpai.cloud/?airport=${airportCode}&date=${tmpDate}`;
          // console.log(url);
          fetch(url)
          .then((response) => {
            return response.json();
          }).then((data) => {
            let tmpLength = Object.keys(data).length;
            // console.log(Object.keys(data).length);
            document.getElementById("totalFlights").innerHTML = tmpLength.toString();
            if(tmpLength>0){
              data.forEach(element => {
              try {
                let destination = [element.longitude_deg, element.latitude_deg];
              var route = {
                'type': 'FeatureCollection',
                'features': [
                {
                  'type': 'Feature',
                  'geometry': {
                  'type': 'LineString',
                  'coordinates': [this.source, destination]
                  }
                }
              ]};
              
              var lineDistance = turf.lineDistance(route.features[0], 'kilometers');
              var arc = [];
              var steps = 500;
              
              // Draw an arc between the `origin` & `destination` of the two points
              for (var i = 0; i < lineDistance; i += lineDistance / steps) {
              var segment = turf.along(route.features[0], i, 'kilometers');
              arc.push(segment.geometry.coordinates);
              }
              
              // Update the route with calculated arc coordinates
              route.features[0].geometry.coordinates = arc;
                map.addSource(element.arrival_time+element.iata_code, {
                    'type': 'geojson',
                    'data': route
                  });
                
                map.addLayer({
                    'id': element.arrival_time+element.iata_code,
                    'source': element.arrival_time+element.iata_code,
                    'type': 'line',
                    'paint': {
                    'line-width': 2,
                    'line-color': '#007cbf'
                  }
                });
                setTimeout(() => {
                  map.removeLayer(element.arrival_time+element.iata_code);
                  map.removeSource(element.arrival_time+element.iata_code);
                }, 6000);
                
              } catch (error) {
                console.log(error);
                
              }
              });
          }
          else{
            document.getElementById("status").innerHTML = " No flight data found";
            setTimeout(() => {
              document.getElementById("status").innerHTML = "";
            }, 5000);
          }
            })
        })

        var popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
          });
        map.on('mouseenter', 'airports', function(e) {
          // Change the cursor style as a UI indicator.
          map.getCanvas().style.cursor = 'pointer';
          let description = e.features[0].properties.name;
          let coordinates = e.features[0].geometry.coordinates.slice();
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            popup
            .setLngLat(coordinates)
            .setHTML(description)
            .addTo(map);
          // console.log(e.features[0].properties.name);
        })
        map.on('mouseleave', 'airports', function() {
          map.getCanvas().style.cursor = '';
          popup.remove();
          });
  }

  fetchUrl(url) {




  }
}