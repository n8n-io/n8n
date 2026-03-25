import {
  argumentsTag,
  arrayBufferTag,
  arrayTag,
  booleanTag,
  dataViewTag,
  dateTag,
  float32ArrayTag,
  float64ArrayTag,
  getSymbols,
  getTag,
  int16ArrayTag,
  int32ArrayTag,
  int8ArrayTag,
  isPlainObject,
  isPrimitive,
  isTypedArray,
  mapTag,
  numberTag,
  objectTag,
  regexpTag,
  setTag,
  stringTag,
  symbolTag,
  uint16ArrayTag,
  uint32ArrayTag,
  uint8ArrayTag,
  uint8ClampedArrayTag
} from "./chunk-GFLS4VP3.js";

// ../node_modules/es-toolkit/dist/object/mapValues.mjs
function mapValues(object, getNewValue) {
  let result = {}, keys = Object.keys(object);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i], value = object[key];
    result[key] = getNewValue(value, key, object);
  }
  return result;
}

// ../node_modules/es-toolkit/dist/_internal/isUnsafeProperty.mjs
function isUnsafeProperty(key) {
  return key === "__proto__";
}

// ../node_modules/es-toolkit/dist/object/mergeWith.mjs
function mergeWith(target, source, merge2) {
  let sourceKeys = Object.keys(source);
  for (let i = 0; i < sourceKeys.length; i++) {
    let key = sourceKeys[i];
    if (isUnsafeProperty(key))
      continue;
    let sourceValue = source[key], targetValue = target[key], merged = merge2(targetValue, sourceValue, key, target, source);
    merged !== void 0 ? target[key] = merged : Array.isArray(sourceValue) ? Array.isArray(targetValue) ? target[key] = mergeWith(targetValue, sourceValue, merge2) : target[key] = mergeWith([], sourceValue, merge2) : isPlainObject(sourceValue) ? isPlainObject(targetValue) ? target[key] = mergeWith(targetValue, sourceValue, merge2) : target[key] = mergeWith({}, sourceValue, merge2) : (targetValue === void 0 || sourceValue !== void 0) && (target[key] = sourceValue);
  }
  return target;
}

// ../node_modules/es-toolkit/dist/object/pick.mjs
function pick(obj, keys) {
  let result = {};
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    Object.hasOwn(obj, key) && (result[key] = obj[key]);
  }
  return result;
}

// ../node_modules/es-toolkit/dist/object/pickBy.mjs
function pickBy(obj, shouldPick) {
  let result = {}, keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i], value = obj[key];
    shouldPick(value, key) && (result[key] = value);
  }
  return result;
}

// ../node_modules/es-toolkit/dist/object/clone.mjs
function clone(obj) {
  if (isPrimitive(obj))
    return obj;
  if (Array.isArray(obj) || isTypedArray(obj) || obj instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && obj instanceof SharedArrayBuffer)
    return obj.slice(0);
  let prototype = Object.getPrototypeOf(obj), Constructor = prototype.constructor;
  if (obj instanceof Date || obj instanceof Map || obj instanceof Set)
    return new Constructor(obj);
  if (obj instanceof RegExp) {
    let newRegExp = new Constructor(obj);
    return newRegExp.lastIndex = obj.lastIndex, newRegExp;
  }
  if (obj instanceof DataView)
    return new Constructor(obj.buffer.slice(0));
  if (obj instanceof Error) {
    let newError = new Constructor(obj.message);
    return newError.stack = obj.stack, newError.name = obj.name, newError.cause = obj.cause, newError;
  }
  if (typeof File < "u" && obj instanceof File)
    return new Constructor([obj], obj.name, { type: obj.type, lastModified: obj.lastModified });
  if (typeof obj == "object") {
    let newObject = Object.create(prototype);
    return Object.assign(newObject, obj);
  }
  return obj;
}

