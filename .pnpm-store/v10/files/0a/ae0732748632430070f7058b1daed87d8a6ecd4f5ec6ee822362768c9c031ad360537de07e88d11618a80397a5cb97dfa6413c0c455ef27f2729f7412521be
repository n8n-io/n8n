'use strict';

var bind = require('function-bind');
var define = require('define-properties');
var setFunctionName = require('set-function-name');
var defineDataProperty = require('define-data-property');

var implementation = require('./implementation');
var getPolyfill = require('./polyfill');
var shim = require('./shim');

var polyfill = getPolyfill();
var bound = setFunctionName(bind.call(polyfill), polyfill.name, true);

defineDataProperty(bound, 'prototype', polyfill.prototype, true, true, true, true);

define(bound, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = bound;
