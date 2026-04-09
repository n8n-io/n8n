'use strict';

var test = require('tape');
var getProto = require('get-proto');
var semver = require('semver');

var getGeneratorFunction = require('generator-function');

test('getGeneratorFunction', function (t) {
	var result = getGeneratorFunction();

	/* eslint-env browser */
	if (typeof window === 'undefined' && typeof process !== 'undefined') {
		t.equal(
			!!result,
			semver.satisfies(process.version, '>= 1'),
			'result is present or absent as expected for node ' + process.version
		);
	}

	t.test('exists', { skip: !result }, function (st) {
		if (result && getProto) { // TS can't infer `skip`, or that getProto definitely exists if GeneratorFunction exists
			st.equal(typeof result, 'function', 'is a function');
			st.equal(getProto(result), Function, 'extends Function');

			var iterator = result('a', 'return a')(42);
			st.deepEqual(iterator.next(), { value: 42, done: true }, 'returns a generator function which returns an iterator');
		} else {
			st.fail('should never get here');
		}

		st.end();
	});

	t.test('does not exist', { skip: !!result }, function (st) {
		st.equal(result, false, 'is false');

		st.end();
	});

	t.end();
});
