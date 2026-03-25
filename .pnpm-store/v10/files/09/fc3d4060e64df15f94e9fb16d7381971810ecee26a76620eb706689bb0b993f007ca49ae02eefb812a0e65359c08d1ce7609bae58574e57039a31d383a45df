'use strict';

// The Resolver is currently experimental and might be exposed to users in the future.

const {
	VMError
} = require('./bridge');
const { VMScript } = require('./script');
const { jsCopmiler } = require('./compiler');

// This should match. Note that '\', '%' are invalid characters
// 1. name/.*
// 2. @scope/name/.*
const EXPORTS_PATTERN = /^((?:@[^/\\%]+\/)?[^/\\%]+)(\/.*)?$/;

// See https://tc39.es/ecma262/#integer-index
function isArrayIndex(key) {
	const keyNum = +key;
	if (`${keyNum}` !== key) return false;
	return keyNum >= 0 && keyNum < 0xFFFFFFFF;
}

class Resolver {

	constructor(fs, globalPaths, builtins) {
		this.fs = fs;
		this.globalPaths = globalPaths;
		this.builtins = builtins;
	}

	init(vm) {

	}

	isPathAllowed(path) {
		return false;
	}

	checkAccess(mod, filename) {
		if (!this.isPathAllowed(filename)) {
			throw new VMError(`Module '${filename}' is not allowed to be required. The path is outside the border!`, 'EDENIED');
		}
	}

	pathIsRelative(path) {
		if (path === '' || path[0] !== '.') return false;
		if (path.length === 1) return true;
		const idx = path[1] === '.' ? 2 : 1;
		if (path.length <= idx) return false;
		return this.fs.isSeparator(path[idx]);
	}

	pathIsAbsolute(path) {
		return path !== '' && (this.fs.isSeparator(path[0]) || this.fs.isAbsolute(path));
	}

	lookupPaths(mod, id) {
		if (this.pathIsRelative(id)) return [mod.path || '.'];
		return [...mod.paths, ...this.globalPaths];
	}

	getBuiltinModulesList(vm) {
		if (this.builtins === undefined) return [];
		const res = [];
		this.builtins.forEach((value, key) => {
			if (typeof value === 'object') value.init(vm);
			res.push(key);
		});
		return res;
	}

	loadBuiltinModule(vm, id) {
		if (this.builtins === undefined) return undefined;
		const builtin = this.builtins.get(id);
		if (!builtin) return undefined;
		if (typeof builtin === 'function') return builtin(vm);
		return builtin.load(vm);
	}

	makeExtensionHandler(vm, name) {
		return (mod, filename) => {
			filename = this.fs.resolve(filename);
			this.checkAccess(mod, filename);
			this[name](vm, mod, filename);
		};
	}

	getExtensions(vm) {
		return {
			// eslint-disable-next-line quote-props
			__proto__: null,
			'.js': this.makeExtensionHandler(vm, 'loadJS'),
			'.json': this.makeExtensionHandler(vm, 'loadJSON'),
			' .node': this.makeExtensionHandler(vm, 'loadNode'),
		};
	}

	loadJS(vm, mod, filename) {
		throw new VMError(`Access denied to require '${filename}'`, 'EDENIED');
	}

	loadJSON(vm, mod, filename) {
		throw new VMError(`Access denied to require '${filename}'`, 'EDENIED');
	}

	loadNode(vm, mod, filename) {
		throw new VMError(`Access denied to require '${filename}'`, 'EDENIED');
	}

	registerModule(mod, filename, path, parent, direct) {

	}

	resolve(mod, x, options, extList, direct) {
		if (x.startsWith('node:') || this.builtins.has(x)) {
			// a. return the core module
			// b. STOP
			return x;
		}

		return this.resolveFull(mod, x, options, extList, direct);
	}

	resolveFull(mod, x, options, extList, direct) {
		// 7. THROW "not found"
		throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
	}

	// NODE_MODULES_PATHS(START)
	genLookupPaths(path) {
		// 1. let PARTS = path split(START)
		// 2. let I = count of PARTS - 1
		// 3. let DIRS = []
		const dirs = [];
		// 4. while I >= 0,
		while (true) {
			const name = this.fs.basename(path);
			// a. if PARTS[I] = "node_modules" CONTINUE
			if (name !== 'node_modules') {
				// b. DIR = path join(PARTS[0 .. I] + "node_modules")
				// c. DIRS = DIR + DIRS // Note: this seems wrong. Should be DIRS + DIR
				dirs.push(this.fs.join(path, 'node_modules'));
			}
			const dir = this.fs.dirname(path);
			if (dir == path) break;
			// d. let I = I - 1
			path = dir;
		}

		return dirs;
		// This is done later on
		// 5. return DIRS + GLOBAL_FOLDERS
	}

}

