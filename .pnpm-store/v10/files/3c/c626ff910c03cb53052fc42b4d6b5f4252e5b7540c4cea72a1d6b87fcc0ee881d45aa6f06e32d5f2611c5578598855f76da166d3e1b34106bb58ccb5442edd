// src/index.ts
import path2 from "path";
import { createFilter } from "@rollup/pluginutils";
import { transform } from "@swc/core";

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
import { loadTsConfig } from "load-tsconfig";
import { createUnplugin } from "unplugin";

// src/resolve.ts
import fs2 from "fs";
import path from "path";

// node_modules/.pnpm/path-exists@5.0.0/node_modules/path-exists/index.js
import fs, { promises as fsPromises } from "fs";
async function pathExists(path3) {
  try {
    await fsPromises.access(path3);
    return true;
  } catch {
    return false;
  }
}

// src/resolve.ts
var RESOLVE_EXTENSIONS = [".tsx", ".ts", ".mts", ".jsx", ".js", ".mjs", ".cjs"];
async function resolveFile(resolved, index = false) {
  for (const ext of RESOLVE_EXTENSIONS) {
    const file = index ? path.join(resolved, `index${ext}`) : `${resolved}${ext}`;
    if (await pathExists(file))
      return file;
  }
}
async function resolveId(importee, importer) {
  if (importer && importee[0] === ".") {
    const absolutePath = path.resolve(
      // eslint-disable-next-line node/prefer-global/process
      importer ? path.dirname(importer) : process.cwd(),
      importee
    );
    let resolved = await resolveFile(absolutePath);
    if (!resolved && await pathExists(absolutePath) && await fs2.promises.stat(absolutePath).then((stat) => stat.isDirectory())) {
      resolved = await resolveFile(absolutePath, true);
    }
    return resolved;
  }
}

// src/index.ts
var index_default = createUnplugin(
  ({ tsconfigFile, minify, include, exclude, ...options } = {}) => {
    const filter = createFilter(
      include || /\.m?[jt]sx?$/,
      exclude || /node_modules/
    );
    return {
      name: "swc",
      resolveId,
      async transform(code, id) {
        if (!filter(id))
          return null;
        const compilerOptions = tsconfigFile === false ? {} : loadTsConfig(
          path2.dirname(id),
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
        const result = await transform(code, {
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
            const result = await transform(code, {
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
export {
  index_default as default
};
//# sourceMappingURL=index.js.map