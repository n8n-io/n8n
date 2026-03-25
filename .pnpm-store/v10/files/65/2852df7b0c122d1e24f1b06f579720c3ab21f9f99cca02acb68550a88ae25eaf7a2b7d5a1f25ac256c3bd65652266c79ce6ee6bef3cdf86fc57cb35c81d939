import {ContextualKeyword} from "../parser/tokenizer/keywords";
import {TokenType as tt} from "../parser/tokenizer/types";


/**
 * Starting at a potential `with` or (legacy) `assert` token, remove the import
 * attributes if they exist.
 */
export function removeMaybeImportAttributes(tokens) {
  if (
    tokens.matches2(tt._with, tt.braceL) ||
    (tokens.matches2(tt.name, tt.braceL) && tokens.matchesContextual(ContextualKeyword._assert))
  ) {
    // assert
    tokens.removeToken();
    // {
    tokens.removeToken();
    tokens.removeBalancedCode();
    // }
    tokens.removeToken();
  }
}
