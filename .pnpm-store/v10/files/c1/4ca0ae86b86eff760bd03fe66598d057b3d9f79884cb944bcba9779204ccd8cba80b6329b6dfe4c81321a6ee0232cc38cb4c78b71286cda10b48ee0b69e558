import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { INSTALL_METADATA, LOCKS, AGENTS } from './constants.mjs';

async function pathExists(path2, type) {
  try {
    const stat = await fs.stat(path2);
    return type === "file" ? stat.isFile() : stat.isDirectory();
  } catch {
    return false;
  }
}
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
async function parsePackageJson(filepath, options) {
  if (!filepath || !await pathExists(filepath, "file"))
    return null;
  return await handlePackageManager(filepath, options);
}
async function detect(options = {}) {
  const {
    cwd,
    strategies = ["lockfile", "packageManager-field", "devEngines-field"]
  } = options;
  let stopDir;
  if (typeof options.stopDir === "string") {
    const resolved = path.resolve(options.stopDir);
    stopDir = (dir) => dir === resolved;
  } else {
    stopDir = options.stopDir;
  }
  for (const directory of lookup(cwd)) {
    for (const strategy of strategies) {
      switch (strategy) {
        case "lockfile": {
          for (const lock of Object.keys(LOCKS)) {
            if (await pathExists(path.join(directory, lock), "file")) {
              const name = LOCKS[lock];
              const result = await parsePackageJson(path.join(directory, "package.json"), options);
              if (result)
                return result;
              else
                return { name, agent: name };
            }
          }
          break;
        }
        case "packageManager-field":
        case "devEngines-field": {
          const result = await parsePackageJson(path.join(directory, "package.json"), options);
          if (result)
            return result;
          break;
        }
        case "install-metadata": {
          for (const metadata of Object.keys(INSTALL_METADATA)) {
            const fileOrDir = metadata.endsWith("/") ? "dir" : "file";
            if (await pathExists(path.join(directory, metadata), fileOrDir)) {
              const name = INSTALL_METADATA[metadata];
              const agent = name === "yarn" ? isMetadataYarnClassic(metadata) ? "yarn" : "yarn@berry" : name;
              return { name, agent };
            }
          }
          break;
        }
      }
    }
    if (stopDir?.(directory))
      break;
  }
  return null;
}
function getNameAndVer(pkg) {
  const handelVer = (version) => version?.match(/\d+(\.\d+){0,2}/)?.[0] ?? version;
  if (typeof pkg.packageManager === "string") {
    const [name, ver] = pkg.packageManager.replace(/^\^/, "").split("@");
    return { name, ver: handelVer(ver) };
  }
  if (typeof pkg.devEngines?.packageManager?.name === "string") {
    return {
      name: pkg.devEngines.packageManager.name,
      ver: handelVer(pkg.devEngines.packageManager.version)
    };
  }
  return void 0;
}
async function handlePackageManager(filepath, options) {
  try {
    const content = await fs.readFile(filepath, "utf8");
    const pkg = options.packageJsonParser ? await options.packageJsonParser(content, filepath) : JSON.parse(content);
    let agent;
    const nameAndVer = getNameAndVer(pkg);
    if (nameAndVer) {
      const name = nameAndVer.name;
      const ver = nameAndVer.ver;
      let version = ver;
      if (name === "yarn" && ver && Number.parseInt(ver) > 1) {
        agent = "yarn@berry";
        version = "berry";
        return { name, agent, version };
      } else if (name === "pnpm" && ver && Number.parseInt(ver) < 7) {
        agent = "pnpm@6";
        return { name, agent, version };
      } else if (AGENTS.includes(name)) {
        agent = name;
        return { name, agent, version };
      } else {
        return options.onUnknown?.(pkg.packageManager) ?? null;
      }
    }
  } catch {
  }
  return null;
}
function isMetadataYarnClassic(metadataPath) {
  return metadataPath.endsWith(".yarn_integrity");
}

export { detect, getUserAgent };
