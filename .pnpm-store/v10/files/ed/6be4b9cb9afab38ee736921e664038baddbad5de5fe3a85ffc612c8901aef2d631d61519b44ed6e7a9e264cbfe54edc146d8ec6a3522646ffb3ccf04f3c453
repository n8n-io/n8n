'use strict';

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const macro = require('quansync/macro');
const constants = require('./constants.cjs');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const fs__default = /*#__PURE__*/_interopDefaultCompat(fs);
const path__default = /*#__PURE__*/_interopDefaultCompat(path);
const process__default = /*#__PURE__*/_interopDefaultCompat(process);

const isFile = macro.quansync({
  sync: (path2) => {
    try {
      return fs__default.statSync(path2).isFile();
    } catch {
      return false;
    }
  },
  async: async (path2) => {
    try {
      return (await fs__default.promises.stat(path2)).isFile();
    } catch {
      return false;
    }
  }
});
function getUserAgent() {
  const userAgent = process__default.env.npm_config_user_agent;
  if (!userAgent) {
    return null;
  }
  const name = userAgent.split("/")[0];
  return constants.AGENTS.includes(name) ? name : null;
}
function* lookup(cwd = process__default.cwd()) {
  let directory = path__default.resolve(cwd);
  const { root } = path__default.parse(directory);
  while (directory && directory !== root) {
    yield directory;
    directory = path__default.dirname(directory);
  }
}
const parsePackageJson = macro.quansync(function* (filepath, onUnknown) {
  return !filepath || !(yield isFile(filepath)) ? null : handlePackageManager(filepath, onUnknown);
});
const detect = macro.quansync(function* (options = {}) {
  const { cwd, onUnknown } = options;
  for (const directory of lookup(cwd)) {
    for (const lock of Object.keys(constants.LOCKS)) {
      if (yield isFile(path__default.join(directory, lock))) {
        const name = constants.LOCKS[lock];
        const result2 = yield parsePackageJson(path__default.join(directory, "package.json"), onUnknown);
        if (result2)
          return result2;
        else
          return { name, agent: name };
      }
    }
    const result = yield parsePackageJson(path__default.join(directory, "package.json"), onUnknown);
    if (result)
      return result;
  }
  return null;
});
const detectSync = detect.sync;
function handlePackageManager(filepath, onUnknown) {
  try {
    const pkg = JSON.parse(fs__default.readFileSync(filepath, "utf8"));
    let agent;
    if (typeof pkg.packageManager === "string") {
      const [name, ver] = pkg.packageManager.replace(/^\^/, "").split("@");
      let version = ver;
      if (name === "yarn" && Number.parseInt(ver) > 1) {
        agent = "yarn@berry";
        version = "berry";
        return { name, agent, version };
      } else if (name === "pnpm" && Number.parseInt(ver) < 7) {
        agent = "pnpm@6";
        return { name, agent, version };
      } else if (constants.AGENTS.includes(name)) {
        agent = name;
        return { name, agent, version };
      } else {
        return onUnknown?.(pkg.packageManager) ?? null;
      }
    }
  } catch {
  }
  return null;
}

exports.detect = detect;
exports.detectSync = detectSync;
exports.getUserAgent = getUserAgent;
