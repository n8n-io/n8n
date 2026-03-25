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
var _reduce2 = _interopRequireDefault(require("lodash/reduce"));
var _widthParser = _interopRequireDefault(require("mjml-core/lib/helpers/widthParser"));
var _mjmlCore = require("mjml-core");
let MjTable = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjTable, _BodyComponent);
  function MjTable() {
    (0, _classCallCheck2.default)(this, MjTable);
    return (0, _callSuper2.default)(this, MjTable, arguments);
  }
  (0, _createClass2.default)(MjTable, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        table: {
          color: this.getAttribute('color'),
          'font-family': this.getAttribute('font-family'),
          'font-size': this.getAttribute('font-size'),
          'line-height': this.getAttribute('line-height'),
          'table-layout': this.getAttribute('table-layout'),
          width: this.getAttribute('width'),
          border: this.getAttribute('border')
        }
      };
    }
  }, {
    key: "getWidth",
    value: function getWidth() {
      const width = this.getAttribute('width');
      const {
        parsedWidth,
        unit
      } = (0, _widthParser.default)(width);
      return unit === '%' ? width : parsedWidth;
    }
  }, {
    key: "render",
    value: function render() {
      const tableAttributes = (0, _reduce2.default)(['cellpadding', 'cellspacing', 'role'], (acc, v) => ({
        ...acc,
        [v]: this.getAttribute(v)
      }), {});
      return `
      <table
        ${this.htmlAttributes({
        ...tableAttributes,
        width: this.getWidth(),
        border: '0',
        style: 'table'
      })}
      >
        ${this.getContent()}
      </table>
    `;
    }
  }]);
  return MjTable;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjTable, "componentName", 'mj-table');
(0, _defineProperty2.default)(MjTable, "endingTag", true);
(0, _defineProperty2.default)(MjTable, "allowedAttributes", {
  align: 'enum(left,right,center)',
  border: 'string',
  cellpadding: 'integer',
  cellspacing: 'integer',
  'container-background-color': 'color',
  color: 'color',
  'font-family': 'string',
  'font-size': 'unit(px)',
  'font-weight': 'string',
  'line-height': 'unit(px,%,)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  padding: 'unit(px,%){1,4}',
  role: 'enum(none,presentation)',
  'table-layout': 'enum(auto,fixed,initial,inherit)',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)'
});
(0, _defineProperty2.default)(MjTable, "defaultAttributes", {
  align: 'left',
  border: 'none',
  cellpadding: '0',
  cellspacing: '0',
  color: '#000000',
  'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
  'font-size': '13px',
  'line-height': '22px',
  padding: '10px 25px',
  'table-layout': 'auto',
  width: '100%'
});
module.exports = exports.default;