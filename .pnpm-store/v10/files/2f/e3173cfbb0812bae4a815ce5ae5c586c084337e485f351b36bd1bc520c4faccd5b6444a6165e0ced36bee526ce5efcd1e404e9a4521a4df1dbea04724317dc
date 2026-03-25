import { NodePropSource, NodeProp } from '@lezer/common';
import { ExternalTokenizer, Stack, ContextTracker, LRParser } from '@lezer/lr';

type BuildOptions = {
    /**
    The name of the grammar file
    */
    fileName?: string;
    /**
    A function that should be called with warnings. The default is
    to call `console.warn`.
    */
    warn?: (message: string) => void;
    /**
    Whether to include term names in the output file. Defaults to
    false.
    */
    includeNames?: boolean;
    /**
    Determines the module system used by the output file. Can be
    either `"cjs"` (CommonJS) or `"es"` (ES2015 module), defaults to
    `"es"`.
    */
    moduleStyle?: string;
    /**
    Set this to true to output TypeScript code instead of plain
    JavaScript.
    */
    typeScript?: boolean;
    /**
    The name of the export that holds the parser in the output file.
    Defaults to `"parser"`.
    */
    exportName?: string;
    /**
    When calling `buildParser`, this can be used to provide
    placeholders for external tokenizers.
    */
    externalTokenizer?: (name: string, terms: {
        [name: string]: number;
    }) => ExternalTokenizer;
    /**
    Used by `buildParser` to resolve external prop sources.
    */
    externalPropSource?: (name: string) => NodePropSource;
    /**
    Provide placeholders for external specializers when using
    `buildParser`.
    */
    externalSpecializer?: (name: string, terms: {
        [name: string]: number;
    }) => (value: string, stack: Stack) => number;
    /**
    If given, will be used to initialize external props in the parser
    returned by `buildParser`.
    */
    externalProp?: (name: string) => NodeProp<any>;
    /**
    If given, will be used as context tracker in a parser built with
    `buildParser`.
    */
    contextTracker?: ContextTracker<any> | ((terms: {
        [name: string]: number;
    }) => ContextTracker<any>);
};
/**
Build an in-memory parser instance for a given grammar. This is
mostly useful for testing. If your grammar uses external
tokenizers, you'll have to provide the `externalTokenizer` option
for the returned parser to be able to parse anything.
*/
declare function buildParser(text: string, options?: BuildOptions): LRParser;
/**
Build the code that represents the parser tables for a given
grammar description. The `parser` property in the return value
holds the main file that exports the `Parser` instance. The
`terms` property holds a declaration file that defines constants
for all of the named terms in grammar, holding their ids as value.
This is useful when external code, such as a tokenizer, needs to
be able to use these ids. It is recommended to run a tree-shaking
bundler when importing this file, since you usually only need a
handful of the many terms in your code.
*/
declare function buildParserFile(text: string, options?: BuildOptions): {
    parser: string;
    terms: string;
};

/**
The type of error raised when the parser generator finds an issue.
*/
declare class GenError extends Error {
}

export { type BuildOptions, GenError, buildParser, buildParserFile };
