'use strict';

const emoji_convert = require('./convert.cjs');
require('./data.cjs');

const defaultUnicodeOptions = {
  prefix: "",
  separator: "",
  case: "lower",
  format: "utf-32",
  add0: false,
  throwOnError: true
};
function convert(sequence, options) {
  const prefix = options.prefix;
  const func = options.case === "upper" ? "toUpperCase" : "toLowerCase";
  const cleanSequence = options.format === "utf-16" ? emoji_convert.convertEmojiSequenceToUTF16(sequence) : emoji_convert.convertEmojiSequenceToUTF32(sequence, options.throwOnError);
  return cleanSequence.map((code) => {
    let str = code.toString(16);
    if (options.add0 && str.length < 4) {
      str = "0".repeat(4 - str.length) + str;
    }
    return prefix + str[func]();
  }).join(options.separator);
}
function getEmojiUnicodeString(code, options = {}) {
  return convert([code], {
    ...defaultUnicodeOptions,
    ...options
  });
}
const defaultSequenceOptions = {
  ...defaultUnicodeOptions,
  separator: "-"
};
function getEmojiSequenceString(sequence, options = {}) {
  return convert(sequence, {
    ...defaultSequenceOptions,
    ...options
  });
}
function getEmojiSequenceKeyword(sequence) {
  return sequence.map((code) => code.toString(16)).join("-");
}

exports.getEmojiSequenceKeyword = getEmojiSequenceKeyword;
exports.getEmojiSequenceString = getEmojiSequenceString;
exports.getEmojiUnicodeString = getEmojiUnicodeString;
