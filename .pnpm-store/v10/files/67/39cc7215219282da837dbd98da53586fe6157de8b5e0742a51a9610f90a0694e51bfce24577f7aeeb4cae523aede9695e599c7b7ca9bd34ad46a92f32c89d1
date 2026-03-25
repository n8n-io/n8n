Object.defineProperty(exports, '__esModule', { value: true });
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
const unrs_resolver = __toESM(require("unrs-resolver"));
const eslint_import_context = __toESM(require("eslint-import-context"));
const node_fs = __toESM(require("node:fs"));
const debug = __toESM(require("debug"));
const eslint = __toESM(require("eslint"));
const stable_hash_x = __toESM(require("stable-hash-x"));
const __typescript_eslint_types = __toESM(require("@typescript-eslint/types"));
const node_url = __toESM(require("node:url"));
const node_vm = __toESM(require("node:vm"));
const minimatch = __toESM(require("minimatch"));
const semver = __toESM(require("semver"));
const is_glob = __toESM(require("is-glob"));
const eslint_use_at_your_own_risk = __toESM(require("eslint/use-at-your-own-risk"));

//#region src/config/electron.ts
/** Default settings for Electron applications. */
var electron_default = { settings: { "import-x/core-modules": ["electron"] } };

//#endregion
//#region src/config/errors.ts
/**
* Unopinionated config. just the things that are necessarily runtime errors
* waiting to happen.
*/
var errors_default = {
	plugins: ["import-x"],
	rules: {
		"import-x/no-unresolved": 2,
		"import-x/named": 2,
		"import-x/namespace": 2,
		"import-x/default": 2,
		"import-x/export": 2
	}
};

//#endregion
//#region src/config/flat/electron.ts
/** Default settings for Electron applications. */
var electron_default$1 = { settings: { "import-x/core-modules": ["electron"] } };

//#endregion
//#region src/config/flat/errors.ts
/**
* Unopinionated config. just the things that are necessarily runtime errors
* waiting to happen.
*/
var errors_default$1 = { rules: {
	"import-x/no-unresolved": 2,
	"import-x/named": 2,
	"import-x/namespace": 2,
	"import-x/default": 2,
	"import-x/export": 2
} };

//#endregion
//#region src/config/flat/react-native.ts
/** Adds platform extensions to Node resolver */
var react_native_default = { settings: { "import-x/resolver": { node: { extensions: [
	".js",
	".web.js",
	".ios.js",
	".android.js"
] } } } };

//#endregion
//#region src/config/flat/react.ts
/**
* Adds `.jsx` as an extension, and enables JSX parsing.
*
* Even if _you_ aren't using JSX (or .jsx) directly, if your dependencies
* define jsnext:main and have JSX internally, you may run into problems if you
* don't enable these settings at the top level.
*/
var react_default = {
	settings: { "import-x/extensions": [
		".js",
		".jsx",
		".mjs",
		".cjs"
	] },
	languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } }
};

//#endregion
//#region src/config/flat/recommended.ts
/** The basics. */
var recommended_default = { rules: {
	"import-x/no-unresolved": "error",
	"import-x/named": "error",
	"import-x/namespace": "error",
	"import-x/default": "error",
	"import-x/export": "error",
	"import-x/no-named-as-default": "warn",
	"import-x/no-named-as-default-member": "warn",
	"import-x/no-duplicates": "warn"
} };

//#endregion
//#region src/config/flat/stage-0.ts
/**
* Rules in progress.
*
* Do not expect these to adhere to semver across releases.
*/
var stage_0_default = { rules: { "import-x/no-deprecated": 1 } };

//#endregion
//#region src/config/flat/typescript.ts
/**
* This config:
*
* 1. Adds `.jsx`, `.ts`, `.cts`, `.mts`, and `.tsx` as an extension
* 2. Enables JSX/TSX parsing
*/
const typeScriptExtensions$1 = [
	".ts",
	".tsx",
	".cts",
	".mts"
];
const allExtensions$1 = [
	...typeScriptExtensions$1,
	".js",
	".jsx",
	".cjs",
	".mjs"
];
var typescript_default = {
	settings: {
		"import-x/extensions": allExtensions$1,
		"import-x/external-module-folders": ["node_modules", "node_modules/@types"],
		"import-x/parsers": { "@typescript-eslint/parser": [...typeScriptExtensions$1] },
		"import-x/resolver": { typescript: true }
	},
	rules: { "import-x/named": "off" }
};

//#endregion
//#region src/config/flat/warnings.ts
/** More opinionated config. */
var warnings_default = { rules: {
	"import-x/no-named-as-default": 1,
	"import-x/no-named-as-default-member": 1,
	"import-x/no-rename-default": 1,
	"import-x/no-duplicates": 1
} };

//#endregion
//#region src/config/react-native.ts
/** Adds platform extensions to Node resolver */
var react_native_default$1 = { settings: { "import-x/resolver": { node: { extensions: [
	".js",
	".web.js",
	".ios.js",
	".android.js"
] } } } };

//#endregion
//#region src/config/react.ts
/**
* Adds `.jsx` as an extension, and enables JSX parsing.
*
* Even if _you_ aren't using JSX (or .jsx) directly, if your dependencies
* define jsnext:main and have JSX internally, you may run into problems if you
* don't enable these settings at the top level.
*/
var react_default$1 = {
	settings: { "import-x/extensions": [".js", ".jsx"] },
	parserOptions: { ecmaFeatures: { jsx: true } }
};

//#endregion
//#region src/config/recommended.ts
/** The basics. */
var recommended_default$1 = {
	plugins: ["import-x"],
	rules: {
		"import-x/no-unresolved": "error",
		"import-x/named": "error",
		"import-x/namespace": "error",
		"import-x/default": "error",
		"import-x/export": "error",
		"import-x/no-named-as-default": "warn",
		"import-x/no-named-as-default-member": "warn",
		"import-x/no-duplicates": "warn"
	},
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2018
	}
};

//#endregion
//#region src/config/stage-0.ts
/**
* Rules in progress.
*
* Do not expect these to adhere to semver across releases.
*/
var stage_0_default$1 = {
	plugins: ["import-x"],
	rules: { "import-x/no-deprecated": 1 }
};

//#endregion
//#region src/config/typescript.ts
/**
* This config:
*
* 1. Adds `.jsx`, `.ts`, `.cts`, `.mts`, and `.tsx` as an extension
* 2. Enables JSX/TSX parsing
*/
const typeScriptExtensions = [
	".ts",
	".tsx",
	".cts",
	".mts"
];
const allExtensions = [
	...typeScriptExtensions,
	".js",
	".jsx",
	".cjs",
	".mjs"
];
var typescript_default$1 = {
	settings: {
		"import-x/extensions": allExtensions,
		"import-x/external-module-folders": ["node_modules", "node_modules/@types"],
		"import-x/parsers": { "@typescript-eslint/parser": [...typeScriptExtensions] },
		"import-x/resolver": { typescript: true }
	},
	rules: { "import-x/named": "off" }
};

//#endregion
//#region src/config/warnings.ts
/** More opinionated config. */
var warnings_default$1 = {
	plugins: ["import-x"],
	rules: {
		"import-x/no-named-as-default": 1,
		"import-x/no-named-as-default-member": 1,
		"import-x/no-rename-default": 1,
		"import-x/no-duplicates": 1
	}
};

//#endregion
//#region src/require.ts
const importMetaUrl$1 = require("url").pathToFileURL(__filename).href;
const cjsRequire = importMetaUrl$1 ? (0, node_module.createRequire)(importMetaUrl$1) : require;

//#endregion
//#region src/meta.ts
const { name, version } = cjsRequire("../package.json");
const meta = {
	name,
	version
};

//#endregion
//#region src/node-resolver.ts
function createNodeResolver({ extensions = [
	".mjs",
	".cjs",
	".js",
	".json",
	".node"
], conditionNames = [
	"import",
	"require",
	"default"
], mainFields = ["module", "main"],...restOptions } = {}) {
	const resolver = new unrs_resolver.ResolverFactory({
		extensions,
		conditionNames,
		mainFields,
		...restOptions
	});
	return {
		interfaceVersion: 3,
		name: "eslint-plugin-import-x:node",
		resolve(modulePath, sourceFile) {
			if (node_module.default.isBuiltin(modulePath)) return {
				found: true,
				path: null
			};
			if (modulePath.startsWith("data:")) return {
				found: true,
				path: null
			};
			try {
				const resolved = resolver.sync(node_path.default.dirname(sourceFile), modulePath);
				if (resolved.path) return {
					found: true,
					path: resolved.path
				};
				return { found: false };
			} catch {
				return { found: false };
			}
		}
	};
}

//#endregion
//#region src/utils/deep-merge.ts
/**
* Check if the variable contains an object strictly rejecting arrays
*
* @returns `true` if obj is an object
*/
function isObjectNotArray(obj) {
	return typeof obj === "object" && obj != null && !Array.isArray(obj);
}
/**
* Pure function - doesn't mutate either parameter! Merges two objects together
* deeply, overwriting the properties in first with the properties in second
*
* @param first The first object
* @param second The second object
* @returns A new object
*/
function deepMerge(first = {}, second = {}) {
	const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
	return Object.fromEntries([...keys].map((key) => {
		const firstHasKey = key in first;
		const secondHasKey = key in second;
		const firstValue = first[key];
		const secondValue = second[key];
		let value;
		if (firstHasKey && secondHasKey) value = isObjectNotArray(firstValue) && isObjectNotArray(secondValue) ? deepMerge(firstValue, secondValue) : secondValue;
		else if (firstHasKey) value = firstValue;
		else value = secondValue;
		return [key, value];
	}));
}

//#endregion
//#region src/utils/apply-default.ts
/**
* Pure function - doesn't mutate either parameter! Uses the default options and
* overrides with the options provided by the user
*
* @param defaultOptions The defaults
* @param userOptions The user opts
* @returns The options with defaults
*/
function applyDefault(defaultOptions, userOptions) {
	const options = structuredClone(defaultOptions);
	if (userOptions == null) return options;
	for (const [i, opt] of options.entries()) if (userOptions[i] !== void 0) {
		const userOpt = userOptions[i];
		options[i] = isObjectNotArray(userOpt) && isObjectNotArray(opt) ? deepMerge(opt, userOpt) : userOpt;
	}
	return options;
}

//#endregion
//#region src/utils/arraify.ts
const arraify = (value) => value ? Array.isArray(value) ? value : [value] : void 0;

//#endregion
//#region src/utils/docs-url.ts
const repoUrl = "https://github.com/un-ts/eslint-plugin-import-x";
const docsUrl = (ruleName, commitish = `v${version}`) => `${repoUrl}/blob/${commitish}/docs/rules/${ruleName}.md`;

//#endregion
//#region src/utils/create-rule.ts
/**
* Creates reusable function to create rules with default options and docs URLs.
*
* @param urlCreator Creates a documentation URL for a given rule name.
* @returns Function to create a rule with the docs URL format.
*/
function RuleCreator(urlCreator) {
	return function createNamedRule({ meta: meta$1, name: name$1,...rule }) {
		return createRule_({
			meta: {
				...meta$1,
				docs: {
					...meta$1.docs,
					url: urlCreator(name$1)
				}
			},
			...rule
		});
	};
}
function createRule_({ create, defaultOptions, meta: meta$1 }) {
	return {
		create(context) {
			const optionsWithDefault = applyDefault(defaultOptions, context.options);
			return create(context, optionsWithDefault);
		},
		defaultOptions,
		meta: meta$1
	};
}
const createRule = RuleCreator(docsUrl);

//#endregion
//#region src/utils/declared-scope.ts
function declaredScope(context, node, name$1) {
	const references = context.sourceCode.getScope(node).references;
	const reference = references.find((x) => x.identifier.name === name$1);
	return reference?.resolved?.scope.type;
}

//#endregion
//#region src/utils/get-value.ts
const getValue = (node) => {
	switch (node.type) {
		case __typescript_eslint_types.TSESTree.AST_NODE_TYPES.Identifier: return node.name;
		case __typescript_eslint_types.TSESTree.AST_NODE_TYPES.Literal: return node.value;
		default: throw new Error(`Unsupported node type: ${node.type}`);
	}
};

//#endregion
//#region src/utils/ignore.ts
const log$5 = (0, debug.default)("eslint-plugin-import-x:utils:ignore");
let cachedSet;
let lastSettings;
function validExtensions(context) {
	if (cachedSet && context.settings === lastSettings) return cachedSet;
	lastSettings = context.settings;
	cachedSet = getFileExtensions(context.settings);
	return cachedSet;
}
function getFileExtensions(settings) {
	const exts = new Set(settings["import-x/extensions"] || [
		".js",
		".mjs",
		".cjs"
	]);
	if ("import-x/parsers" in settings) for (const parser in settings["import-x/parsers"]) {
		const parserSettings = settings["import-x/parsers"][parser];
		if (!Array.isArray(parserSettings)) throw new TypeError(`"settings" for ${parser} must be an array`);
		for (const ext of parserSettings) exts.add(ext);
	}
	return exts;
}
function ignore(filepath, context, skipExtensionCheck = false) {
	if (!skipExtensionCheck && !hasValidExtension(filepath, context)) return true;
	const ignoreStrings = context.settings["import-x/ignore"];
	if (!ignoreStrings?.length) return false;
	for (let i = 0, len = ignoreStrings.length; i < len; i++) {
		const ignoreString = ignoreStrings[i];
		const regex = new RegExp(ignoreString);
		if (regex.test(filepath)) {
			log$5(`ignoring ${filepath}, matched pattern /${ignoreString}/`);
			return true;
		}
	}
	return false;
}
function hasValidExtension(filepath, context) {
	return validExtensions(context).has(node_path.default.extname(filepath));
}

//#endregion
//#region src/utils/lazy-value.ts
/**
* When a value is expensive to generate, w/ this utility you can delay the
* computation until the value is needed. And once the value is computed, it
* will be cached for future calls.
*/
const lazy = (cb) => {
	let isCalled = false;
	let result;
	return () => {
		if (!isCalled) {
			isCalled = true;
			result = cb();
		}
		return result;
	};
};
function defineLazyProperty(object, propertyName, valueGetter) {
	const define = (value) => Object.defineProperty(object, propertyName, {
		value,
		enumerable: true,
		writable: true
	});
	Object.defineProperty(object, propertyName, {
		configurable: true,
		enumerable: true,
		get() {
			const result = valueGetter();
			define(result);
			return result;
		},
		set(value) {
			define(value);
		}
	});
	return object;
}

//#endregion
//#region src/utils/module-require.ts
function createModule(filename) {
	const mod = new node_module.default(filename);
	mod.filename = filename;
	mod.paths = node_module.default._nodeModulePaths(node_path.default.dirname(filename));
	return mod;
}
function moduleRequire(p) {
	try {
		const eslintPath = cjsRequire.resolve("eslint");
		const eslintModule = createModule(eslintPath);
		return cjsRequire(node_module.default._resolveFilename(p, eslintModule));
	} catch {}
	try {
		return cjsRequire.main.require(p);
	} catch {}
	return cjsRequire(p);
}

