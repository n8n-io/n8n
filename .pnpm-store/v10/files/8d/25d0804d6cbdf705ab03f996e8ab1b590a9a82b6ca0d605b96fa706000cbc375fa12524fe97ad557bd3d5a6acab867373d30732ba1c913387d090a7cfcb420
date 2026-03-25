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
var _find2 = _interopRequireDefault(require("lodash/find"));
var _mjmlCore = require("mjml-core");
var _conditionalTag = _interopRequireDefault(require("mjml-core/lib/helpers/conditionalTag"));
var _AccordionText = _interopRequireDefault(require("./AccordionText"));
var _AccordionTitle = _interopRequireDefault(require("./AccordionTitle"));
let MjAccordionElement = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjAccordionElement, _BodyComponent);
  function MjAccordionElement() {
    (0, _classCallCheck2.default)(this, MjAccordionElement);
    return (0, _callSuper2.default)(this, MjAccordionElement, arguments);
  }
  (0, _createClass2.default)(MjAccordionElement, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        td: {
          padding: '0px',
          'background-color': this.getAttribute('background-color')
        },
        label: {
          'font-size': '13px',
          'font-family': this.getAttribute('font-family')
        },
        input: {
          display: 'none'
        }
      };
    }
  }, {
    key: "handleMissingChildren",
    value: function handleMissingChildren() {
      const {
        children
      } = this.props;
      const childrenAttr = ['border', 'icon-align', 'icon-width', 'icon-height', 'icon-position', 'icon-wrapped-url', 'icon-wrapped-alt', 'icon-unwrapped-url', 'icon-unwrapped-alt'].reduce((res, val) => ({
        ...res,
        [val]: this.getAttribute(val)
      }), {});
      const result = [];
      if (!(0, _find2.default)(children, {
        tagName: 'mj-accordion-title'
      })) {
        result.push(new _AccordionTitle.default({
          attributes: childrenAttr,
          context: this.getChildContext()
        }).render());
      }
      result.push(this.renderChildren(children, {
        attributes: childrenAttr
      }));
      if (!(0, _find2.default)(children, {
        tagName: 'mj-accordion-text'
      })) {
        result.push(new _AccordionText.default({
          attributes: childrenAttr,
          context: this.getChildContext()
        }).render());
      }
      return result.join('\n');
    }
  }, {
    key: "render",
    value: function render() {
      return `
      <tr
        ${this.htmlAttributes({
        class: this.getAttribute('css-class')
      })}
      >
        <td ${this.htmlAttributes({
        style: 'td'
      })}>
          <label
            ${this.htmlAttributes({
        class: 'mj-accordion-element',
        style: 'label'
      })}
          >
            ${(0, _conditionalTag.default)(`
              <input
                ${this.htmlAttributes({
        class: 'mj-accordion-checkbox',
        type: 'checkbox',
        style: 'input'
      })}
              />
            `, true)}
            <div>
              ${this.handleMissingChildren()}
            </div>
          </label>
        </td>
      </tr>
    `;
    }
  }]);
  return MjAccordionElement;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjAccordionElement, "componentName", 'mj-accordion-element');
(0, _defineProperty2.default)(MjAccordionElement, "allowedAttributes", {
  'background-color': 'color',
  border: 'string',
  'font-family': 'string',
  'icon-align': 'enum(top,middle,bottom)',
  'icon-width': 'unit(px,%)',
  'icon-height': 'unit(px,%)',
  'icon-wrapped-url': 'string',
  'icon-wrapped-alt': 'string',
  'icon-unwrapped-url': 'string',
  'icon-unwrapped-alt': 'string',
  'icon-position': 'enum(left,right)'
});
(0, _defineProperty2.default)(MjAccordionElement, "defaultAttributes", {
  title: {
    img: {
      width: '32px',
      height: '32px'
    }
  }
});
module.exports = exports.default;