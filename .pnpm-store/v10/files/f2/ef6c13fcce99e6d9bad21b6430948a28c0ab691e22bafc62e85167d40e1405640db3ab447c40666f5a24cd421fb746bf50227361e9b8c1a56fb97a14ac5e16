
import {TokenType as tt} from "../parser/tokenizer/types";

/**
 * Get all identifier names in the code, in order, including duplicates.
 */
export default function getIdentifierNames(code, tokens) {
  const names = [];
  for (const token of tokens) {
    if (token.type === tt.name) {
      names.push(code.slice(token.start, token.end));
    }
  }
  return names;
}