//#endregion
//#region src/utils/parse.ts
function withoutProjectParserOptions(opts) {
	const { EXPERIMENTAL_useProjectService, project, projectService,...rest } = opts;
	return rest;
}
const log$4 = (0, debug.default)("eslint-plugin-import-x:parse");
function keysFromParser(_parserPath, parserInstance, parsedResult) {
	if (parsedResult && parsedResult.visitorKeys) return parsedResult.visitorKeys;
	if (parserInstance && "VisitorKeys" in parserInstance && parserInstance.VisitorKeys) return parserInstance.VisitorKeys;
	return null;
}
function makeParseReturn(ast, visitorKeys) {
	return {
		ast,
		visitorKeys
	};
}
function stripUnicodeBOM(text) {
	return text.codePointAt(0) === 65279 ? text.slice(1) : text;
}
function transformHashbang(text) {
	return text.replace(/^#!([^\r\n]+)/u, (_, captured) => `//${captured}`);
}
function parse(path$22, content, context) {
	if (context == null) throw new Error("need context to parse properly");
	let parserOptions = context.languageOptions?.parserOptions || context.parserOptions;
	const parserOrPath = getParser(path$22, context);
	if (!parserOrPath) throw new Error("parserPath or languageOptions.parser is required!");
	parserOptions = { ...parserOptions };
	parserOptions.ecmaFeatures = { ...parserOptions.ecmaFeatures };
	parserOptions.comment = true;
	parserOptions.attachComment = true;
	parserOptions.tokens = true;
	parserOptions.loc = true;
	parserOptions.range = true;
	parserOptions.filePath = path$22;
	parserOptions = withoutProjectParserOptions(parserOptions);
	parserOptions.ecmaVersion ??= context.languageOptions?.ecmaVersion;
	parserOptions.sourceType ??= context.languageOptions?.sourceType;
	const parser = typeof parserOrPath === "string" ? moduleRequire(parserOrPath) : parserOrPath;
	content = transformHashbang(stripUnicodeBOM(String(content)));
	if ("parseForESLint" in parser && typeof parser.parseForESLint === "function") {
		let ast;
		try {
			const parserRaw = parser.parseForESLint(content, parserOptions);
			ast = parserRaw.ast;
			return makeParseReturn(ast, keysFromParser(parserOrPath, parser, parserRaw));
		} catch (error_) {
			const error = error_;
			console.warn(`Error while parsing ${parserOptions.filePath}`);
			console.warn(`Line ${error.lineNumber}, column ${error.column}: ${error.message}`);
		}
		if (!ast || typeof ast !== "object") console.warn(`\`parseForESLint\` from parser \`${typeof parserOrPath === "string" ? parserOrPath : "context.languageOptions.parser"}\` is invalid and will just be ignored`, {
			content,
			parserMeta: parser.meta
		});
		else return makeParseReturn(ast, keysFromParser(parserOrPath, parser));
	}
	if ("parse" in parser) {
		const ast = parser.parse(content, parserOptions);
		return makeParseReturn(ast, keysFromParser(parserOrPath, parser));
	}
	throw new Error("Parser must expose a `parse` or `parseForESLint` method");
}
function getParser(path$22, context) {
	const parserPath = getParserPath(path$22, context);
	if (parserPath) return parserPath;
	const parser = "languageOptions" in context && context.languageOptions?.parser;
	if (parser && typeof parser !== "string" && ("parse" in parser && typeof parse === "function" || "parseForESLint" in parser && typeof parser.parseForESLint === "function")) return parser;
	return null;
}
function getParserPath(filepath, context) {
	const parsers = context.settings["import-x/parsers"];
	if (parsers != null) {
		const extension = node_path.default.extname(filepath);
		for (const parserPath in parsers) if (parsers[parserPath].includes(extension)) {
			log$4("using alt parser:", parserPath);
			return parserPath;
		}
	}
	return context.parserPath;
}

//#endregion
//#region src/utils/pkg-up.ts
function findUp(filename, cwd) {
	let dir = node_path.default.resolve(cwd || "");
	const root = node_path.default.parse(dir).root;
	const filenames = [filename].flat();
	while (true) {
		const file = filenames.find((el) => node_fs.default.existsSync(node_path.default.resolve(dir, el)));
		if (file) return node_path.default.resolve(dir, file);
		if (dir === root) return null;
		dir = node_path.default.dirname(dir);
	}
}
function pkgUp(opts) {
	return findUp("package.json", opts && opts.cwd);
}

//#endregion
//#region src/utils/pkg-dir.ts
function pkgDir(cwd) {
	const fp = pkgUp({ cwd });
	return fp ? node_path.default.dirname(fp) : null;
}

//#endregion
//#region src/utils/legacy-resolver-settings.ts
function resolveWithLegacyResolver(resolver, config, modulePath, sourceFile) {
	if (resolver.interfaceVersion === 2) return resolver.resolve(modulePath, sourceFile, config);
	try {
		const resolved = resolver.resolveImport(modulePath, sourceFile, config);
		if (resolved === void 0) return { found: false };
		return {
			found: true,
			path: resolved
		};
	} catch {
		return { found: false };
	}
}
function normalizeConfigResolvers(resolvers, sourceFile) {
	const resolverArray = Array.isArray(resolvers) ? resolvers : [resolvers];
	const map = /* @__PURE__ */ new Map();
	for (const nameOrRecordOrObject of resolverArray) if (typeof nameOrRecordOrObject === "string") {
		const name$1 = nameOrRecordOrObject;
		map.set(name$1, {
			name: name$1,
			enable: true,
			options: void 0,
			resolver: requireResolver(name$1, sourceFile)
		});
	} else if (typeof nameOrRecordOrObject === "object") if (nameOrRecordOrObject.name && nameOrRecordOrObject.resolver) {
		const object = nameOrRecordOrObject;
		const { name: name$1, enable = true, options, resolver } = object;
		map.set(name$1, {
			name: name$1,
			enable,
			options,
			resolver
		});
	} else {
		const record = nameOrRecordOrObject;
		for (const [name$1, enableOrOptions] of Object.entries(record)) {
			const resolver = requireResolver(name$1, sourceFile);
			if (typeof enableOrOptions === "boolean") map.set(name$1, {
				name: name$1,
				enable: enableOrOptions,
				options: void 0,
				resolver
			});
			else map.set(name$1, {
				name: name$1,
				enable: true,
				options: enableOrOptions,
				resolver
			});
		}
	}
	else {
		const err = new Error("invalid resolver config");
		err.name = IMPORT_RESOLVE_ERROR_NAME;
		throw err;
	}
	return [...map.values()];
}
const LEGACY_NODE_RESOLVERS = new Set(["node", "eslint-import-resolver-node"]);
try {
	LEGACY_NODE_RESOLVERS.add(cjsRequire.resolve("eslint-import-resolver-node"));
} catch {}
function requireResolver(name$1, sourceFile) {
	const resolver = tryRequire(`eslint-import-resolver-${name$1}`, sourceFile) || tryRequire(name$1, sourceFile) || tryRequire(node_path.default.resolve(getBaseDir(sourceFile), name$1));
	if (!resolver) {
		if (LEGACY_NODE_RESOLVERS.has(name$1)) return void 0;
		const err = new Error(`unable to load resolver "${name$1}".`);
		err.name = IMPORT_RESOLVE_ERROR_NAME;
		throw err;
	}
	if (!isLegacyResolverValid(resolver)) {
		const err = new Error(`${name$1} with invalid interface loaded as resolver`);
		err.name = IMPORT_RESOLVE_ERROR_NAME;
		throw err;
	}
	return resolver;
}
function isLegacyResolverValid(resolver) {
	if ("interfaceVersion" in resolver && resolver.interfaceVersion === 2) return "resolve" in resolver && !!resolver.resolve && typeof resolver.resolve === "function";
	return "resolveImport" in resolver && !!resolver.resolveImport && typeof resolver.resolveImport === "function";
}
function tryRequire(target, sourceFile) {
	let resolved;
	try {
		if (sourceFile == null) resolved = cjsRequire.resolve(target);
		else try {
			resolved = (0, node_module.createRequire)(node_path.default.resolve(sourceFile)).resolve(target);
		} catch {
			resolved = cjsRequire.resolve(target);
		}
	} catch {
		return void 0;
	}
	return cjsRequire(resolved);
}
function getBaseDir(sourceFile) {
	return pkgDir(sourceFile) || process.cwd();
}

//#endregion
//#region src/utils/module-cache.ts
const log$3 = (0, debug.default)("eslint-plugin-import-x:utils:ModuleCache");
var ModuleCache = class {
	constructor(map = /* @__PURE__ */ new Map()) {
		this.map = map;
	}
	set(cacheKey, result) {
		this.map.set(cacheKey, {
			result,
			lastSeen: process.hrtime()
		});
		log$3("setting entry for", cacheKey);
		return result;
	}
	get(cacheKey, settings) {
		if (this.map.has(cacheKey)) {
			const f = this.map.get(cacheKey);
			if (process.hrtime(f.lastSeen)[0] < settings.lifetime) return f.result;
		} else log$3("cache miss for", cacheKey);
	}
	static getSettings(settings) {
		const cacheSettings = {
			lifetime: 30,
			...settings["import-x/cache"]
		};
		if (typeof cacheSettings.lifetime === "string" && ["∞", "Infinity"].includes(cacheSettings.lifetime)) cacheSettings.lifetime = Number.POSITIVE_INFINITY;
		return cacheSettings;
	}
};

//#endregion
//#region src/utils/resolve.ts
const importMetaUrl = require("url").pathToFileURL(__filename).href;
const _filename = importMetaUrl ? (0, node_url.fileURLToPath)(importMetaUrl) : __filename;
const _dirname = node_path.default.dirname(_filename);
const CASE_SENSITIVE_FS = !node_fs.default.existsSync(node_path.default.resolve(_dirname, node_path.default.basename(_filename).replace(/^resolve\./, "reSOLVE.")));
const IMPORT_RESOLVE_ERROR_NAME = "EslintPluginImportResolveError";
const fileExistsCache = new ModuleCache();
function fileExistsWithCaseSync(filepath, cacheSettings, strict) {
	if (CASE_SENSITIVE_FS) return true;
	if (filepath === null) return true;
	if (filepath.toLowerCase() === process.cwd().toLowerCase() && !strict) return true;
	const parsedPath = node_path.default.parse(filepath);
	const dir = parsedPath.dir;
	let result = fileExistsCache.get(filepath, cacheSettings);
	if (result != null) return result;
	if (dir === "" || parsedPath.root === filepath) result = true;
	else {
		const filenames = node_fs.default.readdirSync(dir);
		result = filenames.includes(parsedPath.base) ? fileExistsWithCaseSync(dir, cacheSettings, strict) : false;
	}
	fileExistsCache.set(filepath, result);
	return result;
}
let prevSettings = null;
let memoizedHash;
function isNamedResolver(resolver) {
	return !!(typeof resolver === "object" && resolver && "name" in resolver && typeof resolver.name === "string" && resolver.name);
}
function isValidNewResolver(resolver) {
	if (typeof resolver !== "object" || resolver == null) return false;
	if (!("resolve" in resolver) || !("interfaceVersion" in resolver)) return false;
	if (typeof resolver.interfaceVersion !== "number" || resolver.interfaceVersion !== 3) return false;
	if (typeof resolver.resolve !== "function") return false;
	return true;
}
function legacyNodeResolve(resolverOptions, context, modulePath, sourceFile) {
	const { extensions, includeCoreModules, moduleDirectory, paths, preserveSymlinks, package: packageJson, packageFilter, pathFilter, packageIterator,...rest } = resolverOptions;
	const normalizedExtensions = arraify(extensions);
	const modules = arraify(moduleDirectory);
	const symlinks = preserveSymlinks === false;
	const resolver = createNodeResolver({
		extensions: normalizedExtensions,
		builtinModules: includeCoreModules !== false,
		modules,
		symlinks,
		...rest
	});
	const resolved = (0, eslint_import_context.setRuleContext)(context, () => resolver.resolve(modulePath, sourceFile));
	if (resolved.found) return resolved;
	const normalizedPaths = arraify(paths);
	if (normalizedPaths?.length) {
		const paths$1 = modules?.length ? normalizedPaths.filter((p) => !modules.includes(p)) : normalizedPaths;
		if (paths$1.length > 0) {
			const resolver$1 = createNodeResolver({
				extensions: normalizedExtensions,
				builtinModules: includeCoreModules !== false,
				modules: paths$1,
				symlinks,
				...rest
			});
			const resolved$1 = (0, eslint_import_context.setRuleContext)(context, () => resolver$1.resolve(modulePath, sourceFile));
			if (resolved$1.found) return resolved$1;
		}
	}
	if ([
		packageJson,
		packageFilter,
		pathFilter,
		packageIterator
	].some((it) => it != null)) {
		let legacyNodeResolver;
		try {
			legacyNodeResolver = cjsRequire("eslint-import-resolver-node");
		} catch {
			throw new Error([
				"You're using legacy resolver options which are not supported by the new resolver.",
				"Please either:",
				"1. Install `eslint-import-resolver-node` as a fallback, or",
				"2. Remove legacy options: `package`, `packageFilter`, `pathFilter`, `packageIterator`"
			].join("\n"));
		}
		const resolved$1 = resolveWithLegacyResolver(legacyNodeResolver, resolverOptions, modulePath, sourceFile);
		if (resolved$1.found) return resolved$1;
	}
}
function fullResolve(modulePath, sourceFile, settings, context) {
	const coreSet = new Set(settings["import-x/core-modules"]);
	if (coreSet.has(modulePath)) return {
		found: true,
		path: null
	};
	const childContextHashKey = makeContextCacheKey(context);
	const sourceDir = node_path.default.dirname(sourceFile);
	if (prevSettings !== settings) {
		memoizedHash = (0, stable_hash_x.stableHash)(settings);
		prevSettings = settings;
	}
	const cacheKey = sourceDir + "\0" + childContextHashKey + "\0" + memoizedHash + "\0" + modulePath;
	const cacheSettings = ModuleCache.getSettings(settings);
	const cachedPath = fileExistsCache.get(cacheKey, cacheSettings);
	if (cachedPath !== void 0) return {
		found: true,
		path: cachedPath
	};
	if (settings["import-x/resolver-next"]) {
		let configResolvers = settings["import-x/resolver-next"];
		if (!Array.isArray(configResolvers)) configResolvers = [configResolvers];
		for (let i = 0, len = configResolvers.length; i < len; i++) {
			const resolver = configResolvers[i];
			const resolverName = isNamedResolver(resolver) ? resolver.name : `settings['import-x/resolver-next'][${i}]`;
			if (!isValidNewResolver(resolver)) {
				const err = new TypeError(`${resolverName} is not a valid import resolver for eslint-plugin-import-x!`);
				err.name = IMPORT_RESOLVE_ERROR_NAME;
				throw err;
			}
			const resolved = (0, eslint_import_context.setRuleContext)(context, () => resolver.resolve(modulePath, sourceFile));
			if (!resolved.found) continue;
			fileExistsCache.set(cacheKey, resolved.path);
			return resolved;
		}
	} else {
		const configResolvers = settings["import-x/resolver-legacy"] || settings["import-x/resolver"] || { node: settings["import-x/resolve"] };
		for (const { enable, name: name$1, options, resolver } of normalizeConfigResolvers(configResolvers, sourceFile)) {
			if (!enable) continue;
			if (LEGACY_NODE_RESOLVERS.has(name$1)) {
				const resolverOptions = options || {};
				const resolved$1 = legacyNodeResolve(resolverOptions, context, modulePath, sourceFile);
				if (resolved$1?.found) {
					fileExistsCache.set(cacheKey, resolved$1.path);
					return resolved$1;
				}
				if (!resolver) continue;
			}
			const resolved = (0, eslint_import_context.setRuleContext)(context, () => resolveWithLegacyResolver(resolver, options, modulePath, sourceFile));
			if (!resolved?.found) continue;
			fileExistsCache.set(cacheKey, resolved.path);
			return resolved;
		}
	}
	return { found: false };
}
function relative(modulePath, sourceFile, settings, context) {
	return fullResolve(modulePath, sourceFile, settings, context).path;
}
const erroredContexts = /* @__PURE__ */ new Set();
/**
* Given
*
* @param modulePath - Module path
* @param context - ESLint context
* @returns - The full module filesystem path; null if package is core;
*   undefined if not found
*/
function resolve(modulePath, context) {
	try {
		return relative(modulePath, context.physicalFilename, context.settings, context);
	} catch (error_) {
		const error = error_;
		if (!erroredContexts.has(context)) {
			let errMessage = error.message;
			if (error.name !== IMPORT_RESOLVE_ERROR_NAME && error.stack) errMessage = error.stack.replace(/^Error: /, "");
			context.report({
				message: `Resolve error: ${errMessage}`,
				loc: {
					line: 1,
					column: 0
				}
			});
			erroredContexts.add(context);
		}
	}
}
function importXResolverCompat(resolver, resolverOptions = {}) {
	if (isValidNewResolver(resolver)) return resolver;
	return {
		interfaceVersion: 3,
		resolve(modulePath, sourceFile) {
			return resolveWithLegacyResolver(resolver, resolverOptions, modulePath, sourceFile);
		}
	};
}

//#endregion
//#region src/utils/unambiguous.ts
const pattern = /(^|;)\s*(export|import)((\s+\w)|(\s*[*={]))|import\(/m;
/**
* Detect possible imports/exports without a full parse.
*
* A negative test means that a file is definitely _not_ a module.
*
* A positive test means it _could_ be.
*
* Not perfect, just a fast way to disqualify large non-ES6 modules and avoid a
* parse.
*/
function isMaybeUnambiguousModule(content) {
	return pattern.test(content);
}
const unambiguousNodeType = /^(?:(?:Exp|Imp)ort.*Declaration|TSExportAssignment)$/;
/** Given an AST, return true if the AST unambiguously represents a module. */
function isUnambiguousModule(ast) {
	return ast.body && ast.body.some((node) => unambiguousNodeType.test(node.type));
}

//#endregion
//#region src/utils/visit.ts
function visit(node, keys, visitorSpec) {
	if (!node || !keys) return;
	const type = node.type;
	const visitor = visitorSpec[type];
	if (typeof visitor === "function") visitor(node);
	const childFields = keys[type];
	if (!childFields) return;
	for (const fieldName of childFields) for (const item of [node[fieldName]].flat()) {
		if (!item || typeof item !== "object" || !("type" in item)) continue;
		visit(item, keys, visitorSpec);
	}
	const exit = visitorSpec[`${type}:Exit`];
	if (typeof exit === "function") exit(node);
}

//#endregion
//#region src/utils/export-map.ts
const log$2 = (0, debug.default)("eslint-plugin-import-x:ExportMap");
const exportCache = /* @__PURE__ */ new Map();
const declTypes = new Set([
	"VariableDeclaration",
	"ClassDeclaration",
	"TSDeclareFunction",
	"TSEnumDeclaration",
	"TSTypeAliasDeclaration",
	"TSInterfaceDeclaration",
	"TSAbstractClassDeclaration",
	"TSModuleDeclaration"
]);
const fixup = new Set(["deprecated", "module"]);
let parseComment_;
const parseComment = (comment) => {
	parseComment_ ??= cjsRequire("comment-parser").parse;
	const restored = `/**${comment.split(/\r?\n/).reduce((acc, line) => {
		line = line.trim();
		return line && line !== "*" ? acc + "\n  " + line : acc;
	}, "")}
  */`;
	const [doc] = parseComment_(restored);
	return {
		...doc,
		tags: doc.tags.map((t) => t.name && fixup.has(t.tag) ? {
			...t,
			description: `${t.name} ${t.description}`
		} : t)
	};
};
var ExportMap = class ExportMap {
	static for(context) {
		const filepath = context.path;
		const cacheKey = context.cacheKey;
		let exportMap = exportCache.get(cacheKey);
		const stats = lazy(() => node_fs.default.statSync(filepath));
		if (exportCache.has(cacheKey)) {
			const exportMap$1 = exportCache.get(cacheKey);
			if (exportMap$1 === null) return null;
			if (exportMap$1 != null && exportMap$1.mtime - stats().mtime.valueOf() === 0) return exportMap$1;
		}
		if (!hasValidExtension(filepath, context)) {
			exportCache.set(cacheKey, null);
			return null;
		}
		if (ignore(filepath, context, true)) {
			log$2("ignored path due to ignore settings:", filepath);
			exportCache.set(cacheKey, null);
			return null;
		}
		const content = node_fs.default.readFileSync(filepath, { encoding: "utf8" });
		if (!isMaybeUnambiguousModule(content)) {
			log$2("ignored path due to unambiguous regex:", filepath);
			exportCache.set(cacheKey, null);
			return null;
		}
		log$2("cache miss", cacheKey, "for path", filepath);
		exportMap = ExportMap.parse(filepath, content, context);
		if (exportMap === null) {
			log$2("ignored path due to ambiguous parse:", filepath);
			exportCache.set(cacheKey, null);
			return null;
		}
		exportMap.mtime = stats().mtime.valueOf();
		if (exportMap.visitorKeys) exportCache.set(cacheKey, exportMap);
		return exportMap;
	}
	static get(source, context) {
		const path$22 = resolve(source, context);
		if (path$22 == null) return null;
		return ExportMap.for(childContext(path$22, context));
	}
	static parse(filepath, content, context) {
		const m = new ExportMap(filepath);
		const tsconfig = lazy(() => (0, eslint_import_context.getTsconfigWithContext)(context));
		const isEsModuleInteropTrue = lazy(() => tsconfig()?.compilerOptions?.esModuleInterop ?? false);
		let ast;
		let visitorKeys;
		try {
			({ast, visitorKeys} = parse(filepath, content, context));
		} catch (error) {
			m.errors.push(error);
			return m;
		}
		m.visitorKeys = visitorKeys;
		let hasDynamicImports = false;
		function processDynamicImport(source$1) {
			hasDynamicImports = true;
			if (source$1.type !== "Literal") return null;
			const p = remotePath(source$1.value);
			if (p == null) return null;
			const getter = thunkFor(p, context);
			m.imports.set(p, {
				getter,
				declarations: new Set([{
					source: {
						value: source$1.value,
						loc: source$1.loc
					},
					importedSpecifiers: new Set(["ImportNamespaceSpecifier"]),
					dynamic: true
				}])
			});
		}
		visit(ast, visitorKeys, {
			ImportExpression(node) {
				processDynamicImport(node.source);
			},
			CallExpression(_node) {
				const node = _node;
				if (node.callee.type === "Import") processDynamicImport(node.arguments[0]);
			}
		});
		const unambiguouslyESM = lazy(() => isUnambiguousModule(ast));
		if (!hasDynamicImports && !unambiguouslyESM()) return null;
		const docStyles = context.settings && context.settings["import-x/docstyle"] || ["jsdoc"];
		const docStyleParsers = {};
		for (const style of docStyles) docStyleParsers[style] = availableDocStyleParsers[style];
		const namespaces = /* @__PURE__ */ new Map();
		function remotePath(value) {
			return relative(value, filepath, context.settings, context);
		}
		function resolveImport(value) {
			const rp = remotePath(value);
			if (rp == null) return null;
			return ExportMap.for(childContext(rp, context));
		}
		function getNamespace(namespace) {
			if (!namespaces.has(namespace)) return;
			return function() {
				return resolveImport(namespaces.get(namespace));
			};
		}
		function addNamespace(object, identifier) {
			const nsfn = getNamespace(getValue(identifier));
			if (nsfn) Object.defineProperty(object, "namespace", { get: nsfn });
			return object;
		}
		function processSpecifier(s, n, m$1) {
			const nsource = "source" in n && n.source && n.source.value;
			const exportMeta = {};
			let local;
			switch (s.type) {
				case "ExportDefaultSpecifier": {
					if (!nsource) return;
					local = "default";
					break;
				}
				case "ExportNamespaceSpecifier": {
					m$1.exports.set(s.exported.name, n);
					m$1.namespace.set(s.exported.name, Object.defineProperty(exportMeta, "namespace", { get() {
						return resolveImport(nsource);
					} }));
					return;
				}
				case "ExportAllDeclaration": {
					m$1.exports.set(getValue(s.exported), n);
					m$1.namespace.set(getValue(s.exported), addNamespace(exportMeta, s.exported));
					return;
				}
				case "ExportSpecifier": if (!("source" in n && n.source)) {
					m$1.exports.set(getValue(s.exported), n);
					m$1.namespace.set(getValue(s.exported), addNamespace(exportMeta, s.local));
					return;
				}
				default: {
					if ("local" in s) local = getValue(s.local);
					else throw new Error("Unknown export specifier type");
					break;
				}
			}
			if ("exported" in s) m$1.reexports.set(getValue(s.exported), {
				local,
				getImport: () => resolveImport(nsource)
			});
		}
		function captureDependencyWithSpecifiers(n) {
			const declarationIsType = "importKind" in n && (n.importKind === "type" || n.importKind === "typeof");
			let specifiersOnlyImportingTypes = n.specifiers.length > 0;
			const importedSpecifiers = /* @__PURE__ */ new Set();
			for (const specifier of n.specifiers) {
				if (specifier.type === "ImportSpecifier") importedSpecifiers.add(getValue(specifier.imported));
				else if (supportedImportTypes.has(specifier.type)) importedSpecifiers.add(specifier.type);
				specifiersOnlyImportingTypes = specifiersOnlyImportingTypes && "importKind" in specifier && (specifier.importKind === "type" || specifier.importKind === "typeof");
			}
			captureDependency(n, declarationIsType || specifiersOnlyImportingTypes, importedSpecifiers);
		}
		function captureDependency({ source: source$1 }, isOnlyImportingTypes, importedSpecifiers = /* @__PURE__ */ new Set()) {
			if (source$1 == null) return null;
			const p = remotePath(source$1.value);
			if (p == null) return null;
			const declarationMetadata = {
				source: {
					value: source$1.value,
					loc: source$1.loc
				},
				isOnlyImportingTypes,
				importedSpecifiers
			};
			const existing = m.imports.get(p);
			if (existing != null) {
				existing.declarations.add(declarationMetadata);
				return existing.getter;
			}
			const getter = thunkFor(p, context);
			m.imports.set(p, {
				getter,
				declarations: new Set([declarationMetadata])
			});
			return getter;
		}
		const source = new eslint.SourceCode({
			text: content,
			ast
		});
		for (const n of ast.body) {
			if (n.type === "ExportDefaultDeclaration") {
				const exportMeta = captureDoc(source, docStyleParsers, n);
				if (n.declaration.type === "Identifier") addNamespace(exportMeta, n.declaration);
				m.exports.set("default", n);
				m.namespace.set("default", exportMeta);
				continue;
			}
			if (n.type === "ExportAllDeclaration") {
				if (n.exported) {
					namespaces.set(n.exported.name, n.source.value);
					processSpecifier(n, n.exported, m);
				} else {
					const getter = captureDependency(n, n.exportKind === "type");
					if (getter) m.dependencies.add(getter);
				}
				continue;
			}
			if (n.type === "ImportDeclaration") {
				captureDependencyWithSpecifiers(n);
				const ns = n.specifiers.find((s) => s.type === "ImportNamespaceSpecifier");
				if (ns) namespaces.set(ns.local.name, n.source.value);
				continue;
			}
			if (n.type === "ExportNamedDeclaration") {
				captureDependencyWithSpecifiers(n);
				if (n.declaration != null) switch (n.declaration.type) {
					case "FunctionDeclaration":
					case "ClassDeclaration":
					case "TypeAlias":
					case "InterfaceDeclaration":
					case "DeclareFunction":
					case "TSDeclareFunction":
					case "TSEnumDeclaration":
					case "TSTypeAliasDeclaration":
					case "TSInterfaceDeclaration":
					case "TSAbstractClassDeclaration":
					case "TSModuleDeclaration": {
						m.exports.set(n.declaration.id.name, n);
						m.namespace.set(n.declaration.id.name, captureDoc(source, docStyleParsers, n));
						break;
					}
					case "VariableDeclaration": {
						for (const d of n.declaration.declarations) recursivePatternCapture(d.id, (id) => {
							m.exports.set(id.name, n);
							m.namespace.set(id.name, captureDoc(source, docStyleParsers, d, n));
						});
						break;
					}
					default:
				}
				for (const s of n.specifiers) processSpecifier(s, n, m);
			}
			const exports$1 = ["TSExportAssignment"];
			if (isEsModuleInteropTrue()) exports$1.push("TSNamespaceExportDeclaration");
			if (exports$1.includes(n.type)) {
				const exportedName = n.type === "TSNamespaceExportDeclaration" ? (n.id || n.name).name : "expression" in n && n.expression && ("name" in n.expression && n.expression.name || "id" in n.expression && n.expression.id && n.expression.id.name) || null;
				const getRoot = (node) => {
					if (node.left.type === "TSQualifiedName") return getRoot(node.left);
					return node.left;
				};
				const exportedDecls = ast.body.filter((node) => {
					return declTypes.has(node.type) && ("id" in node && node.id && ("name" in node.id ? node.id.name === exportedName : "left" in node.id && getRoot(node.id).name === exportedName) || "declarations" in node && node.declarations.find((d) => "name" in d.id && d.id.name === exportedName));
				});
				if (exportedDecls.length === 0) {
					m.exports.set("default", n);
					m.namespace.set("default", captureDoc(source, docStyleParsers, n));
					continue;
				}
				if (isEsModuleInteropTrue() && !m.namespace.has("default")) {
					m.exports.set("default", n);
					m.namespace.set("default", {});
				}
				for (const decl of exportedDecls) if (decl.type === "TSModuleDeclaration") {
					const type = decl.body?.type;
					if (type === "TSModuleDeclaration") {
						m.exports.set(decl.body.id.name, n);
						m.namespace.set(decl.body.id.name, captureDoc(source, docStyleParsers, decl.body));
						continue;
					} else if (type === "TSModuleBlock" && decl.kind === "namespace") {
						const metadata = captureDoc(source, docStyleParsers, decl.body);
						if ("name" in decl.id) m.namespace.set(decl.id.name, metadata);
						else m.namespace.set(decl.id.right.name, metadata);
					}
					if (decl.body?.body) for (const moduleBlockNode of decl.body.body) {
						const namespaceDecl = moduleBlockNode.type === "ExportNamedDeclaration" ? moduleBlockNode.declaration : moduleBlockNode;
						if (!namespaceDecl) {} else if (namespaceDecl.type === "VariableDeclaration") for (const d of namespaceDecl.declarations) recursivePatternCapture(d.id, (id) => {
							m.exports.set(id.name, n);
							m.namespace.set(id.name, captureDoc(source, docStyleParsers, decl, namespaceDecl, moduleBlockNode));
						});
						else if ("id" in namespaceDecl) {
							m.exports.set(namespaceDecl.id.name, n);
							m.namespace.set(namespaceDecl.id.name, captureDoc(source, docStyleParsers, moduleBlockNode));
						}
					}
				} else {
					m.exports.set("default", n);
					m.namespace.set("default", captureDoc(source, docStyleParsers, decl));
				}
			}
		}
		defineLazyProperty(m, "doc", () => {
			if (!ast.comments?.length) return;
			for (const c of ast.comments) {
				if (c.type !== "Block") continue;
				try {
					const doc = parseComment(c.value);
					if (doc.tags.some((t) => t.tag === "module")) return doc;
				} catch {}
			}
		});
		if (isEsModuleInteropTrue() && m.namespace.size > 0 && !m.namespace.has("default")) {
			m.exports.set("default", ast.body[0]);
			m.namespace.set("default", {});
		}
		const prevParseGoal = m.parseGoal;
		defineLazyProperty(m, "parseGoal", () => {
			if (prevParseGoal !== "Module" && unambiguouslyESM()) return "Module";
			return prevParseGoal;
		});
		return m;
	}
	namespace = /* @__PURE__ */ new Map();
	reexports = /* @__PURE__ */ new Map();
	/** Star-exports */
	dependencies = /* @__PURE__ */ new Set();
	/** Dependencies of this module that are not explicitly re-exported */
	imports = /* @__PURE__ */ new Map();
	exports = /* @__PURE__ */ new Map();
	errors = [];
	parseGoal = "ambiguous";
	constructor(path$22) {
		this.path = path$22;
	}
	get hasDefault() {
		return this.get("default") != null;
	}
	get size() {
		let size = this.namespace.size + this.reexports.size;
		for (const dep of this.dependencies) {
			const d = dep();
			if (d == null) continue;
			size += d.size;
		}
		return size;
	}
	/**
	* Note that this does not check explicitly re-exported names for existence in
	* the base namespace, but it will expand all `export * from '...'` exports if
	* not found in the explicit namespace.
	*
	* @returns True if `name` is exported by this module.
	*/
	has(name$1) {
		if (this.namespace.has(name$1)) return true;
		if (this.reexports.has(name$1)) return true;
		if (name$1 !== "default") for (const dep of this.dependencies) {
			const innerMap = dep();
			if (!innerMap) continue;
			if (innerMap.has(name$1)) return true;
		}
		return false;
	}
	/** Ensure that imported name fully resolves. */
	hasDeep(name$1) {
		if (this.namespace.has(name$1)) return {
			found: true,
			path: [this]
		};
		if (this.reexports.has(name$1)) {
			const reexports = this.reexports.get(name$1);
			const imported = reexports.getImport();
			if (imported == null) return {
				found: true,
				path: [this]
			};
			if (imported.path === this.path && reexports.local === name$1) return {
				found: false,
				path: [this]
			};
			const deep = imported.hasDeep(reexports.local);
			deep.path.unshift(this);
			return deep;
		}
		if (name$1 !== "default") for (const dep of this.dependencies) {
			const innerMap = dep();
			if (innerMap == null) return {
				found: true,
				path: [this]
			};
			if (!innerMap) continue;
			if (innerMap.path === this.path) continue;
			const innerValue = innerMap.hasDeep(name$1);
			if (innerValue.found) {
				innerValue.path.unshift(this);
				return innerValue;
			}
		}
		return {
			found: false,
			path: [this]
		};
	}
	get(name$1) {
		if (this.namespace.has(name$1)) return this.namespace.get(name$1);
		if (this.reexports.has(name$1)) {
			const reexports = this.reexports.get(name$1);
			const imported = reexports.getImport();
			if (imported == null) return null;
			if (imported.path === this.path && reexports.local === name$1) return void 0;
			return imported.get(reexports.local);
		}
		if (name$1 !== "default") for (const dep of this.dependencies) {
			const innerMap = dep();
			if (!innerMap) continue;
			if (innerMap.path === this.path) continue;
			const innerValue = innerMap.get(name$1);
			if (innerValue !== void 0) return innerValue;
		}
	}
	$forEach(callback, thisArg) {
		for (const [n, v] of this.namespace.entries()) callback.call(thisArg, v, n, this);
		for (const [name$1, reexports] of this.reexports.entries()) {
			const reexported = reexports.getImport();
			callback.call(thisArg, reexported?.get(reexports.local), name$1, this);
		}
		this.dependencies.forEach((dep) => {
			const d = dep();
			if (d == null) return;
			d.$forEach((v, n) => {
				if (n !== "default") callback.call(thisArg, v, n, this);
			});
		});
	}
	reportErrors(context, declaration) {
		if (!declaration.source) throw new Error("declaration.source is null");
		const msg = this.errors.map((err) => `${err.message} (${err.lineNumber}:${err.column})`).join(", ");
		context.report({
			node: declaration.source,
			message: `Parse errors in imported module '${declaration.source.value}': ${msg}`
		});
	}
};
/** Parse docs from the first node that has leading comments */
function captureDoc(source, docStyleParsers, ...nodes) {
	const metadata = {};
	defineLazyProperty(metadata, "doc", () => {
		for (let i = 0, len = nodes.length; i < len; i++) {
			const n = nodes[i];
			if (!n) continue;
			try {
				let leadingComments;
				if ("leadingComments" in n && Array.isArray(n.leadingComments)) leadingComments = n.leadingComments;
				else if (n.range) leadingComments = source.getCommentsBefore(n);
				if (!leadingComments || leadingComments.length === 0) continue;
				for (const parser of Object.values(docStyleParsers)) {
					const doc = parser(leadingComments);
					if (doc) return doc;
				}
				return;
			} catch {
				continue;
			}
		}
	});
	return metadata;
}
const availableDocStyleParsers = {
	jsdoc: captureJsDoc,
	tomdoc: captureTomDoc
};
/** Parse JSDoc from leading comments */
function captureJsDoc(comments) {
	for (let i = comments.length - 1; i >= 0; i--) {
		const comment = comments[i];
		if (comment.type !== "Block") continue;
		try {
			return parseComment(comment.value);
		} catch {}
	}
}
/** Parse TomDoc section from comments */
function captureTomDoc(comments) {
	const lines = [];
	for (const comment of comments) {
		if (/^\s*$/.test(comment.value)) break;
		lines.push(comment.value.trim());
	}
	const statusMatch = lines.join(" ").match(/^(Public|Internal|Deprecated):\s*(.+)/);
	if (statusMatch) return {
		description: statusMatch[2],
		tags: [{
			tag: statusMatch[1].toLowerCase(),
			description: statusMatch[2]
		}]
	};
}
const supportedImportTypes = new Set(["ImportDefaultSpecifier", "ImportNamespaceSpecifier"]);
/**
* The creation of this closure is isolated from other scopes to avoid
* over-retention of unrelated variables, which has caused memory leaks. See
* #1266.
*/
function thunkFor(p, context) {
	return () => ExportMap.for(childContext(p, context));
}
/**
* Traverse a pattern/identifier node, calling 'callback' for each leaf
* identifier.
*/
function recursivePatternCapture(pattern$1, callback) {
	switch (pattern$1.type) {
		case "Identifier": {
			callback(pattern$1);
			break;
		}
		case "ObjectPattern": {
			for (const p of pattern$1.properties) {
				if (p.type === "ExperimentalRestProperty" || p.type === "RestElement") {
					callback(p.argument);
					continue;
				}
				recursivePatternCapture(p.value, callback);
			}
			break;
		}
		case "ArrayPattern": {
			for (const element of pattern$1.elements) {
				if (element == null) continue;
				if (element.type === "ExperimentalRestProperty" || element.type === "RestElement") {
					callback(element.argument);
					continue;
				}
				recursivePatternCapture(element, callback);
			}
			break;
		}
		case "AssignmentPattern": {
			callback(pattern$1.left);
			break;
		}
		default:
	}
}
/**
* Don't hold full context object in memory, just grab what we need. also
* calculate a cacheKey, where parts of the cacheKey hash are memoized
*/
function childContext(path$22, context) {
	const { settings, parserOptions, parserPath, languageOptions } = context;
	return {
		cacheKey: makeContextCacheKey(context) + path$22,
		settings,
		parserOptions,
		parserPath,
		languageOptions,
		path: path$22,
		cwd: context.cwd,
		filename: context.filename,
		physicalFilename: context.physicalFilename
	};
}
function makeContextCacheKey(context) {
	const { settings, parserPath, parserOptions, languageOptions } = context;
	let hash = (0, stable_hash_x.stableHash)(settings) + (0, stable_hash_x.stableHash)(languageOptions?.parserOptions ?? parserOptions);
	if (languageOptions) hash += String(languageOptions.ecmaVersion) + String(languageOptions.sourceType);
	hash += (0, stable_hash_x.stableHash)(parserPath ?? languageOptions?.parser?.meta ?? languageOptions?.parser);
	return hash;
}

//#endregion
//#region src/utils/import-declaration.ts
const importDeclaration = (context, node) => {
	if (node.parent && node.parent.type === __typescript_eslint_types.AST_NODE_TYPES.ImportDeclaration) return node.parent;
	const ancestors = context.sourceCode.getAncestors(node);
	return ancestors[ancestors.length - 1];
};

//#endregion
//#region src/utils/read-pkg-up.ts
function stripBOM(str) {
	return str.replace(/^\uFEFF/, "");
}
function readPkgUp(opts) {
	const fp = pkgUp(opts);
	if (!fp) return {};
	try {
		return {
			pkg: JSON.parse(stripBOM(node_fs.default.readFileSync(fp, { encoding: "utf8" }))),
			path: fp
		};
	} catch {
		return {};
	}
}

//#endregion
//#region src/utils/package-path.ts
function getContextPackagePath(context) {
	return getFilePackagePath(context.physicalFilename);
}
function getFilePackagePath(filename) {
	return node_path.default.dirname(pkgUp({ cwd: filename }));
}
function getFilePackageName(filename) {
	const { pkg, path: pkgPath } = readPkgUp({ cwd: filename });
	if (pkg) return pkg.name || getFilePackageName(node_path.default.resolve(pkgPath, "../.."));
	return null;
}

//#endregion
//#region src/utils/import-type.ts
/**
* Returns the base module name.
*
* @example
*   '@scope/package' => '@scope/package'
*   '@scope/package/subpath' => '@scope/package'
*   'package' => 'package'
*   'package/subpath' => 'package'
*   'package/subpath/index.js' => 'package'
*
* @param name The name of the module to check
* @returns The base module name
*/
function baseModule(name$1) {
	if (isScoped(name$1)) {
		const [scope, pkg$1] = name$1.split("/");
		return `${scope}/${pkg$1}`;
	}
	const [pkg] = name$1.split("/");
	return pkg;
}
/**
* Check if the name is an internal module.
*
* An internal module is declared by `import-x/internal-regex` via settings.
*
* @param name The name of the module to check
* @param settings The settings of the plugin
* @returns `true` if the name is an internal module, otherwise `false`
*/
function isInternalRegexMatch(name$1, settings) {
	const internalScope = settings?.["import-x/internal-regex"];
	return internalScope && new RegExp(internalScope).test(name$1);
}
/**
* Check if the name is an absolute path.
*
* @param name The name of the module to check
* @returns `true` if the name is an absolute path, otherwise `false`
*/
function isAbsolute(name$1) {
	return typeof name$1 === "string" && node_path.default.isAbsolute(name$1);
}
/**
* Check if the name is a built-in module.
*
* A built-in module is a module that is included in Node.js by default.
*
* If `import-x/core-modules` are defined in the settings, it will also check
* against those.
*
* @example
*   'node:fs'
*   'path'
*
* @param name The name of the module to check
* @param settings The settings of the plugin
* @param modulePath The path of the module to check
* @returns `true` if the name is a built-in module, otherwise `false`
*/
function isBuiltIn(name$1, settings, modulePath) {
	if (modulePath || !name$1) return false;
	const base = baseModule(name$1);
	const extras = settings && settings["import-x/core-modules"] || [];
	return (0, node_module.isBuiltin)(base) || extras.includes(base);
}
function isExternalModule(name$1, modulePath, context) {
	return (isModule(name$1) || isScoped(name$1)) && typeTest(name$1, context, modulePath) === "external";
}
const moduleRegExp = /^\w/;
/**
* Check if the name could be a module name.
*
* This is a loose check that only checks if the name contains letters, numbers,
* and underscores. It does not check if the name is a valid module name.
*
* @example
*   'package' => true
*
*   '@scope/package' => false
*   'package/subpath' => false
*   './package' => false
*   'package-name' => false
*
* @param name The name of the module to check
* @returns `true` if the name only contains letters, numbers, and underscores,
*   otherwise `false`
*/
function isModule(name$1) {
	return !!name$1 && moduleRegExp.test(name$1);
}
const scopedRegExp = /^@[^/]+\/?[^/]+/;
/**
* Check if the name could be a scoped module name.
*
* @example
*   '@scope/package' => true
*
*   '@/components/buttons' => false
*
* @param name The name of the module to check
* @returns `true` if the name is a scoped module name, otherwise `false`
*/
function isScoped(name$1) {
	return !!name$1 && scopedRegExp.test(name$1);
}
/**
* Check if the name is a relative path to the parent module.
*
* @example
*   '..' => true
*   '../package' => true
*
*   './package' => false
*   'package' => false
*   '@scope/package' => false
*
* @param name The name of the module to check
* @returns `true` if the name is a relative path to the parent module,
*   otherwise `false`
*/
function isRelativeToParent(name$1) {
	return /^\.\.$|^\.\.[/\\]/.test(name$1);
}
const indexFiles = new Set([
	".",
	"./",
	"./index",
	"./index.js"
]);
/**
* Check if the name is an index file.
*
* @example
*   '.' => true
*   './' => true
*   './index' => true
*   './index.js' => true
*
*   otherwise => false
*
* @param name The name of the module to check
* @returns `true` if the name is an index file, otherwise `false`
*/
function isIndex(name$1) {
	return indexFiles.has(name$1);
}
/**
* Check if the name is a relative path to a sibling module.
*
* @example
*   './file.js' => true
*
*   '../file.js' => false
*   'file.js' => false
*
* @param name The name of the module to check
* @returns `true` if the name is a relative path to a sibling module, otherwise
*   `false`
*/
function isRelativeToSibling(name$1) {
	return /^\.[/\\]/.test(name$1);
}
/**
* Check if the path is an external path.
*
* An external path is a path that is outside of the package directory or the
* `import-x/external-module-folders` settings.
*
* @param filepath The path to check
* @param context The context of the rule
* @returns `true` if the path is an external path, otherwise `false`
*/
function isExternalPath(filepath, context) {
	if (!filepath) return false;
	const { settings } = context;
	const packagePath = getContextPackagePath(context);
	if (node_path.default.relative(packagePath, filepath).startsWith("..")) return true;
	const folders = settings?.["import-x/external-module-folders"] || ["node_modules"];
	return folders.some((folder) => {
		const folderPath = node_path.default.resolve(packagePath, folder);
		const relativePath = node_path.default.relative(folderPath, filepath);
		return !relativePath.startsWith("..");
	});
}
/**
* Check if the path is an internal path.
*
* An internal path is a path that is inside the package directory.
*
* @param filepath The path to check
* @param context The context of the rule
* @returns `true` if the path is an internal path, otherwise `false`
*/
function isInternalPath(filepath, context) {
	if (!filepath) return false;
	const packagePath = getContextPackagePath(context);
	return !node_path.default.relative(packagePath, filepath).startsWith("../");
}
/**
* Check if the name is an external looking name.
*
* @example
*   'glob' => true
*   '@scope/package' => true
*
* @param name The name of the module to check
* @returns `true` if the name is an external looking name, otherwise `false`
*/
function isExternalLookingName(name$1) {
	return isModule(name$1) || isScoped(name$1);
}
/**
* Returns the type of the module.
*
* @param name The name of the module to check
* @param context The context of the rule
* @param path The path of the module to check
* @returns The type of the module
*/
function typeTest(name$1, context, path$22) {
	const { settings } = context;
	if (typeof name$1 === "string") {
		if (isInternalRegexMatch(name$1, settings)) return "internal";
		if (isAbsolute(name$1)) return "absolute";
		if (isBuiltIn(name$1, settings, path$22)) return "builtin";
		if (isRelativeToParent(name$1)) return "parent";
		if (isIndex(name$1)) return "index";
		if (isRelativeToSibling(name$1)) return "sibling";
	}
	if (isExternalPath(path$22, context)) return "external";
	if (isInternalPath(path$22, context)) return "internal";
	if (typeof name$1 === "string" && isExternalLookingName(name$1)) return "external";
	return "unknown";
}
/**
* Returns the type of the module.
*
* @param name The name of the module to check
* @param context The context of the rule
* @returns The type of the module
*/
function importType(name$1, context) {
	return typeTest(name$1, context, typeof name$1 === "string" ? resolve(name$1, context) : null);
}

//#endregion
//#region src/utils/module-visitor.ts
/**
* Returns an object of node visitors that will call 'visitor' with every
* discovered module path.
*/
function moduleVisitor(visitor, options) {
	const ignore$1 = options?.ignore;
	const amd = !!options?.amd;
	const commonjs = !!options?.commonjs;
	const esmodule = !!{
		esmodule: true,
		...options
	}.esmodule;
	const ignoreRegExps = ignore$1 == null ? [] : ignore$1.map((p) => new RegExp(p));
	function checkSourceValue(source, importer) {
		if (source == null) return;
		if (ignoreRegExps.some((re) => re.test(String(source.value)))) return;
		visitor(source, importer);
	}
	function checkSource(node) {
		checkSourceValue(node.source, node);
	}
	function checkImportCall(node) {
		let modulePath;
		if (node.type === "ImportExpression") modulePath = node.source;
		else if (node.type === "CallExpression") {
			if (node.callee.type !== "Import") return;
			if (node.arguments.length !== 1) return;
			modulePath = node.arguments[0];
		} else throw new TypeError("this should be unreachable");
		if (modulePath.type !== "Literal") return;
		if (typeof modulePath.value !== "string") return;
		checkSourceValue(modulePath, node);
	}
	function checkCommon(call) {
		if (call.callee.type !== "Identifier") return;
		if (call.callee.name !== "require") return;
		if (call.arguments.length !== 1) return;
		const modulePath = call.arguments[0];
		if (modulePath.type !== "Literal") return;
		if (typeof modulePath.value !== "string") return;
		checkSourceValue(modulePath, call);
	}
	function checkAMD(call) {
		if (call.callee.type !== "Identifier") return;
		if (call.callee.name !== "require" && call.callee.name !== "define") return;
		if (call.arguments.length !== 2) return;
		const modules = call.arguments[0];
		if (modules.type !== "ArrayExpression") return;
		for (const element of modules.elements) {
			if (!element) continue;
			if (element.type !== "Literal") continue;
			if (typeof element.value !== "string") continue;
			if (element.value === "require" || element.value === "exports") continue;
			checkSourceValue(element, element);
		}
	}
	const visitors = {};
	if (esmodule) Object.assign(visitors, {
		ImportDeclaration: checkSource,
		ExportNamedDeclaration: checkSource,
		ExportAllDeclaration: checkSource,
		CallExpression: checkImportCall,
		ImportExpression: checkImportCall
	});
	if (commonjs || amd) {
		const currentCallExpression = visitors.CallExpression;
		visitors.CallExpression = function(call) {
			if (currentCallExpression) currentCallExpression(call);
			if (commonjs) checkCommon(call);
			if (amd) checkAMD(call);
		};
	}
	return visitors;
}
/**
* Make an options schema for the module visitor, optionally adding extra
* fields.
*/
function makeOptionsSchema(additionalProperties) {
	const base = {
		type: "object",
		properties: {
			commonjs: { type: "boolean" },
			amd: { type: "boolean" },
			esmodule: { type: "boolean" },
			ignore: {
				type: "array",
				minItems: 1,
				items: { type: "string" },
				uniqueItems: true
			}
		},
		additionalProperties: false
	};
	if (additionalProperties) for (const key in additionalProperties) base.properties[key] = additionalProperties[key];
	return base;
}
/**
* Json schema object for options parameter. can be used to build rule options
* schema object.
*/
const optionsSchema = makeOptionsSchema();

//#endregion
//#region src/utils/npm-client.ts
const NPM = "npm";
const NPM_CLIENTS = new Set([
	NPM,
	"yarn",
	"pnpm",
	"bun",
	"deno"
]);
let npmClient;
const getNpmClient = () => {
	if (npmClient) return npmClient;
	const client = process.env.npm_config_user_agent?.split("/")[0];
	npmClient = client && NPM_CLIENTS.has(client) ? client : NPM;
	return npmClient;
};
const getNpmInstallCommand = (packageName) => `${getNpmClient()} ${npmClient === NPM ? "i" : "add"} ${npmClient === "deno" ? `${NPM}:` : ""}${packageName}`;

//#endregion
//#region src/utils/parse-path.ts
const parsePath = (path$22) => {
	const hashIndex = path$22.indexOf("#");
	const queryIndex = path$22.indexOf("?");
	const hasHash = hashIndex !== -1;
	const hash = hasHash ? path$22.slice(hashIndex) : "";
	const hasQuery = queryIndex !== -1 && (!hasHash || queryIndex < hashIndex);
	const query = hasQuery ? path$22.slice(queryIndex, hasHash ? hashIndex : void 0) : "";
	const pathname = hasQuery ? path$22.slice(0, queryIndex) : hasHash ? path$22.slice(0, hashIndex) : path$22;
	return {
		pathname,
		query,
		hash
	};
};
const stringifyPath = ({ pathname, query, hash }) => pathname + query + hash;

//#endregion
//#region src/utils/source-type.ts
function sourceType(context) {
	if ("sourceType" in context.parserOptions) return context.parserOptions.sourceType;
	if ("languageOptions" in context && context.languageOptions) return context.languageOptions.sourceType;
}

//#endregion
//#region src/utils/static-require.ts
function isStaticRequire(node) {
	return node && node.callee && node.callee.type === "Identifier" && node.callee.name === "require" && node.arguments.length === 1 && node.arguments[0].type === "Literal" && typeof node.arguments[0].value === "string";
}

//#endregion
//#region src/rules/consistent-type-specifier-style.ts
function isComma(token) {
	return token.type === "Punctuator" && token.value === ",";
}
function removeSpecifiers(fixes, fixer, sourceCode, specifiers) {
	for (const specifier of specifiers) {
		const token = sourceCode.getTokenAfter(specifier);
		if (token && isComma(token)) fixes.push(fixer.remove(token));
		fixes.push(fixer.remove(specifier));
	}
}
function getImportText(node, sourceCode, specifiers, kind) {
	const sourceString = sourceCode.getText(node.source);
	if (specifiers.length === 0) return "";
	const names = specifiers.map((s) => {
		const importedName = getValue(s.imported);
		if (importedName === s.local.name) return importedName;
		return `${importedName} as ${s.local.name}`;
	});
	return `import ${kind} {${names.join(", ")}} from ${sourceString};`;
}
var consistent_type_specifier_style_default = createRule({
	name: "consistent-type-specifier-style",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Enforce or ban the use of inline type-only markers for named imports."
		},
		fixable: "code",
		schema: [{
			type: "string",
			enum: ["prefer-top-level", "prefer-inline"],
			default: "prefer-top-level"
		}],
		messages: {
			inline: "Prefer using inline {{kind}} specifiers instead of a top-level {{kind}}-only import.",
			topLevel: "Prefer using a top-level {{kind}}-only import instead of inline {{kind}} specifiers."
		}
	},
	defaultOptions: [],
	create(context) {
		const { sourceCode } = context;
		if (context.options[0] === "prefer-inline") return { ImportDeclaration(node) {
			if (node.importKind === "value" || node.importKind == null) return;
			if (node.specifiers.length === 0 || node.specifiers.length === 1 && (node.specifiers[0].type === "ImportDefaultSpecifier" || node.specifiers[0].type === "ImportNamespaceSpecifier")) return;
			context.report({
				node,
				messageId: "inline",
				data: { kind: node.importKind },
				fix(fixer) {
					const kindToken = sourceCode.getFirstToken(node, { skip: 1 });
					return [kindToken ? fixer.remove(kindToken) : [], node.specifiers.map((specifier) => fixer.insertTextBefore(specifier, `${node.importKind} `))].flat();
				}
			});
		} };
		return { ImportDeclaration(node) {
			if (node.importKind === "type" || node.importKind === "typeof" || node.specifiers.length === 0 || node.specifiers.length === 1 && (node.specifiers[0].type === "ImportDefaultSpecifier" || node.specifiers[0].type === "ImportNamespaceSpecifier")) return;
			const typeSpecifiers = [];
			const typeofSpecifiers = [];
			const valueSpecifiers = [];
			let defaultSpecifier = null;
			for (const specifier of node.specifiers) {
				if (specifier.type === "ImportDefaultSpecifier") {
					defaultSpecifier = specifier;
					continue;
				}
				if (!("importKind" in specifier)) continue;
				if (specifier.importKind === "type") typeSpecifiers.push(specifier);
				else if (specifier.importKind === "typeof") typeofSpecifiers.push(specifier);
				else if (specifier.importKind === "value" || specifier.importKind == null) valueSpecifiers.push(specifier);
			}
			const typeImport = getImportText(node, sourceCode, typeSpecifiers, "type");
			const typeofImport = getImportText(node, sourceCode, typeofSpecifiers, "typeof");
			const newImports = `${typeImport}\n${typeofImport}`.trim();
			if (typeSpecifiers.length + typeofSpecifiers.length === node.specifiers.length) {
				const kind = [typeSpecifiers.length > 0 ? "type" : [], typeofSpecifiers.length > 0 ? "typeof" : []].flat();
				context.report({
					node,
					messageId: "topLevel",
					data: { kind: kind.join("/") },
					fix(fixer) {
						return fixer.replaceText(node, newImports);
					}
				});
			} else for (const specifier of [...typeSpecifiers, ...typeofSpecifiers]) context.report({
				node: specifier,
				messageId: "topLevel",
				data: { kind: specifier.importKind },
				fix(fixer) {
					const fixes = [];
					if (valueSpecifiers.length > 0) {
						removeSpecifiers(fixes, fixer, sourceCode, typeSpecifiers);
						removeSpecifiers(fixes, fixer, sourceCode, typeofSpecifiers);
						const maybeComma = sourceCode.getTokenAfter(valueSpecifiers[valueSpecifiers.length - 1]);
						if (isComma(maybeComma)) fixes.push(fixer.remove(maybeComma));
					} else if (defaultSpecifier) {
						const comma = sourceCode.getTokenAfter(defaultSpecifier, isComma);
						const closingBrace = sourceCode.getTokenAfter(node.specifiers[node.specifiers.length - 1], (token) => token.type === "Punctuator" && token.value === "}");
						fixes.push(fixer.removeRange([comma.range[0], closingBrace.range[1]]));
					}
					return [...fixes, fixer.insertTextAfter(node, `\n${newImports}`)];
				}
			});
		} };
	}
});

//#endregion
//#region src/rules/default.ts
var default_default = createRule({
	name: "default",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Ensure a default export is present, given a default import."
		},
		schema: [],
		messages: { noDefaultExport: "No default export found in imported module \"{{module}}\"." }
	},
	defaultOptions: [],
	create(context) {
		function checkDefault(specifierType, node) {
			const defaultSpecifier = node.specifiers.find((specifier) => specifier.type === specifierType);
			if (!defaultSpecifier) return;
			const imports = ExportMap.get(node.source.value, context);
			if (imports == null) return;
			if (imports.errors.length > 0) imports.reportErrors(context, node);
			else if (imports.get("default") === void 0) context.report({
				node: defaultSpecifier,
				messageId: "noDefaultExport",
				data: { module: node.source.value }
			});
		}
		return {
			ImportDeclaration: checkDefault.bind(null, "ImportDefaultSpecifier"),
			ExportNamedDeclaration: checkDefault.bind(null, "ExportDefaultSpecifier")
		};
	}
});

