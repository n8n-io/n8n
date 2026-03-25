"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFloat16Array = isFloat16Array;
var _arrayIterator = require("./_util/arrayIterator.cjs");
var _brand = require("./_util/brand.cjs");
var _converter = require("./_util/converter.cjs");
var _is = require("./_util/is.cjs");
var _messages = require("./_util/messages.cjs");
var _primordials = require("./_util/primordials.cjs");
var _spec = require("./_util/spec.cjs");
const BYTES_PER_ELEMENT = 2;
const float16bitsArrays = new _primordials.NativeWeakMap();
function isFloat16Array(target) {
  return (0, _primordials.WeakMapPrototypeHas)(float16bitsArrays, target) || !(0, _primordials.ArrayBufferIsView)(target) && (0, _brand.hasFloat16ArrayBrand)(target);
}
function assertFloat16Array(target) {
  if (!isFloat16Array(target)) {
    throw (0, _primordials.NativeTypeError)(_messages.THIS_IS_NOT_A_FLOAT16ARRAY_OBJECT);
  }
}
function assertSpeciesTypedArray(target, count) {
  const isTargetFloat16Array = isFloat16Array(target);
  const isTargetTypedArray = (0, _is.isNativeTypedArray)(target);
  if (!isTargetFloat16Array && !isTargetTypedArray) {
    throw (0, _primordials.NativeTypeError)(_messages.SPECIES_CONSTRUCTOR_DIDNT_RETURN_TYPEDARRAY_OBJECT);
  }
  if (typeof count === "number") {
    let length;
    if (isTargetFloat16Array) {
      const float16bitsArray = getFloat16BitsArray(target);
      length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    } else {
      length = (0, _primordials.TypedArrayPrototypeGetLength)(target);
    }
    if (length < count) {
      throw (0, _primordials.NativeTypeError)(_messages.DERIVED_CONSTRUCTOR_CREATED_TYPEDARRAY_OBJECT_WHICH_WAS_TOO_SMALL_LENGTH);
    }
  }
  if ((0, _is.isNativeBigIntTypedArray)(target)) {
    throw (0, _primordials.NativeTypeError)(_messages.CANNOT_MIX_BIGINT_AND_OTHER_TYPES);
  }
}
function getFloat16BitsArray(float16) {
  const float16bitsArray = (0, _primordials.WeakMapPrototypeGet)(float16bitsArrays, float16);
  if (float16bitsArray !== undefined) {
    const buffer = (0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray);
    if ((0, _spec.IsDetachedBuffer)(buffer)) {
      throw (0, _primordials.NativeTypeError)(_messages.ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
    }
    return float16bitsArray;
  }
  const buffer = float16.buffer;
  if ((0, _spec.IsDetachedBuffer)(buffer)) {
    throw (0, _primordials.NativeTypeError)(_messages.ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
  }
  const cloned = (0, _primordials.ReflectConstruct)(Float16Array, [buffer, float16.byteOffset, float16.length], float16.constructor);
  return (0, _primordials.WeakMapPrototypeGet)(float16bitsArrays, cloned);
}
function copyToArray(float16bitsArray) {
  const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
  const array = [];
  for (let i = 0; i < length; ++i) {
    array[i] = (0, _converter.convertToNumber)(float16bitsArray[i]);
  }
  return array;
}
const TypedArrayPrototypeGetters = new _primordials.NativeWeakSet();
for (const key of (0, _primordials.ReflectOwnKeys)(_primordials.TypedArrayPrototype)) {
  if (key === _primordials.SymbolToStringTag) {
    continue;
  }
  const descriptor = (0, _primordials.ReflectGetOwnPropertyDescriptor)(_primordials.TypedArrayPrototype, key);
  if ((0, _primordials.ObjectHasOwn)(descriptor, "get") && typeof descriptor.get === "function") {
    (0, _primordials.WeakSetPrototypeAdd)(TypedArrayPrototypeGetters, descriptor.get);
  }
}
const handler = (0, _primordials.ObjectFreeze)({
  get(target, key, receiver) {
    if ((0, _is.isCanonicalIntegerIndexString)(key) && (0, _primordials.ObjectHasOwn)(target, key)) {
      return (0, _converter.convertToNumber)((0, _primordials.ReflectGet)(target, key));
    }
    if ((0, _primordials.WeakSetPrototypeHas)(TypedArrayPrototypeGetters, (0, _primordials.ObjectPrototype__lookupGetter__)(target, key))) {
      return (0, _primordials.ReflectGet)(target, key);
    }
    return (0, _primordials.ReflectGet)(target, key, receiver);
  },
  set(target, key, value, receiver) {
    if ((0, _is.isCanonicalIntegerIndexString)(key) && (0, _primordials.ObjectHasOwn)(target, key)) {
      return (0, _primordials.ReflectSet)(target, key, (0, _converter.roundToFloat16Bits)(value));
    }
    return (0, _primordials.ReflectSet)(target, key, value, receiver);
  },
  getOwnPropertyDescriptor(target, key) {
    if ((0, _is.isCanonicalIntegerIndexString)(key) && (0, _primordials.ObjectHasOwn)(target, key)) {
      const descriptor = (0, _primordials.ReflectGetOwnPropertyDescriptor)(target, key);
      descriptor.value = (0, _converter.convertToNumber)(descriptor.value);
      return descriptor;
    }
    return (0, _primordials.ReflectGetOwnPropertyDescriptor)(target, key);
  },
  defineProperty(target, key, descriptor) {
    if ((0, _is.isCanonicalIntegerIndexString)(key) && (0, _primordials.ObjectHasOwn)(target, key) && (0, _primordials.ObjectHasOwn)(descriptor, "value")) {
      descriptor.value = (0, _converter.roundToFloat16Bits)(descriptor.value);
      return (0, _primordials.ReflectDefineProperty)(target, key, descriptor);
    }
    return (0, _primordials.ReflectDefineProperty)(target, key, descriptor);
  }
});
class Float16Array {
  constructor(input, _byteOffset, _length) {
    let float16bitsArray;
    if (isFloat16Array(input)) {
      float16bitsArray = (0, _primordials.ReflectConstruct)(_primordials.NativeUint16Array, [getFloat16BitsArray(input)], new.target);
    } else if ((0, _is.isObject)(input) && !(0, _is.isAnyArrayBuffer)(input)) {
      let list;
      let length;
      if ((0, _is.isNativeTypedArray)(input)) {
        list = input;
        length = (0, _primordials.TypedArrayPrototypeGetLength)(input);
        const buffer = (0, _primordials.TypedArrayPrototypeGetBuffer)(input);
        if ((0, _spec.IsDetachedBuffer)(buffer)) {
          throw (0, _primordials.NativeTypeError)(_messages.ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
        }
        if ((0, _is.isNativeBigIntTypedArray)(input)) {
          throw (0, _primordials.NativeTypeError)(_messages.CANNOT_MIX_BIGINT_AND_OTHER_TYPES);
        }
        const data = new _primordials.NativeArrayBuffer(length * BYTES_PER_ELEMENT);
        float16bitsArray = (0, _primordials.ReflectConstruct)(_primordials.NativeUint16Array, [data], new.target);
      } else {
        const iterator = input[_primordials.SymbolIterator];
        if (iterator != null && typeof iterator !== "function") {
          throw (0, _primordials.NativeTypeError)(_messages.ITERATOR_PROPERTY_IS_NOT_CALLABLE);
        }
        if (iterator != null) {
          if ((0, _is.isOrdinaryArray)(input)) {
            list = input;
            length = input.length;
          } else {
            list = [...(input)];
            length = list.length;
          }
        } else {
          list = input;
          length = (0, _spec.ToLength)(list.length);
        }
        float16bitsArray = (0, _primordials.ReflectConstruct)(_primordials.NativeUint16Array, [length], new.target);
      }
      for (let i = 0; i < length; ++i) {
        float16bitsArray[i] = (0, _converter.roundToFloat16Bits)(list[i]);
      }
    } else {
      float16bitsArray = (0, _primordials.ReflectConstruct)(_primordials.NativeUint16Array, arguments, new.target);
    }
    const proxy = new _primordials.NativeProxy(float16bitsArray, handler);
    (0, _primordials.WeakMapPrototypeSet)(float16bitsArrays, proxy, float16bitsArray);
    return proxy;
  }
  static from(src, ...opts) {
    const Constructor = this;
    if (!(0, _primordials.ReflectHas)(Constructor, _brand.brand)) {
      throw (0, _primordials.NativeTypeError)(_messages.THIS_CONSTRUCTOR_IS_NOT_A_SUBCLASS_OF_FLOAT16ARRAY);
    }
    if (Constructor === Float16Array) {
      if (isFloat16Array(src) && opts.length === 0) {
        const float16bitsArray = getFloat16BitsArray(src);
        const uint16 = new _primordials.NativeUint16Array((0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray));
        return new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.TypedArrayPrototypeSlice)(uint16)));
      }
      if (opts.length === 0) {
        return new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.Uint16ArrayFrom)(src, _converter.roundToFloat16Bits)));
      }
      const mapFunc = opts[0];
      const thisArg = opts[1];
      return new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.Uint16ArrayFrom)(src, function (val, ...args) {
        return (0, _converter.roundToFloat16Bits)((0, _primordials.ReflectApply)(mapFunc, this, [val, ...(0, _arrayIterator.safeIfNeeded)(args)]));
      }, thisArg)));
    }
    let list;
    let length;
    const iterator = src[_primordials.SymbolIterator];
    if (iterator != null && typeof iterator !== "function") {
      throw (0, _primordials.NativeTypeError)(_messages.ITERATOR_PROPERTY_IS_NOT_CALLABLE);
    }
    if (iterator != null) {
      if ((0, _is.isOrdinaryArray)(src)) {
        list = src;
        length = src.length;
      } else if ((0, _is.isOrdinaryNativeTypedArray)(src)) {
        list = src;
        length = (0, _primordials.TypedArrayPrototypeGetLength)(src);
      } else {
        list = [...src];
        length = list.length;
      }
    } else {
      if (src == null) {
        throw (0, _primordials.NativeTypeError)(_messages.CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT);
      }
      list = (0, _primordials.NativeObject)(src);
      length = (0, _spec.ToLength)(list.length);
    }
    const array = new Constructor(length);
    if (opts.length === 0) {
      for (let i = 0; i < length; ++i) {
        array[i] = list[i];
      }
    } else {
      const mapFunc = opts[0];
      const thisArg = opts[1];
      for (let i = 0; i < length; ++i) {
        array[i] = (0, _primordials.ReflectApply)(mapFunc, thisArg, [list[i], i]);
      }
    }
    return array;
  }
  static of(...items) {
    const Constructor = this;
    if (!(0, _primordials.ReflectHas)(Constructor, _brand.brand)) {
      throw (0, _primordials.NativeTypeError)(_messages.THIS_CONSTRUCTOR_IS_NOT_A_SUBCLASS_OF_FLOAT16ARRAY);
    }
    const length = items.length;
    if (Constructor === Float16Array) {
      const proxy = new Float16Array(length);
      const float16bitsArray = getFloat16BitsArray(proxy);
      for (let i = 0; i < length; ++i) {
        float16bitsArray[i] = (0, _converter.roundToFloat16Bits)(items[i]);
      }
      return proxy;
    }
    const array = new Constructor(length);
    for (let i = 0; i < length; ++i) {
      array[i] = items[i];
    }
    return array;
  }
  keys() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    return (0, _primordials.TypedArrayPrototypeKeys)(float16bitsArray);
  }
  values() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    return (0, _arrayIterator.wrap)(function* () {
      for (const val of (0, _primordials.TypedArrayPrototypeValues)(float16bitsArray)) {
        yield (0, _converter.convertToNumber)(val);
      }
    }());
  }
  entries() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    return (0, _arrayIterator.wrap)(function* () {
      for (const [i, val] of (0, _primordials.TypedArrayPrototypeEntries)(float16bitsArray)) {
        yield ([i, (0, _converter.convertToNumber)(val)]);
      }
    }());
  }
  at(index) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const relativeIndex = (0, _spec.ToIntegerOrInfinity)(index);
    const k = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
    if (k < 0 || k >= length) {
      return;
    }
    return (0, _converter.convertToNumber)(float16bitsArray[k]);
  }
  with(index, value) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const relativeIndex = (0, _spec.ToIntegerOrInfinity)(index);
    const k = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
    const number = +value;
    if (k < 0 || k >= length) {
      throw (0, _primordials.NativeRangeError)(_messages.OFFSET_IS_OUT_OF_BOUNDS);
    }
    const uint16 = new _primordials.NativeUint16Array((0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray));
    const cloned = new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.TypedArrayPrototypeSlice)(uint16)));
    const array = getFloat16BitsArray(cloned);
    array[k] = (0, _converter.roundToFloat16Bits)(number);
    return cloned;
  }
  map(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    const Constructor = (0, _spec.SpeciesConstructor)(float16bitsArray, Float16Array);
    if (Constructor === Float16Array) {
      const proxy = new Float16Array(length);
      const array = getFloat16BitsArray(proxy);
      for (let i = 0; i < length; ++i) {
        const val = (0, _converter.convertToNumber)(float16bitsArray[i]);
        array[i] = (0, _converter.roundToFloat16Bits)((0, _primordials.ReflectApply)(callback, thisArg, [val, i, this]));
      }
      return proxy;
    }
    const array = new Constructor(length);
    assertSpeciesTypedArray(array, length);
    for (let i = 0; i < length; ++i) {
      const val = (0, _converter.convertToNumber)(float16bitsArray[i]);
      array[i] = (0, _primordials.ReflectApply)(callback, thisArg, [val, i, this]);
    }
    return array;
  }
  filter(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    const kept = [];
    for (let i = 0; i < length; ++i) {
      const val = (0, _converter.convertToNumber)(float16bitsArray[i]);
      if ((0, _primordials.ReflectApply)(callback, thisArg, [val, i, this])) {
        (0, _primordials.ArrayPrototypePush)(kept, val);
      }
    }
    const Constructor = (0, _spec.SpeciesConstructor)(float16bitsArray, Float16Array);
    const array = new Constructor(kept);
    assertSpeciesTypedArray(array);
    return array;
  }
  reduce(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    if (length === 0 && opts.length === 0) {
      throw (0, _primordials.NativeTypeError)(_messages.REDUCE_OF_EMPTY_ARRAY_WITH_NO_INITIAL_VALUE);
    }
    let accumulator, start;
    if (opts.length === 0) {
      accumulator = (0, _converter.convertToNumber)(float16bitsArray[0]);
      start = 1;
    } else {
      accumulator = opts[0];
      start = 0;
    }
    for (let i = start; i < length; ++i) {
      accumulator = callback(accumulator, (0, _converter.convertToNumber)(float16bitsArray[i]), i, this);
    }
    return accumulator;
  }
  reduceRight(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    if (length === 0 && opts.length === 0) {
      throw (0, _primordials.NativeTypeError)(_messages.REDUCE_OF_EMPTY_ARRAY_WITH_NO_INITIAL_VALUE);
    }
    let accumulator, start;
    if (opts.length === 0) {
      accumulator = (0, _converter.convertToNumber)(float16bitsArray[length - 1]);
      start = length - 2;
    } else {
      accumulator = opts[0];
      start = length - 1;
    }
    for (let i = start; i >= 0; --i) {
      accumulator = callback(accumulator, (0, _converter.convertToNumber)(float16bitsArray[i]), i, this);
    }
    return accumulator;
  }
  forEach(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = 0; i < length; ++i) {
      (0, _primordials.ReflectApply)(callback, thisArg, [(0, _converter.convertToNumber)(float16bitsArray[i]), i, this]);
    }
  }
  find(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = 0; i < length; ++i) {
      const value = (0, _converter.convertToNumber)(float16bitsArray[i]);
      if ((0, _primordials.ReflectApply)(callback, thisArg, [value, i, this])) {
        return value;
      }
    }
  }
  findIndex(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = 0; i < length; ++i) {
      const value = (0, _converter.convertToNumber)(float16bitsArray[i]);
      if ((0, _primordials.ReflectApply)(callback, thisArg, [value, i, this])) {
        return i;
      }
    }
    return -1;
  }
  findLast(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = length - 1; i >= 0; --i) {
      const value = (0, _converter.convertToNumber)(float16bitsArray[i]);
      if ((0, _primordials.ReflectApply)(callback, thisArg, [value, i, this])) {
        return value;
      }
    }
  }
  findLastIndex(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = length - 1; i >= 0; --i) {
      const value = (0, _converter.convertToNumber)(float16bitsArray[i]);
      if ((0, _primordials.ReflectApply)(callback, thisArg, [value, i, this])) {
        return i;
      }
    }
    return -1;
  }
  every(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = 0; i < length; ++i) {
      if (!(0, _primordials.ReflectApply)(callback, thisArg, [(0, _converter.convertToNumber)(float16bitsArray[i]), i, this])) {
        return false;
      }
    }
    return true;
  }
  some(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const thisArg = opts[0];
    for (let i = 0; i < length; ++i) {
      if ((0, _primordials.ReflectApply)(callback, thisArg, [(0, _converter.convertToNumber)(float16bitsArray[i]), i, this])) {
        return true;
      }
    }
    return false;
  }
  set(input, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const targetOffset = (0, _spec.ToIntegerOrInfinity)(opts[0]);
    if (targetOffset < 0) {
      throw (0, _primordials.NativeRangeError)(_messages.OFFSET_IS_OUT_OF_BOUNDS);
    }
    if (input == null) {
      throw (0, _primordials.NativeTypeError)(_messages.CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT);
    }
    if ((0, _is.isNativeBigIntTypedArray)(input)) {
      throw (0, _primordials.NativeTypeError)(_messages.CANNOT_MIX_BIGINT_AND_OTHER_TYPES);
    }
    if (isFloat16Array(input)) {
      return (0, _primordials.TypedArrayPrototypeSet)(getFloat16BitsArray(this), getFloat16BitsArray(input), targetOffset);
    }
    if ((0, _is.isNativeTypedArray)(input)) {
      const buffer = (0, _primordials.TypedArrayPrototypeGetBuffer)(input);
      if ((0, _spec.IsDetachedBuffer)(buffer)) {
        throw (0, _primordials.NativeTypeError)(_messages.ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
      }
    }
    const targetLength = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const src = (0, _primordials.NativeObject)(input);
    const srcLength = (0, _spec.ToLength)(src.length);
    if (targetOffset === Infinity || srcLength + targetOffset > targetLength) {
      throw (0, _primordials.NativeRangeError)(_messages.OFFSET_IS_OUT_OF_BOUNDS);
    }
    for (let i = 0; i < srcLength; ++i) {
      float16bitsArray[i + targetOffset] = (0, _converter.roundToFloat16Bits)(src[i]);
    }
  }
  reverse() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    (0, _primordials.TypedArrayPrototypeReverse)(float16bitsArray);
    return this;
  }
  toReversed() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const uint16 = new _primordials.NativeUint16Array((0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray));
    const cloned = new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.TypedArrayPrototypeSlice)(uint16)));
    const clonedFloat16bitsArray = getFloat16BitsArray(cloned);
    (0, _primordials.TypedArrayPrototypeReverse)(clonedFloat16bitsArray);
    return cloned;
  }
  fill(value, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    (0, _primordials.TypedArrayPrototypeFill)(float16bitsArray, (0, _converter.roundToFloat16Bits)(value), ...(0, _arrayIterator.safeIfNeeded)(opts));
    return this;
  }
  copyWithin(target, start, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    (0, _primordials.TypedArrayPrototypeCopyWithin)(float16bitsArray, target, start, ...(0, _arrayIterator.safeIfNeeded)(opts));
    return this;
  }
  sort(compareFn) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const sortCompare = compareFn !== undefined ? compareFn : _spec.defaultCompare;
    (0, _primordials.TypedArrayPrototypeSort)(float16bitsArray, (x, y) => {
      return sortCompare((0, _converter.convertToNumber)(x), (0, _converter.convertToNumber)(y));
    });
    return this;
  }
  toSorted(compareFn) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    if (compareFn !== undefined && typeof compareFn !== "function") {
      throw new _primordials.NativeTypeError(_messages.THE_COMPARISON_FUNCTION_MUST_BE_EITHER_A_FUNCTION_OR_UNDEFINED);
    }
    const sortCompare = compareFn !== undefined ? compareFn : _spec.defaultCompare;
    const uint16 = new _primordials.NativeUint16Array((0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray));
    const cloned = new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.TypedArrayPrototypeSlice)(uint16)));
    const clonedFloat16bitsArray = getFloat16BitsArray(cloned);
    (0, _primordials.TypedArrayPrototypeSort)(clonedFloat16bitsArray, (x, y) => {
      return sortCompare((0, _converter.convertToNumber)(x), (0, _converter.convertToNumber)(y));
    });
    return cloned;
  }
  slice(start, end) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const Constructor = (0, _spec.SpeciesConstructor)(float16bitsArray, Float16Array);
    if (Constructor === Float16Array) {
      const uint16 = new _primordials.NativeUint16Array((0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray));
      return new Float16Array((0, _primordials.TypedArrayPrototypeGetBuffer)((0, _primordials.TypedArrayPrototypeSlice)(uint16, start, end)));
    }
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    const relativeStart = (0, _spec.ToIntegerOrInfinity)(start);
    const relativeEnd = end === undefined ? length : (0, _spec.ToIntegerOrInfinity)(end);
    let k;
    if (relativeStart === -Infinity) {
      k = 0;
    } else if (relativeStart < 0) {
      k = length + relativeStart > 0 ? length + relativeStart : 0;
    } else {
      k = length < relativeStart ? length : relativeStart;
    }
    let final;
    if (relativeEnd === -Infinity) {
      final = 0;
    } else if (relativeEnd < 0) {
      final = length + relativeEnd > 0 ? length + relativeEnd : 0;
    } else {
      final = length < relativeEnd ? length : relativeEnd;
    }
    const count = final - k > 0 ? final - k : 0;
    const array = new Constructor(count);
    assertSpeciesTypedArray(array, count);
    if (count === 0) {
      return array;
    }
    const buffer = (0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray);
    if ((0, _spec.IsDetachedBuffer)(buffer)) {
      throw (0, _primordials.NativeTypeError)(_messages.ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
    }
    let n = 0;
    while (k < final) {
      array[n] = (0, _converter.convertToNumber)(float16bitsArray[k]);
      ++k;
      ++n;
    }
    return array;
  }
  subarray(begin, end) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const Constructor = (0, _spec.SpeciesConstructor)(float16bitsArray, Float16Array);
    const uint16 = new _primordials.NativeUint16Array((0, _primordials.TypedArrayPrototypeGetBuffer)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(float16bitsArray), (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray));
    const uint16Subarray = (0, _primordials.TypedArrayPrototypeSubarray)(uint16, begin, end);
    const array = new Constructor((0, _primordials.TypedArrayPrototypeGetBuffer)(uint16Subarray), (0, _primordials.TypedArrayPrototypeGetByteOffset)(uint16Subarray), (0, _primordials.TypedArrayPrototypeGetLength)(uint16Subarray));
    assertSpeciesTypedArray(array);
    return array;
  }
  indexOf(element, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    let from = (0, _spec.ToIntegerOrInfinity)(opts[0]);
    if (from === Infinity) {
      return -1;
    }
    if (from < 0) {
      from += length;
      if (from < 0) {
        from = 0;
      }
    }
    for (let i = from; i < length; ++i) {
      if ((0, _primordials.ObjectHasOwn)(float16bitsArray, i) && (0, _converter.convertToNumber)(float16bitsArray[i]) === element) {
        return i;
      }
    }
    return -1;
  }
  lastIndexOf(element, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    let from = opts.length >= 1 ? (0, _spec.ToIntegerOrInfinity)(opts[0]) : length - 1;
    if (from === -Infinity) {
      return -1;
    }
    if (from >= 0) {
      from = from < length - 1 ? from : length - 1;
    } else {
      from += length;
    }
    for (let i = from; i >= 0; --i) {
      if ((0, _primordials.ObjectHasOwn)(float16bitsArray, i) && (0, _converter.convertToNumber)(float16bitsArray[i]) === element) {
        return i;
      }
    }
    return -1;
  }
  includes(element, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const length = (0, _primordials.TypedArrayPrototypeGetLength)(float16bitsArray);
    let from = (0, _spec.ToIntegerOrInfinity)(opts[0]);
    if (from === Infinity) {
      return false;
    }
    if (from < 0) {
      from += length;
      if (from < 0) {
        from = 0;
      }
    }
    const isNaN = (0, _primordials.NumberIsNaN)(element);
    for (let i = from; i < length; ++i) {
      const value = (0, _converter.convertToNumber)(float16bitsArray[i]);
      if (isNaN && (0, _primordials.NumberIsNaN)(value)) {
        return true;
      }
      if (value === element) {
        return true;
      }
    }
    return false;
  }
  join(separator) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const array = copyToArray(float16bitsArray);
    return (0, _primordials.ArrayPrototypeJoin)(array, separator);
  }
  toLocaleString(...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);
    const array = copyToArray(float16bitsArray);
    return (0, _primordials.ArrayPrototypeToLocaleString)(array, ...(0, _arrayIterator.safeIfNeeded)(opts));
  }
  get [_primordials.SymbolToStringTag]() {
    if (isFloat16Array(this)) {
      return "Float16Array";
    }
  }
}
exports.Float16Array = Float16Array;
(0, _primordials.ObjectDefineProperty)(Float16Array, "BYTES_PER_ELEMENT", {
  value: BYTES_PER_ELEMENT
});
(0, _primordials.ObjectDefineProperty)(Float16Array, _brand.brand, {});
(0, _primordials.ReflectSetPrototypeOf)(Float16Array, _primordials.TypedArray);
const Float16ArrayPrototype = Float16Array.prototype;
(0, _primordials.ObjectDefineProperty)(Float16ArrayPrototype, "BYTES_PER_ELEMENT", {
  value: BYTES_PER_ELEMENT
});
(0, _primordials.ObjectDefineProperty)(Float16ArrayPrototype, _primordials.SymbolIterator, {
  value: Float16ArrayPrototype.values,
  writable: true,
  configurable: true
});
(0, _primordials.ReflectSetPrototypeOf)(Float16ArrayPrototype, _primordials.TypedArrayPrototype);