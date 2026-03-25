"use strict";Object.defineProperty(exports, "__esModule", {value: true});
var _types = require('../parser/tokenizer/types');

/**
 * Get all identifier names in the code, in order, including duplicates.
 */
 function getIdentifierNames(code, tokens) {
  const names = [];
  for (const token of tokens) {
    if (token.type === _types.TokenType.name) {
      names.push(code.slice(token.start, token.end));
    }
  }
  return names;
} exports.default = getIdentifierNames;