//#endregion
//#region src/rules/dynamic-import-chunkname.ts
var dynamic_import_chunkname_default = createRule({
	name: "dynamic-import-chunkname",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Enforce a leading comment with the webpackChunkName for dynamic imports."
		},
		hasSuggestions: true,
		schema: [{
			type: "object",
			properties: {
				importFunctions: {
					type: "array",
					uniqueItems: true,
					items: { type: "string" }
				},
				allowEmpty: { type: "boolean" },
				webpackChunknameFormat: { type: "string" }
			}
		}],
		messages: {
			leadingComment: "dynamic imports require a leading comment with the webpack chunkname",
			blockComment: "dynamic imports require a /* foo */ style comment, not a // foo comment",
			paddedSpaces: "dynamic imports require a block comment padded with spaces - /* foo */",
			webpackComment: "dynamic imports require a \"webpack\" comment with valid syntax",
			chunknameFormat: "dynamic imports require a leading comment in the form /* {{format}} */",
			webpackEagerModeNoChunkName: "dynamic imports using eager mode do not need a webpackChunkName",
			webpackRemoveEagerMode: "Remove webpackMode",
			webpackRemoveChunkName: "Remove webpackChunkName"
		}
	},
	defaultOptions: [],
	create(context) {
		const { importFunctions = [], allowEmpty = false, webpackChunknameFormat = String.raw`([0-9a-zA-Z-_/.]|\[(request|index)\])+` } = context.options[0] || {};
		const paddedCommentRegex = /^ (\S[\S\s]+\S) $/;
		const commentStyleRegex = /^( (((webpackChunkName|webpackFetchPriority): .+)|((webpackPrefetch|webpackPreload): (true|false|-?\d+))|(webpackIgnore: (true|false))|((webpackInclude|webpackExclude): \/.+\/)|(webpackMode: ["'](lazy|lazy-once|eager|weak)["'])|(webpackExports: (["']\w+["']|\[(["']\w+["'], *)+(["']\w+["']*)]))),?)+ $/;
		const chunkSubstrFormat = `webpackChunkName: ["']${webpackChunknameFormat}["'],?`;
		const chunkSubstrRegex = new RegExp(chunkSubstrFormat);
		const eagerModeFormat = `webpackMode: ["']eager["'],?`;
		const eagerModeRegex = new RegExp(eagerModeFormat);
		function run(node, arg) {
			const { sourceCode } = context;
			const leadingComments = sourceCode.getCommentsBefore(arg);
			if ((!leadingComments || leadingComments.length === 0) && !allowEmpty) {
				context.report({
					node,
					messageId: "leadingComment"
				});
				return;
			}
			let isChunknamePresent = false;
			let isEagerModePresent = false;
			for (const comment of leadingComments) {
				if (comment.type !== "Block") {
					context.report({
						node,
						messageId: "blockComment"
					});
					return;
				}
				if (!paddedCommentRegex.test(comment.value)) {
					context.report({
						node,
						messageId: "paddedSpaces"
					});
					return;
				}
				try {
					node_vm.default.runInNewContext(`(function() {return {${comment.value}}})()`);
				} catch {
					context.report({
						node,
						messageId: "webpackComment"
					});
					return;
				}
				if (!commentStyleRegex.test(comment.value)) {
					context.report({
						node,
						messageId: "webpackComment"
					});
					return;
				}
				if (eagerModeRegex.test(comment.value)) isEagerModePresent = true;
				if (chunkSubstrRegex.test(comment.value)) isChunknamePresent = true;
			}
			const removeCommentsAndLeadingSpaces = (fixer, comment) => {
				const leftToken = sourceCode.getTokenBefore(comment);
				const leftComments = sourceCode.getCommentsBefore(comment);
				if (leftToken) {
					if (leftComments.length > 0) return fixer.removeRange([Math.max(leftToken.range[1], leftComments[leftComments.length - 1].range[1]), comment.range[1]]);
					return fixer.removeRange([leftToken.range[1], comment.range[1]]);
				}
				return fixer.remove(comment);
			};
			if (isChunknamePresent && isEagerModePresent) context.report({
				node,
				messageId: "webpackEagerModeNoChunkName",
				suggest: [{
					messageId: "webpackRemoveChunkName",
					fix(fixer) {
						for (const comment of leadingComments) if (chunkSubstrRegex.test(comment.value)) {
							const replacement = comment.value.replace(chunkSubstrRegex, "").trim().replace(/,$/, "");
							return replacement === "" ? removeCommentsAndLeadingSpaces(fixer, comment) : fixer.replaceText(comment, `/* ${replacement} */`);
						}
						return null;
					}
				}, {
					messageId: "webpackRemoveEagerMode",
					fix(fixer) {
						for (const comment of leadingComments) if (eagerModeRegex.test(comment.value)) {
							const replacement = comment.value.replace(eagerModeRegex, "").trim().replace(/,$/, "");
							return replacement === "" ? removeCommentsAndLeadingSpaces(fixer, comment) : fixer.replaceText(comment, `/* ${replacement} */`);
						}
						return null;
					}
				}]
			});
			if (!isChunknamePresent && !allowEmpty && !isEagerModePresent) context.report({
				node,
				messageId: "chunknameFormat",
				data: { format: chunkSubstrFormat }
			});
		}
		return {
			ImportExpression(node) {
				run(node, node.source);
			},
			CallExpression(node) {
				if (node.callee.type !== "Import" && (!("name" in node.callee) || !importFunctions.includes(node.callee.name))) return;
				run(node, node.arguments[0]);
			}
		};
	}
});

//#endregion
//#region src/rules/export.ts
const rootProgram = "root";
const tsTypePrefix = "type:";
/**
* Remove function overloads like:
*
* ```ts
* export function foo(a: number)
* export function foo(a: string)
* export function foo(a: number | string) {
*   return a
* }
* ```
*/
function removeTypescriptFunctionOverloads(nodes) {
	for (const node of nodes) {
		const declType = node.type === __typescript_eslint_types.AST_NODE_TYPES.ExportDefaultDeclaration ? node.declaration.type : node.parent?.type;
		if (declType === __typescript_eslint_types.AST_NODE_TYPES.TSDeclareFunction) nodes.delete(node);
	}
}
/**
* Detect merging Namespaces with Classes, Functions, or Enums like:
*
* ```ts
* export class Foo {}
* export namespace Foo {}
* ```
*/
function isTypescriptNamespaceMerging(nodes) {
	const types$1 = new Set(Array.from(nodes, (node) => `${node.parent.type}`));
	const noNamespaceNodes = [...nodes].filter((node) => node.parent.type !== "TSModuleDeclaration");
	return types$1.has("TSModuleDeclaration") && (types$1.size === 1 || types$1.size === 2 && (types$1.has("FunctionDeclaration") || types$1.has("TSDeclareFunction")) || types$1.size === 3 && types$1.has("FunctionDeclaration") && types$1.has("TSDeclareFunction") || types$1.size === 2 && (types$1.has("ClassDeclaration") || types$1.has("TSEnumDeclaration")) && noNamespaceNodes.length === 1);
}
/**
* Detect if a typescript namespace node should be reported as multiple export:
*
* ```ts
* export class Foo {}
* export function Foo()
* export namespace Foo {}
* ```
*/
function shouldSkipTypescriptNamespace(node, nodes) {
	const types$1 = new Set(Array.from(nodes, (node$1) => `${node$1.parent.type}`));
	return !isTypescriptNamespaceMerging(nodes) && node.parent.type === "TSModuleDeclaration" && (types$1.has("TSEnumDeclaration") || types$1.has("ClassDeclaration") || types$1.has("FunctionDeclaration") || types$1.has("TSDeclareFunction"));
}
var export_default = createRule({
	name: "export",
	meta: {
		type: "problem",
		docs: {
			category: "Helpful warnings",
			description: "Forbid any invalid exports, i.e. re-export of the same name."
		},
		schema: [],
		messages: {
			noNamed: "No named exports found in module '{{module}}'.",
			multiDefault: "Multiple default exports.",
			multiNamed: "Multiple exports of name '{{name}}'."
		}
	},
	defaultOptions: [],
	create(context) {
		const namespace = new Map([[rootProgram, /* @__PURE__ */ new Map()]]);
		function addNamed(name$1, node, parent, isType) {
			if (!namespace.has(parent)) namespace.set(parent, /* @__PURE__ */ new Map());
			const named = namespace.get(parent);
			const key = isType ? `${tsTypePrefix}${name$1}` : name$1;
			let nodes = named.get(key);
			if (nodes == null) {
				nodes = /* @__PURE__ */ new Set();
				named.set(key, nodes);
			}
			nodes.add(node);
		}
		function getParent(node) {
			if (node.parent?.type === "TSModuleBlock") return node.parent.parent;
			return rootProgram;
		}
		return {
			ExportDefaultDeclaration(node) {
				addNamed("default", node, getParent(node));
			},
			ExportSpecifier(node) {
				addNamed(getValue(node.exported), node.exported, getParent(node.parent));
			},
			ExportNamedDeclaration(node) {
				if (node.declaration == null) return;
				const parent = getParent(node);
				const isTypeVariableDecl = "kind" in node.declaration && node.declaration.kind === "type";
				if ("id" in node.declaration && node.declaration.id != null) {
					const id = node.declaration.id;
					addNamed(id.name, id, parent, ["TSTypeAliasDeclaration", "TSInterfaceDeclaration"].includes(node.declaration.type) || isTypeVariableDecl);
				}
				if ("declarations" in node.declaration && node.declaration.declarations != null) for (const declaration of node.declaration.declarations) recursivePatternCapture(declaration.id, (v) => {
					addNamed(v.name, v, parent, isTypeVariableDecl);
				});
			},
			ExportAllDeclaration(node) {
				if (node.source == null) return;
				if (node.exported && node.exported.name) return;
				const remoteExports = ExportMap.get(node.source.value, context);
				if (remoteExports == null) return;
				if (remoteExports.errors.length > 0) {
					remoteExports.reportErrors(context, node);
					return;
				}
				const parent = getParent(node);
				let any = false;
				remoteExports.$forEach((_, name$1) => {
					if (name$1 !== "default") {
						any = true;
						addNamed(name$1, node, parent);
					}
				});
				if (!any) context.report({
					node: node.source,
					messageId: "noNamed",
					data: { module: node.source.value }
				});
			},
			"Program:exit"() {
				for (const [, named] of namespace) for (const [name$1, nodes] of named) {
					if (nodes.size === 0) continue;
					removeTypescriptFunctionOverloads(nodes);
					if (nodes.size <= 1) continue;
					if (isTypescriptNamespaceMerging(nodes)) continue;
					for (const node of nodes) {
						if (shouldSkipTypescriptNamespace(node, nodes)) continue;
						if (name$1 === "default") context.report({
							node,
							messageId: "multiDefault"
						});
						else context.report({
							node,
							messageId: "multiNamed",
							data: { name: name$1.replace(tsTypePrefix, "") }
						});
					}
				}
			}
		};
	}
});

//#endregion
//#region src/rules/exports-last.ts
const findLastIndex = (array, predicate) => {
	let i = array.length - 1;
	while (i >= 0) {
		if (predicate(array[i])) return i;
		i--;
	}
	return -1;
};
function isNonExportStatement({ type }) {
	return type !== "ExportDefaultDeclaration" && type !== "ExportNamedDeclaration" && type !== "ExportAllDeclaration";
}
var exports_last_default = createRule({
	name: "exports-last",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Ensure all exports appear after other statements."
		},
		schema: [],
		messages: { end: "Export statements should appear at the end of the file" }
	},
	defaultOptions: [],
	create(context) {
		return { Program({ body }) {
			const lastNonExportStatementIndex = findLastIndex(body, isNonExportStatement);
			if (lastNonExportStatementIndex !== -1) {
				for (const node of body.slice(0, lastNonExportStatementIndex)) if (!isNonExportStatement(node)) context.report({
					node,
					messageId: "end"
				});
			}
		} };
	}
});

//#endregion
//#region src/rules/extensions.ts
const modifierValues = [
	"always",
	"ignorePackages",
	"never"
];
const modifierSchema = {
	type: "string",
	enum: [...modifierValues]
};
const modifierByFileExtensionSchema = {
	type: "object",
	patternProperties: { ".*": modifierSchema }
};
const properties = {
	type: "object",
	properties: {
		pattern: modifierByFileExtensionSchema,
		ignorePackages: { type: "boolean" },
		checkTypeImports: { type: "boolean" },
		pathGroupOverrides: {
			type: "array",
			items: {
				type: "object",
				properties: {
					pattern: { type: "string" },
					patternOptions: { type: "object" },
					action: {
						type: "string",
						enum: ["enforce", "ignore"]
					}
				},
				additionalProperties: false,
				required: ["pattern", "action"]
			}
		},
		fix: { type: "boolean" }
	}
};
function buildProperties(context) {
	const result = {
		defaultConfig: "never",
		pattern: {},
		ignorePackages: false,
		checkTypeImports: false,
		pathGroupOverrides: [],
		fix: false
	};
	for (const obj of context.options) {
		if (typeof obj === "string") {
			result.defaultConfig = obj;
			continue;
		}
		if (typeof obj !== "object" || !obj) continue;
		if ((!("pattern" in obj) || obj.pattern == null) && obj.ignorePackages == null && obj.checkTypeImports == null) {
			Object.assign(result.pattern, obj);
			continue;
		}
		if ("pattern" in obj && obj.pattern != null) Object.assign(result.pattern, obj.pattern);
		if (typeof obj.ignorePackages === "boolean") result.ignorePackages = obj.ignorePackages;
		if (typeof obj.checkTypeImports === "boolean") result.checkTypeImports = obj.checkTypeImports;
		if (obj.fix != null) result.fix = Boolean(obj.fix);
		if (Array.isArray(obj.pathGroupOverrides)) result.pathGroupOverrides = obj.pathGroupOverrides;
	}
	if (result.defaultConfig === "ignorePackages") {
		result.defaultConfig = "always";
		result.ignorePackages = true;
	}
	return result;
}
function isExternalRootModule(file) {
	if (file === "." || file === "..") return false;
	const slashCount = file.split("/").length - 1;
	return slashCount === 0 || isScoped(file) && slashCount <= 1;
}
function computeOverrideAction(pathGroupOverrides, path$22) {
	for (const { pattern: pattern$1, patternOptions, action } of pathGroupOverrides) if ((0, minimatch.minimatch)(path$22, pattern$1, patternOptions || { nocomment: true })) return action;
}
/**
* Replaces the import path in a source string with a new import path.
*
* @param source - The original source string containing the import statement.
* @param importPath - The new import path to replace the existing one.
* @returns The updated source string with the replaced import path.
*/
function replaceImportPath(source, importPath) {
	return source.replace(/^(['"])(.+)\1$/, (_, quote) => `${quote}${importPath}${quote}`);
}
var extensions_default = createRule({
	name: "extensions",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Ensure consistent use of file extension within the import path."
		},
		fixable: "code",
		hasSuggestions: true,
		schema: { anyOf: [
			{
				type: "array",
				items: [modifierSchema],
				additionalItems: false
			},
			{
				type: "array",
				items: [modifierSchema, properties],
				additionalItems: false
			},
			{
				type: "array",
				items: [properties],
				additionalItems: false
			},
			{
				type: "array",
				items: [modifierSchema, modifierByFileExtensionSchema],
				additionalItems: false
			},
			{
				type: "array",
				items: [modifierByFileExtensionSchema],
				additionalItems: false
			}
		] },
		messages: {
			missing: "Missing file extension for \"{{importPath}}\"",
			missingKnown: "Missing file extension \"{{extension}}\" for \"{{importPath}}\"",
			unexpected: "Unexpected use of file extension \"{{extension}}\" for \"{{importPath}}\"",
			addMissing: "Add \"{{extension}}\" file extension from \"{{importPath}}\" into \"{{fixedImportPath}}\"",
			removeUnexpected: "Remove unexpected \"{{extension}}\" file extension from \"{{importPath}}\" into \"{{fixedImportPath}}\""
		}
	},
	defaultOptions: [],
	create(context) {
		const props = buildProperties(context);
		function getModifier(extension) {
			return props.pattern[extension] || props.defaultConfig;
		}
		function isUseOfExtensionRequired(extension, isPackage) {
			return getModifier(extension) === "always" && (!props.ignorePackages || !isPackage);
		}
		function isUseOfExtensionForbidden(extension) {
			return getModifier(extension) === "never";
		}
		function isResolvableWithoutExtension(file) {
			const extension = node_path.default.extname(file);
			const fileWithoutExtension = file.slice(0, -extension.length);
			const resolvedFileWithoutExtension = resolve(fileWithoutExtension, context);
			return resolvedFileWithoutExtension === resolve(file, context);
		}
		return moduleVisitor((source, node) => {
			if (!source || !source.value) return;
			const importPathWithQueryString = source.value;
			const overrideAction = computeOverrideAction(props.pathGroupOverrides || [], importPathWithQueryString);
			if (overrideAction === "ignore") return;
			if (!overrideAction && isBuiltIn(importPathWithQueryString, context.settings)) return;
			const { pathname: importPath, query, hash } = parsePath(importPathWithQueryString);
			if (!overrideAction && isExternalRootModule(importPath)) return;
			const resolvedPath = resolve(importPath, context);
			const extension = node_path.default.extname(resolvedPath || importPath).slice(1);
			const isPackage = isExternalModule(importPath, resolve(importPath, context), context) || isScoped(importPath);
			if (!extension || !importPath.endsWith(`.${extension}`)) {
				if (!props.checkTypeImports && ("importKind" in node && node.importKind === "type" || "exportKind" in node && node.exportKind === "type")) return;
				const extensionRequired = isUseOfExtensionRequired(extension, !overrideAction && isPackage);
				const extensionForbidden = isUseOfExtensionForbidden(extension);
				if (extensionRequired && !extensionForbidden) {
					const fixedImportPath = stringifyPath({
						pathname: `${/([\\/]|[\\/]?\.?\.)$/.test(importPath) ? `${importPath.endsWith("/") ? importPath.slice(0, -1) : importPath}/index.${extension}` : `${importPath}.${extension}`}`,
						query,
						hash
					});
					const fixOrSuggest = { fix(fixer) {
						return fixer.replaceText(source, replaceImportPath(source.raw, fixedImportPath));
					} };
					context.report({
						node: source,
						messageId: extension ? "missingKnown" : "missing",
						data: {
							extension,
							importPath: importPathWithQueryString
						},
						...extension && (props.fix ? fixOrSuggest : { suggest: [{
							...fixOrSuggest,
							messageId: "addMissing",
							data: {
								extension,
								importPath: importPathWithQueryString,
								fixedImportPath
							}
						}] })
					});
				}
			} else if (extension && isUseOfExtensionForbidden(extension) && isResolvableWithoutExtension(importPath)) {
				const fixedPathname = importPath.slice(0, -(extension.length + 1));
				const isIndex$1 = fixedPathname.endsWith("/index");
				const fixedImportPath = stringifyPath({
					pathname: isIndex$1 ? fixedPathname.slice(0, -6) : fixedPathname,
					query,
					hash
				});
				const fixOrSuggest = { fix(fixer) {
					return fixer.replaceText(source, replaceImportPath(source.raw, fixedImportPath));
				} };
				const commonSuggestion = {
					...fixOrSuggest,
					messageId: "removeUnexpected",
					data: {
						extension,
						importPath: importPathWithQueryString,
						fixedImportPath
					}
				};
				context.report({
					node: source,
					messageId: "unexpected",
					data: {
						extension,
						importPath: importPathWithQueryString
					},
					...props.fix ? fixOrSuggest : { suggest: [commonSuggestion, isIndex$1 && {
						...commonSuggestion,
						fix(fixer) {
							return fixer.replaceText(source, replaceImportPath(source.raw, stringifyPath({
								pathname: fixedPathname,
								query,
								hash
							})));
						},
						data: {
							...commonSuggestion.data,
							fixedImportPath: stringifyPath({
								pathname: fixedPathname,
								query,
								hash
							})
						}
					}].filter(Boolean) }
				});
			}
		}, { commonjs: true });
	}
});

//#endregion
//#region src/rules/first.ts
function getImportValue(node) {
	return node.type === "ImportDeclaration" ? node.source.value : "moduleReference" in node && "expression" in node.moduleReference && "value" in node.moduleReference.expression && node.moduleReference.expression.value;
}
function isPossibleDirective(node) {
	return node.type === "ExpressionStatement" && node.expression.type === "Literal" && typeof node.expression.value === "string";
}
var first_default = createRule({
	name: "first",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Ensure all imports appear before other statements."
		},
		fixable: "code",
		schema: [{
			type: "string",
			enum: ["absolute-first", "disable-absolute-first"]
		}],
		messages: {
			absolute: "Absolute imports should come before relative imports.",
			order: "Import in body of module; reorder to top."
		}
	},
	defaultOptions: [],
	create(context) {
		return { Program(n) {
			const body = n.body;
			if (!body?.length) return;
			const absoluteFirst = context.options[0] === "absolute-first";
			const { sourceCode } = context;
			const originSourceCode = sourceCode.getText();
			let nonImportCount = 0;
			let anyExpressions = false;
			let anyRelative = false;
			let lastLegalImp = null;
			const errorInfos = [];
			let shouldSort = true;
			let lastSortNodesIndex = 0;
			for (const [index, node] of body.entries()) {
				if (!anyExpressions && isPossibleDirective(node)) continue;
				anyExpressions = true;
				if (node.type === "ImportDeclaration" || node.type === "TSImportEqualsDeclaration") {
					if (absoluteFirst) {
						const importValue = getImportValue(node);
						if (typeof importValue === "string" && /^\./.test(importValue)) anyRelative = true;
						else if (anyRelative) context.report({
							node: node.type === "ImportDeclaration" ? node.source : node.moduleReference,
							messageId: "absolute"
						});
					}
					if (nonImportCount > 0) {
						/** @see https://eslint.org/docs/next/use/migrate-to-9.0.0#-removed-multiple-context-methods */
						for (const variable of sourceCode.getDeclaredVariables(node)) {
							if (!shouldSort) break;
							for (const reference of variable.references) if (reference.identifier.range[0] < node.range[1]) {
								shouldSort = false;
								break;
							}
						}
						if (shouldSort) lastSortNodesIndex = errorInfos.length;
						errorInfos.push({
							node,
							range: [body[index - 1].range[1], node.range[1]]
						});
					} else lastLegalImp = node;
				} else nonImportCount++;
			}
			if (errorInfos.length === 0) return;
			for (const [index, { node }] of errorInfos.entries()) {
				let fix;
				if (index < lastSortNodesIndex) fix = (fixer) => fixer.insertTextAfter(node, "");
				else if (index === lastSortNodesIndex) {
					const sortNodes = errorInfos.slice(0, lastSortNodesIndex + 1);
					fix = (fixer) => {
						const removeFixers = sortNodes.map(({ range: range$1 }) => fixer.removeRange(range$1));
						const range = [0, removeFixers[removeFixers.length - 1].range[1]];
						let insertSourceCode = sortNodes.map(({ range: range$1 }) => {
							const nodeSourceCode = originSourceCode.slice(...range$1);
							if (/\S/.test(nodeSourceCode[0])) return `\n${nodeSourceCode}`;
							return nodeSourceCode;
						}).join("");
						let replaceSourceCode = "";
						if (!lastLegalImp) insertSourceCode = insertSourceCode.trim() + insertSourceCode.match(/^(\s+)/)[0];
						const insertFixer = lastLegalImp ? fixer.insertTextAfter(lastLegalImp, insertSourceCode) : fixer.insertTextBefore(body[0], insertSourceCode);
						const fixers = [insertFixer, ...removeFixers];
						for (const [i, computedFixer] of fixers.entries()) replaceSourceCode += originSourceCode.slice(fixers[i - 1] ? fixers[i - 1].range[1] : 0, computedFixer.range[0]) + computedFixer.text;
						return fixer.replaceTextRange(range, replaceSourceCode);
					};
				}
				context.report({
					node,
					messageId: "order",
					fix
				});
			}
		} };
	}
});

//#endregion
//#region src/rules/group-exports.ts
/**
* Returns an array with names of the properties in the accessor chain for
* MemberExpression nodes
*
* Example:
*
* `module.exports = {}` => ['module', 'exports']
*
* `module.exports.property = true` => ['module', 'exports', 'property']
*/
function accessorChain(node) {
	const chain = [];
	let exp = node;
	do {
		if ("name" in exp.property) chain.unshift(exp.property.name);
		else if ("value" in exp.property) chain.unshift(exp.property.value);
		if (exp.object.type === "Identifier") {
			chain.unshift(exp.object.name);
			break;
		}
		exp = exp.object;
	} while (exp.type === "MemberExpression");
	return chain;
}
var group_exports_default = createRule({
	name: "group-exports",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Prefer named exports to be grouped together in a single export declaration."
		},
		schema: [],
		messages: {
			ExportNamedDeclaration: "Multiple named export declarations; consolidate all named exports into a single export declaration",
			AssignmentExpression: "Multiple CommonJS exports; consolidate all exports into a single assignment to `module.exports`"
		}
	},
	defaultOptions: [],
	create(context) {
		const nodes = {
			modules: {
				set: /* @__PURE__ */ new Set(),
				sources: {}
			},
			types: {
				set: /* @__PURE__ */ new Set(),
				sources: {}
			},
			commonjs: { set: /* @__PURE__ */ new Set() }
		};
		return {
			ExportNamedDeclaration(node) {
				const target = node.exportKind === "type" ? nodes.types : nodes.modules;
				if (!node.source) target.set.add(node);
				else if (Array.isArray(target.sources[node.source.value])) target.sources[node.source.value].push(node);
				else target.sources[node.source.value] = [node];
			},
			AssignmentExpression(node) {
				if (node.left.type !== "MemberExpression") return;
				const chain = accessorChain(node.left);
				if (chain[0] === "module" && chain[1] === "exports" && chain.length <= 3) {
					nodes.commonjs.set.add(node);
					return;
				}
				if (chain[0] === "exports" && chain.length === 2) {
					nodes.commonjs.set.add(node);
					return;
				}
			},
			"Program:exit"() {
				if (nodes.modules.set.size > 1) for (const node of nodes.modules.set) context.report({
					node,
					messageId: node.type
				});
				for (const node of Object.values(nodes.modules.sources).filter((nodesWithSource) => Array.isArray(nodesWithSource) && nodesWithSource.length > 1).flat()) context.report({
					node,
					messageId: node.type
				});
				if (nodes.types.set.size > 1) for (const node of nodes.types.set) context.report({
					node,
					messageId: node.type
				});
				for (const node of Object.values(nodes.types.sources).filter((nodesWithSource) => Array.isArray(nodesWithSource) && nodesWithSource.length > 1).flat()) context.report({
					node,
					messageId: node.type
				});
				if (nodes.commonjs.set.size > 1) for (const node of nodes.commonjs.set) context.report({
					node,
					messageId: node.type
				});
			}
		};
	}
});

