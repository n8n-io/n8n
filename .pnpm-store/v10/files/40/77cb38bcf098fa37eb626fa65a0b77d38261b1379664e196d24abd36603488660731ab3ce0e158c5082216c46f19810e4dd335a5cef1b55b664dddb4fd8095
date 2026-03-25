import { safeIfNeeded, wrap } from "./_util/arrayIterator.mjs";
import { brand, hasFloat16ArrayBrand } from "./_util/brand.mjs";
import { convertToNumber, roundToFloat16Bits } from "./_util/converter.mjs";
import {
  isAnyArrayBuffer,
  isCanonicalIntegerIndexString,
  isNativeBigIntTypedArray,
  isNativeTypedArray,
  isObject,
  isOrdinaryArray,
  isOrdinaryNativeTypedArray,
} from "./_util/is.mjs";
import {
  ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER,
  CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT,
  CANNOT_MIX_BIGINT_AND_OTHER_TYPES,
  DERIVED_CONSTRUCTOR_CREATED_TYPEDARRAY_OBJECT_WHICH_WAS_TOO_SMALL_LENGTH,
  ITERATOR_PROPERTY_IS_NOT_CALLABLE,
  OFFSET_IS_OUT_OF_BOUNDS,
  REDUCE_OF_EMPTY_ARRAY_WITH_NO_INITIAL_VALUE,
  SPECIES_CONSTRUCTOR_DIDNT_RETURN_TYPEDARRAY_OBJECT,
  THE_COMPARISON_FUNCTION_MUST_BE_EITHER_A_FUNCTION_OR_UNDEFINED,
  THIS_CONSTRUCTOR_IS_NOT_A_SUBCLASS_OF_FLOAT16ARRAY,
  THIS_IS_NOT_A_FLOAT16ARRAY_OBJECT,
} from "./_util/messages.mjs";
import {
  ArrayBufferIsView,
  ArrayPrototypeJoin,
  ArrayPrototypePush,
  ArrayPrototypeToLocaleString,
  NativeArrayBuffer,
  NativeObject,
  NativeProxy,
  NativeRangeError,
  NativeTypeError,
  NativeUint16Array,
  NativeWeakMap,
  NativeWeakSet,
  NumberIsNaN,
  ObjectDefineProperty,
  ObjectFreeze,
  ObjectHasOwn,
  ObjectPrototype__lookupGetter__,
  ReflectApply,
  ReflectConstruct,
  ReflectDefineProperty,
  ReflectGet,
  ReflectGetOwnPropertyDescriptor,
  ReflectHas,
  ReflectOwnKeys,
  ReflectSet,
  ReflectSetPrototypeOf,
  SymbolIterator,
  SymbolToStringTag,
  TypedArray,
  TypedArrayPrototype,
  TypedArrayPrototypeCopyWithin,
  TypedArrayPrototypeEntries,
  TypedArrayPrototypeFill,
  TypedArrayPrototypeGetBuffer,
  TypedArrayPrototypeGetByteOffset,
  TypedArrayPrototypeGetLength,
  TypedArrayPrototypeKeys,
  TypedArrayPrototypeReverse,
  TypedArrayPrototypeSet,
  TypedArrayPrototypeSlice,
  TypedArrayPrototypeSort,
  TypedArrayPrototypeSubarray,
  TypedArrayPrototypeValues,
  Uint16ArrayFrom,
  WeakMapPrototypeGet,
  WeakMapPrototypeHas,
  WeakMapPrototypeSet,
  WeakSetPrototypeAdd,
  WeakSetPrototypeHas,
} from "./_util/primordials.mjs";
import {
  IsDetachedBuffer,
  SpeciesConstructor,
  ToIntegerOrInfinity,
  ToLength,
  defaultCompare,
} from "./_util/spec.mjs";

const BYTES_PER_ELEMENT = 2;

/** @typedef {Uint16Array & { __float16bits: never }} Float16BitsArray */

/** @type {WeakMap<Float16Array, Float16BitsArray>} */
const float16bitsArrays = new NativeWeakMap();

