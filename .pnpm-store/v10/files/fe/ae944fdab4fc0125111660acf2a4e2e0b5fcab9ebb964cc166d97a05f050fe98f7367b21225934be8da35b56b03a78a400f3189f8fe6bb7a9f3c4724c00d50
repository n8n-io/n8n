import CJS_COMPAT_NODE_URL_bmuif0mzgy8 from 'node:url';
import CJS_COMPAT_NODE_PATH_bmuif0mzgy8 from 'node:path';
import CJS_COMPAT_NODE_MODULE_bmuif0mzgy8 from "node:module";

var __filename = CJS_COMPAT_NODE_URL_bmuif0mzgy8.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_bmuif0mzgy8.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_bmuif0mzgy8.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// src/index.ts
import { fileURLToPath } from "node:url";
import { createUnplugin } from "unplugin";

// src/constants.ts
var STORIES_REGEX = /(?<!node_modules.*)\.(story|stories)\.[tj]sx?$/;

// src/rollup-based-plugin.ts
import { readFile } from "node:fs/promises";
import { enrichCsf, formatCsf, loadCsf } from "storybook/internal/csf-tools";
import { logger } from "storybook/internal/node-logger";
function rollupBasedPlugin(options) {
  return {
    name: "plugin-csf",
    async transform(code, id) {
      if (!STORIES_REGEX.test(id))
        return;
      let sourceCode = await readFile(id, "utf-8");
      try {
        let makeTitle = (userTitle) => userTitle || "default", csf = loadCsf(code, { makeTitle }).parse(), csfSource = loadCsf(sourceCode, {
          makeTitle
        }).parse();
        await enrichCsf(csf, csfSource, options);
        let inputSourceMap = this.getCombinedSourcemap();
        return formatCsf(csf, { sourceMaps: !0, inputSourceMap }, code);
      } catch (err) {
        return err.message?.startsWith("CSF:") || logger.warn(err.message), code;
      }
    }
  };
}

// src/index.ts
var unpluginFactory = (options) => ({
  name: "unplugin-csf",
  rollup: {
    ...rollupBasedPlugin(options)
  },
  vite: {
    enforce: "pre",
    ...rollupBasedPlugin(options)
  },
  webpack(compiler) {
    compiler.options.module.rules.unshift({
      test: STORIES_REGEX,
      enforce: "post",
      use: {
        options,
        loader: fileURLToPath(import.meta.resolve("@storybook/csf-plugin/webpack-loader"))
      }
    });
  },
  rspack(compiler) {
    compiler.options.module.rules.unshift({
      test: STORIES_REGEX,
      enforce: "post",
      use: {
        options,
        loader: fileURLToPath(import.meta.resolve("@storybook/csf-plugin/webpack-loader"))
      }
    });
  }
}), unplugin = createUnplugin(unpluginFactory), { esbuild } = unplugin, { webpack } = unplugin, { rollup } = unplugin, { vite } = unplugin;
export {
  esbuild,
  rollup,
  unplugin,
  unpluginFactory,
  vite,
  webpack
};
