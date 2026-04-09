import { t as require_binding } from "./binding-kg77KQCQ.mjs";
import { a as logInvalidLogPosition, c as logPluginError, n as error } from "./logs-CSQ_UMWp.mjs";
import { r as noop } from "./misc-CxyvWjTr.mjs";

//#region src/log/logging.ts
const LOG_LEVEL_SILENT = "silent";
const LOG_LEVEL_ERROR = "error";
const LOG_LEVEL_WARN = "warn";
const LOG_LEVEL_INFO = "info";
const LOG_LEVEL_DEBUG = "debug";
const logLevelPriority = {
	[LOG_LEVEL_DEBUG]: 0,
	[LOG_LEVEL_INFO]: 1,
	[LOG_LEVEL_WARN]: 2,
	[LOG_LEVEL_SILENT]: 3
};

//#endregion
//#region src/log/log-handler.ts
const normalizeLog = (log) => typeof log === "string" ? { message: log } : typeof log === "function" ? normalizeLog(log()) : log;
function getLogHandler(level, code, logger, pluginName, logLevel) {
	if (logLevelPriority[level] < logLevelPriority[logLevel]) return noop;
	return (log, pos) => {
		if (pos != null) logger(LOG_LEVEL_WARN, logInvalidLogPosition(pluginName));
		log = normalizeLog(log);
		if (log.code && !log.pluginCode) log.pluginCode = log.code;
		log.code = code;
		log.plugin = pluginName;
		logger(level, log);
	};
}

//#endregion
//#region package.json
var version = "1.0.0-beta.52";
var description = "Fast JavaScript/TypeScript bundler in Rust with Rollup-compatible API.";

//#endregion
//#region src/version.ts
const VERSION = version;

//#endregion
//#region src/plugin/minimal-plugin-context.ts
var MinimalPluginContextImpl = class {
	info;
	warn;
	debug;
	meta;
	constructor(onLog, logLevel, pluginName, watchMode, hookName) {
		this.pluginName = pluginName;
		this.hookName = hookName;
		this.debug = getLogHandler(LOG_LEVEL_DEBUG, "PLUGIN_LOG", onLog, pluginName, logLevel);
		this.info = getLogHandler(LOG_LEVEL_INFO, "PLUGIN_LOG", onLog, pluginName, logLevel);
		this.warn = getLogHandler(LOG_LEVEL_WARN, "PLUGIN_WARNING", onLog, pluginName, logLevel);
		this.meta = {
			rollupVersion: "4.23.0",
			rolldownVersion: VERSION,
			watchMode
		};
	}
	error(e) {
		return error(logPluginError(normalizeLog(e), this.pluginName, { hook: this.hookName }));
	}
};

//#endregion
//#region src/types/plain-object-like.ts
const LAZY_FIELDS_KEY = Symbol("__lazy_fields__");
/**
* Base class for classes that use `@lazyProp` decorated properties.
*
* **Design Pattern in Rolldown:**
* This is a common pattern in Rolldown due to its three-layer architecture:
* TypeScript API → NAPI Bindings → Rust Core
*
* **Why we use getters:**
* For performance - to lazily fetch data from Rust bindings only when needed,
* rather than eagerly fetching all data during object construction.
*
* **The problem:**
* Getters defined on class prototypes are non-enumerable by default, which breaks:
* - Object spread operators ({...obj})
* - Object.keys() and similar methods
* - Standard JavaScript object semantics
*
* **The solution:**
* This base class automatically converts `@lazyProp` decorated getters into
* own enumerable getters on each instance during construction.
*
* **Result:**
* Objects get both lazy-loading performance benefits AND plain JavaScript object behavior.
*
* @example
* ```typescript
* class MyClass extends PlainObjectLike {
*   @lazyProp
*   get myProp() {
*     return fetchFromRustBinding();
*   }
* }
* ```
*/
var PlainObjectLike = class {
	constructor() {
		setupLazyProperties(this);
	}
};
/**
* Set up lazy properties as own getters on an instance.
* This is called automatically by the `PlainObjectLike` base class constructor.
*
* @param instance - The instance to set up lazy properties on
* @internal
*/
function setupLazyProperties(instance) {
	const lazyFields = instance.constructor[LAZY_FIELDS_KEY];
	if (!lazyFields) return;
	for (const [propertyKey, originalGetter] of lazyFields.entries()) {
		let cachedValue;
		let hasValue = false;
		Object.defineProperty(instance, propertyKey, {
			get() {
				if (!hasValue) {
					cachedValue = originalGetter.call(this);
					hasValue = true;
				}
				return cachedValue;
			},
			enumerable: true,
			configurable: true
		});
	}
}
/**
* Get all lazy field names from a class instance.
*
* @param instance - Instance to inspect
* @returns Set of lazy property names
*/
function getLazyFields(instance) {
	const lazyFields = instance.constructor[LAZY_FIELDS_KEY];
	return lazyFields ? new Set(lazyFields.keys()) : /* @__PURE__ */ new Set();
}

