const require_context = require('./context-CQfDPcdE.cjs');
const require_webpack_like = require('./webpack-like-DDVwPJ4e.cjs');
const require_context$1 = require('./context-CrbHoDid.cjs');
const require_utils = require('./utils-CJMEEaD7.cjs');
const require_context$2 = require('./context-D7WFmOmt.cjs');
let node_fs = require("node:fs");
node_fs = require_context.__toESM(node_fs);
let node_path = require("node:path");
node_path = require_context.__toESM(node_path);
let node_buffer = require("node:buffer");
node_buffer = require_context.__toESM(node_buffer);
let __jridgewell_remapping = require("@jridgewell/remapping");
__jridgewell_remapping = require_context.__toESM(__jridgewell_remapping);
let node_querystring = require("node:querystring");
node_querystring = require_context.__toESM(node_querystring);
let node_process = require("node:process");
node_process = require_context.__toESM(node_process);
let webpack_virtual_modules = require("webpack-virtual-modules");
webpack_virtual_modules = require_context.__toESM(webpack_virtual_modules);

//#region src/esbuild/utils.ts
const ExtToLoader = {
	".js": "js",
	".mjs": "js",
	".cjs": "js",
	".jsx": "jsx",
	".ts": "ts",
	".cts": "ts",
	".mts": "ts",
	".tsx": "tsx",
	".css": "css",
	".less": "css",
	".stylus": "css",
	".scss": "css",
	".sass": "css",
	".json": "json",
	".txt": "text"
};
function guessLoader(code, id) {
	return ExtToLoader[node_path.default.extname(id).toLowerCase()] || "js";
}
function unwrapLoader(loader, code, id) {
	if (typeof loader === "function") return loader(code, id);
	return loader;
}
function fixSourceMap(map) {
	if (!Object.prototype.hasOwnProperty.call(map, "toString")) Object.defineProperty(map, "toString", {
		enumerable: false,
		value: function toString() {
			return JSON.stringify(this);
		}
	});
	if (!Object.prototype.hasOwnProperty.call(map, "toUrl")) Object.defineProperty(map, "toUrl", {
		enumerable: false,
		value: function toUrl() {
			return `data:application/json;charset=utf-8;base64,${node_buffer.Buffer.from(this.toString()).toString("base64")}`;
		}
	});
	return map;
}
const nullSourceMap = {
	names: [],
	sources: [],
	mappings: "",
	version: 3
};
function combineSourcemaps(filename, sourcemapList) {
	sourcemapList = sourcemapList.filter((m) => m.sources);
	if (sourcemapList.length === 0 || sourcemapList.every((m) => m.sources.length === 0)) return { ...nullSourceMap };
	let map;
	let mapIndex = 1;
	if (sourcemapList.slice(0, -1).find((m) => m.sources.length !== 1) === void 0) map = (0, __jridgewell_remapping.default)(sourcemapList, () => null, true);
	else map = (0, __jridgewell_remapping.default)(sourcemapList[0], (sourcefile) => {
		if (sourcefile === filename && sourcemapList[mapIndex]) return sourcemapList[mapIndex++];
		else return { ...nullSourceMap };
	}, true);
	if (!map.file) delete map.file;
	return map;
}
function createBuildContext$2(build) {
	const watchFiles = [];
	const { initialOptions } = build;
	return {
		parse: require_context.parse,
		addWatchFile() {
			throw new Error("unplugin/esbuild: addWatchFile outside supported hooks (resolveId, load, transform)");
		},
		emitFile(emittedFile) {
			const outFileName = emittedFile.fileName || emittedFile.name;
			if (initialOptions.outdir && emittedFile.source && outFileName) {
				const outPath = node_path.default.resolve(initialOptions.outdir, outFileName);
				const outDir = node_path.default.dirname(outPath);
				if (!node_fs.default.existsSync(outDir)) node_fs.default.mkdirSync(outDir, { recursive: true });
				node_fs.default.writeFileSync(outPath, emittedFile.source);
			}
		},
		getWatchFiles() {
			return watchFiles;
		},
		getNativeBuildContext() {
			return {
				framework: "esbuild",
				build
			};
		}
	};
}
function createPluginContext(context) {
	const errors = [];
	const warnings = [];
	const pluginContext = {
		error(message) {
			errors.push(normalizeMessage$2(message));
		},
		warn(message) {
			warnings.push(normalizeMessage$2(message));
		}
	};
	return {
		errors,
		warnings,
		mixedContext: {
			...context,
			...pluginContext,
			addWatchFile(id) {
				context.getWatchFiles().push(id);
			}
		}
	};
}
function normalizeMessage$2(message) {
	if (typeof message === "string") message = { message };
	return {
		id: message.id,
		pluginName: message.plugin,
		text: message.message,
		location: message.loc ? {
			file: message.loc.file,
			line: message.loc.line,
			column: message.loc.column
		} : null,
		detail: message.meta,
		notes: []
	};
}
function processCodeWithSourceMap(map, code) {
	if (map) {
		if (!map.sourcesContent || map.sourcesContent.length === 0) map.sourcesContent = [code];
		map = fixSourceMap(map);
		code += `\n//# sourceMappingURL=${map.toUrl()}`;
	}
	return code;
}

