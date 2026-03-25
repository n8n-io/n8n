import fs from 'node:fs';
import { isBareImport } from '@vitest/utils/helpers';
import { i as isBuiltin, a as isBrowserExternal, t as toBuiltin } from './modules.BJuCwlRJ.js';
import { pathToFileURL } from 'node:url';
import { normalize as normalize$1, join as join$1 } from 'pathe';
import { distDir } from '../path.js';
import { serializeValue } from '@vitest/utils/serialize';
import { VitestModuleEvaluator, unwrapId } from '../module-evaluator.js';
import { resolve as resolve$1, isAbsolute as isAbsolute$1 } from 'node:path';
import vm from 'node:vm';
import { MockerRegistry, mockObject, RedirectedModule, AutomockedModule } from '@vitest/mocker';
import nodeModule from 'node:module';
import * as viteModuleRunner from 'vite/module-runner';
import { T as Traces } from './traces.U4xDYhzZ.js';

class VitestTransport {
	constructor(options) {
		this.options = options;
	}
	async invoke(event) {
		if (event.type !== "custom") return { error: /* @__PURE__ */ new Error(`Vitest Module Runner doesn't support Vite HMR events.`) };
		if (event.event !== "vite:invoke") return { error: /* @__PURE__ */ new Error(`Vitest Module Runner doesn't support ${event.event} event.`) };
		const { name, data } = event.data;
		if (name === "getBuiltins")
 // we return an empty array here to avoid client-side builtin check,
		// as we need builtins to go through `fetchModule`
		return { result: [] };
		if (name !== "fetchModule") return { error: /* @__PURE__ */ new Error(`Unknown method: ${name}. Expected "fetchModule".`) };
		try {
			return { result: await this.options.fetchModule(...data) };
		} catch (error) {
			return { error };
		}
	}
}

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
	if (!input) return input;
	return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const _EXTNAME_RE = /.(\.[^./]+|\.)$/;
const normalize = function(path) {
	if (path.length === 0) return ".";
	path = normalizeWindowsPath(path);
	const isUNCPath = path.match(_UNC_REGEX);
	const isPathAbsolute = isAbsolute(path);
	const trailingSeparator = path[path.length - 1] === "/";
	path = normalizeString(path, !isPathAbsolute);
	if (path.length === 0) {
		if (isPathAbsolute) return "/";
		return trailingSeparator ? "./" : ".";
	}
	if (trailingSeparator) path += "/";
	if (_DRIVE_LETTER_RE.test(path)) path += "/";
	if (isUNCPath) {
		if (!isPathAbsolute) return `//./${path}`;
		return `//${path}`;
	}
	return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};
