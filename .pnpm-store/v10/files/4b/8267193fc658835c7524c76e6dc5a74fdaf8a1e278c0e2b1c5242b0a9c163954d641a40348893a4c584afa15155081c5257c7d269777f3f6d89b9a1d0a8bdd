var Token = require('../../tokenizer/token');

var serializeAll = require('../../writer/one-time').all;

var FONT_FACE_SCOPE = '@font-face';

function removeDuplicateFontAtRules(tokens) {
  var fontAtRules = [];
  var token;
  var key;
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];

    if (token[0] != Token.AT_RULE_BLOCK && token[1][0][1] != FONT_FACE_SCOPE) {
      continue;
    }

    key = serializeAll([token]);

    if (fontAtRules.indexOf(key) > -1) {
      token[2] = [];
    } else {
      fontAtRules.push(key);
    }
  }
}

module.exports = removeDuplicateFontAtRules;
