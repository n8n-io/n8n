'use strict';

var GetIntrinsic = require('get-intrinsic');

var $Function = GetIntrinsic('%Function%');
var $TypeError = require('es-errors/type');
var $SyntaxError = require('es-errors/syntax');

var Get = require('./Get');
var IsConstructor = require('./IsConstructor');
var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-getprototypefromconstructor

module.exports = function GetPrototypeFromConstructor(constructor, intrinsicDefaultProto) {
	var intrinsic = GetIntrinsic(intrinsicDefaultProto); // throws if not a valid intrinsic
	if (Type(intrinsic) !== 'Object') {
		throw new $TypeError('intrinsicDefaultProto must be an object');
	}
	if (!IsConstructor(constructor)) {
		throw new $TypeError('Assertion failed: `constructor` must be a constructor');
	}
	var proto = Get(constructor, 'prototype');
	if (Type(proto) !== 'Object') {
		if (!(constructor instanceof $Function)) {
			// ignore other realms, for now
			throw new $SyntaxError('cross-realm constructors not currently supported');
		}
		proto = intrinsic;
	}
	return proto;
};
