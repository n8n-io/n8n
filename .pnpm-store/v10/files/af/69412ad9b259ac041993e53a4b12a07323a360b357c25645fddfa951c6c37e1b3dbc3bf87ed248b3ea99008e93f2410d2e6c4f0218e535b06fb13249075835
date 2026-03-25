import { safeIfNeeded } from "./_util/arrayIterator.mjs";
import { convertToNumber, roundToFloat16Bits } from "./_util/converter.mjs";
import {
  DataViewPrototypeGetUint16,
  DataViewPrototypeSetUint16,
} from "./_util/primordials.mjs";

/**
 * returns an unsigned 16-bit float at the specified byte offset from the start of the DataView
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {[boolean]} opts
 * @returns {number}
 */
export function getFloat16(dataView, byteOffset, ...opts) {
  return convertToNumber(
    DataViewPrototypeGetUint16(dataView, byteOffset, ...safeIfNeeded(opts))
  );
}

/**
 * stores an unsigned 16-bit float value at the specified byte offset from the start of the DataView
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {number} value
 * @param {[boolean]} opts
 */
export function setFloat16(dataView, byteOffset, value, ...opts) {
  return DataViewPrototypeSetUint16(
    dataView,
    byteOffset,
    roundToFloat16Bits(value),
    ...safeIfNeeded(opts)
  );
}
