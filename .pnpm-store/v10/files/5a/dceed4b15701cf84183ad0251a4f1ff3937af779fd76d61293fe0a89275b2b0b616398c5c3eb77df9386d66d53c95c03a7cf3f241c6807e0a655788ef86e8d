import CJS_COMPAT_NODE_URL_dtl570gwrw from 'node:url';
import CJS_COMPAT_NODE_PATH_dtl570gwrw from 'node:path';
import CJS_COMPAT_NODE_MODULE_dtl570gwrw from "node:module";

var __filename = CJS_COMPAT_NODE_URL_dtl570gwrw.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_dtl570gwrw.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_dtl570gwrw.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
));

// src/preset.ts
import { findConfigFile } from "storybook/internal/common";

// src/plugins/storybook-config-plugin.ts
import { isPreservingSymlinks } from "storybook/internal/common";
function storybookConfigPlugin(options) {
  return [
    {
      name: "storybook:config-plugin",
      enforce: "pre",
      async config(config) {
        let { defaultClientConditions = [] } = await import("vite"), existingEnvPrefix = config.envPrefix, mergedEnvPrefix = existingEnvPrefix ? Array.from(
          /* @__PURE__ */ new Set([
            ...Array.isArray(existingEnvPrefix) ? existingEnvPrefix : [existingEnvPrefix],
            "STORYBOOK_"
          ])
        ) : ["VITE_", "STORYBOOK_"];
        return {
          resolve: {
            conditions: ["storybook", "stories", "test", ...defaultClientConditions],
            preserveSymlinks: isPreservingSymlinks()
          },
          envPrefix: mergedEnvPrefix
        };
      }
    },
    {
      name: "storybook:allow-storybook-dir",
      enforce: "post",
      config(config) {
        config?.server?.fs?.allow && config.server.fs.allow.push(options.configDir);
      }
    }
  ];
}

// src/plugins/storybook-optimize-deps-plugin.ts
import { loadPreviewOrConfigFile } from "storybook/internal/common";
import { babelParser, extractMockCalls, findMockRedirect } from "storybook/internal/mocking-utils";

