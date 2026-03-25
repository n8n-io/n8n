"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildFontsTags = buildFontsTags;
var _map2 = _interopRequireDefault(require("lodash/map"));
var _forEach2 = _interopRequireDefault(require("lodash/forEach"));
// eslint-disable-next-line import/prefer-default-export
function buildFontsTags(content, inlineStyle, fonts = {}) {
  const toImport = [];
  (0, _forEach2.default)(fonts, (url, name) => {
    const regex = new RegExp(`"[^"]*font-family:[^"]*${name}[^"]*"`, 'gmi');
    const inlineRegex = new RegExp(`font-family:[^;}]*${name}`, 'gmi');
    if (content.match(regex) || inlineStyle.some(s => s.match(inlineRegex))) {
      toImport.push(url);
    }
  });
  if (toImport.length > 0) {
    return `
      <!--[if !mso]><!-->
        ${(0, _map2.default)(toImport, url => `<link href="${url}" rel="stylesheet" type="text/css">`).join('\n')}
        <style type="text/css">
          ${(0, _map2.default)(toImport, url => `@import url(${url});`).join('\n')}
        </style>
      <!--<![endif]-->\n
    `;
  }
  return '';
}