function pathTestIsDirectory(fs, path) {
	try {
		const stat = fs.statSync(path, {__proto__: null, throwIfNoEntry: false});
		return stat && stat.isDirectory();
	} catch (e) {
		return false;
	}
}

function pathTestIsFile(fs, path) {
	try {
		const stat = fs.statSync(path, {__proto__: null, throwIfNoEntry: false});
		return stat && stat.isFile();
	} catch (e) {
		return false;
	}
}

function readFile(fs, path) {
	return fs.readFileSync(path, {encoding: 'utf8'});
}

function readFileWhenExists(fs, path) {
	return pathTestIsFile(fs, path) ? readFile(fs, path) : undefined;
}

class DefaultResolver extends Resolver {

	constructor(fs, globalPaths, builtins) {
		super(fs, globalPaths, builtins);
		this.packageCache = new Map();
		this.scriptCache = new Map();
	}

	getCompiler(filename) {
		return jsCopmiler;
	}

	isStrict(filename) {
		return true;
	}

	readScript(filename) {
		let script = this.scriptCache.get(filename);
		if (!script) {
			script = new VMScript(readFile(this.fs, filename), {filename, compiler: this.getCompiler(filename)});
			this.scriptCache.set(filename, script);
		}
		return script;
	}

	loadJS(vm, mod, filename) {
		const script = this.readScript(filename);
		vm.run(script, {filename, strict: this.isStrict(filename), module: mod, wrapper: 'none', dirname: mod.path});
	}

	loadJSON(vm, mod, filename) {
		const json = readFile(this.fs, filename);
		mod.exports = vm._jsonParse(json);
	}

	loadNode(vm, mod, filename) {
		throw new VMError('Native modules can be required only with context set to \'host\'.');
	}

	customResolve(x, path, extList) {
		return undefined;
	}

	// require(X) from module at path Y
	resolveFull(mod, x, options, extList, direct) {
		// Note: core module handled by caller

		const path = mod.path || '.';

		// 5. LOAD_PACKAGE_SELF(X, dirname(Y))
		let f = this.loadPackageSelf(x, path, extList);
		if (f) return f;

		// 4. If X begins with '#'
		if (x[0] === '#') {
			// a. LOAD_PACKAGE_IMPORTS(X, dirname(Y))
			f = this.loadPackageImports(x, path, extList);
			if (f) return f;
		}

		// 2. If X begins with '/'
		if (this.pathIsAbsolute(x)) {
			// a. set Y to be the filesystem root
			f = this.loadAsFileOrDirectory(x, extList);
			if (f) return f;

			// c. THROW "not found"
			throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');

		// 3. If X begins with './' or '/' or '../'
		} else if (this.pathIsRelative(x)) {
			if (typeof options === 'object' && options !== null) {
				const paths = options.paths;
				if (Array.isArray(paths)) {
					for (let i = 0; i < paths.length; i++) {
						// a. LOAD_AS_FILE(Y + X)
						// b. LOAD_AS_DIRECTORY(Y + X)
						f = this.loadAsFileOrDirectory(this.fs.join(paths[i], x), extList);
						if (f) return f;
					}
				} else if (paths === undefined) {
					// a. LOAD_AS_FILE(Y + X)
					// b. LOAD_AS_DIRECTORY(Y + X)
					f = this.loadAsFileOrDirectory(this.fs.join(path, x), extList);
					if (f) return f;
				} else {
					throw new VMError('Invalid options.paths option.');
				}
			} else {
				// a. LOAD_AS_FILE(Y + X)
				// b. LOAD_AS_DIRECTORY(Y + X)
				f = this.loadAsFileOrDirectory(this.fs.join(path, x), extList);
				if (f) return f;
			}

			// c. THROW "not found"
			throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
		}

		let dirs;
		if (typeof options === 'object' && options !== null) {
			const paths = options.paths;
			if (Array.isArray(paths)) {
				dirs = [];

				for (let i = 0; i < paths.length; i++) {
					const lookups = this.genLookupPaths(paths[i]);
					for (let j = 0; j < lookups.length; j++) {
						if (!dirs.includes(lookups[j])) dirs.push(lookups[j]);
					}
					if (i === 0) {
						const globalPaths = this.globalPaths;
						for (let j = 0; j < globalPaths.length; j++) {
							if (!dirs.includes(globalPaths[j])) dirs.push(globalPaths[j]);
						}
					}
				}
			} else if (paths === undefined) {
				dirs = [...mod.paths, ...this.globalPaths];
			} else {
				throw new VMError('Invalid options.paths option.');
			}
		} else {
			dirs = [...mod.paths, ...this.globalPaths];
		}

		// 6. LOAD_NODE_MODULES(X, dirname(Y))
		f = this.loadNodeModules(x, dirs, extList);
		if (f) return f;

		f = this.customResolve(x, path, extList);
		if (f) return f;

		return super.resolveFull(mod, x, options, extList, direct);
	}

