import {
  ArrayIteratorPrototype,
  ArrayIteratorPrototypeNext,
  ArrayPrototypeSymbolIterator,
  GeneratorPrototypeNext,
  IteratorPrototype,
  NativeArrayPrototypeSymbolIterator,
  NativeWeakMap,
  ObjectCreate,
  ObjectDefineProperty,
  ReflectGetOwnPropertyDescriptor,
  ReflectOwnKeys,
  SymbolIterator,
  WeakMapPrototypeGet,
  WeakMapPrototypeSet,
} from "./primordials.mjs";

/** @type {WeakMap<{}, IterableIterator<any>>} */
const arrayIterators = new NativeWeakMap();

const SafeIteratorPrototype = ObjectCreate(null, {
  next: {
    value: function next() {
      const arrayIterator = WeakMapPrototypeGet(arrayIterators, this);
      return ArrayIteratorPrototypeNext(arrayIterator);
    },
  },

  [SymbolIterator]: {
    value: function values() {
      return this;
    },
  },
});

/**
 * Wrap the Array around the SafeIterator If Array.prototype [@@iterator] has been modified
 * @type {<T>(array: T[]) => Iterable<T>}
 */
export function safeIfNeeded(array) {
  if (
    array[SymbolIterator] === NativeArrayPrototypeSymbolIterator &&
    ArrayIteratorPrototype.next === ArrayIteratorPrototypeNext
  ) {
    return array;
  }

  const safe = ObjectCreate(SafeIteratorPrototype);
  WeakMapPrototypeSet(arrayIterators, safe, ArrayPrototypeSymbolIterator(array));
  return safe;
}

/** @type {WeakMap<{}, Generator<any>>} */
const generators = new NativeWeakMap();

/** @see https://tc39.es/ecma262/#sec-%arrayiteratorprototype%-object */
const DummyArrayIteratorPrototype = ObjectCreate(IteratorPrototype, {
  next: {
    value: function next() {
      const generator = WeakMapPrototypeGet(generators, this);
      return GeneratorPrototypeNext(generator);
    },
    writable: true,
    configurable: true,
  },
});

for (const key of ReflectOwnKeys(ArrayIteratorPrototype)) {
  // next method has already defined
  if (key === "next") {
    continue;
  }

  // Copy ArrayIteratorPrototype descriptors to DummyArrayIteratorPrototype
  ObjectDefineProperty(DummyArrayIteratorPrototype, key, ReflectGetOwnPropertyDescriptor(ArrayIteratorPrototype, key));
}

/**
 * Wrap the Generator around the dummy ArrayIterator
 * @type {<T>(generator: Generator<T>) => IterableIterator<T>}
 */
export function wrap(generator) {
  const dummy = ObjectCreate(DummyArrayIteratorPrototype);
  WeakMapPrototypeSet(generators, dummy, generator);
  return dummy;
}
