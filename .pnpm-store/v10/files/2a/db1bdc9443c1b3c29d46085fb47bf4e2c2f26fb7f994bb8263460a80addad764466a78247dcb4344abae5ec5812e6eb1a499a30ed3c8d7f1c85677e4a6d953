"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = content =>
// find conditionnal comment blocks
content.replace(/(<!--\[if\s[^\]]+]>)([\s\S]*?)(<!\[endif]-->)/gm, (match, prefix, content, suffix) => {
  // find spaces between tags
  const processedContent = content.replace(/(^|>)(\s+)(<|$)/gm, (match, prefix, content, suffix) => `${prefix}${suffix}`).replace(/\s{2,}/gm, ' ');
  return `${prefix}${processedContent}${suffix}`;
});
exports.default = _default;
module.exports = exports.default;