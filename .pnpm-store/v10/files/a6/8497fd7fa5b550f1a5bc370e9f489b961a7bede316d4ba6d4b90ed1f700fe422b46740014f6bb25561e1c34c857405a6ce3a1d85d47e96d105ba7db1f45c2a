import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  glob
} from "../../_node-chunks/chunk-GSQVC33F.js";
import {
  slash
} from "../../_node-chunks/chunk-PF7HEE6F.js";
import "../../_node-chunks/chunk-DRM3MJ7Y.js";

// src/core-server/utils/remove-mdx-entries.ts
import { isAbsolute, join, relative } from "node:path";
import { commonGlobOptions, normalizeStories } from "storybook/internal/common";
async function removeMDXEntries(entries, options) {
  let list = normalizeStories(entries, {
    configDir: options.configDir,
    workingDir: options.configDir,
    defaultFilesPattern: "**/*.@(stories.@(js|jsx|mjs|ts|tsx))"
  });
  return (await Promise.all(
    list.map(async ({ directory, files, titlePrefix }) => {
      let pattern = join(directory, files), absolutePattern = isAbsolute(pattern) ? pattern : join(options.configDir, pattern), absoluteDirectory = isAbsolute(directory) ? directory : join(options.configDir, directory);
      return {
        files: (await glob(slash(absolutePattern), {
          ...commonGlobOptions(absolutePattern),
          follow: !0
        })).map((f) => relative(absoluteDirectory, f)),
        directory,
        titlePrefix
      };
    })
  )).flatMap(({ directory, files, titlePrefix }, i) => {
    let filteredEntries = files.filter((s) => !s.endsWith(".mdx")), items = [];
    return filteredEntries.length < files.length ? items = filteredEntries.map((k) => ({
      directory,
      titlePrefix,
      files: `**/${k}`
    })) : items = [
      { directory: list[i].directory, titlePrefix: list[i].titlePrefix, files: list[i].files }
    ], items;
  });
}

// src/core-server/presets/common-override-preset.ts
var framework = async (config) => {
  let name = typeof config == "string" ? config : config?.name, options = typeof config == "string" ? {} : config?.options || {};
  return {
    name,
    options
  };
}, stories = async (entries, options) => options?.build?.test?.disableMDXEntries ? removeMDXEntries(entries, options) : entries, typescript = async (input, options) => options?.build?.test?.disableDocgen ? { ...input ?? {}, reactDocgen: !1, check: !1 } : input, createTestBuildFeatures = (value) => ({
  disableBlocks: value,
  disabledAddons: value ? ["@storybook/addon-docs", "@storybook/addon-essentials/docs", "@storybook/addon-coverage"] : [],
  disableMDXEntries: value,
  disableAutoDocs: value,
  disableDocgen: value,
  disableSourcemaps: value,
  disableTreeShaking: value,
  esbuildMinify: value
}), build = async (value, options) => ({
  ...value,
  test: options.test ? {
    ...createTestBuildFeatures(!!options.test),
    ...value?.test
  } : createTestBuildFeatures(!1)
});
export {
  build,
  framework,
  stories,
  typescript
};