const join = function(...segments) {
	let path = "";
	for (const seg of segments) {
		if (!seg) continue;
		if (path.length > 0) {
			const pathTrailing = path[path.length - 1] === "/";
			const segLeading = seg[0] === "/";
			if (pathTrailing && segLeading) path += seg.slice(1);
			else path += pathTrailing || segLeading ? seg : `/${seg}`;
		} else path += seg;
	}
	return normalize(path);
};
function cwd$1() {
	if (typeof process !== "undefined" && typeof process.cwd === "function") return process.cwd().replace(/\\/g, "/");
	return "/";
}
const resolve = function(...arguments_) {
	arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
	let resolvedPath = "";
	let resolvedAbsolute = false;
	for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
		const path = index >= 0 ? arguments_[index] : cwd$1();
		if (!path || path.length === 0) continue;
		resolvedPath = `${path}/${resolvedPath}`;
		resolvedAbsolute = isAbsolute(path);
	}
	resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
	if (resolvedAbsolute && !isAbsolute(resolvedPath)) return `/${resolvedPath}`;
	return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
	let res = "";
	let lastSegmentLength = 0;
	let lastSlash = -1;
	let dots = 0;
	let char = null;
	for (let index = 0; index <= path.length; ++index) {
		if (index < path.length) char = path[index];
		else if (char === "/") break;
		else char = "/";
		if (char === "/") {
			if (lastSlash === index - 1 || dots === 1);
			else if (dots === 2) {
				if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
					if (res.length > 2) {
						const lastSlashIndex = res.lastIndexOf("/");
						if (lastSlashIndex === -1) {
							res = "";
							lastSegmentLength = 0;
						} else {
							res = res.slice(0, lastSlashIndex);
							lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
						}
						lastSlash = index;
						dots = 0;
						continue;
					} else if (res.length > 0) {
						res = "";
						lastSegmentLength = 0;
						lastSlash = index;
						dots = 0;
						continue;
					}
				}
				if (allowAboveRoot) {
					res += res.length > 0 ? "/.." : "..";
					lastSegmentLength = 2;
				}
			} else {
				if (res.length > 0) res += `/${path.slice(lastSlash + 1, index)}`;
				else res = path.slice(lastSlash + 1, index);
				lastSegmentLength = index - lastSlash - 1;
			}
			lastSlash = index;
			dots = 0;
		} else if (char === "." && dots !== -1) ++dots;
		else dots = -1;
	}
	return res;
}
const isAbsolute = function(p) {
	return _IS_ABSOLUTE_RE.test(p);
};
const extname = function(p) {
	if (p === "..") return "";
	const match = _EXTNAME_RE.exec(normalizeWindowsPath(p));
	return match && match[1] || "";
};
const dirname = function(p) {
	const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
	if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) segments[0] += "/";
	return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};
const basename = function(p, extension) {
	const segments = normalizeWindowsPath(p).split("/");
	let lastSegment = "";
	for (let i = segments.length - 1; i >= 0; i--) {
		const val = segments[i];
		if (val) {
			lastSegment = val;
			break;
		}
	}
	return extension && lastSegment.endsWith(extension) ? lastSegment.slice(0, -extension.length) : lastSegment;
};

const { existsSync, readdirSync, statSync } = fs;
function findMockRedirect(root, mockPath, external) {
	const path = external || mockPath;
	// it's a node_module alias
	// all mocks should be inside <root>/__mocks__
	if (external || isNodeBuiltin(mockPath) || !existsSync(mockPath)) {
		const mockFolder = join(root, "__mocks__", dirname(path));
		if (!existsSync(mockFolder)) return null;
		const baseOriginal = basename(path);
		function findFile(mockFolder, baseOriginal) {
			const files = readdirSync(mockFolder);
			for (const file of files) if (basename(file, extname(file)) === baseOriginal) {
				const path = resolve(mockFolder, file);
				// if the same name, return the file
				if (statSync(path).isFile()) return path;
				else {
					// find folder/index.{js,ts}
					const indexFile = findFile(path, "index");
					if (indexFile) return indexFile;
				}
			}
			return null;
		}
		return findFile(mockFolder, baseOriginal);
	}
	const fullPath = resolve(dirname(path), "__mocks__", basename(path));
	return existsSync(fullPath) ? fullPath : null;
}
const builtins = new Set([
	...nodeModule.builtinModules,
	"assert/strict",
	"diagnostics_channel",
	"dns/promises",
	"fs/promises",
	"path/posix",
	"path/win32",
	"readline/promises",
	"stream/consumers",
	"stream/promises",
	"stream/web",
	"timers/promises",
	"util/types",
	"wasi"
]);
// https://nodejs.org/api/modules.html#built-in-modules-with-mandatory-node-prefix
const prefixedBuiltins$1 = new Set([
	"node:sea",
	"node:sqlite",
	"node:test",
	"node:test/reporters"
]);
const NODE_BUILTIN_NAMESPACE = "node:";
function isNodeBuiltin(id) {
	// Added in v18.6.0
	if (nodeModule.isBuiltin) return nodeModule.isBuiltin(id);
	if (prefixedBuiltins$1.has(id)) return true;
	return builtins.has(id.startsWith(NODE_BUILTIN_NAMESPACE) ? id.slice(5) : id);
}

