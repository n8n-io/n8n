'use strict';
var global = require('../internals/global');
var isCallable = require('../internals/is-callable');
var wellKnownSymbol = require('../internals/well-known-symbol');

var $$OBSERVABLE = wellKnownSymbol('observable');
var NativeObservable = global.Observable;
var NativeObservablePrototype = NativeObservable && NativeObservable.prototype;

module.exports = !isCallable(NativeObservable)
  || !isCallable(NativeObservable.from)
  || !isCallable(NativeObservable.of)
  || !isCallable(NativeObservablePrototype.subscribe)
  || !isCallable(NativeObservablePrototype[$$OBSERVABLE]);
