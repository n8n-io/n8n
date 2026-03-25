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

var matcher = exports.matcher = /^unit\(.*\)/gim;

exports.default = function (params) {
  var _class, _temp;

  var units = params.match(/\(([^)]+)\)/)[1].split(',');
  var argsMatch = params.match(/\{([^}]+)\}/);
  var args = argsMatch && argsMatch[1] && argsMatch[1].split(',') || ['1']; // defaults to 1

  return _temp = _class = function (_Type) {
    (0, _inherits3.default)(Unit, _Type);

    function Unit(value) {
      (0, _classCallCheck3.default)(this, Unit);

      var _this = (0, _possibleConstructorReturn3.default)(this, (Unit.__proto__ || (0, _getPrototypeOf2.default)(Unit)).call(this, value));

      _this.matchers = [new RegExp('^(((\\d|,|.){1,}(' + units.map(_escapeRegExp2.default).join('|') + ')|0)( )?){' + args.join(',') + '}$')];
      return _this;
    }

    return Unit;
  }(_type2.default), _class.errorMessage = 'has invalid value: $value for type Unit, only accepts (' + units.join(', ') + ') units and ' + args.join(' to ') + ' value(s)', _temp;
};