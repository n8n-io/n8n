'use strict';

var define = require('define-properties');
var escapePolyfill = require('./polyfill')();

module.exports = function shimRegExpEscape() {
	define(RegExp, {
		escape: escapePolyfill
	});
	return RegExp.escape;
};
