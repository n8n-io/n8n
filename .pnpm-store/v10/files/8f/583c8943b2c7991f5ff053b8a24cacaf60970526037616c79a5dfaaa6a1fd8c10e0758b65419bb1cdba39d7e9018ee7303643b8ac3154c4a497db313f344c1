'use strict';

var callBound = require('call-bind/callBound');

var $strSlice = callBound('String.prototype.slice');

module.exports = function padTimeComponent(c, count) {
	return $strSlice('00' + c, -(count || 2));
};
