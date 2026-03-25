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

var _escapeRegExp = require('lodash/escapeRegExp');

var _escapeRegExp2 = _interopRequireDefault(_escapeRegExp);

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var matcher = exports.matcher = /^enum/gim;

exports.default = function (params) {
  var _class, _temp;

  var matchers = params.match(/\(([^)]+)\)/)[1].split(',');

  return _temp = _class = function (_Type) {
    (0, _inherits3.default)(Enum, _Type);

    function Enum(value) {
      (0, _classCallCheck3.default)(this, Enum);

      var _this = (0, _possibleConstructorReturn3.default)(this, (Enum.__proto__ || (0, _getPrototypeOf2.default)(Enum)).call(this, value));

      _this.matchers = matchers.map(function (m) {
        return new RegExp('^' + (0, _escapeRegExp2.default)(m) + '$');
      });
      return _this;
    }

    return Enum;
  }(_type2.default), _class.errorMessage = 'has invalid value: $value for type Enum, only accepts ' + matchers.join(', '), _temp;
};