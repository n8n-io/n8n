/**
 * Options for the writer.
 */
export interface Options {
    /**
     * Newline character.
     * @remarks Defaults to \n.
     */
    newLine: "\n" | "\r\n";
    /**
     * Number of spaces to indent when `useTabs` is false.
     * @remarks Defaults to 4.
     */
    indentNumberOfSpaces: number;
    /**
     * Whether to use tabs (true) or spaces (false).
     * @remarks Defaults to false.
     */
    useTabs: boolean;
    /**
     * Whether to use a single quote (true) or double quote (false).
     * @remarks Defaults to false.
     */
    useSingleQuote: boolean;
}
/**
 * Code writer that assists with formatting and visualizing blocks of JavaScript or TypeScript code.
 */
export default class CodeBlockWriter {
    /**
     * Constructor.
     * @param opts - Options for the writer.
     */
    constructor(opts?: Partial<Options>);
    /**
     * Gets the options.
     */
    getOptions(): Options;
    /**
     * Queues the indentation level for the next lines written.
     * @param indentationLevel - Indentation level to queue.
     */
    queueIndentationLevel(indentationLevel: number): this;
    /**
     * Queues the indentation level for the next lines written using the provided indentation text.
     * @param whitespaceText - Gets the indentation level from the indentation text.
     */
    queueIndentationLevel(whitespaceText: string): this;
    /**
     * Writes the text within the provided action with hanging indentation.
     * @param action - Action to perform with hanging indentation.
     */
    hangingIndent(action: () => void): this;
    /**
     * Writes the text within the provided action with hanging indentation unless writing a block.
     * @param action - Action to perform with hanging indentation unless a block is written.
     */
    hangingIndentUnlessBlock(action: () => void): this;
    /**
     * Sets the current indentation level.
     * @param indentationLevel - Indentation level to be at.
     */
    setIndentationLevel(indentationLevel: number): this;
    /**
     * Sets the current indentation using the provided indentation text.
     * @param whitespaceText - Gets the indentation level from the indentation text.
     */
    setIndentationLevel(whitespaceText: string): this;
    /**
     * Sets the indentation level within the provided action and restores the writer's indentation
     * state afterwards.
     * @remarks Restores the writer's state after the action.
     * @param indentationLevel - Indentation level to set.
     * @param action - Action to perform with the indentation.
     */
    withIndentationLevel(indentationLevel: number, action: () => void): this;
    /**
     * Sets the indentation level with the provided indentation text within the provided action
     * and restores the writer's indentation state afterwards.
     * @param whitespaceText - Gets the indentation level from the indentation text.
     * @param action - Action to perform with the indentation.
     */
    withIndentationLevel(whitespaceText: string, action: () => void): this;
    /**
     * Gets the current indentation level.
     */
    getIndentationLevel(): number;
    /**
     * Writes a block using braces.
     * @param block - Write using the writer within this block.
     */
    block(block?: () => void): this;
    /**
     * Writes an inline block with braces.
     * @param block - Write using the writer within this block.
     */
    inlineBlock(block?: () => void): this;
    /**
     * Indents the code one level for the current line.
     */
    indent(times?: number): this;
    /**
     * Indents a block of code.
     * @param block - Block to indent.
     */
    indent(block: () => void): this;
    /**
     * Conditionally writes a line of text.
     * @param condition - Condition to evaluate.
     * @param textFunc - A function that returns a string to write if the condition is true.
     */
    conditionalWriteLine(condition: boolean | undefined, textFunc: () => string): this;
    /**
     * Conditionally writes a line of text.
     * @param condition - Condition to evaluate.
     * @param text - Text to write if the condition is true.
     */
    conditionalWriteLine(condition: boolean | undefined, text: string): this;
    /**
     * Writes a line of text.
     * @param text - String to write.
     */
    writeLine(text: string): this;
    /**
     * Writes a newline if the last line was not a newline.
     */
    newLineIfLastNot(): this;
    /**
     * Writes a blank line if the last written text was not a blank line.
     */
    blankLineIfLastNot(): this;
    /**
     * Writes a blank line if the condition is true.
     * @param condition - Condition to evaluate.
     */
    conditionalBlankLine(condition: boolean | undefined): this;
    /**
     * Writes a blank line.
     */
    blankLine(): this;
    /**
     * Writes a newline if the condition is true.
     * @param condition - Condition to evaluate.
     */
    conditionalNewLine(condition: boolean | undefined): this;
    /**
     * Writes a newline.
     */
    newLine(): this;
    /**
     * Writes a quote character.
     */
    quote(): this;
    /**
     * Writes text surrounded in quotes.
     * @param text - Text to write.
     */
    quote(text: string): this;
    /**
     * Writes a space if the last character was not a space.
     */
    spaceIfLastNot(): this;
    /**
     * Writes a space.
     * @param times - Number of times to write a space.
     */
    space(times?: number): this;
    /**
     * Writes a tab if the last character was not a tab.
     */
    tabIfLastNot(): this;
    /**
     * Writes a tab.
     * @param times - Number of times to write a tab.
     */
    tab(times?: number): this;
    /**
     * Conditionally writes text.
     * @param condition - Condition to evaluate.
     * @param textFunc - A function that returns a string to write if the condition is true.
     */
    conditionalWrite(condition: boolean | undefined, textFunc: () => string): this;
    /**
     * Conditionally writes text.
     * @param condition - Condition to evaluate.
     * @param text - Text to write if the condition is true.
     */
    conditionalWrite(condition: boolean | undefined, text: string): this;
    /**
     * Writes the provided text.
     * @param text - Text to write.
     */
    write(text: string): this;
    /**
     * Writes text to exit a comment if in a comment.
     */
    closeComment(): this;
    /**
     * Inserts text at the provided position.
     *
     * This method is "unsafe" because it won't update the state of the writer unless
     * inserting at the end position. It is biased towards being fast at inserting closer
     * to the start or end, but slower to insert in the middle. Only use this if
     * absolutely necessary.
     * @param pos - Position to insert at.
     * @param text - Text to insert.
     */
    unsafeInsert(pos: number, text: string): this;
    /**
     * Gets the length of the string in the writer.
     */
    getLength(): number;
    /**
     * Gets if the writer is currently in a comment.
     */
    isInComment(): boolean;
    /**
     * Gets if the writer is currently at the start of the first line of the text, block, or indentation block.
     */
    isAtStartOfFirstLineOfBlock(): boolean;
    /**
     * Gets if the writer is currently on the first line of the text, block, or indentation block.
     */
    isOnFirstLineOfBlock(): boolean;
    /**
     * Gets if the writer is currently in a string.
     */
    isInString(): boolean;
    /**
     * Gets if the last chars written were for a newline.
     */
    isLastNewLine(): boolean;
    /**
     * Gets if the last chars written were for a blank line.
     */
    isLastBlankLine(): boolean;
    /**
     * Gets if the last char written was a space.
     */
    isLastSpace(): boolean;
    /**
     * Gets if the last char written was a tab.
     */
    isLastTab(): boolean;
    /**
     * Gets the last char written.
     */
    getLastChar(): string | undefined;
    /**
     * Gets if the writer ends with the provided text.
     * @param text - Text to check if the writer ends with the provided text.
     */
    endsWith(text: string): boolean;
    /**
     * Iterates over the writer characters in reverse order. The iteration stops when a non-null or
     * undefined value is returned from the action. The returned value is then returned by the method.
     *
     * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
     * will combine the internal array into a string.
     */
    iterateLastChars<T>(action: (char: string, index: number) => T | undefined): T | undefined;
    /**
     * Iterates over the writer character char codes in reverse order. The iteration stops when a non-null or
     * undefined value is returned from the action. The returned value is then returned by the method.
     *
     * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
     * will combine the internal array into a string. Additionally, this is slightly more efficient that
     * `iterateLastChars` as this won't allocate a string per character.
     */
    iterateLastCharCodes<T>(action: (charCode: number, index: number) => T | undefined): T | undefined;
    /**
     * Gets the writer's text.
     */
    toString(): string;
}
//# sourceMappingURL=mod.d.ts.map