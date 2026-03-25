"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ruleError;
function formatInclude(element) {
  const {
    includedIn
  } = element;
  if (!(includedIn && includedIn.length)) return '';
  const formattedIncluded = includedIn.slice().reverse().map(({
    line,
    file
  }) => `line ${line} of file ${file}`).join(', itself included at ');
  return `, included at ${formattedIncluded}`;
}
function ruleError(message, element) {
  const {
    line,
    tagName,
    absoluteFilePath
  } = element;
  return {
    line,
    message,
    tagName,
    formattedMessage: `Line ${line} of ${absoluteFilePath}${formatInclude(element)} (${tagName}) — ${message}`
  };
}
module.exports = exports.default;