import { createRequire as ___createRequire } from 'module'; const require = ___createRequire(import.meta.url);
import { BuildEnvironment, DevEnvironment, build, buildErrorMessage, createBuilder, createFilter, createIdResolver, createLogger, createRunnableDevEnvironment, createServer, createServerHotChannel, createServerModuleRunner, createServerModuleRunnerTransport, defineConfig, fetchModule, formatPostcssSourceMap, isCSSRequest, isFileLoadingAllowed, isFileServingAllowed, isRunnableDevEnvironment, loadConfigFromFile, loadEnv, mergeAlias, mergeConfig, normalizePath, optimizeDeps, perEnvironmentPlugin, perEnvironmentState, preprocessCSS, preview, resolveConfig, resolveEnvPrefix, rollupVersion, runnerImport, searchForWorkspaceRoot, send, sortUserPlugins, ssrTransform, transformWithEsbuild } from "./chunks/dep-Bsx9IwL8.js";
import { DEFAULT_CLIENT_CONDITIONS, DEFAULT_CLIENT_MAIN_FIELDS, DEFAULT_SERVER_CONDITIONS, DEFAULT_SERVER_MAIN_FIELDS, VERSION, defaultAllowedOrigins } from "./chunks/dep-Ctugieod.js";
import { parseAst, parseAstAsync } from "rollup/parseAst";
import { version as esbuildVersion } from "esbuild";

//#region src/node/server/environments/fetchableEnvironments.ts
function createFetchableDevEnvironment(name, config, context) {
	if (typeof Request === "undefined" || typeof Response === "undefined") throw new TypeError("FetchableDevEnvironment requires a global `Request` and `Response` object.");
	if (!context.handleRequest) throw new TypeError("FetchableDevEnvironment requires a `handleRequest` method during initialisation.");
	return new FetchableDevEnvironment(name, config, context);
}
function isFetchableDevEnvironment(environment) {
	return environment instanceof FetchableDevEnvironment;
}
var FetchableDevEnvironment = class extends DevEnvironment {
	_handleRequest;
	constructor(name, config, context) {
		super(name, config, context);
		this._handleRequest = context.handleRequest;
	}
	async dispatchFetch(request) {
		if (!(request instanceof Request)) throw new TypeError("FetchableDevEnvironment `dispatchFetch` must receive a `Request` object.");
		const response = await this._handleRequest(request);
		if (!(response instanceof Response)) throw new TypeError("FetchableDevEnvironment `context.handleRequest` must return a `Response` object.");
		return response;
	}
};

//#endregion
export { BuildEnvironment, DevEnvironment, build, buildErrorMessage, createBuilder, createFetchableDevEnvironment, createFilter, createIdResolver, createLogger, createRunnableDevEnvironment, createServer, createServerHotChannel, createServerModuleRunner, createServerModuleRunnerTransport, defaultAllowedOrigins, DEFAULT_CLIENT_CONDITIONS as defaultClientConditions, DEFAULT_CLIENT_MAIN_FIELDS as defaultClientMainFields, DEFAULT_SERVER_CONDITIONS as defaultServerConditions, DEFAULT_SERVER_MAIN_FIELDS as defaultServerMainFields, defineConfig, esbuildVersion, fetchModule, formatPostcssSourceMap, isCSSRequest, isFetchableDevEnvironment, isFileLoadingAllowed, isFileServingAllowed, isRunnableDevEnvironment, loadConfigFromFile, loadEnv, mergeAlias, mergeConfig, ssrTransform as moduleRunnerTransform, normalizePath, optimizeDeps, parseAst, parseAstAsync, perEnvironmentPlugin, perEnvironmentState, preprocessCSS, preview, resolveConfig, resolveEnvPrefix, rollupVersion, runnerImport, searchForWorkspaceRoot, send, sortUserPlugins, transformWithEsbuild, VERSION as version };