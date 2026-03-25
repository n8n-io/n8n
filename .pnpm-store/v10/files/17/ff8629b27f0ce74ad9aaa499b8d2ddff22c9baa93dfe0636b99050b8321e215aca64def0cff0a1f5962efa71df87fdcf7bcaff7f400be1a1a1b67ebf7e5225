import { SourceMap } from "magic-string";
import { UnpluginInstance, UnpluginOptions } from "unplugin";
import { Logger } from "./logger";
import { Options, SentrySDKBuildFlags } from "./types";
interface SentryUnpluginFactoryOptions {
    releaseInjectionPlugin: (injectionCode: string) => UnpluginOptions;
    componentNameAnnotatePlugin?: (ignoredComponents?: string[]) => UnpluginOptions;
    moduleMetadataInjectionPlugin: (injectionCode: string) => UnpluginOptions;
    debugIdInjectionPlugin: (logger: Logger) => UnpluginOptions;
    debugIdUploadPlugin: (upload: (buildArtifacts: string[]) => Promise<void>, logger: Logger, createDependencyOnBuildArtifacts: () => () => void, webpack_forceExitOnBuildComplete?: boolean) => UnpluginOptions;
    bundleSizeOptimizationsPlugin: (buildFlags: SentrySDKBuildFlags) => UnpluginOptions;
}
/**
 * Creates an unplugin instance used to create Sentry plugins for Vite, Rollup, esbuild, and Webpack.
 */
export declare function sentryUnpluginFactory({ releaseInjectionPlugin, componentNameAnnotatePlugin, moduleMetadataInjectionPlugin, debugIdInjectionPlugin, debugIdUploadPlugin, bundleSizeOptimizationsPlugin, }: SentryUnpluginFactoryOptions): UnpluginInstance<Options | undefined, true>;
/**
 * Determines whether the Sentry CLI binary is in its expected location.
 * This function is useful since `@sentry/cli` installs the binary via a post-install
 * script and post-install scripts may not always run. E.g. with `npm i --ignore-scripts`.
 */
export declare function sentryCliBinaryExists(): boolean;
/**
 * Simplified `renderChunk` hook type from Rollup.
 * We can't reference the type directly because the Vite plugin complains
 * about type mismatches
 */
type RenderChunkHook = (code: string, chunk: {
    fileName: string;
}) => {
    code: string;
    map: SourceMap;
} | null;
export declare function createRollupReleaseInjectionHooks(injectionCode: string): {
    renderChunk: RenderChunkHook;
};
export declare function createRollupBundleSizeOptimizationHooks(replacementValues: SentrySDKBuildFlags): {
    transform: UnpluginOptions["transform"];
};
export declare function createRollupDebugIdInjectionHooks(): {
    renderChunk: RenderChunkHook;
};
export declare function createRollupModuleMetadataInjectionHooks(injectionCode: string): {
    renderChunk: RenderChunkHook;
};
export declare function createRollupDebugIdUploadHooks(upload: (buildArtifacts: string[]) => Promise<void>, _logger: Logger, createDependencyOnBuildArtifacts: () => () => void): {
    writeBundle: (outputOptions: {
        dir?: string;
        file?: string;
    }, bundle: {
        [fileName: string]: unknown;
    }) => Promise<void>;
};
export declare function createComponentNameAnnotateHooks(ignoredComponents?: string[]): {
    transform: UnpluginOptions["transform"];
};
export declare function getDebugIdSnippet(debugId: string): string;
export type { Logger } from "./logger";
export type { Options, SentrySDKBuildFlags } from "./types";
export { replaceBooleanFlagsInCode, stringToUUID } from "./utils";
export { createSentryBuildPluginManager } from "./build-plugin-manager";
//# sourceMappingURL=index.d.ts.map