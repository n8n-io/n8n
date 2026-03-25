'use strict';

var implementation = require('./implementation');

module.exports = function getPolyfill() {
	return typeof AggregateError === 'function' ? AggregateError : implementation;
};
