'use strict';

var callBound = require('call-bind/callBound');

var $deref = callBound('WeakRef.prototype.deref', true);

module.exports = typeof WeakRef === 'undefined'
	? function isWeakRef(value) { // eslint-disable-line no-unused-vars
		return false;
	}
	: function isWeakRef(value) {
		if (!value || typeof value !== 'object') {
			return false;
		}
		try {
			$deref(value);
			return true;
		} catch (e) {
			return false;
		}
	};
