"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _types = require('../parser/tokenizer/types');


 function elideImportEquals(tokens) {
  // import
  tokens.removeInitialToken();
  // name
  tokens.removeToken();
  // =
  tokens.removeToken();
  // name or require
  tokens.removeToken();
  // Handle either `import A = require('A')` or `import A = B.C.D`.
  if (tokens.matches1(_types.TokenType.parenL)) {
    // (
    tokens.removeToken();
    // path string
    tokens.removeToken();
    // )
    tokens.removeToken();
  } else {
    while (tokens.matches1(_types.TokenType.dot)) {
      // .
      tokens.removeToken();
      // name
      tokens.removeToken();
    }
  }
} exports.default = elideImportEquals;
