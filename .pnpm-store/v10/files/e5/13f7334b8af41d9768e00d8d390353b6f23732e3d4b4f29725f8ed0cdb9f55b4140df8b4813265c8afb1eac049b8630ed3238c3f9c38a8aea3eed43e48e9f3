"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HeadComponent = exports.BodyComponent = void 0;
exports.initComponent = initComponent;
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _omitBy2 = _interopRequireDefault(require("lodash/omitBy"));
var _isNil2 = _interopRequireDefault(require("lodash/isNil"));
var _filter2 = _interopRequireDefault(require("lodash/filter"));
var _find2 = _interopRequireDefault(require("lodash/find"));
var _kebabCase2 = _interopRequireDefault(require("lodash/kebabCase"));
var _reduce2 = _interopRequireDefault(require("lodash/reduce"));
var _identity2 = _interopRequireDefault(require("lodash/identity"));
var _forEach2 = _interopRequireDefault(require("lodash/forEach"));
var _get2 = _interopRequireDefault(require("lodash/get"));
var _mjmlParserXml = _interopRequireDefault(require("mjml-parser-xml"));
var _shorthandParser = _interopRequireWildcard(require("./helpers/shorthandParser"));
var _formatAttributes = _interopRequireDefault(require("./helpers/formatAttributes"));
var _jsonToXML = _interopRequireDefault(require("./helpers/jsonToXML"));
// eslint-disable-next-line max-classes-per-file

