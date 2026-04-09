import { t as require_binding } from "./binding-kg77KQCQ.mjs";
import { c as logPluginError, n as error, r as logCycleLoading, t as augmentCodeLocation } from "./logs-CSQ_UMWp.mjs";
import { a as unreachable, i as unimplemented, o as unsupported, t as arraify } from "./misc-CxyvWjTr.mjs";
import { b as normalizeLog, d as __decorate, f as bindingAssetSource, g as MinimalPluginContextImpl, h as PlainObjectLike, i as bindingifyViteHtmlPlugin, l as bindingifySourcemap, m as lazyProp, n as BuiltinPlugin, o as collectChangedBundle, r as bindingifyBuiltInPlugin, s as transformToOutputBundle, t as normalizedStringOrRegex, u as transformRenderedChunk, w as LOG_LEVEL_WARN } from "./normalize-string-or-regex-VlPkMWXA.mjs";
import { t as parseAst } from "./parse-ast-index-C44ewaWh.mjs";
import path from "node:path";
import * as filter from "@rolldown/pluginutils";
import fsp from "node:fs/promises";

//#region src/utils/normalize-hook.ts
function normalizeHook(hook) {
	if (typeof hook === "function" || typeof hook === "string") return {
		handler: hook,
		options: {},
		meta: {}
	};
	if (typeof hook === "object" && hook !== null) {
		const { handler, order, ...options } = hook;
		return {
			handler,
			options,
			meta: { order }
		};
	}
	unreachable("Invalid hook type");
}

//#endregion
//#region src/utils/error.ts
function unwrapBindingResult(container) {
	if (typeof container === "object" && container !== null && "isBindingErrors" in container && container.isBindingErrors) throw aggregateBindingErrorsIntoJsError(container.errors);
	return container;
}
function normalizeBindingResult(container) {
	if (typeof container === "object" && container !== null && "isBindingErrors" in container && container.isBindingErrors) return aggregateBindingErrorsIntoJsError(container.errors);
	return container;
}
function normalizeBindingError(e$1) {
	return e$1.type === "JsError" ? e$1.field0 : Object.assign(/* @__PURE__ */ new Error(), {
		kind: e$1.field0.kind,
		message: e$1.field0.message,
		stack: void 0
	});
}
function aggregateBindingErrorsIntoJsError(rawErrors) {
	const errors = rawErrors.map(normalizeBindingError);
	let summary = `Build failed with ${errors.length} error${errors.length < 2 ? "" : "s"}:\n`;
	for (let i = 0; i < errors.length; i++) {
		summary += "\n";
		if (i >= 5) {
			summary += "...";
			break;
		}
		summary += getErrorMessage(errors[i]);
	}
	const wrapper = new Error(summary);
	Object.defineProperty(wrapper, "errors", {
		configurable: true,
		enumerable: true,
		get: () => errors,
		set: (value) => Object.defineProperty(wrapper, "errors", {
			configurable: true,
			enumerable: true,
			value
		})
	});
	return wrapper;
}
function getErrorMessage(e$1) {
	if (Object.hasOwn(e$1, "kind")) return e$1.message;
	let s = "";
	if (e$1.plugin) s += `[plugin ${e$1.plugin}]`;
	const id = e$1.id ?? e$1.loc?.file;
	if (id) {
		s += " " + id;
		if (e$1.loc) s += `:${e$1.loc.line}:${e$1.loc.column}`;
	}
	if (s) s += "\n";
	const message = `${e$1.name ?? "Error"}: ${e$1.message}`;
	s += message;
	if (e$1.frame) s = joinNewLine(s, e$1.frame);
	if (e$1.stack) s = joinNewLine(s, e$1.stack.replace(message, ""));
	if (e$1.cause) {
		s = joinNewLine(s, "Caused by:");
		s = joinNewLine(s, getErrorMessage(e$1.cause).split("\n").map((line) => "  " + line).join("\n"));
	}
	return s;
}
function joinNewLine(s1, s2) {
	return s1.replace(/\n+$/, "") + "\n" + s2.replace(/^\n+/, "");
}

//#endregion
//#region src/utils/transform-module-info.ts
function transformModuleInfo(info, option) {
	return {
		get ast() {
			return unsupported("ModuleInfo#ast");
		},
		get code() {
			return info.code;
		},
		id: info.id,
		importers: info.importers,
		dynamicImporters: info.dynamicImporters,
		importedIds: info.importedIds,
		dynamicallyImportedIds: info.dynamicallyImportedIds,
		exports: info.exports,
		isEntry: info.isEntry,
		...option
	};
}

//#endregion
//#region src/utils/transform-sourcemap.ts
function isEmptySourcemapFiled(array) {
	if (!array) return true;
	if (array.length === 0 || !array[0]) return true;
	return false;
}
function normalizeTransformHookSourcemap(id, originalCode, rawMap) {
	if (!rawMap) return;
	let map = typeof rawMap === "object" ? rawMap : JSON.parse(rawMap);
	if (isEmptySourcemapFiled(map.sourcesContent)) map.sourcesContent = [originalCode];
	if (isEmptySourcemapFiled(map.sources) || map.sources && map.sources.length === 1 && map.sources[0] !== id) map.sources = [id];
	return map;
}

//#endregion
//#region ../../node_modules/.pnpm/remeda@2.32.0/node_modules/remeda/dist/lazyDataLastImpl-BDhrIOwR.js
function e(e$1, t$2, n$1) {
	let r = (n$2) => e$1(n$2, ...t$2);
	return n$1 === void 0 ? r : Object.assign(r, {
		lazy: n$1,
		lazyArgs: t$2
	});
}

//#endregion
//#region ../../node_modules/.pnpm/remeda@2.32.0/node_modules/remeda/dist/purry-DH9cw9sy.js
function t(t$2, n$1, r) {
	let i = t$2.length - n$1.length;
	if (i === 0) return t$2(...n$1);
	if (i === 1) return e(t$2, n$1, r);
	throw Error(`Wrong number of arguments`);
}

//#endregion
//#region ../../node_modules/.pnpm/remeda@2.32.0/node_modules/remeda/dist/partition-DAu403JQ.js
function t$1(...t$2) {
	return t(n, t$2);
}
const n = (e$1, t$2) => {
	let n$1 = [[], []];
	for (let [r, i] of e$1.entries()) t$2(i, r, e$1) ? n$1[0].push(i) : n$1[1].push(i);
	return n$1;
};

