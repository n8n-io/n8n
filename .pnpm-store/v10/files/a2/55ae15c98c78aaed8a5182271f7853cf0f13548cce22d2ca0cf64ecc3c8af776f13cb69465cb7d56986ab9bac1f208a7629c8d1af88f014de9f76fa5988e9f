'use strict';

var Assert = require('assert')
var Constants = require('./')

try {
  var nodeConstants = require('constants')

  Assert.deepEqual(nodeConstants, Constants, 'The constants file was not equal')
}

catch (e) {
  console.error(e)
  console.error('\nTests failed!')
  process.exit(1)
}

console.info('Tests passed!')
