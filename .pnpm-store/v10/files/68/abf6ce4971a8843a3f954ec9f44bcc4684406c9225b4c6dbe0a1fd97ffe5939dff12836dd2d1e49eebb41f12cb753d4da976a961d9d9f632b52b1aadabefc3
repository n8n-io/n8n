'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var bundlerPluginCore = require('@sentry/bundler-plugin-core');

function viteReleaseInjectionPlugin(injectionCode) {
  return {
    name: "sentry-vite-release-injection-plugin",
    // run `post` to avoid tripping up @rollup/plugin-commonjs when cjs is used
    // as we inject an `import` statement
    enforce: "post",
    // need this so that vite runs the resolveId hook
    vite: bundlerPluginCore.createRollupReleaseInjectionHooks(injectionCode)
  };
}
function viteComponentNameAnnotatePlugin(ignoredComponents) {
  return {
    name: "sentry-vite-component-name-annotate-plugin",
    enforce: "pre",
    vite: bundlerPluginCore.createComponentNameAnnotateHooks(ignoredComponents)
  };
}
function viteDebugIdInjectionPlugin() {
  return {
    name: "sentry-vite-debug-id-injection-plugin",
    vite: bundlerPluginCore.createRollupDebugIdInjectionHooks()
  };
}
function viteModuleMetadataInjectionPlugin(injectionCode) {
  return {
    name: "sentry-vite-module-metadata-injection-plugin",
    vite: bundlerPluginCore.createRollupModuleMetadataInjectionHooks(injectionCode)
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
var sentryUnplugin = bundlerPluginCore.sentryUnpluginFactory({
  releaseInjectionPlugin: viteReleaseInjectionPlugin,
  componentNameAnnotatePlugin: viteComponentNameAnnotatePlugin,
  debugIdInjectionPlugin: viteDebugIdInjectionPlugin,
  moduleMetadataInjectionPlugin: viteModuleMetadataInjectionPlugin,
  debugIdUploadPlugin: viteDebugIdUploadPlugin,
  bundleSizeOptimizationsPlugin: viteBundleSizeOptimizationsPlugin
});
var sentryVitePlugin = sentryUnplugin.vite;

Object.defineProperty(exports, 'sentryCliBinaryExists', {
  enumerable: true,
  get: function () { return bundlerPluginCore.sentryCliBinaryExists; }
});
exports.sentryVitePlugin = sentryVitePlugin;
//# sourceMappingURL=index.js.map
