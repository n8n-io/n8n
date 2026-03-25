// src/rspack/context.ts
import { Buffer } from "buffer";
import sources from "webpack-sources";
import { Parser } from "acorn";
function createBuildContext(compilation) {
  return {
    parse(code, opts = {}) {
      return Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile() {
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            // @ts-expect-error types mismatch
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer.from(emittedFile.source)
          )
        );
      }
    },
    getWatchFiles() {
      return [];
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
      this._compilation && createBuildContext(this._compilation),
      context
    ),
    source,
    id
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, map == null ? map : res.map || map);
  else
    callback(null, res, map);
}
export {
  transform as default
};