// ../../../node_modules/pathe/dist/shared/pathe.ff20891b.mjs
var _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  return input && input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
var _UNC_REGEX = /^[/\\]{2}/, _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/, _DRIVE_LETTER_RE = /^[A-Za-z]:$/, _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
var normalize = function(path2) {
  if (path2.length === 0)
    return ".";
  path2 = normalizeWindowsPath(path2);
  let isUNCPath = path2.match(_UNC_REGEX), isPathAbsolute = isAbsolute(path2), trailingSeparator = path2[path2.length - 1] === "/";
  return path2 = normalizeString(path2, !isPathAbsolute), path2.length === 0 ? isPathAbsolute ? "/" : trailingSeparator ? "./" : "." : (trailingSeparator && (path2 += "/"), _DRIVE_LETTER_RE.test(path2) && (path2 += "/"), isUNCPath ? isPathAbsolute ? `//${path2}` : `//./${path2}` : isPathAbsolute && !isAbsolute(path2) ? `/${path2}` : path2);
}, join = function(...arguments_) {
  if (arguments_.length === 0)
    return ".";
  let joined;
  for (let argument of arguments_)
    argument && argument.length > 0 && (joined === void 0 ? joined = argument : joined += `/${argument}`);
  return joined === void 0 ? "." : normalize(joined.replace(/\/\/+/g, "/"));
};
function cwd() {
  return typeof process < "u" && typeof process.cwd == "function" ? process.cwd().replace(/\\/g, "/") : "/";
}
var resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "", resolvedAbsolute = !1;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    let path2 = index >= 0 ? arguments_[index] : cwd();
    !path2 || path2.length === 0 || (resolvedPath = `${path2}/${resolvedPath}`, resolvedAbsolute = isAbsolute(path2));
  }
  return resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute), resolvedAbsolute && !isAbsolute(resolvedPath) ? `/${resolvedPath}` : resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path2, allowAboveRoot) {
  let res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, char = null;
  for (let index = 0; index <= path2.length; ++index) {
    if (index < path2.length)
      char = path2[index];
    else {
      if (char === "/")
        break;
      char = "/";
    }
    if (char === "/") {
      if (!(lastSlash === index - 1 || dots === 1)) if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            let lastSlashIndex = res.lastIndexOf("/");
            lastSlashIndex === -1 ? (res = "", lastSegmentLength = 0) : (res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/")), lastSlash = index, dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "", lastSegmentLength = 0, lastSlash = index, dots = 0;
            continue;
          }
        }
        allowAboveRoot && (res += res.length > 0 ? "/.." : "..", lastSegmentLength = 2);
      } else
        res.length > 0 ? res += `/${path2.slice(lastSlash + 1, index)}` : res = path2.slice(lastSlash + 1, index), lastSegmentLength = index - lastSlash - 1;
      lastSlash = index, dots = 0;
    } else char === "." && dots !== -1 ? ++dots : dots = -1;
  }
  return res;
}
var isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
var relative = function(from, to) {
  let _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/"), _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0])
    return _to.join("/");
  let _fromCopy = [..._from];
  for (let segment of _fromCopy) {
    if (_to[0] !== segment)
      break;
    _from.shift(), _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};

// src/utils/process-preview-annotation.ts
function processPreviewAnnotation(path2, projectRoot) {
  return typeof path2 == "object" ? path2.bare != null && path2.absolute === "" ? path2.bare : normalize(path2.absolute) : isAbsolute(path2) ? normalize(path2) : normalize(resolve(projectRoot, path2));
}

// src/utils/unique-import-paths.ts
function getUniqueImportPaths(index) {
  return [...new Set(Object.values(index.entries).map((entry) => entry.importPath))];
}

// src/plugins/storybook-optimize-deps-plugin.ts
function escapeGlobPath(filePath) {
  return filePath.replace(/[()[\]{}!*?|+@]/g, "\\$&");
}
function getMockRedirectIncludeEntries(mockCalls) {
  return Array.from(
    new Set(
      mockCalls.map((mockCall) => mockCall.redirectPath).filter((redirectPath) => redirectPath !== null).map(escapeGlobPath)
    )
  );
}
function storybookOptimizeDepsPlugin(options) {
  return {
    name: "storybook:optimize-deps-plugin",
    async config(config, { command }) {
      if (command !== "serve")
        return;
      let projectRoot = resolve(options.configDir, ".."), [extraOptimizeDeps, storyIndexGenerator, previewAnnotations] = await Promise.all([
        options.presets.apply("optimizeViteDeps", []),
        options.presets.apply("storyIndexGenerator"),
        options.presets.apply("previewAnnotations", [], options)
      ]), index = await storyIndexGenerator.getIndex(), previewOrConfigFile = loadPreviewOrConfigFile({ configDir: options.configDir }), mockRedirectIncludeEntries = previewOrConfigFile ? getMockRedirectIncludeEntries(
        extractMockCalls(
          {
            previewConfigPath: previewOrConfigFile,
            coreOptions: { disableTelemetry: !0 },
            configDir: options.configDir
          },
          babelParser,
          projectRoot,
          findMockRedirect
        )
      ) : [], previewAnnotationEntries = [...previewAnnotations, previewOrConfigFile].filter((path2) => path2 !== void 0).map((path2) => processPreviewAnnotation(path2, projectRoot));
      return {
        optimizeDeps: {
          // Story files + preview annotation files as entry points for the dep optimizer.
          // Vite will crawl these to discover all transitive CJS dependencies that need
          // pre-bundling, removing the need for a hard-coded include list.
          // Paths are escaped so that special glob characters (e.g. parentheses in Next.js route
          // group directories) are treated as literal characters, not glob syntax.
          entries: [
            ...typeof config.optimizeDeps?.entries == "string" ? [config.optimizeDeps.entries] : config.optimizeDeps?.entries ?? [],
            ...mockRedirectIncludeEntries,
            ...getUniqueImportPaths(index).map(escapeGlobPath),
            ...previewAnnotationEntries.map(escapeGlobPath)
          ],
          // Extra deps explicitly included by Storybook presets (e.g. framework-specific packages).
          include: [...extraOptimizeDeps, ...config.optimizeDeps?.include ?? []]
        }
      };
    }
  };
}

// src/codegen-project-annotations.ts
import { getFrameworkName, loadPreviewOrConfigFile as loadPreviewOrConfigFile2 } from "storybook/internal/common";
import { isCsfFactoryPreview, readConfig } from "storybook/internal/csf-tools";

// ../../../node_modules/knitwork/dist/index.mjs
function genString(input, options = {}) {
  let str = JSON.stringify(input);
  return options.singleQuotes ? `'${escapeString(str).slice(1, -1)}'` : str;
}
var NEEDS_ESCAPE_RE = /[\n\r'\\\u2028\u2029]/, QUOTE_NEWLINE_RE = /([\n\r'\u2028\u2029])/g, BACKSLASH_RE = /\\/g;
function escapeString(id) {
  return NEEDS_ESCAPE_RE.test(id) ? id.replace(BACKSLASH_RE, "\\\\").replace(QUOTE_NEWLINE_RE, "\\$1") : id;
}
function genSafeVariableName(name) {
  return reservedNames.has(name) ? `_${name}` : name.replace(/^\d/, (r) => `_${r}`).replace(/\W/g, (r) => "_" + r.charCodeAt(0));
}
var reservedNames = /* @__PURE__ */ new Set([
  "Infinity",
  "NaN",
  "arguments",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield"
]), VALID_IDENTIFIER_RE = /^[$_]?([A-Z_a-z]\w*|\d)$/;
function _genStatement(type, specifier, names, options = {}) {
  let specifierString = genString(specifier, options);
  if (!names)
    return `${type} ${specifierString};`;
  let nameArray = Array.isArray(names), namesString = (nameArray ? names : [names]).map((index) => typeof index == "string" ? { name: index } : (index.name === index.as && (index = { name: index.name }), index)).map((index) => index.as ? `${index.name} as ${index.as}` : index.name).join(", ");
  return nameArray ? `${type} { ${namesString} } from ${genString(
    specifier,
    options
  )}${_genImportAttributes(type, options)};` : `${type} ${namesString} from ${genString(
    specifier,
    options
  )}${_genImportAttributes(type, options)};`;
}
function _genImportAttributes(type, options) {
  return type === "import type" || type === "export type" ? "" : typeof options.attributes?.type == "string" ? ` with { type: ${genString(options.attributes.type)} }` : typeof options.assert?.type == "string" ? ` assert { type: ${genString(options.assert.type)} }` : "";
}
function genImport(specifier, imports, options = {}) {
  return _genStatement("import", specifier, imports, options);
}
function genDynamicImport(specifier, options = {}) {
  let commentString = options.comment ? ` /* ${options.comment} */` : "", wrapperString = options.wrapper === !1 ? "" : "() => ", interopString = options.interopDefault ? ".then(m => m.default || m)" : "", optionsString = _genDynamicImportAttributes(options);
  return `${wrapperString}import(${genString(
    specifier,
    options
  )}${commentString}${optionsString})${interopString}`;
}
function _genDynamicImportAttributes(options = {}) {
  return typeof options.assert?.type == "string" ? `, { assert: { type: ${genString(options.assert.type)} } }` : typeof options.attributes?.type == "string" ? `, { with: { type: ${genString(options.attributes.type)} } }` : "";
}
function wrapInDelimiters(lines, indent = "", delimiters = "{}", withComma = !0) {
  if (lines.length === 0)
    return delimiters;
  let [start, end] = delimiters;
  return `${start}
` + lines.join(withComma ? `,
` : `
`) + `
${indent}${end}`;
}
function genObjectKey(key) {
  return VALID_IDENTIFIER_RE.test(key) ? key : genString(key);
}
function genObjectFromRaw(object, indent = "", options = {}) {
  return genObjectFromRawEntries(Object.entries(object), indent, options);
}
function genArrayFromRaw(array, indent = "", options = {}) {
  let newIdent = indent + "  ";
  return wrapInDelimiters(
    array.map((index) => `${newIdent}${genRawValue(index, newIdent, options)}`),
    indent,
    "[]"
  );
}
function genObjectFromRawEntries(array, indent = "", options = {}) {
  let newIdent = indent + "  ";
  return wrapInDelimiters(
    array.map(
      ([key, value]) => `${newIdent}${genObjectKey(key)}: ${genRawValue(value, newIdent, options)}`
    ),
    indent,
    "{}"
  );
}
function genRawValue(value, indent = "", options = {}) {
  return value === void 0 ? "undefined" : value === null ? "null" : Array.isArray(value) ? genArrayFromRaw(value, indent, options) : value && typeof value == "object" ? genObjectFromRaw(value, indent, options) : options.preserveTypes && typeof value != "function" ? JSON.stringify(value) : value.toString();
}

