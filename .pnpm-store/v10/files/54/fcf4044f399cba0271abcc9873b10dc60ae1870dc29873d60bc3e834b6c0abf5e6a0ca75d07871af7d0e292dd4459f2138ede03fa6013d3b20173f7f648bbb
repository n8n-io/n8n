'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matcher = undefined;

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

var _colors = require('./helpers/colors');

var _colors2 = _interopRequireDefault(_colors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var matcher = exports.matcher = /^color/gim;

exports.default = function () {
  return function (_Type) {
    (0, _inherits3.default)(Color, _Type);

    function Color(color) {
      (0, _classCallCheck3.default)(this, Color);

      var _this = (0, _possibleConstructorReturn3.default)(this, (Color.__proto__ || (0, _getPrototypeOf2.default)(Color)).call(this, color));

      _this.matchers = [/rgba\(\d{1,3},\d{1,3},\d{1,3},\d(\.\d)?\)/gi, /rgb\(\d{1,3},\d{1,3},\d{1,3}\)/gi, /^#([0-9a-f]{3}){1,2}$/gi, new RegExp('^(' + _colors2.default.join('|') + ')$')];
      return _this;
    }

    return Color;
  }(_type2.default);
};