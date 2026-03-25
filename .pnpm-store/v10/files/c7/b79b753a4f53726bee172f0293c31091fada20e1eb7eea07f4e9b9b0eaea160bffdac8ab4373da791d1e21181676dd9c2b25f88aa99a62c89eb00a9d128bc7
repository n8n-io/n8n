import type { HTTPResolverOptions, JSONSchema, JSONSchemaObject, Plugin, ResolverOptions } from "./types/index.js";
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
export interface DereferenceOptions {
    /**
     * Determines whether circular `$ref` pointers are handled.
     *
     * If set to `false`, then a `ReferenceError` will be thrown if the schema contains any circular references.
     *
     * If set to `"ignore"`, then circular references will simply be ignored. No error will be thrown, but the `$Refs.circular` property will still be set to `true`.
     */
    circular?: boolean | "ignore";
    /**
     * A function, called for each path, which can return true to stop this path and all
     * subpaths from being dereferenced further. This is useful in schemas where some
     * subpaths contain literal $ref keys that should not be dereferenced.
     */
    excludedPathMatcher?(path: string): boolean;
    /**
     * Callback invoked during circular reference detection.
     *
     * @argument {string} path - The path that is circular (ie. the `$ref` string)
     */
    onCircular?(path: string): void;
    /**
     * Callback invoked during dereferencing.
     *
     * @argument {string} path - The path being dereferenced (ie. the `$ref` string)
     * @argument {JSONSchemaObject} value - The JSON-Schema that the `$ref` resolved to
     * @argument {JSONSchemaObject} parent - The parent of the dereferenced object
     * @argument {string} parentPropName - The prop name of the parent object whose value was dereferenced
     */
    onDereference?(path: string, value: JSONSchemaObject, parent?: JSONSchemaObject, parentPropName?: string): void;
    /**
     * An array of properties to preserve when dereferencing a `$ref` schema. Useful if you want to
     * enforce non-standard dereferencing behavior like present in the OpenAPI 3.1 specification where
     * `description` and `summary` properties are preserved when alongside a `$ref` pointer.
     *
     * If none supplied then no properties will be preserved and the object will be fully replaced
     * with the dereferenced `$ref`.
     */
    preservedProperties?: string[];
    /**
     * Whether a reference should resolve relative to its directory/path, or from the cwd
     *
     * Default: `relative`
     */
    externalReferenceResolution?: "relative" | "root";
}
/**
 * Options that determine how JSON schemas are parsed, resolved, and dereferenced.
 *
 * @param [options] - Overridden options
 * @class
 */
