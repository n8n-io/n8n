import { t as require_binding } from "./shared/binding-kg77KQCQ.mjs";
import "./shared/logs-CSQ_UMWp.mjs";
import "./shared/misc-CxyvWjTr.mjs";
import { c as transformToRollupOutput, l as bindingifySourcemap, n as BuiltinPlugin, t as normalizedStringOrRegex } from "./shared/normalize-string-or-regex-VlPkMWXA.mjs";
import { l as PluginDriver, n as createBundlerOptions, s as validateOption, t as RolldownBuild } from "./shared/rolldown-build-D2CkFbcq.mjs";
import { o as normalizeBindingResult, s as unwrapBindingResult } from "./shared/bindingify-input-options-6nBAYjYP.mjs";
import { i as parseSync, r as parse } from "./shared/parse-ast-index-C44ewaWh.mjs";
import { _ as viteWasmHelperPlugin, a as viteCSSPostPlugin, c as viteImportGlobPlugin, d as viteManifestPlugin, f as viteModulePreloadPolyfillPlugin, g as viteWasmFallbackPlugin, h as viteResolvePlugin, i as viteBuildImportAnalysisPlugin, l as viteJsonPlugin, m as viteReporterPlugin, n as isolatedDeclarationPlugin, o as viteDynamicImportVarsPlugin, p as viteReactRefreshWrapperPlugin, r as viteAssetImportMetaUrlPlugin, s as viteHtmlInlineProxyPlugin, u as viteLoadFallbackPlugin, v as viteWebWorkerPostPlugin } from "./shared/constructors-CwAnOHmv.mjs";
import { pathToFileURL } from "node:url";

//#region src/api/dev/dev-engine.ts
var import_binding$2 = require_binding();
var DevEngine = class DevEngine {
	#inner;
	#cachedBuildFinishPromise = null;
	static async create(inputOptions, outputOptions = {}, devOptions = {}) {
		inputOptions = await PluginDriver.callOptionsHook(inputOptions);
		const options = await createBundlerOptions(inputOptions, outputOptions, false);
		const userOnHmrUpdates = devOptions.onHmrUpdates;
		const bindingOnHmrUpdates = userOnHmrUpdates ? function(rawResult) {
			const result = normalizeBindingResult(rawResult);
			if (result instanceof Error) {
				userOnHmrUpdates(result);
				return;
			}
			const [updates, changedFiles] = result;
			userOnHmrUpdates({
				updates,
				changedFiles
			});
		} : void 0;
		const userOnOutput = devOptions.onOutput;
		const bindingDevOptions = {
			onHmrUpdates: bindingOnHmrUpdates,
			onOutput: userOnOutput ? function(rawResult) {
				const result = normalizeBindingResult(rawResult);
				if (result instanceof Error) {
					userOnOutput(result);
					return;
				}
				userOnOutput(transformToRollupOutput(result));
			} : void 0,
			rebuildStrategy: devOptions.rebuildStrategy ? devOptions.rebuildStrategy === "always" ? import_binding$2.BindingRebuildStrategy.Always : devOptions.rebuildStrategy === "auto" ? import_binding$2.BindingRebuildStrategy.Auto : import_binding$2.BindingRebuildStrategy.Never : void 0,
			watch: devOptions.watch && {
				skipWrite: devOptions.watch.skipWrite,
				usePolling: devOptions.watch.usePolling,
				pollInterval: devOptions.watch.pollInterval,
				useDebounce: devOptions.watch.useDebounce,
				debounceDuration: devOptions.watch.debounceDuration,
				compareContentsForPolling: devOptions.watch.compareContentsForPolling,
				debounceTickRate: devOptions.watch.debounceTickRate
			}
		};
		return new DevEngine(new import_binding$2.BindingDevEngine(options.bundlerOptions, bindingDevOptions));
	}
	constructor(inner) {
		this.#inner = inner;
	}
	async run() {
		await this.#inner.run();
	}
	async ensureCurrentBuildFinish() {
		if (this.#cachedBuildFinishPromise) return this.#cachedBuildFinishPromise;
		const promise = this.#inner.ensureCurrentBuildFinish().then(() => {
			this.#cachedBuildFinishPromise = null;
		});
		this.#cachedBuildFinishPromise = promise;
		return promise;
	}
	async getBundleState() {
		return this.#inner.getBundleState();
	}
	async ensureLatestBuildOutput() {
		await this.#inner.ensureLatestBuildOutput();
	}
	async invalidate(file, firstInvalidatedBy) {
		return this.#inner.invalidate(file, firstInvalidatedBy);
	}
	registerModules(clientId, modules) {
		this.#inner.registerModules(clientId, modules);
	}
	removeClient(clientId) {
		this.#inner.removeClient(clientId);
	}
	async close() {
		await this.#inner.close();
	}
};

//#endregion
//#region src/api/dev/index.ts
const dev = (...args) => DevEngine.create(...args);