//#endregion
//#region src/decorators/lazy.ts
/**
* Decorator that marks a getter as lazy-evaluated and cached.
*
* **What "lazy" means here:**
* 1. Data is lazily fetched from Rust bindings only when the property is accessed (not eagerly on construction)
* 2. Once fetched, the data is cached for subsequent accesses (performance optimization)
* 3. Despite being a getter, it behaves like a plain object property (enumerable, appears in Object.keys())
*
* **Important**: Properties decorated with `@lazyProp` are defined as own enumerable
* properties on each instance (not on the prototype). This ensures they:
* - Appear in Object.keys() and Object.getOwnPropertyNames()
* - Are included in object spreads ({...obj})
* - Are enumerable in for...in loops
*
* Classes using this decorator must extend `PlainObjectLike` base class.
*
* @example
* ```typescript
* class MyClass extends PlainObjectLike {
*   @lazyProp
*   get expensiveValue() {
*     return someExpensiveComputation();
*   }
* }
* ```
*/
function lazyProp(target, propertyKey, descriptor) {
	if (!target.constructor[LAZY_FIELDS_KEY]) target.constructor[LAZY_FIELDS_KEY] = /* @__PURE__ */ new Map();
	const originalGetter = descriptor.get;
	target.constructor[LAZY_FIELDS_KEY].set(propertyKey, originalGetter);
	return {
		enumerable: false,
		configurable: true
	};
}

//#endregion
//#region src/utils/asset-source.ts
function transformAssetSource(bindingAssetSource$1) {
	return bindingAssetSource$1.inner;
}
function bindingAssetSource(source) {
	return { inner: source };
}

//#endregion
//#region \0@oxc-project+runtime@0.99.0/helpers/decorate.js
function __decorate(decorators, target, key, desc) {
	var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	return c > 3 && r && Object.defineProperty(target, key, r), r;
}

//#endregion
//#region src/types/output-asset-impl.ts
var OutputAssetImpl = class extends PlainObjectLike {
	type = "asset";
	constructor(bindingAsset) {
		super();
		this.bindingAsset = bindingAsset;
	}
	get fileName() {
		return this.bindingAsset.getFileName();
	}
	get originalFileName() {
		return this.bindingAsset.getOriginalFileName() || null;
	}
	get originalFileNames() {
		return this.bindingAsset.getOriginalFileNames();
	}
	get name() {
		return this.bindingAsset.getName() ?? void 0;
	}
	get names() {
		return this.bindingAsset.getNames();
	}
	get source() {
		return transformAssetSource(this.bindingAsset.getSource());
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		if (keepDataAlive) this.#evaluateAllLazyFields();
		return this.bindingAsset.dropInner();
	}
	#evaluateAllLazyFields() {
		for (const field of getLazyFields(this)) this[field];
	}
};
__decorate([lazyProp], OutputAssetImpl.prototype, "fileName", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "originalFileName", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "originalFileNames", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "name", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "names", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "source", null);

//#endregion
//#region src/utils/transform-rendered-module.ts
function transformToRenderedModule(bindingRenderedModule) {
	return {
		get code() {
			return bindingRenderedModule.code;
		},
		get renderedLength() {
			return bindingRenderedModule.code?.length || 0;
		},
		get renderedExports() {
			return bindingRenderedModule.renderedExports;
		}
	};
}

