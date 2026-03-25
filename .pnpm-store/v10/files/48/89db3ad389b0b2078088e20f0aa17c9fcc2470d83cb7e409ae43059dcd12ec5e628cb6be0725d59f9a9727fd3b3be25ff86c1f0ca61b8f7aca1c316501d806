import $Refs from "./refs.js";
import _parse from "./parse.js";
import normalizeArgs from "./normalize-args.js";
import resolveExternal from "./resolve-external.js";
import _bundle from "./bundle.js";
import _dereference from "./dereference.js";
import * as url from "./util/url.js";
import {
  JSONParserError,
  InvalidPointerError,
  MissingPointerError,
  ResolverError,
  ParserError,
  UnmatchedParserError,
  UnmatchedResolverError,
  isHandledError,
  JSONParserErrorGroup,
} from "./util/errors.js";
import { ono } from "@jsdevtools/ono";
import maybe from "./util/maybe.js";
import type { ParserOptions } from "./options.js";
import { getJsonSchemaRefParserDefaultOptions } from "./options.js";
import type {
  $RefsCallback,
  JSONSchema,
  SchemaCallback,
  FileInfo,
  Plugin,
  ResolverOptions,
  HTTPResolverOptions,
} from "./types/index.js";

export type RefParserSchema = string | JSONSchema;

/**
 * This class parses a JSON schema, builds a map of its JSON references and their resolved values,
 * and provides methods for traversing, manipulating, and dereferencing those references.
 *
 * @class
 */
