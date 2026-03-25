import { Interface as ReadLineInterface } from "readline";

/**
 * Provides the functionality to manage the content of a console-screen.
 */
declare class ScreenManager {
    /**
     * Gets or sets the height of the screen.
     */
    height: number;

    /**
     * Gets or sets the number of extra-lines below the prompt.
     */
    extraLinesUnderPrompt: number;

    /**
     * Gets or sets an object for performing read from and write to the console.
     */
    rl: ReadLineInterface;

    /**
     * Initializes a new instance of the `ScreenManager` class.
     *
     * @param readLine
     * An object for performing read from and write to the console.
     */
    constructor(readLine: ReadLineInterface);

    /**
     * Renders content to the screen.
     *
     * @param content
     * The content to render.
     *
     * @param bottomContent
     * The content to render to the bottom of the screen.
     */
    render(content: string, bottomContent: string): void;

    /**
     * Cleans all lines expect the first `extraLines`.
     *
     * @param extraLines
     * The number of lines at the begin to skip.
     */
    clean(extraLines: number): void;

    /**
     * Releases all unmanaged resources.
     */
    done(): void;

    /**
     * Releases the cursor.
     */
    releaseCursor(): void;

    /**
     * Identifies the width of the screen.
     *
     * @returns
     * The width of the screen.
     */
    protected normalizedCliWidth(): number;

    /**
     * Splits the `text` into multiple lines with the specified max `width`.
     *
     * @param text
     * The text to process.
     *
     * @param width
     * The max width of each line.
     */
    protected breakLines(text: string, width: number): string[];

    /**
     * Adds line-breaks to the specified `text` with the specified max `width`.
     *
     * @param text
     * The text to process.
     *
     * @param width
     * The max width of each line.
     */
    protected forceLineReturn(text: string, width: number): string;
}

export = ScreenManager;
