'use strict';

var functionsHaveNames = require('functions-have-names')();
var boundFunctionsHaveNames = require('functions-have-names').boundFunctionsHaveNames();
var forEach = require('for-each');
var inspect = require('object-inspect');
var hasPropertyDescriptors = require('has-property-descriptors')();

module.exports = function (AggregateError, t) {
	t.test('constructor', function (st) {
		st.equal(typeof AggregateError, 'function', 'is a function');

		st.equal(AggregateError.length, 2, 'AggregateError has a length of 2');

		st.test('Function name', { skip: !functionsHaveNames || !boundFunctionsHaveNames }, function (s2t) {
			s2t.equal(AggregateError.name, 'AggregateError', 'AggregateError has name "AggregateError"');
			s2t.end();
		});

		if (hasPropertyDescriptors) {
			st.deepEqual(
				Object.getOwnPropertyDescriptor(AggregateError, 'prototype'),
				{
					configurable: false,
					enumerable: false,
					value: AggregateError.prototype,
					writable: false
				}
			);
		}

		st.end();
	});

	t.equal(AggregateError.prototype.message, '', '"message" is an empty string on the prototype');

	t.test('non-iterable errors', function (st) {
		forEach(
			[undefined, null, true, false, 42, NaN, 0, -0, Infinity, function () {}, {}],
			function (nonIterable) {
				st['throws'](
					function () { return new AggregateError(nonIterable); },
					TypeError,
					inspect(nonIterable) + ' is not an iterable'
				);
			}
		);
		st.end();
	});

	t.test('instance', function (st) {
		var one = new TypeError('one!');
		var two = new EvalError('two!');
		var errors = [one, two];
		var message = 'i am an aggregate error';
		var error = new AggregateError(errors, message);

		st.equal(error instanceof AggregateError, true, 'error is an instanceof AggregateError');
		st.equal(error instanceof Error, true, 'error is an instanceof Error');

		st.equal(error.message, message, 'error.message is expected');

		st.notEqual(error.errors, errors, 'error.errors is !== provided errors');
		st.deepEqual(error.errors, errors, 'error.errors is deeply equal to provided errors');

		st.end();
	});

	t.test('as a function', function (st) {
		var one = new TypeError('one!');
		var two = new EvalError('two!');
		var errors = [one, two];
		var message = 'i am an aggregate error';
		var error = AggregateError(errors, message);

		st.equal(error instanceof AggregateError, true, 'error is an instanceof AggregateError');
		st.equal(error instanceof Error, true, 'error is an instanceof Error');

		st.equal(error.message, message, 'error.message is expected');

		st.notEqual(error.errors, errors, 'error.errors is !== provided errors');
		st.deepEqual(error.errors, errors, 'error.errors is deeply equal to provided errors');

		st.end();
	});
};
