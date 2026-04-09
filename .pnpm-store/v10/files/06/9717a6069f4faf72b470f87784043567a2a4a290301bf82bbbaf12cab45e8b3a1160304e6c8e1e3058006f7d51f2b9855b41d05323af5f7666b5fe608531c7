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

// src/validation-errors/required.js
import chalk from "chalk";
import BaseValidationError from "./base.mjs";
var RequiredValidationError = class extends BaseValidationError {
  getLocation(dataPath = this.instancePath) {
    const { start } = super.getLocation(dataPath);
    return { start };
  }
  print() {
    const { message, params } = this.options;
    const output = [chalk`{red {bold REQUIRED} ${message}}\n`];
    return output.concat(this.getCodeFrame(chalk`☹️  {magentaBright ${params.missingProperty}} is missing here!`));
  }
  getError() {
    const { message } = this.options;
    return __spreadProps(__spreadValues({}, this.getLocation()), {
      error: `${this.getDecoratedPath()} ${message}`,
      path: this.instancePath
    });
  }
};
export {
  RequiredValidationError as default
};
//# sourceMappingURL=required.mjs.map
