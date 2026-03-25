/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * @hidden
 */
export class StringUtils {
    /**
     * Check if stringified object is empty
     * @param strObj
     */
    static isEmptyObj(strObj?: string): boolean {
        if (strObj) {
            try {
                const obj = JSON.parse(strObj);
                return Object.keys(obj).length === 0;
            } catch (e) {}
        }
        return true;
    }

    static startsWith(str: string, search: string): boolean {
        return str.indexOf(search) === 0;
    }

    static endsWith(str: string, search: string): boolean {
        return (
            str.length >= search.length &&
            str.lastIndexOf(search) === str.length - search.length
        );
    }

    /**
     * Parses string into an object.
     *
     * @param query
     */
    static queryStringToObject<T>(query: string): T {
        const obj: {} = {};
        const params = query.split("&");
        const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, " "));
        params.forEach((pair) => {
            if (pair.trim()) {
                const [key, value] = pair.split(/=(.+)/g, 2); // Split on the first occurence of the '=' character
                if (key && value) {
                    obj[decode(key)] = decode(value);
                }
            }
        });
        return obj as T;
    }

    /**
     * Trims entries in an array.
     *
     * @param arr
     */
    static trimArrayEntries(arr: Array<string>): Array<string> {
        return arr.map((entry) => entry.trim());
    }

    /**
     * Removes empty strings from array
     * @param arr
     */
    static removeEmptyStringsFromArray(arr: Array<string>): Array<string> {
        return arr.filter((entry) => {
            return !!entry;
        });
    }

    /**
     * Attempts to parse a string into JSON
     * @param str
     */
    static jsonParseHelper<T>(str: string): T | null {
        try {
            return JSON.parse(str) as T;
        } catch (e) {
            return null;
        }
    }

    /**
     * Tests if a given string matches a given pattern, with support for wildcards and queries.
     * @param pattern Wildcard pattern to string match. Supports "*" for wildcards and "?" for queries
     * @param input String to match against
     */
    static matchPattern(pattern: string, input: string): boolean {
        /**
         * Wildcard support: https://stackoverflow.com/a/3117248/4888559
         * Queries: replaces "?" in string with escaped "\?" for regex test
         */
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex: RegExp = new RegExp(
            pattern
                .replace(/\\/g, "\\\\")
                .replace(/\*/g, "[^ ]*")
                .replace(/\?/g, "\\?")
        );

        return regex.test(input);
    }
}