//#endregion
//#region src/rules/imports-first.ts
var imports_first_default = createRule({
	...first_default,
	name: "imports-first",
	meta: {
		...first_default.meta,
		deprecated: {
			message: "Replaced by `import-x/first`.",
			url: "https://github.com/import-js/eslint-plugin-import/blob/main/CHANGELOG.md#changed-24",
			deprecatedSince: "2.0.0",
			replacedBy: [{
				message: "Replaced by `import-x/first`.",
				rule: {
					name: "first",
					url: docsUrl("first")
				}
			}]
		},
		docs: {
			category: "Style guide",
			description: "Replaced by `import-x/first`."
		}
	}
});

//#endregion
//#region src/rules/max-dependencies.ts
var max_dependencies_default = createRule({
	name: "max-dependencies",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Enforce the maximum number of dependencies a module can have."
		},
		schema: [{
			type: "object",
			properties: {
				max: { type: "number" },
				ignoreTypeImports: { type: "boolean" }
			},
			additionalProperties: false
		}],
		messages: { max: "Maximum number of dependencies ({{max}}) exceeded." }
	},
	defaultOptions: [],
	create(context) {
		const { ignoreTypeImports } = context.options[0] || {};
		const dependencies = /* @__PURE__ */ new Set();
		let lastNode;
		return {
			"Program:exit"() {
				const { max = 10 } = context.options[0] || {};
				if (dependencies.size <= max) return;
				context.report({
					node: lastNode,
					messageId: "max",
					data: { max }
				});
			},
			...moduleVisitor((source, node) => {
				if ("importKind" in node && node.importKind !== "type" || !ignoreTypeImports) dependencies.add(source.value);
				lastNode = source;
			}, { commonjs: true })
		};
	}
});

//#endregion
//#region src/rules/named.ts
var named_default = createRule({
	name: "named",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Ensure named imports correspond to a named export in the remote file."
		},
		schema: [{
			type: "object",
			properties: { commonjs: { type: "boolean" } },
			additionalProperties: false
		}],
		messages: {
			notFound: "{{name}} not found in '{{path}}'",
			notFoundDeep: "{{name}} not found via {{deepPath}}"
		}
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		function checkSpecifiers(key, type, node) {
			if (node.source == null || "importKind" in node && (node.importKind === "type" || node.importKind === "typeof") || "exportKind" in node && node.exportKind === "type") return;
			if (!node.specifiers.some((im) => im.type === type)) return;
			const imports = ExportMap.get(node.source.value, context);
			if (imports == null || imports.parseGoal === "ambiguous") return;
			if (imports.errors.length > 0) {
				imports.reportErrors(context, node);
				return;
			}
			for (const im of node.specifiers) {
				if (im.type !== type || "importKind" in im && (im.importKind === "type" || im.importKind === "typeof")) continue;
				/** @see im is @see TSESTree.ExportSpecifier or @see TSESTree.ImportSpecifier */
				const imNode = im[key];
				const name$1 = imNode.name || imNode.value;
				const deepLookup = imports.hasDeep(name$1);
				if (!deepLookup.found) if (deepLookup.path.length > 1) {
					const deepPath = deepLookup.path.map((i) => node_path.default.relative(node_path.default.dirname(context.physicalFilename), i.path)).join(" -> ");
					context.report({
						node: imNode,
						messageId: "notFoundDeep",
						data: {
							name: name$1,
							deepPath
						}
					});
				} else context.report({
					node: imNode,
					messageId: "notFound",
					data: {
						name: name$1,
						path: node.source.value
					}
				});
			}
		}
		return {
			ImportDeclaration: checkSpecifiers.bind(null, "imported", "ImportSpecifier"),
			ExportNamedDeclaration: checkSpecifiers.bind(null, "local", "ExportSpecifier"),
			VariableDeclarator(node) {
				if (!options.commonjs || node.type !== "VariableDeclarator" || !node.id || node.id.type !== "ObjectPattern" || node.id.properties.length === 0 || !node.init || node.init.type !== "CallExpression") return;
				const call = node.init;
				const source = call.arguments[0];
				const variableImports = node.id.properties;
				const variableExports = ExportMap.get(source.value, context);
				if (call.callee.type !== "Identifier" || call.callee.name !== "require" || call.arguments.length !== 1 || source.type !== "Literal" || variableExports == null || variableExports.parseGoal === "ambiguous") return;
				if (variableExports.errors.length > 0) {
					variableExports.reportErrors(context, node);
					return;
				}
				for (const im of variableImports) {
					if (im.type !== "Property" || !im.key || im.key.type !== "Identifier") continue;
					const deepLookup = variableExports.hasDeep(im.key.name);
					if (!deepLookup.found) if (deepLookup.path.length > 1) {
						const deepPath = deepLookup.path.map((i) => node_path.default.relative(node_path.default.dirname(context.filename), i.path)).join(" -> ");
						context.report({
							node: im.key,
							messageId: "notFoundDeep",
							data: {
								name: im.key.name,
								deepPath
							}
						});
					} else context.report({
						node: im.key,
						messageId: "notFound",
						data: {
							name: im.key.name,
							path: source.value
						}
					});
				}
			}
		};
	}
});

//#endregion
//#region src/rules/namespace.ts
function processBodyStatement(context, namespaces, declaration) {
	if (declaration.type !== "ImportDeclaration") return;
	if (declaration.specifiers.length === 0) return;
	const imports = ExportMap.get(declaration.source.value, context);
	if (imports == null) return;
	if (imports.errors.length > 0) {
		imports.reportErrors(context, declaration);
		return;
	}
	for (const specifier of declaration.specifiers) switch (specifier.type) {
		case "ImportNamespaceSpecifier": {
			if (imports.size === 0) context.report({
				node: specifier,
				messageId: "noNamesFound",
				data: { module: declaration.source.value }
			});
			namespaces.set(specifier.local.name, imports);
			break;
		}
		case "ImportDefaultSpecifier":
		case "ImportSpecifier": {
			const meta$1 = imports.get("imported" in specifier ? getValue(specifier.imported) : "default");
			if (!meta$1 || !meta$1.namespace) break;
			namespaces.set(specifier.local.name, meta$1.namespace);
			break;
		}
		default:
	}
}
function makeMessage(last, namepath, node = last) {
	const messageId = namepath.length > 1 ? "notFoundInNamespaceDeep" : "notFoundInNamespace";
	return {
		node,
		messageId,
		data: {
			name: last.name,
			namepath: namepath.join(".")
		}
	};
}
var namespace_default = createRule({
	name: "namespace",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Ensure imported namespaces contain dereferenced properties as they are dereferenced."
		},
		schema: [{
			type: "object",
			properties: { allowComputed: {
				description: "If `false`, will report computed (and thus, un-lintable) references to namespace members.",
				type: "boolean",
				default: false
			} },
			additionalProperties: false
		}],
		messages: {
			noNamesFound: "No exported names found in module '{{module}}'.",
			computedReference: "Unable to validate computed reference to imported namespace '{{namespace}}'.",
			namespaceMember: "Assignment to member of namespace '{{namespace}}'.",
			topLevelNames: "Only destructure top-level names.",
			notFoundInNamespace: "'{{name}}' not found in imported namespace '{{namepath}}'.",
			notFoundInNamespaceDeep: "'{{name}}' not found in deeply imported namespace '{{namepath}}'."
		}
	},
	defaultOptions: [{ allowComputed: false }],
	create(context) {
		const { allowComputed } = context.options[0] || {};
		const namespaces = /* @__PURE__ */ new Map();
		return {
			Program({ body }) {
				for (const x of body) processBodyStatement(context, namespaces, x);
			},
			ExportNamespaceSpecifier(namespace) {
				const declaration = importDeclaration(context, namespace);
				const imports = ExportMap.get(declaration.source.value, context);
				if (imports == null) return null;
				if (imports.errors.length > 0) {
					imports.reportErrors(context, declaration);
					return;
				}
				if (imports.size === 0) context.report({
					node: namespace,
					messageId: "noNamesFound",
					data: { module: declaration.source.value }
				});
			},
			MemberExpression(dereference) {
				if (dereference.object.type !== "Identifier") return;
				if (!namespaces.has(dereference.object.name)) return;
				if (declaredScope(context, dereference, dereference.object.name) !== "module") return;
				const parent = dereference.parent;
				if (parent?.type === "AssignmentExpression" && parent.left === dereference) context.report({
					node: parent,
					messageId: "namespaceMember",
					data: { namespace: dereference.object.name }
				});
				let namespace = namespaces.get(dereference.object.name);
				const namepath = [dereference.object.name];
				let deref = dereference;
				while (namespace instanceof ExportMap && deref?.type === "MemberExpression") {
					if (deref.computed) {
						if (!allowComputed) context.report({
							node: deref.property,
							messageId: "computedReference",
							data: { namespace: "name" in deref.object && deref.object.name }
						});
						return;
					}
					if (!namespace.has(deref.property.name)) {
						context.report(makeMessage(deref.property, namepath));
						break;
					}
					const exported = namespace.get(deref.property.name);
					if (exported == null) return;
					namepath.push(deref.property.name);
					namespace = exported.namespace;
					deref = deref.parent;
				}
			},
			VariableDeclarator(node) {
				const { id, init } = node;
				if (init == null) return;
				if (init.type !== "Identifier") return;
				if (!namespaces.has(init.name)) return;
				if (declaredScope(context, node, init.name) !== "module") return;
				const initName = init.name;
				function testKey(pattern$1, namespace, path$22 = [initName]) {
					if (!(namespace instanceof ExportMap)) return;
					if (pattern$1.type !== "ObjectPattern") return;
					for (const property of pattern$1.properties) {
						if (property.type === "ExperimentalRestProperty" || property.type === "RestElement" || !property.key) continue;
						if (property.key.type !== "Identifier") {
							context.report({
								node: property,
								messageId: "topLevelNames"
							});
							continue;
						}
						if (!namespace.has(property.key.name)) {
							context.report(makeMessage(property.key, path$22, property));
							continue;
						}
						path$22.push(property.key.name);
						const dependencyExportMap = namespace.get(property.key.name);
						if (dependencyExportMap != null) testKey(property.value, dependencyExportMap.namespace, path$22);
						path$22.pop();
					}
				}
				testKey(id, namespaces.get(init.name));
			},
			JSXMemberExpression({ object, property }) {
				if (!("name" in object) || typeof object.name !== "string" || !namespaces.has(object.name)) return;
				const namespace = namespaces.get(object.name);
				if (!namespace.has(property.name)) context.report(makeMessage(property, [object.name]));
			}
		};
	}
});

//#endregion
//#region src/rules/newline-after-import.ts
const log$1 = (0, debug.default)("eslint-plugin-import-x:rules:newline-after-import");
function containsNodeOrEqual(outerNode, innerNode) {
	return outerNode.range[0] <= innerNode.range[0] && outerNode.range[1] >= innerNode.range[1];
}
function getScopeBody(scope) {
	if (scope.block.type === "SwitchStatement") {
		log$1("SwitchStatement scopes not supported");
		return [];
	}
	const body = "body" in scope.block ? scope.block.body : null;
	if (body && "type" in body && body.type === "BlockStatement") return body.body;
	return Array.isArray(body) ? body : [];
}
function findNodeIndexInScopeBody(body, nodeToFind) {
	return body.findIndex((node) => containsNodeOrEqual(node, nodeToFind));
}
function getLineDifference(node, nextNode) {
	return nextNode.loc.start.line - node.loc.end.line;
}
function isClassWithDecorator(node) {
	return node.type === "ClassDeclaration" && !!node.decorators?.length;
}
function isExportDefaultClass(node) {
	return node.type === "ExportDefaultDeclaration" && node.declaration.type === "ClassDeclaration";
}
function isExportNameClass(node) {
	return node.type === "ExportNamedDeclaration" && node.declaration?.type === "ClassDeclaration";
}
var newline_after_import_default = createRule({
	name: "newline-after-import",
	meta: {
		type: "layout",
		docs: {
			category: "Style guide",
			description: "Enforce a newline after import statements."
		},
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				count: {
					type: "integer",
					minimum: 1
				},
				exactCount: { type: "boolean" },
				considerComments: { type: "boolean" }
			},
			additionalProperties: false
		}],
		messages: { newline: "Expected {{count}} empty line{{lineSuffix}} after {{type}} statement not followed by another {{type}}." }
	},
	defaultOptions: [],
	create(context) {
		let level = 0;
		const requireCalls = [];
		const options = {
			count: 1,
			exactCount: false,
			considerComments: false,
			...context.options[0]
		};
		function checkForNewLine(node, nextNode, type) {
			if (isExportDefaultClass(nextNode) || isExportNameClass(nextNode)) {
				const classNode = nextNode.declaration;
				if (isClassWithDecorator(classNode)) nextNode = classNode.decorators[0];
			} else if (isClassWithDecorator(nextNode)) nextNode = nextNode.decorators[0];
			const lineDifference = getLineDifference(node, nextNode);
			const EXPECTED_LINE_DIFFERENCE = options.count + 1;
			if (lineDifference < EXPECTED_LINE_DIFFERENCE || options.exactCount && lineDifference !== EXPECTED_LINE_DIFFERENCE) {
				let column = node.loc.start.column;
				if (node.loc.start.line !== node.loc.end.line) column = 0;
				context.report({
					loc: {
						line: node.loc.end.line,
						column
					},
					messageId: "newline",
					data: {
						count: options.count,
						lineSuffix: options.count > 1 ? "s" : "",
						type
					},
					fix: options.exactCount && EXPECTED_LINE_DIFFERENCE < lineDifference ? void 0 : (fixer) => fixer.insertTextAfter(node, "\n".repeat(EXPECTED_LINE_DIFFERENCE - lineDifference))
				});
			}
		}
		function commentAfterImport(node, nextComment, type) {
			const lineDifference = getLineDifference(node, nextComment);
			const EXPECTED_LINE_DIFFERENCE = options.count + 1;
			if (lineDifference < EXPECTED_LINE_DIFFERENCE) {
				let column = node.loc.start.column;
				if (node.loc.start.line !== node.loc.end.line) column = 0;
				context.report({
					loc: {
						line: node.loc.end.line,
						column
					},
					messageId: "newline",
					data: {
						count: options.count,
						lineSuffix: options.count > 1 ? "s" : "",
						type
					},
					fix: options.exactCount && EXPECTED_LINE_DIFFERENCE < lineDifference ? void 0 : (fixer) => fixer.insertTextAfter(node, "\n".repeat(EXPECTED_LINE_DIFFERENCE - lineDifference))
				});
			}
		}
		function incrementLevel() {
			level++;
		}
		function decrementLevel() {
			level--;
		}
		function checkImport(node) {
			const { parent } = node;
			if (!parent || !("body" in parent) || !parent.body) return;
			const root = parent;
			const nodePosition = root.body.indexOf(node);
			const nextNode = root.body[nodePosition + 1];
			const endLine = node.loc.end.line;
			let nextComment;
			if (root.comments !== void 0 && options.considerComments) nextComment = root.comments.find((o) => o.loc.start.line >= endLine && o.loc.start.line <= endLine + options.count + 1);
			if (node.type === "TSImportEqualsDeclaration" && node.isExport) return;
			if (nextComment) commentAfterImport(node, nextComment, "import");
			else if (nextNode && nextNode.type !== "ImportDeclaration" && (nextNode.type !== "TSImportEqualsDeclaration" || nextNode.isExport)) checkForNewLine(node, nextNode, "import");
		}
		return {
			ImportDeclaration: checkImport,
			TSImportEqualsDeclaration: checkImport,
			CallExpression(node) {
				if (isStaticRequire(node) && level === 0) requireCalls.push(node);
			},
			"Program:exit"(node) {
				log$1("exit processing for", context.physicalFilename);
				const scopeBody = getScopeBody(context.sourceCode.getScope(node));
				log$1("got scope:", scopeBody);
				for (const [index, node$1] of requireCalls.entries()) {
					const nodePosition = findNodeIndexInScopeBody(scopeBody, node$1);
					log$1("node position in scope:", nodePosition);
					const statementWithRequireCall = scopeBody[nodePosition];
					const nextStatement = scopeBody[nodePosition + 1];
					const nextRequireCall = requireCalls[index + 1];
					if (nextRequireCall && containsNodeOrEqual(statementWithRequireCall, nextRequireCall)) continue;
					if (nextStatement && (!nextRequireCall || !containsNodeOrEqual(nextStatement, nextRequireCall))) {
						let nextComment;
						if ("comments" in statementWithRequireCall.parent && statementWithRequireCall.parent.comments !== void 0 && options.considerComments) {
							const endLine = node$1.loc.end.line;
							nextComment = statementWithRequireCall.parent.comments.find((o) => o.loc.start.line >= endLine && o.loc.start.line <= endLine + options.count + 1);
						}
						if (nextComment && nextComment !== void 0) commentAfterImport(statementWithRequireCall, nextComment, "require");
						else checkForNewLine(statementWithRequireCall, nextStatement, "require");
					}
				}
			},
			FunctionDeclaration: incrementLevel,
			FunctionExpression: incrementLevel,
			ArrowFunctionExpression: incrementLevel,
			BlockStatement: incrementLevel,
			ObjectExpression: incrementLevel,
			Decorator: incrementLevel,
			"FunctionDeclaration:exit": decrementLevel,
			"FunctionExpression:exit": decrementLevel,
			"ArrowFunctionExpression:exit": decrementLevel,
			"BlockStatement:exit": decrementLevel,
			"ObjectExpression:exit": decrementLevel,
			"Decorator:exit": decrementLevel
		};
	}
});

//#endregion
//#region src/rules/no-absolute-path.ts
var no_absolute_path_default = createRule({
	name: "no-absolute-path",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid import of modules using absolute paths."
		},
		fixable: "code",
		schema: [makeOptionsSchema()],
		messages: { absolute: "Do not import modules using an absolute path" }
	},
	defaultOptions: [],
	create(context) {
		const options = {
			esmodule: true,
			commonjs: true,
			...context.options[0]
		};
		return moduleVisitor((source) => {
			if (!isAbsolute(source.value)) return;
			context.report({
				node: source,
				messageId: "absolute",
				fix(fixer) {
					let relativePath = node_path.default.posix.relative(node_path.default.dirname(context.physicalFilename), source.value);
					if (!relativePath.startsWith(".")) relativePath = `./${relativePath}`;
					return fixer.replaceText(source, JSON.stringify(relativePath));
				}
			});
		}, options);
	}
});

//#endregion
//#region src/rules/no-amd.ts
var no_amd_default = createRule({
	name: "no-amd",
	meta: {
		type: "suggestion",
		docs: {
			category: "Module systems",
			description: "Forbid AMD `require` and `define` calls."
		},
		schema: [],
		messages: { amd: "Expected imports instead of AMD {{type}}()." }
	},
	defaultOptions: [],
	create(context) {
		return { CallExpression(node) {
			if (context.sourceCode.getScope(node).type !== "module") return;
			if (node.callee.type !== "Identifier") return;
			if (node.callee.name !== "require" && node.callee.name !== "define") return;
			if (node.arguments.length !== 2) return;
			const modules = node.arguments[0];
			if (modules.type !== "ArrayExpression") return;
			context.report({
				node,
				messageId: "amd",
				data: { type: node.callee.name }
			});
		} };
	}
});

//#endregion
//#region src/rules/no-anonymous-default-export.ts
const { hasOwnProperty } = Object.prototype;
const hasOwn = (object, key) => hasOwnProperty.call(object, key);
const defs = {
	ArrayExpression: {
		option: "allowArray",
		description: "If `false`, will report default export of an array",
		messageId: "assign",
		data: { type: "array" }
	},
	ArrowFunctionExpression: {
		option: "allowArrowFunction",
		description: "If `false`, will report default export of an arrow function",
		messageId: "assign",
		data: { type: "arrow function" }
	},
	CallExpression: {
		option: "allowCallExpression",
		description: "If `false`, will report default export of a function call",
		messageId: "assign",
		data: { type: "call result" },
		default: true
	},
	ClassDeclaration: {
		option: "allowAnonymousClass",
		description: "If `false`, will report default export of an anonymous class",
		messageId: "anonymous",
		data: { type: "class" },
		forbid: (node) => !("id" in node.declaration) || !node.declaration.id
	},
	FunctionDeclaration: {
		option: "allowAnonymousFunction",
		description: "If `false`, will report default export of an anonymous function",
		messageId: "anonymous",
		data: { type: "function" },
		forbid: (node) => !("id" in node.declaration) || !node.declaration.id
	},
	Literal: {
		option: "allowLiteral",
		description: "If `false`, will report default export of a literal",
		messageId: "assign",
		data: { type: "literal" }
	},
	ObjectExpression: {
		option: "allowObject",
		description: "If `false`, will report default export of an object expression",
		messageId: "assign",
		data: { type: "object" }
	},
	TemplateLiteral: {
		option: "allowLiteral",
		description: "If `false`, will report default export of a literal",
		messageId: "assign",
		data: { type: "literal" }
	},
	NewExpression: {
		option: "allowNew",
		description: "If `false`, will report default export of a class instantiation",
		messageId: "assign",
		data: { type: "instance" }
	}
};
const schemaProperties = Object.fromEntries(Object.values(defs).map((def) => [def.option, {
	description: def.description,
	type: "boolean"
}]));
const defaults = Object.fromEntries(Object.values(defs).map((def) => [def.option, hasOwn(def, "default") ? def.default : false]));
var no_anonymous_default_export_default = createRule({
	name: "no-anonymous-default-export",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Forbid anonymous values as default exports."
		},
		schema: [{
			type: "object",
			properties: schemaProperties,
			additionalProperties: false
		}],
		messages: {
			assign: "Assign {{type}} to a variable before exporting as module default",
			anonymous: "Unexpected default export of anonymous {{type}}"
		}
	},
	defaultOptions: [],
	create(context) {
		const options = {
			...defaults,
			...context.options[0]
		};
		return { ExportDefaultDeclaration(node) {
			const type = node.declaration.type;
			if (!(type in defs)) return;
			const def = defs[type];
			if (!options[def.option] && (!("forbid" in def) || def.forbid(node))) context.report({
				node,
				messageId: def.messageId,
				data: def.data
			});
		} };
	}
});

//#endregion
//#region src/rules/no-commonjs.ts
function normalizeLegacyOptions(options) {
	if (options.includes("allow-primitive-modules")) return { allowPrimitiveModules: true };
	return options[0] || {};
}
function allowPrimitive(node, options) {
	if (!options.allowPrimitiveModules) return false;
	if (node.parent.type !== "AssignmentExpression") return false;
	return node.parent.right.type !== "ObjectExpression";
}
function validateScope(scope) {
	return scope.variableScope.type === "module";
}
function isConditional(node) {
	if (node.type === "IfStatement" || node.type === "TryStatement" || node.type === "LogicalExpression" || node.type === "ConditionalExpression") return true;
	if (node.parent) return isConditional(node.parent);
	return false;
}
function isLiteralString(node) {
	return node.type === "Literal" && typeof node.value === "string" || node.type === "TemplateLiteral" && node.expressions.length === 0;
}
var no_commonjs_default = createRule({
	name: "no-commonjs",
	meta: {
		type: "suggestion",
		docs: {
			category: "Module systems",
			description: "Forbid CommonJS `require` calls and `module.exports` or `exports.*`."
		},
		schema: { anyOf: [{
			type: "array",
			items: [{
				type: "string",
				enum: ["allow-primitive-modules"]
			}],
			additionalItems: false
		}, {
			type: "array",
			items: [{
				type: "object",
				properties: {
					allowPrimitiveModules: { type: "boolean" },
					allowRequire: { type: "boolean" },
					allowConditionalRequire: { type: "boolean" }
				},
				additionalProperties: false
			}],
			additionalItems: false
		}] },
		messages: {
			export: "Expected \"export\" or \"export default\"",
			import: "Expected \"import\" instead of \"require()\""
		}
	},
	defaultOptions: [],
	create(context) {
		const options = normalizeLegacyOptions(context.options);
		return {
			MemberExpression(node) {
				if ("name" in node.object && node.object.name === "module" && "name" in node.property && node.property.name === "exports") {
					if (allowPrimitive(node, options)) return;
					context.report({
						node,
						messageId: "export"
					});
				}
				if ("name" in node.object && node.object.name === "exports") {
					const isInScope = context.sourceCode.getScope(node).variables.some((variable) => variable.name === "exports");
					if (!isInScope) context.report({
						node,
						messageId: "export"
					});
				}
			},
			CallExpression(call) {
				if (!validateScope(context.sourceCode.getScope(call))) return;
				if (call.callee.type !== "Identifier") return;
				if (call.callee.name !== "require") return;
				if (call.arguments.length !== 1) return;
				if (!isLiteralString(call.arguments[0])) return;
				if (options.allowRequire) return;
				if (options.allowConditionalRequire !== false && isConditional(call.parent)) return;
				context.report({
					node: call.callee,
					messageId: "import"
				});
			}
		};
	}
});

//#endregion
//#region src/rules/no-cycle.ts
const traversed = /* @__PURE__ */ new Set();
var no_cycle_default = createRule({
	name: "no-cycle",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid a module from importing a module with a dependency path back to itself."
		},
		schema: [makeOptionsSchema({
			maxDepth: { anyOf: [{
				description: "maximum dependency depth to traverse",
				type: "integer",
				minimum: 1
			}, {
				enum: ["∞"],
				type: "string"
			}] },
			ignoreExternal: {
				description: "ignore external modules",
				type: "boolean",
				default: false
			},
			allowUnsafeDynamicCyclicDependency: {
				description: "Allow cyclic dependency if there is at least one dynamic import in the chain",
				type: "boolean",
				default: false
			}
		})],
		messages: {
			cycle: "Dependency cycle detected",
			cycleSource: "Dependency cycle via \"{{source}}\""
		}
	},
	defaultOptions: [],
	create(context) {
		const filename = context.physicalFilename;
		if (filename === "<text>") return {};
		const options = context.options[0] || {};
		const maxDepth = typeof options.maxDepth === "number" ? options.maxDepth : Number.POSITIVE_INFINITY;
		const ignoreModule = options.ignoreExternal ? (name$1) => isExternalModule(name$1, resolve(name$1, context), context) : () => false;
		return {
			...moduleVisitor(function checkSourceValue(sourceNode, importer) {
				if (ignoreModule(sourceNode.value)) return;
				if (options.allowUnsafeDynamicCyclicDependency && (importer.type === "ImportExpression" || importer.type === "CallExpression" && "name" in importer.callee && importer.callee.name !== "require")) return;
				if (importer.type === "ImportDeclaration" && (importer.importKind === "type" || importer.specifiers.every((s) => "importKind" in s && s.importKind === "type"))) return;
				const imported = ExportMap.get(sourceNode.value, context);
				if (imported == null) return;
				if (imported.path === filename) return;
				const untraversed = [{
					mget: () => imported,
					route: []
				}];
				function detectCycle({ mget, route }) {
					const m = mget();
					if (m == null) return;
					if (traversed.has(m.path)) return;
					traversed.add(m.path);
					for (const [path$22, { getter, declarations }] of m.imports) {
						if (traversed.has(path$22)) continue;
						const toTraverse = [...declarations].filter(({ source, isOnlyImportingTypes }) => !ignoreModule(source.value) && !isOnlyImportingTypes);
						/**
						* If cyclic dependency is allowed via dynamic import, skip checking
						* if any module is imported dynamically
						*/
						if (options.allowUnsafeDynamicCyclicDependency && toTraverse.some((d) => d.dynamic)) return;
						/**
						* Only report as a cycle if there are any import declarations that
						* are considered by the rule. For example:
						*
						* A.ts:
						*
						* `import { foo } from './b'` // should not be reported as a cycle
						*
						* B.ts: `import type { Bar } from './a'`
						*/
						if (path$22 === filename && toTraverse.length > 0) return true;
						if (route.length + 1 < maxDepth) for (const { source } of toTraverse) untraversed.push({
							mget: getter,
							route: [...route, source]
						});
					}
				}
				while (untraversed.length > 0) {
					const next = untraversed.shift();
					if (detectCycle(next)) {
						if (next.route.length > 0) context.report({
							node: importer,
							messageId: "cycleSource",
							data: { source: routeString(next.route) }
						});
						else context.report({
							node: importer,
							messageId: "cycle"
						});
						return;
					}
				}
			}, context.options[0]),
			"Program:exit"() {
				traversed.clear();
			}
		};
	}
});
function routeString(route) {
	return route.map((s) => `${s.value}:${s.loc.start.line}`).join("=>");
}

//#endregion
//#region src/rules/no-default-export.ts
var no_default_export_default = createRule({
	name: "no-default-export",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Forbid default exports."
		},
		schema: [],
		messages: {
			preferNamed: "Prefer named exports.",
			noAliasDefault: "Do not alias `{{local}}` as `default`. Just export `{{local}}` itself instead."
		}
	},
	defaultOptions: [],
	create(context) {
		if (sourceType(context) !== "module") return {};
		const { sourceCode } = context;
		return {
			ExportDefaultDeclaration(node) {
				const { loc } = sourceCode.getFirstTokens(node)[1] || {};
				context.report({
					node,
					messageId: "preferNamed",
					loc
				});
			},
			ExportNamedDeclaration(node) {
				for (const specifier of node.specifiers.filter((specifier$1) => getValue(specifier$1.exported) === "default")) {
					const { loc } = sourceCode.getFirstTokens(node)[1] || {};
					if (specifier.type === "ExportDefaultSpecifier") context.report({
						node,
						messageId: "preferNamed",
						loc
					});
					else if (specifier.type === "ExportSpecifier") context.report({
						node,
						messageId: "noAliasDefault",
						data: { local: getValue(specifier.local) },
						loc
					});
				}
			}
		};
	}
});

//#endregion
//#region src/rules/no-deprecated.ts
function message(deprecation) {
	if (deprecation.description) return {
		messageId: "deprecatedDesc",
		data: { description: deprecation.description }
	};
	return { messageId: "deprecated" };
}
function getDeprecation(metadata) {
	if (!metadata || !metadata.doc) return;
	return metadata.doc.tags.find((t) => t.tag === "deprecated");
}
var no_deprecated_default = createRule({
	name: "no-deprecated",
	meta: {
		type: "suggestion",
		docs: {
			category: "Helpful warnings",
			description: "Forbid imported names marked with `@deprecated` documentation tag."
		},
		schema: [],
		messages: {
			deprecatedDesc: "Deprecated: {{description}}",
			deprecated: "Deprecated: consider to find an alternative."
		}
	},
	defaultOptions: [],
	create(context) {
		const deprecated = /* @__PURE__ */ new Map();
		const namespaces = /* @__PURE__ */ new Map();
		return {
			Program({ body }) {
				for (const node of body) {
					if (node.type !== "ImportDeclaration") continue;
					if (node.source == null) continue;
					const imports = ExportMap.get(node.source.value, context);
					if (imports == null) continue;
					const moduleDeprecation = imports.doc?.tags.find((t) => t.tag === "deprecated");
					if (moduleDeprecation) context.report({
						node,
						...message(moduleDeprecation)
					});
					if (imports.errors.length > 0) {
						imports.reportErrors(context, node);
						continue;
					}
					for (const im of node.specifiers) {
						let imported;
						let local;
						switch (im.type) {
							case "ImportNamespaceSpecifier": {
								if (imports.size === 0) continue;
								namespaces.set(im.local.name, imports);
								continue;
							}
							case "ImportDefaultSpecifier": {
								imported = "default";
								local = im.local.name;
								break;
							}
							case "ImportSpecifier": {
								imported = getValue(im.imported);
								local = im.local.name;
								break;
							}
							default: continue;
						}
						const exported = imports.get(imported);
						if (exported == null) continue;
						if (exported.namespace) namespaces.set(local, exported.namespace);
						const deprecation = getDeprecation(imports.get(imported));
						if (!deprecation) continue;
						context.report({
							node: im,
							...message(deprecation)
						});
						deprecated.set(local, deprecation);
					}
				}
			},
			Identifier(node) {
				if (!node.parent || node.parent.type === "MemberExpression" && node.parent.property === node) return;
				if (node.parent.type.slice(0, 6) === "Import") return;
				if (!deprecated.has(node.name)) return;
				if (declaredScope(context, node, node.name) !== "module") return;
				context.report({
					node,
					...message(deprecated.get(node.name))
				});
			},
			MemberExpression(dereference) {
				if (dereference.object.type !== "Identifier") return;
				if (!namespaces.has(dereference.object.name)) return;
				if (declaredScope(context, dereference, dereference.object.name) !== "module") return;
				let namespace = namespaces.get(dereference.object.name);
				const namepath = [dereference.object.name];
				let node = dereference;
				while (namespace instanceof ExportMap && node?.type === "MemberExpression") {
					if (node.computed) return;
					const metadata = namespace.get(node.property.name);
					if (!metadata) break;
					const deprecation = getDeprecation(metadata);
					if (deprecation) context.report({
						node: node.property,
						...message(deprecation)
					});
					namepath.push(node.property.name);
					namespace = metadata.namespace;
					node = node.parent;
				}
			}
		};
	}
});

