import CJS_COMPAT_NODE_URL_78w93im8273 from 'node:url';
import CJS_COMPAT_NODE_PATH_78w93im8273 from 'node:path';
import CJS_COMPAT_NODE_MODULE_78w93im8273 from "node:module";

var __filename = CJS_COMPAT_NODE_URL_78w93im8273.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_78w93im8273.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_78w93im8273.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  normalize
} from "./_node-chunks/chunk-WP3VXGU4.js";

// src/preset.ts
import { findConfigFile } from "storybook/internal/common";

// src/plugins/vite-inject-mocker/plugin.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePackageDir } from "storybook/internal/common";

// ../../node_modules/@rolldown/pluginutils/dist/index.js
function exactRegex(str, flags) {
  return new RegExp(`^${escapeRegex(str)}$`, flags);
}
var escapeRegexRE = /[-/\\^$*+?.()|[\]{}]/g;
function escapeRegex(str) {
  return str.replace(escapeRegexRE, "\\$&");
}

// src/plugins/vite-inject-mocker/plugin.ts
import { dedent } from "ts-dedent";
var entryPath = "/vite-inject-mocker-entry.js", entryCode = dedent`
    <script type="module" src=".${entryPath}"></script>
  `, server, viteInjectMockerRuntime = (options) => {
  let viteConfig;
  return {
    name: "vite:storybook-inject-mocker-runtime",
    buildStart() {
      viteConfig.command === "build" && this.emitFile({
        type: "chunk",
        id: join(
          resolvePackageDir("storybook"),
          "assets",
          "server",
          "mocker-runtime.template.js"
        ),
        fileName: entryPath.slice(1)
      });
    },
    config() {
      return {
        optimizeDeps: {
          include: ["@vitest/mocker", "@vitest/mocker/browser"]
        },
        resolve: {
          // Aliasing necessary for package managers like pnpm, since resolving modules from a virtual module
          // leads to errors, if the imported module is not a dependency of the project.
          // By resolving the module to the real path, we can avoid this issue.
          alias: {
            "@vitest/mocker/browser": fileURLToPath(import.meta.resolve("@vitest/mocker/browser")),
            "@vitest/mocker": fileURLToPath(import.meta.resolve("@vitest/mocker"))
          }
        }
      };
    },
    configResolved(config) {
      viteConfig = config;
    },
    configureServer(server_) {
      server = server_, options.previewConfigPath && server.watcher.on("change", (file) => {
        file === options.previewConfigPath && server.ws.send({
          type: "custom",
          event: "invalidate-mocker"
        });
      });
    },
    resolveId: {
      filter: {
        id: [exactRegex(entryPath)]
      },
      handler(id) {
        return exactRegex(id).test(entryPath) ? id : null;
      }
    },
    async load(id) {
      return exactRegex(id).test(entryPath) ? readFileSync(
        join(resolvePackageDir("storybook"), "assets", "server", "mocker-runtime.template.js"),
        "utf-8"
      ) : null;
    },
    transformIndexHtml(html) {
      let headTag = html.match(/<head[^>]*>/);
      if (headTag) {
        let headTagIndex = html.indexOf(headTag[0]);
        return html.slice(0, headTagIndex + headTag[0].length) + entryCode + html.slice(headTagIndex + headTag[0].length);
      }
    }
  };
};

// src/plugins/vite-mock/plugin.ts
import { readFileSync as readFileSync2 } from "node:fs";
import {
  babelParser,
  extractMockCalls,
  getAutomockCode,
  getRealPath,
  rewriteSbMockImportCalls
} from "storybook/internal/mocking-utils";
import { logger } from "storybook/internal/node-logger";
import { findMockRedirect } from "@vitest/mocker/redirect";

