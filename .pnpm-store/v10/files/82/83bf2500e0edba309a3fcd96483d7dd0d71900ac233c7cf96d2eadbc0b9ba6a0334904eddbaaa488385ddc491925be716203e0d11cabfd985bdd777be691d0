'use strict';

var callBound = require('call-bind/callBound');
var $arrayPush = callBound('Array.prototype.push');

var getIteratorMethod = require('../helpers/getIteratorMethod');
var AdvanceStringIndex = require('./AdvanceStringIndex');
var GetIterator = require('./GetIterator');
var GetMethod = require('./GetMethod');
var IsArray = require('./IsArray');
var IteratorStep = require('./IteratorStep');
var IteratorValue = require('./IteratorValue');
var ToObject = require('./ToObject');
var ES = {
	AdvanceStringIndex: AdvanceStringIndex,
	GetMethod: GetMethod,
	IsArray: IsArray
};

// https://262.ecma-international.org/7.0/#sec-iterabletoarraylike

module.exports = function IterableToArrayLike(items) {
	var usingIterator = getIteratorMethod(ES, items);
	if (typeof usingIterator !== 'undefined') {
		var iterator = GetIterator(items, usingIterator);
		var values = [];
		var next = true;
		while (next) {
			next = IteratorStep(iterator);
			if (next) {
				var nextValue = IteratorValue(next);
				$arrayPush(values, nextValue);
			}
		}
		return values;
	}

	return ToObject(items);
};