// ../../../node_modules/pathe/dist/utils.mjs
var normalizedAliasSymbol = Symbol.for("pathe:normalizedAlias");
var FILENAME_RE = /(^|[/\\])([^/\\]+?)(?=(\.[^.]+)?$)/;
function filename(path2) {
  return path2.match(FILENAME_RE)?.[2];
}

// src/codegen-project-annotations.ts
import { dedent } from "ts-dedent";
async function generateProjectAnnotationsCode(options, projectRoot) {
  let { presets, configDir } = options, frameworkName = await getFrameworkName(options), previewOrConfigFile = loadPreviewOrConfigFile2({ configDir }), previewConfig = previewOrConfigFile ? await readConfig(previewOrConfigFile) : void 0, isCsf4 = previewConfig ? isCsfFactoryPreview(previewConfig) : !1, previewAnnotations = await presets.apply(
    "previewAnnotations",
    [],
    options
  );
  return generateProjectAnnotationsCodeFromPreviews({
    previewAnnotations: [...previewAnnotations, previewOrConfigFile],
    projectRoot,
    frameworkName,
    isCsf4
  });
}
function generateProjectAnnotationsCodeFromPreviews(options) {
  let { projectRoot } = options, previewAnnotationURLs = options.previewAnnotations.filter((path2) => path2 !== void 0).map((path2) => processPreviewAnnotation(path2, projectRoot)), variables = [], imports = [];
  for (let previewAnnotation of previewAnnotationURLs) {
    let variable = genSafeVariableName(filename(previewAnnotation)).replace(/_(45|46|47)/g, "_") + "_" + hash(previewAnnotation);
    variables.push(variable), imports.push(genImport(previewAnnotation, { name: "*", as: variable }));
  }
  let previewFileURL = previewAnnotationURLs[previewAnnotationURLs.length - 1], previewFileVariable = variables[variables.length - 1], previewFileImport = imports[imports.length - 1];
  return options.isCsf4 ? dedent`
      ${previewFileImport}

      export function getProjectAnnotations(hmrPreviewAnnotationModules = []) {
        const preview = hmrPreviewAnnotationModules[0] ?? ${previewFileVariable};
        return preview.default.composed;
      }

      if (import.meta.hot) {
        import.meta.hot.accept([${JSON.stringify(previewFileURL)}], (previewAnnotationModules) => {
          // getProjectAnnotations has changed so we need to patch the new one in
          window?.__STORYBOOK_PREVIEW__?.onGetProjectAnnotationsChanged({
            getProjectAnnotations: () => getProjectAnnotations(previewAnnotationModules),
          });
        });
      }
    `.trim() : dedent`
    import { composeConfigs } from 'storybook/preview-api';

    ${imports.join(`
`)}

    export function getProjectAnnotations(hmrPreviewAnnotationModules = []) {
      const configs = ${genArrayFromRaw(
    variables.map(
      (previewAnnotation, index) => (
        // Prefer the updated module from an HMR update, otherwise the original module
        `hmrPreviewAnnotationModules[${index}] ?? ${previewAnnotation}`
      )
    ),
    "  "
  )};
      return composeConfigs(configs);
    }

    if (import.meta.hot) {
      import.meta.hot.accept(${JSON.stringify(previewAnnotationURLs)}, (previewAnnotationModules) => {
        // getProjectAnnotations has changed so we need to patch the new one in
        window?.__STORYBOOK_PREVIEW__?.onGetProjectAnnotationsChanged({
          getProjectAnnotations: () => getProjectAnnotations(previewAnnotationModules),
        });
      });
    }
  `.trim();
}
function hash(value) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

