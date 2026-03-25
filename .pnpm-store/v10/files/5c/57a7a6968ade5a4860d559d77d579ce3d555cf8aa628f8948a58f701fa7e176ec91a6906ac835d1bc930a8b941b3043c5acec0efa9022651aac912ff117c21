'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matcher = undefined;

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var matcher = exports.matcher = /^boolean/gim;

exports.default = function () {
  return function (_Type) {
    (0, _inherits3.default)(Boolean, _Type);

    function Boolean(boolean) {
      (0, _classCallCheck3.default)(this, Boolean);

      var _this = (0, _possibleConstructorReturn3.default)(this, (Boolean.__proto__ || (0, _getPrototypeOf2.default)(Boolean)).call(this, boolean));

      _this.matchers = [/^true$/i, /^false$/i];
      return _this;
    }

    (0, _createClass3.default)(Boolean, [{
      key: 'isValid',
      value: function isValid() {
        return this.value === true || this.value === false;
      }
    }]);
    return Boolean;
  }(_type2.default);
};