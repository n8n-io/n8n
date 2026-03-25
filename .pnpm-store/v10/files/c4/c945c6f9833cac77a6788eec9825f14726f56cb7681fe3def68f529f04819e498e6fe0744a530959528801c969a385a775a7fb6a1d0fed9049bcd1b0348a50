"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "assignDependencies", {
  enumerable: true,
  get: function () {
    return _dependencies.assignDependencies;
  }
});
exports.default = MJMLValidator;
Object.defineProperty(exports, "dependencies", {
  enumerable: true,
  get: function () {
    return _dependencies.default;
  }
});
exports.formatValidationError = void 0;
Object.defineProperty(exports, "registerDependencies", {
  enumerable: true,
  get: function () {
    return _dependencies.registerDependencies;
  }
});
Object.defineProperty(exports, "registerRule", {
  enumerable: true,
  get: function () {
    return _MJMLRulesCollection.registerRule;
  }
});
Object.defineProperty(exports, "rulesCollection", {
  enumerable: true,
  get: function () {
    return _MJMLRulesCollection.default;
  }
});
var _ruleError = _interopRequireDefault(require("./rules/ruleError"));
var _MJMLRulesCollection = _interopRequireWildcard(require("./MJMLRulesCollection"));
var _dependencies = _interopRequireWildcard(require("./dependencies"));
const SKIP_ELEMENTS = ['mjml'];
const formatValidationError = exports.formatValidationError = _ruleError.default;
function MJMLValidator(element, options = {}) {
  const {
    children,
    tagName
  } = element;
  const errors = [];
  const skipElements = options.skipElements || SKIP_ELEMENTS;
  if (options.dependencies == null) {
    console.warn('"dependencies" option should be provided to mjml validator');
  }
  if (!skipElements.includes(tagName)) {
    for (const rule of Object.values(_MJMLRulesCollection.default)) {
      const ruleError = rule(element, {
        dependencies: _dependencies.default,
        skipElements,
        ...options
      });
      if (Array.isArray(ruleError)) {
        errors.push(...ruleError);
      } else if (ruleError) {
        errors.push(ruleError);
      }
    }
  }
  if (children && children.length > 0) {
    for (const child of children) {
      errors.push(...MJMLValidator(child, options));
    }
  }
  return errors;
}