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
let MjText = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjText, _BodyComponent);
  function MjText() {
    (0, _classCallCheck2.default)(this, MjText);
    return (0, _callSuper2.default)(this, MjText, arguments);
  }
  (0, _createClass2.default)(MjText, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        text: {
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'font-style': this.getAttribute('font-style'),
          'font-weight': this.getAttribute('font-weight'),
          'letter-spacing': this.getAttribute('letter-spacing'),
          'line-height': this.getAttribute('line-height'),
          'text-align': this.getAttribute('align'),
          'text-decoration': this.getAttribute('text-decoration'),
          'text-transform': this.getAttribute('text-transform'),
          color: this.getAttribute('color'),
          height: this.getAttribute('height')
        }
      };
    }
  }, {
    key: "renderContent",
    value: function renderContent() {
      return `
      <div
        ${this.htmlAttributes({
        style: 'text'
      })}
      >${this.getContent()}</div>
    `;
    }
  }, {
    key: "render",
    value: function render() {
      const height = this.getAttribute('height');
      return height ? `
        ${(0, _conditionalTag.default)(`
          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="${height}" style="vertical-align:top;height:${height};">
        `)}
        ${this.renderContent()}
        ${(0, _conditionalTag.default)(`
          </td></tr></table>
        `)}
      ` : this.renderContent();
    }
  }]);
  return MjText;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjText, "componentName", 'mj-text');
(0, _defineProperty2.default)(MjText, "endingTag", true);
(0, _defineProperty2.default)(MjText, "allowedAttributes", {
  align: 'enum(left,right,center,justify)',
  'background-color': 'color',
  color: 'color',
  'container-background-color': 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-style': 'string',
  'font-weight': 'string',
  height: 'unit(px,%)',
  'letter-spacing': 'unitWithNegative(px,em)',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  'text-decoration': 'string',
  'text-transform': 'string',
  'vertical-align': 'enum(top,bottom,middle)'
});
(0, _defineProperty2.default)(MjText, "defaultAttributes", {
  align: 'left',
  color: '#000000',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'line-height': '1',
  padding: '10px 25px'
});
module.exports = exports.default;