//#endregion
//#region src/plugin/bindingify-hook-filter.ts
function generalHookFilterMatcherToFilterExprs(matcher, stringKind) {
	if (typeof matcher === "string" || matcher instanceof RegExp) return [filter.include(generateAtomMatcher(stringKind, matcher))];
	if (Array.isArray(matcher)) return matcher.map((m) => filter.include(generateAtomMatcher(stringKind, m)));
	let ret = [];
	if (matcher.exclude) ret.push(...arraify(matcher.exclude).map((m) => filter.exclude(generateAtomMatcher(stringKind, m))));
	if (matcher.include) ret.push(...arraify(matcher.include).map((m) => filter.include(generateAtomMatcher(stringKind, m))));
	return ret;
}
function generateAtomMatcher(kind, matcher) {
	return kind === "code" ? filter.code(matcher) : filter.id(matcher);
}
function transformFilterMatcherToFilterExprs(filterOption) {
	if (!filterOption) return;
	if (Array.isArray(filterOption)) return filterOption;
	const { id, code, moduleType } = filterOption;
	let ret = [];
	let idIncludes = [];
	let idExcludes = [];
	let codeIncludes = [];
	let codeExcludes = [];
	if (id) [idIncludes, idExcludes] = t$1(generalHookFilterMatcherToFilterExprs(id, "id") ?? [], (m) => m.kind === "include");
	if (code) [codeIncludes, codeExcludes] = t$1(generalHookFilterMatcherToFilterExprs(code, "code") ?? [], (m) => m.kind === "include");
	ret.push(...idExcludes);
	ret.push(...codeExcludes);
	let andExprList = [];
	if (moduleType) {
		let moduleTypes = Array.isArray(moduleType) ? moduleType : moduleType.include ?? [];
		andExprList.push(filter.or(...moduleTypes.map((m) => filter.moduleType(m))));
	}
	if (idIncludes.length) andExprList.push(filter.or(...idIncludes.map((item) => item.expr)));
	if (codeIncludes.length) andExprList.push(filter.or(...codeIncludes.map((item) => item.expr)));
	if (andExprList.length) ret.push(filter.include(filter.and(...andExprList)));
	return ret;
}
function bindingifyGeneralHookFilter(stringKind, pattern) {
	let filterExprs = generalHookFilterMatcherToFilterExprs(pattern, stringKind);
	let ret = [];
	if (filterExprs) ret = filterExprs.map(bindingifyFilterExpr);
	return ret.length > 0 ? { value: ret } : void 0;
}
function bindingifyFilterExpr(expr) {
	let list = [];
	bindingifyFilterExprImpl(expr, list);
	return list;
}
function bindingifyFilterExprImpl(expr, list) {
	switch (expr.kind) {
		case "and": {
			let args = expr.args;
			for (let i = args.length - 1; i >= 0; i--) bindingifyFilterExprImpl(args[i], list);
			list.push({
				kind: "And",
				payload: args.length
			});
			break;
		}
		case "or": {
			let args = expr.args;
			for (let i = args.length - 1; i >= 0; i--) bindingifyFilterExprImpl(args[i], list);
			list.push({
				kind: "Or",
				payload: args.length
			});
			break;
		}
		case "not":
			bindingifyFilterExprImpl(expr.expr, list);
			list.push({ kind: "Not" });
			break;
		case "id":
			list.push({
				kind: "Id",
				payload: expr.pattern
			});
			if (expr.params.cleanUrl) list.push({ kind: "CleanUrl" });
			break;
		case "moduleType":
			list.push({
				kind: "ModuleType",
				payload: expr.pattern
			});
			break;
		case "code":
			list.push({
				kind: "Code",
				payload: expr.pattern
			});
			break;
		case "include":
			bindingifyFilterExprImpl(expr.expr, list);
			list.push({ kind: "Include" });
			break;
		case "exclude":
			bindingifyFilterExprImpl(expr.expr, list);
			list.push({ kind: "Exclude" });
			break;
		case "query":
			list.push({
				kind: "QueryKey",
				payload: expr.key
			});
			list.push({
				kind: "QueryValue",
				payload: expr.pattern
			});
			break;
		default: throw new Error(`Unknown filter expression: ${expr}`);
	}
}
function bindingifyResolveIdFilter(filterOption) {
	if (!filterOption) return;
	if (Array.isArray(filterOption)) return { value: filterOption.map(bindingifyFilterExpr) };
	return filterOption.id ? bindingifyGeneralHookFilter("id", filterOption.id) : void 0;
}
function bindingifyLoadFilter(filterOption) {
	if (!filterOption) return;
	if (Array.isArray(filterOption)) return { value: filterOption.map(bindingifyFilterExpr) };
	return filterOption.id ? bindingifyGeneralHookFilter("id", filterOption.id) : void 0;
}
function bindingifyTransformFilter(filterOption) {
	if (!filterOption) return;
	let filterExprs = transformFilterMatcherToFilterExprs(filterOption);
	let ret = [];
	if (filterExprs) ret = filterExprs.map(bindingifyFilterExpr);
	return { value: ret.length > 0 ? ret : void 0 };
}
function bindingifyRenderChunkFilter(filterOption) {
	if (!filterOption) return;
	if (Array.isArray(filterOption)) return { value: filterOption.map(bindingifyFilterExpr) };
	return filterOption.code ? bindingifyGeneralHookFilter("code", filterOption.code) : void 0;
}

//#endregion
//#region src/plugin/bindingify-plugin-hook-meta.ts
var import_binding$2 = require_binding();
function bindingifyPluginHookMeta(options) {
	return { order: bindingPluginOrder(options.order) };
}
function bindingPluginOrder(order) {
	switch (order) {
		case "post": return import_binding$2.BindingPluginOrder.Post;
		case "pre": return import_binding$2.BindingPluginOrder.Pre;
		case null:
		case void 0: return;
		default: throw new Error(`Unknown plugin order: ${order}`);
	}
}

//#endregion
//#region src/plugin/fs.ts
const fsModule = {
	appendFile: fsp.appendFile,
	copyFile: fsp.copyFile,
	mkdir: fsp.mkdir,
	mkdtemp: fsp.mkdtemp,
	readdir: fsp.readdir,
	readFile: fsp.readFile,
	realpath: fsp.realpath,
	rename: fsp.rename,
	rmdir: fsp.rmdir,
	stat: fsp.stat,
	lstat: fsp.lstat,
	unlink: fsp.unlink,
	writeFile: fsp.writeFile
};

