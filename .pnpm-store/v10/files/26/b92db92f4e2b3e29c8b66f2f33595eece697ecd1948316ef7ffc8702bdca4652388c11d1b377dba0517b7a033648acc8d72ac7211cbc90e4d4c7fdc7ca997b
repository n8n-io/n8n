export = SentryCli;
/**
 * @typedef {import('./types').SentryCliOptions} SentryCliOptions
 * @typedef {import('./types').SentryCliUploadSourceMapsOptions} SentryCliUploadSourceMapsOptions
 * @typedef {import('./types').SourceMapsPathDescriptor} SourceMapsPathDescriptor
 * @typedef {import('./types').SentryCliNewDeployOptions} SentryCliNewDeployOptions
 * @typedef {import('./types').SentryCliCommitsOptions} SentryCliCommitsOptions
 * @typedef {import('./types').SentryCliReleases} SentryCliReleases
 */
/**
 * Interface to and wrapper around the `sentry-cli` executable.
 *
 * Commands are grouped into namespaces. See the respective namespaces for more
 * documentation. To use this wrapper, simply create an instance and call methods:
 *
 * @example
 * const cli = new SentryCli();
 * console.log(SentryCli.getVersion());
 *
 * @example
 * const cli = new SentryCli('path/to/custom/sentry.properties');
 * const release = await cli.releases.proposeVersion());
 * console.log(release);
 */
declare class SentryCli {
    /**
     * Returns the version of the installed `sentry-cli` binary.
     * @returns {string}
     */
    static getVersion(): string;
    /**
     * Returns an absolute path to the `sentry-cli` binary.
     * @returns {string}
     */
    static getPath(): string;
    /**
     * Creates a new `SentryCli` instance.
     *
     * If the `configFile` parameter is specified, configuration located in the default
     * location and the value specified in the `SENTRY_PROPERTIES` environment variable is
     * overridden.
     *
     * @param {string | null} [configFile] - Path to Sentry CLI config properties, as described in https://docs.sentry.io/learn/cli/configuration/#properties-files.
     * By default, the config file is looked for upwards from the current path and defaults from ~/.sentryclirc are always loaded.
     * This value will update `SENTRY_PROPERTIES` env variable.
     * @param {SentryCliOptions} [options] - More options to pass to the CLI
     */
    constructor(configFile?: string | null, options?: SentryCliOptions);
    configFile: string;
    options: import("./types").SentryCliOptions;
    releases: Releases;
    /**
     * See {helper.execute} docs.
     * @param {string[]} args Command line arguments passed to `sentry-cli`.
     * @param {boolean | 'rejectOnError'} live can be set to:
     *  - `true` to inherit stdio to display `sentry-cli` output directly.
     *  - `false` to not inherit stdio and return the output as a string.
     *  - `'rejectOnError'` to inherit stdio and reject the promise if the command
     *    exits with a non-zero exit code.
     * @returns {Promise<string>} A promise that resolves to the standard output.
     */
    execute(args: string[], live: boolean | "rejectOnError"): Promise<string>;
}
declare namespace SentryCli {
    export { SentryCliOptions, SentryCliUploadSourceMapsOptions, SourceMapsPathDescriptor, SentryCliNewDeployOptions, SentryCliCommitsOptions, SentryCliReleases };
}
import Releases = require("./releases");
type SentryCliOptions = import("./types").SentryCliOptions;
type SentryCliUploadSourceMapsOptions = import("./types").SentryCliUploadSourceMapsOptions;
type SourceMapsPathDescriptor = import("./types").SourceMapsPathDescriptor;
type SentryCliNewDeployOptions = import("./types").SentryCliNewDeployOptions;
type SentryCliCommitsOptions = import("./types").SentryCliCommitsOptions;
type SentryCliReleases = import("./types").SentryCliReleases;