//#endregion
//#region src/esbuild/index.ts
function getEsbuildPlugin(factory) {
	return (userOptions) => {
		const meta = { framework: "esbuild" };
		const plugins = require_context.toArray(factory(userOptions, meta));
		const setupPlugins = async (build) => {
			const setup = buildSetup();
			const loaders = [];
			for (const plugin of plugins) {
				const loader = {};
				await setup(plugin)({
					...build,
					onLoad(_options, callback) {
						loader.options = _options;
						loader.onLoadCb = callback;
					},
					onTransform(_options, callback) {
						loader.options ||= _options;
						loader.onTransformCb = callback;
					}
				}, build);
				if (loader.onLoadCb || loader.onTransformCb) loaders.push(loader);
			}
			if (loaders.length) build.onLoad(loaders.length === 1 ? loaders[0].options : { filter: /.*/ }, async (args) => {
				function checkFilter(options) {
					return loaders.length === 1 || !options?.filter || options.filter.test(args.path);
				}
				let result;
				for (const { options, onLoadCb } of loaders) {
					if (!checkFilter(options)) continue;
					if (onLoadCb) result = await onLoadCb(args);
					if (result?.contents) break;
				}
				let fsContentsCache;
				for (const { options, onTransformCb } of loaders) {
					if (!checkFilter(options)) continue;
					if (onTransformCb) {
						const _result = await onTransformCb({
							...result,
							...args,
							async getContents() {
								if (result?.contents) return result.contents;
								if (fsContentsCache) return fsContentsCache;
								return fsContentsCache = await node_fs.default.promises.readFile(args.path, "utf8");
							}
						});
						if (_result?.contents) result = _result;
					}
				}
				if (result?.contents) return result;
			});
		};
		return {
			name: (plugins.length === 1 ? plugins[0].name : meta.esbuildHostName) ?? `unplugin-host:${plugins.map((p) => p.name).join(":")}`,
			setup: setupPlugins
		};
	};
}
function buildSetup() {
	return (plugin) => {
		return (build, rawBuild) => {
			const context = createBuildContext$2(rawBuild);
			const { onStart, onEnd, onResolve, onLoad, onTransform, initialOptions } = build;
			const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/;
			const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/;
			const loader = plugin.esbuild?.loader ?? guessLoader;
			plugin.esbuild?.config?.call(context, initialOptions);
			if (plugin.buildStart) onStart(() => plugin.buildStart.call(context));
			if (plugin.buildEnd || plugin.writeBundle) onEnd(async () => {
				if (plugin.buildEnd) await plugin.buildEnd.call(context);
				if (plugin.writeBundle) await plugin.writeBundle();
			});
			if (plugin.resolveId) onResolve({ filter: onResolveFilter }, async (args) => {
				const id = args.path;
				if (initialOptions.external?.includes(id)) return;
				const { handler, filter } = require_context.normalizeObjectHook("resolveId", plugin.resolveId);
				if (!filter(id)) return;
				const { errors, warnings, mixedContext } = createPluginContext(context);
				const isEntry = args.kind === "entry-point";
				const result = await handler.call(mixedContext, id, isEntry ? void 0 : args.importer, { isEntry });
				if (typeof result === "string") return {
					path: result,
					namespace: plugin.name,
					errors,
					warnings,
					watchFiles: mixedContext.getWatchFiles()
				};
				else if (typeof result === "object" && result !== null) return {
					path: result.id,
					external: result.external,
					namespace: plugin.name,
					errors,
					warnings,
					watchFiles: mixedContext.getWatchFiles()
				};
			});
			if (plugin.load) onLoad({ filter: onLoadFilter }, async (args) => {
				const { handler, filter } = require_context.normalizeObjectHook("load", plugin.load);
				const id = args.path + (args.suffix || "");
				if (plugin.loadInclude && !plugin.loadInclude(id)) return;
				if (!filter(id)) return;
				const { errors, warnings, mixedContext } = createPluginContext(context);
				let code;
				let map;
				const result = await handler.call(mixedContext, id);
				if (typeof result === "string") code = result;
				else if (typeof result === "object" && result !== null) {
					code = result.code;
					map = result.map;
				}
				if (code === void 0) return null;
				if (map) code = processCodeWithSourceMap(map, code);
				const resolveDir = node_path.default.dirname(args.path);
				return {
					contents: code,
					errors,
					warnings,
					watchFiles: mixedContext.getWatchFiles(),
					loader: unwrapLoader(loader, code, args.path),
					resolveDir
				};
			});
			if (plugin.transform) onTransform({ filter: onLoadFilter }, async (args) => {
				const { handler, filter } = require_context.normalizeObjectHook("transform", plugin.transform);
				const id = args.path + (args.suffix || "");
				if (plugin.transformInclude && !plugin.transformInclude(id)) return;
				let code = await args.getContents();
				if (!filter(id, code)) return;
				const { mixedContext, errors, warnings } = createPluginContext(context);
				const resolveDir = node_path.default.dirname(args.path);
				let map;
				const result = await handler.call(mixedContext, code, id);
				if (typeof result === "string") code = result;
				else if (typeof result === "object" && result !== null) {
					code = result.code;
					if (map && result.map) map = combineSourcemaps(args.path, [result.map === "string" ? JSON.parse(result.map) : result.map, map]);
					else if (typeof result.map === "string") map = JSON.parse(result.map);
					else map = result.map;
				}
				if (code) {
					if (map) code = processCodeWithSourceMap(map, code);
					return {
						contents: code,
						errors,
						warnings,
						watchFiles: mixedContext.getWatchFiles(),
						loader: unwrapLoader(loader, code, args.path),
						resolveDir
					};
				}
			});
			if (plugin.esbuild?.setup) return plugin.esbuild.setup(rawBuild);
		};
	};
}

