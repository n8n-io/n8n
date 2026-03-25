import type {
  JSONSchema4,
  JSONSchema4Object,
  JSONSchema6,
  JSONSchema6Object,
  JSONSchema7,
  JSONSchema7Object,
} from "json-schema";
import type $Refs from "../refs.js";
import type { ParserOptions } from "../options";

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;
export type JSONSchemaObject = JSONSchema4Object | JSONSchema6Object | JSONSchema7Object;
export type SchemaCallback<S extends object = JSONSchema> = (err: Error | null, schema?: S | object | null) => any;
export type $RefsCallback<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> = (
  err: Error | null,
  $refs?: $Refs<S, O>,
) => any;

/**
 * See https://apitools.dev/json-schema-ref-parser/docs/options.html
 */

export interface HTTPResolverOptions<S extends object = JSONSchema> extends Partial<ResolverOptions<S>> {
  /**
   * You can specify any HTTP headers that should be sent when downloading files. For example, some servers may require you to set the `Accept` or `Referrer` header.
   */
  headers?: RequestInit["headers"] | null;

  /**
   * The amount of time (in milliseconds) to wait for a response from the server when downloading files. The default is 5 seconds.
   */
  timeout?: number;

  /**
   * The maximum number of HTTP redirects to follow per file. The default is 5. To disable automatic following of redirects, set this to zero.
   */
  redirects?: number;

  /**
   * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
   */
  withCredentials?: boolean;
}

/**
 * JSON Schema `$Ref` Parser comes with built-in resolvers for HTTP and HTTPS URLs, as well as local filesystem paths (when running in Node.js). You can add your own custom resolvers to support additional protocols, or even replace any of the built-in resolvers with your own custom implementation.
 *
 * See https://apitools.dev/json-schema-ref-parser/docs/plugins/resolvers.html
 */
export interface ResolverOptions<S extends object = JSONSchema> {
  name?: string;
  /**
   * All resolvers have an order property, even the built-in resolvers. If you don't specify an order property, then your resolver will run last. Specifying `order: 1`, like we did in this example, will make your resolver run first. Or you can squeeze your resolver in-between some of the built-in resolvers. For example, `order: 101` would make it run after the file resolver, but before the HTTP resolver. You can see the order of all the built-in resolvers by looking at their source code.
   *
   * The order property and canRead property are related to each other. For each file that JSON Schema $Ref Parser needs to resolve, it first determines which resolvers can read that file by checking their canRead property. If only one resolver matches a file, then only that one resolver is called, regardless of its order. If multiple resolvers match a file, then those resolvers are tried in order until one of them successfully reads the file. Once a resolver successfully reads the file, the rest of the resolvers are skipped.
   */
  order?: number;

  /**
   * The `canRead` property tells JSON Schema `$Ref` Parser what kind of files your resolver can read. In this example, we've simply specified a regular expression that matches "mogodb://" URLs, but we could have used a simple boolean, or even a function with custom logic to determine which files to resolve. Here are examples of each approach:
   */
  canRead: boolean | RegExp | string | string[] | ((file: FileInfo) => boolean);

  /**
   * This is where the real work of a resolver happens. The `read` method accepts the same file info object as the `canRead` function, but rather than returning a boolean value, the `read` method should return the contents of the file. The file contents should be returned in as raw a form as possible, such as a string or a byte array. Any further parsing or processing should be done by parsers.
   *
   * Unlike the `canRead` function, the `read` method can also be asynchronous. This might be important if your resolver needs to read data from a database or some other external source. You can return your asynchronous value using either an ES6 Promise or a Node.js-style error-first callback. Of course, if your resolver has the ability to return its data synchronously, then that's fine too. Here are examples of all three approaches:
   */
  read:
    | string
    | object
    | ((
        file: FileInfo,
        callback?: (error: Error | null, data: string | null) => any,
      ) => string | Buffer | S | Promise<string | Buffer | S>);
}

export interface Plugin {
  name?: string;
  /**
   * Parsers run in a specific order, relative to other parsers. For example, a parser with `order: 5` will run before a parser with `order: 10`. If a parser is unable to successfully parse a file, then the next parser is tried, until one succeeds or they all fail.
   *
   * You can change the order in which parsers run, which is useful if you know that most of your referenced files will be a certain type, or if you add your own custom parser that you want to run first.
   */
  order?: number;

  /**
   * All of the built-in parsers allow empty files by default. The JSON and YAML parsers will parse empty files as `undefined`. The text parser will parse empty files as an empty string. The binary parser will parse empty files as an empty byte array.
   *
   * You can set `allowEmpty: false` on any parser, which will cause an error to be thrown if a file empty.
   */
  allowEmpty?: boolean;

  /**
   * Specifies whether a Byte Order Mark (BOM) is allowed or not. Only applies to JSON parsing
   *
   * @type {boolean} @default true
   */
  allowBOM?: boolean;

  /**
   * The encoding that the text is expected to be in.
   */
  encoding?: BufferEncoding;
  /**
   * Determines which parsers will be used for which files.
   *
   * A regular expression can be used to match files by their full path. A string (or array of strings) can be used to match files by their file extension. Or a function can be used to perform more complex matching logic. See the custom parser docs for details.
   */
  canParse?: boolean | RegExp | string | string[] | ((file: FileInfo) => boolean);

  /**
   * This is where the real work of a parser happens. The `parse` method accepts the same file info object as the `canParse` function, but rather than returning a boolean value, the `parse` method should return a JavaScript representation of the file contents.  For our CSV parser, that is a two-dimensional array of lines and values.  For your parser, it might be an object, a string, a custom class, or anything else.
   *
   * Unlike the `canParse` function, the `parse` method can also be asynchronous. This might be important if your parser needs to retrieve data from a database or if it relies on an external HTTP service to return the parsed value.  You can return your asynchronous value via a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) or a Node.js-style error-first callback.  Here are examples of both approaches:
   */
  parse:
    | ((file: FileInfo, callback?: (error: Error | null, data: string | null) => any) => unknown | Promise<unknown>)
    | number
    | string;
}

/**
 * JSON Schema `$Ref` Parser supports plug-ins, such as resolvers and parsers. These plug-ins can have methods such as `canRead()`, `read()`, `canParse()`, and `parse()`. All of these methods accept the same object as their parameter: an object containing information about the file being read or parsed.
 *
 * The file info object currently only consists of a few properties, but it may grow in the future if plug-ins end up needing more information.
 *
 * See https://apitools.dev/json-schema-ref-parser/docs/plugins/file-info-object.html
 */
export interface FileInfo {
  /**
   * The full URL of the file. This could be any type of URL, including "http://", "https://", "file://", "ftp://", "mongodb://", or even a local filesystem path (when running in Node.js).
   */
  url: string;

  /**
   * The hash (URL fragment) of the file URL, including the # symbol. If the URL doesn't have a hash, then this will be an empty string.
   */
  hash: string;

  /**
   * The lowercase file extension, such as ".json", ".yaml", ".txt", etc.
   */
  extension: string;

  /**
   * The raw file contents, in whatever form they were returned by the resolver that read the file.
   */
  data: string | Buffer;
}
