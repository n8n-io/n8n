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
let node_path = require("node:path");
node_path = __toESM(node_path);
let picomatch = require("picomatch");
picomatch = __toESM(picomatch);
let acorn = require("acorn");
acorn = __toESM(acorn);

//#region src/utils/general.ts
function toArray(array) {
	array = array || [];
	if (Array.isArray(array)) return array;
	return [array];
}

//#endregion
//#region src/utils/filter.ts
const BACKSLASH_REGEX = /\\/g;
function normalize(path) {
	return path.replace(BACKSLASH_REGEX, "/");
}
const ABSOLUTE_PATH_REGEX = /^(?:\/|(?:[A-Z]:)?[/\\|])/i;
function isAbsolute(path) {
	return ABSOLUTE_PATH_REGEX.test(path);
}
function getMatcherString(glob, cwd) {
	if (glob.startsWith("**") || isAbsolute(glob)) return normalize(glob);
	return normalize((0, node_path.resolve)(cwd, glob));
}
function patternToIdFilter(pattern) {
	if (pattern instanceof RegExp) return (id) => {
		const normalizedId = normalize(id);
		const result = pattern.test(normalizedId);
		pattern.lastIndex = 0;
		return result;
	};
	const matcher = (0, picomatch.default)(getMatcherString(pattern, process.cwd()), { dot: true });
	return (id) => {
		return matcher(normalize(id));
	};
}
function patternToCodeFilter(pattern) {
	if (pattern instanceof RegExp) return (code) => {
		const result = pattern.test(code);
		pattern.lastIndex = 0;
		return result;
	};
	return (code) => code.includes(pattern);
}
function createFilter(exclude, include) {
	if (!exclude && !include) return;
	return (input) => {
		if (exclude?.some((filter) => filter(input))) return false;
		if (include?.some((filter) => filter(input))) return true;
		return !(include && include.length > 0);
	};
}
function normalizeFilter(filter) {
	if (typeof filter === "string" || filter instanceof RegExp) return { include: [filter] };
	if (Array.isArray(filter)) return { include: filter };
	return {
		exclude: filter.exclude ? toArray(filter.exclude) : void 0,
		include: filter.include ? toArray(filter.include) : void 0
	};
}
function createIdFilter(filter) {
	if (!filter) return;
	const { exclude, include } = normalizeFilter(filter);
	const excludeFilter = exclude?.map(patternToIdFilter);
	const includeFilter = include?.map(patternToIdFilter);
	return createFilter(excludeFilter, includeFilter);
}
function createCodeFilter(filter) {
	if (!filter) return;
	const { exclude, include } = normalizeFilter(filter);
	const excludeFilter = exclude?.map(patternToCodeFilter);
	const includeFilter = include?.map(patternToCodeFilter);
	return createFilter(excludeFilter, includeFilter);
}
function createFilterForId(filter) {
	const filterFunction = createIdFilter(filter);
	return filterFunction ? (id) => !!filterFunction(id) : void 0;
}
function createFilterForTransform(idFilter, codeFilter) {
	if (!idFilter && !codeFilter) return;
	const idFilterFunction = createIdFilter(idFilter);
	const codeFilterFunction = createCodeFilter(codeFilter);
	return (id, code) => {
		let fallback = true;
		if (idFilterFunction) fallback &&= idFilterFunction(id);
		if (!fallback) return false;
		if (codeFilterFunction) fallback &&= codeFilterFunction(code);
		return fallback;
	};
}
function normalizeObjectHook(name, hook) {
	let handler;
	let filter;
	if (typeof hook === "function") handler = hook;
	else {
		handler = hook.handler;
		const hookFilter = hook.filter;
		if (name === "resolveId" || name === "load") filter = createFilterForId(hookFilter?.id);
		else filter = createFilterForTransform(hookFilter?.id, hookFilter?.code);
	}
	return {
		handler,
		filter: filter || (() => true)
	};
}

//#endregion
//#region src/utils/context.ts
function parse(code, opts = {}) {
	return acorn.Parser.parse(code, {
		sourceType: "module",
		ecmaVersion: "latest",
		locations: true,
		...opts
	});
}

//#endregion
Object.defineProperty(exports, '__toESM', {
  enumerable: true,
  get: function () {
    return __toESM;
  }
});
Object.defineProperty(exports, 'normalizeObjectHook', {
  enumerable: true,
  get: function () {
    return normalizeObjectHook;
  }
});
Object.defineProperty(exports, 'parse', {
  enumerable: true,
  get: function () {
    return parse;
  }
});
Object.defineProperty(exports, 'toArray', {
  enumerable: true,
  get: function () {
    return toArray;
  }
});