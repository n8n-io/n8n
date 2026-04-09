export = Releases;
/**
 * @typedef {import('../types').SentryCliUploadSourceMapsOptions} SentryCliUploadSourceMapsOptions
 * @typedef {import('../types').SourceMapsPathDescriptor} SourceMapsPathDescriptor
 * @typedef {import('../types').SentryCliNewDeployOptions} SentryCliNewDeployOptions
 * @typedef {import('../types').SentryCliCommitsOptions} SentryCliCommitsOptions
 */
/**
 * Manages releases and release artifacts on Sentry.
 * @namespace SentryReleases
 */
declare class Releases {
    /**
     * Creates a new `Releases` instance.
     *
     * @param {Object} [options] More options to pass to the CLI
     */
    constructor(options?: any);
    options: any;
    configFile: any;
    /**
     * Registers a new release with sentry.
     *
     * The given release name should be unique and deterministic. It can later be used to
     * upload artifacts, such as source maps.
     *
     * @param {string} release Unique name of the new release.
     * @param {{projects?: string[]}} [options] The list of project slugs for a release.
     * @returns {Promise<string>} A promise that resolves when the release has been created.
     * @memberof SentryReleases
     */
    "new"(release: string, options?: {
        projects?: string[];
    }): Promise<string>;
    /**
     * Specifies the set of commits covered in this release.
     *
     * @param {string} release Unique name of the release
     * @param {SentryCliCommitsOptions} options A set of options to configure the commits to include
     * @returns {Promise<string>} A promise that resolves when the commits have been associated
     * @memberof SentryReleases
     */
    setCommits(release: string, options: SentryCliCommitsOptions): Promise<string>;
    /**
     * Marks this release as complete. This should be called once all artifacts has been
     * uploaded.
     *
     * @param {string} release Unique name of the release.
     * @returns {Promise<string>} A promise that resolves when the release has been finalized.
     * @memberof SentryReleases
     */
    finalize(release: string): Promise<string>;
    /**
     * Creates a unique, deterministic version identifier based on the project type and
     * source files. This identifier can be used as release name.
     *
     * @returns {Promise<string>} A promise that resolves to the version string.
     * @memberof SentryReleases
     */
    proposeVersion(): Promise<string>;
    /**
     * Scans the given include folders for JavaScript source maps and uploads them to the
     * specified release for processing.
     *
     * The options require an `include` array, which is a list of directories to scan.
     * Additionally, it supports to ignore certain files, validate and preprocess source
     * maps and define a URL prefix.
     *
     * @example
     * await cli.releases.uploadSourceMaps(cli.releases.proposeVersion(), {
     *   // required options:
     *   include: ['build'],
     *
     *   // default options:
     *   ignore: ['node_modules'],  // globs for files to ignore
     *   ignoreFile: null,          // path to a file with ignore rules
     *   rewrite: false,            // preprocess sourcemaps before uploading
     *   sourceMapReference: true,  // add a source map reference to source files
     *   dedupe: true,              // deduplicate already uploaded files
     *   stripPrefix: [],           // remove certain prefixes from filenames
     *   stripCommonPrefix: false,  // guess common prefixes to remove from filenames
     *   validate: false,           // validate source maps and cancel the upload on error
     *   urlPrefix: '',             // add a prefix source map urls after stripping them
     *   urlSuffix: '',             // add a suffix source map urls after stripping them
     *   ext: ['js', 'map', 'jsbundle', 'bundle'],  // override file extensions to scan for
     *   projects: ['node'],        // provide a list of projects
     *   decompress: false          // decompress gzip files before uploading
     *   live: true                 // whether to inherit stdio to display `sentry-cli` output directly.
     * });
     *
     * @param {string} release Unique name of the release.
     * @param {SentryCliUploadSourceMapsOptions & {live?: boolean | 'rejectOnError'}} options Options to configure the source map upload.
     * @returns {Promise<string[]>} A promise that resolves when the upload has completed successfully.
     * @memberof SentryReleases
     */
    uploadSourceMaps(release: string, options: SentryCliUploadSourceMapsOptions & {
        live?: boolean | "rejectOnError";
    }): Promise<string[]>;
    /**
     * List all deploys for a given release.
     *
     * @param {string} release Unique name of the release.
     * @returns {Promise<string>} A promise that resolves when the list comes back from the server.
     * @memberof SentryReleases
     */
    listDeploys(release: string): Promise<string>;
    /**
     * Creates a new release deployment. This should be called after the release has been
     * finalized, while deploying on a given environment.
     *
     * @example
     * await cli.releases.newDeploy(cli.releases.proposeVersion(), {
     *   // required options:
     *   env: 'production',          // environment for this release. Values that make sense here would be 'production' or 'staging'
     *
     *   // optional options:
     *   started: 42,                // unix timestamp when the deployment started
     *   finished: 1337,             // unix timestamp when the deployment finished
     *   time: 1295,                 // deployment duration in seconds. This can be specified alternatively to `started` and `finished`
     *   name: 'PickleRick',         // human readable name for this deployment
     *   url: 'https://example.com', // URL that points to the deployment
     * });
     *
     * @param {string} release Unique name of the release.
     * @param {SentryCliNewDeployOptions} options Options to configure the new release deploy.
     * @returns {Promise<string>} A promise that resolves when the deploy has been created.
     * @memberof SentryReleases
     */
    newDeploy(release: string, options: SentryCliNewDeployOptions): Promise<string>;
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
declare namespace Releases {
    export { SentryCliUploadSourceMapsOptions, SourceMapsPathDescriptor, SentryCliNewDeployOptions, SentryCliCommitsOptions };
}
type SentryCliUploadSourceMapsOptions = import("../types").SentryCliUploadSourceMapsOptions;
type SourceMapsPathDescriptor = import("../types").SourceMapsPathDescriptor;
type SentryCliNewDeployOptions = import("../types").SentryCliNewDeployOptions;
type SentryCliCommitsOptions = import("../types").SentryCliCommitsOptions;
