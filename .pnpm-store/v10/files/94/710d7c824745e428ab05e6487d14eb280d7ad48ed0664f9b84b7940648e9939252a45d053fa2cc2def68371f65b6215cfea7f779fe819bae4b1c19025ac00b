import {Syntax} from './options';
import {PromiseOr} from './util/promise_or';

/**
 * Contextual information passed to {@link Importer.canonicalize} and {@link
 * FileImporter.findFileUrl}. Not all importers will need this information to
 * resolve loads, but some may find it useful.
 */
export interface CanonicalizeContext {
  /**
   * Whether this is being invoked because of a Sass
   * `@import` rule, as opposed to a `@use` or `@forward` rule.
   *
   * This should *only* be used for determining whether or not to load
   * [import-only files](https://sass-lang.com/documentation/at-rules/import#import-only-files).
   */
  fromImport: boolean;

  /**
   * The canonical URL of the file that contains the load, if that information
   * is available.
   *
   * For an {@link Importer}, this is only passed when the `url` parameter is a
   * relative URL _or_ when its [URL scheme] is included in {@link
   * Importer.nonCanonicalScheme}. This ensures that canonical URLs are always
   * resolved the same way regardless of context.
   *
   * [URL scheme]: https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_URL#scheme
   *
   * For a {@link FileImporter}, this is always available as long as Sass knows
   * the canonical URL of the containing file.
   */
  containingUrl: URL | null;
}

/**
 * A special type of importer that redirects all loads to existing files on
 * disk. Although this is less powerful than a full {@link Importer}, it
 * automatically takes care of Sass features like resolving partials and file
 * extensions and of loading the file from disk.
 *
 * Like all importers, this implements custom Sass loading logic for [`@use`
 * rules](https://sass-lang.com/documentation/at-rules/use) and [`@import`
 * rules](https://sass-lang.com/documentation/at-rules/import). It can be passed
 * to {@link Options.importers} or {@link StringOptions.importer}.
 *
 * @typeParam sync - A `FileImporter<'sync'>`'s {@link findFileUrl} must return
 * synchronously, but in return it can be passed to {@link compile} and {@link
 * compileString} in addition to {@link compileAsync} and {@link
 * compileStringAsync}.
 *
 * A `FileImporter<'async'>`'s {@link findFileUrl} may either return
 * synchronously or asynchronously, but it can only be used with {@link
 * compileAsync} and {@link compileStringAsync}.
 *
 * @example
 *
 * ```js
 * const {pathToFileURL} = require('url');
 *
 * sass.compile('style.scss', {
 *   importers: [{
 *     // An importer that redirects relative URLs starting with "~" to
 *     // `node_modules`.
 *     findFileUrl(url) {
 *       if (!url.startsWith('~')) return null;
 *       return new URL(url.substring(1), pathToFileURL('node_modules'));
 *     }
 *   }]
 * });
 * ```
 *
 * @category Importer
 */
export interface FileImporter<
  sync extends 'sync' | 'async' = 'sync' | 'async'
> {
  /**
   * A callback that's called to partially resolve a load (such as
   * [`@use`](https://sass-lang.com/documentation/at-rules/use) or
   * [`@import`](https://sass-lang.com/documentation/at-rules/import)) to a file
   * on disk.
   *
   * Unlike an {@link Importer}, the compiler will automatically handle relative
   * loads for a {@link FileImporter}. See {@link Options.importers} for more
   * details on the way loads are resolved.
   *
   * @param url - The loaded URL. Since this might be relative, it's represented
   * as a string rather than a {@link URL} object.
   *
   * @returns An absolute `file:` URL if this importer recognizes the `url`.
   * This may be only partially resolved: the compiler will automatically look
   * for [partials](https://sass-lang.com/documentation/at-rules/use#partials),
   * [index files](https://sass-lang.com/documentation/at-rules/use#index-files),
   * and file extensions based on the returned URL. An importer may also return
   * a fully resolved URL if it so chooses.
   *
   * If this importer doesn't recognize the URL, it should return `null` instead
   * to allow other importers or {@link Options.loadPaths | load paths} to
   * handle it.
   *
   * This may also return a `Promise`, but if it does the importer may only be
   * passed to {@link compileAsync} and {@link compileStringAsync}, not {@link
   * compile} or {@link compileString}.
   *
   * @throws any - If this importer recognizes `url` but determines that it's
   * invalid, it may throw an exception that will be wrapped by Sass. If the
   * exception object has a `message` property, it will be used as the wrapped
   * exception's message; otherwise, the exception object's `toString()` will be
   * used. This means it's safe for importers to throw plain strings.
   */
  findFileUrl(
    url: string,
    context: CanonicalizeContext
  ): PromiseOr<URL | null, sync>;

  /** @hidden */
  canonicalize?: never;
}

