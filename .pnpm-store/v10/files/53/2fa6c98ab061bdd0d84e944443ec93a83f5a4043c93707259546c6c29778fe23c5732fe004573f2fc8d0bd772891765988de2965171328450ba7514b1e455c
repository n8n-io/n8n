var readInstalled = require('../read-installed.js')
var test = require('tap').test
var path = require('path');

function allValid(t, map) {
  var deps = Object.keys(map.dependencies || {})
  deps.forEach(function (dep) {
    t.notOk(map.dependencies[dep].invalid, 'dependency ' + dep + ' of ' + map.name + ' is not invalid')
    t.notOk(typeof map.dependencies[dep] === 'string', 'dependency ' + dep + ' of ' + map.name + ' is not missing')
  })
  deps.forEach(function (dep) {
    allValid(t, map.dependencies[dep])
  })
}

test('grandparent can satisfy peer dependencies', function(t) {
  readInstalled(
    path.join(__dirname, 'fixtures/grandparent-peer'),
    { log: console.error },
    function(err, map) {
      allValid(t, map)
      t.end()
    })
})
