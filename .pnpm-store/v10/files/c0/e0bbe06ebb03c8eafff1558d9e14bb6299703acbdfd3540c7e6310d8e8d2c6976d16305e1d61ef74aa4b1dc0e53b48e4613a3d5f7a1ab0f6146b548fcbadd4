'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBound = require('call-bind/callBound');

var $SyntaxError = require('es-errors/syntax');
var getGlobalSymbolDescription = GetIntrinsic('%Symbol.keyFor%', true);
var thisSymbolValue = callBound('%Symbol.prototype.valueOf%', true);
var symToStr = callBound('Symbol.prototype.toString', true);
var $strSlice = callBound('String.prototype.slice');

var getInferredName = require('./getInferredName');

/* eslint-disable consistent-return */
module.exports = callBound('%Symbol.prototype.description%', true) || function getSymbolDescription(symbol) {
	if (!thisSymbolValue) {
		throw new $SyntaxError('Symbols are not supported in this environment');
	}

	// will throw if not a symbol primitive or wrapper object
	var sym = thisSymbolValue(symbol);

	if (getInferredName) {
		var name = getInferredName(sym);
		if (name === '') {
			return;
		}
		return name.slice(1, -1); // name.slice('['.length, -']'.length);
	}

	var desc;
	if (getGlobalSymbolDescription) {
		desc = getGlobalSymbolDescription(sym);
		if (typeof desc === 'string') {
			return desc;
		}
	}

	desc = $strSlice(symToStr(sym), 7, -1); // str.slice('Symbol('.length, -')'.length);
	if (desc) {
		return desc;
	}
};
