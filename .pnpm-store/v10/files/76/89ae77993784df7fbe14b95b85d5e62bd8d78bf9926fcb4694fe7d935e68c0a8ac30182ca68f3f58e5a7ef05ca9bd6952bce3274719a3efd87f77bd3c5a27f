'use strict';

var GetIntrinsic = require('get-intrinsic');

var $abs = GetIntrinsic('%Math.abs%');
var $floor = GetIntrinsic('%Math.floor%');

var $isNaN = require('./isNaN');
var $isFinite = require('./isFinite');

module.exports = function isInteger(argument) {
	if (typeof argument !== 'number' || $isNaN(argument) || !$isFinite(argument)) {
		return false;
	}
	var absValue = $abs(argument);
	return $floor(absValue) === absValue;
};

