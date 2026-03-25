import { Dt as freeExternalMemory, H as defineParallelPlugin, M as SourceMapInput, Tt as RolldownOutput, o as InputOptions, yt as OutputOptions } from "./shared/define-config-CrMIxA40.mjs";
import { A as IsolatedDeclarationsOptions, B as ResolverFactory, F as NapiResolveOptions, G as moduleRunnerTransform, H as TransformResult, I as ParseResult, J as transform, K as parseAsync, L as ParserOptions, N as MinifyOptions, P as MinifyResult, S as BindingViteCssPluginConfig, U as isolatedDeclaration, V as TransformOptions, W as minify, b as BindingTransformPluginConfig, h as BindingRebuildStrategy, i as BindingClientHmrUpdate, j as IsolatedDeclarationsResult, q as parseSync, t as BindingAssetPluginConfig, x as BindingUrlResolver, z as ResolveResult } from "./shared/binding-BTw1cXhU.mjs";
import { t as BuiltinPlugin } from "./shared/utils-BxvnUO-9.mjs";
import { _ as wasmHelperPlugin, a as importGlobPlugin, c as loadFallbackPlugin, d as reactRefreshWrapperPlugin, f as reporterPlugin, g as wasmFallbackPlugin, h as viteResolvePlugin, i as htmlInlineProxyPlugin, l as manifestPlugin, m as viteHtmlPlugin, n as dynamicImportVarsPlugin, o as isolatedDeclarationPlugin, p as viteCSSPostPlugin, s as jsonPlugin, t as buildImportAnalysisPlugin, u as modulePreloadPolyfillPlugin, v as webWorkerPostPlugin } from "./shared/constructors-BGT3rFMD.mjs";

