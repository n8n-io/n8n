'use strict';

var define = require('define-properties');
var callBind = require('call-bind');

var implementation = require('./implementation');
var getPolyfill = require('./polyfill');
var shim = require('./shim');

var bound = callBind(implementation, null);

define(bound, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	method: implementation, // TODO: remove at semver-major
	shim: shim
});

module.exports = bound;
