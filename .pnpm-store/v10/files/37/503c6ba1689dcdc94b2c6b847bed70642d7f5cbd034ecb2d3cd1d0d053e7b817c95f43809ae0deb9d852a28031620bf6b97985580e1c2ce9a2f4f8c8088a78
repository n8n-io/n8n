import type { ParserOptions } from "./options.js";
import type { JSONSchema } from "./types/index.js";
import type $RefParser from "./index.js";
/**
 * Crawls the JSON schema, finds all external JSON references, and resolves their values.
 * This method does not mutate the JSON schema. The resolved values are added to {@link $RefParser#$refs}.
 *
 * NOTE: We only care about EXTERNAL references here. INTERNAL references are only relevant when dereferencing.
 *
 * @returns
 * The promise resolves once all JSON references in the schema have been resolved,
 * including nested references that are contained in externally-referenced files.
 */
declare function resolveExternal<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(parser: $RefParser<S, O>, options: O): Promise<void> | Promise<any[]>;
export default resolveExternal;
