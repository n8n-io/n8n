'use strict';

var GetIntrinsic = require('get-intrinsic');

var originalSetProto = GetIntrinsic('%Object.setPrototypeOf%', true);

var hasProto = require('has-proto')();

module.exports = originalSetProto || (

	hasProto
		? function (O, proto) {
			O.__proto__ = proto; // eslint-disable-line no-proto, no-param-reassign
			return O;
		}
		: null
);
