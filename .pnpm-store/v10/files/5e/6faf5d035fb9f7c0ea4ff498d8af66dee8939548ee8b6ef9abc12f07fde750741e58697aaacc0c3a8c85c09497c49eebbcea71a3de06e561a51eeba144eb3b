import { ParserError } from "../util/errors.js";
import type { FileInfo } from "../types/index.js";
import type { Plugin } from "../types/index.js";

const TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;

export default {
  /**
   * The order that this parser will run, in relation to other parsers.
   */
  order: 300,

  /**
   * Whether to allow "empty" files (zero bytes).
   */
  allowEmpty: true,

  /**
   * The encoding that the text is expected to be in.
   */
  encoding: "utf8" as BufferEncoding,

  /**
   * Determines whether this parser can parse a given file reference.
   * Parsers that return true will be tried, in order, until one successfully parses the file.
   * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
   * every parser will be tried.
   */
  canParse(file: FileInfo) {
    // Use this parser if the file is a string or Buffer, and has a known text-based extension
    return (typeof file.data === "string" || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
  },

  /**
   * Parses the given file as text
   */
  parse(file: FileInfo) {
    if (typeof file.data === "string") {
      return file.data;
    } else if (Buffer.isBuffer(file.data)) {
      return file.data.toString(this.encoding);
    } else {
      throw new ParserError("data is not text", file.url);
    }
  },
} as Plugin;
