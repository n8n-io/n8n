"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.borderParser = borderParser;
exports.default = _default;
var _get2 = _interopRequireDefault(require("lodash/get"));
function _default(cssValue, direction) {
  const splittedCssValue = cssValue.trim().replace(/\s+/g, ' ').split(' ', 4);
  let directions = {};
  switch (splittedCssValue.length) {
    case 2:
      directions = {
        top: 0,
        bottom: 0,
        left: 1,
        right: 1
      };
      break;
    case 3:
      directions = {
        top: 0,
        left: 1,
        right: 1,
        bottom: 2
      };
      break;
    case 4:
      directions = {
        top: 0,
        right: 1,
        bottom: 2,
        left: 3
      };
      break;
    case 1:
    default:
      return parseInt(cssValue, 10);
  }
  return parseInt(splittedCssValue[directions[direction]] || 0, 10);
}
function borderParser(border) {
  return parseInt((0, _get2.default)(border.match(/(?:(?:^| )(\d+))/), 1), 10) || 0;
}