//#endregion
//#region src/types/external-memory-handle.ts
const symbolForExternalMemoryHandle = "__rolldown_external_memory_handle__";
/**
* Frees the external memory held by the given handle.
*
* This is useful when you want to manually release memory held by Rust objects
* (like `OutputChunk` or `OutputAsset`) before they are garbage collected.
*
* @param handle - The object with external memory to free
* @param keepDataAlive - If true, evaluates all lazy fields before freeing memory (default: false).
*   This will take time to copy data from Rust to JavaScript, but prevents errors
*   when accessing properties after the memory is freed.
* @returns Status object with `freed` boolean and optional `reason` string.
*   - `{ freed: true }` if memory was successfully freed
*   - `{ freed: false, reason: "..." }` if memory couldn't be freed (e.g., already freed or other references exist)
*
* @example
* ```typescript
* import { freeExternalMemory } from 'rolldown/experimental';
*
* const output = await bundle.generate();
* const chunk = output.output[0];
*
* // Use the chunk...
*
* // Manually free the memory (fast, but accessing properties after will throw)
* const status = freeExternalMemory(chunk); // { freed: true }
* const statusAgain = freeExternalMemory(chunk); // { freed: false, reason: "Memory has already been freed" }
*
* // Keep data alive before freeing (slower, but data remains accessible)
* freeExternalMemory(chunk, true); // Evaluates all lazy fields first
* console.log(chunk.code); // OK - data was copied to JavaScript before freeing
*
* // Without keepDataAlive, accessing chunk properties after freeing will throw an error
* ```
*/
function freeExternalMemory(handle, keepDataAlive = false) {
	return handle[symbolForExternalMemoryHandle](keepDataAlive);
}

//#endregion
//#region src/api/experimental.ts
var import_binding$1 = require_binding();
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
const scan = async (rawInputOptions, rawOutputOptions = {}) => {
	validateOption("input", rawInputOptions);
	validateOption("output", rawOutputOptions);
	const ret = await createBundlerOptions(await PluginDriver.callOptionsHook(rawInputOptions), rawOutputOptions, false);
	const bundler = new import_binding$1.BindingBundler();
	if (RolldownBuild.asyncRuntimeShutdown) (0, import_binding$1.startAsyncRuntime)();
	async function cleanup() {
		await bundler.close();
		await ret.stopWorkers?.();
		(0, import_binding$1.shutdownAsyncRuntime)();
		RolldownBuild.asyncRuntimeShutdown = true;
	}
	let cleanupPromise = Promise.resolve();
	try {
		unwrapBindingResult(await bundler.scan(ret.bundlerOptions));
	} catch (err) {
		await cleanup();
		throw err;
	} finally {
		cleanupPromise = cleanup();
	}
	return cleanupPromise;
};

//#endregion
//#region src/plugin/parallel-plugin.ts
function defineParallelPlugin(pluginPath) {
	return (options) => {
		return { _parallel: {
			fileUrl: pathToFileURL(pluginPath).href,
			options
		} };
	};
}

//#endregion
//#region src/builtin-plugin/alias-plugin.ts
function viteAliasPlugin(config) {
	return new BuiltinPlugin("builtin:vite-alias", config);
}

//#endregion
//#region src/builtin-plugin/asset-plugin.ts
function viteAssetPlugin(config) {
	return new BuiltinPlugin("builtin:vite-asset", config);
}

//#endregion
//#region src/builtin-plugin/transform-plugin.ts
function viteTransformPlugin(config) {
	if (config) config = {
		...config,
		include: normalizedStringOrRegex(config.include),
		exclude: normalizedStringOrRegex(config.exclude),
		jsxRefreshInclude: normalizedStringOrRegex(config.jsxRefreshInclude),
		jsxRefreshExclude: normalizedStringOrRegex(config.jsxRefreshExclude)
	};
	return new BuiltinPlugin("builtin:vite-transform", config);
}

//#endregion
//#region src/builtin-plugin/vite-css-plugin.ts
function viteCSSPlugin(config) {
	return new BuiltinPlugin("builtin:vite-css", config ? {
		...config,
		async compileCSS(url, importer, resolver) {
			let result = await config.compileCSS(url, importer, resolver);
			return {
				...result,
				map: bindingifySourcemap(result.map)
			};
		}
	} : void 0);
}

//#endregion
//#region src/builtin-plugin/vite-html-plugin.ts
function viteHtmlPlugin(config) {
	return new BuiltinPlugin("builtin:vite-html", config);
}

//#endregion
//#region src/experimental-index.ts
var import_binding = require_binding();

//#endregion
var BindingRebuildStrategy = import_binding.BindingRebuildStrategy;
var ResolverFactory = import_binding.ResolverFactory;
var isolatedDeclaration = import_binding.isolatedDeclaration;
var isolatedDeclarationSync = import_binding.isolatedDeclarationSync;
var minify = import_binding.minify;
var minifySync = import_binding.minifySync;
var moduleRunnerTransform = import_binding.moduleRunnerTransform;
var transform = import_binding.transform;
var transformSync = import_binding.transformSync;
export { BindingRebuildStrategy, DevEngine, ResolverFactory, defineParallelPlugin, dev, viteDynamicImportVarsPlugin as dynamicImportVarsPlugin, viteDynamicImportVarsPlugin, freeExternalMemory, viteImportGlobPlugin as importGlobPlugin, viteImportGlobPlugin, isolatedDeclaration, isolatedDeclarationPlugin, isolatedDeclarationSync, minify, minifySync, moduleRunnerTransform, parse, parseSync, scan, transform, transformSync, viteAliasPlugin, viteAssetImportMetaUrlPlugin, viteAssetPlugin, viteBuildImportAnalysisPlugin, viteCSSPlugin, viteCSSPostPlugin, viteHtmlInlineProxyPlugin, viteHtmlPlugin, viteJsonPlugin, viteLoadFallbackPlugin, viteManifestPlugin, viteModulePreloadPolyfillPlugin, viteReactRefreshWrapperPlugin, viteReporterPlugin, viteResolvePlugin, viteTransformPlugin, viteWasmFallbackPlugin, viteWasmHelperPlugin, viteWebWorkerPostPlugin };