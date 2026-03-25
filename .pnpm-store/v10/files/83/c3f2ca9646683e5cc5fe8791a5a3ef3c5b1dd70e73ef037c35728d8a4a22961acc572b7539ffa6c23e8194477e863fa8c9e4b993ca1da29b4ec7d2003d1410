'use strict';

var GetIntrinsic = require('get-intrinsic');

var originalGetProto = GetIntrinsic('%Object.getPrototypeOf%', true);

var hasProto = require('has-proto')();

module.exports = originalGetProto || (
	hasProto
		? function (O) {
			return O.__proto__; // eslint-disable-line no-proto
		}
		: null
);