// src/virtual-file-names.ts
var SB_VIRTUAL_FILES = {
  VIRTUAL_APP_FILE: "virtual:/@storybook/builder-vite/vite-app.js",
  VIRTUAL_STORIES_FILE: "virtual:/@storybook/builder-vite/storybook-stories.js",
  VIRTUAL_ADDON_SETUP_FILE: "virtual:/@storybook/builder-vite/setup-addons.js"
}, SB_VIRTUAL_FILE_IDS = Object.values(SB_VIRTUAL_FILES);
function getResolvedVirtualModuleId(virtualModuleId) {
  return `\0${virtualModuleId}`;
}
function getOriginalVirtualModuleId(resolvedVirtualModuleId) {
  return resolvedVirtualModuleId.slice(1);
}

// src/plugins/storybook-project-annotations-plugin.ts
var VIRTUAL_ID = "virtual:/@storybook/builder-vite/project-annotations.js", RESOLVED_VIRTUAL_ID = getResolvedVirtualModuleId(VIRTUAL_ID);
function storybookProjectAnnotationsPlugin(options) {
  let projectRoot;
  return {
    name: "storybook:project-annotations-plugin",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(source) {
      if (source === VIRTUAL_ID)
        return RESOLVED_VIRTUAL_ID;
    },
    async load(id) {
      if (id === RESOLVED_VIRTUAL_ID)
        return generateProjectAnnotationsCode(options, projectRoot);
    }
  };
}

