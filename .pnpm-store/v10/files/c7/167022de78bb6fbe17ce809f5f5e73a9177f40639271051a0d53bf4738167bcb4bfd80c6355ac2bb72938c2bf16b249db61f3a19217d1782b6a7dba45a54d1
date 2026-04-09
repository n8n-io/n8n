import chalk from 'chalk';
export declare class PrefixColorSelector {
    private colorGenerator;
    constructor(customColors?: string | string[]);
    /** A list of colors that are readable in a terminal. */
    static get ACCEPTABLE_CONSOLE_COLORS(): ("stderr" | keyof chalk.Chalk | "supportsColor" | "Level" | "Color" | "ForegroundColor" | "BackgroundColor" | "Modifiers")[];
    /**
     * @returns The given custom colors then a set of acceptable console colors indefinitely.
     */
    getNextColor(): string;
}
