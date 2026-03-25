import { ThroughStream } from "through";
import inquirer = require("../..");
import UI = require("./baseUI");

/**
 * Represents the bottom-bar UI.
 */
declare class BottomBar extends UI {
    /**
     * Gets or sets a stream to write logs to.
     */
    log: ThroughStream;

    /**
     * Initializes a new instance of the `BottomBar` class.
     *
     * @param options
     * Provides options for the bottom-bar ui.
     */
    constructor(options?: inquirer.ui.BottomBarOptions);

    /**
     * Renders the specified `text` to the bottom bar.
     *
     * @param text
     * The text to print to the bottom bar.
     */
    updateBottomBar(text: string): this;

    /**
     * Renders the bottom bar.
     */
    protected render(): this;

    /**
     * Clean the bottom bar.
     */
    protected clean(): this;

    /**
     * Writes a message to the bottom bar.
     *
     * @param message
     * The message to write.
     */
    protected write(message: string): void;

    /**
     * Writes the specified `data` to the log-zone.
     *
     * @param data
     * The data to write to the log-zone.
     */
    protected writeLog(data: any): this;

    /**
     * Fixes the new-line characters of the specified `text`.
     *
     * @param text
     * The text to process.
     */
    protected enforceLF(text: string): string;
}

export = BottomBar;
