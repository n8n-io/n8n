'use strict';

const node_fs = require('node:fs');
const pathe = require('pathe');
const mlly = require('mlly');
const confbox = require('confbox');

const defaultFindOptions = {
  startingFrom: ".",
  rootPattern: /^node_modules$/,
  reverse: false,
  test: (filePath) => {
    try {
      if (node_fs.statSync(filePath).isFile()) {
        return true;
      }
    } catch {
    }
  }
};
async function findFile(filename, _options = {}) {
  const filenames = Array.isArray(filename) ? filename : [filename];
  const options = { ...defaultFindOptions, ..._options };
  const basePath = pathe.resolve(options.startingFrom);
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
        const filePath = pathe.join(...segments.slice(0, index), filename2);
        if (await options.test(filePath)) {
          return filePath;
        }
      }
    }
  } else {
    for (let index = segments.length; index > root; index--) {
      for (const filename2 of filenames) {
        const filePath = pathe.join(...segments.slice(0, index), filename2);
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
  const blob = await node_fs.promises.readFile(resolvedPath, "utf8");
  let parsed;
  try {
    parsed = confbox.parseJSON(blob);
  } catch {
    parsed = confbox.parseJSONC(blob);
  }
  cache.set(resolvedPath, parsed);
  return parsed;
}
async function writePackageJSON(path, package_) {
  await node_fs.promises.writeFile(path, confbox.stringifyJSON(package_));
}
async function readTSConfig(id, options = {}) {
  const resolvedPath = await resolveTSConfig(id, options);
  const cache = options.cache && typeof options.cache !== "boolean" ? options.cache : FileCache;
  if (options.cache && cache.has(resolvedPath)) {
    return cache.get(resolvedPath);
  }
  const text = await node_fs.promises.readFile(resolvedPath, "utf8");
  const parsed = confbox.parseJSONC(text);
  cache.set(resolvedPath, parsed);
  return parsed;
}
async function writeTSConfig(path, tsconfig) {
  await node_fs.promises.writeFile(path, confbox.stringifyJSONC(tsconfig));
}
async function resolvePackageJSON(id = process.cwd(), options = {}) {
  const resolvedPath = pathe.isAbsolute(id) ? id : await mlly.resolvePath(id, options);
  return findNearestFile("package.json", {
    startingFrom: resolvedPath,
    ...options
  });
}
async function resolveTSConfig(id = process.cwd(), options = {}) {
  const resolvedPath = pathe.isAbsolute(id) ? id : await mlly.resolvePath(id, options);
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
  const resolvedPath = pathe.isAbsolute(id) ? id : await mlly.resolvePath(id, options);
  const _options = { startingFrom: resolvedPath, ...options };
  try {
    return await findNearestFile(lockFiles, _options);
  } catch {
  }
  throw new Error("No lockfile found from " + id);
}
async function findWorkspaceDir(id = process.cwd(), options = {}) {
  const resolvedPath = pathe.isAbsolute(id) ? id : await mlly.resolvePath(id, options);
  const _options = { startingFrom: resolvedPath, ...options };
  try {
    const r = await findNearestFile(".git/config", _options);
    return pathe.resolve(r, "../..");
  } catch {
  }
  try {
    const r = await resolveLockfile(resolvedPath, {
      ..._options,
      reverse: true
    });
    return pathe.dirname(r);
  } catch {
  }
  try {
    const r = await findFile(resolvedPath, _options);
    return pathe.dirname(r);
  } catch {
  }
  throw new Error("Cannot detect workspace root from " + id);
}

exports.definePackageJSON = definePackageJSON;
exports.defineTSConfig = defineTSConfig;
exports.findFarthestFile = findFarthestFile;
exports.findFile = findFile;
exports.findNearestFile = findNearestFile;
exports.findWorkspaceDir = findWorkspaceDir;
exports.readPackageJSON = readPackageJSON;
exports.readTSConfig = readTSConfig;
exports.resolveLockfile = resolveLockfile;
exports.resolvePackageJSON = resolvePackageJSON;
exports.resolveTSConfig = resolveTSConfig;
exports.writePackageJSON = writePackageJSON;
exports.writeTSConfig = writeTSConfig;
