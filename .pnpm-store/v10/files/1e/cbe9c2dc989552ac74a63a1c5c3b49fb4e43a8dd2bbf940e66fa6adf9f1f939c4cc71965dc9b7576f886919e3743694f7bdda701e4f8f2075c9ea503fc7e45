"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var utilityScriptSerializers_exports = {};
__export(utilityScriptSerializers_exports, {
  parseEvaluationResultValue: () => parseEvaluationResultValue,
  serializeAsCallArgument: () => serializeAsCallArgument
});
module.exports = __toCommonJS(utilityScriptSerializers_exports);
function isRegExp(obj) {
  try {
    return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
  } catch (error) {
    return false;
  }
}
function isDate(obj) {
  try {
    return obj instanceof Date || Object.prototype.toString.call(obj) === "[object Date]";
  } catch (error) {
    return false;
  }
}
function isURL(obj) {
  try {
    return obj instanceof URL || Object.prototype.toString.call(obj) === "[object URL]";
  } catch (error) {
    return false;
  }
}
function isError(obj) {
  try {
    return obj instanceof Error || obj && Object.getPrototypeOf(obj)?.name === "Error";
  } catch (error) {
    return false;
  }
}
function isTypedArray(obj, constructor) {
  try {
    return obj instanceof constructor || Object.prototype.toString.call(obj) === `[object ${constructor.name}]`;
  } catch (error) {
    return false;
  }
}
const typedArrayConstructors = {
  i8: Int8Array,
  ui8: Uint8Array,
  ui8c: Uint8ClampedArray,
  i16: Int16Array,
  ui16: Uint16Array,
  i32: Int32Array,
  ui32: Uint32Array,
  // TODO: add Float16Array once it's in baseline
  f32: Float32Array,
  f64: Float64Array,
  bi64: BigInt64Array,
  bui64: BigUint64Array
};
function typedArrayToBase64(array) {
  if ("toBase64" in array)
    return array.toBase64();
  const binary = Array.from(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).map((b) => String.fromCharCode(b)).join("");
  return btoa(binary);
}
function base64ToTypedArray(base64, TypedArrayConstructor) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return new TypedArrayConstructor(bytes.buffer);
}
function parseEvaluationResultValue(value, handles = [], refs = /* @__PURE__ */ new Map()) {
  if (Object.is(value, void 0))
    return void 0;
  if (typeof value === "object" && value) {
    if ("ref" in value)
      return refs.get(value.ref);
    if ("v" in value) {
      if (value.v === "undefined")
        return void 0;
      if (value.v === "null")
        return null;
      if (value.v === "NaN")
        return NaN;
      if (value.v === "Infinity")
        return Infinity;
      if (value.v === "-Infinity")
        return -Infinity;
      if (value.v === "-0")
        return -0;
      return void 0;
    }
    if ("d" in value) {
      return new Date(value.d);
    }
    if ("u" in value)
      return new URL(value.u);
    if ("bi" in value)
      return BigInt(value.bi);
    if ("e" in value) {
      const error = new Error(value.e.m);
      error.name = value.e.n;
      error.stack = value.e.s;
      return error;
    }
    if ("r" in value)
      return new RegExp(value.r.p, value.r.f);
    if ("a" in value) {
      const result = [];
      refs.set(value.id, result);
      for (const a of value.a)
        result.push(parseEvaluationResultValue(a, handles, refs));
      return result;
    }
    if ("o" in value) {
      const result = {};
      refs.set(value.id, result);
      for (const { k, v } of value.o) {
        if (k === "__proto__")
          continue;
        result[k] = parseEvaluationResultValue(v, handles, refs);
      }
      return result;
    }
    if ("h" in value)
      return handles[value.h];
    if ("ta" in value)
      return base64ToTypedArray(value.ta.b, typedArrayConstructors[value.ta.k]);
  }
  return value;
}
function serializeAsCallArgument(value, handleSerializer) {
  return serialize(value, handleSerializer, { visited: /* @__PURE__ */ new Map(), lastId: 0 });
}
function serialize(value, handleSerializer, visitorInfo) {
  if (value && typeof value === "object") {
    if (typeof globalThis.Window === "function" && value instanceof globalThis.Window)
      return "ref: <Window>";
    if (typeof globalThis.Document === "function" && value instanceof globalThis.Document)
      return "ref: <Document>";
    if (typeof globalThis.Node === "function" && value instanceof globalThis.Node)
      return "ref: <Node>";
  }
  return innerSerialize(value, handleSerializer, visitorInfo);
}
function innerSerialize(value, handleSerializer, visitorInfo) {
  const result = handleSerializer(value);
  if ("fallThrough" in result)
    value = result.fallThrough;
  else
    return result;
  if (typeof value === "symbol")
    return { v: "undefined" };
  if (Object.is(value, void 0))
    return { v: "undefined" };
  if (Object.is(value, null))
    return { v: "null" };
  if (Object.is(value, NaN))
    return { v: "NaN" };
  if (Object.is(value, Infinity))
    return { v: "Infinity" };
  if (Object.is(value, -Infinity))
    return { v: "-Infinity" };
  if (Object.is(value, -0))
    return { v: "-0" };
  if (typeof value === "boolean")
    return value;
  if (typeof value === "number")
    return value;
  if (typeof value === "string")
    return value;
  if (typeof value === "bigint")
    return { bi: value.toString() };
  if (isError(value)) {
    let stack;
    if (value.stack?.startsWith(value.name + ": " + value.message)) {
      stack = value.stack;
    } else {
      stack = `${value.name}: ${value.message}
${value.stack}`;
    }
    return { e: { n: value.name, m: value.message, s: stack } };
  }
  if (isDate(value))
    return { d: value.toJSON() };
  if (isURL(value))
    return { u: value.toJSON() };
  if (isRegExp(value))
    return { r: { p: value.source, f: value.flags } };
  for (const [k, ctor] of Object.entries(typedArrayConstructors)) {
    if (isTypedArray(value, ctor))
      return { ta: { b: typedArrayToBase64(value), k } };
  }
  const id = visitorInfo.visited.get(value);
  if (id)
    return { ref: id };
  if (Array.isArray(value)) {
    const a = [];
    const id2 = ++visitorInfo.lastId;
    visitorInfo.visited.set(value, id2);
    for (let i = 0; i < value.length; ++i)
      a.push(serialize(value[i], handleSerializer, visitorInfo));
    return { a, id: id2 };
  }
  if (typeof value === "object") {
    const o = [];
    const id2 = ++visitorInfo.lastId;
    visitorInfo.visited.set(value, id2);
    for (const name of Object.keys(value)) {
      let item;
      try {
        item = value[name];
      } catch (e) {
        continue;
      }
      if (name === "toJSON" && typeof item === "function")
        o.push({ k: name, v: { o: [], id: 0 } });
      else
        o.push({ k: name, v: serialize(item, handleSerializer, visitorInfo) });
    }
    let jsonWrapper;
    try {
      if (o.length === 0 && value.toJSON && typeof value.toJSON === "function")
        jsonWrapper = { value: value.toJSON() };
    } catch (e) {
    }
    if (jsonWrapper)
      return innerSerialize(jsonWrapper.value, handleSerializer, visitorInfo);
    return { o, id: id2 };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseEvaluationResultValue,
  serializeAsCallArgument
});
