/**
 * The javascript type of a command line option.
 */
export type OptionType = "array" | "string" | "boolean" | "inverted-boolean";
/**
 * Schema definition of a command line option.
 */
export type OptionSchema = {
    /**
     * The flag of the command line option including dashes.
     */
    param: string;
    /**
     * The value type of the command line option.
     */
    type: OptionType;
    /**
     * The flag of the command line option including dashes (optional).
     */
    invertedParam?: string;
};
/**
 * Schema definition for a command.
 */
export type OptionsSchema = {
    [x: string]: OptionSchema;
};
/**
 * Runs `sentry-cli` with the given command line arguments.
 *
 * Use {@link prepareCommand} to specify the command and add arguments for command-
 * specific options. For top-level options, use {@link serializeOptions} directly.
 *
 * The returned promise resolves with the standard output of the command invocation
 * including all newlines. In order to parse this output, be sure to trim the output
 * first.
 *
 * If the command failed to execute, the Promise rejects with the error returned by the
 * CLI. This error includes a `code` property with the process exit status.
 *
 * @example
 * const output = await execute(['--version']);
 * expect(output.trim()).toBe('sentry-cli x.y.z');
 *
 * @param {string[]} args Command line arguments passed to `sentry-cli`.
 * @param {boolean | 'rejectOnError'} live can be set to:
 *  - `true` to inherit stdio to display `sentry-cli` output directly.
 *  - `false` to not inherit stdio and return the output as a string.
 *  - `'rejectOnError'` to inherit stdio and reject the promise if the command
 *    exits with a non-zero exit code.
 * @param {boolean} silent Disable stdout for silents build (CI/Webpack Stats, ...)
 * @param {string} [configFile] Relative or absolute path to the configuration file.
 * @param {import('./index').SentryCliOptions} [config] More configuration to pass to the CLI
 * @returns {Promise<string>} A promise that resolves to the standard output.
 */
export function execute(args: string[], live: boolean | "rejectOnError", silent: boolean, configFile?: string, config?: import("./index").SentryCliOptions): Promise<string>;
/**
 * Returns the absolute path to the `sentry-cli` binary.
 * @returns {string}
 */
export function getPath(): string;
export function getProjectFlagsFromOptions({ projects }?: {
    projects?: any[];
}): any;
/**
 * Overrides the default binary path with a mock value, useful for testing.
 *
 * @param {string} mockPath The new path to the mock sentry-cli binary
 * @deprecated This was used in tests internally and will be removed in the next major version.
 */
export function mockBinaryPath(mockPath: string): void;
/**
 * Serializes the command and its options into an arguments array.
 *
 * @param {string[]} command The literal name of the command.
 * @param {OptionsSchema} [schema] An options schema required by the command.
 * @param {object} [options] An options object according to the schema.
 * @returns {string[]} An arguments array that can be passed via command line.
 */
export function prepareCommand(command: string[], schema?: OptionsSchema, options?: object): string[];
/**
 * The javascript type of a command line option.
 * @typedef {'array'|'string'|'boolean'|'inverted-boolean'} OptionType
 */
/**
 * Schema definition of a command line option.
 * @typedef {object} OptionSchema
 * @prop {string} param The flag of the command line option including dashes.
 * @prop {OptionType} type The value type of the command line option.
 * @prop {string} [invertedParam] The flag of the command line option including dashes (optional).
 */
/**
 * Schema definition for a command.
 * @typedef {Object.<string, OptionSchema>} OptionsSchema
 */
/**
 * Serializes command line options into an arguments array.
 *
 * @param {OptionsSchema} schema An options schema required by the command.
 * @param {object} options An options object according to the schema.
 * @returns {string[]} An arguments array that can be passed via command line.
 */
export function serializeOptions(schema: OptionsSchema, options: object): string[];
export function getDistributionForThisPlatform(): {
    packageName: string;
    subpath: string;
};
/**
 * Throws an error with a message stating that Sentry CLI doesn't support the current platform.
 *
 * @returns {never} nothing. It throws.
 */
export function throwUnsupportedPlatformError(): never;
/**
 * This convoluted function resolves the path to the manually downloaded fallback
 * `sentry-cli` binary in a way that can't be analysed by @vercel/nft.
 *
 * Without this, the binary can be detected as an asset and included by bundlers
 * that use @vercel/nft.
 *
 * @returns {string} The path to the sentry-cli binary
 */
export function getFallbackBinaryPath(): string;
