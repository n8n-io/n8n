var fs = require('fs');
var path = require('path');

var applySourceMaps = require('./apply-source-maps');
var extractImportUrlAndMedia = require('./extract-import-url-and-media');
var isAllowedResource = require('./is-allowed-resource');
var loadOriginalSources = require('./load-original-sources');
var normalizePath = require('./normalize-path');
var rebase = require('./rebase');
var rebaseLocalMap = require('./rebase-local-map');
var rebaseRemoteMap = require('./rebase-remote-map');
var restoreImport = require('./restore-import');

var tokenize = require('../tokenizer/tokenize');
var Token = require('../tokenizer/token');
var Marker = require('../tokenizer/marker');
var hasProtocol = require('../utils/has-protocol');
var isImport = require('../utils/is-import');
var isRemoteResource = require('../utils/is-remote-resource');

var UNKNOWN_URI = 'uri:unknown';

function readSources(input, context, callback) {
  return doReadSources(input, context, function (tokens) {
    return applySourceMaps(tokens, context, function () {
      return loadOriginalSources(context, function () { return callback(tokens); });
    });
  });
}

function doReadSources(input, context, callback) {
  if (typeof input == 'string') {
    return fromString(input, context, callback);
  } else if (Buffer.isBuffer(input)) {
    return fromString(input.toString(), context, callback);
  } else if (Array.isArray(input)) {
    return fromArray(input, context, callback);
  } else if (typeof input == 'object') {
    return fromHash(input, context, callback);
  }
}

function fromString(input, context, callback) {
  context.source = undefined;
  context.sourcesContent[undefined] = input;
  context.stats.originalSize += input.length;

  return fromStyles(input, context, { inline: context.options.inline }, callback);
}

function fromArray(input, context, callback) {
  var inputAsImports = input.reduce(function (accumulator, uriOrHash) {
    if (typeof uriOrHash === 'string') {
      return addStringSource(uriOrHash, accumulator);
    } else {
      return addHashSource(uriOrHash, context, accumulator);
    }

  }, []);

  return fromStyles(inputAsImports.join(''), context, { inline: ['all'] }, callback);
}

function fromHash(input, context, callback) {
  var inputAsImports = addHashSource(input, context, []);
  return fromStyles(inputAsImports.join(''), context, { inline: ['all'] }, callback);
}

function addStringSource(input, imports) {
  imports.push(restoreAsImport(normalizeUri(input)));
  return imports;
}

function addHashSource(input, context, imports) {
  var uri;
  var normalizedUri;
  var source;

  for (uri in input) {
    source = input[uri];
    normalizedUri = normalizeUri(uri);

    imports.push(restoreAsImport(normalizedUri));

    context.sourcesContent[normalizedUri] = source.styles;

    if (source.sourceMap) {
      trackSourceMap(source.sourceMap, normalizedUri, context);
    }
  }

  return imports;
}

function normalizeUri(uri) {
  var currentPath = path.resolve('');
  var absoluteUri;
  var relativeToCurrentPath;
  var normalizedUri;

  if (isRemoteResource(uri)) {
    return uri;
  }

  absoluteUri = path.isAbsolute(uri) ?
    uri :
    path.resolve(uri);
  relativeToCurrentPath = path.relative(currentPath, absoluteUri);
  normalizedUri = normalizePath(relativeToCurrentPath);

  return normalizedUri;
}

function trackSourceMap(sourceMap, uri, context) {
  var parsedMap = typeof sourceMap == 'string' ?
      JSON.parse(sourceMap) :
      sourceMap;
  var rebasedMap = isRemoteResource(uri) ?
    rebaseRemoteMap(parsedMap, uri) :
    rebaseLocalMap(parsedMap, uri || UNKNOWN_URI, context.options.rebaseTo);

  context.inputSourceMapTracker.track(uri, rebasedMap);
}

function restoreAsImport(uri) {
  return restoreImport('url(' + uri + ')', '') + Marker.SEMICOLON;
}

function fromStyles(styles, context, parentInlinerContext, callback) {
  var tokens;
  var rebaseConfig = {};

  if (!context.source) {
    rebaseConfig.fromBase = path.resolve('');
    rebaseConfig.toBase = context.options.rebaseTo;
  } else if (isRemoteResource(context.source)) {
    rebaseConfig.fromBase = context.source;
    rebaseConfig.toBase = context.source;
  } else if (path.isAbsolute(context.source)) {
    rebaseConfig.fromBase = path.dirname(context.source);
    rebaseConfig.toBase = context.options.rebaseTo;
  } else {
    rebaseConfig.fromBase = path.dirname(path.resolve(context.source));
    rebaseConfig.toBase = context.options.rebaseTo;
  }

  tokens = tokenize(styles, context);
  tokens = rebase(tokens, context.options.rebase, context.validator, rebaseConfig);

  return allowsAnyImports(parentInlinerContext.inline) ?
    inline(tokens, context, parentInlinerContext, callback) :
    callback(tokens);
}

