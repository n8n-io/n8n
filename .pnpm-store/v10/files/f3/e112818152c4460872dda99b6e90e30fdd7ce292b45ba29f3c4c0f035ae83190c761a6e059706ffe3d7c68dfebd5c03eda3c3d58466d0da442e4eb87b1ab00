'use strict';
require('../../modules/es.promise');
require('../../modules/esnext.promise.try');
var call = require('../../internals/function-call');
var isCallable = require('../../internals/is-callable');
var path = require('../../internals/path');

var Promise = path.Promise;
var promiseTry = Promise['try'];

module.exports = { 'try': function (callbackfn) {
  return call(promiseTry, isCallable(this) ? this : Promise, callbackfn);
} }['try'];