// src/envs.ts
import { stringifyEnvs } from "storybook/internal/common";
var allowedEnvVariables = [
  "STORYBOOK",
  // Vite `import.meta.env` default variables
  // @see https://github.com/vitejs/vite/blob/6b8d94dca2a1a8b4952e3e3fcd0aed1aedb94215/packages/vite/types/importMeta.d.ts#L68-L75
  "BASE_URL",
  "MODE",
  "DEV",
  "PROD",
  "SSR"
];
function stringifyProcessEnvs(raw, envPrefix) {
  let updatedRaw = {}, envs = Object.entries(raw).reduce((acc, [key, value]) => ((allowedEnvVariables.includes(key) || Array.isArray(envPrefix) && envPrefix.find((prefix) => key.startsWith(prefix)) || typeof envPrefix == "string" && key.startsWith(envPrefix)) && (acc[`import.meta.env.${key}`] = JSON.stringify(value), updatedRaw[key] = value), acc), {});
  return envs["import.meta.env"] = JSON.stringify(stringifyEnvs(updatedRaw)), envs;
}

// src/plugins/storybook-runtime-plugin.ts
async function storybookSanitizeEnvs(options) {
  let plugins = [], envs = await options.presets.apply("env");
  return envs && Object.keys(envs).length > 0 && plugins.push({
    name: "storybook:env-plugin",
    config(config) {
      return {
        define: stringifyProcessEnvs(envs, config.envPrefix)
      };
    }
  }), plugins;
}

// src/plugins/vite-inject-mocker/plugin.ts
import { fileURLToPath } from "node:url";
var ENTRY_PATH = "/vite-inject-mocker-entry.js", viteInjectMockerRuntime = (options) => {
  let mockerRuntimePath = fileURLToPath(
    import.meta.resolve("storybook/internal/mocking-utils/mocker-runtime")
  ), viteConfig;
  return {
    name: "vite:storybook-inject-mocker-runtime",
    enforce: "pre",
    buildStart() {
      viteConfig.command === "build" && this.emitFile({
        type: "chunk",
        id: mockerRuntimePath,
        fileName: ENTRY_PATH.slice(1)
      });
    },
    configResolved(config) {
      viteConfig = config;
    },
    configureServer(server) {
      options.previewConfigPath && server.watcher.on("change", (file) => {
        file === options.previewConfigPath && server.ws.send({
          type: "custom",
          event: "invalidate-mocker"
        });
      });
    },
    resolveId(source) {
      if (source === ENTRY_PATH)
        return mockerRuntimePath;
    },
    transformIndexHtml(html) {
      let headTag = html.match(/<head[^>]*>/);
      if (headTag) {
        let entryCode = `<script type="module" src="${viteConfig.command === "build" ? `.${ENTRY_PATH}` : ENTRY_PATH}"></script>`, headTagIndex = html.indexOf(headTag[0]);
        return html.slice(0, headTagIndex + headTag[0].length) + entryCode + html.slice(headTagIndex + headTag[0].length);
      }
    }
  };
};

