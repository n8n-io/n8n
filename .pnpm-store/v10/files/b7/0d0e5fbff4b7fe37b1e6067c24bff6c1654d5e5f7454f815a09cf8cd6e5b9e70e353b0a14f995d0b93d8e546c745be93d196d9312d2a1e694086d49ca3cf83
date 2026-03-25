//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const path = __toESM(require("path"));
const fdir = __toESM(require("fdir"));
const picomatch = __toESM(require("picomatch"));

//#region src/utils.ts
const ONLY_PARENT_DIRECTORIES = /^(\/?\.\.)+$/;
function getPartialMatcher(patterns, options) {
	const patternsCount = patterns.length;
	const patternsParts = Array(patternsCount);
	const regexes = Array(patternsCount);
	for (let i = 0; i < patternsCount; i++) {
		const parts = splitPattern(patterns[i]);
		patternsParts[i] = parts;
		const partsCount = parts.length;
		const partRegexes = Array(partsCount);
		for (let j = 0; j < partsCount; j++) partRegexes[j] = picomatch.default.makeRe(parts[j], options);
		regexes[i] = partRegexes;
	}
	return (input) => {
		const inputParts = input.split("/");
		if (inputParts[0] === ".." && ONLY_PARENT_DIRECTORIES.test(input)) return true;
		for (let i = 0; i < patterns.length; i++) {
			const patternParts = patternsParts[i];
			const regex = regexes[i];
			const inputPatternCount = inputParts.length;
			const minParts = Math.min(inputPatternCount, patternParts.length);
			let j = 0;
			while (j < minParts) {
				const part = patternParts[j];
				if (part.includes("/")) return true;
				const match = regex[j].test(inputParts[j]);
				if (!match) break;
				if (part === "**") return true;
				j++;
			}
			if (j === inputPatternCount) return true;
		}
		return false;
	};
}
const splitPatternOptions = { parts: true };
function splitPattern(path$2) {
	var _result$parts;
	const result = picomatch.default.scan(path$2, splitPatternOptions);
	return ((_result$parts = result.parts) === null || _result$parts === void 0 ? void 0 : _result$parts.length) ? result.parts : [path$2];
}
const isWin = process.platform === "win32";
const ESCAPED_WIN32_BACKSLASHES = /\\(?![()[\]{}!+@])/g;
function convertPosixPathToPattern(path$2) {
	return escapePosixPath(path$2);
}
function convertWin32PathToPattern(path$2) {
	return escapeWin32Path(path$2).replace(ESCAPED_WIN32_BACKSLASHES, "/");
}
const convertPathToPattern = isWin ? convertWin32PathToPattern : convertPosixPathToPattern;
const POSIX_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}*?|]|^!|[!+@](?=\()|\\(?![()[\]{}!*+?@|]))/g;
const WIN32_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}]|^!|[!+@](?=\())/g;
const escapePosixPath = (path$2) => path$2.replace(POSIX_UNESCAPED_GLOB_SYMBOLS, "\\$&");
const escapeWin32Path = (path$2) => path$2.replace(WIN32_UNESCAPED_GLOB_SYMBOLS, "\\$&");
const escapePath = isWin ? escapeWin32Path : escapePosixPath;
function isDynamicPattern(pattern, options) {
	if ((options === null || options === void 0 ? void 0 : options.caseSensitiveMatch) === false) return true;
	const scan = picomatch.default.scan(pattern);
	return scan.isGlob || scan.negated;
}
function log(...tasks) {
	console.log(`[tinyglobby ${new Date().toLocaleTimeString("es")}]`, ...tasks);
}

