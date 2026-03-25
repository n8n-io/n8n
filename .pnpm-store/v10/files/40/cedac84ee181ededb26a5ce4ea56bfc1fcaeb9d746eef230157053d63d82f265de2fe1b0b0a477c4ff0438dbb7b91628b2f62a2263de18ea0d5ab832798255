import type { Options, ParserOptions } from "./options.js";
import type { JSONSchema, SchemaCallback } from "./types";
export interface NormalizedArguments<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
    path: string;
    schema: S;
    options: O & Options<S>;
    callback: SchemaCallback<S>;
}
/**
 * Normalizes the given arguments, accounting for optional args.
 */
export declare function normalizeArgs<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(_args: Partial<IArguments>): NormalizedArguments<S, O>;
export default normalizeArgs;
