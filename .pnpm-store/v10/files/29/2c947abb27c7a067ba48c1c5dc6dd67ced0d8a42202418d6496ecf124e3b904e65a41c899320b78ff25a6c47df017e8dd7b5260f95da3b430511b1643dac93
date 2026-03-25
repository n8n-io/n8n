"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _types = require('../parser/tokenizer/types');



/**
 * Common method sharing code between CJS and ESM cases, since they're the same here.
 */
 function shouldElideDefaultExport(
  isTypeScriptTransformEnabled,
  keepUnusedImports,
  tokens,
  declarationInfo,
) {
  if (!isTypeScriptTransformEnabled || keepUnusedImports) {
    return false;
  }
  const exportToken = tokens.currentToken();
  if (exportToken.rhsEndIndex == null) {
    throw new Error("Expected non-null rhsEndIndex on export token.");
  }
  // The export must be of the form `export default a` or `export default a;`.
  const numTokens = exportToken.rhsEndIndex - tokens.currentIndex();
  if (
    numTokens !== 3 &&
    !(numTokens === 4 && tokens.matches1AtIndex(exportToken.rhsEndIndex - 1, _types.TokenType.semi))
  ) {
    return false;
  }
  const identifierToken = tokens.tokenAtRelativeIndex(2);
  if (identifierToken.type !== _types.TokenType.name) {
    return false;
  }
  const exportedName = tokens.identifierNameForToken(identifierToken);
  return (
    declarationInfo.typeDeclarations.has(exportedName) &&
    !declarationInfo.valueDeclarations.has(exportedName)
  );
} exports.default = shouldElideDefaultExport;
