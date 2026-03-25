"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _tokenizer = require('../parser/tokenizer');
var _types = require('../parser/tokenizer/types');

var _JSXTransformer = require('../transformers/JSXTransformer');
var _getJSXPragmaInfo = require('./getJSXPragmaInfo'); var _getJSXPragmaInfo2 = _interopRequireDefault(_getJSXPragmaInfo);

 function getNonTypeIdentifiers(tokens, options) {
  const jsxPragmaInfo = _getJSXPragmaInfo2.default.call(void 0, options);
  const nonTypeIdentifiers = new Set();
  for (let i = 0; i < tokens.tokens.length; i++) {
    const token = tokens.tokens[i];
    if (
      token.type === _types.TokenType.name &&
      !token.isType &&
      (token.identifierRole === _tokenizer.IdentifierRole.Access ||
        token.identifierRole === _tokenizer.IdentifierRole.ObjectShorthand ||
        token.identifierRole === _tokenizer.IdentifierRole.ExportAccess) &&
      !token.shadowsGlobal
    ) {
      nonTypeIdentifiers.add(tokens.identifierNameForToken(token));
    }
    if (token.type === _types.TokenType.jsxTagStart) {
      nonTypeIdentifiers.add(jsxPragmaInfo.base);
    }
    if (
      token.type === _types.TokenType.jsxTagStart &&
      i + 1 < tokens.tokens.length &&
      tokens.tokens[i + 1].type === _types.TokenType.jsxTagEnd
    ) {
      nonTypeIdentifiers.add(jsxPragmaInfo.base);
      nonTypeIdentifiers.add(jsxPragmaInfo.fragmentBase);
    }
    if (token.type === _types.TokenType.jsxName && token.identifierRole === _tokenizer.IdentifierRole.Access) {
      const identifierName = tokens.identifierNameForToken(token);
      // Lower-case single-component tag names like "div" don't count.
      if (!_JSXTransformer.startsWithLowerCase.call(void 0, identifierName) || tokens.tokens[i + 1].type === _types.TokenType.dot) {
        nonTypeIdentifiers.add(tokens.identifierNameForToken(token));
      }
    }
  }
  return nonTypeIdentifiers;
} exports.getNonTypeIdentifiers = getNonTypeIdentifiers;
