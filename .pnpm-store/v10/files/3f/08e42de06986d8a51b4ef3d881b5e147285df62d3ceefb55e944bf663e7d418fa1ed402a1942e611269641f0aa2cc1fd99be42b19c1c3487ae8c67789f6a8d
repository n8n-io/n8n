import {TokenType as tt} from "../parser/tokenizer/types";



/**
 * Common method sharing code between CJS and ESM cases, since they're the same here.
 */
export default function shouldElideDefaultExport(
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
    !(numTokens === 4 && tokens.matches1AtIndex(exportToken.rhsEndIndex - 1, tt.semi))
  ) {
    return false;
  }
  const identifierToken = tokens.tokenAtRelativeIndex(2);
  if (identifierToken.type !== tt.name) {
    return false;
  }
  const exportedName = tokens.identifierNameForToken(identifierToken);
  return (
    declarationInfo.typeDeclarations.has(exportedName) &&
    !declarationInfo.valueDeclarations.has(exportedName)
  );
}
