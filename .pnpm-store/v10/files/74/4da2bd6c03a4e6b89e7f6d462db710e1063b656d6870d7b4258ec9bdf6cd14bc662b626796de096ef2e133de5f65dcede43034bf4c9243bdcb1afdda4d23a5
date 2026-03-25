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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var matcher = exports.matcher = /^integer/gim;

exports.default = function () {
  return function (_Type) {
    (0, _inherits3.default)(NInteger, _Type);

    function NInteger(value) {
      (0, _classCallCheck3.default)(this, NInteger);

      var _this = (0, _possibleConstructorReturn3.default)(this, (NInteger.__proto__ || (0, _getPrototypeOf2.default)(NInteger)).call(this, value));

      _this.matchers = [/\d+/];
      return _this;
    }

    return NInteger;
  }(_type2.default);
};