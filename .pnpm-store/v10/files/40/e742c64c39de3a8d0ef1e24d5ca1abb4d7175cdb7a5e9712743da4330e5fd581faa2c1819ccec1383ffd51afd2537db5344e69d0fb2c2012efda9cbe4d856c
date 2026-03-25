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
let MjAccordionText = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjAccordionText, _BodyComponent);
  function MjAccordionText() {
    (0, _classCallCheck2.default)(this, MjAccordionText);
    return (0, _callSuper2.default)(this, MjAccordionText, arguments);
  }
  (0, _createClass2.default)(MjAccordionText, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        td: {
          background: this.getAttribute('background-color'),
          'font-size': this.getAttribute('font-size'),
          'font-family': this.getAttribute('font-family'),
          'font-weight': this.getAttribute('font-weight'),
          'letter-spacing': this.getAttribute('letter-spacing'),
          'line-height': this.getAttribute('line-height'),
          color: this.getAttribute('color'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-top': this.getAttribute('padding-top'),
          padding: this.getAttribute('padding')
        },
        table: {
          width: '100%',
          'border-bottom': this.getAttribute('border')
        }
      };
    }
  }, {
    key: "renderContent",
    value: function renderContent() {
      return `
      <td
        ${this.htmlAttributes({
        class: this.getAttribute('css-class'),
        style: 'td'
      })}
      >
        ${this.getContent()}
      </td>
    `;
    }
  }, {
    key: "render",
    value: function render() {
      return `
      <div
        ${this.htmlAttributes({
        class: 'mj-accordion-content'
      })}
      >
        <table
          ${this.htmlAttributes({
        cellspacing: '0',
        cellpadding: '0',
        style: 'table'
      })}
        >
          <tbody>
            <tr>
              ${this.renderContent()}
            </tr>
          </tbody>
        </table>
      </div>
    `;
    }
  }]);
  return MjAccordionText;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjAccordionText, "componentName", 'mj-accordion-text');
(0, _defineProperty2.default)(MjAccordionText, "endingTag", true);
(0, _defineProperty2.default)(MjAccordionText, "allowedAttributes", {
  'background-color': 'color',
  'font-size': 'unit(px)',
  'font-family': 'string',
  'font-weight': 'string',
  'letter-spacing': 'unitWithNegative(px,em)',
  'line-height': 'unit(px,%,)',
  color: 'color',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}'
});
(0, _defineProperty2.default)(MjAccordionText, "defaultAttributes", {
  'font-size': '13px',
  'line-height': '1',
  padding: '16px'
});
module.exports = exports.default;