const spyModulePath = resolve$1(distDir, "spy.js");
class VitestMocker {
	static pendingIds = [];
	spyModule;
	primitives;
	filterPublicKeys;
	registries = /* @__PURE__ */ new Map();
	mockContext = { callstack: null };
	_otel;
	constructor(moduleRunner, options) {
		this.moduleRunner = moduleRunner;
		this.options = options;
		const context = this.options.context;
		this._otel = options.traces;
		if (context) this.primitives = vm.runInContext("({ Object, Error, Function, RegExp, Symbol, Array, Map })", context);
		else this.primitives = {
			Object,
			Error,
			Function,
			RegExp,
			Symbol: globalThis.Symbol,
			Array,
			Map
		};
		if (options.spyModule) this.spyModule = options.spyModule;
		const Symbol = this.primitives.Symbol;
		this.filterPublicKeys = [
			"__esModule",
			Symbol.asyncIterator,
			Symbol.hasInstance,
			Symbol.isConcatSpreadable,
			Symbol.iterator,
			Symbol.match,
			Symbol.matchAll,
			Symbol.replace,
			Symbol.search,
			Symbol.split,
			Symbol.species,
			Symbol.toPrimitive,
			Symbol.toStringTag,
			Symbol.unscopables
		];
	}
	get root() {
		return this.options.root;
	}
	get evaluatedModules() {
		return this.moduleRunner.evaluatedModules;
	}
	get moduleDirectories() {
		return this.options.moduleDirectories || [];
	}
	async initializeSpyModule() {
		if (this.spyModule) return;
		this.spyModule = await this.moduleRunner.import(spyModulePath);
	}
	getMockerRegistry() {
		const suite = this.getSuiteFilepath();
		if (!this.registries.has(suite)) this.registries.set(suite, new MockerRegistry());
		return this.registries.get(suite);
	}
	reset() {
		this.registries.clear();
	}
	invalidateModuleById(id) {
		const mockId = this.getMockPath(id);
		const node = this.evaluatedModules.getModuleById(mockId);
		if (node) {
			this.evaluatedModules.invalidateModule(node);
			node.mockedExports = void 0;
		}
	}
	isModuleDirectory(path) {
		return this.moduleDirectories.some((dir) => path.includes(dir));
	}
	getSuiteFilepath() {
		return this.options.getCurrentTestFilepath() || "global";
	}
	createError(message, codeFrame) {
		const Error = this.primitives.Error;
		const error = new Error(message);
		Object.assign(error, { codeFrame });
		return error;
	}
	async resolveId(rawId, importer) {
		return this._otel.$("vitest.mocker.resolve_id", { attributes: {
			"vitest.module.raw_id": rawId,
			"vitest.module.importer": rawId
		} }, async (span) => {
			const result = await this.options.resolveId(rawId, importer);
			if (!result) {
				span.addEvent("could not resolve id, fallback to unresolved values");
				const id = normalizeModuleId(rawId);
				span.setAttributes({
					"vitest.module.id": id,
					"vitest.module.url": rawId,
					"vitest.module.external": id,
					"vitest.module.fallback": true
				});
				return {
					id,
					url: rawId,
					external: id
				};
			}
			// external is node_module or unresolved module
			// for example, some people mock "vscode" and don't have it installed
			const external = !isAbsolute$1(result.file) || this.isModuleDirectory(result.file) ? normalizeModuleId(rawId) : null;
			const id = normalizeModuleId(result.id);
			span.setAttributes({
				"vitest.module.id": id,
				"vitest.module.url": result.url,
				"vitest.module.external": external ?? false
			});
			return {
				...result,
				id,
				external
			};
		});
	}
	async resolveMocks() {
		if (!VitestMocker.pendingIds.length) return;
		await Promise.all(VitestMocker.pendingIds.map(async (mock) => {
			const { id, url, external } = await this.resolveId(mock.id, mock.importer);
			if (mock.action === "unmock") this.unmockPath(id);
			if (mock.action === "mock") this.mockPath(mock.id, id, url, external, mock.type, mock.factory);
		}));
		VitestMocker.pendingIds = [];
	}
	ensureModule(id, url) {
		const node = this.evaluatedModules.ensureModule(id, url);
		// TODO
		node.meta = {
			id,
			url,
			code: "",
			file: null,
			invalidate: false
		};
		return node;
	}
	async callFunctionMock(id, url, mock) {
		const node = this.ensureModule(id, url);
		if (node.exports) return node.exports;
		const exports$1 = await mock.resolve();
		const moduleExports = new Proxy(exports$1, { get: (target, prop) => {
			const val = target[prop];
			// 'then' can exist on non-Promise objects, need nested instanceof check for logic to work
			if (prop === "then") {
				if (target instanceof Promise) return target.then.bind(target);
			} else if (!(prop in target)) {
				if (this.filterPublicKeys.includes(prop)) return;
				throw this.createError(`[vitest] No "${String(prop)}" export is defined on the "${mock.raw}" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:
`, `vi.mock(import("${mock.raw}"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})`);
			}
			return val;
		} });
		node.exports = moduleExports;
		return moduleExports;
	}
	// public method to avoid circular dependency
	getMockContext() {
		return this.mockContext;
	}
	// path used to store mocked dependencies
	getMockPath(dep) {
		return `mock:${dep}`;
	}
	getDependencyMock(id) {
		return this.getMockerRegistry().getById(fixLeadingSlashes(id));
	}
	findMockRedirect(mockPath, external) {
		return findMockRedirect(this.root, mockPath, external);
	}
	mockObject(object, mockExports = {}, behavior = "automock") {
		const createMockInstance = this.spyModule?.createMockInstance;
		if (!createMockInstance) throw this.createError("[vitest] `spyModule` is not defined. This is a Vitest error. Please open a new issue with reproduction.");
		return mockObject({
			globalConstructors: this.primitives,
			createMockInstance,
			type: behavior
		}, object, mockExports);
	}
	unmockPath(id) {
		this.getMockerRegistry().deleteById(id);
		this.invalidateModuleById(id);
	}
	mockPath(originalId, id, url, external, mockType, factory) {
		const registry = this.getMockerRegistry();
		if (mockType === "manual") registry.register("manual", originalId, id, url, factory);
		else if (mockType === "autospy") registry.register("autospy", originalId, id, url);
		else {
			const redirect = this.findMockRedirect(id, external);
			if (redirect) registry.register("redirect", originalId, id, url, redirect);
			else registry.register("automock", originalId, id, url);
		}
		// every time the mock is registered, we remove the previous one from the cache
		this.invalidateModuleById(id);
	}
	async importActual(rawId, importer, callstack) {
		const { url } = await this.resolveId(rawId, importer);
		const node = await this.moduleRunner.fetchModule(url, importer);
		return await this.moduleRunner.cachedRequest(node.url, node, callstack || [importer], void 0, true);
	}
	async importMock(rawId, importer) {
		const { id, url, external } = await this.resolveId(rawId, importer);
		let mock = this.getDependencyMock(id);
		if (!mock) {
			const redirect = this.findMockRedirect(id, external);
			if (redirect) mock = new RedirectedModule(rawId, id, rawId, redirect);
			else mock = new AutomockedModule(rawId, id, rawId);
		}
		if (mock.type === "automock" || mock.type === "autospy") {
			const node = await this.moduleRunner.fetchModule(url, importer);
			const mod = await this.moduleRunner.cachedRequest(url, node, [importer], void 0, true);
			const Object = this.primitives.Object;
			return this.mockObject(mod, Object.create(Object.prototype), mock.type);
		}
		if (mock.type === "manual") return this.callFunctionMock(id, url, mock);
		const node = await this.moduleRunner.fetchModule(mock.redirect);
		return this.moduleRunner.cachedRequest(mock.redirect, node, [importer], void 0, true);
	}
	async requestWithMockedModule(url, evaluatedNode, callstack, mock) {
		return this._otel.$("vitest.mocker.evaluate", async (span) => {
			const mockId = this.getMockPath(evaluatedNode.id);
			span.setAttributes({
				"vitest.module.id": mockId,
				"vitest.mock.type": mock.type,
				"vitest.mock.id": mock.id,
				"vitest.mock.url": mock.url,
				"vitest.mock.raw": mock.raw
			});
			if (mock.type === "automock" || mock.type === "autospy") {
				const cache = this.evaluatedModules.getModuleById(mockId);
				if (cache && cache.mockedExports) return cache.mockedExports;
				const Object = this.primitives.Object;
				// we have to define a separate object that will copy all properties into itself
				// and can't just use the same `exports` define automatically by Vite before the evaluator
				const exports$1 = Object.create(null);
				Object.defineProperty(exports$1, Symbol.toStringTag, {
					value: "Module",
					configurable: true,
					writable: true
				});
				const node = this.ensureModule(mockId, this.getMockPath(evaluatedNode.url));
				node.meta = evaluatedNode.meta;
				node.file = evaluatedNode.file;
				node.mockedExports = exports$1;
				const mod = await this.moduleRunner.cachedRequest(url, node, callstack, void 0, true);
				this.mockObject(mod, exports$1, mock.type);
				return exports$1;
			}
			if (mock.type === "manual" && !callstack.includes(mockId) && !callstack.includes(url)) try {
				callstack.push(mockId);
				// this will not work if user does Promise.all(import(), import())
				// we can also use AsyncLocalStorage to store callstack, but this won't work in the browser
				// maybe we should improve mock API in the future?
				this.mockContext.callstack = callstack;
				return await this.callFunctionMock(mockId, this.getMockPath(url), mock);
			} finally {
				this.mockContext.callstack = null;
				const indexMock = callstack.indexOf(mockId);
				callstack.splice(indexMock, 1);
			}
			else if (mock.type === "redirect" && !callstack.includes(mock.redirect)) {
				span.setAttribute("vitest.mock.redirect", mock.redirect);
				return mock.redirect;
			}
		});
	}
	async mockedRequest(url, evaluatedNode, callstack) {
		const mock = this.getDependencyMock(evaluatedNode.id);
		if (!mock) return;
		return this.requestWithMockedModule(url, evaluatedNode, callstack, mock);
	}
	queueMock(id, importer, factoryOrOptions) {
		const mockType = getMockType(factoryOrOptions);
		VitestMocker.pendingIds.push({
			action: "mock",
			id,
			importer,
			factory: typeof factoryOrOptions === "function" ? factoryOrOptions : void 0,
			type: mockType
		});
	}
	queueUnmock(id, importer) {
		VitestMocker.pendingIds.push({
			action: "unmock",
			id,
			importer
		});
	}
}
function getMockType(factoryOrOptions) {
	if (!factoryOrOptions) return "automock";
	if (typeof factoryOrOptions === "function") return "manual";
	return factoryOrOptions.spy ? "autospy" : "automock";
}
// unique id that is not available as "$bare_import" like "test"
// https://nodejs.org/api/modules.html#built-in-modules-with-mandatory-node-prefix
const prefixedBuiltins = new Set([
	"node:sea",
	"node:sqlite",
	"node:test",
	"node:test/reporters"
]);
const isWindows$1 = process.platform === "win32";
// transform file url to id
// virtual:custom -> virtual:custom
// \0custom -> \0custom
// /root/id -> /id
// /root/id.js -> /id.js
// C:/root/id.js -> /id.js
// C:\root\id.js -> /id.js
// TODO: expose this in vite/module-runner
function normalizeModuleId(file) {
	if (prefixedBuiltins.has(file)) return file;
	// if it's not in the root, keep it as a path, not a URL
	return slash(file).replace(/^\/@fs\//, isWindows$1 ? "" : "/").replace(/^node:/, "").replace(/^\/+/, "/").replace(/^file:\//, "/");
}
const windowsSlashRE = /\\/g;
function slash(p) {
	return p.replace(windowsSlashRE, "/");
}
const multipleSlashRe = /^\/+/;
// module-runner incorrectly replaces file:///path with `///path`
function fixLeadingSlashes(id) {
	if (id.startsWith("//")) return id.replace(multipleSlashRe, "/");
	return id;
}

const createNodeImportMeta = (modulePath) => {
	if (!viteModuleRunner.createDefaultImportMeta) throw new Error(`createNodeImportMeta is not supported in this version of Vite.`);
	const defaultMeta = viteModuleRunner.createDefaultImportMeta(modulePath);
	const href = defaultMeta.url;
	const importMetaResolver = createImportMetaResolver();
	return {
		...defaultMeta,
		main: false,
		resolve(id, parent) {
			return (importMetaResolver ?? defaultMeta.resolve)(id, parent ?? href);
		}
	};
};
function createImportMetaResolver() {
	if (!import.meta.resolve) return;
	return (specifier, importer) => import.meta.resolve(specifier, importer);
}
// @ts-expect-error overriding private method
class VitestModuleRunner extends viteModuleRunner.ModuleRunner {
	mocker;
	moduleExecutionInfo;
	_otel;
	constructor(vitestOptions) {
		const options = vitestOptions;
		const transport = new VitestTransport(options.transport);
		const evaluatedModules = options.evaluatedModules;
		super({
			transport,
			hmr: false,
			evaluatedModules,
			sourcemapInterceptor: "prepareStackTrace",
			createImportMeta: vitestOptions.createImportMeta
		}, options.evaluator);
		this.vitestOptions = vitestOptions;
		this._otel = vitestOptions.traces || new Traces({ enabled: false });
		this.moduleExecutionInfo = options.getWorkerState().moduleExecutionInfo;
		this.mocker = options.mocker || new VitestMocker(this, {
			spyModule: options.spyModule,
			context: options.vm?.context,
			traces: this._otel,
			resolveId: options.transport.resolveId,
			get root() {
				return options.getWorkerState().config.root;
			},
			get moduleDirectories() {
				return options.getWorkerState().config.deps.moduleDirectories || [];
			},
			getCurrentTestFilepath() {
				return options.getWorkerState().filepath;
			}
		});
		if (options.vm) options.vm.context.__vitest_mocker__ = this.mocker;
		else Object.defineProperty(globalThis, "__vitest_mocker__", {
			configurable: true,
			writable: true,
			value: this.mocker
		});
	}
	/**
	* Vite checks that the module has exports emulating the Node.js behaviour,
	* but Vitest is more relaxed.
	*
	* We should keep the Vite behavour when there is a `strict` flag.
	* @internal
	*/
	processImport(exports$1) {
		return exports$1;
	}
	async import(rawId) {
		const resolved = await this._otel.$("vitest.module.resolve_id", { attributes: { "vitest.module.raw_id": rawId } }, async (span) => {
			const result = await this.vitestOptions.transport.resolveId(rawId);
			if (result) span.setAttributes({
				"vitest.module.url": result.url,
				"vitest.module.file": result.file,
				"vitest.module.id": result.id
			});
			return result;
		});
		return super.import(resolved ? resolved.url : rawId);
	}
	async fetchModule(url, importer) {
		return await this.cachedModule(url, importer);
	}
	_cachedRequest(url, module, callstack = [], metadata) {
		// @ts-expect-error "cachedRequest" is private
		return super.cachedRequest(url, module, callstack, metadata);
	}
	/**
	* @internal
	*/
	async cachedRequest(url, mod, callstack = [], metadata, ignoreMock = false) {
		if (ignoreMock) return this._cachedRequest(url, mod, callstack, metadata);
		let mocked;
		if (mod.meta && "mockedModule" in mod.meta) mocked = await this.mocker.requestWithMockedModule(url, mod, callstack, mod.meta.mockedModule);
		else mocked = await this.mocker.mockedRequest(url, mod, callstack);
		if (typeof mocked === "string") {
			const node = await this.fetchModule(mocked);
			return this._cachedRequest(mocked, node, callstack, metadata);
		}
		if (mocked != null && typeof mocked === "object") return mocked;
		return this._cachedRequest(url, mod, callstack, metadata);
	}
	/** @internal */
	_invalidateSubTreeById(ids, invalidated = /* @__PURE__ */ new Set()) {
		for (const id of ids) {
			if (invalidated.has(id)) continue;
			const node = this.evaluatedModules.getModuleById(id);
			if (!node) continue;
			invalidated.add(id);
			const subIds = Array.from(this.evaluatedModules.idToModuleMap).filter(([, mod]) => mod.importers.has(id)).map(([key]) => key);
			if (subIds.length) this._invalidateSubTreeById(subIds, invalidated);
			this.evaluatedModules.invalidateModule(node);
		}
	}
}

const bareVitestRegexp = /^@?vitest(?:\/|$)/;
const normalizedDistDir = normalize$1(distDir);
const relativeIds = {};
const externalizeMap = /* @__PURE__ */ new Map();
// all Vitest imports always need to be externalized
function getCachedVitestImport(id, state) {
	if (id.startsWith("/@fs/") || id.startsWith("\\@fs\\")) id = id.slice(process.platform === "win32" ? 5 : 4);
	if (externalizeMap.has(id)) return {
		externalize: externalizeMap.get(id),
		type: "module"
	};
	// always externalize Vitest because we import from there before running tests
	// so we already have it cached by Node.js
	const root = state().config.root;
	const relativeRoot = relativeIds[root] ?? (relativeIds[root] = normalizedDistDir.slice(root.length));
	if (id.includes(distDir) || id.includes(normalizedDistDir)) {
		const externalize = id.startsWith("file://") ? id : pathToFileURL(id).toString();
		externalizeMap.set(id, externalize);
		return {
			externalize,
			type: "module"
		};
	}
	if (relativeRoot && relativeRoot !== "/" && id.startsWith(relativeRoot)) {
		const externalize = pathToFileURL(join$1(root, id)).toString();
		externalizeMap.set(id, externalize);
		return {
			externalize,
			type: "module"
		};
	}
	if (bareVitestRegexp.test(id)) {
		externalizeMap.set(id, id);
		return {
			externalize: id,
			type: "module"
		};
	}
	return null;
}

// Store globals in case tests overwrite them
const processListeners = process.listeners.bind(process);
const processOn = process.on.bind(process);
const processOff = process.off.bind(process);
const dispose = [];
function listenForErrors(state) {
	dispose.forEach((fn) => fn());
	dispose.length = 0;
	function catchError(err, type, event) {
		const worker = state();
		// if there is another listener, assume that it's handled by user code
		// one is Vitest's own listener
		if (processListeners(event).length > 1) return;
		const error = serializeValue(err);
		if (typeof error === "object" && error != null) {
			error.VITEST_TEST_NAME = worker.current?.type === "test" ? worker.current.name : void 0;
			if (worker.filepath) error.VITEST_TEST_PATH = worker.filepath;
		}
		state().rpc.onUnhandledError(error, type);
	}
	const uncaughtException = (e) => catchError(e, "Uncaught Exception", "uncaughtException");
	const unhandledRejection = (e) => catchError(e, "Unhandled Rejection", "unhandledRejection");
	processOn("uncaughtException", uncaughtException);
	processOn("unhandledRejection", unhandledRejection);
	dispose.push(() => {
		processOff("uncaughtException", uncaughtException);
		processOff("unhandledRejection", unhandledRejection);
	});
}

const { readFileSync } = fs;
const VITEST_VM_CONTEXT_SYMBOL = "__vitest_vm_context__";
const cwd = process.cwd();
const isWindows = process.platform === "win32";
function startVitestModuleRunner(options) {
	const traces = options.traces;
	const state = () => globalThis.__vitest_worker__ || options.state;
	const rpc = () => state().rpc;
	process.exit = (code = process.exitCode || 0) => {
		throw new Error(`process.exit unexpectedly called with "${code}"`);
	};
	listenForErrors(state);
	const environment = () => {
		const environment = state().environment;
		return environment.viteEnvironment || environment.name;
	};
	const vm = options.context && options.externalModulesExecutor ? {
		context: options.context,
		externalModulesExecutor: options.externalModulesExecutor
	} : void 0;
	const evaluator = options.evaluator || new VitestModuleEvaluator(vm, {
		traces,
		evaluatedModules: options.evaluatedModules,
		get moduleExecutionInfo() {
			return state().moduleExecutionInfo;
		},
		get interopDefault() {
			return state().config.deps.interopDefault;
		},
		getCurrentTestFilepath: () => state().filepath
	});
	const moduleRunner = new VitestModuleRunner({
		spyModule: options.spyModule,
		evaluatedModules: options.evaluatedModules,
		evaluator,
		traces,
		mocker: options.mocker,
		transport: {
			async fetchModule(id, importer, options) {
				const resolvingModules = state().resolvingModules;
				if (isWindows) {
					if (id[1] === ":") {
						// The drive letter is different for whatever reason, we need to normalize it to CWD
						if (id[0] !== cwd[0] && id[0].toUpperCase() === cwd[0].toUpperCase()) id = (cwd[0].toUpperCase() === cwd[0] ? id[0].toUpperCase() : id[0].toLowerCase()) + id.slice(1);
						// always mark absolute windows paths, otherwise Vite will externalize it
						id = `/@id/${id}`;
					}
				}
				const vitest = getCachedVitestImport(id, state);
				if (vitest) return vitest;
				const rawId = unwrapId(id);
				resolvingModules.add(rawId);
				try {
					if (VitestMocker.pendingIds.length) await moduleRunner.mocker.resolveMocks();
					const resolvedMock = moduleRunner.mocker.getDependencyMock(rawId);
					if (resolvedMock?.type === "manual" || resolvedMock?.type === "redirect") return {
						code: "",
						file: null,
						id,
						url: id,
						invalidate: false,
						mockedModule: resolvedMock
					};
					if (isBuiltin(rawId)) return {
						externalize: rawId,
						type: "builtin"
					};
					if (isBrowserExternal(rawId)) return {
						externalize: toBuiltin(rawId),
						type: "builtin"
					};
					// if module is invalidated, the worker will be recreated,
					// so cached is always true in a single worker
					if (options?.cached) return { cache: true };
					const otelCarrier = traces?.getContextCarrier();
					const result = await rpc().fetch(id, importer, environment(), options, otelCarrier);
					if ("cached" in result) return {
						code: readFileSync(result.tmp, "utf-8"),
						...result
					};
					return result;
				} catch (cause) {
					// rethrow vite error if it cannot load the module because it's not resolved
					if (typeof cause === "object" && cause != null && cause.code === "ERR_LOAD_URL" || typeof cause?.message === "string" && cause.message.includes("Failed to load url") || typeof cause?.message === "string" && cause.message.startsWith("Cannot find module '")) {
						const error = new Error(`Cannot find ${isBareImport(id) ? "package" : "module"} '${id}'${importer ? ` imported from '${importer}'` : ""}`, { cause });
						error.code = "ERR_MODULE_NOT_FOUND";
						throw error;
					}
					throw cause;
				} finally {
					resolvingModules.delete(rawId);
				}
			},
			resolveId(id, importer) {
				return rpc().resolve(id, importer, environment());
			}
		},
		getWorkerState: state,
		vm,
		createImportMeta: options.createImportMeta
	});
	return moduleRunner;
}

export { VitestModuleRunner as V, VITEST_VM_CONTEXT_SYMBOL as a, VitestTransport as b, createNodeImportMeta as c, startVitestModuleRunner as s };
