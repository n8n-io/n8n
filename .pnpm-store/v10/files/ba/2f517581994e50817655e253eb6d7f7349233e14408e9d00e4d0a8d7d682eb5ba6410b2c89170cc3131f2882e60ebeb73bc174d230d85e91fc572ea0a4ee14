'use strict';

var GetIntrinsic = require('get-intrinsic');

var $Number = GetIntrinsic('%Number%');
var $TypeError = require('es-errors/type');

var $isNaN = require('../helpers/isNaN');

var IsStringPrefix = require('./IsStringPrefix');
var StringToBigInt = require('./StringToBigInt');
var ToNumeric = require('./ToNumeric');
var ToPrimitive = require('./ToPrimitive');
var Type = require('./Type');

var BigIntLessThan = require('./BigInt/lessThan');
var NumberLessThan = require('./Number/lessThan');

// https://262.ecma-international.org/9.0/#sec-abstract-relational-comparison

// eslint-disable-next-line max-statements, max-lines-per-function
module.exports = function AbstractRelationalComparison(x, y, LeftFirst) {
	if (typeof LeftFirst !== 'boolean') {
		throw new $TypeError('Assertion failed: LeftFirst argument must be a Boolean');
	}
	var px;
	var py;
	if (LeftFirst) {
		px = ToPrimitive(x, $Number);
		py = ToPrimitive(y, $Number);
	} else {
		py = ToPrimitive(y, $Number);
		px = ToPrimitive(x, $Number);
	}
	if (typeof px === 'string' && typeof py === 'string') {
		if (IsStringPrefix(py, px)) {
			return false;
		}
		if (IsStringPrefix(px, py)) {
			return true;
		}
		return px < py; // both strings, neither a prefix of the other. shortcut for steps 3 c-f
	}

	var pxType = Type(px);
	var pyType = Type(py);
	var nx;
	var ny;
	if (pxType === 'BigInt' && pyType === 'String') {
		ny = StringToBigInt(py);
		if ($isNaN(ny)) {
			return void undefined;
		}
		return BigIntLessThan(px, ny);
	}
	if (pxType === 'String' && pyType === 'BigInt') {
		nx = StringToBigInt(px);
		if ($isNaN(nx)) {
			return void undefined;
		}
		return BigIntLessThan(nx, py);
	}

	nx = ToNumeric(px);
	ny = ToNumeric(py);
	var nxType = Type(nx);
	if (nxType === Type(ny)) {
		return nxType === 'Number' ? NumberLessThan(nx, ny) : BigIntLessThan(nx, ny);
	}

	if ($isNaN(nx) || $isNaN(ny)) {
		return void undefined;
	}
	if (nx === -Infinity || ny === Infinity) {
		return true;
	}
	if (nx === Infinity || ny === -Infinity) {
		return false;
	}

	return nx < ny; // by now, these are both nonzero, finite, and not equal
};