//#endregion
//#region src/farm/context.ts
function createFarmContext(context, currentResolveId) {
	return {
		parse: require_context.parse,
		addWatchFile(id) {
			context.addWatchFile(id, currentResolveId || id);
		},
		emitFile(emittedFile) {
			const outFileName = emittedFile.fileName || emittedFile.name;
			if (emittedFile.source && outFileName) context.emitFile({
				resolvedPath: outFileName,
				name: outFileName,
				content: [...node_buffer.Buffer.from(emittedFile.source)],
				resourceType: (0, node_path.extname)(outFileName)
			});
		},
		getWatchFiles() {
			return context.getWatchFiles();
		},
		getNativeBuildContext() {
			return {
				framework: "farm",
				context
			};
		}
	};
}
function unpluginContext(context) {
	return {
		error: (error) => context.error(typeof error === "string" ? new Error(error) : error),
		warn: (error) => context.warn(typeof error === "string" ? new Error(error) : error)
	};
}

//#endregion
//#region src/farm/utils.ts
function convertEnforceToPriority(value) {
	const defaultPriority = 100;
	const enforceToPriority = {
		pre: 102,
		post: 98
	};
	return enforceToPriority[value] !== void 0 ? enforceToPriority[value] : defaultPriority;
}
function convertWatchEventChange(value) {
	return {
		Added: "create",
		Updated: "update",
		Removed: "delete"
	}[value];
}
function isString(variable) {
	return typeof variable === "string";
}
function isObject(variable) {
	return typeof variable === "object" && variable !== null;
}
function customParseQueryString(url) {
	if (!url) return [];
	const queryString = url.split("?")[1];
	const parsedParams = node_querystring.parse(queryString);
	const paramsArray = [];
	for (const key in parsedParams) paramsArray.push([key, parsedParams[key]]);
	return paramsArray;
}
function encodeStr(str) {
	const len = str.length;
	if (len === 0) return str;
	const firstNullIndex = str.indexOf("\0");
	if (firstNullIndex === -1) return str;
	const result = Array.from({ length: len + countNulls(str, firstNullIndex) });
	let pos = 0;
	for (let i = 0; i < firstNullIndex; i++) result[pos++] = str[i];
	for (let i = firstNullIndex; i < len; i++) {
		const char = str[i];
		if (char === "\0") {
			result[pos++] = "\\";
			result[pos++] = "0";
		} else result[pos++] = char;
	}
	return node_path.default.posix.normalize(result.join(""));
}
function decodeStr(str) {
	const len = str.length;
	if (len === 0) return str;
	const firstIndex = str.indexOf("\\0");
	if (firstIndex === -1) return str;
	const result = Array.from({ length: len - countBackslashZeros(str, firstIndex) });
	let pos = 0;
	for (let i$1 = 0; i$1 < firstIndex; i$1++) result[pos++] = str[i$1];
	let i = firstIndex;
	while (i < len) if (str[i] === "\\" && str[i + 1] === "0") {
		result[pos++] = "\0";
		i += 2;
	} else result[pos++] = str[i++];
	return node_path.default.posix.normalize(result.join(""));
}
function getContentValue(content) {
	if (content === null || content === void 0) throw new Error("Content cannot be null or undefined");
	return encodeStr(typeof content === "string" ? content : content.code || "");
}
function countNulls(str, startIndex) {
	let count = 0;
	const len = str.length;
	for (let i = startIndex; i < len; i++) if (str[i] === "\0") count++;
	return count;
}
function countBackslashZeros(str, startIndex) {
	let count = 0;
	const len = str.length;
	for (let i = startIndex; i < len - 1; i++) if (str[i] === "\\" && str[i + 1] === "0") {
		count++;
		i++;
	}
	return count;
}
function removeQuery(pathe) {
	const queryIndex = pathe.indexOf("?");
	if (queryIndex !== -1) return node_path.default.posix.normalize(pathe.slice(0, queryIndex));
	return node_path.default.posix.normalize(pathe);
}
function isStartsWithSlash(str) {
	return str?.startsWith("/");
}
function appendQuery(id, query) {
	if (!query.length) return id;
	return `${id}?${stringifyQuery(query)}`;
}
function stringifyQuery(query) {
	if (!query.length) return "";
	let queryStr = "";
	for (const [key, value] of query) queryStr += `${key}${value ? `=${value}` : ""}&`;
	return `${queryStr.slice(0, -1)}`;
}
const CSS_LANGS_RES = [
	[/\.(less)(?:$|\?)/, "less"],
	[/\.(scss|sass)(?:$|\?)/, "sass"],
	[/\.(styl|stylus)(?:$|\?)/, "stylus"],
	[/\.(css)(?:$|\?)/, "css"]
];
const JS_LANGS_RES = [
	[/\.(js|mjs|cjs)(?:$|\?)/, "js"],
	[/\.(jsx)(?:$|\?)/, "jsx"],
	[/\.(ts|cts|mts)(?:$|\?)/, "ts"],
	[/\.(tsx)(?:$|\?)/, "tsx"]
];
function getCssModuleType(id) {
	for (const [reg, lang] of CSS_LANGS_RES) if (reg.test(id)) return lang;
	return null;
}
function getJsModuleType(id) {
	for (const [reg, lang] of JS_LANGS_RES) if (reg.test(id)) return lang;
	return null;
}
function formatLoadModuleType(id) {
	const cssModuleType = getCssModuleType(id);
	if (cssModuleType) return cssModuleType;
	const jsModuleType = getJsModuleType(id);
	if (jsModuleType) return jsModuleType;
	return "js";
}
function formatTransformModuleType(id) {
	return formatLoadModuleType(id);
}

