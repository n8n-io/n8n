'use strict';

var Get = require('./Get');
var ToIndex = require('./ToIndex');
var Type = require('./Type');

// https://tc39.es/ecma262/#sec-getarraybuffermaxbytelengthoption

module.exports = function GetArrayBufferMaxByteLengthOption(options) {
	if (Type(options) !== 'Object') {
		return 'EMPTY'; // step 1
	}

	var maxByteLength = Get(options, 'maxByteLength'); // step 2

	if (typeof maxByteLength === 'undefined') {
		return 'EMPTY'; // step 3
	}

	return ToIndex(maxByteLength); // step 4
};
