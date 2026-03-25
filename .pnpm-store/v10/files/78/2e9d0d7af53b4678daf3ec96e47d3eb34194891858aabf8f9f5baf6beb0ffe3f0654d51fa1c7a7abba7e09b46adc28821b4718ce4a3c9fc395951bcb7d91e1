import { sentryUnpluginFactory, createRollupReleaseInjectionHooks, createComponentNameAnnotateHooks, createRollupDebugIdInjectionHooks, createRollupModuleMetadataInjectionHooks, createRollupDebugIdUploadHooks, createRollupBundleSizeOptimizationHooks } from '@sentry/bundler-plugin-core';
export { sentryCliBinaryExists } from '@sentry/bundler-plugin-core';

function viteReleaseInjectionPlugin(injectionCode) {
  return {
    name: "sentry-vite-release-injection-plugin",
    // run `post` to avoid tripping up @rollup/plugin-commonjs when cjs is used
    // as we inject an `import` statement
    enforce: "post",
    // need this so that vite runs the resolveId hook
    vite: createRollupReleaseInjectionHooks(injectionCode)
  };
}
function viteComponentNameAnnotatePlugin(ignoredComponents) {
  return {
    name: "sentry-vite-component-name-annotate-plugin",
    enforce: "pre",
    vite: createComponentNameAnnotateHooks(ignoredComponents)
  };
}
function viteDebugIdInjectionPlugin() {
  return {
    name: "sentry-vite-debug-id-injection-plugin",
    vite: createRollupDebugIdInjectionHooks()
  };
}
function viteModuleMetadataInjectionPlugin(injectionCode) {
  return {
    name: "sentry-vite-module-metadata-injection-plugin",
    vite: createRollupModuleMetadataInjectionHooks(injectionCode)
  };
}
function viteDebugIdUploadPlugin(upload, logger, createDependencyOnBuildArtifacts) {
  return {
    name: "sentry-vite-debug-id-upload-plugin",
    vite: createRollupDebugIdUploadHooks(upload, logger, createDependencyOnBuildArtifacts)
  };
}
function viteBundleSizeOptimizationsPlugin(replacementValues) {
  return {
    name: "sentry-vite-bundle-size-optimizations-plugin",
    vite: createRollupBundleSizeOptimizationHooks(replacementValues)
  };
}
var sentryUnplugin = sentryUnpluginFactory({
  releaseInjectionPlugin: viteReleaseInjectionPlugin,
  componentNameAnnotatePlugin: viteComponentNameAnnotatePlugin,
  debugIdInjectionPlugin: viteDebugIdInjectionPlugin,
  moduleMetadataInjectionPlugin: viteModuleMetadataInjectionPlugin,
  debugIdUploadPlugin: viteDebugIdUploadPlugin,
  bundleSizeOptimizationsPlugin: viteBundleSizeOptimizationsPlugin
});
var sentryVitePlugin = sentryUnplugin.vite;

export { sentryVitePlugin };
//# sourceMappingURL=index.mjs.map