//#endregion
//#region src/rules/no-duplicates.ts
const isTypeScriptVersionSupportPreferInline = lazy(() => {
	let typescriptPkg;
	try {
		typescriptPkg = cjsRequire("typescript/package.json");
	} catch {}
	return !typescriptPkg || !semver.satisfies(typescriptPkg.version, ">= 4.5");
});
function checkImports(imported, context) {
	imported.forEach((nodes, module$2) => {
		if (nodes.length <= 1) return;
		for (let i = 0, len = nodes.length; i < len; i++) {
			const node = nodes[i];
			context.report({
				node: node.source,
				messageId: "duplicate",
				data: { module: module$2 },
				fix: i === 0 ? getFix(nodes, context.sourceCode, context) : null
			});
		}
	});
}
function getFix(nodes, sourceCode, context) {
	const first = nodes[0];
	if (hasProblematicComments(first, sourceCode) || hasNamespace(first)) return null;
	const defaultImportNames = new Set(nodes.flatMap((x) => getDefaultImportName(x) || []));
	if (defaultImportNames.size > 1) return null;
	const rest = nodes.slice(1);
	const restWithoutCommentsAndNamespaces = rest.filter((node) => !hasProblematicComments(node, sourceCode) && !hasNamespace(node));
	const restWithoutCommentsAndNamespacesHasSpecifiers = restWithoutCommentsAndNamespaces.map(hasSpecifiers);
	const specifiers = restWithoutCommentsAndNamespaces.reduce((acc, node, nodeIndex) => {
		const tokens = sourceCode.getTokens(node);
		const openBrace = tokens.find((token) => isPunctuator(token, "{"));
		const closeBrace = tokens.find((token) => isPunctuator(token, "}"));
		if (openBrace == null || closeBrace == null) return acc;
		acc.push({
			importNode: node,
			identifiers: sourceCode.text.slice(openBrace.range[1], closeBrace.range[0]).split(","),
			isEmpty: !restWithoutCommentsAndNamespacesHasSpecifiers[nodeIndex]
		});
		return acc;
	}, []);
	const unnecessaryImports = restWithoutCommentsAndNamespaces.filter((node, nodeIndex) => !restWithoutCommentsAndNamespacesHasSpecifiers[nodeIndex] && !specifiers.some((specifier) => specifier.importNode === node));
	const shouldAddSpecifiers = specifiers.length > 0;
	const shouldRemoveUnnecessary = unnecessaryImports.length > 0;
	const shouldAddDefault = lazy(() => getDefaultImportName(first) == null && defaultImportNames.size === 1);
	if (!shouldAddSpecifiers && !shouldRemoveUnnecessary && !shouldAddDefault()) return null;
	const preferInline = context.options[0] && context.options[0]["prefer-inline"];
	return (fixer) => {
		const tokens = sourceCode.getTokens(first);
		const openBrace = tokens.find((token) => isPunctuator(token, "{"));
		const closeBrace = tokens.find((token) => isPunctuator(token, "}"));
		const firstToken = sourceCode.getFirstToken(first);
		const [defaultImportName] = defaultImportNames;
		const firstHasTrailingComma = closeBrace != null && isPunctuator(sourceCode.getTokenBefore(closeBrace), ",");
		const firstIsEmpty = !hasSpecifiers(first);
		const firstExistingIdentifiers = firstIsEmpty ? /* @__PURE__ */ new Set() : new Set(sourceCode.text.slice(openBrace.range[1], closeBrace.range[0]).split(",").map((x) => x.split(" as ")[0].trim()));
		const [specifiersText] = specifiers.reduce(([result, needsComma, existingIdentifiers], specifier) => {
			const isTypeSpecifier = "importNode" in specifier && specifier.importNode.importKind === "type";
			if (preferInline && isTypeScriptVersionSupportPreferInline()) throw new Error("Your version of TypeScript does not support inline type imports.");
			const [specifierText, updatedExistingIdentifiers] = specifier.identifiers.reduce(([text, set], cur) => {
				const trimmed = cur.trim();
				if (trimmed.length === 0 || existingIdentifiers.has(trimmed)) return [text, set];
				const curWithType = preferInline && isTypeSpecifier ? cur.replace(/^(\s*)/, "$1type ") : cur;
				return [text.length > 0 ? `${text},${curWithType}` : curWithType, set.add(trimmed)];
			}, ["", existingIdentifiers]);
			return [
				needsComma && !specifier.isEmpty && specifierText.length > 0 ? `${result},${specifierText}` : `${result}${specifierText}`,
				specifier.isEmpty ? needsComma : true,
				updatedExistingIdentifiers
			];
		}, [
			"",
			!firstHasTrailingComma && !firstIsEmpty,
			firstExistingIdentifiers
		]);
		const fixes = [];
		if (shouldAddSpecifiers && preferInline && first.importKind === "type") {
			const typeIdentifierToken = tokens.find((token) => token.type === "Identifier" && token.value === "type");
			if (typeIdentifierToken) fixes.push(fixer.removeRange([typeIdentifierToken.range[0], typeIdentifierToken.range[1] + 1]));
			for (const identifier of tokens.filter((token) => firstExistingIdentifiers.has(token.value))) fixes.push(fixer.replaceTextRange([identifier.range[0], identifier.range[1]], `type ${identifier.value}`));
		}
		if (openBrace == null && shouldAddSpecifiers && shouldAddDefault()) fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName}, {${specifiersText}} from`));
		else if (openBrace == null && !shouldAddSpecifiers && shouldAddDefault()) fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName} from`));
		else if (openBrace != null && closeBrace != null && shouldAddDefault()) {
			fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName},`));
			if (shouldAddSpecifiers) fixes.push(fixer.insertTextBefore(closeBrace, specifiersText));
		} else if (openBrace == null && shouldAddSpecifiers && !shouldAddDefault()) if (first.specifiers.length === 0) fixes.push(fixer.insertTextAfter(firstToken, ` {${specifiersText}} from`));
		else fixes.push(fixer.insertTextAfter(first.specifiers[0], `, {${specifiersText}}`));
		else if (openBrace != null && closeBrace != null && !shouldAddDefault()) {
			const tokenBefore = sourceCode.getTokenBefore(closeBrace);
			fixes.push(fixer.insertTextAfter(tokenBefore, specifiersText));
		}
		for (const specifier of specifiers) {
			const importNode = specifier.importNode;
			fixes.push(fixer.remove(importNode));
			const charAfterImportRange = [importNode.range[1], importNode.range[1] + 1];
			const charAfterImport = sourceCode.text.slice(charAfterImportRange[0], charAfterImportRange[1]);
			if (charAfterImport === "\n") fixes.push(fixer.removeRange(charAfterImportRange));
		}
		for (const node of unnecessaryImports) {
			fixes.push(fixer.remove(node));
			const charAfterImportRange = [node.range[1], node.range[1] + 1];
			const charAfterImport = sourceCode.text.slice(charAfterImportRange[0], charAfterImportRange[1]);
			if (charAfterImport === "\n") fixes.push(fixer.removeRange(charAfterImportRange));
		}
		return fixes;
	};
}
function isPunctuator(node, value) {
	return node.type === "Punctuator" && node.value === value;
}
function getDefaultImportName(node) {
	const defaultSpecifier = node.specifiers.find((specifier) => specifier.type === "ImportDefaultSpecifier");
	return defaultSpecifier?.local.name;
}
function hasNamespace(node) {
	return node.specifiers.some((specifier) => specifier.type === "ImportNamespaceSpecifier");
}
function hasSpecifiers(node) {
	return node.specifiers.some((specifier) => specifier.type === "ImportSpecifier");
}
function hasProblematicComments(node, sourceCode) {
	return hasCommentBefore(node, sourceCode) || hasCommentAfter(node, sourceCode) || hasCommentInsideNonSpecifiers(node, sourceCode);
}
function hasCommentBefore(node, sourceCode) {
	return sourceCode.getCommentsBefore(node).some((comment) => comment.loc.end.line >= node.loc.start.line - 1);
}
function hasCommentAfter(node, sourceCode) {
	return sourceCode.getCommentsAfter(node).some((comment) => comment.loc.start.line === node.loc.end.line);
}
function hasCommentInsideNonSpecifiers(node, sourceCode) {
	const tokens = sourceCode.getTokens(node);
	const openBraceIndex = tokens.findIndex((token) => isPunctuator(token, "{"));
	const closeBraceIndex = tokens.findIndex((token) => isPunctuator(token, "}"));
	const someTokens = openBraceIndex !== -1 && closeBraceIndex !== -1 ? [...tokens.slice(1, openBraceIndex + 1), ...tokens.slice(closeBraceIndex + 1)] : tokens.slice(1);
	return someTokens.some((token) => sourceCode.getCommentsBefore(token).length > 0);
}
var no_duplicates_default = createRule({
	name: "no-duplicates",
	meta: {
		type: "problem",
		docs: {
			category: "Style guide",
			description: "Forbid repeated import of the same module in multiple places."
		},
		fixable: "code",
		schema: [{
			type: "object",
			properties: {
				considerQueryString: { type: "boolean" },
				"prefer-inline": { type: "boolean" }
			},
			additionalProperties: false
		}],
		messages: { duplicate: "'{{module}}' imported multiple times." }
	},
	defaultOptions: [],
	create(context) {
		const preferInline = context.options[0]?.["prefer-inline"];
		const considerQueryStringOption = context.options[0]?.considerQueryString;
		const defaultResolver = (sourcePath) => resolve(sourcePath, context) || sourcePath;
		const resolver = considerQueryStringOption ? (sourcePath) => {
			const parts = sourcePath.match(/^([^?]*)\?(.*)$/);
			if (!parts) return defaultResolver(sourcePath);
			return `${defaultResolver(parts[1])}?${parts[2]}`;
		} : defaultResolver;
		const moduleMaps = /* @__PURE__ */ new Map();
		function getImportMap(n) {
			const parent = n.parent;
			let map;
			if (moduleMaps.has(parent)) map = moduleMaps.get(parent);
			else {
				map = {
					imported: /* @__PURE__ */ new Map(),
					nsImported: /* @__PURE__ */ new Map(),
					defaultTypesImported: /* @__PURE__ */ new Map(),
					namespaceTypesImported: /* @__PURE__ */ new Map(),
					namedTypesImported: /* @__PURE__ */ new Map()
				};
				moduleMaps.set(parent, map);
			}
			if (n.importKind === "type") {
				if (n.specifiers.length > 0 && n.specifiers[0].type === "ImportDefaultSpecifier") return map.defaultTypesImported;
				if (n.specifiers.length > 0 && n.specifiers[0].type === "ImportNamespaceSpecifier") return map.namespaceTypesImported;
				if (!preferInline) return map.namedTypesImported;
			}
			if (!preferInline && n.specifiers.some((spec) => "importKind" in spec && spec.importKind === "type")) return map.namedTypesImported;
			return hasNamespace(n) ? map.nsImported : map.imported;
		}
		return {
			ImportDeclaration(n) {
				const resolvedPath = resolver(n.source.value);
				const importMap = getImportMap(n);
				if (importMap.has(resolvedPath)) importMap.get(resolvedPath).push(n);
				else importMap.set(resolvedPath, [n]);
			},
			"Program:exit"() {
				for (const map of moduleMaps.values()) {
					checkImports(map.imported, context);
					checkImports(map.nsImported, context);
					checkImports(map.defaultTypesImported, context);
					checkImports(map.namedTypesImported, context);
				}
			}
		};
	}
});

//#endregion
//#region src/rules/no-dynamic-require.ts
function isRequire(node) {
	return node.callee?.type === "Identifier" && node.callee.name === "require" && node.arguments.length > 0;
}
function isDynamicImport(node) {
	return node?.callee && node.callee.type === "Import";
}
function isStaticValue(node) {
	return node.type === "Literal" || node.type === "TemplateLiteral" && node.expressions.length === 0;
}
var no_dynamic_require_default = createRule({
	name: "no-dynamic-require",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid `require()` calls with expressions."
		},
		schema: [{
			type: "object",
			properties: { esmodule: { type: "boolean" } },
			additionalProperties: false
		}],
		messages: {
			import: "Calls to import() should use string literals",
			require: "Calls to require() should use string literals"
		}
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		return {
			CallExpression(node) {
				if (!node.arguments[0] || isStaticValue(node.arguments[0])) return;
				if (isRequire(node)) return context.report({
					node,
					messageId: "require"
				});
				if (options.esmodule && isDynamicImport(node)) return context.report({
					node,
					messageId: "import"
				});
			},
			ImportExpression(node) {
				if (!options.esmodule || isStaticValue(node.source)) return;
				return context.report({
					node,
					messageId: "import"
				});
			}
		};
	}
});

//#endregion
//#region src/rules/no-empty-named-blocks.ts
function getEmptyBlockRange(tokens, index) {
	const token = tokens[index];
	const nextToken = tokens[index + 1];
	const prevToken = tokens[index - 1];
	let start = token.range[0];
	const end = nextToken.range[1];
	if (prevToken.value === "," || prevToken.value === "type" || prevToken.value === "typeof") start = prevToken.range[0];
	return [start, end];
}
var no_empty_named_blocks_default = createRule({
	name: "no-empty-named-blocks",
	meta: {
		type: "suggestion",
		docs: {
			category: "Helpful warnings",
			description: "Forbid empty named import blocks."
		},
		fixable: "code",
		hasSuggestions: true,
		schema: [],
		messages: {
			emptyNamed: "Unexpected empty named import block",
			unused: "Remove unused import",
			emptyImport: "Remove empty import block"
		}
	},
	defaultOptions: [],
	create(context) {
		const importsWithoutNameds = [];
		return {
			ImportDeclaration(node) {
				if (!node.specifiers.some((x) => x.type === "ImportSpecifier")) importsWithoutNameds.push(node);
			},
			"Program:exit"(program) {
				const importsTokens = importsWithoutNameds.map((node) => [node, program.tokens.filter((x) => x.range[0] >= node.range[0] && x.range[1] <= node.range[1])]);
				const pTokens = program.tokens || [];
				for (const [node, tokens] of importsTokens) for (const token of tokens) {
					const idx = pTokens.indexOf(token);
					const nextToken = pTokens[idx + 1];
					if (nextToken && token.value === "{" && nextToken.value === "}") {
						const hasOtherIdentifiers = tokens.some((token$1) => token$1.type === "Identifier" && token$1.value !== "from" && token$1.value !== "type" && token$1.value !== "typeof");
						if (hasOtherIdentifiers) context.report({
							node,
							messageId: "emptyNamed",
							fix(fixer) {
								return fixer.removeRange(getEmptyBlockRange(pTokens, idx));
							}
						});
						else context.report({
							node,
							messageId: "emptyNamed",
							suggest: [{
								messageId: "unused",
								fix(fixer) {
									return fixer.remove(node);
								}
							}, {
								messageId: "emptyImport",
								fix(fixer) {
									const { sourceCode } = context;
									const fromToken = pTokens.find((t) => t.value === "from");
									const importToken = pTokens.find((t) => t.value === "import");
									const hasSpaceAfterFrom = sourceCode.isSpaceBetween(fromToken, sourceCode.getTokenAfter(fromToken));
									const hasSpaceAfterImport = sourceCode.isSpaceBetween(importToken, sourceCode.getTokenAfter(fromToken));
									const [start] = getEmptyBlockRange(pTokens, idx);
									const [, end] = fromToken.range;
									const range = [start, hasSpaceAfterFrom ? end + 1 : end];
									return fixer.replaceTextRange(range, hasSpaceAfterImport ? "" : " ");
								}
							}]
						});
					}
				}
			}
		};
	}
});

//#endregion
//#region src/rules/no-extraneous-dependencies.ts
const depFieldCache = /* @__PURE__ */ new Map();
function hasKeys(obj = {}) {
	return Object.keys(obj).length > 0;
}
function arrayOrKeys(arrayOrObject) {
	return Array.isArray(arrayOrObject) ? arrayOrObject : Object.keys(arrayOrObject);
}
function readJSON(jsonPath, throwException) {
	try {
		return JSON.parse(node_fs.default.readFileSync(jsonPath, "utf8"));
	} catch (error) {
		if (throwException) throw error;
	}
}
function extractDepFields(pkg) {
	return {
		dependencies: pkg.dependencies || {},
		devDependencies: pkg.devDependencies || {},
		optionalDependencies: pkg.optionalDependencies || {},
		peerDependencies: pkg.peerDependencies || {},
		bundledDependencies: arrayOrKeys(pkg.bundleDependencies || pkg.bundledDependencies || [])
	};
}
function getPackageDepFields(packageJsonPath, throwAtRead) {
	if (!depFieldCache.has(packageJsonPath)) {
		const packageJson = readJSON(packageJsonPath, throwAtRead);
		if (packageJson) {
			const depFields = extractDepFields(packageJson);
			depFieldCache.set(packageJsonPath, depFields);
		}
	}
	return depFieldCache.get(packageJsonPath);
}
function getDependencies(context, packageDir) {
	let paths = [];
	try {
		let packageContent = {
			dependencies: {},
			devDependencies: {},
			optionalDependencies: {},
			peerDependencies: {},
			bundledDependencies: []
		};
		if (packageDir && packageDir.length > 0) paths = Array.isArray(packageDir) ? packageDir.map((dir) => node_path.default.resolve(dir)) : [node_path.default.resolve(packageDir)];
		if (paths.length > 0) for (const dir of paths) {
			const packageJsonPath = node_path.default.resolve(dir, "package.json");
			const packageContent_ = getPackageDepFields(packageJsonPath, paths.length === 1);
			if (packageContent_) for (const depsKey of Object.keys(packageContent)) {
				const key = depsKey;
				Object.assign(packageContent[key], packageContent_[key]);
			}
		}
		else {
			const packageJsonPath = pkgUp({ cwd: context.physicalFilename });
			const packageContent_ = getPackageDepFields(packageJsonPath, false);
			if (packageContent_) packageContent = packageContent_;
		}
		if (![
			packageContent.dependencies,
			packageContent.devDependencies,
			packageContent.optionalDependencies,
			packageContent.peerDependencies,
			packageContent.bundledDependencies
		].some(hasKeys)) return;
		return packageContent;
	} catch (error_) {
		const error = error_;
		if (paths.length > 0 && error.code === "ENOENT") context.report({
			messageId: "pkgNotFound",
			loc: {
				line: 0,
				column: 0
			}
		});
		if (error.name === "JSONError" || error instanceof SyntaxError) context.report({
			messageId: "pkgUnparsable",
			data: { error: error.message },
			loc: {
				line: 0,
				column: 0
			}
		});
	}
}
function getModuleOriginalName(name$1) {
	const [first, second] = name$1.split("/");
	return first.startsWith("@") ? `${first}/${second}` : first;
}
function checkDependencyDeclaration(deps, packageName, declarationStatus) {
	const newDeclarationStatus = declarationStatus || {
		isInDeps: false,
		isInDevDeps: false,
		isInOptDeps: false,
		isInPeerDeps: false,
		isInBundledDeps: false
	};
	const packageHierarchy = [];
	const packageNameParts = packageName ? packageName.split("/") : [];
	for (const [index, namePart] of packageNameParts.entries()) if (!namePart.startsWith("@")) {
		const ancestor = packageNameParts.slice(0, index + 1).join("/");
		packageHierarchy.push(ancestor);
	}
	return packageHierarchy.reduce((result, ancestorName) => ({
		isInDeps: result.isInDeps || deps.dependencies[ancestorName] !== void 0,
		isInDevDeps: result.isInDevDeps || deps.devDependencies[ancestorName] !== void 0,
		isInOptDeps: result.isInOptDeps || deps.optionalDependencies[ancestorName] !== void 0,
		isInPeerDeps: result.isInPeerDeps || deps.peerDependencies[ancestorName] !== void 0,
		isInBundledDeps: result.isInBundledDeps || deps.bundledDependencies.includes(ancestorName)
	}), newDeclarationStatus);
}
function reportIfMissing(context, deps, depsOptions, node, name$1, whitelist) {
	if (!depsOptions.verifyTypeImports && ("importKind" in node && (node.importKind === "type" || node.importKind === "typeof") || "exportKind" in node && node.exportKind === "type" || "specifiers" in node && Array.isArray(node.specifiers) && node.specifiers.length > 0 && node.specifiers.every((specifier) => "importKind" in specifier && (specifier.importKind === "type" || specifier.importKind === "typeof")))) return;
	const typeOfImport = importType(name$1, context);
	if (typeOfImport !== "external" && (typeOfImport !== "internal" || !depsOptions.verifyInternalDeps)) return;
	const resolved = resolve(name$1, context);
	if (!resolved) return;
	const importPackageName = getModuleOriginalName(name$1);
	let declarationStatus = checkDependencyDeclaration(deps, importPackageName);
	if (declarationStatus.isInDeps || depsOptions.allowDevDeps && declarationStatus.isInDevDeps || depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps || depsOptions.allowOptDeps && declarationStatus.isInOptDeps || depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps) return;
	const realPackageName = getFilePackageName(resolved);
	if (realPackageName && realPackageName !== importPackageName) {
		declarationStatus = checkDependencyDeclaration(deps, realPackageName, declarationStatus);
		if (declarationStatus.isInDeps || depsOptions.allowDevDeps && declarationStatus.isInDevDeps || depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps || depsOptions.allowOptDeps && declarationStatus.isInOptDeps || depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps) return;
	}
	const packageName = realPackageName || importPackageName;
	if (whitelist?.has(packageName)) return;
	if (declarationStatus.isInDevDeps && !depsOptions.allowDevDeps) {
		context.report({
			node,
			messageId: "devDep",
			data: { packageName }
		});
		return;
	}
	if (declarationStatus.isInOptDeps && !depsOptions.allowOptDeps) {
		context.report({
			node,
			messageId: "optDep",
			data: { packageName }
		});
		return;
	}
	context.report({
		node,
		messageId: "missing",
		data: { packageName }
	});
}
function testConfig(config, context) {
	if (typeof config === "boolean" || config === void 0) return config;
	const filename = context.physicalFilename;
	return config.some((c) => (0, minimatch.minimatch)(filename, c) || (0, minimatch.minimatch)(filename, node_path.default.resolve(context.cwd, c), { windowsPathsNoEscape: true }) || (0, minimatch.minimatch)(filename, node_path.default.resolve(c), { windowsPathsNoEscape: true }));
}
var no_extraneous_dependencies_default = createRule({
	name: "no-extraneous-dependencies",
	meta: {
		type: "problem",
		docs: {
			category: "Helpful warnings",
			description: "Forbid the use of extraneous packages."
		},
		schema: [{
			type: "object",
			properties: {
				devDependencies: { type: ["boolean", "array"] },
				optionalDependencies: { type: ["boolean", "array"] },
				peerDependencies: { type: ["boolean", "array"] },
				bundledDependencies: { type: ["boolean", "array"] },
				packageDir: { type: ["string", "array"] },
				includeInternal: { type: ["boolean"] },
				includeTypes: { type: ["boolean"] },
				whitelist: { type: ["array"] }
			},
			additionalProperties: false
		}],
		messages: {
			pkgNotFound: "The package.json file could not be found.",
			pkgUnparsable: "The package.json file could not be parsed: {{error}}",
			devDep: "'{{packageName}}' should be listed in the project's dependencies, not devDependencies.",
			optDep: "'{{packageName}}' should be listed in the project's dependencies, not optionalDependencies.",
			missing: `'{{packageName}}' should be listed in the project's dependencies. Run '${getNpmInstallCommand("{{packageName}}")}' to add it`
		}
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		const deps = getDependencies(context, options.packageDir) || extractDepFields({});
		const depsOptions = {
			allowDevDeps: testConfig(options.devDependencies, context) !== false,
			allowOptDeps: testConfig(options.optionalDependencies, context) !== false,
			allowPeerDeps: testConfig(options.peerDependencies, context) !== false,
			allowBundledDeps: testConfig(options.bundledDependencies, context) !== false,
			verifyInternalDeps: !!options.includeInternal,
			verifyTypeImports: !!options.includeTypes
		};
		return {
			...moduleVisitor((source, node) => {
				reportIfMissing(context, deps, depsOptions, node, source.value, options.whitelist ? new Set(options.whitelist) : void 0);
			}, { commonjs: true }),
			"Program:exit"() {
				depFieldCache.clear();
			}
		};
	}
});

//#endregion
//#region src/rules/no-import-module-exports.ts
function getEntryPoint(context) {
	const pkgPath = pkgUp({ cwd: context.physicalFilename });
	try {
		return cjsRequire.resolve(node_path.default.dirname(pkgPath));
	} catch {
		return null;
	}
}
function findScope(context, identifier) {
	const { scopeManager } = context.sourceCode;
	return scopeManager?.scopes.slice().reverse().find((scope) => scope.variables.some((variable) => variable.identifiers.some((node) => node.name === identifier)));
}
function findDefinition(objectScope, identifier) {
	const variable = objectScope.variables.find((variable$1) => variable$1.name === identifier);
	return variable.defs.find((def) => "name" in def.name && def.name.name === identifier);
}
var no_import_module_exports_default = createRule({
	name: "no-import-module-exports",
	meta: {
		type: "problem",
		docs: {
			category: "Module systems",
			description: "Forbid import statements with CommonJS module.exports.",
			recommended: true
		},
		fixable: "code",
		schema: [{
			type: "object",
			properties: { exceptions: { type: "array" } },
			additionalProperties: false
		}],
		messages: { notAllowed: "Cannot use import declarations in modules that export using CommonJS (module.exports = 'foo' or exports.bar = 'hi')" }
	},
	defaultOptions: [],
	create(context) {
		const importDeclarations = [];
		const entryPoint = getEntryPoint(context);
		const options = context.options[0] || {};
		let alreadyReported = false;
		return {
			ImportDeclaration(node) {
				importDeclarations.push(node);
			},
			MemberExpression(node) {
				if (alreadyReported) return;
				const filename = context.physicalFilename;
				const isEntryPoint = entryPoint === filename;
				const isIdentifier = node.object.type === "Identifier";
				if (!("name" in node.object)) return;
				const hasKeywords = /^(module|exports)$/.test(node.object.name);
				const objectScope = hasKeywords ? findScope(context, node.object.name) : void 0;
				const variableDefinition = objectScope && findDefinition(objectScope, node.object.name);
				const isImportBinding = variableDefinition?.type === "ImportBinding";
				const hasCJSExportReference = hasKeywords && (!objectScope || objectScope.type === "module");
				if (isIdentifier && hasCJSExportReference && !isEntryPoint && !options.exceptions?.some((glob) => (0, minimatch.minimatch)(filename, glob, { nocomment: true })) && !isImportBinding) {
					for (const importDeclaration$1 of importDeclarations) context.report({
						node: importDeclaration$1,
						messageId: "notAllowed"
					});
					alreadyReported = true;
				}
			}
		};
	}
});

//#endregion
//#region src/rules/no-internal-modules.ts
function normalizeSep(somePath) {
	return somePath.split("\\").join("/");
}
function toSteps(somePath) {
	return normalizeSep(somePath).split("/").filter((step) => step && step !== ".").reduce((acc, step) => {
		if (step === "..") return acc.slice(0, -1);
		return [...acc, step];
	}, []);
}
const potentialViolationTypes$1 = new Set([
	"parent",
	"index",
	"sibling",
	"external",
	"internal"
]);
var no_internal_modules_default = createRule({
	name: "no-internal-modules",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid importing the submodules of other modules."
		},
		schema: [{ anyOf: [{
			type: "object",
			properties: { allow: {
				type: "array",
				items: { type: "string" }
			} },
			additionalProperties: false
		}, {
			type: "object",
			properties: { forbid: {
				type: "array",
				items: { type: "string" }
			} },
			additionalProperties: false
		}] }],
		messages: { noAllowed: `Reaching to "{{importPath}}" is not allowed.` }
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		const allowRegexps = (options.allow || []).map((p) => (0, minimatch.makeRe)(p)).filter(Boolean);
		const forbidRegexps = (options.forbid || []).map((p) => (0, minimatch.makeRe)(p)).filter(Boolean);
		function reachingAllowed(importPath) {
			return allowRegexps.some((re) => re.test(importPath));
		}
		function reachingForbidden(importPath) {
			return forbidRegexps.some((re) => re.test(importPath));
		}
		function isAllowViolation(importPath) {
			const steps = toSteps(importPath);
			const nonScopeSteps = steps.filter((step) => step.indexOf("@") !== 0);
			if (nonScopeSteps.length <= 1) return false;
			const justSteps = steps.join("/");
			if (reachingAllowed(justSteps) || reachingAllowed(`/${justSteps}`)) return false;
			const resolved = resolve(importPath, context);
			if (!resolved || reachingAllowed(normalizeSep(resolved))) return false;
			return true;
		}
		function isForbidViolation(importPath) {
			const steps = toSteps(importPath);
			const justSteps = steps.join("/");
			if (reachingForbidden(justSteps) || reachingForbidden(`/${justSteps}`)) return true;
			const resolved = resolve(importPath, context);
			if (resolved && reachingForbidden(normalizeSep(resolved))) return true;
			return false;
		}
		const isReachViolation = options.forbid ? isForbidViolation : isAllowViolation;
		return moduleVisitor((source) => {
			const importPath = source.value;
			if (potentialViolationTypes$1.has(importType(importPath, context)) && isReachViolation(importPath)) context.report({
				node: source,
				messageId: "noAllowed",
				data: { importPath }
			});
		}, { commonjs: true });
	}
});

//#endregion
//#region src/rules/no-mutable-exports.ts
var no_mutable_exports_default = createRule({
	name: "no-mutable-exports",
	meta: {
		type: "suggestion",
		docs: {
			category: "Helpful warnings",
			description: "Forbid the use of mutable exports with `var` or `let`."
		},
		schema: [],
		messages: { noMutable: "Exporting mutable '{{kind}}' binding, use 'const' instead." }
	},
	defaultOptions: [],
	create(context) {
		function checkDeclaration(node) {
			if ("kind" in node && (node.kind === "var" || node.kind === "let")) context.report({
				node,
				messageId: "noMutable",
				data: { kind: node.kind }
			});
		}
		function checkDeclarationsInScope({ variables }, name$1) {
			for (const variable of variables) if (variable.name === name$1) {
				for (const def of variable.defs) if (def.type === "Variable" && def.parent) checkDeclaration(def.parent);
			}
		}
		return {
			ExportDefaultDeclaration(node) {
				const scope = context.sourceCode.getScope(node);
				if ("name" in node.declaration) checkDeclarationsInScope(scope, node.declaration.name);
			},
			ExportNamedDeclaration(node) {
				const scope = context.sourceCode.getScope(node);
				if (node.declaration) checkDeclaration(node.declaration);
				else if (!node.source) for (const specifier of node.specifiers) checkDeclarationsInScope(scope, specifier.local.name);
			}
		};
	}
});

//#endregion
//#region src/rules/no-named-as-default-member.ts
var no_named_as_default_member_default = createRule({
	name: "no-named-as-default-member",
	meta: {
		type: "suggestion",
		docs: {
			category: "Helpful warnings",
			description: "Forbid use of exported name as property of default export."
		},
		schema: [],
		messages: { member: "Caution: `{{objectName}}` also has a named export `{{propName}}`. Check if you meant to write `import {{{propName}}} from '{{sourcePath}}'` instead." }
	},
	defaultOptions: [],
	create(context) {
		const fileImports = /* @__PURE__ */ new Map();
		const allPropertyLookups = /* @__PURE__ */ new Map();
		function storePropertyLookup(objectName, propName, node) {
			const lookups = allPropertyLookups.get(objectName) || [];
			lookups.push({
				node,
				propName
			});
			allPropertyLookups.set(objectName, lookups);
		}
		return {
			ImportDefaultSpecifier(node) {
				const declaration = importDeclaration(context, node);
				const exportMap = ExportMap.get(declaration.source.value, context);
				if (exportMap == null) return;
				if (exportMap.errors.length > 0) {
					exportMap.reportErrors(context, declaration);
					return;
				}
				fileImports.set(node.local.name, {
					exportMap,
					sourcePath: declaration.source.value
				});
			},
			MemberExpression(node) {
				if ("name" in node.object && "name" in node.property) storePropertyLookup(node.object.name, node.property.name, node);
			},
			VariableDeclarator(node) {
				const isDestructure = node.id.type === "ObjectPattern" && node.init?.type === "Identifier";
				if (!isDestructure || !node.init || !("name" in node.init) || !("properties" in node.id)) return;
				const objectName = node.init.name;
				for (const prop of node.id.properties) {
					if (!("key" in prop) || !("name" in prop.key)) continue;
					storePropertyLookup(objectName, prop.key.name, prop.key);
				}
			},
			"Program:exit"() {
				for (const [objectName, lookups] of allPropertyLookups.entries()) {
					const fileImport = fileImports.get(objectName);
					if (fileImport == null) continue;
					for (const { propName, node } of lookups) {
						if (propName === "default") continue;
						if (!fileImport.exportMap.namespace.has(propName)) continue;
						context.report({
							node,
							messageId: "member",
							data: {
								objectName,
								propName,
								sourcePath: fileImport.sourcePath
							}
						});
					}
				}
			}
		};
	}
});

