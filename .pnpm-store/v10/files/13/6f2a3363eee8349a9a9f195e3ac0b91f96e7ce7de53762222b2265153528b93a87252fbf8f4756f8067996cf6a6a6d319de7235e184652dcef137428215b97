'use strict';

var test = require('tape');
var hasProto = require('../');

test('hasProto', function (t) {
	var result = hasProto();
	t.equal(typeof result, 'boolean', 'returns a boolean (' + result + ')');

	var obj = { __proto__: null };
	if (result) {
		t.notOk('toString' in obj, 'null object lacks toString');
	} else {
		t.ok('toString' in obj, 'without proto, null object has toString');
		t.equal(obj.__proto__, null); // eslint-disable-line no-proto
	}

	t.end();
});
