"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validChildren;
var _ruleError = _interopRequireDefault(require("./ruleError"));
function validChildren(element, {
  components,
  dependencies,
  skipElements
}) {
  const {
    children,
    tagName
  } = element;
  const Component = components[tagName];
  if (!Component || !children || !children.length) {
    return null;
  }
  const errors = [];
  for (const child of children) {
    const childTagName = child.tagName;
    const ChildComponent = components[childTagName];
    const parentDependencies = dependencies[tagName] || [];
    const childIsValid = !ChildComponent || skipElements.includes(childTagName) || parentDependencies.includes(childTagName) || parentDependencies.some(dep => dep instanceof RegExp && dep.test(childTagName));
    if (childIsValid === false) {
      const allowedDependencies = Object.keys(dependencies).filter(key => dependencies[key].includes(childTagName) || dependencies[key].some(dep => dep instanceof RegExp && dep.test(childTagName)));
      errors.push((0, _ruleError.default)(`${childTagName} cannot be used inside ${tagName}, only inside: ${allowedDependencies.join(', ')}`, child));
    }
  }
  return errors;
}
module.exports = exports.default;