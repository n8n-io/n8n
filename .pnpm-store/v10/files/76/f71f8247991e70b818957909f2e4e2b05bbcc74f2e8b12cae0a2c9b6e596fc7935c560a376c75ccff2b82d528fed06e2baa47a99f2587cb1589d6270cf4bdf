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
const node_module = __toESM(require("node:module"));
const node_path = __toESM(require("node:path"));
const eslint_import_context = __toESM(require("eslint-import-context"));
const get_tsconfig = __toESM(require("get-tsconfig"));
const is_bun_module = __toESM(require("is-bun-module"));
const stable_hash_x = __toESM(require("stable-hash-x"));
const unrs_resolver = __toESM(require("unrs-resolver"));
const node_fs = __toESM(require("node:fs"));
const debug = __toESM(require("debug"));
const tinyglobby = __toESM(require("tinyglobby"));

//#region src/constants.ts
const defaultConditionNames = [
	"types",
	"import",
	"esm2020",
	"es2020",
	"es2015",
	"require",
	"node",
	"node-addons",
	"browser",
	"default"
];
/**
* `.mts`, `.cts`, `.d.mts`, `.d.cts`, `.mjs`, `.cjs` are not included because
* `.cjs` and `.mjs` must be used explicitly
*/
const defaultExtensions = [
	".ts",
	".tsx",
	".d.ts",
	".js",
	".jsx",
	".json",
	".node"
];
const defaultExtensionAlias = {
	".js": [
		".ts",
		".tsx",
		".d.ts",
		".js"
	],
	".ts": [
		".ts",
		".d.ts",
		".js"
	],
	".jsx": [
		".tsx",
		".d.ts",
		".jsx"
	],
	".tsx": [
		".tsx",
		".d.ts",
		".jsx",
		".js"
	],
	".cjs": [
		".cts",
		".d.cts",
		".cjs"
	],
	".cts": [
		".cts",
		".d.cts",
		".cjs"
	],
	".mjs": [
		".mts",
		".d.mts",
		".mjs"
	],
	".mts": [
		".mts",
		".d.mts",
		".mjs"
	]
};
const defaultMainFields = [
	"types",
	"typings",
	"fesm2020",
	"fesm2015",
	"esm2020",
	"es2020",
	"module",
	"jsnext:main",
	"main"
];
const JS_EXT_PATTERN = /\.(?:[cm]js|jsx?)$/;
const IMPORT_RESOLVER_NAME = "eslint-import-resolver-typescript";
const interfaceVersion = 2;
const DEFAULT_TSCONFIG = "tsconfig.json";
const DEFAULT_JSCONFIG = "jsconfig.json";
const DEFAULT_CONFIGS = [DEFAULT_TSCONFIG, DEFAULT_JSCONFIG];
const DEFAULT_TRY_PATHS = ["", ...DEFAULT_CONFIGS];
const MATCH_ALL = "**";
const DEFAULT_IGNORE = [
	MATCH_ALL,
	"node_modules",
	MATCH_ALL
].join("/");
const TSCONFIG_NOT_FOUND_REGEXP = /^Tsconfig not found\b/;

//#endregion
//#region src/helpers.ts
/**
* For a scoped package, we must look in `@types/foo__bar` instead of
* `@types/@foo/bar`.
*/
function mangleScopedPackage(moduleName) {
	if (moduleName.startsWith("@")) {
		const replaceSlash = moduleName.replace("/", "__");
		if (replaceSlash !== moduleName) return replaceSlash.slice(1);
	}
	return moduleName;
}
/** Remove any trailing querystring from module id. */
function removeQuerystring(id) {
	const querystringIndex = id.lastIndexOf("?");
	if (querystringIndex !== -1) return id.slice(0, querystringIndex);
	return id;
}
const tryFile = (filename, includeDir = false, base = process.cwd()) => {
	if (typeof filename === "string") {
		const filepath = node_path.default.resolve(base, filename);
		return node_fs.default.existsSync(filepath) && (includeDir || node_fs.default.statSync(filepath).isFile()) ? filepath : "";
	}
	for (const file of filename ?? []) {
		const filepath = tryFile(file, includeDir, base);
		if (filepath) return filepath;
	}
	return "";
};
const computeAffinity = (projectDir, targetDir) => {
	const a = projectDir.split(node_path.default.sep);
	const b = targetDir.split(node_path.default.sep);
	let lca = 0;
	while (lca < a.length && lca < b.length && a[lca] === b[lca]) lca++;
	return a.length - lca + (b.length - lca);
};
const sortProjectsByAffinity = (projects, file) => {
	const fileDir = node_path.default.dirname(file);
	return projects.map((project) => ({
		project,
		affinity: computeAffinity(node_path.default.dirname(project), fileDir)
	})).sort((a, b) => a.affinity - b.affinity).map((item) => item.project);
};
const toGlobPath = (pathname) => pathname.replaceAll("\\", "/");
const toNativePath = (pathname) => "/" === node_path.default.sep ? pathname : pathname.replaceAll("/", "\\");

