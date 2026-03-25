// Type definitions for minimatch 5.1
// Project: https://github.com/isaacs/minimatch
// Definitions by: vvakame <https://github.com/vvakame>
//                 Shant Marouti <https://github.com/shantmarouti>
//                 BendingBender <https://github.com/BendingBender>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/**
 * Tests a path against the pattern using the options.
 *
 * @example
 * import minimatch = require("minimatch");
 *
 * const isJS = minimatch(file, "*.js", { matchBase: true });
 */
declare function minimatch(target: string, pattern: string, options?: minimatch.IOptions): boolean;

declare namespace minimatch {
    /**
     * Match against the list of files, in the style of fnmatch or glob.
     * If nothing is matched, and options.nonull is set,
     * then return a list containing the pattern itself.
     *
     * @example
     * import minimatch = require("minimatch");
     *
     * const javascripts = minimatch.match(fileList, "*.js", {matchBase: true});
     */
    function match(list: readonly string[], pattern: string, options?: IOptions): string[];

    /**
     * @return A function that tests its supplied argument, suitable for use with `Array.filter`.
     *
     * @example
     * import minimatch = require("minimatch");
     *
     * const javascripts = fileList.filter(minimatch.filter("*.js", {matchBase: true}));
     */
    function filter(
        pattern: string,
        options?: IOptions,
    ): (element: string, indexed: number, array: readonly string[]) => boolean;

    /**
     * Make a regular expression object from the pattern.
     */
    function makeRe(pattern: string, options?: IOptions): RegExp | false;

    function defaults(defaultOptions: IOptions): typeof minimatch;

    function braceExpand(pattern: string, options?: IOptions): string[];

    const sep: string;
    const GLOBSTAR: unique symbol;

    interface IOptions {
        /**
         * Dump a ton of stuff to stderr.
         *
         * @default false
         */
        debug?: boolean | undefined;

        /**
         * Do not expand `{a,b}` and `{1..3}` brace sets.
         *
         * @default false
         */
        nobrace?: boolean | undefined;

        /**
         * Disable `**` matching against multiple folder names.
         *
         * @default false
         */
        noglobstar?: boolean | undefined;

        /**
         * Allow patterns to match filenames starting with a period,
         * even if the pattern does not explicitly have a period in that spot.
         *
         * Note that by default, `'a/**' + '/b'` will **not** match `a/.d/b`, unless `dot` is set.
         *
         * @default false
         */
        dot?: boolean | undefined;

        /**
         * Disable "extglob" style patterns like `+(a|b)`.
         *
         * @default false
         */
        noext?: boolean | undefined;

        /**
         * Perform a case-insensitive match.
         *
         * @default false
         */
        nocase?: boolean | undefined;

        /**
         * When a match is not found by `minimatch.match`,
         * return a list containing the pattern itself if this option is set.
         * Otherwise, an empty list is returned if there are no matches.
         *
         * @default false
         */
        nonull?: boolean | undefined;

        /**
         * If set, then patterns without slashes will be matched
         * against the basename of the path if it contains slashes. For example,
         * `a?b` would match the path `/xyz/123/acb`, but not `/xyz/acb/123`.
         *
         * @default false
         */
        matchBase?: boolean | undefined;

        /**
         * Suppress the behavior of treating `#` at the start of a pattern as a comment.
         *
         * @default false
         */
        nocomment?: boolean | undefined;

        /**
         * Suppress the behavior of treating a leading `!` character as negation.
         *
         * @default false
         */
        nonegate?: boolean | undefined;

        /**
         * Returns from negate expressions the same as if they were not negated.
         * (Ie, true on a hit, false on a miss.)
         *
         * @default false
         */
        flipNegate?: boolean | undefined;

        /**
         * Compare a partial path to a pattern.  As long as the parts of the path that
         * are present are not contradicted by the pattern, it will be treated as a
         * match. This is useful in applications where you're walking through a
         * folder structure, and don't yet have the full path, but want to ensure that
         * you do not walk down paths that can never be a match.
         *
         * @default false
         *
         * @example
         * import minimatch = require("minimatch");
         *
         * minimatch('/a/b', '/a/*' + '/c/d', { partial: true })  // true, might be /a/b/c/d
         * minimatch('/a/b', '/**' + '/d', { partial: true })     // true, might be /a/b/.../d
         * minimatch('/x/y/z', '/a/**' + '/z', { partial: true }) // false, because x !== a
         */
        partial?: boolean;

