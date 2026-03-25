import nativeFs from "fs";
import path, { posix } from "path";
import { fileURLToPath } from "url";
import { fdir } from "fdir";
import picomatch from "picomatch";

//#region src/utils.ts
const isReadonlyArray = Array.isArray;
const isWin = process.platform === "win32";
const ONLY_PARENT_DIRECTORIES = /^(\/?\.\.)+$/;
function getPartialMatcher(patterns, options = {}) {
	const patternsCount = patterns.length;
	const patternsParts = Array(patternsCount);
	const matchers = Array(patternsCount);
	const globstarEnabled = !options.noglobstar;
	for (let i = 0; i < patternsCount; i++) {
		const parts = splitPattern(patterns[i]);
		patternsParts[i] = parts;
		const partsCount = parts.length;
		const partMatchers = Array(partsCount);
		for (let j = 0; j < partsCount; j++) partMatchers[j] = picomatch(parts[j], options);
		matchers[i] = partMatchers;
	}
	return (input) => {
		const inputParts = input.split("/");
		if (inputParts[0] === ".." && ONLY_PARENT_DIRECTORIES.test(input)) return true;
		for (let i = 0; i < patterns.length; i++) {
			const patternParts = patternsParts[i];
			const matcher = matchers[i];
			const inputPatternCount = inputParts.length;
			const minParts = Math.min(inputPatternCount, patternParts.length);
			let j = 0;
			while (j < minParts) {
				const part = patternParts[j];
				if (part.includes("/")) return true;
				const match = matcher[j](inputParts[j]);
				if (!match) break;
				if (globstarEnabled && part === "**") return true;
				j++;
			}
			if (j === inputPatternCount) return true;
		}
		return false;
	};
}
/* node:coverage ignore next 2 */
const WIN32_ROOT_DIR = /^[A-Z]:\/$/i;
const isRoot = isWin ? (p) => WIN32_ROOT_DIR.test(p) : (p) => p === "/";
function buildFormat(cwd, root, absolute) {
	if (cwd === root || root.startsWith(`${cwd}/`)) {
		if (absolute) {
			const start = isRoot(cwd) ? cwd.length : cwd.length + 1;
			return (p, isDir) => p.slice(start, isDir ? -1 : void 0) || ".";
		}
		const prefix = root.slice(cwd.length + 1);
		if (prefix) return (p, isDir) => {
			if (p === ".") return prefix;
			const result = `${prefix}/${p}`;
			return isDir ? result.slice(0, -1) : result;
		};
		return (p, isDir) => isDir && p !== "." ? p.slice(0, -1) : p;
	}
	if (absolute) return (p) => posix.relative(cwd, p) || ".";
	return (p) => posix.relative(cwd, `${root}/${p}`) || ".";
}
function buildRelative(cwd, root) {
	if (root.startsWith(`${cwd}/`)) {
		const prefix = root.slice(cwd.length + 1);
		return (p) => `${prefix}/${p}`;
	}
	return (p) => {
		const result = posix.relative(cwd, `${root}/${p}`);
		if (p.endsWith("/") && result !== "") return `${result}/`;
		return result || ".";
	};
}
const splitPatternOptions = { parts: true };
function splitPattern(path$1) {
	var _result$parts;
	const result = picomatch.scan(path$1, splitPatternOptions);
	return ((_result$parts = result.parts) === null || _result$parts === void 0 ? void 0 : _result$parts.length) ? result.parts : [path$1];
}
const ESCAPED_WIN32_BACKSLASHES = /\\(?![()[\]{}!+@])/g;
function convertPosixPathToPattern(path$1) {
	return escapePosixPath(path$1);
}
function convertWin32PathToPattern(path$1) {
	return escapeWin32Path(path$1).replace(ESCAPED_WIN32_BACKSLASHES, "/");
}
/**
* Converts a path to a pattern depending on the platform.
* Identical to {@link escapePath} on POSIX systems.
* @see {@link https://superchupu.dev/tinyglobby/documentation#convertPathToPattern}
*/
/* node:coverage ignore next 3 */
const convertPathToPattern = isWin ? convertWin32PathToPattern : convertPosixPathToPattern;
const POSIX_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}*?|]|^!|[!+@](?=\()|\\(?![()[\]{}!*+?@|]))/g;
const WIN32_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}]|^!|[!+@](?=\())/g;
const escapePosixPath = (path$1) => path$1.replace(POSIX_UNESCAPED_GLOB_SYMBOLS, "\\$&");
const escapeWin32Path = (path$1) => path$1.replace(WIN32_UNESCAPED_GLOB_SYMBOLS, "\\$&");
/**
* Escapes a path's special characters depending on the platform.
* @see {@link https://superchupu.dev/tinyglobby/documentation#escapePath}
*/
/* node:coverage ignore next */
const escapePath = isWin ? escapeWin32Path : escapePosixPath;
/**
* Checks if a pattern has dynamic parts.
*
* Has a few minor differences with [`fast-glob`](https://github.com/mrmlnc/fast-glob) for better accuracy:
*
* - Doesn't necessarily return `false` on patterns that include `\`.
* - Returns `true` if the pattern includes parentheses, regardless of them representing one single pattern or not.
* - Returns `true` for unfinished glob extensions i.e. `(h`, `+(h`.
* - Returns `true` for unfinished brace expansions as long as they include `,` or `..`.
*
* @see {@link https://superchupu.dev/tinyglobby/documentation#isDynamicPattern}
*/
function isDynamicPattern(pattern, options) {
	if ((options === null || options === void 0 ? void 0 : options.caseSensitiveMatch) === false) return true;
	const scan = picomatch.scan(pattern);
	return scan.isGlob || scan.negated;
}
function log(...tasks) {
	console.log(`[tinyglobby ${(/* @__PURE__ */ new Date()).toLocaleTimeString("es")}]`, ...tasks);
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
	if (path.isAbsolute(result.replace(ESCAPING_BACKSLASHES, ""))) result = posix.relative(escapedCwd, result);
	else result = posix.normalize(result);
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
		const potentialRoot = posix.join(cwd, parentDirectoryMatch[0].slice(i * 3));
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
		props.root = newCommonPath.length > 0 ? posix.join(cwd, ...newCommonPath) : cwd;
	}
	return result;
}
function processPatterns({ patterns = ["**/*"], ignore = [], expandDirectories = true }, cwd, props) {
	if (typeof patterns === "string") patterns = [patterns];
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
function formatPaths(paths, relative) {
	for (let i = paths.length - 1; i >= 0; i--) {
		const path$1 = paths[i];
		paths[i] = relative(path$1);
	}
	return paths;
}
function normalizeCwd(cwd) {
	if (!cwd) return process.cwd().replace(BACKSLASHES, "/");
	if (cwd instanceof URL) return fileURLToPath(cwd).replace(BACKSLASHES, "/");
	return path.resolve(cwd).replace(BACKSLASHES, "/");
}
function getCrawler(patterns, inputOptions = {}) {
	const options = process.env.TINYGLOBBY_DEBUG ? {
		...inputOptions,
		debug: true
	} : inputOptions;
	const cwd = normalizeCwd(options.cwd);
	if (options.debug) log("globbing with:", {
		patterns,
		options,
		cwd
	});
	if (Array.isArray(patterns) && patterns.length === 0) return [{
		sync: () => [],
		withPromise: async () => []
	}, false];
	const props = {
		root: cwd,
		commonPath: null,
		depthOffset: 0
	};
	const processed = processPatterns({
		...options,
		patterns
	}, cwd, props);
	if (options.debug) log("internal processing patterns:", processed);
	const matchOptions = {
		dot: options.dot,
		nobrace: options.braceExpansion === false,
		nocase: options.caseSensitiveMatch === false,
		noextglob: options.extglob === false,
		noglobstar: options.globstar === false,
		posix: true
	};
	const matcher = picomatch(processed.match, {
		...matchOptions,
		ignore: processed.ignore
	});
	const ignore = picomatch(processed.ignore, matchOptions);
	const partialMatcher = getPartialMatcher(processed.match, matchOptions);
	const format = buildFormat(cwd, props.root, options.absolute);
	const formatExclude = options.absolute ? format : buildFormat(cwd, props.root, true);
	const fdirOptions = {
		filters: [options.debug ? (p, isDirectory) => {
			const path$1 = format(p, isDirectory);
			const matches = matcher(path$1);
			if (matches) log(`matched ${path$1}`);
			return matches;
		} : (p, isDirectory) => matcher(format(p, isDirectory))],
		exclude: options.debug ? (_, p) => {
			const relativePath = formatExclude(p, true);
			const skipped = relativePath !== "." && !partialMatcher(relativePath) || ignore(relativePath);
			if (skipped) log(`skipped ${p}`);
			else log(`crawling ${p}`);
			return skipped;
		} : (_, p) => {
			const relativePath = formatExclude(p, true);
			return relativePath !== "." && !partialMatcher(relativePath) || ignore(relativePath);
		},
		fs: options.fs ? {
			readdir: options.fs.readdir || nativeFs.readdir,
			readdirSync: options.fs.readdirSync || nativeFs.readdirSync,
			realpath: options.fs.realpath || nativeFs.realpath,
			realpathSync: options.fs.realpathSync || nativeFs.realpathSync,
			stat: options.fs.stat || nativeFs.stat,
			statSync: options.fs.statSync || nativeFs.statSync
		} : void 0,
		pathSeparator: "/",
		relativePaths: true,
		resolveSymlinks: true,
		signal: options.signal
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
	const relative = cwd !== root && !options.absolute && buildRelative(cwd, props.root);
	return [new fdir(fdirOptions).crawl(root), relative];
}
async function glob(patternsOrOptions, options) {
	if (patternsOrOptions && (options === null || options === void 0 ? void 0 : options.patterns)) throw new Error("Cannot pass patterns as both an argument and an option");
	const isModern = isReadonlyArray(patternsOrOptions) || typeof patternsOrOptions === "string";
	const opts = isModern ? options : patternsOrOptions;
	const patterns = isModern ? patternsOrOptions : patternsOrOptions.patterns;
	const [crawler, relative] = getCrawler(patterns, opts);
	if (!relative) return crawler.withPromise();
	return formatPaths(await crawler.withPromise(), relative);
}
function globSync(patternsOrOptions, options) {
	if (patternsOrOptions && (options === null || options === void 0 ? void 0 : options.patterns)) throw new Error("Cannot pass patterns as both an argument and an option");
	const isModern = isReadonlyArray(patternsOrOptions) || typeof patternsOrOptions === "string";
	const opts = isModern ? options : patternsOrOptions;
	const patterns = isModern ? patternsOrOptions : patternsOrOptions.patterns;
	const [crawler, relative] = getCrawler(patterns, opts);
	if (!relative) return crawler.sync();
	return formatPaths(crawler.sync(), relative);
}

//#endregion
export { convertPathToPattern, escapePath, glob, globSync, isDynamicPattern };