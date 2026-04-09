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
let MjAccordionTitle = exports.default = /*#__PURE__*/function (_BodyComponent) {
  function MjAccordionTitle() {
    (0, _classCallCheck2.default)(this, MjAccordionTitle);
    return (0, _callSuper2.default)(this, MjAccordionTitle, arguments);
  }
  (0, _inherits2.default)(MjAccordionTitle, _BodyComponent);
  return (0, _createClass2.default)(MjAccordionTitle, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        td: {
          width: '100%',
          'background-color': this.getAttribute('background-color'),
          color: this.getAttribute('color'),
          'font-size': this.getAttribute('font-size'),
          'font-family': this.resolveFontFamily(),
          'font-weight': this.getAttribute('font-weight'),
          padding: this.getAttribute('padding'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-top': this.getAttribute('padding-top')
        },
        table: {
          width: '100%',
          'border-bottom': this.getAttribute('border')
        },
        td2: {
          padding: '16px',
          background: this.getAttribute('background-color'),
          'vertical-align': this.getAttribute('icon-align')
        },
        img: {
          display: 'none',
          width: this.getAttribute('icon-width'),
          height: this.getAttribute('icon-height')
        }
      };
    }
  }, {
    key: "resolveFontFamily",
    value: function resolveFontFamily() {
      if (this.props && this.props.rawAttrs && Object.prototype.hasOwnProperty.call(this.props.rawAttrs, 'font-family')) {
        return this.getAttribute('font-family');
      }
      if (this.context && this.context.elementFontFamily) {
        return this.context.elementFontFamily;
      }
      if (this.context && this.context.accordionFontFamily) {
        return this.context.accordionFontFamily;
      }
      return MjAccordionTitle.defaultAttributes.fontFamily;
    }
  }, {
    key: "renderTitle",
    value: function renderTitle() {
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
    key: "renderIcons",
    value: function renderIcons() {
      return (0, _conditionalTag.default)(`
      <td
        ${this.htmlAttributes({
        class: 'mj-accordion-ico',
        style: 'td2'
      })}
      >
        <img
          ${this.htmlAttributes({
        src: this.getAttribute('icon-wrapped-url'),
        alt: this.getAttribute('icon-wrapped-alt'),
        class: 'mj-accordion-more',
        style: 'img'
      })}
        />
        <img
          ${this.htmlAttributes({
        src: this.getAttribute('icon-unwrapped-url'),
        alt: this.getAttribute('icon-unwrapped-alt'),
        class: 'mj-accordion-less',
        style: 'img'
      })}
        />
      </td>
    `, true);
    }
  }, {
    key: "render",
    value: function render() {
      const contentElements = [this.renderTitle(), this.renderIcons()];
      const content = (this.getAttribute('icon-position') === 'right' ? contentElements : contentElements.reverse()).join('\n');
      return `
      <div ${this.htmlAttributes({
        class: 'mj-accordion-title'
      })}>
        <table
          ${this.htmlAttributes({
        cellspacing: '0',
        cellpadding: '0',
        style: 'table'
      })}
        >
          <tbody>
            <tr>
              ${content}
            </tr>
          </tbody>
        </table>
      </div>
    `;
    }
  }]);
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjAccordionTitle, "componentName", 'mj-accordion-title');
(0, _defineProperty2.default)(MjAccordionTitle, "endingTag", true);
(0, _defineProperty2.default)(MjAccordionTitle, "allowedAttributes", {
  'background-color': 'color',
  color: 'color',
  'font-size': 'unit(px)',
  'font-family': 'string',
  'font-weight': 'string',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}'
});
(0, _defineProperty2.default)(MjAccordionTitle, "defaultAttributes", {
  'font-size': '13px',
  padding: '16px'
});
module.exports = exports.default;