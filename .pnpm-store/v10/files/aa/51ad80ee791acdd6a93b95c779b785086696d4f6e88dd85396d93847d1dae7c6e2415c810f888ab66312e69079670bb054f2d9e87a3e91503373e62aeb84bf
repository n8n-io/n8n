import type { ParserOptions } from "./options.js";
import type { JSONSchema } from "./types";
import type $RefParser from "./index";
export default dereference;
/**
 * Crawls the JSON schema, finds all JSON references, and dereferences them.
 * This method mutates the JSON schema object, replacing JSON references with their resolved value.
 *
 * @param parser
 * @param options
 */
declare function dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(parser: $RefParser<S, O>, options: O): void;
