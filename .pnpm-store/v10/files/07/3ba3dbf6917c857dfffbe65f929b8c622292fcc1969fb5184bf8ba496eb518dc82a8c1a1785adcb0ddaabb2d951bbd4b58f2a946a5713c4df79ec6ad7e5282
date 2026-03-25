import { isFloat16Array } from "./Float16Array.mjs";
import { isNativeTypedArray } from "./_util/is.mjs";

/**
 * @param {unknown} target
 * @returns {value is Uint8Array|Uint8ClampedArray|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float16Array|Float32Array|Float64Array|BigUint64Array|BigInt64Array}
 */
export function isTypedArray(target) {
  return isNativeTypedArray(target) || isFloat16Array(target);
}
