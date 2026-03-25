import {ContextualKeyword} from "../parser/tokenizer/keywords";
import {TokenType as tt} from "../parser/tokenizer/types";


/**
 * Starting at `export {`, look ahead and return `true` if this is an
 * `export {...} from` statement and `false` if this is a plain multi-export.
 */
export default function isExportFrom(tokens) {
  let closeBraceIndex = tokens.currentIndex();
  while (!tokens.matches1AtIndex(closeBraceIndex, tt.braceR)) {
    closeBraceIndex++;
  }
  return (
    tokens.matchesContextualAtIndex(closeBraceIndex + 1, ContextualKeyword._from) &&
    tokens.matches1AtIndex(closeBraceIndex + 2, tt.string)
  );
}
