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
const matcher = exports.matcher = /^enum/gim;
var _default = params => {
  var _Enum;
  const matchers = params.match(/\(([^)]+)\)/)[1].split(',');
  return _Enum = /*#__PURE__*/function (_Type) {
    (0, _inherits2.default)(Enum, _Type);
    function Enum(value) {
      var _this;
      (0, _classCallCheck2.default)(this, Enum);
      _this = (0, _callSuper2.default)(this, Enum, [value]);
      _this.matchers = matchers.map(m => new RegExp(`^${(0, _escapeRegExp2.default)(m)}$`));
      return _this;
    }
    return (0, _createClass2.default)(Enum);
  }(_type.default), (0, _defineProperty2.default)(_Enum, "errorMessage", `has invalid value: $value for type Enum, only accepts ${matchers.join(', ')}`), _Enum;
};
exports.default = _default;