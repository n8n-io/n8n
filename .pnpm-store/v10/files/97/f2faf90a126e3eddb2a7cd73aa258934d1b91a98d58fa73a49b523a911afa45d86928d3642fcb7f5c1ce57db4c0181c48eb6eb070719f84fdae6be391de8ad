'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dom = require('../helpers/dom');

var _dom2 = _interopRequireDefault(_dom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildTags = function buildTags($, toImport) {
  if (!toImport.length) {
    return;
  }

  $('head').append('\n<!--[if !mso]><!-->\n    ' + toImport.map(function (url) {
    return '<link href="' + url + '" rel="stylesheet" type="text/css">';
  }).join('\n') + '\n    <style type="text/css">\n\n      ' + toImport.map(function (url) {
    return '  @import url(' + url + ');';
  }).join('\n') + '\n\n    </style>\n  <!--<![endif]-->');
};

exports.default = function () {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var fonts = options.fonts,
      $ = options.$;

  var content = _dom2.default.getHTML($);

  var toImport = [];

  fonts.forEach(function (font) {
    var name = font.name,
        url = font.url;

    var regex = new RegExp('"[^"]*font-family:[^"]*' + name + '[^"]*"');

    if (content.match(regex)) {
      toImport.push(url);
    }
  });

  return buildTags($, toImport);
};