/**
 * An object that implements custom Sass loading logic for [`@use`
 * rules](https://sass-lang.com/documentation/at-rules/use) and [`@import`
 * rules](https://sass-lang.com/documentation/at-rules/import). It can be passed
 * to {@link Options.importers} or {@link StringOptions.importer}.
 *
 * Importers that simply redirect to files on disk are encouraged to use the
 * {@link FileImporter} interface instead.
 *
 * ### Resolving a Load
 *
 * This is the process of resolving a load using a custom importer:
 *
 * - The compiler encounters `@use "db:foo/bar/baz"`.
 * - It calls {@link canonicalize} with `"db:foo/bar/baz"`.
 * - {@link canonicalize} returns `new URL("db:foo/bar/baz/_index.scss")`.
 * - If the compiler has already loaded a stylesheet with this canonical URL, it
 *   re-uses the existing module.
 * - Otherwise, it calls {@link load} with `new
 *   URL("db:foo/bar/baz/_index.scss")`.
 * - {@link load} returns an {@link ImporterResult} that the compiler uses as
 *   the contents of the module.
 *
 * See {@link Options.importers} for more details on the way loads are resolved
 * using multiple importers and load paths.
 *
 * @typeParam sync - An `Importer<'sync'>`'s {@link canonicalize} and {@link
 * load} must return synchronously, but in return it can be passed to {@link
 * compile} and {@link compileString} in addition to {@link compileAsync} and
 * {@link compileStringAsync}.
 *
 * An `Importer<'async'>`'s {@link canonicalize} and {@link load} may either
 * return synchronously or asynchronously, but it can only be used with {@link
 * compileAsync} and {@link compileStringAsync}.
 *
 * @example
 *
 * ```js
 * sass.compile('style.scss', {
 *   // An importer for URLs like `bgcolor:orange` that generates a
 *   // stylesheet with the given background color.
 *   importers: [{
 *     canonicalize(url) {
 *       if (!url.startsWith('bgcolor:')) return null;
 *       return new URL(url);
 *     },
 *     load(canonicalUrl) {
 *       return {
 *         contents: `body {background-color: ${canonicalUrl.pathname}}`,
 *         syntax: 'scss'
 *       };
 *     }
 *   }]
 * });
 * ```
 *
 * @category Importer
 */
export interface Importer<sync extends 'sync' | 'async' = 'sync' | 'async'> {
  /**
   * If `url` is recognized by this importer, returns its canonical format.
   *
   * If Sass has already loaded a stylesheet with the returned canonical URL, it
   * re-uses the existing parse tree (and the loaded module for `@use`). This
   * means that importers **must ensure** that the same canonical URL always
   * refers to the same stylesheet, *even across different importers*. As such,
   * importers are encouraged to use unique URL schemes to disambiguate between
   * one another.
   *
   * As much as possible, custom importers should canonicalize URLs the same way
   * as the built-in filesystem importer:
   *
   * - The importer should look for stylesheets by adding the prefix `_` to the
   *   URL's basename, and by adding the extensions `.sass` and `.scss` if the
   *   URL doesn't already have one of those extensions. For example, if the
   *   URL was `foo/bar/baz`, the importer would look for:
   *   - `foo/bar/baz.sass`
   *   - `foo/bar/baz.scss`
   *   - `foo/bar/_baz.sass`
   *   - `foo/bar/_baz.scss`
   *
   *   If the URL was `foo/bar/baz.scss`, the importer would just look for:
   *   - `foo/bar/baz.scss`
   *   - `foo/bar/_baz.scss`
   *
   *   If the importer finds a stylesheet at more than one of these URLs, it
   *   should throw an exception indicating that the URL is ambiguous. Note that
   *   if the extension is explicitly specified, a stylesheet with the opposite
   *   extension is allowed to exist.
   *
   * - If none of the possible paths is valid, the importer should perform the
   *   same resolution on the URL followed by `/index`. In the example above,
   *   it would look for:
   *   - `foo/bar/baz/index.sass`
   *   - `foo/bar/baz/index.scss`
   *   - `foo/bar/baz/_index.sass`
   *   - `foo/bar/baz/_index.scss`
   *
   *   As above, if the importer finds a stylesheet at more than one of these
   *   URLs, it should throw an exception indicating that the import is
   *   ambiguous.
   *
   * If no stylesheets are found, the importer should return `null`.
   *
   * Calling {@link canonicalize} multiple times with the same URL must return
   * the same result. Calling {@link canonicalize} with a URL returned by a
   * previous call to {@link canonicalize} must return that URL.
   *
   * #### Relative URLs
   *
   * Relative loads in stylesheets loaded from an importer are first resolved
   * relative to the canonical URL of the stylesheet that contains it and passed
   * back to the {@link canonicalize} method for the local importer that loaded
   * that stylesheet. For example, suppose the "Resolving a Load" example {@link
   * Importer | above} returned a stylesheet that contained `@use "mixins"`:
   *
   * - The compiler resolves the URL `mixins` relative to the current
   *   stylesheet's canonical URL `db:foo/bar/baz/_index.scss` to get
   *   `db:foo/bar/baz/mixins`.
   * - It calls {@link canonicalize} with `"db:foo/bar/baz/mixins"`.
   * - {@link canonicalize} returns `new URL("db:foo/bar/baz/_mixins.scss")`.
   *
   * Because of this, {@link canonicalize} must return a meaningful result when
   * called with a URL relative to one returned by an earlier call to {@link
   * canonicalize}.
   *
   * If the local importer's `canonicalize` method returns `null`, the relative
   * URL is then passed to each of {@link Options.importers}' `canonicalize()`
   * methods in turn until one returns a canonical URL. If none of them do, the
   * load fails.
   *
   * @param url - The loaded URL. Since this might be relative, it's represented
   * as a string rather than a {@link URL} object.
   *
   * @returns An absolute URL if this importer recognizes the `url`, or `null`
   * if it doesn't. If this returns `null`, other importers or {@link
   * Options.loadPaths | load paths} may handle the load.
   *
   * This may also return a `Promise`, but if it does the importer may only be
   * passed to {@link compileAsync} and {@link compileStringAsync}, not {@link
   * compile} or {@link compileString}.
   *
   * @throws any - If this importer recognizes `url` but determines that it's
   * invalid, it may throw an exception that will be wrapped by Sass. If the
   * exception object has a `message` property, it will be used as the wrapped
   * exception's message; otherwise, the exception object's `toString()` will be
   * used. This means it's safe for importers to throw plain strings.
   */
  canonicalize(
    url: string,
    context: CanonicalizeContext
  ): PromiseOr<URL | null, sync>;

