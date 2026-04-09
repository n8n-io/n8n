'use strict';
var $ = require('../internals/export');
var global = require('../internals/global');
var clearImmediate = require('../internals/task').clear;

// `clearImmediate` method
// http://w3c.github.io/setImmediate/#si-clearImmediate
$({ global: true, bind: true, enumerable: true, forced: global.clearImmediate !== clearImmediate }, {
  clearImmediate: clearImmediate
});