//#endregion
//#region src/plugin/plugin-context.ts
var PluginContextImpl = class extends MinimalPluginContextImpl {
	fs = fsModule;
	getModuleInfo;
	constructor(outputOptions, context, plugin, data, onLog, logLevel, watchMode, currentLoadingModule) {
		super(onLog, logLevel, plugin.name, watchMode);
		this.outputOptions = outputOptions;
		this.context = context;
		this.data = data;
		this.onLog = onLog;
		this.currentLoadingModule = currentLoadingModule;
		this.getModuleInfo = (id) => this.data.getModuleInfo(id, context);
	}
	async load(options) {
		const id = options.id;
		if (id === this.currentLoadingModule) this.onLog(LOG_LEVEL_WARN, logCycleLoading(this.pluginName, this.currentLoadingModule));
		const moduleInfo = this.data.getModuleInfo(id, this.context);
		if (moduleInfo && moduleInfo.code !== null) return moduleInfo;
		const rawOptions = {
			meta: options.meta || {},
			moduleSideEffects: options.moduleSideEffects || null,
			invalidate: false
		};
		this.data.updateModuleOption(id, rawOptions);
		let loadPromise = this.data.loadModulePromiseMap.get(id);
		if (!loadPromise) {
			loadPromise = this.context.load(id, options.moduleSideEffects ?? void 0, options.packageJsonPath ?? void 0).catch(() => {
				this.data.loadModulePromiseMap.delete(id);
			});
			this.data.loadModulePromiseMap.set(id, loadPromise);
		}
		await loadPromise;
		return this.data.getModuleInfo(id, this.context);
	}
	async resolve(source, importer, options) {
		let receipt = void 0;
		if (options != null) receipt = this.data.saveResolveOptions(options);
		const vitePluginCustom = Object.entries(options?.custom ?? {}).reduce((acc, [key, value]) => {
			if (key.startsWith("vite:")) (acc ??= {})[key] = value;
			return acc;
		}, void 0);
		const res = await this.context.resolve(source, importer, {
			custom: receipt,
			isEntry: options?.isEntry,
			skipSelf: options?.skipSelf,
			vitePluginCustom
		});
		if (receipt != null) this.data.removeSavedResolveOptions(receipt);
		if (res == null) return null;
		const info = this.data.getModuleOption(res.id) || {};
		return {
			...res,
			external: res.external === "relative" ? unreachable(`The PluginContext resolve result external couldn't be 'relative'`) : res.external,
			...info,
			moduleSideEffects: info.moduleSideEffects ?? res.moduleSideEffects ?? null,
			packageJsonPath: res.packageJsonPath
		};
	}
	emitFile = (file) => {
		if (file.type === "prebuilt-chunk") return unimplemented("PluginContext.emitFile with type prebuilt-chunk");
		if (file.type === "chunk") return this.context.emitChunk({
			preserveEntrySignatures: bindingifyPreserveEntrySignatures(file.preserveSignature),
			...file
		});
		const fnSanitizedFileName = file.fileName || typeof this.outputOptions.sanitizeFileName !== "function" ? void 0 : this.outputOptions.sanitizeFileName(file.name || "asset");
		const filename = file.fileName ? void 0 : this.getAssetFileNames(file);
		return this.context.emitFile({
			...file,
			originalFileName: file.originalFileName || void 0,
			source: bindingAssetSource(file.source)
		}, filename, fnSanitizedFileName);
	};
	getAssetFileNames(file) {
		if (typeof this.outputOptions.assetFileNames === "function") return this.outputOptions.assetFileNames({
			type: "asset",
			name: file.name,
			names: file.name ? [file.name] : [],
			originalFileName: file.originalFileName,
			originalFileNames: file.originalFileName ? [file.originalFileName] : [],
			source: file.source
		});
	}
	getFileName(referenceId) {
		return this.context.getFileName(referenceId);
	}
	getModuleIds() {
		return this.data.getModuleIds(this.context);
	}
	addWatchFile(id) {
		this.context.addWatchFile(id);
	}
	parse(input, options) {
		return parseAst(input, options);
	}
};

//#endregion
//#region src/plugin/transform-plugin-context.ts
var TransformPluginContextImpl = class extends PluginContextImpl {
	constructor(outputOptions, context, plugin, data, inner, moduleId, moduleSource, onLog, LogLevelOption, watchMode) {
		super(outputOptions, context, plugin, data, onLog, LogLevelOption, watchMode, moduleId);
		this.inner = inner;
		this.moduleId = moduleId;
		this.moduleSource = moduleSource;
		const getLogHandler = (handler) => (log, pos) => {
			log = normalizeLog(log);
			if (pos) augmentCodeLocation(log, pos, moduleSource, moduleId);
			log.id = moduleId;
			log.hook = "transform";
			handler(log);
		};
		this.debug = getLogHandler(this.debug);
		this.warn = getLogHandler(this.warn);
		this.info = getLogHandler(this.info);
	}
	error(e$1, pos) {
		if (typeof e$1 === "string") e$1 = { message: e$1 };
		if (pos) augmentCodeLocation(e$1, pos, this.moduleSource, this.moduleId);
		e$1.id = this.moduleId;
		e$1.hook = "transform";
		return error(logPluginError(normalizeLog(e$1), this.pluginName));
	}
	getCombinedSourcemap() {
		return JSON.parse(this.inner.getCombinedSourcemap());
	}
	addWatchFile(id) {
		this.inner.addWatchFile(id);
	}
	sendMagicString(s) {
		this.inner.sendMagicString(s);
	}
};