  /**
   * Loads the Sass text for the given `canonicalUrl`, or returns `null` if this
   * importer can't find the stylesheet it refers to.
   *
   * @param canonicalUrl - The canonical URL of the stylesheet to load. This is
   * guaranteed to come from a call to {@link canonicalize}, although not every
   * call to {@link canonicalize} will result in a call to {@link load}.
   *
   * @returns The contents of the stylesheet at `canonicalUrl` if it can be
   * loaded, or `null` if it can't.
   *
   * This may also return a `Promise`, but if it does the importer may only be
   * passed to {@link compileAsync} and {@link compileStringAsync}, not {@link
   * compile} or {@link compileString}.
   *
   * @throws any - If this importer finds a stylesheet at `url` but it fails to
   * load for some reason, or if `url` is uniquely associated with this importer
   * but doesn't refer to a real stylesheet, the importer may throw an exception
   * that will be wrapped by Sass. If the exception object has a `message`
   * property, it will be used as the wrapped exception's message; otherwise,
   * the exception object's `toString()` will be used. This means it's safe for
   * importers to throw plain strings.
   */
  load(canonicalUrl: URL): PromiseOr<ImporterResult | null, sync>;

  /** @hidden */
  findFileUrl?: never;

  /**
   * A URL scheme or set of schemes (without the `:`) that this importer
   * promises never to use for URLs returned by {@link canonicalize}. If it does
   * return a URL with one of these schemes, that's an error.
   *
   * If this is set, any call to canonicalize for a URL with a non-canonical
   * scheme will be passed {@link CanonicalizeContext.containingUrl} if it's
   * known.
   *
   * These schemes may only contain lowercase ASCII letters, ASCII numerals,
   * `+`, `-`, and `.`. They may not be empty.
   */
  nonCanonicalScheme?: string | string[];
}

declare const nodePackageImporterKey: unique symbol;

