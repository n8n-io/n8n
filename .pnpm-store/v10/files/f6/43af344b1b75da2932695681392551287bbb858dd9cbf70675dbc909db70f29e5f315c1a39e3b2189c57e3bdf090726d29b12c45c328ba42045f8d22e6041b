"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _keywords = require('../parser/tokenizer/keywords');
var _types = require('../parser/tokenizer/types');


/**
 * Starting at `export {`, look ahead and return `true` if this is an
 * `export {...} from` statement and `false` if this is a plain multi-export.
 */
 function isExportFrom(tokens) {
  let closeBraceIndex = tokens.currentIndex();
  while (!tokens.matches1AtIndex(closeBraceIndex, _types.TokenType.braceR)) {
    closeBraceIndex++;
  }
  return (
    tokens.matchesContextualAtIndex(closeBraceIndex + 1, _keywords.ContextualKeyword._from) &&
    tokens.matches1AtIndex(closeBraceIndex + 2, _types.TokenType.string)
  );
} exports.default = isExportFrom;
