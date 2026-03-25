import {LegacyException} from './exception';
import {LegacyOptions} from './options';

/**
 * The object returned by {@link render} and {@link renderSync} after a
 * successful compilation.
 *
 * @category Legacy
 * @deprecated This is only used by the legacy {@link render} and {@link
 * renderSync} APIs. Use {@link compile}, {@link compileString}, {@link
 * compileAsync}, and {@link compileStringAsync} instead.
 */
export interface LegacyResult {
  /**
   * The compiled CSS. This can be converted to a string by calling
   * [Buffer.toString](https://nodejs.org/api/buffer.html#buffer_buf_tostring_encoding_start_end).
   *
   * @example
   *
   * ```js
   * const result = sass.renderSync({file: "style.scss"});
   *
   * console.log(result.css.toString());
   * ```
   */
  css: Buffer;

  /**
   * The source map that maps the compiled CSS to the source files from which it
   * was generated. This can be converted to a string by calling
   * [Buffer.toString](https://nodejs.org/api/buffer.html#buffer_buf_tostring_encoding_start_end).
   *
   * This is `undefined` unless either
   *
   * * {@link LegacySharedOptions.sourceMap} is a string; or
   * * {@link LegacySharedOptions.sourceMap} is `true` and
   *   {@link LegacySharedOptions.outFile} is set.
   *
   * The source map uses absolute [`file:`
   * URLs](https://en.wikipedia.org/wiki/File_URI_scheme) to link to the Sass
   * source files, except if the source file comes from {@link
   * LegacyStringOptions.data} in which case it lists its URL as `"stdin"`.
   *
   * @example
   *
   * ```js
   * const result = sass.renderSync({
   *   file: "style.scss",
   *   sourceMap: true,
   *   outFile: "style.css"
   * })
   *
   * console.log(result.map.toString());
   * ```
   */
  map?: Buffer;

  /** Additional information about the compilation. */
  stats: {
    /**
     * The absolute path of {@link LegacyFileOptions.file} or {@link
     * LegacyStringOptions.file}, or `"data"` if {@link
     * LegacyStringOptions.file} wasn't set.
     */
    entry: string;

    /**
     * The number of milliseconds between 1 January 1970 at 00:00:00 UTC and the
     * time at which Sass compilation began.
     */
    start: number;

    /**
     * The number of milliseconds between 1 January 1970 at 00:00:00 UTC and the
     * time at which Sass compilation ended.
     */
    end: number;

    /**
     * The number of milliseconds it took to compile the Sass file. This is
     * always equal to `start` minus `end`.
     */
    duration: number;

    /**
     * An array of the absolute paths of all Sass files loaded during
     * compilation. If a stylesheet was loaded from a {@link LegacyImporter}
     * that returned the stylesheet’s contents, the raw string of the `@use` or
     * `@import` that loaded that stylesheet included in this array.
     */
    includedFiles: string[];
  };
}

/**
 * This function synchronously compiles a Sass file to CSS. If it succeeds, it
 * returns the result, and if it fails it throws an error.
 *
 * **Heads up!** When using the `sass-embedded` npm package, **{@link render}
 * is almost always faster than {@link renderSync}**, due to the overhead of
 * emulating synchronous messaging with worker threads and concurrent
 * compilations being blocked on main thread.
 *
 * @example
 *
 * ```js
 * const sass = require('sass'); // or require('node-sass');
 *
 * const result = sass.renderSync({file: "style.scss"});
 * // ...
 * ```
 *
 * @category Legacy
 * @deprecated Use {@link compile} or {@link compileString} instead.
 */
export function renderSync(options: LegacyOptions<'sync'>): LegacyResult;

/**

 * This function asynchronously compiles a Sass file to CSS, and calls
 * `callback` with a {@link LegacyResult} if compilation succeeds or {@link
 * LegacyException} if it fails.
 *
 * **Heads up!** When using the `sass` npm package, **{@link renderSync} is
 * almost twice as fast as {@link render}** by default, due to the overhead of
 * making the entire evaluation process asynchronous.
 *
 * ```js
 * const sass = require('sass'); // or require('node-sass');
 *
 * sass.render({
 *   file: "style.scss"
 * }, function(err, result) {
 *   // ...
 * });
 * ```
 *
 * @category Legacy
 * @deprecated Use {@link compileAsync} or {@link compileStringAsync} instead.
 */
export function render(
  options: LegacyOptions<'async'>,
  callback: (exception?: LegacyException, result?: LegacyResult) => void
): void;
