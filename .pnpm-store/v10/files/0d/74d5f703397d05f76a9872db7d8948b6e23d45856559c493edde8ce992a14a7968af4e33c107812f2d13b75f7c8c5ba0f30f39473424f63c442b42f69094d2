/*! @azure/msal-common v15.17.0 2026-03-18 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * @hidden
 */
class StringUtils {
    /**
     * Check if stringified object is empty
     * @param strObj
     */
    static isEmptyObj(strObj) {
        if (strObj) {
            try {
                const obj = JSON.parse(strObj);
                return Object.keys(obj).length === 0;
            }
            catch (e) { }
        }
        return true;
    }
    static startsWith(str, search) {
        return str.indexOf(search) === 0;
    }
    static endsWith(str, search) {
        return (str.length >= search.length &&
            str.lastIndexOf(search) === str.length - search.length);
    }
    /**
     * Parses string into an object.
     *
     * @param query
     */
    static queryStringToObject(query) {
        const obj = {};
        const params = query.split("&");
        const decode = (s) => decodeURIComponent(s.replace(/\+/g, " "));
        params.forEach((pair) => {
            if (pair.trim()) {
                const [key, value] = pair.split(/=(.+)/g, 2); // Split on the first occurence of the '=' character
                if (key && value) {
                    obj[decode(key)] = decode(value);
                }
            }
        });
        return obj;
    }
    /**
     * Trims entries in an array.
     *
     * @param arr
     */
    static trimArrayEntries(arr) {
        return arr.map((entry) => entry.trim());
    }
    /**
     * Removes empty strings from array
     * @param arr
     */
    static removeEmptyStringsFromArray(arr) {
        return arr.filter((entry) => {
            return !!entry;
        });
    }
    /**
     * Attempts to parse a string into JSON
     * @param str
     */
    static jsonParseHelper(str) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Tests if a given string matches a given pattern, with support for wildcards and queries.
     * @param pattern Wildcard pattern to string match. Supports "*" for wildcards and "?" for queries
     * @param input String to match against
     */
    static matchPattern(pattern, input) {
        /**
         * Wildcard support: https://stackoverflow.com/a/3117248/4888559
         * Queries: replaces "?" in string with escaped "\?" for regex test
         */
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(pattern
            .replace(/\\/g, "\\\\")
            .replace(/\*/g, "[^ ]*")
            .replace(/\?/g, "\\?"));
        return regex.test(input);
    }
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
    static matchPatternStrict(pattern, input, options) {
        const component = options?.component;
        // Step 1: Escape all regex special characters so literals are matched literally.
        let regexBody = pattern.replace(/[.+^${}()|[\]\\*?]/g, "\\$&");
        // Step 2: Replace the escaped '*' with its component-aware regex equivalent.
        if (component === "host") {
            regexBody = regexBody.replace(/\\\*/g, "[^.]*");
        }
        else {
            // PATH, PROTOCOL, SEARCH, HASH, or unspecified: '*' matches any characters.
            regexBody = regexBody.replace(/\\\*/g, ".*");
        }
        // Step 3: Anchor for full-string matching.
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`^${regexBody}$`);
        return regex.test(input);
    }
}

export { StringUtils };
//# sourceMappingURL=StringUtils.mjs.map
