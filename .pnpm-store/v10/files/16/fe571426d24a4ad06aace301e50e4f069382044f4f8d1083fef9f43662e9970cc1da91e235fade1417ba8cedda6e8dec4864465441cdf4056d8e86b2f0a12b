import CJS_COMPAT_NODE_URL_hatgpp8tjl from 'node:url';
import CJS_COMPAT_NODE_PATH_hatgpp8tjl from 'node:path';
import CJS_COMPAT_NODE_MODULE_hatgpp8tjl from "node:module";

var __filename = CJS_COMPAT_NODE_URL_hatgpp8tjl.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_hatgpp8tjl.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_hatgpp8tjl.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  templateCompilation
} from "./_node-chunks/chunk-HR5NLOWU.js";

// src/plugins/vue-component-meta.ts
import { readFile, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import { getProjectRoot } from "storybook/internal/common";
import MagicString from "magic-string";
import {
  TypeMeta,
  createChecker,
  createCheckerByJson
} from "vue-component-meta";
import { parseMulti } from "vue-docgen-api";
async function vueComponentMeta(tsconfigPath = "tsconfig.json") {
  let { createFilter } = await import("vite"), filter = createFilter(/\.(vue|ts|js|tsx|jsx)$/, /\.stories\.(ts|tsx|js|jsx)$|^\0\/virtual:|^\/virtual:|\.storybook\/.*\.(ts|js)$/), checker = await createVueComponentMetaChecker(tsconfigPath);
  return {
    name: "storybook:vue-component-meta-plugin",
    async transform(src, id) {
      if (filter(id))
        try {
          let exportNames = checker.getExportNames(id), componentsMeta = exportNames.map((name) => checker.getComponentMeta(id, name));
          componentsMeta = await applyTempFixForEventDescriptions(id, componentsMeta);
          let metaSources = [];
          if (componentsMeta.forEach((meta, index) => {
            if (!meta.props.length && !meta.events.length && !meta.slots.length && !meta.exposed.length || meta.type === TypeMeta.Unknown)
              return;
            let exportName = exportNames[index];
            ["props", "events", "slots", "exposed"].forEach((key) => {
              meta[key].forEach((value) => {
                Array.isArray(value.schema) ? value.schema.forEach((eventSchema) => removeNestedSchemas(eventSchema)) : removeNestedSchemas(value.schema);
              });
            });
            let exposed = (
              // the meta also includes duplicated entries in the "exposed" array with "on"
              // prefix (e.g. onClick instead of click), so we need to filter them out here
              meta.exposed.filter((expose) => {
                let nameWithoutOnPrefix = expose.name;
                return nameWithoutOnPrefix.startsWith("on") && (nameWithoutOnPrefix = lowercaseFirstLetter(expose.name.replace("on", ""))), !meta.events.find((event) => event.name === nameWithoutOnPrefix);
              }).filter((expose) => expose.name === "$slots" ? !meta.slots.map((slot) => slot.name).every((slotName) => expose.type.includes(slotName)) : !0)
            );
            metaSources.push({
              exportName,
              displayName: exportName === "default" ? getFilenameWithoutExtension(id) : exportName,
              ...meta,
              exposed,
              sourceFiles: id
            });
          }), metaSources.length === 0)
            return;
          let s = new MagicString(src);
          return metaSources.forEach((meta) => {
            let isDefaultExport = meta.exportName === "default", name = isDefaultExport ? "_sfc_main" : meta.exportName;
            new RegExp(`export {.*${name}.*}`).test(src) || new RegExp(`export \\* from ['"]\\S*${name}['"]`).test(src) || // when using re-exports, some exports might be resolved via checker.getExportNames
            // but are not directly exported inside the current file so we need to ignore them too
            !src.includes(name) || (!id.endsWith(".vue") && isDefaultExport && (s.replace("export default ", "const _sfc_main = "), s.append(`
export default _sfc_main;`)), s.append(`
;${name}.__docgenInfo = ${JSON.stringify(meta)}`));
          }), {
            code: s.toString(),
            map: s.generateMap({ hires: !0, source: id })
          };
        } catch {
          return;
        }
    },
    // handle hot updates to update the component meta on file changes
    async handleHotUpdate({ file, read, server, modules, timestamp }) {
      let content = await read();
      checker.updateFile(file, content);
      let invalidatedModules = /* @__PURE__ */ new Set();
      for (let mod of modules)
        server.moduleGraph.invalidateModule(mod, invalidatedModules, timestamp, !0);
      return server.ws.send({ type: "full-reload" }), [];
    }
  };
}
async function createVueComponentMetaChecker(tsconfigPath = "tsconfig.json") {
  let checkerOptions = {
    forceUseTs: !0,
    noDeclarations: !0,
    printer: { newLine: 1 }
  }, projectRoot = getProjectRoot(), projectTsConfigPath = join(projectRoot, tsconfigPath), defaultChecker = createCheckerByJson(projectRoot, { include: ["**/*"] }, checkerOptions);
  return await fileExists(projectTsConfigPath) ? (await getTsConfigReferences(projectTsConfigPath)).length > 0 ? defaultChecker : createChecker(projectTsConfigPath, checkerOptions) : defaultChecker;
}
function getFilenameWithoutExtension(filename) {
  return parse(filename).name;
}
function lowercaseFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}
async function fileExists(fullPath) {
  try {
    return await stat(fullPath), !0;
  } catch {
    return !1;
  }
}
async function applyTempFixForEventDescriptions(filename, componentMeta) {
  if (!componentMeta.some((meta) => meta.events.length))
    return componentMeta;
  try {
    let parsedComponentDocs = await parseMulti(filename);
    componentMeta.map((meta, index) => {
      let eventsWithDescription = parsedComponentDocs[index].events;
      return !meta.events.length || !eventsWithDescription?.length || (meta.events = meta.events.map((event) => {
        let description = eventsWithDescription.find((i) => i.name === event.name)?.description;
        return description && (event.description = description), event;
      })), meta;
    });
  } catch {
  }
  return componentMeta;
}
async function getTsConfigReferences(tsConfigPath) {
  try {
    let content = JSON.parse(await readFile(tsConfigPath, "utf-8"));
    return !("references" in content) || !Array.isArray(content.references) ? [] : content.references;
  } catch {
    return [];
  }
}
function removeNestedSchemas(schema) {
  if (typeof schema == "object") {
    if (schema.kind === "enum") {
      schema.schema?.forEach((enumSchema) => removeNestedSchemas(enumSchema));
      return;
    }
    delete schema.schema;
  }
}

