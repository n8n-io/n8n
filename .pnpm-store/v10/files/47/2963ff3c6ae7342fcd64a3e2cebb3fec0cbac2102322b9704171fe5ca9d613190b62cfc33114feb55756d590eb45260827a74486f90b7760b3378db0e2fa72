"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matcher = exports.default = void 0;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _escapeRegExp2 = _interopRequireDefault(require("lodash/escapeRegExp"));
var _type = _interopRequireDefault(require("./type"));
const matcher = exports.matcher = /^(unit|unitWithNegative)\(.*\)/gim;
var _default = params => {
  var _Unit;
  const allowNeg = params.match(/^unitWithNegative/) ? '-|' : '';
  const units = params.match(/\(([^)]+)\)/)[1].split(',');
  const argsMatch = params.match(/\{([^}]+)\}/);
  const args = argsMatch && argsMatch[1] && argsMatch[1].split(',') || ['1']; // defaults to 1

  const allowAuto = units.includes('auto') ? '|auto' : '';
  const filteredUnits = units.filter(u => u !== 'auto');
  return _Unit = /*#__PURE__*/function (_Type) {
    (0, _inherits2.default)(Unit, _Type);
    function Unit(value) {
      var _this;
      (0, _classCallCheck2.default)(this, Unit);
      _this = (0, _callSuper2.default)(this, Unit, [value]);
      _this.matchers = [new RegExp(`^(((${allowNeg}\\d|,|\\.){1,}(${filteredUnits.map(_escapeRegExp2.default).join('|')})|0${allowAuto})( )?){${args.join(',')}}$`)];
      return _this;
    }
    return (0, _createClass2.default)(Unit);
  }(_type.default), (0, _defineProperty2.default)(_Unit, "errorMessage", `has invalid value: $value for type Unit, only accepts (${units.join(', ')}) units and ${args.join(' to ')} value(s)`), _Unit;
};
exports.default = _default;