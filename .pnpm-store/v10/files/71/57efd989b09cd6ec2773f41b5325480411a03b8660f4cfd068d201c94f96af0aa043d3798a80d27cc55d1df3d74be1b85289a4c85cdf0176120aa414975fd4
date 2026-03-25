var fs = require('fs');
var path = require('path');

var isAllowedResource = require('./is-allowed-resource');
var matchDataUri = require('./match-data-uri');
var rebaseLocalMap = require('./rebase-local-map');
var rebaseRemoteMap = require('./rebase-remote-map');

var Token = require('../tokenizer/token');
var hasProtocol = require('../utils/has-protocol');
var isDataUriResource = require('../utils/is-data-uri-resource');
var isRemoteResource = require('../utils/is-remote-resource');

var MAP_MARKER_PATTERN = /^\/\*# sourceMappingURL=(\S+) \*\/$/;

function applySourceMaps(tokens, context, callback) {
  var applyContext = {
    callback: callback,
    fetch: context.options.fetch,
    index: 0,
    inline: context.options.inline,
    inlineRequest: context.options.inlineRequest,
    inlineTimeout: context.options.inlineTimeout,
    inputSourceMapTracker: context.inputSourceMapTracker,
    localOnly: context.localOnly,
    processedTokens: [],
    rebaseTo: context.options.rebaseTo,
    sourceTokens: tokens,
    warnings: context.warnings
  };

  return context.options.sourceMap && tokens.length > 0 ?
    doApplySourceMaps(applyContext) :
    callback(tokens);
}

function doApplySourceMaps(applyContext) {
  var singleSourceTokens = [];
  var lastSource = findTokenSource(applyContext.sourceTokens[0]);
  var source;
  var token;
  var l;

  for (l = applyContext.sourceTokens.length; applyContext.index < l; applyContext.index++) {
    token = applyContext.sourceTokens[applyContext.index];
    source = findTokenSource(token);

    if (source != lastSource) {
      singleSourceTokens = [];
      lastSource = source;
    }

    singleSourceTokens.push(token);
    applyContext.processedTokens.push(token);

    if (token[0] == Token.COMMENT && MAP_MARKER_PATTERN.test(token[1])) {
      return fetchAndApplySourceMap(token[1], source, singleSourceTokens, applyContext);
    }
  }

  return applyContext.callback(applyContext.processedTokens);
}

function findTokenSource(token) {
  var scope;
  var metadata;

  if (token[0] == Token.AT_RULE || token[0] == Token.COMMENT) {
    metadata = token[2][0];
  } else {
    scope = token[1][0];
    metadata = scope[2][0];
  }

  return metadata[2];
}

function fetchAndApplySourceMap(sourceMapComment, source, singleSourceTokens, applyContext) {
  return extractInputSourceMapFrom(sourceMapComment, applyContext, function (inputSourceMap) {
    if (inputSourceMap) {
      applyContext.inputSourceMapTracker.track(source, inputSourceMap);
      applySourceMapRecursively(singleSourceTokens, applyContext.inputSourceMapTracker);
    }

    applyContext.index++;
    return doApplySourceMaps(applyContext);
  });
}

function extractInputSourceMapFrom(sourceMapComment, applyContext, whenSourceMapReady) {
  var uri = MAP_MARKER_PATTERN.exec(sourceMapComment)[1];
  var absoluteUri;
  var sourceMap;
  var rebasedMap;

  if (isDataUriResource(uri)) {
    sourceMap = extractInputSourceMapFromDataUri(uri);
    return whenSourceMapReady(sourceMap);
  } else if (isRemoteResource(uri)) {
    return loadInputSourceMapFromRemoteUri(uri, applyContext, function (sourceMap) {
      var parsedMap;

      if (sourceMap) {
        parsedMap = JSON.parse(sourceMap);
        rebasedMap = rebaseRemoteMap(parsedMap, uri);
        whenSourceMapReady(rebasedMap);
      } else {
        whenSourceMapReady(null);
      }
    });
  } else {
    // at this point `uri` is already rebased, see lib/reader/rebase.js#rebaseSourceMapComment
    // it is rebased to be consistent with rebasing other URIs
    // however here we need to resolve it back to read it from disk
    absoluteUri = path.resolve(applyContext.rebaseTo, uri);
    sourceMap = loadInputSourceMapFromLocalUri(absoluteUri, applyContext);

    if (sourceMap) {
      rebasedMap = rebaseLocalMap(sourceMap, absoluteUri, applyContext.rebaseTo);
      return whenSourceMapReady(rebasedMap);
    } else {
      return whenSourceMapReady(null);
    }
  }
}

