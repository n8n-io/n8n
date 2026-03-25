# Installation
> `npm install --save @types/replacestream`

# Summary
This package contains type definitions for replacestream (https://github.com/eugeneware/replacestream#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/replacestream.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/replacestream/index.d.ts)
````ts
// Type definitions for replacestream 4.0
// Project: https://github.com/eugeneware/replacestream#readme
// Definitions by: Piotr Roszatycki <https://github.com/dex4er>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare namespace ReplaceStream {
    interface Options {
        /**
         * Sets a limit on the number of times the replacement will be made. This
         * is forced to one when a regex without the global flag is provided.
         *
         * Default: `Infinity`
         */
        limit?: number | undefined;
        /**
         * The text encoding used during search and replace.
         *
         * Default: `"utf8"`
         */
        encoding?: string | undefined;
        /**
         * When doing cross-chunk replacing, this sets the maximum length match
         * that will be supported.
         *
         * Default: `100`
         */
        maxMatchLen?: number | undefined;
        /**
         * When doing string match (not relevant for regex matching) whether to do a
         * case insensitive search.
         *
         * Default: `true`
         */
        ignoreCase?: boolean | undefined;
        /**
         * When provided, these flags will be used when creating the search regexes
         * internally.
         *
         * @deprecated as the flags set on the regex provided are no longer mutated
         * if this is not provided.
         */
        regExpOptions?: string | undefined;
    }

    type ReplaceFunction = (match: string, p1: string, offset: number, string: string) => string;
}

declare function ReplaceStream(
    search: RegExp | string,
    replace: ReplaceStream.ReplaceFunction | string,
    options?: ReplaceStream.Options
): any;

export = ReplaceStream;

````

### Additional Details
 * Last updated: Thu, 08 Jul 2021 22:42:00 GMT
 * Dependencies: none
 * Global values: none

# Credits
These definitions were written by [Piotr Roszatycki](https://github.com/dex4er).
