'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.map');
require('../../modules/esnext.map.of');
var path = require('../../internals/path');
var apply = require('../../internals/function-apply');
var isCallable = require('../../internals/is-callable');

var Map = path.Map;
var mapOf = Map.of;

module.exports = function of() {
  return apply(mapOf, isCallable(this) ? this : Map, arguments);
};
