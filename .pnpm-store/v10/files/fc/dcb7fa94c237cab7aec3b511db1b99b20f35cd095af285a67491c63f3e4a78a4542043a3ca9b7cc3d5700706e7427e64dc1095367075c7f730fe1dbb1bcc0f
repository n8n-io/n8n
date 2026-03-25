"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = convertBooleansOnAttrs;
var _mapValues2 = _interopRequireDefault(require("lodash/mapValues"));
/**
 * Convert "true" and "false" string attributes values
 * to corresponding Booleans
 */

function convertBooleansOnAttrs(attrs) {
  return (0, _mapValues2.default)(attrs, val => {
    if (val === 'true') {
      return true;
    }
    if (val === 'false') {
      return false;
    }
    return val;
  });
}
module.exports = exports.default;