//#endregion
//#region src/logger.ts
const log = (0, debug.default)(IMPORT_RESOLVER_NAME);

//#endregion
//#region src/normalize-options.ts
let defaultConfigFile;
const configFileMapping = /* @__PURE__ */ new Map();
let warned;
function normalizeOptions(options, cwd = process.cwd()) {
	let { project, tsconfig, noWarnOnMultipleProjects } = options ||= {};
	let { configFile, references } = tsconfig ?? {};
	let ensured;
	if (configFile) {
		configFile = tryFile(configFile);
		ensured = true;
	} else if (project) {
		project = Array.isArray(project) ? project : [project];
		log("original projects:", ...project);
		project = project.map(toGlobPath);
		if (project.some((p) => (0, tinyglobby.isDynamicPattern)(p))) project = (0, tinyglobby.globSync)(project, {
			absolute: true,
			cwd,
			dot: true,
			expandDirectories: false,
			onlyFiles: false,
			ignore: DEFAULT_IGNORE
		});
		log("resolving projects:", ...project);
		project = project.flatMap((p) => tryFile(DEFAULT_TRY_PATHS, false, toNativePath(p)) || []);
		log("resolved projects:", ...project);
		if (project.length === 1) {
			configFile = project[0];
			ensured = true;
		}
		if (project.length <= 1) project = void 0;
		else if (!warned && !noWarnOnMultipleProjects) {
			warned = true;
			console.warn("Multiple projects found, consider using a single `tsconfig` with `references` to speed up, or use `noWarnOnMultipleProjects` to suppress this warning");
		}
	}
	if (!project && !configFile) {
		configFile = defaultConfigFile ||= tryFile(DEFAULT_CONFIGS);
		ensured = true;
	}
	const optionsHash = (0, stable_hash_x.stableHash)(options);
	const cacheKey = `${configFile}\0${optionsHash}`;
	if (configFile) {
		const cachedOptions = configFileMapping.get(cacheKey);
		if (cachedOptions) {
			log("using cached options for", configFile, "with options", options);
			return cachedOptions;
		}
	}
	if (!ensured && configFile && configFile !== defaultConfigFile) configFile = tryFile(DEFAULT_TRY_PATHS, false, configFile);
	options = {
		conditionNames: defaultConditionNames,
		extensions: defaultExtensions,
		extensionAlias: defaultExtensionAlias,
		mainFields: defaultMainFields,
		...options,
		project,
		tsconfig: configFile ? {
			references: references ?? "auto",
			configFile
		} : void 0
	};
	if (configFile) configFileMapping.set(cacheKey, options);
	return options;
}