function initComponent({
  initialDatas,
  name
}) {
  const Component = initialDatas.context.components[name];
  if (Component) {
    const component = new Component(initialDatas);
    if (component.headStyle) {
      component.context.addHeadStyle(name, component.headStyle);
    }
    if (component.componentHeadStyle) {
      component.context.addComponentHeadSyle(component.componentHeadStyle);
    }
    return component;
  }
  return null;
}
let Component = /*#__PURE__*/function () {
  function Component(initialDatas = {}) {
    (0, _classCallCheck2.default)(this, Component);
    const {
      attributes = {},
      children = [],
      content = '',
      context = {},
      props = {},
      globalAttributes = {},
      absoluteFilePath = null
    } = initialDatas;
    this.props = {
      absoluteFilePath,
      ...props,
      children,
      content
    };
    this.attributes = (0, _formatAttributes.default)({
      ...this.constructor.defaultAttributes,
      ...globalAttributes,
      ...attributes
    }, this.constructor.allowedAttributes);
    this.context = context;
    return this;
  }
  (0, _createClass2.default)(Component, [{
    key: "getChildContext",
    value: function getChildContext() {
      return this.context;
    }
  }, {
    key: "getAttribute",
    value: function getAttribute(name) {
      return this.attributes[name];
    }
  }, {
    key: "getContent",
    value: function getContent() {
      return this.props.content.trim();
    }
  }, {
    key: "renderMJML",
    value: function renderMJML(mjml, options = {}) {
      if (typeof mjml === 'string') {
        // supports returning siblings elements from a custom component
        const partialMjml = (0, _mjmlParserXml.default)(`<fragment>${mjml}</fragment>`, {
          ...options,
          components: this.context.components,
          ignoreIncludes: true
        });
        return partialMjml.children.map(child => this.context.processing(child, this.context)).join('');
      }
      return this.context.processing(mjml, this.context);
    }
  }], [{
    key: "getTagName",
    value: function getTagName() {
      return this.componentName || (0, _kebabCase2.default)(this.name);
    }
  }, {
    key: "isRawElement",
    value: function isRawElement() {
      return !!this.rawElement;
    }
  }]);
  return Component;
}();
(0, _defineProperty2.default)(Component, "defaultAttributes", {});
let BodyComponent = exports.BodyComponent = /*#__PURE__*/function (_Component2) {
  (0, _inherits2.default)(BodyComponent, _Component2);
  function BodyComponent() {
    (0, _classCallCheck2.default)(this, BodyComponent);
    return (0, _callSuper2.default)(this, BodyComponent, arguments);
  }
  (0, _createClass2.default)(BodyComponent, [{
    key: "getStyles",
    value:
    // eslint-disable-next-line class-methods-use-this
    function getStyles() {
      return {};
    }
  }, {
    key: "getShorthandAttrValue",
    value: function getShorthandAttrValue(attribute, direction) {
      const mjAttributeDirection = this.getAttribute(`${attribute}-${direction}`);
      const mjAttribute = this.getAttribute(attribute);
      if (mjAttributeDirection) {
        return parseInt(mjAttributeDirection, 10);
      }
      if (!mjAttribute) {
        return 0;
      }
      return (0, _shorthandParser.default)(mjAttribute, direction);
    }
  }, {
    key: "getShorthandBorderValue",
    value: function getShorthandBorderValue(direction, attribute = 'border') {
      const borderDirection = direction && this.getAttribute(`${attribute}-${direction}`);
      const border = this.getAttribute(attribute);
      return (0, _shorthandParser.borderParser)(borderDirection || border || '0');
    }
  }, {
    key: "getBoxWidths",
    value: function getBoxWidths() {
      const {
        containerWidth
      } = this.context;
      const parsedWidth = parseInt(containerWidth, 10);
      const paddings = this.getShorthandAttrValue('padding', 'right') + this.getShorthandAttrValue('padding', 'left');
      const borders = this.getShorthandBorderValue('right') + this.getShorthandBorderValue('left');
      return {
        totalWidth: parsedWidth,
        borders,
        paddings,
        box: parsedWidth - paddings - borders
      };
    }
  }, {
    key: "htmlAttributes",
    value: function htmlAttributes(attributes) {
      const specialAttributes = {
        style: v => this.styles(v),
        default: _identity2.default
      };
      return (0, _reduce2.default)((0, _omitBy2.default)(attributes, _isNil2.default), (output, v, name) => {
        const value = (specialAttributes[name] || specialAttributes.default)(v);
        return `${output} ${name}="${value}"`;
      }, '');
    }
  }, {
    key: "styles",
    value: function styles(_styles) {
      let stylesObject;
      if (_styles) {
        if (typeof _styles === 'string') {
          stylesObject = (0, _get2.default)(this.getStyles(), _styles);
        } else {
          stylesObject = _styles;
        }
      }
      return (0, _reduce2.default)(stylesObject, (output, value, name) => {
        if (!(0, _isNil2.default)(value)) {
          return `${output}${name}:${value};`;
        }
        return output;
      }, '');
    }
  }, {
    key: "renderChildren",
    value: function renderChildren(children, options = {}) {
      const {
        props = {},
        renderer = component => component.render(),
        attributes = {},
        rawXML = false
      } = options;
      children = children || this.props.children;
      if (rawXML) {
        return children.map(child => (0, _jsonToXML.default)(child)).join('\n');
      }
      const sibling = children.length;
      const rawComponents = (0, _filter2.default)(this.context.components, c => c.isRawElement());
      const nonRawSiblings = children.filter(child => !(0, _find2.default)(rawComponents, c => c.getTagName() === child.tagName)).length;
      let output = '';
      let index = 0;
      (0, _forEach2.default)(children, children => {
        const component = initComponent({
          name: children.tagName,
          initialDatas: {
            ...children,
            attributes: {
              ...attributes,
              ...children.attributes
            },
            context: this.getChildContext(),
            props: {
              ...props,
              first: index === 0,
              index,
              last: index + 1 === sibling,
              sibling,
              nonRawSiblings
            }
          }
        });
        if (component !== null) {
          output += renderer(component);
        }
        index++; // eslint-disable-line no-plusplus
      });
      return output;
    }
  }]);
  return BodyComponent;
}(Component);
let HeadComponent = exports.HeadComponent = /*#__PURE__*/function (_Component3) {
  (0, _inherits2.default)(HeadComponent, _Component3);
  function HeadComponent() {
    (0, _classCallCheck2.default)(this, HeadComponent);
    return (0, _callSuper2.default)(this, HeadComponent, arguments);
  }
  (0, _createClass2.default)(HeadComponent, [{
    key: "handlerChildren",
    value: function handlerChildren() {
      const {
        children
      } = this.props;
      return children.map(children => {
        const component = initComponent({
          name: children.tagName,
          initialDatas: {
            ...children,
            context: this.getChildContext()
          }
        });
        if (!component) {
          // eslint-disable-next-line no-console
          console.error(`No matching component for tag : ${children.tagName}`);
          return null;
        }
        if (component.handler) {
          component.handler();
        }
        if (component.render) {
          return component.render();
        }
        return null;
      });
    }
  }], [{
    key: "getTagName",
    value: function getTagName() {
      return this.componentName || (0, _kebabCase2.default)(this.name);
    }
  }]);
  return HeadComponent;
}(Component);