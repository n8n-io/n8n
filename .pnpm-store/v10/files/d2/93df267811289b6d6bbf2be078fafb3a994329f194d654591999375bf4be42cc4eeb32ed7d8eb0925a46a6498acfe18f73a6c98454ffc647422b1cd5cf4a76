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
    options?: ReplaceStream.Options,
): any;

export = ReplaceStream;
