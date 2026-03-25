'use strict';

var GetIntrinsic = require('get-intrinsic');

var $TypeError = require('es-errors/type');
var $SyntaxError = require('es-errors/syntax');
var $asyncIterator = GetIntrinsic('%Symbol.asyncIterator%', true);

var inspect = require('object-inspect');
var hasSymbols = require('has-symbols')();

var getIteratorMethod = require('../helpers/getIteratorMethod');
var AdvanceStringIndex = require('./AdvanceStringIndex');
var Call = require('./Call');
var GetMethod = require('./GetMethod');
var IsArray = require('./IsArray');
var Type = require('./Type');

// https://262.ecma-international.org/11.0/#sec-getiterator

module.exports = function GetIterator(obj, hint, method) {
	var actualHint = hint;
	if (arguments.length < 2) {
		actualHint = 'sync';
	}
	if (actualHint !== 'sync' && actualHint !== 'async') {
		throw new $TypeError("Assertion failed: `hint` must be one of 'sync' or 'async', got " + inspect(hint));
	}

	var actualMethod = method;
	if (arguments.length < 3) {
		if (actualHint === 'async') {
			if (hasSymbols && $asyncIterator) {
				actualMethod = GetMethod(obj, $asyncIterator);
			}
			if (actualMethod === undefined) {
				throw new $SyntaxError("async from sync iterators aren't currently supported");
			}
		} else {
			actualMethod = getIteratorMethod(
				{
					AdvanceStringIndex: AdvanceStringIndex,
					GetMethod: GetMethod,
					IsArray: IsArray
				},
				obj
			);
		}
	}
	var iterator = Call(actualMethod, obj);
	if (Type(iterator) !== 'Object') {
		throw new $TypeError('iterator must return an object');
	}

	return iterator;

	// TODO: This should return an IteratorRecord
	/*
	var nextMethod = GetV(iterator, 'next');
	return {
		'[[Iterator]]': iterator,
		'[[NextMethod]]': nextMethod,
		'[[Done]]': false
	};
	*/
};
