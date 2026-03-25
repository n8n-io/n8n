'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class;

var _mjmlCore = require('mjml-core');

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var tagName = 'mj-link';
var parentTag = ['mj-inline-links'];
var defaultMJMLDefinition = {
  attributes: {
    'color': '#000000',
    'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
    'font-size': '13px',
    'font-weight': 'normal',
    'href': null,
    'rel': null,
    'line-height': '22px',
    'padding': '15px 10px',
    'padding-top': null,
    'padding-left': null,
    'padding-right': null,
    'padding-bottom': null,
    'text-decoration': null,
    'text-transform': null
  }
};
var baseStyles = {
  a: {
    display: 'inline-block',
    textDecoration: 'none',
    textTransform: 'uppercase'
  }
};
var endingTag = true;
var postRender = function postRender($) {
  $('.mj-link').each(function () {
    $(this).before('<!--[if gte mso 9]>\n          <td style="padding: ' + $(this).data('padding') + '">\n        <![endif]-->').after('<!--[if gte mso 9]>\n          </td>\n        <![endif]-->').removeAttr('data-padding').removeAttr('class');
  });

  return $;
};

var Link = (0, _mjmlCore.MJMLElement)(_class = function (_Component) {
  _inherits(Link, _Component);

  function Link() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, Link);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = Link.__proto__ || Object.getPrototypeOf(Link)).call.apply(_ref, [this].concat(args))), _this), _this.styles = _this.getStyles(), _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(Link, [{
    key: 'getStyles',
    value: function getStyles() {
      var mjAttribute = this.props.mjAttribute;


      return _mjmlCore.helpers.merge({}, baseStyles, {
        a: {
          color: mjAttribute('color'),
          fontFamily: mjAttribute('font-family'),
          fontSize: mjAttribute('font-size'),
          fontWeight: mjAttribute('font-weight'),
          lineHeight: mjAttribute('line-height'),
          textDecoration: mjAttribute('text-decoration'),
          textTransform: mjAttribute('text-transform'),
          padding: mjAttribute('padding'),
          paddingTop: mjAttribute('padding-top'),
          paddingLeft: mjAttribute('padding-left'),
          paddingRight: mjAttribute('padding-right'),
          paddingBottom: mjAttribute('padding-bottom')
        }
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          mjAttribute = _props.mjAttribute,
          mjContent = _props.mjContent;


      return _react2.default.createElement('a', {
        className: 'mj-link',
        href: mjAttribute('href'),
        rel: mjAttribute('rel'),
        dangerouslySetInnerHTML: { __html: mjContent() },
        style: this.styles.a,
        'data-padding': this.styles.a.padding
      });
    }
  }]);

  return Link;
}(_react.Component)) || _class;

Link.tagName = tagName;
Link.defaultMJMLDefinition = defaultMJMLDefinition;
Link.baseStyles = baseStyles;
Link.endingTag = endingTag;
Link.postRender = postRender;
Link.parentTag = parentTag;

exports.default = Link;