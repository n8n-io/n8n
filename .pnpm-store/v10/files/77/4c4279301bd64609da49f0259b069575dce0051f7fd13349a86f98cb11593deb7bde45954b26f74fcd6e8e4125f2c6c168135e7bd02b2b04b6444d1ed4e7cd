// src/utils.ts
import { isAbsolute, normalize } from "path";
function normalizeAbsolutePath(path) {
  if (isAbsolute(path))
    return normalize(path);
  else
    return path;
}

// src/rspack/context.ts
import { Buffer } from "buffer";
import { resolve } from "path";
import { Parser } from "acorn";
function createBuildContext(compiler, compilation, loaderContext) {
  return {
    getNativeBuildContext() {
      return {
        framework: "rspack",
        compiler,
        compilation,
        loaderContext
      };
    },
    addWatchFile(file) {
      compilation.fileDependencies.add(resolve(process.cwd(), file));
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies);
    },
    parse(code, opts = {}) {
      return Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        const { sources } = compilation.compiler.webpack;
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer.from(emittedFile.source)
          )
        );
      }
    }
  };
}
function createContext(loader) {
  return {
    error: (error) => loader.emitError(normalizeMessage(error)),
    warn: (message) => loader.emitWarning(normalizeMessage(message))
  };
}
function normalizeMessage(error) {
  const err = new Error(typeof error === "string" ? error : error.message);
  if (typeof error === "object") {
    err.stack = error.stack;
    err.cause = error.meta;
  }
  return err;
}

// src/rspack/utils.ts
import { basename, dirname, resolve as resolve2 } from "path";
function decodeVirtualModuleId(encoded, _plugin) {
  return decodeURIComponent(basename(encoded));
}
function isVirtualModuleId(encoded, plugin) {
  return dirname(encoded) === plugin.__virtualModulePrefix;
}

// src/rspack/loaders/load.ts
async function load(source, map) {
  var _a;
  const callback = this.async();
  const { unpluginName } = this.query;
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  let id = this.resource;
  if (!(plugin == null ? void 0 : plugin.load) || !id)
    return callback(null, source, map);
  if (isVirtualModuleId(id, plugin))
    id = decodeVirtualModuleId(id, plugin);
  const context = createContext(this);
  const res = await plugin.load.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(this._compiler, this._compilation, this),
      context
    ),
    normalizeAbsolutePath(id)
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, res.map ?? map);
  else
    callback(null, res, map);
}
export {
  load as default
};
