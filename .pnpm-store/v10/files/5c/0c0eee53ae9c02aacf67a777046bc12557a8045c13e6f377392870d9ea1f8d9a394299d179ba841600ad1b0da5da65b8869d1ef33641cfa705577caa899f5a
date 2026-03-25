'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _isBrowser = require('./isBrowser');

var _isBrowser2 = _interopRequireDefault(_isBrowser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var dom = {};

if ((0, _isBrowser2.default)()) {
  var jquery = require('jquery');

  var parseMarkup = function parseMarkup(str) {
    var context = jquery(str);

    return function (selector) {
      if (!selector) {
        return jquery(context);
      }

      return jquery(selector, context);
    };
  };

  dom.parseHTML = function (str) {
    var parser = new DOMParser();

    return parseMarkup(parser.parseFromString(str, 'text/html'));
  };

  dom.parseXML = function (str) {
    if (typeof str !== 'string') {
      str = str.outerHTML;
    }

    return parseMarkup(jquery.parseXML('<root>' + str + '</root>'));
  };

  dom.getAttributes = function (element) {
    var attributes = {};

    Array.prototype.slice.call(element.attributes).forEach(function (attribute) {
      return attributes[attribute.name] = attribute.value;
    });

    return attributes;
  };

  dom.getChildren = function (element) {
    return element.children;
  };

  dom.replaceContentByCdata = function (tag) {
    return '<' + tag + '$1><!--[CDATA[$2]]--></' + tag + '>';
  };

  dom.getHTML = function ($) {
    var markup = $()[0];

    return '<!doctype ' + markup.doctype.name + '>' + markup.documentElement.outerHTML;
  };
} else {
  var cheerio = require('cheerio');

  var $ = cheerio.load('', { decodeEntities: false });

  var _parseMarkup = function _parseMarkup(str, options) {
    $ = $.load(str, options);

    return function (selector) {
      if (!selector) {
        return $;
      }

      return $(selector);
    };
  };

  dom.parseHTML = function (str) {
    return _parseMarkup(str, { xmlMode: false, decodeEntities: false });
  };

  dom.parseXML = function (str) {
    return _parseMarkup(str, { xmlMode: true, decodeEntities: false, withStartIndices: true });
  };

  dom.getAttributes = function (element) {
    return element.attribs || {};
  };

  dom.getChildren = function (element) {
    return element.childNodes;
  };

  dom.replaceContentByCdata = function (tag) {
    return '<' + tag + '$1><![CDATA[$2]]></' + tag + '>';
  };

  dom.getHTML = function ($) {
    return $().html();
  };
}

exports.default = dom;