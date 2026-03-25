import { type IStringBuilder } from '@rushstack/node-core-library';
/**
 * A utility for writing indented text.
 *
 * @remarks
 *
 * Note that the indentation is inserted at the last possible opportunity.
 * For example, this code...
 *
 * ```ts
 *   writer.write('begin\n');
 *   writer.increaseIndent();
 *   writer.write('one\ntwo\n');
 *   writer.decreaseIndent();
 *   writer.increaseIndent();
 *   writer.decreaseIndent();
 *   writer.write('end');
 * ```
 *
 * ...would produce this output:
 *
 * ```
 *   begin
 *     one
 *     two
 *   end
 * ```
 */
export declare class IndentedWriter {
    /**
     * The text characters used to create one level of indentation.
     * Two spaces by default.
     */
    defaultIndentPrefix: string;
    /**
     * Whether to indent blank lines
     */
    indentBlankLines: boolean;
    /**
     * Trims leading spaces from the input text before applying the indent.
     *
     * @remarks
     * Consider the following example:
     *
     * ```ts
     * indentedWriter.increaseIndent('    '); // four spaces
     * indentedWriter.write('  a\n  b  c\n');
     * indentedWriter.decreaseIndent();
     * ```
     *
     * Normally the output would be indented by 6 spaces: 4 from `increaseIndent()`, plus the 2 spaces
     * from `write()`:
     * ```
     *       a
     *       b  c
     * ```
     *
     * Setting `trimLeadingSpaces=true` will trim the leading spaces, so that the lines are indented
     * by 4 spaces only:
     * ```
     *     a
     *     b  c
     * ```
     */
    trimLeadingSpaces: boolean;
    private readonly _builder;
    private _latestChunk;
    private _previousChunk;
    private _atStartOfLine;
    private readonly _indentStack;
    private _indentText;
    private _previousLineIsBlank;
    private _currentLineIsBlank;
    constructor(builder?: IStringBuilder);
    /**
     * Retrieves the output that was built so far.
     */
    getText(): string;
    toString(): string;
    /**
     * Increases the indentation.  Normally the indentation is two spaces,
     * however an arbitrary prefix can optional be specified.  (For example,
     * the prefix could be "// " to indent and comment simultaneously.)
     * Each call to IndentedWriter.increaseIndent() must be followed by a
     * corresponding call to IndentedWriter.decreaseIndent().
     */
    increaseIndent(indentPrefix?: string): void;
    /**
     * Decreases the indentation, reverting the effect of the corresponding call
     * to IndentedWriter.increaseIndent().
     */
    decreaseIndent(): void;
    /**
     * A shorthand for ensuring that increaseIndent()/decreaseIndent() occur
     * in pairs.
     */
    indentScope(scope: () => void, indentPrefix?: string): void;
    /**
     * Adds a newline if the file pointer is not already at the start of the line (or start of the stream).
     */
    ensureNewLine(): void;
    /**
     * Adds up to two newlines to ensure that there is a blank line above the current position.
     * The start of the stream is considered to be a blank line, so `ensureSkippedLine()` has no effect
     * unless some text has been written.
     */
    ensureSkippedLine(): void;
    /**
     * Returns the last character that was written, or an empty string if no characters have been written yet.
     */
    peekLastCharacter(): string;
    /**
     * Returns the second to last character that was written, or an empty string if less than one characters
     * have been written yet.
     */
    peekSecondLastCharacter(): string;
    /**
     * Writes some text to the internal string buffer, applying indentation according
     * to the current indentation level.  If the string contains multiple newlines,
     * each line will be indented separately.
     */
    write(message: string): void;
    /**
     * A shorthand for writing an optional message, followed by a newline.
     * Indentation is applied following the semantics of IndentedWriter.write().
     */
    writeLine(message?: string): void;
    /**
     * Writes a string that does not contain any newline characters.
     */
    private _writeLinePart;
    private _writeNewLine;
    private _write;
    private _updateIndentText;
}
//# sourceMappingURL=IndentedWriter.d.ts.map