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
var validatorPrimitives_exports = {};
__export(validatorPrimitives_exports, {
  ValidationError: () => ValidationError,
  createMetadataValidator: () => createMetadataValidator,
  findValidator: () => findValidator,
  maybeFindValidator: () => maybeFindValidator,
  scheme: () => scheme,
  tAny: () => tAny,
  tArray: () => tArray,
  tBinary: () => tBinary,
  tBoolean: () => tBoolean,
  tChannel: () => tChannel,
  tEnum: () => tEnum,
  tFloat: () => tFloat,
  tInt: () => tInt,
  tObject: () => tObject,
  tOptional: () => tOptional,
  tString: () => tString,
  tType: () => tType,
  tUndefined: () => tUndefined
});
module.exports = __toCommonJS(validatorPrimitives_exports);
class ValidationError extends Error {
}
const scheme = {};
function findValidator(type, method, kind) {
  const validator = maybeFindValidator(type, method, kind);
  if (!validator)
    throw new ValidationError(`Unknown scheme for ${kind}: ${type}.${method}`);
  return validator;
}
function maybeFindValidator(type, method, kind) {
  const schemeName = type + (kind === "Initializer" ? "" : method[0].toUpperCase() + method.substring(1)) + kind;
  return scheme[schemeName];
}
function createMetadataValidator() {
  return tOptional(scheme["Metadata"]);
}
const tFloat = (arg, path, context) => {
  if (arg instanceof Number)
    return arg.valueOf();
  if (typeof arg === "number")
    return arg;
  throw new ValidationError(`${path}: expected float, got ${typeof arg}`);
};
const tInt = (arg, path, context) => {
  let value;
  if (arg instanceof Number)
    value = arg.valueOf();
  else if (typeof arg === "number")
    value = arg;
  else
    throw new ValidationError(`${path}: expected integer, got ${typeof arg}`);
  if (!Number.isInteger(value))
    throw new ValidationError(`${path}: expected integer, got float ${value}`);
  return value;
};
const tBoolean = (arg, path, context) => {
  if (arg instanceof Boolean)
    return arg.valueOf();
  if (typeof arg === "boolean")
    return arg;
  throw new ValidationError(`${path}: expected boolean, got ${typeof arg}`);
};
const tString = (arg, path, context) => {
  if (arg instanceof String)
    return arg.valueOf();
  if (typeof arg === "string")
    return arg;
  throw new ValidationError(`${path}: expected string, got ${typeof arg}`);
};
const tBinary = (arg, path, context) => {
  if (context.binary === "fromBase64") {
    if (arg instanceof String)
      return Buffer.from(arg.valueOf(), "base64");
    if (typeof arg === "string")
      return Buffer.from(arg, "base64");
    throw new ValidationError(`${path}: expected base64-encoded buffer, got ${typeof arg}`);
  }
  if (context.binary === "toBase64") {
    if (!(arg instanceof Buffer))
      throw new ValidationError(`${path}: expected Buffer, got ${typeof arg}`);
    return arg.toString("base64");
  }
  if (context.binary === "buffer") {
    if (!(arg instanceof Buffer))
      throw new ValidationError(`${path}: expected Buffer, got ${typeof arg}`);
    return arg;
  }
  throw new ValidationError(`Unsupported binary behavior "${context.binary}"`);
};
const tUndefined = (arg, path, context) => {
  if (Object.is(arg, void 0))
    return arg;
  throw new ValidationError(`${path}: expected undefined, got ${typeof arg}`);
};
const tAny = (arg, path, context) => {
  return arg;
};
const tOptional = (v) => {
  return (arg, path, context) => {
    if (Object.is(arg, void 0))
      return arg;
    return v(arg, path, context);
  };
};
const tArray = (v) => {
  return (arg, path, context) => {
    if (!Array.isArray(arg))
      throw new ValidationError(`${path}: expected array, got ${typeof arg}`);
    return arg.map((x, index) => v(x, path + "[" + index + "]", context));
  };
};
const tObject = (s) => {
  return (arg, path, context) => {
    if (Object.is(arg, null))
      throw new ValidationError(`${path}: expected object, got null`);
    if (typeof arg !== "object")
      throw new ValidationError(`${path}: expected object, got ${typeof arg}`);
    const result = {};
    for (const [key, v] of Object.entries(s)) {
      const value = v(arg[key], path ? path + "." + key : key, context);
      if (!Object.is(value, void 0))
        result[key] = value;
    }
    if (context.isUnderTest()) {
      for (const [key, value] of Object.entries(arg)) {
        if (key.startsWith("__testHook"))
          result[key] = value;
      }
    }
    return result;
  };
};
const tEnum = (e) => {
  return (arg, path, context) => {
    if (!e.includes(arg))
      throw new ValidationError(`${path}: expected one of (${e.join("|")})`);
    return arg;
  };
};
const tChannel = (names) => {
  return (arg, path, context) => {
    return context.tChannelImpl(names, arg, path, context);
  };
};
const tType = (name) => {
  return (arg, path, context) => {
    const v = scheme[name];
    if (!v)
      throw new ValidationError(path + ': unknown type "' + name + '"');
    return v(arg, path, context);
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ValidationError,
  createMetadataValidator,
  findValidator,
  maybeFindValidator,
  scheme,
  tAny,
  tArray,
  tBinary,
  tBoolean,
  tChannel,
  tEnum,
  tFloat,
  tInt,
  tObject,
  tOptional,
  tString,
  tType,
  tUndefined
});
