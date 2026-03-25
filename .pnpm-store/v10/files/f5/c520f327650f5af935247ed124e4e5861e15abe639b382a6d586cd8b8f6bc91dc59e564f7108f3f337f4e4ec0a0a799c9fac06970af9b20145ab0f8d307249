import fs from 'node:fs';
import { createRequire } from 'node:module';
import path, { dirname, join, win32 } from 'node:path';
import process from 'node:process';
import fsPromises from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolvePathSync, interopDefault } from 'mlly';
import { quansync } from 'quansync/macro';

const toPath = urlOrPath => urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;

async function findUp$1(name, {
	cwd = process.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = path.resolve(toPath(cwd) ?? '');
	const {root} = path.parse(directory);
	stopAt = path.resolve(directory, toPath(stopAt ?? root));
	const isAbsoluteName = path.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : path.join(directory, name);
		try {
			const stats = await fsPromises.stat(filePath); // eslint-disable-line no-await-in-loop
			if ((type === 'file' && stats.isFile()) || (type === 'directory' && stats.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = path.dirname(directory);
	}
}

function findUpSync(name, {
	cwd = process.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = path.resolve(toPath(cwd) ?? '');
	const {root} = path.parse(directory);
	stopAt = path.resolve(directory, toPath(stopAt) ?? root);
	const isAbsoluteName = path.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : path.join(directory, name);

		try {
			const stats = fs.statSync(filePath, {throwIfNoEntry: false});
			if ((type === 'file' && stats?.isFile()) || (type === 'directory' && stats?.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = path.dirname(directory);
	}
}

function _resolve(path, options = {}) {
  if (options.platform === "auto" || !options.platform)
    options.platform = process.platform === "win32" ? "win32" : "posix";
  if (process.versions.pnp) {
    const paths = options.paths || [];
    if (paths.length === 0)
      paths.push(process.cwd());
    const targetRequire = createRequire(import.meta.url);
    try {
      return targetRequire.resolve(path, { paths });
    } catch {
    }
  }
  const modulePath = resolvePathSync(path, {
    url: options.paths
  });
  if (options.platform === "win32")
    return win32.normalize(modulePath);
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
    return interopDefault(i);
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
const readFile = quansync({
  async: (id) => fs.promises.readFile(id, "utf8"),
  sync: (id) => fs.readFileSync(id, "utf8")
});
const getPackageInfo = quansync(function* (name, options = {}) {
  const packageJsonPath = getPackageJsonPath(name, options);
  if (!packageJsonPath)
    return;
  const packageJson = JSON.parse(yield readFile(packageJsonPath));
  return {
    name,
    version: packageJson.version,
    rootPath: dirname(packageJsonPath),
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
    const newDir = dirname(dir);
    if (newDir === dir)
      return;
    dir = newDir;
    packageJsonPath = join(dir, "package.json");
    if (fs.existsSync(packageJsonPath))
      break;
  }
  return packageJsonPath;
}
const findUp = quansync({
  sync: findUpSync,
  async: findUp$1
});
const loadPackageJSON = quansync(function* (cwd = process.cwd()) {
  const path = yield findUp("package.json", { cwd });
  if (!path || !fs.existsSync(path))
    return null;
  return JSON.parse(yield readFile(path));
});
const loadPackageJSONSync = loadPackageJSON.sync;
const isPackageListed = quansync(function* (name, cwd) {
  const pkg = (yield loadPackageJSON(cwd)) || {};
  return name in (pkg.dependencies || {}) || name in (pkg.devDependencies || {});
});
const isPackageListedSync = isPackageListed.sync;

export { getPackageInfo, getPackageInfoSync, importModule, isPackageExists, isPackageListed, isPackageListedSync, loadPackageJSON, loadPackageJSONSync, resolveModule };
