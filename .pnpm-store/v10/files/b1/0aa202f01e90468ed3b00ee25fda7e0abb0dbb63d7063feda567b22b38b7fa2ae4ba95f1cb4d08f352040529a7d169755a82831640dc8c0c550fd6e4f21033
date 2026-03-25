'use strict';

class ValueDetector {
  /**
   * @param {Object} opts.replaceMasks - use custom masks
   * @param {Object} opts.extraMasks - add your custom masks additionally to built-in ones
   * @param {Object} opts.minHexLength - when using built-in masks, count only long enough HEX values, DEFAULT: 7
   * @param {Object} opts.minBase64Length - when using built-in masks, count only long enough base64 values, DEFAULT: 66
   */
  constructor(opts = {}) {
    const replaceMasks = opts.replaceMasks || opts.valueMasks; // valueMasks deprecated, but still supported
    const minHexLength = opts.minHexLength || 7;
    const minBase64Length = opts.minBase64Length || 66;
    const base64Quartets = minBase64Length / 4;

    this.valueMasks = (replaceMasks || [
      /^\-?\d+$/,

      /^(\d{2}|\d{4})\-\d\d\-\d\d$/, // date

      /^[\da-f]{8}\-[\da-f]{4}\-[\da-f]{4}\-[\da-f]{4}\-[\da-f]{12}$/, // UUID
      /^[\dA-F]{8}\-[\dA-F]{4}\-[\dA-F]{4}\-[\dA-F]{4}\-[\dA-F]{12}$/, // UUID uppercased

      // hex code sould have a consistent case
      RegExp(`^[\\da-f]{${minHexLength},}$`),
      RegExp(`^[\\dA-F]{${minHexLength},}$`),

      // JWT regex borrowed here: https://github.com/brianloveswords/node-jws/issues/38
      // added constraints on length based on minimal content + experimenting with encodings
      /^[a-zA-Z0-9\-_]{18,}?\.[a-zA-Z0-9\-_]{3,}?\.[a-zA-Z0-9\-_]{39,}?$/,

      // base64 encoded with URL safe Base64
      RegExp(`^[a-zA-Z0-9\-_]{${minBase64Length},}$`),

      // classic Base64
      RegExp(`^(?:[A-Za-z0-9+/]{4}){${base64Quartets},}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?`)
    ])
      .concat(opts.extraMasks || [])
      .map(mask => typeof mask === 'string' ? RegExp(mask) : mask);
  }

  isValue(str) {
    for (let mask of this.valueMasks) {
      if (str.match(mask)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = ValueDetector;