function allowsAnyImports(inline) {
  return !(inline.length == 1 && inline[0] == 'none');
}

function inline(tokens, externalContext, parentInlinerContext, callback) {
  var inlinerContext = {
    afterContent: false,
    callback: callback,
    errors: externalContext.errors,
    externalContext: externalContext,
    fetch: externalContext.options.fetch,
    inlinedStylesheets: parentInlinerContext.inlinedStylesheets || externalContext.inlinedStylesheets,
    inline: parentInlinerContext.inline,
    inlineRequest: externalContext.options.inlineRequest,
    inlineTimeout: externalContext.options.inlineTimeout,
    isRemote: parentInlinerContext.isRemote || false,
    localOnly: externalContext.localOnly,
    outputTokens: [],
    rebaseTo: externalContext.options.rebaseTo,
    sourceTokens: tokens,
    warnings: externalContext.warnings
  };

  return doInlineImports(inlinerContext);
}

function doInlineImports(inlinerContext) {
  var token;
  var i, l;

  for (i = 0, l = inlinerContext.sourceTokens.length; i < l; i++) {
    token = inlinerContext.sourceTokens[i];

    if (token[0] == Token.AT_RULE && isImport(token[1])) {
      inlinerContext.sourceTokens.splice(0, i);
      return inlineStylesheet(token, inlinerContext);
    } else if (token[0] == Token.AT_RULE || token[0] == Token.COMMENT) {
      inlinerContext.outputTokens.push(token);
    } else {
      inlinerContext.outputTokens.push(token);
      inlinerContext.afterContent = true;
    }
  }

  inlinerContext.sourceTokens = [];
  return inlinerContext.callback(inlinerContext.outputTokens);
}

function inlineStylesheet(token, inlinerContext) {
  var uriAndMediaQuery = extractImportUrlAndMedia(token[1]);
  var uri = uriAndMediaQuery[0];
  var mediaQuery = uriAndMediaQuery[1];
  var metadata = token[2];

  return isRemoteResource(uri) ?
    inlineRemoteStylesheet(uri, mediaQuery, metadata, inlinerContext) :
    inlineLocalStylesheet(uri, mediaQuery, metadata, inlinerContext);
}

function inlineRemoteStylesheet(uri, mediaQuery, metadata, inlinerContext) {
  var isAllowed = isAllowedResource(uri, true, inlinerContext.inline);
  var originalUri = uri;
  var isLoaded = uri in inlinerContext.externalContext.sourcesContent;
  var isRuntimeResource = !hasProtocol(uri);

  if (inlinerContext.inlinedStylesheets.indexOf(uri) > -1) {
    inlinerContext.warnings.push('Ignoring remote @import of "' + uri + '" as it has already been imported.');
    inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
    return doInlineImports(inlinerContext);
  } else if (inlinerContext.localOnly && inlinerContext.afterContent) {
    inlinerContext.warnings.push('Ignoring remote @import of "' + uri + '" as no callback given and after other content.');
    inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
    return doInlineImports(inlinerContext);
  } else if (isRuntimeResource) {
    inlinerContext.warnings.push('Skipping remote @import of "' + uri + '" as no protocol given.');
    inlinerContext.outputTokens = inlinerContext.outputTokens.concat(inlinerContext.sourceTokens.slice(0, 1));
    inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
    return doInlineImports(inlinerContext);
  } else if (inlinerContext.localOnly && !isLoaded) {
    inlinerContext.warnings.push('Skipping remote @import of "' + uri + '" as no callback given.');
    inlinerContext.outputTokens = inlinerContext.outputTokens.concat(inlinerContext.sourceTokens.slice(0, 1));
    inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
    return doInlineImports(inlinerContext);
  } else if (!isAllowed && inlinerContext.afterContent) {
    inlinerContext.warnings.push('Ignoring remote @import of "' + uri + '" as resource is not allowed and after other content.');
    inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
    return doInlineImports(inlinerContext);
  } else if (!isAllowed) {
    inlinerContext.warnings.push('Skipping remote @import of "' + uri + '" as resource is not allowed.');
    inlinerContext.outputTokens = inlinerContext.outputTokens.concat(inlinerContext.sourceTokens.slice(0, 1));
    inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
    return doInlineImports(inlinerContext);
  }

  inlinerContext.inlinedStylesheets.push(uri);

  function whenLoaded(error, importedStyles) {
    if (error) {
      inlinerContext.errors.push('Broken @import declaration of "' + uri + '" - ' + error);

      return process.nextTick(function () {
        inlinerContext.outputTokens = inlinerContext.outputTokens.concat(inlinerContext.sourceTokens.slice(0, 1));
        inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);
        doInlineImports(inlinerContext);
      });
    }

    inlinerContext.inline = inlinerContext.externalContext.options.inline;
    inlinerContext.isRemote = true;

    inlinerContext.externalContext.source = originalUri;
    inlinerContext.externalContext.sourcesContent[uri] = importedStyles;
    inlinerContext.externalContext.stats.originalSize += importedStyles.length;

    return fromStyles(importedStyles, inlinerContext.externalContext, inlinerContext, function (importedTokens) {
      importedTokens = wrapInMedia(importedTokens, mediaQuery, metadata);

      inlinerContext.outputTokens = inlinerContext.outputTokens.concat(importedTokens);
      inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);

      return doInlineImports(inlinerContext);
    });
  }

  return isLoaded ?
    whenLoaded(null, inlinerContext.externalContext.sourcesContent[uri]) :
    inlinerContext.fetch(uri, inlinerContext.inlineRequest, inlinerContext.inlineTimeout, whenLoaded);
}