/**
 * @param {unknown} target
 * @returns {target is Float16Array}
 */
export function isFloat16Array(target) {
  return WeakMapPrototypeHas(float16bitsArrays, target) ||
    (!ArrayBufferIsView(target) && hasFloat16ArrayBrand(target));
}

/**
 * @param {unknown} target
 * @throws {TypeError}
 * @returns {asserts target is Float16Array}
 */
function assertFloat16Array(target) {
  if (!isFloat16Array(target)) {
    throw NativeTypeError(THIS_IS_NOT_A_FLOAT16ARRAY_OBJECT);
  }
}

/**
 * @param {unknown} target
 * @param {number=} count
 * @throws {TypeError}
 * @returns {asserts target is Uint8Array|Uint8ClampedArray|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float16Array|Float32Array|Float64Array}
 */
function assertSpeciesTypedArray(target, count) {
  const isTargetFloat16Array = isFloat16Array(target);
  const isTargetTypedArray = isNativeTypedArray(target);

  if (!isTargetFloat16Array && !isTargetTypedArray) {
    throw NativeTypeError(SPECIES_CONSTRUCTOR_DIDNT_RETURN_TYPEDARRAY_OBJECT);
  }

  if (typeof count === "number") {
    let length;
    if (isTargetFloat16Array) {
      const float16bitsArray = getFloat16BitsArray(target);
      length = TypedArrayPrototypeGetLength(float16bitsArray);
    } else {
      length = TypedArrayPrototypeGetLength(target);
    }

    if (length < count) {
      throw NativeTypeError(
        DERIVED_CONSTRUCTOR_CREATED_TYPEDARRAY_OBJECT_WHICH_WAS_TOO_SMALL_LENGTH
      );
    }
  }

  if (isNativeBigIntTypedArray(target)) {
    throw NativeTypeError(CANNOT_MIX_BIGINT_AND_OTHER_TYPES);
  }
}

/**
 * @param {Float16Array} float16
 * @throws {TypeError}
 * @returns {Float16BitsArray}
 */
