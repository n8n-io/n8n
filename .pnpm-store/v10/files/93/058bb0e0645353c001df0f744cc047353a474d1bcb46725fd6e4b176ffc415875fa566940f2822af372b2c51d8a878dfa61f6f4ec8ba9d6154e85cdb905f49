'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mjAttribute = require('../helpers/mjAttribute');

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _MJMLElementsCollection = require('../MJMLElementsCollection');

var _MJMLElementsCollection2 = _interopRequireDefault(_MJMLElementsCollection);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _server = require('react-dom/server');

var _server2 = _interopRequireDefault(_server);

var _trim = require('lodash/trim');

var _trim2 = _interopRequireDefault(_trim);

var _helpers = require('../helpers');

var _hoistNonReactStatics = require('hoist-non-react-statics');

var _hoistNonReactStatics2 = _interopRequireDefault(_hoistNonReactStatics);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var getElementWidth = function getElementWidth(_ref) {
  var element = _ref.element,
      siblings = _ref.siblings,
      parentWidth = _ref.parentWidth;
  var mjml = element.props.mjml;
  var width = element.props.width;


  if (!width && mjml) {
    width = mjml.getIn(['attributes', 'width']);
  }

  if (width == undefined) {
    return parentWidth / siblings;
  }

  var _widthParser = (0, _mjAttribute.widthParser)(width),
      parsedWidth = _widthParser.width,
      unit = _widthParser.unit;

  switch (unit) {
    case '%':
      return parsedWidth * parentWidth / 100;

    case 'px':
    default:
      return parsedWidth;
  }
};

// used to pass column count to children
var siblingCount = 1;

