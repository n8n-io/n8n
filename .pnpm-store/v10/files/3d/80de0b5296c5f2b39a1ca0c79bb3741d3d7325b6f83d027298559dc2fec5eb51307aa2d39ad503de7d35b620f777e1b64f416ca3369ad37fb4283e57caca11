'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _MJMLElementsCollection = require('../MJMLElementsCollection');

var _MJMLElementsCollection2 = _interopRequireDefault(_MJMLElementsCollection);

var _MJMLHead = require('../MJMLHead');

var _MJMLHead2 = _interopRequireDefault(_MJMLHead);

var _Error = require('../Error');

var _compact = require('lodash/compact');

var _compact2 = _interopRequireDefault(_compact);

var _concat = require('lodash/concat');

var _concat2 = _interopRequireDefault(_concat);

var _dom = require('../helpers/dom');

var _dom2 = _interopRequireDefault(_dom);

var _filter = require('lodash/filter');

var _filter2 = _interopRequireDefault(_filter);

var _forEach = require('lodash/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _includes = require('lodash/includes');

var _includes2 = _interopRequireDefault(_includes);

var _map = require('lodash/map');

var _map2 = _interopRequireDefault(_map);

var _mapValues = require('lodash/mapValues');

var _mapValues2 = _interopRequireDefault(_mapValues);

var _parseAttributes = require('../helpers/parseAttributes');

var _parseAttributes2 = _interopRequireDefault(_parseAttributes);

var _removeCDATA = require('../helpers/removeCDATA');

var _removeCDATA2 = _interopRequireDefault(_removeCDATA);

var _toArray = require('lodash/toArray');

var _toArray2 = _interopRequireDefault(_toArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var regexTag = function regexTag(tag) {
  return new RegExp('<' + tag + '([^>/]*)>([^]*?)</' + tag + '>', 'gmi');
};
var WHITELISTED_GLOBAL_TAG = ['mj-class', 'mj-all'];

/**
 * Avoid htmlparser to parse ending tags
 */
var safeEndingTags = function safeEndingTags(content) {
  var MJElements = [].concat(WHITELISTED_GLOBAL_TAG);

  (0, _forEach2.default)(_extends({}, _MJMLElementsCollection2.default, _MJMLHead2.default), function (element, name) {
    var tagName = element.tagName || name;

    MJElements.push(tagName);
  });

  var safeContent = (0, _parseAttributes2.default)(MJElements, content.replace(/\$/g, '&#36;'));

  (0, _concat2.default)(_MJMLElementsCollection.endingTags, _MJMLHead.endingTags).forEach(function (tag) {
    safeContent = safeContent.replace(regexTag(tag), _dom2.default.replaceContentByCdata(tag));
  });

  return safeContent;
};

/**
 * converts MJML body into a JSON representation
 */
var mjmlElementParser = function mjmlElementParser(elem, content) {
  if (!elem) {
    throw new _Error.NullElementError('Null element found in mjmlElementParser');
  }

  var findLine = content.substr(0, elem.startIndex).match(/\n/g);
  var lineNumber = findLine ? findLine.length + 1 : 1;
  var tagName = elem.tagName.toLowerCase();
  var attributes = (0, _mapValues2.default)(_dom2.default.getAttributes(elem), function (val) {
    return decodeURIComponent(val);
  });

  var element = { tagName: tagName, attributes: attributes, lineNumber: lineNumber };

  if (_MJMLElementsCollection.endingTags.indexOf(tagName) !== -1) {
    var $local = _dom2.default.parseXML(elem);
    element.content = (0, _removeCDATA2.default)($local(tagName).html().trim());
  } else {
    var children = _dom2.default.getChildren(elem);
    element.children = children ? (0, _compact2.default)((0, _filter2.default)(children, function (child) {
      return child.tagName;
    }).map(function (child) {
      return mjmlElementParser(child, content);
    })) : [];
  }

  return element;
};

var parseHead = function parseHead(head) {
  return (0, _map2.default)((0, _compact2.default)((0, _filter2.default)(_dom2.default.getChildren(head), function (child) {
    return child.tagName;
  })), function (el) {
    var $local = _dom2.default.parseXML(el);

    var parseElement = function parseElement(elem) {
      var endingTag = (0, _includes2.default)(_MJMLHead.endingTags, elem.tagName.toLowerCase());

      return {
        attributes: (0, _mapValues2.default)(_dom2.default.getAttributes(elem), function (val) {
          return decodeURIComponent(val);
        }),
        children: endingTag ? null : (0, _compact2.default)((0, _filter2.default)((0, _toArray2.default)(elem.childNodes), function (child) {
          return child.tagName;
        })).map(parseElement),
        content: endingTag ? (0, _removeCDATA2.default)($local(elem.tagName.toLowerCase()).html().trim()) : null,
        tagName: elem.tagName.toLowerCase()
      };
    };

    return parseElement(el);
  });
};

/**
 * Import an html document containing some mjml
 * returns JSON
 *   - container: the mjml container
 *   - mjml: a json representation of the mjml
 */
var documentParser = function documentParser(content) {
  var safeContent = safeEndingTags(content);

  var body = void 0;
  var head = void 0;

  try {
    var $ = _dom2.default.parseXML(safeContent);

    body = $('mjml > mj-body');
    head = $('mjml > mj-head');

    if (body.length > 0) {
      body = body.children().get(0);
    }
  } catch (e) {
    throw new _Error.ParseError('Error while parsing the file');
  }

  if (!body || body.length < 1) {
    throw new _Error.EmptyMJMLError('No root "<mjml>" or "<mj-body>" found in the file, or "<mj-body>" doesn\'t contain a child element.');
  }

  return {
    tagName: 'mjml',
    children: [{
      tagName: 'mj-head',
      children: head && head.length > 0 ? parseHead(head.get(0)) : []
    }, {
      tagName: 'mj-body',
      children: [mjmlElementParser(body, safeContent)]
    }]
  };
};

exports.default = documentParser;