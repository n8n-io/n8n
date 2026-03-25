'use strict';

var define = require('define-properties');
var getPolyfill = require('./polyfill');

module.exports = function shimStringTrim() {
	var polyfill = getPolyfill();
	define(String.prototype, { trim: polyfill }, {
		trim: function testTrim() {
			return String.prototype.trim !== polyfill;
		}
	});
	return polyfill;
};
