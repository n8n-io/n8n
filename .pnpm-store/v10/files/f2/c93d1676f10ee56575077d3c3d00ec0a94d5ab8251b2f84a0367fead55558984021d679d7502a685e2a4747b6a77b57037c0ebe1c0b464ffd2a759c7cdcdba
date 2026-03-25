'use strict';

var GetIntrinsic = require('get-intrinsic');

var $ObjectCreate = GetIntrinsic('%Object.create%', true);
var $TypeError = require('es-errors/type');
var $SyntaxError = require('es-errors/syntax');

var IsArray = require('./IsArray');
var Type = require('./Type');

var forEach = require('../helpers/forEach');

var SLOT = require('internal-slot');

var hasProto = require('has-proto')();

// https://262.ecma-international.org/6.0/#sec-objectcreate

module.exports = function ObjectCreate(proto, internalSlotsList) {
	if (proto !== null && Type(proto) !== 'Object') {
		throw new $TypeError('Assertion failed: `proto` must be null or an object');
	}
	var slots = arguments.length < 2 ? [] : internalSlotsList; // step 1
	if (arguments.length >= 2 && !IsArray(slots)) {
		throw new $TypeError('Assertion failed: `internalSlotsList` must be an Array');
	}

	var O;
	if ($ObjectCreate) {
		O = $ObjectCreate(proto);
	} else if (hasProto) {
		O = { __proto__: proto };
	} else {
		if (proto === null) {
			throw new $SyntaxError('native Object.create support is required to create null objects');
		}
		var T = function T() {};
		T.prototype = proto;
		O = new T();
	}

	if (slots.length > 0) {
		forEach(slots, function (slot) {
			SLOT.set(O, slot, void undefined);
		});
	}

	return O; // step 6
};