//#endregion
//#region src/rules/no-named-as-default.ts
var no_named_as_default_default = createRule({
	name: "no-named-as-default",
	meta: {
		type: "problem",
		docs: {
			category: "Helpful warnings",
			description: "Forbid use of exported name as identifier of default export."
		},
		schema: [],
		messages: { default: "Using exported name '{{name}}' as identifier for default export." }
	},
	defaultOptions: [],
	create(context) {
		function createCheckDefault(nameKey) {
			return function checkDefault(defaultSpecifier) {
				const nameValue = defaultSpecifier[nameKey].name;
				if (nameValue === "default") return;
				const declaration = importDeclaration(context, defaultSpecifier);
				const exportMapOfImported = ExportMap.get(declaration.source.value, context);
				if (exportMapOfImported == null) return;
				if (exportMapOfImported.errors.length > 0) {
					exportMapOfImported.reportErrors(context, declaration);
					return;
				}
				if (!exportMapOfImported.hasDefault) return;
				if (!exportMapOfImported.has(nameValue)) return;
				if (exportMapOfImported.exports.has("default") && exportMapOfImported.exports.has(nameValue)) context.report({
					node: defaultSpecifier,
					messageId: "default",
					data: { name: nameValue }
				});
			};
		}
		return {
			ImportDefaultSpecifier: createCheckDefault("local"),
			ExportDefaultSpecifier: createCheckDefault("exported")
		};
	}
});

//#endregion
//#region src/rules/no-named-default.ts
var no_named_default_default = createRule({
	name: "no-named-default",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Forbid named default exports."
		},
		schema: [],
		messages: { default: `Use default import syntax to import '{{importName}}'.` }
	},
	defaultOptions: [],
	create(context) {
		return { ImportDeclaration(node) {
			for (const im of node.specifiers) {
				if ("importKind" in im && (im.importKind === "type" || im.importKind === "typeof")) continue;
				if (im.type === "ImportSpecifier" && getValue(im.imported) === "default") context.report({
					node: im.local,
					messageId: "default",
					data: { importName: im.local.name }
				});
			}
		} };
	}
});

//#endregion
//#region src/rules/no-named-export.ts
var no_named_export_default = createRule({
	name: "no-named-export",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Forbid named exports."
		},
		schema: [],
		messages: { noAllowed: "Named exports are not allowed." }
	},
	defaultOptions: [],
	create(context) {
		if (sourceType(context) !== "module") return {};
		return {
			ExportAllDeclaration(node) {
				context.report({
					node,
					messageId: "noAllowed"
				});
			},
			ExportNamedDeclaration(node) {
				if (node.specifiers.length === 0) return context.report({
					node,
					messageId: "noAllowed"
				});
				const someNamed = node.specifiers.some((specifier) => getValue(specifier.exported) !== "default");
				if (someNamed) context.report({
					node,
					messageId: "noAllowed"
				});
			}
		};
	}
});

//#endregion
//#region src/rules/no-namespace.ts
var no_namespace_default = createRule({
	name: "no-namespace",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Forbid namespace (a.k.a. \"wildcard\" `*`) imports."
		},
		fixable: "code",
		schema: [{
			type: "object",
			properties: { ignore: {
				type: "array",
				items: { type: "string" },
				uniqueItems: true
			} }
		}],
		messages: { noNamespace: "Unexpected namespace import." }
	},
	defaultOptions: [],
	create(context) {
		const firstOption = context.options[0] || {};
		const ignoreGlobs = firstOption.ignore;
		return { ImportNamespaceSpecifier(node) {
			if (ignoreGlobs?.find((glob) => (0, minimatch.minimatch)(node.parent.source.value, glob, {
				matchBase: true,
				nocomment: true
			}))) return;
			const scopeVariables = context.sourceCode.getScope(node).variables;
			const namespaceVariable = scopeVariables.find((variable) => variable.defs[0].node === node);
			const namespaceReferences = namespaceVariable.references;
			const namespaceIdentifiers = namespaceReferences.map((reference) => reference.identifier);
			const canFix = namespaceIdentifiers.length > 0 && !usesNamespaceAsObject(namespaceIdentifiers);
			context.report({
				node,
				messageId: `noNamespace`,
				fix: canFix ? (fixer) => {
					const scopeManager = context.sourceCode.scopeManager;
					const fixes = [];
					const importNameConflicts = {};
					for (const identifier of namespaceIdentifiers) {
						const parent = identifier.parent;
						if (parent && parent.type === "MemberExpression") {
							const importName = getMemberPropertyName(parent);
							const localConflicts = getVariableNamesInScope(scopeManager, parent);
							if (importNameConflicts[importName]) for (const c of localConflicts) importNameConflicts[importName].add(c);
							else importNameConflicts[importName] = localConflicts;
						}
					}
					const importNames = Object.keys(importNameConflicts);
					const importLocalNames = generateLocalNames(importNames, importNameConflicts, namespaceVariable.name);
					const namedImportSpecifiers = importNames.map((importName) => importName === importLocalNames[importName] ? importName : `${importName} as ${importLocalNames[importName]}`);
					fixes.push(fixer.replaceText(node, `{ ${namedImportSpecifiers.join(", ")} }`));
					for (const identifier of namespaceIdentifiers) {
						const parent = identifier.parent;
						if (parent && parent.type === "MemberExpression") {
							const importName = getMemberPropertyName(parent);
							fixes.push(fixer.replaceText(parent, importLocalNames[importName]));
						}
					}
					return fixes;
				} : null
			});
		} };
	}
});
function usesNamespaceAsObject(namespaceIdentifiers) {
	return !namespaceIdentifiers.every((identifier) => {
		const parent = identifier.parent;
		return parent && parent.type === "MemberExpression" && (parent.property.type === "Identifier" || parent.property.type === "Literal");
	});
}
function getMemberPropertyName(memberExpression) {
	return memberExpression.property.type === "Identifier" ? memberExpression.property.name : memberExpression.property.value;
}
function getVariableNamesInScope(scopeManager, node) {
	let currentNode = node;
	let scope = scopeManager.acquire(currentNode);
	while (scope == null) {
		currentNode = currentNode.parent;
		scope = scopeManager.acquire(currentNode, true);
	}
	return new Set([...scope.variables, ...scope.upper.variables].map((variable) => variable.name));
}
function generateLocalNames(names, nameConflicts, namespaceName) {
	const localNames = {};
	for (const name$1 of names) {
		let localName;
		if (!nameConflicts[name$1].has(name$1)) localName = name$1;
		else if (nameConflicts[name$1].has(`${namespaceName}_${name$1}`)) {
			for (let i = 1; i < Number.POSITIVE_INFINITY; i++) if (!nameConflicts[name$1].has(`${namespaceName}_${name$1}_${i}`)) {
				localName = `${namespaceName}_${name$1}_${i}`;
				break;
			}
		} else localName = `${namespaceName}_${name$1}`;
		localNames[name$1] = localName;
	}
	return localNames;
}

//#endregion
//#region src/rules/no-nodejs-modules.ts
var no_nodejs_modules_default = createRule({
	name: "no-nodejs-modules",
	meta: {
		type: "suggestion",
		docs: {
			category: "Module systems",
			description: "Forbid Node.js builtin modules."
		},
		schema: [{
			type: "object",
			properties: { allow: {
				type: "array",
				uniqueItems: true,
				items: { type: "string" }
			} },
			additionalProperties: false
		}],
		messages: { builtin: "Do not import Node.js builtin module \"{{moduleName}}\"" }
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		const allowed = options.allow || [];
		return moduleVisitor((source, node) => {
			const moduleName = source.value;
			if (!allowed.includes(moduleName) && importType(moduleName, context) === "builtin") context.report({
				node,
				messageId: "builtin",
				data: { moduleName }
			});
		}, { commonjs: true });
	}
});

//#endregion
//#region src/rules/no-relative-packages.ts
function toPosixPath(filePath) {
	return filePath.replaceAll("\\", "/");
}
function findNamedPackage(filePath) {
	const found = readPkgUp({ cwd: filePath });
	if (found.pkg && !found.pkg.name) return findNamedPackage(node_path.default.resolve(found.path, "../.."));
	return found;
}
const potentialViolationTypes = new Set([
	"parent",
	"index",
	"sibling"
]);
function checkImportForRelativePackage(context, importPath, node) {
	if (!potentialViolationTypes.has(importType(importPath, context))) return;
	const resolvedImport = resolve(importPath, context);
	const resolvedContext = context.physicalFilename;
	if (!resolvedImport || !resolvedContext) return;
	const importPkg = findNamedPackage(resolvedImport);
	const contextPkg = findNamedPackage(resolvedContext);
	if (importPkg.pkg && contextPkg.pkg && importPkg.pkg.name !== contextPkg.pkg.name) {
		const importBaseName = node_path.default.basename(importPath);
		const importRoot = node_path.default.dirname(importPkg.path);
		const properPath = node_path.default.relative(importRoot, resolvedImport);
		const properImport = node_path.default.join(importPkg.pkg.name, node_path.default.dirname(properPath), importBaseName === node_path.default.basename(importRoot) ? "" : importBaseName);
		context.report({
			node,
			messageId: "noAllowed",
			data: {
				properImport,
				importPath
			},
			fix: (fixer) => fixer.replaceText(node, JSON.stringify(toPosixPath(properImport)))
		});
	}
}
var no_relative_packages_default = createRule({
	name: "no-relative-packages",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid importing packages through relative paths."
		},
		fixable: "code",
		schema: [makeOptionsSchema()],
		messages: { noAllowed: "Relative import from another package is not allowed. Use `{{properImport}}` instead of `{{importPath}}`" }
	},
	defaultOptions: [],
	create(context) {
		return moduleVisitor((source) => checkImportForRelativePackage(context, source.value, source), context.options[0]);
	}
});

//#endregion
//#region src/rules/no-relative-parent-imports.ts
var no_relative_parent_imports_default = createRule({
	name: "no-relative-parent-imports",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid importing modules from parent directories."
		},
		schema: [makeOptionsSchema()],
		messages: { noAllowed: "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `{{filename}}` to same directory as `{{depPath}}` or consider making `{{depPath}}` a package." }
	},
	defaultOptions: [],
	create(context) {
		const filename = context.physicalFilename;
		if (filename === "<text>") return {};
		return moduleVisitor((sourceNode) => {
			const depPath = sourceNode.value;
			if (importType(depPath, context) === "external") return;
			const absDepPath = resolve(depPath, context);
			if (!absDepPath) return;
			const relDepPath = node_path.default.relative(node_path.default.dirname(filename), absDepPath);
			if (importType(relDepPath, context) === "parent") context.report({
				node: sourceNode,
				messageId: "noAllowed",
				data: {
					filename: node_path.default.basename(filename),
					depPath
				}
			});
		}, context.options[0]);
	}
});

//#endregion
//#region src/rules/no-rename-default.ts
var no_rename_default_default = createRule({
	name: "no-rename-default",
	meta: {
		type: "suggestion",
		docs: {
			category: "Helpful warnings",
			description: "Forbid importing a default export by a different name."
		},
		schema: [{
			type: "object",
			properties: {
				commonjs: {
					default: false,
					type: "boolean"
				},
				preventRenamingBindings: {
					default: true,
					type: "boolean"
				}
			},
			additionalProperties: false
		}],
		messages: { renameDefault: "Caution: `{{importBasename}}` has a default export `{{defaultExportName}}`. This {{requiresOrImports}} `{{defaultExportName}}` as `{{importName}}`. Check if you meant to write `{{suggestion}}` instead." }
	},
	defaultOptions: [],
	create(context) {
		const { commonjs = false, preventRenamingBindings = true } = context.options[0] || {};
		function getDefaultExportName(targetNode) {
			if (targetNode == null) return;
			switch (targetNode.type) {
				case "AssignmentExpression": {
					if (!preventRenamingBindings) return;
					if (targetNode.left.type !== "Identifier") return;
					return targetNode.left.name;
				}
				case "CallExpression": {
					const [argumentNode] = targetNode.arguments;
					return getDefaultExportName(argumentNode);
				}
				case "ClassDeclaration": {
					if (targetNode.id && typeof targetNode.id.name === "string") return targetNode.id.name;
					return;
				}
				case "ExportSpecifier": return getValue(targetNode.local);
				case "FunctionDeclaration": return targetNode.id?.name;
				case "Identifier": {
					if (!preventRenamingBindings) return;
					return targetNode.name;
				}
				default:
			}
		}
		function getExportMap(source) {
			if (!source) return;
			const exportMap = ExportMap.get(source.value, context);
			if (exportMap == null) return;
			if (exportMap.errors.length > 0) {
				exportMap.reportErrors(context, { source });
				return;
			}
			return exportMap;
		}
		function handleImport(node) {
			const exportMap = getExportMap(node.parent.source);
			if (exportMap == null) return;
			const defaultExportNode = getDefaultExportNode(exportMap);
			if (defaultExportNode == null) return;
			const defaultExportName = getDefaultExportName(defaultExportNode);
			if (defaultExportName === void 0) return;
			const importTarget = node.parent.source?.value;
			const importBasename = node_path.default.basename(exportMap.path);
			if (node.type === "ImportDefaultSpecifier") {
				const importName = node.local.name;
				if (importName === defaultExportName) return;
				context.report({
					node,
					messageId: "renameDefault",
					data: {
						importBasename,
						defaultExportName,
						importName,
						requiresOrImports: "imports",
						suggestion: `import ${defaultExportName} from '${importTarget}'`
					}
				});
				return;
			}
			if (node.type !== "ImportSpecifier") return;
			if (getValue(node.imported) !== "default") return;
			const actualImportedName = node.local.name;
			if (actualImportedName === defaultExportName) return;
			context.report({
				node,
				messageId: "renameDefault",
				data: {
					importBasename,
					defaultExportName,
					importName: actualImportedName,
					requiresOrImports: "imports",
					suggestion: `import { default as ${defaultExportName} } from '${importTarget}'`
				}
			});
		}
		function handleRequire(node) {
			if (!commonjs || node.type !== "VariableDeclarator" || !node.id || !(node.id.type === "Identifier" || node.id.type === "ObjectPattern") || !node.init || node.init.type !== "CallExpression") return;
			let defaultDestructure;
			if (node.id.type === "ObjectPattern") {
				defaultDestructure = findDefaultDestructure(node.id.properties);
				if (defaultDestructure === void 0) return;
			}
			const call = node.init;
			const [source] = call.arguments;
			if (call.callee.type !== "Identifier" || call.callee.name !== "require" || call.arguments.length !== 1 || source.type !== "Literal" || typeof source.value !== "string") return;
			const exportMap = getExportMap(source);
			if (exportMap == null) return;
			const defaultExportNode = getDefaultExportNode(exportMap);
			if (defaultExportNode == null) return;
			const defaultExportName = getDefaultExportName(defaultExportNode);
			const requireTarget = source.value;
			const requireBasename = node_path.default.basename(exportMap.path);
			let requireName;
			if (node.id.type === "Identifier") requireName = node.id.name;
			else if (defaultDestructure?.value?.type === "Identifier") requireName = defaultDestructure.value.name;
			else requireName = "";
			if (defaultExportName === void 0) return;
			if (requireName === defaultExportName) return;
			if (node.id.type === "Identifier") {
				context.report({
					node,
					messageId: "renameDefault",
					data: {
						importBasename: requireBasename,
						defaultExportName,
						importName: requireName,
						requiresOrImports: "requires",
						suggestion: `const ${defaultExportName} = require('${requireTarget}')`
					}
				});
				return;
			}
			context.report({
				node,
				messageId: "renameDefault",
				data: {
					importBasename: requireBasename,
					defaultExportName,
					importName: requireName,
					requiresOrImports: "requires",
					suggestion: `const { default: ${defaultExportName} } = require('${requireTarget}')`
				}
			});
		}
		return {
			ImportDefaultSpecifier: handleImport,
			ImportSpecifier: handleImport,
			VariableDeclarator: handleRequire
		};
	}
});
function findDefaultDestructure(properties$1) {
	const found = properties$1.find((property) => {
		if ("key" in property && "name" in property.key && property.key.name === "default") return property;
	});
	return found;
}
function getDefaultExportNode(exportMap) {
	const defaultExportNode = exportMap.exports.get("default");
	if (defaultExportNode == null) return;
	switch (defaultExportNode.type) {
		case "ExportDefaultDeclaration": return defaultExportNode.declaration;
		case "ExportNamedDeclaration": return defaultExportNode.specifiers.find((specifier) => getValue(specifier.exported) === "default");
		default: return;
	}
}

//#endregion
//#region src/rules/no-restricted-paths.ts
const containsPath = (filepath, target) => {
	const relative$1 = node_path.default.relative(target, filepath);
	return relative$1 === "" || !relative$1.startsWith("..");
};
function isMatchingTargetPath(filename, targetPath) {
	if ((0, is_glob.default)(targetPath)) {
		const mm = new minimatch.Minimatch(targetPath, { windowsPathsNoEscape: true });
		return mm.match(filename);
	}
	return containsPath(filename, targetPath);
}
function areBothGlobPatternAndAbsolutePath(areGlobPatterns) {
	return areGlobPatterns.some(Boolean) && areGlobPatterns.some((isGlob$1) => !isGlob$1);
}
var no_restricted_paths_default = createRule({
	name: "no-restricted-paths",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Enforce which files can be imported in a given folder."
		},
		schema: [{
			type: "object",
			properties: {
				zones: {
					type: "array",
					minItems: 1,
					items: {
						type: "object",
						properties: {
							target: { anyOf: [{ type: "string" }, {
								type: "array",
								items: { type: "string" },
								uniqueItems: true,
								minItems: 1
							}] },
							from: { anyOf: [{ type: "string" }, {
								type: "array",
								items: { type: "string" },
								uniqueItems: true,
								minItems: 1
							}] },
							except: {
								type: "array",
								items: { type: "string" },
								uniqueItems: true
							},
							message: { type: "string" }
						},
						additionalProperties: false
					}
				},
				basePath: { type: "string" }
			},
			additionalProperties: false
		}],
		messages: {
			path: "Restricted path exceptions must be descendants of the configured `from` path for that zone.",
			mixedGlob: "Restricted path `from` must contain either only glob patterns or none",
			glob: "Restricted path exceptions must be glob patterns when `from` contains glob patterns",
			zone: "Unexpected path \"{{importPath}}\" imported in restricted zone.{{extra}}"
		}
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		const restrictedPaths = options.zones || [];
		const basePath = options.basePath || process.cwd();
		const filename = context.physicalFilename;
		const matchingZones = restrictedPaths.filter((zone) => [zone.target].flat().map((target) => node_path.default.resolve(basePath, target)).some((targetPath) => isMatchingTargetPath(filename, targetPath)));
		function isValidExceptionPath(absoluteFromPath, absoluteExceptionPath) {
			const relativeExceptionPath = node_path.default.relative(absoluteFromPath, absoluteExceptionPath);
			return importType(relativeExceptionPath, context) !== "parent";
		}
		function reportInvalidExceptionPath(node) {
			context.report({
				node,
				messageId: "path"
			});
		}
		function reportInvalidExceptionMixedGlobAndNonGlob(node) {
			context.report({
				node,
				messageId: "mixedGlob"
			});
		}
		function reportInvalidExceptionGlob(node) {
			context.report({
				node,
				messageId: "glob"
			});
		}
		function computeMixedGlobAndAbsolutePathValidator() {
			return {
				isPathRestricted: () => true,
				hasValidExceptions: false,
				reportInvalidException: reportInvalidExceptionMixedGlobAndNonGlob
			};
		}
		function computeGlobPatternPathValidator(absoluteFrom, zoneExcept) {
			let isPathException;
			const mm = new minimatch.Minimatch(absoluteFrom, { windowsPathsNoEscape: true });
			const isPathRestricted = (absoluteImportPath) => mm.match(absoluteImportPath);
			const hasValidExceptions = zoneExcept.every((it) => (0, is_glob.default)(it));
			if (hasValidExceptions) {
				const exceptionsMm = zoneExcept.map((except) => new minimatch.Minimatch(except, { windowsPathsNoEscape: true }));
				isPathException = (absoluteImportPath) => exceptionsMm.some((mm$1) => mm$1.match(absoluteImportPath));
			}
			const reportInvalidException = reportInvalidExceptionGlob;
			return {
				isPathRestricted,
				hasValidExceptions,
				isPathException,
				reportInvalidException
			};
		}
		function computeAbsolutePathValidator(absoluteFrom, zoneExcept) {
			let isPathException;
			const isPathRestricted = (absoluteImportPath) => containsPath(absoluteImportPath, absoluteFrom);
			const absoluteExceptionPaths = zoneExcept.map((exceptionPath) => node_path.default.resolve(absoluteFrom, exceptionPath));
			const hasValidExceptions = absoluteExceptionPaths.every((absoluteExceptionPath) => isValidExceptionPath(absoluteFrom, absoluteExceptionPath));
			if (hasValidExceptions) isPathException = (absoluteImportPath) => absoluteExceptionPaths.some((absoluteExceptionPath) => containsPath(absoluteImportPath, absoluteExceptionPath));
			const reportInvalidException = reportInvalidExceptionPath;
			return {
				isPathRestricted,
				hasValidExceptions,
				isPathException,
				reportInvalidException
			};
		}
		function reportInvalidExceptions(validators$1, node) {
			for (const validator of validators$1) validator.reportInvalidException(node);
		}
		function reportImportsInRestrictedZone(validators$1, node, importPath, customMessage) {
			for (const _ of validators$1) context.report({
				node,
				messageId: "zone",
				data: {
					importPath,
					extra: customMessage ? ` ${customMessage}` : ""
				}
			});
		}
		const makePathValidators = (zoneFrom, zoneExcept = []) => {
			const allZoneFrom = [zoneFrom].flat();
			const areGlobPatterns = allZoneFrom.map((it) => (0, is_glob.default)(it));
			if (areBothGlobPatternAndAbsolutePath(areGlobPatterns)) return [computeMixedGlobAndAbsolutePathValidator()];
			const isGlobPattern = areGlobPatterns.every(Boolean);
			return allZoneFrom.map((singleZoneFrom) => {
				const absoluteFrom = node_path.default.resolve(basePath, singleZoneFrom);
				if (isGlobPattern) return computeGlobPatternPathValidator(absoluteFrom, zoneExcept);
				return computeAbsolutePathValidator(absoluteFrom, zoneExcept);
			});
		};
		const validators = [];
		return moduleVisitor((source) => {
			const importPath = source.value;
			const absoluteImportPath = resolve(importPath, context);
			if (!absoluteImportPath) return;
			for (const [index, zone] of matchingZones.entries()) {
				if (!validators[index]) validators[index] = makePathValidators(zone.from, zone.except);
				const applicableValidatorsForImportPath = validators[index].filter((validator) => validator.isPathRestricted(absoluteImportPath));
				const validatorsWithInvalidExceptions = applicableValidatorsForImportPath.filter((validator) => !validator.hasValidExceptions);
				reportInvalidExceptions(validatorsWithInvalidExceptions, source);
				const applicableValidatorsForImportPathExcludingExceptions = applicableValidatorsForImportPath.filter((validator) => validator.hasValidExceptions && !validator.isPathException(absoluteImportPath));
				reportImportsInRestrictedZone(applicableValidatorsForImportPathExcludingExceptions, source, importPath, zone.message);
			}
		}, { commonjs: true });
	}
});

//#endregion
//#region src/rules/no-self-import.ts
function isImportingSelf(context, node, requireName) {
	const filename = context.physicalFilename;
	if (filename !== "<text>" && filename === resolve(requireName, context)) context.report({
		node,
		messageId: "self"
	});
}
var no_self_import_default = createRule({
	name: "no-self-import",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Forbid a module from importing itself.",
			recommended: true
		},
		schema: [],
		messages: { self: "Module imports itself." }
	},
	defaultOptions: [],
	create(context) {
		return moduleVisitor((source, node) => {
			isImportingSelf(context, node, source.value);
		}, { commonjs: true });
	}
});

//#endregion
//#region src/rules/no-unassigned-import.ts
function testIsAllow(globs, context, source) {
	if (!Array.isArray(globs)) return false;
	const filename = context.physicalFilename;
	const filePath = source[0] !== "." && source[0] !== "/" ? source : node_path.default.resolve(filename, "..", source);
	return globs.some((glob) => (0, minimatch.minimatch)(filePath, glob, { nocomment: true }) || (0, minimatch.minimatch)(filePath, node_path.default.resolve(context.cwd, glob), {
		nocomment: true,
		windowsPathsNoEscape: true
	}) || (0, minimatch.minimatch)(filePath, node_path.default.resolve(glob), {
		nocomment: true,
		windowsPathsNoEscape: true
	}));
}
var no_unassigned_import_default = createRule({
	name: "no-unassigned-import",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Forbid unassigned imports."
		},
		schema: [{
			type: "object",
			properties: {
				devDependencies: { type: ["boolean", "array"] },
				optionalDependencies: { type: ["boolean", "array"] },
				peerDependencies: { type: ["boolean", "array"] },
				allow: {
					type: "array",
					items: { type: "string" }
				}
			},
			additionalProperties: false
		}],
		messages: { unassigned: "Imported module should be assigned" }
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		const isAllow = (source) => testIsAllow(options.allow, context, source);
		return {
			ImportDeclaration(node) {
				if (node.specifiers.length === 0 && !isAllow(node.source.value)) context.report({
					node,
					messageId: "unassigned"
				});
			},
			ExpressionStatement(node) {
				if (node.expression.type === "CallExpression" && isStaticRequire(node.expression) && "value" in node.expression.arguments[0] && typeof node.expression.arguments[0].value === "string" && !isAllow(node.expression.arguments[0].value)) context.report({
					node: node.expression,
					messageId: "unassigned"
				});
			}
		};
	}
});

//#endregion
//#region src/rules/no-unresolved.ts
var no_unresolved_default = createRule({
	name: "no-unresolved",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Ensure imports point to a file/module that can be resolved."
		},
		schema: [makeOptionsSchema({
			caseSensitive: {
				type: "boolean",
				default: true
			},
			caseSensitiveStrict: { type: "boolean" }
		})],
		messages: {
			unresolved: "Unable to resolve path to module '{{module}}'.",
			casingMismatch: "Casing of {{module}} does not match the underlying filesystem."
		}
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		return moduleVisitor(function checkSourceValue(source, node) {
			if ("importKind" in node && node.importKind === "type" || "exportKind" in node && node.exportKind === "type") return;
			const caseSensitive = !CASE_SENSITIVE_FS && options.caseSensitive !== false;
			const caseSensitiveStrict = !CASE_SENSITIVE_FS && options.caseSensitiveStrict;
			const resolvedPath = resolve(source.value, context);
			if (resolvedPath === void 0) context.report({
				node: source,
				messageId: "unresolved",
				data: { module: source.value }
			});
			else if (caseSensitive || caseSensitiveStrict) {
				const cacheSettings = ModuleCache.getSettings(context.settings);
				if (!fileExistsWithCaseSync(resolvedPath, cacheSettings, caseSensitiveStrict)) context.report({
					node: source,
					messageId: "casingMismatch",
					data: { module: source.value }
				});
			}
		}, options);
	}
});

