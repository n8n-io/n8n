'use strict';

var callBound = require('call-bind/callBound');

var $byteLength = callBound('SharedArrayBuffer.prototype.byteLength', true);

/** @type {import('.')} */
module.exports = $byteLength
	? function isSharedArrayBuffer(obj) {
		if (!obj || typeof obj !== 'object') {
			return false;
		}
		try {
			$byteLength(obj);
			return true;
		} catch (e) {
			return false;
		}
	}
	: function isSharedArrayBuffer(obj) { // eslint-disable-line no-unused-vars
		return false;
	};
