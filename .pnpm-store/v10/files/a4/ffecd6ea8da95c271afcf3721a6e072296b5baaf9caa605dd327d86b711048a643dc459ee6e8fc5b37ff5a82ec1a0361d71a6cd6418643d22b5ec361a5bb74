'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Error = require('./Error');

var _postRender = require('./helpers/postRender');

var _mjml = require('./helpers/mjml');

var _cloneDeep = require('lodash/cloneDeep');

var _cloneDeep2 = _interopRequireDefault(_cloneDeep);

var _config = require('./parsers/config');

var _config2 = _interopRequireDefault(_config);

var _curryRight = require('lodash/curryRight');

var _curryRight2 = _interopRequireDefault(_curryRight);

var _each = require('lodash/each');

var _each2 = _interopRequireDefault(_each);

var _find = require('lodash/find');

var _find2 = _interopRequireDefault(_find);

var _document = require('./parsers/document');

var _document2 = _interopRequireDefault(_document);

var _defaults = require('lodash/defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _defaultContainer = require('./configs/defaultContainer');

var _defaultContainer2 = _interopRequireDefault(_defaultContainer);

var _listFontsImports = require('./configs/listFontsImports');

var _listFontsImports2 = _interopRequireDefault(_listFontsImports);

var _dom = require('./helpers/dom');

var _dom2 = _interopRequireDefault(_dom);

var _he = require('he');

var _he2 = _interopRequireDefault(_he);

var _importFonts = require('./helpers/importFonts');

var _importFonts2 = _interopRequireDefault(_importFonts);

var _includeExternal = require('./includeExternal');

var _includeExternal2 = _interopRequireDefault(_includeExternal);

var _jsBeautify = require('js-beautify');

var _mjmlValidator = require('mjml-validator');

var _mjmlValidator2 = _interopRequireDefault(_mjmlValidator);

var _MJMLElementsCollection = require('./MJMLElementsCollection');

var _MJMLElementsCollection2 = _interopRequireDefault(_MJMLElementsCollection);

var _MJMLHead = require('./MJMLHead');

var _MJMLHead2 = _interopRequireDefault(_MJMLHead);

var _isBrowser = require('./helpers/isBrowser');

var _isBrowser2 = _interopRequireDefault(_isBrowser);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _server = require('react-dom/server');

var _server2 = _interopRequireDefault(_server);

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DANGEROUS_CHARS = ['{{', '}}', '<%', '%>', '<=', '=>', '<- ', ' ->', '{%', '%}', '{{{', '}}}'];
var SEED = Math.floor(Math.random() * 0x10000000000).toString(16);
var PLACEHOLDER = '__MJML__' + SEED + '__';
var mjmlSanitizer = function mjmlSanitizer(mjml) {
  if (mjml.children && mjml.children) {
    (0, _each2.default)(mjml.children, mjmlSanitizer);
  }

  if (mjml.content) {
    mjml.content = sanitizer(mjml.content);
  }
};

var sanitizer = function sanitizer(text) {
  return DANGEROUS_CHARS.reduce(function (content, char, index) {
    return content.replace(new RegExp(char, 'g'), '' + PLACEHOLDER + index);
  }, text);
};
var restore = function restore(text) {
  return DANGEROUS_CHARS.reduce(function (content, char, index) {
    return content.replace(new RegExp('' + PLACEHOLDER + index, 'g'), char);
  }, text);
};

var getMJBody = function getMJBody(root) {
  return (0, _find2.default)(root.children, ['tagName', 'mj-body']);
};
var getMJHead = function getMJHead(root) {
  return (0, _find2.default)(root.children, ['tagName', 'mj-head']);
};

var minifyHTML = function minifyHTML(htmlDocument) {
  var _require = require('html-minifier'),
      minify = _require.minify;

  return minify(htmlDocument, { collapseWhitespace: true, removeEmptyAttributes: true, minifyCSS: true });
};
var beautifyHTML = function beautifyHTML(htmlDocument) {
  return (0, _jsBeautify.html)(htmlDocument, { indent_size: 2, wrap_attributes_indent_size: 2 });
};
var inlineExternal = function inlineExternal(htmlDocument, css) {
  if (!css || css.length == 0) {
    return htmlDocument;
  }

  var juice = require('juice');

  return juice(htmlDocument, { extraCss: css.join('\n'), removeStyleTags: false, applyStyleTags: false, insertPreservedExtraCss: false });
};

var MJMLRenderer = function () {
  function MJMLRenderer(content) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, MJMLRenderer);

    if (!(0, _isBrowser2.default)()) {
      (0, _config2.default)(options);
    }

    this.attributes = {
      container: (0, _defaultContainer2.default)(),
      defaultAttributes: {},
      cssClasses: {},
      css: [],
      inlineCSS: [],
      fonts: (0, _cloneDeep2.default)(_listFontsImports2.default)
    };

    this.content = content;
    this.options = (0, _defaults2.default)(options, { level: "soft", disableMjStyle: false, disableMjInclude: false, disableMinify: false });

    if (typeof this.content === 'string') {
      this.parseDocument();
    }
  }

  _createClass(MJMLRenderer, [{
    key: 'parseDocument',
    value: function parseDocument() {
      if (!this.options.disableMjInclude) {
        this.content = (0, _includeExternal2.default)(this.content, this.options);
      }

      this.content = (0, _document2.default)(this.content);
    }
  }, {
    key: 'validate',
    value: function validate(root) {
      if (this.options.level == "skip") {
        this.errors = [];
        return;
      }

      this.errors = (0, _mjmlValidator2.default)(root);

      if (this.options.level == "strict" && this.errors.length > 0) {
        throw new _Error.MJMLValidationError(this.errors);
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this = this;

      if (!this.content || !getMJBody(this.content)) {
        throw new _Error.EmptyMJMLError('.render: No MJML to render in options ' + this.options.toString());
      }

      mjmlSanitizer(this.content);

      var body = getMJBody(this.content);
      var head = getMJHead(this.content);

      if (head && head.children.length > 0) {
        (0, _each2.default)(head.children, function (headElement) {
          var handlerName = headElement.tagName;
          var handler = _MJMLHead2.default[handlerName];

          if (handler) {
            handler(headElement, _this.attributes);
          } else {
            (0, _warning2.default)(false, 'No handler found for: ' + handlerName + ', in mj-head, skipping it');
          }
        });
      }

      var rootElement = body.children[0];

      this.validate(rootElement);

      var rootComponent = _MJMLElementsCollection2.default[rootElement.tagName];

      if (!rootComponent) {
        return { errors: this.errors };
      }

      var rootElemComponent = _react2.default.createElement(rootComponent, { mjml: (0, _mjml.parseInstance)(rootElement, this.attributes) });
      var renderedMJML = _server2.default.renderToStaticMarkup(rootElemComponent);

      var MJMLDocument = this.attributes.container.replace('__content__', renderedMJML || '').replace('__title__', this.attributes.title || '').replace('__preview__', this.attributes.preview || '');

      return { errors: this.errors, html: this.postRender(MJMLDocument) };
    }
  }, {
    key: 'postRender',
    value: function postRender(MJMLDocument) {
      var externalCSS = this.attributes.inlineCSS;

      var $ = _dom2.default.parseHTML(MJMLDocument);

      (0, _importFonts2.default)({ $: $, fonts: this.attributes.fonts });

      $ = (0, _postRender.fixLegacyAttrs)($);
      $ = (0, _postRender.insertHeadCSS)($, this.attributes.css);

      _MJMLElementsCollection.postRenders.forEach(function (postRender) {
        if (typeof postRender === 'function') {
          $ = postRender($);
        }
      });

      return [!this.options.disableMjStyle ? (0, _curryRight2.default)(inlineExternal)(externalCSS) : undefined, this.options.beautify ? beautifyHTML : undefined, !this.options.disableMinify && this.options.minify ? minifyHTML : undefined, _he2.default.decode, restore].filter(function (element) {
        return typeof element == 'function';
      }).reduce(function (res, fun) {
        return fun(res);
      }, _dom2.default.getHTML($));
    }
  }]);

  return MJMLRenderer;
}();

exports.default = MJMLRenderer;