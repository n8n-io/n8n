import type { FileInfo, JSONSchema } from "../types/index.js";
import type { ParserOptions } from "../options.js";
import type { ResolverOptions } from "../types/index.js";
import type $Refs from "../refs.js";
import type { Plugin } from "../types/index.js";
/**
 * Returns the given plugins as an array, rather than an object map.
 * All other methods in this module expect an array of plugins rather than an object map.
 *
 * @returns
 */
export declare function all<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(plugins: O["resolve"]): Plugin[];
/**
 * Filters the given plugins, returning only the ones return `true` for the given method.
 */
export declare function filter(plugins: Plugin[], method: any, file: any): Plugin[];
/**
 * Sorts the given plugins, in place, by their `order` property.
 */
export declare function sort(plugins: Plugin[]): Plugin[];
export interface PluginResult<S extends object = JSONSchema> {
    plugin: Plugin;
    result?: string | Buffer | S;
    error?: any;
}
/**
 * Runs the specified method of the given plugins, in order, until one of them returns a successful result.
 * Each method can return a synchronous value, a Promise, or call an error-first callback.
 * If the promise resolves successfully, or the callback is called without an error, then the result
 * is immediately returned and no further plugins are called.
 * If the promise rejects, or the callback is called with an error, then the next plugin is called.
 * If ALL plugins fail, then the last error is thrown.
 */
export declare function run<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(plugins: Plugin[], method: keyof Plugin | keyof ResolverOptions<S>, file: FileInfo, $refs: $Refs<S, O>): Promise<PluginResult<S>>;
