'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addCDATASection;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var regexTag = function regexTag(tag) {
  return new RegExp('<' + tag + '((?: (?:(?:"[^"]*?")*(?:\'[^\']*?\')*[^/>\'"]*?)*?)|)>([^]*?)</' + tag + '>', 'gmi');
};
var replaceTag = function replaceTag(tag) {
  return '<' + tag + '$1><![CDATA[$2]]></' + tag + '>';
};

function addCDATASection() {
  var CDATASections = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var content = arguments[1];

  _lodash2.default.forEach(CDATASections, function (tag) {
    content = content.replace(regexTag(tag), replaceTag(tag));
  });

  return content;
}
module.exports = exports['default'];