/**
 * The built-in Node.js package importer. This loads pkg: URLs from node_modules
 * according to the standard Node.js resolution algorithm.
 *
 * A Node.js package importer is exposed as a class that can be added to the
 * `importers` option.
 *
 *```js
 * const sass = require('sass');
 * sass.compileString('@use "pkg:vuetify', {
 *   importers: [new sass.NodePackageImporter()]
 * });
 *```
 *
 * ## Writing Sass packages
 *
 * Package authors can control what is exposed to their users through their
 * `package.json` manifest. The recommended method is to add a `sass`
 * conditional export to `package.json`.
 *
 * ```json
 * // node_modules/uicomponents/package.json
 * {
 *   "exports": {
 *     ".": {
 *       "sass": "./src/scss/index.scss",
 *       "import": "./dist/js/index.mjs",
 *       "default": "./dist/js/index.js"
 *     }
 *   }
 * }
 * ```
 *
 * This allows a package user to write `@use "pkg:uicomponents"` to load the
 * file at `node_modules/uicomponents/src/scss/index.scss`.
 *
 * The Node.js package importer supports the variety of formats supported by
 * Node.js [package entry points], allowing authors to expose multiple subpaths.
 *
 * [package entry points]:
 * https://nodejs.org/api/packages.html#package-entry-points
 *
 * ```json
 * // node_modules/uicomponents/package.json
 * {
 *   "exports": {
 *     ".": {
 *       "sass": "./src/scss/index.scss",
 *     },
 *     "./colors.scss": {
 *       "sass": "./src/scss/_colors.scss",
 *     },
 *     "./theme/*.scss": {
 *       "sass": "./src/scss/theme/*.scss",
 *     },
 *   }
 * }
 * ```
 *
 * This allows a package user to write:
 *
 * - `@use "pkg:uicomponents";` to import the root export.
 * - `@use "pkg:uicomponents/colors";` to import the colors partial.
 * - `@use "pkg:uicomponents/theme/purple";` to import a purple theme.
 *
 * Note that while library users can rely on the importer to resolve
 * [partials](https://sass-lang.com/documentation/at-rules/use#partials), [index
 * files](https://sass-lang.com/documentation/at-rules/use#index-files), and
 * extensions, library authors must specify the entire file path in `exports`.
 *
 * In addition to the `sass` condition, the `style` condition is also
 * acceptable. Sass will match the `default` condition if it's a relevant file
 * type, but authors are discouraged from relying on this. Notably, the key
 * order matters, and the importer will resolve to the first value with a key
 * that is `sass`, `style`, or `default`, so you should always put `default`
 * last.
 *
 * To help package authors who haven't transitioned to package entry points
 * using the `exports` field, the Node.js package importer provides several
 * fallback options. If the `pkg:` URL does not have a subpath, the Node.js
 * package importer will look for a `sass` or `style` key at the root of
 * `package.json`.
 *
 * ```json
 * // node_modules/uicomponents/package.json
 * {
 *   "sass": "./src/scss/index.scss",
 * }
 * ```
 *
 * This allows a user to write `@use "pkg:uicomponents";` to import the
 * `index.scss` file.
 *
 * Finally, the Node.js package importer will look for an `index` file at the
 * package root, resolving partials and extensions. For example, if the file
 * `_index.scss` exists in the package root of `uicomponents`, a user can import
 * that with `@use "pkg:uicomponents";`.
 *
 * If a `pkg:` URL includes a subpath that doesn't have a match in package entry
 * points, the Node.js importer will attempt to find that file relative to the
 * package root, resolving for file extensions, partials and index files. For
 * example, if the file `src/sass/_colors.scss` exists in the `uicomponents`
 * package, a user can import that file using `@use
 * "pkg:uicomponents/src/sass/colors";`.
 *
 * @compatibility dart: "1.71.0", node: false
 * @category Importer
 */
export class NodePackageImporter {
  /** Used to distinguish this type from any arbitrary object. */
  private readonly [nodePackageImporterKey]: true;

  /**
   * The NodePackageImporter has an optional `entryPointDirectory` option, which
   * is the directory where the Node Package Importer should start when
   * resolving `pkg:` URLs in sources other than files on disk. This will be
   * used as the `parentURL` in the [Node Module
   * Resolution](https://nodejs.org/api/esm.html#resolution-algorithm-specification)
   * algorithm.
   *
   * In order to be found by the Node Package Importer, a package will need to
   * be inside a node_modules folder located in the `entryPointDirectory`, or
   * one of its parent directories, up to the filesystem root.
   *
   * Relative paths will be resolved relative to the current working directory.
   * If a path is not provided, this defaults to the parent directory of the
   * Node.js entrypoint. If that's not available, this will throw an error.
   */
  constructor(entryPointDirectory?: string);
}

/**
 * The result of successfully loading a stylesheet with an {@link Importer}.
 *
 * @category Importer
 */
export interface ImporterResult {
  /** The contents of the stylesheet. */
  contents: string;

  /** The syntax with which to parse {@link contents}. */
  syntax: Syntax;

  /**
   * The URL to use to link to the loaded stylesheet's source code in source
   * maps. A `file:` URL is ideal because it's accessible to both browsers and
   * other build tools, but an `http:` URL is also acceptable.
   *
   * If this isn't set, it defaults to a `data:` URL that contains the contents
   * of the loaded stylesheet.
   */
  sourceMapUrl?: URL;
}
