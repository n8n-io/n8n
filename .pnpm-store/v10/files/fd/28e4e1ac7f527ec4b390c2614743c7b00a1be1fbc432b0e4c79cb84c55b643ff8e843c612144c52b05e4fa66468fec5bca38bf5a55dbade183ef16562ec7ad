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
var _widthParser = _interopRequireDefault(require("mjml-core/lib/helpers/widthParser"));
let MjButton = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjButton, _BodyComponent);
  function MjButton() {
    (0, _classCallCheck2.default)(this, MjButton);
    return (0, _callSuper2.default)(this, MjButton, arguments);
  }
  (0, _createClass2.default)(MjButton, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        table: {
          'border-collapse': 'separate',
          width: this.getAttribute('width'),
          'line-height': '100%'
        },
        td: {
          border: this.getAttribute('border'),
          'border-bottom': this.getAttribute('border-bottom'),
          'border-left': this.getAttribute('border-left'),
          'border-radius': this.getAttribute('border-radius'),
          'border-right': this.getAttribute('border-right'),
          'border-top': this.getAttribute('border-top'),
          cursor: 'auto',
          'font-style': this.getAttribute('font-style'),
          height: this.getAttribute('height'),
          'mso-padding-alt': this.getAttribute('inner-padding'),
          'text-align': this.getAttribute('text-align'),
          background: this.getAttribute('background-color')
        },
        content: {
          display: 'inline-block',
          width: this.calculateAWidth(this.getAttribute('width')),
          background: this.getAttribute('background-color'),
          color: this.getAttribute('color'),
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'font-style': this.getAttribute('font-style'),
          'font-weight': this.getAttribute('font-weight'),
          'line-height': this.getAttribute('line-height'),
          'letter-spacing': this.getAttribute('letter-spacing'),
          margin: '0',
          'text-decoration': this.getAttribute('text-decoration'),
          'text-transform': this.getAttribute('text-transform'),
          padding: this.getAttribute('inner-padding'),
          'mso-padding-alt': '0px',
          'border-radius': this.getAttribute('border-radius')
        }
      };
    }
  }, {
    key: "calculateAWidth",
    value: function calculateAWidth(width) {
      if (!width) return null;
      const {
        parsedWidth,
        unit
      } = (0, _widthParser.default)(width);

      // impossible to handle percents because it depends on padding and text width
      if (unit !== 'px') return null;
      const {
        borders
      } = this.getBoxWidths();
      const innerPaddings = this.getShorthandAttrValue('inner-padding', 'left') + this.getShorthandAttrValue('inner-padding', 'right');
      return `${parsedWidth - innerPaddings - borders}px`;
    }
  }, {
    key: "render",
    value: function render() {
      const tag = this.getAttribute('href') ? 'a' : 'p';
      return `
      <table
        ${this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table'
      })}
      >
        <tbody>
          <tr>
            <td
              ${this.htmlAttributes({
        align: 'center',
        bgcolor: this.getAttribute('background-color') === 'none' ? undefined : this.getAttribute('background-color'),
        role: 'presentation',
        style: 'td',
        valign: this.getAttribute('vertical-align')
      })}
            >
              <${tag}
                ${this.htmlAttributes({
        href: this.getAttribute('href'),
        name: this.getAttribute('name'),
        rel: this.getAttribute('rel'),
        title: this.getAttribute('title'),
        style: 'content',
        target: tag === 'a' ? this.getAttribute('target') : undefined
      })}
              >
                ${this.getContent()}
              </${tag}>
            </td>
          </tr>
        </tbody>
      </table>
    `;
    }
  }]);
  return MjButton;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjButton, "componentName", 'mj-button');
(0, _defineProperty2.default)(MjButton, "endingTag", true);
(0, _defineProperty2.default)(MjButton, "allowedAttributes", {
  align: 'enum(left,center,right)',
  'background-color': 'color',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-radius': 'string',
  'border-right': 'string',
  'border-top': 'string',
  border: 'string',
  color: 'color',
  'container-background-color': 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  height: 'unit(px,%)',
  href: 'string',
  name: 'string',
  title: 'string',
  'inner-padding': 'unit(px,%){1,4}',
  'letter-spacing': 'unitWithNegative(px,em)',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  rel: 'string',
  target: 'string',
  'text-decoration': 'string',
  'text-transform': 'string',
  'vertical-align': 'enum(top,bottom,middle)',
  'text-align': 'enum(left,right,center)',
  width: 'unit(px,%)'
});
(0, _defineProperty2.default)(MjButton, "defaultAttributes", {
  align: 'center',
  'background-color': '#414141',
  border: 'none',
  'border-radius': '3px',
  color: '#ffffff',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'font-weight': 'normal',
  'inner-padding': '10px 25px',
  'line-height': '120%',
  padding: '10px 25px',
  target: '_blank',
  'text-decoration': 'none',
  'text-transform': 'none',
  'vertical-align': 'middle'
});
module.exports = exports.default;