//#endregion
//#region src/utils/transform-rendered-chunk.ts
function transformRenderedChunk(chunk) {
	let modules = null;
	return {
		type: "chunk",
		get name() {
			return chunk.name;
		},
		get isEntry() {
			return chunk.isEntry;
		},
		get isDynamicEntry() {
			return chunk.isDynamicEntry;
		},
		get facadeModuleId() {
			return chunk.facadeModuleId;
		},
		get moduleIds() {
			return chunk.moduleIds;
		},
		get exports() {
			return chunk.exports;
		},
		get fileName() {
			return chunk.fileName;
		},
		get imports() {
			return chunk.imports;
		},
		get dynamicImports() {
			return chunk.dynamicImports;
		},
		get modules() {
			if (!modules) modules = transformChunkModules(chunk.modules);
			return modules;
		}
	};
}
function transformChunkModules(modules) {
	const result = {};
	for (let i = 0; i < modules.values.length; i++) {
		let key = modules.keys[i];
		const mod = modules.values[i];
		result[key] = transformToRenderedModule(mod);
	}
	return result;
}

//#endregion
//#region src/types/output-chunk-impl.ts
var OutputChunkImpl = class extends PlainObjectLike {
	type = "chunk";
	constructor(bindingChunk) {
		super();
		this.bindingChunk = bindingChunk;
	}
	get fileName() {
		return this.bindingChunk.getFileName();
	}
	get name() {
		return this.bindingChunk.getName();
	}
	get exports() {
		return this.bindingChunk.getExports();
	}
	get isEntry() {
		return this.bindingChunk.getIsEntry();
	}
	get facadeModuleId() {
		return this.bindingChunk.getFacadeModuleId() || null;
	}
	get isDynamicEntry() {
		return this.bindingChunk.getIsDynamicEntry();
	}
	get sourcemapFileName() {
		return this.bindingChunk.getSourcemapFileName() || null;
	}
	get preliminaryFileName() {
		return this.bindingChunk.getPreliminaryFileName();
	}
	get code() {
		return this.bindingChunk.getCode();
	}
	get modules() {
		return transformChunkModules(this.bindingChunk.getModules());
	}
	get imports() {
		return this.bindingChunk.getImports();
	}
	get dynamicImports() {
		return this.bindingChunk.getDynamicImports();
	}
	get moduleIds() {
		return this.bindingChunk.getModuleIds();
	}
	get map() {
		const mapString = this.bindingChunk.getMap();
		return mapString ? transformToRollupSourceMap(mapString) : null;
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		if (keepDataAlive) this.#evaluateAllLazyFields();
		return this.bindingChunk.dropInner();
	}
	#evaluateAllLazyFields() {
		for (const field of getLazyFields(this)) this[field];
	}
};
__decorate([lazyProp], OutputChunkImpl.prototype, "fileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "name", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "exports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "isEntry", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "facadeModuleId", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "isDynamicEntry", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "sourcemapFileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "preliminaryFileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "code", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "modules", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "imports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "dynamicImports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "moduleIds", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "map", null);

//#endregion
//#region src/types/sourcemap.ts
function bindingifySourcemap(map) {
	if (map == null) return;
	return { inner: typeof map === "string" ? map : {
		file: map.file ?? void 0,
		mappings: map.mappings,
		sourceRoot: "sourceRoot" in map ? map.sourceRoot ?? void 0 : void 0,
		sources: map.sources?.map((s) => s ?? void 0),
		sourcesContent: map.sourcesContent?.map((s) => s ?? void 0),
		names: map.names,
		x_google_ignoreList: map.x_google_ignoreList,
		debugId: "debugId" in map ? map.debugId : void 0
	} };
}

