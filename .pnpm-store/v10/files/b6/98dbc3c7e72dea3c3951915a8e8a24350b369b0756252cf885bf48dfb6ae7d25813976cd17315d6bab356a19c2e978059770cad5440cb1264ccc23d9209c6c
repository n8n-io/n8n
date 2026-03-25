 'use strict';

/**
 * Module dependencies.
 */

var utils = require('./lib/utils');
var packageJson = require('./package.json');
var fs = require('fs');
var path = require('path');
var inline = require('web-resource-inliner');
var juiceClient = require('./client');
var cheerio = require('./lib/cheerio');
var juice = juiceClient;

module.exports = juice;

juice.version = packageJson.version;

juice.Selector = utils.Selector;
juice.Property = utils.Property;
juice.utils = utils;

juice.juiceFile = juiceFile;
juice.juiceResources = juiceResources;
juice.inlineExternal = inlineExternal;

function juiceFile(filePath, options, callback) {
  // set default options
  fs.readFile(filePath, 'utf8', function(err, content) {
    if (err) {
      return callback(err);
    }
    options = utils.getDefaultOptions(options); // so we can mutate options without guilt
    // Optional support for codeBlocks within optionsFile
    if (options.codeBlocks) {
      Object.keys(options.codeBlocks).forEach(function(key) {
        juice.codeBlocks[key] = options.codeBlocks[key];
      });
    }
    if (!options.webResources.relativeTo) {
      var rel = path.dirname(path.relative(process.cwd(),filePath));
      options.webResources.relativeTo = rel;
    }
    juiceResources(content, options, callback);
  });
}

function inlineExternal(html, inlineOptions, callback) {
  var options = Object.assign({fileContent: html}, inlineOptions);
  inline.html(options, callback);
}

function juiceResources(html, options, callback) {
  options = utils.getDefaultOptions(options);

  var onInline = function(err, html) {
    if (err) {
      return callback(err);
    }

    return callback(null,
      cheerio(html, { xmlMode: options && options.xmlMode}, juiceClient.juiceDocument, [options])
    );
  };

  options.webResources.relativeTo = options.webResources.relativeTo || options.url; // legacy support
  inlineExternal(html, options.webResources, onInline);
}
