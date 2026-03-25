'use strict';

/**
 * Module dependencies.
 */
var cheerio = require('cheerio');
var utils = require('./utils');

var cheerioLoad = function(html, options, encodeEntities) {
  options = Object.assign({decodeEntities: false, _useHtmlParser2:true}, options);
  html = encodeEntities(html);
  return cheerio.load(html, options);
};

var createEntityConverters = function () {
  var codeBlockLookup = [];

  var encodeCodeBlocks = function(html) {
    var blocks = module.exports.codeBlocks;
    Object.keys(blocks).forEach(function(key) {
      var re = new RegExp(blocks[key].start + '([\\S\\s]*?)' + blocks[key].end, 'g');
      html = html.replace(re, function(match, subMatch) {
        codeBlockLookup.push(match);
        return 'JUICE_CODE_BLOCK_' + (codeBlockLookup.length - 1) + '_';
      });
    });
    return html;
  };

  var decodeCodeBlocks = function(html) {
    for(var index = 0; index < codeBlockLookup.length; index++) {
      var re = new RegExp('JUICE_CODE_BLOCK_' + index + '_(="")?', 'gi');
      html = html.replace(re, function() {
        return codeBlockLookup[index];
      });
    }
    return html;
  };

  return {
    encodeEntities: encodeCodeBlocks,
    decodeEntities: decodeCodeBlocks,
  };
};

/**
 * Parses the input, calls the callback on the parsed DOM, and generates the output
 *
 * @param {String} html input html to be processed
 * @param {Object} options for the parser
 * @param {Function} callback to be invoked on the DOM
 * @param {Array} callbackExtraArguments to be passed to the callback
 * @return {String} resulting html
 */
module.exports = function(html, options, callback, callbackExtraArguments) {
  var entityConverters = createEntityConverters();

  var $ = cheerioLoad(html, options, entityConverters.encodeEntities);
  var args = [ $ ];
  args.push.apply(args, callbackExtraArguments);
  var doc = callback.apply(undefined, args) || $;

  if (options && options.xmlMode) {
    return entityConverters.decodeEntities(doc.xml());
  }
  return entityConverters.decodeEntities(doc.html());
};

module.exports.codeBlocks = {
  EJS: { start: '<%', end: '%>' },
  HBS: { start: '{{', end: '}}' }
};