// ../node_modules/es-toolkit/dist/object/cloneDeepWith.mjs
function cloneDeepWithImpl(valueToClone, keyToClone, objectToClone, stack = /* @__PURE__ */ new Map(), cloneValue = void 0) {
  let cloned = cloneValue?.(valueToClone, keyToClone, objectToClone, stack);
  if (cloned !== void 0)
    return cloned;
  if (isPrimitive(valueToClone))
    return valueToClone;
  if (stack.has(valueToClone))
    return stack.get(valueToClone);
  if (Array.isArray(valueToClone)) {
    let result = new Array(valueToClone.length);
    stack.set(valueToClone, result);
    for (let i = 0; i < valueToClone.length; i++)
      result[i] = cloneDeepWithImpl(valueToClone[i], i, objectToClone, stack, cloneValue);
    return Object.hasOwn(valueToClone, "index") && (result.index = valueToClone.index), Object.hasOwn(valueToClone, "input") && (result.input = valueToClone.input), result;
  }
  if (valueToClone instanceof Date)
    return new Date(valueToClone.getTime());
  if (valueToClone instanceof RegExp) {
    let result = new RegExp(valueToClone.source, valueToClone.flags);
    return result.lastIndex = valueToClone.lastIndex, result;
  }
  if (valueToClone instanceof Map) {
    let result = /* @__PURE__ */ new Map();
    stack.set(valueToClone, result);
    for (let [key, value] of valueToClone)
      result.set(key, cloneDeepWithImpl(value, key, objectToClone, stack, cloneValue));
    return result;
  }
  if (valueToClone instanceof Set) {
    let result = /* @__PURE__ */ new Set();
    stack.set(valueToClone, result);
    for (let value of valueToClone)
      result.add(cloneDeepWithImpl(value, void 0, objectToClone, stack, cloneValue));
    return result;
  }
  if (typeof Buffer < "u" && Buffer.isBuffer(valueToClone))
    return valueToClone.subarray();
  if (isTypedArray(valueToClone)) {
    let result = new (Object.getPrototypeOf(valueToClone)).constructor(valueToClone.length);
    stack.set(valueToClone, result);
    for (let i = 0; i < valueToClone.length; i++)
      result[i] = cloneDeepWithImpl(valueToClone[i], i, objectToClone, stack, cloneValue);
    return result;
  }
  if (valueToClone instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && valueToClone instanceof SharedArrayBuffer)
    return valueToClone.slice(0);
  if (valueToClone instanceof DataView) {
    let result = new DataView(valueToClone.buffer.slice(0), valueToClone.byteOffset, valueToClone.byteLength);
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (typeof File < "u" && valueToClone instanceof File) {
    let result = new File([valueToClone], valueToClone.name, {
      type: valueToClone.type
    });
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (typeof Blob < "u" && valueToClone instanceof Blob) {
    let result = new Blob([valueToClone], { type: valueToClone.type });
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof Error) {
    let result = new valueToClone.constructor();
    return stack.set(valueToClone, result), result.message = valueToClone.message, result.name = valueToClone.name, result.stack = valueToClone.stack, result.cause = valueToClone.cause, copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof Boolean) {
    let result = new Boolean(valueToClone.valueOf());
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof Number) {
    let result = new Number(valueToClone.valueOf());
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof String) {
    let result = new String(valueToClone.valueOf());
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (typeof valueToClone == "object" && isCloneableObject(valueToClone)) {
    let result = Object.create(Object.getPrototypeOf(valueToClone));
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  return valueToClone;
}
function copyProperties(target, source, objectToClone = target, stack, cloneValue) {
  let keys = [...Object.keys(source), ...getSymbols(source)];
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i], descriptor = Object.getOwnPropertyDescriptor(target, key);
    (descriptor == null || descriptor.writable) && (target[key] = cloneDeepWithImpl(source[key], key, objectToClone, stack, cloneValue));
  }
}
function isCloneableObject(object) {
  switch (getTag(object)) {
    case argumentsTag:
    case arrayTag:
    case arrayBufferTag:
    case dataViewTag:
    case booleanTag:
    case dateTag:
    case float32ArrayTag:
    case float64ArrayTag:
    case int8ArrayTag:
    case int16ArrayTag:
    case int32ArrayTag:
    case mapTag:
    case numberTag:
    case objectTag:
    case regexpTag:
    case setTag:
    case stringTag:
    case symbolTag:
    case uint8ArrayTag:
    case uint8ClampedArrayTag:
    case uint16ArrayTag:
    case uint32ArrayTag:
      return !0;
    default:
      return !1;
  }
}

// ../node_modules/es-toolkit/dist/object/cloneDeep.mjs
function cloneDeep(obj) {
  return cloneDeepWithImpl(obj, void 0, obj, /* @__PURE__ */ new Map(), void 0);
}

// ../node_modules/es-toolkit/dist/string/words.mjs
var CASE_SPLIT_PATTERN = new RegExp("\\p{Lu}?\\p{Ll}+|[0-9]+|\\p{Lu}+(?!\\p{Ll})|\\p{Emoji_Presentation}|\\p{Extended_Pictographic}|\\p{L}+", "gu");

// ../node_modules/es-toolkit/dist/object/toMerged.mjs
function toMerged(target, source) {
  return mergeWith(clone(target), source, function mergeRecursively(targetValue, sourceValue) {
    if (Array.isArray(sourceValue))
      return Array.isArray(targetValue) ? mergeWith(clone(targetValue), sourceValue, mergeRecursively) : mergeWith([], sourceValue, mergeRecursively);
    if (isPlainObject(sourceValue))
      return isPlainObject(targetValue) ? mergeWith(clone(targetValue), sourceValue, mergeRecursively) : mergeWith({}, sourceValue, mergeRecursively);
  });
}

export {
  cloneDeep,
  mapValues,
  mergeWith,
  pick,
  pickBy,
  toMerged
};
