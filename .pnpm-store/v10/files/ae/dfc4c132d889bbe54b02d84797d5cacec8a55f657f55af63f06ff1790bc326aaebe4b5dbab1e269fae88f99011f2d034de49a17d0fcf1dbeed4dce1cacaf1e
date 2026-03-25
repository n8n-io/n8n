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
let MjBreakpoint = exports.default = /*#__PURE__*/function (_HeadComponent) {
  (0, _inherits2.default)(MjBreakpoint, _HeadComponent);
  function MjBreakpoint() {
    (0, _classCallCheck2.default)(this, MjBreakpoint);
    return (0, _callSuper2.default)(this, MjBreakpoint, arguments);
  }
  (0, _createClass2.default)(MjBreakpoint, [{
    key: "handler",
    value: function handler() {
      const {
        add
      } = this.context;
      add('breakpoint', this.getAttribute('width'));
    }
  }]);
  return MjBreakpoint;
}(_mjmlCore.HeadComponent);
(0, _defineProperty2.default)(MjBreakpoint, "componentName", 'mj-breakpoint');
(0, _defineProperty2.default)(MjBreakpoint, "endingTag", true);
(0, _defineProperty2.default)(MjBreakpoint, "allowedAttributes", {
  width: 'unit(px)'
});
module.exports = exports.default;