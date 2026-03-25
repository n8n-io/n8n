import type { ITerminal } from './ITerminal';
/**
 * A sensible fallback column width for consoles.
 *
 * @public
 */
export declare const DEFAULT_CONSOLE_WIDTH: number;
/**
 * A collection of utilities for printing messages to the console.
 *
 * @public
 */
export declare class PrintUtilities {
    /**
     * Returns the width of the console, measured in columns
     */
    static getConsoleWidth(): number | undefined;
    /**
     * Applies word wrapping.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indent - The number of spaces to indent the wrapped lines, defaults to 0
     */
    static wrapWords(text: string, maxLineLength?: number, indent?: number): string;
    /**
     * Applies word wrapping.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param linePrefix - The string to prefix each line with, defaults to ''
     */
    static wrapWords(text: string, maxLineLength?: number, linePrefix?: string): string;
    /**
     * Applies word wrapping.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indentOrLinePrefix - The number of spaces to indent the wrapped lines or the string to prefix
     * each line with, defaults to no prefix
     */
    static wrapWords(text: string, maxLineLength?: number, indentOrLinePrefix?: number | string): string;
    /**
     * Applies word wrapping and returns an array of lines.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indent - The number of spaces to indent the wrapped lines, defaults to 0
     */
    static wrapWordsToLines(text: string, maxLineLength?: number, indent?: number): string[];
    /**
     * Applies word wrapping and returns an array of lines.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param linePrefix - The string to prefix each line with, defaults to ''
     */
    static wrapWordsToLines(text: string, maxLineLength?: number, linePrefix?: string): string[];
    /**
     * Applies word wrapping and returns an array of lines.
     *
     * @param text - The text to wrap
     * @param maxLineLength - The maximum length of a line, defaults to the console width
     * @param indentOrLinePrefix - The number of spaces to indent the wrapped lines or the string to prefix
     * each line with, defaults to no prefix
     */
    static wrapWordsToLines(text: string, maxLineLength?: number, indentOrLinePrefix?: number | string): string[];
    /**
     * Displays a message in the console wrapped in a box UI.
     *
     * @param message - The message to display.
     * @param terminal - The terminal to write the message to.
     * @param boxWidth - The width of the box, defaults to half of the console width.
     */
    static printMessageInBox(message: string, terminal: ITerminal, boxWidth?: number): void;
}
//# sourceMappingURL=PrintUtilities.d.ts.map