//#region src/api/dev/dev-options.d.ts
type DevOnHmrUpdates = (result: Error | {
  updates: BindingClientHmrUpdate[];
  changedFiles: string[];
}) => void | Promise<void>;
type DevOnOutput = (result: Error | RolldownOutput) => void | Promise<void>;
interface DevWatchOptions {
  /**
  * If `true`, files are not written to disk.
  * @default false
  */
  skipWrite?: boolean;
  /**
  * If `true`, use polling instead of native file system events for watching.
  * @default false
  */
  usePolling?: boolean;
  /**
  * Poll interval in milliseconds (only used when usePolling is true).
  * @default 100
  */
  pollInterval?: number;
  /**
  * If `true`, use debounced watcher. If `false`, use non-debounced watcher for immediate responses.
  * @default true
  */
  useDebounce?: boolean;
  /**
  * Debounce duration in milliseconds (only used when useDebounce is true).
  * @default 10
  */
  debounceDuration?: number;
  /**
  * Whether to compare file contents for poll-based watchers (only used when usePolling is true).
  * When enabled, poll watchers will check file contents to determine if they actually changed.
  * @default false
  */
  compareContentsForPolling?: boolean;
  /**
  * Tick rate in milliseconds for debounced watchers (only used when useDebounce is true).
  * Controls how frequently the debouncer checks for events to process.
  * When not specified, the debouncer will auto-select an appropriate tick rate (1/4 of the debounce duration).
  * @default undefined (auto-select)
  */
  debounceTickRate?: number;
}
interface DevOptions {
  onHmrUpdates?: DevOnHmrUpdates;
  onOutput?: DevOnOutput;
  /**
  * Strategy for triggering rebuilds after HMR updates.
  * - `'always'`: Always trigger a rebuild after HMR updates
  * - `'auto'`: Trigger rebuild only if HMR updates contain full reload updates
  * - `'never'`: Never trigger rebuild after HMR updates (default)
  * @default 'auto'
  */
  rebuildStrategy?: "always" | "auto" | "never";
  watch?: DevWatchOptions;
}
//#endregion
//#region src/api/dev/dev-engine.d.ts
declare class DevEngine {
  #private;
  static create(inputOptions: InputOptions, outputOptions?: OutputOptions, devOptions?: DevOptions): Promise<DevEngine>;
  private constructor();
  run(): Promise<void>;
  ensureCurrentBuildFinish(): Promise<void>;
  hasLatestBuildOutput(): Promise<boolean>;
  ensureLatestBuildOutput(): Promise<void>;
  invalidate(file: string, firstInvalidatedBy?: string): Promise<BindingClientHmrUpdate[]>;
  registerModules(clientId: string, modules: string[]): void;
  removeClient(clientId: string): void;
  close(): Promise<void>;
}
//#endregion
//#region src/api/dev/index.d.ts
declare const dev: typeof DevEngine.create;
//#endregion
//#region src/api/experimental.d.ts
/**
* This is an experimental API. Its behavior may change in the future.
*
* - Calling this API will only execute the `scan/build` stage of rolldown.
* - `scan` will clean up all resources automatically, but if you want to ensure timely cleanup, you need to wait for the returned promise to resolve.
*
* @example To ensure cleanup of resources, use the returned promise to wait for the scan to complete.
* ```ts
* import { scan } from 'rolldown/api/experimental';
*
* const cleanupPromise = await scan(...);
* await cleanupPromise;
* // Now all resources have been cleaned up.
* ```
*/
declare const scan: (rawInputOptions: InputOptions, rawOutputOptions?: {}) => Promise<Promise<void>>;
//#endregion
//#region src/builtin-plugin/alias-plugin.d.ts
type AliasPluginAlias = {
  find: string | RegExp;
  replacement: string;
};
type AliasPluginConfig = {
  entries: AliasPluginAlias[];
};
declare function aliasPlugin(config: AliasPluginConfig): BuiltinPlugin;
//#endregion
//#region src/builtin-plugin/asset-plugin.d.ts
declare function assetPlugin(config: BindingAssetPluginConfig): BuiltinPlugin;
//#endregion
//#region src/builtin-plugin/transform-plugin.d.ts
type TransformPattern = string | RegExp | readonly (RegExp | string)[];
type TransformPluginConfig = Omit<BindingTransformPluginConfig, "include" | "exclude" | "jsxRefreshInclude" | "jsxRefreshExclude"> & {
  include?: TransformPattern;
  exclude?: TransformPattern;
  jsxRefreshInclude?: TransformPattern;
  jsxRefreshExclude?: TransformPattern;
};
declare function transformPlugin(config?: TransformPluginConfig): BuiltinPlugin;
//#endregion
//#region src/builtin-plugin/vite-css-plugin.d.ts
type ViteCssPluginConfig = Omit<BindingViteCssPluginConfig, "compileCSS"> & {
  compileCSS: (url: string, importer: string, resolver: BindingUrlResolver) => Promise<{
    code: string;
    map?: SourceMapInput;
    modules?: Record<string, string>;
    deps?: Set<string>;
  }>;
};
declare function viteCSSPlugin(config?: ViteCssPluginConfig): BuiltinPlugin;
//#endregion
export { type BindingClientHmrUpdate, BindingRebuildStrategy, DevEngine, type DevOptions, type DevWatchOptions, type IsolatedDeclarationsOptions, type IsolatedDeclarationsResult, type MinifyOptions, type MinifyResult, type ParseResult, type ParserOptions, type NapiResolveOptions as ResolveOptions, type ResolveResult, ResolverFactory, type TransformOptions, type TransformResult, aliasPlugin, assetPlugin, buildImportAnalysisPlugin, defineParallelPlugin, dev, dynamicImportVarsPlugin, freeExternalMemory, htmlInlineProxyPlugin, importGlobPlugin, isolatedDeclaration, isolatedDeclarationPlugin, jsonPlugin, loadFallbackPlugin, manifestPlugin, minify, modulePreloadPolyfillPlugin, moduleRunnerTransform, parseAsync, parseSync, reactRefreshWrapperPlugin, reporterPlugin, scan, transform, transformPlugin, viteCSSPlugin, viteCSSPostPlugin, viteHtmlPlugin, viteResolvePlugin, wasmFallbackPlugin, wasmHelperPlugin, webWorkerPostPlugin };