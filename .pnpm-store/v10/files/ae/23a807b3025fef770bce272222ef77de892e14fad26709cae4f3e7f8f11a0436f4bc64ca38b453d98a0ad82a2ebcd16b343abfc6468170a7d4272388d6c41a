"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cleanNode;
var _forEach2 = _interopRequireDefault(require("lodash/forEach"));
function cleanNode(node) {
  delete node.parent;

  // Delete children if needed
  if (node.children && node.children.length) {
    (0, _forEach2.default)(node.children, cleanNode);
  } else {
    delete node.children;
  }

  // Delete attributes if needed
  if (node.attributes && Object.keys(node.attributes).length === 0) {
    delete node.attributes;
  }
}
module.exports = exports.default;