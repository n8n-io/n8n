export = precinct;

/**
 * Finds the list of dependencies for the given file
 *
 * @param {String|Object} content - File's content or AST
 * @param {Object} [options]
 * @param {String} [options.type] - The type of content being passed in. Useful if you want to use a non-js detective
 * @return {String[]}
 */
declare function precinct(content: string | any, options?: {
  type?: string;
}): string[];
declare namespace precinct {
  /**
   * Returns the dependencies for the given file path
   *
   * @param {String} filename
   * @param {Object} [options]
   * @param {Boolean} [options.includeCore=true] - Whether or not to include core modules in the dependency list
   * @param {Object} [options.fileSystem=undefined] - An alternative fs implementation to use for reading the file path.
   * @return {String[]}
   */
  function paperwork(filename: string, options?: {
    includeCore?: boolean;
    fileSystem?: any;
  }): string[];
}