//#endregion
//#region src/farm/index.ts
function getFarmPlugin(factory) {
	return ((userOptions) => {
		const plugins = require_context.toArray(factory(userOptions, { framework: "farm" })).map((rawPlugin) => {
			const plugin = toFarmPlugin(rawPlugin, userOptions);
			if (rawPlugin.farm) Object.assign(plugin, rawPlugin.farm);
			return plugin;
		});
		return plugins.length === 1 ? plugins[0] : plugins;
	});
}
function toFarmPlugin(plugin, options) {
	const farmPlugin = {
		name: plugin.name,
		priority: convertEnforceToPriority(plugin.enforce)
	};
	if (plugin.farm) Object.keys(plugin.farm).forEach((key) => {
		const value = plugin.farm[key];
		if (value) Reflect.set(farmPlugin, key, value);
	});
	if (plugin.buildStart) {
		const _buildStart = plugin.buildStart;
		farmPlugin.buildStart = { async executor(_, context) {
			await _buildStart.call(createFarmContext(context));
		} };
	}
	if (plugin.resolveId) {
		const _resolveId = plugin.resolveId;
		let filters = [];
		if (options) filters = options?.filters ?? [];
		farmPlugin.resolve = {
			filters: {
				sources: filters.length ? filters : [".*"],
				importers: [".*"]
			},
			async executor(params, context) {
				const resolvedIdPath = node_path.default.resolve(params.importer ?? "");
				const id = decodeStr(params.source);
				const { handler, filter } = require_context.normalizeObjectHook("resolveId", _resolveId);
				if (!filter(id)) return null;
				let isEntry = false;
				if (isObject(params.kind) && "entry" in params.kind) isEntry = params.kind.entry === "index";
				const farmContext = createFarmContext(context, resolvedIdPath);
				const resolveIdResult = await handler.call(Object.assign(unpluginContext(context), farmContext), id, resolvedIdPath ?? null, { isEntry });
				if (isString(resolveIdResult)) return {
					resolvedPath: removeQuery(encodeStr(resolveIdResult)),
					query: customParseQueryString(resolveIdResult),
					sideEffects: true,
					external: false,
					meta: {}
				};
				if (isObject(resolveIdResult)) return {
					resolvedPath: removeQuery(encodeStr(resolveIdResult?.id)),
					query: customParseQueryString(resolveIdResult?.id),
					sideEffects: false,
					external: Boolean(resolveIdResult?.external),
					meta: {}
				};
				if (!isStartsWithSlash(params.source)) return null;
			}
		};
	}
	if (plugin.load) {
		const _load = plugin.load;
		farmPlugin.load = {
			filters: { resolvedPaths: [".*"] },
			async executor(params, context) {
				const id = appendQuery(decodeStr(params.resolvedPath), params.query);
				const loader = formatTransformModuleType(id);
				if (plugin.loadInclude && !plugin.loadInclude?.(id)) return null;
				const { handler, filter } = require_context.normalizeObjectHook("load", _load);
				if (!filter(id)) return null;
				const farmContext = createFarmContext(context, id);
				return {
					content: getContentValue(await handler.call(Object.assign(unpluginContext(context), farmContext), id)),
					moduleType: loader
				};
			}
		};
	}
	if (plugin.transform) {
		const _transform = plugin.transform;
		farmPlugin.transform = {
			filters: {
				resolvedPaths: [".*"],
				moduleTypes: [".*"]
			},
			async executor(params, context) {
				const id = appendQuery(decodeStr(params.resolvedPath), params.query);
				const loader = formatTransformModuleType(id);
				if (plugin.transformInclude && !plugin.transformInclude(id)) return null;
				const { handler, filter } = require_context.normalizeObjectHook("transform", _transform);
				if (!filter(id, params.content)) return null;
				const farmContext = createFarmContext(context, id);
				const resource = await handler.call(Object.assign(unpluginContext(context), farmContext), params.content, id);
				if (resource && typeof resource !== "string") return {
					content: getContentValue(resource),
					moduleType: loader,
					sourceMap: typeof resource.map === "object" && resource.map !== null ? JSON.stringify(resource.map) : void 0
				};
			}
		};
	}
	if (plugin.watchChange) {
		const _watchChange = plugin.watchChange;
		farmPlugin.updateModules = { async executor(param, context) {
			const updatePathContent = param.paths[0];
			const ModifiedPath = updatePathContent[0];
			const eventChange = convertWatchEventChange(updatePathContent[1]);
			await _watchChange.call(createFarmContext(context), ModifiedPath, { event: eventChange });
		} };
	}
	if (plugin.buildEnd) {
		const _buildEnd = plugin.buildEnd;
		farmPlugin.buildEnd = { async executor(_, context) {
			await _buildEnd.call(createFarmContext(context));
		} };
	}
	if (plugin.writeBundle) {
		const _writeBundle = plugin.writeBundle;
		farmPlugin.finish = { async executor() {
			await _writeBundle();
		} };
	}
	return farmPlugin;
}

