import { i as makeBuiltinPluginCallable, n as BuiltinPlugin, t as normalizedStringOrRegex } from "./normalize-string-or-regex-vZ5EI4ro.mjs";

//#region src/builtin-plugin/constructors.ts
function modulePreloadPolyfillPlugin(config) {
	return new BuiltinPlugin("builtin:module-preload-polyfill", config);
}
function dynamicImportVarsPlugin(config) {
	if (config) {
		config.include = normalizedStringOrRegex(config.include);
		config.exclude = normalizedStringOrRegex(config.exclude);
	}
	return new BuiltinPlugin("builtin:dynamic-import-vars", config);
}
function importGlobPlugin(config) {
	return new BuiltinPlugin("builtin:import-glob", config);
}
function reporterPlugin(config) {
	return new BuiltinPlugin("builtin:reporter", config);
}
function manifestPlugin(config) {
	return new BuiltinPlugin("builtin:manifest", config);
}
function wasmHelperPlugin(config) {
	return new BuiltinPlugin("builtin:wasm-helper", config);
}
function wasmFallbackPlugin() {
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:wasm-fallback"));
}
function loadFallbackPlugin() {
	return new BuiltinPlugin("builtin:load-fallback");
}
function jsonPlugin(config) {
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:json", config));
}
function buildImportAnalysisPlugin(config) {
	return new BuiltinPlugin("builtin:build-import-analysis", config);
}
function viteResolvePlugin(config) {
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:vite-resolve", config));
}
function isolatedDeclarationPlugin(config) {
	return new BuiltinPlugin("builtin:isolated-declaration", config);
}
function webWorkerPostPlugin() {
	return new BuiltinPlugin("builtin:web-worker-post");
}
function esmExternalRequirePlugin(config) {
	return new BuiltinPlugin("builtin:esm-external-require", config);
}
function reactRefreshWrapperPlugin(config) {
	if (config) {
		config.include = normalizedStringOrRegex(config.include);
		config.exclude = normalizedStringOrRegex(config.exclude);
	}
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:react-refresh-wrapper", config));
}
function viteCSSPostPlugin(config) {
	return new BuiltinPlugin("builtin:vite-css-post", config);
}
function viteHtmlPlugin(config) {
	return new BuiltinPlugin("builtin:vite-html", config);
}
function htmlInlineProxyPlugin() {
	return new BuiltinPlugin("builtin:html-inline-proxy");
}

//#endregion
export { wasmHelperPlugin as _, importGlobPlugin as a, loadFallbackPlugin as c, reactRefreshWrapperPlugin as d, reporterPlugin as f, wasmFallbackPlugin as g, viteResolvePlugin as h, htmlInlineProxyPlugin as i, manifestPlugin as l, viteHtmlPlugin as m, dynamicImportVarsPlugin as n, isolatedDeclarationPlugin as o, viteCSSPostPlugin as p, esmExternalRequirePlugin as r, jsonPlugin as s, buildImportAnalysisPlugin as t, modulePreloadPolyfillPlugin as u, webWorkerPostPlugin as v };