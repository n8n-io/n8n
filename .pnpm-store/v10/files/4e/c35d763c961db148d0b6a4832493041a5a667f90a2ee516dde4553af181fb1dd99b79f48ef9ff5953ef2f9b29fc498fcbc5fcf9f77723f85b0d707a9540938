(function () {
	'use strict';

	let SOURCEMAPPING_URL = "sourceMa";
	SOURCEMAPPING_URL += "ppingURL";
	const isWindows = typeof process < "u" && process.platform === "win32";
	function unwrapId(id) {
		return id.startsWith("/@id/") ? id.slice(5).replace("__x00__", "\0") : id;
	}
	const windowsSlashRE = /\\/g;
	function slash(p) {
		return p.replace(windowsSlashRE, "/");
	}
	const postfixRE = /[?#].*$/;
	function cleanUrl(url) {
		return url.replace(postfixRE, "");
	}
	const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
	function normalizeWindowsPath(input = "") {
		return input && input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
	}
	const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
	function cwd() {
		return typeof process < "u" && typeof process.cwd == "function" ? process.cwd().replace(/\\/g, "/") : "/";
	}
	const resolve = function(...arguments_) {
		arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
		let resolvedPath = "", resolvedAbsolute = false;
		for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
			let path = index >= 0 ? arguments_[index] : cwd();
			!path || path.length === 0 || (resolvedPath = `${path}/${resolvedPath}`, resolvedAbsolute = isAbsolute(path));
		}
		return resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute), resolvedAbsolute && !isAbsolute(resolvedPath) ? `/${resolvedPath}` : resolvedPath.length > 0 ? resolvedPath : ".";
	};
	function normalizeString(path, allowAboveRoot) {
		let res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, char = null;
		for (let index = 0; index <= path.length; ++index) {
			if (index < path.length) char = path[index];
			else if (char === "/") break;
			else char = "/";
			if (char === "/") {
				if (!(lastSlash === index - 1 || dots === 1)) if (dots === 2) {
					if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
						if (res.length > 2) {
							let lastSlashIndex = res.lastIndexOf("/");
							lastSlashIndex === -1 ? (res = "", lastSegmentLength = 0) : (res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/")), lastSlash = index, dots = 0;
							continue;
						} else if (res.length > 0) {
							res = "", lastSegmentLength = 0, lastSlash = index, dots = 0;
							continue;
						}
					}
					allowAboveRoot && (res += res.length > 0 ? "/.." : "..", lastSegmentLength = 2);
				} else res.length > 0 ? res += `/${path.slice(lastSlash + 1, index)}` : res = path.slice(lastSlash + 1, index), lastSegmentLength = index - lastSlash - 1;
				lastSlash = index, dots = 0;
			} else char === "." && dots !== -1 ? ++dots : dots = -1;
		}
		return res;
	}
	const isAbsolute = function(p) {
		return _IS_ABSOLUTE_RE.test(p);
	}, decodeBase64 = typeof atob < "u" ? atob : (str) => Buffer.from(str, "base64").toString("utf-8");
	const posixResolve = resolve;
	const intToChar = new Uint8Array(64), charToInt = new Uint8Array(128);
	for (let i = 0; i < 64; i++) {
		let c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charCodeAt(i);
		intToChar[i] = c, charToInt[c] = i;
	}
	var DecodedMap = class {
		_encoded;
		_decoded;
		_decodedMemo;
		url;
		version;
		names = [];
		resolvedSources;
		constructor(map, from) {
			this.map = map;
			let { mappings, names, sources } = map;
			this.version = map.version, this.names = names || [], this._encoded = mappings || "", this._decodedMemo = memoizedState(), this.url = from, this.resolvedSources = (sources || []).map((s) => posixResolve(s || "", from));
		}
	};
	function memoizedState() {
		return {
			lastKey: -1,
			lastNeedle: -1,
			lastIndex: -1
		};
	}
	const MODULE_RUNNER_SOURCEMAPPING_REGEXP = /* @__PURE__ */ RegExp(`//# ${SOURCEMAPPING_URL}=data:application/json;base64,(.+)`);
	var EvaluatedModuleNode = class {
		importers = /* @__PURE__ */ new Set();
		imports = /* @__PURE__ */ new Set();
		evaluated = false;
		meta;
		promise;
		exports;
		file;
		map;
		constructor(id, url) {
			this.id = id, this.url = url, this.file = cleanUrl(id);
		}
	}, EvaluatedModules = class {
		idToModuleMap = /* @__PURE__ */ new Map();
		fileToModulesMap = /* @__PURE__ */ new Map();
		urlToIdModuleMap = /* @__PURE__ */ new Map();
		getModuleById(id) {
			return this.idToModuleMap.get(id);
		}
		getModulesByFile(file) {
			return this.fileToModulesMap.get(file);
		}
		getModuleByUrl(url) {
			return this.urlToIdModuleMap.get(unwrapId(url));
		}
		ensureModule(id, url) {
			if (id = normalizeModuleId(id), this.idToModuleMap.has(id)) {
				let moduleNode$1 = this.idToModuleMap.get(id);
				return this.urlToIdModuleMap.set(url, moduleNode$1), moduleNode$1;
			}
			let moduleNode = new EvaluatedModuleNode(id, url);
			this.idToModuleMap.set(id, moduleNode), this.urlToIdModuleMap.set(url, moduleNode);
			let fileModules = this.fileToModulesMap.get(moduleNode.file) || /* @__PURE__ */ new Set();
			return fileModules.add(moduleNode), this.fileToModulesMap.set(moduleNode.file, fileModules), moduleNode;
		}
		invalidateModule(node) {
			node.evaluated = false, node.meta = void 0, node.map = void 0, node.promise = void 0, node.exports = void 0, node.imports.clear();
		}
		getModuleSourceMapById(id) {
			let mod = this.getModuleById(id);
			if (!mod) return null;
			if (mod.map) return mod.map;
			if (!mod.meta || !("code" in mod.meta)) return null;
			let pattern = `//# ${SOURCEMAPPING_URL}=data:application/json;base64,`, lastIndex = mod.meta.code.lastIndexOf(pattern);
			if (lastIndex === -1) return null;
			let mapString = MODULE_RUNNER_SOURCEMAPPING_REGEXP.exec(mod.meta.code.slice(lastIndex))?.[1];
			return mapString ? (mod.map = new DecodedMap(JSON.parse(decodeBase64(mapString)), mod.file), mod.map) : null;
		}
		clear() {
			this.idToModuleMap.clear(), this.fileToModulesMap.clear(), this.urlToIdModuleMap.clear();
		}
	};
	const prefixedBuiltins = new Set([
		"node:sea",
		"node:sqlite",
		"node:test",
		"node:test/reporters"
	]);
	function normalizeModuleId(file) {
		if (prefixedBuiltins.has(file)) return file;
		let unixFile = slash(file).replace(/^\/@fs\//, isWindows ? "" : "/").replace(/^node:/, "").replace(/^\/+/, "/");
		return unixFile.replace(/^file:\/+/, isWindows ? "" : "/");
	}
	const customizationHookNamespace = "vite-module-runner:import-meta-resolve/v1/"; `

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(${JSON.stringify(customizationHookNamespace)})) {
    const data = specifier.slice(${JSON.stringify(customizationHookNamespace)}.length)
    const [parsedSpecifier, parsedImporter] = JSON.parse(data)
    specifier = parsedSpecifier
    context.parentURL = parsedImporter
  }

  return nextResolve(specifier, context)
}

`;
	new Proxy({}, { get(_, p) {
		throw Error(`[module runner] Dynamic access of "import.meta.env" is not supported. Please, use "import.meta.env.${String(p)}" instead.`);
	} });

	/* @__NO_SIDE_EFFECTS__ */
	function getBrowserState() {
		// @ts-expect-error not typed global
		return window.__vitest_browser_runner__;
	}

	const config = getBrowserState().config;
	const sessionId = getBrowserState().sessionId;
	const state = {
		ctx: {
			rpc: null,
			pool: "browser",
			workerId: 1,
			config,
			projectName: config.name || "",
			files: [],
			environment: {
				name: "browser",
				options: null
			},
			providedContext: {},
			invalidates: []
		},
		onCancel: null,
		config,
		environment: {
			name: "browser",
			viteEnvironment: "client",
			setup() {
				throw new Error("Not called in the browser");
			}
		},
		onCleanup: (fn) => getBrowserState().cleanups.push(fn),
		evaluatedModules: new EvaluatedModules(),
		resolvingModules: new Set(),
		moduleExecutionInfo: new Map(),
		metaEnv: null,
		rpc: null,
		durations: {
			environment: 0,
			prepare: performance.now()
		},
		providedContext: {}
	};
	// @ts-expect-error not typed global
	globalThis.__vitest_browser__ = true;
	// @ts-expect-error not typed global
	globalThis.__vitest_worker__ = state;
	getBrowserState().cdp = createCdp();
	function rpc() {
		return state.rpc;
	}
	function createCdp() {
		const listenersMap = new WeakMap();
		function getId(listener) {
			const id = listenersMap.get(listener) || crypto.randomUUID();
			listenersMap.set(listener, id);
			return id;
		}
		const listeners = {};
		const cdp = {
			send(method, params) {
				return rpc().sendCdpEvent(sessionId, method, params);
			},
			on(event, listener) {
				const listenerId = getId(listener);
				listeners[event] = listeners[event] || [];
				listeners[event].push(listener);
				rpc().trackCdpEvent(sessionId, "on", event, listenerId).catch(error);
				return cdp;
			},
			once(event, listener) {
				const listenerId = getId(listener);
				const handler = (data) => {
					listener(data);
					cdp.off(event, listener);
				};
				listeners[event] = listeners[event] || [];
				listeners[event].push(handler);
				rpc().trackCdpEvent(sessionId, "once", event, listenerId).catch(error);
				return cdp;
			},
			off(event, listener) {
				const listenerId = getId(listener);
				if (listeners[event]) {
					listeners[event] = listeners[event].filter((l) => l !== listener);
				}
				rpc().trackCdpEvent(sessionId, "off", event, listenerId).catch(error);
				return cdp;
			},
			emit(event, payload) {
				if (listeners[event]) {
					listeners[event].forEach((l) => {
						try {
							l(payload);
						} catch (err) {
							error(err);
						}
					});
				}
			}
		};
		return cdp;
	}
	function error(err) {
		window.dispatchEvent(new ErrorEvent("error", { error: err }));
	}

})();