	loadAsFileOrDirectory(x, extList) {
		// a. LOAD_AS_FILE(X)
		const f = this.loadAsFile(x, extList);
		if (f) return f;
		// b. LOAD_AS_DIRECTORY(X)
		return this.loadAsDirectory(x, extList);
	}

	tryFile(x) {
		x = this.fs.resolve(x);
		return this.isPathAllowed(x) && pathTestIsFile(this.fs, x) ? x : undefined;
	}

	tryWithExtension(x, extList) {
		for (let i = 0; i < extList.length; i++) {
			const ext = extList[i];
			if (ext !== this.fs.basename(ext)) continue;
			const f = this.tryFile(x + ext);
			if (f) return f;
		}
		return undefined;
	}

	readPackage(path) {
		const packagePath = this.fs.resolve(this.fs.join(path, 'package.json'));

		const cache = this.packageCache.get(packagePath);
		if (cache !== undefined) return cache;

		if (!this.isPathAllowed(packagePath)) return undefined;
		const content = readFileWhenExists(this.fs, packagePath);
		if (!content) {
			this.packageCache.set(packagePath, false);
			return false;
		}

		let parsed;
		try {
			parsed = JSON.parse(content);
		} catch (e) {
			e.path = packagePath;
			e.message = 'Error parsing ' + packagePath + ': ' + e.message;
			throw e;
		}

		const filtered = {
			name: parsed.name,
			main: parsed.main,
			exports: parsed.exports,
			imports: parsed.imports,
			type: parsed.type
		};
		this.packageCache.set(packagePath, filtered);
		return filtered;
	}

	readPackageScope(path) {
		while (true) {
			const dir = this.fs.dirname(path);
			if (dir === path) break;
			const basename = this.fs.basename(dir);
			if (basename === 'node_modules') break;
			const pack = this.readPackage(dir);
			if (pack) return {data: pack, scope: dir};
			path = dir;
		}
		return {data: undefined, scope: undefined};
	}

	// LOAD_AS_FILE(X)
	loadAsFile(x, extList) {
		// 1. If X is a file, load X as its file extension format. STOP
		const f = this.tryFile(x);
		if (f) return f;
		// 2. If X.js is a file, load X.js as JavaScript text. STOP
		// 3. If X.json is a file, parse X.json to a JavaScript Object. STOP
		// 4. If X.node is a file, load X.node as binary addon. STOP
		return this.tryWithExtension(x, extList);
	}

	// LOAD_INDEX(X)
	loadIndex(x, extList) {
		// 1. If X/index.js is a file, load X/index.js as JavaScript text. STOP
		// 2. If X/index.json is a file, parse X/index.json to a JavaScript object. STOP
		// 3. If X/index.node is a file, load X/index.node as binary addon. STOP
		return this.tryWithExtension(this.fs.join(x, 'index'), extList);
	}

	// LOAD_AS_DIRECTORY(X)
	loadAsPackage(x, pack, extList) {
		// 1. If X/package.json is a file,
		// already done.
		if (pack) {
			// a. Parse X/package.json, and look for "main" field.
			// b. If "main" is a falsy value, GOTO 2.
			if (typeof pack.main === 'string') {
				// c. let M = X + (json main field)
				const m = this.fs.join(x, pack.main);
				// d. LOAD_AS_FILE(M)
				let f = this.loadAsFile(m, extList);
				if (f) return f;
				// e. LOAD_INDEX(M)
				f = this.loadIndex(m, extList);
				if (f) return f;
				// f. LOAD_INDEX(X) DEPRECATED
				f = this.loadIndex(x, extList);
				if (f) return f;
				// g. THROW "not found"
				throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
			}
		}

		// 2. LOAD_INDEX(X)
		return this.loadIndex(x, extList);
	}

	// LOAD_AS_DIRECTORY(X)
	loadAsDirectory(x, extList) {
		// 1. If X/package.json is a file,
		const pack = this.readPackage(x);
		return this.loadAsPackage(x, pack, extList);
	}

