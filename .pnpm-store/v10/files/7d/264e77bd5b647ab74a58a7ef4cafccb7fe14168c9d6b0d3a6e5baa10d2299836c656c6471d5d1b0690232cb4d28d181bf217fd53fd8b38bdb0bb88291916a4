'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.set');
require('../../modules/es.string.iterator');
require('../../modules/esnext.set.from');
require('../../modules/web.dom-collections.iterator');
var call = require('../../internals/function-call');
var isCallable = require('../../internals/is-callable');
var path = require('../../internals/path');

var Set = path.Set;
var $from = Set.from;

module.exports = function from(source, mapFn, thisArg) {
  return call($from, isCallable(this) ? this : Set, source, mapFn, thisArg);
};
