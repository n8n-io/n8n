import { SentryBuildPluginManager } from "./build-plugin-manager";
import { Logger } from "./logger";
import { ResolveSourceMapHook, RewriteSourcesHook } from "./types";
interface DebugIdUploadPluginOptions {
    sentryBuildPluginManager: SentryBuildPluginManager;
}
export declare function createDebugIdUploadFunction({ sentryBuildPluginManager, }: DebugIdUploadPluginOptions): (buildArtifactPaths: string[]) => Promise<void>;
export declare function prepareBundleForDebugIdUpload(bundleFilePath: string, uploadFolder: string, chunkIndex: number, logger: Logger, rewriteSourcesHook: RewriteSourcesHook, resolveSourceMapHook: ResolveSourceMapHook | undefined): Promise<void>;
/**
 * Applies a set of heuristics to find the source map for a particular bundle.
 *
 * @returns the path to the bundle's source map or `undefined` if none could be found.
 */
export declare function determineSourceMapPathFromBundle(bundlePath: string, bundleSource: string, logger: Logger, resolveSourceMapHook: ResolveSourceMapHook | undefined): Promise<string | undefined>;
export declare function defaultRewriteSourcesHook(source: string): string;
export {};
//# sourceMappingURL=debug-id-upload.d.ts.map