	// LOAD_NODE_MODULES(X, START)
	loadNodeModules(x, dirs, extList) {
		// 1. let DIRS = NODE_MODULES_PATHS(START)
		// This step is already done.

		// 2. for each DIR in DIRS:
		for (let i = 0; i < dirs.length; i++) {
			const dir = dirs[i];
			// a. LOAD_PACKAGE_EXPORTS(X, DIR)
			let f = this.loadPackageExports(x, dir, extList);
			if (f) return f;
			// b. LOAD_AS_FILE(DIR/X)
			f = this.loadAsFile(dir + '/' + x, extList);
			if (f) return f;
			// c. LOAD_AS_DIRECTORY(DIR/X)
			f = this.loadAsDirectory(dir + '/' + x, extList);
			if (f) return f;
		}

		return undefined;
	}

	// LOAD_PACKAGE_IMPORTS(X, DIR)
	loadPackageImports(x, dir, extList) {
		// 1. Find the closest package scope SCOPE to DIR.
		const {data, scope} = this.readPackageScope(dir);
		// 2. If no scope was found, return.
		if (!data) return undefined;
		// 3. If the SCOPE/package.json "imports" is null or undefined, return.
		if (typeof data.imports !== 'object' || data.imports === null || Array.isArray(data.imports)) return undefined;
		// 4. let MATCH = PACKAGE_IMPORTS_RESOLVE(X, pathToFileURL(SCOPE),
		//   ["node", "require"]) defined in the ESM resolver.

		// PACKAGE_IMPORTS_RESOLVE(specifier, parentURL, conditions)
		// 1. Assert: specifier begins with "#".
		// 2. If specifier is exactly equal to "#" or starts with "#/", then
		if (x === '#' || x.startsWith('#/')) {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid module specifier '${x}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 3. Let packageURL be the result of LOOKUP_PACKAGE_SCOPE(parentURL).
		// Note: packageURL === parentURL === scope
		// 4. If packageURL is not null, then
		// Always true
		// a. Let pjson be the result of READ_PACKAGE_JSON(packageURL).
		// pjson === data
		// b. If pjson.imports is a non-null Object, then
		// Already tested
		// x. Let resolved be the result of PACKAGE_IMPORTS_EXPORTS_RESOLVE( specifier, pjson.imports, packageURL, true, conditions).
		const match = this.packageImportsExportsResolve(x, data.imports, scope, true, ['node', 'require'], extList);
		// y. If resolved is not null or undefined, return resolved.
		if (!match) {
			// 5. Throw a Package Import Not Defined error.
			throw new VMError(`Package import not defined for '${x}'`, 'ERR_PACKAGE_IMPORT_NOT_DEFINED');
		}
		// END PACKAGE_IMPORTS_RESOLVE

		// 5. RESOLVE_ESM_MATCH(MATCH).
		return this.resolveEsmMatch(match, x, extList);
	}

	// LOAD_PACKAGE_EXPORTS(X, DIR)
	loadPackageExports(x, dir, extList) {
		// 1. Try to interpret X as a combination of NAME and SUBPATH where the name
		//    may have a @scope/ prefix and the subpath begins with a slash (`/`).
		const res = x.match(EXPORTS_PATTERN);
		// 2. If X does not match this pattern or DIR/NAME/package.json is not a file,
		//    return.
		if (!res) return undefined;
		const scope = this.fs.join(dir, res[1]);
		const pack = this.readPackage(scope);
		if (!pack) return undefined;
		// 3. Parse DIR/NAME/package.json, and look for "exports" field.
		// 4. If "exports" is null or undefined, return.
		if (!pack.exports) return undefined;
		// 5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(DIR/NAME), "." + SUBPATH,
		//    `package.json` "exports", ["node", "require"]) defined in the ESM resolver.
		const match = this.packageExportsResolve(scope, '.' + (res[2] || ''), pack.exports, ['node', 'require'], extList);
		// 6. RESOLVE_ESM_MATCH(MATCH)
		return this.resolveEsmMatch(match, x, extList);
	}

	// LOAD_PACKAGE_SELF(X, DIR)
	loadPackageSelf(x, dir, extList) {
		// 1. Find the closest package scope SCOPE to DIR.
		const {data, scope} = this.readPackageScope(dir);
		// 2. If no scope was found, return.
		if (!data) return undefined;
		// 3. If the SCOPE/package.json "exports" is null or undefined, return.
		if (!data.exports) return undefined;
		// 4. If the SCOPE/package.json "name" is not the first segment of X, return.
		if (x !== data.name && !x.startsWith(data.name + '/')) return undefined;
		// 5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(SCOPE),
		//    "." + X.slice("name".length), `package.json` "exports", ["node", "require"])
		//    defined in the ESM resolver.
		const match = this.packageExportsResolve(scope, '.' + x.slice(data.name.length), data.exports, ['node', 'require'], extList);
		// 6. RESOLVE_ESM_MATCH(MATCH)
		return this.resolveEsmMatch(match, x, extList);
	}

	// RESOLVE_ESM_MATCH(MATCH)
	resolveEsmMatch(match, x, extList) {
		// 1. let { RESOLVED, EXACT } = MATCH
		const resolved = match;
		const exact = true;
		// 2. let RESOLVED_PATH = fileURLToPath(RESOLVED)
		const resolvedPath = resolved;
		let f;
		// 3. If EXACT is true,
		if (exact) {
			// a. If the file at RESOLVED_PATH exists, load RESOLVED_PATH as its extension
			// format. STOP
			f = this.tryFile(resolvedPath);
		// 4. Otherwise, if EXACT is false,
		} else {
			// a. LOAD_AS_FILE(RESOLVED_PATH)
			// b. LOAD_AS_DIRECTORY(RESOLVED_PATH)
			f = this.loadAsFileOrDirectory(resolvedPath, extList);
		}
		if (f) return f;
		// 5. THROW "not found"
		throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
	}

	// PACKAGE_EXPORTS_RESOLVE(packageURL, subpath, exports, conditions)
	packageExportsResolve(packageURL, subpath, rexports, conditions, extList) {
		// 1. If exports is an Object with both a key starting with "." and a key not starting with ".", throw an Invalid Package Configuration error.
		let hasDots = false;
		if (typeof rexports === 'object' && !Array.isArray(rexports)) {
			const keys = Object.getOwnPropertyNames(rexports);
			if (keys.length > 0) {
				hasDots = keys[0][0] === '.';
				for (let i = 0; i < keys.length; i++) {
					if (hasDots !== (keys[i][0] === '.')) {
						throw new VMError('Invalid package configuration', 'ERR_INVALID_PACKAGE_CONFIGURATION');
					}
				}
			}
		}
		// 2. If subpath is equal to ".", then
		if (subpath === '.') {
			// a. Let mainExport be undefined.
			let mainExport = undefined;
			// b. If exports is a String or Array, or an Object containing no keys starting with ".", then
			if (typeof rexports === 'string' || Array.isArray(rexports) || !hasDots) {
				// x. Set mainExport to exports.
				mainExport = rexports;
			// c. Otherwise if exports is an Object containing a "." property, then
			} else if (hasDots) {
				// x. Set mainExport to exports["."].
				mainExport = rexports['.'];
			}
			// d. If mainExport is not undefined, then
			if (mainExport) {
				// x. Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, mainExport, "", false, false, conditions).
				const resolved = this.packageTargetResolve(packageURL, mainExport, '', false, false, conditions, extList);
				// y. If resolved is not null or undefined, return resolved.
				if (resolved) return resolved;
			}
		// 3. Otherwise, if exports is an Object and all keys of exports start with ".", then
		} else if (hasDots) {
			// a. Let matchKey be the string "./" concatenated with subpath.
			// Note: Here subpath starts already with './'
			// b. Let resolved be the result of PACKAGE_IMPORTS_EXPORTS_RESOLVE( matchKey, exports, packageURL, false, conditions).
			const resolved = this.packageImportsExportsResolve(subpath, rexports, packageURL, false, conditions, extList);
			// c. If resolved is not null or undefined, return resolved.
			if (resolved) return resolved;
		}
		// 4. Throw a Package Path Not Exported error.
		throw new VMError(`Package path '${subpath}' is not exported`, 'ERR_PACKAGE_PATH_NOT_EXPORTED');
	}

	// PACKAGE_IMPORTS_EXPORTS_RESOLVE(matchKey, matchObj, packageURL, isImports, conditions)
	packageImportsExportsResolve(matchKey, matchObj, packageURL, isImports, conditions, extList) {
		// 1. If matchKey is a key of matchObj and does not contain "*", then
		let target = matchObj[matchKey];
		if (target && matchKey.indexOf('*') === -1) {
			// a. Let target be the value of matchObj[matchKey].
			// b. Return the result of PACKAGE_TARGET_RESOLVE(packageURL, target, "", false, isImports, conditions).
			return this.packageTargetResolve(packageURL, target, '', false, isImports, conditions, extList);
		}
		// 2. Let expansionKeys be the list of keys of matchObj containing only a single "*",
		//    sorted by the sorting function PATTERN_KEY_COMPARE which orders in descending order of specificity.
		const expansionKeys = Object.getOwnPropertyNames(matchObj);
		let bestKey = '';
		let bestSubpath;
		// 3. For each key expansionKey in expansionKeys, do
		for (let i = 0; i < expansionKeys.length; i++) {
			const expansionKey = expansionKeys[i];
			if (matchKey.length < expansionKey.length) continue;
			// a. Let patternBase be the substring of expansionKey up to but excluding the first "*" character.
			const star = expansionKey.indexOf('*');
			if (star === -1) continue; // Note: expansionKeys was not filtered
			const patternBase = expansionKey.slice(0, star);
			// b. If matchKey starts with but is not equal to patternBase, then
			if (matchKey.startsWith(patternBase) && expansionKey.indexOf('*', star + 1) === -1) { // Note: expansionKeys was not filtered
				// 1. Let patternTrailer be the substring of expansionKey from the index after the first "*" character.
				const patternTrailer = expansionKey.slice(star + 1);
				// 2. If patternTrailer has zero length, or if matchKey ends with patternTrailer and the length of matchKey is greater than or
				//    equal to the length of expansionKey, then
				if (matchKey.endsWith(patternTrailer) && this.patternKeyCompare(bestKey, expansionKey) === 1) { // Note: expansionKeys was not sorted
					// a. Let target be the value of matchObj[expansionKey].
					target = matchObj[expansionKey];
					// b. Let subpath be the substring of matchKey starting at the index of the length of patternBase up to the length of
					//    matchKey minus the length of patternTrailer.
					bestKey = expansionKey;
					bestSubpath = matchKey.slice(patternBase.length, matchKey.length - patternTrailer.length);
				}
			}
		}
		if (bestSubpath) { // Note: expansionKeys was not sorted
			// c. Return the result of PACKAGE_TARGET_RESOLVE(packageURL, target, subpath, true, isImports, conditions).
			return this.packageTargetResolve(packageURL, target, bestSubpath, true, isImports, conditions, extList);
		}
		// 4. Return null.
		return null;
	}

	// PATTERN_KEY_COMPARE(keyA, keyB)
	patternKeyCompare(keyA, keyB) {
		// 1. Assert: keyA ends with "/" or contains only a single "*".
		// 2. Assert: keyB ends with "/" or contains only a single "*".
		// 3. Let baseLengthA be the index of "*" in keyA plus one, if keyA contains "*", or the length of keyA otherwise.
		const baseAStar = keyA.indexOf('*');
		const baseLengthA = baseAStar === -1 ? keyA.length : baseAStar + 1;
		// 4. Let baseLengthB be the index of "*" in keyB plus one, if keyB contains "*", or the length of keyB otherwise.
		const baseBStar = keyB.indexOf('*');
		const baseLengthB = baseBStar === -1 ? keyB.length : baseBStar + 1;
		// 5. If baseLengthA is greater than baseLengthB, return -1.
		if (baseLengthA > baseLengthB) return -1;
		// 6. If baseLengthB is greater than baseLengthA, return 1.
		if (baseLengthB > baseLengthA) return 1;
		// 7. If keyA does not contain "*", return 1.
		if (baseAStar === -1) return 1;
		// 8. If keyB does not contain "*", return -1.
		if (baseBStar === -1) return -1;
		// 9. If the length of keyA is greater than the length of keyB, return -1.
		if (keyA.length > keyB.length) return -1;
		// 10. If the length of keyB is greater than the length of keyA, return 1.
		if (keyB.length > keyA.length) return 1;
		// 11. Return 0.
		return 0;
	}

	// PACKAGE_TARGET_RESOLVE(packageURL, target, subpath, pattern, internal, conditions)
	packageTargetResolve(packageURL, target, subpath, pattern, internal, conditions, extList) {
		// 1. If target is a String, then
		if (typeof target === 'string') {
			// a. If pattern is false, subpath has non-zero length and target does not end with "/", throw an Invalid Module Specifier error.
			if (!pattern && subpath.length > 0 && !target.endsWith('/')) {
				throw new VMError(`Invalid package specifier '${subpath}'`, 'ERR_INVALID_MODULE_SPECIFIER');
			}
			// b. If target does not start with "./", then
			if (!target.startsWith('./')) {
				// 1. If internal is true and target does not start with "../" or "/" and is not a valid URL, then
				if (internal && !target.startsWith('../') && !target.startsWith('/')) {
					let isURL = false;
					try {
						// eslint-disable-next-line no-new
						new URL(target);
						isURL = true;
					} catch (e) {}
					if (!isURL) {
						// a. If pattern is true, then
						if (pattern) {
							// 1. Return PACKAGE_RESOLVE(target with every instance of "*" replaced by subpath, packageURL + "/").
							return this.packageResolve(target.replace(/\*/g, subpath), packageURL, conditions, extList);
						}
						// b. Return PACKAGE_RESOLVE(target + subpath, packageURL + "/").
						return this.packageResolve(this.fs.join(target, subpath), packageURL, conditions, extList);
					}
				}
				// Otherwise, throw an Invalid Package Target error.
				throw new VMError(`Invalid package target for '${subpath}'`, 'ERR_INVALID_PACKAGE_TARGET');
			}
			target = decodeURI(target);
			// c. If target split on "/" or "\" contains any ".", ".." or "node_modules" segments after the first segment, case insensitive
			//    and including percent encoded variants, throw an Invalid Package Target error.
			if (target.split(/[/\\]/).slice(1).findIndex(x => x === '.' || x === '..' || x.toLowerCase() === 'node_modules') !== -1) {
				throw new VMError(`Invalid package target for '${subpath}'`, 'ERR_INVALID_PACKAGE_TARGET');
			}
			// d. Let resolvedTarget be the URL resolution of the concatenation of packageURL and target.
			const resolvedTarget = this.fs.join(packageURL, target);
			// e. Assert: resolvedTarget is contained in packageURL.
			subpath = decodeURI(subpath);
			// f. If subpath split on "/" or "\" contains any ".", ".." or "node_modules" segments, case insensitive and including percent
			//    encoded variants, throw an Invalid Module Specifier error.
			if (subpath.split(/[/\\]/).findIndex(x => x === '.' || x === '..' || x.toLowerCase() === 'node_modules') !== -1) {
				throw new VMError(`Invalid package specifier '${subpath}'`, 'ERR_INVALID_MODULE_SPECIFIER');
			}
			// g. If pattern is true, then
			if (pattern) {
				// 1. Return the URL resolution of resolvedTarget with every instance of "*" replaced with subpath.
				return resolvedTarget.replace(/\*/g, subpath);
			}
			// h. Otherwise,
			// 1. Return the URL resolution of the concatenation of subpath and resolvedTarget.
			return this.fs.join(resolvedTarget, subpath);
		// 3. Otherwise, if target is an Array, then
		} else if (Array.isArray(target)) {
			// a. If target.length is zero, return null.
			if (target.length === 0) return null;
			let lastException = undefined;
			// b. For each item targetValue in target, do
			for (let i = 0; i < target.length; i++) {
				const targetValue = target[i];
				// 1. Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, targetValue, subpath, pattern, internal, conditions),
				//    continuing the loop on any Invalid Package Target error.
				let resolved;
				try {
					resolved = this.packageTargetResolve(packageURL, targetValue, subpath, pattern, internal, conditions, extList);
				} catch (e) {
					if (e.code !== 'ERR_INVALID_PACKAGE_TARGET') throw e;
					lastException = e;
					continue;
				}
				// 2. If resolved is undefined, continue the loop.
				// 3. Return resolved.
				if (resolved !== undefined) return resolved;
				if (resolved === null) {
					lastException = null;
				}
			}
			// c. Return or throw the last fallback resolution null return or error.
			if (lastException === undefined || lastException === null) return lastException;
			throw lastException;
		// 2. Otherwise, if target is a non-null Object, then
		} else if (typeof target === 'object' && target !== null) {
			const keys = Object.getOwnPropertyNames(target);
			// a. If exports contains any index property keys, as defined in ECMA-262 6.1.7 Array Index, throw an Invalid Package Configuration error.
			for (let i = 0; i < keys.length; i++) {
				const p = keys[i];
				if (isArrayIndex(p)) throw new VMError(`Invalid package configuration for '${subpath}'`, 'ERR_INVALID_PACKAGE_CONFIGURATION');
			}
			// b. For each property p of target, in object insertion order as,
			for (let i = 0; i < keys.length; i++) {
				const p = keys[i];
				// 1. If p equals "default" or conditions contains an entry for p, then
				if (p === 'default' || conditions.includes(p)) {
					// a. Let targetValue be the value of the p property in target.
					const targetValue = target[p];
					// b. Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, targetValue, subpath, pattern, internal, conditions).
					const resolved = this.packageTargetResolve(packageURL, targetValue, subpath, pattern, internal, conditions, extList);
					// c. If resolved is equal to undefined, continue the loop.
					// d. Return resolved.
					if (resolved !== undefined) return resolved;
				}
			}
			// c. Return undefined.
			return undefined;
		// 4. Otherwise, if target is null, return null.
		} else if (target == null) {
			return null;
		}
		// Otherwise throw an Invalid Package Target error.
		throw new VMError(`Invalid package target for '${subpath}'`, 'ERR_INVALID_PACKAGE_TARGET');
	}

	// PACKAGE_RESOLVE(packageSpecifier, parentURL)
	packageResolve(packageSpecifier, parentURL, conditions, extList) {
		// 1. Let packageName be undefined.
		let packageName = undefined;
		// 2. If packageSpecifier is an empty string, then
		if (packageSpecifier === '') {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 3. If packageSpecifier is a Node.js builtin module name, then
		if (this.builtins.has(packageSpecifier)) {
			// a. Return the string "node:" concatenated with packageSpecifier.
			return 'node:' + packageSpecifier;
		}
		let idx = packageSpecifier.indexOf('/');
		// 5. Otherwise,
		if (packageSpecifier[0] === '@') {
			// a. If packageSpecifier does not contain a "/" separator, then
			if (idx === -1) {
				// x. Throw an Invalid Module Specifier error.
				throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
			}
			// b. Set packageName to the substring of packageSpecifier until the second "/" separator or the end of the string.
			idx = packageSpecifier.indexOf('/', idx + 1);
		}
		// else
		// 4. If packageSpecifier does not start with "@", then
		// a. Set packageName to the substring of packageSpecifier until the first "/" separator or the end of the string.
		packageName = idx === -1 ? packageSpecifier : packageSpecifier.slice(0, idx);
		// 6. If packageName starts with "." or contains "\" or "%", then
		if (idx !== 0 && (packageName[0] === '.' || packageName.indexOf('\\') >= 0 || packageName.indexOf('%') >= 0)) {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 7. Let packageSubpath be "." concatenated with the substring of packageSpecifier from the position at the length of packageName.
		const packageSubpath = '.' + packageSpecifier.slice(packageName.length);
		// 8. If packageSubpath ends in "/", then
		if (packageSubpath[packageSubpath.length - 1] === '/') {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 9. Let selfUrl be the result of PACKAGE_SELF_RESOLVE(packageName, packageSubpath, parentURL).
		const selfUrl = this.packageSelfResolve(packageName, packageSubpath, parentURL);
		// 10. If selfUrl is not undefined, return selfUrl.
		if (selfUrl) return selfUrl;
		// 11. While parentURL is not the file system root,
		let packageURL;
		while (true) {
			// a. Let packageURL be the URL resolution of "node_modules/" concatenated with packageSpecifier, relative to parentURL.
			packageURL = this.fs.resolve(this.fs.join(parentURL, 'node_modules', packageSpecifier));
			// b. Set parentURL to the parent folder URL of parentURL.
			const parentParentURL = this.fs.dirname(parentURL);
			// c. If the folder at packageURL does not exist, then
			if (this.isPathAllowed(packageURL) && pathTestIsDirectory(this.fs, packageURL)) break;
			// 1. Continue the next loop iteration.
			if (parentParentURL === parentURL) {
				// 12. Throw a Module Not Found error.
				throw new VMError(`Cannot find module '${packageSpecifier}'`, 'ENOTFOUND');
			}
			parentURL = parentParentURL;
		}
		// d. Let pjson be the result of READ_PACKAGE_JSON(packageURL).
		const pack = this.readPackage(packageURL);
		// e. If pjson is not null and pjson.exports is not null or undefined, then
		if (pack && pack.exports) {
			// 1. Return the result of PACKAGE_EXPORTS_RESOLVE(packageURL, packageSubpath, pjson.exports, defaultConditions).
			return this.packageExportsResolve(packageURL, packageSubpath, pack.exports, conditions, extList);
		}
		// f. Otherwise, if packageSubpath is equal to ".", then
		if (packageSubpath === '.') {
			// 1. If pjson.main is a string, then
			// a. Return the URL resolution of main in packageURL.
			return this.loadAsPackage(packageSubpath, pack, extList);
		}
		// g. Otherwise,
		// 1. Return the URL resolution of packageSubpath in packageURL.
		return this.fs.join(packageURL, packageSubpath);
	}

}

exports.Resolver = Resolver;
exports.DefaultResolver = DefaultResolver;
