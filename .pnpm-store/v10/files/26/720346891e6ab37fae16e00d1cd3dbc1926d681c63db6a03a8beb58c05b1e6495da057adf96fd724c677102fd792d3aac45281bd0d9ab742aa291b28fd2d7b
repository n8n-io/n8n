var toml = require('./index');
var fs = require('fs');
var data = fs.readFileSync('./test/example.toml', 'utf8');

var iterations = 1000;

var start = new Date();
for(var i = 0; i < iterations; i++) {
  toml.parse(data);
}
var end = new Date();
console.log("%s iterations in %sms", iterations, end - start);
