import {
  noop
} from "./chunk-QKODTO7K.js";
import {
  argumentsTag,
  arrayBufferTag,
  arrayTag,
  bigInt64ArrayTag,
  bigUint64ArrayTag,
  booleanTag,
  dataViewTag,
  dateTag,
  errorTag,
  float32ArrayTag,
  float64ArrayTag,
  functionTag,
  getSymbols,
  getTag,
  int16ArrayTag,
  int32ArrayTag,
  int8ArrayTag,
  isPlainObject,
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

// ../node_modules/es-toolkit/dist/compat/util/eq.mjs
function eq(value, other) {
  return value === other || Number.isNaN(value) && Number.isNaN(other);
}

// ../node_modules/es-toolkit/dist/predicate/isEqualWith.mjs
function isEqualWith(a, b, areValuesEqual) {
  return isEqualWithImpl(a, b, void 0, void 0, void 0, void 0, areValuesEqual);
}
function isEqualWithImpl(a, b, property, aParent, bParent, stack, areValuesEqual) {
  let result = areValuesEqual(a, b, property, aParent, bParent, stack);
  if (result !== void 0)
    return result;
  if (typeof a == typeof b)
    switch (typeof a) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return a === b;
      case "number":
        return a === b || Object.is(a, b);
      case "function":
        return a === b;
      case "object":
        return areObjectsEqual(a, b, stack, areValuesEqual);
    }
  return areObjectsEqual(a, b, stack, areValuesEqual);
}
function areObjectsEqual(a, b, stack, areValuesEqual) {
  if (Object.is(a, b))
    return !0;
  let aTag = getTag(a), bTag = getTag(b);
  if (aTag === argumentsTag && (aTag = objectTag), bTag === argumentsTag && (bTag = objectTag), aTag !== bTag)
    return !1;
  switch (aTag) {
    case stringTag:
      return a.toString() === b.toString();
    case numberTag: {
      let x = a.valueOf(), y = b.valueOf();
      return eq(x, y);
    }
    case booleanTag:
    case dateTag:
    case symbolTag:
      return Object.is(a.valueOf(), b.valueOf());
    case regexpTag:
      return a.source === b.source && a.flags === b.flags;
    case functionTag:
      return a === b;
  }
  stack = stack ?? /* @__PURE__ */ new Map();
  let aStack = stack.get(a), bStack = stack.get(b);
  if (aStack != null && bStack != null)
    return aStack === b;
  stack.set(a, b), stack.set(b, a);
  try {
    switch (aTag) {
      case mapTag: {
        if (a.size !== b.size)
          return !1;
        for (let [key, value] of a.entries())
          if (!b.has(key) || !isEqualWithImpl(value, b.get(key), key, a, b, stack, areValuesEqual))
            return !1;
        return !0;
      }
      case setTag: {
        if (a.size !== b.size)
          return !1;
        let aValues = Array.from(a.values()), bValues = Array.from(b.values());
        for (let i = 0; i < aValues.length; i++) {
          let aValue = aValues[i], index = bValues.findIndex((bValue) => isEqualWithImpl(aValue, bValue, void 0, a, b, stack, areValuesEqual));
          if (index === -1)
            return !1;
          bValues.splice(index, 1);
        }
        return !0;
      }
      case arrayTag:
      case uint8ArrayTag:
      case uint8ClampedArrayTag:
      case uint16ArrayTag:
      case uint32ArrayTag:
      case bigUint64ArrayTag:
      case int8ArrayTag:
      case int16ArrayTag:
      case int32ArrayTag:
      case bigInt64ArrayTag:
      case float32ArrayTag:
      case float64ArrayTag: {
        if (typeof Buffer < "u" && Buffer.isBuffer(a) !== Buffer.isBuffer(b) || a.length !== b.length)
          return !1;
        for (let i = 0; i < a.length; i++)
          if (!isEqualWithImpl(a[i], b[i], i, a, b, stack, areValuesEqual))
            return !1;
        return !0;
      }
      case arrayBufferTag:
        return a.byteLength !== b.byteLength ? !1 : areObjectsEqual(new Uint8Array(a), new Uint8Array(b), stack, areValuesEqual);
      case dataViewTag:
        return a.byteLength !== b.byteLength || a.byteOffset !== b.byteOffset ? !1 : areObjectsEqual(new Uint8Array(a), new Uint8Array(b), stack, areValuesEqual);
      case errorTag:
        return a.name === b.name && a.message === b.message;
      case objectTag: {
        if (!(areObjectsEqual(a.constructor, b.constructor, stack, areValuesEqual) || isPlainObject(a) && isPlainObject(b)))
          return !1;
        let aKeys = [...Object.keys(a), ...getSymbols(a)], bKeys = [...Object.keys(b), ...getSymbols(b)];
        if (aKeys.length !== bKeys.length)
          return !1;
        for (let i = 0; i < aKeys.length; i++) {
          let propKey = aKeys[i], aProp = a[propKey];
          if (!Object.hasOwn(b, propKey))
            return !1;
          let bProp = b[propKey];
          if (!isEqualWithImpl(aProp, bProp, propKey, a, b, stack, areValuesEqual))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    stack.delete(a), stack.delete(b);
  }
}

// ../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function isEqual(a, b) {
  return isEqualWith(a, b, noop);
}

export {
  isEqual
};
