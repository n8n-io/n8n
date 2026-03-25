'use strict';

const mlly = require('mlly');
const loader = require('./shared/c12.24612422.cjs');
const pathe = require('pathe');
const promises = require('node:fs/promises');
const node_path = require('node:path');
require('node:fs');
require('node:os');
require('jiti');
require('rc9');
require('defu');
require('ohash');
require('pkg-types');
require('dotenv');

const UPDATABLE_EXTS = [".js", ".ts", ".mjs", ".cjs", ".mts", ".cts"];
async function updateConfig(opts) {
  const { parseModule } = await import('magicast');
  let configFile = await _tryResolve(
    `./${opts.configFile}`,
    opts.cwd,
    loader.SUPPORTED_EXTENSIONS
  ) || await _tryResolve(
    `./.config/${opts.configFile}`,
    opts.cwd,
    loader.SUPPORTED_EXTENSIONS
  );
  let created = false;
  if (!configFile) {
    configFile = pathe.join(
      opts.cwd,
      opts.configFile + (opts.createExtension || ".ts")
    );
    const createResult = await opts.onCreate?.({ configFile }) ?? true;
    if (!createResult) {
      throw new Error("Config file creation aborted.");
    }
    const content = typeof createResult === "string" ? createResult : `export default {}
`;
    await promises.mkdir(node_path.dirname(configFile), { recursive: true });
    await promises.writeFile(configFile, content, "utf8");
    created = true;
  }
  const ext = node_path.extname(configFile);
  if (!UPDATABLE_EXTS.includes(ext)) {
    throw new Error(
      `Unsupported config file extension: ${ext} (${configFile}) (supported: ${UPDATABLE_EXTS.join(", ")})`
    );
  }
  const contents = await promises.readFile(configFile, "utf8");
  const _module = parseModule(contents, opts.magicast);
  const defaultExport = _module.exports.default;
  if (!defaultExport) {
    throw new Error("Default export is missing in the config file!");
  }
  const configObj = defaultExport.$type === "function-call" ? defaultExport.$args[0] : defaultExport;
  await opts.onUpdate?.(configObj);
  await promises.writeFile(configFile, _module.generate().code);
  return {
    configFile,
    created
  };
}
function _tryResolve(path, cwd, exts) {
  return mlly.resolvePath(path, {
    url: pathe.join(cwd, "_index.js"),
    extensions: exts
  }).catch(() => void 0);
}

exports.updateConfig = updateConfig;