// src/plugins/vite-mock/plugin.ts
import { readFileSync } from "node:fs";
import {
  babelParser as babelParser2,
  extractMockCalls as extractMockCalls2,
  findMockRedirect as findMockRedirect2,
  getAutomockCode,
  getRealPath,
  rewriteSbMockImportCalls
} from "storybook/internal/mocking-utils";
import { logger } from "storybook/internal/node-logger";

// src/plugins/vite-mock/utils.ts
function getCleanId(id) {
  return id.replace(/^.*\/deps\//, "").replace(/\.js.*$/, "").replace(/_/g, "/");
}
function invalidateAllRelatedModules(server, absPath, pkgName) {
  for (let mod of server.moduleGraph.idToModuleMap.values())
    (mod.id === absPath || mod.id && getCleanId(mod.id) === pkgName) && server.moduleGraph.invalidateModule(mod);
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
        mockCalls = extractMockCalls2(options, babelParser2, viteConfig.root, findMockRedirect2);
      },
      configureServer(server) {
        async function invalidateAffectedFiles(file) {
          if (file === options.previewConfigPath || file.includes("__mocks__")) {
            let oldMockCalls = mockCalls;
            mockCalls = extractMockCalls2(options, babelParser2, viteConfig.root, findMockRedirect2);
            let previewMod = server.moduleGraph.getModuleById(options.previewConfigPath);
            previewMod && server.moduleGraph.invalidateModule(previewMod);
            for (let call of mockCalls)
              invalidateAllRelatedModules(server, call.absolutePath, call.path);
            let newAbsPaths = new Set(mockCalls.map((c) => c.absolutePath));
            for (let oldCall of oldMockCalls)
              newAbsPaths.has(oldCall.absolutePath) || invalidateAllRelatedModules(server, oldCall.absolutePath, oldCall.path);
            return server.ws.send({ type: "full-reload" }), [];
          }
        }
        server.watcher.on("change", invalidateAffectedFiles), server.watcher.on("add", invalidateAffectedFiles), server.watcher.on("unlink", invalidateAffectedFiles);
      },
      load: {
        order: "pre",
        handler(id) {
          let preserveSymlinks = viteConfig.resolve.preserveSymlinks, idNorm = getRealPath(id, preserveSymlinks), cleanId = getCleanId(idNorm);
          for (let call of mockCalls)
            if (!(getRealPath(call.absolutePath, preserveSymlinks) !== idNorm && call.path !== cleanId) && call.redirectPath)
              return this.addWatchFile(call.redirectPath), readFileSync(call.redirectPath, "utf-8");
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
                let automockedCode = getAutomockCode(code, call.spy, babelParser2);
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
var optimizeViteDeps = ["storybook/internal/preview/runtime"];
async function viteCorePlugins(_, options) {
  let previewConfigPath = findConfigFile("preview", options.configDir);
  return [
    storybookProjectAnnotationsPlugin(options),
    ...storybookConfigPlugin({ configDir: options.configDir }),
    storybookOptimizeDepsPlugin(options),
    ...await storybookSanitizeEnvs(options),
    ...previewConfigPath ? [
      viteInjectMockerRuntime({ previewConfigPath }),
      viteMockPlugin({
        previewConfigPath,
        coreOptions: await options.presets.apply("core"),
        configDir: options.configDir
      })
    ] : []
  ];
}

export {
  __commonJS,
  __toESM,
  normalize,
  join,
  relative,
  getUniqueImportPaths,
  genDynamicImport,
  genObjectFromRawEntries,
  SB_VIRTUAL_FILES,
  SB_VIRTUAL_FILE_IDS,
  getResolvedVirtualModuleId,
  getOriginalVirtualModuleId,
  VIRTUAL_ID,
  optimizeViteDeps,
  viteCorePlugins
};
