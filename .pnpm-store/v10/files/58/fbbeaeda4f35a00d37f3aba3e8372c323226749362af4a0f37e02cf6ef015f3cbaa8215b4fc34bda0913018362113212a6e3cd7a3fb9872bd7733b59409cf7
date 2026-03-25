var path = require('path');
var url = require('url');

var DOUBLE_QUOTE = '"';
var SINGLE_QUOTE = '\'';
var URL_PREFIX = 'url(';
var URL_SUFFIX = ')';

var QUOTE_PREFIX_PATTERN = /^["']/;
var QUOTE_SUFFIX_PATTERN = /["']$/;
var ROUND_BRACKETS_PATTERN = /[\(\)]/;
var URL_PREFIX_PATTERN = /^url\(/i;
var URL_SUFFIX_PATTERN = /\)$/;
var WHITESPACE_PATTERN = /\s/;

var isWindows = process.platform == 'win32';

function rebase(uri, rebaseConfig) {
  if (!rebaseConfig) {
    return uri;
  }

  if (isAbsolute(uri) && !isRemote(rebaseConfig.toBase)) {
    return uri;
  }

  if (isRemote(uri) || isSVGMarker(uri) || isInternal(uri)) {
    return uri;
  }

  if (isData(uri)) {
    return '\'' + uri + '\'';
  }

  if (isRemote(rebaseConfig.toBase)) {
    return url.resolve(rebaseConfig.toBase, uri);
  }

  return rebaseConfig.absolute ?
    normalize(absolute(uri, rebaseConfig)) :
    normalize(relative(uri, rebaseConfig));
}

function isAbsolute(uri) {
  return path.isAbsolute(uri);
}

function isSVGMarker(uri) {
  return uri[0] == '#';
}

function isInternal(uri) {
  return /^\w+:\w+/.test(uri);
}

function isRemote(uri) {
  return /^[^:]+?:\/\//.test(uri) || uri.indexOf('//') === 0;
}

function isData(uri) {
  return uri.indexOf('data:') === 0;
}

function absolute(uri, rebaseConfig) {
  return path
    .resolve(path.join(rebaseConfig.fromBase || '', uri))
    .replace(rebaseConfig.toBase, '');
}

function relative(uri, rebaseConfig) {
  return path.relative(rebaseConfig.toBase, path.join(rebaseConfig.fromBase || '', uri));
}

function normalize(uri) {
  return isWindows ? uri.replace(/\\/g, '/') : uri;
}

function quoteFor(unquotedUrl) {
  if (unquotedUrl.indexOf(SINGLE_QUOTE) > -1) {
    return DOUBLE_QUOTE;
  } else if (unquotedUrl.indexOf(DOUBLE_QUOTE) > -1) {
    return SINGLE_QUOTE;
  } else if (hasWhitespace(unquotedUrl) || hasRoundBrackets(unquotedUrl)) {
    return SINGLE_QUOTE;
  } else {
    return '';
  }
}

function hasWhitespace(url) {
  return WHITESPACE_PATTERN.test(url);
}

function hasRoundBrackets(url) {
  return ROUND_BRACKETS_PATTERN.test(url);
}

function rewriteUrl(originalUrl, rebaseConfig, pathOnly) {
  var strippedUrl = originalUrl
    .replace(URL_PREFIX_PATTERN, '')
    .replace(URL_SUFFIX_PATTERN, '')
    .trim();

  var unquotedUrl = strippedUrl
    .replace(QUOTE_PREFIX_PATTERN, '')
    .replace(QUOTE_SUFFIX_PATTERN, '')
    .trim();

  var quote = strippedUrl[0] == SINGLE_QUOTE || strippedUrl[0] == DOUBLE_QUOTE ?
    strippedUrl[0] :
    quoteFor(unquotedUrl);

  return pathOnly ?
    rebase(unquotedUrl, rebaseConfig) :
    URL_PREFIX + quote + rebase(unquotedUrl, rebaseConfig) + quote + URL_SUFFIX;
}

module.exports = rewriteUrl;
