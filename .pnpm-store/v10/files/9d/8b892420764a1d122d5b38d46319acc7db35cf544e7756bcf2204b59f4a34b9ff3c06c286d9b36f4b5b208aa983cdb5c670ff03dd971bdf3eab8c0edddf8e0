'use strict';
// https://tc39.github.io/proposal-setmap-offrom/
var bind = require('../internals/function-bind-context');
var call = require('../internals/function-call');
var aCallable = require('../internals/a-callable');
var aConstructor = require('../internals/a-constructor');
var isNullOrUndefined = require('../internals/is-null-or-undefined');
var iterate = require('../internals/iterate');

var push = [].push;

module.exports = function from(source /* , mapFn, thisArg */) {
  var length = arguments.length;
  var mapFn = length > 1 ? arguments[1] : undefined;
  var mapping, array, n, boundFunction;
  aConstructor(this);
  mapping = mapFn !== undefined;
  if (mapping) aCallable(mapFn);
  if (isNullOrUndefined(source)) return new this();
  array = [];
  if (mapping) {
    n = 0;
    boundFunction = bind(mapFn, length > 2 ? arguments[2] : undefined);
    iterate(source, function (nextItem) {
      call(push, array, boundFunction(nextItem, n++));
    });
  } else {
    iterate(source, push, { that: array });
  }
  return new this(array);
};