//#endregion
//#region src/utils/transform-to-rollup-output.ts
function transformToRollupSourceMap(map) {
	const obj = {
		...JSON.parse(map),
		toString() {
			return JSON.stringify(obj);
		},
		toUrl() {
			return `data:application/json;charset=utf-8;base64,${Buffer.from(obj.toString(), "utf-8").toString("base64")}`;
		}
	};
	return obj;
}
function transformToRollupOutputChunk(bindingChunk) {
	return new OutputChunkImpl(bindingChunk);
}
function transformToMutableRollupOutputChunk(bindingChunk, changed) {
	const chunk = {
		type: "chunk",
		get code() {
			return bindingChunk.getCode();
		},
		fileName: bindingChunk.getFileName(),
		name: bindingChunk.getName(),
		get modules() {
			return transformChunkModules(bindingChunk.getModules());
		},
		get imports() {
			return bindingChunk.getImports();
		},
		get dynamicImports() {
			return bindingChunk.getDynamicImports();
		},
		exports: bindingChunk.getExports(),
		isEntry: bindingChunk.getIsEntry(),
		facadeModuleId: bindingChunk.getFacadeModuleId() || null,
		isDynamicEntry: bindingChunk.getIsDynamicEntry(),
		get moduleIds() {
			return bindingChunk.getModuleIds();
		},
		get map() {
			const map = bindingChunk.getMap();
			return map ? transformToRollupSourceMap(map) : null;
		},
		sourcemapFileName: bindingChunk.getSourcemapFileName() || null,
		preliminaryFileName: bindingChunk.getPreliminaryFileName()
	};
	const cache = {};
	return new Proxy(chunk, {
		get(target, p) {
			if (p in cache) return cache[p];
			const value = target[p];
			cache[p] = value;
			return value;
		},
		set(_target, p, newValue) {
			cache[p] = newValue;
			changed.updated.add(bindingChunk.getFileName());
			return true;
		},
		has(target, p) {
			if (p in cache) return true;
			return p in target;
		}
	});
}
function transformToRollupOutputAsset(bindingAsset) {
	return new OutputAssetImpl(bindingAsset);
}
function transformToMutableRollupOutputAsset(bindingAsset, changed) {
	const asset = {
		type: "asset",
		fileName: bindingAsset.getFileName(),
		originalFileName: bindingAsset.getOriginalFileName() || null,
		originalFileNames: bindingAsset.getOriginalFileNames(),
		get source() {
			return transformAssetSource(bindingAsset.getSource());
		},
		name: bindingAsset.getName() ?? void 0,
		names: bindingAsset.getNames()
	};
	const cache = {};
	return new Proxy(asset, {
		get(target, p) {
			if (p in cache) return cache[p];
			const value = target[p];
			cache[p] = value;
			return value;
		},
		set(_target, p, newValue) {
			cache[p] = newValue;
			changed.updated.add(bindingAsset.getFileName());
			return true;
		}
	});
}
function transformToRollupOutput(output) {
	const { chunks, assets } = output;
	return { output: [...chunks.map((chunk) => transformToRollupOutputChunk(chunk)), ...assets.map((asset) => transformToRollupOutputAsset(asset))] };
}
function transformToMutableRollupOutput(output, changed) {
	const { chunks, assets } = output;
	return { output: [...chunks.map((chunk) => transformToMutableRollupOutputChunk(chunk, changed)), ...assets.map((asset) => transformToMutableRollupOutputAsset(asset, changed))] };
}
function transformToOutputBundle(context, output, changed) {
	const bundle = Object.fromEntries(transformToMutableRollupOutput(output, changed).output.map((item) => [item.fileName, item]));
	return new Proxy(bundle, {
		set(_target, _p, _newValue, _receiver) {
			const originalStackTraceLimit = Error.stackTraceLimit;
			Error.stackTraceLimit = 2;
			const message = "This plugin assigns to bundle variable. This is discouraged by Rollup and is not supported by Rolldown. This will be ignored. https://rollupjs.org/plugin-development/#generatebundle:~:text=DANGER,this.emitFile.";
			const stack = new Error(message).stack ?? message;
			Error.stackTraceLimit = originalStackTraceLimit;
			context.warn({
				message: stack,
				code: "UNSUPPORTED_BUNDLE_ASSIGNMENT"
			});
			return true;
		},
		deleteProperty(target, property) {
			if (typeof property === "string") changed.deleted.add(property);
			return true;
		}
	});
}
function collectChangedBundle(changed, bundle) {
	const changes = {};
	for (const key in bundle) {
		if (changed.deleted.has(key) || !changed.updated.has(key)) continue;
		const item = bundle[key];
		if (item.type === "asset") changes[key] = {
			filename: item.fileName,
			originalFileNames: item.originalFileNames,
			source: bindingAssetSource(item.source),
			names: item.names
		};
		else changes[key] = {
			code: item.code,
			filename: item.fileName,
			name: item.name,
			isEntry: item.isEntry,
			exports: item.exports,
			modules: {},
			imports: item.imports,
			dynamicImports: item.dynamicImports,
			facadeModuleId: item.facadeModuleId || void 0,
			isDynamicEntry: item.isDynamicEntry,
			moduleIds: item.moduleIds,
			map: bindingifySourcemap(item.map),
			sourcemapFilename: item.sourcemapFileName || void 0,
			preliminaryFilename: item.preliminaryFileName
		};
	}
	return {
		changes,
		deleted: changed.deleted
	};
}