        /**
         * Use `\\` as a path separator _only_, and _never_ as an escape
         * character. If set, all `\\` characters are replaced with `/` in
         * the pattern. Note that this makes it **impossible** to match
         * against paths containing literal glob pattern characters, but
         * allows matching with patterns constructed using `path.join()` and
         * `path.resolve()` on Windows platforms, mimicking the (buggy!)
         * behavior of earlier versions on Windows. Please use with
         * caution, and be mindful of the caveat about Windows paths
         *
         * For legacy reasons, this is also set if
         * `options.allowWindowsEscape` is set to the exact value `false`.
         *
         * @default false
         */
        windowsPathsNoEscape?: boolean;
    }

    /**
     * @deprecated Keep legacy interface to prevent unnecessary breakage.
     */
    type IMinimatchStatic = typeof Minimatch;
    /**
     * @deprecated Keep legacy interface to prevent unnecessary breakage.
     */
    type IMinimatch = Minimatch;

    /**
     * Create a minimatch object by instantiating the `minimatch.Minimatch` class.
     *
     * @example
     * import { Minimatch } from "minimatch";
     *
     * const mm = new Minimatch(pattern, options);
     */
    class Minimatch {
        constructor(pattern: string, options?: IOptions);

        static defaults(defaultOptions: IOptions): typeof Minimatch;

        /**
         * The original pattern the minimatch object represents.
         */
        pattern: string;

        /**
         * The options supplied to the constructor.
         */
        options: IOptions;

        /**
         * A 2-dimensional array of regexp or string expressions. Each row in the array corresponds
         * to a brace-expanded pattern. Each item in the row corresponds to a single path-part. For
         * example, the pattern `{a,b/c}/d` would expand to a set of patterns like:
         *
         * ```
         *   [ [ a, d ]
         *   , [ b, c, d ] ]
         * ```
         *
         * If a portion of the pattern doesn't have any "magic" in it (that is, it's something like `"foo"``
         * rather than `fo*o?`), then it will be left as a string rather than converted to a regular expression.
         */
        set: Array<Array<RegExp | string>>;

        /**
         * Created by the `makeRe` method. A single regular expression expressing the entire pattern. This is
         * useful in cases where you wish to use the pattern somewhat like `fnmatch(3)` with `FNM_PATH` enabled.
         */
        regexp: RegExp | false | null;

        /**
         * True if the pattern is negated.
         */
        negate: boolean;

        /**
         * True if the pattern is a comment.
         */
        comment: boolean;

        /**
         * True if the pattern is `""`.
         */
        empty: boolean;

        /**
         * True if windows path delimiters shouldn't be interpreted as escape characters.
         */
        windowsPathsNoEscape: boolean;

        /**
         * True if partial paths should be compared to a pattern.
         */
        partial: boolean;

        /**
         * Generate the `regexp` member if necessary, and return it. Will return `false` if the pattern is invalid.
         */
        makeRe(): RegExp | false;

        /**
         * @return `true` if the filename matches the pattern, or `false` otherwise.
         */
        match(fname: string, partial?: boolean): boolean;

        /**
         * Take a `/`-split filename, and match it against a single row in the `regExpSet`.
         * This method is mainly for internal use, but is exposed so that it can be used
         * by a glob-walker that needs to avoid excessive filesystem calls.
         */
        matchOne(file: readonly string[], pattern: ReadonlyArray<string | RegExp>, partial: boolean): boolean;

        /**
         * @deprecated. For internal use.
         */
        debug(): void;

        /**
         * @deprecated. For internal use.
         */
        make(): void;

        /**
         * @deprecated. For internal use.
         */
        parseNegate(): void;

        /**
         * @deprecated. For internal use.
         */
        braceExpand(): string[];

        /**
         * @deprecated. For internal use.
         */
        parse(pattern: string, isSub?: boolean): string | false | [string, boolean] | RegExp | typeof GLOBSTAR;
    }
}

export = minimatch;
