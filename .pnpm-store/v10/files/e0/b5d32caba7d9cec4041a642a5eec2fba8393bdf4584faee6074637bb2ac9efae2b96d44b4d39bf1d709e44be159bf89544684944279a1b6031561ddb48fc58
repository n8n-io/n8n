import {charCodes} from "./charcodes";
import {WHITESPACE_CHARS} from "./whitespace";

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

export const IS_IDENTIFIER_CHAR = new Uint8Array(65536);
for (let i = 0; i < 128; i++) {
  IS_IDENTIFIER_CHAR[i] = computeIsIdentifierChar(i) ? 1 : 0;
}
for (let i = 128; i < 65536; i++) {
  IS_IDENTIFIER_CHAR[i] = 1;
}
// Aside from whitespace and newlines, all characters outside the ASCII space are either
// identifier characters or invalid. Since we're not performing code validation, we can just
// treat all invalid characters as identifier characters.
for (const whitespaceChar of WHITESPACE_CHARS) {
  IS_IDENTIFIER_CHAR[whitespaceChar] = 0;
}
IS_IDENTIFIER_CHAR[0x2028] = 0;
IS_IDENTIFIER_CHAR[0x2029] = 0;

export const IS_IDENTIFIER_START = IS_IDENTIFIER_CHAR.slice();
for (let numChar = charCodes.digit0; numChar <= charCodes.digit9; numChar++) {
  IS_IDENTIFIER_START[numChar] = 0;
}
