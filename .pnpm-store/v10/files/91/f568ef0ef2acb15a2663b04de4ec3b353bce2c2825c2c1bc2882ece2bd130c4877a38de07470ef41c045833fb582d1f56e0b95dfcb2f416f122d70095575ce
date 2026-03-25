import { statSync, promises } from 'node:fs';
import { resolve, join, isAbsolute, dirname } from 'pathe';
import { resolvePath } from 'mlly';
import { parseJSON, parseJSONC, stringifyJSON, stringifyJSONC } from 'confbox';

const defaultFindOptions = {
  startingFrom: ".",
  rootPattern: /^node_modules$/,
  reverse: false,
  test: (filePath) => {
    try {
      if (statSync(filePath).isFile()) {
        return true;
      }
    } catch {
    }
  }
};
async function findFile(filename, _options = {}) {
  const filenames = Array.isArray(filename) ? filename : [filename];
  const options = { ...defaultFindOptions, ..._options };
  const basePath = resolve(options.startingFrom);
  const leadingSlash = basePath[0] === "/";
  const segments = basePath.split("/").filter(Boolean);
  if (leadingSlash) {
    segments[0] = "/" + segments[0];
  }
  let root = segments.findIndex((r) => r.match(options.rootPattern));
  if (root === -1) {
    root = 0;
  }
  if (options.reverse) {
    for (let index = root + 1; index <= segments.length; index++) {
      for (const filename2 of filenames) {
        const filePath = join(...segments.slice(0, index), filename2);
        if (await options.test(filePath)) {
          return filePath;
        }
      }
    }
  } else {
    for (let index = segments.length; index > root; index--) {
      for (const filename2 of filenames) {
        const filePath = join(...segments.slice(0, index), filename2);
        if (await options.test(filePath)) {
          return filePath;
        }
      }
    }
  }
  throw new Error(
    `Cannot find matching ${filename} in ${options.startingFrom} or parent directories`
  );
}
function findNearestFile(filename, _options = {}) {
  return findFile(filename, _options);
}
function findFarthestFile(filename, _options = {}) {
  return findFile(filename, { ..._options, reverse: true });
}

function definePackageJSON(package_) {
  return package_;
}
function defineTSConfig(tsconfig) {
  return tsconfig;
}
const FileCache = /* @__PURE__ */ new Map();
async function readPackageJSON(id, options = {}) {
  const resolvedPath = await resolvePackageJSON(id, options);
  const cache = options.cache && typeof options.cache !== "boolean" ? options.cache : FileCache;
  if (options.cache && cache.has(resolvedPath)) {
    return cache.get(resolvedPath);
  }
  const blob = await promises.readFile(resolvedPath, "utf8");
  let parsed;
  try {
    parsed = parseJSON(blob);
  } catch {
    parsed = parseJSONC(blob);
  }
  cache.set(resolvedPath, parsed);
  return parsed;
}
async function writePackageJSON(path, package_) {
  await promises.writeFile(path, stringifyJSON(package_));
}
async function readTSConfig(id, options = {}) {
  const resolvedPath = await resolveTSConfig(id, options);
  const cache = options.cache && typeof options.cache !== "boolean" ? options.cache : FileCache;
  if (options.cache && cache.has(resolvedPath)) {
    return cache.get(resolvedPath);
  }
  const text = await promises.readFile(resolvedPath, "utf8");
  const parsed = parseJSONC(text);
  cache.set(resolvedPath, parsed);
  return parsed;
}
async function writeTSConfig(path, tsconfig) {
  await promises.writeFile(path, stringifyJSONC(tsconfig));
}
async function resolvePackageJSON(id = process.cwd(), options = {}) {
  const resolvedPath = isAbsolute(id) ? id : await resolvePath(id, options);
  return findNearestFile("package.json", {
    startingFrom: resolvedPath,
    ...options
  });
}
async function resolveTSConfig(id = process.cwd(), options = {}) {
  const resolvedPath = isAbsolute(id) ? id : await resolvePath(id, options);
  return findNearestFile("tsconfig.json", {
    startingFrom: resolvedPath,
    ...options
  });
}
const lockFiles = [
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
  "bun.lockb",
  "bun.lock"
];
async function resolveLockfile(id = process.cwd(), options = {}) {
  const resolvedPath = isAbsolute(id) ? id : await resolvePath(id, options);
  const _options = { startingFrom: resolvedPath, ...options };
  try {
    return await findNearestFile(lockFiles, _options);
  } catch {
  }
  throw new Error("No lockfile found from " + id);
}
async function findWorkspaceDir(id = process.cwd(), options = {}) {
  const resolvedPath = isAbsolute(id) ? id : await resolvePath(id, options);
  const _options = { startingFrom: resolvedPath, ...options };
  try {
    const r = await findNearestFile(".git/config", _options);
    return resolve(r, "../..");
  } catch {
  }
  try {
    const r = await resolveLockfile(resolvedPath, {
      ..._options,
      reverse: true
    });
    return dirname(r);
  } catch {
  }
  try {
    const r = await findFile(resolvedPath, _options);
    return dirname(r);
  } catch {
  }
  throw new Error("Cannot detect workspace root from " + id);
}

export { definePackageJSON, defineTSConfig, findFarthestFile, findFile, findNearestFile, findWorkspaceDir, readPackageJSON, readTSConfig, resolveLockfile, resolvePackageJSON, resolveTSConfig, writePackageJSON, writeTSConfig };
