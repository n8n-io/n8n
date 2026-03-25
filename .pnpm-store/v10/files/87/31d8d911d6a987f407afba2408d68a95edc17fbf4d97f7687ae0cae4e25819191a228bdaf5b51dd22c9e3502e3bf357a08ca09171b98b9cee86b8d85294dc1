var fs = require('fs');
var parser = require('../index');

var codes = [
  "# test\n my.key=\"value\"\nother = 101\nthird = -37",
  "first = 1.2\nsecond = -56.02\nth = true\nfth = false",
  "time = 1979-05-27T07:32:00Z",
  "test = [\"one\", ]",
  "test = [[1, 2,], [true, false,],]",
  "[my.sub.path]\nkey = true\nother = -15.3\n[my.sub]\nkey=false",
  "arry = [\"one\", \"two\",\"thr\nee\", \"\\u03EA\"]",
  fs.readFileSync(__dirname + '/example.toml', 'utf8'),
  fs.readFileSync(__dirname + '/hard_example.toml', 'utf8')
]

console.log("=============================================");
for(i in codes) {
  var code = codes[i];
  console.log(code + "\n");
  console.log(JSON.stringify(parser.parse(code)));
  console.log("=============================================");
}
