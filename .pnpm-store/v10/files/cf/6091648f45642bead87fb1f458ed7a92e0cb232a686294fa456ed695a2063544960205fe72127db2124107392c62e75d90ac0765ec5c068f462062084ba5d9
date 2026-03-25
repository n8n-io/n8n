'use strict';

var cheerio = require('./lib/cheerio');
var makeJuiceClient = require('./lib/inline');

/**
 * Note that makeJuiceClient will take a base object (in this case a function) and enhance it
 * with a lot of useful properties and functions.
 *
 * This client adopts cheerio as a DOM parser and adds an "inlineContent" function that let
 * users to specify the CSS to be inlined instead of extracting it from the html.
 * 
 * The weird "makeJuiceClient" behaviour is there in order to keep backward API compatibility.
 */
var juiceClient = makeJuiceClient(function(html,options) {
  return cheerio(html, { xmlMode: options && options.xmlMode}, juiceDocument, [options]);
});

var juiceDocument = function(html, options) {
  return juiceClient.juiceDocument(html, options);
}

juiceClient.inlineContent = function(html, css, options) {
  return cheerio(html, { xmlMode: options && options.xmlMode}, juiceClient.inlineDocument, [css, options]);
};

juiceClient.codeBlocks = cheerio.codeBlocks;

module.exports = juiceClient;
