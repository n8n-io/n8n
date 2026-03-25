"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matcher = exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _type = _interopRequireDefault(require("./type"));
var _colors = _interopRequireDefault(require("./helpers/colors"));
const matcher = exports.matcher = /^color/gim;
const shorthandRegex = /^#\w{3}$/;
const replaceInputRegex = /^#(\w)(\w)(\w)$/;
const replaceOutput = '#$1$1$2$2$3$3';
var _default = () => /*#__PURE__*/function (_Type) {
  (0, _inherits2.default)(Color, _Type);
  function Color(color) {
    var _this;
    (0, _classCallCheck2.default)(this, Color);
    _this = (0, _callSuper2.default)(this, Color, [color]);
    _this.matchers = [/rgba\(\d{1,3},\s?\d{1,3},\s?\d{1,3},\s?\d(\.\d{1,3})?\)/gi, /rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)/gi, /^#([0-9a-f]{3}){1,2}$/gi, new RegExp(`^(${_colors.default.join('|')})$`)];
    return _this;
  }
  (0, _createClass2.default)(Color, [{
    key: "getValue",
    value: function getValue() {
      if (typeof this.value === 'string' && this.value.match(shorthandRegex)) {
        return this.value.replace(replaceInputRegex, replaceOutput);
      }
      return this.value;
    }
  }]);
  return Color;
}(_type.default);
exports.default = _default;