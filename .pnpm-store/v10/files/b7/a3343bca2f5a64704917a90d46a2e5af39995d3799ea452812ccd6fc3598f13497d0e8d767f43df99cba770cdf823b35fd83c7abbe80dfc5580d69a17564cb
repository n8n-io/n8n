/* eslint-disable no-restricted-globals, no-restricted-syntax */
/* global SharedArrayBuffer */

import { CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT } from "./messages.mjs";

/** @type {<T extends (...args: any) => any>(target: T) => (thisArg: ThisType<T>, ...args: any[]) => any} */
function uncurryThis(target) {
  return (thisArg, ...args) => {
    return ReflectApply(target, thisArg, args);
  };
}

/** @type {(target: any, key: string | symbol) => (thisArg: any, ...args: any[]) => any} */
function uncurryThisGetter(target, key) {
  return uncurryThis(
    ReflectGetOwnPropertyDescriptor(
      target,
      key
    ).get
  );
}

// Reflect
export const {
  apply: ReflectApply,
  construct: ReflectConstruct,
  defineProperty: ReflectDefineProperty,
  get: ReflectGet,
  getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
  getPrototypeOf: ReflectGetPrototypeOf,
  has: ReflectHas,
  ownKeys: ReflectOwnKeys,
  set: ReflectSet,
  setPrototypeOf: ReflectSetPrototypeOf,
} = Reflect;

// Proxy
export const NativeProxy = Proxy;

// Number
export const {
  EPSILON,
  MAX_SAFE_INTEGER,
  isFinite: NumberIsFinite,
  isNaN: NumberIsNaN,
} = Number;

// Symbol
export const {
  iterator: SymbolIterator,
  species: SymbolSpecies,
  toStringTag: SymbolToStringTag,
  for: SymbolFor,
} = Symbol;

// Object
export const NativeObject = Object;
export const {
  create: ObjectCreate,
  defineProperty: ObjectDefineProperty,
  freeze: ObjectFreeze,
  is: ObjectIs,
} = NativeObject;
const ObjectPrototype = NativeObject.prototype;
/** @type {(object: object, key: PropertyKey) => Function | undefined} */
export const ObjectPrototype__lookupGetter__ = /** @type {any} */ (ObjectPrototype).__lookupGetter__
  ? uncurryThis(/** @type {any} */ (ObjectPrototype).__lookupGetter__)
  : (object, key) => {
    if (object == null) {
      throw NativeTypeError(
        CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT
      );
    }

    let target = NativeObject(object);
    do {
      const descriptor = ReflectGetOwnPropertyDescriptor(target, key);
      if (descriptor !== undefined) {
        if (ObjectHasOwn(descriptor, "get")) {
          return descriptor.get;
        }

        return;
      }
    } while ((target = ReflectGetPrototypeOf(target)) !== null);
  };
/** @type {(object: object, key: PropertyKey) => boolean} */
export const ObjectHasOwn = /** @type {any} */ (NativeObject).hasOwn ||
  uncurryThis(ObjectPrototype.hasOwnProperty);

// Array
const NativeArray = Array;
export const ArrayIsArray = NativeArray.isArray;
const ArrayPrototype = NativeArray.prototype;
/** @type {(array: ArrayLike<unknown>, separator?: string) => string} */
export const ArrayPrototypeJoin = uncurryThis(ArrayPrototype.join);
/** @type {<T>(array: T[], ...items: T[]) => number} */
export const ArrayPrototypePush = uncurryThis(ArrayPrototype.push);
/** @type {(array: ArrayLike<unknown>, ...opts: any[]) => string} */
export const ArrayPrototypeToLocaleString = uncurryThis(
  ArrayPrototype.toLocaleString
);
export const NativeArrayPrototypeSymbolIterator = ArrayPrototype[SymbolIterator];
/** @type {<T>(array: T[]) => IterableIterator<T>} */
export const ArrayPrototypeSymbolIterator = uncurryThis(NativeArrayPrototypeSymbolIterator);

// Math
export const {
  abs: MathAbs,
  trunc: MathTrunc,
} = Math;

// ArrayBuffer
export const NativeArrayBuffer = ArrayBuffer;
export const ArrayBufferIsView = NativeArrayBuffer.isView;
const ArrayBufferPrototype = NativeArrayBuffer.prototype;
/** @type {(buffer: ArrayBuffer, begin?: number, end?: number) => number} */
export const ArrayBufferPrototypeSlice = uncurryThis(ArrayBufferPrototype.slice);
/** @type {(buffer: ArrayBuffer) => ArrayBuffer} */
export const ArrayBufferPrototypeGetByteLength = uncurryThisGetter(ArrayBufferPrototype, "byteLength");

// SharedArrayBuffer
export const NativeSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : null;
/** @type {(buffer: SharedArrayBuffer) => SharedArrayBuffer} */
export const SharedArrayBufferPrototypeGetByteLength = NativeSharedArrayBuffer
  && uncurryThisGetter(NativeSharedArrayBuffer.prototype, "byteLength");

