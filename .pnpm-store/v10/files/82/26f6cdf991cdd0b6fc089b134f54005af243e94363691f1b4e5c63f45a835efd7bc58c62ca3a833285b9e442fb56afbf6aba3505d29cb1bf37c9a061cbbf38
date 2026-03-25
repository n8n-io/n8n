import { AnySchema, SchemaInput } from './zod-compat.js';
export declare const COMPLETABLE_SYMBOL: unique symbol;
export type CompleteCallback<T extends AnySchema = AnySchema> = (value: SchemaInput<T>, context?: {
    arguments?: Record<string, string>;
}) => SchemaInput<T>[] | Promise<SchemaInput<T>[]>;
export type CompletableMeta<T extends AnySchema = AnySchema> = {
    complete: CompleteCallback<T>;
};
export type CompletableSchema<T extends AnySchema> = T & {
    [COMPLETABLE_SYMBOL]: CompletableMeta<T>;
};
/**
 * Wraps a Zod type to provide autocompletion capabilities. Useful for, e.g., prompt arguments in MCP.
 * Works with both Zod v3 and v4 schemas.
 */
export declare function completable<T extends AnySchema>(schema: T, complete: CompleteCallback<T>): CompletableSchema<T>;
/**
 * Checks if a schema is completable (has completion metadata).
 */
export declare function isCompletable(schema: unknown): schema is CompletableSchema<AnySchema>;
/**
 * Gets the completer callback from a completable schema, if it exists.
 */
export declare function getCompleter<T extends AnySchema>(schema: T): CompleteCallback<T> | undefined;
/**
 * Unwraps a completable schema to get the underlying schema.
 * For backward compatibility with code that called `.unwrap()`.
 */
export declare function unwrapCompletable<T extends AnySchema>(schema: CompletableSchema<T>): T;
export declare enum McpZodTypeKind {
    Completable = "McpCompletable"
}
export interface CompletableDef<T extends AnySchema = AnySchema> {
    type: T;
    complete: CompleteCallback<T>;
    typeName: McpZodTypeKind.Completable;
}
//# sourceMappingURL=completable.d.ts.map