//#endregion
//#region src/rollup/index.ts
function getRollupPlugin(factory) {
	return ((userOptions) => {
		const plugins = require_context.toArray(factory(userOptions, { framework: "rollup" })).map((plugin) => toRollupPlugin(plugin, "rollup"));
		return plugins.length === 1 ? plugins[0] : plugins;
	});
}
function toRollupPlugin(plugin, key) {
	const nativeFilter = key === "rolldown";
	if (plugin.resolveId && !nativeFilter && typeof plugin.resolveId === "object" && plugin.resolveId.filter) {
		const resolveIdHook = plugin.resolveId;
		const { handler, filter } = require_context.normalizeObjectHook("load", resolveIdHook);
		replaceHookHandler("resolveId", resolveIdHook, function(...args) {
			const [id] = args;
			if (!supportNativeFilter(this, key) && !filter(id)) return;
			return handler.apply(this, args);
		});
	}
	if (plugin.load && (plugin.loadInclude || !nativeFilter && typeof plugin.load === "object" && plugin.load.filter)) {
		const loadHook = plugin.load;
		const { handler, filter } = require_context.normalizeObjectHook("load", loadHook);
		replaceHookHandler("load", loadHook, function(...args) {
			const [id] = args;
			if (plugin.loadInclude && !plugin.loadInclude(id)) return;
			if (!supportNativeFilter(this, key) && !filter(id)) return;
			return handler.apply(this, args);
		});
	}
	if (plugin.transform && (plugin.transformInclude || !nativeFilter && typeof plugin.transform === "object" && plugin.transform.filter)) {
		const transformHook = plugin.transform;
		const { handler, filter } = require_context.normalizeObjectHook("transform", transformHook);
		replaceHookHandler("transform", transformHook, function(...args) {
			const [code, id] = args;
			if (plugin.transformInclude && !plugin.transformInclude(id)) return;
			if (!supportNativeFilter(this, key) && !filter(id, code)) return;
			return handler.apply(this, args);
		});
	}
	if (plugin[key]) Object.assign(plugin, plugin[key]);
	return plugin;
	function replaceHookHandler(name, hook, handler) {
		if (typeof hook === "function") plugin[name] = handler;
		else hook.handler = handler;
	}
}
function supportNativeFilter(context, framework) {
	if (framework === "unloader") return false;
	if (framework === "vite") return !!context?.meta?.viteVersion;
	if (framework === "rolldown") return true;
	const rollupVersion = context?.meta?.rollupVersion;
	if (!rollupVersion) return false;
	const [major, minor] = rollupVersion.split(".");
	return Number(major) > 4 || Number(major) === 4 && Number(minor) >= 40;
}

