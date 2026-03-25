"use strict";
const { atob } = require("abab");

exports.stripLeadingAndTrailingASCIIWhitespace = string => {
  return string.replace(/^[ \t\n\f\r]+/u, "").replace(/[ \t\n\f\r]+$/u, "");
};

exports.isomorphicDecode = input => {
  return Array.from(input, byte => String.fromCodePoint(byte)).join("");
};

exports.forgivingBase64Decode = data => {
  const asString = atob(data);
  if (asString === null) {
    return null;
  }
  return Uint8Array.from(asString, c => c.codePointAt(0));
};
