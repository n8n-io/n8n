'use strict';

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const process = require('node:process');
const mlly = require('mlly');
const node_url = require('node:url');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const path__default = /*#__PURE__*/_interopDefaultCompat(path);
const fs__default = /*#__PURE__*/_interopDefaultCompat(fs);
const fsp__default = /*#__PURE__*/_interopDefaultCompat(fsp);
const process__default = /*#__PURE__*/_interopDefaultCompat(process);

/*
How it works:
`this.#head` is an instance of `Node` which keeps track of its current value and nests another instance of `Node` that keeps the value that comes after it. When a value is provided to `.enqueue()`, the code needs to iterate through `this.#head`, going deeper and deeper to find the last value. However, iterating through every single item is slow. This problem is solved by saving a reference to the last value as `this.#tail` so that it can reference it to add a new value.
*/

class Node {
	value;
	next;

	constructor(value) {
		this.value = value;
	}
}

class Queue {
	#head;
	#tail;
	#size;

	constructor() {
		this.clear();
	}

	enqueue(value) {
		const node = new Node(value);

		if (this.#head) {
			this.#tail.next = node;
			this.#tail = node;
		} else {
			this.#head = node;
			this.#tail = node;
		}

		this.#size++;
	}

	dequeue() {
		const current = this.#head;
		if (!current) {
			return;
		}

		this.#head = this.#head.next;
		this.#size--;
		return current.value;
	}

	clear() {
		this.#head = undefined;
		this.#tail = undefined;
		this.#size = 0;
	}

	get size() {
		return this.#size;
	}

	* [Symbol.iterator]() {
		let current = this.#head;

		while (current) {
			yield current.value;
			current = current.next;
		}
	}
}

function pLimit(concurrency) {
	if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = new Queue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()();
		}
	};

	const run = async (fn, resolve, args) => {
		activeCount++;

		const result = (async () => fn(...args))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (fn, resolve, args) => {
		queue.enqueue(run.bind(undefined, fn, resolve, args));

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()();
			}
		})();
	};

	const generator = (fn, ...args) => new Promise(resolve => {
		enqueue(fn, resolve, args);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value: () => {
				queue.clear();
			},
		},
	});

	return generator;
}

class EndError extends Error {
	constructor(value) {
		super();
		this.value = value;
	}
}

// The input can also be a promise, so we await it.
const testElement = async (element, tester) => tester(await element);

// The input can also be a promise, so we `Promise.all()` them both.
const finder = async element => {
	const values = await Promise.all(element);
	if (values[1] === true) {
		throw new EndError(values[0]);
	}

	return false;
};

async function pLocate(
	iterable,
	tester,
	{
		concurrency = Number.POSITIVE_INFINITY,
		preserveOrder = true,
	} = {},
) {
	const limit = pLimit(concurrency);

	// Start all the promises concurrently with optional limit.
	const items = [...iterable].map(element => [element, limit(testElement, element, tester)]);

	// Check the promises either serially or concurrently.
	const checkLimit = pLimit(preserveOrder ? 1 : Number.POSITIVE_INFINITY);

	try {
		await Promise.all(items.map(element => checkLimit(finder, element)));
	} catch (error) {
		if (error instanceof EndError) {
			return error.value;
		}

		throw error;
	}
}

const typeMappings = {
	directory: 'isDirectory',
	file: 'isFile',
};

function checkType(type) {
	if (Object.hasOwnProperty.call(typeMappings, type)) {
		return;
	}

	throw new Error(`Invalid type specified: ${type}`);
}

const matchType = (type, stat) => stat[typeMappings[type]]();

const toPath$1 = urlOrPath => urlOrPath instanceof URL ? node_url.fileURLToPath(urlOrPath) : urlOrPath;

async function locatePath(
	paths,
	{
		cwd = process__default.cwd(),
		type = 'file',
		allowSymlinks = true,
		concurrency,
		preserveOrder,
	} = {},
) {
	checkType(type);
	cwd = toPath$1(cwd);

	const statFunction = allowSymlinks ? fs.promises.stat : fs.promises.lstat;

	return pLocate(paths, async path_ => {
		try {
			const stat = await statFunction(path__default.resolve(cwd, path_));
			return matchType(type, stat);
		} catch {
			return false;
		}
	}, {concurrency, preserveOrder});
}

const toPath = urlOrPath => urlOrPath instanceof URL ? node_url.fileURLToPath(urlOrPath) : urlOrPath;

const findUpStop = Symbol('findUpStop');

async function findUpMultiple(name, options = {}) {
	let directory = path__default.resolve(toPath(options.cwd) || '');
	const {root} = path__default.parse(directory);
	const stopAt = path__default.resolve(directory, options.stopAt || root);
	const limit = options.limit || Number.POSITIVE_INFINITY;
	const paths = [name].flat();

	const runMatcher = async locateOptions => {
		if (typeof name !== 'function') {
			return locatePath(paths, locateOptions);
		}

		const foundPath = await name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath([foundPath], locateOptions);
		}

		return foundPath;
	};

	const matches = [];
	// eslint-disable-next-line no-constant-condition
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const foundPath = await runMatcher({...options, cwd: directory});

		if (foundPath === findUpStop) {
			break;
		}

		if (foundPath) {
			matches.push(path__default.resolve(directory, foundPath));
		}

		if (directory === stopAt || matches.length >= limit) {
			break;
		}

		directory = path__default.dirname(directory);
	}

	return matches;
}

async function findUp(name, options = {}) {
	const matches = await findUpMultiple(name, {...options, limit: 1});
	return matches[0];
}

function _resolve(path$1, options = {}) {
  if (options.platform === "auto" || !options.platform)
    options.platform = process__default.platform === "win32" ? "win32" : "posix";
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
  } catch (e) {
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
async function getPackageInfo(name, options = {}) {
  const packageJsonPath = getPackageJsonPath(name, options);
  if (!packageJsonPath)
    return;
  const packageJson = JSON.parse(await fs__default.promises.readFile(packageJsonPath, "utf8"));
  return {
    name,
    version: packageJson.version,
    rootPath: path.dirname(packageJsonPath),
    packageJsonPath,
    packageJson
  };
}
function getPackageInfoSync(name, options = {}) {
  const packageJsonPath = getPackageJsonPath(name, options);
  if (!packageJsonPath)
    return;
  const packageJson = JSON.parse(fs__default.readFileSync(packageJsonPath, "utf8"));
  return {
    name,
    version: packageJson.version,
    rootPath: path.dirname(packageJsonPath),
    packageJsonPath,
    packageJson
  };
}
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
async function loadPackageJSON(cwd = process__default.cwd()) {
  const path = await findUp("package.json", { cwd });
  if (!path || !fs__default.existsSync(path))
    return null;
  return JSON.parse(await fsp__default.readFile(path, "utf-8"));
}
async function isPackageListed(name, cwd) {
  const pkg = await loadPackageJSON(cwd) || {};
  return name in (pkg.dependencies || {}) || name in (pkg.devDependencies || {});
}

exports.getPackageInfo = getPackageInfo;
exports.getPackageInfoSync = getPackageInfoSync;
exports.importModule = importModule;
exports.isPackageExists = isPackageExists;
exports.isPackageListed = isPackageListed;
exports.loadPackageJSON = loadPackageJSON;
exports.resolveModule = resolveModule;
