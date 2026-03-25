var populateComponents = require('./properties/populate-components');

var wrapForOptimizing = require('../wrap-for-optimizing').single;
var restoreFromOptimizing = require('../restore-from-optimizing');

var Token = require('../../tokenizer/token');

var animationNameRegex = /^(\-moz\-|\-o\-|\-webkit\-)?animation-name$/;
var animationRegex = /^(\-moz\-|\-o\-|\-webkit\-)?animation$/;
var keyframeRegex = /^@(\-moz\-|\-o\-|\-webkit\-)?keyframes /;
var importantRegex = /\s{0,31}!important$/;
var optionalMatchingQuotesRegex = /^(['"]?)(.*)\1$/;

function normalize(value) {
  return value
    .replace(optionalMatchingQuotesRegex, '$2')
    .replace(importantRegex, '');
}

function removeUnusedAtRules(tokens, context) {
  removeUnusedAtRule(tokens, matchCounterStyle, markCounterStylesAsUsed, context);
  removeUnusedAtRule(tokens, matchFontFace, markFontFacesAsUsed, context);
  removeUnusedAtRule(tokens, matchKeyframe, markKeyframesAsUsed, context);
  removeUnusedAtRule(tokens, matchNamespace, markNamespacesAsUsed, context);
}

function removeUnusedAtRule(tokens, matchCallback, markCallback, context) {
  var atRules = {};
  var atRule;
  var atRuleTokens;
  var atRuleToken;
  var zeroAt;
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    matchCallback(tokens[i], atRules);
  }

  if (Object.keys(atRules).length === 0) {
    return;
  }

  markUsedAtRules(tokens, markCallback, atRules, context);

  for (atRule in atRules) {
    atRuleTokens = atRules[atRule];

    for (i = 0, l = atRuleTokens.length; i < l; i++) {
      atRuleToken = atRuleTokens[i];
      zeroAt = atRuleToken[0] == Token.AT_RULE ? 1 : 2;
      atRuleToken[zeroAt] = [];
    }
  }
}

function markUsedAtRules(tokens, markCallback, atRules, context) {
  var boundMarkCallback = markCallback(atRules);
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    switch (tokens[i][0]) {
      case Token.RULE:
        boundMarkCallback(tokens[i], context);
        break;
      case Token.NESTED_BLOCK:
        markUsedAtRules(tokens[i][2], markCallback, atRules, context);
    }
  }
}

function matchCounterStyle(token, atRules) {
  var match;

  if (token[0] == Token.AT_RULE_BLOCK && token[1][0][1].indexOf('@counter-style') === 0) {
    match = token[1][0][1].split(' ')[1];
    atRules[match] = atRules[match] || [];
    atRules[match].push(token);
  }
}

function markCounterStylesAsUsed(atRules) {
  return function (token, context) {
    var property;
    var wrappedProperty;
    var i, l;

    for (i = 0, l = token[2].length; i < l; i++) {
      property = token[2][i];

      if (property[1][1] == 'list-style') {
        wrappedProperty = wrapForOptimizing(property);
        populateComponents([wrappedProperty], context.validator, context.warnings);

        if (wrappedProperty.components[0].value[0][1] in atRules) {
          delete atRules[property[2][1]];
        }

        restoreFromOptimizing([wrappedProperty]);
      }

      if (property[1][1] == 'list-style-type' && property[2][1] in atRules) {
        delete atRules[property[2][1]];
      }
    }
  };
}

function matchFontFace(token, atRules) {
  var property;
  var match;
  var i, l;

  if (token[0] == Token.AT_RULE_BLOCK && token[1][0][1] == '@font-face') {
    for (i = 0, l = token[2].length; i < l; i++) {
      property = token[2][i];

      if (property[1][1] == 'font-family') {
        match = normalize(property[2][1].toLowerCase());
        atRules[match] = atRules[match] || [];
        atRules[match].push(token);
        break;
      }
    }
  }
}

function markFontFacesAsUsed(atRules) {
  return function (token, context) {
    var property;
    var wrappedProperty;
    var component;
    var normalizedMatch;
    var i, l;
    var j, m;

    for (i = 0, l = token[2].length; i < l; i++) {
      property = token[2][i];

      if (property[1][1] == 'font') {
        wrappedProperty = wrapForOptimizing(property);
        populateComponents([wrappedProperty], context.validator, context.warnings);
        component = wrappedProperty.components[6];

        for (j = 0, m = component.value.length; j < m; j++) {
          normalizedMatch = normalize(component.value[j][1].toLowerCase());

          if (normalizedMatch in atRules) {
            delete atRules[normalizedMatch];
          }
        }

        restoreFromOptimizing([wrappedProperty]);
      }

      if (property[1][1] == 'font-family') {
        for (j = 2, m = property.length; j < m; j++) {
          normalizedMatch = normalize(property[j][1].toLowerCase());

          if (normalizedMatch in atRules) {
            delete atRules[normalizedMatch];
          }
        }
      }
    }
  };
}

function matchKeyframe(token, atRules) {
  var match;

  if (token[0] == Token.NESTED_BLOCK && keyframeRegex.test(token[1][0][1])) {
    match = token[1][0][1].split(' ')[1];
    atRules[match] = atRules[match] || [];
    atRules[match].push(token);
  }
}

function markKeyframesAsUsed(atRules) {
  return function (token, context) {
    var property;
    var wrappedProperty;
    var component;
    var i, l;
    var j, m;

    for (i = 0, l = token[2].length; i < l; i++) {
      property = token[2][i];

      if (animationRegex.test(property[1][1])) {
        wrappedProperty = wrapForOptimizing(property);
        populateComponents([wrappedProperty], context.validator, context.warnings);
        component = wrappedProperty.components[7];

        for (j = 0, m = component.value.length; j < m; j++) {
          if (component.value[j][1] in atRules) {
            delete atRules[component.value[j][1]];
          }
        }

        restoreFromOptimizing([wrappedProperty]);
      }

      if (animationNameRegex.test(property[1][1])) {
        for (j = 2, m = property.length; j < m; j++) {
          if (property[j][1] in atRules) {
            delete atRules[property[j][1]];
          }
        }
      }
    }
  };
}

function matchNamespace(token, atRules) {
  var match;

  if (token[0] == Token.AT_RULE && token[1].indexOf('@namespace') === 0) {
    match = token[1].split(' ')[1];
    atRules[match] = atRules[match] || [];
    atRules[match].push(token);
  }
}

function markNamespacesAsUsed(atRules) {
  var namespaceRegex = new RegExp(Object.keys(atRules).join('\\\||') + '\\\|', 'g');

  return function (token) {
    var match;
    var scope;
    var normalizedMatch;
    var i, l;
    var j, m;

    for (i = 0, l = token[1].length; i < l; i++) {
      scope = token[1][i];
      match = scope[1].match(namespaceRegex);

      for (j = 0, m = match.length; j < m; j++) {
        normalizedMatch = match[j].substring(0, match[j].length - 1);

        if (normalizedMatch in atRules) {
          delete atRules[normalizedMatch];
        }
      }
    }
  };
}

module.exports = removeUnusedAtRules;
