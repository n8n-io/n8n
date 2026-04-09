'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const helper = require('../helper');
/**
 * Default arguments for the `--ignore` option.
 * @type {string[]}
 */
const DEFAULT_IGNORE = ['node_modules'];
/**
 * Schema for the `upload-sourcemaps` command.
 * @type {import('../helper').OptionsSchema}
 */
const SOURCEMAPS_SCHEMA = require('./options/uploadSourcemaps');
/**
 * Schema for the `deploys new` command.
 * @type {import('../helper').OptionsSchema}
 */
const DEPLOYS_SCHEMA = require('./options/deploys');
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
class Releases {
    /**
     * Creates a new `Releases` instance.
     *
     * @param {Object} [options] More options to pass to the CLI
     */
    constructor(options) {
        this.options = options || {};
        if (typeof this.options.configFile === 'string') {
            this.configFile = this.options.configFile;
        }
        delete this.options.configFile;
    }
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
    new(release, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['releases', 'new', release].concat(helper.getProjectFlagsFromOptions(options));
            return this.execute(args, null);
        });
    }
    /**
     * Specifies the set of commits covered in this release.
     *
     * @param {string} release Unique name of the release
     * @param {SentryCliCommitsOptions} options A set of options to configure the commits to include
     * @returns {Promise<string>} A promise that resolves when the commits have been associated
     * @memberof SentryReleases
     */
    setCommits(release, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options || (!options.auto && (!options.repo || !options.commit))) {
                throw new Error('options.auto, or options.repo and options.commit must be specified');
            }
            let commitFlags = [];
            if (options.auto) {
                commitFlags = ['--auto'];
            }
            else if (options.previousCommit) {
                commitFlags = ['--commit', `${options.repo}@${options.previousCommit}..${options.commit}`];
            }
            else {
                commitFlags = ['--commit', `${options.repo}@${options.commit}`];
            }
            if (options.ignoreMissing) {
                commitFlags.push('--ignore-missing');
            }
            return this.execute(['releases', 'set-commits', release].concat(commitFlags), false);
        });
    }
    /**
     * Marks this release as complete. This should be called once all artifacts has been
     * uploaded.
     *
     * @param {string} release Unique name of the release.
     * @returns {Promise<string>} A promise that resolves when the release has been finalized.
     * @memberof SentryReleases
     */
    finalize(release) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.execute(['releases', 'finalize', release], null);
        });
    }
    /**
     * Creates a unique, deterministic version identifier based on the project type and
     * source files. This identifier can be used as release name.
     *
     * @returns {Promise<string>} A promise that resolves to the version string.
     * @memberof SentryReleases
     */
    proposeVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            const version = yield this.execute(['releases', 'propose-version'], null);
            return version.trim();
        });
    }
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
    uploadSourceMaps(release, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options || !options.include || !Array.isArray(options.include)) {
                throw new Error('`options.include` must be a valid array of paths and/or path descriptor objects.');
            }
            // Each entry in the `include` array will map to an array of promises, which
            // will in turn contain one promise per literal path value. Thus `uploads`
            // will be an array of Promise arrays, which we'll flatten later.
            const uploads = options.include.map((includeEntry) => {
                let pathOptions;
                let uploadPaths;
                if (typeof includeEntry === 'object') {
                    pathOptions = includeEntry;
                    uploadPaths = includeEntry.paths;
                    if (!Array.isArray(uploadPaths)) {
                        throw new Error(`Path descriptor objects in \`options.include\` must contain a \`paths\` array. Got ${includeEntry}.`);
                    }
                }
                // `includeEntry` should be a string, which we can wrap in an array to
                // match the `paths` property in the descriptor object type
                else {
                    pathOptions = {};
                    uploadPaths = [includeEntry];
                }
                const newOptions = Object.assign(Object.assign({}, options), pathOptions);
                if (!newOptions.ignoreFile && !newOptions.ignore) {
                    newOptions.ignore = DEFAULT_IGNORE;
                }
                // args which apply to the entire `include` entry (everything besides the path)
                const args = ['sourcemaps', 'upload']
                    .concat(helper.getProjectFlagsFromOptions(options))
                    .concat(['--release', release]);
                return uploadPaths.map((path) => 
                // `execute()` is async and thus we're returning a promise here
                this.execute(helper.prepareCommand([...args, path], SOURCEMAPS_SCHEMA, newOptions), options.live != null ? options.live : true));
            });
            // `uploads` is an array of Promise arrays, which needs to be flattened
            // before being passed to `Promise.all()`. (`Array.flat()` doesn't exist in
            // Node < 11; this polyfill takes advantage of the fact that `concat()` is
            // willing to accept an arbitrary number of items to add to and/or iterables
            // to unpack into the given array.)
            return Promise.all([].concat(...uploads));
        });
    }
    /**
     * List all deploys for a given release.
     *
     * @param {string} release Unique name of the release.
     * @returns {Promise<string>} A promise that resolves when the list comes back from the server.
     * @memberof SentryReleases
     */
    listDeploys(release) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.execute(['releases', 'deploys', release, 'list'], null);
        });
    }
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
    newDeploy(release, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options || !options.env) {
                throw new Error('options.env must be a valid name');
            }
            const args = ['releases', 'deploys', release, 'new'];
            return this.execute(helper.prepareCommand(args, DEPLOYS_SCHEMA, options), null);
        });
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
        return __awaiter(this, void 0, void 0, function* () {
            return helper.execute(args, live, this.options.silent, this.configFile, this.options);
        });
    }
}
module.exports = Releases;
