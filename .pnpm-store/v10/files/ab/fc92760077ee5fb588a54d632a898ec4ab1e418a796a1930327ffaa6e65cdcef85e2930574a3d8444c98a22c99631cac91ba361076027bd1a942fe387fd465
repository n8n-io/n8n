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
var _conditionalTag = _interopRequireDefault(require("mjml-core/lib/helpers/conditionalTag"));
let MjNavbarLink = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjNavbarLink, _BodyComponent);
  function MjNavbarLink() {
    (0, _classCallCheck2.default)(this, MjNavbarLink);
    return (0, _callSuper2.default)(this, MjNavbarLink, arguments);
  }
  (0, _createClass2.default)(MjNavbarLink, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        a: {
          display: 'inline-block',
          color: this.getAttribute('color'),
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'font-style': this.getAttribute('font-style'),
          'font-weight': this.getAttribute('font-weight'),
          'letter-spacing': this.getAttribute('letter-spacing'),
          'line-height': this.getAttribute('line-height'),
          'text-decoration': this.getAttribute('text-decoration'),
          'text-transform': this.getAttribute('text-transform'),
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom')
        },
        td: {
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom')
        }
      };
    }
  }, {
    key: "renderContent",
    value: function renderContent() {
      const href = this.getAttribute('href');
      const navbarBaseUrl = this.getAttribute('navbarBaseUrl');
      const link = navbarBaseUrl ? `${navbarBaseUrl}${href}` : href;
      const cssClass = this.getAttribute('css-class') ? ` ${this.getAttribute('css-class')}` : '';
      return `
      <a
        ${this.htmlAttributes({
        class: `mj-link${cssClass}`,
        href: link,
        rel: this.getAttribute('rel'),
        target: this.getAttribute('target'),
        name: this.getAttribute('name'),
        style: 'a'
      })}
      >
        ${this.getContent()}
      </a>
    `;
    }
  }, {
    key: "render",
    value: function render() {
      return `
        ${(0, _conditionalTag.default)(`
          <td
            ${this.htmlAttributes({
        style: 'td',
        class: (0, _mjmlCore.suffixCssClasses)(this.getAttribute('css-class'), 'outlook')
      })}
          >
        `)}
        ${this.renderContent()}
        ${(0, _conditionalTag.default)(`
          </td>
        `)}
      `;
    }
  }]);
  return MjNavbarLink;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjNavbarLink, "componentName", 'mj-navbar-link');
(0, _defineProperty2.default)(MjNavbarLink, "endingTag", true);
(0, _defineProperty2.default)(MjNavbarLink, "allowedAttributes", {
  color: 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  href: 'string',
  name: 'string',
  target: 'string',
  rel: 'string',
  'letter-spacing': 'unitWithNegative(px,em)',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'text-decoration': 'string',
  'text-transform': 'string'
});
(0, _defineProperty2.default)(MjNavbarLink, "defaultAttributes", {
  color: '#000000',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'font-weight': 'normal',
  'line-height': '22px',
  padding: '15px 10px',
  target: '_blank',
  'text-decoration': 'none',
  'text-transform': 'uppercase'
});
module.exports = exports.default;