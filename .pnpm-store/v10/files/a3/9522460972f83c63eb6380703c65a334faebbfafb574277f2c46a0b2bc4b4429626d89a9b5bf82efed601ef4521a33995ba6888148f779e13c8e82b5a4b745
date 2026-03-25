'use strict';

var CreateDataPropertyOrThrow = require('es-abstract/2023/CreateDataPropertyOrThrow');
var CreateMethodProperty = require('es-abstract/2023/CreateMethodProperty');
var GetIterator = require('es-abstract/2023/GetIterator');
var hasPropertyDescriptors = require('has-property-descriptors')();
var IteratorToList = require('es-abstract/2023/IteratorToList');
var OrdinarySetPrototypeOf = require('es-abstract/2023/OrdinarySetPrototypeOf');

var $Error = require('es-errors');

// eslint-disable-next-line func-style
function AggregateError(errors, message) {
	var error = new $Error(message);
	OrdinarySetPrototypeOf(error, proto); // eslint-disable-line no-use-before-define
	delete error.constructor;

	var errorsList = IteratorToList(GetIterator(errors, 'sync'));
	CreateDataPropertyOrThrow(error, 'errors', errorsList);

	return error;
}
if (hasPropertyDescriptors) {
	Object.defineProperty(AggregateError, 'prototype', { writable: false });
}
var proto = AggregateError.prototype;

if (
	!CreateMethodProperty(proto, 'constructor', AggregateError)
	|| !CreateMethodProperty(proto, 'message', '')
	|| !CreateMethodProperty(proto, 'name', 'AggregateError')
) {
	throw new $Error('unable to install AggregateError.prototype properties; please report this!');
}

OrdinarySetPrototypeOf(AggregateError.prototype, Error.prototype);

module.exports = AggregateError;
