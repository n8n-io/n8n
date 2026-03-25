var readInstalled = require('../read-installed.js')
var test = require('tap').test
var path = require('path');

test('"latest" version is valid', function(t) {
  // This test verifies npm#3860
  readInstalled(
    path.join(__dirname, 'fixtures/peer-at-latest'),
    { log: console.error },
    function(err, map) {
      t.notOk(map.dependencies.debug.invalid, 'debug@latest is satisfied by a peer')
      t.end()
    })
})
