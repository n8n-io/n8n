import {charCodes} from "./charcodes";

// https://tc39.github.io/ecma262/#sec-white-space
export const WHITESPACE_CHARS = [
  0x0009,
  0x000b,
  0x000c,
  charCodes.space,
  charCodes.nonBreakingSpace,
  charCodes.oghamSpaceMark,
  0x2000, // EN QUAD
  0x2001, // EM QUAD
  0x2002, // EN SPACE
  0x2003, // EM SPACE
  0x2004, // THREE-PER-EM SPACE
  0x2005, // FOUR-PER-EM SPACE
  0x2006, // SIX-PER-EM SPACE
  0x2007, // FIGURE SPACE
  0x2008, // PUNCTUATION SPACE
  0x2009, // THIN SPACE
  0x200a, // HAIR SPACE
  0x202f, // NARROW NO-BREAK SPACE
  0x205f, // MEDIUM MATHEMATICAL SPACE
  0x3000, // IDEOGRAPHIC SPACE
  0xfeff, // ZERO WIDTH NO-BREAK SPACE
];

export const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

export const IS_WHITESPACE = new Uint8Array(65536);
for (const char of WHITESPACE_CHARS) {
  IS_WHITESPACE[char] = 1;
}