//#endregion
//#region src/index.ts
const PARENT_DIRECTORY = /^(\/?\.\.)+/;
const ESCAPING_BACKSLASHES = /\\(?=[()[\]{}!*+?@|])/g;
const BACKSLASHES = /\\/g;
function normalizePattern(pattern, expandDirectories, cwd, props, isIgnore) {
	let result = pattern;
	if (pattern.endsWith("/")) result = pattern.slice(0, -1);
	if (!result.endsWith("*") && expandDirectories) result += "/**";
	const escapedCwd = escapePath(cwd);
	if (path.default.isAbsolute(result.replace(ESCAPING_BACKSLASHES, ""))) result = path.posix.relative(escapedCwd, result);
	else result = path.posix.normalize(result);
	const parentDirectoryMatch = PARENT_DIRECTORY.exec(result);
	const parts = splitPattern(result);
	if (parentDirectoryMatch === null || parentDirectoryMatch === void 0 ? void 0 : parentDirectoryMatch[0]) {
		const n = (parentDirectoryMatch[0].length + 1) / 3;
		let i = 0;
		const cwdParts = escapedCwd.split("/");
		while (i < n && parts[i + n] === cwdParts[cwdParts.length + i - n]) {
			result = result.slice(0, (n - i - 1) * 3) + result.slice((n - i) * 3 + parts[i + n].length + 1) || ".";
			i++;
		}
		const potentialRoot = path.posix.join(cwd, parentDirectoryMatch[0].slice(i * 3));
		if (!potentialRoot.startsWith(".") && props.root.length > potentialRoot.length) {
			props.root = potentialRoot;
			props.depthOffset = -n + i;
		}
	}
	if (!isIgnore && props.depthOffset >= 0) {
		var _props$commonPath;
		(_props$commonPath = props.commonPath) !== null && _props$commonPath !== void 0 || (props.commonPath = parts);
		const newCommonPath = [];
		const length = Math.min(props.commonPath.length, parts.length);
		for (let i = 0; i < length; i++) {
			const part = parts[i];
			if (part === "**" && !parts[i + 1]) {
				newCommonPath.pop();
				break;
			}
			if (part !== props.commonPath[i] || isDynamicPattern(part) || i === parts.length - 1) break;
			newCommonPath.push(part);
		}
		props.depthOffset = newCommonPath.length;
		props.commonPath = newCommonPath;
		props.root = newCommonPath.length > 0 ? path.default.posix.join(cwd, ...newCommonPath) : cwd;
	}
	return result;
}
function processPatterns({ patterns, ignore = [], expandDirectories = true }, cwd, props) {
	if (typeof patterns === "string") patterns = [patterns];
	else if (!patterns) patterns = ["**/*"];
	if (typeof ignore === "string") ignore = [ignore];
	const matchPatterns = [];
	const ignorePatterns = [];
	for (const pattern of ignore) {
		if (!pattern) continue;
		if (pattern[0] !== "!" || pattern[1] === "(") ignorePatterns.push(normalizePattern(pattern, expandDirectories, cwd, props, true));
	}
	for (const pattern of patterns) {
		if (!pattern) continue;
		if (pattern[0] !== "!" || pattern[1] === "(") matchPatterns.push(normalizePattern(pattern, expandDirectories, cwd, props, false));
		else if (pattern[1] !== "!" || pattern[2] === "(") ignorePatterns.push(normalizePattern(pattern.slice(1), expandDirectories, cwd, props, true));
	}
	return {
		match: matchPatterns,
		ignore: ignorePatterns
	};
}
function getRelativePath(path$2, cwd, root) {
	return path.posix.relative(cwd, `${root}/${path$2}`) || ".";
}
function processPath(path$2, cwd, root, isDirectory, absolute) {
	const relativePath = absolute ? path$2.slice(root === "/" ? 1 : root.length + 1) || "." : path$2;
	if (root === cwd) return isDirectory && relativePath !== "." ? relativePath.slice(0, -1) : relativePath;
	return getRelativePath(relativePath, cwd, root);
}
function formatPaths(paths, cwd, root) {
	for (let i = paths.length - 1; i >= 0; i--) {
		const path$2 = paths[i];
		paths[i] = getRelativePath(path$2, cwd, root) + (!path$2 || path$2.endsWith("/") ? "/" : "");
	}
	return paths;
}
function crawl(options, cwd, sync) {
	if (process.env.TINYGLOBBY_DEBUG) options.debug = true;
	if (options.debug) log("globbing with options:", options, "cwd:", cwd);
	if (Array.isArray(options.patterns) && options.patterns.length === 0) return sync ? [] : Promise.resolve([]);
	const props = {
		root: cwd,
		commonPath: null,
		depthOffset: 0
	};
	const processed = processPatterns(options, cwd, props);
	const nocase = options.caseSensitiveMatch === false;
	if (options.debug) log("internal processing patterns:", processed);
	const matcher = (0, picomatch.default)(processed.match, {
		dot: options.dot,
		nocase,
		ignore: processed.ignore
	});
	const ignore = (0, picomatch.default)(processed.ignore, {
		dot: options.dot,
		nocase
	});
	const partialMatcher = getPartialMatcher(processed.match, {
		dot: options.dot,
		nocase
	});
	const fdirOptions = {
		filters: [options.debug ? (p, isDirectory) => {
			const path$2 = processPath(p, cwd, props.root, isDirectory, options.absolute);
			const matches = matcher(path$2);
			if (matches) log(`matched ${path$2}`);
			return matches;
		} : (p, isDirectory) => matcher(processPath(p, cwd, props.root, isDirectory, options.absolute))],
		exclude: options.debug ? (_, p) => {
			const relativePath = processPath(p, cwd, props.root, true, true);
			const skipped = relativePath !== "." && !partialMatcher(relativePath) || ignore(relativePath);
			if (skipped) log(`skipped ${p}`);
			else log(`crawling ${p}`);
			return skipped;
		} : (_, p) => {
			const relativePath = processPath(p, cwd, props.root, true, true);
			return relativePath !== "." && !partialMatcher(relativePath) || ignore(relativePath);
		},
		pathSeparator: "/",
		relativePaths: true,
		resolveSymlinks: true
	};
	if (options.deep !== void 0) fdirOptions.maxDepth = Math.round(options.deep - props.depthOffset);
	if (options.absolute) {
		fdirOptions.relativePaths = false;
		fdirOptions.resolvePaths = true;
		fdirOptions.includeBasePath = true;
	}
	if (options.followSymbolicLinks === false) {
		fdirOptions.resolveSymlinks = false;
		fdirOptions.excludeSymlinks = true;
	}
	if (options.onlyDirectories) {
		fdirOptions.excludeFiles = true;
		fdirOptions.includeDirs = true;
	} else if (options.onlyFiles === false) fdirOptions.includeDirs = true;
	props.root = props.root.replace(BACKSLASHES, "");
	const root = props.root;
	if (options.debug) log("internal properties:", props);
	const api = new fdir.fdir(fdirOptions).crawl(root);
	if (cwd === root || options.absolute) return sync ? api.sync() : api.withPromise();
	return sync ? formatPaths(api.sync(), cwd, root) : api.withPromise().then((paths) => formatPaths(paths, cwd, root));
}
async function glob(patternsOrOptions, options) {
	if (patternsOrOptions && (options === null || options === void 0 ? void 0 : options.patterns)) throw new Error("Cannot pass patterns as both an argument and an option");
	const opts = Array.isArray(patternsOrOptions) || typeof patternsOrOptions === "string" ? {
		...options,
		patterns: patternsOrOptions
	} : patternsOrOptions;
	const cwd = opts.cwd ? path.default.resolve(opts.cwd).replace(BACKSLASHES, "/") : process.cwd().replace(BACKSLASHES, "/");
	return crawl(opts, cwd, false);
}
function globSync(patternsOrOptions, options) {
	if (patternsOrOptions && (options === null || options === void 0 ? void 0 : options.patterns)) throw new Error("Cannot pass patterns as both an argument and an option");
	const opts = Array.isArray(patternsOrOptions) || typeof patternsOrOptions === "string" ? {
		...options,
		patterns: patternsOrOptions
	} : patternsOrOptions;
	const cwd = opts.cwd ? path.default.resolve(opts.cwd).replace(BACKSLASHES, "/") : process.cwd().replace(BACKSLASHES, "/");
	return crawl(opts, cwd, true);
}

//#endregion
exports.convertPathToPattern = convertPathToPattern;
exports.escapePath = escapePath;
exports.glob = glob;
exports.globSync = globSync;
exports.isDynamicPattern = isDynamicPattern;