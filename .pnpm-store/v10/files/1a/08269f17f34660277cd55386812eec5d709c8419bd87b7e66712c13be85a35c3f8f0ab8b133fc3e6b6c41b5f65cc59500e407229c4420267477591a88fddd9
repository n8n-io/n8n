import { t as BuiltinPlugin } from "./shared/utils-DKydZ4iH.mjs";
import { B as ParserOptions, G as TransformResult, H as ResolveResult, I as MinifyOptions, J as minify, K as isolatedDeclaration, L as MinifyResult, N as IsolatedDeclarationsOptions, O as BindingViteTransformPluginConfig, P as IsolatedDeclarationsResult, Q as transformSync, R as NapiResolveOptions, U as ResolverFactory, W as TransformOptions, X as moduleRunnerTransform, Y as minifySync, Z as transform, b as BindingViteHtmlPluginConfig, c as BindingRebuildStrategy, f as BindingUrlResolver, g as BindingViteCssPluginConfig, m as BindingViteAssetPluginConfig, n as BindingBundleState, q as isolatedDeclarationSync, r as BindingClientHmrUpdate, z as ParseResult } from "./shared/binding-BKL2JHoJ.mjs";
import { Ct as RolldownOutput, H as defineParallelPlugin, M as SourceMapInput, P as OutputBundle, Tt as freeExternalMemory, U as MinimalPluginContext, _t as OutputOptions, bt as OutputChunk, o as InputOptions } from "./shared/define-config-9CiSl0uo.mjs";
import { _ as viteWasmHelperPlugin, a as viteCSSPostPlugin, c as viteImportGlobPlugin, d as viteManifestPlugin, f as viteModulePreloadPolyfillPlugin, g as viteWasmFallbackPlugin, h as viteResolvePlugin, i as viteBuildImportAnalysisPlugin, l as viteJsonPlugin, m as viteReporterPlugin, n as isolatedDeclarationPlugin, o as viteDynamicImportVarsPlugin, p as viteReactRefreshWrapperPlugin, r as viteAssetImportMetaUrlPlugin, s as viteHtmlInlineProxyPlugin, u as viteLoadFallbackPlugin, v as viteWebWorkerPostPlugin } from "./shared/constructors-BvaMwihu.mjs";

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
  getBundleState(): Promise<BindingBundleState>;
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
//#region src/utils/parse.d.ts
/**
* Parse asynchronously.
*
* Note: This function can be slower than `parseSync` due to the overhead of spawning a thread.
*/
declare function parse(filename: string, sourceText: string, options?: ParserOptions | null): Promise<ParseResult>;
/** Parse synchronously. */
declare function parseSync(filename: string, sourceText: string, options?: ParserOptions | null): ParseResult;
//#endregion
//#region src/builtin-plugin/alias-plugin.d.ts
type ViteAliasPluginConfig = {
  entries: {
    find: string | RegExp;
    replacement: string;
  }[];
};
declare function viteAliasPlugin(config: ViteAliasPluginConfig): BuiltinPlugin;
//#endregion
//#region src/builtin-plugin/asset-plugin.d.ts
declare function viteAssetPlugin(config: BindingViteAssetPluginConfig): BuiltinPlugin;
//#endregion
//#region src/builtin-plugin/transform-plugin.d.ts
type TransformPattern = string | RegExp | readonly (RegExp | string)[];
type TransformPluginConfig = Omit<BindingViteTransformPluginConfig, "include" | "exclude" | "jsxRefreshInclude" | "jsxRefreshExclude"> & {
  include?: TransformPattern;
  exclude?: TransformPattern;
  jsxRefreshInclude?: TransformPattern;
  jsxRefreshExclude?: TransformPattern;
};
declare function viteTransformPlugin(config?: TransformPluginConfig): BuiltinPlugin;
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
//#region src/builtin-plugin/vite-html-plugin.d.ts
interface HtmlTagDescriptor {
  tag: string;
  /**
  * attribute values will be escaped automatically if needed
  */
  attrs?: Record<string, string | boolean | undefined>;
  children?: string | HtmlTagDescriptor[];
  /**
  * default: 'head-prepend'
  */
  injectTo?: "head" | "body" | "head-prepend" | "body-prepend";
}
type IndexHtmlTransformResult = string | HtmlTagDescriptor[] | {
  html: string;
  tags: HtmlTagDescriptor[];
};
type IndexHtmlTransformHook = (this: MinimalPluginContext, html: string, ctx: IndexHtmlTransformContext) => IndexHtmlTransformResult | void | Promise<IndexHtmlTransformResult | void>;
interface IndexHtmlTransformContext {
  /**
  * public path when served
  */
  path: string;
  /**
  * filename on disk
  */
  filename: string;
  bundle?: OutputBundle;
  chunk?: OutputChunk;
}
interface ViteHtmlPluginOptions extends Omit<BindingViteHtmlPluginConfig, "transformIndexHtml"> {
  preHooks: IndexHtmlTransformHook[];
  normalHooks: IndexHtmlTransformHook[];
  postHooks: IndexHtmlTransformHook[];
  applyHtmlTransforms: (html: string, hooks: IndexHtmlTransformHook[], pluginContext: MinimalPluginContext, ctx: IndexHtmlTransformContext) => Promise<string>;
}
declare function viteHtmlPlugin(config?: ViteHtmlPluginOptions): BuiltinPlugin;
//#endregion
export { type BindingClientHmrUpdate, BindingRebuildStrategy, DevEngine, type DevOptions, type DevWatchOptions, type IsolatedDeclarationsOptions, type IsolatedDeclarationsResult, type MinifyOptions, type MinifyResult, type ParseResult, type ParserOptions, type NapiResolveOptions as ResolveOptions, type ResolveResult, ResolverFactory, type TransformOptions, type TransformResult, type ViteHtmlPluginOptions, defineParallelPlugin, dev, viteDynamicImportVarsPlugin as dynamicImportVarsPlugin, viteDynamicImportVarsPlugin, freeExternalMemory, viteImportGlobPlugin as importGlobPlugin, viteImportGlobPlugin, isolatedDeclaration, isolatedDeclarationPlugin, isolatedDeclarationSync, minify, minifySync, moduleRunnerTransform, parse, parseSync, scan, transform, transformSync, viteAliasPlugin, viteAssetImportMetaUrlPlugin, viteAssetPlugin, viteBuildImportAnalysisPlugin, viteCSSPlugin, viteCSSPostPlugin, viteHtmlInlineProxyPlugin, viteHtmlPlugin, viteJsonPlugin, viteLoadFallbackPlugin, viteManifestPlugin, viteModulePreloadPolyfillPlugin, viteReactRefreshWrapperPlugin, viteReporterPlugin, viteResolvePlugin, viteTransformPlugin, viteWasmFallbackPlugin, viteWasmHelperPlugin, viteWebWorkerPostPlugin };