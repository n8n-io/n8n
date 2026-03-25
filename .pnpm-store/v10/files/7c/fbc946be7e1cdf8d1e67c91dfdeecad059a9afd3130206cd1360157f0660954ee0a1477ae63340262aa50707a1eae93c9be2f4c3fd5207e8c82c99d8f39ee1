"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _keywords = require('../parser/tokenizer/keywords');
var _types = require('../parser/tokenizer/types');


/**
 * Starting at a potential `with` or (legacy) `assert` token, remove the import
 * attributes if they exist.
 */
 function removeMaybeImportAttributes(tokens) {
  if (
    tokens.matches2(_types.TokenType._with, _types.TokenType.braceL) ||
    (tokens.matches2(_types.TokenType.name, _types.TokenType.braceL) && tokens.matchesContextual(_keywords.ContextualKeyword._assert))
  ) {
    // assert
    tokens.removeToken();
    // {
    tokens.removeToken();
    tokens.removeBalancedCode();
    // }
    tokens.removeToken();
  }
} exports.removeMaybeImportAttributes = removeMaybeImportAttributes;
