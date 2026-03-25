"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _mjmlCore = require("mjml-core");
let MjStyle = exports.default = /*#__PURE__*/function (_HeadComponent) {
  (0, _inherits2.default)(MjStyle, _HeadComponent);
  function MjStyle() {
    (0, _classCallCheck2.default)(this, MjStyle);
    return (0, _callSuper2.default)(this, MjStyle, arguments);
  }
  (0, _createClass2.default)(MjStyle, [{
    key: "handler",
    value: function handler() {
      const {
        add
      } = this.context;
      add(this.getAttribute('inline') === 'inline' ? 'inlineStyle' : 'style', this.getContent());
    }
  }]);
  return MjStyle;
}(_mjmlCore.HeadComponent);
(0, _defineProperty2.default)(MjStyle, "componentName", 'mj-style');
(0, _defineProperty2.default)(MjStyle, "endingTag", true);
(0, _defineProperty2.default)(MjStyle, "allowedAttributes", {
  inline: 'string'
});
module.exports = exports.default;