'use strict';

var $TypeError = require('es-errors/type');

var Call = require('./Call');
var CompletionRecord = require('./CompletionRecord');
var GetMethod = require('./GetMethod');
var IsCallable = require('./IsCallable');
var Type = require('./Type');

var isIteratorRecord = require('../helpers/records/iterator-record');

// https://262.ecma-international.org/14.0/#sec-iteratorclose

module.exports = function IteratorClose(iteratorRecord, completion) {
	if (!isIteratorRecord(iteratorRecord)) {
		throw new $TypeError('Assertion failed: `iteratorRecord` must be an Iterator Record'); // step 1
	}
	if (Type(iteratorRecord['[[Iterator]]']) !== 'Object') {
		throw new $TypeError('Assertion failed: iteratorRecord.[[Iterator]] must be an Object'); // step 1
	}

	if (!IsCallable(completion) && !(completion instanceof CompletionRecord)) { // step 2
		throw new $TypeError('Assertion failed: completion is not a thunk representing a Completion Record, nor a Completion Record instance');
	}
	var completionThunk = completion instanceof CompletionRecord ? function () { return completion['?'](); } : completion;

	var iterator = iteratorRecord['[[Iterator]]']; // step 3

	var iteratorReturn;
	try {
		iteratorReturn = GetMethod(iterator, 'return'); // step 4
	} catch (e) {
		completionThunk(); // throws if `completion` is a throw completion // step 6
		completionThunk = null; // ensure it's not called twice.
		throw e; // step 7
	}
	if (typeof iteratorReturn === 'undefined') {
		return completionThunk(); // step 5.a - 5.b
	}

	var innerResult;
	try {
		innerResult = Call(iteratorReturn, iterator, []);
	} catch (e) {
		// if we hit here, then "e" is the innerResult completion that needs re-throwing

		completionThunk(); // throws if `completion` is a throw completion // step 6
		completionThunk = null; // ensure it's not called twice.

		// if not, then return the innerResult completion
		throw e; // step 7
	}
	var completionRecord = completionThunk(); // if innerResult worked, then throw if the completion does
	completionThunk = null; // ensure it's not called twice.

	if (Type(innerResult) !== 'Object') {
		throw new $TypeError('iterator .return must return an object');
	}

	return completionRecord;
};
