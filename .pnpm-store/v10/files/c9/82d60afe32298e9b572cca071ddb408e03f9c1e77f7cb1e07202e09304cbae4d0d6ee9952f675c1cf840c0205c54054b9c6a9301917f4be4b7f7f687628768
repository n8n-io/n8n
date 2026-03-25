'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class;

var _mjmlCore = require('mjml-core');

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var tagName = 'mj-inline-links';
var parentTag = ['mj-column'];
var defaultMJMLDefinition = {
  attributes: {
    'align': 'center',
    'base-url': null,
    'hamburger': null,
    'ico-align': 'center',
    'ico-open': '9776',
    'ico-close': '8855',
    'ico-color': '#000000',
    'ico-font-size': '30px',
    'ico-font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
    'ico-text-transform': 'uppercase',
    'ico-padding': '10px',
    'ico-text-decoration': 'none',
    'ico-line-height': '30px'
  }
};

var baseStyles = {
  div: {
    'width': '100%'
  },
  trigger: {
    display: 'none',
    maxHeight: '0px',
    maxWidth: '0px',
    fontSize: '0px',
    overflow: 'hidden'
  },
  label: {
    display: 'block',
    cursor: 'pointer',
    msoHide: 'all',
    MozUserSelect: 'none',
    userSelect: 'none'
  },
  icoOpen: {
    msoHide: 'all'
  },
  icoClose: {
    display: 'none',
    msoHide: 'all'
  }
};
var postRender = function postRender($) {
  $('.mj-inline-links').each(function () {
    $(this).prepend('<!--[if gte mso 9]>\n          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="' + $(this).data('align') + '">\n            <tr>\n        <![endif]-->').append('<!--[if gte mso 9]>\n            </tr>\n          </table>\n        <![endif]-->').removeAttr('data-align');
  });

  $('.mj-menu-trigger').each(function () {
    var id = $(this).children('label').attr('for');

    $(this).before('<!--[if !mso]><!-->\n          <input type="checkbox" id="' + id + '" class="mj-menu-checkbox" style="display:none !important; max-height:0; visibility:hidden;" />\n        <!--<![endif]-->');
  });

  if ($('.mj-menu-trigger').length) {
    $('head').append('<style type="text/css">\n        noinput.mj-menu-checkbox { display:block!important; max-height:none!important; visibility:visible!important; }\n\n        @media only screen and (max-width:480px) {\n          .mj-menu-checkbox[type="checkbox"] ~ .mj-inline-links { display:none!important; }\n          .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-inline-links,\n          .mj-menu-checkbox[type="checkbox"] ~ .mj-menu-trigger { display:block!important; max-width:none!important; max-height:none!important; font-size:inherit!important; }\n          .mj-menu-checkbox[type="checkbox"] ~ .mj-inline-links > a { display:block!important; }\n          .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-menu-trigger .mj-menu-icon-close { display:block!important; }\n          .mj-menu-checkbox[type="checkbox"]:checked ~ .mj-menu-trigger .mj-menu-icon-open { display:none!important; }\n        }\n      </style>');
  }

  return $;
};

var InlineLinks = (0, _mjmlCore.MJMLElement)(_class = function (_Component) {
  _inherits(InlineLinks, _Component);

  function InlineLinks() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, InlineLinks);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = InlineLinks.__proto__ || Object.getPrototypeOf(InlineLinks)).call.apply(_ref, [this].concat(args))), _this), _this.styles = _this.getStyles(), _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(InlineLinks, [{
    key: 'getStyles',
    value: function getStyles() {
      var _props = this.props,
          mjAttribute = _props.mjAttribute,
          defaultUnit = _props.defaultUnit,
          getPadding = _props.getPadding;


      return _mjmlCore.helpers.merge({}, baseStyles, {
        div: {
          textAlign: mjAttribute('align')
        },
        label: {
          textAlign: mjAttribute('ico-align'),
          color: mjAttribute('ico-color'),
          fontSize: defaultUnit(mjAttribute('ico-font-size'), 'px'),
          fontFamily: mjAttribute('ico-font-family'),
          textTransform: mjAttribute('ico-text-transform'),
          textDecoration: mjAttribute('ico-text-decoration'),
          lineHeight: defaultUnit(mjAttribute('ico-line-height'), 'px'),
          paddingTop: getPadding('top', 'ico-'),
          paddingLeft: getPadding('left', 'ico-'),
          paddingRight: getPadding('right', 'ico-'),
          paddingBottom: getPadding('bottom', 'ico-')
        }
      });
    }
  }, {
    key: 'renderChildren',
    value: function renderChildren() {
      var _props2 = this.props,
          children = _props2.children,
          mjAttribute = _props2.mjAttribute;

      var baseUrl = mjAttribute('base-url');
      var perform = function perform(mjml) {
        if (mjml.get('tagName') === 'mj-link') {
          mjml = mjml.setIn(['attributes', 'href'], _url2.default.resolve(baseUrl, mjml.getIn(['attributes', 'href'])));
        }
        return mjml;
      };

      return children.map(function (child) {
        return _react2.default.cloneElement(child, { mjml: perform(child.props.mjml) });
      });
    }
  }, {
    key: 'renderHamburger',
    value: function renderHamburger() {
      var mjAttribute = this.props.mjAttribute;

      var key = _crypto2.default.randomBytes(8).toString('hex');

      return _react2.default.createElement(
        'div',
        {
          className: 'mj-menu-trigger',
          style: this.styles.trigger },
        _react2.default.createElement(
          'label',
          {
            htmlFor: key,
            className: 'mj-menu-label',
            style: this.styles.label },
          _react2.default.createElement(
            'span',
            {
              className: 'mj-menu-icon-open',
              style: this.styles.icoOpen },
            String.fromCharCode(mjAttribute('ico-open'))
          ),
          _react2.default.createElement(
            'span',
            {
              className: 'mj-menu-icon-close',
              style: this.styles.icoClose },
            String.fromCharCode(mjAttribute('ico-close'))
          )
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var mjAttribute = this.props.mjAttribute;


      return _react2.default.createElement(
        'div',
        null,
        mjAttribute('hamburger') === 'hamburger' ? this.renderHamburger() : null,
        _react2.default.createElement(
          'div',
          {
            className: 'mj-inline-links',
            style: this.styles.div,
            'data-align': mjAttribute('align') },
          this.renderChildren()
        )
      );
    }
  }]);

  return InlineLinks;
}(_react.Component)) || _class;

InlineLinks.tagName = tagName;
InlineLinks.defaultMJMLDefinition = defaultMJMLDefinition;
InlineLinks.baseStyles = baseStyles;
InlineLinks.postRender = postRender;
InlineLinks.parentTag = parentTag;

exports.default = InlineLinks;