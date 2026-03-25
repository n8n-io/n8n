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
let MjPreview = exports.default = /*#__PURE__*/function (_HeadComponent) {
  (0, _inherits2.default)(MjPreview, _HeadComponent);
  function MjPreview() {
    (0, _classCallCheck2.default)(this, MjPreview);
    return (0, _callSuper2.default)(this, MjPreview, arguments);
  }
  (0, _createClass2.default)(MjPreview, [{
    key: "handler",
    value: function handler() {
      const {
        add
      } = this.context;
      add('preview', this.getContent());
    }
  }]);
  return MjPreview;
}(_mjmlCore.HeadComponent);
(0, _defineProperty2.default)(MjPreview, "componentName", 'mj-preview');
(0, _defineProperty2.default)(MjPreview, "endingTag", true);
module.exports = exports.default;