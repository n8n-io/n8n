'use strict';

var assert = require('assert');
var timeSafeCompare = require('../../lib/index');

process.on('error', function (e) {
	console.log('caught: ' + e);
});

function testEqual(a, b) {
	assert(timeSafeCompare(a, b));

	// lets also do a parity check with the strict equal to operator
	assert(a === b);
}

function testNotEqual(a, b) {
	assert(!timeSafeCompare(a, b));

	// lets also do a parity check with the strict not equal to operator
	assert(a !== b);
}

// note: lets also make sure tsscmp can be inline replaced for any types -
// just incase if anyone is interested

// positive tests
testEqual('127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935',
	'127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935',
	'test ');
testEqual('a', 'a');
testEqual('', '');
testEqual(undefined, undefined);
testEqual(true, true);
testEqual(false, false);
(function () {
	var a = { a: 1 };
	testEqual(a, a);
})();
(function () {
	function f1() { return 1; };
	testEqual(f1, f1);
})();

// negative tests
testNotEqual('');
testNotEqual('a', 'b');
testNotEqual('a', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
testNotEqual('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'a');
testNotEqual('alpha', 'beta');
testNotEqual(false, true);
testNotEqual(false, undefined);
testNotEqual(function () { }, function () { });
testNotEqual({}, {});
testNotEqual({ a: 1 }, { a: 1 });
testNotEqual({ a: 1 }, { a: 2 });
testNotEqual([1, 2], [1, 2]);
testNotEqual([1, 2], [1, 2, 3]);
(function () {
	var a = { p: 1 };
	var b = { p: 1 };
	testNotEqual(a, b);
})();
(function () {
	function f1() { return 1; };
	function f2() { return 1; };
	testNotEqual(f1, f2);
})();
console.log('Success: all tests complete.');