//#endregion
//#region src/rules/no-unused-modules.ts
const { FileEnumerator, shouldUseFlatConfig } = eslint_use_at_your_own_risk.default;
function listFilesUsingFileEnumerator(src, extensions) {
	const { ESLINT_USE_FLAT_CONFIG } = process.env;
	let isUsingFlatConfig;
	try {
		isUsingFlatConfig = shouldUseFlatConfig && ESLINT_USE_FLAT_CONFIG !== "false";
	} catch {
		isUsingFlatConfig = !!ESLINT_USE_FLAT_CONFIG && ESLINT_USE_FLAT_CONFIG !== "false";
	}
	const enumerator = new FileEnumerator({ extensions });
	try {
		return Array.from(enumerator.iterateFiles(src), ({ filePath, ignored }) => ({
			filename: filePath,
			ignored
		}));
	} catch (error) {
		if (isUsingFlatConfig && error.message.includes("No ESLint configuration found")) throw new Error(`
Due to the exclusion of certain internal ESLint APIs when using flat config,
the import-x/no-unused-modules rule requires an .eslintrc file (even empty) to know which
files to ignore (even when using flat config).
The .eslintrc file only needs to contain "ignorePatterns", or can be empty if
you do not want to ignore any files.

See https://github.com/import-js/eslint-plugin-import/issues/3079
for additional context.
`);
		throw error;
	}
}
const DEFAULT = "default";
const { AST_NODE_TYPES } = __typescript_eslint_types.TSESTree;
function forEachDeclarationIdentifier(declaration, cb) {
	if (declaration) {
		const isTypeDeclaration = declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration || declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration || declaration.type === AST_NODE_TYPES.TSEnumDeclaration;
		if (declaration.type === AST_NODE_TYPES.FunctionDeclaration || declaration.type === AST_NODE_TYPES.ClassDeclaration || isTypeDeclaration) cb(declaration.id.name, isTypeDeclaration);
		else if (declaration.type === AST_NODE_TYPES.VariableDeclaration) for (const { id } of declaration.declarations) if (id.type === AST_NODE_TYPES.ObjectPattern) recursivePatternCapture(id, (pattern$1) => {
			if (pattern$1.type === AST_NODE_TYPES.Identifier) cb(pattern$1.name, false);
		});
		else if (id.type === AST_NODE_TYPES.ArrayPattern) {
			for (const el of id.elements) if (el?.type === AST_NODE_TYPES.Identifier) cb(el.name, false);
		} else cb(id.name, false);
	}
}
/**
* List of imports per file.
*
* Represented by a two-level Map to a Set of identifiers. The upper-level Map
* keys are the paths to the modules containing the imports, while the
* lower-level Map keys are the paths to the files which are being imported
* from. Lastly, the Set of identifiers contains either names being imported or
* a special AST node name listed above (e.g ImportDefaultSpecifier).
*
* For example, if we have a file named foo.js containing:
*
* `import { o2 } from './bar.js';`
*
* Then we will have a structure that looks like:
*
* `Map { 'foo.js' => Map { 'bar.js' => Set { 'o2' } } }`
*/
const importList = /* @__PURE__ */ new Map();
/**
* List of exports per file.
*
* Represented by a two-level Map to an object of metadata. The upper-level Map
* keys are the paths to the modules containing the exports, while the
* lower-level Map keys are the specific identifiers or special AST node names
* being exported. The leaf-level metadata object at the moment only contains a
* `whereUsed` property, which contains a Set of paths to modules that import
* the name.
*
* For example, if we have a file named bar.js containing the following exports:
*
* `const o2 = 'bar'; export { o2 };`
*
* And a file named foo.js containing the following import:
*
* `import { o2 } from './bar.js';`
*
* Then we will have a structure that looks like:
*
* `Map { 'bar.js' => Map { 'o2' => { whereUsed: Set { 'foo.js' } } } }`
*/
const exportList = /* @__PURE__ */ new Map();
const visitorKeyMap = /* @__PURE__ */ new Map();
const ignoredFiles = /* @__PURE__ */ new Set();
const filesOutsideSrc = /* @__PURE__ */ new Set();
const isNodeModule = (path$22) => /([/\\])(node_modules)\1/.test(path$22);
/**
* Read all files matching the patterns in src and ignoreExports
*
* Return all files matching src pattern, which are not matching the
* ignoreExports pattern
*/
const resolveFiles = (src, ignoreExports, context) => {
	const extensions = [...getFileExtensions(context.settings)];
	const srcFileList = listFilesUsingFileEnumerator(src, extensions);
	const ignoredFilesList = listFilesUsingFileEnumerator(ignoreExports, extensions);
	for (const { filename } of ignoredFilesList) ignoredFiles.add(filename);
	return new Set(srcFileList.flatMap(({ filename }) => isNodeModule(filename) ? [] : filename));
};
/**
* Parse all source files and build up 2 maps containing the existing imports
* and exports
*/
const prepareImportsAndExports = (srcFiles$1, context) => {
	const exportAll = /* @__PURE__ */ new Map();
	for (const file of srcFiles$1) {
		const exports$1 = /* @__PURE__ */ new Map();
		const imports = /* @__PURE__ */ new Map();
		const currentExports = ExportMap.get(file, context);
		if (currentExports) {
			const { dependencies, reexports, imports: localImportList, namespace, visitorKeys } = currentExports;
			visitorKeyMap.set(file, visitorKeys);
			const currentExportAll = /* @__PURE__ */ new Set();
			for (const getDependency of dependencies) {
				const dependency = getDependency();
				if (dependency === null) continue;
				currentExportAll.add(dependency.path);
			}
			exportAll.set(file, currentExportAll);
			for (const [key, value] of reexports.entries()) {
				if (key === DEFAULT) exports$1.set(AST_NODE_TYPES.ImportDefaultSpecifier, { whereUsed: /* @__PURE__ */ new Set() });
				else exports$1.set(key, { whereUsed: /* @__PURE__ */ new Set() });
				const reexport = value.getImport();
				if (!reexport) continue;
				let localImport = imports.get(reexport.path);
				const currentValue = value.local === DEFAULT ? AST_NODE_TYPES.ImportDefaultSpecifier : value.local;
				localImport = localImport === void 0 ? new Set([currentValue]) : new Set([...localImport, currentValue]);
				imports.set(reexport.path, localImport);
			}
			for (const [key, value] of localImportList.entries()) {
				if (isNodeModule(key)) continue;
				const localImport = imports.get(key) || /* @__PURE__ */ new Set();
				for (const { importedSpecifiers } of value.declarations) for (const specifier of importedSpecifiers) localImport.add(specifier);
				imports.set(key, localImport);
			}
			importList.set(file, imports);
			if (ignoredFiles.has(file)) continue;
			for (const [key, _value] of namespace.entries()) if (key === DEFAULT) exports$1.set(AST_NODE_TYPES.ImportDefaultSpecifier, { whereUsed: /* @__PURE__ */ new Set() });
			else exports$1.set(key, { whereUsed: /* @__PURE__ */ new Set() });
		}
		exports$1.set(AST_NODE_TYPES.ExportAllDeclaration, { whereUsed: /* @__PURE__ */ new Set() });
		exports$1.set(AST_NODE_TYPES.ImportNamespaceSpecifier, { whereUsed: /* @__PURE__ */ new Set() });
		exportList.set(file, exports$1);
	}
	for (const [key, value] of exportAll.entries()) for (const val of value) {
		const currentExports = exportList.get(val);
		if (currentExports) {
			const currentExport = currentExports.get(AST_NODE_TYPES.ExportAllDeclaration);
			currentExport.whereUsed.add(key);
		}
	}
};
/**
* Traverse through all imports and add the respective path to the
* whereUsed-list of the corresponding export
*/
const determineUsage = () => {
	for (const [listKey, listValue] of importList.entries()) for (const [key, value] of listValue.entries()) {
		const exports$1 = exportList.get(key);
		if (exports$1 !== void 0) for (const currentImport of value) {
			let specifier;
			if (currentImport === AST_NODE_TYPES.ImportNamespaceSpecifier) specifier = AST_NODE_TYPES.ImportNamespaceSpecifier;
			else if (currentImport === AST_NODE_TYPES.ImportDefaultSpecifier) specifier = AST_NODE_TYPES.ImportDefaultSpecifier;
			else specifier = currentImport;
			if (specifier !== void 0) {
				const exportStatement = exports$1.get(specifier);
				if (exportStatement !== void 0) {
					const { whereUsed } = exportStatement;
					whereUsed.add(listKey);
					exports$1.set(specifier, { whereUsed });
				}
			}
		}
	}
};
/**
* Prepare the lists of existing imports and exports - should only be executed
* once at the start of a new eslint run
*/
let srcFiles;
let lastPrepareKey;
const doPreparation = (src, ignoreExports, context) => {
	const prepareKey = JSON.stringify({
		src: src.sort(),
		ignoreExports: (ignoreExports || []).sort(),
		extensions: [...getFileExtensions(context.settings)].sort()
	});
	if (prepareKey === lastPrepareKey) return;
	importList.clear();
	exportList.clear();
	ignoredFiles.clear();
	filesOutsideSrc.clear();
	srcFiles = resolveFiles(src, ignoreExports, context);
	prepareImportsAndExports(srcFiles, context);
	determineUsage();
	lastPrepareKey = prepareKey;
};
const newNamespaceImportExists = (specifiers) => specifiers.some(({ type }) => type === AST_NODE_TYPES.ImportNamespaceSpecifier);
const newDefaultImportExists = (specifiers) => specifiers.some(({ type }) => type === AST_NODE_TYPES.ImportDefaultSpecifier);
const fileIsInPkg = (file) => {
	const { pkg, path: pkgPath } = readPkgUp({ cwd: file });
	const basePath = node_path.default.dirname(pkgPath);
	const checkPkgFieldString = (pkgField) => {
		if (node_path.default.join(basePath, pkgField) === file) return true;
	};
	const checkPkgFieldObject = (pkgField) => {
		const pkgFieldFiles = Object.values(pkgField).flatMap((value) => typeof value === "boolean" ? [] : node_path.default.join(basePath, value));
		if (pkgFieldFiles.includes(file)) return true;
	};
	const checkPkgField = (pkgField) => {
		if (typeof pkgField === "string") return checkPkgFieldString(pkgField);
		if (typeof pkgField === "object") return checkPkgFieldObject(pkgField);
	};
	if (!pkg) return false;
	if (pkg.private === true) return false;
	if (pkg.bin && checkPkgField(pkg.bin)) return true;
	if (pkg.browser && checkPkgField(pkg.browser)) return true;
	if (pkg.main && checkPkgFieldString(pkg.main)) return true;
	return false;
};
var no_unused_modules_default = createRule({
	name: "no-unused-modules",
	meta: {
		type: "suggestion",
		docs: {
			category: "Helpful warnings",
			description: "Forbid modules without exports, or exports without matching import in another module."
		},
		schema: [{
			type: "object",
			properties: {
				src: {
					description: "files/paths to be analyzed (only for unused exports)",
					type: "array",
					uniqueItems: true,
					items: {
						type: "string",
						minLength: 1
					}
				},
				ignoreExports: {
					description: "files/paths for which unused exports will not be reported (e.g module entry points)",
					type: "array",
					uniqueItems: true,
					items: {
						type: "string",
						minLength: 1
					}
				},
				missingExports: {
					description: "report modules without any exports",
					type: "boolean"
				},
				unusedExports: {
					description: "report exports without any usage",
					type: "boolean"
				},
				ignoreUnusedTypeExports: {
					description: "ignore type exports without any usage",
					type: "boolean"
				}
			},
			anyOf: [{
				type: "object",
				properties: {
					unusedExports: {
						type: "boolean",
						enum: [true]
					},
					src: {
						type: "array",
						minItems: 1
					}
				},
				required: ["unusedExports"]
			}, {
				type: "object",
				properties: { missingExports: {
					type: "boolean",
					enum: [true]
				} },
				required: ["missingExports"]
			}]
		}],
		messages: {
			notFound: "No exports found",
			unused: "exported declaration '{{value}}' not used within other modules"
		}
	},
	defaultOptions: [],
	create(context) {
		const { src = [process.cwd()], ignoreExports = [], missingExports, unusedExports, ignoreUnusedTypeExports } = context.options[0] || {};
		if (unusedExports) doPreparation(src, ignoreExports, context);
		const filename = context.physicalFilename;
		const checkExportPresence = (node) => {
			if (!missingExports) return;
			if (ignoreUnusedTypeExports) return;
			if (ignoredFiles.has(filename)) return;
			const exportCount = exportList.get(filename);
			const exportAll = exportCount.get(AST_NODE_TYPES.ExportAllDeclaration);
			const namespaceImports = exportCount.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
			exportCount.delete(AST_NODE_TYPES.ExportAllDeclaration);
			exportCount.delete(AST_NODE_TYPES.ImportNamespaceSpecifier);
			if (exportCount.size === 0) context.report({
				node: node.body[0] ?? node,
				messageId: "notFound"
			});
			exportCount.set(AST_NODE_TYPES.ExportAllDeclaration, exportAll);
			exportCount.set(AST_NODE_TYPES.ImportNamespaceSpecifier, namespaceImports);
		};
		const checkUsage = (node, exportedValue, isTypeExport) => {
			if (!unusedExports) return;
			if (isTypeExport && ignoreUnusedTypeExports) return;
			if (ignoredFiles.has(filename)) return;
			if (fileIsInPkg(filename)) return;
			if (filesOutsideSrc.has(filename)) return;
			if (!srcFiles.has(filename)) {
				srcFiles = resolveFiles(src, ignoreExports, context);
				if (!srcFiles.has(filename)) {
					filesOutsideSrc.add(filename);
					return;
				}
			}
			const exports$1 = exportList.get(filename);
			if (!exports$1) {
				console.error(`file \`${filename}\` has no exports. Please update to the latest, and if it still happens, report this on https://github.com/import-js/eslint-plugin-import/issues/2866!`);
				return;
			}
			const exportAll = exports$1.get(AST_NODE_TYPES.ExportAllDeclaration);
			if (exportAll !== void 0 && exportedValue !== AST_NODE_TYPES.ImportDefaultSpecifier && exportAll.whereUsed.size > 0) return;
			const namespaceImports = exports$1.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
			if (namespaceImports !== void 0 && namespaceImports.whereUsed.size > 0) return;
			const exportsKey = exportedValue === DEFAULT ? AST_NODE_TYPES.ImportDefaultSpecifier : exportedValue;
			const exportStatement = exports$1.get(exportsKey);
			const value = exportsKey === AST_NODE_TYPES.ImportDefaultSpecifier ? DEFAULT : exportsKey;
			if (exportStatement === void 0) context.report({
				node,
				messageId: "unused",
				data: { value }
			});
			else if (exportStatement.whereUsed.size === 0) context.report({
				node,
				messageId: "unused",
				data: { value }
			});
		};
		/**
		* Only useful for tools like vscode-eslint
		*
		* Update lists of existing exports during runtime
		*/
		const updateExportUsage = (node) => {
			if (ignoredFiles.has(filename)) return;
			const exports$1 = exportList.get(filename) ?? /* @__PURE__ */ new Map();
			const newExports = /* @__PURE__ */ new Map();
			const newExportIdentifiers = /* @__PURE__ */ new Set();
			for (const s of node.body) {
				if (s.type === AST_NODE_TYPES.ExportDefaultDeclaration) newExportIdentifiers.add(AST_NODE_TYPES.ImportDefaultSpecifier);
				if (s.type === AST_NODE_TYPES.ExportNamedDeclaration) {
					if (s.specifiers.length > 0) {
						for (const specifier of s.specifiers) if (specifier.exported) newExportIdentifiers.add(getValue(specifier.exported));
					}
					forEachDeclarationIdentifier(s.declaration, (name$1) => {
						newExportIdentifiers.add(name$1);
					});
				}
			}
			for (const [key, value] of exports$1.entries()) if (newExportIdentifiers.has(key)) newExports.set(key, value);
			for (const key of newExportIdentifiers) if (!exports$1.has(key)) newExports.set(key, { whereUsed: /* @__PURE__ */ new Set() });
			const exportAll = exports$1.get(AST_NODE_TYPES.ExportAllDeclaration);
			const namespaceImports = exports$1.get(AST_NODE_TYPES.ImportNamespaceSpecifier) ?? { whereUsed: /* @__PURE__ */ new Set() };
			newExports.set(AST_NODE_TYPES.ExportAllDeclaration, exportAll);
			newExports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, namespaceImports);
			exportList.set(filename, newExports);
		};
		/**
		* Only useful for tools like vscode-eslint
		*
		* Update lists of existing imports during runtime
		*/
		const updateImportUsage = (node) => {
			if (!unusedExports) return;
			const oldImportPaths = importList.get(filename) ?? /* @__PURE__ */ new Map();
			const oldNamespaceImports = /* @__PURE__ */ new Set();
			const newNamespaceImports = /* @__PURE__ */ new Set();
			const oldExportAll = /* @__PURE__ */ new Set();
			const newExportAll = /* @__PURE__ */ new Set();
			const oldDefaultImports = /* @__PURE__ */ new Set();
			const newDefaultImports = /* @__PURE__ */ new Set();
			const oldImports = /* @__PURE__ */ new Map();
			const newImports = /* @__PURE__ */ new Map();
			for (const [key, value] of oldImportPaths.entries()) {
				if (value.has(AST_NODE_TYPES.ExportAllDeclaration)) oldExportAll.add(key);
				if (value.has(AST_NODE_TYPES.ImportNamespaceSpecifier)) oldNamespaceImports.add(key);
				if (value.has(AST_NODE_TYPES.ImportDefaultSpecifier)) oldDefaultImports.add(key);
				for (const val of value) if (val !== AST_NODE_TYPES.ImportNamespaceSpecifier && val !== AST_NODE_TYPES.ImportDefaultSpecifier) oldImports.set(val, key);
			}
			function processDynamicImport(source) {
				if (source.type !== "Literal" || typeof source.value !== "string") return null;
				const p = resolve(source.value, context);
				if (p == null) return null;
				newNamespaceImports.add(p);
			}
			visit(node, visitorKeyMap.get(filename), {
				ImportExpression(child) {
					processDynamicImport(child.source);
				},
				CallExpression(child_) {
					const child = child_;
					if (child.callee.type === "Import") processDynamicImport(child.arguments[0]);
				}
			});
			for (const astNode of node.body) {
				let resolvedPath;
				if (astNode.type === AST_NODE_TYPES.ExportNamedDeclaration && astNode.source) {
					resolvedPath = resolve(astNode.source.raw.replaceAll(/('|")/g, ""), context);
					for (const specifier of astNode.specifiers) {
						const name$1 = getValue(specifier.local);
						if (name$1 === DEFAULT) newDefaultImports.add(resolvedPath);
						else newImports.set(name$1, resolvedPath);
					}
				}
				if (astNode.type === AST_NODE_TYPES.ExportAllDeclaration) {
					resolvedPath = resolve(astNode.source.raw.replaceAll(/('|")/g, ""), context);
					newExportAll.add(resolvedPath);
				}
				if (astNode.type === AST_NODE_TYPES.ImportDeclaration) {
					resolvedPath = resolve(astNode.source.raw.replaceAll(/('|")/g, ""), context);
					if (!resolvedPath) continue;
					if (isNodeModule(resolvedPath)) continue;
					if (newNamespaceImportExists(astNode.specifiers)) newNamespaceImports.add(resolvedPath);
					if (newDefaultImportExists(astNode.specifiers)) newDefaultImports.add(resolvedPath);
					for (const specifier of astNode.specifiers.filter((specifier$1) => specifier$1.type !== AST_NODE_TYPES.ImportDefaultSpecifier && specifier$1.type !== AST_NODE_TYPES.ImportNamespaceSpecifier)) if ("imported" in specifier) newImports.set(getValue(specifier.imported), resolvedPath);
				}
			}
			for (const value of newExportAll) if (!oldExportAll.has(value)) {
				const imports = oldImportPaths.get(value) ?? /* @__PURE__ */ new Set();
				imports.add(AST_NODE_TYPES.ExportAllDeclaration);
				oldImportPaths.set(value, imports);
				let exports$1 = exportList.get(value);
				let currentExport;
				if (exports$1 === void 0) {
					exports$1 = /* @__PURE__ */ new Map();
					exportList.set(value, exports$1);
				} else currentExport = exports$1.get(AST_NODE_TYPES.ExportAllDeclaration);
				if (currentExport === void 0) {
					const whereUsed = /* @__PURE__ */ new Set();
					whereUsed.add(filename);
					exports$1.set(AST_NODE_TYPES.ExportAllDeclaration, { whereUsed });
				} else currentExport.whereUsed.add(filename);
			}
			for (const value of oldExportAll) if (!newExportAll.has(value)) {
				const imports = oldImportPaths.get(value);
				imports.delete(AST_NODE_TYPES.ExportAllDeclaration);
				const exports$1 = exportList.get(value);
				if (exports$1 !== void 0) {
					const currentExport = exports$1.get(AST_NODE_TYPES.ExportAllDeclaration);
					if (currentExport !== void 0) currentExport.whereUsed.delete(filename);
				}
			}
			for (const value of newDefaultImports) if (!oldDefaultImports.has(value)) {
				let imports = oldImportPaths.get(value);
				if (imports === void 0) imports = /* @__PURE__ */ new Set();
				imports.add(AST_NODE_TYPES.ImportDefaultSpecifier);
				oldImportPaths.set(value, imports);
				let exports$1 = exportList.get(value);
				let currentExport;
				if (exports$1 === void 0) {
					exports$1 = /* @__PURE__ */ new Map();
					exportList.set(value, exports$1);
				} else currentExport = exports$1.get(AST_NODE_TYPES.ImportDefaultSpecifier);
				if (currentExport === void 0) {
					const whereUsed = /* @__PURE__ */ new Set();
					whereUsed.add(filename);
					exports$1.set(AST_NODE_TYPES.ImportDefaultSpecifier, { whereUsed });
				} else currentExport.whereUsed.add(filename);
			}
			for (const value of oldDefaultImports) if (!newDefaultImports.has(value)) {
				const imports = oldImportPaths.get(value);
				imports.delete(AST_NODE_TYPES.ImportDefaultSpecifier);
				const exports$1 = exportList.get(value);
				if (exports$1 !== void 0) {
					const currentExport = exports$1.get(AST_NODE_TYPES.ImportDefaultSpecifier);
					if (currentExport !== void 0) currentExport.whereUsed.delete(filename);
				}
			}
			for (const value of newNamespaceImports) if (!oldNamespaceImports.has(value)) {
				let imports = oldImportPaths.get(value);
				if (imports === void 0) imports = /* @__PURE__ */ new Set();
				imports.add(AST_NODE_TYPES.ImportNamespaceSpecifier);
				oldImportPaths.set(value, imports);
				let exports$1 = exportList.get(value);
				let currentExport;
				if (exports$1 === void 0) {
					exports$1 = /* @__PURE__ */ new Map();
					exportList.set(value, exports$1);
				} else currentExport = exports$1.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
				if (currentExport === void 0) {
					const whereUsed = /* @__PURE__ */ new Set();
					whereUsed.add(filename);
					exports$1.set(AST_NODE_TYPES.ImportNamespaceSpecifier, { whereUsed });
				} else currentExport.whereUsed.add(filename);
			}
			for (const value of oldNamespaceImports) if (!newNamespaceImports.has(value)) {
				const imports = oldImportPaths.get(value);
				imports.delete(AST_NODE_TYPES.ImportNamespaceSpecifier);
				const exports$1 = exportList.get(value);
				if (exports$1 !== void 0) {
					const currentExport = exports$1.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
					if (currentExport !== void 0) currentExport.whereUsed.delete(filename);
				}
			}
			for (const [key, value] of newImports.entries()) if (!oldImports.has(key)) {
				let imports = oldImportPaths.get(value);
				if (imports === void 0) imports = /* @__PURE__ */ new Set();
				imports.add(key);
				oldImportPaths.set(value, imports);
				let exports$1 = exportList.get(value);
				let currentExport;
				if (exports$1 === void 0) {
					exports$1 = /* @__PURE__ */ new Map();
					exportList.set(value, exports$1);
				} else currentExport = exports$1.get(key);
				if (currentExport === void 0) {
					const whereUsed = /* @__PURE__ */ new Set();
					whereUsed.add(filename);
					exports$1.set(key, { whereUsed });
				} else currentExport.whereUsed.add(filename);
			}
			for (const [key, value] of oldImports.entries()) if (!newImports.has(key)) {
				const imports = oldImportPaths.get(value);
				imports.delete(key);
				const exports$1 = exportList.get(value);
				if (exports$1 !== void 0) {
					const currentExport = exports$1.get(key);
					if (currentExport !== void 0) currentExport.whereUsed.delete(filename);
				}
			}
		};
		return {
			"Program:exit"(node) {
				updateExportUsage(node);
				updateImportUsage(node);
				checkExportPresence(node);
			},
			ExportDefaultDeclaration(node) {
				checkUsage(node, AST_NODE_TYPES.ImportDefaultSpecifier, false);
			},
			ExportNamedDeclaration(node) {
				for (const specifier of node.specifiers) checkUsage(specifier, getValue(specifier.exported), false);
				forEachDeclarationIdentifier(node.declaration, (name$1, isTypeExport) => {
					checkUsage(node, name$1, isTypeExport);
				});
			}
		};
	}
});

//#endregion
//#region src/rules/no-useless-path-segments.ts
/**
* Convert a potentially relative path from node utils into a true relative
* path.
*
* `../ -> ..`
*
* `./ -> .`
*
* `.foo/bar -> ./.foo/bar`
*
* `..foo/bar -> ./..foo/bar`
*
* `foo/bar -> ./foo/bar`
*
* @param relativePath Relative posix path potentially missing leading './'
* @returns Relative posix path that always starts with a ./
*/
function toRelativePath(relativePath) {
	const stripped = relativePath.replaceAll(/\/$/g, "");
	return /^((\.\.)|(\.))($|\/)/.test(stripped) ? stripped : `./${stripped}`;
}
function normalize(filepath) {
	return toRelativePath(node_path.default.posix.normalize(filepath));
}
function countRelativeParents(pathSegments) {
	return pathSegments.filter((x) => x === "..").length;
}
var no_useless_path_segments_default = createRule({
	name: "no-useless-path-segments",
	meta: {
		type: "suggestion",
		docs: {
			category: "Static analysis",
			description: "Forbid unnecessary path segments in import and require statements."
		},
		fixable: "code",
		schema: [{
			type: "object",
			properties: {
				commonjs: { type: "boolean" },
				noUselessIndex: { type: "boolean" }
			},
			additionalProperties: false
		}],
		messages: { useless: "Useless path segments for \"{{importPath}}\", should be \"{{proposedPath}}\"" }
	},
	defaultOptions: [],
	create(context) {
		const currentDir = node_path.default.dirname(context.physicalFilename);
		const options = context.options[0] || {};
		return moduleVisitor((source) => {
			const { value: importPath } = source;
			function reportWithProposedPath(proposedPath) {
				context.report({
					node: source,
					messageId: "useless",
					data: {
						importPath,
						proposedPath
					},
					fix: (fixer) => proposedPath ? fixer.replaceText(source, JSON.stringify(proposedPath)) : null
				});
			}
			if (!importPath.startsWith(".")) return;
			const resolvedPath = resolve(importPath, context);
			const normedPath = normalize(importPath);
			const resolvedNormedPath = resolve(normedPath, context);
			if (normedPath !== importPath && resolvedPath === resolvedNormedPath) return reportWithProposedPath(normedPath);
			const fileExtensions = getFileExtensions(context.settings);
			const regexUnnecessaryIndex = new RegExp(`.*\\/index(\\${[...fileExtensions].join("|\\")})?$`);
			if (options.noUselessIndex && regexUnnecessaryIndex.test(importPath)) {
				const parentDirectory = node_path.default.dirname(importPath);
				if (parentDirectory !== "." && parentDirectory !== "..") {
					for (const fileExtension of fileExtensions) if (resolve(`${parentDirectory}${fileExtension}`, context)) return reportWithProposedPath(`${parentDirectory}/`);
				}
				return reportWithProposedPath(parentDirectory);
			}
			if (importPath.startsWith("./")) return;
			if (resolvedPath === void 0) return;
			const expected = node_path.default.relative(currentDir, resolvedPath);
			const expectedSplit = expected.split(node_path.default.sep);
			const importPathSplit = importPath.replace(/^\.\//, "").split("/");
			const countImportPathRelativeParents = countRelativeParents(importPathSplit);
			const countExpectedRelativeParents = countRelativeParents(expectedSplit);
			const diff = countImportPathRelativeParents - countExpectedRelativeParents;
			if (diff <= 0) return;
			return reportWithProposedPath(toRelativePath([...importPathSplit.slice(0, countExpectedRelativeParents), ...importPathSplit.slice(countImportPathRelativeParents + diff)].join("/")));
		}, options);
	}
});

//#endregion
//#region src/rules/no-webpack-loader-syntax.ts
var no_webpack_loader_syntax_default = createRule({
	name: "no-webpack-loader-syntax",
	meta: {
		type: "problem",
		docs: {
			category: "Static analysis",
			description: "Forbid webpack loader syntax in imports."
		},
		schema: [],
		messages: { unexpected: "Unexpected '!' in '{{name}}'. Do not use import syntax to configure webpack loaders." }
	},
	defaultOptions: [],
	create(context) {
		return moduleVisitor((source, node) => {
			if (source.value?.includes("!")) context.report({
				node,
				messageId: "unexpected",
				data: { name: source.value }
			});
		}, { commonjs: true });
	}
});

//#endregion
//#region src/rules/order.ts
const log = (0, debug.default)("eslint-plugin-import-x:rules:order");
const groupBy = (array, grouper) => array.reduce((acc, curr, index) => {
	const key = grouper(curr, index);
	(acc[key] ||= []).push(curr);
	return acc;
}, {});
const categories = {
	named: "named",
	import: "import",
	exports: "exports"
};
const defaultGroups = [
	"builtin",
	"external",
	"parent",
	"sibling",
	"index"
];
function reverse(array) {
	return array.map((v) => ({
		...v,
		rank: -v.rank
	})).reverse();
}
function getTokensOrCommentsAfter(sourceCode, node, count) {
	let currentNodeOrToken = node;
	const result = [];
	for (let i = 0; i < count; i++) {
		currentNodeOrToken = sourceCode.getTokenAfter(currentNodeOrToken, { includeComments: true });
		if (currentNodeOrToken == null) break;
		result.push(currentNodeOrToken);
	}
	return result;
}
function getTokensOrCommentsBefore(sourceCode, node, count) {
	let currentNodeOrToken = node;
	const result = [];
	for (let i = 0; i < count; i++) {
		currentNodeOrToken = sourceCode.getTokenBefore(currentNodeOrToken, { includeComments: true });
		if (currentNodeOrToken == null) break;
		result.push(currentNodeOrToken);
	}
	return result.reverse();
}
function takeTokensAfterWhile(sourceCode, node, condition) {
	const tokens = getTokensOrCommentsAfter(sourceCode, node, 100);
	const result = [];
	for (const token of tokens) if (condition(token)) result.push(token);
	else break;
	return result;
}
function takeTokensBeforeWhile(sourceCode, node, condition) {
	const tokens = getTokensOrCommentsBefore(sourceCode, node, 100);
	const result = [];
	for (let i = tokens.length - 1; i >= 0; i--) if (condition(tokens[i])) result.push(tokens[i]);
	else break;
	return result.reverse();
}
function findOutOfOrder(imported) {
	if (imported.length === 0) return [];
	let maxSeenRankNode = imported[0];
	return imported.filter(function(importedModule) {
		const res = importedModule.rank < maxSeenRankNode.rank;
		if (maxSeenRankNode.rank < importedModule.rank) maxSeenRankNode = importedModule;
		return res;
	});
}
function findRootNode(node) {
	let parent = node;
	while (parent.parent != null && (!("body" in parent.parent) || parent.parent.body == null)) parent = parent.parent;
	return parent;
}
function findEndOfLineWithComments(sourceCode, node) {
	const tokensToEndOfLine = takeTokensAfterWhile(sourceCode, node, commentOnSameLineAs(node));
	const endOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1] : node.range[1];
	let result = endOfTokens;
	for (let i = endOfTokens; i < sourceCode.text.length; i++) {
		if (sourceCode.text[i] === "\n") {
			result = i + 1;
			break;
		}
		if (sourceCode.text[i] !== " " && sourceCode.text[i] !== "	" && sourceCode.text[i] !== "\r") break;
		result = i + 1;
	}
	return result;
}
function commentOnSameLineAs(node) {
	return (token) => (token.type === "Block" || token.type === "Line") && token.loc.start.line === token.loc.end.line && token.loc.end.line === node.loc.end.line;
}
function findStartOfLineWithComments(sourceCode, node) {
	const tokensToEndOfLine = takeTokensBeforeWhile(sourceCode, node, commentOnSameLineAs(node));
	const startOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].range[0] : node.range[0];
	let result = startOfTokens;
	for (let i = startOfTokens - 1; i > 0; i--) {
		if (sourceCode.text[i] !== " " && sourceCode.text[i] !== "	") break;
		result = i;
	}
	return result;
}
function findSpecifierStart(sourceCode, node) {
	let token;
	do
		token = sourceCode.getTokenBefore(node);
	while (token.value !== "," && token.value !== "{");
	return token.range[1];
}
function findSpecifierEnd(sourceCode, node) {
	let token;
	do
		token = sourceCode.getTokenAfter(node);
	while (token.value !== "," && token.value !== "}");
	return token.range[0];
}
function isRequireExpression(expr) {
	return expr != null && expr.type === "CallExpression" && expr.callee != null && "name" in expr.callee && expr.callee.name === "require" && expr.arguments != null && expr.arguments.length === 1 && expr.arguments[0].type === "Literal";
}
function isSupportedRequireModule(node) {
	if (node.type !== "VariableDeclaration") return false;
	if (node.declarations.length !== 1) return false;
	const decl = node.declarations[0];
	const isPlainRequire = decl.id && (decl.id.type === "Identifier" || decl.id.type === "ObjectPattern") && isRequireExpression(decl.init);
	const isRequireWithMemberExpression = decl.id && (decl.id.type === "Identifier" || decl.id.type === "ObjectPattern") && decl.init != null && decl.init.type === "CallExpression" && decl.init.callee != null && decl.init.callee.type === "MemberExpression" && isRequireExpression(decl.init.callee.object);
	return isPlainRequire || isRequireWithMemberExpression;
}
function isPlainImportModule(node) {
	return node.type === "ImportDeclaration" && node.specifiers != null && node.specifiers.length > 0;
}
function isPlainImportEquals(node) {
	return node.type === "TSImportEqualsDeclaration" && "expression" in node.moduleReference && !!node.moduleReference.expression;
}
function isCJSExports(context, node) {
	if (node.type === "MemberExpression" && node.object.type === "Identifier" && node.property.type === "Identifier" && node.object.name === "module" && node.property.name === "exports") return !context.sourceCode.getScope(node).variables.some((variable) => variable.name === "module");
	if (node.type === "Identifier" && node.name === "exports") return !context.sourceCode.getScope(node).variables.some((variable) => variable.name === "exports");
}
function getNamedCJSExports(context, node) {
	if (node.type !== "MemberExpression") return;
	const result = [];
	let root = node;
	let parent;
	while (root.type === "MemberExpression") {
		if (root.property.type !== "Identifier") return;
		result.unshift(root.property.name);
		parent = root;
		root = root.object;
	}
	if (isCJSExports(context, root)) return result;
	if (isCJSExports(context, parent)) return result.slice(1);
}
function canCrossNodeWhileReorder(node) {
	return isSupportedRequireModule(node) || isPlainImportModule(node) || isPlainImportEquals(node);
}
function canReorderItems(firstNode, secondNode) {
	const parent = firstNode.parent;
	if (!parent || !("body" in parent) || !Array.isArray(parent.body)) return false;
	const body = parent.body;
	const [firstIndex, secondIndex] = [body.indexOf(firstNode), body.indexOf(secondNode)].sort();
	const nodesBetween = parent.body.slice(firstIndex, secondIndex + 1);
	for (const nodeBetween of nodesBetween) if (!canCrossNodeWhileReorder(nodeBetween)) return false;
	return true;
}
function makeImportDescription(node) {
	if (node.type === "export") {
		if (node.node.exportKind === "type") return "type export";
		return "export";
	}
	if (node.node.importKind === "type") return "type import";
	if (node.node.importKind === "typeof") return "typeof import";
	return "import";
}
function fixOutOfOrder(context, firstNode, secondNode, order, category) {
	const isNamed = category === categories.named;
	const isExports = category === categories.exports;
	const { sourceCode } = context;
	const { firstRoot, secondRoot } = isNamed ? {
		firstRoot: firstNode.node,
		secondRoot: secondNode.node
	} : {
		firstRoot: findRootNode(firstNode.node),
		secondRoot: findRootNode(secondNode.node)
	};
	const { firstRootStart, firstRootEnd, secondRootStart, secondRootEnd } = isNamed ? {
		firstRootStart: findSpecifierStart(sourceCode, firstRoot),
		firstRootEnd: findSpecifierEnd(sourceCode, firstRoot),
		secondRootStart: findSpecifierStart(sourceCode, secondRoot),
		secondRootEnd: findSpecifierEnd(sourceCode, secondRoot)
	} : {
		firstRootStart: findStartOfLineWithComments(sourceCode, firstRoot),
		firstRootEnd: findEndOfLineWithComments(sourceCode, firstRoot),
		secondRootStart: findStartOfLineWithComments(sourceCode, secondRoot),
		secondRootEnd: findEndOfLineWithComments(sourceCode, secondRoot)
	};
	if (firstNode.displayName === secondNode.displayName) {
		if (firstNode.alias) firstNode.displayName = `${firstNode.displayName} as ${firstNode.alias}`;
		if (secondNode.alias) secondNode.displayName = `${secondNode.displayName} as ${secondNode.alias}`;
	}
	const firstDesc = makeImportDescription(firstNode);
	const secondDesc = makeImportDescription(secondNode);
	if (firstNode.displayName === secondNode.displayName && firstDesc === secondDesc) {
		log(firstNode.displayName, firstNode.node.loc, secondNode.displayName, secondNode.node.loc);
		return;
	}
	const firstImport = `${firstDesc} of \`${firstNode.displayName}\``;
	const secondImport = `\`${secondNode.displayName}\` ${secondDesc}`;
	const messageOptions = {
		messageId: "order",
		data: {
			firstImport,
			secondImport,
			order
		}
	};
	if (isNamed) {
		const firstCode = sourceCode.text.slice(firstRootStart, firstRoot.range[1]);
		const firstTrivia = sourceCode.text.slice(firstRoot.range[1], firstRootEnd);
		const secondCode = sourceCode.text.slice(secondRootStart, secondRoot.range[1]);
		const secondTrivia = sourceCode.text.slice(secondRoot.range[1], secondRootEnd);
		if (order === "before") {
			const trimmedTrivia = secondTrivia.trimEnd();
			const gapCode = sourceCode.text.slice(firstRootEnd, secondRootStart - 1);
			const whitespaces = secondTrivia.slice(trimmedTrivia.length);
			context.report({
				node: secondNode.node,
				...messageOptions,
				fix: (fixer) => fixer.replaceTextRange([firstRootStart, secondRootEnd], `${secondCode},${trimmedTrivia}${firstCode}${firstTrivia}${gapCode}${whitespaces}`)
			});
		} else if (order === "after") {
			const trimmedTrivia = firstTrivia.trimEnd();
			const gapCode = sourceCode.text.slice(secondRootEnd + 1, firstRootStart);
			const whitespaces = firstTrivia.slice(trimmedTrivia.length);
			context.report({
				node: secondNode.node,
				...messageOptions,
				fix: (fixes) => fixes.replaceTextRange([secondRootStart, firstRootEnd], `${gapCode}${firstCode},${trimmedTrivia}${secondCode}${whitespaces}`)
			});
		}
	} else {
		const canFix = isExports || canReorderItems(firstRoot, secondRoot);
		let newCode = sourceCode.text.slice(secondRootStart, secondRootEnd);
		if (newCode[newCode.length - 1] !== "\n") newCode = `${newCode}\n`;
		if (order === "before") context.report({
			node: secondNode.node,
			...messageOptions,
			fix: canFix ? (fixer) => fixer.replaceTextRange([firstRootStart, secondRootEnd], newCode + sourceCode.text.slice(firstRootStart, secondRootStart)) : null
		});
		else if (order === "after") context.report({
			node: secondNode.node,
			...messageOptions,
			fix: canFix ? (fixer) => fixer.replaceTextRange([secondRootStart, firstRootEnd], sourceCode.text.slice(secondRootEnd, firstRootEnd) + newCode) : null
		});
	}
}
function reportOutOfOrder(context, imported, outOfOrder, order, category) {
	for (const imp of outOfOrder) fixOutOfOrder(context, imported.find((importedItem) => importedItem.rank > imp.rank), imp, order, category);
}
function makeOutOfOrderReport(context, imported, category) {
	const outOfOrder = findOutOfOrder(imported);
	if (outOfOrder.length === 0) return;
	const reversedImported = reverse(imported);
	const reversedOrder = findOutOfOrder(reversedImported);
	if (reversedOrder.length < outOfOrder.length) {
		reportOutOfOrder(context, reversedImported, reversedOrder, "after", category);
		return;
	}
	reportOutOfOrder(context, imported, outOfOrder, "before", category);
}
const compareString = (a, b) => {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};
/** Some parsers (languages without types) don't provide ImportKind */
const DEFAULT_IMPORT_KIND = "value";
const getNormalizedValue = (node, toLowerCase) => {
	const value = String(node.value);
	return toLowerCase ? value.toLowerCase() : value;
};
const RELATIVE_DOTS = new Set([".", ".."]);
function getSorter(alphabetizeOptions) {
	const multiplier = alphabetizeOptions.order === "asc" ? 1 : -1;
	const orderImportKind = alphabetizeOptions.orderImportKind;
	const multiplierImportKind = orderImportKind !== "ignore" && (alphabetizeOptions.orderImportKind === "asc" ? 1 : -1);
	return function importsSorter(nodeA, nodeB) {
		const importA = getNormalizedValue(nodeA, alphabetizeOptions.caseInsensitive);
		const importB = getNormalizedValue(nodeB, alphabetizeOptions.caseInsensitive);
		let result = 0;
		if (!importA.includes("/") && !importB.includes("/")) result = compareString(importA, importB);
		else {
			const A = importA.split("/");
			const B = importB.split("/");
			const a = A.length;
			const b = B.length;
			for (let i = 0; i < Math.min(a, b); i++) {
				const x = A[i];
				const y = B[i];
				if (i === 0 && RELATIVE_DOTS.has(x) && RELATIVE_DOTS.has(y)) {
					if (x !== y) break;
					continue;
				}
				result = compareString(x, y);
				if (result) break;
			}
			if (!result && a !== b) result = a < b ? -1 : 1;
		}
		result = result * multiplier;
		if (!result && multiplierImportKind) result = multiplierImportKind * compareString(nodeA.node.importKind || DEFAULT_IMPORT_KIND, nodeB.node.importKind || DEFAULT_IMPORT_KIND);
		return result;
	};
}
function mutateRanksToAlphabetize(imported, alphabetizeOptions) {
	const groupedByRanks = groupBy(imported, (item) => item.rank);
	const sorterFn = getSorter(alphabetizeOptions);
	const groupRanks = Object.keys(groupedByRanks).sort((a, b) => +a - +b);
	for (const groupRank of groupRanks) groupedByRanks[groupRank].sort(sorterFn);
	let newRank = 0;
	const alphabetizedRanks = groupRanks.reduce((acc, groupRank) => {
		for (const importedItem of groupedByRanks[groupRank]) {
			acc[`${importedItem.value}|${importedItem.node.importKind}`] = Number.parseInt(groupRank, 10) + newRank;
			newRank += 1;
		}
		return acc;
	}, {});
	for (const importedItem of imported) importedItem.rank = alphabetizedRanks[`${importedItem.value}|${importedItem.node.importKind}`];
}
function computePathRank(ranks, pathGroups, path$22, maxPosition) {
	for (const { pattern: pattern$1, patternOptions, group, position = 1 } of pathGroups) if ((0, minimatch.minimatch)(path$22, pattern$1, patternOptions || { nocomment: true })) return ranks[group] + position / maxPosition;
}
function computeRank(context, ranks, importEntry, excludedImportTypes, isSortingTypesGroup) {
	let impType;
	let rank;
	const isTypeGroupInGroups = !ranks.omittedTypes.includes("type");
	const isTypeOnlyImport = importEntry.node.importKind === "type";
	const isExcludedFromPathRank = isTypeOnlyImport && isTypeGroupInGroups && excludedImportTypes.has("type");
	if (importEntry.type === "import:object") impType = "object";
	else if (isTypeOnlyImport && isTypeGroupInGroups && !isSortingTypesGroup) impType = "type";
	else impType = importType(importEntry.value, context);
	if (!excludedImportTypes.has(impType) && !isExcludedFromPathRank) rank = typeof importEntry.value === "string" ? computePathRank(ranks.groups, ranks.pathGroups, importEntry.value, ranks.maxPosition) : void 0;
	if (rank === void 0) {
		rank = ranks.groups[impType];
		if (rank === void 0) return -1;
	}
	if (isTypeOnlyImport && isSortingTypesGroup) rank = ranks.groups.type + rank / 10;
	if (importEntry.type !== "import" && !importEntry.type.startsWith("import:")) rank += 100;
	return rank;
}
function registerNode(context, importEntry, ranks, imported, excludedImportTypes, isSortingTypesGroup) {
	const rank = computeRank(context, ranks, importEntry, excludedImportTypes, isSortingTypesGroup);
	if (rank !== -1) {
		let importNode = importEntry.node;
		if (importEntry.type === "require" && importNode.parent?.parent?.type === "VariableDeclaration") importNode = importNode.parent.parent;
		imported.push({
			...importEntry,
			rank,
			isMultiline: importNode.loc.end.line !== importNode.loc.start.line
		});
	}
}
function getRequireBlock(node) {
	let n = node;
	while (n.parent?.type === "MemberExpression" && n.parent.object === n || n.parent?.type === "CallExpression" && n.parent.callee === n) n = n.parent;
	if (n.parent?.type === "VariableDeclarator" && n.parent.parent.type === "VariableDeclaration" && n.parent.parent.parent.type === "Program") return n.parent.parent.parent;
}
const types = [
	"builtin",
	"external",
	"internal",
	"unknown",
	"parent",
	"sibling",
	"index",
	"object",
	"type"
];
function convertGroupsToRanks(groups) {
	const rankObject = groups.reduce((res, group, index) => {
		for (const groupItem of [group].flat()) {
			if (!types.includes(groupItem)) throw new Error(`Incorrect configuration of the rule: Unknown type \`${JSON.stringify(groupItem)}\``);
			if (res[groupItem] !== void 0) throw new Error(`Incorrect configuration of the rule: \`${groupItem}\` is duplicated`);
			res[groupItem] = index * 2;
		}
		return res;
	}, {});
	const omittedTypes = types.filter((type) => rankObject[type] === void 0);
	const ranks = omittedTypes.reduce(function(res, type) {
		res[type] = groups.length * 2;
		return res;
	}, rankObject);
	return {
		groups: ranks,
		omittedTypes
	};
}
function convertPathGroupsForRanks(pathGroups) {
	const after = {};
	const before = {};
	const transformed = pathGroups.map((pathGroup, index) => {
		const { group, position: positionString } = pathGroup;
		let position = 0;
		if (positionString === "after") {
			if (!after[group]) after[group] = 1;
			position = after[group]++;
		} else if (positionString === "before") {
			if (!before[group]) before[group] = [];
			before[group].push(index);
		}
		return {
			...pathGroup,
			position
		};
	});
	let maxPosition = 1;
	for (const group of Object.keys(before)) {
		const groupLength = before[group].length;
		for (const [index, groupIndex] of before[group].entries()) transformed[groupIndex].position = -1 * (groupLength - index);
		maxPosition = Math.max(maxPosition, groupLength);
	}
	for (const key of Object.keys(after)) {
		const groupNextPosition = after[key];
		maxPosition = Math.max(maxPosition, groupNextPosition - 1);
	}
	return {
		pathGroups: transformed,
		maxPosition: maxPosition > 10 ? Math.pow(10, Math.ceil(Math.log10(maxPosition))) : 10
	};
}
function fixNewLineAfterImport(context, previousImport) {
	const prevRoot = findRootNode(previousImport.node);
	const tokensToEndOfLine = takeTokensAfterWhile(context.sourceCode, prevRoot, commentOnSameLineAs(prevRoot));
	let endOfLine = prevRoot.range[1];
	if (tokensToEndOfLine.length > 0) endOfLine = tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1];
	return (fixer) => fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], "\n");
}
function removeNewLineAfterImport(context, currentImport, previousImport) {
	const { sourceCode } = context;
	const prevRoot = findRootNode(previousImport.node);
	const currRoot = findRootNode(currentImport.node);
	const rangeToRemove = [findEndOfLineWithComments(sourceCode, prevRoot), findStartOfLineWithComments(sourceCode, currRoot)];
	if (/^\s*$/.test(sourceCode.text.slice(rangeToRemove[0], rangeToRemove[1]))) return (fixer) => fixer.removeRange(rangeToRemove);
	return;
}
function makeNewlinesBetweenReport(context, imported, newlinesBetweenImports_, newlinesBetweenTypeOnlyImports_, distinctGroup, isSortingTypesGroup, isConsolidatingSpaceBetweenImports) {
	const getNumberOfEmptyLinesBetween = (currentImport, previousImport$1) => {
		return context.sourceCode.lines.slice(previousImport$1.node.loc.end.line, currentImport.node.loc.start.line - 1).filter((line) => line.trim().length === 0).length;
	};
	const getIsStartOfDistinctGroup = (currentImport, previousImport$1) => currentImport.rank - 1 >= previousImport$1.rank;
	let previousImport = imported[0];
	for (const currentImport of imported.slice(1)) {
		const emptyLinesBetween = getNumberOfEmptyLinesBetween(currentImport, previousImport);
		const isStartOfDistinctGroup = getIsStartOfDistinctGroup(currentImport, previousImport);
		const isTypeOnlyImport = currentImport.node.importKind === "type";
		const isPreviousImportTypeOnlyImport = previousImport.node.importKind === "type";
		const isNormalImportNextToTypeOnlyImportAndRelevant = isTypeOnlyImport !== isPreviousImportTypeOnlyImport && isSortingTypesGroup;
		const isTypeOnlyImportAndRelevant = isTypeOnlyImport && isSortingTypesGroup;
		const newlinesBetweenImports = isSortingTypesGroup && isConsolidatingSpaceBetweenImports && (previousImport.isMultiline || currentImport.isMultiline) && newlinesBetweenImports_ === "never" ? "always-and-inside-groups" : newlinesBetweenImports_;
		const newlinesBetweenTypeOnlyImports = isSortingTypesGroup && isConsolidatingSpaceBetweenImports && (isNormalImportNextToTypeOnlyImportAndRelevant || previousImport.isMultiline || currentImport.isMultiline) && newlinesBetweenTypeOnlyImports_ === "never" ? "always-and-inside-groups" : newlinesBetweenTypeOnlyImports_;
		const isNotIgnored = isTypeOnlyImportAndRelevant && newlinesBetweenTypeOnlyImports !== "ignore" || !isTypeOnlyImportAndRelevant && newlinesBetweenImports !== "ignore";
		if (isNotIgnored) {
			const shouldAssertNewlineBetweenGroups = (isTypeOnlyImportAndRelevant || isNormalImportNextToTypeOnlyImportAndRelevant) && (newlinesBetweenTypeOnlyImports === "always" || newlinesBetweenTypeOnlyImports === "always-and-inside-groups") || !isTypeOnlyImportAndRelevant && !isNormalImportNextToTypeOnlyImportAndRelevant && (newlinesBetweenImports === "always" || newlinesBetweenImports === "always-and-inside-groups");
			const shouldAssertNoNewlineWithinGroup = (isTypeOnlyImportAndRelevant || isNormalImportNextToTypeOnlyImportAndRelevant) && newlinesBetweenTypeOnlyImports !== "always-and-inside-groups" || !isTypeOnlyImportAndRelevant && !isNormalImportNextToTypeOnlyImportAndRelevant && newlinesBetweenImports !== "always-and-inside-groups";
			const shouldAssertNoNewlineBetweenGroup = !isSortingTypesGroup || !isNormalImportNextToTypeOnlyImportAndRelevant || newlinesBetweenTypeOnlyImports === "never";
			const isTheNewlineBetweenImportsInTheSameGroup = distinctGroup && currentImport.rank === previousImport.rank || !distinctGroup && !isStartOfDistinctGroup;
			let alreadyReported = false;
			if (shouldAssertNewlineBetweenGroups) {
				if (currentImport.rank !== previousImport.rank && emptyLinesBetween === 0) {
					if (distinctGroup || isStartOfDistinctGroup) {
						alreadyReported = true;
						context.report({
							node: previousImport.node,
							messageId: "oneLineBetweenGroups",
							fix: fixNewLineAfterImport(context, previousImport)
						});
					}
				} else if (emptyLinesBetween > 0 && shouldAssertNoNewlineWithinGroup && isTheNewlineBetweenImportsInTheSameGroup) {
					alreadyReported = true;
					context.report({
						node: previousImport.node,
						messageId: "noLineWithinGroup",
						fix: removeNewLineAfterImport(context, currentImport, previousImport)
					});
				}
			} else if (emptyLinesBetween > 0 && shouldAssertNoNewlineBetweenGroup) {
				alreadyReported = true;
				context.report({
					node: previousImport.node,
					messageId: "noLineBetweenGroups",
					fix: removeNewLineAfterImport(context, currentImport, previousImport)
				});
			}
			if (!alreadyReported && isConsolidatingSpaceBetweenImports) {
				if (emptyLinesBetween === 0 && currentImport.isMultiline) context.report({
					node: previousImport.node,
					messageId: "oneLineBetweenTheMultiLineImport",
					fix: fixNewLineAfterImport(context, previousImport)
				});
				else if (emptyLinesBetween === 0 && previousImport.isMultiline) context.report({
					node: previousImport.node,
					messageId: "oneLineBetweenThisMultiLineImport",
					fix: fixNewLineAfterImport(context, previousImport)
				});
				else if (emptyLinesBetween > 0 && !previousImport.isMultiline && !currentImport.isMultiline && isTheNewlineBetweenImportsInTheSameGroup) context.report({
					node: previousImport.node,
					messageId: "noLineBetweenSingleLineImport",
					fix: removeNewLineAfterImport(context, currentImport, previousImport)
				});
			}
		}
		previousImport = currentImport;
	}
}
function getAlphabetizeConfig(options) {
	const alphabetize = options.alphabetize || {};
	const order = alphabetize.order || "ignore";
	const orderImportKind = alphabetize.orderImportKind || "ignore";
	const caseInsensitive = alphabetize.caseInsensitive || false;
	return {
		order,
		orderImportKind,
		caseInsensitive
	};
}
const defaultDistinctGroup = true;
var order_default = createRule({
	name: "order",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Enforce a convention in module import order."
		},
		fixable: "code",
		schema: [{
			type: "object",
			properties: {
				groups: { type: "array" },
				pathGroupsExcludedImportTypes: { type: "array" },
				distinctGroup: {
					type: "boolean",
					default: defaultDistinctGroup
				},
				pathGroups: {
					type: "array",
					items: {
						type: "object",
						properties: {
							pattern: { type: "string" },
							patternOptions: { type: "object" },
							group: {
								type: "string",
								enum: types
							},
							position: {
								type: "string",
								enum: ["after", "before"]
							}
						},
						additionalProperties: false,
						required: ["pattern", "group"]
					}
				},
				"newlines-between": {
					type: "string",
					enum: [
						"ignore",
						"always",
						"always-and-inside-groups",
						"never"
					]
				},
				"newlines-between-types": {
					type: "string",
					enum: [
						"ignore",
						"always",
						"always-and-inside-groups",
						"never"
					]
				},
				consolidateIslands: {
					type: "string",
					enum: ["inside-groups", "never"]
				},
				sortTypesGroup: {
					type: "boolean",
					default: false
				},
				named: {
					default: false,
					oneOf: [{ type: "boolean" }, {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							import: { type: "boolean" },
							export: { type: "boolean" },
							require: { type: "boolean" },
							cjsExports: { type: "boolean" },
							types: {
								type: "string",
								enum: [
									"mixed",
									"types-first",
									"types-last"
								]
							}
						},
						additionalProperties: false
					}]
				},
				alphabetize: {
					type: "object",
					properties: {
						caseInsensitive: {
							type: "boolean",
							default: false
						},
						order: {
							type: "string",
							enum: [
								"ignore",
								"asc",
								"desc"
							],
							default: "ignore"
						},
						orderImportKind: {
							type: "string",
							enum: [
								"ignore",
								"asc",
								"desc"
							],
							default: "ignore"
						}
					},
					additionalProperties: false
				},
				warnOnUnassignedImports: {
					type: "boolean",
					default: false
				}
			},
			additionalProperties: false,
			dependencies: {
				"newlines-between-types": {
					type: "object",
					properties: { sortTypesGroup: {
						type: "boolean",
						enum: [true]
					} },
					required: ["sortTypesGroup"]
				},
				consolidateIslands: { anyOf: [{
					type: "object",
					properties: { "newlines-between": {
						type: "string",
						enum: ["always-and-inside-groups"]
					} },
					required: ["newlines-between"]
				}, {
					type: "object",
					properties: { "newlines-between-types": {
						type: "string",
						enum: ["always-and-inside-groups"]
					} },
					required: ["newlines-between-types"]
				}] }
			}
		}],
		messages: {
			error: "{{error}}",
			noLineWithinGroup: "There should be no empty line within import group",
			noLineBetweenGroups: "There should be no empty line between import groups",
			oneLineBetweenGroups: "There should be at least one empty line between import groups",
			order: "{{secondImport}} should occur {{order}} {{firstImport}}",
			oneLineBetweenTheMultiLineImport: "There should be at least one empty line between this import and the multi-line import that follows it",
			oneLineBetweenThisMultiLineImport: "There should be at least one empty line between this multi-line import and the import that follows it",
			noLineBetweenSingleLineImport: "There should be no empty lines between this single-line import and the single-line import that follows it"
		}
	},
	defaultOptions: [],
	create(context) {
		const options = context.options[0] || {};
		const newlinesBetweenImports = options["newlines-between"] || "ignore";
		const newlinesBetweenTypeOnlyImports = options["newlines-between-types"] || newlinesBetweenImports;
		const pathGroupsExcludedImportTypes = new Set(options.pathGroupsExcludedImportTypes || [
			"builtin",
			"external",
			"object"
		]);
		const sortTypesGroup = options.sortTypesGroup;
		const consolidateIslands = options.consolidateIslands || "never";
		const named = {
			types: "mixed",
			...typeof options.named === "object" ? {
				...options.named,
				import: "import" in options.named ? options.named.import : options.named.enabled,
				export: "export" in options.named ? options.named.export : options.named.enabled,
				require: "require" in options.named ? options.named.require : options.named.enabled,
				cjsExports: "cjsExports" in options.named ? options.named.cjsExports : options.named.enabled
			} : {
				import: options.named,
				export: options.named,
				require: options.named,
				cjsExports: options.named
			}
		};
		const namedGroups = named.types === "mixed" ? [] : named.types === "types-last" ? ["value"] : ["type"];
		const alphabetize = getAlphabetizeConfig(options);
		const distinctGroup = options.distinctGroup == null ? defaultDistinctGroup : !!options.distinctGroup;
		let ranks;
		try {
			const { pathGroups, maxPosition } = convertPathGroupsForRanks(options.pathGroups || []);
			const { groups, omittedTypes } = convertGroupsToRanks(options.groups || defaultGroups);
			ranks = {
				groups,
				omittedTypes,
				pathGroups,
				maxPosition
			};
		} catch (error) {
			return { Program(node) {
				context.report({
					node,
					messageId: "error",
					data: { error: error.message }
				});
			} };
		}
		const importMap = /* @__PURE__ */ new Map();
		const exportMap = /* @__PURE__ */ new Map();
		const isTypeGroupInGroups = !ranks.omittedTypes.includes("type");
		const isSortingTypesGroup = isTypeGroupInGroups && sortTypesGroup;
		function getBlockImports(node) {
			let blockImports = importMap.get(node);
			if (!blockImports) importMap.set(node, blockImports = []);
			return blockImports;
		}
		function getBlockExports(node) {
			let blockExports = exportMap.get(node);
			if (!blockExports) exportMap.set(node, blockExports = []);
			return blockExports;
		}
		function makeNamedOrderReport(context$1, namedImports) {
			if (namedImports.length > 1) {
				const imports = namedImports.map((namedImport) => {
					const kind = namedImport.kind || "value";
					const rank = namedGroups.indexOf(kind);
					return {
						displayName: namedImport.value,
						rank: rank === -1 ? namedGroups.length : rank,
						...namedImport,
						value: `${namedImport.value}:${namedImport.alias || ""}`
					};
				});
				if (alphabetize.order !== "ignore") mutateRanksToAlphabetize(imports, alphabetize);
				makeOutOfOrderReport(context$1, imports, categories.named);
			}
		}
		return {
			ImportDeclaration(node) {
				if (node.specifiers.length > 0 || options.warnOnUnassignedImports) {
					const name$1 = node.source.value;
					registerNode(context, {
						node,
						value: name$1,
						displayName: name$1,
						type: "import"
					}, ranks, getBlockImports(node.parent), pathGroupsExcludedImportTypes, isSortingTypesGroup);
					if (named.import) makeNamedOrderReport(context, node.specifiers.filter((specifier) => specifier.type === "ImportSpecifier").map((specifier) => ({
						node: specifier,
						value: getValue(specifier.imported),
						type: "import",
						kind: specifier.importKind,
						...specifier.local.range[0] !== specifier.imported.range[0] && { alias: specifier.local.name }
					})));
				}
			},
			TSImportEqualsDeclaration(node) {
				if (node.isExport) return;
				let displayName;
				let value;
				let type;
				if (node.moduleReference.type === "TSExternalModuleReference") {
					value = node.moduleReference.expression.value;
					displayName = value;
					type = "import";
				} else {
					value = "";
					displayName = context.sourceCode.getText(node.moduleReference);
					type = "import:object";
				}
				registerNode(context, {
					node,
					value,
					displayName,
					type
				}, ranks, getBlockImports(node.parent), pathGroupsExcludedImportTypes, isSortingTypesGroup);
			},
			CallExpression(node) {
				if (!isStaticRequire(node)) return;
				const block = getRequireBlock(node);
				const firstArg = node.arguments[0];
				if (!block || !("value" in firstArg)) return;
				const { value } = firstArg;
				registerNode(context, {
					node,
					value,
					displayName: value,
					type: "require"
				}, ranks, getBlockImports(block), pathGroupsExcludedImportTypes, isSortingTypesGroup);
			},
			...named.require && { VariableDeclarator(node) {
				if (node.id.type === "ObjectPattern" && isRequireExpression(node.init)) {
					const { properties: properties$1 } = node.id;
					for (const p of properties$1) if (!("key" in p) || p.key.type !== "Identifier" || p.value.type !== "Identifier") return;
					makeNamedOrderReport(context, node.id.properties.map((prop_) => {
						const prop = prop_;
						const key = prop.key;
						const value = prop.value;
						return {
							node: prop,
							value: key.name,
							type: "require",
							...key.range[0] !== value.range[0] && { alias: value.name }
						};
					}));
				}
			} },
			...named.export && { ExportNamedDeclaration(node) {
				makeNamedOrderReport(context, node.specifiers.map((specifier) => ({
					node: specifier,
					value: getValue(specifier.local),
					type: "export",
					kind: specifier.exportKind,
					...specifier.local.range[0] !== specifier.exported.range[0] && { alias: getValue(specifier.exported) }
				})));
			} },
			...named.cjsExports && { AssignmentExpression(node) {
				if (node.parent.type === "ExpressionStatement") if (isCJSExports(context, node.left)) {
					if (node.right.type === "ObjectExpression") {
						const { properties: properties$1 } = node.right;
						for (const p of properties$1) if (!("key" in p) || p.key.type !== "Identifier" || p.value.type !== "Identifier") return;
						makeNamedOrderReport(context, properties$1.map((prop_) => {
							const prop = prop_;
							const key = prop.key;
							const value = prop.value;
							return {
								node: prop,
								value: key.name,
								type: "export",
								...key.range[0] !== value.range[0] && { alias: value.name }
							};
						}));
					}
				} else {
					const nameParts = getNamedCJSExports(context, node.left);
					if (nameParts && nameParts.length > 0) {
						const name$1 = nameParts.join(".");
						getBlockExports(node.parent.parent).push({
							node,
							value: name$1,
							displayName: name$1,
							type: "export",
							rank: 0
						});
					}
				}
			} },
			"Program:exit"() {
				for (const imported of importMap.values()) {
					if (newlinesBetweenImports !== "ignore" || newlinesBetweenTypeOnlyImports !== "ignore") makeNewlinesBetweenReport(context, imported, newlinesBetweenImports, newlinesBetweenTypeOnlyImports, distinctGroup, isSortingTypesGroup, consolidateIslands === "inside-groups" && (newlinesBetweenImports === "always-and-inside-groups" || newlinesBetweenTypeOnlyImports === "always-and-inside-groups"));
					if (alphabetize.order !== "ignore") mutateRanksToAlphabetize(imported, alphabetize);
					makeOutOfOrderReport(context, imported, categories.import);
				}
				for (const exported of exportMap.values()) if (alphabetize.order !== "ignore") {
					mutateRanksToAlphabetize(exported, alphabetize);
					makeOutOfOrderReport(context, exported, categories.exports);
				}
				importMap.clear();
				exportMap.clear();
			}
		};
	}
});

//#endregion
//#region src/rules/prefer-default-export.ts
var prefer_default_export_default = createRule({
	name: "prefer-default-export",
	meta: {
		type: "suggestion",
		docs: {
			category: "Style guide",
			description: "Prefer a default export if module exports a single name or multiple names."
		},
		schema: [{
			type: "object",
			properties: { target: {
				type: "string",
				enum: ["single", "any"],
				default: "single"
			} },
			additionalProperties: false
		}],
		messages: {
			single: "Prefer default export on a file with single export.",
			any: "Prefer default export to be present on every file that has export."
		}
	},
	defaultOptions: [],
	create(context) {
		let specifierExportCount = 0;
		let hasDefaultExport = false;
		let hasStarExport = false;
		let hasTypeExport = false;
		let namedExportNode;
		const { target = "single" } = context.options[0] || {};
		function captureDeclaration(identifierOrPattern) {
			if (identifierOrPattern?.type === "ObjectPattern") for (const property of identifierOrPattern.properties) captureDeclaration(property.value);
			else if (identifierOrPattern?.type === "ArrayPattern") for (const el of identifierOrPattern.elements) captureDeclaration(el);
			else specifierExportCount++;
		}
		return {
			ExportDefaultSpecifier() {
				hasDefaultExport = true;
			},
			ExportSpecifier(node) {
				if (getValue(node.exported) === "default") hasDefaultExport = true;
				else {
					specifierExportCount++;
					namedExportNode = node;
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.declaration) return;
				const { type } = node.declaration;
				if (type === "TSTypeAliasDeclaration" || type === "TSInterfaceDeclaration" || type === "TypeAlias" || type === "InterfaceDeclaration") {
					specifierExportCount++;
					hasTypeExport = true;
					return;
				}
				if ("declarations" in node.declaration && node.declaration.declarations) for (const declaration of node.declaration.declarations) captureDeclaration(declaration.id);
				else specifierExportCount++;
				namedExportNode = node;
			},
			ExportDefaultDeclaration() {
				hasDefaultExport = true;
			},
			ExportAllDeclaration() {
				hasStarExport = true;
			},
			"Program:exit"() {
				if (hasDefaultExport || hasStarExport || hasTypeExport) return;
				if (target === "single" && specifierExportCount === 1) context.report({
					node: namedExportNode,
					messageId: "single"
				});
				else if (target === "any" && specifierExportCount > 0) context.report({
					node: namedExportNode,
					messageId: "any"
				});
			}
		};
	}
});

//#endregion
//#region src/rules/unambiguous.ts
var unambiguous_default = createRule({
	name: "unambiguous",
	meta: {
		type: "suggestion",
		docs: {
			category: "Module systems",
			description: "Forbid potentially ambiguous parse goal (`script` vs. `module`)."
		},
		schema: [],
		messages: { module: "This module could be parsed as a valid script." }
	},
	defaultOptions: [],
	create(context) {
		if (sourceType(context) !== "module") return {};
		return { Program(ast) {
			if (!isUnambiguousModule(ast)) context.report({
				node: ast,
				messageId: "module"
			});
		} };
	}
});

//#endregion
//#region src/index.ts
const rules = {
	"no-unresolved": no_unresolved_default,
	named: named_default,
	default: default_default,
	namespace: namespace_default,
	"no-namespace": no_namespace_default,
	export: export_default,
	"no-mutable-exports": no_mutable_exports_default,
	extensions: extensions_default,
	"no-restricted-paths": no_restricted_paths_default,
	"no-internal-modules": no_internal_modules_default,
	"group-exports": group_exports_default,
	"no-relative-packages": no_relative_packages_default,
	"no-relative-parent-imports": no_relative_parent_imports_default,
	"consistent-type-specifier-style": consistent_type_specifier_style_default,
	"no-self-import": no_self_import_default,
	"no-cycle": no_cycle_default,
	"no-named-default": no_named_default_default,
	"no-named-as-default": no_named_as_default_default,
	"no-named-as-default-member": no_named_as_default_member_default,
	"no-anonymous-default-export": no_anonymous_default_export_default,
	"no-rename-default": no_rename_default_default,
	"no-unused-modules": no_unused_modules_default,
	"no-commonjs": no_commonjs_default,
	"no-amd": no_amd_default,
	"no-duplicates": no_duplicates_default,
	first: first_default,
	"max-dependencies": max_dependencies_default,
	"no-extraneous-dependencies": no_extraneous_dependencies_default,
	"no-absolute-path": no_absolute_path_default,
	"no-nodejs-modules": no_nodejs_modules_default,
	"no-webpack-loader-syntax": no_webpack_loader_syntax_default,
	order: order_default,
	"newline-after-import": newline_after_import_default,
	"prefer-default-export": prefer_default_export_default,
	"no-default-export": no_default_export_default,
	"no-named-export": no_named_export_default,
	"no-dynamic-require": no_dynamic_require_default,
	unambiguous: unambiguous_default,
	"no-unassigned-import": no_unassigned_import_default,
	"no-useless-path-segments": no_useless_path_segments_default,
	"dynamic-import-chunkname": dynamic_import_chunkname_default,
	"no-import-module-exports": no_import_module_exports_default,
	"no-empty-named-blocks": no_empty_named_blocks_default,
	"exports-last": exports_last_default,
	"no-deprecated": no_deprecated_default,
	"imports-first": imports_first_default
};
const plugin_ = {
	meta,
	rules,
	cjsRequire,
	importXResolverCompat,
	createNodeResolver
};
const createFlatConfig = (baseConfig, configName) => ({
	...baseConfig,
	name: `import-x/${configName}`,
	plugins: { "import-x": plugin_ }
});
const flatConfigs = {
	recommended: createFlatConfig(recommended_default, "recommended"),
	errors: createFlatConfig(errors_default$1, "errors"),
	warnings: createFlatConfig(warnings_default, "warnings"),
	"stage-0": createFlatConfig(stage_0_default, "stage-0"),
	react: createFlatConfig(react_default, "react"),
	"react-native": createFlatConfig(react_native_default, "react-native"),
	electron: createFlatConfig(electron_default$1, "electron"),
	typescript: createFlatConfig(typescript_default, "typescript")
};
const configs = {
	recommended: recommended_default$1,
	errors: errors_default,
	warnings: warnings_default$1,
	"stage-0": stage_0_default$1,
	react: react_default$1,
	"react-native": react_native_default$1,
	electron: electron_default,
	typescript: typescript_default$1,
	"flat/recommended": flatConfigs.recommended,
	"flat/errors": flatConfigs.errors,
	"flat/warnings": flatConfigs.warnings,
	"flat/stage-0": flatConfigs["stage-0"],
	"flat/react": flatConfigs.react,
	"flat/react-native": flatConfigs["react-native"],
	"flat/electron": flatConfigs.electron,
	"flat/typescript": flatConfigs.typescript
};
const plugin = plugin_;
plugin.flatConfigs = flatConfigs;
plugin.configs = configs;
var src_default = plugin;

//#endregion
exports.cjsRequire = cjsRequire;
exports.configs = configs;
exports.createNodeResolver = createNodeResolver;
exports.default = src_default;
exports.flatConfigs = flatConfigs;
exports.importX = plugin;
exports.importXResolverCompat = importXResolverCompat;
exports.meta = meta;
exports.rules = rules;