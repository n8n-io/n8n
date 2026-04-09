'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var bundlerPluginCore = require('@sentry/bundler-plugin-core');
var node_module = require('node:module');

function viteInjectionPlugin(injectionCode, debugIds) {
  return {
    name: "sentry-vite-injection-plugin",
    // run `post` to avoid tripping up @rollup/plugin-commonjs when cjs is used
    // as we inject an `import` statement
    enforce: "post",
    // need this so that vite runs the resolveId hook
    vite: bundlerPluginCore.createRollupInjectionHooks(injectionCode, debugIds)
  };
}
function viteComponentNameAnnotatePlugin(ignoredComponents, injectIntoHtml) {
  return {
    name: "sentry-vite-component-name-annotate-plugin",
    enforce: "pre",
    vite: bundlerPluginCore.createComponentNameAnnotateHooks(ignoredComponents, injectIntoHtml)
  };
}
function viteDebugIdUploadPlugin(upload, logger, createDependencyOnBuildArtifacts) {
  return {
    name: "sentry-vite-debug-id-upload-plugin",
    vite: bundlerPluginCore.createRollupDebugIdUploadHooks(upload, logger, createDependencyOnBuildArtifacts)
  };
}
function viteBundleSizeOptimizationsPlugin(replacementValues) {
  return {
    name: "sentry-vite-bundle-size-optimizations-plugin",
    vite: bundlerPluginCore.createRollupBundleSizeOptimizationHooks(replacementValues)
  };
}
function getViteMajorVersion() {
  try {
    var _vite$version;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Rollup already transpiles this for us
    var req = node_module.createRequire((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href)));
    var vite = req("vite");
    return (_vite$version = vite.version) === null || _vite$version === void 0 ? void 0 : _vite$version.split(".")[0];
  } catch (err) {
    // do nothing, we'll just not report a version
  }
  return undefined;
}
var sentryUnplugin = bundlerPluginCore.sentryUnpluginFactory({
  injectionPlugin: viteInjectionPlugin,
  componentNameAnnotatePlugin: viteComponentNameAnnotatePlugin,
  debugIdUploadPlugin: viteDebugIdUploadPlugin,
  bundleSizeOptimizationsPlugin: viteBundleSizeOptimizationsPlugin,
  getBundlerMajorVersion: getViteMajorVersion
});
var sentryVitePlugin = function sentryVitePlugin(options) {
  var result = sentryUnplugin.vite(options);
  // unplugin returns a single plugin instead of an array when only one plugin is created, so we normalize this here.
  return Array.isArray(result) ? result : [result];
};

Object.defineProperty(exports, 'sentryCliBinaryExists', {
  enumerable: true,
  get: function () { return bundlerPluginCore.sentryCliBinaryExists; }
});
exports.sentryVitePlugin = sentryVitePlugin;
//# sourceMappingURL=index.js.map
