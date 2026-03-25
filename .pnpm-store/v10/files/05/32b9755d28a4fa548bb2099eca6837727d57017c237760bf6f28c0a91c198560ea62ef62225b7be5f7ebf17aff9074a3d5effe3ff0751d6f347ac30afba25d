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
let MjDivider = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjDivider, _BodyComponent);
  function MjDivider() {
    (0, _classCallCheck2.default)(this, MjDivider);
    return (0, _callSuper2.default)(this, MjDivider, arguments);
  }
  (0, _createClass2.default)(MjDivider, [{
    key: "getStyles",
    value: function getStyles() {
      let computeAlign = '0px auto';
      if (this.getAttribute('align') === 'left') {
        computeAlign = '0px';
      } else if (this.getAttribute('align') === 'right') {
        computeAlign = '0px 0px 0px auto';
      }
      const p = {
        'border-top': ['style', 'width', 'color'].map(attr => this.getAttribute(`border-${attr}`)).join(' '),
        'font-size': '1px',
        margin: computeAlign,
        width: this.getAttribute('width')
      };
      return {
        p,
        outlook: {
          ...p,
          width: this.getOutlookWidth()
        }
      };
    }
  }, {
    key: "getOutlookWidth",
    value: function getOutlookWidth() {
      const {
        containerWidth
      } = this.context;
      const paddingSize = this.getShorthandAttrValue('padding', 'left') + this.getShorthandAttrValue('padding', 'right');
      const width = this.getAttribute('width');
      const {
        parsedWidth,
        unit
      } = (0, _widthParser.default)(width);
      switch (unit) {
        case '%':
          {
            const effectiveWidth = parseInt(containerWidth, 10) - paddingSize;
            const percentMultiplier = parseInt(parsedWidth, 10) / 100;
            return `${effectiveWidth * percentMultiplier}px`;
          }
        case 'px':
          return width;
        default:
          return `${parseInt(containerWidth, 10) - paddingSize}px`;
      }
    }
  }, {
    key: "renderAfter",
    value: function renderAfter() {
      return `
      <!--[if mso | IE]>
        <table
          ${this.htmlAttributes({
        align: this.getAttribute('align'),
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        style: 'outlook',
        role: 'presentation',
        width: this.getOutlookWidth()
      })}
        >
          <tr>
            <td style="height:0;line-height:0;">
              &nbsp;
            </td>
          </tr>
        </table>
      <![endif]-->
    `;
    }
  }, {
    key: "render",
    value: function render() {
      return `
      <p
        ${this.htmlAttributes({
        style: 'p'
      })}
      >
      </p>
      ${this.renderAfter()}
    `;
    }
  }]);
  return MjDivider;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjDivider, "componentName", 'mj-divider');
(0, _defineProperty2.default)(MjDivider, "allowedAttributes", {
  'border-color': 'color',
  'border-style': 'string',
  'border-width': 'unit(px)',
  'container-background-color': 'color',
  padding: 'unit(px,%){1,4}',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  width: 'unit(px,%)',
  align: 'enum(left,center,right)'
});
(0, _defineProperty2.default)(MjDivider, "defaultAttributes", {
  'border-color': '#000000',
  'border-style': 'solid',
  'border-width': '4px',
  padding: '10px 25px',
  width: '100%',
  align: 'center'
});
module.exports = exports.default;