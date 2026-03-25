"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _types = require('../parser/tokenizer/types');
















/**
 * Determine information about this named import or named export specifier.
 *
 * This syntax is the `a` from statements like these:
 * import {A} from "./foo";
 * export {A};
 * export {A} from "./foo";
 *
 * As it turns out, we can exactly characterize the syntax meaning by simply
 * counting the number of tokens, which can be from 1 to 4:
 * {A}
 * {type A}
 * {A as B}
 * {type A as B}
 *
 * In the type case, we never actually need the names in practice, so don't get
 * them.
 *
 * TODO: There's some redundancy with the type detection here and the isType
 * flag that's already present on tokens in TS mode. This function could
 * potentially be simplified and/or pushed to the call sites to avoid the object
 * allocation.
 */
 function getImportExportSpecifierInfo(
  tokens,
  index = tokens.currentIndex(),
) {
  let endIndex = index + 1;
  if (isSpecifierEnd(tokens, endIndex)) {
    // import {A}
    const name = tokens.identifierNameAtIndex(index);
    return {
      isType: false,
      leftName: name,
      rightName: name,
      endIndex,
    };
  }
  endIndex++;
  if (isSpecifierEnd(tokens, endIndex)) {
    // import {type A}
    return {
      isType: true,
      leftName: null,
      rightName: null,
      endIndex,
    };
  }
  endIndex++;
  if (isSpecifierEnd(tokens, endIndex)) {
    // import {A as B}
    return {
      isType: false,
      leftName: tokens.identifierNameAtIndex(index),
      rightName: tokens.identifierNameAtIndex(index + 2),
      endIndex,
    };
  }
  endIndex++;
  if (isSpecifierEnd(tokens, endIndex)) {
    // import {type A as B}
    return {
      isType: true,
      leftName: null,
      rightName: null,
      endIndex,
    };
  }
  throw new Error(`Unexpected import/export specifier at ${index}`);
} exports.default = getImportExportSpecifierInfo;

function isSpecifierEnd(tokens, index) {
  const token = tokens.tokens[index];
  return token.type === _types.TokenType.braceR || token.type === _types.TokenType.comma;
}