//#endregion
//#region src/plugin/bindingify-build-hooks.ts
var import_binding$1 = require_binding();
function bindingifyBuildStart(args) {
	const hook = args.plugin.buildStart;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, opts) => {
			await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), args.pluginContextData.getInputOptions(opts));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyBuildEnd(args) {
	const hook = args.plugin.buildEnd;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, err) => {
			await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), err ? aggregateBindingErrorsIntoJsError(err) : void 0);
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyResolveId(args) {
	const hook = args.plugin.resolveId;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, specifier, importer, extraOptions) => {
			const contextResolveOptions = extraOptions.custom != null ? args.pluginContextData.getSavedResolveOptions(extraOptions.custom) : void 0;
			const ret = await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), specifier, importer ?? void 0, {
				...extraOptions,
				custom: contextResolveOptions?.custom
			});
			if (ret == null) return;
			if (ret === false) return {
				id: specifier,
				external: true,
				normalizeExternalId: true
			};
			if (typeof ret === "string") return {
				id: ret,
				normalizeExternalId: false
			};
			let exist = args.pluginContextData.updateModuleOption(ret.id, {
				meta: ret.meta || {},
				moduleSideEffects: ret.moduleSideEffects ?? null,
				invalidate: false
			});
			return {
				id: ret.id,
				external: ret.external,
				normalizeExternalId: false,
				moduleSideEffects: exist.moduleSideEffects ?? void 0,
				packageJsonPath: ret.packageJsonPath
			};
		},
		meta: bindingifyPluginHookMeta(meta),
		filter: bindingifyResolveIdFilter(options.filter)
	};
}
function bindingifyResolveDynamicImport(args) {
	const hook = args.plugin.resolveDynamicImport;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, specifier, importer) => {
			const ret = await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), specifier, importer ?? void 0);
			if (ret == null) return;
			if (ret === false) return {
				id: specifier,
				external: true
			};
			if (typeof ret === "string") return { id: ret };
			const result = {
				id: ret.id,
				external: ret.external,
				packageJsonPath: ret.packageJsonPath
			};
			if (ret.moduleSideEffects !== null) result.moduleSideEffects = ret.moduleSideEffects;
			args.pluginContextData.updateModuleOption(ret.id, {
				meta: ret.meta || {},
				moduleSideEffects: ret.moduleSideEffects || null,
				invalidate: false
			});
			return result;
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyTransform(args) {
	const hook = args.plugin.transform;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, code, id, meta$1) => {
			let magicStringInstance, astInstance;
			Object.defineProperties(meta$1, {
				magicString: { get() {
					if (magicStringInstance) return magicStringInstance;
					magicStringInstance = new import_binding$1.BindingMagicString(code);
					return magicStringInstance;
				} },
				ast: { get() {
					if (astInstance) return astInstance;
					let lang = "js";
					switch (meta$1.moduleType) {
						case "js":
						case "jsx":
						case "ts":
						case "tsx":
							lang = meta$1.moduleType;
							break;
						default: break;
					}
					astInstance = parseAst(code, {
						astType: meta$1.moduleType.includes("ts") ? "ts" : "js",
						lang
					});
					return astInstance;
				} }
			});
			const transformCtx = new TransformPluginContextImpl(args.outputOptions, ctx.inner(), args.plugin, args.pluginContextData, ctx, id, code, args.onLog, args.logLevel, args.watchMode);
			const ret = await handler.call(transformCtx, code, id, meta$1);
			if (ret == null) return;
			if (typeof ret === "string") return { code: ret };
			let moduleOption = args.pluginContextData.updateModuleOption(id, {
				meta: ret.meta ?? {},
				moduleSideEffects: ret.moduleSideEffects ?? null,
				invalidate: false
			});
			let normalizedCode = void 0;
			let map = ret.map;
			if (typeof ret.code === "string") normalizedCode = ret.code;
			else if (ret.code instanceof import_binding$1.BindingMagicString) {
				let magicString = ret.code;
				normalizedCode = magicString.toString();
				let fallbackSourcemap = ctx.sendMagicString(magicString);
				if (fallbackSourcemap != void 0) map = fallbackSourcemap;
			}
			return {
				code: normalizedCode,
				map: bindingifySourcemap(normalizeTransformHookSourcemap(id, code, map)),
				moduleSideEffects: moduleOption.moduleSideEffects ?? void 0,
				moduleType: ret.moduleType
			};
		},
		meta: bindingifyPluginHookMeta(meta),
		filter: bindingifyTransformFilter(options.filter)
	};
}
function bindingifyLoad(args) {
	const hook = args.plugin.load;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, id) => {
			const ret = await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode, id), id);
			if (ret == null) return;
			if (typeof ret === "string") return { code: ret };
			let moduleOption = args.pluginContextData.updateModuleOption(id, {
				meta: ret.meta || {},
				moduleSideEffects: ret.moduleSideEffects ?? null,
				invalidate: false
			});
			let map = preProcessSourceMap(ret, id);
			return {
				code: ret.code,
				map: bindingifySourcemap(map),
				moduleType: ret.moduleType,
				moduleSideEffects: moduleOption.moduleSideEffects ?? void 0
			};
		},
		meta: bindingifyPluginHookMeta(meta),
		filter: bindingifyLoadFilter(options.filter)
	};
}
function preProcessSourceMap(ret, id) {
	if (!ret.map) return;
	let map = typeof ret.map === "object" ? ret.map : JSON.parse(ret.map);
	if (!isEmptySourcemapFiled(map.sources)) {
		const directory = path.dirname(id) || ".";
		const sourceRoot = map.sourceRoot || ".";
		map.sources = map.sources.map((source) => path.resolve(directory, sourceRoot, source));
	}
	return map;
}
function bindingifyModuleParsed(args) {
	const hook = args.plugin.moduleParsed;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, moduleInfo) => {
			await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), transformModuleInfo(moduleInfo, args.pluginContextData.getModuleOption(moduleInfo.id)));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}