export interface $RefParserOptions<S extends object = JSONSchema> {
    /**
     * The `parse` options determine how different types of files will be parsed.
     *
     * JSON Schema `$Ref` Parser comes with built-in JSON, YAML, plain-text, and binary parsers, any of which you can configure or disable. You can also add your own custom parsers if you want.
     */
    parse: {
        json?: Plugin | boolean;
        yaml?: Plugin | boolean;
        binary?: Plugin | boolean;
        text?: Plugin | boolean;
        [key: string]: Plugin | boolean | undefined;
    };
    /**
     * The `resolve` options control how JSON Schema $Ref Parser will resolve file paths and URLs, and how those files will be read/downloaded.
     *
     * JSON Schema `$Ref` Parser comes with built-in support for HTTP and HTTPS, as well as support for local files (when running in Node.js). You can configure or disable either of these built-in resolvers. You can also add your own custom resolvers if you want.
     */
    resolve: {
        /**
         * Determines whether external $ref pointers will be resolved. If this option is disabled, then external `$ref` pointers will simply be ignored.
         */
        external?: boolean;
        file?: Partial<ResolverOptions<S>> | boolean;
        http?: HTTPResolverOptions<S> | boolean;
    } & {
        [key: string]: Partial<ResolverOptions<S>> | HTTPResolverOptions<S> | boolean | undefined;
    };
    /**
     * By default, JSON Schema $Ref Parser throws the first error it encounters. Setting `continueOnError` to `true`
     * causes it to keep processing as much as possible and then throw a single error that contains all errors
     * that were encountered.
     */
    continueOnError: boolean;
    /**
     * The `dereference` options control how JSON Schema `$Ref` Parser will dereference `$ref` pointers within the JSON schema.
     */
    dereference: DereferenceOptions;
    /**
     * Whether to clone the schema before dereferencing it.
     * This is useful when you want to dereference the same schema multiple times, but you don't want to modify the original schema.
     * Default: `true` due to mutating the input being the default behavior historically
     */
    mutateInputSchema?: boolean;
    /**
     * The maximum amount of time (in milliseconds) that JSON Schema $Ref Parser will spend dereferencing a single schema.
     * It will throw a timeout error if the operation takes longer than this.
     */
    timeoutMs?: number;
}
export declare const getJsonSchemaRefParserDefaultOptions: () => $RefParserOptions<JSONSchema>;
export declare const getNewOptions: <S extends object = JSONSchema, O extends ParserOptions<S> = {
    parse?: {
        [x: string]: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            allowEmpty?: boolean | undefined;
            allowBOM?: boolean | undefined;
            encoding?: BufferEncoding | undefined;
            canParse?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            parse?: string | number | {} | undefined;
        } | undefined;
        json?: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            allowEmpty?: boolean | undefined;
            allowBOM?: boolean | undefined;
            encoding?: BufferEncoding | undefined;
            canParse?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            parse?: string | number | {} | undefined;
        } | undefined;
        yaml?: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            allowEmpty?: boolean | undefined;
            allowBOM?: boolean | undefined;
            encoding?: BufferEncoding | undefined;
            canParse?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            parse?: string | number | {} | undefined;
        } | undefined;
        binary?: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            allowEmpty?: boolean | undefined;
            allowBOM?: boolean | undefined;
            encoding?: BufferEncoding | undefined;
            canParse?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            parse?: string | number | {} | undefined;
        } | undefined;
        text?: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            allowEmpty?: boolean | undefined;
            allowBOM?: boolean | undefined;
            encoding?: BufferEncoding | undefined;
            canParse?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            parse?: string | number | {} | undefined;
        } | undefined;
    } | undefined;
    resolve?: {
        [x: string]: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            canRead?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            read?: string | object | {} | undefined;
        } | {
            headers?: ([(string | undefined)?, (string | undefined)?] | undefined)[] | {
                [x: string]: string | undefined;
            } | {
                append?: {} | undefined;
                delete?: {} | undefined;
                get?: {} | undefined;
                getSetCookie?: {} | undefined;
                has?: {} | undefined;
                set?: {} | undefined;
                forEach?: {} | undefined;
            } | null | undefined;
            timeout?: number | undefined;
            redirects?: number | undefined;
            withCredentials?: boolean | undefined;
            name?: string | undefined;
            order?: number | undefined;
            canRead?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            read?: string | object | {} | undefined;
        } | undefined;
        external?: boolean | undefined;
        file?: boolean | {
            name?: string | undefined;
            order?: number | undefined;
            canRead?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            read?: string | object | {} | undefined;
        } | undefined;
        http?: boolean | {
            headers?: ([(string | undefined)?, (string | undefined)?] | undefined)[] | {
                [x: string]: string | undefined;
            } | {
                append?: {} | undefined;
                delete?: {} | undefined;
                get?: {} | undefined;
                getSetCookie?: {} | undefined;
                has?: {} | undefined;
                set?: {} | undefined;
                forEach?: {} | undefined;
            } | null | undefined;
            timeout?: number | undefined;
            redirects?: number | undefined;
            withCredentials?: boolean | undefined;
            name?: string | undefined;
            order?: number | undefined;
            canRead?: string | boolean | {
                exec?: {} | undefined;
                test?: {} | undefined;
                readonly source?: string | undefined;
                readonly global?: boolean | undefined;
                readonly ignoreCase?: boolean | undefined;
                readonly multiline?: boolean | undefined;
                lastIndex?: number | undefined;
                compile?: {} | undefined;
                readonly flags?: string | undefined;
                readonly sticky?: boolean | undefined;
                readonly unicode?: boolean | undefined;
                readonly dotAll?: boolean | undefined;
                readonly hasIndices?: boolean | undefined;
                readonly unicodeSets?: boolean | undefined;
                [Symbol.match]?: {} | undefined;
                [Symbol.replace]?: {} | undefined;
                [Symbol.search]?: {} | undefined;
                [Symbol.split]?: {} | undefined;
                [Symbol.matchAll]?: {} | undefined;
            } | (string | undefined)[] | {} | undefined;
            read?: string | object | {} | undefined;
        } | undefined;
    } | undefined;
    continueOnError?: boolean | undefined;
    dereference?: {
        circular?: boolean | "ignore" | undefined;
        excludedPathMatcher?: {} | undefined;
        onCircular?: {} | undefined;
        onDereference?: {} | undefined;
        preservedProperties?: (string | undefined)[] | undefined;
        externalReferenceResolution?: "relative" | "root" | undefined;
    } | undefined;
    mutateInputSchema?: boolean | undefined;
    timeoutMs?: number | undefined;
}>(options: O | undefined) => O & $RefParserOptions<S>;
export type Options<S extends object = JSONSchema> = $RefParserOptions<S>;
export type ParserOptions<S extends object = JSONSchema> = DeepPartial<$RefParserOptions<S>>;
export default $RefParserOptions;
