import CJS_COMPAT_NODE_URL_etqjn00nkf from 'node:url';
import CJS_COMPAT_NODE_PATH_etqjn00nkf from 'node:path';
import CJS_COMPAT_NODE_MODULE_etqjn00nkf from "node:module";

var __filename = CJS_COMPAT_NODE_URL_etqjn00nkf.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_etqjn00nkf.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_etqjn00nkf.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// ../../node_modules/@ungap/structured-clone/esm/deserialize.js
var env = typeof self == "object" ? self : globalThis, deserializer = ($, _) => {
  let as = (out, index) => ($.set(index, out), out), unpair = (index) => {
    if ($.has(index))
      return $.get(index);
    let [type, value] = _[index];
    switch (type) {
      case 0:
      case -1:
        return as(value, index);
      case 1: {
        let arr = as([], index);
        for (let index2 of value)
          arr.push(unpair(index2));
        return arr;
      }
      case 2: {
        let object = as({}, index);
        for (let [key, index2] of value)
          object[unpair(key)] = unpair(index2);
        return object;
      }
      case 3:
        return as(new Date(value), index);
      case 4: {
        let { source, flags } = value;
        return as(new RegExp(source, flags), index);
      }
      case 5: {
        let map = as(/* @__PURE__ */ new Map(), index);
        for (let [key, index2] of value)
          map.set(unpair(key), unpair(index2));
        return map;
      }
      case 6: {
        let set = as(/* @__PURE__ */ new Set(), index);
        for (let index2 of value)
          set.add(unpair(index2));
        return set;
      }
      case 7: {
        let { name, message } = value;
        return as(new env[name](message), index);
      }
      case 8:
        return as(BigInt(value), index);
      case "BigInt":
        return as(Object(BigInt(value)), index);
      case "ArrayBuffer":
        return as(new Uint8Array(value).buffer, value);
      case "DataView": {
        let { buffer } = new Uint8Array(value);
        return as(new DataView(buffer), value);
      }
    }
    return as(new env[type](value), index);
  };
  return unpair;
}, deserialize = (serialized) => deserializer(/* @__PURE__ */ new Map(), serialized)(0);

// ../../node_modules/@ungap/structured-clone/esm/serialize.js
var EMPTY = "", { toString } = {}, { keys } = Object, typeOf = (value) => {
  let type = typeof value;
  if (type !== "object" || !value)
    return [0, type];
  let asString = toString.call(value).slice(8, -1);
  switch (asString) {
    case "Array":
      return [1, EMPTY];
    case "Object":
      return [2, EMPTY];
    case "Date":
      return [3, EMPTY];
    case "RegExp":
      return [4, EMPTY];
    case "Map":
      return [5, EMPTY];
    case "Set":
      return [6, EMPTY];
    case "DataView":
      return [1, asString];
  }
  return asString.includes("Array") ? [1, asString] : asString.includes("Error") ? [7, asString] : [2, asString];
}, shouldSkip = ([TYPE, type]) => TYPE === 0 && (type === "function" || type === "symbol"), serializer = (strict, json, $, _) => {
  let as = (out, value) => {
    let index = _.push(out) - 1;
    return $.set(value, index), index;
  }, pair = (value) => {
    if ($.has(value))
      return $.get(value);
    let [TYPE, type] = typeOf(value);
    switch (TYPE) {
      case 0: {
        let entry = value;
        switch (type) {
          case "bigint":
            TYPE = 8, entry = value.toString();
            break;
          case "function":
          case "symbol":
            if (strict)
              throw new TypeError("unable to serialize " + type);
            entry = null;
            break;
          case "undefined":
            return as([-1], value);
        }
        return as([TYPE, entry], value);
      }
      case 1: {
        if (type) {
          let spread = value;
          return type === "DataView" ? spread = new Uint8Array(value.buffer) : type === "ArrayBuffer" && (spread = new Uint8Array(value)), as([type, [...spread]], value);
        }
        let arr = [], index = as([TYPE, arr], value);
        for (let entry of value)
          arr.push(pair(entry));
        return index;
      }
      case 2: {
        if (type)
          switch (type) {
            case "BigInt":
              return as([type, value.toString()], value);
            case "Boolean":
            case "Number":
            case "String":
              return as([type, value.valueOf()], value);
          }
        if (json && "toJSON" in value)
          return pair(value.toJSON());
        let entries = [], index = as([TYPE, entries], value);
        for (let key of keys(value))
          (strict || !shouldSkip(typeOf(value[key]))) && entries.push([pair(key), pair(value[key])]);
        return index;
      }
      case 3:
        return as([TYPE, value.toISOString()], value);
      case 4: {
        let { source, flags } = value;
        return as([TYPE, { source, flags }], value);
      }
      case 5: {
        let entries = [], index = as([TYPE, entries], value);
        for (let [key, entry] of value)
          (strict || !(shouldSkip(typeOf(key)) || shouldSkip(typeOf(entry)))) && entries.push([pair(key), pair(entry)]);
        return index;
      }
      case 6: {
        let entries = [], index = as([TYPE, entries], value);
        for (let entry of value)
          (strict || !shouldSkip(typeOf(entry))) && entries.push(pair(entry));
        return index;
      }
    }
    let { message } = value;
    return as([TYPE, { name: type, message }], value);
  };
  return pair;
}, serialize = (value, { json, lossy } = {}) => {
  let _ = [];
  return serializer(!(json || lossy), !!json, /* @__PURE__ */ new Map(), _)(value), _;
};

// ../../node_modules/@ungap/structured-clone/esm/index.js
var esm_default = typeof structuredClone == "function" ? (
  /* c8 ignore start */
  (any, options) => options && ("json" in options || "lossy" in options) ? deserialize(serialize(any, options)) : structuredClone(any)
) : (any, options) => deserialize(serialize(any, options));

// ../../node_modules/space-separated-tokens/index.js
function parse(value) {
  let input = String(value || "").trim();
  return input ? input.split(/[ \t\n\r\f]+/g) : [];
}
function stringify(values) {
  return values.join(" ").trim();
}

export {
  esm_default,
  parse,
  stringify
};
