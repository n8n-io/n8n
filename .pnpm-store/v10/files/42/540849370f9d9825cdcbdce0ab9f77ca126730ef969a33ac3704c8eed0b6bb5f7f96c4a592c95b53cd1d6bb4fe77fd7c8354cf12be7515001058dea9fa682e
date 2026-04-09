export { parseAst, parseAstAsync } from 'rollup/parseAst';
import { a as arraify, i as isInNodeModules, D as DevEnvironment } from './chunks/dep-D4NMHUTW.js';
export { B as BuildEnvironment, f as build, m as buildErrorMessage, g as createBuilder, F as createFilter, h as createIdResolver, I as createLogger, n as createRunnableDevEnvironment, c as createServer, y as createServerHotChannel, w as createServerModuleRunner, x as createServerModuleRunnerTransport, d as defineConfig, v as fetchModule, j as formatPostcssSourceMap, L as isFileLoadingAllowed, K as isFileServingAllowed, q as isRunnableDevEnvironment, l as loadConfigFromFile, M as loadEnv, E as mergeAlias, C as mergeConfig, z as moduleRunnerTransform, A as normalizePath, o as optimizeDeps, p as perEnvironmentPlugin, b as perEnvironmentState, k as preprocessCSS, e as preview, r as resolveConfig, N as resolveEnvPrefix, G as rollupVersion, u as runnerImport, J as searchForWorkspaceRoot, H as send, s as sortUserPlugins, t as transformWithEsbuild } from './chunks/dep-D4NMHUTW.js';
export { defaultAllowedOrigins, DEFAULT_CLIENT_CONDITIONS as defaultClientConditions, DEFAULT_CLIENT_MAIN_FIELDS as defaultClientMainFields, DEFAULT_SERVER_CONDITIONS as defaultServerConditions, DEFAULT_SERVER_MAIN_FIELDS as defaultServerMainFields, VERSION as version } from './constants.js';
export { version as esbuildVersion } from 'esbuild';
import 'node:fs';
import 'node:path';
import 'node:fs/promises';
import 'node:url';
import 'node:util';
import 'node:perf_hooks';
import 'node:module';
import 'node:crypto';
import 'picomatch';
import 'path';
import 'fs';
import 'fdir';
import 'node:child_process';
import 'node:http';
import 'node:https';
import 'tty';
import 'util';
import 'net';
import 'events';
import 'url';
import 'http';
import 'stream';
import 'os';
import 'child_process';
import 'node:os';
import 'node:net';
import 'node:dns';
import 'vite/module-runner';
import 'node:buffer';
import 'module';
import 'node:readline';
import 'node:process';
import 'node:events';
import 'tinyglobby';
import 'crypto';
import 'node:assert';
import 'node:v8';
import 'node:worker_threads';
import 'https';
import 'tls';
import 'zlib';
import 'buffer';
import 'assert';
import 'node:querystring';
import 'node:zlib';

const CSS_LANGS_RE = (
  // eslint-disable-next-line regexp/no-unused-capturing-group
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/
);
const isCSSRequest = (request) => CSS_LANGS_RE.test(request);
class SplitVendorChunkCache {
  cache;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  reset() {
    this.cache = /* @__PURE__ */ new Map();
  }
}
function splitVendorChunk(options = {}) {
  const cache = options.cache ?? new SplitVendorChunkCache();
  return (id, { getModuleInfo }) => {
    if (isInNodeModules(id) && !isCSSRequest(id) && staticImportedByEntry(id, getModuleInfo, cache.cache)) {
      return "vendor";
    }
  };
}
function staticImportedByEntry(id, getModuleInfo, cache, importStack = []) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  if (importStack.includes(id)) {
    cache.set(id, false);
    return false;
  }
  const mod = getModuleInfo(id);
  if (!mod) {
    cache.set(id, false);
    return false;
  }
  if (mod.isEntry) {
    cache.set(id, true);
    return true;
  }
  const someImporterIs = mod.importers.some(
    (importer) => staticImportedByEntry(
      importer,
      getModuleInfo,
      cache,
      importStack.concat(id)
    )
  );
  cache.set(id, someImporterIs);
  return someImporterIs;
}
function splitVendorChunkPlugin() {
  const caches = [];
  function createSplitVendorChunk(output, config) {
    const cache = new SplitVendorChunkCache();
    caches.push(cache);
    const build = config.build ?? {};
    const format = output.format;
    if (!build.ssr && !build.lib && format !== "umd" && format !== "iife") {
      return splitVendorChunk({ cache });
    }
  }
  return {
    name: "vite:split-vendor-chunk",
    config(config) {
      let outputs = config.build?.rollupOptions?.output;
      if (outputs) {
        outputs = arraify(outputs);
        for (const output of outputs) {
          const viteManualChunks = createSplitVendorChunk(output, config);
          if (viteManualChunks) {
            if (output.manualChunks) {
              if (typeof output.manualChunks === "function") {
                const userManualChunks = output.manualChunks;
                output.manualChunks = (id, api) => {
                  return userManualChunks(id, api) ?? viteManualChunks(id, api);
                };
              } else {
                console.warn(
                  "(!) the `splitVendorChunk` plugin doesn't have any effect when using the object form of `build.rollupOptions.output.manualChunks`. Consider using the function form instead."
                );
              }
            } else {
              output.manualChunks = viteManualChunks;
            }
          }
        }
      } else {
        return {
          build: {
            rollupOptions: {
              output: {
                manualChunks: createSplitVendorChunk({}, config)
              }
            }
          }
        };
      }
    },
    buildStart() {
      caches.forEach((cache) => cache.reset());
    }
  };
}

function createFetchableDevEnvironment(name, config, context) {
  if (typeof Request === "undefined" || typeof Response === "undefined") {
    throw new TypeError(
      "FetchableDevEnvironment requires a global `Request` and `Response` object."
    );
  }
  if (!context.handleRequest) {
    throw new TypeError(
      "FetchableDevEnvironment requires a `handleRequest` method during initialisation."
    );
  }
  return new FetchableDevEnvironment(name, config, context);
}
function isFetchableDevEnvironment(environment) {
  return environment instanceof FetchableDevEnvironment;
}
class FetchableDevEnvironment extends DevEnvironment {
  _handleRequest;
  constructor(name, config, context) {
    super(name, config, context);
    this._handleRequest = context.handleRequest;
  }
  async dispatchFetch(request) {
    if (!(request instanceof Request)) {
      throw new TypeError(
        "FetchableDevEnvironment `dispatchFetch` must receive a `Request` object."
      );
    }
    const response = await this._handleRequest(request);
    if (!(response instanceof Response)) {
      throw new TypeError(
        "FetchableDevEnvironment `context.handleRequest` must return a `Response` object."
      );
    }
    return response;
  }
}

export { DevEnvironment, createFetchableDevEnvironment, isCSSRequest, isFetchableDevEnvironment, splitVendorChunk, splitVendorChunkPlugin };