//#endregion
//#region src/index.ts
const resolverCache = /* @__PURE__ */ new Map();
const tsconfigCache = /* @__PURE__ */ new Map();
const matcherCache = /* @__PURE__ */ new Map();
const unrsResolve = (source, file, resolver) => {
	const result = resolver.sync(node_path.default.dirname(file), source);
	if (result.path) return {
		found: true,
		path: result.path
	};
	if (result.error) {
		log("unrs-resolver error:", result.error);
		if (TSCONFIG_NOT_FOUND_REGEXP.test(result.error)) throw new Error(result.error);
	}
	return { found: false };
};
const isBun = !!process.versions.bun;
const resolve = (source, file, options, resolver) => {
	options ||= {};
	if (isBun || options.bun ? (0, is_bun_module.isBunBuiltin)(source) : (0, node_module.isBuiltin)(source)) {
		log("matched core:", source);
		return {
			found: true,
			path: null
		};
	}
	source = removeQuerystring(source);
	if (!resolver) {
		const optionsHash = (0, stable_hash_x.stableHash)(options);
		const context = (0, eslint_import_context.useRuleContext)();
		const cwd = context?.cwd || process.cwd();
		options = normalizeOptions(options, cwd);
		const cacheKey = `${optionsHash}\0${cwd}`;
		let cached = resolverCache.get(cacheKey);
		if (!cached && !options.project) resolverCache.set(cacheKey, cached = new unrs_resolver.ResolverFactory(options));
		resolver = cached;
	}
	createResolver: if (!resolver) {
		const projects = sortProjectsByAffinity(options.project, file);
		for (const tsconfigPath of projects) {
			const resolverCached = resolverCache.get(tsconfigPath);
			if (resolverCached) {
				resolver = resolverCached;
				break createResolver;
			}
			let tsconfigCached = tsconfigCache.get(tsconfigPath);
			if (!tsconfigCached) tsconfigCache.set(tsconfigPath, tsconfigCached = (0, get_tsconfig.parseTsconfig)(tsconfigPath));
			let matcherCached = matcherCache.get(tsconfigPath);
			if (!matcherCached) matcherCache.set(tsconfigPath, matcherCached = (0, get_tsconfig.createFilesMatcher)({
				config: tsconfigCached,
				path: tsconfigPath
			}));
			const tsconfig = matcherCached(file);
			if (!tsconfig) {
				log("tsconfig", tsconfigPath, "does not match", file);
				continue;
			}
			log("matched tsconfig at:", tsconfigPath, "for", file);
			options = {
				...options,
				tsconfig: {
					references: "auto",
					...options.tsconfig,
					configFile: tsconfigPath
				}
			};
			resolver = new unrs_resolver.ResolverFactory(options);
			const resolved$1 = resolve(source, file, options, resolver);
			if (resolved$1.found) {
				resolverCache.set(tsconfigPath, resolver);
				return resolved$1;
			}
		}
		log("no tsconfig matched", file, "with", ...projects, ", trying from the the nearest one instead");
		for (const project of projects) {
			const resolved$1 = resolve(source, file, {
				...options,
				project
			}, resolver);
			if (resolved$1.found) return resolved$1;
		}
	}
	if (!resolver) return { found: false };
	const resolved = unrsResolve(source, file, resolver);
	const foundPath = resolved.path;
	if ((foundPath && JS_EXT_PATTERN.test(foundPath) || options.alwaysTryTypes !== false && !foundPath) && !/^@types[/\\]/.test(source) && !node_path.default.isAbsolute(source) && !source.startsWith(".")) {
		const definitelyTyped = unrsResolve("@types/" + mangleScopedPackage(source), file, resolver);
		if (definitelyTyped.found) return definitelyTyped;
	}
	if (foundPath) log("matched path:", foundPath);
	else log("didn't find", source, "with", options.tsconfig?.configFile || options.project);
	return resolved;
};
const createTypeScriptImportResolver = (options) => {
	let cwd = process.cwd();
	options = normalizeOptions(options, cwd);
	let resolver = options.project ? void 0 : new unrs_resolver.ResolverFactory(options);
	return {
		interfaceVersion: 3,
		name: IMPORT_RESOLVER_NAME,
		resolve(source, file) {
			const context = (0, eslint_import_context.useRuleContext)();
			if (context && cwd !== context.cwd) {
				cwd = context.cwd;
				options = normalizeOptions(options, cwd);
				if (options.project) resolver = resolver ? resolver.cloneWithOptions(options) : new unrs_resolver.ResolverFactory(options);
			}
			return resolve(source, file, options, resolver);
		}
	};
};

//#endregion
exports.DEFAULT_CONFIGS = DEFAULT_CONFIGS;
exports.DEFAULT_IGNORE = DEFAULT_IGNORE;
exports.DEFAULT_JSCONFIG = DEFAULT_JSCONFIG;
exports.DEFAULT_TRY_PATHS = DEFAULT_TRY_PATHS;
exports.DEFAULT_TSCONFIG = DEFAULT_TSCONFIG;
exports.IMPORT_RESOLVER_NAME = IMPORT_RESOLVER_NAME;
exports.JS_EXT_PATTERN = JS_EXT_PATTERN;
exports.MATCH_ALL = MATCH_ALL;
exports.TSCONFIG_NOT_FOUND_REGEXP = TSCONFIG_NOT_FOUND_REGEXP;
exports.createTypeScriptImportResolver = createTypeScriptImportResolver;
exports.defaultConditionNames = defaultConditionNames;
Object.defineProperty(exports, 'defaultConfigFile', {
  enumerable: true,
  get: function () {
    return defaultConfigFile;
  }
});
exports.defaultExtensionAlias = defaultExtensionAlias;
exports.defaultExtensions = defaultExtensions;
exports.defaultMainFields = defaultMainFields;
exports.interfaceVersion = interfaceVersion;
exports.mangleScopedPackage = mangleScopedPackage;
exports.normalizeOptions = normalizeOptions;
exports.removeQuerystring = removeQuerystring;
exports.resolve = resolve;
exports.sortProjectsByAffinity = sortProjectsByAffinity;
exports.toGlobPath = toGlobPath;
exports.toNativePath = toNativePath;
exports.tryFile = tryFile;