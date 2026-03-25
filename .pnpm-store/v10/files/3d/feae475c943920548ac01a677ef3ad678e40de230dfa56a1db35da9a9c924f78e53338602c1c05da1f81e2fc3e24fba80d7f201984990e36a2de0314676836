'use strict';

var callBound = require('call-bound');
var safeRegexTest = require('safe-regex-test');

var toStr = callBound('Object.prototype.toString');
var fnToStr = callBound('Function.prototype.toString');
var isFnRegex = safeRegexTest(/^\s*async(?:\s+function(?:\s+|\()|\s*\()/);

var hasToStringTag = require('has-tostringtag/shams')();
var getProto = require('get-proto');

var getAsyncFunc = require('async-function');

/** @type {import('.')} */
module.exports = function isAsyncFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex(fnToStr(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr(fn);
		return str === '[object AsyncFunction]';
	}
	if (!getProto) {
		return false;
	}
	var asyncFunc = getAsyncFunc();
	return asyncFunc && asyncFunc.prototype === getProto(fn);
};
