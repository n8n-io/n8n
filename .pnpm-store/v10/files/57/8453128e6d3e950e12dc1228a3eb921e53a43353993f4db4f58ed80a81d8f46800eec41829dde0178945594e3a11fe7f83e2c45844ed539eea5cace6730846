'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseAttributes;
exports.decodeAttributes = decodeAttributes;
var regexTag = /<([^>])*>/gim;
var regexAttributes = /([^\s]*="|')([^"|']*)("|')/gim;

function parseAttributes(input) {
  var replaceAmp = function replaceAmp(match) {
    return '&amp;' + (match.length > 1 ? match.charAt(1) : '');
  };
  var replaceAttrVal = function replaceAttrVal(match) {
    return match.replace(/&([^a]|$)/g, replaceAmp);
  };

  return input.replace(regexTag, function (match) {
    return match.replace(regexAttributes, function (m, beforeAttr, attrVal, afterAttr) {
      var newAttrVal = attrVal.replace(/.*&([^a]|$).*/g, replaceAttrVal);
      newAttrVal = encodeURIComponent(attrVal);

      return '' + beforeAttr + newAttrVal + afterAttr;
    });
  });
}

function decodeAttributes(input) {
  return input.replace(regexTag, function (match) {
    return match.replace(regexAttributes, function (match, beforeAttr, attrVal, afterAttr) {
      var newAttrVal = decodeURIComponent(attrVal);

      return '' + beforeAttr + newAttrVal + afterAttr;
    });
  });
}