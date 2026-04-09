'use strict';

var CreateDataPropertyOrThrow = require('es-abstract/2025/CreateDataPropertyOrThrow');
var CreateNonEnumerableDataPropertyOrThrow = require('es-abstract/2023/CreateNonEnumerableDataPropertyOrThrow');
var GetIterator = require('es-abstract/2025/GetIterator');
var hasPropertyDescriptors = require('has-property-descriptors')();
var IteratorToList = require('es-abstract/2025/IteratorToList');
var OrdinarySetPrototypeOf = require('es-abstract/2025/OrdinarySetPrototypeOf');

var $Error = require('es-errors');

// eslint-disable-next-line func-style
function AggregateError(errors, message) {
	var error = new $Error(message);
	OrdinarySetPrototypeOf(error, proto); // eslint-disable-line no-use-before-define
	delete error.constructor;

	var errorsList = IteratorToList(GetIterator(errors, 'SYNC'));
	CreateDataPropertyOrThrow(error, 'errors', errorsList);

	return error;
}
if (hasPropertyDescriptors) {
	Object.defineProperty(AggregateError, 'prototype', { writable: false });
}
var proto = AggregateError.prototype;

CreateNonEnumerableDataPropertyOrThrow(proto, 'constructor', AggregateError);
CreateNonEnumerableDataPropertyOrThrow(proto, 'message', '');
CreateNonEnumerableDataPropertyOrThrow(proto, 'name', 'AggregateError');

OrdinarySetPrototypeOf(AggregateError.prototype, Error.prototype);

module.exports = AggregateError;