//#endregion
//#region src/rolldown/index.ts
function getRolldownPlugin(factory) {
	return ((userOptions) => {
		const plugins = require_context.toArray(factory(userOptions, { framework: "rolldown" })).map((rawPlugin) => {
			return toRollupPlugin(rawPlugin, "rolldown");
		});
		return plugins.length === 1 ? plugins[0] : plugins;
	});
}

//#endregion
//#region src/rspack/index.ts
const TRANSFORM_LOADER$1 = (0, node_path.resolve)(__dirname, "rspack/loaders/transform");
const LOAD_LOADER$1 = (0, node_path.resolve)(__dirname, "rspack/loaders/load");
function getRspackPlugin(factory) {
	return (userOptions) => {
		return { apply(compiler) {
			const VIRTUAL_MODULE_PREFIX = (0, node_path.resolve)(compiler.options.context ?? process.cwd(), "node_modules/.virtual", compiler.rspack.experiments.VirtualModulesPlugin ? "" : process.pid.toString());
			const meta = {
				framework: "rspack",
				rspack: { compiler }
			};
			const rawPlugins = require_context.toArray(factory(userOptions, meta));
			for (const rawPlugin of rawPlugins) {
				const plugin = Object.assign(rawPlugin, {
					__unpluginMeta: meta,
					__virtualModulePrefix: VIRTUAL_MODULE_PREFIX
				});
				const externalModules = /* @__PURE__ */ new Set();
				if (plugin.resolveId) {
					const createPlugin = (plugin$1) => {
						if (compiler.rspack.experiments.VirtualModulesPlugin) return new compiler.rspack.experiments.VirtualModulesPlugin();
						return new require_utils.FakeVirtualModulesPlugin(plugin$1);
					};
					const vfs = createPlugin(plugin);
					vfs.apply(compiler);
					const vfsModules = /* @__PURE__ */ new Map();
					plugin.__vfsModules = vfsModules;
					plugin.__vfs = vfs;
					compiler.hooks.compilation.tap(plugin.name, (compilation, { normalModuleFactory }) => {
						normalModuleFactory.hooks.resolve.tapPromise(plugin.name, async (resolveData) => {
							const id = require_webpack_like.normalizeAbsolutePath(resolveData.request);
							const requestContext = resolveData.contextInfo;
							let importer = requestContext.issuer !== "" ? requestContext.issuer : void 0;
							const isEntry = requestContext.issuer === "";
							if (importer?.startsWith(plugin.__virtualModulePrefix)) importer = decodeURIComponent(importer.slice(plugin.__virtualModulePrefix.length));
							const context = require_context$1.createBuildContext(compiler, compilation);
							let error;
							const pluginContext = {
								error(msg) {
									if (error == null) error = require_context$1.normalizeMessage(msg);
									else console.error(`unplugin/rspack: multiple errors returned from resolveId hook: ${msg}`);
								},
								warn(msg) {
									console.warn(`unplugin/rspack: warning from resolveId hook: ${msg}`);
								}
							};
							const { handler, filter } = require_context.normalizeObjectHook("resolveId", plugin.resolveId);
							if (!filter(id)) return;
							const resolveIdResult = await handler.call({
								...context,
								...pluginContext
							}, id, importer, { isEntry });
							if (error != null) throw error;
							if (resolveIdResult == null) return;
							let resolved = typeof resolveIdResult === "string" ? resolveIdResult : resolveIdResult.id;
							if (typeof resolveIdResult === "string" ? false : resolveIdResult.external === true) externalModules.add(resolved);
							let isVirtual = true;
							try {
								(compiler.inputFileSystem?.statSync ?? node_fs.default.statSync)(resolved);
								isVirtual = false;
							} catch {
								isVirtual = !require_utils.isVirtualModuleId(resolved, plugin);
							}
							if (isVirtual) {
								const encodedVirtualPath = require_utils.encodeVirtualModuleId(resolved, plugin);
								if (!vfsModules.has(resolved)) {
									const fsPromise = Promise.resolve(vfs.writeModule(encodedVirtualPath, ""));
									vfsModules.set(resolved, fsPromise);
									await fsPromise;
								} else await vfsModules.get(resolved);
								resolved = encodedVirtualPath;
							}
							resolveData.request = resolved;
						});
					});
				}
				if (plugin.load) compiler.options.module.rules.unshift({
					enforce: plugin.enforce,
					include(id) {
						if (require_utils.isVirtualModuleId(id, plugin)) id = require_utils.decodeVirtualModuleId(id, plugin);
						if (plugin.loadInclude && !plugin.loadInclude(id)) return false;
						const { filter } = require_context.normalizeObjectHook("load", plugin.load);
						if (!filter(id)) return false;
						return !externalModules.has(id);
					},
					use: [{
						loader: LOAD_LOADER$1,
						options: { plugin }
					}],
					type: "javascript/auto"
				});
				if (plugin.transform) compiler.options.module.rules.unshift({
					enforce: plugin.enforce,
					use(data) {
						return require_webpack_like.transformUse(data, plugin, TRANSFORM_LOADER$1);
					}
				});
				if (plugin.rspack) plugin.rspack(compiler);
				if (plugin.watchChange || plugin.buildStart) compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
					const context = require_context$1.createBuildContext(compiler, compilation);
					if (plugin.watchChange && (compiler.modifiedFiles || compiler.removedFiles)) {
						const promises = [];
						if (compiler.modifiedFiles) compiler.modifiedFiles.forEach((file) => promises.push(Promise.resolve(plugin.watchChange.call(context, file, { event: "update" }))));
						if (compiler.removedFiles) compiler.removedFiles.forEach((file) => promises.push(Promise.resolve(plugin.watchChange.call(context, file, { event: "delete" }))));
						await Promise.all(promises);
					}
					if (plugin.buildStart) return await plugin.buildStart.call(context);
				});
				if (plugin.buildEnd) compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
					await plugin.buildEnd.call(require_context$1.createBuildContext(compiler, compilation));
				});
				if (plugin.writeBundle) compiler.hooks.afterEmit.tapPromise(plugin.name, async () => {
					await plugin.writeBundle();
				});
			}
		} };
	};
}