//#endregion
//#region src/plugin/bindingify-output-hooks.ts
function bindingifyRenderStart(args) {
	const hook = args.plugin.renderStart;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, opts) => {
			handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), args.pluginContextData.getOutputOptions(opts), args.pluginContextData.getInputOptions(opts));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyRenderChunk(args) {
	const hook = args.plugin.renderChunk;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, code, chunk, opts, meta$1) => {
			if (args.pluginContextData.getRenderChunkMeta() == null) args.pluginContextData.setRenderChunkMeta({ chunks: Object.fromEntries(Object.entries(meta$1.chunks).map(([key, value]) => [key, transformRenderedChunk(value)])) });
			const ret = await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), code, transformRenderedChunk(chunk), args.pluginContextData.getOutputOptions(opts), args.pluginContextData.getRenderChunkMeta());
			if (ret == null) return;
			if (typeof ret === "string") return { code: ret };
			if (!ret.map) return { code: ret.code };
			return {
				code: ret.code,
				map: bindingifySourcemap(ret.map)
			};
		},
		meta: bindingifyPluginHookMeta(meta),
		filter: bindingifyRenderChunkFilter(options.filter)
	};
}
function bindingifyAugmentChunkHash(args) {
	const hook = args.plugin.augmentChunkHash;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			return handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyRenderError(args) {
	const hook = args.plugin.renderError;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, err) => {
			handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), aggregateBindingErrorsIntoJsError(err));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyGenerateBundle(args) {
	const hook = args.plugin.generateBundle;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, bundle, isWrite, opts) => {
			const changed = {
				updated: /* @__PURE__ */ new Set(),
				deleted: /* @__PURE__ */ new Set()
			};
			const context = new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode);
			const output = transformToOutputBundle(context, unwrapBindingResult(bundle), changed);
			await handler.call(context, args.pluginContextData.getOutputOptions(opts), output, isWrite);
			return collectChangedBundle(changed, output);
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyWriteBundle(args) {
	const hook = args.plugin.writeBundle;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, bundle, opts) => {
			const changed = {
				updated: /* @__PURE__ */ new Set(),
				deleted: /* @__PURE__ */ new Set()
			};
			const context = new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode);
			const output = transformToOutputBundle(context, unwrapBindingResult(bundle), changed);
			await handler.call(context, args.pluginContextData.getOutputOptions(opts), output);
			return collectChangedBundle(changed, output);
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyCloseBundle(args) {
	const hook = args.plugin.closeBundle;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx) => {
			await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyBanner(args) {
	const hook = args.plugin.banner;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyFooter(args) {
	const hook = args.plugin.footer;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyIntro(args) {
	const hook = args.plugin.intro;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyOutro(args) {
	const hook = args.plugin.outro;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}

//#endregion
//#region src/plugin/bindingify-watch-hooks.ts
function bindingifyWatchChange(args) {
	const hook = args.plugin.watchChange;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, id, event) => {
			await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode), id, { event });
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyCloseWatcher(args) {
	const hook = args.plugin.closeWatcher;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx) => {
			await handler.call(new PluginContextImpl(args.outputOptions, ctx, args.plugin, args.pluginContextData, args.onLog, args.logLevel, args.watchMode));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}

//#endregion
//#region src/plugin/generated/hook-usage.ts
let HookUsageKind = /* @__PURE__ */ function(HookUsageKind$1) {
	HookUsageKind$1[HookUsageKind$1["buildStart"] = 1] = "buildStart";
	HookUsageKind$1[HookUsageKind$1["resolveId"] = 2] = "resolveId";
	HookUsageKind$1[HookUsageKind$1["resolveDynamicImport"] = 4] = "resolveDynamicImport";
	HookUsageKind$1[HookUsageKind$1["load"] = 8] = "load";
	HookUsageKind$1[HookUsageKind$1["transform"] = 16] = "transform";
	HookUsageKind$1[HookUsageKind$1["moduleParsed"] = 32] = "moduleParsed";
	HookUsageKind$1[HookUsageKind$1["buildEnd"] = 64] = "buildEnd";
	HookUsageKind$1[HookUsageKind$1["renderStart"] = 128] = "renderStart";
	HookUsageKind$1[HookUsageKind$1["renderError"] = 256] = "renderError";
	HookUsageKind$1[HookUsageKind$1["renderChunk"] = 512] = "renderChunk";
	HookUsageKind$1[HookUsageKind$1["augmentChunkHash"] = 1024] = "augmentChunkHash";
	HookUsageKind$1[HookUsageKind$1["generateBundle"] = 2048] = "generateBundle";
	HookUsageKind$1[HookUsageKind$1["writeBundle"] = 4096] = "writeBundle";
	HookUsageKind$1[HookUsageKind$1["closeBundle"] = 8192] = "closeBundle";
	HookUsageKind$1[HookUsageKind$1["watchChange"] = 16384] = "watchChange";
	HookUsageKind$1[HookUsageKind$1["closeWatcher"] = 32768] = "closeWatcher";
	HookUsageKind$1[HookUsageKind$1["transformAst"] = 65536] = "transformAst";
	HookUsageKind$1[HookUsageKind$1["banner"] = 131072] = "banner";
	HookUsageKind$1[HookUsageKind$1["footer"] = 262144] = "footer";
	HookUsageKind$1[HookUsageKind$1["intro"] = 524288] = "intro";
	HookUsageKind$1[HookUsageKind$1["outro"] = 1048576] = "outro";
	return HookUsageKind$1;
}({});
var HookUsage = class {
	bitflag = BigInt(0);
	constructor() {}
	union(kind) {
		this.bitflag |= BigInt(kind);
	}
	inner() {
		return Number(this.bitflag);
	}
};
function extractHookUsage(plugin) {
	let hookUsage = new HookUsage();
	if (plugin.buildStart) hookUsage.union(HookUsageKind.buildStart);
	if (plugin.resolveId) hookUsage.union(HookUsageKind.resolveId);
	if (plugin.resolveDynamicImport) hookUsage.union(HookUsageKind.resolveDynamicImport);
	if (plugin.load) hookUsage.union(HookUsageKind.load);
	if (plugin.transform) hookUsage.union(HookUsageKind.transform);
	if (plugin.moduleParsed) hookUsage.union(HookUsageKind.moduleParsed);
	if (plugin.buildEnd) hookUsage.union(HookUsageKind.buildEnd);
	if (plugin.renderStart) hookUsage.union(HookUsageKind.renderStart);
	if (plugin.renderError) hookUsage.union(HookUsageKind.renderError);
	if (plugin.renderChunk) hookUsage.union(HookUsageKind.renderChunk);
	if (plugin.augmentChunkHash) hookUsage.union(HookUsageKind.augmentChunkHash);
	if (plugin.generateBundle) hookUsage.union(HookUsageKind.generateBundle);
	if (plugin.writeBundle) hookUsage.union(HookUsageKind.writeBundle);
	if (plugin.closeBundle) hookUsage.union(HookUsageKind.closeBundle);
	if (plugin.watchChange) hookUsage.union(HookUsageKind.watchChange);
	if (plugin.closeWatcher) hookUsage.union(HookUsageKind.closeWatcher);
	if (plugin.banner) hookUsage.union(HookUsageKind.banner);
	if (plugin.footer) hookUsage.union(HookUsageKind.footer);
	if (plugin.intro) hookUsage.union(HookUsageKind.intro);
	if (plugin.outro) hookUsage.union(HookUsageKind.outro);
	return hookUsage;
}

//#endregion
//#region src/plugin/bindingify-plugin.ts
function bindingifyPlugin(plugin, options, outputOptions, pluginContextData, normalizedOutputPlugins, onLog, logLevel, watchMode) {
	const args = {
		plugin,
		options,
		outputOptions,
		pluginContextData,
		onLog,
		logLevel,
		watchMode,
		normalizedOutputPlugins
	};
	const { plugin: buildStart, meta: buildStartMeta } = bindingifyBuildStart(args);
	const { plugin: resolveId, meta: resolveIdMeta, filter: resolveIdFilter } = bindingifyResolveId(args);
	const { plugin: resolveDynamicImport, meta: resolveDynamicImportMeta } = bindingifyResolveDynamicImport(args);
	const { plugin: buildEnd, meta: buildEndMeta } = bindingifyBuildEnd(args);
	const { plugin: transform, meta: transformMeta, filter: transformFilter } = bindingifyTransform(args);
	const { plugin: moduleParsed, meta: moduleParsedMeta } = bindingifyModuleParsed(args);
	const { plugin: load, meta: loadMeta, filter: loadFilter } = bindingifyLoad(args);
	const { plugin: renderChunk, meta: renderChunkMeta, filter: renderChunkFilter } = bindingifyRenderChunk(args);
	const { plugin: augmentChunkHash, meta: augmentChunkHashMeta } = bindingifyAugmentChunkHash(args);
	const { plugin: renderStart, meta: renderStartMeta } = bindingifyRenderStart(args);
	const { plugin: renderError, meta: renderErrorMeta } = bindingifyRenderError(args);
	const { plugin: generateBundle, meta: generateBundleMeta } = bindingifyGenerateBundle(args);
	const { plugin: writeBundle, meta: writeBundleMeta } = bindingifyWriteBundle(args);
	const { plugin: closeBundle, meta: closeBundleMeta } = bindingifyCloseBundle(args);
	const { plugin: banner, meta: bannerMeta } = bindingifyBanner(args);
	const { plugin: footer, meta: footerMeta } = bindingifyFooter(args);
	const { plugin: intro, meta: introMeta } = bindingifyIntro(args);
	const { plugin: outro, meta: outroMeta } = bindingifyOutro(args);
	const { plugin: watchChange, meta: watchChangeMeta } = bindingifyWatchChange(args);
	const { plugin: closeWatcher, meta: closeWatcherMeta } = bindingifyCloseWatcher(args);
	let hookUsage = extractHookUsage(plugin).inner();
	return wrapHandlers({
		name: plugin.name,
		buildStart,
		buildStartMeta,
		resolveId,
		resolveIdMeta,
		resolveIdFilter,
		resolveDynamicImport,
		resolveDynamicImportMeta,
		buildEnd,
		buildEndMeta,
		transform,
		transformMeta,
		transformFilter,
		moduleParsed,
		moduleParsedMeta,
		load,
		loadMeta,
		loadFilter,
		renderChunk,
		renderChunkMeta,
		renderChunkFilter,
		augmentChunkHash,
		augmentChunkHashMeta,
		renderStart,
		renderStartMeta,
		renderError,
		renderErrorMeta,
		generateBundle,
		generateBundleMeta,
		writeBundle,
		writeBundleMeta,
		closeBundle,
		closeBundleMeta,
		banner,
		bannerMeta,
		footer,
		footerMeta,
		intro,
		introMeta,
		outro,
		outroMeta,
		watchChange,
		watchChangeMeta,
		closeWatcher,
		closeWatcherMeta,
		hookUsage
	});
}
function wrapHandlers(plugin) {
	for (const hookName of [
		"buildStart",
		"resolveId",
		"resolveDynamicImport",
		"buildEnd",
		"transform",
		"moduleParsed",
		"load",
		"renderChunk",
		"augmentChunkHash",
		"renderStart",
		"renderError",
		"generateBundle",
		"writeBundle",
		"closeBundle",
		"banner",
		"footer",
		"intro",
		"outro",
		"watchChange",
		"closeWatcher"
	]) {
		const handler = plugin[hookName];
		if (handler) plugin[hookName] = async (...args) => {
			try {
				return await handler(...args);
			} catch (e$1) {
				return error(logPluginError(e$1, plugin.name, {
					hook: hookName,
					id: hookName === "transform" ? args[2] : void 0
				}));
			}
		};
	}
	return plugin;
}

//#endregion
//#region src/options/normalized-input-options.ts
var NormalizedInputOptionsImpl = class extends PlainObjectLike {
	inner;
	constructor(inner, onLog) {
		super();
		this.onLog = onLog;
		this.inner = inner;
	}
	get shimMissingExports() {
		return this.inner.shimMissingExports;
	}
	get input() {
		return this.inner.input;
	}
	get cwd() {
		return this.inner.cwd ?? void 0;
	}
	get platform() {
		return this.inner.platform;
	}
	get context() {
		return this.inner.context;
	}
};
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "shimMissingExports", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "input", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "cwd", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "platform", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "context", null);

//#endregion
//#region src/options/normalized-output-options.ts
var NormalizedOutputOptionsImpl = class extends PlainObjectLike {
	constructor(inner, outputOptions, normalizedOutputPlugins) {
		super();
		this.inner = inner;
		this.outputOptions = outputOptions;
		this.normalizedOutputPlugins = normalizedOutputPlugins;
	}
	get dir() {
		return this.inner.dir ?? void 0;
	}
	get entryFileNames() {
		return this.inner.entryFilenames || this.outputOptions.entryFileNames;
	}
	get chunkFileNames() {
		return this.inner.chunkFilenames || this.outputOptions.chunkFileNames;
	}
	get assetFileNames() {
		return this.inner.assetFilenames || this.outputOptions.assetFileNames;
	}
	get format() {
		return this.inner.format;
	}
	get exports() {
		return this.inner.exports;
	}
	get sourcemap() {
		return this.inner.sourcemap;
	}
	get sourcemapBaseUrl() {
		return this.inner.sourcemapBaseUrl ?? void 0;
	}
	get cssEntryFileNames() {
		return this.inner.cssEntryFilenames || this.outputOptions.cssEntryFileNames;
	}
	get cssChunkFileNames() {
		return this.inner.cssChunkFilenames || this.outputOptions.cssChunkFileNames;
	}
	get shimMissingExports() {
		return this.inner.shimMissingExports;
	}
	get name() {
		return this.inner.name ?? void 0;
	}
	get file() {
		return this.inner.file ?? void 0;
	}
	get inlineDynamicImports() {
		return this.inner.inlineDynamicImports;
	}
	get externalLiveBindings() {
		return this.inner.externalLiveBindings;
	}
	get banner() {
		return normalizeAddon(this.outputOptions.banner);
	}
	get footer() {
		return normalizeAddon(this.outputOptions.footer);
	}
	get intro() {
		return normalizeAddon(this.outputOptions.intro);
	}
	get outro() {
		return normalizeAddon(this.outputOptions.outro);
	}
	get esModule() {
		return this.inner.esModule;
	}
	get extend() {
		return this.inner.extend;
	}
	get globals() {
		return this.inner.globals || this.outputOptions.globals;
	}
	get paths() {
		return this.outputOptions.paths;
	}
	get hashCharacters() {
		return this.inner.hashCharacters;
	}
	get sourcemapDebugIds() {
		return this.inner.sourcemapDebugIds;
	}
	get sourcemapIgnoreList() {
		return this.outputOptions.sourcemapIgnoreList;
	}
	get sourcemapPathTransform() {
		return this.outputOptions.sourcemapPathTransform;
	}
	get minify() {
		let ret = this.inner.minify;
		if (typeof ret === "object" && ret !== null) {
			delete ret["codegen"];
			delete ret["module"];
			delete ret["sourcemap"];
		}
		return ret;
	}
	get legalComments() {
		return this.inner.legalComments;
	}
	get polyfillRequire() {
		return this.inner.polyfillRequire;
	}
	get plugins() {
		return this.normalizedOutputPlugins;
	}
	get preserveModules() {
		return this.inner.preserveModules;
	}
	get preserveModulesRoot() {
		return this.inner.preserveModulesRoot;
	}
	get virtualDirname() {
		return this.inner.virtualDirname;
	}
	get topLevelVar() {
		return this.inner.topLevelVar ?? false;
	}
	get minifyInternalExports() {
		return this.inner.minifyInternalExports ?? false;
	}
};
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "dir", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "entryFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "chunkFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "assetFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "format", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "exports", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemap", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapBaseUrl", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "cssEntryFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "cssChunkFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "shimMissingExports", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "name", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "file", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "inlineDynamicImports", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "externalLiveBindings", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "banner", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "footer", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "intro", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "outro", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "esModule", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "extend", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "globals", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "paths", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "hashCharacters", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapDebugIds", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapIgnoreList", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapPathTransform", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "minify", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "legalComments", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "polyfillRequire", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "plugins", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "preserveModules", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "preserveModulesRoot", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "virtualDirname", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "topLevelVar", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "minifyInternalExports", null);
function normalizeAddon(value) {
	if (typeof value === "function") return value;
	return () => value || "";
}

//#endregion
//#region src/plugin/plugin-context-data.ts
var PluginContextData = class {
	moduleOptionMap = /* @__PURE__ */ new Map();
	resolveOptionsMap = /* @__PURE__ */ new Map();
	loadModulePromiseMap = /* @__PURE__ */ new Map();
	renderedChunkMeta = null;
	normalizedInputOptions = null;
	normalizedOutputOptions = null;
	constructor(onLog, outputOptions, normalizedOutputPlugins) {
		this.onLog = onLog;
		this.outputOptions = outputOptions;
		this.normalizedOutputPlugins = normalizedOutputPlugins;
	}
	updateModuleOption(id, option) {
		const existing = this.moduleOptionMap.get(id);
		if (existing) {
			if (option.moduleSideEffects != null) existing.moduleSideEffects = option.moduleSideEffects;
			if (option.meta != null) Object.assign(existing.meta, option.meta);
			if (option.invalidate != null) existing.invalidate = option.invalidate;
		} else {
			this.moduleOptionMap.set(id, option);
			return option;
		}
		return existing;
	}
	getModuleOption(id) {
		const option = this.moduleOptionMap.get(id);
		if (!option) {
			const raw = {
				moduleSideEffects: null,
				meta: {}
			};
			this.moduleOptionMap.set(id, raw);
			return raw;
		}
		return option;
	}
	getModuleInfo(id, context) {
		const bindingInfo = context.getModuleInfo(id);
		if (bindingInfo) {
			const info = transformModuleInfo(bindingInfo, this.getModuleOption(id));
			return this.proxyModuleInfo(id, info);
		}
		return null;
	}
	proxyModuleInfo(id, info) {
		let moduleSideEffects = info.moduleSideEffects;
		Object.defineProperty(info, "moduleSideEffects", {
			get() {
				return moduleSideEffects;
			},
			set: (v) => {
				this.updateModuleOption(id, {
					moduleSideEffects: v,
					meta: info.meta,
					invalidate: true
				});
				moduleSideEffects = v;
			}
		});
		return info;
	}
	getModuleIds(context) {
		return context.getModuleIds().values();
	}
	saveResolveOptions(options) {
		const index = this.resolveOptionsMap.size;
		this.resolveOptionsMap.set(index, options);
		return index;
	}
	getSavedResolveOptions(receipt) {
		return this.resolveOptionsMap.get(receipt);
	}
	removeSavedResolveOptions(receipt) {
		this.resolveOptionsMap.delete(receipt);
	}
	setRenderChunkMeta(meta) {
		this.renderedChunkMeta = meta;
	}
	getRenderChunkMeta() {
		return this.renderedChunkMeta;
	}
	getInputOptions(opts) {
		this.normalizedInputOptions ??= new NormalizedInputOptionsImpl(opts, this.onLog);
		return this.normalizedInputOptions;
	}
	getOutputOptions(opts) {
		this.normalizedOutputOptions ??= new NormalizedOutputOptionsImpl(opts, this.outputOptions, this.normalizedOutputPlugins);
		return this.normalizedOutputOptions;
	}
	clear() {
		this.renderedChunkMeta = null;
		this.loadModulePromiseMap.clear();
	}
};

//#endregion
//#region src/utils/normalize-transform-options.ts
/**
* Normalizes transform options by extracting `define`, `inject`, and `dropLabels` separately from OXC transform options.
*
* Prioritizes values from `transform.define`, `transform.inject`, and `transform.dropLabels` over deprecated top-level options.
*/
function normalizeTransformOptions(inputOptions) {
	const transform = inputOptions.transform;
	const define = transform?.define ? Object.entries(transform.define) : void 0;
	const inject = transform?.inject;
	const dropLabels = transform?.dropLabels;
	let oxcTransformOptions;
	if (transform) {
		const { define: _define, inject: _inject, dropLabels: _dropLabels, ...rest } = transform;
		if (Object.keys(rest).length > 0) {
			if (rest.jsx === false) rest.jsx = "disable";
			oxcTransformOptions = rest;
		}
	}
	return {
		define,
		inject,
		dropLabels,
		oxcTransformOptions
	};
}

//#endregion
//#region src/utils/bindingify-input-options.ts
var import_binding = require_binding();
function bindingifyInputOptions(rawPlugins, inputOptions, outputOptions, normalizedOutputPlugins, onLog, logLevel, watchMode) {
	const pluginContextData = new PluginContextData(onLog, outputOptions, normalizedOutputPlugins);
	const plugins = rawPlugins.map((plugin) => {
		if ("_parallel" in plugin) return;
		if (plugin instanceof BuiltinPlugin) {
			if (plugin.name === "builtin:vite-html") return bindingifyViteHtmlPlugin(plugin, onLog, logLevel, watchMode);
			return bindingifyBuiltInPlugin(plugin);
		}
		return bindingifyPlugin(plugin, inputOptions, outputOptions, pluginContextData, normalizedOutputPlugins, onLog, logLevel, watchMode);
	});
	const normalizedTransform = normalizeTransformOptions(inputOptions);
	return {
		input: bindingifyInput(inputOptions.input),
		plugins,
		cwd: inputOptions.cwd ?? process.cwd(),
		external: bindingifyExternal(inputOptions.external),
		resolve: bindingifyResolve(inputOptions.resolve),
		platform: inputOptions.platform,
		shimMissingExports: inputOptions.shimMissingExports,
		logLevel: bindingifyLogLevel(logLevel),
		onLog: async (level, log) => onLog(level, log),
		treeshake: bindingifyTreeshakeOptions(inputOptions.treeshake),
		moduleTypes: inputOptions.moduleTypes,
		define: normalizedTransform.define,
		inject: bindingifyInject(normalizedTransform.inject),
		experimental: bindingifyExperimental(inputOptions.experimental),
		profilerNames: outputOptions.generatedCode?.profilerNames,
		transform: normalizedTransform.oxcTransformOptions,
		watch: bindingifyWatch(inputOptions.watch),
		dropLabels: normalizedTransform.dropLabels,
		keepNames: outputOptions.keepNames,
		checks: inputOptions.checks,
		deferSyncScanData: () => {
			let ret = [];
			pluginContextData.moduleOptionMap.forEach((value, key) => {
				if (value.invalidate) ret.push({
					id: key,
					sideEffects: value.moduleSideEffects ?? void 0
				});
			});
			return ret;
		},
		makeAbsoluteExternalsRelative: bindingifyMakeAbsoluteExternalsRelative(inputOptions.makeAbsoluteExternalsRelative),
		debug: inputOptions.debug,
		invalidateJsSideCache: pluginContextData.clear.bind(pluginContextData),
		preserveEntrySignatures: bindingifyPreserveEntrySignatures(inputOptions.preserveEntrySignatures),
		optimization: inputOptions.optimization,
		context: inputOptions.context,
		tsconfig: inputOptions.resolve?.tsconfigFilename ?? inputOptions.tsconfig
	};
}
function bindingifyHmr(hmr) {
	if (hmr) {
		if (typeof hmr === "boolean") return hmr ? {} : void 0;
		return hmr;
	}
}
function bindingifyAttachDebugInfo(attachDebugInfo) {
	switch (attachDebugInfo) {
		case void 0: return;
		case "full": return import_binding.BindingAttachDebugInfo.Full;
		case "simple": return import_binding.BindingAttachDebugInfo.Simple;
		case "none": return import_binding.BindingAttachDebugInfo.None;
	}
}
function bindingifyExternal(external) {
	if (external) {
		if (typeof external === "function") return (id, importer, isResolved) => {
			if (id.startsWith("\0")) return false;
			return external(id, importer, isResolved) ?? false;
		};
		return arraify(external);
	}
}
function bindingifyExperimental(experimental) {
	let chunkModulesOrder = import_binding.BindingChunkModuleOrderBy.ExecOrder;
	if (experimental?.chunkModulesOrder) switch (experimental.chunkModulesOrder) {
		case "exec-order":
			chunkModulesOrder = import_binding.BindingChunkModuleOrderBy.ExecOrder;
			break;
		case "module-id":
			chunkModulesOrder = import_binding.BindingChunkModuleOrderBy.ModuleId;
			break;
		default: throw new Error(`Unexpected chunkModulesOrder: ${experimental.chunkModulesOrder}`);
	}
	return {
		strictExecutionOrder: experimental?.strictExecutionOrder,
		disableLiveBindings: experimental?.disableLiveBindings,
		viteMode: experimental?.viteMode,
		resolveNewUrlToAsset: experimental?.resolveNewUrlToAsset,
		hmr: bindingifyHmr(experimental?.hmr),
		attachDebugInfo: bindingifyAttachDebugInfo(experimental?.attachDebugInfo),
		chunkModulesOrder,
		chunkImportMap: experimental?.chunkImportMap,
		onDemandWrapping: experimental?.onDemandWrapping,
		incrementalBuild: experimental?.incrementalBuild,
		nativeMagicString: experimental?.nativeMagicString
	};
}
function bindingifyResolve(resolve) {
	const yarnPnp = typeof process === "object" && !!process.versions?.pnp;
	if (resolve) {
		const { alias, extensionAlias, ...rest } = resolve;
		return {
			alias: alias ? Object.entries(alias).map(([name, replacement]) => ({
				find: name,
				replacements: replacement === false ? [void 0] : arraify(replacement)
			})) : void 0,
			extensionAlias: extensionAlias ? Object.entries(extensionAlias).map(([name, value]) => ({
				target: name,
				replacements: value
			})) : void 0,
			yarnPnp,
			...rest
		};
	} else return { yarnPnp };
}
function bindingifyInject(inject) {
	if (inject) return Object.entries(inject).map(([alias, item]) => {
		if (Array.isArray(item)) {
			if (item[1] === "*") return {
				tagNamespace: true,
				alias,
				from: item[0]
			};
			return {
				tagNamed: true,
				alias,
				from: item[0],
				imported: item[1]
			};
		} else return {
			tagNamed: true,
			imported: "default",
			alias,
			from: item
		};
	});
}
function bindingifyLogLevel(logLevel) {
	switch (logLevel) {
		case "silent": return import_binding.BindingLogLevel.Silent;
		case "debug": return import_binding.BindingLogLevel.Debug;
		case "warn": return import_binding.BindingLogLevel.Warn;
		case "info": return import_binding.BindingLogLevel.Info;
		default: throw new Error(`Unexpected log level: ${logLevel}`);
	}
}
function bindingifyInput(input) {
	if (input === void 0) return [];
	if (typeof input === "string") return [{ import: input }];
	if (Array.isArray(input)) return input.map((src) => ({ import: src }));
	return Object.entries(input).map(([name, import_path]) => {
		return {
			name,
			import: import_path
		};
	});
}
function bindingifyWatch(watch) {
	if (watch) return {
		buildDelay: watch.buildDelay,
		skipWrite: watch.skipWrite,
		include: normalizedStringOrRegex(watch.include),
		exclude: normalizedStringOrRegex(watch.exclude),
		onInvalidate: (...args) => watch.onInvalidate?.(...args)
	};
}
function bindingifyTreeshakeOptions(config) {
	if (config === false) return;
	if (config === true || config === void 0) return { moduleSideEffects: true };
	let normalizedConfig = {
		moduleSideEffects: true,
		annotations: config.annotations,
		manualPureFunctions: config.manualPureFunctions,
		unknownGlobalSideEffects: config.unknownGlobalSideEffects,
		commonjs: config.commonjs
	};
	switch (config.propertyReadSideEffects) {
		case "always":
			normalizedConfig.propertyReadSideEffects = import_binding.BindingPropertyReadSideEffects.Always;
			break;
		case false:
			normalizedConfig.propertyReadSideEffects = import_binding.BindingPropertyReadSideEffects.False;
			break;
		default:
	}
	switch (config.propertyWriteSideEffects) {
		case "always":
			normalizedConfig.propertyWriteSideEffects = import_binding.BindingPropertyWriteSideEffects.Always;
			break;
		case false:
			normalizedConfig.propertyWriteSideEffects = import_binding.BindingPropertyWriteSideEffects.False;
			break;
		default:
	}
	if (config.moduleSideEffects === void 0) normalizedConfig.moduleSideEffects = true;
	else if (config.moduleSideEffects === "no-external") normalizedConfig.moduleSideEffects = [{
		external: true,
		sideEffects: false
	}, {
		external: false,
		sideEffects: true
	}];
	else normalizedConfig.moduleSideEffects = config.moduleSideEffects;
	return normalizedConfig;
}
function bindingifyMakeAbsoluteExternalsRelative(makeAbsoluteExternalsRelative) {
	if (makeAbsoluteExternalsRelative === "ifRelativeSource") return { type: "IfRelativeSource" };
	if (typeof makeAbsoluteExternalsRelative === "boolean") return {
		type: "Bool",
		field0: makeAbsoluteExternalsRelative
	};
}
function bindingifyPreserveEntrySignatures(preserveEntrySignatures) {
	if (preserveEntrySignatures == void 0) return;
	else if (typeof preserveEntrySignatures === "string") return {
		type: "String",
		field0: preserveEntrySignatures
	};
	else return {
		type: "Bool",
		field0: preserveEntrySignatures
	};
}

//#endregion
export { aggregateBindingErrorsIntoJsError as a, normalizeHook as c, transformModuleInfo as i, PluginContextData as n, normalizeBindingResult as o, bindingifyPlugin as r, unwrapBindingResult as s, bindingifyInputOptions as t };