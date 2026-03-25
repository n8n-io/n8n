'use strict';

const loader = require('./shared/c12.24612422.cjs');
const perfectDebounce = require('perfect-debounce');
const pathe = require('pathe');
const ohash = require('ohash');
require('node:fs');
require('node:fs/promises');
require('node:os');
require('jiti');
require('rc9');
require('defu');
require('pkg-types');
require('dotenv');

function createDefineConfig() {
  return (input) => input;
}

const eventMap = {
  add: "created",
  change: "updated",
  unlink: "removed"
};
async function watchConfig(options) {
  let config = await loader.loadConfig(options);
  const configName = options.name || "config";
  const configFileName = options.configFile ?? (options.name === "config" ? "config" : `${options.name}.config`);
  const watchingFiles = [
    ...new Set(
      (config.layers || []).filter((l) => l.cwd).flatMap((l) => [
        ...loader.SUPPORTED_EXTENSIONS.flatMap((ext) => [
          pathe.resolve(l.cwd, configFileName + ext),
          pathe.resolve(l.cwd, ".config", configFileName + ext),
          pathe.resolve(
            l.cwd,
            ".config",
            configFileName.replace(/\.config$/, "") + ext
          )
        ]),
        l.source && pathe.resolve(l.cwd, l.source),
        // TODO: Support watching rc from home and workspace
        options.rcFile && pathe.resolve(
          l.cwd,
          typeof options.rcFile === "string" ? options.rcFile : `.${configName}rc`
        ),
        options.packageJson && pathe.resolve(l.cwd, "package.json")
      ]).filter(Boolean)
    )
  ];
  const watch = await import('chokidar').then((r) => r.watch || r.default || r);
  const _fswatcher = watch(watchingFiles, {
    ignoreInitial: true,
    ...options.chokidarOptions
  });
  const onChange = async (event, path) => {
    const type = eventMap[event];
    if (!type) {
      return;
    }
    if (options.onWatch) {
      await options.onWatch({
        type,
        path
      });
    }
    const oldConfig = config;
    const newConfig = await loader.loadConfig(options);
    config = newConfig;
    const changeCtx = {
      newConfig,
      oldConfig,
      getDiff: () => ohash.diff(oldConfig.config, config.config)
    };
    if (options.acceptHMR) {
      const changeHandled = await options.acceptHMR(changeCtx);
      if (changeHandled) {
        return;
      }
    }
    if (options.onUpdate) {
      await options.onUpdate(changeCtx);
    }
  };
  if (options.debounce === false) {
    _fswatcher.on("all", onChange);
  } else {
    _fswatcher.on("all", perfectDebounce.debounce(onChange, options.debounce ?? 100));
  }
  const utils = {
    watchingFiles,
    unwatch: async () => {
      await _fswatcher.close();
    }
  };
  return new Proxy(utils, {
    get(_, prop) {
      if (prop in utils) {
        return utils[prop];
      }
      return config[prop];
    }
  });
}

exports.SUPPORTED_EXTENSIONS = loader.SUPPORTED_EXTENSIONS;
exports.loadConfig = loader.loadConfig;
exports.loadDotenv = loader.loadDotenv;
exports.setupDotenv = loader.setupDotenv;
exports.createDefineConfig = createDefineConfig;
exports.watchConfig = watchConfig;