//#endregion
//#region src/unloader/index.ts
function getUnloaderPlugin(factory) {
	return ((userOptions) => {
		const plugins = require_context.toArray(factory(userOptions, { framework: "unloader" })).map((rawPlugin) => {
			return toRollupPlugin(rawPlugin, "unloader");
		});
		return plugins.length === 1 ? plugins[0] : plugins;
	});
}

//#endregion
//#region src/vite/index.ts
function getVitePlugin(factory) {
	return ((userOptions) => {
		const plugins = require_context.toArray(factory(userOptions, { framework: "vite" })).map((rawPlugin) => {
			return toRollupPlugin(rawPlugin, "vite");
		});
		return plugins.length === 1 ? plugins[0] : plugins;
	});
}

//#endregion
//#region src/webpack/index.ts
const TRANSFORM_LOADER = (0, node_path.resolve)(__dirname, "webpack/loaders/transform");
const LOAD_LOADER = (0, node_path.resolve)(__dirname, "webpack/loaders/load");
function getWebpackPlugin(factory) {
	return (userOptions) => {
		return { apply(compiler) {
			const VIRTUAL_MODULE_PREFIX = (0, node_path.resolve)(compiler.options.context ?? node_process.default.cwd(), "_virtual_");
			const meta = {
				framework: "webpack",
				webpack: { compiler }
			};
			const rawPlugins = require_context.toArray(factory(userOptions, meta));
			for (const rawPlugin of rawPlugins) {
				const plugin = Object.assign(rawPlugin, {
					__unpluginMeta: meta,
					__virtualModulePrefix: VIRTUAL_MODULE_PREFIX
				});
				const externalModules = /* @__PURE__ */ new Set();
				if (plugin.resolveId) {
					let vfs = compiler.options.plugins.find((i) => i instanceof webpack_virtual_modules.default);
					if (!vfs) {
						vfs = new webpack_virtual_modules.default();
						compiler.options.plugins.push(vfs);
					}
					const vfsModules = /* @__PURE__ */ new Set();
					plugin.__vfsModules = vfsModules;
					plugin.__vfs = vfs;
					const resolverPlugin = { apply(resolver) {
						const target = resolver.ensureHook("resolve");
						resolver.getHook("resolve").tapAsync(plugin.name, async (request, resolveContext, callback) => {
							if (!request.request) return callback();
							if (require_webpack_like.normalizeAbsolutePath(request.request).startsWith(plugin.__virtualModulePrefix)) return callback();
							const id = require_webpack_like.normalizeAbsolutePath(request.request);
							const requestContext = request.context;
							let importer = requestContext.issuer !== "" ? requestContext.issuer : void 0;
							const isEntry = requestContext.issuer === "";
							if (importer?.startsWith(plugin.__virtualModulePrefix)) importer = decodeURIComponent(importer.slice(plugin.__virtualModulePrefix.length));
							const fileDependencies = /* @__PURE__ */ new Set();
							const context = require_context$2.createBuildContext({
								addWatchFile(file) {
									fileDependencies.add(file);
									resolveContext.fileDependencies?.add(file);
								},
								getWatchFiles() {
									return Array.from(fileDependencies);
								}
							}, compiler);
							let error;
							const pluginContext = {
								error(msg) {
									if (error == null) error = require_context$2.normalizeMessage(msg);
									else console.error(`unplugin/webpack: multiple errors returned from resolveId hook: ${msg}`);
								},
								warn(msg) {
									console.warn(`unplugin/webpack: warning from resolveId hook: ${msg}`);
								}
							};
							const { handler, filter } = require_context.normalizeObjectHook("resolveId", plugin.resolveId);
							if (!filter(id)) return callback();
							const resolveIdResult = await handler.call({
								...context,
								...pluginContext
							}, id, importer, { isEntry });
							if (error != null) return callback(error);
							if (resolveIdResult == null) return callback();
							let resolved = typeof resolveIdResult === "string" ? resolveIdResult : resolveIdResult.id;
							if (typeof resolveIdResult === "string" ? false : resolveIdResult.external === true) externalModules.add(resolved);
							if (!node_fs.default.existsSync(resolved)) {
								resolved = require_webpack_like.normalizeAbsolutePath(plugin.__virtualModulePrefix + encodeURIComponent(resolved));
								if (!vfsModules.has(resolved)) {
									plugin.__vfs.writeModule(resolved, "");
									vfsModules.add(resolved);
								}
							}
							const newRequest = {
								...request,
								request: resolved
							};
							resolver.doResolve(target, newRequest, null, resolveContext, callback);
						});
					} };
					compiler.options.resolve.plugins = compiler.options.resolve.plugins || [];
					compiler.options.resolve.plugins.push(resolverPlugin);
				}
				if (plugin.load) compiler.options.module.rules.unshift({
					include(id) {
						return shouldLoad(id, plugin, externalModules);
					},
					enforce: plugin.enforce,
					use: [{
						loader: LOAD_LOADER,
						options: { plugin }
					}],
					type: "javascript/auto"
				});
				if (plugin.transform) compiler.options.module.rules.unshift({
					enforce: plugin.enforce,
					use(data) {
						return require_webpack_like.transformUse(data, plugin, TRANSFORM_LOADER);
					}
				});
				if (plugin.webpack) plugin.webpack(compiler);
				if (plugin.watchChange || plugin.buildStart) compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
					const context = require_context$2.createBuildContext(require_context$2.contextOptionsFromCompilation(compilation), compiler, compilation);
					if (plugin.watchChange && (compiler.modifiedFiles || compiler.removedFiles)) {
						const promises = [];
						if (compiler.modifiedFiles) compiler.modifiedFiles.forEach((file) => promises.push(Promise.resolve(plugin.watchChange.call(context, file, { event: "update" }))));
						if (compiler.removedFiles) compiler.removedFiles.forEach((file) => promises.push(Promise.resolve(plugin.watchChange.call(context, file, { event: "delete" }))));
						await Promise.all(promises);
					}
					if (plugin.buildStart) return await plugin.buildStart.call(context);
				});
				if (plugin.buildEnd) compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
					await plugin.buildEnd.call(require_context$2.createBuildContext(require_context$2.contextOptionsFromCompilation(compilation), compiler, compilation));
				});
				if (plugin.writeBundle) compiler.hooks.afterEmit.tapPromise(plugin.name, async () => {
					await plugin.writeBundle();
				});
			}
		} };
	};
}
function shouldLoad(id, plugin, externalModules) {
	if (id.startsWith(plugin.__virtualModulePrefix)) id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
	if (plugin.loadInclude && !plugin.loadInclude(id)) return false;
	const { filter } = require_context.normalizeObjectHook("load", plugin.load);
	if (!filter(id)) return false;
	return !externalModules.has(id);
}

