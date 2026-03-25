'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseAttributes;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var regexTag = function regexTag(tag) {
  return new RegExp('<' + tag + '(\\s("[^"]*"|\'[^\']*\'|[^\'">])*)?>', 'gmi');
};
var regexAttributes = /(\S+)\s*?=\s*([\'"])(.*?|)\2/gmi;

function parseAttributes(MJElements, content) {
  _lodash2.default.forEach(MJElements, function (tag) {
    content = content.replace(regexTag(tag), function (contentTag) {
      return contentTag.replace(regexAttributes, function (match, attr, around, value) {
        return attr + '=' + around + encodeURIComponent(value) + around;
      });
    });
  });

  return content;
}