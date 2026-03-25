import $Refs from "./refs.js";
import normalizeArgs from "./normalize-args.js";
import _dereference from "./dereference.js";
import { JSONParserError, InvalidPointerError, MissingPointerError, ResolverError, ParserError, UnmatchedParserError, UnmatchedResolverError, isHandledError, JSONParserErrorGroup } from "./util/errors.js";
import type { ParserOptions } from "./options.js";
import { getJsonSchemaRefParserDefaultOptions } from "./options.js";
import type { $RefsCallback, JSONSchema, SchemaCallback, FileInfo, Plugin, ResolverOptions, HTTPResolverOptions } from "./types/index.js";
export type RefParserSchema = string | JSONSchema;
/**
 * This class parses a JSON schema, builds a map of its JSON references and their resolved values,
 * and provides methods for traversing, manipulating, and dereferencing those references.
 *
 * @class
 */
export declare class $RefParser<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
    /**
     * The parsed (and possibly dereferenced) JSON schema object
     *
     * @type {object}
     * @readonly
     */
    schema: S | null;
    /**
     * The resolved JSON references
     *
     * @type {$Refs}
     * @readonly
     */
    $refs: $Refs<S, O>;
    /**
     * Parses the given JSON schema.
     * This method does not resolve any JSON references.
     * It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
     *
     * @param [path] - The file path or URL of the JSON schema
     * @param [schema] - A JSON schema object. This object will be used instead of reading from `path`.
     * @param [options] - Options that determine how the schema is parsed
     * @param [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
     * @returns - The returned promise resolves with the parsed JSON schema object.
     */
    parse(schema: S | string | unknown): Promise<S>;
    parse(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
    parse(schema: S | string | unknown, options: O): Promise<S>;
    parse(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    parse(path: string, schema: S | string | unknown, options: O): Promise<S>;
    parse(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    static parse<S extends object = JSONSchema>(schema: S | string | unknown): Promise<S>;
    static parse<S extends object = JSONSchema>(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
    static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O): Promise<S>;
    static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O): Promise<S>;
    static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    /**
     * *This method is used internally by other methods, such as `bundle` and `dereference`. You probably won't need to call this method yourself.*
     *
     * Resolves all JSON references (`$ref` pointers) in the given JSON Schema file. If it references any other files/URLs, then they will be downloaded and resolved as well. This method **does not** dereference anything. It simply gives you a `$Refs` object, which is a map of all the resolved references and their values.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/ref-parser.html#resolveschema-options-callback
     *
     * @param schema A JSON Schema object, or the file path or URL of a JSON Schema file. See the `parse` method for more info.
     * @param options (optional)
     * @param callback (optional) A callback that will receive a `$Refs` object
     */
    resolve(schema: S | string | unknown): Promise<$Refs<S, O>>;
    resolve(schema: S | string | unknown, callback: $RefsCallback<S, O>): Promise<void>;
    resolve(schema: S | string | unknown, options: O): Promise<$Refs<S, O>>;
    resolve(schema: S | string | unknown, options: O, callback: $RefsCallback<S, O>): Promise<void>;
    resolve(path: string, schema: S | string | unknown, options: O): Promise<$Refs<S, O>>;
    resolve(path: string, schema: S | string | unknown, options: O, callback: $RefsCallback<S, O>): Promise<void>;
    /**
     * *This method is used internally by other methods, such as `bundle` and `dereference`. You probably won't need to call this method yourself.*
     *
     * Resolves all JSON references (`$ref` pointers) in the given JSON Schema file. If it references any other files/URLs, then they will be downloaded and resolved as well. This method **does not** dereference anything. It simply gives you a `$Refs` object, which is a map of all the resolved references and their values.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/ref-parser.html#resolveschema-options-callback
     *
     * @param schema A JSON Schema object, or the file path or URL of a JSON Schema file. See the `parse` method for more info.
     * @param options (optional)
     * @param callback (optional) A callback that will receive a `$Refs` object
     */
    static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown): Promise<$Refs<S, O>>;
    static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, callback: $RefsCallback<S, O>): Promise<void>;
    static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O): Promise<$Refs<S, O>>;
    static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O, callback: $RefsCallback<S, O>): Promise<void>;
    static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O): Promise<$Refs<S, O>>;
    static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O, callback: $RefsCallback<S, O>): Promise<void>;
    /**
     * Bundles all referenced files/URLs into a single schema that only has internal `$ref` pointers. This lets you split-up your schema however you want while you're building it, but easily combine all those files together when it's time to package or distribute the schema to other people. The resulting schema size will be small, since it will still contain internal JSON references rather than being fully-dereferenced.
     *
     * This also eliminates the risk of circular references, so the schema can be safely serialized using `JSON.stringify()`.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/ref-parser.html#bundleschema-options-callback
     *
     * @param schema A JSON Schema object, or the file path or URL of a JSON Schema file. See the `parse` method for more info.
     * @param options (optional)
     * @param callback (optional) A callback that will receive the bundled schema object
     */
    static bundle<S extends object = JSONSchema>(schema: S | string | unknown): Promise<S>;
    static bundle<S extends object = JSONSchema>(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
    static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O): Promise<S>;
    static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O): Promise<S>;
    static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<S>;
    /**
     * Bundles all referenced files/URLs into a single schema that only has internal `$ref` pointers. This lets you split-up your schema however you want while you're building it, but easily combine all those files together when it's time to package or distribute the schema to other people. The resulting schema size will be small, since it will still contain internal JSON references rather than being fully-dereferenced.
     *
     * This also eliminates the risk of circular references, so the schema can be safely serialized using `JSON.stringify()`.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/ref-parser.html#bundleschema-options-callback
     *
     * @param schema A JSON Schema object, or the file path or URL of a JSON Schema file. See the `parse` method for more info.
     * @param options (optional)
     * @param callback (optional) A callback that will receive the bundled schema object
     */
    bundle(schema: S | string | unknown): Promise<S>;
    bundle(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
    bundle(schema: S | string | unknown, options: O): Promise<S>;
    bundle(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    bundle(path: string, schema: S | string | unknown, options: O): Promise<S>;
    bundle(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    /**
     * Dereferences all `$ref` pointers in the JSON Schema, replacing each reference with its resolved value. This results in a schema object that does not contain any `$ref` pointers. Instead, it's a normal JavaScript object tree that can easily be crawled and used just like any other JavaScript object. This is great for programmatic usage, especially when using tools that don't understand JSON references.
     *
     * The dereference method maintains object reference equality, meaning that all `$ref` pointers that point to the same object will be replaced with references to the same object. Again, this is great for programmatic usage, but it does introduce the risk of circular references, so be careful if you intend to serialize the schema using `JSON.stringify()`. Consider using the bundle method instead, which does not create circular references.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/ref-parser.html#dereferenceschema-options-callback
     *
     * @param schema A JSON Schema object, or the file path or URL of a JSON Schema file. See the `parse` method for more info.
     * @param options (optional)
     * @param callback (optional) A callback that will receive the dereferenced schema object
     */
    static dereference<S extends object = JSONSchema>(schema: S | string | unknown): Promise<S>;
    static dereference<S extends object = JSONSchema>(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
    static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O): Promise<S>;
    static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O): Promise<S>;
    static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    /**
     * Dereferences all `$ref` pointers in the JSON Schema, replacing each reference with its resolved value. This results in a schema object that does not contain any `$ref` pointers. Instead, it's a normal JavaScript object tree that can easily be crawled and used just like any other JavaScript object. This is great for programmatic usage, especially when using tools that don't understand JSON references.
     *
     * The dereference method maintains object reference equality, meaning that all `$ref` pointers that point to the same object will be replaced with references to the same object. Again, this is great for programmatic usage, but it does introduce the risk of circular references, so be careful if you intend to serialize the schema using `JSON.stringify()`. Consider using the bundle method instead, which does not create circular references.
     *
     * See https://apitools.dev/json-schema-ref-parser/docs/ref-parser.html#dereferenceschema-options-callback
     *
     * @param path
     * @param schema A JSON Schema object, or the file path or URL of a JSON Schema file. See the `parse` method for more info.
     * @param options (optional)
     * @param callback (optional) A callback that will receive the dereferenced schema object
     */
    dereference(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    dereference(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
    dereference(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
    dereference(path: string, schema: S | string | unknown, options: O): Promise<S>;
    dereference(schema: S | string | unknown, options: O): Promise<S>;
    dereference(schema: S | string | unknown): Promise<S>;
}
export default $RefParser;
export declare const parse: typeof $RefParser.parse;
export declare const resolve: typeof $RefParser.resolve;
export declare const bundle: typeof $RefParser.bundle;
export declare const dereference: typeof $RefParser.dereference;
export { UnmatchedResolverError, JSONParserError, JSONSchema, InvalidPointerError, MissingPointerError, ResolverError, ParserError, UnmatchedParserError, ParserOptions, $RefsCallback, isHandledError, JSONParserErrorGroup, SchemaCallback, FileInfo, Plugin, ResolverOptions, HTTPResolverOptions, _dereference as dereferenceInternal, normalizeArgs as jsonSchemaParserNormalizeArgs, getJsonSchemaRefParserDefaultOptions, };
