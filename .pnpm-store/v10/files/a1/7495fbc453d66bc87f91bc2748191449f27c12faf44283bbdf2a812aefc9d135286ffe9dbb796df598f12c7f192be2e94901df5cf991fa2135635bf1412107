'use strict';

var test = require('tape');
var getProto = require('get-proto');
var semver = require('semver');

var getAsyncFunction = require('../');

test('getAsyncFunction', function (t) {
	var result = getAsyncFunction();

	/* eslint-env browser */
	if (typeof window === 'undefined' && typeof process !== 'undefined') {
		t.equal(
			!!result,
			semver.satisfies(process.version, '>= 7.6'),
			'result is present or absent as expected for node ' + process.version
		);
	}

	t.test('exists', { skip: !result }, function (st) {
		if (result && getProto) { // TS can't infer `skip`, or that getProto definitely exists if AsyncFunction exists
			st.equal(typeof result, 'function', 'is a function');
			st.equal(getProto(result), Function, 'extends Function');

			return result('a', 'return a')(42).then(function (a) {
				st.equal(a, 42, 'returns an async function');
			});
		}
		return st.fail('should never get here');
	});

	t.test('does not exist', { skip: !!result }, function (st) {
		st.equal(result, false, 'is false');

		st.end();
	});

	t.end();
});
