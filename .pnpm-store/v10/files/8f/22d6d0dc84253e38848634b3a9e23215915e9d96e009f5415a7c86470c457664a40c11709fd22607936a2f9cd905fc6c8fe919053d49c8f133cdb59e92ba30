"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = conditionalTag;
exports.endNegationConditionalTag = exports.endConditionalTag = void 0;
exports.msoConditionalTag = msoConditionalTag;
exports.startNegationConditionalTag = exports.startMsoNegationConditionalTag = exports.startMsoConditionalTag = exports.startConditionalTag = void 0;
const startConditionalTag = exports.startConditionalTag = '<!--[if mso | IE]>';
const startMsoConditionalTag = exports.startMsoConditionalTag = '<!--[if mso]>';
const endConditionalTag = exports.endConditionalTag = '<![endif]-->';
const startNegationConditionalTag = exports.startNegationConditionalTag = '<!--[if !mso | IE]><!-->';
const startMsoNegationConditionalTag = exports.startMsoNegationConditionalTag = '<!--[if !mso]><!-->';
const endNegationConditionalTag = exports.endNegationConditionalTag = '<!--<![endif]-->';
function conditionalTag(content, negation = false) {
  return `
    ${negation ? startNegationConditionalTag : startConditionalTag}
    ${content}
    ${negation ? endNegationConditionalTag : endConditionalTag}
  `;
}
function msoConditionalTag(content, negation = false) {
  return `
    ${negation ? startMsoNegationConditionalTag : startMsoConditionalTag}
    ${content}
    ${negation ? endNegationConditionalTag : endConditionalTag}
  `;
}