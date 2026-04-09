'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.set');
require('../../modules/esnext.set.of');
var path = require('../../internals/path');
var apply = require('../../internals/function-apply');
var isCallable = require('../../internals/is-callable');

var Set = path.Set;
var setOf = Set.of;

module.exports = function of() {
  return apply(setOf, isCallable(this) ? this : Set, arguments);
};
