import { Interface as ReadlineInterface } from "readline";
import inquirer = require("../..");

/**
 * Represents a ui.
 */
declare class UI {
    /**
     * Gets or sets an object for performing read from and write to the console.
     */
    protected rl: ReadlineInterface;

    /**
     * Gets or sets the currently active prompt.
     */
    protected activePrompt: inquirer.prompts.PromptBase;

    /**
     * Initializes a new instance of the `UI` class.
     *
     * @param options
     * The input- and output-stream of the ui.
     */
    constructor(options?: inquirer.StreamOptions);

    /**
     * Handles a forced exit of the application.
     */
    protected onForceClose(): void;

    /**
     * Releases all unmanaged resources.
     */
    protected close(): void;
}

export = UI;
