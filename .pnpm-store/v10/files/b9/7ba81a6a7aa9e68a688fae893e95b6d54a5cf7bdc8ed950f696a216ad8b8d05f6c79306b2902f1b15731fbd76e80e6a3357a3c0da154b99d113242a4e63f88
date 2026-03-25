"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = errorAttr;
var _ruleError = _interopRequireDefault(require("./ruleError"));
function errorAttr(element) {
  const {
    errors
  } = element;
  if (!errors) return null;
  return errors.map(error => {
    switch (error.type) {
      case 'include':
        {
          const {
            file,
            partialPath
          } = error.params;
          return (0, _ruleError.default)(`mj-include fails to read file : ${file} at ${partialPath}`, element);
        }
      default:
        return null;
    }
  });
}
module.exports = exports.default;