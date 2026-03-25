import type $Refs from "./refs.js";
import type { ParserOptions } from "./options.js";
import type { JSONSchema } from "./types/index.js";
/**
 * Reads and parses the specified file path or URL.
 */
declare function parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, $refs: $Refs<S, O>, options: O): Promise<string | Buffer<ArrayBufferLike> | S | undefined>;
export default parse;
