'use strict';

const fs = require('node:fs');
const node_module = require('node:module');
const path = require('node:path');
const process = require('node:process');
const fsPromises = require('node:fs/promises');
const node_url = require('node:url');
const mlly = require('mlly');
const macro = require('quansync/macro');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const fs__default = /*#__PURE__*/_interopDefaultCompat(fs);
const path__default = /*#__PURE__*/_interopDefaultCompat(path);
const process__default = /*#__PURE__*/_interopDefaultCompat(process);
const fsPromises__default = /*#__PURE__*/_interopDefaultCompat(fsPromises);

const toPath = urlOrPath => urlOrPath instanceof URL ? node_url.fileURLToPath(urlOrPath) : urlOrPath;

async function findUp$1(name, {
	cwd = process__default.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = path__default.resolve(toPath(cwd) ?? '');
	const {root} = path__default.parse(directory);
	stopAt = path__default.resolve(directory, toPath(stopAt ?? root));
	const isAbsoluteName = path__default.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : path__default.join(directory, name);
		try {
			const stats = await fsPromises__default.stat(filePath); // eslint-disable-line no-await-in-loop
			if ((type === 'file' && stats.isFile()) || (type === 'directory' && stats.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = path__default.dirname(directory);
	}
}

function findUpSync(name, {
	cwd = process__default.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = path__default.resolve(toPath(cwd) ?? '');
	const {root} = path__default.parse(directory);
	stopAt = path__default.resolve(directory, toPath(stopAt) ?? root);
	const isAbsoluteName = path__default.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : path__default.join(directory, name);

		try {
			const stats = fs__default.statSync(filePath, {throwIfNoEntry: false});
			if ((type === 'file' && stats?.isFile()) || (type === 'directory' && stats?.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = path__default.dirname(directory);
	}
}

function _resolve(path$1, options = {}) {
  if (options.platform === "auto" || !options.platform)
    options.platform = process__default.platform === "win32" ? "win32" : "posix";
  if (process__default.versions.pnp) {
    const paths = options.paths || [];
    if (paths.length === 0)
      paths.push(process__default.cwd());
    const targetRequire = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
    try {
      return targetRequire.resolve(path$1, { paths });
    } catch {
    }
  }
  const modulePath = mlly.resolvePathSync(path$1, {
    url: options.paths
  });
  if (options.platform === "win32")
    return path.win32.normalize(modulePath);
  return modulePath;
}
function resolveModule(name, options = {}) {
  try {
    return _resolve(name, options);
  } catch {
    return void 0;
  }
}
async function importModule(path) {
  const i = await import(path);
  if (i)
    return mlly.interopDefault(i);
  return i;
}
function isPackageExists(name, options = {}) {
  return !!resolvePackage(name, options);
}
function getPackageJsonPath(name, options = {}) {
  const entry = resolvePackage(name, options);
  if (!entry)
    return;
  return searchPackageJSON(entry);
}
const readFile = macro.quansync({
  async: (id) => fs__default.promises.readFile(id, "utf8"),
  sync: (id) => fs__default.readFileSync(id, "utf8")
});
const getPackageInfo = macro.quansync(function* (name, options = {}) {
  const packageJsonPath = getPackageJsonPath(name, options);
  if (!packageJsonPath)
    return;
  const packageJson = JSON.parse(yield readFile(packageJsonPath));
  return {
    name,
    version: packageJson.version,
    rootPath: path.dirname(packageJsonPath),
    packageJsonPath,
    packageJson
  };
});
const getPackageInfoSync = getPackageInfo.sync;
function resolvePackage(name, options = {}) {
  try {
    return _resolve(`${name}/package.json`, options);
  } catch {
  }
  try {
    return _resolve(name, options);
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND" && e.code !== "ERR_MODULE_NOT_FOUND")
      console.error(e);
    return false;
  }
}
function searchPackageJSON(dir) {
  let packageJsonPath;
  while (true) {
    if (!dir)
      return;
    const newDir = path.dirname(dir);
    if (newDir === dir)
      return;
    dir = newDir;
    packageJsonPath = path.join(dir, "package.json");
    if (fs__default.existsSync(packageJsonPath))
      break;
  }
  return packageJsonPath;
}
const findUp = macro.quansync({
  sync: findUpSync,
  async: findUp$1
});
const loadPackageJSON = macro.quansync(function* (cwd = process__default.cwd()) {
  const path = yield findUp("package.json", { cwd });
  if (!path || !fs__default.existsSync(path))
    return null;
  return JSON.parse(yield readFile(path));
});
const loadPackageJSONSync = loadPackageJSON.sync;
const isPackageListed = macro.quansync(function* (name, cwd) {
  const pkg = (yield loadPackageJSON(cwd)) || {};
  return name in (pkg.dependencies || {}) || name in (pkg.devDependencies || {});
});
const isPackageListedSync = isPackageListed.sync;

exports.getPackageInfo = getPackageInfo;
exports.getPackageInfoSync = getPackageInfoSync;
exports.importModule = importModule;
exports.isPackageExists = isPackageExists;
exports.isPackageListed = isPackageListed;
exports.isPackageListedSync = isPackageListedSync;
exports.loadPackageJSON = loadPackageJSON;
exports.loadPackageJSONSync = loadPackageJSONSync;
exports.resolveModule = resolveModule;
