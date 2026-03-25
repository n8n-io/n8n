"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validateTag;
var _ruleError = _interopRequireDefault(require("./ruleError"));
// Tags that have no associated components but are allowed even so
const componentLessTags = ['mj-all', 'mj-class', 'mj-selector', 'mj-html-attribute'];
function validateTag(element, {
  components
}) {
  const {
    tagName
  } = element;
  if (componentLessTags.includes(tagName)) return null;
  const Component = components[tagName];
  if (!Component) {
    return (0, _ruleError.default)(`Element ${tagName} doesn't exist or is not registered`, element);
  }
  return null;
}
module.exports = exports.default;