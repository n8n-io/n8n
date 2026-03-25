"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpZodTypeKind = exports.COMPLETABLE_SYMBOL = void 0;
exports.completable = completable;
exports.isCompletable = isCompletable;
exports.getCompleter = getCompleter;
exports.unwrapCompletable = unwrapCompletable;
exports.COMPLETABLE_SYMBOL = Symbol.for('mcp.completable');
/**
 * Wraps a Zod type to provide autocompletion capabilities. Useful for, e.g., prompt arguments in MCP.
 * Works with both Zod v3 and v4 schemas.
 */
function completable(schema, complete) {
    Object.defineProperty(schema, exports.COMPLETABLE_SYMBOL, {
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
function isCompletable(schema) {
    return !!schema && typeof schema === 'object' && exports.COMPLETABLE_SYMBOL in schema;
}
/**
 * Gets the completer callback from a completable schema, if it exists.
 */
function getCompleter(schema) {
    const meta = schema[exports.COMPLETABLE_SYMBOL];
    return meta?.complete;
}
/**
 * Unwraps a completable schema to get the underlying schema.
 * For backward compatibility with code that called `.unwrap()`.
 */
function unwrapCompletable(schema) {
    return schema;
}
// Legacy exports for backward compatibility
// These types are deprecated but kept for existing code
var McpZodTypeKind;
(function (McpZodTypeKind) {
    McpZodTypeKind["Completable"] = "McpCompletable";
})(McpZodTypeKind || (exports.McpZodTypeKind = McpZodTypeKind = {}));
//# sourceMappingURL=completable.js.map