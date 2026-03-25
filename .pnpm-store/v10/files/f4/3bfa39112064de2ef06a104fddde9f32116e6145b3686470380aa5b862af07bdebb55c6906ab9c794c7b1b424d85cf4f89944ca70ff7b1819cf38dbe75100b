import { ParserError } from "../util/errors.js";
import yaml from "js-yaml";
import { JSON_SCHEMA } from "js-yaml";
import type { FileInfo } from "../types/index.js";
import type { Plugin } from "../types/index.js";

export default {
  /**
   * The order that this parser will run, in relation to other parsers.
   */
  order: 200,

  /**
   * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
   */
  allowEmpty: true,

  /**
   * Determines whether this parser can parse a given file reference.
   * Parsers that match will be tried, in order, until one successfully parses the file.
   * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
   * every parser will be tried.
   */
  canParse: [".yaml", ".yml", ".json"], // JSON is valid YAML

  /**
   * Parses the given file as YAML
   *
   * @param file           - An object containing information about the referenced file
   * @param file.url       - The full URL of the referenced file
   * @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @param file.data      - The file contents. This will be whatever data type was returned by the resolver
   * @returns
   */
  async parse(file: FileInfo) {
    let data = file.data;
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }

    if (typeof data === "string") {
      try {
        return yaml.load(data, { schema: JSON_SCHEMA });
      } catch (e: any) {
        throw new ParserError(e?.message || "Parser Error", file.url);
      }
    } else {
      // data is already a JavaScript value (object, array, number, null, NaN, etc.)
      return data;
    }
  },
} as Plugin;
