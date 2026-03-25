"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assignComponents = assignComponents;
exports.default = void 0;
exports.registerComponent = registerComponent;
var _kebabCase2 = _interopRequireDefault(require("lodash/kebabCase"));
var _mjmlValidator = require("mjml-validator");
const components = {};
function assignComponents(target, source) {
  for (const component of source) {
    target[component.componentName || (0, _kebabCase2.default)(component.name)] = component;
  }
}
function registerComponent(Component, options = {}) {
  assignComponents(components, [Component]);
  if (Component.dependencies && options.registerDependencies) {
    (0, _mjmlValidator.registerDependencies)(Component.dependencies);
  }
}
var _default = exports.default = components;