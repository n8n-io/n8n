/**
 * @hidden
 */
export declare class StringUtils {
    /**
     * Check if stringified object is empty
     * @param strObj
     */
    static isEmptyObj(strObj?: string): boolean;
    static startsWith(str: string, search: string): boolean;
    static endsWith(str: string, search: string): boolean;
    /**
     * Parses string into an object.
     *
     * @param query
     */
    static queryStringToObject<T>(query: string): T;
    /**
     * Trims entries in an array.
     *
     * @param arr
     */
    static trimArrayEntries(arr: Array<string>): Array<string>;
    /**
     * Removes empty strings from array
     * @param arr
     */
    static removeEmptyStringsFromArray(arr: Array<string>): Array<string>;
    /**
     * Attempts to parse a string into JSON
     * @param str
     */
    static jsonParseHelper<T>(str: string): T | null;
    /**
     * Tests if a given string matches a given pattern, with support for wildcards and queries.
     * @param pattern Wildcard pattern to string match. Supports "*" for wildcards and "?" for queries
     * @param input String to match against
     */
    static matchPattern(pattern: string, input: string): boolean;
    /**
     * Tests if a given string matches a given pattern using stricter, anchored matching semantics.
     *
     * Differences from `matchPattern` (legacy):
     * - All regex metacharacters (including `.`) in the pattern are treated as literals,
     *   so `example.com` matches only `example.com` and not `exampleXcom`.
     * - The generated regex is anchored with `^` and `$` so partial/substring matches
     *   are not allowed.
     * - `*` is the only supported wildcard. Its behaviour depends on the URL component:
     *   - `host` component: `*` matches any sequence of characters that does NOT include
     *     a dot (`.`), keeping wildcards within a single DNS label boundary.
     *   - All other components: `*` matches any sequence of characters (including `/`).
     *
     * @param pattern - The `protectedResourceMap` key pattern to match against. `*` is a
     *   multi-character wildcard; all other characters are treated as literals.
     * @param input - The URL component value (e.g. host, pathname) extracted from the
     *   outgoing request URL to test against the pattern.
     * @param options - Optional. Provide `component` to enable component-aware wildcard
     *   semantics. Accepted values: `"host"`, `"path"`, `"protocol"`, `"search"`,
     *   `"hash"`. Defaults to path-style (permissive) matching when omitted.
     * @returns `true` if the full input string matches the pattern; `false` otherwise.
     */
    static matchPatternStrict(pattern: string, input: string, options?: {
        component?: "host" | "path" | "protocol" | "search" | "hash";
    }): boolean;
}
//# sourceMappingURL=StringUtils.d.ts.map