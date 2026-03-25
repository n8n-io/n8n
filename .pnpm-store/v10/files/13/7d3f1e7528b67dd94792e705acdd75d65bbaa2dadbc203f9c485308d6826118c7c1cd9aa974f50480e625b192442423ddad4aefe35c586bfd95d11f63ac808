'use strict';

var define = require('define-properties');
var globalThis = require('globalthis')();
var getPolyfill = require('./polyfill');

module.exports = function shimAggregateError() {
	var polyfill = getPolyfill();
	define(
		globalThis,
		{ AggregateError: polyfill },
		{
			AggregateError: function testAggregateError() {
				return globalThis.AggregateError !== polyfill;
			}
		}
	);
	return polyfill;
};
