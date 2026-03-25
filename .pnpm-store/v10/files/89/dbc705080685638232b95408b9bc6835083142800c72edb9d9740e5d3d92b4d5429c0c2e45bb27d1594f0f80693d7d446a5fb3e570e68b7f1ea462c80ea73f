// src/webpack/context.ts
import { resolve } from "path";
import sources from "webpack-sources";
import { Parser } from "acorn";
function createContext(compilation) {
  return {
    parse(code, opts = {}) {
      return Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile(id) {
      (compilation.fileDependencies ?? compilation.compilationDependencies).add(
        resolve(process.cwd(), id)
      );
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          sources ? new sources.RawSource(
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer.from(emittedFile.source)
          ) : {
            source: () => emittedFile.source,
            size: () => emittedFile.source.length
          }
        );
      }
    },
    getWatchFiles() {
      return Array.from(
        compilation.fileDependencies ?? compilation.compilationDependencies
      );
    }
  };
}

// src/utils.ts
import { isAbsolute, normalize } from "path";
function normalizeAbsolutePath(path) {
  if (isAbsolute(path))
    return normalize(path);
  else
    return path;
}

// src/webpack/loaders/load.ts
async function load(source, map) {
  const callback = this.async();
  const { unpluginName } = this.query;
  const plugin = this._compiler?.$unpluginContext[unpluginName];
  let id = this.resource;
  if (!plugin?.load || !id)
    return callback(null, source, map);
  const context = {
    error: (error) => this.emitError(typeof error === "string" ? new Error(error) : error),
    warn: (error) => this.emitWarning(typeof error === "string" ? new Error(error) : error)
  };
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
  const res = await plugin.load.call(
    Object.assign(this._compilation && createContext(this._compilation), context),
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
