'use strict';
const pkgInfo = require('../package.json');
const helper = require('./helper');
const Releases = require('./releases');
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
class SentryCli {
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
    constructor(configFile, options) {
        if (typeof configFile === 'string') {
            this.configFile = configFile;
        }
        this.options = options || { silent: false };
        this.releases = new Releases(Object.assign(Object.assign({}, this.options), { configFile }));
    }
    /**
     * Returns the version of the installed `sentry-cli` binary.
     * @returns {string}
     */
    static getVersion() {
        return pkgInfo.version;
    }
    /**
     * Returns an absolute path to the `sentry-cli` binary.
     * @returns {string}
     */
    static getPath() {
        return helper.getPath();
    }
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
    execute(args, live) {
        return helper.execute(args, live, this.options.silent, this.configFile, this.options);
    }
}
module.exports = SentryCli;
