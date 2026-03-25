/**
 * The allowed types of encodings, as supported by Node.js
 * @public
 */
export declare enum Encoding {
    Utf8 = "utf8"
}
/**
 * Enumeration controlling conversion of newline characters.
 * @public
 */
export declare enum NewlineKind {
    /**
     * Windows-style newlines
     */
    CrLf = "\r\n",
    /**
     * POSIX-style newlines
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    Lf = "\n",
    /**
     * Default newline type for this operating system (`os.EOL`).
     */
    OsDefault = "os"
}
/**
 * Options used when calling the {@link Text.readLinesFromIterable} or
 * {@link Text.readLinesFromIterableAsync} methods.
 *
 * @public
 */
export interface IReadLinesFromIterableOptions {
    /**
     * The encoding of the input iterable. The default is utf8.
     */
    encoding?: Encoding;
    /**
     * If true, empty lines will not be returned. The default is false.
     */
    ignoreEmptyLines?: boolean;
}
/**
 * Operations for working with strings that contain text.
 *
 * @remarks
 * The utilities provided by this class are intended to be simple, small, and very
 * broadly applicable.
 *
 * @public
 */
export declare class Text {
    private static readonly _newLineRegEx;
    private static readonly _newLineAtEndRegEx;
    /**
     * Returns the same thing as targetString.replace(searchValue, replaceValue), except that
     * all matches are replaced, rather than just the first match.
     * @param input         - The string to be modified
     * @param searchValue   - The value to search for
     * @param replaceValue  - The replacement text
     */
    static replaceAll(input: string, searchValue: string, replaceValue: string): string;
    /**
     * Converts all newlines in the provided string to use Windows-style CRLF end of line characters.
     */
    static convertToCrLf(input: string): string;
    /**
     * Converts all newlines in the provided string to use POSIX-style LF end of line characters.
     *
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToLf(input: string): string;
    /**
     * Converts all newlines in the provided string to use the specified newline type.
     */
    static convertTo(input: string, newlineKind: NewlineKind): string;
    /**
     * Returns the newline character sequence for the specified `NewlineKind`.
     */
    static getNewline(newlineKind: NewlineKind): string;
    /**
     * Append characters to the end of a string to ensure the result has a minimum length.
     * @remarks
     * If the string length already exceeds the minimum length, then the string is unchanged.
     * The string is not truncated.
     */
    static padEnd(s: string, minimumLength: number, paddingCharacter?: string): string;
    /**
     * Append characters to the start of a string to ensure the result has a minimum length.
     * @remarks
     * If the string length already exceeds the minimum length, then the string is unchanged.
     * The string is not truncated.
     */
    static padStart(s: string, minimumLength: number, paddingCharacter?: string): string;
    /**
     * If the string is longer than maximumLength characters, truncate it to that length
     * using "..." to indicate the truncation.
     *
     * @remarks
     * For example truncateWithEllipsis('1234578', 5) would produce '12...'.
     */
    static truncateWithEllipsis(s: string, maximumLength: number): string;
    /**
     * Returns the input string with a trailing `\n` character appended, if not already present.
     */
    static ensureTrailingNewline(s: string, newlineKind?: NewlineKind): string;
    /**
     * Escapes a string so that it can be treated as a literal string when used in a regular expression.
     */
    static escapeRegExp(literal: string): string;
    /**
     * Read lines from an iterable object that returns strings or buffers, and return a generator that
     * produces the lines as strings. The lines will not include the newline characters.
     *
     * @param iterable - An iterable object that returns strings or buffers
     * @param options - Options used when reading the lines from the provided iterable
     */
    static readLinesFromIterableAsync(iterable: AsyncIterable<string | Buffer>, options?: IReadLinesFromIterableOptions): AsyncGenerator<string>;
    /**
     * Read lines from an iterable object that returns strings or buffers, and return a generator that
     * produces the lines as strings. The lines will not include the newline characters.
     *
     * @param iterable - An iterable object that returns strings or buffers
     * @param options - Options used when reading the lines from the provided iterable
     */
    static readLinesFromIterable(iterable: Iterable<string | Buffer | null>, options?: IReadLinesFromIterableOptions): Generator<string>;
    /**
     * Returns a new string that is the input string with the order of characters reversed.
     */
    static reverse(s: string): string;
    /**
     * Splits the provided string by newlines. Note that leading and trailing newlines will produce
     * leading or trailing empty string array entries.
     */
    static splitByNewLines(s: undefined): undefined;
    static splitByNewLines(s: string): string[];
    static splitByNewLines(s: string | undefined): string[] | undefined;
}
//# sourceMappingURL=Text.d.ts.map