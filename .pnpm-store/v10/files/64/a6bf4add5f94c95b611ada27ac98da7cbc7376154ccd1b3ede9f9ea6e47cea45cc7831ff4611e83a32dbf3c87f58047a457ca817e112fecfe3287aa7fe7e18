"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reduce2 = _interopRequireDefault(require("lodash/reduce"));
var _type = require("../types/type");
var _default = (attributes, allowedAttributes) => (0, _reduce2.default)(attributes, (acc, val, attrName) => {
  if (allowedAttributes && allowedAttributes[attrName]) {
    const TypeConstructor = (0, _type.initializeType)(allowedAttributes[attrName]);
    if (TypeConstructor) {
      const type = new TypeConstructor(val);
      return {
        ...acc,
        [attrName]: type.getValue()
      };
    }
  }
  return {
    ...acc,
    [attrName]: val
  };
}, {});
exports.default = _default;
module.exports = exports.default;