import type { FileInfo } from "../types/index.js";
import type { Plugin } from "../types/index.js";

const BINARY_REGEXP = /\.(jpeg|jpg|gif|png|bmp|ico)$/i;

export default {
  /**
   * The order that this parser will run, in relation to other parsers.
   */
  order: 400,

  /**
   * Whether to allow "empty" files (zero bytes).
   */
  allowEmpty: true,

  /**
   * Determines whether this parser can parse a given file reference.
   * Parsers that return true will be tried, in order, until one successfully parses the file.
   * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
   * every parser will be tried.
   */
  canParse(file: FileInfo) {
    // Use this parser if the file is a Buffer, and has a known binary extension
    return Buffer.isBuffer(file.data) && BINARY_REGEXP.test(file.url);
  },

  /**
   * Parses the given data as a Buffer (byte array).
   */
  parse(file: FileInfo) {
    if (Buffer.isBuffer(file.data)) {
      return file.data;
    } else {
      // This will reject if data is anything other than a string or typed array
      return Buffer.from(file.data);
    }
  },
} as Plugin;
