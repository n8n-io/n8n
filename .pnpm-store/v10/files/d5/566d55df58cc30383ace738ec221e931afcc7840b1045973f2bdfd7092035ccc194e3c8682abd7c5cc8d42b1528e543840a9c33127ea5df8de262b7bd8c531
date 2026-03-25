"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.safeIfNeeded = safeIfNeeded;
exports.wrap = wrap;
var _primordials = require("./primordials.cjs");
const arrayIterators = new _primordials.NativeWeakMap();
const SafeIteratorPrototype = (0, _primordials.ObjectCreate)(null, {
  next: {
    value: function next() {
      const arrayIterator = (0, _primordials.WeakMapPrototypeGet)(arrayIterators, this);
      return (0, _primordials.ArrayIteratorPrototypeNext)(arrayIterator);
    }
  },
  [_primordials.SymbolIterator]: {
    value: function values() {
      return this;
    }
  }
});
function safeIfNeeded(array) {
  if (array[_primordials.SymbolIterator] === _primordials.NativeArrayPrototypeSymbolIterator && _primordials.ArrayIteratorPrototype.next === _primordials.ArrayIteratorPrototypeNext) {
    return array;
  }
  const safe = (0, _primordials.ObjectCreate)(SafeIteratorPrototype);
  (0, _primordials.WeakMapPrototypeSet)(arrayIterators, safe, (0, _primordials.ArrayPrototypeSymbolIterator)(array));
  return safe;
}
const generators = new _primordials.NativeWeakMap();
const DummyArrayIteratorPrototype = (0, _primordials.ObjectCreate)(_primordials.IteratorPrototype, {
  next: {
    value: function next() {
      const generator = (0, _primordials.WeakMapPrototypeGet)(generators, this);
      return (0, _primordials.GeneratorPrototypeNext)(generator);
    },
    writable: true,
    configurable: true
  }
});
for (const key of (0, _primordials.ReflectOwnKeys)(_primordials.ArrayIteratorPrototype)) {
  if (key === "next") {
    continue;
  }
  (0, _primordials.ObjectDefineProperty)(DummyArrayIteratorPrototype, key, (0, _primordials.ReflectGetOwnPropertyDescriptor)(_primordials.ArrayIteratorPrototype, key));
}
function wrap(generator) {
  const dummy = (0, _primordials.ObjectCreate)(DummyArrayIteratorPrototype);
  (0, _primordials.WeakMapPrototypeSet)(generators, dummy, generator);
  return dummy;
}