// src/plugins/vite-mock/utils.ts
function getCleanId(id) {
  return id.replace(/^.*\/deps\//, "").replace(/\.js.*$/, "").replace(/_/g, "/");
}
function invalidateAllRelatedModules(server2, absPath, pkgName) {
  for (let mod of server2.moduleGraph.idToModuleMap.values())
    (mod.id === absPath || mod.id && getCleanId(mod.id) === pkgName) && server2.moduleGraph.invalidateModule(mod);
}

// src/plugins/vite-mock/plugin.ts
function viteMockPlugin(options) {
  let viteConfig, mockCalls = [], normalizedPreviewConfigPath = normalize(options.previewConfigPath);
  return [
    {
      name: "storybook:mock-loader",
      configResolved(config) {
        viteConfig = config;
      },
      buildStart() {
        mockCalls = extractMockCalls(options, babelParser, viteConfig.root, findMockRedirect);
      },
      configureServer(server2) {
        async function invalidateAffectedFiles(file) {
          if (file === options.previewConfigPath || file.includes("__mocks__")) {
            let oldMockCalls = mockCalls;
            mockCalls = extractMockCalls(options, babelParser, viteConfig.root, findMockRedirect);
            let previewMod = server2.moduleGraph.getModuleById(options.previewConfigPath);
            previewMod && server2.moduleGraph.invalidateModule(previewMod);
            for (let call of mockCalls)
              invalidateAllRelatedModules(server2, call.absolutePath, call.path);
            let newAbsPaths = new Set(mockCalls.map((c) => c.absolutePath));
            for (let oldCall of oldMockCalls)
              newAbsPaths.has(oldCall.absolutePath) || invalidateAllRelatedModules(server2, oldCall.absolutePath, oldCall.path);
            return server2.ws.send({ type: "full-reload" }), [];
          }
        }
        server2.watcher.on("change", invalidateAffectedFiles), server2.watcher.on("add", invalidateAffectedFiles), server2.watcher.on("unlink", invalidateAffectedFiles);
      },
      load: {
        order: "pre",
        handler(id) {
          let preserveSymlinks = viteConfig.resolve.preserveSymlinks, idNorm = getRealPath(id, preserveSymlinks), cleanId = getCleanId(idNorm);
          for (let call of mockCalls)
            if (!(getRealPath(call.absolutePath, preserveSymlinks) !== idNorm && call.path !== cleanId) && call.redirectPath)
              return this.addWatchFile(call.redirectPath), readFileSync2(call.redirectPath, "utf-8");
          return null;
        }
      },
      transform: {
        order: "pre",
        handler(code, id) {
          for (let call of mockCalls) {
            let preserveSymlinks = viteConfig.resolve.preserveSymlinks, idNorm = getRealPath(id, preserveSymlinks), callNorm = getRealPath(call.absolutePath, preserveSymlinks);
            if (viteConfig.command !== "serve") {
              if (callNorm !== idNorm)
                continue;
            } else {
              let cleanId = getCleanId(idNorm);
              if (call.path !== cleanId && callNorm !== idNorm)
                continue;
            }
            try {
              if (!call.redirectPath) {
                let automockedCode = getAutomockCode(code, call.spy, babelParser);
                return {
                  code: automockedCode.toString(),
                  map: automockedCode.generateMap()
                };
              }
            } catch (e) {
              return logger.error(`Error automocking ${id}: ${e}`), null;
            }
          }
          return null;
        }
      }
    },
    {
      name: "storybook:mock-loader-preview",
      transform(code, id) {
        if (id === normalizedPreviewConfigPath)
          try {
            return rewriteSbMockImportCalls(code);
          } catch (e) {
            return logger.debug(`Could not transform sb.mock(import(...)) calls in ${id}: ${e}`), null;
          }
        return null;
      }
    }
  ];
}

// src/preset.ts
async function viteFinal(existing, options) {
  let previewConfigPath = findConfigFile("preview", options.configDir);
  if (!previewConfigPath)
    return existing;
  let coreOptions = await options.presets.apply("core");
  return {
    ...existing,
    plugins: [
      ...existing.plugins ?? [],
      ...previewConfigPath ? [
        viteInjectMockerRuntime({ previewConfigPath }),
        viteMockPlugin({ previewConfigPath, coreOptions, configDir: options.configDir })
      ] : []
    ]
  };
}
export {
  viteFinal
};
