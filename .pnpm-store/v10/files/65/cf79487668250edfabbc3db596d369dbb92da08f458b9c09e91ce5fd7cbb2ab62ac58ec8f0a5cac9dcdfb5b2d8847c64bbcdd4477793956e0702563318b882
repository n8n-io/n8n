"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_node_path2 = __toESM(require("path"), 1);
var import_pluginutils = require("@rollup/pluginutils");
var import_core = require("@swc/core");

// node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs
function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
var defu = createDefu();
var defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});
var defuArrayFn = createDefu((object, key, currentValue) => {
  if (Array.isArray(object[key]) && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

// src/index.ts
var import_load_tsconfig = require("load-tsconfig");
var import_unplugin = require("unplugin");

// src/resolve.ts
var import_node_fs2 = __toESM(require("fs"), 1);
var import_node_path = __toESM(require("path"), 1);

// node_modules/.pnpm/path-exists@5.0.0/node_modules/path-exists/index.js
var import_node_fs = __toESM(require("fs"), 1);
async function pathExists(path3) {
  try {
    await import_node_fs.promises.access(path3);
    return true;
  } catch {
    return false;
  }
}

// src/resolve.ts
var RESOLVE_EXTENSIONS = [".tsx", ".ts", ".mts", ".jsx", ".js", ".mjs", ".cjs"];
async function resolveFile(resolved, index = false) {
  for (const ext of RESOLVE_EXTENSIONS) {
    const file = index ? import_node_path.default.join(resolved, `index${ext}`) : `${resolved}${ext}`;
    if (await pathExists(file))
      return file;
  }
}
async function resolveId(importee, importer) {
  if (importer && importee[0] === ".") {
    const absolutePath = import_node_path.default.resolve(
      // eslint-disable-next-line node/prefer-global/process
      importer ? import_node_path.default.dirname(importer) : process.cwd(),
      importee
    );
    let resolved = await resolveFile(absolutePath);
    if (!resolved && await pathExists(absolutePath) && await import_node_fs2.default.promises.stat(absolutePath).then((stat) => stat.isDirectory())) {
      resolved = await resolveFile(absolutePath, true);
    }
    return resolved;
  }
}

// src/index.ts
var index_default = (0, import_unplugin.createUnplugin)(
  ({ tsconfigFile, minify, include, exclude, ...options } = {}) => {
    const filter = (0, import_pluginutils.createFilter)(
      include || /\.m?[jt]sx?$/,
      exclude || /node_modules/
    );
    return {
      name: "swc",
      resolveId,
      async transform(code, id) {
        if (!filter(id))
          return null;
        const compilerOptions = tsconfigFile === false ? {} : (0, import_load_tsconfig.loadTsConfig)(
          import_node_path2.default.dirname(id),
          tsconfigFile === true ? void 0 : tsconfigFile
        )?.data?.compilerOptions || {};
        const isTs = /\.m?tsx?$/.test(id);
        let jsc = {
          parser: {
            syntax: isTs ? "typescript" : "ecmascript"
          },
          transform: {}
        };
        if (compilerOptions.jsx) {
          if (jsc.parser.syntax === "typescript") {
            jsc.parser.tsx = true;
          } else {
            jsc.parser.jsx = true;
          }
          Object.assign(jsc.transform, {
            react: {
              pragma: compilerOptions.jsxFactory,
              pragmaFrag: compilerOptions.jsxFragmentFactory,
              importSource: compilerOptions.jsxImportSource
            }
          });
        }
        if (compilerOptions.experimentalDecorators) {
          jsc.keepClassNames = true;
          jsc.parser.decorators = true;
          Object.assign(jsc.transform, {
            legacyDecorator: true,
            decoratorMetadata: compilerOptions.emitDecoratorMetadata
          });
        }
        if (compilerOptions.target) {
          jsc.target = compilerOptions.target;
        }
        if (compilerOptions.useDefineForClassFields != null) {
          jsc.transform.useDefineForClassFields = compilerOptions.useDefineForClassFields;
        }
        if (options.jsc) {
          jsc = defu(options.jsc, jsc);
        }
        const result = await (0, import_core.transform)(code, {
          filename: id,
          sourceMaps: true,
          ...options,
          jsc
        });
        return {
          code: result.code,
          map: result.map && JSON.parse(result.map)
        };
      },
      vite: {
        config() {
          return {
            esbuild: false
          };
        }
      },
      rollup: {
        async renderChunk(code, chunk) {
          if (minify) {
            const result = await (0, import_core.transform)(code, {
              sourceMaps: true,
              minify: true,
              filename: chunk.fileName
            });
            return {
              code: result.code,
              map: result.map
            };
          }
          return null;
        }
      }
    };
  }
);
//# sourceMappingURL=index.cjs.map