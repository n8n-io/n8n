import fs from "fs";
import { ono } from "@jsdevtools/ono";
import * as url from "../util/url.js";
import { ResolverError } from "../util/errors.js";
import type { JSONSchema, ResolverOptions } from "../types/index.js";
import type { FileInfo } from "../types/index.js";

export default {
  /**
   * The order that this resolver will run, in relation to other resolvers.
   */
  order: 100,

  /**
   * Determines whether this resolver can read a given file reference.
   * Resolvers that return true will be tried, in order, until one successfully resolves the file.
   * Resolvers that return false will not be given a chance to resolve the file.
   */
  canRead(file: FileInfo) {
    return url.isFileSystemPath(file.url);
  },

  /**
   * Reads the given file and returns its raw contents as a Buffer.
   */
  async read(file: FileInfo): Promise<Buffer> {
    let path: string | undefined;
    try {
      path = url.toFileSystemPath(file.url);
    } catch (err: any) {
      throw new ResolverError(ono.uri(err, `Malformed URI: ${file.url}`), file.url);
    }
    try {
      return await fs.promises.readFile(path);
    } catch (err: any) {
      throw new ResolverError(ono(err, `Error opening file "${path}"`), path);
    }
  },
} as ResolverOptions<JSONSchema>;