function inlineLocalStylesheet(uri, mediaQuery, metadata, inlinerContext) {
  var currentPath = path.resolve('');
  var absoluteUri = path.isAbsolute(uri) ?
    path.resolve(currentPath, uri[0] == '/' ? uri.substring(1) : uri) :
    path.resolve(inlinerContext.rebaseTo, uri);
  var relativeToCurrentPath = path.relative(currentPath, absoluteUri);
  var importedStyles;
  var isAllowed = isAllowedResource(uri, false, inlinerContext.inline);
  var normalizedPath = normalizePath(relativeToCurrentPath);
  var isLoaded = normalizedPath in inlinerContext.externalContext.sourcesContent;

  if (inlinerContext.inlinedStylesheets.indexOf(absoluteUri) > -1) {
    inlinerContext.warnings.push('Ignoring local @import of "' + uri + '" as it has already been imported.');
  } else if (!isLoaded && (!fs.existsSync(absoluteUri) || !fs.statSync(absoluteUri).isFile())) {
    inlinerContext.errors.push('Ignoring local @import of "' + uri + '" as resource is missing.');
  } else if (!isAllowed && inlinerContext.afterContent) {
    inlinerContext.warnings.push('Ignoring local @import of "' + uri + '" as resource is not allowed and after other content.');
  } else if (inlinerContext.afterContent) {
    inlinerContext.warnings.push('Ignoring local @import of "' + uri + '" as after other content.');
  } else if (!isAllowed) {
    inlinerContext.warnings.push('Skipping local @import of "' + uri + '" as resource is not allowed.');
    inlinerContext.outputTokens = inlinerContext.outputTokens.concat(inlinerContext.sourceTokens.slice(0, 1));
  } else {
    importedStyles = isLoaded ?
      inlinerContext.externalContext.sourcesContent[normalizedPath] :
      fs.readFileSync(absoluteUri, 'utf-8');

    inlinerContext.inlinedStylesheets.push(absoluteUri);
    inlinerContext.inline = inlinerContext.externalContext.options.inline;

    inlinerContext.externalContext.source = normalizedPath;
    inlinerContext.externalContext.sourcesContent[normalizedPath] = importedStyles;
    inlinerContext.externalContext.stats.originalSize += importedStyles.length;

    return fromStyles(importedStyles, inlinerContext.externalContext, inlinerContext, function (importedTokens) {
      importedTokens = wrapInMedia(importedTokens, mediaQuery, metadata);

      inlinerContext.outputTokens = inlinerContext.outputTokens.concat(importedTokens);
      inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);

      return doInlineImports(inlinerContext);
    });
  }

  inlinerContext.sourceTokens = inlinerContext.sourceTokens.slice(1);

  return doInlineImports(inlinerContext);
}

function wrapInMedia(tokens, mediaQuery, metadata) {
  if (mediaQuery) {
    return [[Token.NESTED_BLOCK, [[Token.NESTED_BLOCK_SCOPE, '@media ' + mediaQuery, metadata]], tokens]];
  } else {
    return tokens;
  }
}

module.exports = readSources;
