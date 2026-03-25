export interface Options {
    /**
     * The slug of the Sentry organization associated with the app.
     *
     * This value can also be specified via the `SENTRY_ORG` environment variable.
     */
    org?: string;
    /**
     * The slug of the Sentry project associated with the app.
     *
     * This value can also be specified via the `SENTRY_PROJECT` environment variable.
     */
    project?: string;
    /**
     * The authentication token to use for all communication with Sentry.
     * Can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/.
     *
     * This value can also be specified via the `SENTRY_AUTH_TOKEN` environment variable.
     *
     * @see https://docs.sentry.io/product/accounts/auth-tokens/#organization-auth-tokens
     */
    authToken?: string;
    /**
     * The base URL of your Sentry instance. Use this if you are using a self-hosted
     * or Sentry instance other than sentry.io.
     *
     * This value can also be set via the `SENTRY_URL` environment variable.
     *
     * @default "https://sentry.io" (correct value for SaaS customers)
     */
    url?: string;
    /**
     * Additional headers to send with every outgoing request to Sentry.
     */
    headers?: Record<string, string>;
    /**
     * Enable debug information logs during build-time.
     * Enabling this will give you, for example, logs about source maps.
     *
     * @default false
     */
    debug?: boolean;
    /**
     * Suppresses all build logs (all log levels, including errors).
     *
     * @default false
     */
    silent?: boolean;
    /**
     * When an error occurs during release creation or sourcemaps upload, the plugin will call this function.
     *
     * By default, the plugin will simply throw an error, thereby stopping the bundling process.
     * If an `errorHandler` callback is provided, compilation will continue, unless an error is
     * thrown in the provided callback.
     *
     * To allow compilation to continue but still emit a warning, set this option to the following:
     *
     * ```js
     * (err) => {
     *   console.warn(err);
     * }
     * ```
     */
    errorHandler?: (err: Error) => void;
    /**
     * If this flag is `true`, internal plugin errors and performance data will be sent to Sentry.
     * It will not collect any sensitive or user-specific data.
     *
     * At Sentry, we like to use Sentry ourselves to deliver faster and more stable products.
     * We're very careful of what we're sending. We won't collect anything other than error
     * and high-level performance data. We will never collect your code or any details of the
     * projects in which you're using this plugin.
     *
     * @default true
     */
    telemetry?: boolean;
    /**
     * Completely disables all functionality of the plugin.
     *
     * Defaults to `false`.
     */
    disable?: boolean;
    /**
     * Options related to source maps upload and processing.
     */
    sourcemaps?: {
        /**
         * Disables all functionality related to sourcemaps if set to `true`.
         *
         * If set to `"disable-upload"`, the plugin will not upload sourcemaps to Sentry, but will inject debug IDs into the build artifacts.
         * This is useful if you want to manually upload sourcemaps to Sentry at a later point in time.
         *
         * @default false
         */
        disable?: boolean | "disable-upload";
        /**
         * A glob or an array of globs that specify the build artifacts and source maps that will be uploaded to Sentry.
         *
         * The globbing patterns must follow the implementation of the `glob` package: https://www.npmjs.com/package/glob#glob-primer
         *
         * If this option is not specified, the plugin will try to upload all JavaScript files and source map files that are created during build.
         *
         * Use the `debug` option to print information about which files end up being uploaded.
         *
         */
        assets?: string | string[];
        /**
         * A glob or an array of globs that specifies which build artifacts should not be uploaded to Sentry.
         *
         * The globbing patterns must follow the implementation of the `glob` package: https://www.npmjs.com/package/glob#glob-primer
         *
         * Use the `debug` option to print information about which files end up being uploaded.
         *
         * @default []
         */
        ignore?: string | string[];
        /**
         * Hook to rewrite the `sources` field inside the source map before being uploaded to Sentry. Does not modify the actual source map.
         *
         * Defaults to making all sources relative to `process.cwd()` while building.
         */
        rewriteSources?: RewriteSourcesHook;
        /**
         * Hook to customize source map file resolution.
         *
         * The hook is called with the absolute path of the build artifact and the value of the `//# sourceMappingURL=`
         * comment, if present. The hook should then return an absolute path (or a promise that resolves to one) indicating
         * where to find the artifact's corresponding source map file. If no path is returned or the returned path doesn't
         * exist, the standard source map resolution process will be used.
         *
         * The standard process first tries to resolve based on the `//# sourceMappingURL=` value (it supports `file://`
         * urls and absolute/relative paths). If that path doesn't exist, it then looks for a file named
         * `${artifactName}.map` in the same directory as the artifact.
         *
         * Note: This is mostly helpful for complex builds with custom source map generation. For example, if you put source
         * maps into a separate directory and rewrite the `//# sourceMappingURL=` comment to something other than a relative
         * directory, sentry will be unable to locate the source maps for a given build artifact. This hook allows you to
         * implement the resolution process yourself.
         *
         * Use the `debug` option to print information about source map resolution.
         */
        resolveSourceMap?: ResolveSourceMapHook;
        /**
         * A glob or an array of globs that specifies the build artifacts that should be deleted after the artifact upload to Sentry has been completed.
         *
         * Note: If you pass in a Promise that resolves to a string or array, the plugin will await the Promise and use
         * the resolved value globs. This is useful if you need to dynamically determine the files to delete. Some
         * higher-level Sentry SDKs or options use this feature (e.g., SvelteKit).
         *
         * The globbing patterns must follow the implementation of the `glob` package: https://www.npmjs.com/package/glob#glob-primer
         *
         * Use the `debug` option to print information about which files end up being deleted.
         */
        filesToDeleteAfterUpload?: string | string[] | Promise<string | string[] | undefined>;
    };
    /**
     * Options related to managing the Sentry releases for a build.
     *
     * More info: https://docs.sentry.io/product/releases/
     */
    release?: {
        /**
         * Unique identifier for the release you want to create.
         *
         * This value can also be specified via the `SENTRY_RELEASE` environment variable.
         *
         * Defaults to automatically detecting a value for your environment.
         * This includes values for Cordova, Heroku, AWS CodeBuild, CircleCI, Xcode, and Gradle, and otherwise uses the git `HEAD`'s commit SHA
         * (the latter requires access to git CLI and for the root directory to be a valid repository).
         *
         * If no `name` is provided and the plugin can't automatically detect one, no release will be created.
         */
        name?: string;
        /**
         * Whether the plugin should inject release information into the build for the SDK to pick it up when sending events. (recommended)
         *
         * Defaults to `true`.
         */
        inject?: boolean;
        /**
         * Whether the plugin should create a release on Sentry during the build.
         *
         * Note that a release may still appear in Sentry even if this value is `false`. Any Sentry event that has a release value attached
         * will automatically create a release (for example, via the `inject` option).
         *
         * @default true
         */
        create?: boolean;
        /**
         * Whether to automatically finalize the release. The release is finalized by adding an end timestamp after the build ends.
         *
         * @default true
         */
        finalize?: boolean;
        /**
         * Unique distribution identifier for the release. Used to further segment the release.
         *
         * Usually your build number.
         */
        dist?: string;
        /**
         * Version control system (VCS) remote name.
         *
         * This value can also be specified via the `SENTRY_VSC_REMOTE` environment variable.
         *
         * @default "origin"
         */
        vcsRemote?: string;
        /**
         * Configuration for associating the release with its commits in Sentry.
         *
         * Set to `false` to disable commit association.
         *
         * @default { auto: true }
         */
        setCommits?: SetCommitsOptions | false;
        /**
         * Configuration for adding deployment information to the release in Sentry.
         *
         * Set to `false` to disable automatic deployment detection and creation.
         */
        deploy?: DeployOptions | false;
        /**
         * Legacy method of uploading source maps. (not recommended unless necessary)
         *
         * One or more paths that should be scanned recursively for sources.
         *
         * Each path can be given as a string or an object with more specific options.
         *
         * The modern version of doing source maps upload is more robust and way easier to get working but has to inject a very small snippet of JavaScript into your output bundles.
         * In situations where this leads to problems (e.g subresource integrity) you can use this option as a fallback.
         */
        uploadLegacySourcemaps?: string | IncludeEntry | Array<string | IncludeEntry>;
    };
    /**
     * Options for bundle size optimizations by excluding certain features.
     */
    bundleSizeOptimizations?: {
        /**
         * Exclude debug statements from the bundle, thus disabling features like the SDK's `debug` option.
         *
         * If set to `true`, the plugin will attempt to tree-shake (remove) any debugging code within the Sentry SDK during the build.
         * Note that the success of this depends on tree-shaking being enabled in your build tooling.
         *
         * @default false
         */
        excludeDebugStatements?: boolean;
        /**
         * Exclude tracing functionality from the bundle, thus disabling features like performance monitoring.
         *
         * If set to `true`, the plugin will attempt to tree-shake (remove) code within the Sentry SDK that is related to tracing and performance monitoring.
         * Note that the success of this depends on tree-shaking being enabled in your build tooling.
         *
         * **Notice:** Do not enable this when you're using any performance monitoring-related SDK features (e.g. `Sentry.startTransaction()`).
    
         * @default false
         */
        excludeTracing?: boolean;
        /**
         * If set to `true`, the plugin will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay Canvas recording functionality.
         * Note that the success of this depends on tree-shaking being enabled in your build tooling.
         *
         * You can safely do this when you do not want to capture any Canvas activity via Sentry Session Replay.
         *
         * @deprecated In versions v7.78.0 and later of the Sentry JavaScript SDKs, canvas recording is opt-in making this option redundant.
         */
        excludeReplayCanvas?: boolean;
        /**
         * Exclude Replay Shadow DOM functionality from the bundle.
         *
         * If set to `true`, the plugin will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay Shadow DOM recording functionality.
         * Note that the success of this depends on tree-shaking being enabled in your build tooling.
         *
         * This option is safe to be used when you do not want to capture any Shadow DOM activity via Sentry Session Replay.
         *
         * @default false
         */
        excludeReplayShadowDom?: boolean;
        /**
         * Exclude Replay iFrame functionality from the bundle.
         *
         * If set to `true`, the Sentry SDK will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay `iframe` recording functionality.
         * Note that the success of this depends on tree-shaking being enabled in your build tooling.
         *
         * You can safely do this when you do not want to capture any `iframe` activity via Sentry Session Replay.
         *
         * @default false
         */
        excludeReplayIframe?: boolean;
        /**
         * Exclude Replay worker functionality from the bundle.
         *
         * If set to `true`, the Sentry SDK will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay's Compression Web Worker.
         * Note that the success of this depends on tree-shaking being enabled in your build tooling.
         *
         * **Notice:** You should only use this option if you manually host a compression worker and configure it in your Sentry Session Replay integration config via the `workerUrl` option.
         *
         * @default false
         */
        excludeReplayWorker?: boolean;
    };
    /**
     * Options related to react component name annotations.
     * Disabled by default, unless a value is set for this option.
     * When enabled, your app's DOM will automatically be annotated during build-time with their respective component names.
     * This will unlock the capability to search for Replays in Sentry by component name, as well as see component names in breadcrumbs and performance monitoring.
     * Please note that this feature is not currently supported by the esbuild bundler plugins, and will only annotate React components
     */
    reactComponentAnnotation?: {
        /**
         * Whether the component name annotate plugin should be enabled or not.
         */
        enabled?: boolean;
        /**
         * A list of strings representing the names of components to ignore. The plugin will not apply `data-sentry` annotations on the DOM element for these components.
         */
        ignoredComponents?: string[];
    };
    /**
     * Metadata that should be associated with the built application.
     *
     * The metadata is serialized and can be looked up at runtime from within the SDK (for example in the `beforeSend`,
     * event processors, or the transport), allowing for custom event filtering logic or routing of events.
     *
     * Metadata can either be passed directly or alternatively a callback can be provided that will be
     * called with the following parameters:
     * - `org`: The organization slug.
     * - `project`: The project slug.
     * - `release`: The release name.
     */
    moduleMetadata?: ModuleMetadata | ModuleMetadataCallback;
    /**
     * A key which will embedded in all the bundled files. The SDK will be able to use the key to apply filtering
     * rules, for example using the `thirdPartyErrorFilterIntegration`.
     */
    applicationKey?: string;
    /**
     * Options that are considered experimental and subject to change.
     *
     * @experimental API that does not follow semantic versioning and may change in any release
     */
    _experiments?: {
        /**
         * If set to true, the plugin will inject an additional `SENTRY_BUILD_INFO` variable.
         * This contains information about the build, e.g. dependencies, node version and other useful data.
         *
         * Defaults to `false`.
         */
        injectBuildInformation?: boolean;
    } & Record<string, unknown>;
    /**
     * Options that are useful for building wrappers around the plugin. You likely don't need these options unless you
     * are distributing a tool that depends on this plugin
     */
    _metaOptions?: {
        /**
         * Overrides the prefix that come before logger messages. (e.g. `[some-prefix] Info: Some log message`)
         *
         * Example value: `[sentry-webpack-plugin (client)]`
         */
        loggerPrefixOverride?: string;
        /**
         * Arbitrary telemetry items.
         */
        telemetry?: {
            /**
             * The meta framework using the plugin.
             */
            metaFramework?: string;
        };
    };
}
export type RewriteSourcesHook = (source: string, map: any) => string;
export type ResolveSourceMapHook = (artifactPath: string, sourceMappingUrl: string | undefined) => string | undefined | Promise<string | undefined>;
export interface ModuleMetadata {
    [key: string]: any;
}
export interface ModuleMetadataCallbackArgs {
    org?: string;
    project?: string;
    release?: string;
}
export type ModuleMetadataCallback = (args: ModuleMetadataCallbackArgs) => ModuleMetadata;
export type IncludeEntry = {
    /**
     * One or more paths to scan for files to upload.
     */
    paths: string[];
    /**
     * One or more paths to ignore during upload.
     * Overrides entries in ignoreFile file.
     *
     * Defaults to `['node_modules']` if neither `ignoreFile` nor `ignore` is set.
     */
    ignore?: string | string[];
    /**
     * Path to a file containing list of files/directories to ignore.
     *
     * Can point to `.gitignore` or anything with the same format.
     */
    ignoreFile?: string;
    /**
     * Array of file extensions of files to be collected for the file upload.
     *
     * By default the following file extensions are processed: js, map, jsbundle and bundle.
     */
    ext?: string[];
    /**
     * URL prefix to add to the beginning of all filenames.
     * Defaults to '~/' but you might want to set this to the full URL.
     *
     * This is also useful if your files are stored in a sub folder. eg: url-prefix '~/static/js'.
     */
    urlPrefix?: string;
    /**
     * URL suffix to add to the end of all filenames.
     * Useful for appending query parameters.
     */
    urlSuffix?: string;
    /**
     * When paired with the `rewrite` option, this will remove a prefix from filename references inside of
     * sourcemaps. For instance you can use this to remove a path that is build machine specific.
     * Note that this will NOT change the names of uploaded files.
     */
    stripPrefix?: string[];
    /**
     * When paired with the `rewrite` option, this will add `~` to the `stripPrefix` array.
     *
     * Defaults to `false`.
     */
    stripCommonPrefix?: boolean;
    /**
     * Determines whether sentry-cli should attempt to link minified files with their corresponding maps.
     * By default, it will match files and maps based on name, and add a Sourcemap header to each minified file
     * for which it finds a map. Can be disabled if all minified files contain sourceMappingURL.
     *
     * Defaults to true.
     */
    sourceMapReference?: boolean;
    /**
     * Enables rewriting of matching source maps so that indexed maps are flattened and missing sources
     * are inlined if possible.
     *
     * Defaults to true
     */
    rewrite?: boolean;
    /**
     * When `true`, attempts source map validation before upload if rewriting is not enabled.
     * It will spot a variety of issues with source maps and cancel the upload if any are found.
     *
     * Defaults to `false` as this can cause false positives.
     */
    validate?: boolean;
};
export interface SentrySDKBuildFlags extends Record<string, boolean | undefined> {
    __SENTRY_DEBUG__?: boolean;
    __SENTRY_TRACING__?: boolean;
    __RRWEB_EXCLUDE_CANVAS__?: boolean;
    __RRWEB_EXCLUDE_IFRAME__?: boolean;
    __RRWEB_EXCLUDE_SHADOW_DOM__?: boolean;
    __SENTRY_EXCLUDE_REPLAY_WORKER__?: boolean;
}
export type SetCommitsOptions = (AutoSetCommitsOptions | ManualSetCommitsOptions) & {
    /**
     * The commit before the beginning of this release (in other words,
     * the last commit of the previous release).
     *
     * Defaults to the last commit of the previous release in Sentry.
     *
     * If there was no previous release, the last 10 commits will be used.
     */
    previousCommit?: string;
    /**
     * If the flag is to `true` and the previous release commit was not found
     * in the repository, the plugin creates a release with the default commits
     * count instead of failing the command.
     *
     * Defaults to `false`.
     */
    ignoreMissing?: boolean;
    /**
     * If this flag is set, the setCommits step will not fail and just exit
     * silently if no new commits for a given release have been found.
     *
     * Defaults to `false`.
     */
    ignoreEmpty?: boolean;
};
type AutoSetCommitsOptions = {
    /**
     * Automatically sets `commit` and `previousCommit`. Sets `commit` to `HEAD`
     * and `previousCommit` as described in the option's documentation.
     *
     * If you set this to `true`, manually specified `commit` and `previousCommit`
     * options will be overridden. It is best to not specify them at all if you
     * set this option to `true`.
     */
    auto: true;
    repo?: undefined;
    commit?: undefined;
};
type ManualSetCommitsOptions = {
    auto?: false | undefined;
    /**
     * The full repo name as defined in Sentry.
     *
     * Required if the `auto` option is not set to `true`.
     */
    repo: string;
    /**
     * The current (last) commit in the release.
     *
     * Required if the `auto` option is not set to `true`.
     */
    commit: string;
};
type DeployOptions = {
    /**
     * Environment for this release. Values that make sense here would
     * be `production` or `staging`.
     */
    env: string;
    /**
     * Deployment start time in Unix timestamp (in seconds) or ISO 8601 format.
     */
    started?: number | string;
    /**
     * Deployment finish time in Unix timestamp (in seconds) or ISO 8601 format.
     */
    finished?: number | string;
    /**
     * Deployment duration (in seconds). Can be used instead of started and finished.
     */
    time?: number;
    /**
     * Human-readable name for the deployment.
     */
    name?: string;
    /**
     * URL that points to the deployment.
     */
    url?: string;
};
export type HandleRecoverableErrorFn = (error: unknown, throwByDefault: boolean) => void;
export {};
//# sourceMappingURL=types.d.ts.map