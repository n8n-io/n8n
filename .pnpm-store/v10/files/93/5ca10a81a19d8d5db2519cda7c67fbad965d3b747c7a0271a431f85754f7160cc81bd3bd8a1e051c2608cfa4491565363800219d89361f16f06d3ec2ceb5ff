/**
 * Get UCS-2 length of a string
 * https://mathiasbynens.be/notes/javascript-encoding
 * https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
 */
export function ucs2length(s: string): number {
  let result = 0;
  let length = s.length;
  let index = 0;
  let charCode: number;
  while (index < length) {
    result++;
    charCode = s.charCodeAt(index++);
    if (charCode >= 0xd800 && charCode <= 0xdbff && index < length) {
      // high surrogate, and there is a next character
      charCode = s.charCodeAt(index);
      if ((charCode & 0xfc00) == 0xdc00) {
        // low surrogate
        index++;
      }
    }
  }
  return result;
}
