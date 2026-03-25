import type TokenProcessor from "../TokenProcessor";
/**
 * Determine whether this optional chain or nullish coalescing operation has any await statements in
 * it. If so, we'll need to transpile to an async operation.
 *
 * We compute this by walking the length of the operation and returning true if we see an await
 * keyword used as a real await (rather than an object key or property access). Nested optional
 * chain/nullish operations need to be tracked but don't silence await, but a nested async function
 * (or any other nested scope) will make the await not count.
 */
export default function isAsyncOperation(tokens: TokenProcessor): boolean;
