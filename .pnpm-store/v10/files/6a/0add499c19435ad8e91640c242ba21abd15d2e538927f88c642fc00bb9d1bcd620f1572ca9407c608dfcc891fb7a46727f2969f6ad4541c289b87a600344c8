import { Omit } from "ast-types/types";
/**
 * All Recast API functions take second parameter with configuration options,
 * documented in options.js
 */
export interface Options extends DeprecatedOptions {
    /**
     * If you want to use a different branch of esprima, or any other module
     * that supports a .parse function, pass that module object to
     * recast.parse as options.parser (legacy synonym: options.esprima).
     * @default require("recast/parsers/esprima")
     */
    parser?: any;
    /**
     * Number of spaces the pretty-printer should use per tab for
     * indentation. If you do not pass this option explicitly, it will be
     * (quite reliably!) inferred from the original code.
     * @default 4
     */
    tabWidth?: number;
    /**
     * If you really want the pretty-printer to use tabs instead of spaces,
     * make this option true.
     * @default false
     */
    useTabs?: boolean;
    /**
     * The reprinting code leaves leading whitespace untouched unless it has
     * to reindent a line, or you pass false for this option.
     * @default true
     */
    reuseWhitespace?: boolean;
    /**
     * Override this option to use a different line terminator, e.g. \r\n.
     * @default require("os").EOL || "\n"
     */
    lineTerminator?: string;
    /**
     * Some of the pretty-printer code (such as that for printing function
     * parameter lists) makes a valiant attempt to prevent really long
     * lines. You can adjust the limit by changing this option; however,
     * there is no guarantee that line length will fit inside this limit.
     * @default 74
     */
    wrapColumn?: number;
    /**
     * Pass a string as options.sourceFileName to recast.parse to tell the
     * reprinter to keep track of reused code so that it can construct a
     * source map automatically.
     * @default null
     */
    sourceFileName?: string | null;
    /**
     * Pass a string as options.sourceMapName to recast.print, and (provided
     * you passed options.sourceFileName earlier) the PrintResult of
     * recast.print will have a .map property for the generated source map.
     * @default null
     */
    sourceMapName?: string | null;
    /**
     * If provided, this option will be passed along to the source map
     * generator as a root directory for relative source file paths.
     * @default null
     */
    sourceRoot?: string | null;
    /**
     * If you provide a source map that was generated from a previous call
     * to recast.print as options.inputSourceMap, the old source map will be
     * composed with the new source map.
     * @default null
     */
    inputSourceMap?: string | null;
    /**
     * If you want esprima to generate .range information (recast only uses
     * .loc internally), pass true for this option.
     * @default false
     */
    range?: boolean;
    /**
     * If you want esprima not to throw exceptions when it encounters
     * non-fatal errors, keep this option true.
     * @default true
     */
    tolerant?: boolean;
    /**
     * If you want to override the quotes used in string literals, specify
     * either "single", "double", or "auto" here ("auto" will select the one
     * which results in the shorter literal) Otherwise, use double quotes.
     * @default null
     */
    quote?: "single" | "double" | "auto" | null;
    /**
     * Controls the printing of trailing commas in object literals, array
     * expressions and function parameters.
     *
     * This option could either be:
     * * Boolean - enable/disable in all contexts (objects, arrays and function params).
     * * Object - enable/disable per context.
     *
     * Example:
     * trailingComma: {
     *   objects: true,
     *   arrays: true,
     *   parameters: false,
     * }
     *
     * @default false
     */
    trailingComma?: boolean;
    /**
     * Controls the printing of spaces inside array brackets.
     * See: http://eslint.org/docs/rules/array-bracket-spacing
     * @default false
     */
    arrayBracketSpacing?: boolean;
    /**
     * Controls the printing of spaces inside object literals,
     * destructuring assignments, and import/export specifiers.
     * See: http://eslint.org/docs/rules/object-curly-spacing
     * @default true
     */
    objectCurlySpacing?: boolean;
    /**
     * If you want parenthesis to wrap single-argument arrow function
     * parameter lists, pass true for this option.
     * @default false
     */
    arrowParensAlways?: boolean;
    /**
     * There are 2 supported syntaxes (`,` and `;`) in Flow Object Types;
     * The use of commas is in line with the more popular style and matches
     * how objects are defined in JS, making it a bit more natural to write.
     * @default true
     */
    flowObjectCommas?: boolean;
    /**
     * Whether to return an array of .tokens on the root AST node.
     * @default true
     */
    tokens?: boolean;
}
interface DeprecatedOptions {
    /** @deprecated */
    esprima?: any;
}
export declare type NormalizedOptions = Required<Omit<Options, keyof DeprecatedOptions>>;
export declare function normalize(opts?: Options): NormalizedOptions;
export {};
