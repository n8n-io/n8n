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
let MjGroup = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjGroup, _BodyComponent);
  function MjGroup() {
    (0, _classCallCheck2.default)(this, MjGroup);
    return (0, _callSuper2.default)(this, MjGroup, arguments);
  }
  (0, _createClass2.default)(MjGroup, [{
    key: "getChildContext",
    value: function getChildContext() {
      const {
        containerWidth: parentWidth
      } = this.context;
      const {
        nonRawSiblings,
        children
      } = this.props;
      const paddingSize = this.getShorthandAttrValue('padding', 'left') + this.getShorthandAttrValue('padding', 'right');
      let containerWidth = this.getAttribute('width') || `${parseFloat(parentWidth) / nonRawSiblings}px`;
      const {
        unit,
        parsedWidth
      } = (0, _widthParser.default)(containerWidth, {
        parseFloatToInt: false
      });
      if (unit === '%') {
        containerWidth = `${parseFloat(parentWidth) * parsedWidth / 100 - paddingSize}px`;
      } else {
        containerWidth = `${parsedWidth - paddingSize}px`;
      }
      return {
        ...this.context,
        containerWidth,
        nonRawSiblings: children.length
      };
    }
  }, {
    key: "getStyles",
    value: function getStyles() {
      return {
        div: {
          'font-size': '0',
          'line-height': '0',
          'text-align': 'left',
          display: 'inline-block',
          width: '100%',
          direction: this.getAttribute('direction'),
          'vertical-align': this.getAttribute('vertical-align'),
          'background-color': this.getAttribute('background-color')
        },
        tdOutlook: {
          'vertical-align': this.getAttribute('vertical-align'),
          width: this.getWidthAsPixel()
        }
      };
    }
  }, {
    key: "getParsedWidth",
    value: function getParsedWidth(toString) {
      const {
        nonRawSiblings
      } = this.props;
      const width = this.getAttribute('width') || `${100 / nonRawSiblings}%`;
      const {
        unit,
        parsedWidth
      } = (0, _widthParser.default)(width, {
        parseFloatToInt: false
      });
      if (toString) {
        return `${parsedWidth}${unit}`;
      }
      return {
        unit,
        parsedWidth
      };
    }
  }, {
    key: "getWidthAsPixel",
    value: function getWidthAsPixel() {
      const {
        containerWidth
      } = this.context;
      const {
        unit,
        parsedWidth
      } = (0, _widthParser.default)(this.getParsedWidth(true), {
        parseFloatToInt: false
      });
      if (unit === '%') {
        return `${parseFloat(containerWidth) * parsedWidth / 100}px`;
      }
      return `${parsedWidth}px`;
    }
  }, {
    key: "getColumnClass",
    value: function getColumnClass() {
      const {
        addMediaQuery
      } = this.context;
      let className = '';
      const {
        parsedWidth,
        unit
      } = this.getParsedWidth();
      switch (unit) {
        case '%':
          className = `mj-column-per-${parseInt(parsedWidth, 10)}`;
          break;
        case 'px':
        default:
          className = `mj-column-px-${parseInt(parsedWidth, 10)}`;
          break;
      }

      // Add className to media queries
      addMediaQuery(className, {
        parsedWidth,
        unit
      });
      return className;
    }
  }, {
    key: "render",
    value: function render() {
      const {
        children,
        nonRawSiblings
      } = this.props;
      const {
        containerWidth: groupWidth
      } = this.getChildContext();
      const {
        containerWidth
      } = this.context;
      const getElementWidth = width => {
        if (!width) {
          return `${parseInt(containerWidth, 10) / parseInt(nonRawSiblings, 10)}px`;
        }
        const {
          unit,
          parsedWidth
        } = (0, _widthParser.default)(width, {
          parseFloatToInt: false
        });
        if (unit === '%') {
          return `${100 * parsedWidth / groupWidth}px`;
        }
        return `${parsedWidth}${unit}`;
      };
      let classesName = `${this.getColumnClass()} mj-outlook-group-fix`;
      if (this.getAttribute('css-class')) {
        classesName += ` ${this.getAttribute('css-class')}`;
      }
      return `
      <div
        ${this.htmlAttributes({
        class: classesName,
        style: 'div'
      })}
      >
        <!--[if mso | IE]>
        <table
          ${this.htmlAttributes({
        bgcolor: this.getAttribute('background-color') === 'none' ? undefined : this.getAttribute('background-color'),
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation'
      })}
        >
          <tr>
        <![endif]-->
          ${this.renderChildren(children, {
        attributes: {
          mobileWidth: 'mobileWidth'
        },
        renderer: component => component.constructor.isRawElement() ? component.render() : `
              <!--[if mso | IE]>
              <td
                ${component.htmlAttributes({
          style: {
            align: component.getAttribute('align'),
            'vertical-align': component.getAttribute('vertical-align'),
            width: getElementWidth(component.getWidthAsPixel ? component.getWidthAsPixel() : component.getAttribute('width'))
          }
        })}
              >
              <![endif]-->
                ${component.render()}
              <!--[if mso | IE]>
              </td>
              <![endif]-->
          `
      })}
        <!--[if mso | IE]>
          </tr>
          </table>
        <![endif]-->
      </div>
    `;
    }
  }]);
  return MjGroup;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjGroup, "componentName", 'mj-group');
(0, _defineProperty2.default)(MjGroup, "allowedAttributes", {
  'background-color': 'color',
  direction: 'enum(ltr,rtl)',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)'
});
(0, _defineProperty2.default)(MjGroup, "defaultAttributes", {
  direction: 'ltr'
});
module.exports = exports.default;