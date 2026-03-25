var readInstalled = require('../read-installed.js')
var test = require('tap').test
var path = require('path');

function allValid(t, map) {
  var deps = Object.keys(map.dependencies || {})
  deps.forEach(function (dep) {
    t.ok(map.dependencies[dep].extraneous, 'dependency ' + dep + ' of ' + map.name + ' is extraneous')
  })
}

test('grandparent dev peer dependencies should be extraneous', function(t) {
  readInstalled(
    path.join(__dirname, 'fixtures/grandparent-peer-dev'),
    { log: console.error },
    function(err, map) {
      allValid(t, map)
      t.end()
    })
})
