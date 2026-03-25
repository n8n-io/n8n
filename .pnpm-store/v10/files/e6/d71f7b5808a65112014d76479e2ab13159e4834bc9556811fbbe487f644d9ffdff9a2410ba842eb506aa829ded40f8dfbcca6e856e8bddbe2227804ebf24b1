// ../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function isPlainObject(value) {
  if (!value || typeof value != "object")
    return !1;
  let proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null ? Object.prototype.toString.call(value) === "[object Object]" : !1;
}

// ../node_modules/es-toolkit/dist/predicate/isPrimitive.mjs
function isPrimitive(value) {
  return value == null || typeof value != "object" && typeof value != "function";
}

// ../node_modules/es-toolkit/dist/predicate/isTypedArray.mjs
function isTypedArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

// ../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function getSymbols(object) {
  return Object.getOwnPropertySymbols(object).filter((symbol) => Object.prototype.propertyIsEnumerable.call(object, symbol));
}

// ../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function getTag(value) {
  return value == null ? value === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value);
}

// ../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var regexpTag = "[object RegExp]", stringTag = "[object String]", numberTag = "[object Number]", booleanTag = "[object Boolean]", argumentsTag = "[object Arguments]", symbolTag = "[object Symbol]", dateTag = "[object Date]", mapTag = "[object Map]", setTag = "[object Set]", arrayTag = "[object Array]", functionTag = "[object Function]", arrayBufferTag = "[object ArrayBuffer]", objectTag = "[object Object]", errorTag = "[object Error]", dataViewTag = "[object DataView]", uint8ArrayTag = "[object Uint8Array]", uint8ClampedArrayTag = "[object Uint8ClampedArray]", uint16ArrayTag = "[object Uint16Array]", uint32ArrayTag = "[object Uint32Array]", bigUint64ArrayTag = "[object BigUint64Array]", int8ArrayTag = "[object Int8Array]", int16ArrayTag = "[object Int16Array]", int32ArrayTag = "[object Int32Array]", bigInt64ArrayTag = "[object BigInt64Array]", float32ArrayTag = "[object Float32Array]", float64ArrayTag = "[object Float64Array]";

export {
  isPrimitive,
  isTypedArray,
  getSymbols,
  getTag,
  regexpTag,
  stringTag,
  numberTag,
  booleanTag,
  argumentsTag,
  symbolTag,
  dateTag,
  mapTag,
  setTag,
  arrayTag,
  functionTag,
  arrayBufferTag,
  objectTag,
  errorTag,
  dataViewTag,
  uint8ArrayTag,
  uint8ClampedArrayTag,
  uint16ArrayTag,
  uint32ArrayTag,
  bigUint64ArrayTag,
  int8ArrayTag,
  int16ArrayTag,
  int32ArrayTag,
  bigInt64ArrayTag,
  float32ArrayTag,
  float64ArrayTag,
  isPlainObject
};
