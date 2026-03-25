"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = skeleton;
var _isNil2 = _interopRequireDefault(require("lodash/isNil"));
var _negate2 = _interopRequireDefault(require("lodash/negate"));
var _preview = _interopRequireDefault(require("./preview"));
var _fonts = require("./fonts");
var _mediaQueries = _interopRequireDefault(require("./mediaQueries"));
var _styles = require("./styles");
function skeleton(options) {
  const {
    backgroundColor = '',
    beforeDoctype = '',
    breakpoint = '480px',
    content = '',
    fonts = {},
    mediaQueries = {},
    headStyle = {},
    componentsHeadStyle = [],
    headRaw = [],
    preview,
    title = '',
    style = [],
    forceOWADesktop,
    printerSupport,
    inlineStyle,
    lang,
    dir
  } = options;
  return `${beforeDoctype ? `${beforeDoctype}\n` : ''}<!doctype html>
<html lang="${lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <title>${title}</title>
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <!--[if lte mso 11]>
    <style type="text/css">
      .mj-outlook-group-fix { width:100% !important; }
    </style>
    <![endif]-->
    ${(0, _fonts.buildFontsTags)(content, inlineStyle, fonts)}
    ${(0, _mediaQueries.default)(breakpoint, mediaQueries, {
    forceOWADesktop,
    printerSupport
  })}
    ${(0, _styles.buildStyleFromComponents)(breakpoint, componentsHeadStyle, headStyle)}
    ${(0, _styles.buildStyleFromTags)(breakpoint, style)}
    ${headRaw.filter((0, _negate2.default)(_isNil2.default)).join('\n')}
  </head>
  <body style="word-spacing:normal;${backgroundColor ? `background-color:${backgroundColor};` : ''}">
    ${(0, _preview.default)(preview)}
    ${content}
  </body>
</html>
  `;
}
module.exports = exports.default;