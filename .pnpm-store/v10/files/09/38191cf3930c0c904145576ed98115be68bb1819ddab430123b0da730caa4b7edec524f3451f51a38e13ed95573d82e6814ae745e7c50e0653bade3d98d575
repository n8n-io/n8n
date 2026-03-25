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
var bidiSerializer_exports = {};
__export(bidiSerializer_exports, {
  BidiSerializer: () => BidiSerializer,
  isDate: () => isDate,
  isPlainObject: () => isPlainObject,
  isRegExp: () => isRegExp
});
module.exports = __toCommonJS(bidiSerializer_exports);
/**
 * @license
 * Copyright 2024 Google Inc.
 * Modifications copyright (c) Microsoft Corporation.
 * SPDX-License-Identifier: Apache-2.0
 */
class UnserializableError extends Error {
}
class BidiSerializer {
  static serialize(arg) {
    switch (typeof arg) {
      case "symbol":
      case "function":
        throw new UnserializableError(`Unable to serializable ${typeof arg}`);
      case "object":
        return BidiSerializer._serializeObject(arg);
      case "undefined":
        return {
          type: "undefined"
        };
      case "number":
        return BidiSerializer._serializeNumber(arg);
      case "bigint":
        return {
          type: "bigint",
          value: arg.toString()
        };
      case "string":
        return {
          type: "string",
          value: arg
        };
      case "boolean":
        return {
          type: "boolean",
          value: arg
        };
    }
  }
  static _serializeNumber(arg) {
    let value;
    if (Object.is(arg, -0)) {
      value = "-0";
    } else if (Object.is(arg, Infinity)) {
      value = "Infinity";
    } else if (Object.is(arg, -Infinity)) {
      value = "-Infinity";
    } else if (Object.is(arg, NaN)) {
      value = "NaN";
    } else {
      value = arg;
    }
    return {
      type: "number",
      value
    };
  }
  static _serializeObject(arg) {
    if (arg === null) {
      return {
        type: "null"
      };
    } else if (Array.isArray(arg)) {
      const parsedArray = arg.map((subArg) => {
        return BidiSerializer.serialize(subArg);
      });
      return {
        type: "array",
        value: parsedArray
      };
    } else if (isPlainObject(arg)) {
      try {
        JSON.stringify(arg);
      } catch (error) {
        if (error instanceof TypeError && error.message.startsWith("Converting circular structure to JSON")) {
          error.message += " Recursive objects are not allowed.";
        }
        throw error;
      }
      const parsedObject = [];
      for (const key in arg) {
        parsedObject.push([BidiSerializer.serialize(key), BidiSerializer.serialize(arg[key])]);
      }
      return {
        type: "object",
        value: parsedObject
      };
    } else if (isRegExp(arg)) {
      return {
        type: "regexp",
        value: {
          pattern: arg.source,
          flags: arg.flags
        }
      };
    } else if (isDate(arg)) {
      return {
        type: "date",
        value: arg.toISOString()
      };
    }
    throw new UnserializableError(
      "Custom object serialization not possible. Use plain objects instead."
    );
  }
}
const isPlainObject = (obj) => {
  return typeof obj === "object" && obj?.constructor === Object;
};
const isRegExp = (obj) => {
  return typeof obj === "object" && obj?.constructor === RegExp;
};
const isDate = (obj) => {
  return typeof obj === "object" && obj?.constructor === Date;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiSerializer,
  isDate,
  isPlainObject,
  isRegExp
});
