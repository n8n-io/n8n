export type Settings = {
    /**
     * Set the terminal width to a specified number of columns (characters)
     *
     * Environment Variable:
     *   OCLIF_COLUMNS=80
     */
    columns?: number | undefined;
    /**
     * Show additional debug output without DEBUG. Mainly shows stackstraces.
     *
     * Useful to set in the ./bin/dev.js script.
     * oclif.settings.debug = true;
     */
    debug?: boolean | undefined;
    /**
     * Enable performance tracking. Resulting data is available in the `perf` property of the `Config` class.
     * This will be overridden by the `enablePerf` property passed into Config constructor.
     */
    performanceEnabled?: boolean | undefined;
    /**
     * Try to use ts-node to load typescript source files instead of javascript files.
     * Defaults to true in development and test environments (e.g. using bin/dev.js or
     * NODE_ENV=development or NODE_ENV=test).
     *
     * @deprecated use enableAutoTranspile instead.
     */
    tsnodeEnabled?: boolean | undefined;
    /**
     * Enable automatic transpilation of TypeScript files to JavaScript.
     *
     * Defaults to true in development and test environments (e.g. using bin/dev.js or NODE_ENV=development or NODE_ENV=test).
     */
    enableAutoTranspile?: boolean | undefined;
};
export declare const settings: Settings;
