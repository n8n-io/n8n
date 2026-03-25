'use strict';

var defineProperties = require('define-properties');
var isEnumerable = Object.prototype.propertyIsEnumerable;

var runTests = require('./tests');

module.exports = function (t) {
	if (typeof AggregateError === 'undefined') {
		t.fail('AggregateError does not exist');
		return;
	}
	t.test('enumerability', { skip: !defineProperties.supportsDescriptors }, function (et) {
		et.equal(false, isEnumerable.call(global, 'AggregateError'), 'AggregateError is not enumerable');
		et.end();
	});

	runTests(AggregateError, t);
};