export class $RefParser<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
  /**
   * The parsed (and possibly dereferenced) JSON schema object
   *
   * @type {object}
   * @readonly
   */
  public schema: S | null = null;

  /**
   * The resolved JSON references
   *
   * @type {$Refs}
   * @readonly
   */
  $refs = new $Refs<S, O>();

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
  public parse(schema: S | string | unknown): Promise<S>;
  public parse(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
  public parse(schema: S | string | unknown, options: O): Promise<S>;
  public parse(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
  public parse(path: string, schema: S | string | unknown, options: O): Promise<S>;
  public parse(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
  async parse() {
    const args = normalizeArgs<S, O>(arguments as any);
    let promise;

    if (!args.path && !args.schema) {
      const err = ono(`Expected a file path, URL, or object. Got ${args.path || args.schema}`);
      return maybe(args.callback, Promise.reject(err));
    }

    // Reset everything
    this.schema = null;
    this.$refs = new $Refs();

    // If the path is a filesystem path, then convert it to a URL.
    // NOTE: According to the JSON Reference spec, these should already be URLs,
    // but, in practice, many people use local filesystem paths instead.
    // So we're being generous here and doing the conversion automatically.
    // This is not intended to be a 100% bulletproof solution.
    // If it doesn't work for your use-case, then use a URL instead.
    let pathType = "http";
    if (url.isFileSystemPath(args.path)) {
      args.path = url.fromFileSystemPath(args.path);
      pathType = "file";
    } else if (!args.path && args.schema && "$id" in args.schema && args.schema.$id) {
      // when schema id has defined an URL should use that hostname to request the references,
      // instead of using the current page URL
      const params = url.parse(args.schema.$id as string);
      const port = params.protocol === "https:" ? 443 : 80;

      args.path = `${params.protocol}//${params.hostname}:${port}`;
    }

    // Resolve the absolute path of the schema
    args.path = url.resolve(url.cwd(), args.path);

    if (args.schema && typeof args.schema === "object") {
      // A schema object was passed-in.
      // So immediately add a new $Ref with the schema object as its value
      const $ref = this.$refs._add(args.path);
      $ref.value = args.schema;
      $ref.pathType = pathType;
      promise = Promise.resolve(args.schema);
    } else {
      // Parse the schema file/url
      promise = _parse<S, typeof args.options>(args.path, this.$refs, args.options);
    }

    try {
      const result = await promise;

      if (result !== null && typeof result === "object" && !Buffer.isBuffer(result)) {
        this.schema = result;
        return maybe(args.callback, Promise.resolve(this.schema!));
      } else if (args.options.continueOnError) {
        this.schema = null; // it's already set to null at line 79, but let's set it again for the sake of readability
        return maybe(args.callback, Promise.resolve(this.schema!));
      } else {
        throw ono.syntax(`"${this.$refs._root$Ref.path || result}" is not a valid JSON Schema`);
      }
    } catch (err) {
      if (!args.options.continueOnError || !isHandledError(err)) {
        return maybe(args.callback, Promise.reject(err));
      }

      if (this.$refs._$refs[url.stripHash(args.path)]) {
        this.$refs._$refs[url.stripHash(args.path)].addError(err);
      }

      return maybe(args.callback, Promise.resolve(null));
    }
  }

  public static parse<S extends object = JSONSchema>(schema: S | string | unknown): Promise<S>;
  public static parse<S extends object = JSONSchema>(
    schema: S | string | unknown,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>():
    | Promise<S>
    | Promise<void> {
    const parser = new $RefParser<S, O>();
    return parser.parse.apply(parser, arguments as any);
  }

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
  public resolve(schema: S | string | unknown): Promise<$Refs<S, O>>;
  public resolve(schema: S | string | unknown, callback: $RefsCallback<S, O>): Promise<void>;
  public resolve(schema: S | string | unknown, options: O): Promise<$Refs<S, O>>;
  public resolve(schema: S | string | unknown, options: O, callback: $RefsCallback<S, O>): Promise<void>;
  public resolve(path: string, schema: S | string | unknown, options: O): Promise<$Refs<S, O>>;
  public resolve(path: string, schema: S | string | unknown, options: O, callback: $RefsCallback<S, O>): Promise<void>;
  async resolve() {
    const args = normalizeArgs<S, O>(arguments);

    try {
      await this.parse(args.path, args.schema, args.options);
      await resolveExternal(this, args.options);
      finalize(this);
      return maybe(args.callback, Promise.resolve(this.$refs));
    } catch (err) {
      return maybe(args.callback, Promise.reject(err));
    }
  }

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
  public static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
  ): Promise<$Refs<S, O>>;
  public static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    callback: $RefsCallback<S, O>,
  ): Promise<void>;
  public static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<$Refs<S, O>>;
  public static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: $RefsCallback<S, O>,
  ): Promise<void>;
  public static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<$Refs<S, O>>;
  public static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: $RefsCallback<S, O>,
  ): Promise<void>;
  static resolve<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>():
    | Promise<S>
    | Promise<void> {
    const instance = new $RefParser<S, O>();
    return instance.resolve.apply(instance, arguments as any);
  }

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
  public static bundle<S extends object = JSONSchema>(schema: S | string | unknown): Promise<S>;
  public static bundle<S extends object = JSONSchema>(
    schema: S | string | unknown,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<S>;
  static bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>():
    | Promise<S>
    | Promise<void> {
    const instance = new $RefParser<S, O>();
    return instance.bundle.apply(instance, arguments as any);
  }

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
  public bundle(schema: S | string | unknown): Promise<S>;
  public bundle(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
  public bundle(schema: S | string | unknown, options: O): Promise<S>;
  public bundle(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
  public bundle(path: string, schema: S | string | unknown, options: O): Promise<S>;
  public bundle(path: string, schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
  async bundle() {
    const args = normalizeArgs<S, O>(arguments);
    try {
      await this.resolve(args.path, args.schema, args.options);
      _bundle<S, O>(this, args.options);
      finalize(this);
      return maybe(args.callback, Promise.resolve(this.schema!));
    } catch (err) {
      return maybe(args.callback, Promise.reject(err));
    }
  }

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
  public static dereference<S extends object = JSONSchema>(schema: S | string | unknown): Promise<S>;
  public static dereference<S extends object = JSONSchema>(
    schema: S | string | unknown,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>():
    | Promise<S>
    | Promise<void> {
    const instance = new $RefParser<S, O>();
    return instance.dereference.apply(instance, arguments as any);
  }

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
  public dereference(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public dereference(schema: S | string | unknown, options: O, callback: SchemaCallback<S>): Promise<void>;
  public dereference(schema: S | string | unknown, callback: SchemaCallback<S>): Promise<void>;
  public dereference(path: string, schema: S | string | unknown, options: O): Promise<S>;
  public dereference(schema: S | string | unknown, options: O): Promise<S>;
  public dereference(schema: S | string | unknown): Promise<S>;
  async dereference() {
    const args = normalizeArgs<S, O>(arguments);

    try {
      await this.resolve(args.path, args.schema, args.options);
      _dereference(this, args.options);
      finalize(this);
      return maybe<S>(args.callback, Promise.resolve(this.schema!) as Promise<S>);
    } catch (err) {
      return maybe<S>(args.callback, Promise.reject(err));
    }
  }
}
export default $RefParser;

function finalize<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parser: $RefParser<S, O>,
) {
  const errors = JSONParserErrorGroup.getParserErrors(parser);
  if (errors.length > 0) {
    throw new JSONParserErrorGroup(parser);
  }
}

export const parse = $RefParser.parse;
export const resolve = $RefParser.resolve;
export const bundle = $RefParser.bundle;
export const dereference = $RefParser.dereference;

export {
  UnmatchedResolverError,
  JSONParserError,
  JSONSchema,
  InvalidPointerError,
  MissingPointerError,
  ResolverError,
  ParserError,
  UnmatchedParserError,
  ParserOptions,
  $RefsCallback,
  isHandledError,
  JSONParserErrorGroup,
  SchemaCallback,
  FileInfo,
  Plugin,
  ResolverOptions,
  HTTPResolverOptions,
  _dereference as dereferenceInternal,
  normalizeArgs as jsonSchemaParserNormalizeArgs,
  getJsonSchemaRefParserDefaultOptions,
};