function createComponent(ComposedComponent) {

  var baseStyles = {
    td: {
      wordWrap: 'break-word'
    }
  };

  var MJMLElement = function (_Component) {
    _inherits(MJMLElement, _Component);

    function MJMLElement(props) {
      _classCallCheck(this, MJMLElement);

      var _this = _possibleConstructorReturn(this, (MJMLElement.__proto__ || Object.getPrototypeOf(MJMLElement)).call(this, props));

      _this.mjAttribute = function (name) {
        return _this.mjml.getIn(['attributes', name]);
      };

      _this.mjName = function () {
        return _this.constructor.tagName;
      };

      _this.mjContent = function () {
        var content = _this.mjml.get('content');

        if (content) {
          return (0, _trim2.default)(content);
        }

        var contentItems = _react2.default.Children.map(_this.props.children, function (child) {
          if (typeof child === 'string') {
            return child;
          }
          return _server2.default.renderToStaticMarkup(child);
        });

        return Array.isArray(contentItems) ? contentItems.join("") : contentItems;
      };

      _this.isInheritedAttributes = function (name) {
        return _this.mjml.get('inheritedAttributes') && _this.mjml.get('inheritedAttributes').includes(name);
      };

      _this.getWidth = function () {
        return _this.mjAttribute('rawPxWidth') || _this.mjAttribute('width');
      };

      _this.getParentWidth = function () {
        return _this.mjAttribute('parentWidth');
      };

      _this.renderWrappedOutlookChildren = function (children) {
        children = _react2.default.Children.toArray(children);

        var realChildren = children.filter(function (child) {
          return !child.props.mjml || child.props.mjml.get('tagName') !== 'mj-raw';
        });

        var prefix = _this.mjName() + '-outlook';
        var parentWidth = _this.getWidth();
        var siblings = realChildren.length;
        var elementsWidth = realChildren.map(function (element) {
          if (_this.isInheritedAttributes('width')) {
            return parseInt(parentWidth);
          }

          return getElementWidth({ element: element, siblings: siblings, parentWidth: parentWidth });
        });

        var wrappedElements = [];

        if (siblings == 0) {
          return wrappedElements;
        }

        wrappedElements.push(_react2.default.createElement('div', { key: 'outlook-open', className: prefix + '-open', 'data-width': elementsWidth[0] }));

        var i = 0;

        children.forEach(function (child) {
          var childProps = Object.assign({}, child.props);

          if (childProps.mjml) {
            childProps.mjml = childProps.mjml.setIn(['attributes', 'rawPxWidth'], elementsWidth[i]);

            if (_this.mjml.get('inheritedAttributes')) {
              childProps.mjml = childProps.mjml.mergeIn(['attributes', _this.inheritedAttributes()]);
            }
          } else {
            Object.assign(childProps, { rawPxWidth: elementsWidth[i] });

            if (_this.mjml.get('inheritedAttributes')) {
              Object.assign(childProps, _this.inheritedAttributes());
            }
          }

          var childWithProps = _react2.default.cloneElement(child, childProps);

          wrappedElements.push(childWithProps);
          if (!childWithProps.type.rawElement && i < realChildren.length - 1) {
            wrappedElements.push(_react2.default.createElement('div', { key: 'outlook-' + i, className: prefix + '-line', 'data-width': elementsWidth[++i] }));
          }
        });

        wrappedElements.push(_react2.default.createElement('div', { key: 'outlook-close', className: prefix + '-close' }));

        return wrappedElements;
      };

      _this.paddingParser = function (direction) {
        var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

        var paddingDirection = _this.mjAttribute(prefix + 'padding-' + direction);
        var padding = _this.mjAttribute(prefix + 'padding');

        if (paddingDirection != null) {
          return parseInt(paddingDirection);
        }

        if (!padding) {
          return 0;
        }

        var paddings = padding.split(' ');
        var directions = {};

        switch (paddings.length) {
          case 1:
            return parseInt(padding);
          case 2:
            directions = { top: 0, bottom: 0, left: 1, right: 1 };
            break;
          case 3:
            directions = { top: 0, left: 1, right: 1, bottom: 2 };
            break;
          case 4:
            directions = { top: 0, right: 1, bottom: 2, left: 3 };
            break;
        }

        return parseInt(paddings[directions[direction]] || 0);
      };

      _this.mjml = props.mjml || _immutable2.default.fromJS(_this.constructor.defaultMJMLDefinition || {}).mergeIn(['attributes'], props);
      return _this;
    }

    _createClass(MJMLElement, [{
      key: 'getStyles',
      value: function getStyles() {
        return (0, _helpers.merge)({}, baseStyles, {
          td: {
            background: this.mjAttribute('container-background-color'),
            fontSize: '0px',
            padding: (0, _mjAttribute.defaultUnit)(this.mjAttribute('padding'), 'px'),
            paddingTop: (0, _mjAttribute.defaultUnit)(this.mjAttribute('padding-top'), 'px'),
            paddingBottom: (0, _mjAttribute.defaultUnit)(this.mjAttribute('padding-bottom'), 'px'),
            paddingRight: (0, _mjAttribute.defaultUnit)(this.mjAttribute('padding-right'), 'px'),
            paddingLeft: (0, _mjAttribute.defaultUnit)(this.mjAttribute('padding-left'), 'px')
          }
        });
      }
    }, {
      key: 'inheritedAttributes',
      value: function inheritedAttributes() {
        var _this2 = this;

        return this.mjml.get('inheritedAttributes').reduce(function (result, value) {
          result[value] = _this2.mjAttribute(value);

          return result;
        }, {});
      }
    }, {
      key: 'generateChildren',
      value: function generateChildren() {
        var _this3 = this;

        var parentMjml = this.props.mjml;


        if (!parentMjml) {
          return [];
        }

        return parentMjml.get('children').map(function (mjml, i) {
          var childMjml = mjml.setIn(['attributes', 'parentWidth'], _this3.getWidth());

          var tag = childMjml.get('tagName');
          var Element = _MJMLElementsCollection2.default[tag];

          if (!Element) {
            return null;
          }

          return _react2.default.createElement(Element, {
            key: i // eslint-disable-line react/no-array-index-key
            , mjml: childMjml,
            parentMjml: parentMjml });
        });
      }
    }, {
      key: 'validChildren',
      value: function validChildren() {
        var children = this.props.children;

        return (children && _react2.default.Children.toArray(children) || this.generateChildren()).filter(Boolean);
      }
    }, {
      key: 'buildProps',
      value: function buildProps() {
        var _this4 = this;

        var parentMjml = this.props.parentMjml;


        var childMethods = ['mjAttribute', 'mjContent', 'renderWrappedOutlookChildren'];

        // assign sibling count for element and children
        if (parentMjml) {
          siblingCount = parentMjml.get('children').size;
        }

        return _extends({}, this.props, {

          // set mjName
          mjName: this.mjName(),

          // generate children
          children: this.validChildren(),

          // siblings count, can change display
          sibling: siblingCount,

          parentWidth: this.getParentWidth(),
          getPadding: this.paddingParser,
          defaultUnit: _mjAttribute.defaultUnit

        }, childMethods.reduce(function (acc, method) {
          return _extends({}, acc, _defineProperty({}, method, _this4[method]));
        }, {}));
      }
    }, {
      key: 'render',
      value: function render() {
        if (this.props.columnElement && this.constructor.tagName != 'mj-raw') {
          this.styles = this.getStyles();

          return _react2.default.createElement(
            'tr',
            { className: this.mjAttribute('css-class') },
            _react2.default.createElement(
              'td',
              {
                'data-legacy-align': this.mjAttribute('align'),
                'data-legacy-background': this.mjAttribute('container-background-color'),
                style: this.styles.td },
              _react2.default.createElement(ComposedComponent, this.buildProps())
            )
          );
        }

        return _react2.default.createElement(ComposedComponent, this.buildProps());
      }
    }]);

    return MJMLElement;
  }(_react.Component);

  return (0, _hoistNonReactStatics2.default)(MJMLElement, ComposedComponent);
}

exports.default = createComponent;