'use strict';

var test = require('tape');
var camelize = require('../');

var obj = {
	fee_fie_foe: 'fum',
	beep_boop: [
		{ 'abc.xyz': 'mno' },
		{ 'foo-bar': 'baz' }
	]
};

test('camelize a nested object', function (t) {
	t.plan(1);
	var res = camelize(obj);
	t.deepEqual(res, {
		feeFieFoe: 'fum',
		beepBoop: [
			{ abcXyz: 'mno' },
			{ fooBar: 'baz' }
		]
	});
});

test('string', function (t) {
	t.plan(1);
	t.equal(camelize('one_two'), 'oneTwo');
});

test('date', function (t) {
	t.plan(1);
	var d = new Date();
	t.equal(camelize(d), d);
});

test('regex', function (t) {
	t.plan(1);
	var r = /1234/;
	t.equal(camelize(r), r);
});

test('only camelize strings that are the root value', function (t) {
	t.plan(2);
	t.equal(camelize('foo-bar'), 'fooBar');
	var res = camelize({ 'foo-bar': 'baz-foo' });
	t.deepEqual(res, { fooBar: 'baz-foo' });
});
