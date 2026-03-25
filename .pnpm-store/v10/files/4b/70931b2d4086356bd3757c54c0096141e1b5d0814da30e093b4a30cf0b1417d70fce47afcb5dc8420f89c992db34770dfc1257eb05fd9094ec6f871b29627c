import { ono } from "@jsdevtools/ono";
import * as url from "./util/url.js";
import * as plugins from "./util/plugins.js";
import {
  ResolverError,
  ParserError,
  UnmatchedParserError,
  UnmatchedResolverError,
  isHandledError,
} from "./util/errors.js";
import type $Refs from "./refs.js";
import type { ParserOptions } from "./options.js";
import type { FileInfo, JSONSchema } from "./types/index.js";

/**
 * Reads and parses the specified file path or URL.
 */
async function parse<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  path: string,
  $refs: $Refs<S, O>,
  options: O,
) {
  // Remove the URL fragment, if any
  const hashIndex = path.indexOf("#");
  let hash = "";
  if (hashIndex >= 0) {
    hash = path.substring(hashIndex);
    // Remove the URL fragment, if any
    path = path.substring(0, hashIndex);
  }

  // Add a new $Ref for this file, even though we don't have the value yet.
  // This ensures that we don't simultaneously read & parse the same file multiple times
  const $ref = $refs._add(path);

  // This "file object" will be passed to all resolvers and parsers.
  const file = {
    url: path,
    hash,
    extension: url.getExtension(path),
  } as FileInfo;

  // Read the file and then parse the data
  try {
    const resolver = await readFile<S, O>(file, options, $refs);
    $ref.pathType = resolver.plugin.name;
    file.data = resolver.result;

    const parser = await parseFile<S, O>(file, options, $refs);
    $ref.value = parser.result;

    return parser.result;
  } catch (err) {
    if (isHandledError(err)) {
      $ref.value = err;
    }

    throw err;
  }
}

/**
 * Reads the given file, using the configured resolver plugins
 *
 * @param file           - An object containing information about the referenced file
 * @param file.url       - The full URL of the referenced file
 * @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param options
 * @param $refs
 * @returns
 * The promise resolves with the raw file contents and the resolver that was used.
 */
async function readFile<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  file: FileInfo,
  options: O,
  $refs: $Refs<S, O>,
): Promise<any> {
  // console.log('Reading %s', file.url);

  // Find the resolvers that can read this file
  let resolvers = plugins.all(options.resolve);
  resolvers = plugins.filter(resolvers, "canRead", file);

  // Run the resolvers, in order, until one of them succeeds
  plugins.sort(resolvers);
  try {
    const data = await plugins.run(resolvers, "read", file, $refs);
    return data;
  } catch (err: any) {
    if (!err && options.continueOnError) {
      // No resolver could be matched
      throw new UnmatchedResolverError(file.url);
    } else if (!err || !("error" in err)) {
      // Throw a generic, friendly error.
      throw ono.syntax(`Unable to resolve $ref pointer "${file.url}"`);
    }
    // Throw the original error, if it's one of our own (user-friendly) errors.
    else if (err.error instanceof ResolverError) {
      throw err.error;
    } else {
      throw new ResolverError(err, file.url);
    }
  }
}

/**
 * Parses the given file's contents, using the configured parser plugins.
 *
 * @param file           - An object containing information about the referenced file
 * @param file.url       - The full URL of the referenced file
 * @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @param options
 * @param $refs
 *
 * @returns
 * The promise resolves with the parsed file contents and the parser that was used.
 */
async function parseFile<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  file: FileInfo,
  options: O,
  $refs: $Refs<S, O>,
) {
  // Find the parsers that can read this file type.
  // If none of the parsers are an exact match for this file, then we'll try ALL of them.
  // This handles situations where the file IS a supported type, just with an unknown extension.
  const allParsers = plugins.all(options.parse);
  const filteredParsers = plugins.filter(allParsers, "canParse", file);
  const parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;

  // Run the parsers, in order, until one of them succeeds
  plugins.sort(parsers);
  try {
    const parser = await plugins.run<S, O>(parsers, "parse", file, $refs);
    if (!parser.plugin.allowEmpty && isEmpty(parser.result)) {
      throw ono.syntax(`Error parsing "${file.url}" as ${parser.plugin.name}. \nParsed value is empty`);
    } else {
      return parser;
    }
  } catch (err: any) {
    if (!err && options.continueOnError) {
      // No resolver could be matched
      throw new UnmatchedParserError(file.url);
    } else if (err && err.message && err.message.startsWith("Error parsing")) {
      throw err;
    } else if (!err || !("error" in err)) {
      throw ono.syntax(`Unable to parse ${file.url}`);
    } else if (err.error instanceof ParserError) {
      throw err.error;
    } else {
      throw new ParserError(err.error.message, file.url);
    }
  }
}

/**
 * Determines whether the parsed value is "empty".
 *
 * @param value
 * @returns
 */
function isEmpty(value: any) {
  return (
    value === undefined ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0) ||
    (Buffer.isBuffer(value) && value.length === 0)
  );
}
export default parse;
