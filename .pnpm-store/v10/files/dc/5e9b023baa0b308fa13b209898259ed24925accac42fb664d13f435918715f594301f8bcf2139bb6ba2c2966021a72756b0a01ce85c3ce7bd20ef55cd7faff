import type { ParserOptions } from "./options.js";
import $Ref from "./ref.js";
import type { JSONSchema } from "./types";
export declare const nullSymbol: unique symbol;
/**
 * This class represents a single JSON pointer and its resolved value.
 *
 * @param $ref
 * @param path
 * @param [friendlyPath] - The original user-specified path (used for error messages)
 * @class
 */
declare class Pointer<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
    /**
     * The {@link $Ref} object that contains this {@link Pointer} object.
     */
    $ref: $Ref<S, O>;
    /**
     * The file path or URL, containing the JSON pointer in the hash.
     * This path is relative to the path of the main JSON schema file.
     */
    path: string;
    /**
     * The original path or URL, used for error messages.
     */
    originalPath: string;
    /**
     * The value of the JSON pointer.
     * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
     */
    value: any;
    /**
     * Indicates whether the pointer references itself.
     */
    circular: boolean;
    /**
     * The number of indirect references that were traversed to resolve the value.
     * Resolving a single pointer may require resolving multiple $Refs.
     */
    indirections: number;
    constructor($ref: $Ref<S, O>, path: string, friendlyPath?: string);
    /**
     * Resolves the value of a nested property within the given object.
     *
     * @param obj - The object that will be crawled
     * @param options
     * @param pathFromRoot - the path of place that initiated resolving
     *
     * @returns
     * Returns a JSON pointer whose {@link Pointer#value} is the resolved value.
     * If resolving this value required resolving other JSON references, then
     * the {@link Pointer#$ref} and {@link Pointer#path} will reflect the resolution path
     * of the resolved value.
     */
    resolve(obj: S, options?: O, pathFromRoot?: string): this;
    /**
     * Sets the value of a nested property within the given object.
     *
     * @param obj - The object that will be crawled
     * @param value - the value to assign
     * @param options
     *
     * @returns
     * Returns the modified object, or an entirely new object if the entire object is overwritten.
     */
    set(obj: S, value: any, options?: O): any;
    /**
     * Parses a JSON pointer (or a path containing a JSON pointer in the hash)
     * and returns an array of the pointer's tokens.
     * (e.g. "schema.json#/definitions/person/name" => ["definitions", "person", "name"])
     *
     * The pointer is parsed according to RFC 6901
     * {@link https://tools.ietf.org/html/rfc6901#section-3}
     *
     * @param path
     * @param [originalPath]
     * @returns
     */
    static parse(path: string, originalPath?: string): string[];
    /**
     * Creates a JSON pointer path, by joining one or more tokens to a base path.
     *
     * @param base - The base path (e.g. "schema.json#/definitions/person")
     * @param tokens - The token(s) to append (e.g. ["name", "first"])
     * @returns
     */
    static join(base: string, tokens: string | string[]): string;
}
export default Pointer;
