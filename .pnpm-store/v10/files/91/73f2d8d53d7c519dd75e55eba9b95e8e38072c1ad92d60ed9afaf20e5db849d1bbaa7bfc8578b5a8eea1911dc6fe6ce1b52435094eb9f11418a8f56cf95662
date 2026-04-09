'use strict';
require('../../modules/es.map');
require('../../modules/esnext.map.key-by');
var call = require('../../internals/function-call');
var isCallable = require('../../internals/is-callable');
var path = require('../../internals/path');

var Map = path.Map;
var mapKeyBy = Map.keyBy;

module.exports = function keyBy(source, iterable, keyDerivative) {
  return call(mapKeyBy, isCallable(this) ? this : Map, source, iterable, keyDerivative);
};
