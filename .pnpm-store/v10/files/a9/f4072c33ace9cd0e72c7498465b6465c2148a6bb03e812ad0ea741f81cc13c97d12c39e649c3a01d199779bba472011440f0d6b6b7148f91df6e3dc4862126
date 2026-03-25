"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
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
var _conditionalTag = _interopRequireWildcard(require("mjml-core/lib/helpers/conditionalTag"));
var _genRandomHexString = _interopRequireDefault(require("mjml-core/lib/helpers/genRandomHexString"));
let MjNavbar = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjNavbar, _BodyComponent);
  function MjNavbar(...args) {
    var _this;
    (0, _classCallCheck2.default)(this, MjNavbar);
    _this = (0, _callSuper2.default)(this, MjNavbar, [...args]);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "headStyle", breakpoint => `
      noinput.mj-menu-checkbox { display:block!important; max-height:none!important; visibility:visible!important; }

      @media only screen and (max-width:${(0, _mjmlCore.makeLowerBreakpoint)(breakpoint)}) {
        .mj-menu-checkbox[type="checkbox"] ~ .mj-inline-links { display:none!important; }
        .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-inline-links,
        .mj-menu-checkbox[type="checkbox"] ~ .mj-menu-trigger { display:block!important; max-width:none!important; max-height:none!important; font-size:inherit!important; }
        .mj-menu-checkbox[type="checkbox"] ~ .mj-inline-links > a { display:block!important; }
        .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-menu-trigger .mj-menu-icon-close { display:block!important; }
        .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-menu-trigger .mj-menu-icon-open { display:none!important; }
      }
    `);
    return _this;
  }
  (0, _createClass2.default)(MjNavbar, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        div: {
          align: this.getAttribute('align'),
          width: '100%'
        },
        label: {
          display: 'block',
          cursor: 'pointer',
          'mso-hide': 'all',
          '-moz-user-select': 'none',
          'user-select': 'none',
          color: this.getAttribute('ico-color'),
          'font-size': this.getAttribute('ico-font-size'),
          'font-family': this.getAttribute('ico-font-family'),
          'text-transform': this.getAttribute('ico-text-transform'),
          'text-decoration': this.getAttribute('ico-text-decoration'),
          'line-height': this.getAttribute('ico-line-height'),
          'padding-top': this.getAttribute('ico-padding-top'),
          'padding-right': this.getAttribute('ico-padding-right'),
          'padding-bottom': this.getAttribute('ico-padding-bottom'),
          'padding-left': this.getAttribute('ico-padding-left'),
          padding: this.getAttribute('ico-padding')
        },
        trigger: {
          display: 'none',
          'max-height': '0px',
          'max-width': '0px',
          'font-size': '0px',
          overflow: 'hidden'
        },
        icoOpen: {
          'mso-hide': 'all'
        },
        icoClose: {
          display: 'none',
          'mso-hide': 'all'
        }
      };
    }
  }, {
    key: "renderHamburger",
    value: function renderHamburger() {
      const labelKey = (0, _genRandomHexString.default)(16);
      return `
      ${(0, _conditionalTag.msoConditionalTag)(`
        <input type="checkbox" id="${labelKey}" class="mj-menu-checkbox" style="display:none !important; max-height:0; visibility:hidden;" />
      `, true)}
      <div
        ${this.htmlAttributes({
        class: 'mj-menu-trigger',
        style: 'trigger'
      })}
      >
        <label
          ${this.htmlAttributes({
        for: labelKey,
        class: 'mj-menu-label',
        style: 'label',
        align: this.getAttribute('ico-align')
      })}
        >
          <span
            ${this.htmlAttributes({
        class: 'mj-menu-icon-open',
        style: 'icoOpen'
      })}
          >
            ${this.getAttribute('ico-open')}
          </span>
          <span
            ${this.htmlAttributes({
        class: 'mj-menu-icon-close',
        style: 'icoClose'
      })}
          >
            ${this.getAttribute('ico-close')}
          </span>
        </label>
      </div>
    `;
    }
  }, {
    key: "render",
    value: function render() {
      return `
        ${this.getAttribute('hamburger') === 'hamburger' ? this.renderHamburger() : ''}
        <div
          ${this.htmlAttributes({
        class: 'mj-inline-links',
        style: this.htmlAttributes('div')
      })}
        >
        ${(0, _conditionalTag.default)(`
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="${this.getAttribute('align')}">
            <tr>
        `)}
          ${this.renderChildren(this.props.children, {
        attributes: {
          navbarBaseUrl: this.getAttribute('base-url')
        }
      })}
          ${(0, _conditionalTag.default)(`
            </tr></table>
          `)}
        </div>
    `;
    }
  }]);
  return MjNavbar;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjNavbar, "componentName", 'mj-navbar');
(0, _defineProperty2.default)(MjNavbar, "allowedAttributes", {
  align: 'enum(left,center,right)',
  'base-url': 'string',
  hamburger: 'string',
  'ico-align': 'enum(left,center,right)',
  'ico-open': 'string',
  'ico-close': 'string',
  'ico-color': 'color',
  'ico-font-size': 'unit(px,%)',
  'ico-font-family': 'string',
  'ico-text-transform': 'string',
  'ico-padding': 'unit(px,%){1,4}',
  'ico-padding-left': 'unit(px,%)',
  'ico-padding-top': 'unit(px,%)',
  'ico-padding-right': 'unit(px,%)',
  'ico-padding-bottom': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'padding-left': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-bottom': 'unit(px,%)',
  'ico-text-decoration': 'string',
  'ico-line-height': 'unit(px,%,)'
});
(0, _defineProperty2.default)(MjNavbar, "defaultAttributes", {
  align: 'center',
  'base-url': null,
  hamburger: null,
  'ico-align': 'center',
  'ico-open': '&#9776;',
  'ico-close': '&#8855;',
  'ico-color': '#000000',
  'ico-font-size': '30px',
  'ico-font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'ico-text-transform': 'uppercase',
  'ico-padding': '10px',
  'ico-text-decoration': 'none',
  'ico-line-height': '30px'
});
module.exports = exports.default;