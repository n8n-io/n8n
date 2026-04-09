import { DataError } from "./errors.js";
import valueToKeyWithoutThrowing, { INVALID_TYPE, INVALID_VALUE } from "./valueToKeyWithoutThrowing.js";
// https://w3c.github.io/IndexedDB/#convert-value-to-key
// Plus throwing a DataError for invalid value/invalid key, which is commonly done
// in lots of IndexedDB operations
const valueToKey = (input, seen) => {
  const result = valueToKeyWithoutThrowing(input, seen);
  if (result === INVALID_VALUE || result === INVALID_TYPE) {
    // If key is "invalid value" or "invalid type", throw a "DataError" DOMException
    throw new DataError();
  }
  return result;
};
export default valueToKey;