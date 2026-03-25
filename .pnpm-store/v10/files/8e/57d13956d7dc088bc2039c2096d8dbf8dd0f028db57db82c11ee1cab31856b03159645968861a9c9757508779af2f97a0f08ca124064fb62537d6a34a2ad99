export const COMPLETABLE_SYMBOL = Symbol.for('mcp.completable');
/**
 * Wraps a Zod type to provide autocompletion capabilities. Useful for, e.g., prompt arguments in MCP.
 * Works with both Zod v3 and v4 schemas.
 */
export function completable(schema, complete) {
    Object.defineProperty(schema, COMPLETABLE_SYMBOL, {
        value: { complete },
        enumerable: false,
        writable: false,
        configurable: false
    });
    return schema;
}
/**
 * Checks if a schema is completable (has completion metadata).
 */
export function isCompletable(schema) {
    return !!schema && typeof schema === 'object' && COMPLETABLE_SYMBOL in schema;
}
/**
 * Gets the completer callback from a completable schema, if it exists.
 */
export function getCompleter(schema) {
    const meta = schema[COMPLETABLE_SYMBOL];
    return meta?.complete;
}
/**
 * Unwraps a completable schema to get the underlying schema.
 * For backward compatibility with code that called `.unwrap()`.
 */
export function unwrapCompletable(schema) {
    return schema;
}
// Legacy exports for backward compatibility
// These types are deprecated but kept for existing code
export var McpZodTypeKind;
(function (McpZodTypeKind) {
    McpZodTypeKind["Completable"] = "McpCompletable";
})(McpZodTypeKind || (McpZodTypeKind = {}));
//# sourceMappingURL=completable.js.map