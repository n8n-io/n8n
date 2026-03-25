<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Sentry Vite Plugin

[![npm version](https://img.shields.io/npm/v/@sentry/vite-plugin.svg)](https://www.npmjs.com/package/@sentry/vite-plugin)
[![npm dm](https://img.shields.io/npm/dm/@sentry/vite-plugin.svg)](https://www.npmjs.com/package/@sentry/vite-plugin)
[![npm dt](https://img.shields.io/npm/dt/@sentry/vite-plugin.svg)](https://www.npmjs.com/package/@sentry/vite-plugin)

> A Vite plugin that provides source map and release management support for Sentry.

## Installation

Using npm:

```bash
npm install @sentry/vite-plugin --save-dev
```

Using yarn:

```bash
yarn add @sentry/vite-plugin --dev
```

Using pnpm:

```bash
pnpm add @sentry/vite-plugin --save-dev
```

## Example

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true, // Source map generation must be turned on
  },
  plugins: [
    vue(),

    // Put the Sentry vite plugin after all other plugins
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Auth tokens can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

## Options

-   [`org`](#org)
-   [`project`](#project)
-   [`authToken`](#authtoken)
-   [`url`](#url)
-   [`headers`](#headers)
-   [`debug`](#debug)
-   [`silent`](#silent)
-   [`errorHandler`](#errorhandler)
-   [`telemetry`](#telemetry)
-   [`disable`](#disable)
-   [`sourcemaps`](#sourcemaps)
    -   [`assets`](#sourcemapsassets)
    -   [`ignore`](#sourcemapsignore)
    -   [`rewriteSources`](#sourcemapsrewritesources)
    -   [`resolveSourceMap`](#sourcemapsresolvesourcemap)
    -   [`filesToDeleteAfterUpload`](#sourcemapsfilestodeleteafterupload)
    -   [`disable`](#sourcemapsdisable)
-   [`release`](#release)
    -   [`name`](#releasename)
    -   [`inject`](#releaseinject)
    -   [`create`](#releasecreate)
    -   [`finalize`](#releasefinalize)
    -   [`dist`](#releasedist)
    -   [`vcsRemote`](#releasevcsremote)
    -   [`setCommits`](#releasesetcommits)
    -   [`deploy`](#releasedeploy)
    -   [`cleanArtifacts`](#releasecleanartifacts)
    -   [`uploadLegacySourcemaps`](#releaseuploadlegacysourcemaps)
-   [`bundleSizeOptimizations`](#bundlesizeoptimizations)
    -   [`excludeDebugStatements`](#bundlesizeoptimizationsexcludedebugstatements)
    -   [`excludeTracing`](#bundlesizeoptimizationsexcludetracing)
    -   [`excludeReplayShadowDom`](#bundlesizeoptimizationsexcludereplayshadowdom)
    -   [`excludeReplayIframe`](#bundlesizeoptimizationsexcludereplayiframe)
    -   [`excludeReplayWorker`](#bundlesizeoptimizationsexcludereplayworker)
-   [`reactComponentAnnotation`](#reactcomponentannotation)
    -   [`enabled`](#reactcomponentannotationenabled)
    -   [`ignoredComponents`](#reactcomponentannotationignoredcomponents)
-   [`moduleMetadata`](#modulemetadata)
-   [`applicationKey`](#applicationkey)
-   [`_experiments`](#_experiments)
    -   [`injectBuildInformation`](#_experimentsinjectbuildinformation)

### `org`

Type: `string`

The slug of the Sentry organization associated with the app.

This value can also be specified via the `SENTRY_ORG` environment variable.

### `project`



The slug of the Sentry project associated with the app.

This value can also be specified via the `SENTRY_PROJECT` environment variable.

### `authToken`

Type: `string`

The authentication token to use for all communication with Sentry.
Can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/.

This value can also be specified via the `SENTRY_AUTH_TOKEN` environment variable.

Check out the docs on organization tokens: https://docs.sentry.io/product/accounts/auth-tokens/#organization-auth-tokens

### `url`

Type: `string`

The base URL of your Sentry instance. Use this if you are using a self-hosted or Sentry instance other than sentry.io.

This value can also be set via the SENTRY_URL environment variable.

Defaults to https://sentry.io/, which is the correct value for SaaS customers.

### `headers`

Type: `Record<string, string>`

Additional headers to send with every outgoing request to Sentry.

### `debug`

Type: `boolean`

Enable debug information logs during build-time. Enabling this will give you, for example, logs about source maps. Defaults to `false`.

### `silent`

Type: `boolean`

Suppresses all build logs (all log levels, including errors). Defaults to `false`.

### `errorHandler`

Type: `(err: Error) => void`

When an error occurs during release creation or sourcemaps upload, the plugin will call this function.

By default, the plugin will simply throw an error, thereby stopping the bundling process. If an `errorHandler` callback is provided, compilation will continue, unless an error is thrown in the provided callback.

To allow compilation to continue but still emit a warning, set this option to the following:

```
errorHandler: (err) => {
  console.warn(err);
}
```


### `telemetry`

Type: `boolean`

If this flag is `true`, internal plugin errors and performance data will be sent to Sentry. It will not collect any sensitive or user-specific data.

At Sentry, we like to use Sentry ourselves to deliver faster and more stable products. We're very careful of what we're sending. We won't collect anything other than error and high-level performance data. We will never collect your code or any details of the projects in which you're using this plugin.

Defaults to `true`.

### `disable`

Type: `boolean`

Completely disables all functionality of the plugin. Defaults to `false`.

### `sourcemaps`



Options related to source maps upload and processing.
### `sourcemaps.assets`

Type: `string | string[]`

A glob or an array of globs that specify the build artifacts and source maps that will be uploaded to Sentry.

The globbing patterns must follow the implementation of the `glob` package: https://www.npmjs.com/package/glob#glob-primer

If this option is not specified, the plugin will try to upload all JavaScript files and source map files that are created during build.

Use the `debug` option to print information about which files end up being uploaded.

### `sourcemaps.ignore`

Type: `string | string[]`

A glob or an array of globs that specifies which build artifacts should not be uploaded to Sentry.

The globbing patterns must follow the implementation of the `glob` package: https://www.npmjs.com/package/glob#glob-primer

Use the `debug` option to print information about which files end up being uploaded.

Default: `[]`

### `sourcemaps.rewriteSources`

Type: `(source: string, map: any) => string`

Hook to rewrite the `sources` field inside the source map before being uploaded to Sentry. Does not modify the actual source map. Effectively, this modifies how files inside the stacktrace will show up in Sentry.

Defaults to making all sources relative to `process.cwd()` while building.

### `sourcemaps.resolveSourceMap`

Type: `(artifactPath: string, sourceMappingUrl: string | undefined) => string | undefined | Promise<string | undefined>`

Hook to customize source map file resolution.

The hook is called with the absolute path of the build artifact and the value of the `//# sourceMappingURL=`
comment, if present. The hook should then return an absolute path (or a promise that resolves to one) indicating
where to find the artifact's corresponding source map file. If no path is returned or the returned path doesn't
exist, the standard source map resolution process will be used.

The standard process first tries to resolve based on the `//# sourceMappingURL=` value (it supports `file://`
urls and absolute/relative paths). If that path doesn't exist, it then looks for a file named
`${artifactName}.map` in the same directory as the artifact.

Note: This is mostly helpful for complex builds with custom source map generation. For example, if you put source
maps into a separate directory and rewrite the `//# sourceMappingURL=` comment to something other than a relative
directory, sentry will be unable to locate the source maps for a given build artifact. This hook allows you to 
implement the resolution process yourself.

Use the `debug` option to print information about source map resolution.


### `sourcemaps.filesToDeleteAfterUpload`

Type: `string | string[] | Promise<string | string[]>`

A glob, an array of globs or a promise resolving a glob or array of globs that specifies the build artifacts that should be deleted after the artifact upload to Sentry has been completed.

Note: If you pass in a Promise that resolves to a string or array, the plugin will await the Promise and use the resolved value globs. This is useful if you need to dynamically determine the files to delete. Some higher-level Sentry SDKs or options use this feature (e.g., SvelteKit).

The globbing patterns must follow the implementation of the `glob` package: https://www.npmjs.com/package/glob#glob-primer

Use the `debug` option to print information about which files end up being deleted.

### `sourcemaps.disable`

Type: `boolean`

If this flag is `true`, any functionality related to source maps will be disabled.

Defaults to `false`.

### `release`



Options related to managing the Sentry releases for a build.

More info: https://docs.sentry.io/product/releases/
### `release.name`

Type: `string`

Unique identifier for the release you want to create.

This value can also be specified via the `SENTRY_RELEASE` environment variable.

Defaults to automatically detecting a value for your environment. This includes values for Cordova, Heroku, AWS CodeBuild, CircleCI, Xcode, and Gradle, and otherwise uses the git `HEAD`'s commit SHA (the latter requires access to git CLI and for the root directory to be a valid repository).

If no `name` is provided and the plugin can't automatically detect one, no release will be created.

### `release.inject`

Type: `boolean`

Whether the plugin should inject release information into the build for the SDK to pick it up when sending events. (recommended)

Defaults to `true`.

### `release.create`

Type: `boolean`

Whether the plugin should create a release on Sentry during the build.

Note that a release may still appear in Sentry even if this is value is `false` because any Sentry event that has a release value attached will automatically create a release. (for example via the `inject` option)

Defaults to `true`.

### `release.finalize`

Type: `boolean`

Whether to automatically finalize the release. The release is finalized by adding an end timestamp after the build ends.

Defaults to `true`.

### `release.dist`

Type: `string`

Unique distribution identifier for the release. Used to further segment the release.

Usually your build number.

### `release.vcsRemote`

Type: `string`

Version control system (VCS) remote name.

This value can also be specified via the `SENTRY_VSC_REMOTE` environment variable.

Defaults to 'origin'.

### `release.setCommits`



Configuration for associating the release with its commits in Sentry.

Set to `false` to disable commit association.

Defaults to `{ auto: true }`.
### `release.setCommits.previousCommit`

Type: `string`

The commit before the beginning of this release (in other words, the last commit of the previous release).

Defaults to the last commit of the previous release in Sentry.

If there was no previous release, the last 10 commits will be used.

### `release.setCommits.ignoreMissing`

Type: `boolean`

If the flag is to `true` and the previous release commit was not found in the repository, the plugin creates a release with the default commits count instead of failing the command.

Defaults to `false`.

### `release.setCommits.ignoreEmpty`

Type: `boolean`

If this flag is set, the setCommits step will not fail and just exit silently if no new commits for a given release have been found.

Defaults to `false`.

### `release.setCommits.auto`

Type: `boolean`

Automatically sets `commit` and `previousCommit`. Sets `commit` to `HEAD` and `previousCommit` as described in the option's documentation.

If you set this to `true`, manually specified `commit` and `previousCommit` options will be overridden. It is best to not specify them at all if you set this option to `true`.

### `release.setCommits.repo`

Type: `string`

The full repo name as defined in Sentry.

Required if the `auto` option is not set to `true`.

### `release.setCommits.commit`

Type: `string`

The current (last) commit in the release.

Required if the `auto` option is not set to `true`.

### `release.deploy`

Type: `DeployOptions | false`

Configuration for adding deployment information to the release in Sentry.

Set to `false` to disable automatic deployment detection and creation (e.g., when deploying on Vercel).
### `release.deploy.env`

Type: `string`

Environment for this release. Values that make sense here would be `production` or `staging`.

### `release.deploy.started`

Type: `number | string`

Deployment start time in Unix timestamp (in seconds) or ISO 8601 format.

### `release.deploy.finished`

Type: `number | string`

Deployment finish time in Unix timestamp (in seconds) or ISO 8601 format.

### `release.deploy.time`

Type: `number`

Deployment duration (in seconds). Can be used instead of started and finished.

### `release.deploy.name`

Type: `string`

Human readable name for the deployment.

### `release.deploy.url`

Type: `string`

URL that points to the deployment.

### `release.cleanArtifacts`

Type: `boolean`

Remove all previously uploaded artifacts for this release on Sentry before the upload.

Defaults to `false`.

**Deprecation Notice:** `cleanArtifacts` is deprecated and will does currently not do anything. Historically it was needed since uploading the same artifacts twice was not allowed. Nowadays, when uploading artifacts with the same name more than once to the same release on Sentry, Sentry will prefer the most recent artifact for source mapping.

### `release.uploadLegacySourcemaps`

Type: `string | IncludeEntry | Array<string | IncludeEntry>`

Legacy method of uploading source maps. (not recommended unless necessary)
One or more paths that should be scanned recursively for sources.

Each path can be given as a string or an object with more specific options.

The modern version of doing source maps upload is more robust and way easier to get working but has to inject a very small snippet of JavaScript into your output bundles.
In situations where this leads to problems (e.g subresource integrity) you can use this option as a fallback.

Please note that this option will not interact with any settings provided in the `sourcemaps` option. Using `uploadLegacySourcemaps` is a completely separate upload mechanism we provide for backwards-compatibility.

The `IncludeEntry` type looks as follows:

```ts
type IncludeEntry = {
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
```



### `bundleSizeOptimizations`



Options for bundle size optimizations by excluding certain features.
### `bundleSizeOptimizations.excludeDebugStatements`

Type: `boolean`

Exclude debug statements from the bundle, thus disabling features like the SDK's `debug` option.

If set to `true`, the plugin will attempt to tree-shake (remove) any debugging code within the Sentry SDK during the build.
Note that the success of this depends on tree-shaking being enabled in your build tooling.

Defaults to `false`.

### `bundleSizeOptimizations.excludeTracing`

Type: `boolean`

Exclude tracing functionality from the bundle, thus disabling features like performance monitoring.

If set to `true`, the plugin will attempt to tree-shake (remove) code within the Sentry SDK that is related to tracing and performance monitoring.
Note that the success of this depends on tree-shaking being enabled in your build tooling.

**Notice:** Do not enable this when you're using any performance monitoring-related SDK features (e.g. `Sentry.startTransaction()`).

Defaults to `false`.

### `bundleSizeOptimizations.excludeReplayShadowDom`

Type: `boolean`

Exclude Replay Shadow DOM functionality from the bundle.

If set to `true`, the plugin will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay Shadow DOM recording functionality.
Note that the success of this depends on tree-shaking being enabled in your build tooling.

This option is safe to be used when you do not want to capture any Shadow DOM activity via Sentry Session Replay.

Defaults to `false`.

### `bundleSizeOptimizations.excludeReplayIframe`

Type: `boolean`

Exclude Replay iFrame functionality from the bundle.

If set to `true`, the plugin will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay `iframe` recording functionality.
Note that the success of this depends on tree-shaking being enabled in your build tooling.

You can safely do this when you do not want to capture any `iframe` activity via Sentry Session Replay.

Defaults to `false`.

### `bundleSizeOptimizations.excludeReplayWorker`

Type: `boolean`

Exclude Replay worker functionality from the bundle.

If set to `true`, the plugin will attempt to tree-shake (remove) code related to the Sentry SDK's Session Replay's Compression Web Worker.
Note that the success of this depends on tree-shaking being enabled in your build tooling.

**Notice:** You should only use this option if you manually host a compression worker and configure it in your Sentry Session Replay integration config via the `workerUrl` option.

Defaults to `false`.

### `reactComponentAnnotation`



(NOTICE: Use the react component annotation feature with caution. The option will pass additional properties to your React components which may lead to errors if libraries or your own code iterate through component props without checking for the additional Sentry props.)

Options related to react component name annotations.
      Disabled by default, unless a value is set for this option.
When enabled, your app's DOM will automatically be annotated during build-time with their respective component names.
This will unlock the capability to search for Replays in Sentry by component name, as well as see component names in breadcrumbs and performance monitoring.
### `reactComponentAnnotation.enabled`

Type: `boolean`

Whether the component name annotate plugin should be enabled or not.

### `reactComponentAnnotation.ignoredComponents`

Type: `string[]`

A list of strings representing the names of components to ignore. The plugin will not perform apply `data-sentry` annotations on the DOM element for these components.

### `moduleMetadata`

Type: `Record<string, any> | (args: { org?: string; project?: string; release?: string; }) => Record<string, any>`

Metadata that should be associated with the built application.

The metadata is serialized and can be looked up at runtime from within the SDK (for example in the `beforeSend`, event processors, or the transport), allowing for custom event filtering logic or routing of events.

Metadata can either be passed directly or alternatively a callback can be provided that will be called with the following parameters:

- `org`: The organization slug.
- `project`: The project slug.
- `release`: The release name.

### `applicationKey`

Type: `string`

A key which will embedded in all the bundled files. The SDK will be able to use the key to apply filtering rules, for example using the `thirdPartyErrorFilterIntegration`.

### `_experiments`

Type: `string`

Options that are considered experimental and subject to change. This option does not follow semantic versioning and may change in any release.
### `_experiments.injectBuildInformation`

Type: `boolean`

If set to true, the plugin will inject an additional `SENTRY_BUILD_INFO` variable. This contains information about the build, e.g. dependencies, node version and other useful data.

Defaults to `false`.



### Configuration File

As an additional configuration method, the Sentry Vite plugin will pick up environment variables configured inside a `.env.sentry-build-plugin` file located in the current working directory when building your app.

## More information

- [Sentry Documentation](https://docs.sentry.io/quickstart/)
- [Sentry Discord](https://discord.gg/Ww9hbqr)
- [Sentry Stackoverflow](http://stackoverflow.com/questions/tagged/sentry)
