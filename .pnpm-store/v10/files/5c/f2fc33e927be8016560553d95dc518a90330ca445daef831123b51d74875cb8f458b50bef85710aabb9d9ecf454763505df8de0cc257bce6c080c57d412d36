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
var _mjmlSection = _interopRequireDefault(require("mjml-section"));
var _mjmlCore = require("mjml-core");
let MjWrapper = exports.default = /*#__PURE__*/function (_MjSection) {
  (0, _inherits2.default)(MjWrapper, _MjSection);
  function MjWrapper() {
    (0, _classCallCheck2.default)(this, MjWrapper);
    return (0, _callSuper2.default)(this, MjWrapper, arguments);
  }
  (0, _createClass2.default)(MjWrapper, [{
    key: "renderWrappedChildren",
    value: function renderWrappedChildren() {
      const {
        children
      } = this.props;
      const {
        containerWidth
      } = this.context;
      return `
      ${this.renderChildren(children, {
        renderer: component => component.constructor.isRawElement() ? component.render() : `
          <!--[if mso | IE]>
            <tr>
              <td
                ${component.htmlAttributes({
          align: component.getAttribute('align'),
          class: (0, _mjmlCore.suffixCssClasses)(component.getAttribute('css-class'), 'outlook'),
          width: containerWidth
        })}
              >
          <![endif]-->
            ${component.render()}
          <!--[if mso | IE]>
              </td>
            </tr>
          <![endif]-->
        `
      })}
    `;
    }
  }]);
  return MjWrapper;
}(_mjmlSection.default);
(0, _defineProperty2.default)(MjWrapper, "componentName", 'mj-wrapper');
module.exports = exports.default;