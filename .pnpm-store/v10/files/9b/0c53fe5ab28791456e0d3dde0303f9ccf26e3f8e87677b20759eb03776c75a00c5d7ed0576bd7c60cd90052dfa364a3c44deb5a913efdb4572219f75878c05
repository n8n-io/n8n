'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.weak-map');
require('../../modules/esnext.weak-map.of');
var path = require('../../internals/path');
var apply = require('../../internals/function-apply');
var isCallable = require('../../internals/is-callable');

var WeakMap = path.WeakMap;
var weakMapOf = WeakMap.of;

module.exports = function of() {
  return apply(weakMapOf, isCallable(this) ? this : WeakMap, arguments);
};