//#endregion
//#region src/define.ts
function createUnplugin(factory) {
	return {
		get esbuild() {
			return getEsbuildPlugin(factory);
		},
		get rollup() {
			return getRollupPlugin(factory);
		},
		get vite() {
			return getVitePlugin(factory);
		},
		get rolldown() {
			return getRolldownPlugin(factory);
		},
		get webpack() {
			return getWebpackPlugin(factory);
		},
		get rspack() {
			return getRspackPlugin(factory);
		},
		get farm() {
			return getFarmPlugin(factory);
		},
		get unloader() {
			return getUnloaderPlugin(factory);
		},
		get raw() {
			return factory;
		}
	};
}
function createEsbuildPlugin(factory) {
	return getEsbuildPlugin(factory);
}
function createRollupPlugin(factory) {
	return getRollupPlugin(factory);
}
function createVitePlugin(factory) {
	return getVitePlugin(factory);
}
function createRolldownPlugin(factory) {
	return getRolldownPlugin(factory);
}
function createWebpackPlugin(factory) {
	return getWebpackPlugin(factory);
}
function createRspackPlugin(factory) {
	return getRspackPlugin(factory);
}
function createFarmPlugin(factory) {
	return getFarmPlugin(factory);
}
function createUnloaderPlugin(factory) {
	return getUnloaderPlugin(factory);
}

//#endregion
exports.createEsbuildPlugin = createEsbuildPlugin;
exports.createFarmPlugin = createFarmPlugin;
exports.createRolldownPlugin = createRolldownPlugin;
exports.createRollupPlugin = createRollupPlugin;
exports.createRspackPlugin = createRspackPlugin;
exports.createUnloaderPlugin = createUnloaderPlugin;
exports.createUnplugin = createUnplugin;
exports.createVitePlugin = createVitePlugin;
exports.createWebpackPlugin = createWebpackPlugin;