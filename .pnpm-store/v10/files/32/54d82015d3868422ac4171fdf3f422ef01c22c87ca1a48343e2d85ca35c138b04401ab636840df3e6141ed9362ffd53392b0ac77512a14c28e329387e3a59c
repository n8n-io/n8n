/**
 * The value of `this` in the context of a {@link LegacyImporter} or {@link
 * LegacyFunction} callback.
 *
 * @category Legacy
 * @deprecated This is only used by the legacy {@link render} and {@link
 * renderSync} APIs. Use {@link compile}, {@link compileString}, {@link
 * compileAsync}, and {@link compileStringAsync} instead.
 */
export interface LegacyPluginThis {
  /**
   * A partial representation of the options passed to {@link render} or {@link
   * renderSync}.
   */
  options: {
    /** The same {@link LegacyPluginThis} instance that contains this object. */
    context: LegacyPluginThis;

    /**
     * The value passed to {@link LegacyFileOptions.file} or {@link
     * LegacyStringOptions.file}.
     */
    file?: string;

    /** The value passed to {@link LegacyStringOptions.data}. */
    data?: string;

    /**
     * The value passed to {@link LegacySharedOptions.includePaths} separated by
     * `";"` on Windows or `":"` on other operating systems. This always
     * includes the current working directory as the first entry.
     */
    includePaths: string;

    /** Always the number 10. */
    precision: 10;

    /** Always the number 1. */
    style: 1;

    /** 1 if {@link LegacySharedOptions.indentType} was `"tab"`, 0 otherwise. */
    indentType: 1 | 0;

    /**
     * The value passed to {@link LegacySharedOptions.indentWidth}, or `2`
     * otherwise.
     */
    indentWidth: number;

    /**
     * The value passed to {@link LegacySharedOptions.linefeed}, or `"\n"`
     * otherwise.
     */
    linefeed: '\r' | '\r\n' | '\n' | '\n\r';

    /** A partially-constructed {@link LegacyResult} object. */
    result: {
      /** Partial information about the compilation in progress. */
      stats: {
        /**
         * The number of milliseconds between 1 January 1970 at 00:00:00 UTC and
         * the time at which Sass compilation began.
         */
        start: number;

        /**
         * {@link LegacyFileOptions.file} if it was passed, otherwise the string
         * `"data"`.
         */
        entry: string;
      };
    };
  };
}
