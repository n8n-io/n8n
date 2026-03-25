import $Ref from "./ref.js";
import type { JSONSchema4Type, JSONSchema6Type, JSONSchema7Type } from "json-schema";
import type { ParserOptions } from "./options.js";
import type { JSONSchema } from "./types";
interface $RefsMap<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
    [url: string]: $Ref<S, O>;
}
/**
 * When you call the resolve method, the value that gets passed to the callback function (or Promise) is a $Refs object. This same object is accessible via the parser.$refs property of $RefParser objects.
 *
 * This object is a map of JSON References and their resolved values. It also has several convenient helper methods that make it easy for you to navigate and manipulate the JSON References.
 *
 * See https://apitools.dev/json-schema-ref-parser/docs/refs.html
 */
export default class $Refs<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
    /**
     * This property is true if the schema contains any circular references. You may want to check this property before serializing the dereferenced schema as JSON, since JSON.stringify() does not support circular references by default.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#circular
     */
    circular: boolean;
    /**
     * Returns the paths/URLs of all the files in your schema (including the main schema file).
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#pathstypes
     *
     * @param types (optional) Optionally only return certain types of paths ("file", "http", etc.)
     */
    paths(...types: (string | string[])[]): string[];
    /**
     * Returns a map of paths/URLs and their correspond values.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#valuestypes
     *
     * @param types (optional) Optionally only return values from certain locations ("file", "http", etc.)
     */
    values(...types: (string | string[])[]): S;
    /**
     * Returns `true` if the given path exists in the schema; otherwise, returns `false`
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#existsref
     *
     * @param $ref The JSON Reference path, optionally with a JSON Pointer in the hash
     */
    /**
     * Determines whether the given JSON reference exists.
     *
     * @param path - The path being resolved, optionally with a JSON pointer in the hash
     * @param [options]
     * @returns
     */
    exists(path: string, options: any): boolean;
    /**
     * Resolves the given JSON reference and returns the resolved value.
     *
     * @param path - The path being resolved, with a JSON pointer in the hash
     * @param [options]
     * @returns - Returns the resolved value
     */
    get(path: string, options?: O): JSONSchema4Type | JSONSchema6Type | JSONSchema7Type;
    /**
     * Sets the value at the given path in the schema. If the property, or any of its parents, don't exist, they will be created.
     *
     * @param path The JSON Reference path, optionally with a JSON Pointer in the hash
     * @param value The value to assign. Can be anything (object, string, number, etc.)
     */
    set(path: string, value: JSONSchema4Type | JSONSchema6Type | JSONSchema7Type): void;
    /**
     * Returns the specified {@link $Ref} object, or undefined.
     *
     * @param path - The path being resolved, optionally with a JSON pointer in the hash
     * @returns
     * @protected
     */
    _get$Ref(path: string): $Ref<S, O>;
    /**
     * Creates a new {@link $Ref} object and adds it to this {@link $Refs} object.
     *
     * @param path  - The file path or URL of the referenced file
     */
    _add(path: string): $Ref<S, O>;
    /**
     * Resolves the given JSON reference.
     *
     * @param path - The path being resolved, optionally with a JSON pointer in the hash
     * @param pathFromRoot - The path of `obj` from the schema root
     * @param [options]
     * @returns
     * @protected
     */
    _resolve(path: string, pathFromRoot: string, options?: O): import("./pointer.js").default<S, O> | null;
    /**
     * A map of paths/urls to {@link $Ref} objects
     *
     * @type {object}
     * @protected
     */
    _$refs: $RefsMap<S, O>;
    /**
     * The {@link $Ref} object that is the root of the JSON schema.
     *
     * @type {$Ref}
     * @protected
     */
    _root$Ref: $Ref<S, O>;
    constructor();
    /**
     * Returns the paths of all the files/URLs that are referenced by the JSON schema,
     * including the schema itself.
     *
     * @param [types] - Only return paths of the given types ("file", "http", etc.)
     * @returns
     */
    /**
     * Returns the map of JSON references and their resolved values.
     *
     * @param [types] - Only return references of the given types ("file", "http", etc.)
     * @returns
     */
    /**
     * Returns a POJO (plain old JavaScript object) for serialization as JSON.
     *
     * @returns {object}
     */
    toJSON: (...types: (string | string[])[]) => S;
}
export {};
