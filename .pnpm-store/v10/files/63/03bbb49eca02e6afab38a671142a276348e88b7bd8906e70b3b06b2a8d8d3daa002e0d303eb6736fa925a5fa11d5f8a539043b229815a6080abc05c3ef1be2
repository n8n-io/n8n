'use strict';

var test = require('tape');
// eslint-disable-next-line no-extra-parens
var isArguments = /** @type {import('..') & { isLegacyArguments: import('..') }} */ (require('../'));
var hasToStringTag = require('has-tostringtag/shams')();

test('primitives', function (t) {
	t.notOk(isArguments([]), 'array is not arguments');
	t.notOk(isArguments({}), 'object is not arguments');
	t.notOk(isArguments(''), 'empty string is not arguments');
	t.notOk(isArguments('foo'), 'string is not arguments');
	t.notOk(isArguments({ length: 2 }), 'naive array-like is not arguments');
	t.end();
});

test('arguments object', function (t) {
	t.ok(isArguments(arguments), 'arguments is arguments');
	t.notOk(isArguments(Array.prototype.slice.call(arguments)), 'sliced arguments is not arguments');
	t.end();
});

test('old-style arguments object', function (t) {
	var isLegacyArguments = isArguments.isLegacyArguments || isArguments;
	var fakeOldArguments = {
		callee: function () {},
		length: 3
	};
	t.ok(isLegacyArguments(fakeOldArguments), 'old-style arguments is arguments');
	t.end();
});

test('Symbol.toStringTag', { skip: !hasToStringTag }, function (t) {
	/** @type {{ [Symbol.toStringTag]?: string }} */
	var obj = {};
	obj[Symbol.toStringTag] = 'Arguments';
	t.notOk(isArguments(obj), 'object with faked toStringTag is not arguments');

	/** @type {IArguments & { [Symbol.toStringTag]?: string }} */
	var args = (function () {
		return arguments;
	}());
	args[Symbol.toStringTag] = 'Arguments';
	t.notOk(isArguments(obj), 'real arguments with faked toStringTag is not arguments');

	t.end();
});
