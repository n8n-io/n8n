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
var _get2 = _interopRequireDefault(require("lodash/get"));
var _mjmlCore = require("mjml-core");
let MjHtmlAttributes = exports.default = /*#__PURE__*/function (_HeadComponent) {
  (0, _inherits2.default)(MjHtmlAttributes, _HeadComponent);
  function MjHtmlAttributes() {
    (0, _classCallCheck2.default)(this, MjHtmlAttributes);
    return (0, _callSuper2.default)(this, MjHtmlAttributes, arguments);
  }
  (0, _createClass2.default)(MjHtmlAttributes, [{
    key: "handler",
    value: function handler() {
      const {
        add
      } = this.context;
      const {
        children
      } = this.props;
      children.filter(c => c.tagName === 'mj-selector').forEach(selector => {
        const {
          attributes,
          children
        } = selector;
        const {
          path
        } = attributes;
        const custom = children.filter(c => c.tagName === 'mj-html-attribute' && !!(0, _get2.default)(c, 'attributes.name')).reduce((acc, c) => ({
          ...acc,
          [c.attributes.name]: c.content
        }), {});
        add('htmlAttributes', path, custom);
      });
    }
  }]);
  return MjHtmlAttributes;
}(_mjmlCore.HeadComponent);
(0, _defineProperty2.default)(MjHtmlAttributes, "componentName", 'mj-html-attributes');
module.exports = exports.default;