// TypedArray
/** @typedef {Uint8Array|Uint8ClampedArray|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|BigUint64Array|BigInt64Array} TypedArray */
/** @type {any} */
export const TypedArray = ReflectGetPrototypeOf(Uint8Array);
const TypedArrayFrom = TypedArray.from;
export const TypedArrayPrototype = TypedArray.prototype;
export const NativeTypedArrayPrototypeSymbolIterator = TypedArrayPrototype[SymbolIterator];
/** @type {(typedArray: TypedArray) => IterableIterator<number>} */
export const TypedArrayPrototypeKeys = uncurryThis(TypedArrayPrototype.keys);
/** @type {(typedArray: TypedArray) => IterableIterator<number>} */
export const TypedArrayPrototypeValues = uncurryThis(
  TypedArrayPrototype.values
);
/** @type {(typedArray: TypedArray) => IterableIterator<[number, number]>} */
export const TypedArrayPrototypeEntries = uncurryThis(
  TypedArrayPrototype.entries
);
/** @type {(typedArray: TypedArray, array: ArrayLike<number>, offset?: number) => void} */
export const TypedArrayPrototypeSet = uncurryThis(TypedArrayPrototype.set);
/** @type {<T extends TypedArray>(typedArray: T) => T} */
export const TypedArrayPrototypeReverse = uncurryThis(
  TypedArrayPrototype.reverse
);
/** @type {<T extends TypedArray>(typedArray: T, value: number, start?: number, end?: number) => T} */
export const TypedArrayPrototypeFill = uncurryThis(TypedArrayPrototype.fill);
/** @type {<T extends TypedArray>(typedArray: T, target: number, start: number, end?: number) => T} */
export const TypedArrayPrototypeCopyWithin = uncurryThis(
  TypedArrayPrototype.copyWithin
);
/** @type {<T extends TypedArray>(typedArray: T, compareFn?: (a: number, b: number) => number) => T} */
export const TypedArrayPrototypeSort = uncurryThis(TypedArrayPrototype.sort);
/** @type {<T extends TypedArray>(typedArray: T, start?: number, end?: number) => T} */
export const TypedArrayPrototypeSlice = uncurryThis(TypedArrayPrototype.slice);
/** @type {<T extends TypedArray>(typedArray: T, start?: number, end?: number) => T} */
export const TypedArrayPrototypeSubarray = uncurryThis(
  TypedArrayPrototype.subarray
);
/** @type {((typedArray: TypedArray) => ArrayBuffer)} */
export const TypedArrayPrototypeGetBuffer = uncurryThisGetter(
  TypedArrayPrototype,
  "buffer"
);
/** @type {((typedArray: TypedArray) => number)} */
export const TypedArrayPrototypeGetByteOffset = uncurryThisGetter(
  TypedArrayPrototype,
  "byteOffset"
);
/** @type {((typedArray: TypedArray) => number)} */
export const TypedArrayPrototypeGetLength = uncurryThisGetter(
  TypedArrayPrototype,
  "length"
);
/** @type {(target: unknown) => string} */
export const TypedArrayPrototypeGetSymbolToStringTag = uncurryThisGetter(
  TypedArrayPrototype,
  SymbolToStringTag
);

// Uint8Array
export const NativeUint8Array = Uint8Array;

// Uint16Array
export const NativeUint16Array = Uint16Array;
/** @type {Uint16ArrayConstructor["from"]} */
export const Uint16ArrayFrom = (...args) => {
  return ReflectApply(TypedArrayFrom, NativeUint16Array, args);
};

// Uint32Array
export const NativeUint32Array = Uint32Array;

// Float32Array
export const NativeFloat32Array = Float32Array;

// ArrayIterator
/** @type {any} */
export const ArrayIteratorPrototype = ReflectGetPrototypeOf([][SymbolIterator]());
/** @type {<T>(arrayIterator: IterableIterator<T>) => IteratorResult<T>} */
export const ArrayIteratorPrototypeNext = uncurryThis(ArrayIteratorPrototype.next);

// Generator
/** @type {<T = unknown, TReturn = any, TNext = unknown>(generator: Generator<T, TReturn, TNext>, value?: TNext) => T} */
export const GeneratorPrototypeNext = uncurryThis((function* () {})().next);

// Iterator
export const IteratorPrototype = ReflectGetPrototypeOf(ArrayIteratorPrototype);

// DataView
const DataViewPrototype = DataView.prototype;
/** @type {(dataView: DataView, byteOffset: number, littleEndian?: boolean) => number} */
export const DataViewPrototypeGetUint16 = uncurryThis(
  DataViewPrototype.getUint16
);
/** @type {(dataView: DataView, byteOffset: number, value: number, littleEndian?: boolean) => void} */
export const DataViewPrototypeSetUint16 = uncurryThis(
  DataViewPrototype.setUint16
);

// Error
export const NativeTypeError = TypeError;
export const NativeRangeError = RangeError;

// WeakSet
/**
 * Do not construct with arguments to avoid calling the "add" method
 * @type {{new <T extends {}>(): WeakSet<T>}}
 */
export const NativeWeakSet = WeakSet;
const WeakSetPrototype = NativeWeakSet.prototype;
/** @type {<T extends {}>(set: WeakSet<T>, value: T) => Set<T>} */
export const WeakSetPrototypeAdd = uncurryThis(WeakSetPrototype.add);
/** @type {<T extends {}>(set: WeakSet<T>, value: T) => boolean} */
export const WeakSetPrototypeHas = uncurryThis(WeakSetPrototype.has);

// WeakMap
/**
 * Do not construct with arguments to avoid calling the "set" method
 * @type {{new <K extends {}, V>(): WeakMap<K, V>}}
 */
export const NativeWeakMap = WeakMap;
const WeakMapPrototype = NativeWeakMap.prototype;
/** @type {<K extends {}, V>(weakMap: WeakMap<K, V>, key: K) => V} */
export const WeakMapPrototypeGet = uncurryThis(WeakMapPrototype.get);
/** @type {<K extends {}, V>(weakMap: WeakMap<K, V>, key: K) => boolean} */
export const WeakMapPrototypeHas = uncurryThis(WeakMapPrototype.has);
/** @type {<K extends {}, V>(weakMap: WeakMap<K, V>, key: K, value: V) => WeakMap} */
export const WeakMapPrototypeSet = uncurryThis(WeakMapPrototype.set);
