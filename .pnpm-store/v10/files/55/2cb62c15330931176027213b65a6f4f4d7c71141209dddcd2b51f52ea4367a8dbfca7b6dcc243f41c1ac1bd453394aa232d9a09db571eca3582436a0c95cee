var extractImportUrlAndMedia = require('./extract-import-url-and-media');
var restoreImport = require('./restore-import');
var rewriteUrl = require('./rewrite-url');

var Token = require('../tokenizer/token');
var isImport = require('../utils/is-import');

var SOURCE_MAP_COMMENT_PATTERN = /^\/\*# sourceMappingURL=(\S+) \*\/$/;

function rebase(tokens, rebaseAll, validator, rebaseConfig) {
  return rebaseAll ?
    rebaseEverything(tokens, validator, rebaseConfig) :
    rebaseAtRules(tokens, validator, rebaseConfig);
}

function rebaseEverything(tokens, validator, rebaseConfig) {
  var token;
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];

    switch (token[0]) {
      case Token.AT_RULE:
        rebaseAtRule(token, validator, rebaseConfig);
        break;
      case Token.AT_RULE_BLOCK:
        rebaseProperties(token[2], validator, rebaseConfig);
        break;
      case Token.COMMENT:
        rebaseSourceMapComment(token, rebaseConfig);
        break;
      case Token.NESTED_BLOCK:
        rebaseEverything(token[2], validator, rebaseConfig);
        break;
      case Token.RULE:
        rebaseProperties(token[2], validator, rebaseConfig);
        break;
    }
  }

  return tokens;
}

function rebaseAtRules(tokens, validator, rebaseConfig) {
  var token;
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];

    switch (token[0]) {
      case Token.AT_RULE:
        rebaseAtRule(token, validator, rebaseConfig);
        break;
    }
  }

  return tokens;
}

function rebaseAtRule(token, validator, rebaseConfig) {
  if (!isImport(token[1])) {
    return;
  }

  var uriAndMediaQuery = extractImportUrlAndMedia(token[1]);
  var newUrl = rewriteUrl(uriAndMediaQuery[0], rebaseConfig);
  var mediaQuery = uriAndMediaQuery[1];

  token[1] = restoreImport(newUrl, mediaQuery);
}

function rebaseSourceMapComment(token, rebaseConfig) {
  var matches = SOURCE_MAP_COMMENT_PATTERN.exec(token[1]);

  if (matches && matches[1].indexOf('data:') === -1) {
    token[1] = token[1].replace(matches[1], rewriteUrl(matches[1], rebaseConfig, true));
  }
}

function rebaseProperties(properties, validator, rebaseConfig) {
  var property;
  var value;
  var i, l;
  var j, m;

  for (i = 0, l = properties.length; i < l; i++) {
    property = properties[i];

    for (j = 2 /* 0 is Token.PROPERTY, 1 is name */, m = property.length; j < m; j++) {
      value = property[j][1];

      if (validator.isUrl(value)) {
        property[j][1] = rewriteUrl(value, rebaseConfig);
      }
    }
  }
}

module.exports = rebase;
