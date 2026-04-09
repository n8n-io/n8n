import { a as makeBuiltinPluginCallable, n as BuiltinPlugin, t as normalizedStringOrRegex } from "./normalize-string-or-regex-VlPkMWXA.mjs";

//#region src/builtin-plugin/constructors.ts
function viteModulePreloadPolyfillPlugin(config) {
	return new BuiltinPlugin("builtin:vite-module-preload-polyfill", config);
}
function viteDynamicImportVarsPlugin(config) {
	if (config) {
		config.include = normalizedStringOrRegex(config.include);
		config.exclude = normalizedStringOrRegex(config.exclude);
	}
	return new BuiltinPlugin("builtin:vite-dynamic-import-vars", config);
}
function viteImportGlobPlugin(config) {
	return new BuiltinPlugin("builtin:vite-import-glob", config);
}
function viteReporterPlugin(config) {
	return new BuiltinPlugin("builtin:vite-reporter", config);
}
function viteManifestPlugin(config) {
	return new BuiltinPlugin("builtin:vite-manifest", config);
}
function viteWasmHelperPlugin(config) {
	return new BuiltinPlugin("builtin:vite-wasm-helper", config);
}
function viteWasmFallbackPlugin() {
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:vite-wasm-fallback"));
}
function viteLoadFallbackPlugin() {
	return new BuiltinPlugin("builtin:vite-load-fallback");
}
function viteJsonPlugin(config) {
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:vite-json", config));
}
function viteBuildImportAnalysisPlugin(config) {
	return new BuiltinPlugin("builtin:vite-build-import-analysis", config);
}
function viteResolvePlugin(config) {
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:vite-resolve", config));
}
function isolatedDeclarationPlugin(config) {
	return new BuiltinPlugin("builtin:isolated-declaration", config);
}
function viteWebWorkerPostPlugin() {
	return new BuiltinPlugin("builtin:vite-web-worker-post");
}
function esmExternalRequirePlugin(config) {
	return new BuiltinPlugin("builtin:esm-external-require", config);
}
function viteReactRefreshWrapperPlugin(config) {
	if (config) {
		config.include = normalizedStringOrRegex(config.include);
		config.exclude = normalizedStringOrRegex(config.exclude);
	}
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:vite-react-refresh-wrapper", config));
}
function viteCSSPostPlugin(config) {
	return new BuiltinPlugin("builtin:vite-css-post", config);
}
function viteHtmlInlineProxyPlugin(config) {
	return new BuiltinPlugin("builtin:vite-html-inline-proxy", config);
}
function viteAssetImportMetaUrlPlugin(config) {
	return new BuiltinPlugin("builtin:vite-asset-import-meta-url", config);
}

//#endregion
export { viteWasmHelperPlugin as _, viteCSSPostPlugin as a, viteImportGlobPlugin as c, viteManifestPlugin as d, viteModulePreloadPolyfillPlugin as f, viteWasmFallbackPlugin as g, viteResolvePlugin as h, viteBuildImportAnalysisPlugin as i, viteJsonPlugin as l, viteReporterPlugin as m, isolatedDeclarationPlugin as n, viteDynamicImportVarsPlugin as o, viteReactRefreshWrapperPlugin as p, viteAssetImportMetaUrlPlugin as r, viteHtmlInlineProxyPlugin as s, esmExternalRequirePlugin as t, viteLoadFallbackPlugin as u, viteWebWorkerPostPlugin as v };