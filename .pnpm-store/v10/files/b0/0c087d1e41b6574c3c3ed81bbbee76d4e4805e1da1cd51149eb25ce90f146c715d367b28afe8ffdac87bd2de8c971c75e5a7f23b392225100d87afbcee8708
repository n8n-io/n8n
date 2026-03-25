import { NormalizedOptions } from "./options-mapping";
import { Logger } from "./logger";
import { Options, SentrySDKBuildFlags } from "./types";
export type SentryBuildPluginManager = {
    /**
     * A logger instance that takes the options passed to the build plugin manager into account. (for silencing and log level etc.)
     */
    logger: Logger;
    /**
     * Options after normalization. Includes things like the inferred release name.
     */
    normalizedOptions: NormalizedOptions;
    /**
     * Magic strings and their replacement values that can be used for bundle size optimizations. This already takes
     * into account the options passed to the build plugin manager.
     */
    bundleSizeOptimizationReplacementValues: SentrySDKBuildFlags;
    /**
     * Metadata that should be injected into bundles if possible. Takes into account options passed to the build plugin manager.
     */
    bundleMetadata: Record<string, unknown>;
    /**
     * Contains utility functions for emitting telemetry via the build plugin manager.
     */
    telemetry: {
        /**
         * Emits a `Sentry Bundler Plugin execution` signal.
         */
        emitBundlerPluginExecutionSignal(): Promise<void>;
    };
    /**
     * Will potentially create a release based on the build plugin manager options.
     *
     * Also
     * - finalizes the release
     * - sets commits
     * - uploads legacy sourcemaps
     * - adds deploy information
     */
    createRelease(): Promise<void>;
    /**
     * Injects debug IDs into the build artifacts.
     *
     * This is a separate function from `uploadSourcemaps` because that needs to run before the sourcemaps are uploaded.
     * Usually the respective bundler-plugin will take care of this before the sourcemaps are uploaded.
     * Only use this if you need to manually inject debug IDs into the build artifacts.
     */
    injectDebugIds(buildArtifactPaths: string[]): Promise<void>;
    /**
     * Uploads sourcemaps using the "Debug ID" method. This function takes a list of build artifact paths that will be uploaded
     */
    uploadSourcemaps(buildArtifactPaths: string[], opts?: {
        prepareArtifacts?: boolean;
    }): Promise<void>;
    /**
     * Will delete artifacts based on the passed `sourcemaps.filesToDeleteAfterUpload` option.
     */
    deleteArtifacts(): Promise<void>;
    createDependencyOnBuildArtifacts: () => () => void;
};
/**
 * Creates a build plugin manager that exposes primitives for everything that a Sentry JavaScript SDK or build tooling may do during a build.
 *
 * The build plugin manager's behavior strongly depends on the options that are passed in.
 */
export declare function createSentryBuildPluginManager(userOptions: Options, bundlerPluginMetaContext: {
    /**
     * E.g. `webpack` or `nextjs` or `turbopack`
     */
    buildTool: string;
    /**
     * E.g. `[sentry-webpack-plugin]` or `[@sentry/nextjs]`
     */
    loggerPrefix: string;
}): SentryBuildPluginManager;
//# sourceMappingURL=build-plugin-manager.d.ts.map