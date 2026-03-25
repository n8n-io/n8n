'use strict';

var $TypeError = require('es-errors/type');

var callBound = require('call-bind/callBound');

var $arrayPush = callBound('Array.prototype.push');

var IteratorStep = require('./IteratorStep');
var IteratorValue = require('./IteratorValue');

var isIteratorRecord = require('../helpers/records/iterator-record');

// https://262.ecma-international.org/14.0/#sec-iteratortolist

module.exports = function IteratorToList(iteratorRecord) {
	if (!isIteratorRecord(iteratorRecord)) {
		throw new $TypeError('Assertion failed: `iteratorRecord` must be an Iterator Record'); // step 1
	}

	var values = []; // step 1
	var next = true; // step 2
	while (next) { // step 3
		next = IteratorStep(iteratorRecord); // step 3.a
		if (next) {
			var nextValue = IteratorValue(next); // step 3.b.i
			$arrayPush(values, nextValue); // step 3.b.ii
		}
	}
	return values; // step 4
};
