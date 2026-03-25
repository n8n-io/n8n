"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _mjmlCore = require("mjml-core");
let MjAccordion = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjAccordion, _BodyComponent);
  function MjAccordion(...args) {
    var _this;
    (0, _classCallCheck2.default)(this, MjAccordion);
    _this = (0, _callSuper2.default)(this, MjAccordion, [...args]);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "headStyle", () => `
      noinput.mj-accordion-checkbox { display:block!important; }

      @media yahoo, only screen and (min-width:0) {
        .mj-accordion-element { display:block; }
        input.mj-accordion-checkbox, .mj-accordion-less { display:none!important; }
        input.mj-accordion-checkbox + * .mj-accordion-title { cursor:pointer; touch-action:manipulation; -webkit-user-select:none; -moz-user-select:none; user-select:none; }
        input.mj-accordion-checkbox + * .mj-accordion-content { overflow:hidden; display:none; }
        input.mj-accordion-checkbox + * .mj-accordion-more { display:block!important; }
        input.mj-accordion-checkbox:checked + * .mj-accordion-content { display:block; }
        input.mj-accordion-checkbox:checked + * .mj-accordion-more { display:none!important; }
        input.mj-accordion-checkbox:checked + * .mj-accordion-less { display:block!important; }
      }

      .moz-text-html input.mj-accordion-checkbox + * .mj-accordion-title { cursor: auto; touch-action: auto; -webkit-user-select: auto; -moz-user-select: auto; user-select: auto; }
      .moz-text-html input.mj-accordion-checkbox + * .mj-accordion-content { overflow: hidden; display: block; }
      .moz-text-html input.mj-accordion-checkbox + * .mj-accordion-ico { display: none; }

      @goodbye { @gmail }
    `);
    return _this;
  }
  (0, _createClass2.default)(MjAccordion, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        table: {
          width: '100%',
          'border-collapse': 'collapse',
          border: this.getAttribute('border'),
          'border-bottom': 'none',
          'font-family': this.getAttribute('font-family')
        }
      };
    }
  }, {
    key: "render",
    value: function render() {
      const childrenAttr = ['border', 'icon-align', 'icon-width', 'icon-height', 'icon-position', 'icon-wrapped-url', 'icon-wrapped-alt', 'icon-unwrapped-url', 'icon-unwrapped-alt'].reduce((res, val) => ({
        ...res,
        [val]: this.getAttribute(val)
      }), {});
      return `
      <table
        ${this.htmlAttributes({
        cellspacing: '0',
        cellpadding: '0',
        class: 'mj-accordion',
        style: 'table'
      })}
      >
        <tbody>
          ${this.renderChildren(this.props.children, {
        attributes: childrenAttr
      })}
        </tbody>
      </table>
    `;
    }
  }]);
  return MjAccordion;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjAccordion, "componentName", 'mj-accordion');
(0, _defineProperty2.default)(MjAccordion, "allowedAttributes", {
  'container-background-color': 'color',
  border: 'string',
  'font-family': 'string',
  'icon-align': 'enum(top,middle,bottom)',
  'icon-width': 'unit(px,%)',
  'icon-height': 'unit(px,%)',
  'icon-wrapped-url': 'string',
  'icon-wrapped-alt': 'string',
  'icon-unwrapped-url': 'string',
  'icon-unwrapped-alt': 'string',
  'icon-position': 'enum(left,right)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}'
});
(0, _defineProperty2.default)(MjAccordion, "defaultAttributes", {
  border: '2px solid black',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'icon-align': 'middle',
  'icon-wrapped-url': 'https://i.imgur.com/bIXv1bk.png',
  'icon-wrapped-alt': '+',
  'icon-unwrapped-url': 'https://i.imgur.com/w4uTygT.png',
  'icon-unwrapped-alt': '-',
  'icon-position': 'right',
  'icon-height': '32px',
  'icon-width': '32px',
  padding: '10px 25px'
});
module.exports = exports.default;