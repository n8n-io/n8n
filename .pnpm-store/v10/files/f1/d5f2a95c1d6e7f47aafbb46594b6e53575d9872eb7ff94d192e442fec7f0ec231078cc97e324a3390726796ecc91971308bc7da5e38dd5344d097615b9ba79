"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validateAttribute;
var _ruleError = _interopRequireDefault(require("./ruleError"));
const WHITELIST = ['mj-class', 'css-class'];
function validateAttribute(element, {
  components
}) {
  const {
    attributes,
    tagName
  } = element;
  const Component = components[tagName];
  if (!Component) {
    return null;
  }
  const availableAttributes = [...Object.keys(Component.allowedAttributes || {}), ...WHITELIST];
  const unknownAttributes = Object.keys(attributes || {}).filter(attribute => !availableAttributes.includes(attribute));
  if (unknownAttributes.length === 0) {
    return null;
  }
  const {
    attribute,
    illegal
  } = {
    attribute: unknownAttributes.length > 1 ? 'Attributes' : 'Attribute',
    illegal: unknownAttributes.length > 1 ? 'are illegal' : 'is illegal'
  };
  return (0, _ruleError.default)(`${attribute} ${unknownAttributes.join(', ')} ${illegal}`, element);
}
module.exports = exports.default;