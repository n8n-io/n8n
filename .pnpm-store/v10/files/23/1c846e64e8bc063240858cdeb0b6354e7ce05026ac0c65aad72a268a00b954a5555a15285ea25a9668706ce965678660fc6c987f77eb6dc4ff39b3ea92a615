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
let MjFont = exports.default = /*#__PURE__*/function (_HeadComponent) {
  (0, _inherits2.default)(MjFont, _HeadComponent);
  function MjFont() {
    (0, _classCallCheck2.default)(this, MjFont);
    return (0, _callSuper2.default)(this, MjFont, arguments);
  }
  (0, _createClass2.default)(MjFont, [{
    key: "handler",
    value: function handler() {
      const {
        add
      } = this.context;
      add('fonts', this.getAttribute('name'), this.getAttribute('href'));
    }
  }]);
  return MjFont;
}(_mjmlCore.HeadComponent);
(0, _defineProperty2.default)(MjFont, "componentName", 'mj-font');
(0, _defineProperty2.default)(MjFont, "allowedAttributes", {
  name: 'string',
  href: 'string'
});
module.exports = exports.default;