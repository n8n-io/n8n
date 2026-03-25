import {RawSourceMap} from 'source-map-js';

import {Options, StringOptions} from './options';

/**
 * The result of compiling Sass to CSS. Returned by {@link compile}, {@link
 * compileAsync}, {@link compileString}, and {@link compileStringAsync}.
 *
 * @category Compile
 */
export interface CompileResult {
  /**
   * The generated CSS.
   *
   * Note that this *never* includes a `sourceMapUrl` comment—it's up to the
   * caller to determine where to save the source map and how to link to it from
   * the stylesheet.
   */
  css: string;

  /**
   * The canonical URLs of all the stylesheets that were loaded during the
   * Sass compilation. The order of these URLs is not guaranteed.
   */
  loadedUrls: URL[];

  /**
   * The object representation of the source map that maps locations in the
   * generated CSS back to locations in the Sass source code.
   *
   * This typically uses absolute `file:` URLs to refer to Sass files, although
   * this can be controlled by having a custom {@link Importer} return {@link
   * ImporterResult.sourceMapUrl}.
   *
   * This is set if and only if {@link Options.sourceMap} is `true`.
   */
  sourceMap?: RawSourceMap;
}

/**
 * The result of creating a synchronous compiler. Returned by
 * {@link initCompiler}.
 *
 * @category Compile
 */
export class Compiler {
  /**
   * Throws an error if constructed directly, instead of via
   * {@link initCompiler}.
   */
  private constructor();

  /**
   * The {@link compile} method exposed through a Compiler instance while it is
   * active. If this is called after {@link dispose} on the Compiler
   * instance, an error will be thrown.
   *
   * During the Compiler instance's lifespan, given the same input, this will
   * return an identical result to the {@link compile} method exposed at the
   * module root.
   */
  compile(path: string, options?: Options<'sync'>): CompileResult;

  /**
   * The {@link compileString} method exposed through a Compiler instance while
   * it is active. If this is called after {@link dispose} on the Compiler
   * instance, an error will be thrown.
   *
   * During the Compiler instance's lifespan, given the same input, this will
   * return an identical result to the {@link compileString} method exposed at
   * the module root.
   */
  compileString(source: string, options?: StringOptions<'sync'>): CompileResult;

  /**
   * Ends the lifespan of this Compiler instance. After this is invoked, all
   * calls to the Compiler instance's {@link compile} or {@link compileString}
   * methods will result in an error.
   */
  dispose(): void;
}

/**
 * The result of creating an asynchronous compiler. Returned by
 * {@link initAsyncCompiler}.
 *
 * @category Compile
 */
export class AsyncCompiler {
  /**
   * Throws an error if constructed directly, instead of via
   * {@link initAsyncCompiler}.
   */
  private constructor();

  /**
   * The {@link compileAsync} method exposed through an Async Compiler instance
   * while it is active. If this is called after {@link dispose} on the Async
   * Compiler instance, an error will be thrown.
   *
   * During the Async Compiler instance's lifespan, given the same input, this
   * will return an identical result to the {@link compileAsync} method exposed
   * at the module root.
   */
  compileAsync(
    path: string,
    options?: Options<'async'>
  ): Promise<CompileResult>;

  /**
   * The {@link compileStringAsync} method exposed through an Async Compiler
   * instance while it is active. If this is called after {@link dispose} on the
   * Async Compiler instance, an error will be thrown.
   *
   * During the Async Compiler instance's lifespan, given the same input, this
   * will return an identical result to the {@link compileStringAsync} method
   * exposed at the module root.
   */
  compileStringAsync(
    source: string,
    options?: StringOptions<'async'>
  ): Promise<CompileResult>;

  /**
   * Ends the lifespan of this Async Compiler instance. After this is invoked,
   * all subsequent calls to the Compiler instance's `compileAsync` or
   * `compileStringAsync` methods will result in an error.
   *
   * Any compilations that are submitted before `dispose` will not be cancelled,
   * and will be allowed to settle.
   *
   * After all compilations have been settled and Sass completes any internal
   * task cleanup, `dispose` will resolve its promise.
   */
  dispose(): Promise<void>;
}

/**
 * Synchronously compiles the Sass file at `path` to CSS. If it succeeds it
 * returns a {@link CompileResult}, and if it fails it throws an {@link
 * Exception}.
 *
 * This only allows synchronous {@link Importer}s and {@link CustomFunction}s.
 *
 * **Heads up!** When using the [sass-embedded] npm package for single
 * compilations, **{@link compileAsync} is almost always faster than
 * {@link compile}**, due to the overhead of emulating synchronous messaging
 * with worker threads and concurrent compilations being blocked on main thread.
 *
 * If you are running multiple compilations with the [sass-embedded] npm
 * package, using a {@link Compiler} will provide some speed improvements over
 * the module-level methods, and an {@link AsyncCompiler} will be much faster.
 *
 * [sass-embedded]: https://www.npmjs.com/package/sass-embedded
 *
 * @example
 *
 * ```js
 * const sass = require('sass');
 *
 * const result = sass.compile("style.scss");
 * console.log(result.css);
 * ```
 *
 * @category Compile
 * @compatibility dart: "1.45.0", node: false
 */
export function compile(path: string, options?: Options<'sync'>): CompileResult;

