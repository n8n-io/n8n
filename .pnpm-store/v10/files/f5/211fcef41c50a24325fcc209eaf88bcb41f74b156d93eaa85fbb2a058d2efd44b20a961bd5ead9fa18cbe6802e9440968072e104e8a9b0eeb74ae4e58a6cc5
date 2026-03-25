"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validateType;
var _ruleError = _interopRequireDefault(require("./ruleError"));
function validateType(element, {
  components,
  initializeType
}) {
  const {
    attributes,
    tagName
  } = element;
  const Component = components[tagName];
  if (!Component) {
    return null;
  }
  const errors = [];
  for (const [attr, value] of Object.entries(attributes || {})) {
    const attrType = Component.allowedAttributes && Component.allowedAttributes[attr];
    if (attrType) {
      const TypeChecker = initializeType(attrType);
      const result = new TypeChecker(value);
      if (result.isValid() === false) {
        errors.push((0, _ruleError.default)(`Attribute ${attr} ${result.getErrorMessage()}`, element));
      }
    }
  }
  return errors;
}
module.exports = exports.default;