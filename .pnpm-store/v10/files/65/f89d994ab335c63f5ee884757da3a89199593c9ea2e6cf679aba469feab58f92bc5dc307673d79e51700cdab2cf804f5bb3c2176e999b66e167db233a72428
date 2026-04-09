var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/validation-errors/enum.js
import chalk from "chalk";
import leven from "leven";
import pointer from "jsonpointer";
import BaseValidationError from "./base.mjs";
var EnumValidationError = class extends BaseValidationError {
  print() {
    const {
      message,
      params: { allowedValues }
    } = this.options;
    const bestMatch = this.findBestMatch();
    const output = [
      chalk`{red {bold ENUM} ${message}}`,
      chalk`{red (${allowedValues.join(", ")})}\n`
    ];
    return output.concat(this.getCodeFrame(bestMatch !== null ? chalk`👈🏽  Did you mean {magentaBright ${bestMatch}} here?` : chalk`👈🏽  Unexpected value, should be equal to one of the allowed values`));
  }
  getError() {
    const { message, params } = this.options;
    const bestMatch = this.findBestMatch();
    const allowedValues = params.allowedValues.join(", ");
    const output = __spreadProps(__spreadValues({}, this.getLocation()), {
      error: `${this.getDecoratedPath()} ${message}: ${allowedValues}`,
      path: this.instancePath
    });
    if (bestMatch !== null) {
      output.suggestion = `Did you mean ${bestMatch}?`;
    }
    return output;
  }
  findBestMatch() {
    const {
      params: { allowedValues }
    } = this.options;
    const currentValue = this.instancePath === "" ? this.data : pointer.get(this.data, this.instancePath);
    if (!currentValue) {
      return null;
    }
    const bestMatch = allowedValues.map((value) => ({
      value,
      weight: leven(value, currentValue.toString())
    })).sort((x, y) => x.weight > y.weight ? 1 : x.weight < y.weight ? -1 : 0)[0];
    return allowedValues.length === 1 || bestMatch.weight < bestMatch.value.length ? bestMatch.value : null;
  }
};
export {
  EnumValidationError as default
};
//# sourceMappingURL=enum.mjs.map
