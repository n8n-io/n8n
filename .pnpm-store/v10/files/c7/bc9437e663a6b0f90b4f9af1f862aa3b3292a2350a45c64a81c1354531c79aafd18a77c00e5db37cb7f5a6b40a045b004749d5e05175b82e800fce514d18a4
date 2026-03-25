'use strict';

var GetIntrinsic = require('get-intrinsic');

var $abs = GetIntrinsic('%Math.abs%');
var $floor = GetIntrinsic('%Math.floor%');
var $pow = GetIntrinsic('%Math.pow%');

var isFinite = require('./isFinite');
var isNaN = require('./isNaN');
var isNegativeZero = require('./isNegativeZero');

var maxFiniteFloat32 = 3.4028234663852886e+38; // roughly 2 ** 128 - 1

module.exports = function valueToFloat32Bytes(value, isLittleEndian) {
	if (isNaN(value)) {
		return isLittleEndian ? [0, 0, 192, 127] : [127, 192, 0, 0]; // hardcoded
	}

	var leastSig;

	if (value === 0) {
		leastSig = isNegativeZero(value) ? 0x80 : 0;
		return isLittleEndian ? [0, 0, 0, leastSig] : [leastSig, 0, 0, 0];
	}

	if ($abs(value) > maxFiniteFloat32 || !isFinite(value)) {
		leastSig = value < 0 ? 255 : 127;
		return isLittleEndian ? [0, 0, 128, leastSig] : [leastSig, 128, 0, 0];
	}

	var sign = value < 0 ? 1 : 0;
	value = $abs(value); // eslint-disable-line no-param-reassign

	var exponent = 0;
	while (value >= 2) {
		exponent += 1;
		value /= 2; // eslint-disable-line no-param-reassign
	}

	while (value < 1) {
		exponent -= 1;
		value *= 2; // eslint-disable-line no-param-reassign
	}

	var mantissa = value - 1;
	mantissa *= $pow(2, 23) + 0.5;
	mantissa = $floor(mantissa);

	exponent += 127;
	exponent <<= 23;

	var result = (sign << 31)
        | exponent
        | mantissa;

	var byte0 = result & 255;
	result >>= 8;
	var byte1 = result & 255;
	result >>= 8;
	var byte2 = result & 255;
	result >>= 8;
	var byte3 = result & 255;

	if (isLittleEndian) {
		return [byte0, byte1, byte2, byte3];
	}
	return [byte3, byte2, byte1, byte0];
};
