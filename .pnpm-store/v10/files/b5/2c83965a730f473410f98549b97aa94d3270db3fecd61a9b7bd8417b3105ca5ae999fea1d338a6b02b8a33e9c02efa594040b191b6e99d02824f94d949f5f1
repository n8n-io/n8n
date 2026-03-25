"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = setLocale;

var _locale = _interopRequireDefault(require("./locale"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function setLocale(custom) {
  Object.keys(custom).forEach(type => {
    // @ts-ignore
    Object.keys(custom[type]).forEach(method => {
      // @ts-ignore
      _locale.default[type][method] = custom[type][method];
    });
  });
}