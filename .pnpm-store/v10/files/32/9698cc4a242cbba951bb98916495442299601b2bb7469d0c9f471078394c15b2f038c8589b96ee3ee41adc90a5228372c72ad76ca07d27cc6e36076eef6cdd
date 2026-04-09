'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.weak-set');
require('../../modules/esnext.weak-set.of');
var path = require('../../internals/path');
var apply = require('../../internals/function-apply');
var isCallable = require('../../internals/is-callable');

var WeakSet = path.WeakSet;
var weakSetOf = WeakSet.of;

module.exports = function of() {
  return apply(weakSetOf, isCallable(this) ? this : WeakSet, arguments);
};
