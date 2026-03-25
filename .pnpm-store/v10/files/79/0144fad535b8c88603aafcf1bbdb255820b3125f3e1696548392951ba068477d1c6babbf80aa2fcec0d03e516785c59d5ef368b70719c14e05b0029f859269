"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _messages = require("./messages.cjs");
function uncurryThis(target) {
  return (thisArg, ...args) => {
    return ReflectApply(target, thisArg, args);
  };
}
function uncurryThisGetter(target, key) {
  return uncurryThis(ReflectGetOwnPropertyDescriptor(target, key).get);
}
const {
  apply: ReflectApply,
  construct: ReflectConstruct,
  defineProperty: ReflectDefineProperty,
  get: ReflectGet,
  getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
  getPrototypeOf: ReflectGetPrototypeOf,
  has: ReflectHas,
  ownKeys: ReflectOwnKeys,
  set: ReflectSet,
  setPrototypeOf: ReflectSetPrototypeOf
} = Reflect;
exports.ReflectSetPrototypeOf = ReflectSetPrototypeOf;
exports.ReflectSet = ReflectSet;
exports.ReflectOwnKeys = ReflectOwnKeys;
exports.ReflectHas = ReflectHas;
exports.ReflectGetPrototypeOf = ReflectGetPrototypeOf;
exports.ReflectGetOwnPropertyDescriptor = ReflectGetOwnPropertyDescriptor;
exports.ReflectGet = ReflectGet;
exports.ReflectDefineProperty = ReflectDefineProperty;
exports.ReflectConstruct = ReflectConstruct;
exports.ReflectApply = ReflectApply;
const NativeProxy = exports.NativeProxy = Proxy;
const {
  EPSILON,
  MAX_SAFE_INTEGER,
  isFinite: NumberIsFinite,
  isNaN: NumberIsNaN
} = Number;
exports.NumberIsNaN = NumberIsNaN;
exports.NumberIsFinite = NumberIsFinite;
exports.MAX_SAFE_INTEGER = MAX_SAFE_INTEGER;
exports.EPSILON = EPSILON;
const {
  iterator: SymbolIterator,
  species: SymbolSpecies,
  toStringTag: SymbolToStringTag,
  for: SymbolFor
} = Symbol;
exports.SymbolFor = SymbolFor;
exports.SymbolToStringTag = SymbolToStringTag;
exports.SymbolSpecies = SymbolSpecies;
exports.SymbolIterator = SymbolIterator;
const NativeObject = exports.NativeObject = Object;
const {
  create: ObjectCreate,
  defineProperty: ObjectDefineProperty,
  freeze: ObjectFreeze,
  is: ObjectIs
} = NativeObject;
exports.ObjectIs = ObjectIs;
exports.ObjectFreeze = ObjectFreeze;
exports.ObjectDefineProperty = ObjectDefineProperty;
exports.ObjectCreate = ObjectCreate;
const ObjectPrototype = NativeObject.prototype;
const ObjectPrototype__lookupGetter__ = exports.ObjectPrototype__lookupGetter__ = ObjectPrototype.__lookupGetter__ ? uncurryThis(ObjectPrototype.__lookupGetter__) : (object, key) => {
  if (object == null) {
    throw NativeTypeError(_messages.CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT);
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
const ObjectHasOwn = exports.ObjectHasOwn = NativeObject.hasOwn || uncurryThis(ObjectPrototype.hasOwnProperty);
const NativeArray = Array;
const ArrayIsArray = exports.ArrayIsArray = NativeArray.isArray;
const ArrayPrototype = NativeArray.prototype;
const ArrayPrototypeJoin = exports.ArrayPrototypeJoin = uncurryThis(ArrayPrototype.join);
const ArrayPrototypePush = exports.ArrayPrototypePush = uncurryThis(ArrayPrototype.push);
const ArrayPrototypeToLocaleString = exports.ArrayPrototypeToLocaleString = uncurryThis(ArrayPrototype.toLocaleString);
const NativeArrayPrototypeSymbolIterator = exports.NativeArrayPrototypeSymbolIterator = ArrayPrototype[SymbolIterator];
const ArrayPrototypeSymbolIterator = exports.ArrayPrototypeSymbolIterator = uncurryThis(NativeArrayPrototypeSymbolIterator);
const {
  abs: MathAbs,
  trunc: MathTrunc
} = Math;
exports.MathTrunc = MathTrunc;
exports.MathAbs = MathAbs;
const NativeArrayBuffer = exports.NativeArrayBuffer = ArrayBuffer;
const ArrayBufferIsView = exports.ArrayBufferIsView = NativeArrayBuffer.isView;
const ArrayBufferPrototype = NativeArrayBuffer.prototype;
const ArrayBufferPrototypeSlice = exports.ArrayBufferPrototypeSlice = uncurryThis(ArrayBufferPrototype.slice);
const ArrayBufferPrototypeGetByteLength = exports.ArrayBufferPrototypeGetByteLength = uncurryThisGetter(ArrayBufferPrototype, "byteLength");
const NativeSharedArrayBuffer = exports.NativeSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : null;
const SharedArrayBufferPrototypeGetByteLength = exports.SharedArrayBufferPrototypeGetByteLength = NativeSharedArrayBuffer && uncurryThisGetter(NativeSharedArrayBuffer.prototype, "byteLength");
const TypedArray = exports.TypedArray = ReflectGetPrototypeOf(Uint8Array);
const TypedArrayFrom = TypedArray.from;
const TypedArrayPrototype = exports.TypedArrayPrototype = TypedArray.prototype;
const NativeTypedArrayPrototypeSymbolIterator = exports.NativeTypedArrayPrototypeSymbolIterator = TypedArrayPrototype[SymbolIterator];
const TypedArrayPrototypeKeys = exports.TypedArrayPrototypeKeys = uncurryThis(TypedArrayPrototype.keys);
const TypedArrayPrototypeValues = exports.TypedArrayPrototypeValues = uncurryThis(TypedArrayPrototype.values);
const TypedArrayPrototypeEntries = exports.TypedArrayPrototypeEntries = uncurryThis(TypedArrayPrototype.entries);
const TypedArrayPrototypeSet = exports.TypedArrayPrototypeSet = uncurryThis(TypedArrayPrototype.set);
const TypedArrayPrototypeReverse = exports.TypedArrayPrototypeReverse = uncurryThis(TypedArrayPrototype.reverse);
const TypedArrayPrototypeFill = exports.TypedArrayPrototypeFill = uncurryThis(TypedArrayPrototype.fill);
const TypedArrayPrototypeCopyWithin = exports.TypedArrayPrototypeCopyWithin = uncurryThis(TypedArrayPrototype.copyWithin);
const TypedArrayPrototypeSort = exports.TypedArrayPrototypeSort = uncurryThis(TypedArrayPrototype.sort);
const TypedArrayPrototypeSlice = exports.TypedArrayPrototypeSlice = uncurryThis(TypedArrayPrototype.slice);
const TypedArrayPrototypeSubarray = exports.TypedArrayPrototypeSubarray = uncurryThis(TypedArrayPrototype.subarray);
const TypedArrayPrototypeGetBuffer = exports.TypedArrayPrototypeGetBuffer = uncurryThisGetter(TypedArrayPrototype, "buffer");
const TypedArrayPrototypeGetByteOffset = exports.TypedArrayPrototypeGetByteOffset = uncurryThisGetter(TypedArrayPrototype, "byteOffset");
const TypedArrayPrototypeGetLength = exports.TypedArrayPrototypeGetLength = uncurryThisGetter(TypedArrayPrototype, "length");
const TypedArrayPrototypeGetSymbolToStringTag = exports.TypedArrayPrototypeGetSymbolToStringTag = uncurryThisGetter(TypedArrayPrototype, SymbolToStringTag);
const NativeUint8Array = exports.NativeUint8Array = Uint8Array;
const NativeUint16Array = exports.NativeUint16Array = Uint16Array;
const Uint16ArrayFrom = (...args) => {
  return ReflectApply(TypedArrayFrom, NativeUint16Array, args);
};
exports.Uint16ArrayFrom = Uint16ArrayFrom;
const NativeUint32Array = exports.NativeUint32Array = Uint32Array;
const NativeFloat32Array = exports.NativeFloat32Array = Float32Array;
const ArrayIteratorPrototype = exports.ArrayIteratorPrototype = ReflectGetPrototypeOf([][SymbolIterator]());
const ArrayIteratorPrototypeNext = exports.ArrayIteratorPrototypeNext = uncurryThis(ArrayIteratorPrototype.next);
const GeneratorPrototypeNext = exports.GeneratorPrototypeNext = uncurryThis(function* () {}().next);
const IteratorPrototype = exports.IteratorPrototype = ReflectGetPrototypeOf(ArrayIteratorPrototype);
const DataViewPrototype = DataView.prototype;
const DataViewPrototypeGetUint16 = exports.DataViewPrototypeGetUint16 = uncurryThis(DataViewPrototype.getUint16);
const DataViewPrototypeSetUint16 = exports.DataViewPrototypeSetUint16 = uncurryThis(DataViewPrototype.setUint16);
const NativeTypeError = exports.NativeTypeError = TypeError;
const NativeRangeError = exports.NativeRangeError = RangeError;
const NativeWeakSet = exports.NativeWeakSet = WeakSet;
const WeakSetPrototype = NativeWeakSet.prototype;
const WeakSetPrototypeAdd = exports.WeakSetPrototypeAdd = uncurryThis(WeakSetPrototype.add);
const WeakSetPrototypeHas = exports.WeakSetPrototypeHas = uncurryThis(WeakSetPrototype.has);
const NativeWeakMap = exports.NativeWeakMap = WeakMap;
const WeakMapPrototype = NativeWeakMap.prototype;
const WeakMapPrototypeGet = exports.WeakMapPrototypeGet = uncurryThis(WeakMapPrototype.get);
const WeakMapPrototypeHas = exports.WeakMapPrototypeHas = uncurryThis(WeakMapPrototype.has);
const WeakMapPrototypeSet = exports.WeakMapPrototypeSet = uncurryThis(WeakMapPrototype.set);