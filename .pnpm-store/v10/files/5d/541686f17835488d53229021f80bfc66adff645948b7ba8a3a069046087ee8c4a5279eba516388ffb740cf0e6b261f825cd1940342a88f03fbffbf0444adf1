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

// src/rspack/loaders/transform.ts
async function transform(source, map) {
  var _a;
  const callback = this.async();
  let unpluginName;
  if (typeof this.query === "string") {
    const query = new URLSearchParams(this.query);
    unpluginName = query.get("unpluginName");
  } else {
    unpluginName = this.query.unpluginName;
  }
  const id = this.resource;
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  if (!(plugin == null ? void 0 : plugin.transform))
    return callback(null, source, map);
  const context = createContext(this);
  const res = await plugin.transform.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(this._compiler, this._compilation, this),
      context
    ),
    source,
    id
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, map == null ? map : res.map || map);
  else callback(null, res, map);
}
export {
  transform as default
};
