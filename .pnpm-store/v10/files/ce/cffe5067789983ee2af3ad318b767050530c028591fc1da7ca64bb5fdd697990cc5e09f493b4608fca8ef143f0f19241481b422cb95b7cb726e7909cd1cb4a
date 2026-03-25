import {isTopLevelDeclaration} from "../parser/tokenizer";
import {TokenType as tt} from "../parser/tokenizer/types";







export const EMPTY_DECLARATION_INFO = {
  typeDeclarations: new Set(),
  valueDeclarations: new Set(),
};

/**
 * Get all top-level identifiers that should be preserved when exported in TypeScript.
 *
 * Examples:
 * - If an identifier is declared as `const x`, then `export {x}` should be preserved.
 * - If it's declared as `type x`, then `export {x}` should be removed.
 * - If it's declared as both `const x` and `type x`, then the export should be preserved.
 * - Classes and enums should be preserved (even though they also introduce types).
 * - Imported identifiers should be preserved since we don't have enough information to
 *   rule them out. --isolatedModules disallows re-exports, which catches errors here.
 */
export default function getDeclarationInfo(tokens) {
  const typeDeclarations = new Set();
  const valueDeclarations = new Set();
  for (let i = 0; i < tokens.tokens.length; i++) {
    const token = tokens.tokens[i];
    if (token.type === tt.name && isTopLevelDeclaration(token)) {
      if (token.isType) {
        typeDeclarations.add(tokens.identifierNameForToken(token));
      } else {
        valueDeclarations.add(tokens.identifierNameForToken(token));
      }
    }
  }
  return {typeDeclarations, valueDeclarations};
}
