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
let MjColumn = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjColumn, _BodyComponent);
  function MjColumn() {
    (0, _classCallCheck2.default)(this, MjColumn);
    return (0, _callSuper2.default)(this, MjColumn, arguments);
  }
  (0, _createClass2.default)(MjColumn, [{
    key: "getChildContext",
    value: function getChildContext() {
      const {
        containerWidth: parentWidth
      } = this.context;
      const {
        nonRawSiblings
      } = this.props;
      const {
        borders,
        paddings
      } = this.getBoxWidths();
      const innerBorders = this.getShorthandBorderValue('left', 'inner-border') + this.getShorthandBorderValue('right', 'inner-border');
      const allPaddings = paddings + borders + innerBorders;
      let containerWidth = this.getAttribute('width') || `${parseFloat(parentWidth) / nonRawSiblings}px`;
      const {
        unit,
        parsedWidth
      } = (0, _widthParser.default)(containerWidth, {
        parseFloatToInt: false
      });
      if (unit === '%') {
        containerWidth = `${parseFloat(parentWidth) * parsedWidth / 100 - allPaddings}px`;
      } else {
        containerWidth = `${parsedWidth - allPaddings}px`;
      }
      return {
        ...this.context,
        containerWidth
      };
    }
  }, {
    key: "getStyles",
    value: function getStyles() {
      const tableStyle = {
        'background-color': this.getAttribute('background-color'),
        border: this.getAttribute('border'),
        'border-bottom': this.getAttribute('border-bottom'),
        'border-left': this.getAttribute('border-left'),
        'border-radius': this.getAttribute('border-radius'),
        'border-right': this.getAttribute('border-right'),
        'border-top': this.getAttribute('border-top'),
        'vertical-align': this.getAttribute('vertical-align')
      };
      return {
        div: {
          'font-size': '0px',
          'text-align': 'left',
          direction: this.getAttribute('direction'),
          display: 'inline-block',
          'vertical-align': this.getAttribute('vertical-align'),
          width: this.getMobileWidth()
        },
        table: {
          ...(this.hasGutter() ? {
            'background-color': this.getAttribute('inner-background-color'),
            border: this.getAttribute('inner-border'),
            'border-bottom': this.getAttribute('inner-border-bottom'),
            'border-left': this.getAttribute('inner-border-left'),
            'border-radius': this.getAttribute('inner-border-radius'),
            'border-right': this.getAttribute('inner-border-right'),
            'border-top': this.getAttribute('inner-border-top')
          } : tableStyle)
        },
        tdOutlook: {
          'vertical-align': this.getAttribute('vertical-align'),
          width: this.getWidthAsPixel()
        },
        gutter: {
          ...tableStyle,
          padding: this.getAttribute('padding'),
          'padding-top': this.getAttribute('padding-top'),
          'padding-right': this.getAttribute('padding-right'),
          'padding-bottom': this.getAttribute('padding-bottom'),
          'padding-left': this.getAttribute('padding-left')
        }
      };
    }
  }, {
    key: "getMobileWidth",
    value: function getMobileWidth() {
      const {
        containerWidth
      } = this.context;
      const {
        nonRawSiblings
      } = this.props;
      const width = this.getAttribute('width');
      const mobileWidth = this.getAttribute('mobileWidth');
      if (mobileWidth !== 'mobileWidth') {
        return '100%';
      }
      if (width === undefined) {
        return `${parseInt(100 / nonRawSiblings, 10)}%`;
      }
      const {
        unit,
        parsedWidth
      } = (0, _widthParser.default)(width, {
        parseFloatToInt: false
      });
      switch (unit) {
        case '%':
          return width;
        case 'px':
        default:
          return `${parsedWidth / parseInt(containerWidth, 10) * 100}%`;
      }
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
      const formattedClassNb = parsedWidth.toString().replace('.', '-');
      switch (unit) {
        case '%':
          className = `mj-column-per-${formattedClassNb}`;
          break;
        case 'px':
        default:
          className = `mj-column-px-${formattedClassNb}`;
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
    key: "hasGutter",
    value: function hasGutter() {
      return ['padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top'].some(attr => this.getAttribute(attr) != null);
    }
  }, {
    key: "renderGutter",
    value: function renderGutter() {
      return `
      <table
        ${this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        width: '100%'
      })}
      >
        <tbody>
          <tr>
            <td ${this.htmlAttributes({
        style: 'gutter'
      })}>
              ${this.renderColumn()}
            </td>
          </tr>
        </tbody>
      </table>
    `;
    }
  }, {
    key: "renderColumn",
    value: function renderColumn() {
      const {
        children
      } = this.props;
      return `
      <table
        ${this.htmlAttributes({
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: 'table',
        width: '100%'
      })}
      >
        <tbody>
          ${this.renderChildren(children, {
        renderer: component => component.constructor.isRawElement() ? component.render() : `
              <tr>
                <td
                  ${component.htmlAttributes({
          align: component.getAttribute('align'),
          class: component.getAttribute('css-class'),
          style: {
            background: component.getAttribute('container-background-color'),
            'font-size': '0px',
            padding: component.getAttribute('padding'),
            'padding-top': component.getAttribute('padding-top'),
            'padding-right': component.getAttribute('padding-right'),
            'padding-bottom': component.getAttribute('padding-bottom'),
            'padding-left': component.getAttribute('padding-left'),
            'word-break': 'break-word'
          }
        })}
                >
                  ${component.render()}
                </td>
              </tr>
            `
      })}
        </tbody>
      </table>
    `;
    }
  }, {
    key: "render",
    value: function render() {
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
        ${this.hasGutter() ? this.renderGutter() : this.renderColumn()}
      </div>
    `;
    }
  }]);
  return MjColumn;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjColumn, "componentName", 'mj-column');
(0, _defineProperty2.default)(MjColumn, "allowedAttributes", {
  'background-color': 'color',
  border: 'string',
  'border-bottom': 'string',
  'border-left': 'string',
  'border-radius': 'unit(px,%){1,4}',
  'border-right': 'string',
  'border-top': 'string',
  direction: 'enum(ltr,rtl)',
  'inner-background-color': 'color',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'padding-top': 'unit(px,%)',
  'inner-border': 'string',
  'inner-border-bottom': 'string',
  'inner-border-left': 'string',
  'inner-border-radius': 'unit(px,%){1,4}',
  'inner-border-right': 'string',
  'inner-border-top': 'string',
  padding: 'unit(px,%){1,4}',
  'vertical-align': 'enum(top,bottom,middle)',
  width: 'unit(px,%)'
});
(0, _defineProperty2.default)(MjColumn, "defaultAttributes", {
  direction: 'ltr',
  'vertical-align': 'top'
});
module.exports = exports.default;