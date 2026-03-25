import { isObject, isSharedArrayBuffer } from "./is.mjs";
import {
  THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT,
  THIS_IS_NOT_AN_OBJECT,
} from "./messages.mjs";
import {
  ArrayBufferPrototypeSlice,
  MAX_SAFE_INTEGER,
  MathTrunc,
  NativeTypeError,
  NumberIsNaN,
  ObjectIs,
  SymbolSpecies,
} from "./primordials.mjs";

/**
 * @see https://tc39.es/ecma262/#sec-tointegerorinfinity
 * @param {unknown} target
 * @returns {number}
 */
export function ToIntegerOrInfinity(target) {
  const number = +target;

  if (NumberIsNaN(number) || number === 0) {
    return 0;
  }

  return MathTrunc(number);
}

/**
 * @see https://tc39.es/ecma262/#sec-tolength
 * @param {unknown} target
 * @returns {number}
 */
export function ToLength(target) {
  const length = ToIntegerOrInfinity(target);
  if (length < 0) {
    return 0;
  }

  return length < MAX_SAFE_INTEGER
    ? length
    : MAX_SAFE_INTEGER;
}

/**
 * @see https://tc39.es/ecma262/#sec-speciesconstructor
 * @param {object} target
 * @param {{ new(...args: any[]): any; }} defaultConstructor
 * @returns {{ new(...args: any[]): any; }}
 */
export function SpeciesConstructor(target, defaultConstructor) {
  if (!isObject(target)) {
    throw NativeTypeError(THIS_IS_NOT_AN_OBJECT);
  }

  const constructor = target.constructor;
  if (constructor === undefined) {
    return defaultConstructor;
  }
  if (!isObject(constructor)) {
    throw NativeTypeError(THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT);
  }

  const species = constructor[SymbolSpecies];
  if (species == null) {
    return defaultConstructor;
  }

  return species;
}

/**
 * @see https://tc39.es/ecma262/#sec-isdetachedbuffer
 * @param {ArrayBufferLike} buffer
 * @returns {boolean}
 */
export function IsDetachedBuffer(buffer) {
  if (isSharedArrayBuffer(buffer)) {
    return false;
  }

  try {
    ArrayBufferPrototypeSlice(buffer, 0, 0);
    return false;
  } catch (e) {/* empty */}

  return true;
}

/**
 * bigint comparisons are not supported
 * @see https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort
 * @param {number} x
 * @param {number} y
 * @returns {-1 | 0 | 1}
 */
export function defaultCompare(x, y) {
  const isXNaN = NumberIsNaN(x);
  const isYNaN = NumberIsNaN(y);

  if (isXNaN && isYNaN) {
    return 0;
  }

  if (isXNaN) {
    return 1;
  }

  if (isYNaN) {
    return -1;
  }

  if (x < y) {
    return -1;
  }

  if (x > y) {
    return 1;
  }

  if (x === 0 && y === 0) {
    const isXPlusZero = ObjectIs(x, 0);
    const isYPlusZero = ObjectIs(y, 0);

    if (!isXPlusZero && isYPlusZero) {
      return -1;
    }

    if (isXPlusZero && !isYPlusZero) {
      return 1;
    }
  }

  return 0;
}