/**
 * Asynchronously compiles the Sass file at `path` to CSS. Returns a promise
 * that resolves with a {@link CompileResult} if it succeeds and rejects with an
 * {@link Exception} if it fails.
 *
 * This only allows synchronous or asynchronous {@link Importer}s and
 * {@link CustomFunction}s.
 *
 * **Heads up!** When using the `sass` npm package, **{@link compile} is almost
 * twice as fast as {@link compileAsync}**, due to the overhead of making the
 * entire evaluation process asynchronous.
 *
 * @example
 *
 * ```js
 * const sass = require('sass');
 *
 * const result = await sass.compileAsync("style.scss");
 * console.log(result.css);
 * ```
 *
 * @category Compile
 * @compatibility dart: "1.45.0", node: false
 */
export function compileAsync(
  path: string,
  options?: Options<'async'>
): Promise<CompileResult>;

/**
 * Synchronously compiles a stylesheet whose contents is `source` to CSS. If it
 * succeeds it returns a {@link CompileResult}, and if it fails it throws an
 * {@link Exception}.
 *
 * This only allows synchronous {@link Importer}s and {@link CustomFunction}s.
 *
 * **Heads up!** When using the [sass-embedded] npm package for single
 * compilations, **{@link compileStringAsync} is almost always faster than
 * {@link compileString}**, due to the overhead of emulating synchronous
 * messaging with worker threads and concurrent compilations being blocked on
 * main thread.
 *
 * If you are running multiple compilations with the [sass-embedded] npm
 * package, using a {@link Compiler} will provide some speed improvements over
 * the module-level methods, and an {@link AsyncCompiler} will be much faster.
 *
 * [sass-embedded]: https://www.npmjs.com/package/sass-embedded
 *
 * @example
 *
 * ```js
 * const sass = require('sass');
 *
 * const result = sass.compileString(`
 * h1 {
 *   font-size: 40px;
 *   code {
 *     font-face: Roboto Mono;
 *   }
 * }`);
 * console.log(result.css);
 * ```
 *
 * @category Compile
 * @compatibility dart: "1.45.0", node: false
 */
export function compileString(
  source: string,
  options?: StringOptions<'sync'>
): CompileResult;

/**
 * Asynchronously compiles a stylesheet whose contents is `source` to CSS.
 * Returns a promise that resolves with a {@link CompileResult} if it succeeds
 * and rejects with an {@link Exception} if it fails.
 *
 * This only allows synchronous or asynchronous {@link Importer}s and {@link
 * CustomFunction}s.
 *
 * **Heads up!** When using the `sass` npm package, **{@link compileString} is
 * almost twice as fast as {@link compileStringAsync}**, due to the overhead
 * of making the entire evaluation process asynchronous.
 *
 * @example
 *
 * ```js
 * const sass = require('sass');
 *
 * const result = await sass.compileStringAsync(`
 * h1 {
 *   font-size: 40px;
 *   code {
 *     font-face: Roboto Mono;
 *   }
 * }`);
 * console.log(result.css);
 * ```
 *
 * @category Compile
 * @compatibility dart: "1.45.0", node: false
 */
export function compileStringAsync(
  source: string,
  options?: StringOptions<'async'>
): Promise<CompileResult>;

/**
 * Creates a synchronous {@link Compiler}. Each compiler instance exposes the
 * {@link compile} and {@link compileString} methods within the lifespan of the
 * Compiler. Given identical input, these methods will return results identical
 * to their counterparts exposed at the module root. To use asynchronous
 * compilation, use {@link initAsyncCompiler}.
 *
 * When calling the compile functions multiple times, using a compiler instance
 * with the [sass-embedded] npm package is much faster than using the top-level
 * compilation methods or the [sass] npm package.
 *
 * [sass-embedded]: https://www.npmjs.com/package/sass-embedded
 *
 * [sass]: https://www.npmjs.com/package/sass
 *
 * @example
 *
 * ```js
 * const sass = require('sass');
 * function setup() {
 *   const compiler = sass.initCompiler();
 *   const result1 = compiler.compileString('a {b: c}').css;
 *   const result2 = compiler.compileString('a {b: c}').css;
 *   compiler.dispose();
 *
 *   // throws error
 *   const result3 = sass.compileString('a {b: c}').css;
 * }
 * ```
 * @category Compile
 * @compatibility dart: "1.70.0", node: false
 */
export function initCompiler(): Compiler;

/**
 * Creates an asynchronous {@link AsyncCompiler}. Each compiler
 * instance exposes the {@link compileAsync} and {@link compileStringAsync}
 * methods within the lifespan of the Compiler. Given identical input, these
 * methods will return results identical to their counterparts exposed at the
 * module root. To use synchronous compilation, use {@link initCompiler};
 *
 * When calling the compile functions multiple times, using a compiler instance
 * with the [sass-embedded] npm package is much faster than using the top-level
 * compilation methods or the [sass] npm package.
 *
 * [sass-embedded]: https://www.npmjs.com/package/sass-embedded
 *
 * [sass]: https://www.npmjs.com/package/sass
 *
 * @example
 *
 * ```js
 * const sass = require('sass');
 * async function setup() {
 *   const compiler = await sass.initAsyncCompiler();
 *   const result1 = await compiler.compileStringAsync('a {b: c}').css;
 *   const result2 = await compiler.compileStringAsync('a {b: c}').css;
 *   await compiler.dispose();
 *
 *   // throws error
 *   const result3 = await sass.compileStringAsync('a {b: c}').css;
 * }
 * ```
 * @category Compile
 * @compatibility dart: "1.70.0", node: false
 */
export function initAsyncCompiler(): Promise<AsyncCompiler>;
