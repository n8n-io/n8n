import jsonParser from "./parsers/json.js";
import yamlParser from "./parsers/yaml.js";
import textParser from "./parsers/text.js";
import binaryParser from "./parsers/binary.js";
import fileResolver from "./resolvers/file.js";
import httpResolver from "./resolvers/http.js";

import type { HTTPResolverOptions, JSONSchema, JSONSchemaObject, Plugin, ResolverOptions } from "./types/index.js";

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
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

export const getJsonSchemaRefParserDefaultOptions = () => {
  const defaults = {
    /**
     * Determines how different types of files will be parsed.
     *
     * You can add additional parsers of your own, replace an existing one with
     * your own implementation, or disable any parser by setting it to false.
     */
    parse: {
      json: { ...jsonParser },
      yaml: { ...yamlParser },
      text: { ...textParser },
      binary: { ...binaryParser },
    },

    /**
     * Determines how JSON References will be resolved.
     *
     * You can add additional resolvers of your own, replace an existing one with
     * your own implementation, or disable any resolver by setting it to false.
     */
    resolve: {
      file: { ...fileResolver },
      http: { ...httpResolver },

      /**
       * Determines whether external $ref pointers will be resolved.
       * If this option is disabled, then none of above resolvers will be called.
       * Instead, external $ref pointers will simply be ignored.
       *
       * @type {boolean}
       */
      external: true,
    },

    /**
     * By default, JSON Schema $Ref Parser throws the first error it encounters. Setting `continueOnError` to `true`
     * causes it to keep processing as much as possible and then throw a single error that contains all errors
     * that were encountered.
     */
    continueOnError: false,

    /**
     * Determines the types of JSON references that are allowed.
     */
    dereference: {
      /**
       * Dereference circular (recursive) JSON references?
       * If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
       * If "ignore", then circular references will not be dereferenced.
       *
       * @type {boolean|string}
       */
      circular: true,

      /**
       * A function, called for each path, which can return true to stop this path and all
       * subpaths from being dereferenced further. This is useful in schemas where some
       * subpaths contain literal $ref keys that should not be dereferenced.
       *
       * @type {function}
       */
      excludedPathMatcher: () => false,
      referenceResolution: "relative",
    },

    mutateInputSchema: true,
  } as $RefParserOptions<JSONSchema>;
  return defaults;
};

export const getNewOptions = <S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  options: O | undefined,
): O & $RefParserOptions<S> => {
  const newOptions = getJsonSchemaRefParserDefaultOptions();
  if (options) {
    merge(newOptions, options);
  }
  return newOptions as O & $RefParserOptions<S>;
};

export type Options<S extends object = JSONSchema> = $RefParserOptions<S>;
export type ParserOptions<S extends object = JSONSchema> = DeepPartial<$RefParserOptions<S>>;
/**
 * Merges the properties of the source object into the target object.
 *
 * @param target - The object that we're populating
 * @param source - The options that are being merged
 * @returns
 */
function merge(target: any, source: any) {
  if (isMergeable(source)) {
    // prevent prototype pollution
    const keys = Object.keys(source).filter((key) => !["__proto__", "constructor", "prototype"].includes(key));
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const sourceSetting = source[key];
      const targetSetting = target[key];

      if (isMergeable(sourceSetting)) {
        // It's a nested object, so merge it recursively
        target[key] = merge(targetSetting || {}, sourceSetting);
      } else if (sourceSetting !== undefined) {
        // It's a scalar value, function, or array. No merging necessary. Just overwrite the target value.
        target[key] = sourceSetting;
      }
    }
  }
  return target;
}
/**
 * Determines whether the given value can be merged,
 * or if it is a scalar value that should just override the target value.
 *
 * @param val
 * @returns
 */
function isMergeable(val: any) {
  return val && typeof val === "object" && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date);
}
export default $RefParserOptions;
