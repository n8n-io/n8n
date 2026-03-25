import { n as BuiltinPlugin, s as makeBuiltinPluginCallable, t as normalizedStringOrRegex } from "./normalize-string-or-regex-BhaIG1rU.mjs";

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
function viteHtmlInlineProxyPlugin(config) {
	return new BuiltinPlugin("builtin:vite-html-inline-proxy", config);
}
function viteAssetImportMetaUrlPlugin(config) {
	return new BuiltinPlugin("builtin:vite-asset-import-meta-url", config);
}

//#endregion
export { viteDynamicImportVarsPlugin as a, viteJsonPlugin as c, viteReactRefreshWrapperPlugin as d, viteReporterPlugin as f, viteWebWorkerPostPlugin as g, viteWasmHelperPlugin as h, viteBuildImportAnalysisPlugin as i, viteLoadFallbackPlugin as l, viteWasmFallbackPlugin as m, isolatedDeclarationPlugin as n, viteHtmlInlineProxyPlugin as o, viteResolvePlugin as p, viteAssetImportMetaUrlPlugin as r, viteImportGlobPlugin as s, esmExternalRequirePlugin as t, viteModulePreloadPolyfillPlugin as u };