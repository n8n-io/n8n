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
let MjBody = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjBody, _BodyComponent);
  function MjBody() {
    (0, _classCallCheck2.default)(this, MjBody);
    return (0, _callSuper2.default)(this, MjBody, arguments);
  }
  (0, _createClass2.default)(MjBody, [{
    key: "getChildContext",
    value: function getChildContext() {
      return {
        ...this.context,
        containerWidth: this.getAttribute('width')
      };
    }
  }, {
    key: "getStyles",
    value: function getStyles() {
      return {
        div: {
          'background-color': this.getAttribute('background-color')
        }
      };
    }
  }, {
    key: "render",
    value: function render() {
      const {
        setBackgroundColor,
        globalData: {
          lang,
          dir
        }
      } = this.context;
      setBackgroundColor(this.getAttribute('background-color'));
      return `
      <div
        ${this.htmlAttributes({
        class: this.getAttribute('css-class'),
        style: 'div',
        lang,
        dir
      })}
      >
        ${this.renderChildren()}
      </div>
    `;
    }
  }]);
  return MjBody;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjBody, "componentName", 'mj-body');
(0, _defineProperty2.default)(MjBody, "allowedAttributes", {
  width: 'unit(px)',
  'background-color': 'color'
});
(0, _defineProperty2.default)(MjBody, "defaultAttributes", {
  width: '600px'
});
module.exports = exports.default;