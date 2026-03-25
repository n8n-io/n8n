/**
 * Options for {@link AnsiEscape.formatForTests}.
 * @public
 */
export interface IAnsiEscapeConvertForTestsOptions {
    /**
     * If true then `\n` will be replaced by `[n]`, and `\r` will be replaced by `[r]`.
     */
    encodeNewlines?: boolean;
}
/**
 * Operations for working with text strings that contain
 * {@link https://en.wikipedia.org/wiki/ANSI_escape_code | ANSI escape codes}.
 * The most commonly used escape codes set the foreground/background color for console output.
 * @public
 */
export declare class AnsiEscape {
    private static readonly _csiRegExp;
    private static readonly _sgrRegExp;
    private static readonly _backslashNRegExp;
    private static readonly _backslashRRegExp;
    static getEscapeSequenceForAnsiCode(code: number): string;
    /**
     * Returns the input text with all ANSI escape codes removed.  For example, this is useful when saving
     * colorized console output to a log file.
     */
    static removeCodes(text: string): string;
    /**
     * Replaces ANSI escape codes with human-readable tokens.  This is useful for unit tests
     * that compare text strings in test assertions or snapshot files.
     */
    static formatForTests(text: string, options?: IAnsiEscapeConvertForTestsOptions): string;
    private static _tryGetSgrFriendlyName;
}
//# sourceMappingURL=AnsiEscape.d.ts.map