// src/plugins/vue-docgen.ts
import MagicString2 from "magic-string";
import { parse as parse2 } from "vue-docgen-api";
async function vueDocgen() {
  let { createFilter } = await import("vite"), filter = createFilter(/\.(vue)$/);
  return {
    name: "storybook:vue-docgen-plugin",
    async transform(src, id) {
      if (!filter(id))
        return;
      let metaData = await parse2(id), s = new MagicString2(src);
      return s.append(`;_sfc_main.__docgenInfo = ${JSON.stringify(metaData)}`), {
        code: s.toString(),
        map: s.generateMap({ hires: !0, source: id })
      };
    }
  };
}

// src/preset.ts
var core = {
  builder: import.meta.resolve("@storybook/builder-vite"),
  renderer: import.meta.resolve("@storybook/vue3/preset")
}, viteFinal = async (config, options) => {
  let plugins = [await templateCompilation()], framework = await options.presets.apply("framework"), frameworkOptions = typeof framework == "string" ? {} : framework.options ?? {}, docgen = resolveDocgenOptions(frameworkOptions.docgen);
  docgen !== !1 && (docgen.plugin === "vue-component-meta" ? plugins.push(await vueComponentMeta(docgen.tsconfig)) : plugins.push(await vueDocgen()));
  let { mergeConfig } = await import("vite");
  return mergeConfig(config, {
    plugins
  });
}, resolveDocgenOptions = (docgen) => docgen === !1 ? !1 : docgen === void 0 || docgen === !0 ? { plugin: "vue-docgen-api" } : typeof docgen == "string" ? { plugin: docgen } : docgen;
export {
  core,
  viteFinal
};
