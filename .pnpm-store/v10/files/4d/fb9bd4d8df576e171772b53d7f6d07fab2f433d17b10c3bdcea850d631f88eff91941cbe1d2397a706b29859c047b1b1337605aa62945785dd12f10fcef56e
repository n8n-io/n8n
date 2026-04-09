import isSharedArrayBuffer from "./isSharedArrayBuffer.js";
export const INVALID_TYPE = Symbol("INVALID_TYPE");
export const INVALID_VALUE = Symbol("INVALID_VALUE");

// https://w3c.github.io/IndexedDB/#convert-value-to-key
// The "without exceptions" version is because we typically want to throw exceptions (DataError) but not for
// the "is potentially valid key range" routine.
const valueToKeyWithoutThrowing = (input, seen) => {
  if (typeof input === "number") {
    if (isNaN(input)) {
      // If input is NaN then return "invalid value".
      return INVALID_VALUE;
    }
    return input;
  } else if (Object.prototype.toString.call(input) === "[object Date]") {
    const ms = input.valueOf();
    if (isNaN(ms)) {
      // If ms is NaN then return "invalid value".
      return INVALID_VALUE;
    }
    return new Date(ms);
  } else if (typeof input === "string") {
    return input;
  } else if (
  // https://w3c.github.io/IndexedDB/#ref-for-dfn-buffer-source-type
  input instanceof ArrayBuffer || isSharedArrayBuffer(input) || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)) {
    // We can't consistently test detachedness, so instead we check if byteLength === 0
    // This isn't foolproof, but there's no perfect way to detect if Uint8Arrays or
    // SharedArrayBuffers are detached
    if ("detached" in input ? input.detached : input.byteLength === 0) {
      // If input is detached then return "invalid value".
      return INVALID_VALUE;
    }
    let arrayBuffer;
    let offset = 0;
    let length = 0;
    if (input instanceof ArrayBuffer || isSharedArrayBuffer(input)) {
      arrayBuffer = input;
      length = input.byteLength;
    } else {
      arrayBuffer = input.buffer;
      offset = input.byteOffset;
      length = input.byteLength;
    }
    return arrayBuffer.slice(offset, offset + length);
  } else if (Array.isArray(input)) {
    if (seen === undefined) {
      seen = new Set();
    } else if (seen.has(input)) {
      // If seen contains input, then return "invalid value".
      return INVALID_VALUE;
    }
    seen.add(input);

    // This algorithm is tricky to account for `bindings-inject-keys-bypass.any.js`. We _should_ return early when
    // encountering an invalid key/type, but we also need to avoid triggering `Object.prototype['10']` if it's been
    // overridden. One simple way to do this (and which doesn't rely on sparse arrays or other exotic solutions that
    // could cause de-opts) is to use `Array.from()` with a mapper function, which does not trigger the prototype
    // setter [1]. It does prevent an early return, but we can at least short-circuit inside the mapper function
    // (which isn't strictly necessary to pass the WPTs, but is closer to the spec).
    // [1]: See https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.from, specifically
    //      the chain CreateDataPropertyOrThrow -> CreateDataProperty -> DefineOwnProperty which defines
    //      the array element as an "own" property.
    let hasInvalid = false;
    const keys = Array.from({
      length: input.length
    }, (_, i) => {
      if (hasInvalid) {
        return;
      }
      const hop = Object.hasOwn(input, i);
      if (!hop) {
        // If hop is false, return "invalid value".
        hasInvalid = true;
        return;
      }
      const entry = input[i];
      const key = valueToKeyWithoutThrowing(entry, seen);
      // If key is "invalid value" or "invalid type" abort these steps and return "invalid value".
      if (key === INVALID_VALUE || key === INVALID_TYPE) {
        hasInvalid = true;
        return;
      }
      return key;
    });
    if (hasInvalid) {
      return INVALID_VALUE;
    }
    return keys;
  } else {
    // Otherwise: Return "invalid type".
    return INVALID_TYPE;
  }
};
export default valueToKeyWithoutThrowing;