function extractInputSourceMapFromDataUri(uri) {
  var dataUriMatch = matchDataUri(uri);
  var charset = dataUriMatch[2] ? dataUriMatch[2].split(/[=;]/)[2] : 'us-ascii';
  var encoding = dataUriMatch[3] ? dataUriMatch[3].split(';')[1] : 'utf8';
  var data = encoding == 'utf8' ? global.unescape(dataUriMatch[4]) : dataUriMatch[4];

  var buffer = new Buffer(data, encoding);
  buffer.charset = charset;

  return JSON.parse(buffer.toString());
}

function loadInputSourceMapFromRemoteUri(uri, applyContext, whenLoaded) {
  var isAllowed = isAllowedResource(uri, true, applyContext.inline);
  var isRuntimeResource = !hasProtocol(uri);

  if (applyContext.localOnly) {
    applyContext.warnings.push('Cannot fetch remote resource from "' + uri + '" as no callback given.');
    return whenLoaded(null);
  } else if (isRuntimeResource) {
    applyContext.warnings.push('Cannot fetch "' + uri + '" as no protocol given.');
    return whenLoaded(null);
  } else if (!isAllowed) {
    applyContext.warnings.push('Cannot fetch "' + uri + '" as resource is not allowed.');
    return whenLoaded(null);
  }

  applyContext.fetch(uri, applyContext.inlineRequest, applyContext.inlineTimeout, function (error, body) {
    if (error) {
      applyContext.warnings.push('Missing source map at "' + uri + '" - ' + error);
      return whenLoaded(null);
    }

    whenLoaded(body);
  });
}

function loadInputSourceMapFromLocalUri(uri, applyContext) {
  var isAllowed = isAllowedResource(uri, false, applyContext.inline);
  var sourceMap;

  if (!fs.existsSync(uri) || !fs.statSync(uri).isFile()) {
    applyContext.warnings.push('Ignoring local source map at "' + uri + '" as resource is missing.');
    return null;
  } else if (!isAllowed) {
    applyContext.warnings.push('Cannot fetch "' + uri + '" as resource is not allowed.');
    return null;
  }

  sourceMap = fs.readFileSync(uri, 'utf-8');
  return JSON.parse(sourceMap);
}

function applySourceMapRecursively(tokens, inputSourceMapTracker) {
  var token;
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];

    switch (token[0]) {
      case Token.AT_RULE:
        applySourceMapTo(token, inputSourceMapTracker);
        break;
      case Token.AT_RULE_BLOCK:
        applySourceMapRecursively(token[1], inputSourceMapTracker);
        applySourceMapRecursively(token[2], inputSourceMapTracker);
        break;
      case Token.AT_RULE_BLOCK_SCOPE:
        applySourceMapTo(token, inputSourceMapTracker);
        break;
      case Token.NESTED_BLOCK:
        applySourceMapRecursively(token[1], inputSourceMapTracker);
        applySourceMapRecursively(token[2], inputSourceMapTracker);
        break;
      case Token.NESTED_BLOCK_SCOPE:
        applySourceMapTo(token, inputSourceMapTracker);
        break;
      case Token.COMMENT:
        applySourceMapTo(token, inputSourceMapTracker);
        break;
      case Token.PROPERTY:
        applySourceMapRecursively(token, inputSourceMapTracker);
        break;
      case Token.PROPERTY_BLOCK:
        applySourceMapRecursively(token[1], inputSourceMapTracker);
        break;
      case Token.PROPERTY_NAME:
        applySourceMapTo(token, inputSourceMapTracker);
        break;
      case Token.PROPERTY_VALUE:
        applySourceMapTo(token, inputSourceMapTracker);
        break;
      case Token.RULE:
        applySourceMapRecursively(token[1], inputSourceMapTracker);
        applySourceMapRecursively(token[2], inputSourceMapTracker);
        break;
      case Token.RULE_SCOPE:
        applySourceMapTo(token, inputSourceMapTracker);
    }
  }

  return tokens;
}

function applySourceMapTo(token, inputSourceMapTracker) {
  var value = token[1];
  var metadata = token[2];
  var newMetadata = [];
  var i, l;

  for (i = 0, l = metadata.length; i < l; i++) {
    newMetadata.push(inputSourceMapTracker.originalPositionFor(metadata[i], value.length));
  }

  token[2] = newMetadata;
}

module.exports = applySourceMaps;
