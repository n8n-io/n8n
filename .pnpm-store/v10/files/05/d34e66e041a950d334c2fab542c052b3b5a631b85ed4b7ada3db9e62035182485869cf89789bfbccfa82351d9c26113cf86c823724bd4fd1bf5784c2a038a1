import {ContextualKeyword} from "../parser/tokenizer/keywords";


/**
 * Determine whether this optional chain or nullish coalescing operation has any await statements in
 * it. If so, we'll need to transpile to an async operation.
 *
 * We compute this by walking the length of the operation and returning true if we see an await
 * keyword used as a real await (rather than an object key or property access). Nested optional
 * chain/nullish operations need to be tracked but don't silence await, but a nested async function
 * (or any other nested scope) will make the await not count.
 */
export default function isAsyncOperation(tokens) {
  let index = tokens.currentIndex();
  let depth = 0;
  const startToken = tokens.currentToken();
  do {
    const token = tokens.tokens[index];
    if (token.isOptionalChainStart) {
      depth++;
    }
    if (token.isOptionalChainEnd) {
      depth--;
    }
    depth += token.numNullishCoalesceStarts;
    depth -= token.numNullishCoalesceEnds;

    if (
      token.contextualKeyword === ContextualKeyword._await &&
      token.identifierRole == null &&
      token.scopeDepth === startToken.scopeDepth
    ) {
      return true;
    }
    index += 1;
  } while (depth > 0 && index < tokens.tokens.length);
  return false;
}
