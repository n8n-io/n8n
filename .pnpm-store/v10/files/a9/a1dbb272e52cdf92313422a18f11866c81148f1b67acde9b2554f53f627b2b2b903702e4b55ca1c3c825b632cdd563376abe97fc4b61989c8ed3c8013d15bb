'use strict';
/** Cheerio default options. */
exports.default = {
  xml: false,
  decodeEntities: true,
};

var xmlModeDefault = { _useHtmlParser2: true, xmlMode: true };

exports.flatten = function (options) {
  return options && options.xml
    ? typeof options.xml === 'boolean'
      ? xmlModeDefault
      : Object.assign({}, xmlModeDefault, options.xml)
    : options;
};
