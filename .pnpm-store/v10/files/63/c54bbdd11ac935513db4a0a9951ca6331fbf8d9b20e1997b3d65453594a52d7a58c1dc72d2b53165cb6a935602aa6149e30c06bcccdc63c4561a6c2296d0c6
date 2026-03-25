var lunr = require('../lunr.js'),
    assert = require('chai').assert,
    fs = require('fs'),
    path = require('path')

var withFixture = function (name, fn) {
  var fixturePath = path.join('test', 'fixtures', name)
  fs.readFile(fixturePath, fn)
}

global.lunr = lunr
global.assert = assert
global.withFixture = withFixture