function getFloat16BitsArray(float16) {
  const float16bitsArray = WeakMapPrototypeGet(float16bitsArrays, float16);
  if (float16bitsArray !== undefined) {
    const buffer = TypedArrayPrototypeGetBuffer(float16bitsArray);

    if (IsDetachedBuffer(buffer)) {
      throw NativeTypeError(ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
    }

    return float16bitsArray;
  }

  // from another Float16Array instance (a different version?)
  const buffer = /** @type {any} */ (float16).buffer;

  if (IsDetachedBuffer(buffer)) {
    throw NativeTypeError(ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
  }

  const cloned = ReflectConstruct(Float16Array, [
    buffer,
    /** @type {any} */ (float16).byteOffset,
    /** @type {any} */ (float16).length,
  ], float16.constructor);
  return WeakMapPrototypeGet(float16bitsArrays, cloned);
}

/**
 * @param {Float16BitsArray} float16bitsArray
 * @returns {number[]}
 */
function copyToArray(float16bitsArray) {
  const length = TypedArrayPrototypeGetLength(float16bitsArray);

  const array = [];
  for (let i = 0; i < length; ++i) {
    array[i] = convertToNumber(float16bitsArray[i]);
  }

  return array;
}

/** @type {WeakSet<Function>} */
const TypedArrayPrototypeGetters = new NativeWeakSet();
for (const key of ReflectOwnKeys(TypedArrayPrototype)) {
  // @@toStringTag getter property is defined in Float16Array.prototype
  if (key === SymbolToStringTag) {
    continue;
  }

  const descriptor = ReflectGetOwnPropertyDescriptor(TypedArrayPrototype, key);
  if (ObjectHasOwn(descriptor, "get") && typeof descriptor.get === "function") {
    WeakSetPrototypeAdd(TypedArrayPrototypeGetters, descriptor.get);
  }
}

const handler = ObjectFreeze(/** @type {ProxyHandler<Float16BitsArray>} */ ({
  get(target, key, receiver) {
    if (isCanonicalIntegerIndexString(key) && ObjectHasOwn(target, key)) {
      return convertToNumber(ReflectGet(target, key));
    }

    // %TypedArray%.prototype getter properties cannot called by Proxy receiver
    if (WeakSetPrototypeHas(TypedArrayPrototypeGetters, ObjectPrototype__lookupGetter__(target, key))) {
      return ReflectGet(target, key);
    }

    return ReflectGet(target, key, receiver);
  },

  set(target, key, value, receiver) {
    if (isCanonicalIntegerIndexString(key) && ObjectHasOwn(target, key)) {
      return ReflectSet(target, key, roundToFloat16Bits(value));
    }

    return ReflectSet(target, key, value, receiver);
  },

  getOwnPropertyDescriptor(target, key) {
    if (isCanonicalIntegerIndexString(key) && ObjectHasOwn(target, key)) {
      const descriptor = ReflectGetOwnPropertyDescriptor(target, key);
      descriptor.value = convertToNumber(descriptor.value);
      return descriptor;
    }

    return ReflectGetOwnPropertyDescriptor(target, key);
  },

  defineProperty(target, key, descriptor) {
    if (
      isCanonicalIntegerIndexString(key) &&
      ObjectHasOwn(target, key) &&
      ObjectHasOwn(descriptor, "value")
    ) {
      descriptor.value = roundToFloat16Bits(descriptor.value);
      return ReflectDefineProperty(target, key, descriptor);
    }

    return ReflectDefineProperty(target, key, descriptor);
  },
}));

export class Float16Array {
  /** @see https://tc39.es/ecma262/#sec-typedarray */
  constructor(input, _byteOffset, _length) {
    /** @type {Float16BitsArray} */
    let float16bitsArray;

    if (isFloat16Array(input)) {
      float16bitsArray = ReflectConstruct(NativeUint16Array, [getFloat16BitsArray(input)], new.target);
    } else if (isObject(input) && !isAnyArrayBuffer(input)) { // object without ArrayBuffer, SharedArrayBuffer
      /** @type {ArrayLike<unknown>} */
      let list;
      /** @type {number} */
      let length;

      if (isNativeTypedArray(input)) { // TypedArray
        list = input;
        length = TypedArrayPrototypeGetLength(input);

        const buffer = TypedArrayPrototypeGetBuffer(input);

        if (IsDetachedBuffer(buffer)) {
          throw NativeTypeError(ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
        }

        if (isNativeBigIntTypedArray(input)) {
          throw NativeTypeError(CANNOT_MIX_BIGINT_AND_OTHER_TYPES);
        }

        const data = new NativeArrayBuffer(
          length * BYTES_PER_ELEMENT
        );
        float16bitsArray = ReflectConstruct(NativeUint16Array, [data], new.target);
      } else {
        const iterator = input[SymbolIterator];
        if (iterator != null && typeof iterator !== "function") {
          throw NativeTypeError(ITERATOR_PROPERTY_IS_NOT_CALLABLE);
        }

        if (iterator != null) { // Iterable (Array)
          // for optimization
          if (isOrdinaryArray(input)) {
            list = input;
            length = input.length;
          } else {
            // eslint-disable-next-line no-restricted-syntax
            list = [... /** @type {Iterable<unknown>} */ (input)];
            length = list.length;
          }
        } else { // ArrayLike
          list = /** @type {ArrayLike<unknown>} */ (input);
          length = ToLength(list.length);
        }
        float16bitsArray = ReflectConstruct(NativeUint16Array, [length], new.target);
      }

      // set values
      for (let i = 0; i < length; ++i) {
        float16bitsArray[i] = roundToFloat16Bits(list[i]);
      }
    } else { // primitive, ArrayBuffer, SharedArrayBuffer
      float16bitsArray = ReflectConstruct(NativeUint16Array, arguments, new.target);
    }

    /** @type {Float16Array} */
    const proxy = /** @type {any} */ (new NativeProxy(float16bitsArray, handler));

    // proxy private storage
    WeakMapPrototypeSet(float16bitsArrays, proxy, float16bitsArray);

    return proxy;
  }

  /**
   * limitation: `Object.getOwnPropertyNames(Float16Array)` or `Reflect.ownKeys(Float16Array)` include this key
   * @see https://tc39.es/ecma262/#sec-%typedarray%.from
   */
  static from(src, ...opts) {
    const Constructor = this;

    if (!ReflectHas(Constructor, brand)) {
      throw NativeTypeError(
        THIS_CONSTRUCTOR_IS_NOT_A_SUBCLASS_OF_FLOAT16ARRAY
      );
    }

    // for optimization
    if (Constructor === Float16Array) {
      if (isFloat16Array(src) && opts.length === 0) {
        const float16bitsArray = getFloat16BitsArray(src);
        const uint16 = new NativeUint16Array(
          TypedArrayPrototypeGetBuffer(float16bitsArray),
          TypedArrayPrototypeGetByteOffset(float16bitsArray),
          TypedArrayPrototypeGetLength(float16bitsArray)
        );
        return new Float16Array(
          TypedArrayPrototypeGetBuffer(TypedArrayPrototypeSlice(uint16))
        );
      }

      if (opts.length === 0) {
        return new Float16Array(
          TypedArrayPrototypeGetBuffer(
            Uint16ArrayFrom(src, roundToFloat16Bits)
          )
        );
      }

      const mapFunc = opts[0];
      const thisArg = opts[1];

      return new Float16Array(
        TypedArrayPrototypeGetBuffer(
          Uint16ArrayFrom(src, function (val, ...args) {
            return roundToFloat16Bits(
              ReflectApply(mapFunc, this, [val, ...safeIfNeeded(args)])
            );
          }, thisArg)
        )
      );
    }

    /** @type {ArrayLike<unknown>} */
    let list;
    /** @type {number} */
    let length;

    const iterator = src[SymbolIterator];
    if (iterator != null && typeof iterator !== "function") {
      throw NativeTypeError(ITERATOR_PROPERTY_IS_NOT_CALLABLE);
    }

    if (iterator != null) { // Iterable (TypedArray, Array)
      // for optimization
      if (isOrdinaryArray(src)) {
        list = src;
        length = src.length;
      } else if (isOrdinaryNativeTypedArray(src)) {
        list = src;
        length = TypedArrayPrototypeGetLength(src);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        list = [...src];
        length = list.length;
      }
    } else { // ArrayLike
      if (src == null) {
        throw NativeTypeError(
          CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT
        );
      }
      list = NativeObject(src);
      length = ToLength(list.length);
    }

    const array = new Constructor(length);

    if (opts.length === 0) {
      for (let i = 0; i < length; ++i) {
        array[i] = /** @type {number} */ (list[i]);
      }
    } else {
      const mapFunc = opts[0];
      const thisArg = opts[1];
      for (let i = 0; i < length; ++i) {
        array[i] = ReflectApply(mapFunc, thisArg, [list[i], i]);
      }
    }

    return array;
  }

  /**
   * limitation: `Object.getOwnPropertyNames(Float16Array)` or `Reflect.ownKeys(Float16Array)` include this key
   * @see https://tc39.es/ecma262/#sec-%typedarray%.of
   */
  static of(...items) {
    const Constructor = this;

    if (!ReflectHas(Constructor, brand)) {
      throw NativeTypeError(
        THIS_CONSTRUCTOR_IS_NOT_A_SUBCLASS_OF_FLOAT16ARRAY
      );
    }

    const length = items.length;

    // for optimization
    if (Constructor === Float16Array) {
      const proxy = new Float16Array(length);
      const float16bitsArray = getFloat16BitsArray(proxy);

      for (let i = 0; i < length; ++i) {
        float16bitsArray[i] = roundToFloat16Bits(items[i]);
      }

      return proxy;
    }

    const array = new Constructor(length);

    for (let i = 0; i < length; ++i) {
      array[i] = items[i];
    }

    return array;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.keys */
  keys() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    return TypedArrayPrototypeKeys(float16bitsArray);
  }

  /**
   * limitation: returns a object whose prototype is not `%ArrayIteratorPrototype%`
   * @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.values
   */
  values() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    return wrap((function* () {
      // eslint-disable-next-line no-restricted-syntax
      for (const val of TypedArrayPrototypeValues(float16bitsArray)) {
        yield convertToNumber(val);
      }
    })());
  }

  /**
   * limitation: returns a object whose prototype is not `%ArrayIteratorPrototype%`
   * @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.entries
   */
  entries() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    return wrap((function* () {
      // eslint-disable-next-line no-restricted-syntax
      for (const [i, val] of TypedArrayPrototypeEntries(float16bitsArray)) {
        yield /** @type {[number, number]} */ ([i, convertToNumber(val)]);
      }
    })());
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.at */
  at(index) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const relativeIndex = ToIntegerOrInfinity(index);
    const k = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;

    if (k < 0 || k >= length) {
      return;
    }

    return convertToNumber(float16bitsArray[k]);
  }

  /** @see https://tc39.es/proposal-change-array-by-copy/#sec-%typedarray%.prototype.with */
  with(index, value) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const relativeIndex = ToIntegerOrInfinity(index);
    const k = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;

    const number = +value;

    if (k < 0 || k >= length) {
      throw NativeRangeError(OFFSET_IS_OUT_OF_BOUNDS);
    }

    // don't use SpeciesConstructor
    const uint16 = new NativeUint16Array(
      TypedArrayPrototypeGetBuffer(float16bitsArray),
      TypedArrayPrototypeGetByteOffset(float16bitsArray),
      TypedArrayPrototypeGetLength(float16bitsArray)
    );
    const cloned = new Float16Array(
      TypedArrayPrototypeGetBuffer(
        TypedArrayPrototypeSlice(uint16)
      )
    );
    const array = getFloat16BitsArray(cloned);

    array[k] = roundToFloat16Bits(number);

    return cloned;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.map */
  map(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    const Constructor = SpeciesConstructor(float16bitsArray, Float16Array);

    // for optimization
    if (Constructor === Float16Array) {
      const proxy = new Float16Array(length);
      const array = getFloat16BitsArray(proxy);

      for (let i = 0; i < length; ++i) {
        const val = convertToNumber(float16bitsArray[i]);
        array[i] = roundToFloat16Bits(
          ReflectApply(callback, thisArg, [val, i, this])
        );
      }

      return proxy;
    }

    const array = new Constructor(length);
    assertSpeciesTypedArray(array, length);

    for (let i = 0; i < length; ++i) {
      const val = convertToNumber(float16bitsArray[i]);
      array[i] = ReflectApply(callback, thisArg, [val, i, this]);
    }

    return /** @type {any} */ (array);
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.filter */
  filter(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    const kept = [];
    for (let i = 0; i < length; ++i) {
      const val = convertToNumber(float16bitsArray[i]);
      if (ReflectApply(callback, thisArg, [val, i, this])) {
        ArrayPrototypePush(kept, val);
      }
    }

    const Constructor = SpeciesConstructor(float16bitsArray, Float16Array);
    const array = new Constructor(kept);
    assertSpeciesTypedArray(array);

    return /** @type {any} */ (array);
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduce */
  reduce(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    if (length === 0 && opts.length === 0) {
      throw NativeTypeError(REDUCE_OF_EMPTY_ARRAY_WITH_NO_INITIAL_VALUE);
    }

    let accumulator, start;
    if (opts.length === 0) {
      accumulator = convertToNumber(float16bitsArray[0]);
      start = 1;
    } else {
      accumulator = opts[0];
      start = 0;
    }

    for (let i = start; i < length; ++i) {
      accumulator = callback(
        accumulator,
        convertToNumber(float16bitsArray[i]),
        i,
        this
      );
    }

    return accumulator;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduceright */
  reduceRight(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    if (length === 0 && opts.length === 0) {
      throw NativeTypeError(REDUCE_OF_EMPTY_ARRAY_WITH_NO_INITIAL_VALUE);
    }

    let accumulator, start;
    if (opts.length === 0) {
      accumulator = convertToNumber(float16bitsArray[length - 1]);
      start = length - 2;
    } else {
      accumulator = opts[0];
      start = length - 1;
    }

    for (let i = start; i >= 0; --i) {
      accumulator = callback(
        accumulator,
        convertToNumber(float16bitsArray[i]),
        i,
        this
      );
    }

    return accumulator;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.foreach */
  forEach(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = 0; i < length; ++i) {
      ReflectApply(callback, thisArg, [
        convertToNumber(float16bitsArray[i]),
        i,
        this,
      ]);
    }
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.find */
  find(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = 0; i < length; ++i) {
      const value = convertToNumber(float16bitsArray[i]);
      if (ReflectApply(callback, thisArg, [value, i, this])) {
        return value;
      }
    }
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.findindex */
  findIndex(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = 0; i < length; ++i) {
      const value = convertToNumber(float16bitsArray[i]);
      if (ReflectApply(callback, thisArg, [value, i, this])) {
        return i;
      }
    }

    return -1;
  }

  /** @see https://tc39.es/proposal-array-find-from-last/index.html#sec-%typedarray%.prototype.findlast */
  findLast(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = length - 1; i >= 0; --i) {
      const value = convertToNumber(float16bitsArray[i]);
      if (ReflectApply(callback, thisArg, [value, i, this])) {
        return value;
      }
    }
  }

  /** @see https://tc39.es/proposal-array-find-from-last/index.html#sec-%typedarray%.prototype.findlastindex */
  findLastIndex(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = length - 1; i >= 0; --i) {
      const value = convertToNumber(float16bitsArray[i]);
      if (ReflectApply(callback, thisArg, [value, i, this])) {
        return i;
      }
    }

    return -1;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.every */
  every(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = 0; i < length; ++i) {
      if (
        !ReflectApply(callback, thisArg, [
          convertToNumber(float16bitsArray[i]),
          i,
          this,
        ])
      ) {
        return false;
      }
    }

    return true;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.some */
  some(callback, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const thisArg = opts[0];

    for (let i = 0; i < length; ++i) {
      if (
        ReflectApply(callback, thisArg, [
          convertToNumber(float16bitsArray[i]),
          i,
          this,
        ])
      ) {
        return true;
      }
    }

    return false;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.set */
  set(input, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const targetOffset = ToIntegerOrInfinity(opts[0]);
    if (targetOffset < 0) {
      throw NativeRangeError(OFFSET_IS_OUT_OF_BOUNDS);
    }

    if (input == null) {
      throw NativeTypeError(
        CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT
      );
    }

    if (isNativeBigIntTypedArray(input)) {
      throw NativeTypeError(
        CANNOT_MIX_BIGINT_AND_OTHER_TYPES
      );
    }

    // for optimization
    if (isFloat16Array(input)) {
      // peel off Proxy
      return TypedArrayPrototypeSet(
        getFloat16BitsArray(this),
        getFloat16BitsArray(input),
        targetOffset
      );
    }

    if (isNativeTypedArray(input)) {
      const buffer = TypedArrayPrototypeGetBuffer(input);
      if (IsDetachedBuffer(buffer)) {
        throw NativeTypeError(ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
      }
    }

    const targetLength = TypedArrayPrototypeGetLength(float16bitsArray);

    const src = NativeObject(input);
    const srcLength = ToLength(src.length);

    if (targetOffset === Infinity || srcLength + targetOffset > targetLength) {
      throw NativeRangeError(OFFSET_IS_OUT_OF_BOUNDS);
    }

    for (let i = 0; i < srcLength; ++i) {
      float16bitsArray[i + targetOffset] = roundToFloat16Bits(src[i]);
    }
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.reverse */
  reverse() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    TypedArrayPrototypeReverse(float16bitsArray);

    return this;
  }

  /** @see https://tc39.es/proposal-change-array-by-copy/#sec-%typedarray%.prototype.toReversed */
  toReversed() {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    // don't use SpeciesConstructor
    const uint16 = new NativeUint16Array(
      TypedArrayPrototypeGetBuffer(float16bitsArray),
      TypedArrayPrototypeGetByteOffset(float16bitsArray),
      TypedArrayPrototypeGetLength(float16bitsArray)
    );
    const cloned = new Float16Array(
      TypedArrayPrototypeGetBuffer(
        TypedArrayPrototypeSlice(uint16)
      )
    );

    const clonedFloat16bitsArray = getFloat16BitsArray(cloned);
    TypedArrayPrototypeReverse(clonedFloat16bitsArray);

    return cloned;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.fill */
  fill(value, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    TypedArrayPrototypeFill(
      float16bitsArray,
      roundToFloat16Bits(value),
      ...safeIfNeeded(opts)
    );

    return this;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.copywithin */
  copyWithin(target, start, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    TypedArrayPrototypeCopyWithin(float16bitsArray, target, start, ...safeIfNeeded(opts));

    return this;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort */
  sort(compareFn) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const sortCompare = compareFn !== undefined ? compareFn : defaultCompare;
    TypedArrayPrototypeSort(float16bitsArray, (x, y) => {
      return sortCompare(convertToNumber(x), convertToNumber(y));
    });

    return this;
  }

  /** @see https://tc39.es/proposal-change-array-by-copy/#sec-%typedarray%.prototype.toSorted */
  toSorted(compareFn) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    if (compareFn !== undefined && typeof compareFn !== "function") {
      throw new NativeTypeError(THE_COMPARISON_FUNCTION_MUST_BE_EITHER_A_FUNCTION_OR_UNDEFINED);
    }
    const sortCompare = compareFn !== undefined ? compareFn : defaultCompare;

    // don't use SpeciesConstructor
    const uint16 = new NativeUint16Array(
      TypedArrayPrototypeGetBuffer(float16bitsArray),
      TypedArrayPrototypeGetByteOffset(float16bitsArray),
      TypedArrayPrototypeGetLength(float16bitsArray)
    );
    const cloned = new Float16Array(
      TypedArrayPrototypeGetBuffer(
        TypedArrayPrototypeSlice(uint16)
      )
    );

    const clonedFloat16bitsArray = getFloat16BitsArray(cloned);
    TypedArrayPrototypeSort(clonedFloat16bitsArray, (x, y) => {
      return sortCompare(convertToNumber(x), convertToNumber(y));
    });

    return cloned;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.slice */
  slice(start, end) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const Constructor = SpeciesConstructor(float16bitsArray, Float16Array);

    // for optimization
    if (Constructor === Float16Array) {
      const uint16 = new NativeUint16Array(
        TypedArrayPrototypeGetBuffer(float16bitsArray),
        TypedArrayPrototypeGetByteOffset(float16bitsArray),
        TypedArrayPrototypeGetLength(float16bitsArray)
      );
      return new Float16Array(
        TypedArrayPrototypeGetBuffer(
          TypedArrayPrototypeSlice(uint16, start, end)
        )
      );
    }

    const length = TypedArrayPrototypeGetLength(float16bitsArray);
    const relativeStart = ToIntegerOrInfinity(start);
    const relativeEnd = end === undefined ? length : ToIntegerOrInfinity(end);

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

    const buffer = TypedArrayPrototypeGetBuffer(float16bitsArray);
    if (IsDetachedBuffer(buffer)) {
      throw NativeTypeError(ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER);
    }

    let n = 0;
    while (k < final) {
      array[n] = convertToNumber(float16bitsArray[k]);
      ++k;
      ++n;
    }

    return /** @type {any} */ (array);
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.subarray */
  subarray(begin, end) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const Constructor = SpeciesConstructor(float16bitsArray, Float16Array);

    const uint16 = new NativeUint16Array(
      TypedArrayPrototypeGetBuffer(float16bitsArray),
      TypedArrayPrototypeGetByteOffset(float16bitsArray),
      TypedArrayPrototypeGetLength(float16bitsArray)
    );
    const uint16Subarray = TypedArrayPrototypeSubarray(uint16, begin, end);

    const array = new Constructor(
      TypedArrayPrototypeGetBuffer(uint16Subarray),
      TypedArrayPrototypeGetByteOffset(uint16Subarray),
      TypedArrayPrototypeGetLength(uint16Subarray)
    );
    assertSpeciesTypedArray(array);

    return /** @type {any} */ (array);
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.indexof */
  indexOf(element, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);

    let from = ToIntegerOrInfinity(opts[0]);
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
      if (
        ObjectHasOwn(float16bitsArray, i) &&
        convertToNumber(float16bitsArray[i]) === element
      ) {
        return i;
      }
    }

    return -1;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.lastindexof */
  lastIndexOf(element, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);

    let from = opts.length >= 1 ? ToIntegerOrInfinity(opts[0]) : length - 1;
    if (from === -Infinity) {
      return -1;
    }

    if (from >= 0) {
      from = from < length - 1 ? from : length - 1;
    } else {
      from += length;
    }

    for (let i = from; i >= 0; --i) {
      if (
        ObjectHasOwn(float16bitsArray, i) &&
        convertToNumber(float16bitsArray[i]) === element
      ) {
        return i;
      }
    }

    return -1;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.includes */
  includes(element, ...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const length = TypedArrayPrototypeGetLength(float16bitsArray);

    let from = ToIntegerOrInfinity(opts[0]);
    if (from === Infinity) {
      return false;
    }

    if (from < 0) {
      from += length;
      if (from < 0) {
        from = 0;
      }
    }

    const isNaN = NumberIsNaN(element);
    for (let i = from; i < length; ++i) {
      const value = convertToNumber(float16bitsArray[i]);

      if (isNaN && NumberIsNaN(value)) {
        return true;
      }

      if (value === element) {
        return true;
      }
    }

    return false;
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.join */
  join(separator) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const array = copyToArray(float16bitsArray);

    return ArrayPrototypeJoin(array, separator);
  }

  /** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.tolocalestring */
  toLocaleString(...opts) {
    assertFloat16Array(this);
    const float16bitsArray = getFloat16BitsArray(this);

    const array = copyToArray(float16bitsArray);

    return ArrayPrototypeToLocaleString(array, ...safeIfNeeded(opts));
  }

  /** @see https://tc39.es/ecma262/#sec-get-%typedarray%.prototype-@@tostringtag */
  get [SymbolToStringTag]() {
    if (isFloat16Array(this)) {
      return /** @type {any} */ ("Float16Array");
    }
  }
}

/** @see https://tc39.es/ecma262/#sec-typedarray.bytes_per_element */
ObjectDefineProperty(Float16Array, "BYTES_PER_ELEMENT", {
  value: BYTES_PER_ELEMENT,
});

// limitation: It is peaked by `Object.getOwnPropertySymbols(Float16Array)` and `Reflect.ownKeys(Float16Array)`
ObjectDefineProperty(Float16Array, brand, {});

/** @see https://tc39.es/ecma262/#sec-properties-of-the-typedarray-constructors */
ReflectSetPrototypeOf(Float16Array, TypedArray);

const Float16ArrayPrototype = Float16Array.prototype;

/** @see https://tc39.es/ecma262/#sec-typedarray.prototype.bytes_per_element */
ObjectDefineProperty(Float16ArrayPrototype, "BYTES_PER_ELEMENT", {
  value: BYTES_PER_ELEMENT,
});

/** @see https://tc39.es/ecma262/#sec-%typedarray%.prototype-@@iterator */
ObjectDefineProperty(Float16ArrayPrototype, SymbolIterator, {
  value: Float16ArrayPrototype.values,
  writable: true,
  configurable: true,
});

ReflectSetPrototypeOf(Float16ArrayPrototype, TypedArrayPrototype);
