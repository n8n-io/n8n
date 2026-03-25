"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.registerRule = registerRule;
var _validAttributes = _interopRequireDefault(require("./rules/validAttributes"));
var _validChildren = _interopRequireDefault(require("./rules/validChildren"));
var _validTag = _interopRequireDefault(require("./rules/validTag"));
var _validTypes = _interopRequireDefault(require("./rules/validTypes"));
var _errorAttr = _interopRequireDefault(require("./rules/errorAttr"));
const MJMLRulesCollection = {
  validAttributes: _validAttributes.default,
  validChildren: _validChildren.default,
  validTag: _validTag.default,
  validTypes: _validTypes.default,
  errorAttr: _errorAttr.default
};
function registerRule(rule, name) {
  if (typeof rule !== 'function') {
    return console.error('Your rule must be a function');
  }
  if (name) {
    MJMLRulesCollection[name] = rule;
  } else {
    MJMLRulesCollection[rule.name] = rule;
  }
  return true;
}
var _default = exports.default = MJMLRulesCollection;