"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _charcodes = require('./charcodes');
var _whitespace = require('./whitespace');

function computeIsIdentifierChar(code) {
  if (code < 48) return code === 36;
  if (code < 58) return true;
  if (code < 65) return false;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  if (code < 128) return false;
  throw new Error("Should not be called with non-ASCII char code.");
}

 const IS_IDENTIFIER_CHAR = new Uint8Array(65536); exports.IS_IDENTIFIER_CHAR = IS_IDENTIFIER_CHAR;
for (let i = 0; i < 128; i++) {
  exports.IS_IDENTIFIER_CHAR[i] = computeIsIdentifierChar(i) ? 1 : 0;
}
for (let i = 128; i < 65536; i++) {
  exports.IS_IDENTIFIER_CHAR[i] = 1;
}
// Aside from whitespace and newlines, all characters outside the ASCII space are either
// identifier characters or invalid. Since we're not performing code validation, we can just
// treat all invalid characters as identifier characters.
for (const whitespaceChar of _whitespace.WHITESPACE_CHARS) {
  exports.IS_IDENTIFIER_CHAR[whitespaceChar] = 0;
}
exports.IS_IDENTIFIER_CHAR[0x2028] = 0;
exports.IS_IDENTIFIER_CHAR[0x2029] = 0;

 const IS_IDENTIFIER_START = exports.IS_IDENTIFIER_CHAR.slice(); exports.IS_IDENTIFIER_START = IS_IDENTIFIER_START;
for (let numChar = _charcodes.charCodes.digit0; numChar <= _charcodes.charCodes.digit9; numChar++) {
  exports.IS_IDENTIFIER_START[numChar] = 0;
}