//#endregion
//#region src/builtin-plugin/utils.ts
var import_binding = require_binding();
var BuiltinPlugin = class {
	constructor(name, _options) {
		this.name = name;
		this._options = _options;
	}
};
function makeBuiltinPluginCallable(plugin) {
	let callablePlugin = new import_binding.BindingCallableBuiltinPlugin(bindingifyBuiltInPlugin(plugin));
	const wrappedPlugin = plugin;
	for (const key in callablePlugin) wrappedPlugin[key] = async function(...args) {
		try {
			return await callablePlugin[key](...args);
		} catch (e) {
			if (e instanceof Error && !e.stack?.includes("at ")) Error.captureStackTrace(e, wrappedPlugin[key]);
			return error(logPluginError(e, plugin.name, {
				hook: key,
				id: key === "transform" ? args[2] : void 0
			}));
		}
	};
	return wrappedPlugin;
}
function bindingifyBuiltInPlugin(plugin) {
	return {
		__name: plugin.name,
		options: plugin._options
	};
}
function bindingifyViteHtmlPlugin(plugin, onLog, logLevel, watchMode) {
	const { preHooks, normalHooks, postHooks, applyHtmlTransforms, ...options } = plugin._options;
	if (preHooks.length + normalHooks.length + postHooks.length > 0) return {
		__name: plugin.name,
		options: {
			...options,
			transformIndexHtml: async (html, path, filename, hook, output, chunk) => {
				const pluginContext = new MinimalPluginContextImpl(onLog, logLevel, plugin.name, watchMode, "transformIndexHtml");
				const context = {
					path,
					filename,
					bundle: output ? transformToOutputBundle(pluginContext, output, {
						updated: /* @__PURE__ */ new Set(),
						deleted: /* @__PURE__ */ new Set()
					}) : void 0,
					chunk: chunk ? transformToRollupOutputChunk(chunk) : void 0
				};
				switch (hook) {
					case "transform": return await applyHtmlTransforms(html, preHooks, pluginContext, context);
					case "generateBundle": return await applyHtmlTransforms(html, [...normalHooks, ...postHooks], pluginContext, context);
				}
			}
		}
	};
	return {
		__name: plugin.name,
		options: plugin._options
	};
}

//#endregion
//#region src/utils/normalize-string-or-regex.ts
function normalizedStringOrRegex(pattern) {
	if (!pattern) return;
	if (!isReadonlyArray(pattern)) return [pattern];
	return pattern;
}
function isReadonlyArray(input) {
	return Array.isArray(input);
}

//#endregion
export { LOG_LEVEL_INFO as C, LOG_LEVEL_ERROR as S, logLevelPriority as T, VERSION as _, makeBuiltinPluginCallable as a, normalizeLog as b, transformToRollupOutput as c, __decorate as d, bindingAssetSource as f, MinimalPluginContextImpl as g, PlainObjectLike as h, bindingifyViteHtmlPlugin as i, bindingifySourcemap as l, lazyProp as m, BuiltinPlugin as n, collectChangedBundle as o, transformAssetSource as p, bindingifyBuiltInPlugin as r, transformToOutputBundle as s, normalizedStringOrRegex as t, transformRenderedChunk as u, description as v, LOG_LEVEL_WARN as w, LOG_LEVEL_DEBUG as x, version as y };