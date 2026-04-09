var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/utils.ts
import { isAbsolute, normalize } from "path";
function normalizeAbsolutePath(path) {
  if (isAbsolute(path))
    return normalize(path);
  else
    return path;
}
function resolveQuery(query) {
  if (typeof query === "string") {
    return new URLSearchParams(query).get("unpluginName");
  } else {
    return query.unpluginName;
  }
}

// src/webpack/context.ts
import { Buffer as Buffer2 } from "buffer";
import { createRequire } from "module";
import { resolve } from "path";
import process from "process";
import { Parser } from "acorn";
function getSource(fileSource) {
  const webpackRequire = createRequire(__require.resolve("webpack"));
  const RawSource = webpackRequire("webpack-sources").RawSource;
  return new RawSource(
    typeof fileSource === "string" ? fileSource : Buffer2.from(fileSource.buffer).toString("utf-8")
  );
}
function createBuildContext(options, compiler, compilation, loaderContext) {
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
      options.addWatchFile(resolve(process.cwd(), id));
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        if (!compilation)
          throw new Error("unplugin/webpack: emitFile outside supported hooks  (buildStart, buildEnd, load, transform, watchChange)");
        compilation.emitAsset(
          outFileName,
          getSource(emittedFile.source)
        );
      }
    },
    getWatchFiles() {
      return options.getWatchFiles();
    },
    getNativeBuildContext() {
      return { framework: "webpack", compiler, compilation, loaderContext };
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

// src/webpack/loaders/load.ts
async function load(source, map) {
  var _a;
  const callback = this.async();
  const unpluginName = resolveQuery(this.query);
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  let id = this.resource;
  if (!(plugin == null ? void 0 : plugin.load) || !id)
    return callback(null, source, map);
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
  const context = createContext(this);
  const res = await plugin.load.call(
    Object.assign({}, createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file);
      },
      getWatchFiles: () => {
        return this.getDependencies();
      }
    }, this._compiler, this._compilation, this), context),
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
