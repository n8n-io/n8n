'use strict';

var test = require('tape');
var inspect = require('object-inspect');
var is = require('object-is');
var forEach = require('for-each');
var hasSymbols = require('has-symbols')();
var hasBigInts = require('has-bigints')();

var unboxPrimitive = require('..');

var debug = function (v, m) { return inspect(v) + ' ' + m; };

test('primitives', function (t) {
	var primitives = [
		true,
		false,
		'',
		'foo',
		42,
		NaN,
		Infinity,
		0
	];
	if (hasSymbols) {
		primitives.push(Symbol(), Symbol.iterator, Symbol('f'));
	}
	if (hasBigInts) {
		primitives.push(BigInt(42), BigInt(0));
	}
	forEach(primitives, function (primitive) {
		var obj = Object(primitive);
		t.ok(
			is(unboxPrimitive(obj), primitive),
			debug(obj, 'unboxes to ' + inspect(primitive))
		);
	});

	t.end();
});

test('objects', function (t) {
	var objects = [
		{},
		[],
		function () {},
		/a/g,
		new Date()
	];
	forEach(objects, function (object) {
		t['throws'](
			function () { unboxPrimitive(object); },
			TypeError,
			debug(object, 'is not a primitive')
		);
	});

	t.end();
});
