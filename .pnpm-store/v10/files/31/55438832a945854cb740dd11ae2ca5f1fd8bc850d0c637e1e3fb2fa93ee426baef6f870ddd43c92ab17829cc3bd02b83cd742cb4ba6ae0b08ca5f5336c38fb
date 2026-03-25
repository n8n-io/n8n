"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _endsWith = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./_endsWith"));

var _stripUnit = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../helpers/stripUnit"));

var _errors = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./_errors"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Factory function that creates pixel-to-x converters
 * @private
 */
var pxtoFactory = function pxtoFactory(to) {
  return function (pxval, base) {
    if (base === void 0) {
      base = '16px';
    }

    var newPxval = pxval;
    var newBase = base;

    if (typeof pxval === 'string') {
      if (!(0, _endsWith["default"])(pxval, 'px')) {
        throw new _errors["default"](69, to, pxval);
      }

      newPxval = (0, _stripUnit["default"])(pxval);
    }

    if (typeof base === 'string') {
      if (!(0, _endsWith["default"])(base, 'px')) {
        throw new _errors["default"](70, to, base);
      }

      newBase = (0, _stripUnit["default"])(base);
    }

    if (typeof newPxval === 'string') {
      throw new _errors["default"](71, pxval, to);
    }

    if (typeof newBase === 'string') {
      throw new _errors["default"](72, base, to);
    }

    return "" + newPxval / newBase + to;
  };
};

var _default = pxtoFactory;
exports["default"] = _default;
module.exports = exports.default;