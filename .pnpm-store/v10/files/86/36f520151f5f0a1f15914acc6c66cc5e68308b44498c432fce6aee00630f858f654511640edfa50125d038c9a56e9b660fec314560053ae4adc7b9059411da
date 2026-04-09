import MagicString, { SourceMap } from "magic-string";
import { UnpluginInstance, UnpluginOptions } from "unplugin";
import { Logger } from "./logger";
import { Options, SentrySDKBuildFlags } from "./types";
import { CodeInjection } from "./utils";
type InjectionPlugin = (injectionCode: CodeInjection, debugIds: boolean, logger: Logger) => UnpluginOptions;
type LegacyPlugins = {
    releaseInjectionPlugin: (injectionCode: string) => UnpluginOptions;
    moduleMetadataInjectionPlugin: (injectionCode: string) => UnpluginOptions;
    debugIdInjectionPlugin: (logger: Logger) => UnpluginOptions;
};
interface SentryUnpluginFactoryOptions {
    injectionPlugin: InjectionPlugin | LegacyPlugins;
    componentNameAnnotatePlugin?: (ignoredComponents: string[], injectIntoHtml: boolean) => UnpluginOptions;
    debugIdUploadPlugin: (upload: (buildArtifacts: string[]) => Promise<void>, logger: Logger, createDependencyOnBuildArtifacts: () => () => void, webpack_forceExitOnBuildComplete?: boolean) => UnpluginOptions;
    bundleSizeOptimizationsPlugin: (buildFlags: SentrySDKBuildFlags) => UnpluginOptions;
    getBundlerMajorVersion?: () => string | undefined;
}
/**
 * Creates an unplugin instance used to create Sentry plugins for Vite, Rollup, esbuild, and Webpack.
 */
export declare function sentryUnpluginFactory({ injectionPlugin, componentNameAnnotatePlugin, debugIdUploadPlugin, bundleSizeOptimizationsPlugin, getBundlerMajorVersion, }: SentryUnpluginFactoryOptions): UnpluginInstance<Options | undefined, true>;
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
    facadeModuleId?: string | null;
}, outputOptions?: unknown, meta?: {
    magicString?: MagicString;
}) => {
    code: string;
    readonly map?: SourceMap;
} | null;
export declare function createRollupBundleSizeOptimizationHooks(replacementValues: SentrySDKBuildFlags): {
    transform: UnpluginOptions["transform"];
};
export declare function createRollupInjectionHooks(injectionCode: CodeInjection, debugIds: boolean): {
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
export declare function createComponentNameAnnotateHooks(ignoredComponents: string[], injectIntoHtml: boolean): {
    transform: UnpluginOptions["transform"];
};
export declare function getDebugIdSnippet(debugId: string): CodeInjection;
export type { Logger } from "./logger";
export type { Options, SentrySDKBuildFlags } from "./types";
export { CodeInjection, replaceBooleanFlagsInCode, stringToUUID } from "./utils";
export { createSentryBuildPluginManager } from "./build-plugin-manager";
//# sourceMappingURL=index.d.ts.map