import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { quansync } from 'quansync/macro';
import { LOCKS, AGENTS } from './constants.mjs';

const isFile = quansync({
  sync: (path2) => {
    try {
      return fs.statSync(path2).isFile();
    } catch {
      return false;
    }
  },
  async: async (path2) => {
    try {
      return (await fs.promises.stat(path2)).isFile();
    } catch {
      return false;
    }
  }
});
function getUserAgent() {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) {
    return null;
  }
  const name = userAgent.split("/")[0];
  return AGENTS.includes(name) ? name : null;
}
function* lookup(cwd = process.cwd()) {
  let directory = path.resolve(cwd);
  const { root } = path.parse(directory);
  while (directory && directory !== root) {
    yield directory;
    directory = path.dirname(directory);
  }
}
const parsePackageJson = quansync(function* (filepath, onUnknown) {
  return !filepath || !(yield isFile(filepath)) ? null : handlePackageManager(filepath, onUnknown);
});
const detect = quansync(function* (options = {}) {
  const { cwd, onUnknown } = options;
  for (const directory of lookup(cwd)) {
    for (const lock of Object.keys(LOCKS)) {
      if (yield isFile(path.join(directory, lock))) {
        const name = LOCKS[lock];
        const result2 = yield parsePackageJson(path.join(directory, "package.json"), onUnknown);
        if (result2)
          return result2;
        else
          return { name, agent: name };
      }
    }
    const result = yield parsePackageJson(path.join(directory, "package.json"), onUnknown);
    if (result)
      return result;
  }
  return null;
});
const detectSync = detect.sync;
function handlePackageManager(filepath, onUnknown) {
  try {
    const pkg = JSON.parse(fs.readFileSync(filepath, "utf8"));
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
      } else if (AGENTS.includes(name)) {
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

export { detect, detectSync, getUserAgent };
