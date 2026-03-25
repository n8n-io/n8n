"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = setEmptyAttributes;
var _forEach2 = _interopRequireDefault(require("lodash/forEach"));
function setEmptyAttributes(node) {
  if (!node.attributes) {
    node.attributes = {};
  }
  if (node.children) {
    (0, _forEach2.default)(node.children, setEmptyAttributes);
  }
}
module.exports = exports.default;