//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region ../../../node_modules/.pnpm/comlink@4.4.1/node_modules/comlink/dist/esm/comlink.mjs
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: Apache-2.0
*/
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const finalizer = Symbol("Comlink.finalizer");
const throwMarker = Symbol("Comlink.thrown");
const isObject$1 = (val) => typeof val === "object" && val !== null || typeof val === "function";
/**
* Allows customizing the serialization of certain values.
*/
const transferHandlers = /* @__PURE__ */ new Map([["proxy", {
	canHandle: (val) => isObject$1(val) && val[proxyMarker],
	serialize(obj) {
		const { port1, port2 } = new MessageChannel();
		expose(obj, port1);
		return [port2, [port2]];
	},
	deserialize(port) {
		port.start();
		return wrap(port);
	}
}], ["throw", {
	canHandle: (value) => isObject$1(value) && throwMarker in value,
	serialize({ value }) {
		let serialized;
		if (value instanceof Error) serialized = {
			isError: true,
			value: {
				message: value.message,
				name: value.name,
				stack: value.stack
			}
		};
		else serialized = {
			isError: false,
			value
		};
		return [serialized, []];
	},
	deserialize(serialized) {
		if (serialized.isError) throw Object.assign(new Error(serialized.value.message), serialized.value);
		throw serialized.value;
	}
}]]);
function isAllowedOrigin(allowedOrigins, origin) {
	for (const allowedOrigin of allowedOrigins) {
		if (origin === allowedOrigin || allowedOrigin === "*") return true;
		if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) return true;
	}
	return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
	ep.addEventListener("message", function callback(ev) {
		if (!ev || !ev.data) return;
		if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
			console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
			return;
		}
		const { id, type, path } = Object.assign({ path: [] }, ev.data);
		const argumentList = (ev.data.argumentList || []).map(fromWireValue);
		let returnValue;
		try {
			const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
			const rawValue = path.reduce((obj, prop) => obj[prop], obj);
			switch (type) {
				case "GET":
					returnValue = rawValue;
					break;
				case "SET":
					parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
					returnValue = true;
					break;
				case "APPLY":
					returnValue = rawValue.apply(parent, argumentList);
					break;
				case "CONSTRUCT":
					returnValue = proxy(new rawValue(...argumentList));
					break;
				case "ENDPOINT":
					{
						const { port1, port2 } = new MessageChannel();
						expose(obj, port2);
						returnValue = transfer(port1, [port1]);
					}
					break;
				case "RELEASE":
					returnValue = void 0;
					break;
				default: return;
			}
		} catch (value) {
			returnValue = {
				value,
				[throwMarker]: 0
			};
		}
		Promise.resolve(returnValue).catch((value) => {
			return {
				value,
				[throwMarker]: 0
			};
		}).then((returnValue) => {
			const [wireValue, transferables] = toWireValue(returnValue);
			ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
			if (type === "RELEASE") {
				ep.removeEventListener("message", callback);
				closeEndPoint(ep);
				if (finalizer in obj && typeof obj[finalizer] === "function") obj[finalizer]();
			}
		}).catch((error) => {
			const [wireValue, transferables] = toWireValue({
				value: /* @__PURE__ */ new TypeError("Unserializable return value"),
				[throwMarker]: 0
			});
			ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
		});
	});
	if (ep.start) ep.start();
}
function isMessagePort(endpoint) {
	return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
	if (isMessagePort(endpoint)) endpoint.close();
}
function wrap(ep, target) {
	return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
	if (isReleased) throw new Error("Proxy has been released and is not useable");
}
function releaseEndpoint(ep) {
	return requestResponseMessage(ep, { type: "RELEASE" }).then(() => {
		closeEndPoint(ep);
	});
}
const proxyCounter = /* @__PURE__ */ new WeakMap();
const proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
	const newCount = (proxyCounter.get(ep) || 0) - 1;
	proxyCounter.set(ep, newCount);
	if (newCount === 0) releaseEndpoint(ep);
});
function registerProxy(proxy, ep) {
	const newCount = (proxyCounter.get(ep) || 0) + 1;
	proxyCounter.set(ep, newCount);
	if (proxyFinalizers) proxyFinalizers.register(proxy, ep, proxy);
}
function unregisterProxy(proxy) {
	if (proxyFinalizers) proxyFinalizers.unregister(proxy);
}
function createProxy(ep, path = [], target = function() {}) {
	let isProxyReleased = false;
	const proxy = new Proxy(target, {
		get(_target, prop) {
			throwIfProxyReleased(isProxyReleased);
			if (prop === releaseProxy) return () => {
				unregisterProxy(proxy);
				releaseEndpoint(ep);
				isProxyReleased = true;
			};
			if (prop === "then") {
				if (path.length === 0) return { then: () => proxy };
				const r = requestResponseMessage(ep, {
					type: "GET",
					path: path.map((p) => p.toString())
				}).then(fromWireValue);
				return r.then.bind(r);
			}
			return createProxy(ep, [...path, prop]);
		},
		set(_target, prop, rawValue) {
			throwIfProxyReleased(isProxyReleased);
			const [value, transferables] = toWireValue(rawValue);
			return requestResponseMessage(ep, {
				type: "SET",
				path: [...path, prop].map((p) => p.toString()),
				value
			}, transferables).then(fromWireValue);
		},
		apply(_target, _thisArg, rawArgumentList) {
			throwIfProxyReleased(isProxyReleased);
			const last = path[path.length - 1];
			if (last === createEndpoint) return requestResponseMessage(ep, { type: "ENDPOINT" }).then(fromWireValue);
			if (last === "bind") return createProxy(ep, path.slice(0, -1));
			const [argumentList, transferables] = processArguments(rawArgumentList);
			return requestResponseMessage(ep, {
				type: "APPLY",
				path: path.map((p) => p.toString()),
				argumentList
			}, transferables).then(fromWireValue);
		},
		construct(_target, rawArgumentList) {
			throwIfProxyReleased(isProxyReleased);
			const [argumentList, transferables] = processArguments(rawArgumentList);
			return requestResponseMessage(ep, {
				type: "CONSTRUCT",
				path: path.map((p) => p.toString()),
				argumentList
			}, transferables).then(fromWireValue);
		}
	});
	registerProxy(proxy, ep);
	return proxy;
}
function myFlat(arr) {
	return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
	const processed = argumentList.map(toWireValue);
	return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
const transferCache = /* @__PURE__ */ new WeakMap();
function transfer(obj, transfers) {
	transferCache.set(obj, transfers);
	return obj;
}
function proxy(obj) {
	return Object.assign(obj, { [proxyMarker]: true });
}
function toWireValue(value) {
	for (const [name, handler] of transferHandlers) if (handler.canHandle(value)) {
		const [serializedValue, transferables] = handler.serialize(value);
		return [{
			type: "HANDLER",
			name,
			value: serializedValue
		}, transferables];
	}
	return [{
		type: "RAW",
		value
	}, transferCache.get(value) || []];
}
function fromWireValue(value) {
	switch (value.type) {
		case "HANDLER": return transferHandlers.get(value.name).deserialize(value.value);
		case "RAW": return value.value;
	}
}
function requestResponseMessage(ep, msg, transfers) {
	return new Promise((resolve) => {
		const id = generateUUID();
		ep.addEventListener("message", function l(ev) {
			if (!ev.data || !ev.data.id || ev.data.id !== id) return;
			ep.removeEventListener("message", l);
			resolve(ev.data);
		});
		if (ep.start) ep.start();
		ep.postMessage(Object.assign({ id }, msg), transfers);
	});
}
function generateUUID() {
	return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
//#endregion
//#region ../../../node_modules/.pnpm/wa-sqlite@https+++codeload.github.com+rhashimoto+wa-sqlite+tar.gz+779219540f66cecaa159da32b3b8936697ba10a7/node_modules/wa-sqlite/dist/wa-sqlite.mjs
var Module$1 = (() => {
	var _scriptName = import.meta.url;
	return (function(moduleArg = {}) {
		var moduleRtn;
		var Module = moduleArg;
		var readyPromiseResolve, readyPromiseReject;
		var readyPromise = new Promise((resolve, reject) => {
			readyPromiseResolve = resolve;
			readyPromiseReject = reject;
		});
		var ENVIRONMENT_IS_WEB = typeof window == "object";
		var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
		typeof process == "object" && typeof process.versions == "object" && process.versions.node;
		var moduleOverrides = Object.assign({}, Module);
		var thisProgram = "./this.program";
		var quit_ = (status, toThrow) => {
			throw toThrow;
		};
		var scriptDirectory = "";
		function locateFile(path) {
			if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
			return scriptDirectory + path;
		}
		var read_, readAsync, readBinary;
		if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
			if (ENVIRONMENT_IS_WORKER) scriptDirectory = self.location.href;
			else if (typeof document != "undefined" && document.currentScript) scriptDirectory = document.currentScript.src;
			if (_scriptName) scriptDirectory = _scriptName;
			if (scriptDirectory.startsWith("blob:")) scriptDirectory = "";
			else scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
			read_ = (url) => {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", url, false);
				xhr.send(null);
				return xhr.responseText;
			};
			if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", url, false);
				xhr.responseType = "arraybuffer";
				xhr.send(null);
				return new Uint8Array(xhr.response);
			};
			readAsync = (url, onload, onerror) => {
				fetch(url, { credentials: "same-origin" }).then((response) => {
					if (response.ok) return response.arrayBuffer();
					return Promise.reject(/* @__PURE__ */ new Error(response.status + " : " + response.url));
				}).then(onload, onerror);
			};
		}
		var out = Module["print"] || console.log.bind(console);
		var err = Module["printErr"] || console.error.bind(console);
		Object.assign(Module, moduleOverrides);
		moduleOverrides = null;
		if (Module["arguments"]) Module["arguments"];
		if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
		if (Module["quit"]) quit_ = Module["quit"];
		var wasmBinary;
		if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
		var wasmMemory;
		var ABORT = false;
		var EXITSTATUS;
		var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
		function updateMemoryViews() {
			var b = wasmMemory.buffer;
			Module["HEAP8"] = HEAP8 = new Int8Array(b);
			Module["HEAP16"] = HEAP16 = new Int16Array(b);
			Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
			Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
			Module["HEAP32"] = HEAP32 = new Int32Array(b);
			Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
			Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
			Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
		}
		var __ATPRERUN__ = [];
		var __ATINIT__ = [];
		var __ATMAIN__ = [];
		var __ATPOSTRUN__ = [];
		function preRun() {
			if (Module["preRun"]) {
				if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
				while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
			}
			callRuntimeCallbacks(__ATPRERUN__);
		}
		function initRuntime() {
			if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
			FS.ignorePermissions = false;
			TTY.init();
			callRuntimeCallbacks(__ATINIT__);
		}
		function preMain() {
			callRuntimeCallbacks(__ATMAIN__);
		}
		function postRun() {
			if (Module["postRun"]) {
				if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
				while (Module["postRun"].length) addOnPostRun(Module["postRun"].shift());
			}
			callRuntimeCallbacks(__ATPOSTRUN__);
		}
		function addOnPreRun(cb) {
			__ATPRERUN__.unshift(cb);
		}
		function addOnInit(cb) {
			__ATINIT__.unshift(cb);
		}
		function addOnPostRun(cb) {
			__ATPOSTRUN__.unshift(cb);
		}
		var runDependencies = 0;
		var runDependencyWatcher = null;
		var dependenciesFulfilled = null;
		function getUniqueRunDependency(id) {
			return id;
		}
		function addRunDependency(id) {
			runDependencies++;
			Module["monitorRunDependencies"]?.(runDependencies);
		}
		function removeRunDependency(id) {
			runDependencies--;
			Module["monitorRunDependencies"]?.(runDependencies);
			if (runDependencies == 0) {
				if (runDependencyWatcher !== null) {
					clearInterval(runDependencyWatcher);
					runDependencyWatcher = null;
				}
				if (dependenciesFulfilled) {
					var callback = dependenciesFulfilled;
					dependenciesFulfilled = null;
					callback();
				}
			}
		}
		function abort(what) {
			Module["onAbort"]?.(what);
			what = "Aborted(" + what + ")";
			err(what);
			ABORT = true;
			EXITSTATUS = 1;
			what += ". Build with -sASSERTIONS for more info.";
			var e = new WebAssembly.RuntimeError(what);
			readyPromiseReject(e);
			throw e;
		}
		var dataURIPrefix = "data:application/octet-stream;base64,";
		var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
		function findWasmBinary() {
			if (Module["locateFile"]) {
				var f = "wa-sqlite.wasm";
				if (!isDataURI(f)) return locateFile(f);
				return f;
			}
			return new URL("/assets/wa-sqlite-DDTbX34h.wasm", "" + import.meta.url).href;
		}
		var wasmBinaryFile;
		function getBinarySync(file) {
			if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
			if (readBinary) return readBinary(file);
			throw "both async and sync fetching of the wasm failed";
		}
		function getBinaryPromise(binaryFile) {
			if (!wasmBinary) return new Promise((resolve, reject) => {
				readAsync(binaryFile, (response) => resolve(new Uint8Array(response)), (error) => {
					try {
						resolve(getBinarySync(binaryFile));
					} catch (e) {
						reject(e);
					}
				});
			});
			return Promise.resolve().then(() => getBinarySync(binaryFile));
		}
		function instantiateArrayBuffer(binaryFile, imports, receiver) {
			return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then(receiver, (reason) => {
				err(`failed to asynchronously prepare wasm: ${reason}`);
				abort(reason);
			});
		}
		function instantiateAsync(binary, binaryFile, imports, callback) {
			if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
				return WebAssembly.instantiateStreaming(response, imports).then(callback, function(reason) {
					err(`wasm streaming compile failed: ${reason}`);
					err("falling back to ArrayBuffer instantiation");
					return instantiateArrayBuffer(binaryFile, imports, callback);
				});
			});
			return instantiateArrayBuffer(binaryFile, imports, callback);
		}
		function getWasmImports() {
			return { a: wasmImports };
		}
		function createWasm() {
			var info = getWasmImports();
			function receiveInstance(instance, module) {
				wasmExports = instance.exports;
				wasmMemory = wasmExports["la"];
				updateMemoryViews();
				wasmTable = wasmExports["ef"];
				addOnInit(wasmExports["ma"]);
				removeRunDependency("wasm-instantiate");
				return wasmExports;
			}
			addRunDependency("wasm-instantiate");
			function receiveInstantiationResult(result) {
				receiveInstance(result["instance"]);
			}
			if (Module["instantiateWasm"]) try {
				return Module["instantiateWasm"](info, receiveInstance);
			} catch (e) {
				err(`Module.instantiateWasm callback failed with error: ${e}`);
				readyPromiseReject(e);
			}
			if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();
			instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
			return {};
		}
		var tempDouble;
		var tempI64;
		function ExitStatus(status) {
			this.name = "ExitStatus";
			this.message = `Program terminated with exit(${status})`;
			this.status = status;
		}
		var callRuntimeCallbacks = (callbacks) => {
			while (callbacks.length > 0) callbacks.shift()(Module);
		};
		function getValue(ptr, type = "i8") {
			if (type.endsWith("*")) type = "*";
			switch (type) {
				case "i1": return HEAP8[ptr];
				case "i8": return HEAP8[ptr];
				case "i16": return HEAP16[ptr >> 1];
				case "i32": return HEAP32[ptr >> 2];
				case "i64": abort("to do getValue(i64) use WASM_BIGINT");
				case "float": return HEAPF32[ptr >> 2];
				case "double": return HEAPF64[ptr >> 3];
				case "*": return HEAPU32[ptr >> 2];
				default: abort(`invalid type for getValue: ${type}`);
			}
		}
		var noExitRuntime = Module["noExitRuntime"] || true;
		function setValue(ptr, value, type = "i8") {
			if (type.endsWith("*")) type = "*";
			switch (type) {
				case "i1":
					HEAP8[ptr] = value;
					break;
				case "i8":
					HEAP8[ptr] = value;
					break;
				case "i16":
					HEAP16[ptr >> 1] = value;
					break;
				case "i32":
					HEAP32[ptr >> 2] = value;
					break;
				case "i64": abort("to do setValue(i64) use WASM_BIGINT");
				case "float":
					HEAPF32[ptr >> 2] = value;
					break;
				case "double":
					HEAPF64[ptr >> 3] = value;
					break;
				case "*":
					HEAPU32[ptr >> 2] = value;
					break;
				default: abort(`invalid type for setValue: ${type}`);
			}
		}
		var stackRestore = (val) => __emscripten_stack_restore(val);
		var stackSave = () => _emscripten_stack_get_current();
		var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
		var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
			var endIdx = idx + maxBytesToRead;
			var endPtr = idx;
			while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
			if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
			var str = "";
			while (idx < endPtr) {
				var u0 = heapOrArray[idx++];
				if (!(u0 & 128)) {
					str += String.fromCharCode(u0);
					continue;
				}
				var u1 = heapOrArray[idx++] & 63;
				if ((u0 & 224) == 192) {
					str += String.fromCharCode((u0 & 31) << 6 | u1);
					continue;
				}
				var u2 = heapOrArray[idx++] & 63;
				if ((u0 & 240) == 224) u0 = (u0 & 15) << 12 | u1 << 6 | u2;
				else u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
				if (u0 < 65536) str += String.fromCharCode(u0);
				else {
					var ch = u0 - 65536;
					str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
				}
			}
			return str;
		};
		var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
		var ___assert_fail = (condition, filename, line, func) => {
			abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [
				filename ? UTF8ToString(filename) : "unknown filename",
				line,
				func ? UTF8ToString(func) : "unknown function"
			]);
		};
		var PATH = {
			isAbs: (path) => path.charAt(0) === "/",
			splitPath: (filename) => {
				return /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(filename).slice(1);
			},
			normalizeArray: (parts, allowAboveRoot) => {
				var up = 0;
				for (var i = parts.length - 1; i >= 0; i--) {
					var last = parts[i];
					if (last === ".") parts.splice(i, 1);
					else if (last === "..") {
						parts.splice(i, 1);
						up++;
					} else if (up) {
						parts.splice(i, 1);
						up--;
					}
				}
				if (allowAboveRoot) for (; up; up--) parts.unshift("..");
				return parts;
			},
			normalize: (path) => {
				var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
				path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
				if (!path && !isAbsolute) path = ".";
				if (path && trailingSlash) path += "/";
				return (isAbsolute ? "/" : "") + path;
			},
			dirname: (path) => {
				var result = PATH.splitPath(path), root = result[0], dir = result[1];
				if (!root && !dir) return ".";
				if (dir) dir = dir.substr(0, dir.length - 1);
				return root + dir;
			},
			basename: (path) => {
				if (path === "/") return "/";
				path = PATH.normalize(path);
				path = path.replace(/\/$/, "");
				var lastSlash = path.lastIndexOf("/");
				if (lastSlash === -1) return path;
				return path.substr(lastSlash + 1);
			},
			join: (...paths) => PATH.normalize(paths.join("/")),
			join2: (l, r) => PATH.normalize(l + "/" + r)
		};
		var initRandomFill = () => {
			if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") return (view) => crypto.getRandomValues(view);
			else abort("initRandomDevice");
		};
		var randomFill = (view) => (randomFill = initRandomFill())(view);
		var PATH_FS = {
			resolve: (...args) => {
				var resolvedPath = "", resolvedAbsolute = false;
				for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
					var path = i >= 0 ? args[i] : FS.cwd();
					if (typeof path != "string") throw new TypeError("Arguments to path.resolve must be strings");
					else if (!path) return "";
					resolvedPath = path + "/" + resolvedPath;
					resolvedAbsolute = PATH.isAbs(path);
				}
				resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
				return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
			},
			relative: (from, to) => {
				from = PATH_FS.resolve(from).substr(1);
				to = PATH_FS.resolve(to).substr(1);
				function trim(arr) {
					var start = 0;
					for (; start < arr.length; start++) if (arr[start] !== "") break;
					var end = arr.length - 1;
					for (; end >= 0; end--) if (arr[end] !== "") break;
					if (start > end) return [];
					return arr.slice(start, end - start + 1);
				}
				var fromParts = trim(from.split("/"));
				var toParts = trim(to.split("/"));
				var length = Math.min(fromParts.length, toParts.length);
				var samePartsLength = length;
				for (var i = 0; i < length; i++) if (fromParts[i] !== toParts[i]) {
					samePartsLength = i;
					break;
				}
				var outputParts = [];
				for (var i = samePartsLength; i < fromParts.length; i++) outputParts.push("..");
				outputParts = outputParts.concat(toParts.slice(samePartsLength));
				return outputParts.join("/");
			}
		};
		var FS_stdin_getChar_buffer = [];
		var lengthBytesUTF8 = (str) => {
			var len = 0;
			for (var i = 0; i < str.length; ++i) {
				var c = str.charCodeAt(i);
				if (c <= 127) len++;
				else if (c <= 2047) len += 2;
				else if (c >= 55296 && c <= 57343) {
					len += 4;
					++i;
				} else len += 3;
			}
			return len;
		};
		var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
			if (!(maxBytesToWrite > 0)) return 0;
			var startIdx = outIdx;
			var endIdx = outIdx + maxBytesToWrite - 1;
			for (var i = 0; i < str.length; ++i) {
				var u = str.charCodeAt(i);
				if (u >= 55296 && u <= 57343) {
					var u1 = str.charCodeAt(++i);
					u = 65536 + ((u & 1023) << 10) | u1 & 1023;
				}
				if (u <= 127) {
					if (outIdx >= endIdx) break;
					heap[outIdx++] = u;
				} else if (u <= 2047) {
					if (outIdx + 1 >= endIdx) break;
					heap[outIdx++] = 192 | u >> 6;
					heap[outIdx++] = 128 | u & 63;
				} else if (u <= 65535) {
					if (outIdx + 2 >= endIdx) break;
					heap[outIdx++] = 224 | u >> 12;
					heap[outIdx++] = 128 | u >> 6 & 63;
					heap[outIdx++] = 128 | u & 63;
				} else {
					if (outIdx + 3 >= endIdx) break;
					heap[outIdx++] = 240 | u >> 18;
					heap[outIdx++] = 128 | u >> 12 & 63;
					heap[outIdx++] = 128 | u >> 6 & 63;
					heap[outIdx++] = 128 | u & 63;
				}
			}
			heap[outIdx] = 0;
			return outIdx - startIdx;
		};
		function intArrayFromString(stringy, dontAddNull, length) {
			var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
			var u8array = new Array(len);
			var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
			if (dontAddNull) u8array.length = numBytesWritten;
			return u8array;
		}
		var FS_stdin_getChar = () => {
			if (!FS_stdin_getChar_buffer.length) {
				var result = null;
				if (typeof window != "undefined" && typeof window.prompt == "function") {
					result = window.prompt("Input: ");
					if (result !== null) result += "\n";
				}
				if (!result) return null;
				FS_stdin_getChar_buffer = intArrayFromString(result, true);
			}
			return FS_stdin_getChar_buffer.shift();
		};
		var TTY = {
			ttys: [],
			init() {},
			shutdown() {},
			register(dev, ops) {
				TTY.ttys[dev] = {
					input: [],
					output: [],
					ops
				};
				FS.registerDevice(dev, TTY.stream_ops);
			},
			stream_ops: {
				open(stream) {
					var tty = TTY.ttys[stream.node.rdev];
					if (!tty) throw new FS.ErrnoError(43);
					stream.tty = tty;
					stream.seekable = false;
				},
				close(stream) {
					stream.tty.ops.fsync(stream.tty);
				},
				fsync(stream) {
					stream.tty.ops.fsync(stream.tty);
				},
				read(stream, buffer, offset, length, pos) {
					if (!stream.tty || !stream.tty.ops.get_char) throw new FS.ErrnoError(60);
					var bytesRead = 0;
					for (var i = 0; i < length; i++) {
						var result;
						try {
							result = stream.tty.ops.get_char(stream.tty);
						} catch (e) {
							throw new FS.ErrnoError(29);
						}
						if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
						if (result === null || result === void 0) break;
						bytesRead++;
						buffer[offset + i] = result;
					}
					if (bytesRead) stream.node.timestamp = Date.now();
					return bytesRead;
				},
				write(stream, buffer, offset, length, pos) {
					if (!stream.tty || !stream.tty.ops.put_char) throw new FS.ErrnoError(60);
					try {
						for (var i = 0; i < length; i++) stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
					} catch (e) {
						throw new FS.ErrnoError(29);
					}
					if (length) stream.node.timestamp = Date.now();
					return i;
				}
			},
			default_tty_ops: {
				get_char(tty) {
					return FS_stdin_getChar();
				},
				put_char(tty, val) {
					if (val === null || val === 10) {
						out(UTF8ArrayToString(tty.output, 0));
						tty.output = [];
					} else if (val != 0) tty.output.push(val);
				},
				fsync(tty) {
					if (tty.output && tty.output.length > 0) {
						out(UTF8ArrayToString(tty.output, 0));
						tty.output = [];
					}
				},
				ioctl_tcgets(tty) {
					return {
						c_iflag: 25856,
						c_oflag: 5,
						c_cflag: 191,
						c_lflag: 35387,
						c_cc: [
							3,
							28,
							127,
							21,
							4,
							0,
							1,
							0,
							17,
							19,
							26,
							0,
							18,
							15,
							23,
							22,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0,
							0
						]
					};
				},
				ioctl_tcsets(tty, optional_actions, data) {
					return 0;
				},
				ioctl_tiocgwinsz(tty) {
					return [24, 80];
				}
			},
			default_tty1_ops: {
				put_char(tty, val) {
					if (val === null || val === 10) {
						err(UTF8ArrayToString(tty.output, 0));
						tty.output = [];
					} else if (val != 0) tty.output.push(val);
				},
				fsync(tty) {
					if (tty.output && tty.output.length > 0) {
						err(UTF8ArrayToString(tty.output, 0));
						tty.output = [];
					}
				}
			}
		};
		var zeroMemory = (address, size) => {
			HEAPU8.fill(0, address, address + size);
			return address;
		};
		var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
		var mmapAlloc = (size) => {
			size = alignMemory(size, 65536);
			var ptr = _emscripten_builtin_memalign(65536, size);
			if (!ptr) return 0;
			return zeroMemory(ptr, size);
		};
		var MEMFS = {
			ops_table: null,
			mount(mount) {
				return MEMFS.createNode(null, "/", 16895, 0);
			},
			createNode(parent, name, mode, dev) {
				if (FS.isBlkdev(mode) || FS.isFIFO(mode)) throw new FS.ErrnoError(63);
				MEMFS.ops_table ||= {
					dir: {
						node: {
							getattr: MEMFS.node_ops.getattr,
							setattr: MEMFS.node_ops.setattr,
							lookup: MEMFS.node_ops.lookup,
							mknod: MEMFS.node_ops.mknod,
							rename: MEMFS.node_ops.rename,
							unlink: MEMFS.node_ops.unlink,
							rmdir: MEMFS.node_ops.rmdir,
							readdir: MEMFS.node_ops.readdir,
							symlink: MEMFS.node_ops.symlink
						},
						stream: { llseek: MEMFS.stream_ops.llseek }
					},
					file: {
						node: {
							getattr: MEMFS.node_ops.getattr,
							setattr: MEMFS.node_ops.setattr
						},
						stream: {
							llseek: MEMFS.stream_ops.llseek,
							read: MEMFS.stream_ops.read,
							write: MEMFS.stream_ops.write,
							allocate: MEMFS.stream_ops.allocate,
							mmap: MEMFS.stream_ops.mmap,
							msync: MEMFS.stream_ops.msync
						}
					},
					link: {
						node: {
							getattr: MEMFS.node_ops.getattr,
							setattr: MEMFS.node_ops.setattr,
							readlink: MEMFS.node_ops.readlink
						},
						stream: {}
					},
					chrdev: {
						node: {
							getattr: MEMFS.node_ops.getattr,
							setattr: MEMFS.node_ops.setattr
						},
						stream: FS.chrdev_stream_ops
					}
				};
				var node = FS.createNode(parent, name, mode, dev);
				if (FS.isDir(node.mode)) {
					node.node_ops = MEMFS.ops_table.dir.node;
					node.stream_ops = MEMFS.ops_table.dir.stream;
					node.contents = {};
				} else if (FS.isFile(node.mode)) {
					node.node_ops = MEMFS.ops_table.file.node;
					node.stream_ops = MEMFS.ops_table.file.stream;
					node.usedBytes = 0;
					node.contents = null;
				} else if (FS.isLink(node.mode)) {
					node.node_ops = MEMFS.ops_table.link.node;
					node.stream_ops = MEMFS.ops_table.link.stream;
				} else if (FS.isChrdev(node.mode)) {
					node.node_ops = MEMFS.ops_table.chrdev.node;
					node.stream_ops = MEMFS.ops_table.chrdev.stream;
				}
				node.timestamp = Date.now();
				if (parent) {
					parent.contents[name] = node;
					parent.timestamp = node.timestamp;
				}
				return node;
			},
			getFileDataAsTypedArray(node) {
				if (!node.contents) return /* @__PURE__ */ new Uint8Array(0);
				if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
				return new Uint8Array(node.contents);
			},
			expandFileStorage(node, newCapacity) {
				var prevCapacity = node.contents ? node.contents.length : 0;
				if (prevCapacity >= newCapacity) return;
				newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < 1048576 ? 2 : 1.125) >>> 0);
				if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
				var oldContents = node.contents;
				node.contents = new Uint8Array(newCapacity);
				if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
			},
			resizeFileStorage(node, newSize) {
				if (node.usedBytes == newSize) return;
				if (newSize == 0) {
					node.contents = null;
					node.usedBytes = 0;
				} else {
					var oldContents = node.contents;
					node.contents = new Uint8Array(newSize);
					if (oldContents) node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
					node.usedBytes = newSize;
				}
			},
			node_ops: {
				getattr(node) {
					var attr = {};
					attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
					attr.ino = node.id;
					attr.mode = node.mode;
					attr.nlink = 1;
					attr.uid = 0;
					attr.gid = 0;
					attr.rdev = node.rdev;
					if (FS.isDir(node.mode)) attr.size = 4096;
					else if (FS.isFile(node.mode)) attr.size = node.usedBytes;
					else if (FS.isLink(node.mode)) attr.size = node.link.length;
					else attr.size = 0;
					attr.atime = new Date(node.timestamp);
					attr.mtime = new Date(node.timestamp);
					attr.ctime = new Date(node.timestamp);
					attr.blksize = 4096;
					attr.blocks = Math.ceil(attr.size / attr.blksize);
					return attr;
				},
				setattr(node, attr) {
					if (attr.mode !== void 0) node.mode = attr.mode;
					if (attr.timestamp !== void 0) node.timestamp = attr.timestamp;
					if (attr.size !== void 0) MEMFS.resizeFileStorage(node, attr.size);
				},
				lookup(parent, name) {
					throw FS.genericErrors[44];
				},
				mknod(parent, name, mode, dev) {
					return MEMFS.createNode(parent, name, mode, dev);
				},
				rename(old_node, new_dir, new_name) {
					if (FS.isDir(old_node.mode)) {
						var new_node;
						try {
							new_node = FS.lookupNode(new_dir, new_name);
						} catch (e) {}
						if (new_node) for (var i in new_node.contents) throw new FS.ErrnoError(55);
					}
					delete old_node.parent.contents[old_node.name];
					old_node.parent.timestamp = Date.now();
					old_node.name = new_name;
					new_dir.contents[new_name] = old_node;
					new_dir.timestamp = old_node.parent.timestamp;
				},
				unlink(parent, name) {
					delete parent.contents[name];
					parent.timestamp = Date.now();
				},
				rmdir(parent, name) {
					for (var i in FS.lookupNode(parent, name).contents) throw new FS.ErrnoError(55);
					delete parent.contents[name];
					parent.timestamp = Date.now();
				},
				readdir(node) {
					var entries = [".", ".."];
					for (var key of Object.keys(node.contents)) entries.push(key);
					return entries;
				},
				symlink(parent, newname, oldpath) {
					var node = MEMFS.createNode(parent, newname, 41471, 0);
					node.link = oldpath;
					return node;
				},
				readlink(node) {
					if (!FS.isLink(node.mode)) throw new FS.ErrnoError(28);
					return node.link;
				}
			},
			stream_ops: {
				read(stream, buffer, offset, length, position) {
					var contents = stream.node.contents;
					if (position >= stream.node.usedBytes) return 0;
					var size = Math.min(stream.node.usedBytes - position, length);
					if (size > 8 && contents.subarray) buffer.set(contents.subarray(position, position + size), offset);
					else for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
					return size;
				},
				write(stream, buffer, offset, length, position, canOwn) {
					if (buffer.buffer === HEAP8.buffer) canOwn = false;
					if (!length) return 0;
					var node = stream.node;
					node.timestamp = Date.now();
					if (buffer.subarray && (!node.contents || node.contents.subarray)) {
						if (canOwn) {
							node.contents = buffer.subarray(offset, offset + length);
							node.usedBytes = length;
							return length;
						} else if (node.usedBytes === 0 && position === 0) {
							node.contents = buffer.slice(offset, offset + length);
							node.usedBytes = length;
							return length;
						} else if (position + length <= node.usedBytes) {
							node.contents.set(buffer.subarray(offset, offset + length), position);
							return length;
						}
					}
					MEMFS.expandFileStorage(node, position + length);
					if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
					else for (var i = 0; i < length; i++) node.contents[position + i] = buffer[offset + i];
					node.usedBytes = Math.max(node.usedBytes, position + length);
					return length;
				},
				llseek(stream, offset, whence) {
					var position = offset;
					if (whence === 1) position += stream.position;
					else if (whence === 2) {
						if (FS.isFile(stream.node.mode)) position += stream.node.usedBytes;
					}
					if (position < 0) throw new FS.ErrnoError(28);
					return position;
				},
				allocate(stream, offset, length) {
					MEMFS.expandFileStorage(stream.node, offset + length);
					stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
				},
				mmap(stream, length, position, prot, flags) {
					if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
					var ptr;
					var allocated;
					var contents = stream.node.contents;
					if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
						allocated = false;
						ptr = contents.byteOffset;
					} else {
						if (position > 0 || position + length < contents.length) {
							if (contents.subarray) contents = contents.subarray(position, position + length);
							else contents = Array.prototype.slice.call(contents, position, position + length);
						}
						allocated = true;
						ptr = mmapAlloc(length);
						if (!ptr) throw new FS.ErrnoError(48);
						HEAP8.set(contents, ptr);
					}
					return {
						ptr,
						allocated
					};
				},
				msync(stream, buffer, offset, length, mmapFlags) {
					MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
					return 0;
				}
			}
		};
		var asyncLoad = (url, onload, onerror, noRunDep) => {
			var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : "";
			readAsync(url, (arrayBuffer) => {
				onload(new Uint8Array(arrayBuffer));
				if (dep) removeRunDependency(dep);
			}, (event) => {
				if (onerror) onerror();
				else throw `Loading data file "${url}" failed.`;
			});
			if (dep) addRunDependency(dep);
		};
		var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
			FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
		};
		var preloadPlugins = Module["preloadPlugins"] || [];
		var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
			if (typeof Browser != "undefined") Browser.init();
			var handled = false;
			preloadPlugins.forEach((plugin) => {
				if (handled) return;
				if (plugin["canHandle"](fullname)) {
					plugin["handle"](byteArray, fullname, finish, onerror);
					handled = true;
				}
			});
			return handled;
		};
		var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
			var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
			var dep = getUniqueRunDependency(`cp ${fullname}`);
			function processData(byteArray) {
				function finish(byteArray) {
					preFinish?.();
					if (!dontCreateFile) FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
					onload?.();
					removeRunDependency(dep);
				}
				if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
					onerror?.();
					removeRunDependency(dep);
				})) return;
				finish(byteArray);
			}
			addRunDependency(dep);
			if (typeof url == "string") asyncLoad(url, processData, onerror);
			else processData(url);
		};
		var FS_modeStringToFlags = (str) => {
			var flags = {
				r: 0,
				"r+": 2,
				w: 577,
				"w+": 578,
				a: 1089,
				"a+": 1090
			}[str];
			if (typeof flags == "undefined") throw new Error(`Unknown file open mode: ${str}`);
			return flags;
		};
		var FS_getMode = (canRead, canWrite) => {
			var mode = 0;
			if (canRead) mode |= 365;
			if (canWrite) mode |= 146;
			return mode;
		};
		var FS = {
			root: null,
			mounts: [],
			devices: {},
			streams: [],
			nextInode: 1,
			nameTable: null,
			currentPath: "/",
			initialized: false,
			ignorePermissions: true,
			ErrnoError: class {
				constructor(errno) {
					this.name = "ErrnoError";
					this.errno = errno;
				}
			},
			genericErrors: {},
			filesystems: null,
			syncFSRequests: 0,
			FSStream: class {
				constructor() {
					this.shared = {};
				}
				get object() {
					return this.node;
				}
				set object(val) {
					this.node = val;
				}
				get isRead() {
					return (this.flags & 2097155) !== 1;
				}
				get isWrite() {
					return (this.flags & 2097155) !== 0;
				}
				get isAppend() {
					return this.flags & 1024;
				}
				get flags() {
					return this.shared.flags;
				}
				set flags(val) {
					this.shared.flags = val;
				}
				get position() {
					return this.shared.position;
				}
				set position(val) {
					this.shared.position = val;
				}
			},
			FSNode: class {
				constructor(parent, name, mode, rdev) {
					if (!parent) parent = this;
					this.parent = parent;
					this.mount = parent.mount;
					this.mounted = null;
					this.id = FS.nextInode++;
					this.name = name;
					this.mode = mode;
					this.node_ops = {};
					this.stream_ops = {};
					this.rdev = rdev;
					this.readMode = 365;
					this.writeMode = 146;
				}
				get read() {
					return (this.mode & this.readMode) === this.readMode;
				}
				set read(val) {
					val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
				}
				get write() {
					return (this.mode & this.writeMode) === this.writeMode;
				}
				set write(val) {
					val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
				}
				get isFolder() {
					return FS.isDir(this.mode);
				}
				get isDevice() {
					return FS.isChrdev(this.mode);
				}
			},
			lookupPath(path, opts = {}) {
				path = PATH_FS.resolve(path);
				if (!path) return {
					path: "",
					node: null
				};
				opts = Object.assign({
					follow_mount: true,
					recurse_count: 0
				}, opts);
				if (opts.recurse_count > 8) throw new FS.ErrnoError(32);
				var parts = path.split("/").filter((p) => !!p);
				var current = FS.root;
				var current_path = "/";
				for (var i = 0; i < parts.length; i++) {
					var islast = i === parts.length - 1;
					if (islast && opts.parent) break;
					current = FS.lookupNode(current, parts[i]);
					current_path = PATH.join2(current_path, parts[i]);
					if (FS.isMountpoint(current)) {
						if (!islast || islast && opts.follow_mount) current = current.mounted.root;
					}
					if (!islast || opts.follow) {
						var count = 0;
						while (FS.isLink(current.mode)) {
							var link = FS.readlink(current_path);
							current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
							current = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 }).node;
							if (count++ > 40) throw new FS.ErrnoError(32);
						}
					}
				}
				return {
					path: current_path,
					node: current
				};
			},
			getPath(node) {
				var path;
				while (true) {
					if (FS.isRoot(node)) {
						var mount = node.mount.mountpoint;
						if (!path) return mount;
						return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
					}
					path = path ? `${node.name}/${path}` : node.name;
					node = node.parent;
				}
			},
			hashName(parentid, name) {
				var hash = 0;
				for (var i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
				return (parentid + hash >>> 0) % FS.nameTable.length;
			},
			hashAddNode(node) {
				var hash = FS.hashName(node.parent.id, node.name);
				node.name_next = FS.nameTable[hash];
				FS.nameTable[hash] = node;
			},
			hashRemoveNode(node) {
				var hash = FS.hashName(node.parent.id, node.name);
				if (FS.nameTable[hash] === node) FS.nameTable[hash] = node.name_next;
				else {
					var current = FS.nameTable[hash];
					while (current) {
						if (current.name_next === node) {
							current.name_next = node.name_next;
							break;
						}
						current = current.name_next;
					}
				}
			},
			lookupNode(parent, name) {
				var errCode = FS.mayLookup(parent);
				if (errCode) throw new FS.ErrnoError(errCode);
				var hash = FS.hashName(parent.id, name);
				for (var node = FS.nameTable[hash]; node; node = node.name_next) {
					var nodeName = node.name;
					if (node.parent.id === parent.id && nodeName === name) return node;
				}
				return FS.lookup(parent, name);
			},
			createNode(parent, name, mode, rdev) {
				var node = new FS.FSNode(parent, name, mode, rdev);
				FS.hashAddNode(node);
				return node;
			},
			destroyNode(node) {
				FS.hashRemoveNode(node);
			},
			isRoot(node) {
				return node === node.parent;
			},
			isMountpoint(node) {
				return !!node.mounted;
			},
			isFile(mode) {
				return (mode & 61440) === 32768;
			},
			isDir(mode) {
				return (mode & 61440) === 16384;
			},
			isLink(mode) {
				return (mode & 61440) === 40960;
			},
			isChrdev(mode) {
				return (mode & 61440) === 8192;
			},
			isBlkdev(mode) {
				return (mode & 61440) === 24576;
			},
			isFIFO(mode) {
				return (mode & 61440) === 4096;
			},
			isSocket(mode) {
				return (mode & 49152) === 49152;
			},
			flagsToPermissionString(flag) {
				var perms = [
					"r",
					"w",
					"rw"
				][flag & 3];
				if (flag & 512) perms += "w";
				return perms;
			},
			nodePermissions(node, perms) {
				if (FS.ignorePermissions) return 0;
				if (perms.includes("r") && !(node.mode & 292)) return 2;
				else if (perms.includes("w") && !(node.mode & 146)) return 2;
				else if (perms.includes("x") && !(node.mode & 73)) return 2;
				return 0;
			},
			mayLookup(dir) {
				if (!FS.isDir(dir.mode)) return 54;
				var errCode = FS.nodePermissions(dir, "x");
				if (errCode) return errCode;
				if (!dir.node_ops.lookup) return 2;
				return 0;
			},
			mayCreate(dir, name) {
				try {
					FS.lookupNode(dir, name);
					return 20;
				} catch (e) {}
				return FS.nodePermissions(dir, "wx");
			},
			mayDelete(dir, name, isdir) {
				var node;
				try {
					node = FS.lookupNode(dir, name);
				} catch (e) {
					return e.errno;
				}
				var errCode = FS.nodePermissions(dir, "wx");
				if (errCode) return errCode;
				if (isdir) {
					if (!FS.isDir(node.mode)) return 54;
					if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return 10;
				} else if (FS.isDir(node.mode)) return 31;
				return 0;
			},
			mayOpen(node, flags) {
				if (!node) return 44;
				if (FS.isLink(node.mode)) return 32;
				else if (FS.isDir(node.mode)) {
					if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) return 31;
				}
				return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
			},
			MAX_OPEN_FDS: 4096,
			nextfd() {
				for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) if (!FS.streams[fd]) return fd;
				throw new FS.ErrnoError(33);
			},
			getStreamChecked(fd) {
				var stream = FS.getStream(fd);
				if (!stream) throw new FS.ErrnoError(8);
				return stream;
			},
			getStream: (fd) => FS.streams[fd],
			createStream(stream, fd = -1) {
				stream = Object.assign(new FS.FSStream(), stream);
				if (fd == -1) fd = FS.nextfd();
				stream.fd = fd;
				FS.streams[fd] = stream;
				return stream;
			},
			closeStream(fd) {
				FS.streams[fd] = null;
			},
			dupStream(origStream, fd = -1) {
				var stream = FS.createStream(origStream, fd);
				stream.stream_ops?.dup?.(stream);
				return stream;
			},
			chrdev_stream_ops: {
				open(stream) {
					stream.stream_ops = FS.getDevice(stream.node.rdev).stream_ops;
					stream.stream_ops.open?.(stream);
				},
				llseek() {
					throw new FS.ErrnoError(70);
				}
			},
			major: (dev) => dev >> 8,
			minor: (dev) => dev & 255,
			makedev: (ma, mi) => ma << 8 | mi,
			registerDevice(dev, ops) {
				FS.devices[dev] = { stream_ops: ops };
			},
			getDevice: (dev) => FS.devices[dev],
			getMounts(mount) {
				var mounts = [];
				var check = [mount];
				while (check.length) {
					var m = check.pop();
					mounts.push(m);
					check.push(...m.mounts);
				}
				return mounts;
			},
			syncfs(populate, callback) {
				if (typeof populate == "function") {
					callback = populate;
					populate = false;
				}
				FS.syncFSRequests++;
				if (FS.syncFSRequests > 1) err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
				var mounts = FS.getMounts(FS.root.mount);
				var completed = 0;
				function doCallback(errCode) {
					FS.syncFSRequests--;
					return callback(errCode);
				}
				function done(errCode) {
					if (errCode) {
						if (!done.errored) {
							done.errored = true;
							return doCallback(errCode);
						}
						return;
					}
					if (++completed >= mounts.length) doCallback(null);
				}
				mounts.forEach((mount) => {
					if (!mount.type.syncfs) return done(null);
					mount.type.syncfs(mount, populate, done);
				});
			},
			mount(type, opts, mountpoint) {
				var root = mountpoint === "/";
				var pseudo = !mountpoint;
				var node;
				if (root && FS.root) throw new FS.ErrnoError(10);
				else if (!root && !pseudo) {
					var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
					mountpoint = lookup.path;
					node = lookup.node;
					if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
					if (!FS.isDir(node.mode)) throw new FS.ErrnoError(54);
				}
				var mount = {
					type,
					opts,
					mountpoint,
					mounts: []
				};
				var mountRoot = type.mount(mount);
				mountRoot.mount = mount;
				mount.root = mountRoot;
				if (root) FS.root = mountRoot;
				else if (node) {
					node.mounted = mount;
					if (node.mount) node.mount.mounts.push(mount);
				}
				return mountRoot;
			},
			unmount(mountpoint) {
				var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
				if (!FS.isMountpoint(lookup.node)) throw new FS.ErrnoError(28);
				var node = lookup.node;
				var mount = node.mounted;
				var mounts = FS.getMounts(mount);
				Object.keys(FS.nameTable).forEach((hash) => {
					var current = FS.nameTable[hash];
					while (current) {
						var next = current.name_next;
						if (mounts.includes(current.mount)) FS.destroyNode(current);
						current = next;
					}
				});
				node.mounted = null;
				var idx = node.mount.mounts.indexOf(mount);
				node.mount.mounts.splice(idx, 1);
			},
			lookup(parent, name) {
				return parent.node_ops.lookup(parent, name);
			},
			mknod(path, mode, dev) {
				var parent = FS.lookupPath(path, { parent: true }).node;
				var name = PATH.basename(path);
				if (!name || name === "." || name === "..") throw new FS.ErrnoError(28);
				var errCode = FS.mayCreate(parent, name);
				if (errCode) throw new FS.ErrnoError(errCode);
				if (!parent.node_ops.mknod) throw new FS.ErrnoError(63);
				return parent.node_ops.mknod(parent, name, mode, dev);
			},
			create(path, mode) {
				mode = mode !== void 0 ? mode : 438;
				mode &= 4095;
				mode |= 32768;
				return FS.mknod(path, mode, 0);
			},
			mkdir(path, mode) {
				mode = mode !== void 0 ? mode : 511;
				mode &= 1023;
				mode |= 16384;
				return FS.mknod(path, mode, 0);
			},
			mkdirTree(path, mode) {
				var dirs = path.split("/");
				var d = "";
				for (var i = 0; i < dirs.length; ++i) {
					if (!dirs[i]) continue;
					d += "/" + dirs[i];
					try {
						FS.mkdir(d, mode);
					} catch (e) {
						if (e.errno != 20) throw e;
					}
				}
			},
			mkdev(path, mode, dev) {
				if (typeof dev == "undefined") {
					dev = mode;
					mode = 438;
				}
				mode |= 8192;
				return FS.mknod(path, mode, dev);
			},
			symlink(oldpath, newpath) {
				if (!PATH_FS.resolve(oldpath)) throw new FS.ErrnoError(44);
				var parent = FS.lookupPath(newpath, { parent: true }).node;
				if (!parent) throw new FS.ErrnoError(44);
				var newname = PATH.basename(newpath);
				var errCode = FS.mayCreate(parent, newname);
				if (errCode) throw new FS.ErrnoError(errCode);
				if (!parent.node_ops.symlink) throw new FS.ErrnoError(63);
				return parent.node_ops.symlink(parent, newname, oldpath);
			},
			rename(old_path, new_path) {
				var old_dirname = PATH.dirname(old_path);
				var new_dirname = PATH.dirname(new_path);
				var old_name = PATH.basename(old_path);
				var new_name = PATH.basename(new_path);
				var lookup = FS.lookupPath(old_path, { parent: true }), old_dir = lookup.node, new_dir;
				lookup = FS.lookupPath(new_path, { parent: true });
				new_dir = lookup.node;
				if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
				if (old_dir.mount !== new_dir.mount) throw new FS.ErrnoError(75);
				var old_node = FS.lookupNode(old_dir, old_name);
				var relative = PATH_FS.relative(old_path, new_dirname);
				if (relative.charAt(0) !== ".") throw new FS.ErrnoError(28);
				relative = PATH_FS.relative(new_path, old_dirname);
				if (relative.charAt(0) !== ".") throw new FS.ErrnoError(55);
				var new_node;
				try {
					new_node = FS.lookupNode(new_dir, new_name);
				} catch (e) {}
				if (old_node === new_node) return;
				var isdir = FS.isDir(old_node.mode);
				var errCode = FS.mayDelete(old_dir, old_name, isdir);
				if (errCode) throw new FS.ErrnoError(errCode);
				errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
				if (errCode) throw new FS.ErrnoError(errCode);
				if (!old_dir.node_ops.rename) throw new FS.ErrnoError(63);
				if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) throw new FS.ErrnoError(10);
				if (new_dir !== old_dir) {
					errCode = FS.nodePermissions(old_dir, "w");
					if (errCode) throw new FS.ErrnoError(errCode);
				}
				FS.hashRemoveNode(old_node);
				try {
					old_dir.node_ops.rename(old_node, new_dir, new_name);
					old_node.parent = new_dir;
				} catch (e) {
					throw e;
				} finally {
					FS.hashAddNode(old_node);
				}
			},
			rmdir(path) {
				var parent = FS.lookupPath(path, { parent: true }).node;
				var name = PATH.basename(path);
				var node = FS.lookupNode(parent, name);
				var errCode = FS.mayDelete(parent, name, true);
				if (errCode) throw new FS.ErrnoError(errCode);
				if (!parent.node_ops.rmdir) throw new FS.ErrnoError(63);
				if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
				parent.node_ops.rmdir(parent, name);
				FS.destroyNode(node);
			},
			readdir(path) {
				var node = FS.lookupPath(path, { follow: true }).node;
				if (!node.node_ops.readdir) throw new FS.ErrnoError(54);
				return node.node_ops.readdir(node);
			},
			unlink(path) {
				var parent = FS.lookupPath(path, { parent: true }).node;
				if (!parent) throw new FS.ErrnoError(44);
				var name = PATH.basename(path);
				var node = FS.lookupNode(parent, name);
				var errCode = FS.mayDelete(parent, name, false);
				if (errCode) throw new FS.ErrnoError(errCode);
				if (!parent.node_ops.unlink) throw new FS.ErrnoError(63);
				if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
				parent.node_ops.unlink(parent, name);
				FS.destroyNode(node);
			},
			readlink(path) {
				var link = FS.lookupPath(path).node;
				if (!link) throw new FS.ErrnoError(44);
				if (!link.node_ops.readlink) throw new FS.ErrnoError(28);
				return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
			},
			stat(path, dontFollow) {
				var node = FS.lookupPath(path, { follow: !dontFollow }).node;
				if (!node) throw new FS.ErrnoError(44);
				if (!node.node_ops.getattr) throw new FS.ErrnoError(63);
				return node.node_ops.getattr(node);
			},
			lstat(path) {
				return FS.stat(path, true);
			},
			chmod(path, mode, dontFollow) {
				var node;
				if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
				else node = path;
				if (!node.node_ops.setattr) throw new FS.ErrnoError(63);
				node.node_ops.setattr(node, {
					mode: mode & 4095 | node.mode & -4096,
					timestamp: Date.now()
				});
			},
			lchmod(path, mode) {
				FS.chmod(path, mode, true);
			},
			fchmod(fd, mode) {
				var stream = FS.getStreamChecked(fd);
				FS.chmod(stream.node, mode);
			},
			chown(path, uid, gid, dontFollow) {
				var node;
				if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
				else node = path;
				if (!node.node_ops.setattr) throw new FS.ErrnoError(63);
				node.node_ops.setattr(node, { timestamp: Date.now() });
			},
			lchown(path, uid, gid) {
				FS.chown(path, uid, gid, true);
			},
			fchown(fd, uid, gid) {
				var stream = FS.getStreamChecked(fd);
				FS.chown(stream.node, uid, gid);
			},
			truncate(path, len) {
				if (len < 0) throw new FS.ErrnoError(28);
				var node;
				if (typeof path == "string") node = FS.lookupPath(path, { follow: true }).node;
				else node = path;
				if (!node.node_ops.setattr) throw new FS.ErrnoError(63);
				if (FS.isDir(node.mode)) throw new FS.ErrnoError(31);
				if (!FS.isFile(node.mode)) throw new FS.ErrnoError(28);
				var errCode = FS.nodePermissions(node, "w");
				if (errCode) throw new FS.ErrnoError(errCode);
				node.node_ops.setattr(node, {
					size: len,
					timestamp: Date.now()
				});
			},
			ftruncate(fd, len) {
				var stream = FS.getStreamChecked(fd);
				if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(28);
				FS.truncate(stream.node, len);
			},
			utime(path, atime, mtime) {
				var node = FS.lookupPath(path, { follow: true }).node;
				node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) });
			},
			open(path, flags, mode) {
				if (path === "") throw new FS.ErrnoError(44);
				flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
				if (flags & 64) {
					mode = typeof mode == "undefined" ? 438 : mode;
					mode = mode & 4095 | 32768;
				} else mode = 0;
				var node;
				if (typeof path == "object") node = path;
				else {
					path = PATH.normalize(path);
					try {
						node = FS.lookupPath(path, { follow: !(flags & 131072) }).node;
					} catch (e) {}
				}
				var created = false;
				if (flags & 64) {
					if (node) {
						if (flags & 128) throw new FS.ErrnoError(20);
					} else {
						node = FS.mknod(path, mode, 0);
						created = true;
					}
				}
				if (!node) throw new FS.ErrnoError(44);
				if (FS.isChrdev(node.mode)) flags &= -513;
				if (flags & 65536 && !FS.isDir(node.mode)) throw new FS.ErrnoError(54);
				if (!created) {
					var errCode = FS.mayOpen(node, flags);
					if (errCode) throw new FS.ErrnoError(errCode);
				}
				if (flags & 512 && !created) FS.truncate(node, 0);
				flags &= -131713;
				var stream = FS.createStream({
					node,
					path: FS.getPath(node),
					flags,
					seekable: true,
					position: 0,
					stream_ops: node.stream_ops,
					ungotten: [],
					error: false
				});
				if (stream.stream_ops.open) stream.stream_ops.open(stream);
				if (Module["logReadFiles"] && !(flags & 1)) {
					if (!FS.readFiles) FS.readFiles = {};
					if (!(path in FS.readFiles)) FS.readFiles[path] = 1;
				}
				return stream;
			},
			close(stream) {
				if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
				if (stream.getdents) stream.getdents = null;
				try {
					if (stream.stream_ops.close) stream.stream_ops.close(stream);
				} catch (e) {
					throw e;
				} finally {
					FS.closeStream(stream.fd);
				}
				stream.fd = null;
			},
			isClosed(stream) {
				return stream.fd === null;
			},
			llseek(stream, offset, whence) {
				if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
				if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.ErrnoError(70);
				if (whence != 0 && whence != 1 && whence != 2) throw new FS.ErrnoError(28);
				stream.position = stream.stream_ops.llseek(stream, offset, whence);
				stream.ungotten = [];
				return stream.position;
			},
			read(stream, buffer, offset, length, position) {
				if (length < 0 || position < 0) throw new FS.ErrnoError(28);
				if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
				if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(8);
				if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
				if (!stream.stream_ops.read) throw new FS.ErrnoError(28);
				var seeking = typeof position != "undefined";
				if (!seeking) position = stream.position;
				else if (!stream.seekable) throw new FS.ErrnoError(70);
				var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
				if (!seeking) stream.position += bytesRead;
				return bytesRead;
			},
			write(stream, buffer, offset, length, position, canOwn) {
				if (length < 0 || position < 0) throw new FS.ErrnoError(28);
				if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
				if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
				if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
				if (!stream.stream_ops.write) throw new FS.ErrnoError(28);
				if (stream.seekable && stream.flags & 1024) FS.llseek(stream, 0, 2);
				var seeking = typeof position != "undefined";
				if (!seeking) position = stream.position;
				else if (!stream.seekable) throw new FS.ErrnoError(70);
				var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
				if (!seeking) stream.position += bytesWritten;
				return bytesWritten;
			},
			allocate(stream, offset, length) {
				if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
				if (offset < 0 || length <= 0) throw new FS.ErrnoError(28);
				if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
				if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) throw new FS.ErrnoError(43);
				if (!stream.stream_ops.allocate) throw new FS.ErrnoError(138);
				stream.stream_ops.allocate(stream, offset, length);
			},
			mmap(stream, length, position, prot, flags) {
				if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) throw new FS.ErrnoError(2);
				if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(2);
				if (!stream.stream_ops.mmap) throw new FS.ErrnoError(43);
				return stream.stream_ops.mmap(stream, length, position, prot, flags);
			},
			msync(stream, buffer, offset, length, mmapFlags) {
				if (!stream.stream_ops.msync) return 0;
				return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
			},
			ioctl(stream, cmd, arg) {
				if (!stream.stream_ops.ioctl) throw new FS.ErrnoError(59);
				return stream.stream_ops.ioctl(stream, cmd, arg);
			},
			readFile(path, opts = {}) {
				opts.flags = opts.flags || 0;
				opts.encoding = opts.encoding || "binary";
				if (opts.encoding !== "utf8" && opts.encoding !== "binary") throw new Error(`Invalid encoding type "${opts.encoding}"`);
				var ret;
				var stream = FS.open(path, opts.flags);
				var length = FS.stat(path).size;
				var buf = new Uint8Array(length);
				FS.read(stream, buf, 0, length, 0);
				if (opts.encoding === "utf8") ret = UTF8ArrayToString(buf, 0);
				else if (opts.encoding === "binary") ret = buf;
				FS.close(stream);
				return ret;
			},
			writeFile(path, data, opts = {}) {
				opts.flags = opts.flags || 577;
				var stream = FS.open(path, opts.flags, opts.mode);
				if (typeof data == "string") {
					var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
					var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
					FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
				} else if (ArrayBuffer.isView(data)) FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
				else throw new Error("Unsupported data type");
				FS.close(stream);
			},
			cwd: () => FS.currentPath,
			chdir(path) {
				var lookup = FS.lookupPath(path, { follow: true });
				if (lookup.node === null) throw new FS.ErrnoError(44);
				if (!FS.isDir(lookup.node.mode)) throw new FS.ErrnoError(54);
				var errCode = FS.nodePermissions(lookup.node, "x");
				if (errCode) throw new FS.ErrnoError(errCode);
				FS.currentPath = lookup.path;
			},
			createDefaultDirectories() {
				FS.mkdir("/tmp");
				FS.mkdir("/home");
				FS.mkdir("/home/web_user");
			},
			createDefaultDevices() {
				FS.mkdir("/dev");
				FS.registerDevice(FS.makedev(1, 3), {
					read: () => 0,
					write: (stream, buffer, offset, length, pos) => length
				});
				FS.mkdev("/dev/null", FS.makedev(1, 3));
				TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
				TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
				FS.mkdev("/dev/tty", FS.makedev(5, 0));
				FS.mkdev("/dev/tty1", FS.makedev(6, 0));
				var randomBuffer = /* @__PURE__ */ new Uint8Array(1024), randomLeft = 0;
				var randomByte = () => {
					if (randomLeft === 0) randomLeft = randomFill(randomBuffer).byteLength;
					return randomBuffer[--randomLeft];
				};
				FS.createDevice("/dev", "random", randomByte);
				FS.createDevice("/dev", "urandom", randomByte);
				FS.mkdir("/dev/shm");
				FS.mkdir("/dev/shm/tmp");
			},
			createSpecialDirectories() {
				FS.mkdir("/proc");
				var proc_self = FS.mkdir("/proc/self");
				FS.mkdir("/proc/self/fd");
				FS.mount({ mount() {
					var node = FS.createNode(proc_self, "fd", 16895, 73);
					node.node_ops = { lookup(parent, name) {
						var fd = +name;
						var stream = FS.getStreamChecked(fd);
						var ret = {
							parent: null,
							mount: { mountpoint: "fake" },
							node_ops: { readlink: () => stream.path }
						};
						ret.parent = ret;
						return ret;
					} };
					return node;
				} }, {}, "/proc/self/fd");
			},
			createStandardStreams() {
				if (Module["stdin"]) FS.createDevice("/dev", "stdin", Module["stdin"]);
				else FS.symlink("/dev/tty", "/dev/stdin");
				if (Module["stdout"]) FS.createDevice("/dev", "stdout", null, Module["stdout"]);
				else FS.symlink("/dev/tty", "/dev/stdout");
				if (Module["stderr"]) FS.createDevice("/dev", "stderr", null, Module["stderr"]);
				else FS.symlink("/dev/tty1", "/dev/stderr");
				FS.open("/dev/stdin", 0);
				FS.open("/dev/stdout", 1);
				FS.open("/dev/stderr", 1);
			},
			staticInit() {
				[44].forEach((code) => {
					FS.genericErrors[code] = new FS.ErrnoError(code);
					FS.genericErrors[code].stack = "<generic error, no stack>";
				});
				FS.nameTable = new Array(4096);
				FS.mount(MEMFS, {}, "/");
				FS.createDefaultDirectories();
				FS.createDefaultDevices();
				FS.createSpecialDirectories();
				FS.filesystems = { MEMFS };
			},
			init(input, output, error) {
				FS.init.initialized = true;
				Module["stdin"] = input || Module["stdin"];
				Module["stdout"] = output || Module["stdout"];
				Module["stderr"] = error || Module["stderr"];
				FS.createStandardStreams();
			},
			quit() {
				FS.init.initialized = false;
				for (var i = 0; i < FS.streams.length; i++) {
					var stream = FS.streams[i];
					if (!stream) continue;
					FS.close(stream);
				}
			},
			findObject(path, dontResolveLastLink) {
				var ret = FS.analyzePath(path, dontResolveLastLink);
				if (!ret.exists) return null;
				return ret.object;
			},
			analyzePath(path, dontResolveLastLink) {
				try {
					var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
					path = lookup.path;
				} catch (e) {}
				var ret = {
					isRoot: false,
					exists: false,
					error: 0,
					name: null,
					path: null,
					object: null,
					parentExists: false,
					parentPath: null,
					parentObject: null
				};
				try {
					var lookup = FS.lookupPath(path, { parent: true });
					ret.parentExists = true;
					ret.parentPath = lookup.path;
					ret.parentObject = lookup.node;
					ret.name = PATH.basename(path);
					lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
					ret.exists = true;
					ret.path = lookup.path;
					ret.object = lookup.node;
					ret.name = lookup.node.name;
					ret.isRoot = lookup.path === "/";
				} catch (e) {
					ret.error = e.errno;
				}
				return ret;
			},
			createPath(parent, path, canRead, canWrite) {
				parent = typeof parent == "string" ? parent : FS.getPath(parent);
				var parts = path.split("/").reverse();
				while (parts.length) {
					var part = parts.pop();
					if (!part) continue;
					var current = PATH.join2(parent, part);
					try {
						FS.mkdir(current);
					} catch (e) {}
					parent = current;
				}
				return current;
			},
			createFile(parent, name, properties, canRead, canWrite) {
				var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
				var mode = FS_getMode(canRead, canWrite);
				return FS.create(path, mode);
			},
			createDataFile(parent, name, data, canRead, canWrite, canOwn) {
				var path = name;
				if (parent) {
					parent = typeof parent == "string" ? parent : FS.getPath(parent);
					path = name ? PATH.join2(parent, name) : parent;
				}
				var mode = FS_getMode(canRead, canWrite);
				var node = FS.create(path, mode);
				if (data) {
					if (typeof data == "string") {
						var arr = new Array(data.length);
						for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
						data = arr;
					}
					FS.chmod(node, mode | 146);
					var stream = FS.open(node, 577);
					FS.write(stream, data, 0, data.length, 0, canOwn);
					FS.close(stream);
					FS.chmod(node, mode);
				}
			},
			createDevice(parent, name, input, output) {
				var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
				var mode = FS_getMode(!!input, !!output);
				if (!FS.createDevice.major) FS.createDevice.major = 64;
				var dev = FS.makedev(FS.createDevice.major++, 0);
				FS.registerDevice(dev, {
					open(stream) {
						stream.seekable = false;
					},
					close(stream) {
						if (output?.buffer?.length) output(10);
					},
					read(stream, buffer, offset, length, pos) {
						var bytesRead = 0;
						for (var i = 0; i < length; i++) {
							var result;
							try {
								result = input();
							} catch (e) {
								throw new FS.ErrnoError(29);
							}
							if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
							if (result === null || result === void 0) break;
							bytesRead++;
							buffer[offset + i] = result;
						}
						if (bytesRead) stream.node.timestamp = Date.now();
						return bytesRead;
					},
					write(stream, buffer, offset, length, pos) {
						for (var i = 0; i < length; i++) try {
							output(buffer[offset + i]);
						} catch (e) {
							throw new FS.ErrnoError(29);
						}
						if (length) stream.node.timestamp = Date.now();
						return i;
					}
				});
				return FS.mkdev(path, mode, dev);
			},
			forceLoadFile(obj) {
				if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
				if (typeof XMLHttpRequest != "undefined") throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
				else if (read_) try {
					obj.contents = intArrayFromString(read_(obj.url), true);
					obj.usedBytes = obj.contents.length;
				} catch (e) {
					throw new FS.ErrnoError(29);
				}
				else throw new Error("Cannot load without read() or XMLHttpRequest.");
			},
			createLazyFile(parent, name, url, canRead, canWrite) {
				class LazyUint8Array {
					constructor() {
						this.lengthKnown = false;
						this.chunks = [];
					}
					get(idx) {
						if (idx > this.length - 1 || idx < 0) return;
						var chunkOffset = idx % this.chunkSize;
						var chunkNum = idx / this.chunkSize | 0;
						return this.getter(chunkNum)[chunkOffset];
					}
					setDataGetter(getter) {
						this.getter = getter;
					}
					cacheLength() {
						var xhr = new XMLHttpRequest();
						xhr.open("HEAD", url, false);
						xhr.send(null);
						if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
						var datalength = Number(xhr.getResponseHeader("Content-length"));
						var header;
						var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
						var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
						var chunkSize = 1048576;
						if (!hasByteServing) chunkSize = datalength;
						var doXHR = (from, to) => {
							if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
							if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
							var xhr = new XMLHttpRequest();
							xhr.open("GET", url, false);
							if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
							xhr.responseType = "arraybuffer";
							if (xhr.overrideMimeType) xhr.overrideMimeType("text/plain; charset=x-user-defined");
							xhr.send(null);
							if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
							if (xhr.response !== void 0) return new Uint8Array(xhr.response || []);
							return intArrayFromString(xhr.responseText || "", true);
						};
						var lazyArray = this;
						lazyArray.setDataGetter((chunkNum) => {
							var start = chunkNum * chunkSize;
							var end = (chunkNum + 1) * chunkSize - 1;
							end = Math.min(end, datalength - 1);
							if (typeof lazyArray.chunks[chunkNum] == "undefined") lazyArray.chunks[chunkNum] = doXHR(start, end);
							if (typeof lazyArray.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
							return lazyArray.chunks[chunkNum];
						});
						if (usesGzip || !datalength) {
							chunkSize = datalength = 1;
							datalength = this.getter(0).length;
							chunkSize = datalength;
							out("LazyFiles on gzip forces download of the whole file when length is accessed");
						}
						this._length = datalength;
						this._chunkSize = chunkSize;
						this.lengthKnown = true;
					}
					get length() {
						if (!this.lengthKnown) this.cacheLength();
						return this._length;
					}
					get chunkSize() {
						if (!this.lengthKnown) this.cacheLength();
						return this._chunkSize;
					}
				}
				if (typeof XMLHttpRequest != "undefined") {
					if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
					var properties = {
						isDevice: false,
						contents: new LazyUint8Array()
					};
				} else var properties = {
					isDevice: false,
					url
				};
				var node = FS.createFile(parent, name, properties, canRead, canWrite);
				if (properties.contents) node.contents = properties.contents;
				else if (properties.url) {
					node.contents = null;
					node.url = properties.url;
				}
				Object.defineProperties(node, { usedBytes: { get: function() {
					return this.contents.length;
				} } });
				var stream_ops = {};
				Object.keys(node.stream_ops).forEach((key) => {
					var fn = node.stream_ops[key];
					stream_ops[key] = (...args) => {
						FS.forceLoadFile(node);
						return fn(...args);
					};
				});
				function writeChunks(stream, buffer, offset, length, position) {
					var contents = stream.node.contents;
					if (position >= contents.length) return 0;
					var size = Math.min(contents.length - position, length);
					if (contents.slice) for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
					else for (var i = 0; i < size; i++) buffer[offset + i] = contents.get(position + i);
					return size;
				}
				stream_ops.read = (stream, buffer, offset, length, position) => {
					FS.forceLoadFile(node);
					return writeChunks(stream, buffer, offset, length, position);
				};
				stream_ops.mmap = (stream, length, position, prot, flags) => {
					FS.forceLoadFile(node);
					var ptr = mmapAlloc(length);
					if (!ptr) throw new FS.ErrnoError(48);
					writeChunks(stream, HEAP8, ptr, length, position);
					return {
						ptr,
						allocated: true
					};
				};
				node.stream_ops = stream_ops;
				return node;
			}
		};
		var SYSCALLS = {
			DEFAULT_POLLMASK: 5,
			calculateAt(dirfd, path, allowEmpty) {
				if (PATH.isAbs(path)) return path;
				var dir;
				if (dirfd === -100) dir = FS.cwd();
				else dir = SYSCALLS.getStreamFromFD(dirfd).path;
				if (path.length == 0) {
					if (!allowEmpty) throw new FS.ErrnoError(44);
					return dir;
				}
				return PATH.join2(dir, path);
			},
			doStat(func, path, buf) {
				var stat = func(path);
				HEAP32[buf >> 2] = stat.dev;
				HEAP32[buf + 4 >> 2] = stat.mode;
				HEAPU32[buf + 8 >> 2] = stat.nlink;
				HEAP32[buf + 12 >> 2] = stat.uid;
				HEAP32[buf + 16 >> 2] = stat.gid;
				HEAP32[buf + 20 >> 2] = stat.rdev;
				tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 24 >> 2] = tempI64[0], HEAP32[buf + 28 >> 2] = tempI64[1];
				HEAP32[buf + 32 >> 2] = 4096;
				HEAP32[buf + 36 >> 2] = stat.blocks;
				var atime = stat.atime.getTime();
				var mtime = stat.mtime.getTime();
				var ctime = stat.ctime.getTime();
				tempI64 = [Math.floor(atime / 1e3) >>> 0, (tempDouble = Math.floor(atime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
				HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3;
				tempI64 = [Math.floor(mtime / 1e3) >>> 0, (tempDouble = Math.floor(mtime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 56 >> 2] = tempI64[0], HEAP32[buf + 60 >> 2] = tempI64[1];
				HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3;
				tempI64 = [Math.floor(ctime / 1e3) >>> 0, (tempDouble = Math.floor(ctime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 72 >> 2] = tempI64[0], HEAP32[buf + 76 >> 2] = tempI64[1];
				HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3;
				tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 88 >> 2] = tempI64[0], HEAP32[buf + 92 >> 2] = tempI64[1];
				return 0;
			},
			doMsync(addr, stream, len, flags, offset) {
				if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
				if (flags & 2) return 0;
				var buffer = HEAPU8.slice(addr, addr + len);
				FS.msync(stream, buffer, offset, len, flags);
			},
			getStreamFromFD(fd) {
				return FS.getStreamChecked(fd);
			},
			varargs: void 0,
			getStr(ptr) {
				return UTF8ToString(ptr);
			}
		};
		function ___syscall_chmod(path, mode) {
			try {
				path = SYSCALLS.getStr(path);
				FS.chmod(path, mode);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_faccessat(dirfd, path, amode, flags) {
			try {
				path = SYSCALLS.getStr(path);
				path = SYSCALLS.calculateAt(dirfd, path);
				if (amode & -8) return -28;
				var node = FS.lookupPath(path, { follow: true }).node;
				if (!node) return -44;
				var perms = "";
				if (amode & 4) perms += "r";
				if (amode & 2) perms += "w";
				if (amode & 1) perms += "x";
				if (perms && FS.nodePermissions(node, perms)) return -2;
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_fchmod(fd, mode) {
			try {
				FS.fchmod(fd, mode);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_fchown32(fd, owner, group) {
			try {
				FS.fchown(fd, owner, group);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function syscallGetVarargI() {
			var ret = HEAP32[+SYSCALLS.varargs >> 2];
			SYSCALLS.varargs += 4;
			return ret;
		}
		var syscallGetVarargP = syscallGetVarargI;
		function ___syscall_fcntl64(fd, cmd, varargs) {
			SYSCALLS.varargs = varargs;
			try {
				var stream = SYSCALLS.getStreamFromFD(fd);
				switch (cmd) {
					case 0:
						var arg = syscallGetVarargI();
						if (arg < 0) return -28;
						while (FS.streams[arg]) arg++;
						return FS.dupStream(stream, arg).fd;
					case 1:
					case 2: return 0;
					case 3: return stream.flags;
					case 4:
						var arg = syscallGetVarargI();
						stream.flags |= arg;
						return 0;
					case 12:
						var arg = syscallGetVarargP();
						var offset = 0;
						HEAP16[arg + offset >> 1] = 2;
						return 0;
					case 13:
					case 14: return 0;
				}
				return -28;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_fstat64(fd, buf) {
			try {
				var stream = SYSCALLS.getStreamFromFD(fd);
				return SYSCALLS.doStat(FS.stat, stream.path, buf);
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		var convertI32PairToI53Checked = (lo, hi) => hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
		function ___syscall_ftruncate64(fd, length_low, length_high) {
			var length = convertI32PairToI53Checked(length_low, length_high);
			try {
				if (isNaN(length)) return 61;
				FS.ftruncate(fd, length);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
		function ___syscall_getcwd(buf, size) {
			try {
				if (size === 0) return -28;
				var cwd = FS.cwd();
				var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
				if (size < cwdLengthInBytes) return -68;
				stringToUTF8(cwd, buf, size);
				return cwdLengthInBytes;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_lstat64(path, buf) {
			try {
				path = SYSCALLS.getStr(path);
				return SYSCALLS.doStat(FS.lstat, path, buf);
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_mkdirat(dirfd, path, mode) {
			try {
				path = SYSCALLS.getStr(path);
				path = SYSCALLS.calculateAt(dirfd, path);
				path = PATH.normalize(path);
				if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
				FS.mkdir(path, mode, 0);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_newfstatat(dirfd, path, buf, flags) {
			try {
				path = SYSCALLS.getStr(path);
				var nofollow = flags & 256;
				var allowEmpty = flags & 4096;
				flags = flags & -6401;
				path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
				return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_openat(dirfd, path, flags, varargs) {
			SYSCALLS.varargs = varargs;
			try {
				path = SYSCALLS.getStr(path);
				path = SYSCALLS.calculateAt(dirfd, path);
				var mode = varargs ? syscallGetVarargI() : 0;
				return FS.open(path, flags, mode).fd;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
			try {
				path = SYSCALLS.getStr(path);
				path = SYSCALLS.calculateAt(dirfd, path);
				if (bufsize <= 0) return -28;
				var ret = FS.readlink(path);
				var len = Math.min(bufsize, lengthBytesUTF8(ret));
				var endChar = HEAP8[buf + len];
				stringToUTF8(ret, buf, bufsize + 1);
				HEAP8[buf + len] = endChar;
				return len;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_rmdir(path) {
			try {
				path = SYSCALLS.getStr(path);
				FS.rmdir(path);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_stat64(path, buf) {
			try {
				path = SYSCALLS.getStr(path);
				return SYSCALLS.doStat(FS.stat, path, buf);
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function ___syscall_unlinkat(dirfd, path, flags) {
			try {
				path = SYSCALLS.getStr(path);
				path = SYSCALLS.calculateAt(dirfd, path);
				if (flags === 0) FS.unlink(path);
				else if (flags === 512) FS.rmdir(path);
				else abort("Invalid flags passed to unlinkat");
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		var readI53FromI64 = (ptr) => HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
		function ___syscall_utimensat(dirfd, path, times, flags) {
			try {
				path = SYSCALLS.getStr(path);
				path = SYSCALLS.calculateAt(dirfd, path, true);
				if (!times) {
					var atime = Date.now();
					var mtime = atime;
				} else {
					var seconds = readI53FromI64(times);
					var nanoseconds = HEAP32[times + 8 >> 2];
					atime = seconds * 1e3 + nanoseconds / 1e6;
					times += 16;
					seconds = readI53FromI64(times);
					nanoseconds = HEAP32[times + 8 >> 2];
					mtime = seconds * 1e3 + nanoseconds / 1e6;
				}
				FS.utime(path, atime, mtime);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
		var MONTH_DAYS_LEAP_CUMULATIVE = [
			0,
			31,
			60,
			91,
			121,
			152,
			182,
			213,
			244,
			274,
			305,
			335
		];
		var MONTH_DAYS_REGULAR_CUMULATIVE = [
			0,
			31,
			59,
			90,
			120,
			151,
			181,
			212,
			243,
			273,
			304,
			334
		];
		var ydayFromDate = (date) => {
			return (isLeapYear(date.getFullYear()) ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE)[date.getMonth()] + date.getDate() - 1;
		};
		function __localtime_js(time_low, time_high, tmPtr) {
			var time = convertI32PairToI53Checked(time_low, time_high);
			var date = /* @__PURE__ */ new Date(time * 1e3);
			HEAP32[tmPtr >> 2] = date.getSeconds();
			HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
			HEAP32[tmPtr + 8 >> 2] = date.getHours();
			HEAP32[tmPtr + 12 >> 2] = date.getDate();
			HEAP32[tmPtr + 16 >> 2] = date.getMonth();
			HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
			HEAP32[tmPtr + 24 >> 2] = date.getDay();
			var yday = ydayFromDate(date) | 0;
			HEAP32[tmPtr + 28 >> 2] = yday;
			HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
			var start = new Date(date.getFullYear(), 0, 1);
			var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
			var winterOffset = start.getTimezoneOffset();
			var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
			HEAP32[tmPtr + 32 >> 2] = dst;
		}
		function __mmap_js(len, prot, flags, fd, offset_low, offset_high, allocated, addr) {
			var offset = convertI32PairToI53Checked(offset_low, offset_high);
			try {
				if (isNaN(offset)) return 61;
				var stream = SYSCALLS.getStreamFromFD(fd);
				var res = FS.mmap(stream, len, offset, prot, flags);
				var ptr = res.ptr;
				HEAP32[allocated >> 2] = res.allocated;
				HEAPU32[addr >> 2] = ptr;
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		function __munmap_js(addr, len, prot, flags, fd, offset_low, offset_high) {
			var offset = convertI32PairToI53Checked(offset_low, offset_high);
			try {
				var stream = SYSCALLS.getStreamFromFD(fd);
				if (prot & 2) SYSCALLS.doMsync(addr, stream, len, flags, offset);
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return -e.errno;
			}
		}
		var __tzset_js = (timezone, daylight, std_name, dst_name) => {
			var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
			var winter = new Date(currentYear, 0, 1);
			var summer = new Date(currentYear, 6, 1);
			var winterOffset = winter.getTimezoneOffset();
			var summerOffset = summer.getTimezoneOffset();
			var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
			HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
			HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
			var extractZone = (date) => date.toLocaleTimeString(void 0, {
				hour12: false,
				timeZoneName: "short"
			}).split(" ")[1];
			var winterName = extractZone(winter);
			var summerName = extractZone(summer);
			if (summerOffset < winterOffset) {
				stringToUTF8(winterName, std_name, 17);
				stringToUTF8(summerName, dst_name, 17);
			} else {
				stringToUTF8(winterName, dst_name, 17);
				stringToUTF8(summerName, std_name, 17);
			}
		};
		var _emscripten_date_now = () => Date.now();
		var _emscripten_get_now = () => performance.now();
		var getHeapMax = () => 2147483648;
		var growMemory = (size) => {
			var pages = (size - wasmMemory.buffer.byteLength + 65535) / 65536;
			try {
				wasmMemory.grow(pages);
				updateMemoryViews();
				return 1;
			} catch (e) {}
		};
		var _emscripten_resize_heap = (requestedSize) => {
			var oldSize = HEAPU8.length;
			requestedSize >>>= 0;
			var maxHeapSize = getHeapMax();
			if (requestedSize > maxHeapSize) return false;
			var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
			for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
				var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
				overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
				if (growMemory(Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536)))) return true;
			}
			return false;
		};
		var ENV = {};
		var getExecutableName = () => thisProgram || "./this.program";
		var getEnvStrings = () => {
			if (!getEnvStrings.strings) {
				var env = {
					USER: "web_user",
					LOGNAME: "web_user",
					PATH: "/",
					PWD: "/",
					HOME: "/home/web_user",
					LANG: (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8",
					_: getExecutableName()
				};
				for (var x in ENV) if (ENV[x] === void 0) delete env[x];
				else env[x] = ENV[x];
				var strings = [];
				for (var x in env) strings.push(`${x}=${env[x]}`);
				getEnvStrings.strings = strings;
			}
			return getEnvStrings.strings;
		};
		var stringToAscii = (str, buffer) => {
			for (var i = 0; i < str.length; ++i) HEAP8[buffer++] = str.charCodeAt(i);
			HEAP8[buffer] = 0;
		};
		var _environ_get = (__environ, environ_buf) => {
			var bufSize = 0;
			getEnvStrings().forEach((string, i) => {
				var ptr = environ_buf + bufSize;
				HEAPU32[__environ + i * 4 >> 2] = ptr;
				stringToAscii(string, ptr);
				bufSize += string.length + 1;
			});
			return 0;
		};
		var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
			var strings = getEnvStrings();
			HEAPU32[penviron_count >> 2] = strings.length;
			var bufSize = 0;
			strings.forEach((string) => bufSize += string.length + 1);
			HEAPU32[penviron_buf_size >> 2] = bufSize;
			return 0;
		};
		function _fd_close(fd) {
			try {
				var stream = SYSCALLS.getStreamFromFD(fd);
				FS.close(stream);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return e.errno;
			}
		}
		function _fd_fdstat_get(fd, pbuf) {
			try {
				var rightsBase = 0;
				var rightsInheriting = 0;
				var flags = 0;
				var stream = SYSCALLS.getStreamFromFD(fd);
				var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
				HEAP8[pbuf] = type;
				HEAP16[pbuf + 2 >> 1] = flags;
				tempI64 = [rightsBase >>> 0, (tempDouble = rightsBase, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[pbuf + 8 >> 2] = tempI64[0], HEAP32[pbuf + 12 >> 2] = tempI64[1];
				tempI64 = [rightsInheriting >>> 0, (tempDouble = rightsInheriting, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[pbuf + 16 >> 2] = tempI64[0], HEAP32[pbuf + 20 >> 2] = tempI64[1];
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return e.errno;
			}
		}
		var doReadv = (stream, iov, iovcnt, offset) => {
			var ret = 0;
			for (var i = 0; i < iovcnt; i++) {
				var ptr = HEAPU32[iov >> 2];
				var len = HEAPU32[iov + 4 >> 2];
				iov += 8;
				var curr = FS.read(stream, HEAP8, ptr, len, offset);
				if (curr < 0) return -1;
				ret += curr;
				if (curr < len) break;
				if (typeof offset != "undefined") offset += curr;
			}
			return ret;
		};
		function _fd_read(fd, iov, iovcnt, pnum) {
			try {
				var num = doReadv(SYSCALLS.getStreamFromFD(fd), iov, iovcnt);
				HEAPU32[pnum >> 2] = num;
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return e.errno;
			}
		}
		function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
			var offset = convertI32PairToI53Checked(offset_low, offset_high);
			try {
				if (isNaN(offset)) return 61;
				var stream = SYSCALLS.getStreamFromFD(fd);
				FS.llseek(stream, offset, whence);
				tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
				if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return e.errno;
			}
		}
		function _fd_sync(fd) {
			try {
				var stream = SYSCALLS.getStreamFromFD(fd);
				if (stream.stream_ops?.fsync) return stream.stream_ops.fsync(stream);
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return e.errno;
			}
		}
		var doWritev = (stream, iov, iovcnt, offset) => {
			var ret = 0;
			for (var i = 0; i < iovcnt; i++) {
				var ptr = HEAPU32[iov >> 2];
				var len = HEAPU32[iov + 4 >> 2];
				iov += 8;
				var curr = FS.write(stream, HEAP8, ptr, len, offset);
				if (curr < 0) return -1;
				ret += curr;
				if (typeof offset != "undefined") offset += curr;
			}
			return ret;
		};
		function _fd_write(fd, iov, iovcnt, pnum) {
			try {
				var num = doWritev(SYSCALLS.getStreamFromFD(fd), iov, iovcnt);
				HEAPU32[pnum >> 2] = num;
				return 0;
			} catch (e) {
				if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
				return e.errno;
			}
		}
		var adapters_support = function() {
			const handleAsync = typeof Asyncify === "object" ? Asyncify.handleAsync.bind(Asyncify) : null;
			Module["handleAsync"] = handleAsync;
			const targets = /* @__PURE__ */ new Map();
			Module["setCallback"] = (key, target) => targets.set(key, target);
			Module["getCallback"] = (key) => targets.get(key);
			Module["deleteCallback"] = (key) => targets.delete(key);
			adapters_support = function(isAsync, key, ...args) {
				const receiver = targets.get(key);
				let methodName = null;
				const f = typeof receiver === "function" ? receiver : receiver[methodName = UTF8ToString(args.shift())];
				if (isAsync) {
					if (handleAsync) return handleAsync(() => f.apply(receiver, args));
					throw new Error("Synchronous WebAssembly cannot call async function");
				}
				const result = f.apply(receiver, args);
				if (typeof result?.then == "function") {
					console.error("unexpected Promise", f);
					throw new Error(`${methodName} unexpectedly returned a Promise`);
				}
				return result;
			};
		};
		function _ipp(...args) {
			return adapters_support(false, ...args);
		}
		function _ipp_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ippipppp(...args) {
			return adapters_support(false, ...args);
		}
		function _ippipppp_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ippp(...args) {
			return adapters_support(false, ...args);
		}
		function _ippp_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppi(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppi_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppiii(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppiii_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppiiip(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppiiip_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppip(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppip_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppj(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppj_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppp(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppp_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ippppi(...args) {
			return adapters_support(false, ...args);
		}
		function _ippppi_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ippppij(...args) {
			return adapters_support(false, ...args);
		}
		function _ippppij_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ippppip(...args) {
			return adapters_support(false, ...args);
		}
		function _ippppip_async(...args) {
			return adapters_support(true, ...args);
		}
		function _ipppppip(...args) {
			return adapters_support(false, ...args);
		}
		function _ipppppip_async(...args) {
			return adapters_support(true, ...args);
		}
		function _vppippii(...args) {
			return adapters_support(false, ...args);
		}
		function _vppippii_async(...args) {
			return adapters_support(true, ...args);
		}
		function _vppp(...args) {
			return adapters_support(false, ...args);
		}
		function _vppp_async(...args) {
			return adapters_support(true, ...args);
		}
		function _vpppip(...args) {
			return adapters_support(false, ...args);
		}
		function _vpppip_async(...args) {
			return adapters_support(true, ...args);
		}
		var runtimeKeepaliveCounter = 0;
		var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
		var _proc_exit = (code) => {
			EXITSTATUS = code;
			if (!keepRuntimeAlive()) {
				Module["onExit"]?.(code);
				ABORT = true;
			}
			quit_(code, new ExitStatus(code));
		};
		var exitJS = (status, implicit) => {
			EXITSTATUS = status;
			_proc_exit(status);
		};
		var handleException = (e) => {
			if (e instanceof ExitStatus || e == "unwind") return EXITSTATUS;
			quit_(1, e);
		};
		var uleb128Encode = (n, target) => {
			if (n < 128) target.push(n);
			else target.push(n % 128 | 128, n >> 7);
		};
		var sigToWasmTypes = (sig) => {
			var typeNames = {
				i: "i32",
				j: "i64",
				f: "f32",
				d: "f64",
				e: "externref",
				p: "i32"
			};
			var type = {
				parameters: [],
				results: sig[0] == "v" ? [] : [typeNames[sig[0]]]
			};
			for (var i = 1; i < sig.length; ++i) type.parameters.push(typeNames[sig[i]]);
			return type;
		};
		var generateFuncType = (sig, target) => {
			var sigRet = sig.slice(0, 1);
			var sigParam = sig.slice(1);
			var typeCodes = {
				i: 127,
				p: 127,
				j: 126,
				f: 125,
				d: 124,
				e: 111
			};
			target.push(96);
			uleb128Encode(sigParam.length, target);
			for (var i = 0; i < sigParam.length; ++i) target.push(typeCodes[sigParam[i]]);
			if (sigRet == "v") target.push(0);
			else target.push(1, typeCodes[sigRet]);
		};
		var convertJsFunctionToWasm = (func, sig) => {
			if (typeof WebAssembly.Function == "function") return new WebAssembly.Function(sigToWasmTypes(sig), func);
			var typeSectionBody = [1];
			generateFuncType(sig, typeSectionBody);
			var bytes = [
				0,
				97,
				115,
				109,
				1,
				0,
				0,
				0,
				1
			];
			uleb128Encode(typeSectionBody.length, bytes);
			bytes.push(...typeSectionBody);
			bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
			var module = new WebAssembly.Module(new Uint8Array(bytes));
			return new WebAssembly.Instance(module, { e: { f: func } }).exports["f"];
		};
		var wasmTable;
		var getWasmTableEntry = (funcPtr) => wasmTable.get(funcPtr);
		var updateTableMap = (offset, count) => {
			if (functionsInTableMap) for (var i = offset; i < offset + count; i++) {
				var item = getWasmTableEntry(i);
				if (item) functionsInTableMap.set(item, i);
			}
		};
		var functionsInTableMap;
		var getFunctionAddress = (func) => {
			if (!functionsInTableMap) {
				functionsInTableMap = /* @__PURE__ */ new WeakMap();
				updateTableMap(0, wasmTable.length);
			}
			return functionsInTableMap.get(func) || 0;
		};
		var freeTableIndexes = [];
		var getEmptyTableSlot = () => {
			if (freeTableIndexes.length) return freeTableIndexes.pop();
			try {
				wasmTable.grow(1);
			} catch (err) {
				if (!(err instanceof RangeError)) throw err;
				throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
			}
			return wasmTable.length - 1;
		};
		var setWasmTableEntry = (idx, func) => wasmTable.set(idx, func);
		var addFunction = (func, sig) => {
			var rtn = getFunctionAddress(func);
			if (rtn) return rtn;
			var ret = getEmptyTableSlot();
			try {
				setWasmTableEntry(ret, func);
			} catch (err) {
				if (!(err instanceof TypeError)) throw err;
				setWasmTableEntry(ret, convertJsFunctionToWasm(func, sig));
			}
			functionsInTableMap.set(func, ret);
			return ret;
		};
		var getCFunc = (ident) => {
			return Module["_" + ident];
		};
		var writeArrayToMemory = (array, buffer) => {
			HEAP8.set(array, buffer);
		};
		var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
		var stringToUTF8OnStack = (str) => {
			var size = lengthBytesUTF8(str) + 1;
			var ret = stackAlloc(size);
			stringToUTF8(str, ret, size);
			return ret;
		};
		var ccall = (ident, returnType, argTypes, args, opts) => {
			var toC = {
				string: (str) => {
					var ret = 0;
					if (str !== null && str !== void 0 && str !== 0) ret = stringToUTF8OnStack(str);
					return ret;
				},
				array: (arr) => {
					var ret = stackAlloc(arr.length);
					writeArrayToMemory(arr, ret);
					return ret;
				}
			};
			function convertReturnValue(ret) {
				if (returnType === "string") return UTF8ToString(ret);
				if (returnType === "boolean") return Boolean(ret);
				return ret;
			}
			var func = getCFunc(ident);
			var cArgs = [];
			var stack = 0;
			if (args) for (var i = 0; i < args.length; i++) {
				var converter = toC[argTypes[i]];
				if (converter) {
					if (stack === 0) stack = stackSave();
					cArgs[i] = converter(args[i]);
				} else cArgs[i] = args[i];
			}
			var ret = func(...cArgs);
			function onDone(ret) {
				if (stack !== 0) stackRestore(stack);
				return convertReturnValue(ret);
			}
			ret = onDone(ret);
			return ret;
		};
		var cwrap = (ident, returnType, argTypes, opts) => {
			var numericArgs = !argTypes || argTypes.every((type) => type === "number" || type === "boolean");
			if (returnType !== "string" && numericArgs && !opts) return getCFunc(ident);
			return (...args) => ccall(ident, returnType, argTypes, args, opts);
		};
		var getTempRet0 = (val) => __emscripten_tempret_get();
		var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
			maxBytesToWrite ??= 2147483647;
			if (maxBytesToWrite < 2) return 0;
			maxBytesToWrite -= 2;
			var startPtr = outPtr;
			var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
			for (var i = 0; i < numCharsToWrite; ++i) {
				var codeUnit = str.charCodeAt(i);
				HEAP16[outPtr >> 1] = codeUnit;
				outPtr += 2;
			}
			HEAP16[outPtr >> 1] = 0;
			return outPtr - startPtr;
		};
		var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
			maxBytesToWrite ??= 2147483647;
			if (maxBytesToWrite < 4) return 0;
			var startPtr = outPtr;
			var endPtr = startPtr + maxBytesToWrite - 4;
			for (var i = 0; i < str.length; ++i) {
				var codeUnit = str.charCodeAt(i);
				if (codeUnit >= 55296 && codeUnit <= 57343) {
					var trailSurrogate = str.charCodeAt(++i);
					codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
				}
				HEAP32[outPtr >> 2] = codeUnit;
				outPtr += 4;
				if (outPtr + 4 > endPtr) break;
			}
			HEAP32[outPtr >> 2] = 0;
			return outPtr - startPtr;
		};
		var AsciiToString = (ptr) => {
			var str = "";
			while (1) {
				var ch = HEAPU8[ptr++];
				if (!ch) return str;
				str += String.fromCharCode(ch);
			}
		};
		var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : void 0;
		var UTF16ToString = (ptr, maxBytesToRead) => {
			var endPtr = ptr;
			var idx = endPtr >> 1;
			var maxIdx = idx + maxBytesToRead / 2;
			while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
			endPtr = idx << 1;
			if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
			var str = "";
			for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
				var codeUnit = HEAP16[ptr + i * 2 >> 1];
				if (codeUnit == 0) break;
				str += String.fromCharCode(codeUnit);
			}
			return str;
		};
		var UTF32ToString = (ptr, maxBytesToRead) => {
			var i = 0;
			var str = "";
			while (!(i >= maxBytesToRead / 4)) {
				var utf32 = HEAP32[ptr + i * 4 >> 2];
				if (utf32 == 0) break;
				++i;
				if (utf32 >= 65536) {
					var ch = utf32 - 65536;
					str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
				} else str += String.fromCharCode(utf32);
			}
			return str;
		};
		function intArrayToString(array) {
			var ret = [];
			for (var i = 0; i < array.length; i++) {
				var chr = array[i];
				if (chr > 255) chr &= 255;
				ret.push(String.fromCharCode(chr));
			}
			return ret.join("");
		}
		FS.createPreloadedFile = FS_createPreloadedFile;
		FS.staticInit();
		adapters_support();
		var wasmImports = {
			a: ___assert_fail,
			Y: ___syscall_chmod,
			$: ___syscall_faccessat,
			Z: ___syscall_fchmod,
			X: ___syscall_fchown32,
			b: ___syscall_fcntl64,
			W: ___syscall_fstat64,
			y: ___syscall_ftruncate64,
			Q: ___syscall_getcwd,
			U: ___syscall_lstat64,
			N: ___syscall_mkdirat,
			S: ___syscall_newfstatat,
			M: ___syscall_openat,
			K: ___syscall_readlinkat,
			J: ___syscall_rmdir,
			V: ___syscall_stat64,
			G: ___syscall_unlinkat,
			F: ___syscall_utimensat,
			w: __localtime_js,
			u: __mmap_js,
			v: __munmap_js,
			H: __tzset_js,
			n: _emscripten_date_now,
			m: _emscripten_get_now,
			D: _emscripten_resize_heap,
			O: _environ_get,
			P: _environ_sizes_get,
			o: _fd_close,
			E: _fd_fdstat_get,
			L: _fd_read,
			x: _fd_seek,
			R: _fd_sync,
			I: _fd_write,
			s: _ipp,
			t: _ipp_async,
			ga: _ippipppp,
			ka: _ippipppp_async,
			i: _ippp,
			j: _ippp_async,
			c: _ipppi,
			d: _ipppi_async,
			ca: _ipppiii,
			da: _ipppiii_async,
			ea: _ipppiiip,
			fa: _ipppiiip_async,
			g: _ipppip,
			h: _ipppip_async,
			z: _ipppj,
			A: _ipppj_async,
			e: _ipppp,
			f: _ipppp_async,
			aa: _ippppi,
			ba: _ippppi_async,
			B: _ippppij,
			C: _ippppij_async,
			p: _ippppip,
			q: _ippppip_async,
			ha: _ipppppip,
			ia: _ipppppip_async,
			ja: _vppippii,
			r: _vppippii_async,
			k: _vppp,
			l: _vppp_async,
			T: _vpppip,
			_: _vpppip_async
		};
		var wasmExports = createWasm();
		var _sqlite3_status64 = Module["_sqlite3_status64"] = (a0, a1, a2, a3) => (_sqlite3_status64 = Module["_sqlite3_status64"] = wasmExports["na"])(a0, a1, a2, a3);
		var _sqlite3_status = Module["_sqlite3_status"] = (a0, a1, a2, a3) => (_sqlite3_status = Module["_sqlite3_status"] = wasmExports["oa"])(a0, a1, a2, a3);
		var _sqlite3_db_status = Module["_sqlite3_db_status"] = (a0, a1, a2, a3, a4) => (_sqlite3_db_status = Module["_sqlite3_db_status"] = wasmExports["pa"])(a0, a1, a2, a3, a4);
		var _sqlite3_msize = Module["_sqlite3_msize"] = (a0) => (_sqlite3_msize = Module["_sqlite3_msize"] = wasmExports["qa"])(a0);
		var _sqlite3_vfs_find = Module["_sqlite3_vfs_find"] = (a0) => (_sqlite3_vfs_find = Module["_sqlite3_vfs_find"] = wasmExports["ra"])(a0);
		var _sqlite3_vfs_register = Module["_sqlite3_vfs_register"] = (a0, a1) => (_sqlite3_vfs_register = Module["_sqlite3_vfs_register"] = wasmExports["sa"])(a0, a1);
		var _sqlite3_vfs_unregister = Module["_sqlite3_vfs_unregister"] = (a0) => (_sqlite3_vfs_unregister = Module["_sqlite3_vfs_unregister"] = wasmExports["ta"])(a0);
		var _sqlite3_release_memory = Module["_sqlite3_release_memory"] = (a0) => (_sqlite3_release_memory = Module["_sqlite3_release_memory"] = wasmExports["ua"])(a0);
		var _sqlite3_soft_heap_limit64 = Module["_sqlite3_soft_heap_limit64"] = (a0, a1) => (_sqlite3_soft_heap_limit64 = Module["_sqlite3_soft_heap_limit64"] = wasmExports["va"])(a0, a1);
		var _sqlite3_memory_used = Module["_sqlite3_memory_used"] = () => (_sqlite3_memory_used = Module["_sqlite3_memory_used"] = wasmExports["wa"])();
		var _sqlite3_hard_heap_limit64 = Module["_sqlite3_hard_heap_limit64"] = (a0, a1) => (_sqlite3_hard_heap_limit64 = Module["_sqlite3_hard_heap_limit64"] = wasmExports["xa"])(a0, a1);
		var _sqlite3_memory_highwater = Module["_sqlite3_memory_highwater"] = (a0) => (_sqlite3_memory_highwater = Module["_sqlite3_memory_highwater"] = wasmExports["ya"])(a0);
		var _sqlite3_malloc = Module["_sqlite3_malloc"] = (a0) => (_sqlite3_malloc = Module["_sqlite3_malloc"] = wasmExports["za"])(a0);
		var _sqlite3_malloc64 = Module["_sqlite3_malloc64"] = (a0, a1) => (_sqlite3_malloc64 = Module["_sqlite3_malloc64"] = wasmExports["Aa"])(a0, a1);
		var _sqlite3_free = Module["_sqlite3_free"] = (a0) => (_sqlite3_free = Module["_sqlite3_free"] = wasmExports["Ba"])(a0);
		var _sqlite3_realloc = Module["_sqlite3_realloc"] = (a0, a1) => (_sqlite3_realloc = Module["_sqlite3_realloc"] = wasmExports["Ca"])(a0, a1);
		var _sqlite3_realloc64 = Module["_sqlite3_realloc64"] = (a0, a1, a2) => (_sqlite3_realloc64 = Module["_sqlite3_realloc64"] = wasmExports["Da"])(a0, a1, a2);
		var _sqlite3_str_vappendf = Module["_sqlite3_str_vappendf"] = (a0, a1, a2) => (_sqlite3_str_vappendf = Module["_sqlite3_str_vappendf"] = wasmExports["Ea"])(a0, a1, a2);
		var _sqlite3_str_append = Module["_sqlite3_str_append"] = (a0, a1, a2) => (_sqlite3_str_append = Module["_sqlite3_str_append"] = wasmExports["Fa"])(a0, a1, a2);
		var _sqlite3_str_appendchar = Module["_sqlite3_str_appendchar"] = (a0, a1, a2) => (_sqlite3_str_appendchar = Module["_sqlite3_str_appendchar"] = wasmExports["Ga"])(a0, a1, a2);
		var _sqlite3_str_appendall = Module["_sqlite3_str_appendall"] = (a0, a1) => (_sqlite3_str_appendall = Module["_sqlite3_str_appendall"] = wasmExports["Ha"])(a0, a1);
		var _sqlite3_str_appendf = Module["_sqlite3_str_appendf"] = (a0, a1, a2) => (_sqlite3_str_appendf = Module["_sqlite3_str_appendf"] = wasmExports["Ia"])(a0, a1, a2);
		var _sqlite3_str_finish = Module["_sqlite3_str_finish"] = (a0) => (_sqlite3_str_finish = Module["_sqlite3_str_finish"] = wasmExports["Ja"])(a0);
		var _sqlite3_str_errcode = Module["_sqlite3_str_errcode"] = (a0) => (_sqlite3_str_errcode = Module["_sqlite3_str_errcode"] = wasmExports["Ka"])(a0);
		var _sqlite3_str_length = Module["_sqlite3_str_length"] = (a0) => (_sqlite3_str_length = Module["_sqlite3_str_length"] = wasmExports["La"])(a0);
		var _sqlite3_str_value = Module["_sqlite3_str_value"] = (a0) => (_sqlite3_str_value = Module["_sqlite3_str_value"] = wasmExports["Ma"])(a0);
		var _sqlite3_str_reset = Module["_sqlite3_str_reset"] = (a0) => (_sqlite3_str_reset = Module["_sqlite3_str_reset"] = wasmExports["Na"])(a0);
		var _sqlite3_str_new = Module["_sqlite3_str_new"] = (a0) => (_sqlite3_str_new = Module["_sqlite3_str_new"] = wasmExports["Oa"])(a0);
		var _sqlite3_vmprintf = Module["_sqlite3_vmprintf"] = (a0, a1) => (_sqlite3_vmprintf = Module["_sqlite3_vmprintf"] = wasmExports["Pa"])(a0, a1);
		var _sqlite3_mprintf = Module["_sqlite3_mprintf"] = (a0, a1) => (_sqlite3_mprintf = Module["_sqlite3_mprintf"] = wasmExports["Qa"])(a0, a1);
		var _sqlite3_vsnprintf = Module["_sqlite3_vsnprintf"] = (a0, a1, a2, a3) => (_sqlite3_vsnprintf = Module["_sqlite3_vsnprintf"] = wasmExports["Ra"])(a0, a1, a2, a3);
		var _sqlite3_snprintf = Module["_sqlite3_snprintf"] = (a0, a1, a2, a3) => (_sqlite3_snprintf = Module["_sqlite3_snprintf"] = wasmExports["Sa"])(a0, a1, a2, a3);
		var _sqlite3_log = Module["_sqlite3_log"] = (a0, a1, a2) => (_sqlite3_log = Module["_sqlite3_log"] = wasmExports["Ta"])(a0, a1, a2);
		var _sqlite3_randomness = Module["_sqlite3_randomness"] = (a0, a1) => (_sqlite3_randomness = Module["_sqlite3_randomness"] = wasmExports["Ua"])(a0, a1);
		var _sqlite3_stricmp = Module["_sqlite3_stricmp"] = (a0, a1) => (_sqlite3_stricmp = Module["_sqlite3_stricmp"] = wasmExports["Va"])(a0, a1);
		var _sqlite3_strnicmp = Module["_sqlite3_strnicmp"] = (a0, a1, a2) => (_sqlite3_strnicmp = Module["_sqlite3_strnicmp"] = wasmExports["Wa"])(a0, a1, a2);
		var _sqlite3_os_init = Module["_sqlite3_os_init"] = () => (_sqlite3_os_init = Module["_sqlite3_os_init"] = wasmExports["Xa"])();
		var _sqlite3_os_end = Module["_sqlite3_os_end"] = () => (_sqlite3_os_end = Module["_sqlite3_os_end"] = wasmExports["Ya"])();
		var _sqlite3_serialize = Module["_sqlite3_serialize"] = (a0, a1, a2, a3) => (_sqlite3_serialize = Module["_sqlite3_serialize"] = wasmExports["Za"])(a0, a1, a2, a3);
		var _sqlite3_prepare_v2 = Module["_sqlite3_prepare_v2"] = (a0, a1, a2, a3, a4) => (_sqlite3_prepare_v2 = Module["_sqlite3_prepare_v2"] = wasmExports["_a"])(a0, a1, a2, a3, a4);
		var _sqlite3_step = Module["_sqlite3_step"] = (a0) => (_sqlite3_step = Module["_sqlite3_step"] = wasmExports["$a"])(a0);
		var _sqlite3_column_int64 = Module["_sqlite3_column_int64"] = (a0, a1) => (_sqlite3_column_int64 = Module["_sqlite3_column_int64"] = wasmExports["ab"])(a0, a1);
		var _sqlite3_reset = Module["_sqlite3_reset"] = (a0) => (_sqlite3_reset = Module["_sqlite3_reset"] = wasmExports["bb"])(a0);
		var _sqlite3_exec = Module["_sqlite3_exec"] = (a0, a1, a2, a3, a4) => (_sqlite3_exec = Module["_sqlite3_exec"] = wasmExports["cb"])(a0, a1, a2, a3, a4);
		var _sqlite3_column_int = Module["_sqlite3_column_int"] = (a0, a1) => (_sqlite3_column_int = Module["_sqlite3_column_int"] = wasmExports["db"])(a0, a1);
		var _sqlite3_finalize = Module["_sqlite3_finalize"] = (a0) => (_sqlite3_finalize = Module["_sqlite3_finalize"] = wasmExports["eb"])(a0);
		var _sqlite3_deserialize = Module["_sqlite3_deserialize"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_sqlite3_deserialize = Module["_sqlite3_deserialize"] = wasmExports["fb"])(a0, a1, a2, a3, a4, a5, a6, a7);
		var _sqlite3_database_file_object = Module["_sqlite3_database_file_object"] = (a0) => (_sqlite3_database_file_object = Module["_sqlite3_database_file_object"] = wasmExports["gb"])(a0);
		var _sqlite3_backup_init = Module["_sqlite3_backup_init"] = (a0, a1, a2, a3) => (_sqlite3_backup_init = Module["_sqlite3_backup_init"] = wasmExports["hb"])(a0, a1, a2, a3);
		var _sqlite3_backup_step = Module["_sqlite3_backup_step"] = (a0, a1) => (_sqlite3_backup_step = Module["_sqlite3_backup_step"] = wasmExports["ib"])(a0, a1);
		var _sqlite3_backup_finish = Module["_sqlite3_backup_finish"] = (a0) => (_sqlite3_backup_finish = Module["_sqlite3_backup_finish"] = wasmExports["jb"])(a0);
		var _sqlite3_backup_remaining = Module["_sqlite3_backup_remaining"] = (a0) => (_sqlite3_backup_remaining = Module["_sqlite3_backup_remaining"] = wasmExports["kb"])(a0);
		var _sqlite3_backup_pagecount = Module["_sqlite3_backup_pagecount"] = (a0) => (_sqlite3_backup_pagecount = Module["_sqlite3_backup_pagecount"] = wasmExports["lb"])(a0);
		var _sqlite3_clear_bindings = Module["_sqlite3_clear_bindings"] = (a0) => (_sqlite3_clear_bindings = Module["_sqlite3_clear_bindings"] = wasmExports["mb"])(a0);
		var _sqlite3_value_blob = Module["_sqlite3_value_blob"] = (a0) => (_sqlite3_value_blob = Module["_sqlite3_value_blob"] = wasmExports["nb"])(a0);
		var _sqlite3_value_text = Module["_sqlite3_value_text"] = (a0) => (_sqlite3_value_text = Module["_sqlite3_value_text"] = wasmExports["ob"])(a0);
		var _sqlite3_value_bytes = Module["_sqlite3_value_bytes"] = (a0) => (_sqlite3_value_bytes = Module["_sqlite3_value_bytes"] = wasmExports["pb"])(a0);
		var _sqlite3_value_bytes16 = Module["_sqlite3_value_bytes16"] = (a0) => (_sqlite3_value_bytes16 = Module["_sqlite3_value_bytes16"] = wasmExports["qb"])(a0);
		var _sqlite3_value_double = Module["_sqlite3_value_double"] = (a0) => (_sqlite3_value_double = Module["_sqlite3_value_double"] = wasmExports["rb"])(a0);
		var _sqlite3_value_int = Module["_sqlite3_value_int"] = (a0) => (_sqlite3_value_int = Module["_sqlite3_value_int"] = wasmExports["sb"])(a0);
		var _sqlite3_value_int64 = Module["_sqlite3_value_int64"] = (a0) => (_sqlite3_value_int64 = Module["_sqlite3_value_int64"] = wasmExports["tb"])(a0);
		var _sqlite3_value_subtype = Module["_sqlite3_value_subtype"] = (a0) => (_sqlite3_value_subtype = Module["_sqlite3_value_subtype"] = wasmExports["ub"])(a0);
		var _sqlite3_value_pointer = Module["_sqlite3_value_pointer"] = (a0, a1) => (_sqlite3_value_pointer = Module["_sqlite3_value_pointer"] = wasmExports["vb"])(a0, a1);
		var _sqlite3_value_text16 = Module["_sqlite3_value_text16"] = (a0) => (_sqlite3_value_text16 = Module["_sqlite3_value_text16"] = wasmExports["wb"])(a0);
		var _sqlite3_value_text16be = Module["_sqlite3_value_text16be"] = (a0) => (_sqlite3_value_text16be = Module["_sqlite3_value_text16be"] = wasmExports["xb"])(a0);
		var _sqlite3_value_text16le = Module["_sqlite3_value_text16le"] = (a0) => (_sqlite3_value_text16le = Module["_sqlite3_value_text16le"] = wasmExports["yb"])(a0);
		var _sqlite3_value_type = Module["_sqlite3_value_type"] = (a0) => (_sqlite3_value_type = Module["_sqlite3_value_type"] = wasmExports["zb"])(a0);
		var _sqlite3_value_encoding = Module["_sqlite3_value_encoding"] = (a0) => (_sqlite3_value_encoding = Module["_sqlite3_value_encoding"] = wasmExports["Ab"])(a0);
		var _sqlite3_value_nochange = Module["_sqlite3_value_nochange"] = (a0) => (_sqlite3_value_nochange = Module["_sqlite3_value_nochange"] = wasmExports["Bb"])(a0);
		var _sqlite3_value_frombind = Module["_sqlite3_value_frombind"] = (a0) => (_sqlite3_value_frombind = Module["_sqlite3_value_frombind"] = wasmExports["Cb"])(a0);
		var _sqlite3_value_dup = Module["_sqlite3_value_dup"] = (a0) => (_sqlite3_value_dup = Module["_sqlite3_value_dup"] = wasmExports["Db"])(a0);
		var _sqlite3_value_free = Module["_sqlite3_value_free"] = (a0) => (_sqlite3_value_free = Module["_sqlite3_value_free"] = wasmExports["Eb"])(a0);
		var _sqlite3_result_blob = Module["_sqlite3_result_blob"] = (a0, a1, a2, a3) => (_sqlite3_result_blob = Module["_sqlite3_result_blob"] = wasmExports["Fb"])(a0, a1, a2, a3);
		var _sqlite3_result_blob64 = Module["_sqlite3_result_blob64"] = (a0, a1, a2, a3, a4) => (_sqlite3_result_blob64 = Module["_sqlite3_result_blob64"] = wasmExports["Gb"])(a0, a1, a2, a3, a4);
		var _sqlite3_result_double = Module["_sqlite3_result_double"] = (a0, a1) => (_sqlite3_result_double = Module["_sqlite3_result_double"] = wasmExports["Hb"])(a0, a1);
		var _sqlite3_result_error = Module["_sqlite3_result_error"] = (a0, a1, a2) => (_sqlite3_result_error = Module["_sqlite3_result_error"] = wasmExports["Ib"])(a0, a1, a2);
		var _sqlite3_result_error16 = Module["_sqlite3_result_error16"] = (a0, a1, a2) => (_sqlite3_result_error16 = Module["_sqlite3_result_error16"] = wasmExports["Jb"])(a0, a1, a2);
		var _sqlite3_result_int = Module["_sqlite3_result_int"] = (a0, a1) => (_sqlite3_result_int = Module["_sqlite3_result_int"] = wasmExports["Kb"])(a0, a1);
		var _sqlite3_result_int64 = Module["_sqlite3_result_int64"] = (a0, a1, a2) => (_sqlite3_result_int64 = Module["_sqlite3_result_int64"] = wasmExports["Lb"])(a0, a1, a2);
		var _sqlite3_result_null = Module["_sqlite3_result_null"] = (a0) => (_sqlite3_result_null = Module["_sqlite3_result_null"] = wasmExports["Mb"])(a0);
		var _sqlite3_result_pointer = Module["_sqlite3_result_pointer"] = (a0, a1, a2, a3) => (_sqlite3_result_pointer = Module["_sqlite3_result_pointer"] = wasmExports["Nb"])(a0, a1, a2, a3);
		var _sqlite3_result_subtype = Module["_sqlite3_result_subtype"] = (a0, a1) => (_sqlite3_result_subtype = Module["_sqlite3_result_subtype"] = wasmExports["Ob"])(a0, a1);
		var _sqlite3_result_text = Module["_sqlite3_result_text"] = (a0, a1, a2, a3) => (_sqlite3_result_text = Module["_sqlite3_result_text"] = wasmExports["Pb"])(a0, a1, a2, a3);
		var _sqlite3_result_text64 = Module["_sqlite3_result_text64"] = (a0, a1, a2, a3, a4, a5) => (_sqlite3_result_text64 = Module["_sqlite3_result_text64"] = wasmExports["Qb"])(a0, a1, a2, a3, a4, a5);
		var _sqlite3_result_text16 = Module["_sqlite3_result_text16"] = (a0, a1, a2, a3) => (_sqlite3_result_text16 = Module["_sqlite3_result_text16"] = wasmExports["Rb"])(a0, a1, a2, a3);
		var _sqlite3_result_text16be = Module["_sqlite3_result_text16be"] = (a0, a1, a2, a3) => (_sqlite3_result_text16be = Module["_sqlite3_result_text16be"] = wasmExports["Sb"])(a0, a1, a2, a3);
		var _sqlite3_result_text16le = Module["_sqlite3_result_text16le"] = (a0, a1, a2, a3) => (_sqlite3_result_text16le = Module["_sqlite3_result_text16le"] = wasmExports["Tb"])(a0, a1, a2, a3);
		var _sqlite3_result_value = Module["_sqlite3_result_value"] = (a0, a1) => (_sqlite3_result_value = Module["_sqlite3_result_value"] = wasmExports["Ub"])(a0, a1);
		var _sqlite3_result_error_toobig = Module["_sqlite3_result_error_toobig"] = (a0) => (_sqlite3_result_error_toobig = Module["_sqlite3_result_error_toobig"] = wasmExports["Vb"])(a0);
		var _sqlite3_result_zeroblob = Module["_sqlite3_result_zeroblob"] = (a0, a1) => (_sqlite3_result_zeroblob = Module["_sqlite3_result_zeroblob"] = wasmExports["Wb"])(a0, a1);
		var _sqlite3_result_zeroblob64 = Module["_sqlite3_result_zeroblob64"] = (a0, a1, a2) => (_sqlite3_result_zeroblob64 = Module["_sqlite3_result_zeroblob64"] = wasmExports["Xb"])(a0, a1, a2);
		var _sqlite3_result_error_code = Module["_sqlite3_result_error_code"] = (a0, a1) => (_sqlite3_result_error_code = Module["_sqlite3_result_error_code"] = wasmExports["Yb"])(a0, a1);
		var _sqlite3_result_error_nomem = Module["_sqlite3_result_error_nomem"] = (a0) => (_sqlite3_result_error_nomem = Module["_sqlite3_result_error_nomem"] = wasmExports["Zb"])(a0);
		var _sqlite3_user_data = Module["_sqlite3_user_data"] = (a0) => (_sqlite3_user_data = Module["_sqlite3_user_data"] = wasmExports["_b"])(a0);
		var _sqlite3_context_db_handle = Module["_sqlite3_context_db_handle"] = (a0) => (_sqlite3_context_db_handle = Module["_sqlite3_context_db_handle"] = wasmExports["$b"])(a0);
		var _sqlite3_vtab_nochange = Module["_sqlite3_vtab_nochange"] = (a0) => (_sqlite3_vtab_nochange = Module["_sqlite3_vtab_nochange"] = wasmExports["ac"])(a0);
		var _sqlite3_vtab_in_first = Module["_sqlite3_vtab_in_first"] = (a0, a1) => (_sqlite3_vtab_in_first = Module["_sqlite3_vtab_in_first"] = wasmExports["bc"])(a0, a1);
		var _sqlite3_vtab_in_next = Module["_sqlite3_vtab_in_next"] = (a0, a1) => (_sqlite3_vtab_in_next = Module["_sqlite3_vtab_in_next"] = wasmExports["cc"])(a0, a1);
		var _sqlite3_aggregate_context = Module["_sqlite3_aggregate_context"] = (a0, a1) => (_sqlite3_aggregate_context = Module["_sqlite3_aggregate_context"] = wasmExports["dc"])(a0, a1);
		var _sqlite3_get_auxdata = Module["_sqlite3_get_auxdata"] = (a0, a1) => (_sqlite3_get_auxdata = Module["_sqlite3_get_auxdata"] = wasmExports["ec"])(a0, a1);
		var _sqlite3_set_auxdata = Module["_sqlite3_set_auxdata"] = (a0, a1, a2, a3) => (_sqlite3_set_auxdata = Module["_sqlite3_set_auxdata"] = wasmExports["fc"])(a0, a1, a2, a3);
		var _sqlite3_column_count = Module["_sqlite3_column_count"] = (a0) => (_sqlite3_column_count = Module["_sqlite3_column_count"] = wasmExports["gc"])(a0);
		var _sqlite3_data_count = Module["_sqlite3_data_count"] = (a0) => (_sqlite3_data_count = Module["_sqlite3_data_count"] = wasmExports["hc"])(a0);
		var _sqlite3_column_blob = Module["_sqlite3_column_blob"] = (a0, a1) => (_sqlite3_column_blob = Module["_sqlite3_column_blob"] = wasmExports["ic"])(a0, a1);
		var _sqlite3_column_bytes = Module["_sqlite3_column_bytes"] = (a0, a1) => (_sqlite3_column_bytes = Module["_sqlite3_column_bytes"] = wasmExports["jc"])(a0, a1);
		var _sqlite3_column_bytes16 = Module["_sqlite3_column_bytes16"] = (a0, a1) => (_sqlite3_column_bytes16 = Module["_sqlite3_column_bytes16"] = wasmExports["kc"])(a0, a1);
		var _sqlite3_column_double = Module["_sqlite3_column_double"] = (a0, a1) => (_sqlite3_column_double = Module["_sqlite3_column_double"] = wasmExports["lc"])(a0, a1);
		var _sqlite3_column_text = Module["_sqlite3_column_text"] = (a0, a1) => (_sqlite3_column_text = Module["_sqlite3_column_text"] = wasmExports["mc"])(a0, a1);
		var _sqlite3_column_value = Module["_sqlite3_column_value"] = (a0, a1) => (_sqlite3_column_value = Module["_sqlite3_column_value"] = wasmExports["nc"])(a0, a1);
		var _sqlite3_column_text16 = Module["_sqlite3_column_text16"] = (a0, a1) => (_sqlite3_column_text16 = Module["_sqlite3_column_text16"] = wasmExports["oc"])(a0, a1);
		var _sqlite3_column_type = Module["_sqlite3_column_type"] = (a0, a1) => (_sqlite3_column_type = Module["_sqlite3_column_type"] = wasmExports["pc"])(a0, a1);
		var _sqlite3_column_name = Module["_sqlite3_column_name"] = (a0, a1) => (_sqlite3_column_name = Module["_sqlite3_column_name"] = wasmExports["qc"])(a0, a1);
		var _sqlite3_column_name16 = Module["_sqlite3_column_name16"] = (a0, a1) => (_sqlite3_column_name16 = Module["_sqlite3_column_name16"] = wasmExports["rc"])(a0, a1);
		var _sqlite3_bind_blob = Module["_sqlite3_bind_blob"] = (a0, a1, a2, a3, a4) => (_sqlite3_bind_blob = Module["_sqlite3_bind_blob"] = wasmExports["sc"])(a0, a1, a2, a3, a4);
		var _sqlite3_bind_blob64 = Module["_sqlite3_bind_blob64"] = (a0, a1, a2, a3, a4, a5) => (_sqlite3_bind_blob64 = Module["_sqlite3_bind_blob64"] = wasmExports["tc"])(a0, a1, a2, a3, a4, a5);
		var _sqlite3_bind_double = Module["_sqlite3_bind_double"] = (a0, a1, a2) => (_sqlite3_bind_double = Module["_sqlite3_bind_double"] = wasmExports["uc"])(a0, a1, a2);
		var _sqlite3_bind_int = Module["_sqlite3_bind_int"] = (a0, a1, a2) => (_sqlite3_bind_int = Module["_sqlite3_bind_int"] = wasmExports["vc"])(a0, a1, a2);
		var _sqlite3_bind_int64 = Module["_sqlite3_bind_int64"] = (a0, a1, a2, a3) => (_sqlite3_bind_int64 = Module["_sqlite3_bind_int64"] = wasmExports["wc"])(a0, a1, a2, a3);
		var _sqlite3_bind_null = Module["_sqlite3_bind_null"] = (a0, a1) => (_sqlite3_bind_null = Module["_sqlite3_bind_null"] = wasmExports["xc"])(a0, a1);
		var _sqlite3_bind_pointer = Module["_sqlite3_bind_pointer"] = (a0, a1, a2, a3, a4) => (_sqlite3_bind_pointer = Module["_sqlite3_bind_pointer"] = wasmExports["yc"])(a0, a1, a2, a3, a4);
		var _sqlite3_bind_text = Module["_sqlite3_bind_text"] = (a0, a1, a2, a3, a4) => (_sqlite3_bind_text = Module["_sqlite3_bind_text"] = wasmExports["zc"])(a0, a1, a2, a3, a4);
		var _sqlite3_bind_text64 = Module["_sqlite3_bind_text64"] = (a0, a1, a2, a3, a4, a5, a6) => (_sqlite3_bind_text64 = Module["_sqlite3_bind_text64"] = wasmExports["Ac"])(a0, a1, a2, a3, a4, a5, a6);
		var _sqlite3_bind_text16 = Module["_sqlite3_bind_text16"] = (a0, a1, a2, a3, a4) => (_sqlite3_bind_text16 = Module["_sqlite3_bind_text16"] = wasmExports["Bc"])(a0, a1, a2, a3, a4);
		var _sqlite3_bind_value = Module["_sqlite3_bind_value"] = (a0, a1, a2) => (_sqlite3_bind_value = Module["_sqlite3_bind_value"] = wasmExports["Cc"])(a0, a1, a2);
		var _sqlite3_bind_zeroblob = Module["_sqlite3_bind_zeroblob"] = (a0, a1, a2) => (_sqlite3_bind_zeroblob = Module["_sqlite3_bind_zeroblob"] = wasmExports["Dc"])(a0, a1, a2);
		var _sqlite3_bind_zeroblob64 = Module["_sqlite3_bind_zeroblob64"] = (a0, a1, a2, a3) => (_sqlite3_bind_zeroblob64 = Module["_sqlite3_bind_zeroblob64"] = wasmExports["Ec"])(a0, a1, a2, a3);
		var _sqlite3_bind_parameter_count = Module["_sqlite3_bind_parameter_count"] = (a0) => (_sqlite3_bind_parameter_count = Module["_sqlite3_bind_parameter_count"] = wasmExports["Fc"])(a0);
		var _sqlite3_bind_parameter_name = Module["_sqlite3_bind_parameter_name"] = (a0, a1) => (_sqlite3_bind_parameter_name = Module["_sqlite3_bind_parameter_name"] = wasmExports["Gc"])(a0, a1);
		var _sqlite3_bind_parameter_index = Module["_sqlite3_bind_parameter_index"] = (a0, a1) => (_sqlite3_bind_parameter_index = Module["_sqlite3_bind_parameter_index"] = wasmExports["Hc"])(a0, a1);
		var _sqlite3_db_handle = Module["_sqlite3_db_handle"] = (a0) => (_sqlite3_db_handle = Module["_sqlite3_db_handle"] = wasmExports["Ic"])(a0);
		var _sqlite3_stmt_readonly = Module["_sqlite3_stmt_readonly"] = (a0) => (_sqlite3_stmt_readonly = Module["_sqlite3_stmt_readonly"] = wasmExports["Jc"])(a0);
		var _sqlite3_stmt_isexplain = Module["_sqlite3_stmt_isexplain"] = (a0) => (_sqlite3_stmt_isexplain = Module["_sqlite3_stmt_isexplain"] = wasmExports["Kc"])(a0);
		var _sqlite3_stmt_explain = Module["_sqlite3_stmt_explain"] = (a0, a1) => (_sqlite3_stmt_explain = Module["_sqlite3_stmt_explain"] = wasmExports["Lc"])(a0, a1);
		var _sqlite3_stmt_busy = Module["_sqlite3_stmt_busy"] = (a0) => (_sqlite3_stmt_busy = Module["_sqlite3_stmt_busy"] = wasmExports["Mc"])(a0);
		var _sqlite3_next_stmt = Module["_sqlite3_next_stmt"] = (a0, a1) => (_sqlite3_next_stmt = Module["_sqlite3_next_stmt"] = wasmExports["Nc"])(a0, a1);
		var _sqlite3_stmt_status = Module["_sqlite3_stmt_status"] = (a0, a1, a2) => (_sqlite3_stmt_status = Module["_sqlite3_stmt_status"] = wasmExports["Oc"])(a0, a1, a2);
		var _sqlite3_sql = Module["_sqlite3_sql"] = (a0) => (_sqlite3_sql = Module["_sqlite3_sql"] = wasmExports["Pc"])(a0);
		var _sqlite3_expanded_sql = Module["_sqlite3_expanded_sql"] = (a0) => (_sqlite3_expanded_sql = Module["_sqlite3_expanded_sql"] = wasmExports["Qc"])(a0);
		var _sqlite3_value_numeric_type = Module["_sqlite3_value_numeric_type"] = (a0) => (_sqlite3_value_numeric_type = Module["_sqlite3_value_numeric_type"] = wasmExports["Rc"])(a0);
		var _sqlite3_blob_open = Module["_sqlite3_blob_open"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_sqlite3_blob_open = Module["_sqlite3_blob_open"] = wasmExports["Sc"])(a0, a1, a2, a3, a4, a5, a6, a7);
		var _sqlite3_blob_close = Module["_sqlite3_blob_close"] = (a0) => (_sqlite3_blob_close = Module["_sqlite3_blob_close"] = wasmExports["Tc"])(a0);
		var _sqlite3_blob_read = Module["_sqlite3_blob_read"] = (a0, a1, a2, a3) => (_sqlite3_blob_read = Module["_sqlite3_blob_read"] = wasmExports["Uc"])(a0, a1, a2, a3);
		var _sqlite3_blob_write = Module["_sqlite3_blob_write"] = (a0, a1, a2, a3) => (_sqlite3_blob_write = Module["_sqlite3_blob_write"] = wasmExports["Vc"])(a0, a1, a2, a3);
		var _sqlite3_blob_bytes = Module["_sqlite3_blob_bytes"] = (a0) => (_sqlite3_blob_bytes = Module["_sqlite3_blob_bytes"] = wasmExports["Wc"])(a0);
		var _sqlite3_blob_reopen = Module["_sqlite3_blob_reopen"] = (a0, a1, a2) => (_sqlite3_blob_reopen = Module["_sqlite3_blob_reopen"] = wasmExports["Xc"])(a0, a1, a2);
		var _sqlite3_set_authorizer = Module["_sqlite3_set_authorizer"] = (a0, a1, a2) => (_sqlite3_set_authorizer = Module["_sqlite3_set_authorizer"] = wasmExports["Yc"])(a0, a1, a2);
		var _sqlite3_strglob = Module["_sqlite3_strglob"] = (a0, a1) => (_sqlite3_strglob = Module["_sqlite3_strglob"] = wasmExports["Zc"])(a0, a1);
		var _sqlite3_strlike = Module["_sqlite3_strlike"] = (a0, a1, a2) => (_sqlite3_strlike = Module["_sqlite3_strlike"] = wasmExports["_c"])(a0, a1, a2);
		var _sqlite3_errmsg = Module["_sqlite3_errmsg"] = (a0) => (_sqlite3_errmsg = Module["_sqlite3_errmsg"] = wasmExports["$c"])(a0);
		var _sqlite3_auto_extension = Module["_sqlite3_auto_extension"] = (a0) => (_sqlite3_auto_extension = Module["_sqlite3_auto_extension"] = wasmExports["ad"])(a0);
		var _sqlite3_cancel_auto_extension = Module["_sqlite3_cancel_auto_extension"] = (a0) => (_sqlite3_cancel_auto_extension = Module["_sqlite3_cancel_auto_extension"] = wasmExports["bd"])(a0);
		var _sqlite3_reset_auto_extension = Module["_sqlite3_reset_auto_extension"] = () => (_sqlite3_reset_auto_extension = Module["_sqlite3_reset_auto_extension"] = wasmExports["cd"])();
		var _sqlite3_prepare = Module["_sqlite3_prepare"] = (a0, a1, a2, a3, a4) => (_sqlite3_prepare = Module["_sqlite3_prepare"] = wasmExports["dd"])(a0, a1, a2, a3, a4);
		var _sqlite3_prepare_v3 = Module["_sqlite3_prepare_v3"] = (a0, a1, a2, a3, a4, a5) => (_sqlite3_prepare_v3 = Module["_sqlite3_prepare_v3"] = wasmExports["ed"])(a0, a1, a2, a3, a4, a5);
		var _sqlite3_prepare16 = Module["_sqlite3_prepare16"] = (a0, a1, a2, a3, a4) => (_sqlite3_prepare16 = Module["_sqlite3_prepare16"] = wasmExports["fd"])(a0, a1, a2, a3, a4);
		var _sqlite3_prepare16_v2 = Module["_sqlite3_prepare16_v2"] = (a0, a1, a2, a3, a4) => (_sqlite3_prepare16_v2 = Module["_sqlite3_prepare16_v2"] = wasmExports["gd"])(a0, a1, a2, a3, a4);
		var _sqlite3_prepare16_v3 = Module["_sqlite3_prepare16_v3"] = (a0, a1, a2, a3, a4, a5) => (_sqlite3_prepare16_v3 = Module["_sqlite3_prepare16_v3"] = wasmExports["hd"])(a0, a1, a2, a3, a4, a5);
		var _sqlite3_get_table = Module["_sqlite3_get_table"] = (a0, a1, a2, a3, a4, a5) => (_sqlite3_get_table = Module["_sqlite3_get_table"] = wasmExports["id"])(a0, a1, a2, a3, a4, a5);
		var _sqlite3_free_table = Module["_sqlite3_free_table"] = (a0) => (_sqlite3_free_table = Module["_sqlite3_free_table"] = wasmExports["jd"])(a0);
		var _sqlite3_create_module = Module["_sqlite3_create_module"] = (a0, a1, a2, a3) => (_sqlite3_create_module = Module["_sqlite3_create_module"] = wasmExports["kd"])(a0, a1, a2, a3);
		var _sqlite3_create_module_v2 = Module["_sqlite3_create_module_v2"] = (a0, a1, a2, a3, a4) => (_sqlite3_create_module_v2 = Module["_sqlite3_create_module_v2"] = wasmExports["ld"])(a0, a1, a2, a3, a4);
		var _sqlite3_drop_modules = Module["_sqlite3_drop_modules"] = (a0, a1) => (_sqlite3_drop_modules = Module["_sqlite3_drop_modules"] = wasmExports["md"])(a0, a1);
		var _sqlite3_declare_vtab = Module["_sqlite3_declare_vtab"] = (a0, a1) => (_sqlite3_declare_vtab = Module["_sqlite3_declare_vtab"] = wasmExports["nd"])(a0, a1);
		var _sqlite3_vtab_on_conflict = Module["_sqlite3_vtab_on_conflict"] = (a0) => (_sqlite3_vtab_on_conflict = Module["_sqlite3_vtab_on_conflict"] = wasmExports["od"])(a0);
		var _sqlite3_vtab_config = Module["_sqlite3_vtab_config"] = (a0, a1, a2) => (_sqlite3_vtab_config = Module["_sqlite3_vtab_config"] = wasmExports["pd"])(a0, a1, a2);
		var _sqlite3_vtab_collation = Module["_sqlite3_vtab_collation"] = (a0, a1) => (_sqlite3_vtab_collation = Module["_sqlite3_vtab_collation"] = wasmExports["qd"])(a0, a1);
		var _sqlite3_vtab_in = Module["_sqlite3_vtab_in"] = (a0, a1, a2) => (_sqlite3_vtab_in = Module["_sqlite3_vtab_in"] = wasmExports["rd"])(a0, a1, a2);
		var _sqlite3_vtab_rhs_value = Module["_sqlite3_vtab_rhs_value"] = (a0, a1, a2) => (_sqlite3_vtab_rhs_value = Module["_sqlite3_vtab_rhs_value"] = wasmExports["sd"])(a0, a1, a2);
		var _sqlite3_vtab_distinct = Module["_sqlite3_vtab_distinct"] = (a0) => (_sqlite3_vtab_distinct = Module["_sqlite3_vtab_distinct"] = wasmExports["td"])(a0);
		var _sqlite3_keyword_name = Module["_sqlite3_keyword_name"] = (a0, a1, a2) => (_sqlite3_keyword_name = Module["_sqlite3_keyword_name"] = wasmExports["ud"])(a0, a1, a2);
		var _sqlite3_keyword_count = Module["_sqlite3_keyword_count"] = () => (_sqlite3_keyword_count = Module["_sqlite3_keyword_count"] = wasmExports["vd"])();
		var _sqlite3_keyword_check = Module["_sqlite3_keyword_check"] = (a0, a1) => (_sqlite3_keyword_check = Module["_sqlite3_keyword_check"] = wasmExports["wd"])(a0, a1);
		var _sqlite3_complete = Module["_sqlite3_complete"] = (a0) => (_sqlite3_complete = Module["_sqlite3_complete"] = wasmExports["xd"])(a0);
		var _sqlite3_complete16 = Module["_sqlite3_complete16"] = (a0) => (_sqlite3_complete16 = Module["_sqlite3_complete16"] = wasmExports["yd"])(a0);
		var _sqlite3_libversion = Module["_sqlite3_libversion"] = () => (_sqlite3_libversion = Module["_sqlite3_libversion"] = wasmExports["zd"])();
		var _sqlite3_libversion_number = Module["_sqlite3_libversion_number"] = () => (_sqlite3_libversion_number = Module["_sqlite3_libversion_number"] = wasmExports["Ad"])();
		var _sqlite3_threadsafe = Module["_sqlite3_threadsafe"] = () => (_sqlite3_threadsafe = Module["_sqlite3_threadsafe"] = wasmExports["Bd"])();
		var _sqlite3_initialize = Module["_sqlite3_initialize"] = () => (_sqlite3_initialize = Module["_sqlite3_initialize"] = wasmExports["Cd"])();
		var _sqlite3_shutdown = Module["_sqlite3_shutdown"] = () => (_sqlite3_shutdown = Module["_sqlite3_shutdown"] = wasmExports["Dd"])();
		var _sqlite3_config = Module["_sqlite3_config"] = (a0, a1) => (_sqlite3_config = Module["_sqlite3_config"] = wasmExports["Ed"])(a0, a1);
		var _sqlite3_db_mutex = Module["_sqlite3_db_mutex"] = (a0) => (_sqlite3_db_mutex = Module["_sqlite3_db_mutex"] = wasmExports["Fd"])(a0);
		var _sqlite3_db_release_memory = Module["_sqlite3_db_release_memory"] = (a0) => (_sqlite3_db_release_memory = Module["_sqlite3_db_release_memory"] = wasmExports["Gd"])(a0);
		var _sqlite3_db_cacheflush = Module["_sqlite3_db_cacheflush"] = (a0) => (_sqlite3_db_cacheflush = Module["_sqlite3_db_cacheflush"] = wasmExports["Hd"])(a0);
		var _sqlite3_db_config = Module["_sqlite3_db_config"] = (a0, a1, a2) => (_sqlite3_db_config = Module["_sqlite3_db_config"] = wasmExports["Id"])(a0, a1, a2);
		var _sqlite3_last_insert_rowid = Module["_sqlite3_last_insert_rowid"] = (a0) => (_sqlite3_last_insert_rowid = Module["_sqlite3_last_insert_rowid"] = wasmExports["Jd"])(a0);
		var _sqlite3_set_last_insert_rowid = Module["_sqlite3_set_last_insert_rowid"] = (a0, a1, a2) => (_sqlite3_set_last_insert_rowid = Module["_sqlite3_set_last_insert_rowid"] = wasmExports["Kd"])(a0, a1, a2);
		var _sqlite3_changes64 = Module["_sqlite3_changes64"] = (a0) => (_sqlite3_changes64 = Module["_sqlite3_changes64"] = wasmExports["Ld"])(a0);
		var _sqlite3_changes = Module["_sqlite3_changes"] = (a0) => (_sqlite3_changes = Module["_sqlite3_changes"] = wasmExports["Md"])(a0);
		var _sqlite3_total_changes64 = Module["_sqlite3_total_changes64"] = (a0) => (_sqlite3_total_changes64 = Module["_sqlite3_total_changes64"] = wasmExports["Nd"])(a0);
		var _sqlite3_total_changes = Module["_sqlite3_total_changes"] = (a0) => (_sqlite3_total_changes = Module["_sqlite3_total_changes"] = wasmExports["Od"])(a0);
		var _sqlite3_txn_state = Module["_sqlite3_txn_state"] = (a0, a1) => (_sqlite3_txn_state = Module["_sqlite3_txn_state"] = wasmExports["Pd"])(a0, a1);
		var _sqlite3_close = Module["_sqlite3_close"] = (a0) => (_sqlite3_close = Module["_sqlite3_close"] = wasmExports["Qd"])(a0);
		var _sqlite3_close_v2 = Module["_sqlite3_close_v2"] = (a0) => (_sqlite3_close_v2 = Module["_sqlite3_close_v2"] = wasmExports["Rd"])(a0);
		var _sqlite3_busy_handler = Module["_sqlite3_busy_handler"] = (a0, a1, a2) => (_sqlite3_busy_handler = Module["_sqlite3_busy_handler"] = wasmExports["Sd"])(a0, a1, a2);
		var _sqlite3_progress_handler = Module["_sqlite3_progress_handler"] = (a0, a1, a2, a3) => (_sqlite3_progress_handler = Module["_sqlite3_progress_handler"] = wasmExports["Td"])(a0, a1, a2, a3);
		var _sqlite3_busy_timeout = Module["_sqlite3_busy_timeout"] = (a0, a1) => (_sqlite3_busy_timeout = Module["_sqlite3_busy_timeout"] = wasmExports["Ud"])(a0, a1);
		var _sqlite3_interrupt = Module["_sqlite3_interrupt"] = (a0) => (_sqlite3_interrupt = Module["_sqlite3_interrupt"] = wasmExports["Vd"])(a0);
		var _sqlite3_is_interrupted = Module["_sqlite3_is_interrupted"] = (a0) => (_sqlite3_is_interrupted = Module["_sqlite3_is_interrupted"] = wasmExports["Wd"])(a0);
		var _sqlite3_create_function = Module["_sqlite3_create_function"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_sqlite3_create_function = Module["_sqlite3_create_function"] = wasmExports["Xd"])(a0, a1, a2, a3, a4, a5, a6, a7);
		var _sqlite3_create_function_v2 = Module["_sqlite3_create_function_v2"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (_sqlite3_create_function_v2 = Module["_sqlite3_create_function_v2"] = wasmExports["Yd"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
		var _sqlite3_create_window_function = Module["_sqlite3_create_window_function"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_sqlite3_create_window_function = Module["_sqlite3_create_window_function"] = wasmExports["Zd"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
		var _sqlite3_create_function16 = Module["_sqlite3_create_function16"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_sqlite3_create_function16 = Module["_sqlite3_create_function16"] = wasmExports["_d"])(a0, a1, a2, a3, a4, a5, a6, a7);
		var _sqlite3_overload_function = Module["_sqlite3_overload_function"] = (a0, a1, a2) => (_sqlite3_overload_function = Module["_sqlite3_overload_function"] = wasmExports["$d"])(a0, a1, a2);
		var _sqlite3_trace_v2 = Module["_sqlite3_trace_v2"] = (a0, a1, a2, a3) => (_sqlite3_trace_v2 = Module["_sqlite3_trace_v2"] = wasmExports["ae"])(a0, a1, a2, a3);
		var _sqlite3_commit_hook = Module["_sqlite3_commit_hook"] = (a0, a1, a2) => (_sqlite3_commit_hook = Module["_sqlite3_commit_hook"] = wasmExports["be"])(a0, a1, a2);
		var _sqlite3_update_hook = Module["_sqlite3_update_hook"] = (a0, a1, a2) => (_sqlite3_update_hook = Module["_sqlite3_update_hook"] = wasmExports["ce"])(a0, a1, a2);
		var _sqlite3_rollback_hook = Module["_sqlite3_rollback_hook"] = (a0, a1, a2) => (_sqlite3_rollback_hook = Module["_sqlite3_rollback_hook"] = wasmExports["de"])(a0, a1, a2);
		var _sqlite3_autovacuum_pages = Module["_sqlite3_autovacuum_pages"] = (a0, a1, a2, a3) => (_sqlite3_autovacuum_pages = Module["_sqlite3_autovacuum_pages"] = wasmExports["ee"])(a0, a1, a2, a3);
		var _sqlite3_wal_autocheckpoint = Module["_sqlite3_wal_autocheckpoint"] = (a0, a1) => (_sqlite3_wal_autocheckpoint = Module["_sqlite3_wal_autocheckpoint"] = wasmExports["fe"])(a0, a1);
		var _sqlite3_wal_hook = Module["_sqlite3_wal_hook"] = (a0, a1, a2) => (_sqlite3_wal_hook = Module["_sqlite3_wal_hook"] = wasmExports["ge"])(a0, a1, a2);
		var _sqlite3_wal_checkpoint_v2 = Module["_sqlite3_wal_checkpoint_v2"] = (a0, a1, a2, a3, a4) => (_sqlite3_wal_checkpoint_v2 = Module["_sqlite3_wal_checkpoint_v2"] = wasmExports["he"])(a0, a1, a2, a3, a4);
		var _sqlite3_wal_checkpoint = Module["_sqlite3_wal_checkpoint"] = (a0, a1) => (_sqlite3_wal_checkpoint = Module["_sqlite3_wal_checkpoint"] = wasmExports["ie"])(a0, a1);
		var _sqlite3_error_offset = Module["_sqlite3_error_offset"] = (a0) => (_sqlite3_error_offset = Module["_sqlite3_error_offset"] = wasmExports["je"])(a0);
		var _sqlite3_errmsg16 = Module["_sqlite3_errmsg16"] = (a0) => (_sqlite3_errmsg16 = Module["_sqlite3_errmsg16"] = wasmExports["ke"])(a0);
		var _sqlite3_errcode = Module["_sqlite3_errcode"] = (a0) => (_sqlite3_errcode = Module["_sqlite3_errcode"] = wasmExports["le"])(a0);
		var _sqlite3_extended_errcode = Module["_sqlite3_extended_errcode"] = (a0) => (_sqlite3_extended_errcode = Module["_sqlite3_extended_errcode"] = wasmExports["me"])(a0);
		var _sqlite3_system_errno = Module["_sqlite3_system_errno"] = (a0) => (_sqlite3_system_errno = Module["_sqlite3_system_errno"] = wasmExports["ne"])(a0);
		var _sqlite3_errstr = Module["_sqlite3_errstr"] = (a0) => (_sqlite3_errstr = Module["_sqlite3_errstr"] = wasmExports["oe"])(a0);
		var _sqlite3_limit = Module["_sqlite3_limit"] = (a0, a1, a2) => (_sqlite3_limit = Module["_sqlite3_limit"] = wasmExports["pe"])(a0, a1, a2);
		var _sqlite3_open = Module["_sqlite3_open"] = (a0, a1) => (_sqlite3_open = Module["_sqlite3_open"] = wasmExports["qe"])(a0, a1);
		var _sqlite3_open_v2 = Module["_sqlite3_open_v2"] = (a0, a1, a2, a3) => (_sqlite3_open_v2 = Module["_sqlite3_open_v2"] = wasmExports["re"])(a0, a1, a2, a3);
		var _sqlite3_open16 = Module["_sqlite3_open16"] = (a0, a1) => (_sqlite3_open16 = Module["_sqlite3_open16"] = wasmExports["se"])(a0, a1);
		var _sqlite3_create_collation = Module["_sqlite3_create_collation"] = (a0, a1, a2, a3, a4) => (_sqlite3_create_collation = Module["_sqlite3_create_collation"] = wasmExports["te"])(a0, a1, a2, a3, a4);
		var _sqlite3_create_collation_v2 = Module["_sqlite3_create_collation_v2"] = (a0, a1, a2, a3, a4, a5) => (_sqlite3_create_collation_v2 = Module["_sqlite3_create_collation_v2"] = wasmExports["ue"])(a0, a1, a2, a3, a4, a5);
		var _sqlite3_create_collation16 = Module["_sqlite3_create_collation16"] = (a0, a1, a2, a3, a4) => (_sqlite3_create_collation16 = Module["_sqlite3_create_collation16"] = wasmExports["ve"])(a0, a1, a2, a3, a4);
		var _sqlite3_collation_needed = Module["_sqlite3_collation_needed"] = (a0, a1, a2) => (_sqlite3_collation_needed = Module["_sqlite3_collation_needed"] = wasmExports["we"])(a0, a1, a2);
		var _sqlite3_collation_needed16 = Module["_sqlite3_collation_needed16"] = (a0, a1, a2) => (_sqlite3_collation_needed16 = Module["_sqlite3_collation_needed16"] = wasmExports["xe"])(a0, a1, a2);
		var _sqlite3_get_clientdata = Module["_sqlite3_get_clientdata"] = (a0, a1) => (_sqlite3_get_clientdata = Module["_sqlite3_get_clientdata"] = wasmExports["ye"])(a0, a1);
		var _sqlite3_set_clientdata = Module["_sqlite3_set_clientdata"] = (a0, a1, a2, a3) => (_sqlite3_set_clientdata = Module["_sqlite3_set_clientdata"] = wasmExports["ze"])(a0, a1, a2, a3);
		var _sqlite3_get_autocommit = Module["_sqlite3_get_autocommit"] = (a0) => (_sqlite3_get_autocommit = Module["_sqlite3_get_autocommit"] = wasmExports["Ae"])(a0);
		var _sqlite3_table_column_metadata = Module["_sqlite3_table_column_metadata"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (_sqlite3_table_column_metadata = Module["_sqlite3_table_column_metadata"] = wasmExports["Be"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
		var _sqlite3_sleep = Module["_sqlite3_sleep"] = (a0) => (_sqlite3_sleep = Module["_sqlite3_sleep"] = wasmExports["Ce"])(a0);
		var _sqlite3_extended_result_codes = Module["_sqlite3_extended_result_codes"] = (a0, a1) => (_sqlite3_extended_result_codes = Module["_sqlite3_extended_result_codes"] = wasmExports["De"])(a0, a1);
		var _sqlite3_file_control = Module["_sqlite3_file_control"] = (a0, a1, a2, a3) => (_sqlite3_file_control = Module["_sqlite3_file_control"] = wasmExports["Ee"])(a0, a1, a2, a3);
		var _sqlite3_test_control = Module["_sqlite3_test_control"] = (a0, a1) => (_sqlite3_test_control = Module["_sqlite3_test_control"] = wasmExports["Fe"])(a0, a1);
		var _sqlite3_create_filename = Module["_sqlite3_create_filename"] = (a0, a1, a2, a3, a4) => (_sqlite3_create_filename = Module["_sqlite3_create_filename"] = wasmExports["Ge"])(a0, a1, a2, a3, a4);
		var _sqlite3_free_filename = Module["_sqlite3_free_filename"] = (a0) => (_sqlite3_free_filename = Module["_sqlite3_free_filename"] = wasmExports["He"])(a0);
		var _sqlite3_uri_parameter = Module["_sqlite3_uri_parameter"] = (a0, a1) => (_sqlite3_uri_parameter = Module["_sqlite3_uri_parameter"] = wasmExports["Ie"])(a0, a1);
		var _sqlite3_uri_key = Module["_sqlite3_uri_key"] = (a0, a1) => (_sqlite3_uri_key = Module["_sqlite3_uri_key"] = wasmExports["Je"])(a0, a1);
		var _sqlite3_uri_boolean = Module["_sqlite3_uri_boolean"] = (a0, a1, a2) => (_sqlite3_uri_boolean = Module["_sqlite3_uri_boolean"] = wasmExports["Ke"])(a0, a1, a2);
		var _sqlite3_uri_int64 = Module["_sqlite3_uri_int64"] = (a0, a1, a2, a3) => (_sqlite3_uri_int64 = Module["_sqlite3_uri_int64"] = wasmExports["Le"])(a0, a1, a2, a3);
		var _sqlite3_filename_database = Module["_sqlite3_filename_database"] = (a0) => (_sqlite3_filename_database = Module["_sqlite3_filename_database"] = wasmExports["Me"])(a0);
		var _sqlite3_filename_journal = Module["_sqlite3_filename_journal"] = (a0) => (_sqlite3_filename_journal = Module["_sqlite3_filename_journal"] = wasmExports["Ne"])(a0);
		var _sqlite3_filename_wal = Module["_sqlite3_filename_wal"] = (a0) => (_sqlite3_filename_wal = Module["_sqlite3_filename_wal"] = wasmExports["Oe"])(a0);
		var _sqlite3_db_name = Module["_sqlite3_db_name"] = (a0, a1) => (_sqlite3_db_name = Module["_sqlite3_db_name"] = wasmExports["Pe"])(a0, a1);
		var _sqlite3_db_filename = Module["_sqlite3_db_filename"] = (a0, a1) => (_sqlite3_db_filename = Module["_sqlite3_db_filename"] = wasmExports["Qe"])(a0, a1);
		var _sqlite3_db_readonly = Module["_sqlite3_db_readonly"] = (a0, a1) => (_sqlite3_db_readonly = Module["_sqlite3_db_readonly"] = wasmExports["Re"])(a0, a1);
		var _sqlite3_compileoption_used = Module["_sqlite3_compileoption_used"] = (a0) => (_sqlite3_compileoption_used = Module["_sqlite3_compileoption_used"] = wasmExports["Se"])(a0);
		var _sqlite3_compileoption_get = Module["_sqlite3_compileoption_get"] = (a0) => (_sqlite3_compileoption_get = Module["_sqlite3_compileoption_get"] = wasmExports["Te"])(a0);
		var _sqlite3_sourceid = Module["_sqlite3_sourceid"] = () => (_sqlite3_sourceid = Module["_sqlite3_sourceid"] = wasmExports["Ue"])();
		var _malloc = Module["_malloc"] = (a0) => (_malloc = Module["_malloc"] = wasmExports["Ve"])(a0);
		var _free = Module["_free"] = (a0) => (_free = Module["_free"] = wasmExports["We"])(a0);
		var _RegisterExtensionFunctions = Module["_RegisterExtensionFunctions"] = (a0) => (_RegisterExtensionFunctions = Module["_RegisterExtensionFunctions"] = wasmExports["Xe"])(a0);
		var _getSqliteFree = Module["_getSqliteFree"] = () => (_getSqliteFree = Module["_getSqliteFree"] = wasmExports["Ye"])();
		var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["Ze"])(a0, a1);
		var _libauthorizer_set_authorizer = Module["_libauthorizer_set_authorizer"] = (a0, a1, a2) => (_libauthorizer_set_authorizer = Module["_libauthorizer_set_authorizer"] = wasmExports["_e"])(a0, a1, a2);
		var _libfunction_create_function = Module["_libfunction_create_function"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_libfunction_create_function = Module["_libfunction_create_function"] = wasmExports["$e"])(a0, a1, a2, a3, a4, a5, a6, a7);
		var _libhook_commit_hook = Module["_libhook_commit_hook"] = (a0, a1, a2) => (_libhook_commit_hook = Module["_libhook_commit_hook"] = wasmExports["af"])(a0, a1, a2);
		var _libhook_update_hook = Module["_libhook_update_hook"] = (a0, a1, a2) => (_libhook_update_hook = Module["_libhook_update_hook"] = wasmExports["bf"])(a0, a1, a2);
		var _libprogress_progress_handler = Module["_libprogress_progress_handler"] = (a0, a1, a2, a3) => (_libprogress_progress_handler = Module["_libprogress_progress_handler"] = wasmExports["cf"])(a0, a1, a2, a3);
		var _libvfs_vfs_register = Module["_libvfs_vfs_register"] = (a0, a1, a2, a3, a4, a5) => (_libvfs_vfs_register = Module["_libvfs_vfs_register"] = wasmExports["df"])(a0, a1, a2, a3, a4, a5);
		var _emscripten_builtin_memalign = (a0, a1) => (_emscripten_builtin_memalign = wasmExports["ff"])(a0, a1);
		var __emscripten_tempret_get = () => (__emscripten_tempret_get = wasmExports["gf"])();
		var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports["hf"])(a0);
		var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports["jf"])(a0);
		var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["kf"])();
		Module["_sqlite3_version"] = 3232;
		Module["getTempRet0"] = getTempRet0;
		Module["ccall"] = ccall;
		Module["cwrap"] = cwrap;
		Module["addFunction"] = addFunction;
		Module["setValue"] = setValue;
		Module["getValue"] = getValue;
		Module["UTF8ToString"] = UTF8ToString;
		Module["stringToUTF8"] = stringToUTF8;
		Module["lengthBytesUTF8"] = lengthBytesUTF8;
		Module["intArrayFromString"] = intArrayFromString;
		Module["intArrayToString"] = intArrayToString;
		Module["AsciiToString"] = AsciiToString;
		Module["UTF16ToString"] = UTF16ToString;
		Module["stringToUTF16"] = stringToUTF16;
		Module["UTF32ToString"] = UTF32ToString;
		Module["stringToUTF32"] = stringToUTF32;
		Module["writeArrayToMemory"] = writeArrayToMemory;
		var calledRun;
		dependenciesFulfilled = function runCaller() {
			if (!calledRun) run();
			if (!calledRun) dependenciesFulfilled = runCaller;
		};
		function callMain() {
			var entryFunction = _main;
			var argc = 0;
			var argv = 0;
			try {
				var ret = entryFunction(argc, argv);
				exitJS(ret, true);
				return ret;
			} catch (e) {
				return handleException(e);
			}
		}
		function run() {
			if (runDependencies > 0) return;
			preRun();
			if (runDependencies > 0) return;
			function doRun() {
				if (calledRun) return;
				calledRun = true;
				Module["calledRun"] = true;
				if (ABORT) return;
				initRuntime();
				preMain();
				readyPromiseResolve(Module);
				if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
				if (shouldRunNow) callMain();
				postRun();
			}
			if (Module["setStatus"]) {
				Module["setStatus"]("Running...");
				setTimeout(function() {
					setTimeout(function() {
						Module["setStatus"]("");
					}, 1);
					doRun();
				}, 1);
			} else doRun();
		}
		if (Module["preInit"]) {
			if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
			while (Module["preInit"].length > 0) Module["preInit"].pop()();
		}
		var shouldRunNow = true;
		if (Module["noInitialRun"]) shouldRunNow = false;
		run();
		(function() {
			const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
			let pAsyncFlags = 0;
			Module["set_authorizer"] = function(db, xAuthorizer, pApp) {
				if (pAsyncFlags) {
					Module["deleteCallback"](pAsyncFlags);
					Module["_sqlite3_free"](pAsyncFlags);
					pAsyncFlags = 0;
				}
				pAsyncFlags = Module["_sqlite3_malloc"](4);
				setValue(pAsyncFlags, xAuthorizer instanceof AsyncFunction ? 1 : 0, "i32");
				const result = ccall("libauthorizer_set_authorizer", "number", [
					"number",
					"number",
					"number"
				], [
					db,
					xAuthorizer ? 1 : 0,
					pAsyncFlags
				]);
				if (!result && xAuthorizer) Module["setCallback"](pAsyncFlags, (_, iAction, p3, p4, p5, p6) => xAuthorizer(pApp, iAction, p3, p4, p5, p6));
				return result;
			};
		})();
		(function() {
			const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
			const FUNC_METHODS = [
				"xFunc",
				"xStep",
				"xFinal"
			];
			const mapFunctionNameToKey = /* @__PURE__ */ new Map();
			Module["create_function"] = function(db, zFunctionName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
				const pAsyncFlags = Module["_sqlite3_malloc"](4);
				const target = {
					xFunc,
					xStep,
					xFinal
				};
				setValue(pAsyncFlags, FUNC_METHODS.reduce((mask, method, i) => {
					if (target[method] instanceof AsyncFunction) return mask | 1 << i;
					return mask;
				}, 0), "i32");
				const result = ccall("libfunction_create_function", "number", [
					"number",
					"string",
					"number",
					"number",
					"number",
					"number",
					"number",
					"number"
				], [
					db,
					zFunctionName,
					nArg,
					eTextRep,
					pAsyncFlags,
					xFunc ? 1 : 0,
					xStep ? 1 : 0,
					xFinal ? 1 : 0
				]);
				if (!result) {
					if (mapFunctionNameToKey.has(zFunctionName)) {
						const oldKey = mapFunctionNameToKey.get(zFunctionName);
						Module["deleteCallback"](oldKey);
					}
					mapFunctionNameToKey.set(zFunctionName, pAsyncFlags);
					Module["setCallback"](pAsyncFlags, {
						xFunc,
						xStep,
						xFinal
					});
				}
				return result;
			};
		})();
		(function() {
			const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
			let pAsyncFlags = 0;
			Module["update_hook"] = function(db, xUpdateHook) {
				if (pAsyncFlags) {
					Module["deleteCallback"](pAsyncFlags);
					Module["_sqlite3_free"](pAsyncFlags);
					pAsyncFlags = 0;
				}
				pAsyncFlags = Module["_sqlite3_malloc"](4);
				setValue(pAsyncFlags, xUpdateHook instanceof AsyncFunction ? 1 : 0, "i32");
				ccall("libhook_update_hook", "void", [
					"number",
					"number",
					"number"
				], [
					db,
					xUpdateHook ? 1 : 0,
					pAsyncFlags
				]);
				if (xUpdateHook) Module["setCallback"](pAsyncFlags, (_, iUpdateType, dbName, tblName, lo32, hi32) => xUpdateHook(iUpdateType, dbName, tblName, lo32, hi32));
			};
		})();
		(function() {
			const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
			let pAsyncFlags = 0;
			Module["commit_hook"] = function(db, xCommitHook) {
				if (pAsyncFlags) {
					Module["deleteCallback"](pAsyncFlags);
					Module["_sqlite3_free"](pAsyncFlags);
					pAsyncFlags = 0;
				}
				pAsyncFlags = Module["_sqlite3_malloc"](4);
				setValue(pAsyncFlags, xCommitHook instanceof AsyncFunction ? 1 : 0, "i32");
				ccall("libhook_commit_hook", "void", [
					"number",
					"number",
					"number"
				], [
					db,
					xCommitHook ? 1 : 0,
					pAsyncFlags
				]);
				if (xCommitHook) Module["setCallback"](pAsyncFlags, (_) => xCommitHook());
			};
		})();
		(function() {
			const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
			let pAsyncFlags = 0;
			Module["progress_handler"] = function(db, nOps, xProgress, pApp) {
				if (pAsyncFlags) {
					Module["deleteCallback"](pAsyncFlags);
					Module["_sqlite3_free"](pAsyncFlags);
					pAsyncFlags = 0;
				}
				pAsyncFlags = Module["_sqlite3_malloc"](4);
				setValue(pAsyncFlags, xProgress instanceof AsyncFunction ? 1 : 0, "i32");
				ccall("libprogress_progress_handler", "number", [
					"number",
					"number",
					"number",
					"number"
				], [
					db,
					nOps,
					xProgress ? 1 : 0,
					pAsyncFlags
				]);
				if (xProgress) Module["setCallback"](pAsyncFlags, (_) => xProgress(pApp));
			};
		})();
		(function() {
			const VFS_METHODS = [
				"xOpen",
				"xDelete",
				"xAccess",
				"xFullPathname",
				"xRandomness",
				"xSleep",
				"xCurrentTime",
				"xGetLastError",
				"xCurrentTimeInt64",
				"xClose",
				"xRead",
				"xWrite",
				"xTruncate",
				"xSync",
				"xFileSize",
				"xLock",
				"xUnlock",
				"xCheckReservedLock",
				"xFileControl",
				"xSectorSize",
				"xDeviceCharacteristics",
				"xShmMap",
				"xShmLock",
				"xShmBarrier",
				"xShmUnmap"
			];
			const mapVFSNameToKey = /* @__PURE__ */ new Map();
			Module["vfs_register"] = function(vfs, makeDefault) {
				let methodMask = 0;
				let asyncMask = 0;
				VFS_METHODS.forEach((method, i) => {
					if (vfs[method]) {
						methodMask |= 1 << i;
						if (vfs["hasAsyncMethod"](method)) asyncMask |= 1 << i;
					}
				});
				const vfsReturn = Module["_sqlite3_malloc"](4);
				try {
					const result = ccall("libvfs_vfs_register", "number", [
						"string",
						"number",
						"number",
						"number",
						"number",
						"number"
					], [
						vfs.name,
						vfs.mxPathname,
						methodMask,
						asyncMask,
						makeDefault ? 1 : 0,
						vfsReturn
					]);
					if (!result) {
						if (mapVFSNameToKey.has(vfs.name)) {
							const oldKey = mapVFSNameToKey.get(vfs.name);
							Module["deleteCallback"](oldKey);
						}
						const key = getValue(vfsReturn, "*");
						mapVFSNameToKey.set(vfs.name, key);
						Module["setCallback"](key, vfs);
					}
					return result;
				} finally {
					Module["_sqlite3_free"](vfsReturn);
				}
			};
		})();
		moduleRtn = readyPromise;
		return moduleRtn;
	});
})();
const SQLITE_OPEN_TRANSIENT_DB = 1024;
const SQLITE_OPEN_MAIN_JOURNAL = 2048;
const SQLITE_OPEN_TEMP_JOURNAL = 4096;
const SQLITE_OPEN_SUBJOURNAL = 8192;
const SQLITE_OPEN_SUPER_JOURNAL = 16384;
const SQLITE_OPEN_WAL = 524288;
const SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN = 2048;
//#endregion
//#region ../../../node_modules/.pnpm/wa-sqlite@https+++codeload.github.com+rhashimoto+wa-sqlite+tar.gz+779219540f66cecaa159da32b3b8936697ba10a7/node_modules/wa-sqlite/src/sqlite-api.js
const MAX_INT64 = 9223372036854775807n;
const MIN_INT64 = -9223372036854775808n;
const AsyncFunction$1 = Object.getPrototypeOf(async function() {}).constructor;
var SQLiteError = class extends Error {
	constructor(message, code) {
		super(message);
		this.code = code;
	}
};
const async = true;
/**
* Builds a Javascript API from the Emscripten module. This API is still
* low-level and closely corresponds to the C API exported by the module,
* but differs in some specifics like throwing exceptions on errors.
* @param {*} Module SQLite Emscripten module
* @returns {SQLiteAPI}
*/
function Factory(Module) {
	/** @type {SQLiteAPI} */ const sqlite3 = {};
	Module.retryOps = [];
	const sqliteFreeAddress = Module._getSqliteFree();
	const tmp = Module._malloc(8);
	const tmpPtr = [tmp, tmp + 4];
	const textEncoder = new TextEncoder();
	function createUTF8(s) {
		if (typeof s !== "string") return 0;
		const utf8 = textEncoder.encode(s);
		const zts = Module._sqlite3_malloc(utf8.byteLength + 1);
		Module.HEAPU8.set(utf8, zts);
		Module.HEAPU8[zts + utf8.byteLength] = 0;
		return zts;
	}
	/**
	* Concatenate 32-bit numbers into a 64-bit (signed) BigInt.
	* @param {number} lo32
	* @param {number} hi32
	* @returns {bigint}
	*/
	function cvt32x2ToBigInt(lo32, hi32) {
		return BigInt(hi32) << 32n | BigInt(lo32) & 4294967295n;
	}
	/**
	* Concatenate 32-bit numbers and return as number or BigInt, depending
	* on the value.
	* @param {number} lo32 
	* @param {number} hi32 
	* @returns {number|bigint}
	*/
	const cvt32x2AsSafe = (function() {
		const hiMax = BigInt(Number.MAX_SAFE_INTEGER) >> 32n;
		const hiMin = BigInt(Number.MIN_SAFE_INTEGER) >> 32n;
		return function(lo32, hi32) {
			if (hi32 > hiMax || hi32 < hiMin) return cvt32x2ToBigInt(lo32, hi32);
			else return hi32 * 4294967296 + (lo32 & 2147483647) - (lo32 & 2147483648);
		};
	})();
	const databases = /* @__PURE__ */ new Set();
	function verifyDatabase(db) {
		if (!databases.has(db)) throw new SQLiteError("not a database", 21);
	}
	const mapStmtToDB = /* @__PURE__ */ new Map();
	function verifyStatement(stmt) {
		if (!mapStmtToDB.has(stmt)) throw new SQLiteError("not a statement", 21);
	}
	sqlite3.bind_collection = function(stmt, bindings) {
		verifyStatement(stmt);
		const isArray = Array.isArray(bindings);
		const nBindings = sqlite3.bind_parameter_count(stmt);
		for (let i = 1; i <= nBindings; ++i) {
			const value = bindings[isArray ? i - 1 : sqlite3.bind_parameter_name(stmt, i)];
			if (value !== void 0) sqlite3.bind(stmt, i, value);
		}
		return 0;
	};
	sqlite3.bind = function(stmt, i, value) {
		verifyStatement(stmt);
		switch (typeof value) {
			case "number": if (value === (value | 0)) return sqlite3.bind_int(stmt, i, value);
			else return sqlite3.bind_double(stmt, i, value);
			case "string": return sqlite3.bind_text(stmt, i, value);
			case "boolean": return sqlite3.bind_int(stmt, i, value ? 1 : 0);
			default: if (value instanceof Uint8Array || Array.isArray(value)) return sqlite3.bind_blob(stmt, i, value);
			else if (value === null) return sqlite3.bind_null(stmt, i);
			else if (typeof value === "bigint") return sqlite3.bind_int64(stmt, i, value);
			else if (value === void 0) return 27;
			else {
				console.warn("unknown binding converted to null", value);
				return sqlite3.bind_null(stmt, i);
			}
		}
	};
	sqlite3.bind_blob = (function() {
		const fname = "sqlite3_bind_blob";
		const f = Module.cwrap(fname, ...decl("nnnnn:n"));
		return function(stmt, i, value) {
			verifyStatement(stmt);
			const byteLength = value.byteLength ?? value.length;
			const ptr = Module._sqlite3_malloc(byteLength);
			Module.HEAPU8.subarray(ptr).set(value);
			const result = f(stmt, i, ptr, byteLength, sqliteFreeAddress);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.bind_parameter_count = (function() {
		const f = Module.cwrap("sqlite3_bind_parameter_count", ...decl("n:n"));
		return function(stmt) {
			verifyStatement(stmt);
			return f(stmt);
		};
	})();
	sqlite3.bind_double = (function() {
		const fname = "sqlite3_bind_double";
		const f = Module.cwrap(fname, ...decl("nnn:n"));
		return function(stmt, i, value) {
			verifyStatement(stmt);
			const result = f(stmt, i, value);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.bind_int = (function() {
		const fname = "sqlite3_bind_int";
		const f = Module.cwrap(fname, ...decl("nnn:n"));
		return function(stmt, i, value) {
			verifyStatement(stmt);
			if (value > 2147483647 || value < -2147483648) return 25;
			const result = f(stmt, i, value);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.bind_int64 = (function() {
		const fname = "sqlite3_bind_int64";
		const f = Module.cwrap(fname, ...decl("nnnn:n"));
		return function(stmt, i, value) {
			verifyStatement(stmt);
			if (value > MAX_INT64 || value < MIN_INT64) return 25;
			const lo32 = value & 4294967295n;
			const hi32 = value >> 32n;
			const result = f(stmt, i, Number(lo32), Number(hi32));
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.bind_null = (function() {
		const fname = "sqlite3_bind_null";
		const f = Module.cwrap(fname, ...decl("nn:n"));
		return function(stmt, i) {
			verifyStatement(stmt);
			const result = f(stmt, i);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.bind_parameter_name = (function() {
		const f = Module.cwrap("sqlite3_bind_parameter_name", ...decl("n:s"));
		return function(stmt, i) {
			verifyStatement(stmt);
			return f(stmt, i);
		};
	})();
	sqlite3.bind_text = (function() {
		const fname = "sqlite3_bind_text";
		const f = Module.cwrap(fname, ...decl("nnnnn:n"));
		return function(stmt, i, value) {
			verifyStatement(stmt);
			const ptr = createUTF8(value);
			const result = f(stmt, i, ptr, -1, sqliteFreeAddress);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.changes = (function() {
		const f = Module.cwrap("sqlite3_changes", ...decl("n:n"));
		return function(db) {
			verifyDatabase(db);
			return f(db);
		};
	})();
	sqlite3.clear_bindings = (function() {
		const fname = "sqlite3_clear_bindings";
		const f = Module.cwrap(fname, ...decl("n:n"));
		return function(stmt) {
			verifyStatement(stmt);
			const result = f(stmt);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.close = (function() {
		const fname = "sqlite3_close";
		const f = Module.cwrap(fname, ...decl("n:n"), { async });
		return async function(db) {
			verifyDatabase(db);
			const result = await f(db);
			databases.delete(db);
			return check(fname, result, db);
		};
	})();
	sqlite3.column = function(stmt, iCol) {
		verifyStatement(stmt);
		const type = sqlite3.column_type(stmt, iCol);
		switch (type) {
			case 4: return sqlite3.column_blob(stmt, iCol);
			case 2: return sqlite3.column_double(stmt, iCol);
			case 1:
				const lo32 = sqlite3.column_int(stmt, iCol);
				const hi32 = Module.getTempRet0();
				return cvt32x2AsSafe(lo32, hi32);
			case 5: return null;
			case 3: return sqlite3.column_text(stmt, iCol);
			default: throw new SQLiteError("unknown type", type);
		}
	};
	sqlite3.column_blob = (function() {
		const f = Module.cwrap("sqlite3_column_blob", ...decl("nn:n"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			const nBytes = sqlite3.column_bytes(stmt, iCol);
			const address = f(stmt, iCol);
			return Module.HEAPU8.subarray(address, address + nBytes);
		};
	})();
	sqlite3.column_bytes = (function() {
		const f = Module.cwrap("sqlite3_column_bytes", ...decl("nn:n"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return f(stmt, iCol);
		};
	})();
	sqlite3.column_count = (function() {
		const f = Module.cwrap("sqlite3_column_count", ...decl("n:n"));
		return function(stmt) {
			verifyStatement(stmt);
			return f(stmt);
		};
	})();
	sqlite3.column_double = (function() {
		const f = Module.cwrap("sqlite3_column_double", ...decl("nn:n"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return f(stmt, iCol);
		};
	})();
	sqlite3.column_int = (function() {
		const f = Module.cwrap("sqlite3_column_int64", ...decl("nn:n"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return f(stmt, iCol);
		};
	})();
	sqlite3.column_int64 = (function() {
		const f = Module.cwrap("sqlite3_column_int64", ...decl("nn:n"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return cvt32x2ToBigInt(f(stmt, iCol), Module.getTempRet0());
		};
	})();
	sqlite3.column_name = (function() {
		const f = Module.cwrap("sqlite3_column_name", ...decl("nn:s"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return f(stmt, iCol);
		};
	})();
	sqlite3.column_names = function(stmt) {
		const columns = [];
		const nColumns = sqlite3.column_count(stmt);
		for (let i = 0; i < nColumns; ++i) columns.push(sqlite3.column_name(stmt, i));
		return columns;
	};
	sqlite3.column_text = (function() {
		const f = Module.cwrap("sqlite3_column_text", ...decl("nn:s"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return f(stmt, iCol);
		};
	})();
	sqlite3.column_type = (function() {
		const f = Module.cwrap("sqlite3_column_type", ...decl("nn:n"));
		return function(stmt, iCol) {
			verifyStatement(stmt);
			return f(stmt, iCol);
		};
	})();
	sqlite3.create_function = function(db, zFunctionName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
		verifyDatabase(db);
		function adapt(f) {
			return f instanceof AsyncFunction$1 ? (async (ctx, n, values) => f(ctx, Module.HEAP32.subarray(values / 4, values / 4 + n))) : ((ctx, n, values) => f(ctx, Module.HEAP32.subarray(values / 4, values / 4 + n)));
		}
		return check("sqlite3_create_function", Module.create_function(db, zFunctionName, nArg, eTextRep, pApp, xFunc && adapt(xFunc), xStep && adapt(xStep), xFinal), db);
	};
	sqlite3.data_count = (function() {
		const f = Module.cwrap("sqlite3_data_count", ...decl("n:n"));
		return function(stmt) {
			verifyStatement(stmt);
			return f(stmt);
		};
	})();
	sqlite3.exec = async function(db, sql, callback) {
		for await (const stmt of sqlite3.statements(db, sql)) {
			let columns;
			while (await sqlite3.step(stmt) === 100) if (callback) {
				columns = columns ?? sqlite3.column_names(stmt);
				await callback(sqlite3.row(stmt), columns);
			}
		}
		return 0;
	};
	sqlite3.finalize = (function() {
		const f = Module.cwrap("sqlite3_finalize", ...decl("n:n"), { async });
		return async function(stmt) {
			const result = await f(stmt);
			mapStmtToDB.delete(stmt);
			return result;
		};
	})();
	sqlite3.get_autocommit = (function() {
		const f = Module.cwrap("sqlite3_get_autocommit", ...decl("n:n"));
		return function(db) {
			return f(db);
		};
	})();
	sqlite3.libversion = (function() {
		const f = Module.cwrap("sqlite3_libversion", ...decl(":s"));
		return function() {
			return f();
		};
	})();
	sqlite3.libversion_number = (function() {
		const f = Module.cwrap("sqlite3_libversion_number", ...decl(":n"));
		return function() {
			return f();
		};
	})();
	sqlite3.limit = (function() {
		const f = Module.cwrap("sqlite3_limit", ...decl("nnn:n"));
		return function(db, id, newVal) {
			return f(db, id, newVal);
		};
	})();
	sqlite3.open_v2 = (function() {
		const fname = "sqlite3_open_v2";
		const f = Module.cwrap(fname, ...decl("snnn:n"), { async });
		return async function(zFilename, flags, zVfs) {
			flags = flags || 6;
			zVfs = createUTF8(zVfs);
			try {
				const rc = await retry(() => f(zFilename, tmpPtr[0], flags, zVfs));
				const db = Module.getValue(tmpPtr[0], "*");
				databases.add(db);
				Module.ccall("RegisterExtensionFunctions", "void", ["number"], [db]);
				check(fname, rc);
				return db;
			} finally {
				Module._sqlite3_free(zVfs);
			}
		};
	})();
	sqlite3.progress_handler = function(db, nProgressOps, handler, userData) {
		verifyDatabase(db);
		Module.progress_handler(db, nProgressOps, handler, userData);
	};
	sqlite3.reset = (function() {
		const fname = "sqlite3_reset";
		const f = Module.cwrap(fname, ...decl("n:n"), { async });
		return async function(stmt) {
			verifyStatement(stmt);
			const result = await f(stmt);
			return check(fname, result, mapStmtToDB.get(stmt));
		};
	})();
	sqlite3.result = function(context, value) {
		switch (typeof value) {
			case "number":
				if (value === (value | 0)) sqlite3.result_int(context, value);
				else sqlite3.result_double(context, value);
				break;
			case "string":
				sqlite3.result_text(context, value);
				break;
			default: if (value instanceof Uint8Array || Array.isArray(value)) sqlite3.result_blob(context, value);
			else if (value === null) sqlite3.result_null(context);
			else if (typeof value === "bigint") return sqlite3.result_int64(context, value);
			else {
				console.warn("unknown result converted to null", value);
				sqlite3.result_null(context);
			}
		}
	};
	sqlite3.result_blob = (function() {
		const f = Module.cwrap("sqlite3_result_blob", ...decl("nnnn:n"));
		return function(context, value) {
			const byteLength = value.byteLength ?? value.length;
			const ptr = Module._sqlite3_malloc(byteLength);
			Module.HEAPU8.subarray(ptr).set(value);
			f(context, ptr, byteLength, sqliteFreeAddress);
		};
	})();
	sqlite3.result_double = (function() {
		const f = Module.cwrap("sqlite3_result_double", ...decl("nn:n"));
		return function(context, value) {
			f(context, value);
		};
	})();
	sqlite3.result_int = (function() {
		const f = Module.cwrap("sqlite3_result_int", ...decl("nn:n"));
		return function(context, value) {
			f(context, value);
		};
	})();
	sqlite3.result_int64 = (function() {
		const f = Module.cwrap("sqlite3_result_int64", ...decl("nnn:n"));
		return function(context, value) {
			if (value > MAX_INT64 || value < MIN_INT64) return 25;
			const lo32 = value & 4294967295n;
			const hi32 = value >> 32n;
			f(context, Number(lo32), Number(hi32));
		};
	})();
	sqlite3.result_null = (function() {
		const f = Module.cwrap("sqlite3_result_null", ...decl("n:n"));
		return function(context) {
			f(context);
		};
	})();
	sqlite3.result_text = (function() {
		const f = Module.cwrap("sqlite3_result_text", ...decl("nnnn:n"));
		return function(context, value) {
			const ptr = createUTF8(value);
			f(context, ptr, -1, sqliteFreeAddress);
		};
	})();
	sqlite3.row = function(stmt) {
		const row = [];
		const nColumns = sqlite3.data_count(stmt);
		for (let i = 0; i < nColumns; ++i) {
			const value = sqlite3.column(stmt, i);
			row.push(value?.buffer === Module.HEAPU8.buffer ? value.slice() : value);
		}
		return row;
	};
	sqlite3.set_authorizer = function(db, xAuth, pApp) {
		verifyDatabase(db);
		function cvtArgs(_, iAction, p3, p4, p5, p6) {
			return [
				_,
				iAction,
				Module.UTF8ToString(p3),
				Module.UTF8ToString(p4),
				Module.UTF8ToString(p5),
				Module.UTF8ToString(p6)
			];
		}
		function adapt(f) {
			return f instanceof AsyncFunction$1 ? (async (_, iAction, p3, p4, p5, p6) => f(...cvtArgs(_, iAction, p3, p4, p5, p6))) : ((_, iAction, p3, p4, p5, p6) => f(...cvtArgs(_, iAction, p3, p4, p5, p6)));
		}
		return check("sqlite3_set_authorizer", Module.set_authorizer(db, adapt(xAuth), pApp), db);
	};
	sqlite3.sql = (function() {
		const f = Module.cwrap("sqlite3_sql", ...decl("n:s"));
		return function(stmt) {
			verifyStatement(stmt);
			return f(stmt);
		};
	})();
	sqlite3.statements = function(db, sql, options = {}) {
		const prepare = Module.cwrap("sqlite3_prepare_v3", "number", [
			"number",
			"number",
			"number",
			"number",
			"number",
			"number"
		], { async: true });
		return (async function* () {
			const onFinally = [];
			try {
				const utf8 = textEncoder.encode(sql);
				const allocSize = utf8.byteLength - utf8.byteLength % 4 + 12;
				const pzHead = Module._sqlite3_malloc(allocSize);
				const pzEnd = pzHead + utf8.byteLength + 1;
				onFinally.push(() => Module._sqlite3_free(pzHead));
				Module.HEAPU8.set(utf8, pzHead);
				Module.HEAPU8[pzEnd - 1] = 0;
				const pStmt = pzHead + allocSize - 8;
				const pzTail = pzHead + allocSize - 4;
				let stmt;
				function maybeFinalize() {
					if (stmt && !options.unscoped) sqlite3.finalize(stmt);
					stmt = 0;
				}
				onFinally.push(maybeFinalize);
				Module.setValue(pzTail, pzHead, "*");
				do {
					maybeFinalize();
					const zTail = Module.getValue(pzTail, "*");
					const rc = await retry(() => {
						return prepare(db, zTail, pzEnd - pzTail, options.flags || 0, pStmt, pzTail);
					});
					if (rc !== 0) check("sqlite3_prepare_v3", rc, db);
					stmt = Module.getValue(pStmt, "*");
					if (stmt) {
						mapStmtToDB.set(stmt, db);
						yield stmt;
					}
				} while (stmt);
			} finally {
				while (onFinally.length) onFinally.pop()();
			}
		})();
	};
	sqlite3.step = (function() {
		const fname = "sqlite3_step";
		const f = Module.cwrap(fname, ...decl("n:n"), { async });
		return async function(stmt) {
			verifyStatement(stmt);
			const rc = await retry(() => f(stmt));
			return check(fname, rc, mapStmtToDB.get(stmt), [100, 101]);
		};
	})();
	sqlite3.commit_hook = function(db, xCommitHook) {
		verifyDatabase(db);
		Module.commit_hook(db, xCommitHook);
	};
	sqlite3.update_hook = function(db, xUpdateHook) {
		verifyDatabase(db);
		function cvtArgs(iUpdateType, dbName, tblName, lo32, hi32) {
			return [
				iUpdateType,
				Module.UTF8ToString(dbName),
				Module.UTF8ToString(tblName),
				cvt32x2ToBigInt(lo32, hi32)
			];
		}
		function adapt(f) {
			return f instanceof AsyncFunction$1 ? (async (iUpdateType, dbName, tblName, lo32, hi32) => f(...cvtArgs(iUpdateType, dbName, tblName, lo32, hi32))) : ((iUpdateType, dbName, tblName, lo32, hi32) => f(...cvtArgs(iUpdateType, dbName, tblName, lo32, hi32)));
		}
		Module.update_hook(db, adapt(xUpdateHook));
	};
	sqlite3.value = function(pValue) {
		const type = sqlite3.value_type(pValue);
		switch (type) {
			case 4: return sqlite3.value_blob(pValue);
			case 2: return sqlite3.value_double(pValue);
			case 1:
				const lo32 = sqlite3.value_int(pValue);
				const hi32 = Module.getTempRet0();
				return cvt32x2AsSafe(lo32, hi32);
			case 5: return null;
			case 3: return sqlite3.value_text(pValue);
			default: throw new SQLiteError("unknown type", type);
		}
	};
	sqlite3.value_blob = (function() {
		const f = Module.cwrap("sqlite3_value_blob", ...decl("n:n"));
		return function(pValue) {
			const nBytes = sqlite3.value_bytes(pValue);
			const address = f(pValue);
			return Module.HEAPU8.subarray(address, address + nBytes);
		};
	})();
	sqlite3.value_bytes = (function() {
		const f = Module.cwrap("sqlite3_value_bytes", ...decl("n:n"));
		return function(pValue) {
			return f(pValue);
		};
	})();
	sqlite3.value_double = (function() {
		const f = Module.cwrap("sqlite3_value_double", ...decl("n:n"));
		return function(pValue) {
			return f(pValue);
		};
	})();
	sqlite3.value_int = (function() {
		const f = Module.cwrap("sqlite3_value_int64", ...decl("n:n"));
		return function(pValue) {
			return f(pValue);
		};
	})();
	sqlite3.value_int64 = (function() {
		const f = Module.cwrap("sqlite3_value_int64", ...decl("n:n"));
		return function(pValue) {
			return cvt32x2ToBigInt(f(pValue), Module.getTempRet0());
		};
	})();
	sqlite3.value_text = (function() {
		const f = Module.cwrap("sqlite3_value_text", ...decl("n:s"));
		return function(pValue) {
			return f(pValue);
		};
	})();
	sqlite3.value_type = (function() {
		const f = Module.cwrap("sqlite3_value_type", ...decl("n:n"));
		return function(pValue) {
			return f(pValue);
		};
	})();
	sqlite3.vfs_register = function(vfs, makeDefault) {
		return check("sqlite3_vfs_register", Module.vfs_register(vfs, makeDefault));
	};
	function check(fname, result, db = null, allowed = [0]) {
		if (allowed.includes(result)) return result;
		throw new SQLiteError(db ? Module.ccall("sqlite3_errmsg", "string", ["number"], [db]) : fname, result);
	}
	async function retry(f) {
		let rc;
		do {
			if (Module.retryOps.length) try {
				await Promise.all(Module.retryOps);
			} finally {
				Module.retryOps = [];
			}
			rc = await f();
		} while (rc && Module.retryOps.length);
		return rc;
	}
	return sqlite3;
}
function decl(s) {
	const result = [];
	const m = s.match(/([ns@]*):([nsv@])/);
	switch (m[2]) {
		case "n":
			result.push("number");
			break;
		case "s":
			result.push("string");
			break;
		case "v": result.push(null);
	}
	const args = [];
	for (let c of m[1]) switch (c) {
		case "n":
			args.push("number");
			break;
		case "s": args.push("string");
	}
	result.push(args);
	return result;
}
//#endregion
//#region ../../../node_modules/.pnpm/wa-sqlite@https+++codeload.github.com+rhashimoto+wa-sqlite+tar.gz+779219540f66cecaa159da32b3b8936697ba10a7/node_modules/wa-sqlite/src/VFS.js
const DEFAULT_SECTOR_SIZE = 512;
var Base = class {
	name;
	mxPathname = 64;
	_module;
	/**
	* @param {string} name 
	* @param {object} module 
	*/
	constructor(name, module) {
		this.name = name;
		this._module = module;
	}
	/**
	* @returns {void|Promise<void>} 
	*/
	close() {}
	/**
	* @returns {boolean|Promise<boolean>}
	*/
	isReady() {
		return true;
	}
	/**
	* Overload in subclasses to indicate which methods are asynchronous.
	* @param {string} methodName 
	* @returns {boolean}
	*/
	hasAsyncMethod(methodName) {
		return false;
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} pFile 
	* @param {number} flags 
	* @param {number} pOutFlags 
	* @returns {number|Promise<number>}
	*/
	xOpen(pVfs, zName, pFile, flags, pOutFlags) {
		return 14;
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} syncDir 
	* @returns {number|Promise<number>}
	*/
	xDelete(pVfs, zName, syncDir) {
		return 0;
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} flags 
	* @param {number} pResOut 
	* @returns {number|Promise<number>}
	*/
	xAccess(pVfs, zName, flags, pResOut) {
		return 0;
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} nOut 
	* @param {number} zOut 
	* @returns {number|Promise<number>}
	*/
	xFullPathname(pVfs, zName, nOut, zOut) {
		return 0;
	}
	/**
	* @param {number} pVfs 
	* @param {number} nBuf 
	* @param {number} zBuf 
	* @returns {number|Promise<number>}
	*/
	xGetLastError(pVfs, nBuf, zBuf) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	xClose(pFile) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} pData 
	* @param {number} iAmt 
	* @param {number} iOffsetLo 
	* @param {number} iOffsetHi 
	* @returns {number|Promise<number>}
	*/
	xRead(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} pData 
	* @param {number} iAmt 
	* @param {number} iOffsetLo 
	* @param {number} iOffsetHi 
	* @returns {number|Promise<number>}
	*/
	xWrite(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} sizeLo 
	* @param {number} sizeHi 
	* @returns {number|Promise<number>}
	*/
	xTruncate(pFile, sizeLo, sizeHi) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} flags 
	* @returns {number|Promise<number>}
	*/
	xSync(pFile, flags) {
		return 0;
	}
	/**
	* 
	* @param {number} pFile 
	* @param {number} pSize 
	* @returns {number|Promise<number>}
	*/
	xFileSize(pFile, pSize) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} lockType 
	* @returns {number|Promise<number>}
	*/
	xLock(pFile, lockType) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} lockType 
	* @returns {number|Promise<number>}
	*/
	xUnlock(pFile, lockType) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} pResOut 
	* @returns {number|Promise<number>}
	*/
	xCheckReservedLock(pFile, pResOut) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} op 
	* @param {number} pArg 
	* @returns {number|Promise<number>}
	*/
	xFileControl(pFile, op, pArg) {
		return 12;
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	xSectorSize(pFile) {
		return DEFAULT_SECTOR_SIZE;
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	xDeviceCharacteristics(pFile) {
		return 0;
	}
};
[
	256,
	SQLITE_OPEN_MAIN_JOURNAL,
	512,
	SQLITE_OPEN_TEMP_JOURNAL,
	SQLITE_OPEN_TRANSIENT_DB,
	SQLITE_OPEN_SUBJOURNAL,
	SQLITE_OPEN_SUPER_JOURNAL,
	SQLITE_OPEN_WAL
].reduce((mask, element) => mask | element);
//#endregion
//#region ../../../node_modules/.pnpm/wa-sqlite@https+++codeload.github.com+rhashimoto+wa-sqlite+tar.gz+779219540f66cecaa159da32b3b8936697ba10a7/node_modules/wa-sqlite/src/FacadeVFS.js
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
var FacadeVFS = class extends Base {
	/**
	* @param {string} name 
	* @param {object} module 
	*/
	constructor(name, module) {
		super(name, module);
	}
	/**
	* Override to indicate which methods are asynchronous.
	* @param {string} methodName 
	* @returns {boolean}
	*/
	hasAsyncMethod(methodName) {
		const jMethodName = `j${methodName.slice(1)}`;
		return this[jMethodName] instanceof AsyncFunction;
	}
	/**
	* Return the filename for a file id for use by mixins.
	* @param {number} pFile 
	* @returns {string}
	*/
	getFilename(pFile) {
		throw new Error("unimplemented");
	}
	/**
	* @param {string?} filename 
	* @param {number} pFile 
	* @param {number} flags 
	* @param {DataView} pOutFlags 
	* @returns {number|Promise<number>}
	*/
	jOpen(filename, pFile, flags, pOutFlags) {
		return 14;
	}
	/**
	* @param {string} filename 
	* @param {number} syncDir 
	* @returns {number|Promise<number>}
	*/
	jDelete(filename, syncDir) {
		return 0;
	}
	/**
	* @param {string} filename 
	* @param {number} flags 
	* @param {DataView} pResOut 
	* @returns {number|Promise<number>}
	*/
	jAccess(filename, flags, pResOut) {
		return 0;
	}
	/**
	* @param {string} filename 
	* @param {Uint8Array} zOut 
	* @returns {number|Promise<number>}
	*/
	jFullPathname(filename, zOut) {
		const { read, written } = new TextEncoder().encodeInto(filename, zOut);
		if (read < filename.length) return 10;
		if (written >= zOut.length) return 10;
		zOut[written] = 0;
		return 0;
	}
	/**
	* @param {Uint8Array} zBuf 
	* @returns {number|Promise<number>}
	*/
	jGetLastError(zBuf) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	jClose(pFile) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {Uint8Array} pData 
	* @param {number} iOffset 
	* @returns {number|Promise<number>}
	*/
	jRead(pFile, pData, iOffset) {
		pData.fill(0);
		return 522;
	}
	/**
	* @param {number} pFile 
	* @param {Uint8Array} pData 
	* @param {number} iOffset 
	* @returns {number|Promise<number>}
	*/
	jWrite(pFile, pData, iOffset) {
		return 778;
	}
	/**
	* @param {number} pFile 
	* @param {number} size 
	* @returns {number|Promise<number>}
	*/
	jTruncate(pFile, size) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} flags 
	* @returns {number|Promise<number>}
	*/
	jSync(pFile, flags) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {DataView} pSize
	* @returns {number|Promise<number>}
	*/
	jFileSize(pFile, pSize) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} lockType 
	* @returns {number|Promise<number>}
	*/
	jLock(pFile, lockType) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {number} lockType 
	* @returns {number|Promise<number>}
	*/
	jUnlock(pFile, lockType) {
		return 0;
	}
	/**
	* @param {number} pFile 
	* @param {DataView} pResOut 
	* @returns {number|Promise<number>}
	*/
	jCheckReservedLock(pFile, pResOut) {
		pResOut.setInt32(0, 0, true);
		return 0;
	}
	/**
	* @param {number} pFile
	* @param {number} op
	* @param {DataView} pArg
	* @returns {number|Promise<number>}
	*/
	jFileControl(pFile, op, pArg) {
		return 12;
	}
	/**
	* @param {number} pFile
	* @returns {number|Promise<number>}
	*/
	jSectorSize(pFile) {
		return super.xSectorSize(pFile);
	}
	/**
	* @param {number} pFile
	* @returns {number|Promise<number>}
	*/
	jDeviceCharacteristics(pFile) {
		return 0;
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} pFile 
	* @param {number} flags 
	* @param {number} pOutFlags 
	* @returns {number|Promise<number>}
	*/
	xOpen(pVfs, zName, pFile, flags, pOutFlags) {
		const filename = this.#decodeFilename(zName, flags);
		const pOutFlagsView = this.#makeTypedDataView("Int32", pOutFlags);
		this["log"]?.("jOpen", filename, pFile, "0x" + flags.toString(16));
		return this.jOpen(filename, pFile, flags, pOutFlagsView);
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} syncDir 
	* @returns {number|Promise<number>}
	*/
	xDelete(pVfs, zName, syncDir) {
		const filename = this._module.UTF8ToString(zName);
		this["log"]?.("jDelete", filename, syncDir);
		return this.jDelete(filename, syncDir);
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} flags 
	* @param {number} pResOut 
	* @returns {number|Promise<number>}
	*/
	xAccess(pVfs, zName, flags, pResOut) {
		const filename = this._module.UTF8ToString(zName);
		const pResOutView = this.#makeTypedDataView("Int32", pResOut);
		this["log"]?.("jAccess", filename, flags);
		return this.jAccess(filename, flags, pResOutView);
	}
	/**
	* @param {number} pVfs 
	* @param {number} zName 
	* @param {number} nOut 
	* @param {number} zOut 
	* @returns {number|Promise<number>}
	*/
	xFullPathname(pVfs, zName, nOut, zOut) {
		const filename = this._module.UTF8ToString(zName);
		const zOutArray = this._module.HEAPU8.subarray(zOut, zOut + nOut);
		this["log"]?.("jFullPathname", filename, nOut);
		return this.jFullPathname(filename, zOutArray);
	}
	/**
	* @param {number} pVfs 
	* @param {number} nBuf 
	* @param {number} zBuf 
	* @returns {number|Promise<number>}
	*/
	xGetLastError(pVfs, nBuf, zBuf) {
		const zBufArray = this._module.HEAPU8.subarray(zBuf, zBuf + nBuf);
		this["log"]?.("jGetLastError", nBuf);
		return this.jGetLastError(zBufArray);
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	xClose(pFile) {
		this["log"]?.("jClose", pFile);
		return this.jClose(pFile);
	}
	/**
	* @param {number} pFile 
	* @param {number} pData 
	* @param {number} iAmt 
	* @param {number} iOffsetLo 
	* @param {number} iOffsetHi 
	* @returns {number|Promise<number>}
	*/
	xRead(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
		const pDataArray = this.#makeDataArray(pData, iAmt);
		const iOffset = delegalize(iOffsetLo, iOffsetHi);
		this["log"]?.("jRead", pFile, iAmt, iOffset);
		return this.jRead(pFile, pDataArray, iOffset);
	}
	/**
	* @param {number} pFile 
	* @param {number} pData 
	* @param {number} iAmt 
	* @param {number} iOffsetLo 
	* @param {number} iOffsetHi 
	* @returns {number|Promise<number>}
	*/
	xWrite(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
		const pDataArray = this.#makeDataArray(pData, iAmt);
		const iOffset = delegalize(iOffsetLo, iOffsetHi);
		this["log"]?.("jWrite", pFile, pDataArray, iOffset);
		return this.jWrite(pFile, pDataArray, iOffset);
	}
	/**
	* @param {number} pFile 
	* @param {number} sizeLo 
	* @param {number} sizeHi 
	* @returns {number|Promise<number>}
	*/
	xTruncate(pFile, sizeLo, sizeHi) {
		const size = delegalize(sizeLo, sizeHi);
		this["log"]?.("jTruncate", pFile, size);
		return this.jTruncate(pFile, size);
	}
	/**
	* @param {number} pFile 
	* @param {number} flags 
	* @returns {number|Promise<number>}
	*/
	xSync(pFile, flags) {
		this["log"]?.("jSync", pFile, flags);
		return this.jSync(pFile, flags);
	}
	/**
	* 
	* @param {number} pFile 
	* @param {number} pSize 
	* @returns {number|Promise<number>}
	*/
	xFileSize(pFile, pSize) {
		const pSizeView = this.#makeTypedDataView("BigInt64", pSize);
		this["log"]?.("jFileSize", pFile);
		return this.jFileSize(pFile, pSizeView);
	}
	/**
	* @param {number} pFile 
	* @param {number} lockType 
	* @returns {number|Promise<number>}
	*/
	xLock(pFile, lockType) {
		this["log"]?.("jLock", pFile, lockType);
		return this.jLock(pFile, lockType);
	}
	/**
	* @param {number} pFile 
	* @param {number} lockType 
	* @returns {number|Promise<number>}
	*/
	xUnlock(pFile, lockType) {
		this["log"]?.("jUnlock", pFile, lockType);
		return this.jUnlock(pFile, lockType);
	}
	/**
	* @param {number} pFile 
	* @param {number} pResOut 
	* @returns {number|Promise<number>}
	*/
	xCheckReservedLock(pFile, pResOut) {
		const pResOutView = this.#makeTypedDataView("Int32", pResOut);
		this["log"]?.("jCheckReservedLock", pFile);
		return this.jCheckReservedLock(pFile, pResOutView);
	}
	/**
	* @param {number} pFile 
	* @param {number} op 
	* @param {number} pArg 
	* @returns {number|Promise<number>}
	*/
	xFileControl(pFile, op, pArg) {
		const pArgView = new DataView(this._module.HEAPU8.buffer, this._module.HEAPU8.byteOffset + pArg);
		this["log"]?.("jFileControl", pFile, op, pArgView);
		return this.jFileControl(pFile, op, pArgView);
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	xSectorSize(pFile) {
		this["log"]?.("jSectorSize", pFile);
		return this.jSectorSize(pFile);
	}
	/**
	* @param {number} pFile 
	* @returns {number|Promise<number>}
	*/
	xDeviceCharacteristics(pFile) {
		this["log"]?.("jDeviceCharacteristics", pFile);
		return this.jDeviceCharacteristics(pFile);
	}
	/**
	* Wrapped DataView for pointer arguments.
	* Pointers to a single value are passed using a DataView-like class.
	* This wrapper class prevents use of incorrect type or endianness, and
	* reacquires the underlying buffer when the WebAssembly memory is resized.
	* @param {'Int32'|'BigInt64'} type 
	* @param {number} byteOffset 
	* @returns {DataView}
	*/
	#makeTypedDataView(type, byteOffset) {
		return new DataViewProxy(this._module, byteOffset, type);
	}
	/**
	* Wrapped Uint8Array for buffer arguments.
	* Memory blocks are passed as a Uint8Array-like class. This wrapper
	* class reacquires the underlying buffer when the WebAssembly memory
	* is resized.
	* @param {number} byteOffset 
	* @param {number} byteLength 
	* @returns {Uint8Array}
	*/
	#makeDataArray(byteOffset, byteLength) {
		return new Uint8ArrayProxy(this._module, byteOffset, byteLength);
	}
	#decodeFilename(zName, flags) {
		if (flags & 64) {
			let pName = zName;
			let state = 1;
			const charCodes = [];
			while (state) {
				const charCode = this._module.HEAPU8[pName++];
				if (charCode) charCodes.push(charCode);
				else {
					if (!this._module.HEAPU8[pName]) state = null;
					switch (state) {
						case 1:
							charCodes.push("?".charCodeAt(0));
							state = 2;
							break;
						case 2:
							charCodes.push("=".charCodeAt(0));
							state = 3;
							break;
						case 3:
							charCodes.push("&".charCodeAt(0));
							state = 2;
					}
				}
			}
			return new TextDecoder().decode(new Uint8Array(charCodes));
		}
		return zName ? this._module.UTF8ToString(zName) : null;
	}
};
function delegalize(lo32, hi32) {
	return hi32 * 4294967296 + lo32 + (lo32 < 0 ? 2 ** 32 : 0);
}
var Uint8ArrayProxy = class {
	#module;
	#_array = /* @__PURE__ */ new Uint8Array();
	get #array() {
		if (this.#_array.buffer.byteLength === 0) this.#_array = this.#module.HEAPU8.subarray(this.byteOffset, this.byteOffset + this.byteLength);
		return this.#_array;
	}
	/**
	* @param {*} module
	* @param {number} byteOffset 
	* @param {number} byteLength 
	*/
	constructor(module, byteOffset, byteLength) {
		this.#module = module;
		this.byteOffset = byteOffset;
		this.length = this.byteLength = byteLength;
	}
	get buffer() {
		return this.#array.buffer;
	}
	at(index) {
		return this.#array.at(index);
	}
	copyWithin(target, start, end) {
		this.#array.copyWithin(target, start, end);
	}
	entries() {
		return this.#array.entries();
	}
	every(predicate) {
		return this.#array.every(predicate);
	}
	fill(value, start, end) {
		this.#array.fill(value, start, end);
	}
	filter(predicate) {
		return this.#array.filter(predicate);
	}
	find(predicate) {
		return this.#array.find(predicate);
	}
	findIndex(predicate) {
		return this.#array.findIndex(predicate);
	}
	findLast(predicate) {
		return this.#array.findLast(predicate);
	}
	findLastIndex(predicate) {
		return this.#array.findLastIndex(predicate);
	}
	forEach(callback) {
		this.#array.forEach(callback);
	}
	includes(value, start) {
		return this.#array.includes(value, start);
	}
	indexOf(value, start) {
		return this.#array.indexOf(value, start);
	}
	join(separator) {
		return this.#array.join(separator);
	}
	keys() {
		return this.#array.keys();
	}
	lastIndexOf(value, start) {
		return this.#array.lastIndexOf(value, start);
	}
	map(callback) {
		return this.#array.map(callback);
	}
	reduce(callback, initialValue) {
		return this.#array.reduce(callback, initialValue);
	}
	reduceRight(callback, initialValue) {
		return this.#array.reduceRight(callback, initialValue);
	}
	reverse() {
		this.#array.reverse();
	}
	set(array, offset) {
		this.#array.set(array, offset);
	}
	slice(start, end) {
		return this.#array.slice(start, end);
	}
	some(predicate) {
		return this.#array.some(predicate);
	}
	sort(compareFn) {
		this.#array.sort(compareFn);
	}
	subarray(begin, end) {
		return this.#array.subarray(begin, end);
	}
	toLocaleString(locales, options) {
		return this.#array.toLocaleString(locales, options);
	}
	toReversed() {
		return this.#array.toReversed();
	}
	toSorted(compareFn) {
		return this.#array.toSorted(compareFn);
	}
	toString() {
		return this.#array.toString();
	}
	values() {
		return this.#array.values();
	}
	with(index, value) {
		return this.#array.with(index, value);
	}
	[Symbol.iterator]() {
		return this.#array[Symbol.iterator]();
	}
};
var DataViewProxy = class {
	#module;
	#type;
	#_view = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(0));
	get #view() {
		if (this.#_view.buffer.byteLength === 0) this.#_view = new DataView(this.#module.HEAPU8.buffer, this.#module.HEAPU8.byteOffset + this.byteOffset);
		return this.#_view;
	}
	/**
	* @param {*} module
	* @param {number} byteOffset 
	* @param {'Int32'|'BigInt64'} type
	*/
	constructor(module, byteOffset, type) {
		this.#module = module;
		this.byteOffset = byteOffset;
		this.#type = type;
	}
	get buffer() {
		return this.#view.buffer;
	}
	get byteLength() {
		return this.#type === "Int32" ? 4 : 8;
	}
	getInt32(byteOffset, littleEndian) {
		if (this.#type !== "Int32") throw new Error("invalid type");
		if (!littleEndian) throw new Error("must be little endian");
		return this.#view.getInt32(byteOffset, littleEndian);
	}
	setInt32(byteOffset, value, littleEndian) {
		if (this.#type !== "Int32") throw new Error("invalid type");
		if (!littleEndian) throw new Error("must be little endian");
		this.#view.setInt32(byteOffset, value, littleEndian);
	}
	getBigInt64(byteOffset, littleEndian) {
		if (this.#type !== "BigInt64") throw new Error("invalid type");
		if (!littleEndian) throw new Error("must be little endian");
		return this.#view.getBigInt64(byteOffset, littleEndian);
	}
	setBigInt64(byteOffset, value, littleEndian) {
		if (this.#type !== "BigInt64") throw new Error("invalid type");
		if (!littleEndian) throw new Error("must be little endian");
		this.#view.setBigInt64(byteOffset, value, littleEndian);
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/wa-sqlite@https+++codeload.github.com+rhashimoto+wa-sqlite+tar.gz+779219540f66cecaa159da32b3b8936697ba10a7/node_modules/wa-sqlite/src/examples/AccessHandlePoolVFS.js
const SECTOR_SIZE = 4096;
const HEADER_MAX_PATH_SIZE = 512;
const HEADER_DIGEST_SIZE = 8;
const HEADER_CORPUS_SIZE = 516;
const HEADER_OFFSET_FLAGS = HEADER_MAX_PATH_SIZE;
const HEADER_OFFSET_DIGEST = HEADER_CORPUS_SIZE;
const HEADER_OFFSET_DATA = SECTOR_SIZE;
const PERSISTENT_FILE_TYPES = 542976;
const DEFAULT_CAPACITY = 6;
/**
* This VFS uses the updated Access Handle API with all synchronous methods
* on FileSystemSyncAccessHandle (instead of just read and write). It will
* work with the regular SQLite WebAssembly build, i.e. the one without
* Asyncify.
*/
var AccessHandlePoolVFS = class AccessHandlePoolVFS extends FacadeVFS {
	log = null;
	#directoryPath;
	#directoryHandle;
	#mapAccessHandleToName = /* @__PURE__ */ new Map();
	#mapPathToAccessHandle = /* @__PURE__ */ new Map();
	#availableAccessHandles = /* @__PURE__ */ new Set();
	#mapIdToFile = /* @__PURE__ */ new Map();
	static async create(name, module) {
		const vfs = new AccessHandlePoolVFS(name, module);
		await vfs.isReady();
		return vfs;
	}
	constructor(name, module) {
		super(name, module);
		this.#directoryPath = name;
	}
	/**
	* @param {string?} zName 
	* @param {number} fileId 
	* @param {number} flags 
	* @param {DataView} pOutFlags 
	* @returns {number}
	*/
	jOpen(zName, fileId, flags, pOutFlags) {
		try {
			const path = zName ? this.#getPath(zName) : Math.random().toString(36);
			let accessHandle = this.#mapPathToAccessHandle.get(path);
			if (!accessHandle && flags & 4) {
				if (this.getSize() < this.getCapacity()) {
					[accessHandle] = this.#availableAccessHandles.keys();
					this.#setAssociatedPath(accessHandle, path, flags);
				} else throw new Error("cannot create file");
			}
			if (!accessHandle) throw new Error("file not found");
			const file = {
				path,
				flags,
				accessHandle
			};
			this.#mapIdToFile.set(fileId, file);
			pOutFlags.setInt32(0, flags, true);
			return 0;
		} catch (e) {
			console.error(e.message);
			return 14;
		}
	}
	/**
	* @param {number} fileId 
	* @returns {number}
	*/
	jClose(fileId) {
		const file = this.#mapIdToFile.get(fileId);
		if (file) {
			file.accessHandle.flush();
			this.#mapIdToFile.delete(fileId);
			if (file.flags & 8) this.#deletePath(file.path);
		}
		return 0;
	}
	/**
	* @param {number} fileId 
	* @param {Uint8Array} pData 
	* @param {number} iOffset
	* @returns {number}
	*/
	jRead(fileId, pData, iOffset) {
		const nBytes = this.#mapIdToFile.get(fileId).accessHandle.read(pData.subarray(), { at: HEADER_OFFSET_DATA + iOffset });
		if (nBytes < pData.byteLength) {
			pData.fill(0, nBytes, pData.byteLength);
			return 522;
		}
		return 0;
	}
	/**
	* @param {number} fileId 
	* @param {Uint8Array} pData 
	* @param {number} iOffset
	* @returns {number}
	*/
	jWrite(fileId, pData, iOffset) {
		return this.#mapIdToFile.get(fileId).accessHandle.write(pData.subarray(), { at: HEADER_OFFSET_DATA + iOffset }) === pData.byteLength ? 0 : 10;
	}
	/**
	* @param {number} fileId 
	* @param {number} iSize 
	* @returns {number}
	*/
	jTruncate(fileId, iSize) {
		this.#mapIdToFile.get(fileId).accessHandle.truncate(HEADER_OFFSET_DATA + iSize);
		return 0;
	}
	/**
	* @param {number} fileId 
	* @param {number} flags 
	* @returns {number}
	*/
	jSync(fileId, flags) {
		this.#mapIdToFile.get(fileId).accessHandle.flush();
		return 0;
	}
	/**
	* @param {number} fileId 
	* @param {DataView} pSize64 
	* @returns {number}
	*/
	jFileSize(fileId, pSize64) {
		const size = this.#mapIdToFile.get(fileId).accessHandle.getSize() - HEADER_OFFSET_DATA;
		pSize64.setBigInt64(0, BigInt(size), true);
		return 0;
	}
	jSectorSize(fileId) {
		return SECTOR_SIZE;
	}
	jDeviceCharacteristics(fileId) {
		return SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
	}
	/**
	* @param {string} zName 
	* @param {number} flags 
	* @param {DataView} pResOut 
	* @returns {number}
	*/
	jAccess(zName, flags, pResOut) {
		const path = this.#getPath(zName);
		pResOut.setInt32(0, this.#mapPathToAccessHandle.has(path) ? 1 : 0, true);
		return 0;
	}
	/**
	* @param {string} zName 
	* @param {number} syncDir 
	* @returns {number}
	*/
	jDelete(zName, syncDir) {
		const path = this.#getPath(zName);
		this.#deletePath(path);
		return 0;
	}
	async close() {
		await this.#releaseAccessHandles();
	}
	async isReady() {
		if (!this.#directoryHandle) {
			let handle = await navigator.storage.getDirectory();
			for (const d of this.#directoryPath.split("/")) if (d) handle = await handle.getDirectoryHandle(d, { create: true });
			this.#directoryHandle = handle;
			await this.#acquireAccessHandles();
			if (this.getCapacity() === 0) await this.addCapacity(DEFAULT_CAPACITY);
		}
		return true;
	}
	/**
	* Returns the number of SQLite files in the file system.
	* @returns {number}
	*/
	getSize() {
		return this.#mapPathToAccessHandle.size;
	}
	/**
	* Returns the maximum number of SQLite files the file system can hold.
	* @returns {number}
	*/
	getCapacity() {
		return this.#mapAccessHandleToName.size;
	}
	/**
	* Increase the capacity of the file system by n.
	* @param {number} n 
	* @returns {Promise<number>} 
	*/
	async addCapacity(n) {
		for (let i = 0; i < n; ++i) {
			const name = Math.random().toString(36).replace("0.", "");
			const accessHandle = await (await this.#directoryHandle.getFileHandle(name, { create: true })).createSyncAccessHandle();
			this.#mapAccessHandleToName.set(accessHandle, name);
			this.#setAssociatedPath(accessHandle, "", 0);
		}
		return n;
	}
	/**
	* Decrease the capacity of the file system by n. The capacity cannot be
	* decreased to fewer than the current number of SQLite files in the
	* file system.
	* @param {number} n 
	* @returns {Promise<number>}
	*/
	async removeCapacity(n) {
		let nRemoved = 0;
		for (const accessHandle of Array.from(this.#availableAccessHandles)) {
			if (nRemoved == n || this.getSize() === this.getCapacity()) return nRemoved;
			const name = this.#mapAccessHandleToName.get(accessHandle);
			await accessHandle.close();
			await this.#directoryHandle.removeEntry(name);
			this.#mapAccessHandleToName.delete(accessHandle);
			this.#availableAccessHandles.delete(accessHandle);
			++nRemoved;
		}
		return nRemoved;
	}
	async #acquireAccessHandles() {
		const files = [];
		for await (const [name, handle] of this.#directoryHandle) if (handle.kind === "file") files.push([name, handle]);
		await Promise.all(files.map(async ([name, handle]) => {
			const accessHandle = await handle.createSyncAccessHandle();
			this.#mapAccessHandleToName.set(accessHandle, name);
			const path = this.#getAssociatedPath(accessHandle);
			if (path) this.#mapPathToAccessHandle.set(path, accessHandle);
			else this.#availableAccessHandles.add(accessHandle);
		}));
	}
	#releaseAccessHandles() {
		for (const accessHandle of this.#mapAccessHandleToName.keys()) accessHandle.close();
		this.#mapAccessHandleToName.clear();
		this.#mapPathToAccessHandle.clear();
		this.#availableAccessHandles.clear();
	}
	/**
	* Read and return the associated path from an OPFS file header.
	* Empty string is returned for an unassociated OPFS file.
	* @param accessHandle FileSystemSyncAccessHandle
	* @returns {string} path or empty string
	*/
	#getAssociatedPath(accessHandle) {
		const corpus = new Uint8Array(HEADER_CORPUS_SIZE);
		accessHandle.read(corpus, { at: 0 });
		const flags = new DataView(corpus.buffer, corpus.byteOffset).getUint32(HEADER_OFFSET_FLAGS);
		if (corpus[0] && (flags & 8 || (flags & PERSISTENT_FILE_TYPES) === 0)) {
			console.warn(`Remove file with unexpected flags ${flags.toString(16)}`);
			this.#setAssociatedPath(accessHandle, "", 0);
			return "";
		}
		const fileDigest = new Uint32Array(HEADER_DIGEST_SIZE / 4);
		accessHandle.read(fileDigest, { at: HEADER_OFFSET_DIGEST });
		const computedDigest = this.#computeDigest(corpus);
		if (fileDigest.every((value, i) => value === computedDigest[i])) {
			const pathBytes = corpus.findIndex((value) => value === 0);
			if (pathBytes === 0) accessHandle.truncate(HEADER_OFFSET_DATA);
			return new TextDecoder().decode(corpus.subarray(0, pathBytes));
		} else {
			console.warn("Disassociating file with bad digest.");
			this.#setAssociatedPath(accessHandle, "", 0);
			return "";
		}
	}
	/**
	* Set the path on an OPFS file header.
	* @param accessHandle FileSystemSyncAccessHandle
	* @param {string} path
	* @param {number} flags
	*/
	#setAssociatedPath(accessHandle, path, flags) {
		const corpus = new Uint8Array(HEADER_CORPUS_SIZE);
		if (new TextEncoder().encodeInto(path, corpus).written >= HEADER_MAX_PATH_SIZE) throw new Error("path too long");
		new DataView(corpus.buffer, corpus.byteOffset).setUint32(HEADER_OFFSET_FLAGS, flags);
		const digest = this.#computeDigest(corpus);
		accessHandle.write(corpus, { at: 0 });
		accessHandle.write(digest, { at: HEADER_OFFSET_DIGEST });
		accessHandle.flush();
		if (path) {
			this.#mapPathToAccessHandle.set(path, accessHandle);
			this.#availableAccessHandles.delete(accessHandle);
		} else {
			accessHandle.truncate(HEADER_OFFSET_DATA);
			this.#availableAccessHandles.add(accessHandle);
		}
	}
	/**
	* We need a synchronous digest function so can't use WebCrypto.
	* Adapted from https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
	* @param {Uint8Array} corpus 
	* @returns {ArrayBuffer} 64-bit digest
	*/
	#computeDigest(corpus) {
		if (!corpus[0]) return new Uint32Array([4274806656, 2899230775]);
		let h1 = 3735928559;
		let h2 = 1103547991;
		for (const value of corpus) {
			h1 = Math.imul(h1 ^ value, 2654435761);
			h2 = Math.imul(h2 ^ value, 1597334677);
		}
		h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
		h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
		return new Uint32Array([h1 >>> 0, h2 >>> 0]);
	}
	/**
	* Convert a bare filename, path, or URL to a UNIX-style path.
	* @param {string|URL} nameOrURL
	* @returns {string} path
	*/
	#getPath(nameOrURL) {
		return (typeof nameOrURL === "string" ? new URL(nameOrURL, "file://localhost/") : nameOrURL).pathname;
	}
	/**
	* Remove the association between a path and an OPFS file.
	* @param {string} path 
	*/
	#deletePath(path) {
		const accessHandle = this.#mapPathToAccessHandle.get(path);
		if (accessHandle) {
			this.#mapPathToAccessHandle.delete(path);
			this.#setAssociatedPath(accessHandle, "", 0);
		}
	}
};
//#endregion
//#region src/app/workers/data/db.ts
/**
* Database schema definition
*
* Currently only includes nodeTypes table. Additional tables (executions,
* credentials, workflows) will be added when they are needed.
*/
const databaseSchema = { tables: {
	nodeTypes: {
		name: "nodeTypes",
		schema: `
				CREATE TABLE IF NOT EXISTS nodeTypes (
					id TEXT PRIMARY KEY,
					data TEXT NOT NULL,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`
	},
	metadata: {
		name: "metadata",
		schema: `
				CREATE TABLE IF NOT EXISTS metadata (
					key TEXT PRIMARY KEY,
					value TEXT NOT NULL,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`
	}
} };
/**
* Get all table creation SQL statements
*/
function getAllTableSchemas() {
	return Object.values(databaseSchema.tables).map((table) => table.schema);
}
//#endregion
//#region ../../@n8n/utils/src/errors/ensure-error.ts
/** Ensures `error` is an `Error */
function ensureError(error) {
	return error instanceof Error ? error : new Error("Error that was not an instance of Error was thrown", { cause: new Error(String(error)) });
}
//#endregion
//#region ../../@n8n/utils/src/sleep.ts
async function sleepWithAbort(ms, abortSignal) {
	return await new Promise((resolve, reject) => {
		if (abortSignal.aborted) {
			reject(ensureError(abortSignal.reason));
			return;
		}
		const onAbort = () => {
			clearTimeout(timeout);
			reject(ensureError(abortSignal.reason));
		};
		const timeout = setTimeout(() => {
			abortSignal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		abortSignal.addEventListener("abort", onAbort, { once: true });
	});
}
/**
* Resolves after `ms` milliseconds, or rejects with the signal's abort reason
* if `abortSignal` fires first.
*/
async function sleep(ms, abortSignal) {
	if (!abortSignal) return await new Promise((resolve) => setTimeout(resolve, ms));
	return await sleepWithAbort(ms, abortSignal);
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/bind.js
/**
* Create a bound version of a function with a specified `this` context
*
* @param {Function} fn - The function to bind
* @param {*} thisArg - The value to be passed as the `this` parameter
* @returns {Function} A new function that will call the original function with the specified `this` context
*/
function bind(fn, thisArg) {
	return function wrap() {
		return fn.apply(thisArg, arguments);
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/utils.js
const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const { iterator, toStringTag } = Symbol;
const hasOwnProperty = (({ hasOwnProperty }) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);
const isUnsafeObjectKey = (prop) => typeof prop === "string" && (prop === "__proto__" || prop === "constructor" || prop === "prototype");
/**
* Determine whether an inherited object must be treated as a shared-prototype
* boundary. Cross-realm Object.prototype objects cannot be distinguished
* reliably from application-created null-prototype objects because their
* properties are mutable, so all inherited terminal prototypes are excluded
* as a fail-closed boundary. A null-prototype source still keeps its own
* properties, as produced by mergeConfig and other safe materialization paths.
*
* @param {*} obj The object to inspect
* @param {*} prototype The object's prototype
* @param {boolean} source Whether obj is the original traversal source
*
* @returns {boolean} True when obj is a safe prototype traversal boundary
*/
const isPrototypeBoundary = (obj, prototype, source) => obj === Object.prototype || !source && prototype === null;
/**
* Determine whether an object can retain its identity through code paths that
* add, replace, and remove config properties without bypassing unsafe-key
* filtering. Immutable objects, unsafe-key-bearing objects, and objects with
* accessor or restricted data properties must be materialized instead.
*
* @param {*} obj The object to inspect
*
* @returns {boolean} True when every own property is safe and fully mutable
*/
const isSafeAndFullyMutable = (obj) => {
	if (!Object.isExtensible(obj)) return false;
	const props = Object.getOwnPropertyNames(obj);
	if (Object.getOwnPropertySymbols) props.push(...Object.getOwnPropertySymbols(obj));
	return props.every((prop) => {
		if (isUnsafeObjectKey(prop)) return false;
		const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
		return !!descriptor && descriptor.configurable && descriptor.writable === true;
	});
};
/**
* Walk the prototype chain (excluding the source realm's Object.prototype)
* looking for an own `prop`. This distinguishes genuine own/inherited members
* — including class accessors and template prototypes — from members injected
* via Object.prototype pollution (e.g. `Object.prototype.username = '...'`),
* which live on Object.prototype itself and are therefore never matched.
*
* @param {*} thing The value whose chain to inspect
* @param {string|symbol} prop The property key to look for
*
* @returns {boolean} True when `prop` is owned below Object.prototype
*/
const hasOwnInPrototypeChain = (thing, prop) => {
	let obj = thing;
	const seen = [];
	while (obj != null) {
		if (seen.indexOf(obj) !== -1) return false;
		seen.push(obj);
		const prototype = getPrototypeOf(obj);
		if (isPrototypeBoundary(obj, prototype, obj === thing)) return false;
		if (hasOwnProperty(obj, prop)) return true;
		obj = prototype;
	}
	return false;
};
/**
* Read `obj[prop]` only when it is safe from Object.prototype pollution. Own
* properties and members inherited from a non-Object.prototype source (a class
* instance or template object) are honored; a value reachable only through a
* polluted Object.prototype is ignored and `undefined` is returned.
*
* @param {*} obj The source object
* @param {string|symbol} prop The property key to read
*
* @returns {*} The resolved value, or undefined when unsafe/absent
*/
const getSafeProp = (obj, prop) => obj != null && hasOwnInPrototypeChain(obj, prop) ? obj[prop] : void 0;
/**
* Flatten an object and its application-defined prototype chain into a
* null-prototype object. Members inherited only from the source realm's
* Object.prototype are deliberately excluded, while class/template members
* below that boundary are preserved.
*
* @param {*} thing The value to flatten
*
* @returns {*} A null-prototype copy, or the original value when it is already
* structurally safe or is not an object
*/
const toSafeFlatObject = (thing) => {
	if (thing == null || typeof thing !== "object" && typeof thing !== "function") return thing;
	const sourcePrototype = getPrototypeOf(thing);
	if (sourcePrototype === null && isSafeAndFullyMutable(thing)) return thing;
	const result = Object.create(null);
	const merged = Object.create(null);
	const seen = [];
	let current = thing;
	while (current != null) {
		if (seen.indexOf(current) !== -1) break;
		seen.push(current);
		const prototype = current === thing ? sourcePrototype : getPrototypeOf(current);
		if (isPrototypeBoundary(current, prototype, current === thing)) break;
		const props = Object.getOwnPropertyNames(current);
		if (Object.getOwnPropertySymbols) props.push(...Object.getOwnPropertySymbols(current));
		for (const prop of props) {
			if (isUnsafeObjectKey(prop)) continue;
			if (!hasOwnProperty(merged, prop)) {
				result[prop] = thing[prop];
				merged[prop] = true;
			}
		}
		current = prototype;
	}
	return result;
};
const kindOf = ((cache) => (thing) => {
	const str = toString.call(thing);
	return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));
const kindOfTest = (type) => {
	type = type.toLowerCase();
	return (thing) => kindOf(thing) === type;
};
const typeOfTest = (type) => (thing) => typeof thing === type;
/**
* Determine if a value is a non-null object
*
* @param {Object} val The value to test
*
* @returns {boolean} True if value is an Array, otherwise false
*/
const { isArray } = Array;
/**
* Determine if a value is undefined
*
* @param {*} val The value to test
*
* @returns {boolean} True if the value is undefined, otherwise false
*/
const isUndefined = typeOfTest("undefined");
/**
* Determine if a value is a Buffer
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a Buffer, otherwise false
*/
function isBuffer(val) {
	return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
/**
* Determine if a value is an ArrayBuffer
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is an ArrayBuffer, otherwise false
*/
const isArrayBuffer = kindOfTest("ArrayBuffer");
/**
* Determine if a value is a view on an ArrayBuffer
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
*/
function isArrayBufferView(val) {
	let result;
	if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) result = ArrayBuffer.isView(val);
	else result = val && val.buffer && isArrayBuffer(val.buffer);
	return result;
}
/**
* Determine if a value is a String
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a String, otherwise false
*/
const isString = typeOfTest("string");
/**
* Determine if a value is a Function
*
* @param {*} val The value to test
* @returns {boolean} True if value is a Function, otherwise false
*/
const isFunction$1 = typeOfTest("function");
/**
* Determine if a value is a Number
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a Number, otherwise false
*/
const isNumber = typeOfTest("number");
/**
* Determine if a value is an Object
*
* @param {*} thing The value to test
*
* @returns {boolean} True if value is an Object, otherwise false
*/
const isObject = (thing) => thing !== null && typeof thing === "object";
/**
* Determine if a value is a Boolean
*
* @param {*} thing The value to test
* @returns {boolean} True if value is a Boolean, otherwise false
*/
const isBoolean = (thing) => thing === true || thing === false;
/**
* Determine if a value is a plain Object
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a plain Object, otherwise false
*/
const isPlainObject = (val) => {
	if (!isObject(val)) return false;
	const prototype = getPrototypeOf(val);
	return (prototype === null || prototype === Object.prototype || getPrototypeOf(prototype) === null) && !hasOwnInPrototypeChain(val, toStringTag) && !hasOwnInPrototypeChain(val, iterator);
};
/**
* Determine if a value is an empty object (safely handles Buffers)
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is an empty object, otherwise false
*/
const isEmptyObject = (val) => {
	if (!isObject(val) || isBuffer(val)) return false;
	try {
		return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
	} catch (e) {
		return false;
	}
};
/**
* Determine if a value is a Date
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a Date, otherwise false
*/
const isDate = kindOfTest("Date");
/**
* Determine if a value is a File
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a File, otherwise false
*/
const isFile = kindOfTest("File");
/**
* Determine if a value is a React Native Blob
* React Native "blob": an object with a `uri` attribute. Optionally, it can
* also have a `name` and `type` attribute to specify filename and content type
*
* @see https://github.com/facebook/react-native/blob/26684cf3adf4094eb6c405d345a75bf8c7c0bf88/Libraries/Network/FormData.js#L68-L71
*
* @param {*} value The value to test
*
* @returns {boolean} True if value is a React Native Blob, otherwise false
*/
const isReactNativeBlob = (value) => {
	return !!(value && typeof value.uri !== "undefined");
};
/**
* Determine if environment is React Native
* ReactNative `FormData` has a non-standard `getParts()` method
*
* @param {*} formData The formData to test
*
* @returns {boolean} True if environment is React Native, otherwise false
*/
const isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
/**
* Determine if a value is a Blob
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a Blob, otherwise false
*/
const isBlob = kindOfTest("Blob");
/**
* Determine if a value is a FileList
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a FileList, otherwise false
*/
const isFileList = kindOfTest("FileList");
const isSet = kindOfTest("Set");
/**
* Determine if a value is a Stream
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a Stream, otherwise false
*/
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);
/**
* Determine if a value is a FormData
*
* @param {*} thing The value to test
*
* @returns {boolean} True if value is an FormData, otherwise false
*/
function getGlobal() {
	if (typeof globalThis !== "undefined") return globalThis;
	if (typeof self !== "undefined") return self;
	if (typeof window !== "undefined") return window;
	if (typeof global !== "undefined") return global;
	return {};
}
const G = getGlobal();
const FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : void 0;
const isFormData = (thing) => {
	if (!thing) return false;
	if (FormDataCtor && thing instanceof FormDataCtor) return true;
	const proto = getPrototypeOf(thing);
	if (!proto || proto === Object.prototype) return false;
	if (!isFunction$1(thing.append)) return false;
	const kind = kindOf(thing);
	return kind === "formdata" || kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]";
};
/**
* Determine if a value is a URLSearchParams object
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a URLSearchParams object, otherwise false
*/
const isURLSearchParams = kindOfTest("URLSearchParams");
const [isReadableStream, isRequest, isResponse, isHeaders] = [
	"ReadableStream",
	"Request",
	"Response",
	"Headers"
].map(kindOfTest);
/**
* Trim excess whitespace off the beginning and end of a string
*
* @param {String} str The String to trim
*
* @returns {String} The String freed of excess whitespace
*/
const trim = (str) => {
	return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
};
/**
* Iterate over an Array or an Object invoking a function for each item.
*
* If `obj` is an Array callback will be called passing
* the value, index, and complete array for each item.
*
* If 'obj' is an Object callback will be called passing
* the value, key, and complete object for each property.
*
* @param {Object|Array<unknown>} obj The object to iterate
* @param {Function} fn The callback to invoke for each item
*
* @param {Object} [options]
* @param {Boolean} [options.allOwnKeys = false]
* @returns {any}
*/
function forEach(obj, fn, { allOwnKeys = false } = {}) {
	if (obj === null || typeof obj === "undefined") return;
	let i;
	let l;
	if (typeof obj !== "object") obj = [obj];
	if (isArray(obj)) for (i = 0, l = obj.length; i < l; i++) fn.call(null, obj[i], i, obj);
	else {
		if (isBuffer(obj)) return;
		const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
		const len = keys.length;
		let key;
		for (i = 0; i < len; i++) {
			key = keys[i];
			fn.call(null, obj[key], key, obj);
		}
	}
}
/**
* Finds a key in an object, case-insensitive, returning the actual key name.
* Returns null if the object is a Buffer or if no match is found.
*
* @param {Object} obj - The object to search.
* @param {string} key - The key to find (case-insensitive).
* @returns {?string} The actual key name if found, otherwise null.
*/
function findKey(obj, key) {
	if (isBuffer(obj)) return null;
	key = key.toLowerCase();
	const keys = Object.keys(obj);
	let i = keys.length;
	let _key;
	while (i-- > 0) {
		_key = keys[i];
		if (key === _key.toLowerCase()) return _key;
	}
	return null;
}
const _global = (() => {
	if (typeof globalThis !== "undefined") return globalThis;
	return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
const isContextDefined = (context) => !isUndefined(context) && context !== _global;
/**
* Accepts varargs expecting each argument to be an object, then
* immutably merges the properties of each object and returns result.
*
* When multiple objects contain the same key the later object in
* the arguments list will take precedence.
*
* Example:
*
* ```js
* const result = merge({foo: 123}, {foo: 456});
* console.log(result.foo); // outputs 456
* ```
*
* @param {Object} obj1 Object to merge
*
* @returns {Object} Result of all merge properties
*/
function merge$1(...objs) {
	const { caseless, skipUndefined } = isContextDefined(this) && this || {};
	const result = {};
	const assignValue = (val, key) => {
		if (key === "__proto__" || key === "constructor" || key === "prototype") return;
		const targetKey = caseless && typeof key === "string" && findKey(result, key) || key;
		const existing = hasOwnProperty(result, targetKey) ? result[targetKey] : void 0;
		if (isPlainObject(existing) && isPlainObject(val)) result[targetKey] = merge$1(existing, val);
		else if (isPlainObject(val)) result[targetKey] = merge$1({}, val);
		else if (isArray(val)) result[targetKey] = val.slice();
		else if (!skipUndefined || !isUndefined(val)) result[targetKey] = val;
	};
	for (let i = 0, l = objs.length; i < l; i++) {
		const source = objs[i];
		if (!source || isBuffer(source)) continue;
		forEach(source, assignValue);
		if (typeof source !== "object" || isArray(source)) continue;
		const symbols = Object.getOwnPropertySymbols(source);
		for (let j = 0; j < symbols.length; j++) {
			const symbol = symbols[j];
			if (propertyIsEnumerable.call(source, symbol)) assignValue(source[symbol], symbol);
		}
	}
	return result;
}
/**
* Extends object a by mutably adding to it the properties of object b.
*
* @param {Object} a The object to be extended
* @param {Object} b The object to copy properties from
* @param {Object} thisArg The object to bind function to
*
* @param {Object} [options]
* @param {Boolean} [options.allOwnKeys]
* @returns {Object} The resulting value of object a
*/
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
	forEach(b, (val, key) => {
		if (thisArg && isFunction$1(val)) Object.defineProperty(a, key, {
			__proto__: null,
			value: bind(val, thisArg),
			writable: true,
			enumerable: true,
			configurable: true
		});
		else Object.defineProperty(a, key, {
			__proto__: null,
			value: val,
			writable: true,
			enumerable: true,
			configurable: true
		});
	}, { allOwnKeys });
	return a;
};
/**
* Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
*
* @param {string} content with BOM
*
* @returns {string} content value without BOM
*/
const stripBOM = (content) => {
	if (content.charCodeAt(0) === 65279) content = content.slice(1);
	return content;
};
/**
* Inherit the prototype methods from one constructor into another
* @param {function} constructor
* @param {function} superConstructor
* @param {object} [props]
* @param {object} [descriptors]
*
* @returns {void}
*/
const inherits = (constructor, superConstructor, props, descriptors) => {
	constructor.prototype = Object.create(superConstructor.prototype, descriptors);
	Object.defineProperty(constructor.prototype, "constructor", {
		__proto__: null,
		value: constructor,
		writable: true,
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(constructor, "super", {
		__proto__: null,
		value: superConstructor.prototype
	});
	props && Object.assign(constructor.prototype, props);
};
/**
* Resolve object with deep prototype chain to a flat object
* @param {Object} sourceObj source object
* @param {Object} [destObj]
* @param {Function|Boolean} [filter]
* @param {Function} [propFilter]
*
* @returns {Object}
*/
const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
	let props;
	let i;
	let prop;
	const merged = {};
	destObj = destObj || {};
	if (sourceObj == null) return destObj;
	do {
		props = Object.getOwnPropertyNames(sourceObj);
		i = props.length;
		while (i-- > 0) {
			prop = props[i];
			if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
				destObj[prop] = sourceObj[prop];
				merged[prop] = true;
			}
		}
		sourceObj = filter !== false && getPrototypeOf(sourceObj);
	} while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
	return destObj;
};
/**
* Determines whether a string ends with the characters of a specified string
*
* @param {String} str
* @param {String} searchString
* @param {Number} [position= 0]
*
* @returns {boolean}
*/
const endsWith = (str, searchString, position) => {
	str = String(str);
	if (position === void 0 || position > str.length) position = str.length;
	position -= searchString.length;
	const lastIndex = str.indexOf(searchString, position);
	return lastIndex !== -1 && lastIndex === position;
};
/**
* Returns new array from array like object or null if failed
*
* @param {*} [thing]
*
* @returns {?Array}
*/
const toArray = (thing) => {
	if (!thing) return null;
	if (isArray(thing)) return thing;
	let i = thing.length;
	if (!isNumber(i)) return null;
	const arr = new Array(i);
	while (i-- > 0) arr[i] = thing[i];
	return arr;
};
/**
* Checking if the Uint8Array exists and if it does, it returns a function that checks if the
* thing passed in is an instance of Uint8Array
*
* @param {TypedArray}
*
* @returns {Array}
*/
const isTypedArray = ((TypedArray) => {
	return (thing) => {
		return TypedArray && thing instanceof TypedArray;
	};
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
/**
* For each entry in the object, call the function with the key and value.
*
* @param {Object<any, any>} obj - The object to iterate over.
* @param {Function} fn - The function to call for each entry.
*
* @returns {void}
*/
const forEachEntry = (obj, fn) => {
	const _iterator = (obj && obj[iterator]).call(obj);
	let result;
	while ((result = _iterator.next()) && !result.done) {
		const pair = result.value;
		fn.call(obj, pair[0], pair[1]);
	}
};
/**
* It takes a regular expression and a string, and returns an array of all the matches
*
* @param {string} regExp - The regular expression to match against.
* @param {string} str - The string to search.
*
* @returns {Array<boolean>}
*/
const matchAll = (regExp, str) => {
	let matches;
	const arr = [];
	while ((matches = regExp.exec(str)) !== null) arr.push(matches);
	return arr;
};
const isHTMLForm = kindOfTest("HTMLFormElement");
const toCamelCase = (str) => {
	return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
		return p1.toUpperCase() + p2;
	});
};
const { propertyIsEnumerable } = Object.prototype;
/**
* Determine if a value is a RegExp object
*
* @param {*} val The value to test
*
* @returns {boolean} True if value is a RegExp object, otherwise false
*/
const isRegExp = kindOfTest("RegExp");
const reduceDescriptors = (obj, reducer) => {
	const descriptors = Object.getOwnPropertyDescriptors(obj);
	const reducedDescriptors = {};
	forEach(descriptors, (descriptor, name) => {
		let ret;
		if ((ret = reducer(descriptor, name, obj)) !== false) reducedDescriptors[name] = ret || descriptor;
	});
	Object.defineProperties(obj, reducedDescriptors);
};
/**
* Makes all methods read-only
* @param {Object} obj
*/
const freezeMethods = (obj) => {
	reduceDescriptors(obj, (descriptor, name) => {
		if (isFunction$1(obj) && [
			"arguments",
			"caller",
			"callee"
		].includes(name)) return false;
		const value = obj[name];
		if (!isFunction$1(value)) return;
		descriptor.enumerable = false;
		if ("writable" in descriptor) {
			descriptor.writable = false;
			return;
		}
		if (!descriptor.set) descriptor.set = () => {
			throw Error("Can not rewrite read-only method '" + name + "'");
		};
	});
};
/**
* Converts an array or a delimited string into an object set with values as keys and true as values.
* Useful for fast membership checks.
*
* @param {Array|string} arrayOrString - The array or string to convert.
* @param {string} delimiter - The delimiter to use if input is a string.
* @returns {Object} An object with keys from the array or string, values set to true.
*/
const toObjectSet = (arrayOrString, delimiter) => {
	const obj = {};
	const define = (arr) => {
		arr.forEach((value) => {
			obj[value] = true;
		});
	};
	isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
	return obj;
};
const noop = () => {};
const toFiniteNumber = (value, defaultValue) => {
	return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
/**
* If the thing is a FormData object, return true, otherwise return false.
*
* @param {unknown} thing - The thing to check.
*
* @returns {boolean}
*/
function isSpecCompliantForm(thing) {
	return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
/**
* Recursively converts an object to a JSON-compatible object, handling circular references and Buffers.
*
* @param {Object} obj - The object to convert.
* @returns {Object} The JSON-compatible object.
*/
const toJSONObject = (obj) => {
	const visited = /* @__PURE__ */ new WeakSet();
	const visit = (source) => {
		if (isObject(source)) {
			if (visited.has(source)) return;
			if (isBuffer(source)) return source;
			if (!("toJSON" in source)) {
				visited.add(source);
				let target;
				if (isSet(source)) {
					target = [];
					for (const value of source) {
						const reducedValue = visit(value);
						!isUndefined(reducedValue) && target.push(reducedValue);
					}
				} else {
					target = isArray(source) ? [] : {};
					forEach(source, (value, key) => {
						const reducedValue = visit(value);
						!isUndefined(reducedValue) && (target[key] = reducedValue);
					});
				}
				visited.delete(source);
				return target;
			}
		}
		return source;
	};
	return visit(obj);
};
/**
* Determines if a value is an async function.
*
* @param {*} thing - The value to test.
* @returns {boolean} True if value is an async function, otherwise false.
*/
const isAsyncFn = kindOfTest("AsyncFunction");
/**
* Determines if a value is thenable (has then and catch methods).
*
* @param {*} thing - The value to test.
* @returns {boolean} True if value is thenable, otherwise false.
*/
const isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
/**
* Provides a cross-platform setImmediate implementation.
* Uses native setImmediate if available, otherwise falls back to postMessage or setTimeout.
*
* @param {boolean} setImmediateSupported - Whether setImmediate is supported.
* @param {boolean} postMessageSupported - Whether postMessage is supported.
* @returns {Function} A function to schedule a callback asynchronously.
*/
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
	if (setImmediateSupported) return setImmediate;
	return postMessageSupported ? ((token, callbacks) => {
		_global.addEventListener("message", ({ source, data }) => {
			if (source === _global && data === token) callbacks.length && callbacks.shift()();
		}, false);
		return (cb) => {
			callbacks.push(cb);
			_global.postMessage(token, "*");
		};
	})(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction$1(_global.postMessage));
/**
* Schedules a microtask or asynchronous callback as soon as possible.
* Uses queueMicrotask if available, otherwise falls back to process.nextTick or _setImmediate.
*
* @type {Function}
*/
const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
/**
* Determine if a value is iterable via an iterator that is NOT sourced solely
* from a polluted Object.prototype. Use this instead of `isIterable` whenever
* the iterable comes from untrusted input (e.g. user-supplied header sources),
* so `Object.prototype[Symbol.iterator] = ...` cannot turn an ordinary object
* into an attacker-controlled entries iterator.
*
* @param {*} thing The value to test
*
* @returns {boolean} True if value has a non-polluted iterator
*/
const isSafeIterable = (thing) => thing != null && hasOwnInPrototypeChain(thing, iterator) && isIterable(thing);
var utils_default = {
	isArray,
	isArrayBuffer,
	isBuffer,
	isFormData,
	isArrayBufferView,
	isString,
	isNumber,
	isBoolean,
	isObject,
	isPlainObject,
	isEmptyObject,
	isReadableStream,
	isRequest,
	isResponse,
	isHeaders,
	isUndefined,
	isDate,
	isFile,
	isReactNativeBlob,
	isReactNative,
	isBlob,
	isRegExp,
	isFunction: isFunction$1,
	isStream,
	isURLSearchParams,
	isTypedArray,
	isFileList,
	forEach,
	merge: merge$1,
	extend,
	trim,
	stripBOM,
	inherits,
	toFlatObject,
	kindOf,
	kindOfTest,
	endsWith,
	toArray,
	forEachEntry,
	matchAll,
	isHTMLForm,
	hasOwnProperty,
	hasOwnProp: hasOwnProperty,
	hasOwnInPrototypeChain,
	getSafeProp,
	toSafeFlatObject,
	reduceDescriptors,
	freezeMethods,
	toObjectSet,
	toCamelCase,
	noop,
	toFiniteNumber,
	findKey,
	global: _global,
	isContextDefined,
	isSpecCompliantForm,
	toJSONObject,
	isAsyncFn,
	isThenable,
	setImmediate: _setImmediate,
	asap,
	isIterable,
	isSafeIterable
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/parseHeaders.js
const ignoreDuplicateOf = utils_default.toObjectSet([
	"age",
	"authorization",
	"content-length",
	"content-type",
	"etag",
	"expires",
	"from",
	"host",
	"if-modified-since",
	"if-unmodified-since",
	"last-modified",
	"location",
	"max-forwards",
	"proxy-authorization",
	"referer",
	"retry-after",
	"user-agent"
]);
/**
* Parse headers into an object
*
* ```
* Date: Wed, 27 Aug 2014 08:58:49 GMT
* Content-Type: application/json
* Connection: keep-alive
* Transfer-Encoding: chunked
* ```
*
* @param {String} rawHeaders Headers needing to be parsed
*
* @returns {Object} Headers parsed into an object
*/
var parseHeaders_default = (rawHeaders) => {
	const parsed = {};
	let key;
	let val;
	let i;
	rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
		i = line.indexOf(":");
		key = line.substring(0, i).trim().toLowerCase();
		val = line.substring(i + 1).trim();
		const hasKey = utils_default.hasOwnProp(parsed, key);
		if (!key || hasKey && utils_default.hasOwnProp(ignoreDuplicateOf, key)) return;
		if (key === "set-cookie") {
			if (hasKey) parsed[key].push(val);
			else parsed[key] = [val];
		} else parsed[key] = hasKey ? parsed[key] + ", " + val : val;
	});
	return parsed;
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/sanitizeHeaderValue.js
function trimSPorHTAB(str) {
	let start = 0;
	let end = str.length;
	while (start < end) {
		const code = str.charCodeAt(start);
		if (code !== 9 && code !== 32) break;
		start += 1;
	}
	while (end > start) {
		const code = str.charCodeAt(end - 1);
		if (code !== 9 && code !== 32) break;
		end -= 1;
	}
	return start === 0 && end === str.length ? str : str.slice(start, end);
}
const INVALID_UNICODE_HEADER_VALUE_CHARS = /* @__PURE__ */ new RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g");
const INVALID_BYTE_STRING_HEADER_VALUE_CHARS = /* @__PURE__ */ new RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function sanitizeValue(value, invalidChars) {
	if (utils_default.isArray(value)) return value.map((item) => sanitizeValue(item, invalidChars));
	return trimSPorHTAB(String(value).replace(invalidChars, ""));
}
const sanitizeHeaderValue = (value) => sanitizeValue(value, INVALID_UNICODE_HEADER_VALUE_CHARS);
const sanitizeByteStringHeaderValue = (value) => sanitizeValue(value, INVALID_BYTE_STRING_HEADER_VALUE_CHARS);
function toByteStringHeaderObject(headers) {
	const byteStringHeaders = Object.create(null);
	utils_default.forEach(headers.toJSON(), (value, header) => {
		byteStringHeaders[header] = sanitizeByteStringHeaderValue(value);
	});
	return byteStringHeaders;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/AxiosHeaders.js
const $internals$1 = Symbol("internals");
function normalizeHeader(header) {
	return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
	if (value === false || value == null) return value;
	return utils_default.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}
function parseTokens(str) {
	const tokens = Object.create(null);
	const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
	let match;
	while (match = tokensRE.exec(str)) tokens[match[1]] = match[2];
	return tokens;
}
const parameterNameRE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
function trimOWS(value) {
	let start = 0;
	let end = value.length;
	while (start < end) {
		const code = value.charCodeAt(start);
		if (code !== 9 && code !== 32) break;
		start += 1;
	}
	while (end > start) {
		const code = value.charCodeAt(end - 1);
		if (code !== 9 && code !== 32) break;
		end -= 1;
	}
	return start === 0 && end === value.length ? value : value.slice(start, end);
}
function decodeQuotedString(value) {
	const last = value.length - 1;
	if (last < 1 || value.charCodeAt(0) !== 34 || value.charCodeAt(last) !== 34) return value;
	let decoded = "";
	for (let i = 1; i < last; i++) {
		const code = value.charCodeAt(i);
		if (code === 34) return value;
		if (code === 92) {
			i += 1;
			if (i >= last) return value;
		}
		decoded += value[i];
	}
	return decoded;
}
function parseParameters(value) {
	const parameters = Object.create(null);
	const str = String(value);
	let start = 0;
	let quoted = false;
	let escaped = false;
	function parseParameter(end) {
		const part = trimOWS(str.slice(start, end));
		const equals = part.indexOf("=");
		if (equals < 1) return;
		const name = trimOWS(part.slice(0, equals));
		if (!parameterNameRE.test(name)) return;
		const normalizedName = name.toLowerCase();
		if (normalizedName === "__proto__" || normalizedName === "constructor" || normalizedName === "prototype") return;
		const parameterValue = trimOWS(part.slice(equals + 1));
		parameters[normalizedName] = decodeQuotedString(parameterValue);
	}
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if (quoted) {
			if (escaped) escaped = false;
			else if (code === 92) escaped = true;
			else if (code === 34) quoted = false;
		} else if (code === 34) quoted = true;
		else if (code === 44 || code === 59) {
			parseParameter(i);
			start = i + 1;
		}
	}
	parseParameter(str.length);
	return parameters;
}
const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
	if (utils_default.isFunction(filter)) return filter.call(this, value, header);
	if (isHeaderNameFilter) value = header;
	if (!utils_default.isString(value)) return;
	if (utils_default.isString(filter)) return value.indexOf(filter) !== -1;
	if (utils_default.isRegExp(filter)) return filter.test(value);
}
function formatHeader(header) {
	return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
		return char.toUpperCase() + str;
	});
}
function buildAccessors(obj, header) {
	const accessorName = utils_default.toCamelCase(" " + header);
	[
		"get",
		"set",
		"has"
	].forEach((methodName) => {
		Object.defineProperty(obj, methodName + accessorName, {
			__proto__: null,
			value: function(arg1, arg2, arg3) {
				return this[methodName].call(this, header, arg1, arg2, arg3);
			},
			configurable: true
		});
	});
}
var AxiosHeaders = class {
	constructor(headers) {
		headers && this.set(headers);
	}
	set(header, valueOrRewrite, rewrite) {
		const self = this;
		function setHeader(_value, _header, _rewrite) {
			const lHeader = normalizeHeader(_header);
			if (!lHeader) return;
			const key = utils_default.findKey(self, lHeader);
			if (!key || self[key] === void 0 || _rewrite === true || _rewrite === void 0 && self[key] !== false) self[key || _header] = normalizeValue(_value);
		}
		const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
		if (utils_default.isPlainObject(header) || header instanceof this.constructor) setHeaders(header, valueOrRewrite);
		else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) setHeaders(parseHeaders_default(header), valueOrRewrite);
		else if (utils_default.isObject(header) && utils_default.isSafeIterable(header)) {
			let obj = Object.create(null), dest, key;
			for (const entry of header) {
				if (!utils_default.isArray(entry)) throw new TypeError("Object iterator must return a key-value pair");
				key = entry[0];
				if (utils_default.hasOwnProp(obj, key)) {
					dest = obj[key];
					obj[key] = utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]];
				} else obj[key] = entry[1];
			}
			setHeaders(obj, valueOrRewrite);
		} else header != null && setHeader(valueOrRewrite, header, rewrite);
		return this;
	}
	get(header, parser) {
		header = normalizeHeader(header);
		if (header) {
			const key = utils_default.findKey(this, header);
			if (key) {
				const value = this[key];
				if (!parser) return value;
				if (parser === true) return parseTokens(value);
				if (utils_default.isFunction(parser)) return parser.call(this, value, key);
				if (utils_default.isRegExp(parser)) return parser.exec(value);
				throw new TypeError("parser must be boolean|regexp|function");
			}
		}
	}
	has(header, matcher) {
		header = normalizeHeader(header);
		if (header) {
			const key = utils_default.findKey(this, header);
			return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
		}
		return false;
	}
	delete(header, matcher) {
		const self = this;
		let deleted = false;
		function deleteHeader(_header) {
			_header = normalizeHeader(_header);
			if (_header) {
				const key = utils_default.findKey(self, _header);
				if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
					delete self[key];
					deleted = true;
				}
			}
		}
		if (utils_default.isArray(header)) header.forEach(deleteHeader);
		else deleteHeader(header);
		return deleted;
	}
	clear(matcher) {
		const keys = Object.keys(this);
		let i = keys.length;
		let deleted = false;
		while (i--) {
			const key = keys[i];
			if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
				delete this[key];
				deleted = true;
			}
		}
		return deleted;
	}
	normalize(format) {
		const self = this;
		const headers = {};
		utils_default.forEach(this, (value, header) => {
			const key = utils_default.findKey(headers, header);
			if (key) {
				self[key] = normalizeValue(value);
				delete self[header];
				return;
			}
			const normalized = format ? formatHeader(header) : String(header).trim();
			if (normalized !== header) delete self[header];
			self[normalized] = normalizeValue(value);
			headers[normalized] = true;
		});
		return this;
	}
	concat(...targets) {
		return this.constructor.concat(this, ...targets);
	}
	toJSON(asStrings) {
		const obj = Object.create(null);
		utils_default.forEach(this, (value, header) => {
			value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
		});
		return obj;
	}
	[Symbol.iterator]() {
		return Object.entries(this.toJSON())[Symbol.iterator]();
	}
	toString() {
		return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
	}
	getSetCookie() {
		const value = this.get("set-cookie");
		return utils_default.isArray(value) ? value : value == null || value === false ? [] : [value];
	}
	get [Symbol.toStringTag]() {
		return "AxiosHeaders";
	}
	static from(thing) {
		return thing instanceof this ? thing : new this(thing);
	}
	static parseParameters(value) {
		return parseParameters(value);
	}
	static concat(first, ...targets) {
		const computed = new this(first);
		targets.forEach((target) => computed.set(target));
		return computed;
	}
	static accessor(header) {
		const accessors = (this[$internals$1] = this[$internals$1] = { accessors: {} }).accessors;
		const prototype = this.prototype;
		function defineAccessor(_header) {
			const lHeader = normalizeHeader(_header);
			if (!accessors[lHeader]) {
				buildAccessors(prototype, _header);
				accessors[lHeader] = true;
			}
		}
		utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
		return this;
	}
};
AxiosHeaders.accessor([
	"Content-Type",
	"Content-Length",
	"Accept",
	"Accept-Encoding",
	"User-Agent",
	"Authorization"
]);
utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
	let mapped = key[0].toUpperCase() + key.slice(1);
	return {
		get: () => value,
		set(headerValue) {
			this[mapped] = headerValue;
		}
	};
});
utils_default.freezeMethods(AxiosHeaders);
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/AxiosError.js
const REDACTED = "[REDACTED ****]";
function hasOwnOrPrototypeToJSON(source) {
	if (utils_default.hasOwnProp(source, "toJSON")) return true;
	let prototype = Object.getPrototypeOf(source);
	while (prototype && prototype !== Object.prototype) {
		if (utils_default.hasOwnProp(prototype, "toJSON")) return true;
		prototype = Object.getPrototypeOf(prototype);
	}
	return false;
}
function redactConfig(config, redactKeys) {
	const lowerKeys = new Set(redactKeys.map((k) => String(k).toLowerCase()));
	const seen = [];
	const visit = (source) => {
		if (source === null || typeof source !== "object") return source;
		if (utils_default.isBuffer(source)) return source;
		if (seen.indexOf(source) !== -1) return void 0;
		if (source instanceof AxiosHeaders) source = source.toJSON();
		seen.push(source);
		let result;
		if (utils_default.isArray(source)) {
			result = [];
			source.forEach((v, i) => {
				const reducedValue = visit(v);
				if (!utils_default.isUndefined(reducedValue)) result[i] = reducedValue;
			});
		} else {
			if (!utils_default.isPlainObject(source) && hasOwnOrPrototypeToJSON(source)) {
				seen.pop();
				return source;
			}
			result = Object.create(null);
			for (const [key, value] of Object.entries(source)) {
				const reducedValue = lowerKeys.has(key.toLowerCase()) ? REDACTED : visit(value);
				if (!utils_default.isUndefined(reducedValue)) result[key] = reducedValue;
			}
		}
		seen.pop();
		return result;
	};
	return visit(config);
}
function stringifySafely$1(value) {
	try {
		return String(value);
	} catch (err) {
		return "";
	}
}
function aggregateErrorMessage(error) {
	return error.errors.map((entry) => {
		try {
			return entry && entry.message ? stringifySafely$1(entry.message) : stringifySafely$1(entry);
		} catch (err) {
			return "";
		}
	}).filter(Boolean).join("; ") || error.name || "AggregateError";
}
var AxiosError = class AxiosError extends Error {
	static from(error, code, config, request, response, customProps) {
		let message = error.message;
		if (!message && utils_default.isArray(error.errors) && error.errors.length) message = aggregateErrorMessage(error);
		const axiosError = new AxiosError(message, code || error.code, config, request, response);
		Object.defineProperty(axiosError, "cause", {
			__proto__: null,
			value: error,
			writable: true,
			enumerable: false,
			configurable: true
		});
		axiosError.name = error.name;
		if (error.status != null && axiosError.status == null) axiosError.status = error.status;
		customProps && Object.assign(axiosError, customProps);
		return axiosError;
	}
	/**
	* Create an Error with the specified message, config, error code, request and response.
	*
	* @param {string} message The error message.
	* @param {string} [code] The error code (for example, 'ECONNABORTED').
	* @param {Object} [config] The config.
	* @param {Object} [request] The request.
	* @param {Object} [response] The response.
	*
	* @returns {Error} The created error.
	*/
	constructor(message, code, config, request, response) {
		super(message);
		Object.defineProperty(this, "message", {
			__proto__: null,
			value: message,
			enumerable: true,
			writable: true,
			configurable: true
		});
		this.name = "AxiosError";
		this.isAxiosError = true;
		code && (this.code = code);
		config && (this.config = config);
		request && (this.request = request);
		if (response) {
			this.response = response;
			this.status = response.status;
		}
	}
	toJSON() {
		const config = this.config;
		const redactKeys = config && utils_default.hasOwnProp(config, "redact") ? config.redact : void 0;
		const serializedConfig = utils_default.isArray(redactKeys) && redactKeys.length > 0 ? redactConfig(config, redactKeys) : utils_default.toJSONObject(config);
		return {
			message: this.message,
			name: this.name,
			description: this.description,
			number: this.number,
			fileName: this.fileName,
			lineNumber: this.lineNumber,
			columnNumber: this.columnNumber,
			stack: this.stack,
			config: serializedConfig,
			code: this.code,
			status: this.status
		};
	}
};
AxiosError.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
AxiosError.ERR_BAD_OPTION = "ERR_BAD_OPTION";
AxiosError.ECONNABORTED = "ECONNABORTED";
AxiosError.ETIMEDOUT = "ETIMEDOUT";
AxiosError.ECONNREFUSED = "ECONNREFUSED";
AxiosError.ERR_NETWORK = "ERR_NETWORK";
AxiosError.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
AxiosError.ERR_DEPRECATED = "ERR_DEPRECATED";
AxiosError.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
AxiosError.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
AxiosError.ERR_CANCELED = "ERR_CANCELED";
AxiosError.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
AxiosError.ERR_INVALID_URL = "ERR_INVALID_URL";
AxiosError.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
/**
* Determines if the given thing is a array or js object.
*
* @param {string} thing - The object or array to be visited.
*
* @returns {boolean}
*/
function isVisitable(thing) {
	return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
/**
* It removes the brackets from the end of a string
*
* @param {string} key - The key of the parameter.
*
* @returns {string} the key without the brackets.
*/
function removeBrackets(key) {
	return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
/**
* It takes a path, a key, and a boolean, and returns a string
*
* @param {string} path - The path to the current key.
* @param {string} key - The key of the current object being iterated over.
* @param {string} dots - If true, the key will be rendered with dots instead of brackets.
*
* @returns {string} The path to the current key.
*/
function renderKey(path, key, dots) {
	if (!path) return key;
	return path.concat(key).map(function each(token, i) {
		token = removeBrackets(token);
		return !dots && i ? "[" + token + "]" : token;
	}).join(dots ? "." : "");
}
/**
* If the array is an array and none of its elements are visitable, then it's a flat array.
*
* @param {Array<any>} arr - The array to check
*
* @returns {boolean}
*/
function isFlatArray(arr) {
	return utils_default.isArray(arr) && !arr.some(isVisitable);
}
const predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
	return /^is[A-Z]/.test(prop);
});
/**
* Convert a data object to FormData
*
* @param {Object} obj
* @param {?Object} [formData]
* @param {?Object} [options]
* @param {Function} [options.visitor]
* @param {Boolean} [options.metaTokens = true]
* @param {Boolean} [options.dots = false]
* @param {?Boolean} [options.indexes = false]
*
* @returns {Object}
**/
/**
* It converts an object into a FormData object
*
* @param {Object<any, any>} obj - The object to convert to form data.
* @param {string} formData - The FormData object to append to.
* @param {Object<string, any>} options
*
* @returns
*/
function toFormData(obj, formData, options) {
	if (!utils_default.isObject(obj)) throw new TypeError("target must be an object");
	formData = formData || new FormData();
	const option = (name, fallback) => {
		const value = utils_default.getSafeProp(options, name);
		return utils_default.isUndefined(value) ? fallback : value;
	};
	const metaTokens = option("metaTokens", true);
	const visitor = option("visitor") || defaultVisitor;
	const dots = option("dots", false);
	const indexes = option("indexes", false);
	const _Blob = option("Blob") || typeof Blob !== "undefined" && Blob;
	const maxDepth = option("maxDepth", 100);
	const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
	const stack = [];
	if (!utils_default.isFunction(visitor)) throw new TypeError("visitor must be a function");
	function convertValue(value) {
		if (value === null) return "";
		if (utils_default.isDate(value)) return value.toISOString();
		if (utils_default.isBoolean(value)) return value.toString();
		if (!useBlob && utils_default.isBlob(value)) throw new AxiosError("Blob is not supported. Use a Buffer instead.");
		if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
			if (useBlob && typeof _Blob === "function") return new _Blob([value]);
			throw new AxiosError("Blob is not supported. Use a Buffer instead.", AxiosError.ERR_NOT_SUPPORT);
		}
		return value;
	}
	function throwIfMaxDepthExceeded(depth) {
		if (depth > maxDepth) throw new AxiosError("Object is too deeply nested (" + depth + " levels). Max depth: " + maxDepth, AxiosError.ERR_FORM_DATA_DEPTH_EXCEEDED);
	}
	function stringifyWithDepthLimit(value, depth) {
		if (maxDepth === Infinity) return JSON.stringify(value);
		const ancestors = [];
		return JSON.stringify(value, function limitDepth(_key, currentValue) {
			if (!utils_default.isObject(currentValue)) return currentValue;
			while (ancestors.length && ancestors[ancestors.length - 1] !== this) ancestors.pop();
			ancestors.push(currentValue);
			throwIfMaxDepthExceeded(depth + ancestors.length - 1);
			return currentValue;
		});
	}
	/**
	* Default visitor.
	*
	* @param {*} value
	* @param {String|Number} key
	* @param {Array<String|Number>} path
	* @this {FormData}
	*
	* @returns {boolean} return true to visit the each prop of the value recursively
	*/
	function defaultVisitor(value, key, path) {
		let arr = value;
		if (utils_default.isReactNative(formData) && utils_default.isReactNativeBlob(value)) {
			formData.append(renderKey(path, key, dots), convertValue(value));
			return false;
		}
		if (value && !path && typeof value === "object") {
			if (utils_default.endsWith(key, "{}")) {
				key = metaTokens ? key : key.slice(0, -2);
				value = stringifyWithDepthLimit(value, 1);
			} else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
				key = removeBrackets(key);
				arr.forEach(function each(el, index) {
					!(utils_default.isUndefined(el) || el === null) && formData.append(indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]", convertValue(el));
				});
				return false;
			}
		}
		if (isVisitable(value)) return true;
		formData.append(renderKey(path, key, dots), convertValue(value));
		return false;
	}
	const exposedHelpers = Object.assign(predicates, {
		defaultVisitor,
		convertValue,
		isVisitable
	});
	function build(value, path, depth = 0) {
		if (utils_default.isUndefined(value)) return;
		throwIfMaxDepthExceeded(depth);
		if (stack.indexOf(value) !== -1) throw new Error("Circular reference detected in " + path.join("."));
		stack.push(value);
		utils_default.forEach(value, function each(el, key) {
			if ((!(utils_default.isUndefined(el) || el === null) && visitor.call(formData, el, utils_default.isString(key) ? key.trim() : key, path, exposedHelpers)) === true) build(el, path ? path.concat(key) : [key], depth + 1);
		});
		stack.pop();
	}
	if (!utils_default.isObject(obj)) throw new TypeError("data must be an object");
	build(obj);
	return formData;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/AxiosURLSearchParams.js
/**
* It encodes a string by replacing all characters that are not in the unreserved set with
* their percent-encoded equivalents
*
* @param {string} str - The string to encode.
*
* @returns {string} The encoded string.
*/
function encode$1(str) {
	const charMap = {
		"!": "%21",
		"'": "%27",
		"(": "%28",
		")": "%29",
		"~": "%7E",
		"%20": "+"
	};
	return encodeURIComponent(str).replace(/[!'()~]|%20/g, function replacer(match) {
		return charMap[match];
	});
}
/**
* It takes a params object and converts it to a FormData object
*
* @param {Object<string, any>} params - The parameters to be converted to a FormData object.
* @param {Object<string, any>} options - The options object passed to the Axios constructor.
*
* @returns {void}
*/
function AxiosURLSearchParams(params, options) {
	this._pairs = [];
	params && toFormData(params, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
	this._pairs.push([name, value]);
};
prototype.toString = function toString(encoder) {
	const _encode = encoder ? (value) => encoder.call(this, value, encode$1) : encode$1;
	return this._pairs.map(function each(pair) {
		return _encode(pair[0]) + "=" + _encode(pair[1]);
	}, "").join("&");
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/buildURL.js
/**
* It replaces URL-encoded forms of `:`, `$`, `,`, and spaces with
* their plain counterparts (`:`, `$`, `,`, `+`).
*
* @param {string} val The value to be encoded.
*
* @returns {string} The encoded value.
*/
function encode(val) {
	return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
/**
* Build a URL by appending params to the end
*
* @param {string} url The base of the url (e.g., http://www.google.com)
* @param {object} [params] The params to be appended
* @param {?(object|Function)} options
*
* @returns {string} The formatted url
*/
function buildURL(url, params, options) {
	if (!params) return url;
	url = url || "";
	const _options = utils_default.isFunction(options) ? { serialize: options } : options;
	const _encode = utils_default.getSafeProp(_options, "encode") || encode;
	const serializeFn = utils_default.getSafeProp(_options, "serialize");
	let serializedParams;
	if (serializeFn) serializedParams = serializeFn(params, _options);
	else serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, _options).toString(_encode);
	if (serializedParams) {
		const hashmarkIndex = url.indexOf("#");
		if (hashmarkIndex !== -1) url = url.slice(0, hashmarkIndex);
		url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
	}
	return url;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/InterceptorManager.js
const $internals = Symbol("internals");
function countHandlers(handlers) {
	return handlers ? handlers.length : 0;
}
function trimHandlers(handlers) {
	if (!handlers) return;
	while (handlers.length && handlers[handlers.length - 1] === null) handlers.pop();
}
function syncHandlerEntries(manager, internals) {
	const handlers = manager.handlers;
	const length = countHandlers(handlers);
	if (handlers !== internals.handlersRef) {
		internals.handlersRef = handlers;
		internals.handlerEntries.clear();
	} else if (length !== internals.handlersLength) {
		if (!length) internals.handlerEntries.clear();
		else internals.handlerEntries.forEach(function removeStaleEntry(entry, id) {
			if (handlers[entry.index] !== entry.handler) internals.handlerEntries.delete(id);
		});
	}
	internals.handlersLength = length;
}
var InterceptorManager = class {
	constructor() {
		this.handlers = [];
		this[$internals] = {
			handlersRef: this.handlers,
			handlersLength: this.handlers.length,
			handlerEntries: /* @__PURE__ */ new Map(),
			iterationDepth: 0,
			nextId: 0
		};
	}
	/**
	* Add a new interceptor to the stack
	*
	* @param {Function} fulfilled The function to handle `then` for a `Promise`
	* @param {Function} rejected The function to handle `reject` for a `Promise`
	* @param {Object} options The options for the interceptor, synchronous and runWhen
	*
	* @return {Number} An ID used to remove interceptor later
	*/
	use(fulfilled, rejected, options) {
		const handler = {
			fulfilled,
			rejected,
			synchronous: options ? options.synchronous : false,
			runWhen: options ? options.runWhen : null
		};
		const internals = this[$internals];
		if (this.handlers == null) this.handlers = [];
		syncHandlerEntries(this, internals);
		const id = internals.nextId++;
		this.handlers.push(handler);
		internals.handlerEntries.set(id, {
			handler,
			index: this.handlers.length - 1
		});
		internals.handlersLength = this.handlers.length;
		return id;
	}
	/**
	* Remove an interceptor from the stack
	*
	* @param {Number} id The ID that was returned by `use`
	*
	* @returns {void}
	*/
	eject(id) {
		const internals = this[$internals];
		syncHandlerEntries(this, internals);
		const entry = internals.handlerEntries.get(id);
		if (entry) {
			internals.handlerEntries.delete(id);
			if (this.handlers[entry.index] !== entry.handler) return;
			this.handlers[entry.index] = null;
			if (!internals.iterationDepth) {
				trimHandlers(this.handlers);
				internals.handlersLength = this.handlers.length;
			}
		}
	}
	/**
	* Clear all interceptors from the stack
	*
	* @returns {void}
	*/
	clear() {
		if (this.handlers) {
			this.handlers = [];
			syncHandlerEntries(this, this[$internals]);
		}
	}
	/**
	* Iterate over all the registered interceptors
	*
	* This method is particularly useful for skipping over any
	* interceptors that may have become `null` calling `eject`.
	*
	* @param {Function} fn The function to call for each interceptor
	*
	* @returns {void}
	*/
	forEach(fn) {
		const internals = this[$internals];
		syncHandlerEntries(this, internals);
		internals.iterationDepth++;
		try {
			utils_default.forEach(this.handlers, function forEachHandler(h) {
				if (h !== null) fn(h);
			});
		} finally {
			if (!--internals.iterationDepth) {
				syncHandlerEntries(this, internals);
				trimHandlers(this.handlers);
				internals.handlersLength = countHandlers(this.handlers);
			}
		}
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/defaults/transitional.js
var transitional_default = {
	silentJSONParsing: true,
	forcedJSONParsing: true,
	clarifyTimeoutError: false,
	legacyInterceptorReqResOrdering: true,
	advertiseZstdAcceptEncoding: false,
	validateStatusUndefinedResolves: true
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/platform/browser/index.js
var browser_default = {
	isBrowser: true,
	classes: {
		URLSearchParams: typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams,
		FormData: typeof FormData !== "undefined" ? FormData : null,
		Blob: typeof Blob !== "undefined" ? Blob : null
	},
	protocols: [
		"http",
		"https",
		"file",
		"blob",
		"url",
		"data"
	]
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/platform/common/utils.js
var utils_exports = /* @__PURE__ */ __exportAll({
	hasBrowserEnv: () => hasBrowserEnv,
	hasStandardBrowserEnv: () => hasStandardBrowserEnv,
	hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
	navigator: () => _navigator,
	origin: () => origin
});
const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
const _navigator = typeof navigator === "object" && navigator || void 0;
/**
* Determine if we're running in a standard browser environment
*
* This allows axios to run in a web worker, and react-native.
* Both environments support XMLHttpRequest, but not fully standard globals.
*
* web workers:
*  typeof window -> undefined
*  typeof document -> undefined
*
* react-native:
*  navigator.product -> 'ReactNative'
* nativescript
*  navigator.product -> 'NativeScript' or 'NS'
*
* @returns {boolean}
*/
const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || [
	"ReactNative",
	"NativeScript",
	"NS"
].indexOf(_navigator.product) < 0);
/**
* Determine if we're running in a standard browser webWorker environment
*
* Although the `isStandardBrowserEnv` method indicates that
* `allows axios to run in a web worker`, the WebWorker will still be
* filtered out due to its judgment standard
* `typeof window !== 'undefined' && typeof document !== 'undefined'`.
* This leads to a problem when axios post `FormData` in webWorker
*/
const hasStandardBrowserWebWorkerEnv = (() => {
	return typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
const origin = hasBrowserEnv && window.location.href || "http://localhost";
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/platform/index.js
var platform_default = {
	...utils_exports,
	...browser_default
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/toURLEncodedForm.js
function toURLEncodedForm(data, options) {
	return toFormData(data, new platform_default.classes.URLSearchParams(), {
		visitor: function(value, key, path, helpers) {
			if (platform_default.isNode && utils_default.isBuffer(value)) {
				this.append(key, value.toString("base64"));
				return false;
			}
			return helpers.defaultVisitor.apply(this, arguments);
		},
		...options
	});
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/formDataToJSON.js
const MAX_DEPTH = 100;
function throwIfDepthExceeded(index) {
	if (index > MAX_DEPTH) throw new AxiosError("FormData field is too deeply nested (" + index + " levels). Max depth: 100", AxiosError.ERR_FORM_DATA_DEPTH_EXCEEDED);
}
/**
* It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
*
* @param {string} name - The name of the property to get.
*
* @returns An array of strings.
*/
function parsePropPath(name) {
	const path = [];
	const pattern = /[^.[\]]+|\[([^.[\]]*)]/g;
	let match;
	while ((match = pattern.exec(name)) !== null) {
		throwIfDepthExceeded(path.length);
		path.push(match[0] === "[]" ? "" : match[1] || match[0]);
	}
	return path;
}
/**
* Convert an array to an object.
*
* @param {Array<any>} arr - The array to convert to an object.
*
* @returns An object with the same keys and values as the array.
*/
function arrayToObject(arr) {
	const obj = {};
	const keys = Object.keys(arr);
	let i;
	const len = keys.length;
	let key;
	for (i = 0; i < len; i++) {
		key = keys[i];
		obj[key] = arr[key];
	}
	return obj;
}
/**
* It takes a FormData object and returns a JavaScript object
*
* @param {string} formData The FormData object to convert to JSON.
*
* @returns {Object<string, any> | null} The converted object.
*/
function formDataToJSON(formData) {
	function buildPath(path, value, target, index) {
		throwIfDepthExceeded(index);
		let name = path[index++];
		if (name === "__proto__") return true;
		const isNumericKey = Number.isFinite(+name);
		const isLast = index >= path.length;
		name = !name && utils_default.isArray(target) ? target.length : name;
		if (isLast) {
			if (utils_default.hasOwnProp(target, name)) target[name] = utils_default.isArray(target[name]) ? target[name].concat(value) : [target[name], value];
			else target[name] = value;
			return !isNumericKey;
		}
		if (!utils_default.hasOwnProp(target, name) || !utils_default.isObject(target[name])) target[name] = [];
		if (buildPath(path, value, target[name], index) && utils_default.isArray(target[name])) target[name] = arrayToObject(target[name]);
		return !isNumericKey;
	}
	if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
		const obj = {};
		utils_default.forEachEntry(formData, (name, value) => {
			buildPath(parsePropPath(name), value, obj, 0);
		});
		return obj;
	}
	return null;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/methodList.js
const methodList = Object.freeze([
	"get",
	"delete",
	"head",
	"options",
	"post",
	"put",
	"patch",
	"purge",
	"link",
	"unlink",
	"query"
]);
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/defaults/index.js
const own = (obj, key) => obj != null && utils_default.hasOwnProp(obj, key) ? obj[key] : void 0;
/**
* It takes a string, tries to parse it, and if it fails, it returns the stringified version
* of the input
*
* @param {any} rawValue - The value to be stringified.
* @param {Function} parser - A function that parses a string into a JavaScript object.
* @param {Function} encoder - A function that takes a value and returns a string.
*
* @returns {string} A stringified version of the rawValue.
*/
function stringifySafely(rawValue, parser, encoder) {
	if (utils_default.isString(rawValue)) try {
		(parser || JSON.parse)(rawValue);
		return utils_default.trim(rawValue);
	} catch (e) {
		if (e.name !== "SyntaxError") throw e;
	}
	return (encoder || JSON.stringify)(rawValue);
}
const defaults = {
	transitional: transitional_default,
	adapter: [
		"xhr",
		"http",
		"fetch"
	],
	transformRequest: [function transformRequest(data, headers) {
		const contentType = headers.getContentType() || "";
		const hasJSONContentType = contentType.indexOf("application/json") > -1;
		const isObjectPayload = utils_default.isObject(data);
		if (isObjectPayload && utils_default.isHTMLForm(data)) data = new FormData(data);
		if (utils_default.isFormData(data)) return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
		if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) return data;
		if (utils_default.isArrayBufferView(data)) return data.buffer;
		if (utils_default.isURLSearchParams(data)) {
			headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
			return data.toString();
		}
		let isFileList;
		if (isObjectPayload) {
			const formSerializer = own(this, "formSerializer");
			if (contentType.indexOf("application/x-www-form-urlencoded") > -1) return toURLEncodedForm(data, formSerializer).toString();
			if ((isFileList = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
				const env = own(this, "env");
				const _FormData = env && env.FormData;
				return toFormData(isFileList ? { "files[]": data } : data, _FormData && new _FormData(), formSerializer);
			}
		}
		if (isObjectPayload || hasJSONContentType) {
			headers.setContentType("application/json", false);
			return stringifySafely(data);
		}
		return data;
	}],
	transformResponse: [function transformResponse(data) {
		const transitional = own(this, "transitional") || defaults.transitional;
		const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
		const responseType = own(this, "responseType");
		const JSONRequested = responseType === "json";
		if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) return data;
		if (data && utils_default.isString(data) && (forcedJSONParsing && !responseType || JSONRequested)) {
			const strictJSONParsing = !(transitional && transitional.silentJSONParsing) && JSONRequested;
			try {
				return JSON.parse(data, own(this, "parseReviver"));
			} catch (e) {
				if (strictJSONParsing) {
					if (e.name === "SyntaxError") throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, own(this, "response"));
					throw e;
				}
			}
		}
		return data;
	}],
	/**
	* A timeout in milliseconds to abort a request. If set to 0 (default) a
	* timeout is not created.
	*/
	timeout: 0,
	xsrfCookieName: "XSRF-TOKEN",
	xsrfHeaderName: "X-XSRF-TOKEN",
	maxContentLength: -1,
	maxBodyLength: -1,
	env: {
		FormData: platform_default.classes.FormData,
		Blob: platform_default.classes.Blob
	},
	validateStatus: function validateStatus(status) {
		return status >= 200 && status < 300;
	},
	headers: { common: {
		Accept: "application/json, text/plain, */*",
		"Content-Type": void 0
	} }
};
utils_default.forEach(methodList, (method) => {
	defaults.headers[method] = {};
});
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/transformData.js
/**
* Transform the data for a request or a response
*
* @param {Array|Function} fns A single function or Array of functions
* @param {?Object} response The response object
*
* @returns {*} The resulting transformed data
*/
function transformData(fns, response) {
	const config = this || defaults;
	const context = response || config;
	const headers = AxiosHeaders.from(context.headers);
	let data = context.data;
	utils_default.forEach(fns, function transform(fn) {
		data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
	});
	headers.normalize();
	return data;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/cancel/isCancel.js
function isCancel(value) {
	return !!(value && value.__CANCEL__);
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/cancel/CanceledError.js
var CanceledError = class extends AxiosError {
	/**
	* A `CanceledError` is an object that is thrown when an operation is canceled.
	*
	* @param {string=} message The message.
	* @param {Object=} config The config.
	* @param {Object=} request The request.
	*
	* @returns {CanceledError} The created error.
	*/
	constructor(message, config, request) {
		super(message == null ? "canceled" : message, AxiosError.ERR_CANCELED, config, request);
		this.name = "CanceledError";
		this.__CANCEL__ = true;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/settle.js
/**
* Resolve or reject a Promise based on response status.
*
* @param {Function} resolve A function that resolves the promise.
* @param {Function} reject A function that rejects the promise.
* @param {object} response The response.
*
* @returns {object} The response.
*/
function settle(resolve, reject, response) {
	const validateStatus = response.config.validateStatus;
	if (!response.status || !validateStatus || validateStatus(response.status)) resolve(response);
	else reject(new AxiosError("Request failed with status code " + response.status, response.status >= 400 && response.status < 500 ? AxiosError.ERR_BAD_REQUEST : AxiosError.ERR_BAD_RESPONSE, response.config, response.request, response));
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/normalizeURLForProtocolCheck.js
const urlParserControlCharacters = /[\t\n\r]/g;
/**
* Match WHATWG URL preprocessing before checking a URL's protocol.
*
* @param {string} url
*
* @returns {string}
*/
function normalizeURLForProtocolCheck(url) {
	if (typeof url !== "string") return url;
	let start = 0;
	while (start < url.length && url.charCodeAt(start) <= 32) start++;
	return url.slice(start).replace(urlParserControlCharacters, "");
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/parseProtocol.js
function parseProtocol(url) {
	const match = /^([-+\w]{1,25}):(?:\/\/)?/.exec(url);
	return match && match[1] || "";
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/speedometer.js
/**
* Calculate data maxRate
* @param {Number} [samplesCount= 10]
* @param {Number} [min= 1000]
* @returns {Function}
*/
function speedometer(samplesCount, min) {
	samplesCount = samplesCount || 10;
	const bytes = new Array(samplesCount);
	const timestamps = new Array(samplesCount);
	let head = 0;
	let tail = 0;
	let firstSampleTS;
	min = min !== void 0 ? min : 1e3;
	return function push(chunkLength) {
		const now = Date.now();
		const startedAt = timestamps[tail];
		if (!firstSampleTS) firstSampleTS = now;
		bytes[head] = chunkLength;
		timestamps[head] = now;
		let i = tail;
		let bytesCount = 0;
		while (i !== head) {
			bytesCount += bytes[i++];
			i = i % samplesCount;
		}
		head = (head + 1) % samplesCount;
		if (head === tail) tail = (tail + 1) % samplesCount;
		if (now - firstSampleTS < min) return;
		const passed = startedAt && now - startedAt;
		return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/throttle.js
/**
* Throttle decorator
* @param {Function} fn
* @param {Number} freq
* @return {Array<Function>}
*/
function throttle(fn, freq) {
	let timestamp = 0;
	let threshold = 1e3 / freq;
	let lastArgs;
	let timer;
	const invoke = (args, now = Date.now()) => {
		timestamp = now;
		lastArgs = null;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		fn(...args);
	};
	const throttled = (...args) => {
		const now = Date.now();
		const passed = now - timestamp;
		if (passed >= threshold) invoke(args, now);
		else {
			lastArgs = args;
			if (!timer) timer = setTimeout(() => {
				timer = null;
				invoke(lastArgs);
			}, threshold - passed);
		}
	};
	const flush = () => lastArgs && invoke(lastArgs);
	const flushWith = (...args) => invoke(args);
	return [
		throttled,
		flush,
		flushWith
	];
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/progressEventReducer.js
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
	let bytesNotified = 0;
	const _speedometer = speedometer(50, 250);
	return throttle((e) => {
		if (!e || !utils_default.isNumber(e.loaded)) return;
		const rawLoaded = e.loaded;
		const total = e.lengthComputable ? e.total : void 0;
		const loaded = Math.max(0, total != null ? Math.min(rawLoaded, total) : rawLoaded);
		const progressBytes = Math.max(0, loaded - bytesNotified);
		const rate = _speedometer(progressBytes);
		bytesNotified = Math.max(bytesNotified, loaded);
		listener({
			loaded,
			total,
			progress: total ? loaded / total : void 0,
			bytes: progressBytes,
			rate: rate ? rate : void 0,
			estimated: rate && total ? (total - loaded) / rate : void 0,
			event: e,
			lengthComputable: total != null,
			[isDownloadStream ? "download" : "upload"]: true
		});
	}, freq);
};
const progressEventDecorator = (total, throttled) => {
	const lengthComputable = total != null;
	return [(loaded) => throttled[0]({
		lengthComputable,
		total,
		loaded
	}), throttled[1]];
};
const asyncDecorator = (fn, scheduler = utils_default.asap) => (...args) => scheduler(() => fn(...args));
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/isURLSameOrigin.js
var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? ((origin, isMSIE) => (url) => {
	url = new URL(url, platform_default.origin);
	return origin.protocol === url.protocol && origin.host === url.host && (isMSIE || origin.port === url.port);
})(new URL(platform_default.origin), platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)) : () => true;
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/cookies.js
var cookies_default = platform_default.hasStandardBrowserEnv ? {
	write(name, value, expires, path, domain, secure, sameSite) {
		if (typeof document === "undefined") return;
		const cookie = [`${name}=${encodeURIComponent(value)}`];
		if (utils_default.isNumber(expires)) cookie.push(`expires=${new Date(expires).toUTCString()}`);
		if (utils_default.isString(path)) cookie.push(`path=${path}`);
		if (utils_default.isString(domain)) cookie.push(`domain=${domain}`);
		if (secure === true) cookie.push("secure");
		if (utils_default.isString(sameSite)) cookie.push(`SameSite=${sameSite}`);
		document.cookie = cookie.join("; ");
	},
	read(name) {
		if (typeof document === "undefined") return null;
		const cookies = document.cookie.split(";");
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].replace(/^\s+/, "");
			const eq = cookie.indexOf("=");
			if (eq !== -1 && cookie.slice(0, eq) === name) try {
				return decodeURIComponent(cookie.slice(eq + 1));
			} catch (e) {
				return cookie.slice(eq + 1);
			}
		}
		return null;
	},
	remove(name) {
		this.write(name, "", Date.now() - 864e5, "/");
	}
} : {
	write() {},
	read() {
		return null;
	},
	remove() {}
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/isAbsoluteURL.js
/**
* Determines whether the specified URL is absolute
*
* @param {string} url The URL to test
*
* @returns {boolean} True if the specified URL is absolute, otherwise false
*/
function isAbsoluteURL(url) {
	if (typeof url !== "string") return false;
	return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/combineURLs.js
/**
* Creates a new URL by combining the specified URLs
*
* @param {string} baseURL The base URL
* @param {string} relativeURL The relative URL
*
* @returns {string} The combined URL
*/
function combineURLs(baseURL, relativeURL) {
	if (!relativeURL) return baseURL;
	let end = baseURL.length;
	while (end > 0 && baseURL.charCodeAt(end - 1) === 47) end--;
	return baseURL.slice(0, end) + "/" + relativeURL.replace(/^\/+/, "");
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/buildFullPath.js
const malformedHttpProtocol = /^https?:(?!\/\/)/i;
function redactFragment(fragment) {
	if (!fragment) return fragment;
	return fragment.replace(/(^|&)([^=&]*=)?[^&]+/g, (match, separator, parameterName = "") => {
		return `${separator}${parameterName}${REDACTED}`;
	});
}
function redactSensitiveURLParts(url) {
	const redactedURL = url.replace(/^(https?:\/{0,2})[^/?#]*@/i, `$1${REDACTED}@`);
	const fragmentIndex = redactedURL.indexOf("#");
	const redactedURLWithoutFragment = (fragmentIndex === -1 ? redactedURL : redactedURL.slice(0, fragmentIndex)).replace(/([?&][^=&#]*=)[^&#]*/g, `$1${REDACTED}`);
	if (fragmentIndex === -1) return redactedURLWithoutFragment;
	return `${redactedURLWithoutFragment}#${redactFragment(redactedURL.slice(fragmentIndex + 1))}`;
}
function assertValidHttpProtocolURL(url, config) {
	if (typeof url === "string") {
		const normalizedURL = normalizeURLForProtocolCheck(url);
		if (malformedHttpProtocol.test(normalizedURL)) throw new AxiosError(`Invalid URL ${JSON.stringify(redactSensitiveURLParts(normalizedURL))}: missing "//" after protocol`, AxiosError.ERR_INVALID_URL, config);
	}
}
/**
* Creates a new URL by combining the baseURL with the requestedURL,
* only when the requestedURL is not already an absolute URL.
* If the requestURL is absolute, this function returns the requestedURL untouched.
*
* @param {string} baseURL The base URL
* @param {string} requestedURL Absolute or relative URL to combine
*
* @returns {string} The combined full path
*/
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls, config) {
	assertValidHttpProtocolURL(requestedURL, config);
	let isRelativeUrl = !isAbsoluteURL(requestedURL);
	if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
		assertValidHttpProtocolURL(baseURL, config);
		return combineURLs(baseURL, requestedURL);
	}
	return requestedURL;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/mergeConfig.js
const headersToObject = (thing) => thing instanceof AxiosHeaders ? { ...thing } : thing;
const ownEnumerableKeys = (thing) => {
	if (Object.getOwnPropertySymbols && Object.getOwnPropertyDescriptor) return Object.keys(thing).concat(Object.getOwnPropertySymbols(thing).filter((symbol) => Object.getOwnPropertyDescriptor(thing, symbol).enumerable));
	return Object.keys(thing);
};
/**
* Config-specific merge-function which creates a new config-object
* by merging two configuration objects together.
*
* @param {Object} config1
* @param {Object} config2
*
* @returns {Object} New object resulting from merging config2 to config1
*/
function mergeConfig(config1, config2) {
	config1 = config1 || {};
	config2 = config2 || {};
	const config = Object.create(null);
	Object.defineProperty(config, "hasOwnProperty", {
		__proto__: null,
		value: Object.prototype.hasOwnProperty,
		enumerable: false,
		writable: true,
		configurable: true
	});
	function getMergedValue(target, source, prop, caseless) {
		if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) return utils_default.merge.call({ caseless }, target, source);
		else if (utils_default.isPlainObject(source)) return utils_default.merge({}, source);
		else if (utils_default.isArray(source)) return source.slice();
		return source;
	}
	function mergeDeepProperties(a, b, prop, caseless) {
		if (!utils_default.isUndefined(b)) return getMergedValue(a, b, prop, caseless);
		else if (!utils_default.isUndefined(a)) return getMergedValue(void 0, a, prop, caseless);
	}
	function valueFromConfig2(a, b) {
		if (!utils_default.isUndefined(b)) return getMergedValue(void 0, b);
	}
	function defaultToConfig2(a, b) {
		if (!utils_default.isUndefined(b)) return getMergedValue(void 0, b);
		else if (!utils_default.isUndefined(a)) return getMergedValue(void 0, a);
	}
	function getMergedTransitionalOption(prop) {
		const transitional2 = utils_default.hasOwnProp(config2, "transitional") ? config2.transitional : void 0;
		if (!utils_default.isUndefined(transitional2)) {
			if (utils_default.isPlainObject(transitional2)) {
				if (utils_default.hasOwnProp(transitional2, prop)) return transitional2[prop];
			} else return;
		}
		const transitional1 = utils_default.hasOwnProp(config1, "transitional") ? config1.transitional : void 0;
		if (utils_default.isPlainObject(transitional1) && utils_default.hasOwnProp(transitional1, prop)) return transitional1[prop];
	}
	function mergeDirectKeys(a, b, prop) {
		if (utils_default.hasOwnProp(config2, prop)) return getMergedValue(a, b);
		else if (utils_default.hasOwnProp(config1, prop)) return getMergedValue(void 0, a);
	}
	const mergeMap = {
		url: valueFromConfig2,
		method: valueFromConfig2,
		data: valueFromConfig2,
		baseURL: defaultToConfig2,
		transformRequest: defaultToConfig2,
		transformResponse: defaultToConfig2,
		paramsSerializer: defaultToConfig2,
		timeout: defaultToConfig2,
		timeoutErrorMessage: defaultToConfig2,
		withCredentials: defaultToConfig2,
		withXSRFToken: defaultToConfig2,
		adapter: defaultToConfig2,
		responseType: defaultToConfig2,
		xsrfCookieName: defaultToConfig2,
		xsrfHeaderName: defaultToConfig2,
		onUploadProgress: defaultToConfig2,
		onDownloadProgress: defaultToConfig2,
		decompress: defaultToConfig2,
		maxContentLength: defaultToConfig2,
		maxBodyLength: defaultToConfig2,
		beforeRedirect: defaultToConfig2,
		transport: defaultToConfig2,
		httpAgent: defaultToConfig2,
		httpsAgent: defaultToConfig2,
		cancelToken: defaultToConfig2,
		socketPath: defaultToConfig2,
		allowedSocketPaths: defaultToConfig2,
		responseEncoding: defaultToConfig2,
		validateStatus: mergeDirectKeys,
		headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
	};
	utils_default.forEach(ownEnumerableKeys({
		...config1,
		...config2
	}), function computeConfigValue(prop) {
		if (prop === "__proto__" || prop === "constructor" || prop === "prototype") return;
		const merge = utils_default.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
		const configValue = merge(utils_default.hasOwnProp(config1, prop) ? config1[prop] : void 0, utils_default.hasOwnProp(config2, prop) ? config2[prop] : void 0, prop);
		utils_default.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
	});
	if (utils_default.hasOwnProp(config2, "validateStatus") && utils_default.isUndefined(config2.validateStatus) && getMergedTransitionalOption("validateStatusUndefinedResolves") === false) {
		if (utils_default.hasOwnProp(config1, "validateStatus")) config.validateStatus = getMergedValue(void 0, config1.validateStatus);
		else delete config.validateStatus;
	}
	return config;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/setFormDataHeaders.js
const FORM_DATA_CONTENT_HEADERS = ["content-type", "content-length"];
/**
* Apply the headers generated by a FormData implementation to the request headers,
* honoring the `formDataHeaderPolicy` option: with 'content-only', copy only the
* content-* headers; otherwise merge all of them.
*
* @param {AxiosHeaders} headers - the request headers to mutate
* @param {Object | null | undefined} formHeaders - headers produced by the FormData implementation
* @param {String} [policy] - the resolved `formDataHeaderPolicy` config value
*
* @returns {void}
*/
function setFormDataHeaders(headers, formHeaders, policy) {
	if (policy !== "content-only") {
		headers.set(formHeaders);
		return;
	}
	Object.entries(formHeaders || {}).forEach(([key, val]) => {
		if (FORM_DATA_CONTENT_HEADERS.includes(key.toLowerCase())) headers.set(key, val);
	});
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/resolveConfig.js
/**
* Encode a UTF-8 string to a Latin-1 byte string for use with btoa().
* This is a modern replacement for the deprecated unescape(encodeURIComponent(str)) pattern.
*
* @param {string} str The string to encode
*
* @returns {string} UTF-8 bytes as a Latin-1 string
*/
const encodeUTF8$1 = (str) => encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
function resolveConfig(config) {
	const newConfig = mergeConfig({}, config);
	const own = (key) => utils_default.hasOwnProp(newConfig, key) ? newConfig[key] : void 0;
	const data = own("data");
	let withXSRFToken = own("withXSRFToken");
	const xsrfHeaderName = own("xsrfHeaderName");
	const xsrfCookieName = own("xsrfCookieName");
	let headers = own("headers");
	const auth = own("auth");
	const baseURL = own("baseURL");
	const allowAbsoluteUrls = own("allowAbsoluteUrls");
	const url = own("url");
	newConfig.headers = headers = AxiosHeaders.from(headers);
	newConfig.url = buildURL(buildFullPath(baseURL, url, allowAbsoluteUrls, newConfig), own("params"), own("paramsSerializer"));
	if (auth) {
		const username = utils_default.getSafeProp(auth, "username") || "";
		const password = utils_default.getSafeProp(auth, "password") || "";
		try {
			headers.set("Authorization", "Basic " + btoa(username + ":" + (password ? encodeUTF8$1(password) : "")));
		} catch (e) {
			throw AxiosError.from(e, AxiosError.ERR_BAD_OPTION_VALUE, config);
		}
	}
	if (utils_default.isFormData(data)) {
		const getHeaders = utils_default.getSafeProp(data, "getHeaders");
		if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv || utils_default.isReactNative(data)) headers.setContentType(void 0);
		else if (utils_default.isFunction(getHeaders)) setFormDataHeaders(headers, getHeaders.call(data), own("formDataHeaderPolicy"));
	}
	if (platform_default.hasStandardBrowserEnv) {
		if (utils_default.isFunction(withXSRFToken)) withXSRFToken = withXSRFToken(newConfig);
		if (withXSRFToken === true || withXSRFToken == null && isURLSameOrigin_default(newConfig.url)) {
			const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
			if (xsrfValue) headers.set(xsrfHeaderName, xsrfValue);
		}
	}
	return newConfig;
}
var xhr_default = typeof XMLHttpRequest !== "undefined" && function(config) {
	return new Promise(function dispatchXhrRequest(resolve, reject) {
		const _config = resolveConfig(config);
		let requestData = _config.data;
		const requestHeaders = AxiosHeaders.from(_config.headers).normalize();
		let { responseType, onUploadProgress, onDownloadProgress } = _config;
		let onCanceled;
		let uploadThrottled, downloadThrottled;
		let flushUpload, flushDownload, flushDownloadWithEvent;
		function done() {
			flushUpload && flushUpload();
			flushDownload && flushDownload();
			_config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
			_config.signal && _config.signal.removeEventListener("abort", onCanceled);
		}
		let request = new XMLHttpRequest();
		request.open(_config.method.toUpperCase(), _config.url, true);
		request.timeout = _config.timeout;
		function onloadend(event) {
			if (!request) return;
			if (request.status === 0 && (parseProtocol(normalizeURLForProtocolCheck(_config.url)) || parseProtocol(platform_default.origin)) !== "file" && !(request.responseURL && request.responseURL.startsWith("file:"))) {
				reject(new AxiosError("Request aborted", AxiosError.ECONNABORTED, config, request));
				done();
				request = null;
				return;
			}
			try {
				if (event) flushDownloadWithEvent && flushDownloadWithEvent(event);
				else flushDownload && flushDownload();
			} catch (err) {
				setTimeout(() => {
					throw err;
				});
			}
			if (!request) return;
			const responseHeaders = AxiosHeaders.from("getAllResponseHeaders" in request && request.getAllResponseHeaders());
			settle(function _resolve(value) {
				resolve(value);
				done();
			}, function _reject(err) {
				reject(err);
				done();
			}, {
				data: !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response,
				status: request.status,
				statusText: request.statusText,
				headers: responseHeaders,
				config,
				request
			});
			request = null;
		}
		if ("onloadend" in request) request.onloadend = onloadend;
		else request.onreadystatechange = function handleLoad() {
			if (!request || request.readyState !== 4) return;
			if (request.status === 0 && !(request.responseURL && request.responseURL.startsWith("file:"))) return;
			setTimeout(onloadend);
		};
		request.onabort = function handleAbort() {
			if (!request) return;
			reject(new AxiosError("Request aborted", AxiosError.ECONNABORTED, config, request));
			done();
			request = null;
		};
		request.onerror = function handleError(event) {
			const err = new AxiosError(event && event.message ? event.message : "Network Error", AxiosError.ERR_NETWORK, config, request);
			err.event = event || null;
			reject(err);
			done();
			request = null;
		};
		request.ontimeout = function handleTimeout() {
			let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
			const transitional = _config.transitional || transitional_default;
			if (_config.timeoutErrorMessage) timeoutErrorMessage = _config.timeoutErrorMessage;
			reject(new AxiosError(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED, config, request));
			done();
			request = null;
		};
		requestData === void 0 && requestHeaders.setContentType(null);
		if ("setRequestHeader" in request) utils_default.forEach(toByteStringHeaderObject(requestHeaders), function setRequestHeader(val, key) {
			request.setRequestHeader(key, val);
		});
		if (!utils_default.isUndefined(_config.withCredentials)) request.withCredentials = !!_config.withCredentials;
		if (responseType && responseType !== "json") request.responseType = _config.responseType;
		if (onDownloadProgress) {
			[downloadThrottled, flushDownload, flushDownloadWithEvent] = progressEventReducer(onDownloadProgress, true);
			request.addEventListener("progress", downloadThrottled);
		}
		if (onUploadProgress && request.upload) {
			[uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
			request.upload.addEventListener("progress", uploadThrottled);
			request.upload.addEventListener("loadend", flushUpload);
		}
		if (_config.cancelToken || _config.signal) {
			onCanceled = (cancel) => {
				if (!request) return;
				reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
				request.abort();
				done();
				request = null;
			};
			_config.cancelToken && _config.cancelToken.subscribe(onCanceled);
			if (_config.signal) _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
		}
		const protocol = parseProtocol(_config.url);
		if (protocol && !platform_default.protocols.includes(protocol)) {
			reject(new AxiosError("Unsupported protocol " + protocol + ":", AxiosError.ERR_BAD_REQUEST, config));
			done();
			return;
		}
		request.send(requestData || null);
	});
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/composeSignals.js
const composeSignals = (signals, timeout) => {
	signals = signals ? signals.filter(Boolean) : [];
	if (!timeout && !signals.length) return;
	const controller = new AbortController();
	let aborted = false;
	const onabort = function(reason) {
		if (!aborted) {
			aborted = true;
			unsubscribe();
			const err = reason instanceof Error ? reason : this.reason;
			controller.abort(err instanceof AxiosError ? err : new CanceledError(err instanceof Error ? err.message : err));
		}
	};
	let timer = timeout && setTimeout(() => {
		timer = null;
		onabort(new AxiosError(`timeout of ${timeout}ms exceeded`, AxiosError.ETIMEDOUT));
	}, timeout);
	const unsubscribe = () => {
		if (!signals) return;
		timer && clearTimeout(timer);
		timer = null;
		signals.forEach((signal) => {
			signal.unsubscribe ? signal.unsubscribe(onabort) : signal.removeEventListener("abort", onabort);
		});
		signals = null;
	};
	signals.forEach((signal) => {
		if (aborted) return;
		if (signal.aborted) {
			onabort.call(signal);
			return;
		}
		signal.addEventListener("abort", onabort, { once: true });
	});
	const { signal } = controller;
	signal.unsubscribe = () => utils_default.asap(unsubscribe);
	return signal;
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/trackStream.js
const streamChunk = function* (chunk, chunkSize) {
	let len = chunk.byteLength;
	if (!chunkSize || len < chunkSize) {
		yield chunk;
		return;
	}
	let pos = 0;
	let end;
	while (pos < len) {
		end = pos + chunkSize;
		yield chunk.slice(pos, end);
		pos = end;
	}
};
const readBytes = async function* (iterable, chunkSize) {
	for await (const chunk of readStream(iterable)) yield* streamChunk(chunk, chunkSize);
};
const readStream = async function* (stream) {
	if (stream[Symbol.asyncIterator]) {
		yield* stream;
		return;
	}
	const reader = stream.getReader();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			yield value;
		}
	} finally {
		await reader.cancel();
	}
};
const trackStream = (stream, chunkSize, onProgress, onFinish) => {
	const iterator = readBytes(stream, chunkSize);
	let bytes = 0;
	let done;
	let _onFinish = (e) => {
		if (!done) {
			done = true;
			onFinish && onFinish(e);
		}
	};
	return new ReadableStream({
		async pull(controller) {
			try {
				const { done, value } = await iterator.next();
				if (done) {
					_onFinish();
					controller.close();
					return;
				}
				let len = value.byteLength;
				if (onProgress) onProgress(bytes += len);
				controller.enqueue(new Uint8Array(value));
			} catch (err) {
				_onFinish(err);
				throw err;
			}
		},
		cancel(reason) {
			_onFinish(reason);
			return iterator.return();
		}
	}, { highWaterMark: 2 });
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/estimateDataURLDecodedBytes.js
/**
* Estimate data: URL byte lengths *without* allocating large buffers.
* - Fetch percent-decodes a base64 body before decoding it.
* - Node's Buffer.from(body, 'base64') sizes its backing allocation from the
*   raw body, including ignored characters and content after padding.
* - Non-base64 data is percent-decoded and then encoded as UTF-8.
*/
const isHexDigit = (charCode) => charCode >= 48 && charCode <= 57 || charCode >= 65 && charCode <= 70 || charCode >= 97 && charCode <= 102;
const isPercentEncodedByte = (str, i, len) => i + 2 < len && isHexDigit(str.charCodeAt(i + 1)) && isHexDigit(str.charCodeAt(i + 2));
const hexValue$1 = (charCode) => charCode <= 57 ? charCode - 48 : (charCode & 223) - 55;
const isBase64Char = (charCode) => charCode >= 65 && charCode <= 90 || charCode >= 97 && charCode <= 122 || charCode >= 48 && charCode <= 57 || charCode === 43 || charCode === 47 || charCode === 45 || charCode === 95;
const isBase64Whitespace = (charCode) => charCode === 9 || charCode === 10 || charCode === 12 || charCode === 13 || charCode === 32;
const base64Bytes = (significant) => {
	const groups = Math.floor(significant / 4);
	const remainder = significant % 4;
	return groups * 3 + (remainder === 2 ? 1 : remainder === 3 ? 2 : 0);
};
const estimateBase64BufferAllocation = (body) => {
	const len = body.length;
	let padding = 0;
	if (len > 0 && body.charCodeAt(len - 1) === 61) {
		padding++;
		if (len > 1 && body.charCodeAt(len - 2) === 61) padding++;
	}
	return Math.floor((len - padding) * 3 / 4);
};
const estimatePercentDecodedBase64Bytes = (body) => {
	const len = body.length;
	let significant = 0;
	let padding = 0;
	let invalid = false;
	for (let i = 0; i < len; i++) {
		let code = body.charCodeAt(i);
		if (code === 37 && isPercentEncodedByte(body, i, len)) {
			code = hexValue$1(body.charCodeAt(i + 1)) * 16 + hexValue$1(body.charCodeAt(i + 2));
			i += 2;
		}
		if (isBase64Whitespace(code)) continue;
		if (code === 61) {
			padding++;
			continue;
		}
		if (!isBase64Char(code) || padding > 0) {
			invalid = true;
			continue;
		}
		significant++;
	}
	if (invalid || padding > 2 || padding > 0 && (significant + padding) % 4 !== 0 || significant % 4 === 1) return estimateBase64BufferAllocation(body);
	return base64Bytes(significant);
};
const estimateDataURLBytes = (url, estimateBase64) => {
	if (!url || typeof url !== "string") return 0;
	if (!url.startsWith("data:")) return 0;
	const comma = url.indexOf(",");
	if (comma < 0) return 0;
	const meta = url.slice(5, comma);
	const body = url.slice(comma + 1);
	if (/;base64/i.test(meta)) return estimateBase64(body);
	let bytes = 0;
	for (let i = 0, len = body.length; i < len; i++) {
		const c = body.charCodeAt(i);
		if (c === 37 && isPercentEncodedByte(body, i, len)) {
			bytes += 1;
			i += 2;
		} else if (c < 128) bytes += 1;
		else if (c < 2048) bytes += 2;
		else if (c >= 55296 && c <= 56319 && i + 1 < len) {
			const next = body.charCodeAt(i + 1);
			if (next >= 56320 && next <= 57343) {
				bytes += 4;
				i++;
			} else bytes += 3;
		} else bytes += 3;
	}
	return bytes;
};
/**
* Estimate the percent-decoded payload size used by Fetch data: URLs.
*
* @param {string} url
* @returns {number}
*/
function estimateDataURLDecodedBytes(url) {
	const fragmentIndex = typeof url === "string" ? url.indexOf("#") : -1;
	return estimateDataURLBytes(fragmentIndex === -1 ? url : url.slice(0, fragmentIndex), estimatePercentDecodedBase64Bytes);
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/env/data.js
const VERSION = "1.20.0";
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/adapters/fetch.js
const DEFAULT_CHUNK_SIZE = 65536;
const DEFAULT_REQUEST_OPTIONS = {
	cache: "default",
	redirect: "follow",
	referrer: "about:client",
	referrerPolicy: "",
	mode: "cors",
	integrity: "",
	keepalive: false,
	priority: "auto",
	window: null
};
const { isFunction } = utils_default;
/**
* Encode a UTF-8 string to a Latin-1 byte string for use with btoa().
* This is a modern replacement for the deprecated unescape(encodeURIComponent(str)) pattern.
*
* @param {string} str The string to encode
*
* @returns {string} UTF-8 bytes as a Latin-1 string
*/
const encodeUTF8 = (str) => encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
const decodeURIComponentSafe = (value) => {
	if (!utils_default.isString(value)) return value;
	try {
		return decodeURIComponent(value);
	} catch (error) {
		return value;
	}
};
const test = (fn, ...args) => {
	try {
		return !!fn(...args);
	} catch (e) {
		return false;
	}
};
const maybeWithAuthCredentials = (url) => {
	const protocolIndex = url.indexOf("://");
	let urlToCheck = url;
	if (protocolIndex !== -1) urlToCheck = urlToCheck.slice(protocolIndex + 3);
	return urlToCheck.includes("@") || urlToCheck.includes(":");
};
const factory = (env) => {
	const globalObject = utils_default.global !== void 0 && utils_default.global !== null ? utils_default.global : globalThis;
	const { ReadableStream, TextEncoder } = globalObject;
	env = utils_default.merge.call({ skipUndefined: true }, {
		Request: globalObject.Request,
		Response: globalObject.Response
	}, env);
	const { fetch: envFetch, Request, Response } = env;
	const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
	const isRequestSupported = isFunction(Request);
	const isResponseSupported = isFunction(Response);
	if (!isFetchSupported) return false;
	const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream);
	const encodeText = isFetchSupported && (typeof TextEncoder === "function" ? ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
	const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
		let duplexAccessed = false;
		const request = new Request(platform_default.origin, {
			body: new ReadableStream(),
			method: "POST",
			get duplex() {
				duplexAccessed = true;
				return "half";
			}
		});
		const hasContentType = request.headers.has("Content-Type");
		if (request.body != null) request.body.cancel();
		return duplexAccessed && !hasContentType;
	});
	const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
	const resolvers = { stream: supportsResponseStream && ((res) => res.body) };
	isFetchSupported && (() => {
		[
			"text",
			"arrayBuffer",
			"blob",
			"formData",
			"stream"
		].forEach((type) => {
			!resolvers[type] && (resolvers[type] = (res, config) => {
				let method = res && res[type];
				if (method) return method.call(res);
				throw new AxiosError(`Response type '${type}' is not supported`, AxiosError.ERR_NOT_SUPPORT, config);
			});
		});
	})();
	const getBodyLength = async (body) => {
		if (body == null) return 0;
		if (utils_default.isBlob(body)) return body.size;
		if (utils_default.isSpecCompliantForm(body)) return (await new Request(platform_default.origin, {
			method: "POST",
			body
		}).arrayBuffer()).byteLength;
		if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) return body.byteLength;
		if (utils_default.isURLSearchParams(body)) body = body + "";
		if (utils_default.isString(body)) return (await encodeText(body)).byteLength;
	};
	const resolveBodyLength = async (headers, body) => {
		const length = utils_default.toFiniteNumber(headers.getContentLength());
		return length == null ? getBodyLength(body) : length;
	};
	return async (config) => {
		let { url, method, data, signal, cancelToken, timeout, onDownloadProgress, onUploadProgress, responseType, headers, withCredentials = "same-origin", fetchOptions, maxContentLength, maxBodyLength, maxRedirects } = resolveConfig(config);
		const hasMaxContentLength = utils_default.isNumber(maxContentLength) && maxContentLength > -1;
		const hasMaxBodyLength = utils_default.isNumber(maxBodyLength) && maxBodyLength > -1;
		const own = (key) => utils_default.hasOwnProp(config, key) ? config[key] : void 0;
		let _fetch = envFetch || fetch;
		responseType = responseType ? (responseType + "").toLowerCase() : "text";
		let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
		let request = null;
		const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
			composedSignal.unsubscribe();
		});
		let requestContentLength;
		let pendingBodyError = null;
		const maxBodyLengthError = () => new AxiosError("Request body larger than maxBodyLength limit", AxiosError.ERR_BAD_REQUEST, config, request);
		try {
			let auth = void 0;
			const configAuth = own("auth");
			if (configAuth) auth = {
				username: utils_default.getSafeProp(configAuth, "username") || "",
				password: utils_default.getSafeProp(configAuth, "password") || ""
			};
			if (maybeWithAuthCredentials(url)) {
				const parsedURL = new URL(url, platform_default.origin);
				if (!auth && (parsedURL.username || parsedURL.password)) auth = {
					username: decodeURIComponentSafe(parsedURL.username),
					password: decodeURIComponentSafe(parsedURL.password)
				};
				if (parsedURL.username || parsedURL.password) {
					parsedURL.username = "";
					parsedURL.password = "";
					url = parsedURL.href;
				}
			}
			if (auth) {
				headers.delete("authorization");
				headers.set("Authorization", "Basic " + btoa(encodeUTF8((auth.username || "") + ":" + (auth.password || ""))));
			}
			if (hasMaxContentLength && typeof url === "string" && url.startsWith("data:")) {
				if (estimateDataURLDecodedBytes(url) > maxContentLength) throw new AxiosError("maxContentLength size of " + maxContentLength + " exceeded", AxiosError.ERR_BAD_RESPONSE, config, request);
			}
			if (hasMaxBodyLength && method !== "get" && method !== "head") {
				const outboundLength = await getBodyLength(data);
				if (typeof outboundLength === "number" && isFinite(outboundLength)) {
					requestContentLength = outboundLength;
					if (outboundLength > maxBodyLength) throw maxBodyLengthError();
				}
			}
			const mustEnforceStreamBody = hasMaxBodyLength && (utils_default.isReadableStream(data) || utils_default.isStream(data));
			const trackRequestStream = (stream, onProgress, flush) => trackStream(stream, DEFAULT_CHUNK_SIZE, (loadedBytes) => {
				if (hasMaxBodyLength && loadedBytes > maxBodyLength) throw pendingBodyError = maxBodyLengthError();
				onProgress && onProgress(loadedBytes);
			}, flush);
			if (supportsRequestStream && method !== "get" && method !== "head" && (onUploadProgress || mustEnforceStreamBody)) {
				requestContentLength = requestContentLength == null ? await resolveBodyLength(headers, data) : requestContentLength;
				if (requestContentLength !== 0 || mustEnforceStreamBody) {
					let _request = new Request(url, {
						method: "POST",
						body: data,
						duplex: "half"
					});
					let contentTypeHeader;
					if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) headers.setContentType(contentTypeHeader);
					if (_request.body) {
						const [onProgress, flush] = onUploadProgress && progressEventDecorator(requestContentLength, progressEventReducer(asyncDecorator(onUploadProgress))) || [];
						data = trackRequestStream(_request.body, onProgress, flush);
					}
				}
			} else if (mustEnforceStreamBody && !isRequestSupported && isReadableStreamSupported && method !== "get" && method !== "head") data = trackRequestStream(data);
			else if (mustEnforceStreamBody && isRequestSupported && !supportsRequestStream && method !== "get" && method !== "head") throw new AxiosError("Stream request bodies are not supported by the current fetch implementation", AxiosError.ERR_NOT_SUPPORT, config, request);
			if (!utils_default.isString(withCredentials)) withCredentials = withCredentials ? "include" : "omit";
			const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
			if (utils_default.isFormData(data)) {
				const contentType = headers.getContentType();
				if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType)) headers.delete("content-type");
			}
			headers.set("User-Agent", "axios/1.20.0", false);
			const safeFetchOptions = fetchOptions == null ? fetchOptions : Object.assign(Object.create(null), fetchOptions);
			if (safeFetchOptions) {
				delete safeFetchOptions.body;
				delete safeFetchOptions.headers;
				delete safeFetchOptions.method;
				delete safeFetchOptions.signal;
				delete safeFetchOptions.duplex;
				delete safeFetchOptions.credentials;
			}
			const resolvedOptions = Object.assign(Object.create(null), safeFetchOptions, {
				signal: composedSignal,
				method: method.toUpperCase(),
				headers: toByteStringHeaderObject(headers.normalize()),
				body: data,
				duplex: "half",
				credentials: isCredentialsSupported ? withCredentials : void 0
			});
			if (isRequestSupported) {
				utils_default.forEach(DEFAULT_REQUEST_OPTIONS, (value, key) => {
					if (resolvedOptions[key] === void 0) resolvedOptions[key] = value;
				});
				if (resolvedOptions.signal === void 0) resolvedOptions.signal = null;
				if (resolvedOptions.body === void 0) resolvedOptions.body = null;
			}
			if (maxRedirects === 0) {
				resolvedOptions.redirect = "manual";
				if (safeFetchOptions) safeFetchOptions.redirect = "manual";
			}
			request = isRequestSupported && new Request(url, resolvedOptions);
			let response = await (isRequestSupported ? _fetch(request, safeFetchOptions) : _fetch(url, resolvedOptions));
			const responseHeaders = AxiosHeaders.from(response.headers);
			if (hasMaxContentLength) {
				const declaredLength = utils_default.toFiniteNumber(responseHeaders.getContentLength());
				if (declaredLength != null && declaredLength > maxContentLength) throw new AxiosError("maxContentLength size of " + maxContentLength + " exceeded", AxiosError.ERR_BAD_RESPONSE, config, request);
			}
			const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
			if (supportsResponseStream && response.body && (onDownloadProgress || hasMaxContentLength || isStreamResponse && unsubscribe)) {
				const options = {};
				[
					"status",
					"statusText",
					"headers"
				].forEach((prop) => {
					options[prop] = response[prop];
				});
				const responseContentLength = utils_default.toFiniteNumber(responseHeaders.getContentLength());
				const [onProgress, flush] = onDownloadProgress && progressEventDecorator(responseContentLength, progressEventReducer(asyncDecorator(onDownloadProgress), true)) || [];
				let bytesRead = 0;
				const onChunkProgress = (loadedBytes) => {
					if (hasMaxContentLength) {
						bytesRead = loadedBytes;
						if (bytesRead > maxContentLength) throw new AxiosError("maxContentLength size of " + maxContentLength + " exceeded", AxiosError.ERR_BAD_RESPONSE, config, request);
					}
					onProgress && onProgress(loadedBytes);
				};
				response = new Response(trackStream(response.body, DEFAULT_CHUNK_SIZE, onChunkProgress, () => {
					flush && flush();
					unsubscribe && unsubscribe();
				}), options);
			}
			responseType = responseType || "text";
			let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
			if (hasMaxContentLength && !supportsResponseStream && !isStreamResponse) {
				let materializedSize;
				if (responseData != null) {
					if (typeof responseData.byteLength === "number") materializedSize = responseData.byteLength;
					else if (typeof responseData.size === "number") materializedSize = responseData.size;
					else if (typeof responseData === "string") materializedSize = typeof TextEncoder === "function" ? new TextEncoder().encode(responseData).byteLength : responseData.length;
				}
				if (typeof materializedSize === "number" && materializedSize > maxContentLength) throw new AxiosError("maxContentLength size of " + maxContentLength + " exceeded", AxiosError.ERR_BAD_RESPONSE, config, request);
			}
			!isStreamResponse && unsubscribe && unsubscribe();
			return await new Promise((resolve, reject) => {
				settle(resolve, reject, {
					data: responseData,
					headers: AxiosHeaders.from(response.headers),
					status: response.status,
					statusText: response.statusText,
					config,
					request
				});
			});
		} catch (err) {
			unsubscribe && unsubscribe();
			if (composedSignal && composedSignal.aborted && composedSignal.reason instanceof AxiosError) {
				const canceledError = composedSignal.reason;
				canceledError.config = config;
				request && (canceledError.request = request);
				if (err !== canceledError) Object.defineProperty(canceledError, "cause", {
					__proto__: null,
					value: err,
					writable: true,
					enumerable: false,
					configurable: true
				});
				throw canceledError;
			}
			if (pendingBodyError) {
				request && !pendingBodyError.request && (pendingBodyError.request = request);
				throw pendingBodyError;
			}
			if (err instanceof AxiosError) {
				request && !err.request && (err.request = request);
				throw err;
			}
			if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
				const networkError = new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, request, err && err.response);
				Object.defineProperty(networkError, "cause", {
					__proto__: null,
					value: err.cause || err,
					writable: true,
					enumerable: false,
					configurable: true
				});
				throw networkError;
			}
			throw AxiosError.from(err, err && err.code, config, request, err && err.response);
		}
	};
};
const seedCache = /* @__PURE__ */ new Map();
const getFetch = (config) => {
	let env = config && config.env || {};
	const { fetch, Request, Response } = env;
	const seeds = [
		Request,
		Response,
		fetch
	];
	let i = seeds.length, seed, target, map = seedCache;
	while (i--) {
		seed = seeds[i];
		target = map.get(seed);
		target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
		map = target;
	}
	return target;
};
getFetch();
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/adapters/adapters.js
/**
* Known adapters mapping.
* Provides environment-specific adapters for Axios:
* - `http` for Node.js
* - `xhr` for browsers
* - `fetch` for fetch API-based requests
*
* @type {Object<string, Function|Object>}
*/
const knownAdapters = {
	http: null,
	xhr: xhr_default,
	fetch: { get: getFetch }
};
utils_default.forEach(knownAdapters, (fn, value) => {
	if (fn) {
		try {
			Object.defineProperty(fn, "name", {
				__proto__: null,
				value
			});
		} catch (e) {}
		Object.defineProperty(fn, "adapterName", {
			__proto__: null,
			value
		});
	}
});
/**
* Render a rejection reason string for unknown or unsupported adapters
*
* @param {string} reason
* @returns {string}
*/
const renderReason = (reason) => `- ${reason}`;
/**
* Check if the adapter is resolved (function, null, or false)
*
* @param {Function|null|false} adapter
* @returns {boolean}
*/
const isResolvedHandle = (adapter) => utils_default.isFunction(adapter) || adapter === null || adapter === false;
/**
* Get the first suitable adapter from the provided list.
* Tries each adapter in order until a supported one is found.
* Throws an AxiosError if no adapter is suitable.
*
* @param {Array<string|Function>|string|Function} adapters - Adapter(s) by name or function.
* @param {Object} config - Axios request configuration
* @throws {AxiosError} If no suitable adapter is available
* @returns {Function} The resolved adapter function
*/
function getAdapter(adapters, config) {
	adapters = utils_default.isArray(adapters) ? adapters : [adapters];
	const { length } = adapters;
	let nameOrAdapter;
	let adapter;
	const rejectedReasons = {};
	for (let i = 0; i < length; i++) {
		nameOrAdapter = adapters[i];
		let id;
		adapter = nameOrAdapter;
		if (!isResolvedHandle(nameOrAdapter)) {
			adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
			if (adapter === void 0) throw new AxiosError(`Unknown adapter '${id}'`);
		}
		if (adapter && (utils_default.isFunction(adapter) || (adapter = adapter.get(config)))) break;
		rejectedReasons[id || "#" + i] = adapter;
	}
	if (!adapter) {
		const reasons = Object.entries(rejectedReasons).map(([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build"));
		throw new AxiosError(`There is no suitable adapter to dispatch the request ` + (length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified"), AxiosError.ERR_NOT_SUPPORT);
	}
	return adapter;
}
/**
* Exports Axios adapters and utility to resolve an adapter
*/
var adapters_default = {
	/**
	* Resolve an adapter from a list of adapter names or functions.
	* @type {Function}
	*/
	getAdapter,
	/**
	* Exposes all known adapters
	* @type {Object<string, Function|Object>}
	*/
	adapters: knownAdapters
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/dispatchRequest.js
/**
* Throws a `CanceledError` if cancellation has been requested.
*
* @param {Object} config The config that is to be used for the request
*
* @returns {void}
*/
function throwIfCancellationRequested(config) {
	if (config.cancelToken) config.cancelToken.throwIfRequested();
	if (config.signal && config.signal.aborted) throw new CanceledError(null, config);
}
/**
* Dispatch a request to the server using the configured adapter.
*
* @param {object} config The config that is to be used for the request
*
* @returns {Promise} The Promise to be fulfilled
*/
function dispatchRequest(_config) {
	const config = utils_default.toSafeFlatObject(_config);
	throwIfCancellationRequested(config);
	config.headers = AxiosHeaders.from(utils_default.getSafeProp(config, "headers"));
	config.data = transformData.call(config, config.transformRequest);
	if ([
		"post",
		"put",
		"patch"
	].indexOf(config.method) !== -1) config.headers.setContentType("application/x-www-form-urlencoded", false);
	return adapters_default.getAdapter(config.adapter || defaults.adapter, config)(config).then(function onAdapterResolution(response) {
		throwIfCancellationRequested(config);
		config.response = response;
		try {
			response.data = transformData.call(config, config.transformResponse, response);
		} finally {
			delete config.response;
		}
		response.headers = AxiosHeaders.from(response.headers);
		return response;
	}, function onAdapterRejection(reason) {
		if (!isCancel(reason)) {
			throwIfCancellationRequested(config);
			if (reason && reason.response) {
				config.response = reason.response;
				try {
					reason.response.data = transformData.call(config, config.transformResponse, reason.response);
				} finally {
					delete config.response;
				}
				reason.response.headers = AxiosHeaders.from(reason.response.headers);
			}
		}
		return Promise.reject(reason);
	});
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/validator.js
const validators$1 = {};
[
	"object",
	"boolean",
	"number",
	"function",
	"string",
	"symbol"
].forEach((type, i) => {
	validators$1[type] = function validator(thing) {
		return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
	};
});
const deprecatedWarnings = {};
/**
* Transitional option validator
*
* @param {function|boolean?} validator - set to false if the transitional option has been removed
* @param {string?} version - deprecated version / removed since version
* @param {string?} message - some message with additional info
*
* @returns {function}
*/
validators$1.transitional = function transitional(validator, version, message) {
	function formatMessage(opt, desc) {
		return "[Axios v1.20.0] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
	}
	return (value, opt, opts) => {
		if (validator === false) throw new AxiosError(formatMessage(opt, " has been removed" + (version ? " in " + version : "")), AxiosError.ERR_DEPRECATED);
		if (version && !deprecatedWarnings[opt]) {
			deprecatedWarnings[opt] = true;
			console.warn(formatMessage(opt, " has been deprecated since v" + version + " and will be removed in the near future"));
		}
		return validator ? validator(value, opt, opts) : true;
	};
};
validators$1.spelling = function spelling(correctSpelling) {
	return (value, opt) => {
		console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
		return true;
	};
};
/**
* Assert object's properties type
*
* @param {object} options
* @param {object} schema
* @param {boolean?} allowUnknown
*
* @returns {object}
*/
function assertOptions(options, schema, allowUnknown) {
	if (typeof options !== "object" || options === null) throw new AxiosError("options must be an object", AxiosError.ERR_BAD_OPTION_VALUE);
	const keys = Object.keys(options);
	let i = keys.length;
	while (i-- > 0) {
		const opt = keys[i];
		const validator = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : void 0;
		if (validator) {
			const value = options[opt];
			const result = value === void 0 || validator(value, opt, options);
			if (result !== true) throw new AxiosError("option " + opt + " must be " + result, AxiosError.ERR_BAD_OPTION_VALUE);
			continue;
		}
		if (allowUnknown !== true) throw new AxiosError("Unknown option " + opt, AxiosError.ERR_BAD_OPTION);
	}
}
var validator_default = {
	assertOptions,
	validators: validators$1
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/core/Axios.js
const validators = validator_default.validators;
/**
* Create a new instance of Axios
*
* @param {Object} instanceConfig The default config for the instance
*
* @return {Axios} A new instance of Axios
*/
var Axios = class {
	constructor(instanceConfig) {
		this.defaults = instanceConfig || {};
		this.interceptors = {
			request: new InterceptorManager(),
			response: new InterceptorManager()
		};
	}
	/**
	* Dispatch a request
	*
	* @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
	* @param {?Object} config
	*
	* @returns {Promise} The Promise to be fulfilled
	*/
	async request(configOrUrl, config) {
		try {
			return await this._request(configOrUrl, config);
		} catch (err) {
			if (err instanceof Error) try {
				let dummy = {};
				Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = /* @__PURE__ */ new Error();
				const dummyStack = dummy.stack;
				let stack = "";
				if (typeof dummyStack === "string") {
					const firstNewlineIndex = dummyStack.indexOf("\n");
					stack = firstNewlineIndex === -1 ? "" : dummyStack.slice(firstNewlineIndex + 1);
				}
				if (!err.stack) err.stack = stack;
				else if (stack) {
					const firstNewlineIndex = stack.indexOf("\n");
					const secondNewlineIndex = firstNewlineIndex === -1 ? -1 : stack.indexOf("\n", firstNewlineIndex + 1);
					const stackWithoutTwoTopLines = secondNewlineIndex === -1 ? "" : stack.slice(secondNewlineIndex + 1);
					if (!String(err.stack).endsWith(stackWithoutTwoTopLines)) err.stack += "\n" + stack;
				}
			} catch (e) {}
			throw err;
		}
	}
	_request(configOrUrl, config) {
		if (typeof configOrUrl === "string") {
			config = config || {};
			config.url = configOrUrl;
		} else config = configOrUrl || {};
		config = mergeConfig(this.defaults, config);
		const { transitional, paramsSerializer, headers } = config;
		if (transitional !== void 0) validator_default.assertOptions(transitional, {
			silentJSONParsing: validators.transitional(validators.boolean),
			forcedJSONParsing: validators.transitional(validators.boolean),
			clarifyTimeoutError: validators.transitional(validators.boolean),
			legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
			advertiseZstdAcceptEncoding: validators.transitional(validators.boolean),
			validateStatusUndefinedResolves: validators.transitional(validators.boolean)
		}, false);
		if (paramsSerializer != null) {
			if (utils_default.isFunction(paramsSerializer)) config.paramsSerializer = { serialize: paramsSerializer };
			else validator_default.assertOptions(paramsSerializer, {
				encode: validators.function,
				serialize: validators.function
			}, true);
		}
		if (config.allowAbsoluteUrls !== void 0) {} else if (this.defaults.allowAbsoluteUrls !== void 0) config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
		else config.allowAbsoluteUrls = true;
		validator_default.assertOptions(config, {
			baseUrl: validators.spelling("baseURL"),
			withXsrfToken: validators.spelling("withXSRFToken")
		}, true);
		config.method = (utils_default.getSafeProp(config, "method") || utils_default.getSafeProp(this.defaults, "method") || "get").toLowerCase();
		let contextHeaders = headers && utils_default.merge(headers.common, headers[config.method]);
		headers && utils_default.forEach(methodList.concat("common"), (method) => {
			delete headers[method];
		});
		config.headers = AxiosHeaders.concat(contextHeaders, headers);
		const requestInterceptorChain = [];
		let synchronousRequestInterceptors = true;
		this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
			if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) return;
			synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
			const transitional = config.transitional || transitional_default;
			if (transitional && transitional.legacyInterceptorReqResOrdering) requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
			else requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
		});
		const responseInterceptorChain = [];
		this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
			responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
		});
		let promise;
		let i = 0;
		let len;
		if (!synchronousRequestInterceptors) {
			const chain = [dispatchRequest.bind(this), void 0];
			chain.unshift(...requestInterceptorChain);
			chain.push(...responseInterceptorChain);
			len = chain.length;
			promise = Promise.resolve(config);
			while (i < len) promise = promise.then(chain[i++], chain[i++]);
			return promise;
		}
		len = requestInterceptorChain.length;
		let newConfig = config;
		while (i < len) {
			const onFulfilled = requestInterceptorChain[i++];
			const onRejected = requestInterceptorChain[i++];
			try {
				newConfig = onFulfilled ? onFulfilled(newConfig) : newConfig;
			} catch (error) {
				if (!onRejected) {
					promise = Promise.reject(error);
					break;
				}
				try {
					const rejectedResult = onRejected.call(this, error);
					if (utils_default.isThenable(rejectedResult)) promise = Promise.resolve(rejectedResult).then(() => dispatchRequest.call(this, newConfig));
				} catch (rejectedError) {
					promise = Promise.reject(rejectedError);
				}
				break;
			}
		}
		if (!promise) try {
			promise = dispatchRequest.call(this, newConfig);
		} catch (error) {
			promise = Promise.reject(error);
		}
		i = 0;
		len = responseInterceptorChain.length;
		while (i < len) promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
		return promise;
	}
	getUri(config) {
		config = mergeConfig(this.defaults, config);
		return buildURL(buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls, config), config.params, config.paramsSerializer);
	}
};
utils_default.forEach([
	"delete",
	"get",
	"head",
	"options"
], function forEachMethodNoData(method) {
	Axios.prototype[method] = function(url, config) {
		return this.request(mergeConfig(config || {}, {
			method,
			url,
			data: config && utils_default.hasOwnProp(config, "data") ? config.data : void 0
		}));
	};
});
utils_default.forEach([
	"post",
	"put",
	"patch",
	"query"
], function forEachMethodWithData(method) {
	function generateHTTPMethod(isForm) {
		return function httpMethod(url, data, config) {
			return this.request(mergeConfig(config || {}, {
				method,
				headers: isForm ? { "Content-Type": "multipart/form-data" } : {},
				url,
				data
			}));
		};
	}
	Axios.prototype[method] = generateHTTPMethod();
	if (method !== "query") Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/cancel/CancelToken.js
/**
* A `CancelToken` is an object that can be used to request cancellation of an operation.
*
* @param {Function} executor The executor function.
*
* @returns {CancelToken}
*/
var CancelToken = class CancelToken {
	constructor(executor) {
		if (typeof executor !== "function") throw new TypeError("executor must be a function.");
		let resolvePromise;
		this.promise = new Promise(function promiseExecutor(resolve) {
			resolvePromise = resolve;
		});
		const token = this;
		this.promise.then((cancel) => {
			if (!token._listeners) return;
			let i = token._listeners.length;
			while (i-- > 0) token._listeners[i](cancel);
			token._listeners = null;
		});
		this.promise.then = (onfulfilled) => {
			let _resolve;
			const promise = new Promise((resolve) => {
				token.subscribe(resolve);
				_resolve = resolve;
			}).then(onfulfilled);
			promise.cancel = function reject() {
				token.unsubscribe(_resolve);
			};
			return promise;
		};
		executor(function cancel(message, config, request) {
			if (token.reason) return;
			token.reason = new CanceledError(message, config, request);
			resolvePromise(token.reason);
		});
	}
	/**
	* Throws a `CanceledError` if cancellation has been requested.
	*/
	throwIfRequested() {
		if (this.reason) throw this.reason;
	}
	/**
	* Subscribe to the cancel signal
	*/
	subscribe(listener) {
		if (this.reason) {
			listener(this.reason);
			return;
		}
		if (this._listeners) this._listeners.push(listener);
		else this._listeners = [listener];
	}
	/**
	* Unsubscribe from the cancel signal
	*/
	unsubscribe(listener) {
		if (!this._listeners) return;
		const index = this._listeners.indexOf(listener);
		if (index !== -1) this._listeners.splice(index, 1);
	}
	toAbortSignal() {
		const controller = new AbortController();
		const abort = (err) => {
			controller.abort(err);
		};
		this.subscribe(abort);
		controller.signal.unsubscribe = () => this.unsubscribe(abort);
		return controller.signal;
	}
	/**
	* Returns an object that contains a new `CancelToken` and a function that, when called,
	* cancels the `CancelToken`.
	*/
	static source() {
		let cancel;
		return {
			token: new CancelToken(function executor(c) {
				cancel = c;
			}),
			cancel
		};
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/spread.js
/**
* Syntactic sugar for invoking a function and expanding an array for arguments.
*
* Common use case would be to use `Function.prototype.apply`.
*
*  ```js
*  function f(x, y, z) {}
*  const args = [1, 2, 3];
*  f.apply(null, args);
*  ```
*
* With `spread` this example can be re-written.
*
*  ```js
*  spread(function(x, y, z) {})([1, 2, 3]);
*  ```
*
* @param {Function} callback
*
* @returns {Function}
*/
function spread(callback) {
	return function wrap(arr) {
		return callback.apply(null, arr);
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/isAxiosError.js
/**
* Determines whether the payload is an error thrown by Axios
*
* @param {*} payload The value to test
*
* @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
*/
function isAxiosError(payload) {
	return utils_default.isObject(payload) && payload.isAxiosError === true;
}
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/helpers/HttpStatusCode.js
const HttpStatusCode = {
	Continue: 100,
	SwitchingProtocols: 101,
	Processing: 102,
	EarlyHints: 103,
	Ok: 200,
	Created: 201,
	Accepted: 202,
	NonAuthoritativeInformation: 203,
	NoContent: 204,
	ResetContent: 205,
	PartialContent: 206,
	MultiStatus: 207,
	AlreadyReported: 208,
	ImUsed: 226,
	MultipleChoices: 300,
	MovedPermanently: 301,
	Found: 302,
	SeeOther: 303,
	NotModified: 304,
	UseProxy: 305,
	Unused: 306,
	TemporaryRedirect: 307,
	PermanentRedirect: 308,
	BadRequest: 400,
	Unauthorized: 401,
	PaymentRequired: 402,
	Forbidden: 403,
	NotFound: 404,
	MethodNotAllowed: 405,
	NotAcceptable: 406,
	ProxyAuthenticationRequired: 407,
	RequestTimeout: 408,
	Conflict: 409,
	Gone: 410,
	LengthRequired: 411,
	PreconditionFailed: 412,
	/**
	* @deprecated Use `ContentTooLarge` instead.
	*/
	PayloadTooLarge: 413,
	ContentTooLarge: 413,
	UriTooLong: 414,
	UnsupportedMediaType: 415,
	RangeNotSatisfiable: 416,
	ExpectationFailed: 417,
	ImATeapot: 418,
	MisdirectedRequest: 421,
	/**
	* @deprecated Use `UnprocessableContent` instead.
	*/
	UnprocessableEntity: 422,
	UnprocessableContent: 422,
	Locked: 423,
	FailedDependency: 424,
	TooEarly: 425,
	UpgradeRequired: 426,
	PreconditionRequired: 428,
	TooManyRequests: 429,
	RequestHeaderFieldsTooLarge: 431,
	UnavailableForLegalReasons: 451,
	InternalServerError: 500,
	NotImplemented: 501,
	BadGateway: 502,
	ServiceUnavailable: 503,
	GatewayTimeout: 504,
	HttpVersionNotSupported: 505,
	VariantAlsoNegotiates: 506,
	InsufficientStorage: 507,
	LoopDetected: 508,
	NotExtended: 510,
	NetworkAuthenticationRequired: 511,
	WebServerReturnsAnUnknownError: 520,
	WebServerIsDown: 521,
	ConnectionTimedOut: 522,
	OriginIsUnreachable: 523,
	TimeoutOccurred: 524,
	SslHandshakeFailed: 525,
	InvalidSslCertificate: 526
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
	if (HttpStatusCode[value] === void 0) HttpStatusCode[value] = key;
});
//#endregion
//#region ../../../node_modules/.pnpm/axios@1.20.0_debug@4.4.3_supports-color@8.1.1__supports-color@8.1.1/node_modules/axios/lib/axios.js
/**
* Create an instance of Axios
*
* @param {Object} defaultConfig The default config for the instance
*
* @returns {Axios} A new instance of Axios
*/
function createInstance(defaultConfig) {
	const context = new Axios(defaultConfig);
	const instance = bind(Axios.prototype.request, context);
	utils_default.extend(instance, Axios.prototype, context, { allOwnKeys: true });
	utils_default.extend(instance, context, null, { allOwnKeys: true });
	instance.create = function create(instanceConfig) {
		return createInstance(mergeConfig(defaultConfig, instanceConfig));
	};
	return instance;
}
const axios = createInstance(defaults);
axios.Axios = Axios;
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;
axios.AxiosError = AxiosError;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
	return Promise.all(promises);
};
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders;
axios.formToJSON = (thing) => formDataToJSON(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters_default.getAdapter;
axios.HttpStatusCode = HttpStatusCode;
axios.default = axios;
//#endregion
//#region ../../@n8n/constants/src/browser.ts
/** `localStorage` key the per-browser identifier is persisted under. */
const BROWSER_ID_STORAGE_KEY = "n8n-browserId";
/**
* Returns a stable per-browser identifier, generating and persisting one to
* `localStorage` on first use. Sent as the `browser-id` header on authenticated
* requests so the backend can bind session cookies to the browser that
* requested them (see `AuthService.validateBrowserId`), preventing a stolen
* cookie from being replayed from a different client.
*/
function getBrowserId() {
	let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
	if (!browserId) {
		browserId = crypto.randomUUID();
		localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
	}
	return browserId;
}
//#endregion
//#region ../../@n8n/constants/src/time.ts
/**
* Convert time from any time unit to any other unit
*/
const Time = {
	nanoseconds: { toSeconds: 1 / 1e9 },
	milliseconds: {
		toHours: 1 / 36e5,
		toMinutes: 1 / 6e4,
		toSeconds: 1 / 1e3
	},
	seconds: { toMilliseconds: 1e3 },
	minutes: {
		toMilliseconds: 6e4,
		toSeconds: 60
	},
	hours: {
		toMilliseconds: 36e5,
		toSeconds: 3600
	},
	days: {
		toSeconds: 86400,
		toMilliseconds: 864e5
	}
};
5 * Time.seconds.toMilliseconds;
3 * Time.minutes.toMilliseconds;
1 * Time.minutes.toMilliseconds;
Object.values({
	Cron: "cron",
	Interval: "interval",
	OneOff: "one_off",
	RecurringCron: "recurring_cron"
});
Object.values({
	Hours: "hours",
	Days: "days",
	Weeks: "weeks",
	Months: "months"
});
/**
* Where a scheduled task is in its lifecycle, from waiting to run to a final outcome.
*/
const ScheduledTaskStatus = {
	Pending: "pending",
	Running: "running",
	Succeeded: "succeeded",
	Failed: "failed",
	Missed: "missed",
	Cancelled: "cancelled"
};
Object.values(ScheduledTaskStatus);
ScheduledTaskStatus.Succeeded, ScheduledTaskStatus.Failed, ScheduledTaskStatus.Missed, ScheduledTaskStatus.Cancelled;
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isArray.js
var require_isArray = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = Array.isArray;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_freeGlobal.js
var require__freeGlobal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof global == "object" && global && global.Object === Object && global;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_root.js
var require__root = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var freeGlobal = require__freeGlobal();
	/** Detect free variable `self`. */
	var freeSelf = typeof self == "object" && self && self.Object === Object && self;
	module.exports = freeGlobal || freeSelf || Function("return this")();
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_Symbol.js
var require__Symbol = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__root().Symbol;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_getRawTag.js
var require__getRawTag = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Symbol = require__Symbol();
	/** Used for built-in method references. */
	var objectProto = Object.prototype;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var nativeObjectToString = objectProto.toString;
	/** Built-in value references. */
	var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
	/**
	* A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
	*
	* @private
	* @param {*} value The value to query.
	* @returns {string} Returns the raw `toStringTag`.
	*/
	function getRawTag(value) {
		var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
		try {
			value[symToStringTag] = void 0;
			var unmasked = true;
		} catch (e) {}
		var result = nativeObjectToString.call(value);
		if (unmasked) {
			if (isOwn) value[symToStringTag] = tag;
			else delete value[symToStringTag];
		}
		return result;
	}
	module.exports = getRawTag;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_objectToString.js
var require__objectToString = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var nativeObjectToString = Object.prototype.toString;
	/**
	* Converts `value` to a string using `Object.prototype.toString`.
	*
	* @private
	* @param {*} value The value to convert.
	* @returns {string} Returns the converted string.
	*/
	function objectToString(value) {
		return nativeObjectToString.call(value);
	}
	module.exports = objectToString;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseGetTag.js
var require__baseGetTag = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Symbol = require__Symbol();
	var getRawTag = require__getRawTag();
	var objectToString = require__objectToString();
	/** `Object#toString` result references. */
	var nullTag = "[object Null]";
	var undefinedTag = "[object Undefined]";
	/** Built-in value references. */
	var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
	/**
	* The base implementation of `getTag` without fallbacks for buggy environments.
	*
	* @private
	* @param {*} value The value to query.
	* @returns {string} Returns the `toStringTag`.
	*/
	function baseGetTag(value) {
		if (value == null) return value === void 0 ? undefinedTag : nullTag;
		return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
	}
	module.exports = baseGetTag;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isObjectLike.js
var require_isObjectLike = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return value != null && typeof value == "object";
	}
	module.exports = isObjectLike;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isObject.js
var require_isObject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Checks if `value` is the
	* [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	* of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an object, else `false`.
	* @example
	*
	* _.isObject({});
	* // => true
	*
	* _.isObject([1, 2, 3]);
	* // => true
	*
	* _.isObject(_.noop);
	* // => true
	*
	* _.isObject(null);
	* // => false
	*/
	function isObject(value) {
		var type = typeof value;
		return value != null && (type == "object" || type == "function");
	}
	module.exports = isObject;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isFunction.js
var require_isFunction = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseGetTag = require__baseGetTag();
	var isObject = require_isObject();
	/** `Object#toString` result references. */
	var asyncTag = "[object AsyncFunction]";
	var funcTag = "[object Function]";
	var genTag = "[object GeneratorFunction]";
	var proxyTag = "[object Proxy]";
	/**
	* Checks if `value` is classified as a `Function` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a function, else `false`.
	* @example
	*
	* _.isFunction(_);
	* // => true
	*
	* _.isFunction(/abc/);
	* // => false
	*/
	function isFunction(value) {
		if (!isObject(value)) return false;
		var tag = baseGetTag(value);
		return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
	}
	module.exports = isFunction;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_coreJsData.js
var require__coreJsData = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__root()["__core-js_shared__"];
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_isMasked.js
var require__isMasked = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var coreJsData = require__coreJsData();
	/** Used to detect methods masquerading as native. */
	var maskSrcKey = function() {
		var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
		return uid ? "Symbol(src)_1." + uid : "";
	}();
	/**
	* Checks if `func` has its source masked.
	*
	* @private
	* @param {Function} func The function to check.
	* @returns {boolean} Returns `true` if `func` is masked, else `false`.
	*/
	function isMasked(func) {
		return !!maskSrcKey && maskSrcKey in func;
	}
	module.exports = isMasked;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_toSource.js
var require__toSource = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** Used to resolve the decompiled source of functions. */
	var funcToString = Function.prototype.toString;
	/**
	* Converts `func` to its source code.
	*
	* @private
	* @param {Function} func The function to convert.
	* @returns {string} Returns the source code.
	*/
	function toSource(func) {
		if (func != null) {
			try {
				return funcToString.call(func);
			} catch (e) {}
			try {
				return func + "";
			} catch (e) {}
		}
		return "";
	}
	module.exports = toSource;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseIsNative.js
var require__baseIsNative = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isFunction = require_isFunction();
	var isMasked = require__isMasked();
	var isObject = require_isObject();
	var toSource = require__toSource();
	/**
	* Used to match `RegExp`
	* [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
	*/
	var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
	/** Used to detect host constructors (Safari). */
	var reIsHostCtor = /^\[object .+?Constructor\]$/;
	/** Used for built-in method references. */
	var funcProto = Function.prototype;
	var objectProto = Object.prototype;
	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/** Used to detect if a method is native. */
	var reIsNative = RegExp("^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
	/**
	* The base implementation of `_.isNative` without bad shim checks.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a native function,
	*  else `false`.
	*/
	function baseIsNative(value) {
		if (!isObject(value) || isMasked(value)) return false;
		return (isFunction(value) ? reIsNative : reIsHostCtor).test(toSource(value));
	}
	module.exports = baseIsNative;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_getValue.js
var require__getValue = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Gets the value at `key` of `object`.
	*
	* @private
	* @param {Object} [object] The object to query.
	* @param {string} key The key of the property to get.
	* @returns {*} Returns the property value.
	*/
	function getValue(object, key) {
		return object == null ? void 0 : object[key];
	}
	module.exports = getValue;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_getNative.js
var require__getNative = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseIsNative = require__baseIsNative();
	var getValue = require__getValue();
	/**
	* Gets the native function at `key` of `object`.
	*
	* @private
	* @param {Object} object The object to query.
	* @param {string} key The key of the method to get.
	* @returns {*} Returns the function if it's native, else `undefined`.
	*/
	function getNative(object, key) {
		var value = getValue(object, key);
		return baseIsNative(value) ? value : void 0;
	}
	module.exports = getNative;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_nativeCreate.js
var require__nativeCreate = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__getNative()(Object, "create");
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_hashClear.js
var require__hashClear = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var nativeCreate = require__nativeCreate();
	/**
	* Removes all key-value entries from the hash.
	*
	* @private
	* @name clear
	* @memberOf Hash
	*/
	function hashClear() {
		this.__data__ = nativeCreate ? nativeCreate(null) : {};
		this.size = 0;
	}
	module.exports = hashClear;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_hashDelete.js
var require__hashDelete = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Removes `key` and its value from the hash.
	*
	* @private
	* @name delete
	* @memberOf Hash
	* @param {Object} hash The hash to modify.
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function hashDelete(key) {
		var result = this.has(key) && delete this.__data__[key];
		this.size -= result ? 1 : 0;
		return result;
	}
	module.exports = hashDelete;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_hashGet.js
var require__hashGet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var nativeCreate = require__nativeCreate();
	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED = "__lodash_hash_undefined__";
	/** Used to check objects for own properties. */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	/**
	* Gets the hash value for `key`.
	*
	* @private
	* @name get
	* @memberOf Hash
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function hashGet(key) {
		var data = this.__data__;
		if (nativeCreate) {
			var result = data[key];
			return result === HASH_UNDEFINED ? void 0 : result;
		}
		return hasOwnProperty.call(data, key) ? data[key] : void 0;
	}
	module.exports = hashGet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_hashHas.js
var require__hashHas = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var nativeCreate = require__nativeCreate();
	/** Used to check objects for own properties. */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	/**
	* Checks if a hash value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf Hash
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function hashHas(key) {
		var data = this.__data__;
		return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
	}
	module.exports = hashHas;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_hashSet.js
var require__hashSet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var nativeCreate = require__nativeCreate();
	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED = "__lodash_hash_undefined__";
	/**
	* Sets the hash `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf Hash
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the hash instance.
	*/
	function hashSet(key, value) {
		var data = this.__data__;
		this.size += this.has(key) ? 0 : 1;
		data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
		return this;
	}
	module.exports = hashSet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_Hash.js
var require__Hash = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var hashClear = require__hashClear();
	var hashDelete = require__hashDelete();
	var hashGet = require__hashGet();
	var hashHas = require__hashHas();
	var hashSet = require__hashSet();
	/**
	* Creates a hash object.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function Hash(entries) {
		var index = -1, length = entries == null ? 0 : entries.length;
		this.clear();
		while (++index < length) {
			var entry = entries[index];
			this.set(entry[0], entry[1]);
		}
	}
	Hash.prototype.clear = hashClear;
	Hash.prototype["delete"] = hashDelete;
	Hash.prototype.get = hashGet;
	Hash.prototype.has = hashHas;
	Hash.prototype.set = hashSet;
	module.exports = Hash;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_listCacheClear.js
var require__listCacheClear = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Removes all key-value entries from the list cache.
	*
	* @private
	* @name clear
	* @memberOf ListCache
	*/
	function listCacheClear() {
		this.__data__ = [];
		this.size = 0;
	}
	module.exports = listCacheClear;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Performs a
	* [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	* comparison between two values to determine if they are equivalent.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to compare.
	* @param {*} other The other value to compare.
	* @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	* @example
	*
	* var object = { 'a': 1 };
	* var other = { 'a': 1 };
	*
	* _.eq(object, object);
	* // => true
	*
	* _.eq(object, other);
	* // => false
	*
	* _.eq('a', 'a');
	* // => true
	*
	* _.eq('a', Object('a'));
	* // => false
	*
	* _.eq(NaN, NaN);
	* // => true
	*/
	function eq(value, other) {
		return value === other || value !== value && other !== other;
	}
	module.exports = eq;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_assocIndexOf.js
var require__assocIndexOf = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var eq = require_eq();
	/**
	* Gets the index at which the `key` is found in `array` of key-value pairs.
	*
	* @private
	* @param {Array} array The array to inspect.
	* @param {*} key The key to search for.
	* @returns {number} Returns the index of the matched value, else `-1`.
	*/
	function assocIndexOf(array, key) {
		var length = array.length;
		while (length--) if (eq(array[length][0], key)) return length;
		return -1;
	}
	module.exports = assocIndexOf;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_listCacheDelete.js
var require__listCacheDelete = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assocIndexOf = require__assocIndexOf();
	/** Built-in value references. */
	var splice = Array.prototype.splice;
	/**
	* Removes `key` and its value from the list cache.
	*
	* @private
	* @name delete
	* @memberOf ListCache
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function listCacheDelete(key) {
		var data = this.__data__, index = assocIndexOf(data, key);
		if (index < 0) return false;
		if (index == data.length - 1) data.pop();
		else splice.call(data, index, 1);
		--this.size;
		return true;
	}
	module.exports = listCacheDelete;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_listCacheGet.js
var require__listCacheGet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assocIndexOf = require__assocIndexOf();
	/**
	* Gets the list cache value for `key`.
	*
	* @private
	* @name get
	* @memberOf ListCache
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function listCacheGet(key) {
		var data = this.__data__, index = assocIndexOf(data, key);
		return index < 0 ? void 0 : data[index][1];
	}
	module.exports = listCacheGet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_listCacheHas.js
var require__listCacheHas = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assocIndexOf = require__assocIndexOf();
	/**
	* Checks if a list cache value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf ListCache
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function listCacheHas(key) {
		return assocIndexOf(this.__data__, key) > -1;
	}
	module.exports = listCacheHas;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_listCacheSet.js
var require__listCacheSet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assocIndexOf = require__assocIndexOf();
	/**
	* Sets the list cache `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf ListCache
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the list cache instance.
	*/
	function listCacheSet(key, value) {
		var data = this.__data__, index = assocIndexOf(data, key);
		if (index < 0) {
			++this.size;
			data.push([key, value]);
		} else data[index][1] = value;
		return this;
	}
	module.exports = listCacheSet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_ListCache.js
var require__ListCache = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var listCacheClear = require__listCacheClear();
	var listCacheDelete = require__listCacheDelete();
	var listCacheGet = require__listCacheGet();
	var listCacheHas = require__listCacheHas();
	var listCacheSet = require__listCacheSet();
	/**
	* Creates an list cache object.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function ListCache(entries) {
		var index = -1, length = entries == null ? 0 : entries.length;
		this.clear();
		while (++index < length) {
			var entry = entries[index];
			this.set(entry[0], entry[1]);
		}
	}
	ListCache.prototype.clear = listCacheClear;
	ListCache.prototype["delete"] = listCacheDelete;
	ListCache.prototype.get = listCacheGet;
	ListCache.prototype.has = listCacheHas;
	ListCache.prototype.set = listCacheSet;
	module.exports = ListCache;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_Map.js
var require__Map = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__getNative()(require__root(), "Map");
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_mapCacheClear.js
var require__mapCacheClear = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Hash = require__Hash();
	var ListCache = require__ListCache();
	var Map = require__Map();
	/**
	* Removes all key-value entries from the map.
	*
	* @private
	* @name clear
	* @memberOf MapCache
	*/
	function mapCacheClear() {
		this.size = 0;
		this.__data__ = {
			"hash": new Hash(),
			"map": new (Map || ListCache)(),
			"string": new Hash()
		};
	}
	module.exports = mapCacheClear;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_isKeyable.js
var require__isKeyable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Checks if `value` is suitable for use as unique object key.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is suitable, else `false`.
	*/
	function isKeyable(value) {
		var type = typeof value;
		return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
	}
	module.exports = isKeyable;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_getMapData.js
var require__getMapData = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isKeyable = require__isKeyable();
	/**
	* Gets the data for `map`.
	*
	* @private
	* @param {Object} map The map to query.
	* @param {string} key The reference key.
	* @returns {*} Returns the map data.
	*/
	function getMapData(map, key) {
		var data = map.__data__;
		return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
	}
	module.exports = getMapData;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_mapCacheDelete.js
var require__mapCacheDelete = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getMapData = require__getMapData();
	/**
	* Removes `key` and its value from the map.
	*
	* @private
	* @name delete
	* @memberOf MapCache
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function mapCacheDelete(key) {
		var result = getMapData(this, key)["delete"](key);
		this.size -= result ? 1 : 0;
		return result;
	}
	module.exports = mapCacheDelete;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_mapCacheGet.js
var require__mapCacheGet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getMapData = require__getMapData();
	/**
	* Gets the map value for `key`.
	*
	* @private
	* @name get
	* @memberOf MapCache
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function mapCacheGet(key) {
		return getMapData(this, key).get(key);
	}
	module.exports = mapCacheGet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_mapCacheHas.js
var require__mapCacheHas = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getMapData = require__getMapData();
	/**
	* Checks if a map value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf MapCache
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function mapCacheHas(key) {
		return getMapData(this, key).has(key);
	}
	module.exports = mapCacheHas;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_mapCacheSet.js
var require__mapCacheSet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getMapData = require__getMapData();
	/**
	* Sets the map `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf MapCache
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the map cache instance.
	*/
	function mapCacheSet(key, value) {
		var data = getMapData(this, key), size = data.size;
		data.set(key, value);
		this.size += data.size == size ? 0 : 1;
		return this;
	}
	module.exports = mapCacheSet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_MapCache.js
var require__MapCache = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var mapCacheClear = require__mapCacheClear();
	var mapCacheDelete = require__mapCacheDelete();
	var mapCacheGet = require__mapCacheGet();
	var mapCacheHas = require__mapCacheHas();
	var mapCacheSet = require__mapCacheSet();
	/**
	* Creates a map cache object to store key-value pairs.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function MapCache(entries) {
		var index = -1, length = entries == null ? 0 : entries.length;
		this.clear();
		while (++index < length) {
			var entry = entries[index];
			this.set(entry[0], entry[1]);
		}
	}
	MapCache.prototype.clear = mapCacheClear;
	MapCache.prototype["delete"] = mapCacheDelete;
	MapCache.prototype.get = mapCacheGet;
	MapCache.prototype.has = mapCacheHas;
	MapCache.prototype.set = mapCacheSet;
	module.exports = MapCache;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_stackClear.js
var require__stackClear = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ListCache = require__ListCache();
	/**
	* Removes all key-value entries from the stack.
	*
	* @private
	* @name clear
	* @memberOf Stack
	*/
	function stackClear() {
		this.__data__ = new ListCache();
		this.size = 0;
	}
	module.exports = stackClear;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_stackDelete.js
var require__stackDelete = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Removes `key` and its value from the stack.
	*
	* @private
	* @name delete
	* @memberOf Stack
	* @param {string} key The key of the value to remove.
	* @returns {boolean} Returns `true` if the entry was removed, else `false`.
	*/
	function stackDelete(key) {
		var data = this.__data__, result = data["delete"](key);
		this.size = data.size;
		return result;
	}
	module.exports = stackDelete;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_stackGet.js
var require__stackGet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Gets the stack value for `key`.
	*
	* @private
	* @name get
	* @memberOf Stack
	* @param {string} key The key of the value to get.
	* @returns {*} Returns the entry value.
	*/
	function stackGet(key) {
		return this.__data__.get(key);
	}
	module.exports = stackGet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_stackHas.js
var require__stackHas = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Checks if a stack value for `key` exists.
	*
	* @private
	* @name has
	* @memberOf Stack
	* @param {string} key The key of the entry to check.
	* @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	*/
	function stackHas(key) {
		return this.__data__.has(key);
	}
	module.exports = stackHas;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_stackSet.js
var require__stackSet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ListCache = require__ListCache();
	var Map = require__Map();
	var MapCache = require__MapCache();
	/** Used as the size to enable large array optimizations. */
	var LARGE_ARRAY_SIZE = 200;
	/**
	* Sets the stack `key` to `value`.
	*
	* @private
	* @name set
	* @memberOf Stack
	* @param {string} key The key of the value to set.
	* @param {*} value The value to set.
	* @returns {Object} Returns the stack cache instance.
	*/
	function stackSet(key, value) {
		var data = this.__data__;
		if (data instanceof ListCache) {
			var pairs = data.__data__;
			if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
				pairs.push([key, value]);
				this.size = ++data.size;
				return this;
			}
			data = this.__data__ = new MapCache(pairs);
		}
		data.set(key, value);
		this.size = data.size;
		return this;
	}
	module.exports = stackSet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_Stack.js
var require__Stack = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ListCache = require__ListCache();
	var stackClear = require__stackClear();
	var stackDelete = require__stackDelete();
	var stackGet = require__stackGet();
	var stackHas = require__stackHas();
	var stackSet = require__stackSet();
	/**
	* Creates a stack cache object to store key-value pairs.
	*
	* @private
	* @constructor
	* @param {Array} [entries] The key-value pairs to cache.
	*/
	function Stack(entries) {
		var data = this.__data__ = new ListCache(entries);
		this.size = data.size;
	}
	Stack.prototype.clear = stackClear;
	Stack.prototype["delete"] = stackDelete;
	Stack.prototype.get = stackGet;
	Stack.prototype.has = stackHas;
	Stack.prototype.set = stackSet;
	module.exports = Stack;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_Uint8Array.js
var require__Uint8Array = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__root().Uint8Array;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseTimes.js
var require__baseTimes = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* The base implementation of `_.times` without support for iteratee shorthands
	* or max array length checks.
	*
	* @private
	* @param {number} n The number of times to invoke `iteratee`.
	* @param {Function} iteratee The function invoked per iteration.
	* @returns {Array} Returns the array of results.
	*/
	function baseTimes(n, iteratee) {
		var index = -1, result = Array(n);
		while (++index < n) result[index] = iteratee(index);
		return result;
	}
	module.exports = baseTimes;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseIsArguments.js
var require__baseIsArguments = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseGetTag = require__baseGetTag();
	var isObjectLike = require_isObjectLike();
	/** `Object#toString` result references. */
	var argsTag = "[object Arguments]";
	/**
	* The base implementation of `_.isArguments`.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an `arguments` object,
	*/
	function baseIsArguments(value) {
		return isObjectLike(value) && baseGetTag(value) == argsTag;
	}
	module.exports = baseIsArguments;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isArguments.js
var require_isArguments = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseIsArguments = require__baseIsArguments();
	var isObjectLike = require_isObjectLike();
	/** Used for built-in method references. */
	var objectProto = Object.prototype;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/** Built-in value references. */
	var propertyIsEnumerable = objectProto.propertyIsEnumerable;
	module.exports = baseIsArguments(function() {
		return arguments;
	}()) ? baseIsArguments : function(value) {
		return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/stubFalse.js
var require_stubFalse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This method returns `false`.
	*
	* @static
	* @memberOf _
	* @since 4.13.0
	* @category Util
	* @returns {boolean} Returns `false`.
	* @example
	*
	* _.times(2, _.stubFalse);
	* // => [false, false]
	*/
	function stubFalse() {
		return false;
	}
	module.exports = stubFalse;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isBuffer.js
var require_isBuffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var root = require__root();
	var stubFalse = require_stubFalse();
	/** Detect free variable `exports`. */
	var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
	/** Detect free variable `module`. */
	var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
	/** Built-in value references. */
	var Buffer = freeModule && freeModule.exports === freeExports ? root.Buffer : void 0;
	module.exports = (Buffer ? Buffer.isBuffer : void 0) || stubFalse;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_isIndex.js
var require__isIndex = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** Used as references for various `Number` constants. */
	var MAX_SAFE_INTEGER = 9007199254740991;
	/** Used to detect unsigned integer values. */
	var reIsUint = /^(?:0|[1-9]\d*)$/;
	/**
	* Checks if `value` is a valid array-like index.
	*
	* @private
	* @param {*} value The value to check.
	* @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	* @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	*/
	function isIndex(value, length) {
		var type = typeof value;
		length = length == null ? MAX_SAFE_INTEGER : length;
		return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && value > -1 && value % 1 == 0 && value < length;
	}
	module.exports = isIndex;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isLength.js
var require_isLength = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** Used as references for various `Number` constants. */
	var MAX_SAFE_INTEGER = 9007199254740991;
	/**
	* Checks if `value` is a valid array-like length.
	*
	* **Note:** This method is loosely based on
	* [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
	* @example
	*
	* _.isLength(3);
	* // => true
	*
	* _.isLength(Number.MIN_VALUE);
	* // => false
	*
	* _.isLength(Infinity);
	* // => false
	*
	* _.isLength('3');
	* // => false
	*/
	function isLength(value) {
		return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
	}
	module.exports = isLength;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseIsTypedArray.js
var require__baseIsTypedArray = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseGetTag = require__baseGetTag();
	var isLength = require_isLength();
	var isObjectLike = require_isObjectLike();
	/** `Object#toString` result references. */
	var argsTag = "[object Arguments]";
	var arrayTag = "[object Array]";
	var boolTag = "[object Boolean]";
	var dateTag = "[object Date]";
	var errorTag = "[object Error]";
	var funcTag = "[object Function]";
	var mapTag = "[object Map]";
	var numberTag = "[object Number]";
	var objectTag = "[object Object]";
	var regexpTag = "[object RegExp]";
	var setTag = "[object Set]";
	var stringTag = "[object String]";
	var weakMapTag = "[object WeakMap]";
	var arrayBufferTag = "[object ArrayBuffer]";
	var dataViewTag = "[object DataView]";
	var float32Tag = "[object Float32Array]";
	var float64Tag = "[object Float64Array]";
	var int8Tag = "[object Int8Array]";
	var int16Tag = "[object Int16Array]";
	var int32Tag = "[object Int32Array]";
	var uint8Tag = "[object Uint8Array]";
	var uint8ClampedTag = "[object Uint8ClampedArray]";
	var uint16Tag = "[object Uint16Array]";
	var uint32Tag = "[object Uint32Array]";
	/** Used to identify `toStringTag` values of typed arrays. */
	var typedArrayTags = {};
	typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
	typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
	/**
	* The base implementation of `_.isTypedArray` without Node.js optimizations.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
	*/
	function baseIsTypedArray(value) {
		return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
	}
	module.exports = baseIsTypedArray;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseUnary.js
var require__baseUnary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* The base implementation of `_.unary` without support for storing metadata.
	*
	* @private
	* @param {Function} func The function to cap arguments for.
	* @returns {Function} Returns the new capped function.
	*/
	function baseUnary(func) {
		return function(value) {
			return func(value);
		};
	}
	module.exports = baseUnary;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_nodeUtil.js
var require__nodeUtil = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var freeGlobal = require__freeGlobal();
	/** Detect free variable `exports`. */
	var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
	/** Detect free variable `module`. */
	var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
	/** Detect free variable `process` from Node.js. */
	var freeProcess = freeModule && freeModule.exports === freeExports && freeGlobal.process;
	module.exports = function() {
		try {
			var types = freeModule && freeModule.require && freeModule.require("util").types;
			if (types) return types;
			return freeProcess && freeProcess.binding && freeProcess.binding("util");
		} catch (e) {}
	}();
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isTypedArray.js
var require_isTypedArray = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseIsTypedArray = require__baseIsTypedArray();
	var baseUnary = require__baseUnary();
	var nodeUtil = require__nodeUtil();
	var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
	module.exports = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_arrayLikeKeys.js
var require__arrayLikeKeys = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseTimes = require__baseTimes();
	var isArguments = require_isArguments();
	var isArray = require_isArray();
	var isBuffer = require_isBuffer();
	var isIndex = require__isIndex();
	var isTypedArray = require_isTypedArray();
	/** Used to check objects for own properties. */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	/**
	* Creates an array of the enumerable property names of the array-like `value`.
	*
	* @private
	* @param {*} value The value to query.
	* @param {boolean} inherited Specify returning inherited property names.
	* @returns {Array} Returns the array of property names.
	*/
	function arrayLikeKeys(value, inherited) {
		var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
		for (var key in value) if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isBuff && (key == "offset" || key == "parent") || isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || isIndex(key, length)))) result.push(key);
		return result;
	}
	module.exports = arrayLikeKeys;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_isPrototype.js
var require__isPrototype = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** Used for built-in method references. */
	var objectProto = Object.prototype;
	/**
	* Checks if `value` is likely a prototype object.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	*/
	function isPrototype(value) {
		var Ctor = value && value.constructor;
		return value === (typeof Ctor == "function" && Ctor.prototype || objectProto);
	}
	module.exports = isPrototype;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_overArg.js
var require__overArg = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Creates a unary function that invokes `func` with its argument transformed.
	*
	* @private
	* @param {Function} func The function to wrap.
	* @param {Function} transform The argument transform.
	* @returns {Function} Returns the new function.
	*/
	function overArg(func, transform) {
		return function(arg) {
			return func(transform(arg));
		};
	}
	module.exports = overArg;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isArrayLike.js
var require_isArrayLike = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isFunction = require_isFunction();
	var isLength = require_isLength();
	/**
	* Checks if `value` is array-like. A value is considered array-like if it's
	* not a function and has a `value.length` that's an integer greater than or
	* equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	* @example
	*
	* _.isArrayLike([1, 2, 3]);
	* // => true
	*
	* _.isArrayLike(document.body.children);
	* // => true
	*
	* _.isArrayLike('abc');
	* // => true
	*
	* _.isArrayLike(_.noop);
	* // => false
	*/
	function isArrayLike(value) {
		return value != null && isLength(value.length) && !isFunction(value);
	}
	module.exports = isArrayLike;
}));
//#endregion
//#region ../../@n8n/errors/src/application.error.ts
var import_callsites = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	const callsites = () => {
		const _prepareStackTrace = Error.prepareStackTrace;
		Error.prepareStackTrace = (_, stack) => stack;
		const stack = (/* @__PURE__ */ new Error()).stack.slice(1);
		Error.prepareStackTrace = _prepareStackTrace;
		return stack;
	};
	module.exports = callsites;
	module.exports.default = callsites;
})))());
//#endregion
//#region ../../@n8n/errors/src/base.error.ts
/**
* Base class for all errors
*/
var BaseError = class extends Error {
	constructor(message, { level = "error", description, shouldReport, tags = {}, extra, ...rest } = {}) {
		super(message, rest);
		Object.defineProperty(this, "name", {
			value: this.constructor.name,
			writable: true,
			enumerable: true,
			configurable: true
		});
		this.level = level;
		this.shouldReport = shouldReport ?? (level === "error" || level === "fatal");
		this.description = description;
		this.tags = tags;
		this.extra = extra;
		try {
			const filePath = (0, import_callsites.default)()[2].getFileName() ?? "";
			const match = /packages\/([^/]+)\//.exec(filePath)?.[1];
			if (match) this.tags.packageName = match;
		} catch {}
	}
};
//#endregion
//#region ../../@n8n/errors/src/user.error.ts
/**
* Error that indicates the user performed an action that caused an error.
* E.g. provided invalid input, tried to access a resource they’re not
* authorized to, or violates a business rule.
*
* Default level: info
*/
var UserError = class extends BaseError {
	constructor(message, opts = {}) {
		opts.level = opts.level ?? "info";
		super(message, opts);
	}
};
//#endregion
//#region __vite-browser-external
var require___vite_browser_external = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {};
}));
//#endregion
//#region ../../../node_modules/.pnpm/esprima-next@5.8.4/node_modules/esprima-next/dist/esm/esprima.js
var Syntax;
(function(Syntax) {
	Syntax["AssignmentExpression"] = "AssignmentExpression";
	Syntax["AssignmentPattern"] = "AssignmentPattern";
	Syntax["ArrayExpression"] = "ArrayExpression";
	Syntax["ArrayPattern"] = "ArrayPattern";
	Syntax["ArrowFunctionExpression"] = "ArrowFunctionExpression";
	Syntax["AwaitExpression"] = "AwaitExpression";
	Syntax["BlockStatement"] = "BlockStatement";
	Syntax["BinaryExpression"] = "BinaryExpression";
	Syntax["BreakStatement"] = "BreakStatement";
	Syntax["CallExpression"] = "CallExpression";
	Syntax["CatchClause"] = "CatchClause";
	Syntax["ChainExpression"] = "ChainExpression";
	Syntax["ClassBody"] = "ClassBody";
	Syntax["ClassDeclaration"] = "ClassDeclaration";
	Syntax["ClassExpression"] = "ClassExpression";
	Syntax["ConditionalExpression"] = "ConditionalExpression";
	Syntax["ContinueStatement"] = "ContinueStatement";
	Syntax["Decorator"] = "Decorator";
	Syntax["DoWhileStatement"] = "DoWhileStatement";
	Syntax["DebuggerStatement"] = "DebuggerStatement";
	Syntax["EmptyStatement"] = "EmptyStatement";
	Syntax["ExportAllDeclaration"] = "ExportAllDeclaration";
	Syntax["ExportDefaultDeclaration"] = "ExportDefaultDeclaration";
	Syntax["ExportNamedDeclaration"] = "ExportNamedDeclaration";
	Syntax["ExportSpecifier"] = "ExportSpecifier";
	Syntax["ExpressionStatement"] = "ExpressionStatement";
	Syntax["ForStatement"] = "ForStatement";
	Syntax["ForOfStatement"] = "ForOfStatement";
	Syntax["ForInStatement"] = "ForInStatement";
	Syntax["FunctionDeclaration"] = "FunctionDeclaration";
	Syntax["FunctionExpression"] = "FunctionExpression";
	Syntax["Identifier"] = "Identifier";
	Syntax["IfStatement"] = "IfStatement";
	Syntax["ImportAttribute"] = "ImportAttribute";
	Syntax["ImportExpression"] = "ImportExpression";
	Syntax["ImportDeclaration"] = "ImportDeclaration";
	Syntax["ImportDefaultSpecifier"] = "ImportDefaultSpecifier";
	Syntax["ImportNamespaceSpecifier"] = "ImportNamespaceSpecifier";
	Syntax["ImportSpecifier"] = "ImportSpecifier";
	Syntax["Literal"] = "Literal";
	Syntax["LabeledStatement"] = "LabeledStatement";
	Syntax["LogicalExpression"] = "LogicalExpression";
	Syntax["MemberExpression"] = "MemberExpression";
	Syntax["MetaProperty"] = "MetaProperty";
	Syntax["MethodDefinition"] = "MethodDefinition";
	Syntax["NewExpression"] = "NewExpression";
	Syntax["ObjectExpression"] = "ObjectExpression";
	Syntax["ObjectPattern"] = "ObjectPattern";
	Syntax["Program"] = "Program";
	Syntax["Property"] = "Property";
	Syntax["PrivateIdentifier"] = "PrivateIdentifier";
	Syntax["RestElement"] = "RestElement";
	Syntax["ReturnStatement"] = "ReturnStatement";
	Syntax["SequenceExpression"] = "SequenceExpression";
	Syntax["SpreadElement"] = "SpreadElement";
	Syntax["StaticBlock"] = "StaticBlock";
	Syntax["Super"] = "Super";
	Syntax["SwitchCase"] = "SwitchCase";
	Syntax["SwitchStatement"] = "SwitchStatement";
	Syntax["TaggedTemplateExpression"] = "TaggedTemplateExpression";
	Syntax["TemplateElement"] = "TemplateElement";
	Syntax["TemplateLiteral"] = "TemplateLiteral";
	Syntax["ThisExpression"] = "ThisExpression";
	Syntax["ThrowStatement"] = "ThrowStatement";
	Syntax["TryStatement"] = "TryStatement";
	Syntax["UnaryExpression"] = "UnaryExpression";
	Syntax["UpdateExpression"] = "UpdateExpression";
	Syntax["VariableDeclaration"] = "VariableDeclaration";
	Syntax["VariableDeclarator"] = "VariableDeclarator";
	Syntax["WhileStatement"] = "WhileStatement";
	Syntax["WithStatement"] = "WithStatement";
	Syntax["YieldExpression"] = "YieldExpression";
})(Syntax || (Syntax = {}));
var CommentHandler = class {
	constructor() {
		this.attach = false;
		this.comments = [];
		this.stack = [];
		this.leading = [];
		this.trailing = [];
	}
	insertInnerComments(node, metadata) {
		if (node.type === Syntax.BlockStatement && node.body.length === 0) {
			const innerComments = [];
			for (let i = this.leading.length - 1; i >= 0; --i) {
				const entry = this.leading[i];
				if (metadata.end.offset >= entry.start) {
					innerComments.unshift(entry.comment);
					this.leading.splice(i, 1);
					this.trailing.splice(i, 1);
				}
			}
			if (innerComments.length) node.innerComments = innerComments;
		}
	}
	findTrailingComments(metadata) {
		let trailingComments = [];
		if (this.trailing.length > 0) {
			for (let i = this.trailing.length - 1; i >= 0; --i) {
				const entry = this.trailing[i];
				if (entry.start >= metadata.end.offset) trailingComments.unshift(entry.comment);
			}
			this.trailing.length = 0;
			return trailingComments;
		}
		const last = this.stack[this.stack.length - 1];
		if (last && last.node.trailingComments) {
			const firstComment = last.node.trailingComments[0];
			if (firstComment && firstComment.range[0] >= metadata.end.offset) {
				trailingComments = last.node.trailingComments;
				delete last.node.trailingComments;
			}
		}
		return trailingComments;
	}
	findLeadingComments(metadata) {
		const leadingComments = [];
		let target;
		while (this.stack.length > 0) {
			const entry = this.stack[this.stack.length - 1];
			if (entry && entry.start >= metadata.start.offset) {
				target = entry.node;
				this.stack.pop();
			} else break;
		}
		if (target) {
			const count = target.leadingComments ? target.leadingComments.length : 0;
			for (let i = count - 1; i >= 0; --i) {
				const comment = target.leadingComments[i];
				if (comment.range[1] <= metadata.start.offset) {
					leadingComments.unshift(comment);
					target.leadingComments.splice(i, 1);
				}
			}
			if (target.leadingComments && target.leadingComments.length === 0) delete target.leadingComments;
			return leadingComments;
		}
		for (let i = this.leading.length - 1; i >= 0; --i) {
			const entry = this.leading[i];
			if (entry.start <= metadata.start.offset) {
				leadingComments.unshift(entry.comment);
				this.leading.splice(i, 1);
			}
		}
		return leadingComments;
	}
	visitNode(node, metadata) {
		if (node.type === Syntax.Program && node.body.length > 0) return;
		this.insertInnerComments(node, metadata);
		const trailingComments = this.findTrailingComments(metadata);
		const leadingComments = this.findLeadingComments(metadata);
		if (leadingComments.length > 0) node.leadingComments = leadingComments;
		if (trailingComments.length > 0) node.trailingComments = trailingComments;
		this.stack.push({
			node,
			start: metadata.start.offset
		});
	}
	visitComment(node, metadata) {
		const type = node.type[0] === "L" ? "Line" : "Block";
		const comment = {
			type,
			value: node.value
		};
		if (node.range) comment.range = node.range;
		if (node.loc) comment.loc = node.loc;
		this.comments.push(comment);
		if (this.attach) {
			const entry = {
				comment: {
					type,
					value: node.value,
					range: [metadata.start.offset, metadata.end.offset]
				},
				start: metadata.start.offset
			};
			if (node.loc) entry.comment.loc = node.loc;
			node.type = type;
			this.leading.push(entry);
			this.trailing.push(entry);
		}
	}
	visit(node, metadata) {
		if (node.type === "LineComment") this.visitComment(node, metadata);
		else if (node.type === "BlockComment") this.visitComment(node, metadata);
		else if (this.attach) this.visitNode(node, metadata);
	}
};
const Regex = {
	NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD23\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCDF\uDCFF\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDEE0-\uDEF2]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDEC0-\uDEEB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/,
	NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05EF-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u07FD\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D3-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u09FE\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1878\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CD0-\u1CD2\u1CD4-\u1CFA\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD27\uDD30-\uDD39\uDF00-\uDF1C\uDF27\uDF30-\uDF50\uDFE0-\uDFF6]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD44-\uDD46\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDC9-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3B-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC5E\uDC5F\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDC00-\uDC3A\uDCA0-\uDCE9\uDCFF\uDDA0-\uDDA7\uDDAA-\uDDD7\uDDDA-\uDDE1\uDDE3\uDDE4\uDE00-\uDE3E\uDE47\uDE50-\uDE99\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD8E\uDD90\uDD91\uDD93-\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF6]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF4F-\uDF87\uDF8F-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD00-\uDD2C\uDD30-\uDD3D\uDD40-\uDD49\uDD4E\uDEC0-\uDEF9]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4B\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
};
const Character = {
	fromCodePoint(cp) {
		return cp < 65536 ? String.fromCharCode(cp) : String.fromCharCode(55296 + (cp - 65536 >> 10)) + String.fromCharCode(56320 + (cp - 65536 & 1023));
	},
	isStringWellFormedUnicode(text) {
		for (let i = 0; i < text.length; i++) {
			let c = text.charCodeAt(i);
			if (c >= 55296 && c <= 56319) {
				if (i === text.length - 1) return false;
				i++;
				c = text.charCodeAt(i);
				if (c < 56320 && c > 57343) return false;
			} else if (c >= 56320 && c <= 57343) return false;
		}
		return true;
	},
	isWhiteSpace(cp) {
		return cp === 32 || cp === 9 || cp === 11 || cp === 12 || cp === 160 || cp >= 5760 && [
			5760,
			8192,
			8193,
			8194,
			8195,
			8196,
			8197,
			8198,
			8199,
			8200,
			8201,
			8202,
			8239,
			8287,
			12288,
			65279
		].indexOf(cp) >= 0;
	},
	isLineTerminator(cp) {
		return cp === 10 || cp === 13 || cp === 8232 || cp === 8233;
	},
	isIdentifierStart(cp) {
		return cp === 36 || cp === 95 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 92 || cp >= 128 && Regex.NonAsciiIdentifierStart.test(Character.fromCodePoint(cp));
	},
	isIdentifierPart(cp) {
		return cp === 36 || cp === 95 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp >= 48 && cp <= 57 || cp === 92 || cp >= 128 && Regex.NonAsciiIdentifierPart.test(Character.fromCodePoint(cp));
	},
	isDecimalDigit(cp) {
		return cp >= 48 && cp <= 57;
	},
	isDecimalDigitChar(ch) {
		return ch.length === 1 && Character.isDecimalDigit(ch.charCodeAt(0));
	},
	isHexDigit(cp) {
		return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 70 || cp >= 97 && cp <= 102;
	},
	isHexDigitChar(ch) {
		return ch.length === 1 && Character.isHexDigit(ch.charCodeAt(0));
	},
	isOctalDigit(cp) {
		return cp >= 48 && cp <= 55;
	},
	isOctalDigitChar(ch) {
		return ch.length === 1 && Character.isOctalDigit(ch.charCodeAt(0));
	}
};
var JSXSyntax;
(function(JSXSyntax) {
	JSXSyntax["JSXAttribute"] = "JSXAttribute";
	JSXSyntax["JSXClosingElement"] = "JSXClosingElement";
	JSXSyntax["JSXClosingFragment"] = "JSXClosingFragment";
	JSXSyntax["JSXElement"] = "JSXElement";
	JSXSyntax["JSXEmptyExpression"] = "JSXEmptyExpression";
	JSXSyntax["JSXExpressionContainer"] = "JSXExpressionContainer";
	JSXSyntax["JSXIdentifier"] = "JSXIdentifier";
	JSXSyntax["JSXMemberExpression"] = "JSXMemberExpression";
	JSXSyntax["JSXNamespacedName"] = "JSXNamespacedName";
	JSXSyntax["JSXOpeningElement"] = "JSXOpeningElement";
	JSXSyntax["JSXOpeningFragment"] = "JSXOpeningFragment";
	JSXSyntax["JSXSpreadAttribute"] = "JSXSpreadAttribute";
	JSXSyntax["JSXText"] = "JSXText";
})(JSXSyntax || (JSXSyntax = {}));
var JSXClosingElement = class {
	constructor(name) {
		this.type = JSXSyntax.JSXClosingElement;
		this.name = name;
	}
};
var JSXClosingFragment = class {
	constructor() {
		this.type = JSXSyntax.JSXClosingFragment;
	}
};
var JSXElement = class {
	constructor(openingElement, children, closingElement) {
		this.type = JSXSyntax.JSXElement;
		this.openingElement = openingElement;
		this.children = children;
		this.closingElement = closingElement;
	}
};
var JSXEmptyExpression = class {
	constructor() {
		this.type = JSXSyntax.JSXEmptyExpression;
	}
};
var JSXExpressionContainer = class {
	constructor(expression) {
		this.type = JSXSyntax.JSXExpressionContainer;
		this.expression = expression;
	}
};
var JSXIdentifier = class {
	constructor(name) {
		this.type = JSXSyntax.JSXIdentifier;
		this.name = name;
	}
};
var JSXMemberExpression = class {
	constructor(object, property) {
		this.type = JSXSyntax.JSXMemberExpression;
		this.object = object;
		this.property = property;
	}
};
var JSXAttribute = class {
	constructor(name, value) {
		this.type = JSXSyntax.JSXAttribute;
		this.name = name;
		this.value = value;
	}
};
var JSXNamespacedName = class {
	constructor(namespace, name) {
		this.type = JSXSyntax.JSXNamespacedName;
		this.namespace = namespace;
		this.name = name;
	}
};
var JSXOpeningElement = class {
	constructor(name, selfClosing, attributes) {
		this.type = JSXSyntax.JSXOpeningElement;
		this.name = name;
		this.selfClosing = selfClosing;
		this.attributes = attributes;
	}
};
var JSXOpeningFragment = class {
	constructor(selfClosing) {
		this.type = JSXSyntax.JSXOpeningFragment;
		this.selfClosing = selfClosing;
	}
};
var JSXSpreadAttribute = class {
	constructor(argument) {
		this.type = JSXSyntax.JSXSpreadAttribute;
		this.argument = argument;
	}
};
var JSXText = class {
	constructor(value, raw) {
		this.type = JSXSyntax.JSXText;
		this.value = value;
		this.raw = raw;
	}
};
var ArrayExpression = class {
	constructor(elements) {
		this.type = Syntax.ArrayExpression;
		this.elements = elements;
	}
};
var ArrayPattern = class {
	constructor(elements) {
		this.type = Syntax.ArrayPattern;
		this.elements = elements;
	}
};
var ArrowFunctionExpression = class {
	constructor(params, body, expression, isAsync) {
		this.type = Syntax.ArrowFunctionExpression;
		this.id = null;
		this.params = params;
		this.body = body;
		this.generator = false;
		this.expression = expression;
		this.async = isAsync;
	}
};
var AssignmentExpression = class {
	constructor(operator, left, right) {
		this.type = Syntax.AssignmentExpression;
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
};
var AssignmentPattern = class {
	constructor(left, right) {
		this.type = Syntax.AssignmentPattern;
		this.left = left;
		this.right = right;
	}
};
var AsyncFunctionDeclaration = class {
	constructor(id, params, body, generator) {
		this.type = Syntax.FunctionDeclaration;
		this.id = id;
		this.params = params;
		this.body = body;
		this.generator = generator;
		this.expression = false;
		this.async = true;
	}
};
var AwaitExpression = class {
	constructor(argument) {
		this.type = Syntax.AwaitExpression;
		this.argument = argument;
	}
};
var BigIntLiteral = class {
	constructor(value, raw, bigint) {
		this.type = Syntax.Literal;
		this.value = value;
		this.raw = raw;
		this.bigint = bigint;
	}
};
var BinaryExpression = class {
	constructor(operator, left, right) {
		this.type = Syntax.BinaryExpression;
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
};
var BlockStatement = class {
	constructor(body) {
		this.type = Syntax.BlockStatement;
		this.body = body;
	}
};
var BreakStatement = class {
	constructor(label) {
		this.type = Syntax.BreakStatement;
		this.label = label;
	}
};
var CallExpression = class {
	constructor(callee, args, optional) {
		this.type = Syntax.CallExpression;
		this.callee = callee;
		this.arguments = args;
		this.optional = optional;
	}
};
var CatchClause = class {
	constructor(param, body) {
		this.type = Syntax.CatchClause;
		this.param = param;
		this.body = body;
	}
};
var ChainExpression = class {
	constructor(expression) {
		this.type = Syntax.ChainExpression;
		this.expression = expression;
	}
};
var ClassBody = class {
	constructor(body) {
		this.type = Syntax.ClassBody;
		this.body = body;
	}
};
var ClassDeclaration = class {
	constructor(id, superClass, body, decorators) {
		this.type = Syntax.ClassDeclaration;
		this.id = id;
		this.superClass = superClass;
		this.body = body;
		this.decorators = decorators;
	}
};
var ClassExpression = class {
	constructor(id, superClass, body, decorators) {
		this.type = Syntax.ClassExpression;
		this.id = id;
		this.superClass = superClass;
		this.body = body;
		this.decorators = decorators;
	}
};
var ConditionalExpression = class {
	constructor(test, consequent, alternate) {
		this.type = Syntax.ConditionalExpression;
		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;
	}
};
var ContinueStatement = class {
	constructor(label) {
		this.type = Syntax.ContinueStatement;
		this.label = label;
	}
};
var DebuggerStatement = class {
	constructor() {
		this.type = Syntax.DebuggerStatement;
	}
};
var Decorator = class {
	constructor(expression) {
		this.type = Syntax.Decorator;
		this.expression = expression;
	}
};
var Directive = class {
	constructor(expression, directive) {
		this.type = Syntax.ExpressionStatement;
		this.expression = expression;
		this.directive = directive;
	}
};
var DoWhileStatement = class {
	constructor(body, test) {
		this.type = Syntax.DoWhileStatement;
		this.body = body;
		this.test = test;
	}
};
var EmptyStatement = class {
	constructor() {
		this.type = Syntax.EmptyStatement;
	}
};
var ExportAllDeclaration = class {
	constructor(source, exported, assertions) {
		this.type = Syntax.ExportAllDeclaration;
		this.source = source;
		this.exported = exported;
		this.assertions = assertions;
	}
};
var ExportDefaultDeclaration = class {
	constructor(declaration) {
		this.type = Syntax.ExportDefaultDeclaration;
		this.declaration = declaration;
	}
};
var ExportNamedDeclaration = class {
	constructor(declaration, specifiers, source, assertions) {
		this.type = Syntax.ExportNamedDeclaration;
		this.declaration = declaration;
		this.specifiers = specifiers;
		this.source = source;
		this.assertions = assertions;
	}
};
var ExportSpecifier = class {
	constructor(local, exported) {
		this.type = Syntax.ExportSpecifier;
		this.exported = exported;
		this.local = local;
	}
};
var ExpressionStatement = class {
	constructor(expression) {
		this.type = Syntax.ExpressionStatement;
		this.expression = expression;
	}
};
var ForInStatement = class {
	constructor(left, right, body) {
		this.type = Syntax.ForInStatement;
		this.left = left;
		this.right = right;
		this.body = body;
		this.each = false;
	}
};
var ForOfStatement = class {
	constructor(left, right, body, _await) {
		this.type = Syntax.ForOfStatement;
		this.await = _await;
		this.left = left;
		this.right = right;
		this.body = body;
	}
};
var ForStatement = class {
	constructor(init, test, update, body) {
		this.type = Syntax.ForStatement;
		this.init = init;
		this.test = test;
		this.update = update;
		this.body = body;
	}
};
var FunctionDeclaration = class {
	constructor(id, params, body, generator) {
		this.type = Syntax.FunctionDeclaration;
		this.id = id;
		this.params = params;
		this.body = body;
		this.generator = generator;
		this.expression = false;
		this.async = false;
	}
};
var FunctionExpression = class {
	constructor(id, params, body, generator, isAsync) {
		this.type = Syntax.FunctionExpression;
		this.id = id;
		this.params = params;
		this.body = body;
		this.generator = generator;
		this.expression = false;
		this.async = isAsync;
	}
};
var Identifier = class {
	constructor(name) {
		this.type = Syntax.Identifier;
		this.name = name;
	}
};
var IfStatement = class {
	constructor(test, consequent, alternate) {
		this.type = Syntax.IfStatement;
		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;
	}
};
var ImportAttribute = class {
	constructor(key, value) {
		this.type = Syntax.ImportAttribute;
		this.key = key;
		this.value = value;
	}
};
var ImportExpression = class {
	constructor(source, attributes) {
		this.type = Syntax.ImportExpression;
		this.source = source;
		this.attributes = attributes;
	}
};
var ImportDeclaration = class {
	constructor(specifiers, source, assertions) {
		this.type = Syntax.ImportDeclaration;
		this.specifiers = specifiers;
		this.source = source;
		this.assertions = assertions;
	}
};
var ImportDefaultSpecifier = class {
	constructor(local) {
		this.type = Syntax.ImportDefaultSpecifier;
		this.local = local;
	}
};
var ImportNamespaceSpecifier = class {
	constructor(local) {
		this.type = Syntax.ImportNamespaceSpecifier;
		this.local = local;
	}
};
var ImportSpecifier = class {
	constructor(local, imported) {
		this.type = Syntax.ImportSpecifier;
		this.local = local;
		this.imported = imported;
	}
};
var LabeledStatement = class {
	constructor(label, body) {
		this.type = Syntax.LabeledStatement;
		this.label = label;
		this.body = body;
	}
};
var Literal = class {
	constructor(value, raw) {
		this.type = Syntax.Literal;
		this.value = value;
		this.raw = raw;
	}
};
var LogicalExpression = class {
	constructor(operator, left, right) {
		this.type = Syntax.LogicalExpression;
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
};
var MemberExpression = class {
	constructor(computed, object, property, optional) {
		this.type = Syntax.MemberExpression;
		this.computed = computed;
		this.object = object;
		this.property = property;
		this.optional = optional;
	}
};
var MetaProperty = class {
	constructor(meta, property) {
		this.type = Syntax.MetaProperty;
		this.meta = meta;
		this.property = property;
	}
};
var MethodDefinition = class {
	constructor(key, computed, value, kind, isStatic, decorators) {
		this.type = Syntax.MethodDefinition;
		this.key = key;
		this.computed = computed;
		this.value = value;
		this.kind = kind;
		this.static = isStatic;
		this.decorators = decorators;
	}
};
var Module = class {
	constructor(body) {
		this.type = Syntax.Program;
		this.body = body;
		this.sourceType = "module";
	}
};
var NewExpression = class {
	constructor(callee, args) {
		this.type = Syntax.NewExpression;
		this.callee = callee;
		this.arguments = args;
	}
};
var ObjectExpression = class {
	constructor(properties) {
		this.type = Syntax.ObjectExpression;
		this.properties = properties;
	}
};
var ObjectPattern = class {
	constructor(properties) {
		this.type = Syntax.ObjectPattern;
		this.properties = properties;
	}
};
var PrivateIdentifier = class {
	constructor(name) {
		this.type = Syntax.PrivateIdentifier;
		this.name = name;
	}
};
var Property = class {
	constructor(kind, key, computed, value, method, shorthand) {
		this.type = Syntax.Property;
		this.key = key;
		this.computed = computed;
		this.value = value;
		this.kind = kind;
		this.method = method;
		this.shorthand = shorthand;
	}
};
var PropertyDefinition = class {
	constructor(key, computed, value, isStatic, decorators) {
		this.type = Syntax.Property;
		this.key = key;
		this.computed = computed;
		this.value = value;
		this.static = isStatic;
		this.decorators = decorators;
	}
};
var RegexLiteral = class {
	constructor(value, raw, pattern, flags) {
		this.type = Syntax.Literal;
		this.value = value;
		this.raw = raw;
		this.regex = {
			pattern,
			flags
		};
	}
};
var RestElement = class {
	constructor(argument) {
		this.type = Syntax.RestElement;
		this.argument = argument;
	}
};
var ReturnStatement = class {
	constructor(argument) {
		this.type = Syntax.ReturnStatement;
		this.argument = argument;
	}
};
var Script = class {
	constructor(body) {
		this.type = Syntax.Program;
		this.body = body;
		this.sourceType = "script";
	}
};
var SequenceExpression = class {
	constructor(expressions) {
		this.type = Syntax.SequenceExpression;
		this.expressions = expressions;
	}
};
var SpreadElement = class {
	constructor(argument) {
		this.type = Syntax.SpreadElement;
		this.argument = argument;
	}
};
var StaticBlock = class {
	constructor(body) {
		this.type = Syntax.StaticBlock;
		this.body = body;
	}
};
var Super = class {
	constructor() {
		this.type = Syntax.Super;
	}
};
var SwitchCase = class {
	constructor(test, consequent) {
		this.type = Syntax.SwitchCase;
		this.test = test;
		this.consequent = consequent;
	}
};
var SwitchStatement = class {
	constructor(discriminant, cases) {
		this.type = Syntax.SwitchStatement;
		this.discriminant = discriminant;
		this.cases = cases;
	}
};
var TaggedTemplateExpression = class {
	constructor(tag, quasi) {
		this.type = Syntax.TaggedTemplateExpression;
		this.tag = tag;
		this.quasi = quasi;
	}
};
var TemplateElement = class {
	constructor(value, tail) {
		this.type = Syntax.TemplateElement;
		this.value = value;
		this.tail = tail;
	}
};
var TemplateLiteral = class {
	constructor(quasis, expressions) {
		this.type = Syntax.TemplateLiteral;
		this.quasis = quasis;
		this.expressions = expressions;
	}
};
var ThisExpression = class {
	constructor() {
		this.type = Syntax.ThisExpression;
	}
};
var ThrowStatement = class {
	constructor(argument) {
		this.type = Syntax.ThrowStatement;
		this.argument = argument;
	}
};
var TryStatement = class {
	constructor(block, handler, finalizer) {
		this.type = Syntax.TryStatement;
		this.block = block;
		this.handler = handler;
		this.finalizer = finalizer;
	}
};
var UnaryExpression = class {
	constructor(operator, argument) {
		this.type = Syntax.UnaryExpression;
		this.operator = operator;
		this.argument = argument;
		this.prefix = true;
	}
};
var UpdateExpression = class {
	constructor(operator, argument, prefix) {
		this.type = Syntax.UpdateExpression;
		this.operator = operator;
		this.argument = argument;
		this.prefix = prefix;
	}
};
var VariableDeclaration = class {
	constructor(declarations, kind) {
		this.type = Syntax.VariableDeclaration;
		this.declarations = declarations;
		this.kind = kind;
	}
};
var VariableDeclarator = class {
	constructor(id, init) {
		this.type = Syntax.VariableDeclarator;
		this.id = id;
		this.init = init;
	}
};
var WhileStatement = class {
	constructor(test, body) {
		this.type = Syntax.WhileStatement;
		this.test = test;
		this.body = body;
	}
};
var WithStatement = class {
	constructor(object, body) {
		this.type = Syntax.WithStatement;
		this.object = object;
		this.body = body;
	}
};
var YieldExpression = class {
	constructor(argument, delegate) {
		this.type = Syntax.YieldExpression;
		this.argument = argument;
		this.delegate = delegate;
	}
};
function assert(condition, message) {
	/* istanbul ignore if */
	if (!condition) throw new Error("ASSERT: " + message);
}
var ErrorHandler = class {
	constructor() {
		this.errors = [];
		this.tolerant = false;
	}
	recordError(error) {
		this.errors.push(error);
	}
	tolerate(error) {
		if (this.tolerant) this.recordError(error);
		else throw error;
	}
	constructError(msg, column) {
		let error = new Error(msg);
		try {
			throw error;
		} catch (base) {
			/* istanbul ignore else */
			if (Object.create && Object.defineProperty) {
				error = Object.create(base);
				Object.defineProperty(error, "column", { value: column });
			}
		}
		/* istanbul ignore next */
		return error;
	}
	createError(index, line, col, description) {
		const msg = "Line " + line + ": " + description;
		const _error = this.constructError(msg, col);
		_error.index = index;
		_error.lineNumber = line;
		_error.description = description;
		return _error;
	}
	throwError(index, line, col, description) {
		throw this.createError(index, line, col, description);
	}
	tolerateError(index, line, col, description) {
		const error = this.createError(index, line, col, description);
		if (this.tolerant) this.recordError(error);
		else throw error;
	}
};
const Messages = {
	AsyncFunctionInSingleStatementContext: "Async functions can only be declared at the top level or inside a block.",
	BadImportCallArity: "Unexpected token",
	BadGetterArity: "Getter must not have any formal parameters",
	BadSetterArity: "Setter must have exactly one formal parameter",
	BadSetterRestParameter: "Setter function argument must not be a rest parameter",
	CannotUseImportMetaOutsideAModule: "Cannot use 'import.meta' outside a module",
	ConstructorIsAsync: "Class constructor may not be an async method",
	ConstructorIsPrivate: "Class constructor may not be a private method",
	ConstructorSpecialMethod: "Class constructor may not be an accessor",
	DeclarationMissingInitializer: "Missing initializer in %0 declaration",
	DefaultRestParameter: "Unexpected token =",
	DefaultRestProperty: "Unexpected token =",
	DuplicateBinding: "Duplicate binding %0",
	DuplicateConstructor: "A class may only have one constructor",
	DuplicateParameter: "Duplicate parameter name not allowed in this context",
	DuplicateProtoProperty: "Duplicate __proto__ fields are not allowed in object literals",
	ForInOfLoopInitializer: "%0 loop variable declaration may not have an initializer",
	GeneratorInLegacyContext: "Generator declarations are not allowed in legacy contexts",
	IllegalBreak: "Illegal break statement",
	IllegalContinue: "Illegal continue statement",
	IllegalExportDeclaration: "Unexpected token",
	IllegalImportDeclaration: "Unexpected token",
	IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list",
	IllegalReturn: "Illegal return statement",
	InvalidEscapedReservedWord: "Keyword must not contain escaped characters",
	InvalidHexEscapeSequence: "Invalid hexadecimal escape sequence",
	InvalidLHSInAssignment: "Invalid left-hand side in assignment",
	InvalidLHSInForIn: "Invalid left-hand side in for-in",
	InvalidLHSInForLoop: "Invalid left-hand side in for-loop",
	InvalidModuleSpecifier: "Unexpected token",
	InvalidRegExp: "Invalid regular expression",
	InvalidTaggedTemplateOnOptionalChain: "Invalid tagged template on optional chain",
	InvalidUnicodeEscapeSequence: "Invalid Unicode escape sequence",
	LetInLexicalBinding: "let is disallowed as a lexically bound name",
	MissingFromClause: "Unexpected token",
	MultipleDefaultsInSwitch: "More than one default clause in switch statement",
	NewlineAfterThrow: "Illegal newline after throw",
	NoAsAfterImportNamespace: "Unexpected token",
	NoAsAndFromEscapeSequences: "The `as` and `from` contextual keywords must not contain Unicode escape sequences.",
	NoCatchOrFinally: "Missing catch or finally after try",
	NoSemicolonAfterDecorator: "Decorators must not be followed by a semicolon.",
	NumericSeperatorOneUnderscore: "Numeric separator must be exactly one underscore",
	NumericSeperatorNotAllowedHere: "Numeric separator is not allowed here",
	ParameterAfterRestParameter: "Rest parameter must be last formal parameter",
	PropertyAfterRestProperty: "Unexpected token",
	Redeclaration: "%0 '%1' has already been declared",
	StaticPrototype: "Classes may not have static property named prototype",
	StrictCatchVariable: "Catch variable may not be eval or arguments in strict mode",
	StrictDelete: "Delete of an unqualified identifier in strict mode.",
	StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block",
	StrictFunctionName: "Function name may not be eval or arguments in strict mode",
	StrictLHSAssignment: "Assignment to eval or arguments is not allowed in strict mode",
	StrictLHSPostfix: "Postfix increment/decrement may not have eval or arguments operand in strict mode",
	StrictLHSPrefix: "Prefix increment/decrement may not have eval or arguments operand in strict mode",
	StrictModeWith: "Strict mode code may not include a with statement",
	StrictOctalLiteral: "Octal literals are not allowed in strict mode.",
	StrictParamName: "Parameter name eval or arguments is not allowed in strict mode",
	StrictReservedWord: "Use of future reserved word in strict mode",
	StrictVarName: "Variable name may not be eval or arguments in strict mode",
	TemplateOctalLiteral: "Octal literals are not allowed in template strings.",
	TemplateEscape89: "\\8 and \\9 are not allowed in template strings.",
	UnexpectedEOS: "Unexpected end of input",
	UnexpectedIdentifier: "Unexpected identifier",
	UnexpectedNumber: "Unexpected number",
	UnexpectedReserved: "Unexpected reserved word",
	UnexpectedString: "Unexpected string",
	UnexpectedSuper: "'super' keyword unexpected here",
	UnexpectedTemplate: "Unexpected quasi %0",
	UnexpectedToken: "Unexpected token %0",
	UnexpectedTokenIllegal: "Unexpected token ILLEGAL",
	UnknownLabel: "Undefined label '%0'",
	UnterminatedRegExp: "Invalid regular expression: missing /"
};
function hexValue(ch) {
	return "0123456789abcdef".indexOf(ch.toLowerCase());
}
function octalValue(ch) {
	return "01234567".indexOf(ch);
}
var Scanner = class {
	constructor(code, handler) {
		this.source = code;
		this.errorHandler = handler;
		this.trackComment = false;
		this.isModule = false;
		this.length = code.length;
		this.index = 0;
		this.lineNumber = code.length > 0 ? 1 : 0;
		this.lineStart = 0;
		this.curlyStack = [];
	}
	saveState() {
		return {
			index: this.index,
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			curlyStack: this.curlyStack.slice()
		};
	}
	restoreState(state) {
		this.index = state.index;
		this.lineNumber = state.lineNumber;
		this.lineStart = state.lineStart;
		this.curlyStack = state.curlyStack;
	}
	eof() {
		return this.index >= this.length;
	}
	throwUnexpectedToken(message = Messages.UnexpectedTokenIllegal) {
		return this.errorHandler.throwError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
	}
	tolerateUnexpectedToken(message = Messages.UnexpectedTokenIllegal) {
		this.errorHandler.tolerateError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
	}
	skipSingleLineComment(offset) {
		let comments = [];
		let start, loc;
		if (this.trackComment) {
			comments = [];
			start = this.index - offset;
			loc = {
				start: {
					line: this.lineNumber,
					column: this.index - this.lineStart - offset
				},
				end: {}
			};
		}
		while (!this.eof()) {
			const ch = this.source.charCodeAt(this.index);
			++this.index;
			if (Character.isLineTerminator(ch)) {
				if (this.trackComment) {
					loc.end = {
						line: this.lineNumber,
						column: this.index - this.lineStart - 1
					};
					const entry = {
						multiLine: false,
						slice: [start + offset, this.index - 1],
						range: [start, this.index - 1],
						loc
					};
					comments.push(entry);
				}
				if (ch === 13 && this.source.charCodeAt(this.index) === 10) ++this.index;
				++this.lineNumber;
				this.lineStart = this.index;
				return comments;
			}
		}
		if (this.trackComment) {
			loc.end = {
				line: this.lineNumber,
				column: this.index - this.lineStart
			};
			const entry = {
				multiLine: false,
				slice: [start + offset, this.index],
				range: [start, this.index],
				loc
			};
			comments.push(entry);
		}
		return comments;
	}
	skipMultiLineComment() {
		let comments = [];
		let start, loc;
		if (this.trackComment) {
			comments = [];
			start = this.index - 2;
			loc = {
				start: {
					line: this.lineNumber,
					column: this.index - this.lineStart - 2
				},
				end: {}
			};
		}
		while (!this.eof()) {
			const ch = this.source.charCodeAt(this.index);
			if (Character.isLineTerminator(ch)) {
				if (ch === 13 && this.source.charCodeAt(this.index + 1) === 10) ++this.index;
				++this.lineNumber;
				++this.index;
				this.lineStart = this.index;
			} else if (ch === 42) {
				if (this.source.charCodeAt(this.index + 1) === 47) {
					this.index += 2;
					if (this.trackComment) {
						loc.end = {
							line: this.lineNumber,
							column: this.index - this.lineStart
						};
						const entry = {
							multiLine: true,
							slice: [start + 2, this.index - 2],
							range: [start, this.index],
							loc
						};
						comments.push(entry);
					}
					return comments;
				}
				++this.index;
			} else ++this.index;
		}
		if (this.trackComment) {
			loc.end = {
				line: this.lineNumber,
				column: this.index - this.lineStart
			};
			const entry = {
				multiLine: true,
				slice: [start + 2, this.index],
				range: [start, this.index],
				loc
			};
			comments.push(entry);
		}
		this.tolerateUnexpectedToken();
		return comments;
	}
	scanComments() {
		let comments;
		if (this.trackComment) comments = [];
		let start = this.index === 0;
		while (!this.eof()) {
			let ch = this.source.charCodeAt(this.index);
			if (Character.isWhiteSpace(ch)) ++this.index;
			else if (Character.isLineTerminator(ch)) {
				++this.index;
				if (ch === 13 && this.source.charCodeAt(this.index) === 10) ++this.index;
				++this.lineNumber;
				this.lineStart = this.index;
				start = true;
			} else if (ch === 47) {
				ch = this.source.charCodeAt(this.index + 1);
				if (ch === 47) {
					this.index += 2;
					const comment = this.skipSingleLineComment(2);
					if (this.trackComment) comments = comments.concat(comment);
					start = true;
				} else if (ch === 42) {
					this.index += 2;
					const comment = this.skipMultiLineComment();
					if (this.trackComment) comments = comments.concat(comment);
				} else break;
			} else if (start && ch === 45) {
				if (this.source.charCodeAt(this.index + 1) === 45 && this.source.charCodeAt(this.index + 2) === 62) {
					this.index += 3;
					const comment = this.skipSingleLineComment(3);
					if (this.trackComment) comments = comments.concat(comment);
				} else break;
			} else if (ch === 60 && !this.isModule) {
				if (this.source.slice(this.index + 1, this.index + 4) === "!--") {
					this.index += 4;
					const comment = this.skipSingleLineComment(4);
					if (this.trackComment) comments = comments.concat(comment);
				} else break;
			} else break;
		}
		return comments;
	}
	isFutureReservedWord(id) {
		switch (id) {
			case "enum":
			case "export":
			case "import":
			case "super": return true;
			default: return false;
		}
	}
	isStrictModeReservedWord(id) {
		switch (id) {
			case "implements":
			case "interface":
			case "package":
			case "private":
			case "protected":
			case "public":
			case "static":
			case "yield":
			case "let": return true;
			default: return false;
		}
	}
	isRestrictedWord(id) {
		return id === "eval" || id === "arguments";
	}
	isKeyword(id) {
		switch (id.length) {
			case 2: return id === "if" || id === "in" || id === "do";
			case 3: return id === "var" || id === "for" || id === "new" || id === "try" || id === "let";
			case 4: return id === "this" || id === "else" || id === "case" || id === "void" || id === "with" || id === "enum";
			case 5: return id === "while" || id === "break" || id === "catch" || id === "throw" || id === "const" || id === "yield" || id === "class" || id === "super";
			case 6: return id === "return" || id === "typeof" || id === "delete" || id === "switch" || id === "export" || id === "import";
			case 7: return id === "default" || id === "finally" || id === "extends";
			case 8: return id === "function" || id === "continue" || id === "debugger";
			case 10: return id === "instanceof";
			default: return false;
		}
	}
	codePointAt(i) {
		let cp = this.source.charCodeAt(i);
		if (cp >= 55296 && cp <= 56319) {
			const second = this.source.charCodeAt(i + 1);
			if (second >= 56320 && second <= 57343) cp = (cp - 55296) * 1024 + second - 56320 + 65536;
		}
		return cp;
	}
	scanHexEscape(prefix) {
		const len = prefix === "u" ? 4 : 2;
		let code = 0;
		for (let i = 0; i < len; ++i) if (!this.eof() && Character.isHexDigit(this.source.charCodeAt(this.index))) code = code * 16 + hexValue(this.source[this.index++]);
		else return null;
		return String.fromCharCode(code);
	}
	tryToScanUnicodeCodePointEscape() {
		let ch = this.source[this.index];
		let code = 0;
		if (ch === "}") return null;
		while (!this.eof()) {
			ch = this.source[this.index++];
			if (!Character.isHexDigit(ch.charCodeAt(0))) break;
			code = code * 16 + hexValue(ch);
		}
		if (code > 1114111 || ch !== "}") return null;
		return Character.fromCodePoint(code);
	}
	scanUnicodeCodePointEscape() {
		const result = this.tryToScanUnicodeCodePointEscape();
		if (result === null) return this.throwUnexpectedToken();
		return result;
	}
	getIdentifier() {
		const start = this.index++;
		while (!this.eof()) {
			const ch = this.source.charCodeAt(this.index);
			if (ch === 92) {
				this.index = start;
				return this.getComplexIdentifier();
			} else if (ch >= 55296 && ch < 57343) {
				this.index = start;
				return this.getComplexIdentifier();
			}
			if (Character.isIdentifierPart(ch)) ++this.index;
			else break;
		}
		return this.source.slice(start, this.index);
	}
	getComplexIdentifier() {
		let cp = this.codePointAt(this.index);
		let id = Character.fromCodePoint(cp);
		this.index += id.length;
		let ch;
		if (cp === 92) {
			if (this.source.charCodeAt(this.index) !== 117) this.throwUnexpectedToken();
			++this.index;
			if (this.source[this.index] === "{") {
				++this.index;
				ch = this.scanUnicodeCodePointEscape();
			} else {
				ch = this.scanHexEscape("u");
				if (ch === null || ch === "\\" || !Character.isIdentifierStart(ch.charCodeAt(0))) this.throwUnexpectedToken();
			}
			id = ch;
		}
		while (!this.eof()) {
			cp = this.codePointAt(this.index);
			if (!Character.isIdentifierPart(cp)) break;
			ch = Character.fromCodePoint(cp);
			id += ch;
			this.index += ch.length;
			if (cp === 92) {
				id = id.substr(0, id.length - 1);
				if (this.source.charCodeAt(this.index) !== 117) this.throwUnexpectedToken();
				++this.index;
				if (this.source[this.index] === "{") {
					++this.index;
					ch = this.scanUnicodeCodePointEscape();
				} else {
					ch = this.scanHexEscape("u");
					if (ch === null || ch === "\\" || !Character.isIdentifierPart(ch.charCodeAt(0))) this.throwUnexpectedToken();
				}
				id += ch;
			}
		}
		return id;
	}
	octalToDecimal(ch) {
		let octal = ch !== "0";
		let code = octalValue(ch);
		if (!this.eof() && Character.isOctalDigit(this.source.charCodeAt(this.index))) {
			octal = true;
			code = code * 8 + octalValue(this.source[this.index++]);
			if ("0123".indexOf(ch) >= 0 && !this.eof() && Character.isOctalDigit(this.source.charCodeAt(this.index))) code = code * 8 + octalValue(this.source[this.index++]);
		}
		return {
			code,
			octal
		};
	}
	scanIdentifier() {
		let type;
		const start = this.index;
		const escaped = this.source.charCodeAt(start) === 92;
		const id = escaped ? this.getComplexIdentifier() : this.getIdentifier();
		if (id.length === 1) type = 3;
		else if (this.isKeyword(id)) type = 4;
		else if (id === "null") type = 5;
		else if (id === "true" || id === "false") type = 1;
		else type = 3;
		if (type !== 3 && start + id.length !== this.index) {
			const restore = this.index;
			this.index = start;
			this.tolerateUnexpectedToken(Messages.InvalidEscapedReservedWord);
			this.index = restore;
		}
		return {
			type,
			value: id,
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index,
			escaped
		};
	}
	scanPunctuator() {
		const start = this.index;
		let str = this.source[this.index];
		switch (str) {
			case "(":
			case "{":
				if (str === "{") this.curlyStack.push("{");
				++this.index;
				break;
			case ".":
				++this.index;
				if (this.source[this.index] === "." && this.source[this.index + 1] === ".") {
					this.index += 2;
					str = "...";
				}
				break;
			case "}":
				++this.index;
				this.curlyStack.pop();
				break;
			case "?":
				++this.index;
				if (this.source[this.index] === "?") {
					++this.index;
					if (this.source[this.index] === "=") {
						++this.index;
						str = "??=";
					} else str = "??";
				}
				if (this.source[this.index] === "." && !/^\d$/.test(this.source[this.index + 1])) {
					++this.index;
					str = "?.";
				}
				break;
			case "#":
			case ")":
			case ";":
			case ",":
			case "[":
			case "]":
			case ":":
			case "~":
			case "@":
				++this.index;
				break;
			default:
				str = this.source.substr(this.index, 4);
				if (str === ">>>=") this.index += 4;
				else {
					str = str.substr(0, 3);
					if (str === "===" || str === "!==" || str === ">>>" || str === "<<=" || str === ">>=" || str === "**=" || str === "&&=" || str === "||=") this.index += 3;
					else {
						str = str.substr(0, 2);
						if (str === "&&" || str === "||" || str === "==" || str === "!=" || str === "+=" || str === "-=" || str === "*=" || str === "/=" || str === "++" || str === "--" || str === "<<" || str === ">>" || str === "&=" || str === "|=" || str === "^=" || str === "%=" || str === "<=" || str === ">=" || str === "=>" || str === "**") this.index += 2;
						else {
							str = this.source[this.index];
							if ("<>=!+-*%&|^/".indexOf(str) >= 0) ++this.index;
						}
					}
				}
		}
		if (this.index === start) this.throwUnexpectedToken();
		return {
			type: 7,
			value: str,
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	scanHexLiteral(start) {
		let num = this.scanLiteralPart(Character.isHexDigitChar);
		if (num.length === 0) this.throwUnexpectedToken();
		if (this.source[this.index] === "n") {
			this.index++;
			return {
				type: 6,
				value: BigInt("0x" + num),
				lineNumber: this.lineNumber,
				lineStart: this.lineStart,
				start,
				end: this.index
			};
		}
		if (Character.isIdentifierStart(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
		return {
			type: 6,
			value: parseInt("0x" + num, 16),
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	scanBinaryLiteral(start) {
		let ch;
		let num = this.scanLiteralPart((c) => c === "0" || c === "1");
		if (num.length === 0) this.throwUnexpectedToken();
		if (this.source[this.index] === "n") {
			this.index++;
			return {
				type: 6,
				value: BigInt("0b" + num),
				lineNumber: this.lineNumber,
				lineStart: this.lineStart,
				start,
				end: this.index
			};
		}
		if (!this.eof()) {
			ch = this.source.charCodeAt(this.index);
			/* istanbul ignore else */
			if (Character.isIdentifierStart(ch) || Character.isDecimalDigit(ch)) this.throwUnexpectedToken();
		}
		return {
			type: 6,
			value: parseInt(num, 2),
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	scanOctalLiteral(prefix, start) {
		let num = "";
		let octal = false;
		if (Character.isOctalDigit(prefix.charCodeAt(0))) {
			octal = true;
			num = "0" + this.source[this.index++];
		} else ++this.index;
		num += this.scanLiteralPart(Character.isOctalDigitChar);
		if (!octal && num.length === 0) this.throwUnexpectedToken();
		if (this.source[this.index] === "n") {
			this.index++;
			return {
				type: 6,
				value: BigInt("0o" + num),
				lineNumber: this.lineNumber,
				lineStart: this.lineStart,
				start,
				end: this.index
			};
		}
		if (Character.isIdentifierStart(this.source.charCodeAt(this.index)) || Character.isDecimalDigit(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
		return {
			type: 6,
			value: parseInt(num, 8),
			octal,
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	isImplicitOctalLiteral() {
		for (let i = this.index + 1; i < this.length; ++i) {
			const ch = this.source[i];
			if (ch === "8" || ch === "9" || ch === "n") return false;
			if (!Character.isOctalDigit(ch.charCodeAt(0))) return true;
		}
		return true;
	}
	scanLiteralPart(check) {
		let num = "";
		if (this.source[this.index] === "_") this.throwUnexpectedToken(Messages.NumericSeperatorNotAllowedHere);
		while (this.source[this.index] && (check(this.source[this.index]) || this.source[this.index] === "_")) {
			if (this.source[this.index] !== "_") num += this.source[this.index];
			this.index++;
			if (this.source[this.index - 1] === "_" && this.source[this.index] === "_") this.throwUnexpectedToken(Messages.NumericSeperatorOneUnderscore);
		}
		if (this.source[this.index - 1] === "_") this.throwUnexpectedToken(Messages.NumericSeperatorNotAllowedHere);
		return num;
	}
	scanNumericLiteral() {
		const start = this.index;
		let ch = this.source[start];
		assert(Character.isDecimalDigit(ch.charCodeAt(0)) || ch === ".", "Numeric literal must start with a decimal digit or a decimal point");
		let num = "";
		if (ch !== ".") {
			num = this.source[this.index++];
			ch = this.source[this.index];
			if (num === "0") {
				if (ch === "x" || ch === "X") {
					++this.index;
					return this.scanHexLiteral(start);
				}
				if (ch === "b" || ch === "B") {
					++this.index;
					return this.scanBinaryLiteral(start);
				}
				if (ch === "o" || ch === "O") return this.scanOctalLiteral(ch, start);
				if (ch && Character.isOctalDigit(ch.charCodeAt(0))) {
					if (this.isImplicitOctalLiteral()) return this.scanOctalLiteral(ch, start);
				}
			}
			this.index--;
			num = this.scanLiteralPart(Character.isDecimalDigitChar);
			ch = this.source[this.index];
		}
		if (ch === ".") {
			num += this.source[this.index++];
			num += this.scanLiteralPart(Character.isDecimalDigitChar);
			ch = this.source[this.index];
		}
		if (ch === "e" || ch === "E") {
			num += this.source[this.index++];
			ch = this.source[this.index];
			if (ch === "+" || ch === "-") num += this.source[this.index++];
			if (Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.scanLiteralPart(Character.isDecimalDigitChar);
			else this.throwUnexpectedToken();
		} else if (ch === "n") {
			if (num.length > 1 && num[0] === "0") this.throwUnexpectedToken();
			this.index++;
			return {
				type: 6,
				value: BigInt(num),
				lineNumber: this.lineNumber,
				lineStart: this.lineStart,
				start,
				end: this.index
			};
		}
		if (Character.isIdentifierStart(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
		return {
			type: 6,
			value: parseFloat(num),
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	scanStringLiteral() {
		const start = this.index;
		let quote = this.source[start];
		assert(quote === "'" || quote === "\"", "String literal must starts with a quote");
		++this.index;
		let octal = false;
		let str = "";
		while (!this.eof()) {
			let ch = this.source[this.index++];
			if (ch === quote) {
				quote = "";
				break;
			} else if (ch === "\\") {
				ch = this.source[this.index++];
				if (!ch || !Character.isLineTerminator(ch.charCodeAt(0))) switch (ch) {
					case "u":
						if (this.source[this.index] === "{") {
							++this.index;
							str += this.scanUnicodeCodePointEscape();
						} else {
							const unescapedChar = this.scanHexEscape(ch);
							if (unescapedChar === null) this.throwUnexpectedToken();
							str += unescapedChar;
						}
						break;
					case "x":
						const unescaped = this.scanHexEscape(ch);
						if (unescaped === null) this.throwUnexpectedToken(Messages.InvalidHexEscapeSequence);
						str += unescaped;
						break;
					case "n":
						str += "\n";
						break;
					case "r":
						str += "\r";
						break;
					case "t":
						str += "	";
						break;
					case "b":
						str += "\b";
						break;
					case "f":
						str += "\f";
						break;
					case "v":
						str += "\v";
						break;
					case "8":
					case "9":
						str += ch;
						this.tolerateUnexpectedToken();
						break;
					default: if (ch && Character.isOctalDigit(ch.charCodeAt(0))) {
						const octToDec = this.octalToDecimal(ch);
						octal = octToDec.octal || octal;
						str += String.fromCharCode(octToDec.code);
					} else str += ch;
				}
				else {
					++this.lineNumber;
					if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
					this.lineStart = this.index;
				}
			} else if (Character.isLineTerminator(ch.charCodeAt(0))) break;
			else str += ch;
		}
		if (quote !== "") {
			this.index = start;
			this.throwUnexpectedToken();
		}
		return {
			type: 8,
			value: str,
			octal,
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	scanTemplate() {
		let cooked = "";
		let terminated = false;
		const start = this.index;
		const head = this.source[start] === "`";
		let tail = false;
		let notEscapeSequenceHead = null;
		let rawOffset = 2;
		++this.index;
		while (!this.eof()) {
			let ch = this.source[this.index++];
			if (ch === "`") {
				rawOffset = 1;
				tail = true;
				terminated = true;
				break;
			} else if (ch === "$") {
				if (this.source[this.index] === "{") {
					this.curlyStack.push("${");
					++this.index;
					terminated = true;
					break;
				}
				cooked += ch;
			} else if (notEscapeSequenceHead !== null) continue;
			else if (ch === "\\") {
				ch = this.source[this.index++];
				if (!Character.isLineTerminator(ch.charCodeAt(0))) switch (ch) {
					case "n":
						cooked += "\n";
						break;
					case "r":
						cooked += "\r";
						break;
					case "t":
						cooked += "	";
						break;
					case "u":
						if (this.source[this.index] === "{") {
							++this.index;
							const unicodeCodePointEscape = this.tryToScanUnicodeCodePointEscape();
							if (unicodeCodePointEscape === null) notEscapeSequenceHead = "u";
							else cooked += unicodeCodePointEscape;
						} else {
							const unescapedChar = this.scanHexEscape(ch);
							if (unescapedChar === null) notEscapeSequenceHead = "u";
							else cooked += unescapedChar;
						}
						break;
					case "x":
						const unescaped = this.scanHexEscape(ch);
						if (unescaped === null) notEscapeSequenceHead = "x";
						else cooked += unescaped;
						break;
					case "b":
						cooked += "\b";
						break;
					case "f":
						cooked += "\f";
						break;
					case "v":
						cooked += "\v";
						break;
					default: if (ch === "0") {
						if (Character.isDecimalDigit(this.source.charCodeAt(this.index))) notEscapeSequenceHead = "0";
						else cooked += "\0";
					} else if (Character.isDecimalDigitChar(ch)) notEscapeSequenceHead = ch;
					else cooked += ch;
				}
				else {
					++this.lineNumber;
					if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
					this.lineStart = this.index;
				}
			} else if (Character.isLineTerminator(ch.charCodeAt(0))) {
				++this.lineNumber;
				if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
				this.lineStart = this.index;
				cooked += "\n";
			} else cooked += ch;
		}
		if (!terminated) this.throwUnexpectedToken();
		if (!head) this.curlyStack.pop();
		return {
			type: 10,
			value: this.source.slice(start + 1, this.index - rawOffset),
			cooked: notEscapeSequenceHead === null ? cooked : null,
			head,
			tail,
			notEscapeSequenceHead,
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	testRegExp(pattern, flags) {
		const astralSubstitute = "￿";
		let tmp = pattern;
		if (flags.indexOf("u") >= 0) tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, ($0, $1, $2) => {
			const codePoint = parseInt($1 || $2, 16);
			if (codePoint > 1114111) this.throwUnexpectedToken(Messages.InvalidRegExp);
			if (codePoint <= 65535) return String.fromCharCode(codePoint);
			return astralSubstitute;
		}).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute);
		try {
			RegExp(tmp);
		} catch (e) {
			this.throwUnexpectedToken(Messages.InvalidRegExp);
		}
		try {
			return new RegExp(pattern, flags);
		} catch (exception) {
			/* istanbul ignore next */
			return null;
		}
	}
	scanRegExpBody() {
		let ch = this.source[this.index];
		assert(ch === "/", "Regular expression literal must start with a slash");
		let str = this.source[this.index++];
		let classMarker = false;
		let terminated = false;
		while (!this.eof()) {
			ch = this.source[this.index++];
			str += ch;
			if (ch === "\\") {
				ch = this.source[this.index++];
				if (Character.isLineTerminator(ch.charCodeAt(0))) this.throwUnexpectedToken(Messages.UnterminatedRegExp);
				str += ch;
			} else if (Character.isLineTerminator(ch.charCodeAt(0))) this.throwUnexpectedToken(Messages.UnterminatedRegExp);
			else if (classMarker) {
				if (ch === "]") classMarker = false;
			} else if (ch === "/") {
				terminated = true;
				break;
			} else if (ch === "[") classMarker = true;
		}
		if (!terminated) this.throwUnexpectedToken(Messages.UnterminatedRegExp);
		return str.substr(1, str.length - 2);
	}
	scanRegExpFlags() {
		let str = "";
		let flags = "";
		while (!this.eof()) {
			let ch = this.source[this.index];
			if (!Character.isIdentifierPart(ch.charCodeAt(0))) break;
			++this.index;
			if (ch === "\\" && !this.eof()) {
				ch = this.source[this.index];
				if (ch === "u") {
					++this.index;
					let restore = this.index;
					const char = this.scanHexEscape("u");
					if (char !== null) {
						flags += char;
						for (str += "\\u"; restore < this.index; ++restore) str += this.source[restore];
					} else {
						this.index = restore;
						flags += "u";
						str += "\\u";
					}
					this.tolerateUnexpectedToken();
				} else {
					str += "\\";
					this.tolerateUnexpectedToken();
				}
			} else {
				flags += ch;
				str += ch;
			}
		}
		return flags;
	}
	scanRegExp() {
		const start = this.index;
		const pattern = this.scanRegExpBody();
		const flags = this.scanRegExpFlags();
		return {
			type: 9,
			value: "",
			pattern,
			flags,
			regex: this.testRegExp(pattern, flags),
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start,
			end: this.index
		};
	}
	lex() {
		if (this.eof()) return {
			type: 2,
			value: "",
			lineNumber: this.lineNumber,
			lineStart: this.lineStart,
			start: this.index,
			end: this.index
		};
		const cp = this.source.charCodeAt(this.index);
		if (Character.isIdentifierStart(cp)) return this.scanIdentifier();
		if (cp === 40 || cp === 41 || cp === 59) return this.scanPunctuator();
		if (cp === 39 || cp === 34) return this.scanStringLiteral();
		if (cp === 46) {
			if (Character.isDecimalDigit(this.source.charCodeAt(this.index + 1))) return this.scanNumericLiteral();
			return this.scanPunctuator();
		}
		if (Character.isDecimalDigit(cp)) return this.scanNumericLiteral();
		if (cp === 96 || cp === 125 && this.curlyStack[this.curlyStack.length - 1] === "${") return this.scanTemplate();
		if (cp >= 55296 && cp < 57343) {
			if (Character.isIdentifierStart(this.codePointAt(this.index))) return this.scanIdentifier();
		}
		return this.scanPunctuator();
	}
};
const TokenName = {};
TokenName[1] = "Boolean";
TokenName[2] = "<end>";
TokenName[3] = "Identifier";
TokenName[4] = "Keyword";
TokenName[5] = "Null";
TokenName[6] = "Numeric";
TokenName[7] = "Punctuator";
TokenName[8] = "String";
TokenName[9] = "RegularExpression";
TokenName[10] = "Template";
const ArrowParameterPlaceHolder = "ArrowParameterPlaceHolder";
var Parser = class {
	constructor(code, options = {}, delegate) {
		this.config = {
			range: typeof options.range === "boolean" && options.range,
			loc: typeof options.loc === "boolean" && options.loc,
			source: null,
			tokens: typeof options.tokens === "boolean" && options.tokens,
			comment: typeof options.comment === "boolean" && options.comment,
			tolerant: typeof options.tolerant === "boolean" && options.tolerant
		};
		if (this.config.loc && options.source && options.source !== null) this.config.source = String(options.source);
		this.delegate = delegate;
		this.errorHandler = new ErrorHandler();
		this.errorHandler.tolerant = this.config.tolerant == true;
		this.scanner = new Scanner(code, this.errorHandler);
		this.scanner.trackComment = this.config.comment == true;
		this.operatorPrecedence = {
			")": 0,
			";": 0,
			",": 0,
			"=": 0,
			"]": 0,
			"??": 5,
			"||": 6,
			"&&": 7,
			"|": 8,
			"^": 9,
			"&": 10,
			"==": 11,
			"!=": 11,
			"===": 11,
			"!==": 11,
			"<": 12,
			">": 12,
			"<=": 12,
			">=": 12,
			"<<": 13,
			">>": 13,
			">>>": 13,
			"+": 14,
			"-": 14,
			"*": 15,
			"/": 15,
			"%": 15
		};
		this.lookahead = {
			type: 2,
			value: "",
			lineNumber: this.scanner.lineNumber,
			lineStart: 0,
			start: 0,
			end: 0
		};
		this.hasLineTerminator = false;
		this.context = {
			isModule: false,
			isAsync: false,
			allowIn: true,
			allowStrictDirective: true,
			allowSuper: false,
			allowYield: true,
			firstCoverInitializedNameError: null,
			isAssignmentTarget: false,
			isBindingElement: false,
			inConstructor: false,
			inFunctionBody: false,
			inIteration: false,
			inSwitch: false,
			inClassConstructor: false,
			labelSet: {},
			strict: false,
			decorators: null
		};
		this.tokens = [];
		this.startMarker = {
			index: 0,
			line: this.scanner.lineNumber,
			column: 0
		};
		this.lastMarker = {
			index: 0,
			line: this.scanner.lineNumber,
			column: 0
		};
		this.nextToken();
		this.lastMarker = {
			index: this.scanner.index,
			line: this.scanner.lineNumber,
			column: this.scanner.index - this.scanner.lineStart
		};
	}
	throwError(messageFormat, ...values) {
		const args = values.slice();
		const msg = messageFormat.replace(/%(\d)/g, (whole, idx) => {
			assert(idx < args.length, "Message reference must be in range");
			return args[idx];
		});
		const index = this.lastMarker.index;
		const line = this.lastMarker.line;
		const column = this.lastMarker.column + 1;
		throw this.errorHandler.createError(index, line, column, msg);
	}
	tolerateError(messageFormat, ...values) {
		const args = values.slice();
		const msg = messageFormat.replace(/%(\d)/g, (whole, idx) => {
			assert(idx < args.length, "Message reference must be in range");
			return args[idx];
		});
		const index = this.lastMarker.index;
		const line = this.scanner.lineNumber;
		const column = this.lastMarker.column + 1;
		this.errorHandler.tolerateError(index, line, column, msg);
	}
	unexpectedTokenError(token, message) {
		let msg = message || Messages.UnexpectedToken;
		let value;
		if (token) {
			if (!message) {
				msg = token.type === 2 ? Messages.UnexpectedEOS : token.type === 3 ? Messages.UnexpectedIdentifier : token.type === 6 ? Messages.UnexpectedNumber : token.type === 8 ? Messages.UnexpectedString : token.type === 10 ? Messages.UnexpectedTemplate : Messages.UnexpectedToken;
				if (token.type === 4) {
					if (this.scanner.isFutureReservedWord(token.value)) msg = Messages.UnexpectedReserved;
					else if (this.context.strict && this.scanner.isStrictModeReservedWord(token.value)) msg = Messages.StrictReservedWord;
				}
			}
			value = token.value;
		} else value = "ILLEGAL";
		msg = msg.replace("%0", value);
		if (token && typeof token.lineNumber === "number") {
			const index = token.start;
			const line = token.lineNumber;
			const lastMarkerLineStart = this.lastMarker.index - this.lastMarker.column;
			const column = token.start - lastMarkerLineStart + 1;
			return this.errorHandler.createError(index, line, column, msg);
		} else {
			const index = this.lastMarker.index;
			const line = this.lastMarker.line;
			const column = this.lastMarker.column + 1;
			return this.errorHandler.createError(index, line, column, msg);
		}
	}
	throwUnexpectedToken(token, message) {
		throw this.unexpectedTokenError(token, message);
	}
	tolerateUnexpectedToken(token, message) {
		this.errorHandler.tolerate(this.unexpectedTokenError(token, message));
	}
	tolerateInvalidLoopStatement() {
		if (this.matchKeyword("class") || this.matchKeyword("function")) this.tolerateError(Messages.UnexpectedToken, this.lookahead);
	}
	collectComments() {
		if (!this.config.comment) this.scanner.scanComments();
		else {
			const comments = this.scanner.scanComments();
			if (comments.length > 0 && this.delegate) for (let i = 0; i < comments.length; ++i) {
				const e = comments[i];
				const node = {
					type: e.multiLine ? "BlockComment" : "LineComment",
					value: this.scanner.source.slice(e.slice[0], e.slice[1])
				};
				if (this.config.range) node.range = e.range;
				if (this.config.loc) node.loc = e.loc;
				const metadata = {
					start: {
						line: e.loc.start.line,
						column: e.loc.start.column,
						offset: e.range[0]
					},
					end: {
						line: e.loc.end.line,
						column: e.loc.end.column,
						offset: e.range[1]
					}
				};
				this.delegate(node, metadata);
			}
		}
	}
	getTokenRaw(token) {
		return this.scanner.source.slice(token.start, token.end);
	}
	convertToken(token) {
		const t = {
			type: TokenName[token.type],
			value: this.getTokenRaw(token)
		};
		if (this.config.range) t.range = [token.start, token.end];
		if (this.config.loc) t.loc = {
			start: {
				line: this.startMarker.line,
				column: this.startMarker.column
			},
			end: {
				line: this.scanner.lineNumber,
				column: this.scanner.index - this.scanner.lineStart
			}
		};
		if (token.type === 9) t.regex = {
			pattern: token.pattern,
			flags: token.flags
		};
		return t;
	}
	nextToken() {
		const token = this.lookahead;
		this.lastMarker.index = this.scanner.index;
		this.lastMarker.line = this.scanner.lineNumber;
		this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
		this.collectComments();
		if (this.scanner.index !== this.startMarker.index) {
			this.startMarker.index = this.scanner.index;
			this.startMarker.line = this.scanner.lineNumber;
			this.startMarker.column = this.scanner.index - this.scanner.lineStart;
		}
		const next = this.scanner.lex();
		this.hasLineTerminator = token.lineNumber !== next.lineNumber;
		if (next && this.context.strict && next.type === 3) {
			if (this.scanner.isStrictModeReservedWord(next.value)) next.type = 4;
		}
		this.lookahead = next;
		if (this.config.tokens && next.type !== 2) this.tokens.push(this.convertToken(next));
		return token;
	}
	nextRegexToken() {
		this.collectComments();
		const token = this.scanner.scanRegExp();
		if (this.config.tokens) {
			this.tokens.pop();
			this.tokens.push(this.convertToken(token));
		}
		this.lookahead = token;
		this.nextToken();
		return token;
	}
	createNode() {
		return {
			index: this.startMarker.index,
			line: this.startMarker.line,
			column: this.startMarker.column
		};
	}
	startNode(token, lastLineStart = 0) {
		let column = token.start - token.lineStart;
		let line = token.lineNumber;
		if (column < 0) {
			column += lastLineStart;
			line--;
		}
		return {
			index: token.start,
			line,
			column
		};
	}
	finalize(marker, node) {
		if (this.config.range) node.range = [marker.index, this.lastMarker.index];
		if (this.config.loc) {
			node.loc = {
				start: {
					line: marker.line,
					column: marker.column
				},
				end: {
					line: this.lastMarker.line,
					column: this.lastMarker.column
				}
			};
			if (this.config.source) node.loc.source = this.config.source;
		}
		if (this.delegate) {
			const metadata = {
				start: {
					line: marker.line,
					column: marker.column,
					offset: marker.index
				},
				end: {
					line: this.lastMarker.line,
					column: this.lastMarker.column,
					offset: this.lastMarker.index
				}
			};
			this.delegate(node, metadata);
		}
		return node;
	}
	expect(value) {
		const token = this.nextToken();
		if (token.type !== 7 || token.value !== value) this.throwUnexpectedToken(token);
	}
	expectCommaSeparator() {
		if (this.config.tolerant) {
			const token = this.lookahead;
			if (token.type === 7 && token.value === ",") this.nextToken();
			else if (token.type === 7 && token.value === ";") {
				this.nextToken();
				this.tolerateUnexpectedToken(token);
			} else this.tolerateUnexpectedToken(token, Messages.UnexpectedToken);
		} else this.expect(",");
	}
	expectKeyword(keyword) {
		const token = this.nextToken();
		if (token.type !== 4 || token.value !== keyword) this.throwUnexpectedToken(token);
	}
	match(value) {
		return this.lookahead.type === 7 && this.lookahead.value === value;
	}
	matchKeyword(keyword) {
		return this.lookahead.type === 4 && this.lookahead.value === keyword;
	}
	matchContextualKeyword(keyword) {
		return this.lookahead.type === 3 && this.lookahead.value === keyword;
	}
	matchAssign() {
		if (this.lookahead.type !== 7) return false;
		const op = this.lookahead.value;
		return op === "=" || op === "*=" || op === "**=" || op === "/=" || op === "%=" || op === "+=" || op === "-=" || op === "<<=" || op === ">>=" || op === ">>>=" || op === "&=" || op === "^=" || op === "|=" || op === "&&=" || op === "||=" || op === "??=";
	}
	isolateCoverGrammar(parseFunction) {
		const previousIsBindingElement = this.context.isBindingElement;
		const previousIsAssignmentTarget = this.context.isAssignmentTarget;
		const previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
		this.context.isBindingElement = true;
		this.context.isAssignmentTarget = true;
		this.context.firstCoverInitializedNameError = null;
		const result = parseFunction.call(this);
		if (this.context.firstCoverInitializedNameError !== null) this.throwUnexpectedToken(this.context.firstCoverInitializedNameError);
		this.context.isBindingElement = previousIsBindingElement;
		this.context.isAssignmentTarget = previousIsAssignmentTarget;
		this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError;
		return result;
	}
	inheritCoverGrammar(parseFunction) {
		const previousIsBindingElement = this.context.isBindingElement;
		const previousIsAssignmentTarget = this.context.isAssignmentTarget;
		const previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
		this.context.isBindingElement = true;
		this.context.isAssignmentTarget = true;
		this.context.firstCoverInitializedNameError = null;
		const result = parseFunction.call(this);
		this.context.isBindingElement = this.context.isBindingElement && previousIsBindingElement;
		this.context.isAssignmentTarget = this.context.isAssignmentTarget && previousIsAssignmentTarget;
		this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError || this.context.firstCoverInitializedNameError;
		return result;
	}
	consumeSemicolon() {
		if (this.match(";")) this.nextToken();
		else if (!this.hasLineTerminator) {
			if (this.lookahead.type !== 2 && !this.match("}")) this.throwUnexpectedToken(this.lookahead);
			this.lastMarker.index = this.startMarker.index;
			this.lastMarker.line = this.startMarker.line;
			this.lastMarker.column = this.startMarker.column;
		}
	}
	parsePrimaryExpression() {
		const node = this.createNode();
		let expr;
		let token, raw;
		switch (this.lookahead.type) {
			case 3:
				if ((this.context.isModule || this.context.isAsync) && this.lookahead.value === "await") this.tolerateUnexpectedToken(this.lookahead);
				expr = this.matchAsyncFunction() ? this.parseFunctionExpression() : this.finalize(node, new Identifier(this.nextToken().value));
				break;
			case 6:
			case 8:
				if (this.context.strict && this.lookahead.octal) this.tolerateUnexpectedToken(this.lookahead, Messages.StrictOctalLiteral);
				this.context.isAssignmentTarget = false;
				this.context.isBindingElement = false;
				token = this.nextToken();
				raw = this.getTokenRaw(token);
				if (typeof token.value === "bigint") expr = this.finalize(node, new BigIntLiteral(token.value, raw, token.value.toString()));
				else expr = this.finalize(node, new Literal(token.value, raw));
				break;
			case 1:
				this.context.isAssignmentTarget = false;
				this.context.isBindingElement = false;
				token = this.nextToken();
				raw = this.getTokenRaw(token);
				expr = this.finalize(node, new Literal(token.value === "true", raw));
				break;
			case 5:
				this.context.isAssignmentTarget = false;
				this.context.isBindingElement = false;
				token = this.nextToken();
				raw = this.getTokenRaw(token);
				expr = this.finalize(node, new Literal(null, raw));
				break;
			case 10:
				expr = this.parseTemplateLiteral({ isTagged: false });
				break;
			case 7:
				switch (this.lookahead.value) {
					case "(":
						this.context.isBindingElement = false;
						expr = this.inheritCoverGrammar(this.parseGroupExpression);
						break;
					case "[":
						expr = this.inheritCoverGrammar(this.parseArrayInitializer);
						break;
					case "{":
						expr = this.inheritCoverGrammar(this.parseObjectInitializer);
						break;
					case "/":
					case "/=":
						this.context.isAssignmentTarget = false;
						this.context.isBindingElement = false;
						this.scanner.index = this.startMarker.index;
						token = this.nextRegexToken();
						raw = this.getTokenRaw(token);
						expr = this.finalize(node, new RegexLiteral(token.regex, raw, token.pattern, token.flags));
						break;
					case "#":
						this.nextToken();
						expr = this.finalize(node, new PrivateIdentifier(this.nextToken().value));
						break;
					case "@":
						let decorators = this.parseDecorators();
						this.context.decorators = decorators;
						this.parsePrimaryExpression();
						this.context.decorators = null;
						expr = this.finalize(node, new PrivateIdentifier(this.nextToken().value));
						break;
					default: expr = this.throwUnexpectedToken(this.nextToken());
				}
				break;
			case 4:
				if (!this.context.strict && this.context.allowYield && this.matchKeyword("yield")) expr = this.parseIdentifierName();
				else if (!this.context.strict && this.matchKeyword("let")) expr = this.finalize(node, new Identifier(this.nextToken().value));
				else {
					this.context.isAssignmentTarget = false;
					this.context.isBindingElement = false;
					if (this.matchKeyword("function")) expr = this.parseFunctionExpression();
					else if (this.matchKeyword("this")) {
						this.nextToken();
						expr = this.finalize(node, new ThisExpression());
					} else if (this.matchKeyword("class")) expr = this.parseClassExpression();
					else if (this.matchKeyword("new")) expr = this.parseNewExpression();
					else if (this.matchImportCall()) expr = this.parseImportCall();
					else if (this.matchImportMeta()) {
						if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, Messages.CannotUseImportMetaOutsideAModule);
						expr = this.parseImportMeta();
					} else expr = this.throwUnexpectedToken(this.nextToken());
				}
				break;
			default: expr = this.throwUnexpectedToken(this.nextToken());
		}
		return expr;
	}
	parseSpreadElement() {
		const node = this.createNode();
		this.expect("...");
		const arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
		return this.finalize(node, new SpreadElement(arg));
	}
	parseArrayInitializer() {
		const node = this.createNode();
		const elements = [];
		this.expect("[");
		while (!this.match("]")) if (this.match(",")) {
			this.nextToken();
			elements.push(null);
		} else if (this.match("...")) {
			const element = this.parseSpreadElement();
			if (!this.match("]")) {
				this.context.isAssignmentTarget = false;
				this.context.isBindingElement = false;
				this.expect(",");
			}
			elements.push(element);
		} else {
			elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
			if (!this.match("]")) this.expect(",");
		}
		this.expect("]");
		return this.finalize(node, new ArrayExpression(elements));
	}
	parsePropertyMethod(params) {
		this.context.isAssignmentTarget = false;
		this.context.isBindingElement = false;
		const previousStrict = this.context.strict;
		const previousAllowStrictDirective = this.context.allowStrictDirective;
		this.context.allowStrictDirective = params.simple;
		const body = this.isolateCoverGrammar(this.parseFunctionSourceElements);
		if (this.context.strict && params.firstRestricted) this.tolerateUnexpectedToken(params.firstRestricted, params.message);
		if (this.context.strict && params.stricted) this.tolerateUnexpectedToken(params.stricted, params.message);
		this.context.strict = previousStrict;
		this.context.allowStrictDirective = previousAllowStrictDirective;
		return body;
	}
	parsePropertyMethodFunction(isGenerator) {
		const node = this.createNode();
		const previousAllowYield = this.context.allowYield;
		this.context.allowYield = true;
		const params = this.parseFormalParameters();
		const method = this.parsePropertyMethod(params);
		this.context.allowYield = previousAllowYield;
		return this.finalize(node, new FunctionExpression(null, params.params, method, isGenerator, false));
	}
	parsePropertyMethodAsyncFunction(isGenerator) {
		const node = this.createNode();
		const previousAllowYield = this.context.allowYield;
		const previousIsAsync = this.context.isAsync;
		this.context.allowYield = false;
		this.context.isAsync = true;
		const params = this.parseFormalParameters();
		const method = this.parsePropertyMethod(params);
		this.context.allowYield = previousAllowYield;
		this.context.isAsync = previousIsAsync;
		return this.finalize(node, new FunctionExpression(null, params.params, method, isGenerator, true));
	}
	parseObjectPropertyKey(isPrivate = false) {
		const node = this.createNode();
		const token = this.nextToken();
		let key;
		switch (token.type) {
			case 8:
			case 6:
				if (this.context.strict && token.octal) this.tolerateUnexpectedToken(token, Messages.StrictOctalLiteral);
				const raw = this.getTokenRaw(token);
				if (typeof token.value === "bigint") key = this.finalize(node, new BigIntLiteral(token.value, raw, token.value.toString()));
				else key = this.finalize(node, new Literal(token.value, raw));
				break;
			case 3:
			case 1:
			case 5:
			case 4:
				key = this.finalize(node, isPrivate ? new PrivateIdentifier(token.value) : new Identifier(token.value));
				break;
			case 7:
				if (token.value === "[") {
					key = this.isolateCoverGrammar(this.parseAssignmentExpression);
					this.expect("]");
				} else key = this.throwUnexpectedToken(token);
				break;
			default: key = this.throwUnexpectedToken(token);
		}
		return key;
	}
	isPropertyKey(key, value) {
		return key.type === Syntax.Identifier && key.name === value || key.type === Syntax.Literal && key.value === value;
	}
	parseObjectProperty(hasProto) {
		const node = this.createNode();
		const token = this.lookahead;
		let kind;
		let key = null;
		let value = null;
		let computed = false;
		let method = false;
		let shorthand = false;
		let isAsync = false;
		let isGenerator = false;
		if (token.type === 3) {
			const id = token.value;
			this.nextToken();
			computed = this.match("[");
			isAsync = !this.hasLineTerminator && id === "async" && !this.match(":") && !this.match("(") && !this.match(",");
			isGenerator = this.match("*");
			if (isGenerator) this.nextToken();
			key = isAsync ? this.parseObjectPropertyKey() : this.finalize(node, new Identifier(id));
		} else if (this.match("*")) this.nextToken();
		else {
			computed = this.match("[");
			key = this.parseObjectPropertyKey();
		}
		const lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
		if (token.type === 3 && !isAsync && token.value === "get" && lookaheadPropertyKey) {
			kind = "get";
			computed = this.match("[");
			key = this.parseObjectPropertyKey();
			this.context.allowYield = false;
			value = this.parseGetterMethod();
		} else if (token.type === 3 && !isAsync && token.value === "set" && lookaheadPropertyKey) {
			kind = "set";
			computed = this.match("[");
			key = this.parseObjectPropertyKey();
			value = this.parseSetterMethod();
		} else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey) {
			kind = "init";
			computed = this.match("[");
			key = this.parseObjectPropertyKey();
			value = this.parseGeneratorMethod(false);
			method = true;
		} else {
			if (!key) this.throwUnexpectedToken(this.lookahead);
			kind = "init";
			if (this.match(":") && !isAsync) {
				if (!computed && this.isPropertyKey(key, "__proto__")) {
					if (hasProto.value) this.tolerateError(Messages.DuplicateProtoProperty);
					hasProto.value = true;
				}
				this.nextToken();
				value = this.inheritCoverGrammar(this.parseAssignmentExpression);
			} else if (this.match("(")) {
				value = isAsync ? this.parsePropertyMethodAsyncFunction(isGenerator) : this.parsePropertyMethodFunction(isGenerator);
				method = true;
			} else if (token.type === 3) {
				const id = this.finalize(node, new Identifier(token.value));
				if (this.match("=")) {
					this.context.firstCoverInitializedNameError = this.lookahead;
					this.nextToken();
					shorthand = true;
					const init = this.isolateCoverGrammar(this.parseAssignmentExpression);
					value = this.finalize(node, new AssignmentPattern(id, init));
				} else {
					shorthand = true;
					value = id;
				}
			} else this.throwUnexpectedToken(this.nextToken());
		}
		return this.finalize(node, new Property(kind, key, computed, value, method, shorthand));
	}
	parseObjectInitializer() {
		const node = this.createNode();
		this.expect("{");
		const properties = [];
		const hasProto = { value: false };
		while (!this.match("}")) {
			const property = this.match("...") ? this.parseSpreadElement() : this.parseObjectProperty(hasProto);
			properties.push(property);
			if (!this.match("}") && (!property.method || this.match(","))) this.expectCommaSeparator();
		}
		this.expect("}");
		return this.finalize(node, new ObjectExpression(properties));
	}
	throwTemplateLiteralEarlyErrors(token) {
		switch (token.notEscapeSequenceHead) {
			case "u": return this.throwUnexpectedToken(token, Messages.InvalidUnicodeEscapeSequence);
			case "x": return this.throwUnexpectedToken(token, Messages.InvalidHexEscapeSequence);
			case "8":
			case "9": return this.throwUnexpectedToken(token, Messages.TemplateEscape89);
			default: return this.throwUnexpectedToken(token, Messages.TemplateOctalLiteral);
		}
	}
	parseTemplateHead(options) {
		assert(this.lookahead.head, "Template literal must start with a template head");
		const node = this.createNode();
		const token = this.nextToken();
		if (!options.isTagged && token.notEscapeSequenceHead !== null) this.throwTemplateLiteralEarlyErrors(token);
		const raw = token.value;
		const cooked = token.cooked;
		return this.finalize(node, new TemplateElement({
			raw,
			cooked
		}, token.tail));
	}
	parseTemplateElement(options) {
		if (this.lookahead.type !== 10) this.throwUnexpectedToken();
		const node = this.createNode();
		const token = this.nextToken();
		if (!options.isTagged && token.notEscapeSequenceHead !== null) this.throwTemplateLiteralEarlyErrors(token);
		const raw = token.value;
		const cooked = token.cooked;
		return this.finalize(node, new TemplateElement({
			raw,
			cooked
		}, token.tail));
	}
	parseTemplateLiteral(options) {
		const node = this.createNode();
		const expressions = [];
		const quasis = [];
		let quasi = this.parseTemplateHead(options);
		quasis.push(quasi);
		while (!quasi.tail) {
			expressions.push(this.parseExpression());
			quasi = this.parseTemplateElement(options);
			quasis.push(quasi);
		}
		return this.finalize(node, new TemplateLiteral(quasis, expressions));
	}
	reinterpretExpressionAsPattern(expr) {
		switch (expr.type) {
			case Syntax.Identifier:
			case Syntax.MemberExpression:
			case Syntax.RestElement:
			case Syntax.AssignmentPattern: break;
			case Syntax.SpreadElement:
				expr.type = Syntax.RestElement;
				this.reinterpretExpressionAsPattern(expr.argument);
				break;
			case Syntax.ArrayExpression:
				expr.type = Syntax.ArrayPattern;
				for (let i = 0; i < expr.elements.length; i++) if (expr.elements[i] !== null) this.reinterpretExpressionAsPattern(expr.elements[i]);
				break;
			case Syntax.ObjectExpression:
				expr.type = Syntax.ObjectPattern;
				for (let i = 0; i < expr.properties.length; i++) {
					const property = expr.properties[i];
					this.reinterpretExpressionAsPattern(property.type === Syntax.SpreadElement ? property : property.value);
				}
				break;
			case Syntax.AssignmentExpression:
				expr.type = Syntax.AssignmentPattern;
				delete expr.operator;
				this.reinterpretExpressionAsPattern(expr.left);
		}
	}
	parseGroupExpression() {
		let expr;
		this.expect("(");
		if (this.match(")")) {
			this.nextToken();
			if (!this.match("=>")) this.expect("=>");
			expr = {
				type: ArrowParameterPlaceHolder,
				params: [],
				async: false
			};
		} else {
			const startToken = this.lookahead;
			const params = [];
			if (this.match("...")) {
				expr = this.parseRestElement(params);
				this.expect(")");
				if (!this.match("=>")) this.expect("=>");
				expr = {
					type: ArrowParameterPlaceHolder,
					params: [expr],
					async: false
				};
			} else {
				let arrow = false;
				this.context.isBindingElement = true;
				expr = this.inheritCoverGrammar(this.parseAssignmentExpression);
				if (this.match(",")) {
					const expressions = [];
					this.context.isAssignmentTarget = false;
					expressions.push(expr);
					while (this.lookahead.type !== 2) {
						if (!this.match(",")) break;
						this.nextToken();
						if (this.match(")")) {
							this.nextToken();
							for (let i = 0; i < expressions.length; i++) this.reinterpretExpressionAsPattern(expressions[i]);
							arrow = true;
							expr = {
								type: ArrowParameterPlaceHolder,
								params: expressions,
								async: false
							};
						} else if (this.match("...")) {
							if (!this.context.isBindingElement) this.throwUnexpectedToken(this.lookahead);
							expressions.push(this.parseRestElement(params));
							this.expect(")");
							if (!this.match("=>")) this.expect("=>");
							this.context.isBindingElement = false;
							for (let i = 0; i < expressions.length; i++) this.reinterpretExpressionAsPattern(expressions[i]);
							arrow = true;
							expr = {
								type: ArrowParameterPlaceHolder,
								params: expressions,
								async: false
							};
						} else expressions.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
						if (arrow) break;
					}
					if (!arrow) expr = this.finalize(this.startNode(startToken), new SequenceExpression(expressions));
				}
				if (!arrow) {
					this.expect(")");
					if (this.match("=>")) {
						if (expr.type === Syntax.Identifier && expr.name === "yield") {
							arrow = true;
							expr = {
								type: ArrowParameterPlaceHolder,
								params: [expr],
								async: false
							};
						}
						if (!arrow) {
							if (!this.context.isBindingElement) this.throwUnexpectedToken(this.lookahead);
							if (expr.type === Syntax.SequenceExpression) for (let i = 0; i < expr.expressions.length; i++) this.reinterpretExpressionAsPattern(expr.expressions[i]);
							else this.reinterpretExpressionAsPattern(expr);
							const parameters = expr.type === Syntax.SequenceExpression ? expr.expressions : [expr];
							expr = {
								type: ArrowParameterPlaceHolder,
								params: parameters,
								async: false
							};
						}
					}
					this.context.isBindingElement = false;
				}
			}
		}
		return expr;
	}
	parseArguments() {
		this.expect("(");
		const args = [];
		if (!this.match(")")) while (true) {
			const expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAssignmentExpression);
			args.push(expr);
			if (this.match(")")) break;
			this.expectCommaSeparator();
			if (this.match(")")) break;
		}
		this.expect(")");
		return args;
	}
	isIdentifierName(token) {
		return token.type === 3 || token.type === 4 || token.type === 1 || token.type === 5;
	}
	parseIdentifierName(allowPrivateField = false) {
		let isPrivateField = false;
		let node = this.createNode();
		let token = this.nextToken();
		if (token.value === "#" && allowPrivateField) {
			token = this.nextToken();
			isPrivateField = true;
		}
		if (!this.isIdentifierName(token)) this.throwUnexpectedToken(token);
		return this.finalize(node, isPrivateField ? new PrivateIdentifier(token.value) : new Identifier(token.value));
	}
	parseNewExpression() {
		const node = this.createNode();
		const id = this.parseIdentifierName();
		assert(id.name === "new", "New expression must start with `new`");
		let expr;
		if (this.match(".")) {
			this.nextToken();
			if (this.lookahead.type === 3 && this.context.inFunctionBody && this.lookahead.value === "target") expr = new MetaProperty(id, this.parseIdentifierName());
			else this.throwUnexpectedToken(this.lookahead);
		} else if (this.matchKeyword("import")) this.throwUnexpectedToken(this.lookahead);
		else {
			expr = new NewExpression(this.isolateCoverGrammar(this.parseLeftHandSideExpression), this.match("(") ? this.parseArguments() : []);
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
		}
		return this.finalize(node, expr);
	}
	parseAsyncArgument() {
		const arg = this.parseAssignmentExpression();
		this.context.firstCoverInitializedNameError = null;
		return arg;
	}
	parseAsyncArguments() {
		this.expect("(");
		const args = [];
		if (!this.match(")")) while (true) {
			const expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAsyncArgument);
			args.push(expr);
			if (this.match(")")) break;
			this.expectCommaSeparator();
			if (this.match(")")) break;
		}
		this.expect(")");
		return args;
	}
	matchImportCall() {
		let match = this.matchKeyword("import");
		if (match) {
			const state = this.scanner.saveState();
			this.scanner.scanComments();
			const next = this.scanner.lex();
			this.scanner.restoreState(state);
			match = next.type === 7 && next.value === "(";
		}
		return match;
	}
	parseImportCall() {
		const node = this.createNode();
		this.expectKeyword("import");
		this.expect("(");
		const source = this.parseAssignmentExpression();
		let attributes = null;
		if (this.match(",")) {
			this.nextToken();
			attributes = this.parseObjectInitializer();
		}
		if (!this.match(")") && this.config.tolerant) this.tolerateUnexpectedToken(this.nextToken());
		else {
			this.expect(")");
			if (this.match(";")) this.nextToken();
		}
		return this.finalize(node, new ImportExpression(source, attributes));
	}
	matchImportMeta() {
		let match = this.matchKeyword("import");
		if (match) {
			const state = this.scanner.saveState();
			this.scanner.scanComments();
			const dot = this.scanner.lex();
			if (dot.type === 7 && dot.value === ".") {
				this.scanner.scanComments();
				const meta = this.scanner.lex();
				match = meta.type === 3 && meta.value === "meta";
				if (match) {
					if (meta.end - meta.start !== 4) this.tolerateUnexpectedToken(meta, Messages.InvalidEscapedReservedWord);
				}
			} else match = false;
			this.scanner.restoreState(state);
		}
		return match;
	}
	parseImportMeta() {
		const node = this.createNode();
		const id = this.parseIdentifierName();
		this.expect(".");
		const property = this.parseIdentifierName();
		this.context.isAssignmentTarget = false;
		return this.finalize(node, new MetaProperty(id, property));
	}
	parseLeftHandSideExpressionAllowCall() {
		const startToken = this.lookahead;
		const maybeAsync = this.matchContextualKeyword("async");
		const previousAllowIn = this.context.allowIn;
		this.context.allowIn = true;
		let expr;
		const isSuper = this.matchKeyword("super");
		if (isSuper && this.context.inFunctionBody) {
			expr = this.createNode();
			this.nextToken();
			expr = this.finalize(expr, new Super());
			if (!this.match("(") && !this.match(".") && !this.match("[")) this.throwUnexpectedToken(this.lookahead);
		} else expr = this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression);
		if (isSuper && this.match("(") && (!this.context.inClassConstructor || !this.context.allowSuper)) this.tolerateError(Messages.UnexpectedSuper);
		let hasOptional = false;
		while (true) {
			let optional = false;
			if (this.match("?.")) {
				optional = true;
				hasOptional = true;
				this.expect("?.");
			}
			if (this.match("(")) {
				const asyncArrow = maybeAsync && startToken.lineNumber === this.lookahead.lineNumber;
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = false;
				const args = asyncArrow ? this.parseAsyncArguments() : this.parseArguments();
				if (expr.type === Syntax.ImportExpression && args.length !== 1) this.tolerateError(Messages.BadImportCallArity);
				expr = this.finalize(this.startNode(startToken), new CallExpression(expr, args, optional));
				if (asyncArrow && this.match("=>")) {
					for (let i = 0; i < args.length; ++i) this.reinterpretExpressionAsPattern(args[i]);
					expr = {
						type: ArrowParameterPlaceHolder,
						params: args,
						async: true
					};
				}
			} else if (this.match("[")) {
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = !optional;
				this.expect("[");
				const property = this.isolateCoverGrammar(this.parseExpression);
				this.expect("]");
				expr = this.finalize(this.startNode(startToken), new MemberExpression(true, expr, property, optional));
			} else if (this.lookahead.type === 10 && this.lookahead.head) {
				if (optional) this.throwUnexpectedToken(this.lookahead);
				if (hasOptional) this.throwError(Messages.InvalidTaggedTemplateOnOptionalChain);
				const quasi = this.parseTemplateLiteral({ isTagged: true });
				expr = this.finalize(this.startNode(startToken), new TaggedTemplateExpression(expr, quasi));
			} else if (this.match(".") || optional) {
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = !optional;
				if (!optional) this.expect(".");
				const property = this.parseIdentifierName(true);
				expr = this.finalize(this.startNode(startToken), new MemberExpression(false, expr, property, optional));
			} else break;
		}
		this.context.allowIn = previousAllowIn;
		if (hasOptional) return new ChainExpression(expr);
		return expr;
	}
	parseSuper() {
		const node = this.createNode();
		this.expectKeyword("super");
		if (!this.match("[") && !this.match(".")) this.throwUnexpectedToken(this.lookahead);
		return this.finalize(node, new Super());
	}
	parseLeftHandSideExpression() {
		assert(this.context.allowIn, "callee of new expression always allow in keyword.");
		const node = this.startNode(this.lookahead);
		let expr = this.matchKeyword("super") && this.context.inFunctionBody ? this.parseSuper() : this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression);
		let hasOptional = false;
		while (true) {
			let optional = false;
			if (this.match("?.")) {
				optional = true;
				hasOptional = true;
				this.expect("?.");
			}
			if (this.match("[")) {
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = !optional;
				this.expect("[");
				const property = this.isolateCoverGrammar(this.parseExpression);
				this.expect("]");
				expr = this.finalize(node, new MemberExpression(true, expr, property, optional));
			} else if (this.lookahead.type === 10 && this.lookahead.head) {
				if (optional) this.throwUnexpectedToken(this.lookahead);
				if (hasOptional) this.throwError(Messages.InvalidTaggedTemplateOnOptionalChain);
				const quasi = this.parseTemplateLiteral({ isTagged: true });
				expr = this.finalize(node, new TaggedTemplateExpression(expr, quasi));
			} else if (this.match(".") || optional) {
				this.context.isBindingElement = false;
				this.context.isAssignmentTarget = !optional;
				if (!optional) this.expect(".");
				const property = this.parseIdentifierName();
				expr = this.finalize(node, new MemberExpression(false, expr, property, optional));
			} else break;
		}
		if (hasOptional) return new ChainExpression(expr);
		return expr;
	}
	parseUpdateExpression() {
		let expr;
		const startToken = this.lookahead;
		if (this.match("++") || this.match("--")) {
			const node = this.startNode(startToken);
			const token = this.nextToken();
			expr = this.inheritCoverGrammar(this.parseUnaryExpression);
			if (this.context.strict && expr.type === Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) this.tolerateError(Messages.StrictLHSPrefix);
			if (!this.context.isAssignmentTarget) this.tolerateError(Messages.InvalidLHSInAssignment);
			expr = this.finalize(node, new UpdateExpression(token.value, expr, true));
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
		} else {
			expr = this.inheritCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
			if (!this.hasLineTerminator && this.lookahead.type === 7) {
				if (this.match("++") || this.match("--")) {
					if (this.context.strict && expr.type === Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) this.tolerateError(Messages.StrictLHSPostfix);
					if (!this.context.isAssignmentTarget) this.tolerateError(Messages.InvalidLHSInAssignment);
					this.context.isAssignmentTarget = false;
					this.context.isBindingElement = false;
					const operator = this.nextToken().value;
					expr = this.finalize(this.startNode(startToken), new UpdateExpression(operator, expr, false));
				}
			}
		}
		return expr;
	}
	parseAwaitExpression() {
		const node = this.createNode();
		this.nextToken();
		const argument = this.parseUnaryExpression();
		return this.finalize(node, new AwaitExpression(argument));
	}
	parseUnaryExpression() {
		let expr;
		if (this.match("+") || this.match("-") || this.match("~") || this.match("!") || this.matchKeyword("delete") || this.matchKeyword("void") || this.matchKeyword("typeof")) {
			const node = this.startNode(this.lookahead);
			const token = this.nextToken();
			expr = this.inheritCoverGrammar(this.parseUnaryExpression);
			expr = this.finalize(node, new UnaryExpression(token.value, expr));
			if (this.context.strict && expr.operator === "delete" && expr.argument.type === Syntax.Identifier) this.tolerateError(Messages.StrictDelete);
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
		} else if ((this.context.isModule && !this.context.inFunctionBody || this.context.isAsync) && this.matchContextualKeyword("await")) expr = this.parseAwaitExpression();
		else expr = this.parseUpdateExpression();
		return expr;
	}
	parseExponentiationExpression() {
		const startToken = this.lookahead;
		const isLeftParenthesized = this.match("(");
		let expr = this.inheritCoverGrammar(this.parseUnaryExpression);
		if ((expr.type !== Syntax.UnaryExpression || isLeftParenthesized) && this.match("**")) {
			this.nextToken();
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
			const left = expr;
			const right = this.isolateCoverGrammar(this.parseExponentiationExpression);
			expr = this.finalize(this.startNode(startToken), new BinaryExpression("**", left, right));
		}
		return expr;
	}
	binaryPrecedence(token) {
		const op = token.value;
		let precedence;
		if (token.type === 7) precedence = this.operatorPrecedence[op] || 0;
		else if (token.type === 4) precedence = op === "instanceof" || this.context.allowIn && op === "in" ? 12 : 0;
		else precedence = 0;
		return precedence;
	}
	parseBinaryExpression() {
		const startToken = this.lookahead;
		let expr = this.inheritCoverGrammar(this.parseExponentiationExpression);
		let allowAndOr = true;
		let allowNullishCoalescing = true;
		const updateNullishCoalescingRestrictions = (token) => {
			if (token.value === "&&" || token.value === "||") allowNullishCoalescing = false;
			if (token.value === "??") allowAndOr = false;
		};
		const token = this.lookahead;
		let prec = this.binaryPrecedence(token);
		if (prec > 0) {
			updateNullishCoalescingRestrictions(token);
			this.nextToken();
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
			const markers = [startToken, this.lookahead];
			let left = expr;
			let right = this.isolateCoverGrammar(this.parseExponentiationExpression);
			const stack = [
				left,
				token.value,
				right
			];
			const precedences = [prec];
			while (true) {
				prec = this.binaryPrecedence(this.lookahead);
				if (prec <= 0) break;
				if (!allowAndOr && (this.lookahead.value === "&&" || this.lookahead.value === "||") || !allowNullishCoalescing && this.lookahead.value === "??") this.throwUnexpectedToken(this.lookahead);
				updateNullishCoalescingRestrictions(this.lookahead);
				while (stack.length > 2 && prec <= precedences[precedences.length - 1]) {
					right = stack.pop();
					const operator = stack.pop();
					precedences.pop();
					left = stack.pop();
					markers.pop();
					const marker = markers[markers.length - 1];
					const node = this.startNode(marker, marker.lineStart);
					const logical = operator === "||" || operator === "&&" || operator === "??";
					stack.push(this.finalize(node, logical ? new LogicalExpression(operator, left, right) : new BinaryExpression(operator, left, right)));
				}
				stack.push(this.nextToken().value);
				precedences.push(prec);
				markers.push(this.lookahead);
				stack.push(this.isolateCoverGrammar(this.parseExponentiationExpression));
			}
			let i = stack.length - 1;
			expr = stack[i];
			let lastMarker = markers.pop();
			while (i > 1) {
				const marker = markers.pop();
				const lastLineStart = lastMarker && lastMarker.lineStart;
				const node = this.startNode(marker, lastLineStart);
				const operator = stack[i - 1];
				const logical = operator === "||" || operator === "&&" || operator === "??";
				expr = this.finalize(node, logical ? new LogicalExpression(operator, stack[i - 2], expr) : new BinaryExpression(operator, stack[i - 2], expr));
				i -= 2;
				lastMarker = marker;
			}
		}
		return expr;
	}
	parseConditionalExpression() {
		const startToken = this.lookahead;
		let expr = this.inheritCoverGrammar(this.parseBinaryExpression);
		if (this.match("?")) {
			this.nextToken();
			const previousAllowIn = this.context.allowIn;
			this.context.allowIn = true;
			const consequent = this.isolateCoverGrammar(this.parseAssignmentExpression);
			this.context.allowIn = previousAllowIn;
			this.expect(":");
			const alternate = this.isolateCoverGrammar(this.parseAssignmentExpression);
			expr = this.finalize(this.startNode(startToken), new ConditionalExpression(expr, consequent, alternate));
			this.context.isAssignmentTarget = false;
			this.context.isBindingElement = false;
		}
		return expr;
	}
	checkPatternParam(options, param) {
		switch (param.type) {
			case Syntax.Identifier:
				this.validateParam(options, param, param.name);
				break;
			case Syntax.RestElement:
				this.checkPatternParam(options, param.argument);
				break;
			case Syntax.AssignmentPattern:
				this.checkPatternParam(options, param.left);
				break;
			case Syntax.ArrayPattern:
				for (let i = 0; i < param.elements.length; i++) if (param.elements[i] !== null) this.checkPatternParam(options, param.elements[i]);
				break;
			case Syntax.ObjectPattern: for (let i = 0; i < param.properties.length; i++) {
				const property = param.properties[i];
				this.checkPatternParam(options, property.type === Syntax.RestElement ? property : property.value);
			}
		}
		options.simple = options.simple && param instanceof Identifier;
	}
	reinterpretAsCoverFormalsList(expr) {
		let params = [expr];
		const options = {
			simple: true,
			paramSet: {}
		};
		let asyncArrow = false;
		switch (expr.type) {
			case Syntax.Identifier: break;
			case ArrowParameterPlaceHolder:
				params = expr.params;
				asyncArrow = expr.async;
				break;
			default: return null;
		}
		for (let i = 0; i < params.length; ++i) {
			const param = params[i];
			if (param.type === Syntax.AssignmentPattern) {
				if (param.right.type === Syntax.YieldExpression) {
					if (param.right.argument) this.throwUnexpectedToken(this.lookahead);
					param.right.type = Syntax.Identifier;
					param.right.name = "yield";
					delete param.right.argument;
					delete param.right.delegate;
				}
			} else if (asyncArrow && param.type === Syntax.Identifier && param.name === "await") this.throwUnexpectedToken(this.lookahead);
			this.checkPatternParam(options, param);
			params[i] = param;
		}
		if (this.context.strict || !this.context.allowYield) {
			for (let i = 0; i < params.length; ++i) if (params[i].type === Syntax.YieldExpression) this.throwUnexpectedToken(this.lookahead);
		}
		if (options.hasDuplicateParameterNames) {
			const token = this.context.strict ? options.stricted : options.firstRestricted;
			this.throwUnexpectedToken(token, Messages.DuplicateParameter);
		}
		return {
			simple: options.simple,
			params,
			stricted: options.stricted,
			firstRestricted: options.firstRestricted,
			message: options.message
		};
	}
	parseAssignmentExpression() {
		let expr;
		if (!this.context.allowYield && this.matchKeyword("yield")) expr = this.parseYieldExpression();
		else {
			const startToken = this.lookahead;
			let token = startToken;
			expr = this.parseConditionalExpression();
			if (token.type === 3 && token.lineNumber === this.lookahead.lineNumber && token.value === "async") {
				if (this.lookahead.type === 3 || this.matchKeyword("yield")) {
					const arg = this.parsePrimaryExpression();
					this.reinterpretExpressionAsPattern(arg);
					expr = {
						type: ArrowParameterPlaceHolder,
						params: [arg],
						async: true
					};
				}
			}
			if (expr.type === ArrowParameterPlaceHolder || this.match("=>")) {
				this.context.isAssignmentTarget = false;
				this.context.isBindingElement = false;
				const isAsync = expr.async;
				const list = this.reinterpretAsCoverFormalsList(expr);
				if (list) {
					if (this.hasLineTerminator) this.tolerateUnexpectedToken(this.lookahead);
					this.context.firstCoverInitializedNameError = null;
					const previousStrict = this.context.strict;
					const previousAllowStrictDirective = this.context.allowStrictDirective;
					this.context.allowStrictDirective = list.simple;
					const previousAllowYield = this.context.allowYield;
					const previousIsAsync = this.context.isAsync;
					this.context.allowYield = true;
					this.context.isAsync = isAsync;
					const node = this.startNode(startToken);
					this.expect("=>");
					let body;
					if (this.match("{")) {
						const previousAllowIn = this.context.allowIn;
						this.context.allowIn = true;
						body = this.parseFunctionSourceElements();
						this.context.allowIn = previousAllowIn;
					} else body = this.isolateCoverGrammar(this.parseAssignmentExpression);
					const expression = body.type !== Syntax.BlockStatement;
					if (this.context.strict && list.firstRestricted) this.throwUnexpectedToken(list.firstRestricted, list.message);
					if (this.context.strict && list.stricted) this.tolerateUnexpectedToken(list.stricted, list.message);
					expr = this.finalize(node, new ArrowFunctionExpression(list.params, body, expression, isAsync));
					this.context.strict = previousStrict;
					this.context.allowStrictDirective = previousAllowStrictDirective;
					this.context.allowYield = previousAllowYield;
					this.context.isAsync = previousIsAsync;
				}
			} else if (this.matchAssign()) {
				if (!this.context.isAssignmentTarget) this.tolerateError(Messages.InvalidLHSInAssignment);
				if (this.context.strict && expr.type === Syntax.Identifier) {
					const id = expr;
					if (this.scanner.isRestrictedWord(id.name)) this.tolerateUnexpectedToken(token, Messages.StrictLHSAssignment);
					if (this.scanner.isStrictModeReservedWord(id.name)) this.tolerateUnexpectedToken(token, Messages.StrictReservedWord);
				}
				if (!this.match("=")) {
					this.context.isAssignmentTarget = false;
					this.context.isBindingElement = false;
				} else this.reinterpretExpressionAsPattern(expr);
				token = this.nextToken();
				const operator = token.value;
				const right = this.isolateCoverGrammar(this.parseAssignmentExpression);
				expr = this.finalize(this.startNode(startToken), new AssignmentExpression(operator, expr, right));
				this.context.firstCoverInitializedNameError = null;
			}
		}
		return expr;
	}
	parseExpression() {
		const startToken = this.lookahead;
		let expr = this.isolateCoverGrammar(this.parseAssignmentExpression);
		if (this.match(",")) {
			const expressions = [];
			expressions.push(expr);
			while (this.lookahead.type !== 2) {
				if (!this.match(",")) break;
				this.nextToken();
				expressions.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
			}
			expr = this.finalize(this.startNode(startToken), new SequenceExpression(expressions));
		}
		return expr;
	}
	parseStatementListItem() {
		let statement;
		this.context.isAssignmentTarget = true;
		this.context.isBindingElement = true;
		if (this.lookahead.type === 4) switch (this.lookahead.value) {
			case "export":
				if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, Messages.IllegalExportDeclaration);
				statement = this.parseExportDeclaration();
				break;
			case "import":
				if (this.matchImportCall()) statement = this.parseExpressionStatement();
				else if (this.matchImportMeta()) statement = this.parseStatement();
				else {
					if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, Messages.IllegalImportDeclaration);
					statement = this.parseImportDeclaration();
				}
				break;
			case "const":
				statement = this.parseLexicalDeclaration({ inFor: false });
				break;
			case "function":
				statement = this.parseFunctionDeclaration();
				break;
			case "class":
				statement = this.parseClassDeclaration();
				break;
			case "let":
				statement = this.isLexicalDeclaration() ? this.parseLexicalDeclaration({ inFor: false }) : this.parseStatement();
				break;
			default: statement = this.parseStatement();
		}
		else statement = this.parseStatement();
		return statement;
	}
	parseBlock() {
		const node = this.createNode();
		this.expect("{");
		const block = [];
		while (true) {
			if (this.match("}")) break;
			block.push(this.parseStatementListItem());
		}
		this.expect("}");
		return this.finalize(node, new BlockStatement(block));
	}
	parseLexicalBinding(kind, options) {
		const node = this.createNode();
		const id = this.parsePattern([], kind);
		if (this.context.strict && id.type === Syntax.Identifier) {
			if (this.scanner.isRestrictedWord(id.name)) this.tolerateError(Messages.StrictVarName);
		}
		let init = null;
		if (kind === "const") {
			if (!this.matchKeyword("in") && !this.matchContextualKeyword("of")) {
				if (this.match("=")) {
					this.nextToken();
					init = this.isolateCoverGrammar(this.parseAssignmentExpression);
				} else this.throwError(Messages.DeclarationMissingInitializer, "const");
			}
		} else if (!options.inFor && id.type !== Syntax.Identifier || this.match("=")) {
			this.expect("=");
			init = this.isolateCoverGrammar(this.parseAssignmentExpression);
		}
		return this.finalize(node, new VariableDeclarator(id, init));
	}
	parseBindingList(kind, options) {
		const list = [this.parseLexicalBinding(kind, options)];
		while (this.match(",")) {
			this.nextToken();
			list.push(this.parseLexicalBinding(kind, options));
		}
		return list;
	}
	isLexicalDeclaration() {
		const state = this.scanner.saveState();
		this.scanner.scanComments();
		const next = this.scanner.lex();
		this.scanner.restoreState(state);
		return next.type === 3 || next.type === 7 && next.value === "[" || next.type === 7 && next.value === "{" || next.type === 4 && next.value === "let" || next.type === 4 && next.value === "yield";
	}
	parseLexicalDeclaration(options) {
		const node = this.createNode();
		const kind = this.nextToken().value;
		assert(kind === "let" || kind === "const", "Lexical declaration must be either let or const");
		const declarations = this.parseBindingList(kind, options);
		this.consumeSemicolon();
		return this.finalize(node, new VariableDeclaration(declarations, kind));
	}
	/**
	* This function checks to see if a property is initialized in a Class
	* e.g.
	* publicProp = 123;
	* @returns {Boolean}
	*/
	isInitializedProperty() {
		let state = this.scanner.saveState();
		this.scanner.scanComments();
		let next = this.scanner.lex();
		this.scanner.restoreState(state);
		return this.lookahead.type === 3 && next.value === "=";
	}
	/**
	* This function checks to see if a property is declared in a Class
	* e.g.
	* publicProp;
	* @returns {Boolean}
	*/
	isDeclaredProperty() {
		let state = this.scanner.saveState();
		this.scanner.scanComments();
		let next = this.scanner.lex();
		this.scanner.restoreState(state);
		return this.lookahead.type === 3 && next.value === ";" || this.lookahead.type === 3 && next.lineNumber !== this.startMarker.line;
	}
	parseBindingRestElement(params, kind) {
		const node = this.createNode();
		this.expect("...");
		const arg = this.parsePattern(params, kind);
		return this.finalize(node, new RestElement(arg));
	}
	parseArrayPattern(params, kind) {
		const node = this.createNode();
		this.expect("[");
		const elements = [];
		while (!this.match("]")) if (this.match(",")) {
			this.nextToken();
			elements.push(null);
		} else {
			if (this.match("...")) {
				elements.push(this.parseBindingRestElement(params, kind));
				break;
			} else elements.push(this.parsePatternWithDefault(params, kind));
			if (!this.match("]")) this.expect(",");
		}
		this.expect("]");
		return this.finalize(node, new ArrayPattern(elements));
	}
	parsePropertyPattern(params, kind) {
		const node = this.createNode();
		let computed = false;
		let shorthand = false;
		const method = false;
		let key;
		let value;
		if (this.lookahead.type === 3) {
			const keyToken = this.lookahead;
			key = this.parseVariableIdentifier();
			const init = this.finalize(node, new Identifier(keyToken.value));
			if (this.match("=")) {
				params.push(keyToken);
				shorthand = true;
				this.nextToken();
				const expr = this.parseAssignmentExpression();
				value = this.finalize(this.startNode(keyToken), new AssignmentPattern(init, expr));
			} else if (!this.match(":")) {
				params.push(keyToken);
				shorthand = true;
				value = init;
			} else {
				this.expect(":");
				value = this.parsePatternWithDefault(params, kind);
			}
		} else {
			computed = this.match("[");
			key = this.parseObjectPropertyKey();
			this.expect(":");
			value = this.parsePatternWithDefault(params, kind);
		}
		return this.finalize(node, new Property("init", key, computed, value, method, shorthand));
	}
	parseRestProperty(params) {
		const node = this.createNode();
		this.expect("...");
		const arg = this.parsePattern(params);
		if (this.match("=")) this.throwError(Messages.DefaultRestProperty);
		if (!this.match("}")) this.throwError(Messages.PropertyAfterRestProperty);
		return this.finalize(node, new RestElement(arg));
	}
	parseObjectPattern(params, kind) {
		const node = this.createNode();
		const properties = [];
		this.expect("{");
		while (!this.match("}")) {
			properties.push(this.match("...") ? this.parseRestProperty(params) : this.parsePropertyPattern(params, kind));
			if (!this.match("}")) this.expect(",");
		}
		this.expect("}");
		return this.finalize(node, new ObjectPattern(properties));
	}
	parsePattern(params, kind) {
		let pattern;
		if (this.match("[")) pattern = this.parseArrayPattern(params, kind);
		else if (this.match("{")) pattern = this.parseObjectPattern(params, kind);
		else {
			if (this.matchKeyword("let") && (kind === "const" || kind === "let")) this.tolerateUnexpectedToken(this.lookahead, Messages.LetInLexicalBinding);
			params.push(this.lookahead);
			pattern = this.parseVariableIdentifier(kind);
		}
		return pattern;
	}
	parsePatternWithDefault(params, kind) {
		const startToken = this.lookahead;
		let pattern = this.parsePattern(params, kind);
		if (this.match("=")) {
			this.nextToken();
			const previousAllowYield = this.context.allowYield;
			this.context.allowYield = true;
			const right = this.isolateCoverGrammar(this.parseAssignmentExpression);
			this.context.allowYield = previousAllowYield;
			pattern = this.finalize(this.startNode(startToken), new AssignmentPattern(pattern, right));
		}
		return pattern;
	}
	parseVariableIdentifier(kind) {
		const node = this.createNode();
		const token = this.nextToken();
		if (token.type === 4 && token.value === "yield") {
			if (this.context.strict) this.tolerateUnexpectedToken(token, Messages.StrictReservedWord);
			else if (!this.context.allowYield) this.throwUnexpectedToken(token);
		} else if (token.type !== 3) {
			if (this.context.strict && token.type === 4 && this.scanner.isStrictModeReservedWord(token.value)) this.tolerateUnexpectedToken(token, Messages.StrictReservedWord);
			else if (this.context.strict || token.value !== "let" || kind !== "var") this.throwUnexpectedToken(token);
		} else if ((this.context.isModule || this.context.isAsync) && token.type === 3 && token.value === "await") this.tolerateUnexpectedToken(token);
		return this.finalize(node, new Identifier(token.value));
	}
	parseVariableDeclaration(options) {
		const node = this.createNode();
		const id = this.parsePattern([], "var");
		if (this.context.strict && id.type === Syntax.Identifier) {
			if (this.scanner.isRestrictedWord(id.name)) this.tolerateError(Messages.StrictVarName);
		}
		let init = null;
		if (this.match("=")) {
			this.nextToken();
			init = this.isolateCoverGrammar(this.parseAssignmentExpression);
		} else if (id.type !== Syntax.Identifier && !options.inFor) this.expect("=");
		return this.finalize(node, new VariableDeclarator(id, init));
	}
	parseVariableDeclarationList(options) {
		const opt = { inFor: options.inFor };
		const list = [];
		list.push(this.parseVariableDeclaration(opt));
		while (this.match(",")) {
			this.nextToken();
			list.push(this.parseVariableDeclaration(opt));
		}
		return list;
	}
	parseVariableStatement() {
		const node = this.createNode();
		this.expectKeyword("var");
		const declarations = this.parseVariableDeclarationList({ inFor: false });
		this.consumeSemicolon();
		return this.finalize(node, new VariableDeclaration(declarations, "var"));
	}
	parseEmptyStatement() {
		const node = this.createNode();
		this.expect(";");
		return this.finalize(node, new EmptyStatement());
	}
	parseExpressionStatement() {
		const node = this.createNode();
		const expr = this.parseExpression();
		this.consumeSemicolon();
		return this.finalize(node, new ExpressionStatement(expr));
	}
	parseIfClause() {
		if (this.context.strict && this.matchKeyword("function")) this.tolerateError(Messages.StrictFunction);
		return this.parseStatement();
	}
	parseIfStatement() {
		const node = this.createNode();
		let consequent;
		let alternate = null;
		this.expectKeyword("if");
		this.expect("(");
		const test = this.parseExpression();
		if (!this.match(")") && this.config.tolerant) {
			this.tolerateUnexpectedToken(this.nextToken());
			consequent = this.finalize(this.createNode(), new EmptyStatement());
		} else {
			this.expect(")");
			consequent = this.parseIfClause();
			if (this.matchKeyword("else")) {
				this.nextToken();
				alternate = this.parseIfClause();
			}
		}
		return this.finalize(node, new IfStatement(test, consequent, alternate));
	}
	parseDoWhileStatement() {
		const node = this.createNode();
		this.expectKeyword("do");
		this.tolerateInvalidLoopStatement();
		const previousInIteration = this.context.inIteration;
		this.context.inIteration = true;
		const body = this.parseStatement();
		this.context.inIteration = previousInIteration;
		this.expectKeyword("while");
		this.expect("(");
		const test = this.parseExpression();
		if (!this.match(")") && this.config.tolerant) this.tolerateUnexpectedToken(this.nextToken());
		else {
			this.expect(")");
			if (this.match(";")) this.nextToken();
		}
		return this.finalize(node, new DoWhileStatement(body, test));
	}
	parseWhileStatement() {
		const node = this.createNode();
		let body;
		this.expectKeyword("while");
		this.expect("(");
		const test = this.parseExpression();
		if (!this.match(")") && this.config.tolerant) {
			this.tolerateUnexpectedToken(this.nextToken());
			body = this.finalize(this.createNode(), new EmptyStatement());
		} else {
			this.expect(")");
			const previousInIteration = this.context.inIteration;
			this.context.inIteration = true;
			body = this.parseStatement();
			this.context.inIteration = previousInIteration;
		}
		return this.finalize(node, new WhileStatement(test, body));
	}
	parseForStatement() {
		let init = null;
		let test = null;
		let update = null;
		let forIn = true;
		let left, right;
		let _await = false;
		const node = this.createNode();
		this.expectKeyword("for");
		if (this.matchContextualKeyword("await")) {
			if (!this.context.isAsync) this.tolerateUnexpectedToken(this.lookahead);
			_await = true;
			this.nextToken();
		}
		this.expect("(");
		if (this.match(";")) this.nextToken();
		else if (this.matchKeyword("var")) {
			init = this.createNode();
			this.nextToken();
			const previousAllowIn = this.context.allowIn;
			this.context.allowIn = false;
			const declarations = this.parseVariableDeclarationList({ inFor: true });
			this.context.allowIn = previousAllowIn;
			if (!_await && declarations.length === 1 && this.matchKeyword("in")) {
				const decl = declarations[0];
				if (decl.init && (decl.id.type === Syntax.ArrayPattern || decl.id.type === Syntax.ObjectPattern || this.context.strict)) this.tolerateError(Messages.ForInOfLoopInitializer, "for-in");
				init = this.finalize(init, new VariableDeclaration(declarations, "var"));
				this.nextToken();
				left = init;
				right = this.parseExpression();
				init = null;
			} else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of")) {
				init = this.finalize(init, new VariableDeclaration(declarations, "var"));
				this.nextToken();
				left = init;
				right = this.parseAssignmentExpression();
				init = null;
				forIn = false;
			} else {
				init = this.finalize(init, new VariableDeclaration(declarations, "var"));
				this.expect(";");
			}
		} else if (this.matchKeyword("const") || this.matchKeyword("let")) {
			init = this.createNode();
			const kind = this.nextToken().value;
			if (!this.context.strict && this.lookahead.value === "in") {
				init = this.finalize(init, new Identifier(kind));
				this.nextToken();
				left = init;
				right = this.parseExpression();
				init = null;
			} else {
				const previousAllowIn = this.context.allowIn;
				this.context.allowIn = false;
				const declarations = this.parseBindingList(kind, { inFor: true });
				this.context.allowIn = previousAllowIn;
				if (declarations.length === 1 && declarations[0].init === null && this.matchKeyword("in")) {
					init = this.finalize(init, new VariableDeclaration(declarations, kind));
					this.nextToken();
					left = init;
					right = this.parseExpression();
					init = null;
				} else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of")) {
					init = this.finalize(init, new VariableDeclaration(declarations, kind));
					this.nextToken();
					left = init;
					right = this.parseAssignmentExpression();
					init = null;
					forIn = false;
				} else {
					this.consumeSemicolon();
					init = this.finalize(init, new VariableDeclaration(declarations, kind));
				}
			}
		} else {
			const initStartToken = this.lookahead;
			const previousIsBindingElement = this.context.isBindingElement;
			const previousIsAssignmentTarget = this.context.isAssignmentTarget;
			const previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
			const previousAllowIn = this.context.allowIn;
			this.context.allowIn = false;
			init = this.inheritCoverGrammar(this.parseAssignmentExpression);
			this.context.allowIn = previousAllowIn;
			if (this.matchKeyword("in")) {
				if (!this.context.isAssignmentTarget || init.type === Syntax.AssignmentExpression) this.tolerateError(Messages.InvalidLHSInForIn);
				this.nextToken();
				this.reinterpretExpressionAsPattern(init);
				left = init;
				right = this.parseExpression();
				init = null;
			} else if (this.matchContextualKeyword("of")) {
				if (!this.context.isAssignmentTarget || init.type === Syntax.AssignmentExpression) this.tolerateError(Messages.InvalidLHSInForLoop);
				this.nextToken();
				this.reinterpretExpressionAsPattern(init);
				left = init;
				right = this.parseAssignmentExpression();
				init = null;
				forIn = false;
			} else {
				this.context.isBindingElement = previousIsBindingElement;
				this.context.isAssignmentTarget = previousIsAssignmentTarget;
				this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError;
				if (this.match(",")) {
					const initSeq = [init];
					while (this.match(",")) {
						this.nextToken();
						initSeq.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
					}
					init = this.finalize(this.startNode(initStartToken), new SequenceExpression(initSeq));
				}
				this.expect(";");
			}
		}
		if (typeof left === "undefined") {
			if (!this.match(";")) test = this.isolateCoverGrammar(this.parseExpression);
			this.expect(";");
			if (!this.match(")")) update = this.isolateCoverGrammar(this.parseExpression);
		}
		let body;
		if (!this.match(")") && this.config.tolerant) {
			this.tolerateUnexpectedToken(this.nextToken());
			body = this.finalize(this.createNode(), new EmptyStatement());
		} else {
			this.expect(")");
			this.tolerateInvalidLoopStatement();
			const previousInIteration = this.context.inIteration;
			this.context.inIteration = true;
			body = this.isolateCoverGrammar(this.parseStatement);
			this.context.inIteration = previousInIteration;
		}
		return typeof left === "undefined" ? this.finalize(node, new ForStatement(init, test, update, body)) : forIn ? this.finalize(node, new ForInStatement(left, right, body)) : this.finalize(node, new ForOfStatement(left, right, body, _await));
	}
	parseContinueStatement() {
		const node = this.createNode();
		this.expectKeyword("continue");
		let label = null;
		if (this.lookahead.type === 3 && !this.hasLineTerminator) {
			const id = this.parseVariableIdentifier();
			label = id;
			const key = "$" + id.name;
			if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(Messages.UnknownLabel, id.name);
		}
		this.consumeSemicolon();
		if (label === null && !this.context.inIteration) this.throwError(Messages.IllegalContinue);
		return this.finalize(node, new ContinueStatement(label));
	}
	parseBreakStatement() {
		const node = this.createNode();
		this.expectKeyword("break");
		let label = null;
		if (this.lookahead.type === 3 && !this.hasLineTerminator) {
			const id = this.parseVariableIdentifier();
			const key = "$" + id.name;
			if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(Messages.UnknownLabel, id.name);
			label = id;
		}
		this.consumeSemicolon();
		if (label === null && !this.context.inIteration && !this.context.inSwitch) this.throwError(Messages.IllegalBreak);
		return this.finalize(node, new BreakStatement(label));
	}
	parseReturnStatement() {
		if (!this.context.inFunctionBody) this.tolerateError(Messages.IllegalReturn);
		const node = this.createNode();
		this.expectKeyword("return");
		const argument = !this.match(";") && !this.match("}") && !this.hasLineTerminator && this.lookahead.type !== 2 || this.lookahead.type === 8 || this.lookahead.type === 10 ? this.parseExpression() : null;
		this.consumeSemicolon();
		return this.finalize(node, new ReturnStatement(argument));
	}
	parseWithStatement() {
		if (this.context.strict) this.tolerateError(Messages.StrictModeWith);
		const node = this.createNode();
		let body;
		this.expectKeyword("with");
		this.expect("(");
		const object = this.parseExpression();
		if (!this.match(")") && this.config.tolerant) {
			this.tolerateUnexpectedToken(this.nextToken());
			body = this.finalize(this.createNode(), new EmptyStatement());
		} else {
			this.expect(")");
			body = this.parseStatement();
		}
		return this.finalize(node, new WithStatement(object, body));
	}
	parseSwitchCase() {
		const node = this.createNode();
		let test;
		if (this.matchKeyword("default")) {
			this.nextToken();
			test = null;
		} else {
			this.expectKeyword("case");
			test = this.parseExpression();
		}
		this.expect(":");
		const consequent = [];
		while (true) {
			if (this.match("}") || this.matchKeyword("default") || this.matchKeyword("case")) break;
			consequent.push(this.parseStatementListItem());
		}
		return this.finalize(node, new SwitchCase(test, consequent));
	}
	parseSwitchStatement() {
		const node = this.createNode();
		this.expectKeyword("switch");
		this.expect("(");
		const discriminant = this.parseExpression();
		this.expect(")");
		const previousInSwitch = this.context.inSwitch;
		this.context.inSwitch = true;
		const cases = [];
		let defaultFound = false;
		this.expect("{");
		while (true) {
			if (this.match("}")) break;
			const clause = this.parseSwitchCase();
			if (clause.test === null) {
				if (defaultFound) this.throwError(Messages.MultipleDefaultsInSwitch);
				defaultFound = true;
			}
			cases.push(clause);
		}
		this.expect("}");
		this.context.inSwitch = previousInSwitch;
		return this.finalize(node, new SwitchStatement(discriminant, cases));
	}
	parseLabelledStatement() {
		const node = this.createNode();
		const expr = this.parseExpression();
		let statement;
		if (expr.type === Syntax.Identifier && this.match(":")) {
			this.nextToken();
			const id = expr;
			const key = "$" + id.name;
			if (Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(Messages.Redeclaration, "Label", id.name);
			this.context.labelSet[key] = true;
			let body;
			if (this.matchKeyword("class")) {
				this.tolerateUnexpectedToken(this.lookahead);
				body = this.parseClassDeclaration();
			} else if (this.matchKeyword("function")) {
				const token = this.lookahead;
				const declaration = this.parseFunctionDeclaration();
				if (this.context.strict) this.tolerateUnexpectedToken(token, Messages.StrictFunction);
				else if (declaration.generator) this.tolerateUnexpectedToken(token, Messages.GeneratorInLegacyContext);
				body = declaration;
			} else body = this.parseStatement();
			delete this.context.labelSet[key];
			statement = new LabeledStatement(id, body);
		} else {
			this.consumeSemicolon();
			statement = new ExpressionStatement(expr);
		}
		return this.finalize(node, statement);
	}
	parseThrowStatement() {
		const node = this.createNode();
		this.expectKeyword("throw");
		if (this.hasLineTerminator) this.throwError(Messages.NewlineAfterThrow);
		const argument = this.parseExpression();
		this.consumeSemicolon();
		return this.finalize(node, new ThrowStatement(argument));
	}
	parseCatchClause() {
		const node = this.createNode();
		this.expectKeyword("catch");
		let param = null;
		if (this.match("(")) {
			this.expect("(");
			if (this.match(")")) this.throwUnexpectedToken(this.lookahead);
			const params = [];
			param = this.parsePattern(params);
			const paramMap = {};
			for (let i = 0; i < params.length; i++) {
				const key = "$" + params[i].value;
				if (Object.prototype.hasOwnProperty.call(paramMap, key)) this.tolerateError(Messages.DuplicateBinding, params[i].value);
				paramMap[key] = true;
			}
			if (this.context.strict && param.type === Syntax.Identifier) {
				if (this.scanner.isRestrictedWord(param.name)) this.tolerateError(Messages.StrictCatchVariable);
			}
			this.expect(")");
		}
		const body = this.parseBlock();
		return this.finalize(node, new CatchClause(param, body));
	}
	parseFinallyClause() {
		this.expectKeyword("finally");
		return this.parseBlock();
	}
	parseTryStatement() {
		const node = this.createNode();
		this.expectKeyword("try");
		const block = this.parseBlock();
		const handler = this.matchKeyword("catch") ? this.parseCatchClause() : null;
		const finalizer = this.matchKeyword("finally") ? this.parseFinallyClause() : null;
		if (!handler && !finalizer) this.throwError(Messages.NoCatchOrFinally);
		return this.finalize(node, new TryStatement(block, handler, finalizer));
	}
	parseDebuggerStatement() {
		const node = this.createNode();
		this.expectKeyword("debugger");
		this.consumeSemicolon();
		return this.finalize(node, new DebuggerStatement());
	}
	parseStatement() {
		let statement;
		switch (this.lookahead.type) {
			case 1:
			case 5:
			case 6:
			case 8:
			case 10:
			case 9:
				statement = this.parseExpressionStatement();
				break;
			case 7:
				const value = this.lookahead.value;
				if (value === "{") statement = this.parseBlock();
				else if (value === "(") statement = this.parseExpressionStatement();
				else if (value === ";") statement = this.parseEmptyStatement();
				else statement = this.parseExpressionStatement();
				break;
			case 3:
				statement = this.matchAsyncFunction() ? this.parseFunctionDeclaration() : this.parseLabelledStatement();
				break;
			case 4:
				switch (this.lookahead.value) {
					case "break":
						statement = this.parseBreakStatement();
						break;
					case "continue":
						statement = this.parseContinueStatement();
						break;
					case "debugger":
						statement = this.parseDebuggerStatement();
						break;
					case "do":
						statement = this.parseDoWhileStatement();
						break;
					case "for":
						statement = this.parseForStatement();
						break;
					case "function":
						statement = this.parseFunctionDeclaration();
						break;
					case "if":
						statement = this.parseIfStatement();
						break;
					case "return":
						statement = this.parseReturnStatement();
						break;
					case "switch":
						statement = this.parseSwitchStatement();
						break;
					case "throw":
						statement = this.parseThrowStatement();
						break;
					case "try":
						statement = this.parseTryStatement();
						break;
					case "var":
						statement = this.parseVariableStatement();
						break;
					case "while":
						statement = this.parseWhileStatement();
						break;
					case "with":
						statement = this.parseWithStatement();
						break;
					default: statement = this.parseExpressionStatement();
				}
				break;
			default: statement = this.throwUnexpectedToken(this.lookahead);
		}
		return statement;
	}
	parseFunctionSourceElements() {
		const node = this.createNode();
		this.expect("{");
		const body = this.parseDirectivePrologues();
		const previousLabelSet = this.context.labelSet;
		const previousInIteration = this.context.inIteration;
		const previousInSwitch = this.context.inSwitch;
		const previousInFunctionBody = this.context.inFunctionBody;
		this.context.labelSet = {};
		this.context.inIteration = false;
		this.context.inSwitch = false;
		this.context.inFunctionBody = true;
		while (this.lookahead.type !== 2) {
			if (this.match("}")) break;
			body.push(this.parseStatementListItem());
		}
		this.expect("}");
		this.context.labelSet = previousLabelSet;
		this.context.inIteration = previousInIteration;
		this.context.inSwitch = previousInSwitch;
		this.context.inFunctionBody = previousInFunctionBody;
		return this.finalize(node, new BlockStatement(body));
	}
	validateParam(options, param, name) {
		const key = "$" + name;
		if (this.context.strict) {
			if (this.scanner.isRestrictedWord(name)) {
				options.stricted = param;
				options.message = Messages.StrictParamName;
			}
			if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
				options.stricted = param;
				options.hasDuplicateParameterNames = true;
			}
		} else if (!options.firstRestricted) {
			if (this.scanner.isRestrictedWord(name)) {
				options.firstRestricted = param;
				options.message = Messages.StrictParamName;
			} else if (this.scanner.isStrictModeReservedWord(name)) {
				options.firstRestricted = param;
				options.message = Messages.StrictReservedWord;
			} else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
				options.stricted = param;
				options.hasDuplicateParameterNames = true;
			}
		}
		/* istanbul ignore next */
		if (typeof Object.defineProperty === "function") Object.defineProperty(options.paramSet, key, {
			value: true,
			enumerable: true,
			writable: true,
			configurable: true
		});
		else options.paramSet[key] = true;
	}
	parseRestElement(params) {
		const node = this.createNode();
		this.expect("...");
		const arg = this.parsePattern(params);
		if (this.match("=")) this.throwError(Messages.DefaultRestParameter);
		if (!this.match(")")) this.throwError(Messages.ParameterAfterRestParameter);
		return this.finalize(node, new RestElement(arg));
	}
	parseFormalParameter(options) {
		const params = [];
		const param = this.match("...") ? this.parseRestElement(params) : this.parsePatternWithDefault(params);
		for (let i = 0; i < params.length; i++) this.validateParam(options, params[i], params[i].value);
		options.simple = options.simple && param instanceof Identifier;
		options.params.push(param);
	}
	parseFormalParameters(firstRestricted) {
		const options = {
			simple: true,
			hasDuplicateParameterNames: false,
			params: [],
			firstRestricted
		};
		this.expect("(");
		if (!this.match(")")) {
			options.paramSet = {};
			while (this.lookahead.type !== 2) {
				this.parseFormalParameter(options);
				if (this.match(")")) break;
				this.expect(",");
				if (this.match(")")) break;
			}
		}
		this.expect(")");
		if (options.hasDuplicateParameterNames) {
			if (this.context.strict || this.context.isAsync || !options.simple) this.throwError(Messages.DuplicateParameter);
		}
		return {
			simple: options.simple,
			params: options.params,
			stricted: options.stricted,
			firstRestricted: options.firstRestricted,
			message: options.message
		};
	}
	matchAsyncFunction() {
		let match = this.matchContextualKeyword("async");
		if (match) {
			const state = this.scanner.saveState();
			this.scanner.scanComments();
			const next = this.scanner.lex();
			this.scanner.restoreState(state);
			match = state.lineNumber === next.lineNumber && next.type === 4 && next.value === "function";
		}
		return match;
	}
	parseFunctionDeclaration(identifierIsOptional) {
		const node = this.createNode();
		const isAsync = this.matchContextualKeyword("async");
		if (isAsync) {
			if (this.context.inIteration) this.tolerateError(Messages.AsyncFunctionInSingleStatementContext);
			this.nextToken();
		}
		this.expectKeyword("function");
		const isGenerator = this.match("*");
		if (isGenerator) this.nextToken();
		let message;
		let id = null;
		let firstRestricted = null;
		if (!identifierIsOptional || !this.match("(")) {
			const token = this.lookahead;
			id = this.parseVariableIdentifier();
			if (this.context.strict) {
				if (this.scanner.isRestrictedWord(token.value)) this.tolerateUnexpectedToken(token, Messages.StrictFunctionName);
			} else if (this.scanner.isRestrictedWord(token.value)) {
				firstRestricted = token;
				message = Messages.StrictFunctionName;
			} else if (this.scanner.isStrictModeReservedWord(token.value)) {
				firstRestricted = token;
				message = Messages.StrictReservedWord;
			}
		}
		const previousIsAsync = this.context.isAsync;
		const previousAllowYield = this.context.allowYield;
		this.context.isAsync = isAsync;
		this.context.allowYield = !isGenerator;
		const formalParameters = this.parseFormalParameters(firstRestricted);
		const params = formalParameters.params;
		const stricted = formalParameters.stricted;
		firstRestricted = formalParameters.firstRestricted;
		if (formalParameters.message) message = formalParameters.message;
		const previousStrict = this.context.strict;
		const previousAllowStrictDirective = this.context.allowStrictDirective;
		this.context.allowStrictDirective = formalParameters.simple;
		const body = this.parseFunctionSourceElements();
		if (this.context.strict && firstRestricted) this.throwUnexpectedToken(firstRestricted, message);
		if (this.context.strict && stricted) this.tolerateUnexpectedToken(stricted, message);
		this.context.strict = previousStrict;
		this.context.allowStrictDirective = previousAllowStrictDirective;
		this.context.isAsync = previousIsAsync;
		this.context.allowYield = previousAllowYield;
		return isAsync ? this.finalize(node, new AsyncFunctionDeclaration(id, params, body, isGenerator)) : this.finalize(node, new FunctionDeclaration(id, params, body, isGenerator));
	}
	parseFunctionExpression() {
		const node = this.createNode();
		const isAsync = this.matchContextualKeyword("async");
		if (isAsync) this.nextToken();
		this.expectKeyword("function");
		const isGenerator = this.match("*");
		if (isGenerator) this.nextToken();
		let message;
		let id = null;
		let firstRestricted;
		const previousIsAsync = this.context.isAsync;
		const previousAllowYield = this.context.allowYield;
		this.context.isAsync = isAsync;
		this.context.allowYield = !isGenerator;
		if (!this.match("(")) {
			const token = this.lookahead;
			id = !this.context.strict && !isGenerator && this.matchKeyword("yield") ? this.parseIdentifierName() : this.parseVariableIdentifier();
			if (this.context.strict) {
				if (this.scanner.isRestrictedWord(token.value)) this.tolerateUnexpectedToken(token, Messages.StrictFunctionName);
			} else if (this.scanner.isRestrictedWord(token.value)) {
				firstRestricted = token;
				message = Messages.StrictFunctionName;
			} else if (this.scanner.isStrictModeReservedWord(token.value)) {
				firstRestricted = token;
				message = Messages.StrictReservedWord;
			}
		}
		const formalParameters = this.parseFormalParameters(firstRestricted);
		const params = formalParameters.params;
		const stricted = formalParameters.stricted;
		firstRestricted = formalParameters.firstRestricted;
		if (formalParameters.message) message = formalParameters.message;
		const previousStrict = this.context.strict;
		const previousAllowStrictDirective = this.context.allowStrictDirective;
		this.context.allowStrictDirective = formalParameters.simple;
		const body = this.parseFunctionSourceElements();
		if (this.context.strict && firstRestricted) this.throwUnexpectedToken(firstRestricted, message);
		if (this.context.strict && stricted) this.tolerateUnexpectedToken(stricted, message);
		this.context.strict = previousStrict;
		this.context.allowStrictDirective = previousAllowStrictDirective;
		this.context.isAsync = previousIsAsync;
		this.context.allowYield = previousAllowYield;
		return this.finalize(node, new FunctionExpression(id, params, body, isGenerator, isAsync));
	}
	parseDirective() {
		const token = this.lookahead;
		const node = this.createNode();
		const expr = this.parseExpression();
		const directive = expr.type === Syntax.Literal ? this.getTokenRaw(token).slice(1, -1) : null;
		this.consumeSemicolon();
		return this.finalize(node, directive ? new Directive(expr, directive) : new ExpressionStatement(expr));
	}
	parseDirectivePrologues() {
		let firstRestricted = null;
		const body = [];
		while (true) {
			const token = this.lookahead;
			if (token.type !== 8) break;
			const statement = this.parseDirective();
			body.push(statement);
			const directive = statement.directive;
			if (typeof directive !== "string") break;
			if (directive === "use strict") {
				this.context.strict = true;
				if (firstRestricted) this.tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
				if (!this.context.allowStrictDirective) this.tolerateUnexpectedToken(token, Messages.IllegalLanguageModeDirective);
			} else if (!firstRestricted && token.octal) firstRestricted = token;
		}
		return body;
	}
	qualifiedPropertyName(token) {
		switch (token.type) {
			case 3:
			case 8:
			case 1:
			case 5:
			case 6:
			case 4: return true;
			case 7: return token.value === "[" || token.value === "#";
		}
		return false;
	}
	parseGetterMethod() {
		const node = this.createNode();
		const isGenerator = false;
		const previousAllowYield = this.context.allowYield;
		this.context.allowYield = true;
		const formalParameters = this.parseFormalParameters();
		if (formalParameters.params.length > 0) this.tolerateError(Messages.BadGetterArity);
		const method = this.parsePropertyMethod(formalParameters);
		this.context.allowYield = previousAllowYield;
		return this.finalize(node, new FunctionExpression(null, formalParameters.params, method, isGenerator, false));
	}
	parseSetterMethod() {
		const node = this.createNode();
		const isGenerator = false;
		const previousAllowYield = this.context.allowYield;
		this.context.allowYield = true;
		const formalParameters = this.parseFormalParameters();
		if (formalParameters.params.length !== 1) this.tolerateError(Messages.BadSetterArity);
		else if (formalParameters.params[0] instanceof RestElement) this.tolerateError(Messages.BadSetterRestParameter);
		const method = this.parsePropertyMethod(formalParameters);
		this.context.allowYield = previousAllowYield;
		return this.finalize(node, new FunctionExpression(null, formalParameters.params, method, isGenerator, false));
	}
	parseGeneratorMethod(isAsync) {
		const node = this.createNode();
		const isGenerator = true;
		const previousAllowYield = this.context.allowYield;
		this.context.allowYield = true;
		const params = this.parseFormalParameters();
		this.context.allowYield = false;
		const method = this.parsePropertyMethod(params);
		this.context.allowYield = previousAllowYield;
		return this.finalize(node, new FunctionExpression(null, params.params, method, isGenerator, isAsync));
	}
	isStartOfExpression() {
		let start = true;
		const value = this.lookahead.value;
		switch (this.lookahead.type) {
			case 7:
				start = value === "[" || value === "(" || value === "{" || value === "+" || value === "-" || value === "!" || value === "~" || value === "++" || value === "--" || value === "/" || value === "/=";
				break;
			case 4: start = value === "class" || value === "delete" || value === "function" || value === "let" || value === "new" || value === "super" || value === "this" || value === "typeof" || value === "void" || value === "yield";
		}
		return start;
	}
	parseYieldExpression() {
		const node = this.createNode();
		this.expectKeyword("yield");
		let argument = null;
		let delegate = false;
		if (!this.hasLineTerminator) {
			const previousAllowYield = this.context.allowYield;
			this.context.allowYield = false;
			delegate = this.match("*");
			if (delegate) {
				this.nextToken();
				argument = this.parseAssignmentExpression();
			} else if (this.isStartOfExpression()) argument = this.parseAssignmentExpression();
			this.context.allowYield = previousAllowYield;
		}
		return this.finalize(node, new YieldExpression(argument, delegate));
	}
	parseStaticBlock() {
		const node = this.createNode();
		this.expect("{");
		const block = [];
		while (true) {
			if (this.match("}")) break;
			block.push(this.parseStatementListItem());
		}
		this.expect("}");
		return this.finalize(node, new StaticBlock(block));
	}
	parseDecorator() {
		const node = this.createNode();
		this.expect("@");
		const previousStrict = this.context.strict;
		const previousAllowYield = this.context.allowYield;
		const previousIsAsync = this.context.isAsync;
		this.context.strict = false;
		this.context.allowYield = true;
		this.context.isAsync = false;
		const expression = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
		this.context.strict = previousStrict;
		this.context.allowYield = previousAllowYield;
		this.context.isAsync = previousIsAsync;
		if (this.match(";")) this.throwError(Messages.NoSemicolonAfterDecorator);
		return this.finalize(node, new Decorator(expression));
	}
	parseDecorators() {
		let decorators = null;
		while (this.match("@")) {
			if (decorators == null) decorators = [];
			decorators.push(this.parseDecorator());
		}
		return decorators;
	}
	parseClassElement(hasConstructor) {
		let token = this.lookahead;
		const node = this.createNode();
		const previousInConstructor = this.context.inConstructor;
		let kind = "";
		let key = null;
		let value = null;
		let computed = false;
		let method = false;
		let isStatic = false;
		let isAsync = false;
		let isGenerator = false;
		let isPrivate = false;
		const decorators = this.parseDecorators();
		if (decorators) token = this.lookahead;
		if (this.match("*")) this.nextToken();
		else {
			computed = this.match("[");
			if (this.match("#")) {
				isPrivate = true;
				this.nextToken();
				token = this.lookahead;
			}
			key = this.parseObjectPropertyKey(isPrivate);
			const id = key;
			this.context.inConstructor = token.type === 3 && token.value === "constructor";
			if (id.name === "static" && (this.qualifiedPropertyName(this.lookahead) || this.match("*"))) {
				token = this.lookahead;
				isStatic = true;
				computed = this.match("[");
				if (this.match("*")) {
					this.nextToken();
					if (this.match("#")) {
						isPrivate = true;
						this.nextToken();
						token = this.lookahead;
					}
				} else {
					if (this.match("#")) {
						isPrivate = true;
						this.nextToken();
						token = this.lookahead;
					}
					key = this.parseObjectPropertyKey(isPrivate);
				}
			}
			if (id.name === "static" && this.match("{")) return this.parseStaticBlock();
			if (token.type === 3 && !this.hasLineTerminator && token.value === "async") {
				const punctuator = this.lookahead.value;
				if (punctuator !== ":" && punctuator !== "(") {
					isAsync = true;
					isGenerator = this.match("*");
					if (isGenerator) this.nextToken();
					token = this.lookahead;
					computed = this.match("[");
					if (this.match("*")) {
						this.nextToken();
						if (this.match("#")) {
							isPrivate = true;
							this.nextToken();
						}
					} else {
						if (this.match("#")) {
							isPrivate = true;
							this.nextToken();
							token = this.lookahead;
						}
						key = this.parseObjectPropertyKey(isPrivate);
					}
					if (token.type === 3 && token.value === "constructor" && !isStatic) this.tolerateUnexpectedToken(token, Messages.ConstructorIsAsync);
				}
			}
		}
		if (token.type === 3 && token.value === "constructor" && isPrivate) this.tolerateUnexpectedToken(token, Messages.ConstructorIsPrivate);
		const lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
		if (token.type === 3 || token.type === 8) {
			if (token.value === "get" && lookaheadPropertyKey) {
				kind = "get";
				if (this.match("#")) {
					isPrivate = true;
					this.nextToken();
					token = this.lookahead;
				}
				computed = this.match("[");
				key = this.parseObjectPropertyKey(isPrivate);
				this.context.allowYield = false;
				value = this.parseGetterMethod();
			} else if (token.value === "set" && lookaheadPropertyKey) {
				kind = "set";
				if (this.match("#")) {
					isPrivate = true;
					this.nextToken();
					token = this.lookahead;
				}
				computed = this.match("[");
				key = this.parseObjectPropertyKey(isPrivate);
				value = this.parseSetterMethod();
			} else if (!this.match("(")) {
				kind = "property";
				computed = false;
				if (this.match("=")) {
					this.nextToken();
					value = this.isolateCoverGrammar(this.parseAssignmentExpression);
				}
			}
		} else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey) {
			kind = "init";
			computed = this.match("[");
			key = this.parseObjectPropertyKey(isPrivate);
			value = this.parseGeneratorMethod(isAsync);
			method = true;
		} else if (token.type === 7 && token.value === "[" && !this.match("(")) {
			kind = "property";
			computed = true;
			if (this.match("=")) {
				this.nextToken();
				value = this.isolateCoverGrammar(this.parseAssignmentExpression);
			}
		}
		if (!kind && key && this.match("(")) {
			const previousInClassConstructor = this.context.inClassConstructor;
			this.context.inClassConstructor = token.value === "constructor";
			kind = "init";
			value = isAsync ? this.parsePropertyMethodAsyncFunction(isGenerator) : this.parsePropertyMethodFunction(isGenerator);
			this.context.inClassConstructor = previousInClassConstructor;
			method = true;
		}
		if (!kind) this.throwUnexpectedToken(this.lookahead);
		if (kind === "init") kind = "method";
		if (!computed) {
			if (isStatic && this.isPropertyKey(key, "prototype")) this.throwUnexpectedToken(token, Messages.StaticPrototype);
			if (!isStatic && this.isPropertyKey(key, "constructor")) {
				if (kind !== "method" || !method || value && value.generator) this.throwUnexpectedToken(token, Messages.ConstructorSpecialMethod);
				if (hasConstructor.value) this.throwUnexpectedToken(token, Messages.DuplicateConstructor);
				else hasConstructor.value = true;
				kind = "constructor";
			}
		}
		this.context.inConstructor = previousInConstructor;
		if (kind === "property") {
			this.consumeSemicolon();
			return this.finalize(node, new PropertyDefinition(key, computed, value, isStatic, decorators));
		} else return this.finalize(node, new MethodDefinition(key, computed, value, kind, isStatic, decorators));
	}
	parseClassElementList() {
		const body = [];
		const hasConstructor = { value: false };
		this.expect("{");
		while (!this.match("}")) if (this.match(";")) this.nextToken();
		else body.push(this.parseClassElement(hasConstructor));
		this.expect("}");
		return body;
	}
	parseClassBody() {
		const node = this.createNode();
		const elementList = this.parseClassElementList();
		return this.finalize(node, new ClassBody(elementList));
	}
	parseClassDeclaration(identifierIsOptional) {
		const node = this.createNode();
		const previousStrict = this.context.strict;
		const previousAllowSuper = this.context.allowSuper;
		this.context.strict = true;
		this.expectKeyword("class");
		const id = identifierIsOptional && this.lookahead.type !== 3 ? null : this.parseVariableIdentifier();
		let superClass = null;
		if (this.matchKeyword("extends")) {
			this.nextToken();
			superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
			this.context.allowSuper = true;
		}
		const classBody = this.parseClassBody();
		this.context.allowSuper = previousAllowSuper;
		this.context.strict = previousStrict;
		return this.finalize(node, new ClassDeclaration(id, superClass, classBody, this.context.decorators));
	}
	parseClassExpression() {
		const node = this.createNode();
		const previousStrict = this.context.strict;
		this.context.strict = true;
		this.expectKeyword("class");
		const id = this.lookahead.type === 3 ? this.parseVariableIdentifier() : null;
		let superClass = null;
		if (this.matchKeyword("extends")) {
			this.nextToken();
			superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
			this.context.allowSuper = true;
		}
		const classBody = this.parseClassBody();
		this.context.strict = previousStrict;
		return this.finalize(node, new ClassExpression(id, superClass, classBody, this.context.decorators));
	}
	parseModule() {
		this.context.strict = true;
		this.context.isModule = true;
		this.scanner.isModule = true;
		const node = this.createNode();
		const body = this.parseDirectivePrologues();
		while (this.lookahead.type !== 2) body.push(this.parseStatementListItem());
		return this.finalize(node, new Module(body));
	}
	parseScript() {
		const node = this.createNode();
		const body = this.parseDirectivePrologues();
		while (this.lookahead.type !== 2) body.push(this.parseStatementListItem());
		return this.finalize(node, new Script(body));
	}
	parseImportAttributes() {
		if (this.lookahead.value === "assert") {
			this.nextToken();
			this.expect("{");
			const attributes = [];
			while (!this.match("}")) {
				attributes.push(this.parseImportAttribute());
				if (!this.match("}")) this.expectCommaSeparator();
			}
			this.expect("}");
			return attributes;
		}
		return null;
	}
	parseImportAttribute() {
		const node = this.createNode();
		if (this.lookahead.type !== 3) this.throwUnexpectedToken(this.nextToken());
		const key = this.parseIdentifierName();
		if (!this.match(":")) this.throwUnexpectedToken(this.nextToken());
		this.nextToken();
		const literalToken = this.nextToken();
		const raw = this.getTokenRaw(literalToken);
		const value = this.finalize(node, new Literal(literalToken.value, raw));
		return this.finalize(node, new ImportAttribute(key, value));
	}
	parseModuleSpecifier() {
		const node = this.createNode();
		if (this.lookahead.type !== 8) this.throwError(Messages.InvalidModuleSpecifier);
		const token = this.nextToken();
		const raw = this.getTokenRaw(token);
		if (!Character.isStringWellFormedUnicode(token.value)) this.throwError(Messages.InvalidModuleSpecifier);
		return this.finalize(node, new Literal(token.value, raw));
	}
	parseImportSpecifier() {
		const node = this.createNode();
		let imported;
		let local;
		if (this.lookahead.type === 3) {
			imported = this.parseVariableIdentifier();
			local = imported;
			if (this.matchContextualKeyword("as")) {
				this.nextToken();
				local = this.parseVariableIdentifier();
			}
		} else {
			imported = this.lookahead.type == 8 ? this.parseModuleSpecifier() : this.parseIdentifierName();
			local = imported;
			if (this.matchContextualKeyword("as")) {
				this.nextToken();
				local = this.parseVariableIdentifier();
			} else this.throwUnexpectedToken(this.nextToken());
		}
		return this.finalize(node, new ImportSpecifier(local, imported));
	}
	parseNamedImports() {
		this.expect("{");
		const specifiers = [];
		while (!this.match("}")) {
			specifiers.push(this.parseImportSpecifier());
			if (!this.match("}")) this.expect(",");
		}
		this.expect("}");
		return specifiers;
	}
	parseImportDefaultSpecifier() {
		const node = this.createNode();
		const local = this.parseIdentifierName();
		return this.finalize(node, new ImportDefaultSpecifier(local));
	}
	parseImportNamespaceSpecifier() {
		const node = this.createNode();
		this.expect("*");
		if (!this.matchContextualKeyword("as")) this.throwError(Messages.NoAsAfterImportNamespace);
		if (this.lookahead.escaped) this.throwError(Messages.NoAsAndFromEscapeSequences);
		this.nextToken();
		const local = this.parseIdentifierName();
		return this.finalize(node, new ImportNamespaceSpecifier(local));
	}
	parseImportDeclaration() {
		if (this.context.inFunctionBody) this.throwError(Messages.IllegalImportDeclaration);
		const node = this.createNode();
		this.expectKeyword("import");
		let src;
		let specifiers = [];
		if (this.lookahead.type === 8) src = this.parseModuleSpecifier();
		else {
			if (this.match("{")) specifiers = specifiers.concat(this.parseNamedImports());
			else if (this.match("*")) specifiers.push(this.parseImportNamespaceSpecifier());
			else if (this.isIdentifierName(this.lookahead) && !this.matchKeyword("default")) {
				specifiers.push(this.parseImportDefaultSpecifier());
				if (this.match(",")) {
					this.nextToken();
					if (this.match("*")) specifiers.push(this.parseImportNamespaceSpecifier());
					else if (this.match("{")) specifiers = specifiers.concat(this.parseNamedImports());
					else this.throwUnexpectedToken(this.lookahead);
				}
			} else this.throwUnexpectedToken(this.nextToken());
			if (!this.matchContextualKeyword("from")) {
				const message = this.lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause;
				this.throwError(message, this.lookahead.value);
			}
			this.nextToken();
			src = this.parseModuleSpecifier();
		}
		const attributes = this.parseImportAttributes();
		this.consumeSemicolon();
		return this.finalize(node, new ImportDeclaration(specifiers, src, attributes));
	}
	parseExportSpecifier() {
		const node = this.createNode();
		const local = this.lookahead.type == 8 ? this.parseModuleSpecifier() : this.parseIdentifierName();
		let exported = local;
		if (this.matchContextualKeyword("as")) {
			if (this.lookahead.escaped) this.throwError(Messages.NoAsAndFromEscapeSequences);
			this.nextToken();
			exported = this.lookahead.type == 8 ? this.parseModuleSpecifier() : this.parseIdentifierName();
		}
		return this.finalize(node, new ExportSpecifier(local, exported));
	}
	parseExportDeclaration() {
		if (this.context.inFunctionBody) this.throwError(Messages.IllegalExportDeclaration);
		const node = this.createNode();
		this.expectKeyword("export");
		let exportDeclaration;
		if (this.matchKeyword("default")) {
			this.nextToken();
			if (this.matchKeyword("function")) {
				const declaration = this.parseFunctionDeclaration(true);
				exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
			} else if (this.matchKeyword("class")) {
				const declaration = this.parseClassDeclaration(true);
				exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
			} else if (this.matchContextualKeyword("async")) {
				const declaration = this.matchAsyncFunction() ? this.parseFunctionDeclaration(true) : this.parseAssignmentExpression();
				exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
			} else {
				if (this.matchContextualKeyword("from")) this.throwError(Messages.UnexpectedToken, this.lookahead.value);
				const declaration = this.match("{") ? this.parseObjectInitializer() : this.match("[") ? this.parseArrayInitializer() : this.parseAssignmentExpression();
				this.consumeSemicolon();
				exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
			}
		} else if (this.match("*")) {
			this.nextToken();
			let exported = null;
			if (this.matchContextualKeyword("as")) {
				if (this.lookahead.escaped) this.throwError(Messages.NoAsAndFromEscapeSequences);
				this.nextToken();
				exported = this.lookahead.type == 8 ? this.parseModuleSpecifier() : this.parseIdentifierName();
			}
			if (!this.matchContextualKeyword("from")) {
				const message = this.lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause;
				this.throwError(message, this.lookahead.value);
			}
			if (this.lookahead.escaped) this.throwError(Messages.NoAsAndFromEscapeSequences);
			this.nextToken();
			const src = this.parseModuleSpecifier();
			const attributes = this.parseImportAttributes();
			this.consumeSemicolon();
			exportDeclaration = this.finalize(node, new ExportAllDeclaration(src, exported, attributes));
		} else if (this.lookahead.type === 4) {
			let declaration;
			switch (this.lookahead.value) {
				case "let":
				case "const":
					declaration = this.parseLexicalDeclaration({ inFor: false });
					break;
				case "var":
				case "class":
				case "function":
					declaration = this.parseStatementListItem();
					break;
				default: this.throwUnexpectedToken(this.lookahead);
			}
			exportDeclaration = this.finalize(node, new ExportNamedDeclaration(declaration, [], null, null));
		} else if (this.matchAsyncFunction()) {
			const declaration = this.parseFunctionDeclaration();
			exportDeclaration = this.finalize(node, new ExportNamedDeclaration(declaration, [], null, null));
		} else {
			const specifiers = [];
			let source = null;
			let isExportFromIdentifier = false;
			let attributes = null;
			this.expect("{");
			while (!this.match("}")) {
				isExportFromIdentifier = isExportFromIdentifier || this.matchKeyword("default");
				specifiers.push(this.parseExportSpecifier());
				if (!this.match("}")) this.expect(",");
			}
			this.expect("}");
			if (this.matchContextualKeyword("from")) {
				if (this.lookahead.escaped) this.throwError(Messages.NoAsAndFromEscapeSequences);
				this.nextToken();
				source = this.parseModuleSpecifier();
				attributes = this.parseImportAttributes();
				this.consumeSemicolon();
			} else if (isExportFromIdentifier) {
				const message = this.lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause;
				this.throwError(message, this.lookahead.value);
			} else {
				attributes = this.parseImportAttributes();
				this.consumeSemicolon();
			}
			exportDeclaration = this.finalize(node, new ExportNamedDeclaration(null, specifiers, source, attributes));
		}
		return exportDeclaration;
	}
};
const XHTMLEntities = {
	quot: "\"",
	amp: "&",
	apos: "'",
	gt: ">",
	nbsp: "\xA0",
	iexcl: "¡",
	cent: "¢",
	pound: "£",
	curren: "¤",
	yen: "¥",
	brvbar: "¦",
	sect: "§",
	uml: "¨",
	copy: "©",
	ordf: "ª",
	laquo: "«",
	not: "¬",
	shy: "­",
	reg: "®",
	macr: "¯",
	deg: "°",
	plusmn: "±",
	sup2: "²",
	sup3: "³",
	acute: "´",
	micro: "µ",
	para: "¶",
	middot: "·",
	cedil: "¸",
	sup1: "¹",
	ordm: "º",
	raquo: "»",
	frac14: "¼",
	frac12: "½",
	frac34: "¾",
	iquest: "¿",
	Agrave: "À",
	Aacute: "Á",
	Acirc: "Â",
	Atilde: "Ã",
	Auml: "Ä",
	Aring: "Å",
	AElig: "Æ",
	Ccedil: "Ç",
	Egrave: "È",
	Eacute: "É",
	Ecirc: "Ê",
	Euml: "Ë",
	Igrave: "Ì",
	Iacute: "Í",
	Icirc: "Î",
	Iuml: "Ï",
	ETH: "Ð",
	Ntilde: "Ñ",
	Ograve: "Ò",
	Oacute: "Ó",
	Ocirc: "Ô",
	Otilde: "Õ",
	Ouml: "Ö",
	times: "×",
	Oslash: "Ø",
	Ugrave: "Ù",
	Uacute: "Ú",
	Ucirc: "Û",
	Uuml: "Ü",
	Yacute: "Ý",
	THORN: "Þ",
	szlig: "ß",
	agrave: "à",
	aacute: "á",
	acirc: "â",
	atilde: "ã",
	auml: "ä",
	aring: "å",
	aelig: "æ",
	ccedil: "ç",
	egrave: "è",
	eacute: "é",
	ecirc: "ê",
	euml: "ë",
	igrave: "ì",
	iacute: "í",
	icirc: "î",
	iuml: "ï",
	eth: "ð",
	ntilde: "ñ",
	ograve: "ò",
	oacute: "ó",
	ocirc: "ô",
	otilde: "õ",
	ouml: "ö",
	divide: "÷",
	oslash: "ø",
	ugrave: "ù",
	uacute: "ú",
	ucirc: "û",
	uuml: "ü",
	yacute: "ý",
	thorn: "þ",
	yuml: "ÿ",
	OElig: "Œ",
	oelig: "œ",
	Scaron: "Š",
	scaron: "š",
	Yuml: "Ÿ",
	fnof: "ƒ",
	circ: "ˆ",
	tilde: "˜",
	Alpha: "Α",
	Beta: "Β",
	Gamma: "Γ",
	Delta: "Δ",
	Epsilon: "Ε",
	Zeta: "Ζ",
	Eta: "Η",
	Theta: "Θ",
	Iota: "Ι",
	Kappa: "Κ",
	Lambda: "Λ",
	Mu: "Μ",
	Nu: "Ν",
	Xi: "Ξ",
	Omicron: "Ο",
	Pi: "Π",
	Rho: "Ρ",
	Sigma: "Σ",
	Tau: "Τ",
	Upsilon: "Υ",
	Phi: "Φ",
	Chi: "Χ",
	Psi: "Ψ",
	Omega: "Ω",
	alpha: "α",
	beta: "β",
	gamma: "γ",
	delta: "δ",
	epsilon: "ε",
	zeta: "ζ",
	eta: "η",
	theta: "θ",
	iota: "ι",
	kappa: "κ",
	lambda: "λ",
	mu: "μ",
	nu: "ν",
	xi: "ξ",
	omicron: "ο",
	pi: "π",
	rho: "ρ",
	sigmaf: "ς",
	sigma: "σ",
	tau: "τ",
	upsilon: "υ",
	phi: "φ",
	chi: "χ",
	psi: "ψ",
	omega: "ω",
	thetasym: "ϑ",
	upsih: "ϒ",
	piv: "ϖ",
	ensp: " ",
	emsp: " ",
	thinsp: " ",
	zwnj: "‌",
	zwj: "‍",
	lrm: "‎",
	rlm: "‏",
	ndash: "–",
	mdash: "—",
	lsquo: "‘",
	rsquo: "’",
	sbquo: "‚",
	ldquo: "“",
	rdquo: "”",
	bdquo: "„",
	dagger: "†",
	Dagger: "‡",
	bull: "•",
	hellip: "…",
	permil: "‰",
	prime: "′",
	Prime: "″",
	lsaquo: "‹",
	rsaquo: "›",
	oline: "‾",
	frasl: "⁄",
	euro: "€",
	image: "ℑ",
	weierp: "℘",
	real: "ℜ",
	trade: "™",
	alefsym: "ℵ",
	larr: "←",
	uarr: "↑",
	rarr: "→",
	darr: "↓",
	harr: "↔",
	crarr: "↵",
	lArr: "⇐",
	uArr: "⇑",
	rArr: "⇒",
	dArr: "⇓",
	hArr: "⇔",
	forall: "∀",
	part: "∂",
	exist: "∃",
	empty: "∅",
	nabla: "∇",
	isin: "∈",
	notin: "∉",
	ni: "∋",
	prod: "∏",
	sum: "∑",
	minus: "−",
	lowast: "∗",
	radic: "√",
	prop: "∝",
	infin: "∞",
	ang: "∠",
	and: "∧",
	or: "∨",
	cap: "∩",
	cup: "∪",
	int: "∫",
	there4: "∴",
	sim: "∼",
	cong: "≅",
	asymp: "≈",
	ne: "≠",
	equiv: "≡",
	le: "≤",
	ge: "≥",
	sub: "⊂",
	sup: "⊃",
	nsub: "⊄",
	sube: "⊆",
	supe: "⊇",
	oplus: "⊕",
	otimes: "⊗",
	perp: "⊥",
	sdot: "⋅",
	lceil: "⌈",
	rceil: "⌉",
	lfloor: "⌊",
	rfloor: "⌋",
	loz: "◊",
	spades: "♠",
	clubs: "♣",
	hearts: "♥",
	diams: "♦",
	lang: "⟨",
	rang: "⟩"
};
TokenName[100] = "JSXIdentifier";
TokenName[101] = "JSXText";
function getQualifiedElementName(elementName) {
	let qualifiedName;
	switch (elementName.type) {
		case JSXSyntax.JSXIdentifier:
			qualifiedName = elementName.name;
			break;
		case JSXSyntax.JSXNamespacedName:
			const ns = elementName;
			qualifiedName = getQualifiedElementName(ns.namespace) + ":" + getQualifiedElementName(ns.name);
			break;
		case JSXSyntax.JSXMemberExpression:
			const expr = elementName;
			qualifiedName = getQualifiedElementName(expr.object) + "." + getQualifiedElementName(expr.property);
	}
	return qualifiedName;
}
var JSXParser = class extends Parser {
	constructor(code, options, delegate) {
		super(code, options, delegate);
	}
	parsePrimaryExpression() {
		return this.match("<") ? this.parseJSXRoot() : super.parsePrimaryExpression();
	}
	startJSX() {
		this.scanner.index = this.startMarker.index;
		this.scanner.lineNumber = this.startMarker.line;
		this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
	}
	finishJSX() {
		this.nextToken();
	}
	reenterJSX() {
		this.startJSX();
		this.expectJSX("}");
		if (this.config.tokens) this.tokens.pop();
	}
	createJSXNode() {
		this.collectComments();
		return {
			index: this.scanner.index,
			line: this.scanner.lineNumber,
			column: this.scanner.index - this.scanner.lineStart
		};
	}
	createJSXChildNode() {
		return {
			index: this.scanner.index,
			line: this.scanner.lineNumber,
			column: this.scanner.index - this.scanner.lineStart
		};
	}
	scanXHTMLEntity(quote) {
		let result = "&";
		let valid = true;
		let terminated = false;
		let numeric = false;
		let hex = false;
		while (!this.scanner.eof() && valid && !terminated) {
			const ch = this.scanner.source[this.scanner.index];
			if (ch === quote) break;
			terminated = ch === ";";
			result += ch;
			++this.scanner.index;
			if (!terminated) switch (result.length) {
				case 2:
					numeric = ch === "#";
					break;
				case 3:
					if (numeric) {
						hex = ch === "x";
						valid = hex || Character.isDecimalDigit(ch.charCodeAt(0));
						numeric = numeric && !hex;
					}
					break;
				default:
					valid = valid && !(numeric && !Character.isDecimalDigit(ch.charCodeAt(0)));
					valid = valid && !(hex && !Character.isHexDigit(ch.charCodeAt(0)));
			}
		}
		if (valid && terminated && result.length > 2) {
			const str = result.substr(1, result.length - 2);
			if (numeric && str.length > 1) result = String.fromCharCode(parseInt(str.substr(1), 10));
			else if (hex && str.length > 2) result = String.fromCharCode(parseInt("0" + str.substr(1), 16));
			else if (!numeric && !hex && XHTMLEntities[str]) result = XHTMLEntities[str];
		}
		return result;
	}
	lexJSX() {
		const cp = this.scanner.source.charCodeAt(this.scanner.index);
		if (cp === 60 || cp === 62 || cp === 47 || cp === 58 || cp === 61 || cp === 123 || cp === 125) return {
			type: 7,
			value: this.scanner.source[this.scanner.index++],
			lineNumber: this.scanner.lineNumber,
			lineStart: this.scanner.lineStart,
			start: this.scanner.index - 1,
			end: this.scanner.index
		};
		if (cp === 34 || cp === 39) {
			const start = this.scanner.index;
			const quote = this.scanner.source[this.scanner.index++];
			let str = "";
			while (!this.scanner.eof()) {
				const ch = this.scanner.source[this.scanner.index++];
				if (ch === quote) break;
				else if (ch === "&") str += this.scanXHTMLEntity(quote);
				else str += ch;
			}
			return {
				type: 8,
				value: str,
				lineNumber: this.scanner.lineNumber,
				lineStart: this.scanner.lineStart,
				start,
				end: this.scanner.index
			};
		}
		if (cp === 46) {
			const n1 = this.scanner.source.charCodeAt(this.scanner.index + 1);
			const n2 = this.scanner.source.charCodeAt(this.scanner.index + 2);
			const value = n1 === 46 && n2 === 46 ? "..." : ".";
			const start = this.scanner.index;
			this.scanner.index += value.length;
			return {
				type: 7,
				value,
				lineNumber: this.scanner.lineNumber,
				lineStart: this.scanner.lineStart,
				start,
				end: this.scanner.index
			};
		}
		if (cp === 96) return {
			type: 10,
			value: "",
			lineNumber: this.scanner.lineNumber,
			lineStart: this.scanner.lineStart,
			start: this.scanner.index,
			end: this.scanner.index
		};
		if (Character.isIdentifierStart(cp) && cp !== 92) {
			const start = this.scanner.index;
			++this.scanner.index;
			while (!this.scanner.eof()) {
				const ch = this.scanner.source.charCodeAt(this.scanner.index);
				if (Character.isIdentifierPart(ch) && ch !== 92) ++this.scanner.index;
				else if (ch === 45) ++this.scanner.index;
				else break;
			}
			return {
				type: 100,
				value: this.scanner.source.slice(start, this.scanner.index),
				lineNumber: this.scanner.lineNumber,
				lineStart: this.scanner.lineStart,
				start,
				end: this.scanner.index
			};
		}
		return this.scanner.lex();
	}
	nextJSXToken() {
		this.collectComments();
		this.startMarker.index = this.scanner.index;
		this.startMarker.line = this.scanner.lineNumber;
		this.startMarker.column = this.scanner.index - this.scanner.lineStart;
		const token = this.lexJSX();
		this.lastMarker.index = this.scanner.index;
		this.lastMarker.line = this.scanner.lineNumber;
		this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
		if (this.config.tokens) this.tokens.push(this.convertToken(token));
		return token;
	}
	nextJSXText() {
		this.startMarker.index = this.scanner.index;
		this.startMarker.line = this.scanner.lineNumber;
		this.startMarker.column = this.scanner.index - this.scanner.lineStart;
		const start = this.scanner.index;
		let text = "";
		while (!this.scanner.eof()) {
			const ch = this.scanner.source[this.scanner.index];
			if (ch === "{" || ch === "<") break;
			++this.scanner.index;
			text += ch;
			if (Character.isLineTerminator(ch.charCodeAt(0))) {
				++this.scanner.lineNumber;
				if (ch === "\r" && this.scanner.source[this.scanner.index] === "\n") ++this.scanner.index;
				this.scanner.lineStart = this.scanner.index;
			}
		}
		this.lastMarker.index = this.scanner.index;
		this.lastMarker.line = this.scanner.lineNumber;
		this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
		const token = {
			type: 101,
			value: text,
			lineNumber: this.scanner.lineNumber,
			lineStart: this.scanner.lineStart,
			start,
			end: this.scanner.index
		};
		if (text.length > 0 && this.config.tokens) this.tokens.push(this.convertToken(token));
		return token;
	}
	peekJSXToken() {
		const state = this.scanner.saveState();
		this.scanner.scanComments();
		const next = this.lexJSX();
		this.scanner.restoreState(state);
		return next;
	}
	expectJSX(value) {
		const token = this.nextJSXToken();
		if (token.type !== 7 || token.value !== value) this.throwUnexpectedToken(token);
	}
	matchJSX(value) {
		const next = this.peekJSXToken();
		return next.type === 7 && next.value === value;
	}
	parseJSXIdentifier() {
		const node = this.createJSXNode();
		const token = this.nextJSXToken();
		if (token.type !== 100) this.throwUnexpectedToken(token);
		return this.finalize(node, new JSXIdentifier(token.value));
	}
	parseJSXElementName() {
		const node = this.createJSXNode();
		let elementName = this.parseJSXIdentifier();
		if (this.matchJSX(":")) {
			const namespace = elementName;
			this.expectJSX(":");
			const name = this.parseJSXIdentifier();
			elementName = this.finalize(node, new JSXNamespacedName(namespace, name));
		} else if (this.matchJSX(".")) while (this.matchJSX(".")) {
			const object = elementName;
			this.expectJSX(".");
			const property = this.parseJSXIdentifier();
			elementName = this.finalize(node, new JSXMemberExpression(object, property));
		}
		return elementName;
	}
	parseJSXAttributeName() {
		const node = this.createJSXNode();
		let attributeName;
		const identifier = this.parseJSXIdentifier();
		if (this.matchJSX(":")) {
			const namespace = identifier;
			this.expectJSX(":");
			const name = this.parseJSXIdentifier();
			attributeName = this.finalize(node, new JSXNamespacedName(namespace, name));
		} else attributeName = identifier;
		return attributeName;
	}
	parseJSXStringLiteralAttribute() {
		const node = this.createJSXNode();
		const token = this.nextJSXToken();
		if (token.type !== 8) this.throwUnexpectedToken(token);
		const raw = this.getTokenRaw(token);
		return this.finalize(node, new Literal(token.value, raw));
	}
	parseJSXExpressionAttribute() {
		const node = this.createJSXNode();
		this.expectJSX("{");
		this.finishJSX();
		if (this.match("}")) this.tolerateError("JSX attributes must only be assigned a non-empty expression");
		const expression = this.parseAssignmentExpression();
		this.reenterJSX();
		return this.finalize(node, new JSXExpressionContainer(expression));
	}
	parseJSXAttributeValue() {
		return this.matchJSX("{") ? this.parseJSXExpressionAttribute() : this.matchJSX("<") ? this.parseJSXElement() : this.parseJSXStringLiteralAttribute();
	}
	parseJSXNameValueAttribute() {
		const node = this.createJSXNode();
		const name = this.parseJSXAttributeName();
		let value = null;
		if (this.matchJSX("=")) {
			this.expectJSX("=");
			value = this.parseJSXAttributeValue();
		}
		return this.finalize(node, new JSXAttribute(name, value));
	}
	parseJSXSpreadAttribute() {
		const node = this.createJSXNode();
		this.expectJSX("{");
		this.expectJSX("...");
		this.finishJSX();
		const argument = this.parseAssignmentExpression();
		this.reenterJSX();
		return this.finalize(node, new JSXSpreadAttribute(argument));
	}
	parseJSXAttributes() {
		const attributes = [];
		while (!this.matchJSX("/") && !this.matchJSX(">")) {
			const attribute = this.matchJSX("{") ? this.parseJSXSpreadAttribute() : this.parseJSXNameValueAttribute();
			attributes.push(attribute);
		}
		return attributes;
	}
	parseJSXOpeningElement() {
		const node = this.createJSXNode();
		this.expectJSX("<");
		if (this.matchJSX(">")) {
			this.expectJSX(">");
			return this.finalize(node, new JSXOpeningFragment(false));
		}
		const name = this.parseJSXElementName();
		const attributes = this.parseJSXAttributes();
		const selfClosing = this.matchJSX("/");
		if (selfClosing) this.expectJSX("/");
		this.expectJSX(">");
		return this.finalize(node, new JSXOpeningElement(name, selfClosing, attributes));
	}
	parseJSXBoundaryElement() {
		const node = this.createJSXNode();
		this.expectJSX("<");
		if (this.matchJSX("/")) {
			this.expectJSX("/");
			if (this.matchJSX(">")) {
				this.expectJSX(">");
				return this.finalize(node, new JSXClosingFragment());
			}
			const elementName = this.parseJSXElementName();
			this.expectJSX(">");
			return this.finalize(node, new JSXClosingElement(elementName));
		}
		const name = this.parseJSXElementName();
		const attributes = this.parseJSXAttributes();
		const selfClosing = this.matchJSX("/");
		if (selfClosing) this.expectJSX("/");
		this.expectJSX(">");
		return this.finalize(node, new JSXOpeningElement(name, selfClosing, attributes));
	}
	parseJSXEmptyExpression() {
		const node = this.createJSXChildNode();
		this.collectComments();
		this.lastMarker.index = this.scanner.index;
		this.lastMarker.line = this.scanner.lineNumber;
		this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
		return this.finalize(node, new JSXEmptyExpression());
	}
	parseJSXExpressionContainer() {
		const node = this.createJSXNode();
		this.expectJSX("{");
		let expression;
		if (this.matchJSX("}")) {
			expression = this.parseJSXEmptyExpression();
			this.expectJSX("}");
		} else {
			this.finishJSX();
			expression = this.parseAssignmentExpression();
			this.reenterJSX();
		}
		return this.finalize(node, new JSXExpressionContainer(expression));
	}
	parseJSXChildren() {
		const children = [];
		while (!this.scanner.eof()) {
			const node = this.createJSXChildNode();
			const token = this.nextJSXText();
			if (token.start < token.end) {
				const raw = this.getTokenRaw(token);
				const child = this.finalize(node, new JSXText(token.value, raw));
				children.push(child);
			}
			if (this.scanner.source[this.scanner.index] === "{") {
				const container = this.parseJSXExpressionContainer();
				children.push(container);
			} else break;
		}
		return children;
	}
	parseComplexJSXElement(el) {
		const stack = [];
		while (!this.scanner.eof()) {
			el.children = el.children.concat(this.parseJSXChildren());
			const node = this.createJSXChildNode();
			const element = this.parseJSXBoundaryElement();
			if (element.type === JSXSyntax.JSXOpeningElement) {
				const opening = element;
				if (opening.selfClosing) {
					const child = this.finalize(node, new JSXElement(opening, [], null));
					el.children.push(child);
				} else {
					stack.push(el);
					el = {
						node,
						opening,
						closing: null,
						children: []
					};
				}
			}
			if (element.type === JSXSyntax.JSXClosingElement) {
				el.closing = element;
				const open = getQualifiedElementName(el.opening.name);
				if (open !== getQualifiedElementName(el.closing.name)) this.tolerateError("Expected corresponding JSX closing tag for %0", open);
				if (stack.length > 0) {
					const child = this.finalize(el.node, new JSXElement(el.opening, el.children, el.closing));
					el = stack[stack.length - 1];
					el.children.push(child);
					stack.pop();
				} else break;
			}
			if (element.type === JSXSyntax.JSXClosingFragment) {
				el.closing = element;
				if (el.opening.type !== JSXSyntax.JSXOpeningFragment) this.tolerateError("Expected corresponding JSX closing tag for jsx fragment");
				else break;
			}
		}
		return el;
	}
	parseJSXElement() {
		const node = this.createJSXNode();
		const opening = this.parseJSXOpeningElement();
		let children = [];
		let closing = null;
		if (!opening.selfClosing) {
			const el = this.parseComplexJSXElement({
				node,
				opening,
				closing,
				children
			});
			children = el.children;
			closing = el.closing;
		}
		return this.finalize(node, new JSXElement(opening, children, closing));
	}
	parseJSXRoot() {
		if (this.config.tokens) this.tokens.pop();
		this.startJSX();
		const element = this.parseJSXElement();
		this.finishJSX();
		return element;
	}
	isStartOfExpression() {
		return super.isStartOfExpression() || this.match("<");
	}
};
function parse(code, options, delegate) {
	let commentHandler = null;
	const proxyDelegate = (node, metadata) => {
		if (delegate) delegate(node, metadata);
		if (commentHandler) commentHandler.visit(node, metadata);
	};
	let parserDelegate = typeof delegate === "function" ? proxyDelegate : null;
	let collectComment = false;
	if (options) {
		collectComment = typeof options.comment === "boolean" && options.comment;
		const attachComment = typeof options.attachComment === "boolean" && options.attachComment;
		if (collectComment || attachComment) {
			commentHandler = new CommentHandler();
			commentHandler.attach = attachComment;
			options.comment = true;
			parserDelegate = proxyDelegate;
		}
	}
	let isModule = false;
	if (options && typeof options.sourceType === "string") isModule = options.sourceType === "module";
	let parser;
	if (options && typeof options.jsx === "boolean" && options.jsx) parser = new JSXParser(code, options, parserDelegate);
	else parser = new Parser(code, options, parserDelegate);
	const ast = isModule ? parser.parseModule() : parser.parseScript();
	if (collectComment && commentHandler) ast.comments = commentHandler.comments;
	if (parser.config.tokens) ast.tokens = parser.tokens;
	if (parser.config.tolerant) ast.errors = parser.errorHandler.errors;
	return ast;
}
//#endregion
//#region ../../../node_modules/.pnpm/form-data@4.0.6/node_modules/form-data/lib/browser.js
var require_browser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof self === "object" ? self.FormData : window.FormData;
}));
//#endregion
//#region ../../../node_modules/.pnpm/jsonrepair@3.13.2/node_modules/jsonrepair/lib/esm/utils/JSONRepairError.js
var JSONRepairError = class extends Error {
	constructor(message, position) {
		super(`${message} at position ${position}`);
		this.position = position;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/jsonrepair@3.13.2/node_modules/jsonrepair/lib/esm/utils/stringUtils.js
const codeSpace = 32;
const codeNewline = 10;
const codeTab = 9;
const codeReturn = 13;
const codeNonBreakingSpace = 160;
const codeEnQuad = 8192;
const codeHairSpace = 8202;
const codeNarrowNoBreakSpace = 8239;
const codeMediumMathematicalSpace = 8287;
const codeIdeographicSpace = 12288;
function isHex(char) {
	return /^[0-9A-Fa-f]$/.test(char);
}
function isDigit(char) {
	return char >= "0" && char <= "9";
}
function isValidStringCharacter(char) {
	return char >= " ";
}
function isDelimiter(char) {
	return ",:[]/{}()\n+".includes(char);
}
function isFunctionNameCharStart(char) {
	return char >= "a" && char <= "z" || char >= "A" && char <= "Z" || char === "_" || char === "$";
}
function isFunctionNameChar(char) {
	return char >= "a" && char <= "z" || char >= "A" && char <= "Z" || char === "_" || char === "$" || char >= "0" && char <= "9";
}
const regexUrlStart = /^(http|https|ftp|mailto|file|data|irc):\/\/$/;
const regexUrlChar = /^[A-Za-z0-9-._~:/?#@!$&'()*+;=]$/;
function isUnquotedStringDelimiter(char) {
	return ",[]/{}\n+".includes(char);
}
function isStartOfValue(char) {
	return isQuote(char) || regexStartOfValue.test(char);
}
const regexStartOfValue = /^[[{\w-]$/;
function isControlCharacter(char) {
	return char === "\n" || char === "\r" || char === "	" || char === "\b" || char === "\f";
}
/**
* Check if the given character is a whitespace character like space, tab, or
* newline
*/
function isWhitespace(text, index) {
	const code = text.charCodeAt(index);
	return code === codeSpace || code === codeNewline || code === codeTab || code === codeReturn;
}
/**
* Check if the given character is a whitespace character like space or tab,
* but NOT a newline
*/
function isWhitespaceExceptNewline(text, index) {
	const code = text.charCodeAt(index);
	return code === codeSpace || code === codeTab || code === codeReturn;
}
/**
* Check if the given character is a special whitespace character, some
* unicode variant
*/
function isSpecialWhitespace(text, index) {
	const code = text.charCodeAt(index);
	return code === codeNonBreakingSpace || code >= codeEnQuad && code <= codeHairSpace || code === codeNarrowNoBreakSpace || code === codeMediumMathematicalSpace || code === codeIdeographicSpace;
}
/**
* Test whether the given character is a quote or double quote character.
* Also tests for special variants of quotes.
*/
function isQuote(char) {
	return isDoubleQuoteLike(char) || isSingleQuoteLike(char);
}
/**
* Test whether the given character is a double quote character.
* Also tests for special variants of double quotes.
*/
function isDoubleQuoteLike(char) {
	return char === "\"" || char === "“" || char === "”";
}
/**
* Test whether the given character is a double quote character.
* Does NOT test for special variants of double quotes.
*/
function isDoubleQuote(char) {
	return char === "\"";
}
/**
* Test whether the given character is a single quote character.
* Also tests for special variants of single quotes.
*/
function isSingleQuoteLike(char) {
	return char === "'" || char === "‘" || char === "’" || char === "`" || char === "´";
}
/**
* Test whether the given character is a single quote character.
* Does NOT test for special variants of single quotes.
*/
function isSingleQuote(char) {
	return char === "'";
}
/**
* Strip last occurrence of textToStrip from text
*/
function stripLastOccurrence(text, textToStrip) {
	let stripRemainingText = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
	const index = text.lastIndexOf(textToStrip);
	return index !== -1 ? text.substring(0, index) + (stripRemainingText ? "" : text.substring(index + 1)) : text;
}
function insertBeforeLastWhitespace(text, textToInsert) {
	let index = text.length;
	if (!isWhitespace(text, index - 1)) return text + textToInsert;
	while (isWhitespace(text, index - 1)) index--;
	return text.substring(0, index) + textToInsert + text.substring(index);
}
function removeAtIndex(text, start, count) {
	return text.substring(0, start) + text.substring(start + count);
}
/**
* Test whether a string ends with a newline or comma character and optional whitespace
*/
function endsWithCommaOrNewline(text) {
	return /[,\n][ \t\r]*$/.test(text);
}
//#endregion
//#region ../../../node_modules/.pnpm/jsonrepair@3.13.2/node_modules/jsonrepair/lib/esm/regular/jsonrepair.js
const controlCharacters = {
	"\b": "\\b",
	"\f": "\\f",
	"\n": "\\n",
	"\r": "\\r",
	"	": "\\t"
};
const escapeCharacters = {
	"\"": "\"",
	"\\": "\\",
	"/": "/",
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	"
};
/**
* Repair a string containing an invalid JSON document.
* For example changes JavaScript notation into JSON notation.
*
* Example:
*
*     try {
*       const json = "{name: 'John'}"
*       const repaired = jsonrepair(json)
*       console.log(repaired)
*       // '{"name": "John"}'
*     } catch (err) {
*       console.error(err)
*     }
*
*/
function jsonrepair(text) {
	let i = 0;
	let output = "";
	parseMarkdownCodeBlock([
		"```",
		"[```",
		"{```"
	]);
	if (!parseValue()) throwUnexpectedEnd();
	parseMarkdownCodeBlock([
		"```",
		"```]",
		"```}"
	]);
	const processedComma = parseCharacter(",");
	if (processedComma) parseWhitespaceAndSkipComments();
	if (isStartOfValue(text[i]) && endsWithCommaOrNewline(output)) {
		if (!processedComma) output = insertBeforeLastWhitespace(output, ",");
		parseNewlineDelimitedJSON();
	} else if (processedComma) output = stripLastOccurrence(output, ",");
	while (text[i] === "}" || text[i] === "]") {
		i++;
		parseWhitespaceAndSkipComments();
	}
	if (i >= text.length) return output;
	throwUnexpectedCharacter();
	function parseValue() {
		parseWhitespaceAndSkipComments();
		const processed = parseObject() || parseArray() || parseString() || parseNumber() || parseKeywords() || parseUnquotedString(false) || parseRegex();
		parseWhitespaceAndSkipComments();
		return processed;
	}
	function parseWhitespaceAndSkipComments() {
		let skipNewline = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : true;
		const start = i;
		let changed = parseWhitespace(skipNewline);
		do {
			changed = parseComment();
			if (changed) changed = parseWhitespace(skipNewline);
		} while (changed);
		return i > start;
	}
	function parseWhitespace(skipNewline) {
		const _isWhiteSpace = skipNewline ? isWhitespace : isWhitespaceExceptNewline;
		let whitespace = "";
		while (true) if (_isWhiteSpace(text, i)) {
			whitespace += text[i];
			i++;
		} else if (isSpecialWhitespace(text, i)) {
			whitespace += " ";
			i++;
		} else break;
		if (whitespace.length > 0) {
			output += whitespace;
			return true;
		}
		return false;
	}
	function parseComment() {
		if (text[i] === "/" && text[i + 1] === "*") {
			while (i < text.length && !atEndOfBlockComment(text, i)) i++;
			i += 2;
			return true;
		}
		if (text[i] === "/" && text[i + 1] === "/") {
			while (i < text.length && text[i] !== "\n") i++;
			return true;
		}
		return false;
	}
	function parseMarkdownCodeBlock(blocks) {
		if (skipMarkdownCodeBlock(blocks)) {
			if (isFunctionNameCharStart(text[i])) while (i < text.length && isFunctionNameChar(text[i])) i++;
			parseWhitespaceAndSkipComments();
			return true;
		}
		return false;
	}
	function skipMarkdownCodeBlock(blocks) {
		parseWhitespace(true);
		for (const block of blocks) {
			const end = i + block.length;
			if (text.slice(i, end) === block) {
				i = end;
				return true;
			}
		}
		return false;
	}
	function parseCharacter(char) {
		if (text[i] === char) {
			output += text[i];
			i++;
			return true;
		}
		return false;
	}
	function skipCharacter(char) {
		if (text[i] === char) {
			i++;
			return true;
		}
		return false;
	}
	function skipEscapeCharacter() {
		return skipCharacter("\\");
	}
	/**
	* Skip ellipsis like "[1,2,3,...]" or "[1,2,3,...,9]" or "[...,7,8,9]"
	* or a similar construct in objects.
	*/
	function skipEllipsis() {
		parseWhitespaceAndSkipComments();
		if (text[i] === "." && text[i + 1] === "." && text[i + 2] === ".") {
			i += 3;
			parseWhitespaceAndSkipComments();
			skipCharacter(",");
			return true;
		}
		return false;
	}
	/**
	* Parse an object like '{"key": "value"}'
	*/
	function parseObject() {
		if (text[i] === "{") {
			output += "{";
			i++;
			parseWhitespaceAndSkipComments();
			if (skipCharacter(",")) parseWhitespaceAndSkipComments();
			let initial = true;
			while (i < text.length && text[i] !== "}") {
				let processedComma;
				if (!initial) {
					processedComma = parseCharacter(",");
					if (!processedComma) output = insertBeforeLastWhitespace(output, ",");
					parseWhitespaceAndSkipComments();
				} else {
					processedComma = true;
					initial = false;
				}
				skipEllipsis();
				if (!(parseString() || parseUnquotedString(true))) {
					if (text[i] === "}" || text[i] === "{" || text[i] === "]" || text[i] === "[" || text[i] === void 0) output = stripLastOccurrence(output, ",");
					else throwObjectKeyExpected();
					break;
				}
				parseWhitespaceAndSkipComments();
				const processedColon = parseCharacter(":");
				const truncatedText = i >= text.length;
				if (!processedColon) {
					if (isStartOfValue(text[i]) || truncatedText) output = insertBeforeLastWhitespace(output, ":");
					else throwColonExpected();
				}
				if (!parseValue()) {
					if (processedColon || truncatedText) output += "null";
					else throwColonExpected();
				}
			}
			if (text[i] === "}") {
				output += "}";
				i++;
			} else output = insertBeforeLastWhitespace(output, "}");
			return true;
		}
		return false;
	}
	/**
	* Parse an array like '["item1", "item2", ...]'
	*/
	function parseArray() {
		if (text[i] === "[") {
			output += "[";
			i++;
			parseWhitespaceAndSkipComments();
			if (skipCharacter(",")) parseWhitespaceAndSkipComments();
			let initial = true;
			while (i < text.length && text[i] !== "]") {
				if (!initial) {
					if (!parseCharacter(",")) output = insertBeforeLastWhitespace(output, ",");
				} else initial = false;
				skipEllipsis();
				if (!parseValue()) {
					output = stripLastOccurrence(output, ",");
					break;
				}
			}
			if (text[i] === "]") {
				output += "]";
				i++;
			} else output = insertBeforeLastWhitespace(output, "]");
			return true;
		}
		return false;
	}
	/**
	* Parse and repair Newline Delimited JSON (NDJSON):
	* multiple JSON objects separated by a newline character
	*/
	function parseNewlineDelimitedJSON() {
		let initial = true;
		let processedValue = true;
		while (processedValue) {
			if (!initial) {
				if (!parseCharacter(",")) output = insertBeforeLastWhitespace(output, ",");
			} else initial = false;
			processedValue = parseValue();
		}
		if (!processedValue) output = stripLastOccurrence(output, ",");
		output = `[\n${output}\n]`;
	}
	/**
	* Parse a string enclosed by double quotes "...". Can contain escaped quotes
	* Repair strings enclosed in single quotes or special quotes
	* Repair an escaped string
	*
	* The function can run in two stages:
	* - First, it assumes the string has a valid end quote
	* - If it turns out that the string does not have a valid end quote followed
	*   by a delimiter (which should be the case), the function runs again in a
	*   more conservative way, stopping the string at the first next delimiter
	*   and fixing the string by inserting a quote there, or stopping at a
	*   stop index detected in the first iteration.
	*/
	function parseString() {
		let stopAtDelimiter = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
		let stopAtIndex = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : -1;
		let skipEscapeChars = text[i] === "\\";
		if (skipEscapeChars) {
			i++;
			skipEscapeChars = true;
		}
		if (isQuote(text[i])) {
			const isEndQuote = isDoubleQuote(text[i]) ? isDoubleQuote : isSingleQuote(text[i]) ? isSingleQuote : isSingleQuoteLike(text[i]) ? isSingleQuoteLike : isDoubleQuoteLike;
			const iBefore = i;
			const oBefore = output.length;
			let str = "\"";
			i++;
			while (true) {
				if (i >= text.length) {
					const iPrev = prevNonWhitespaceIndex(i - 1);
					if (!stopAtDelimiter && isDelimiter(text.charAt(iPrev))) {
						i = iBefore;
						output = output.substring(0, oBefore);
						return parseString(true);
					}
					str = insertBeforeLastWhitespace(str, "\"");
					output += str;
					return true;
				}
				if (i === stopAtIndex) {
					str = insertBeforeLastWhitespace(str, "\"");
					output += str;
					return true;
				}
				if (isEndQuote(text[i])) {
					const iQuote = i;
					const oQuote = str.length;
					str += "\"";
					i++;
					output += str;
					parseWhitespaceAndSkipComments(false);
					if (stopAtDelimiter || i >= text.length || isDelimiter(text[i]) || isQuote(text[i]) || isDigit(text[i])) {
						parseConcatenatedString();
						return true;
					}
					const iPrevChar = prevNonWhitespaceIndex(iQuote - 1);
					const prevChar = text.charAt(iPrevChar);
					if (prevChar === ",") {
						i = iBefore;
						output = output.substring(0, oBefore);
						return parseString(false, iPrevChar);
					}
					if (isDelimiter(prevChar)) {
						i = iBefore;
						output = output.substring(0, oBefore);
						return parseString(true);
					}
					output = output.substring(0, oBefore);
					i = iQuote + 1;
					str = `${str.substring(0, oQuote)}\\${str.substring(oQuote)}`;
				} else if (stopAtDelimiter && isUnquotedStringDelimiter(text[i])) {
					if (text[i - 1] === ":" && regexUrlStart.test(text.substring(iBefore + 1, i + 2))) while (i < text.length && regexUrlChar.test(text[i])) {
						str += text[i];
						i++;
					}
					str = insertBeforeLastWhitespace(str, "\"");
					output += str;
					parseConcatenatedString();
					return true;
				} else if (text[i] === "\\") {
					const char = text.charAt(i + 1);
					if (escapeCharacters[char] !== void 0) {
						str += text.slice(i, i + 2);
						i += 2;
					} else if (char === "u") {
						let j = 2;
						while (j < 6 && isHex(text[i + j])) j++;
						if (j === 6) {
							str += text.slice(i, i + 6);
							i += 6;
						} else if (i + j >= text.length) i = text.length;
						else throwInvalidUnicodeCharacter();
					} else {
						str += char;
						i += 2;
					}
				} else {
					const char = text.charAt(i);
					if (char === "\"" && text[i - 1] !== "\\") {
						str += `\\${char}`;
						i++;
					} else if (isControlCharacter(char)) {
						str += controlCharacters[char];
						i++;
					} else {
						if (!isValidStringCharacter(char)) throwInvalidCharacter(char);
						str += char;
						i++;
					}
				}
				if (skipEscapeChars) skipEscapeCharacter();
			}
		}
		return false;
	}
	/**
	* Repair concatenated strings like "hello" + "world", change this into "helloworld"
	*/
	function parseConcatenatedString() {
		let processed = false;
		parseWhitespaceAndSkipComments();
		while (text[i] === "+") {
			processed = true;
			i++;
			parseWhitespaceAndSkipComments();
			output = stripLastOccurrence(output, "\"", true);
			const start = output.length;
			if (parseString()) output = removeAtIndex(output, start, 1);
			else output = insertBeforeLastWhitespace(output, "\"");
		}
		return processed;
	}
	/**
	* Parse a number like 2.4 or 2.4e6
	*/
	function parseNumber() {
		const start = i;
		if (text[i] === "-") {
			i++;
			if (atEndOfNumber()) {
				repairNumberEndingWithNumericSymbol(start);
				return true;
			}
			if (!isDigit(text[i])) {
				i = start;
				return false;
			}
		}
		while (isDigit(text[i])) i++;
		if (text[i] === ".") {
			i++;
			if (atEndOfNumber()) {
				repairNumberEndingWithNumericSymbol(start);
				return true;
			}
			if (!isDigit(text[i])) {
				i = start;
				return false;
			}
			while (isDigit(text[i])) i++;
		}
		if (text[i] === "e" || text[i] === "E") {
			i++;
			if (text[i] === "-" || text[i] === "+") i++;
			if (atEndOfNumber()) {
				repairNumberEndingWithNumericSymbol(start);
				return true;
			}
			if (!isDigit(text[i])) {
				i = start;
				return false;
			}
			while (isDigit(text[i])) i++;
		}
		if (!atEndOfNumber()) {
			i = start;
			return false;
		}
		if (i > start) {
			const num = text.slice(start, i);
			const hasInvalidLeadingZero = /^0\d/.test(num);
			output += hasInvalidLeadingZero ? `"${num}"` : num;
			return true;
		}
		return false;
	}
	/**
	* Parse keywords true, false, null
	* Repair Python keywords True, False, None
	*/
	function parseKeywords() {
		return parseKeyword("true", "true") || parseKeyword("false", "false") || parseKeyword("null", "null") || parseKeyword("True", "true") || parseKeyword("False", "false") || parseKeyword("None", "null");
	}
	function parseKeyword(name, value) {
		if (text.slice(i, i + name.length) === name) {
			output += value;
			i += name.length;
			return true;
		}
		return false;
	}
	/**
	* Repair an unquoted string by adding quotes around it
	* Repair a MongoDB function call like NumberLong("2")
	* Repair a JSONP function call like callback({...});
	*/
	function parseUnquotedString(isKey) {
		const start = i;
		if (isFunctionNameCharStart(text[i])) {
			while (i < text.length && isFunctionNameChar(text[i])) i++;
			let j = i;
			while (isWhitespace(text, j)) j++;
			if (text[j] === "(") {
				i = j + 1;
				parseValue();
				if (text[i] === ")") {
					i++;
					if (text[i] === ";") i++;
				}
				return true;
			}
		}
		while (i < text.length && !isUnquotedStringDelimiter(text[i]) && !isQuote(text[i]) && (!isKey || text[i] !== ":")) i++;
		if (text[i - 1] === ":" && regexUrlStart.test(text.substring(start, i + 2))) while (i < text.length && regexUrlChar.test(text[i])) i++;
		if (i > start) {
			while (isWhitespace(text, i - 1) && i > 0) i--;
			const symbol = text.slice(start, i);
			output += symbol === "undefined" ? "null" : JSON.stringify(symbol);
			if (text[i] === "\"") i++;
			return true;
		}
	}
	function parseRegex() {
		if (text[i] === "/") {
			const start = i;
			i++;
			while (i < text.length && (text[i] !== "/" || text[i - 1] === "\\")) i++;
			i++;
			output += JSON.stringify(text.substring(start, i));
			return true;
		}
	}
	function prevNonWhitespaceIndex(start) {
		let prev = start;
		while (prev > 0 && isWhitespace(text, prev)) prev--;
		return prev;
	}
	function atEndOfNumber() {
		return i >= text.length || isDelimiter(text[i]) || isWhitespace(text, i);
	}
	function repairNumberEndingWithNumericSymbol(start) {
		output += `${text.slice(start, i)}0`;
	}
	function throwInvalidCharacter(char) {
		throw new JSONRepairError(`Invalid character ${JSON.stringify(char)}`, i);
	}
	function throwUnexpectedCharacter() {
		throw new JSONRepairError(`Unexpected character ${JSON.stringify(text[i])}`, i);
	}
	function throwUnexpectedEnd() {
		throw new JSONRepairError("Unexpected end of json string", text.length);
	}
	function throwObjectKeyExpected() {
		throw new JSONRepairError("Object key expected", i);
	}
	function throwColonExpected() {
		throw new JSONRepairError("Colon expected", i);
	}
	function throwInvalidUnicodeCharacter() {
		throw new JSONRepairError(`Invalid unicode character "${text.slice(i, i + 6)}"`, i);
	}
}
function atEndOfBlockComment(text, i) {
	return text[i] === "*" && text[i + 1] === "/";
}
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_defineProperty.js
var require__defineProperty = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getNative = require__getNative();
	module.exports = function() {
		try {
			var func = getNative(Object, "defineProperty");
			func({}, "", {});
			return func;
		} catch (e) {}
	}();
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseAssignValue.js
var require__baseAssignValue = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var defineProperty = require__defineProperty();
	/**
	* The base implementation of `assignValue` and `assignMergeValue` without
	* value checks.
	*
	* @private
	* @param {Object} object The object to modify.
	* @param {string} key The key of the property to assign.
	* @param {*} value The value to assign.
	*/
	function baseAssignValue(object, key, value) {
		if (key == "__proto__" && defineProperty) defineProperty(object, key, {
			"configurable": true,
			"enumerable": true,
			"value": value,
			"writable": true
		});
		else object[key] = value;
	}
	module.exports = baseAssignValue;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_assignMergeValue.js
var require__assignMergeValue = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseAssignValue = require__baseAssignValue();
	var eq = require_eq();
	/**
	* This function is like `assignValue` except that it doesn't assign
	* `undefined` values.
	*
	* @private
	* @param {Object} object The object to modify.
	* @param {string} key The key of the property to assign.
	* @param {*} value The value to assign.
	*/
	function assignMergeValue(object, key, value) {
		if (value !== void 0 && !eq(object[key], value) || value === void 0 && !(key in object)) baseAssignValue(object, key, value);
	}
	module.exports = assignMergeValue;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_createBaseFor.js
var require__createBaseFor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Creates a base function for methods like `_.forIn` and `_.forOwn`.
	*
	* @private
	* @param {boolean} [fromRight] Specify iterating from right to left.
	* @returns {Function} Returns the new base function.
	*/
	function createBaseFor(fromRight) {
		return function(object, iteratee, keysFunc) {
			var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
			while (length--) {
				var key = props[fromRight ? length : ++index];
				if (iteratee(iterable[key], key, iterable) === false) break;
			}
			return object;
		};
	}
	module.exports = createBaseFor;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseFor.js
var require__baseFor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__createBaseFor()();
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_cloneBuffer.js
var require__cloneBuffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var root = require__root();
	/** Detect free variable `exports`. */
	var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
	/** Detect free variable `module`. */
	var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
	/** Built-in value references. */
	var Buffer = freeModule && freeModule.exports === freeExports ? root.Buffer : void 0;
	var allocUnsafe = Buffer ? Buffer.allocUnsafe : void 0;
	/**
	* Creates a clone of  `buffer`.
	*
	* @private
	* @param {Buffer} buffer The buffer to clone.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Buffer} Returns the cloned buffer.
	*/
	function cloneBuffer(buffer, isDeep) {
		if (isDeep) return buffer.slice();
		var length = buffer.length, result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
		buffer.copy(result);
		return result;
	}
	module.exports = cloneBuffer;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_cloneArrayBuffer.js
var require__cloneArrayBuffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Uint8Array = require__Uint8Array();
	/**
	* Creates a clone of `arrayBuffer`.
	*
	* @private
	* @param {ArrayBuffer} arrayBuffer The array buffer to clone.
	* @returns {ArrayBuffer} Returns the cloned array buffer.
	*/
	function cloneArrayBuffer(arrayBuffer) {
		var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
		new Uint8Array(result).set(new Uint8Array(arrayBuffer));
		return result;
	}
	module.exports = cloneArrayBuffer;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_cloneTypedArray.js
var require__cloneTypedArray = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var cloneArrayBuffer = require__cloneArrayBuffer();
	/**
	* Creates a clone of `typedArray`.
	*
	* @private
	* @param {Object} typedArray The typed array to clone.
	* @param {boolean} [isDeep] Specify a deep clone.
	* @returns {Object} Returns the cloned typed array.
	*/
	function cloneTypedArray(typedArray, isDeep) {
		var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
		return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
	}
	module.exports = cloneTypedArray;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_copyArray.js
var require__copyArray = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Copies the values of `source` to `array`.
	*
	* @private
	* @param {Array} source The array to copy values from.
	* @param {Array} [array=[]] The array to copy values to.
	* @returns {Array} Returns `array`.
	*/
	function copyArray(source, array) {
		var index = -1, length = source.length;
		array || (array = Array(length));
		while (++index < length) array[index] = source[index];
		return array;
	}
	module.exports = copyArray;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseCreate.js
var require__baseCreate = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isObject = require_isObject();
	/** Built-in value references. */
	var objectCreate = Object.create;
	module.exports = function() {
		function object() {}
		return function(proto) {
			if (!isObject(proto)) return {};
			if (objectCreate) return objectCreate(proto);
			object.prototype = proto;
			var result = new object();
			object.prototype = void 0;
			return result;
		};
	}();
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_getPrototype.js
var require__getPrototype = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require__overArg()(Object.getPrototypeOf, Object);
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_initCloneObject.js
var require__initCloneObject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseCreate = require__baseCreate();
	var getPrototype = require__getPrototype();
	var isPrototype = require__isPrototype();
	/**
	* Initializes an object clone.
	*
	* @private
	* @param {Object} object The object to clone.
	* @returns {Object} Returns the initialized clone.
	*/
	function initCloneObject(object) {
		return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
	}
	module.exports = initCloneObject;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isArrayLikeObject.js
var require_isArrayLikeObject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isArrayLike = require_isArrayLike();
	var isObjectLike = require_isObjectLike();
	/**
	* This method is like `_.isArrayLike` except that it also checks if `value`
	* is an object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an array-like object,
	*  else `false`.
	* @example
	*
	* _.isArrayLikeObject([1, 2, 3]);
	* // => true
	*
	* _.isArrayLikeObject(document.body.children);
	* // => true
	*
	* _.isArrayLikeObject('abc');
	* // => false
	*
	* _.isArrayLikeObject(_.noop);
	* // => false
	*/
	function isArrayLikeObject(value) {
		return isObjectLike(value) && isArrayLike(value);
	}
	module.exports = isArrayLikeObject;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/isPlainObject.js
var require_isPlainObject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseGetTag = require__baseGetTag();
	var getPrototype = require__getPrototype();
	var isObjectLike = require_isObjectLike();
	/** `Object#toString` result references. */
	var objectTag = "[object Object]";
	/** Used for built-in method references. */
	var funcProto = Function.prototype;
	var objectProto = Object.prototype;
	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/** Used to infer the `Object` constructor. */
	var objectCtorString = funcToString.call(Object);
	/**
	* Checks if `value` is a plain object, that is, an object created by the
	* `Object` constructor or one with a `[[Prototype]]` of `null`.
	*
	* @static
	* @memberOf _
	* @since 0.8.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
	* @example
	*
	* function Foo() {
	*   this.a = 1;
	* }
	*
	* _.isPlainObject(new Foo);
	* // => false
	*
	* _.isPlainObject([1, 2, 3]);
	* // => false
	*
	* _.isPlainObject({ 'x': 0, 'y': 0 });
	* // => true
	*
	* _.isPlainObject(Object.create(null));
	* // => true
	*/
	function isPlainObject(value) {
		if (!isObjectLike(value) || baseGetTag(value) != objectTag) return false;
		var proto = getPrototype(value);
		if (proto === null) return true;
		var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
		return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
	}
	module.exports = isPlainObject;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_safeGet.js
var require__safeGet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Gets the value at `key`, unless `key` is "__proto__" or "constructor".
	*
	* @private
	* @param {Object} object The object to query.
	* @param {string} key The key of the property to get.
	* @returns {*} Returns the property value.
	*/
	function safeGet(object, key) {
		if (key === "constructor" && typeof object[key] === "function") return;
		if (key == "__proto__") return;
		return object[key];
	}
	module.exports = safeGet;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_assignValue.js
var require__assignValue = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseAssignValue = require__baseAssignValue();
	var eq = require_eq();
	/** Used to check objects for own properties. */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	/**
	* Assigns `value` to `key` of `object` if the existing value is not equivalent
	* using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	* for equality comparisons.
	*
	* @private
	* @param {Object} object The object to modify.
	* @param {string} key The key of the property to assign.
	* @param {*} value The value to assign.
	*/
	function assignValue(object, key, value) {
		var objValue = object[key];
		if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) baseAssignValue(object, key, value);
	}
	module.exports = assignValue;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_copyObject.js
var require__copyObject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assignValue = require__assignValue();
	var baseAssignValue = require__baseAssignValue();
	/**
	* Copies properties of `source` to `object`.
	*
	* @private
	* @param {Object} source The object to copy properties from.
	* @param {Array} props The property identifiers to copy.
	* @param {Object} [object={}] The object to copy properties to.
	* @param {Function} [customizer] The function to customize copied values.
	* @returns {Object} Returns `object`.
	*/
	function copyObject(source, props, object, customizer) {
		var isNew = !object;
		object || (object = {});
		var index = -1, length = props.length;
		while (++index < length) {
			var key = props[index];
			var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
			if (newValue === void 0) newValue = source[key];
			if (isNew) baseAssignValue(object, key, newValue);
			else assignValue(object, key, newValue);
		}
		return object;
	}
	module.exports = copyObject;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_nativeKeysIn.js
var require__nativeKeysIn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This function is like
	* [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	* except that it includes inherited enumerable properties.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	*/
	function nativeKeysIn(object) {
		var result = [];
		if (object != null) for (var key in Object(object)) result.push(key);
		return result;
	}
	module.exports = nativeKeysIn;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseKeysIn.js
var require__baseKeysIn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isObject = require_isObject();
	var isPrototype = require__isPrototype();
	var nativeKeysIn = require__nativeKeysIn();
	/** Used to check objects for own properties. */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	/**
	* The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	*/
	function baseKeysIn(object) {
		if (!isObject(object)) return nativeKeysIn(object);
		var isProto = isPrototype(object), result = [];
		for (var key in object) if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) result.push(key);
		return result;
	}
	module.exports = baseKeysIn;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/keysIn.js
var require_keysIn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var arrayLikeKeys = require__arrayLikeKeys();
	var baseKeysIn = require__baseKeysIn();
	var isArrayLike = require_isArrayLike();
	/**
	* Creates an array of the own and inherited enumerable property names of `object`.
	*
	* **Note:** Non-object values are coerced to objects.
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category Object
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	* @example
	*
	* function Foo() {
	*   this.a = 1;
	*   this.b = 2;
	* }
	*
	* Foo.prototype.c = 3;
	*
	* _.keysIn(new Foo);
	* // => ['a', 'b', 'c'] (iteration order is not guaranteed)
	*/
	function keysIn(object) {
		return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
	}
	module.exports = keysIn;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/toPlainObject.js
var require_toPlainObject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var copyObject = require__copyObject();
	var keysIn = require_keysIn();
	/**
	* Converts `value` to a plain object flattening inherited enumerable string
	* keyed properties of `value` to own properties of the plain object.
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {Object} Returns the converted plain object.
	* @example
	*
	* function Foo() {
	*   this.b = 2;
	* }
	*
	* Foo.prototype.c = 3;
	*
	* _.assign({ 'a': 1 }, new Foo);
	* // => { 'a': 1, 'b': 2 }
	*
	* _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
	* // => { 'a': 1, 'b': 2, 'c': 3 }
	*/
	function toPlainObject(value) {
		return copyObject(value, keysIn(value));
	}
	module.exports = toPlainObject;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseMergeDeep.js
var require__baseMergeDeep = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assignMergeValue = require__assignMergeValue();
	var cloneBuffer = require__cloneBuffer();
	var cloneTypedArray = require__cloneTypedArray();
	var copyArray = require__copyArray();
	var initCloneObject = require__initCloneObject();
	var isArguments = require_isArguments();
	var isArray = require_isArray();
	var isArrayLikeObject = require_isArrayLikeObject();
	var isBuffer = require_isBuffer();
	var isFunction = require_isFunction();
	var isObject = require_isObject();
	var isPlainObject = require_isPlainObject();
	var isTypedArray = require_isTypedArray();
	var safeGet = require__safeGet();
	var toPlainObject = require_toPlainObject();
	/**
	* A specialized version of `baseMerge` for arrays and objects which performs
	* deep merges and tracks traversed objects enabling objects with circular
	* references to be merged.
	*
	* @private
	* @param {Object} object The destination object.
	* @param {Object} source The source object.
	* @param {string} key The key of the value to merge.
	* @param {number} srcIndex The index of `source`.
	* @param {Function} mergeFunc The function to merge values.
	* @param {Function} [customizer] The function to customize assigned values.
	* @param {Object} [stack] Tracks traversed source values and their merged
	*  counterparts.
	*/
	function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
		var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
		if (stacked) {
			assignMergeValue(object, key, stacked);
			return;
		}
		var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : void 0;
		var isCommon = newValue === void 0;
		if (isCommon) {
			var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
			newValue = srcValue;
			if (isArr || isBuff || isTyped) {
				if (isArray(objValue)) newValue = objValue;
				else if (isArrayLikeObject(objValue)) newValue = copyArray(objValue);
				else if (isBuff) {
					isCommon = false;
					newValue = cloneBuffer(srcValue, true);
				} else if (isTyped) {
					isCommon = false;
					newValue = cloneTypedArray(srcValue, true);
				} else newValue = [];
			} else if (isPlainObject(srcValue) || isArguments(srcValue)) {
				newValue = objValue;
				if (isArguments(objValue)) newValue = toPlainObject(objValue);
				else if (!isObject(objValue) || isFunction(objValue)) newValue = initCloneObject(srcValue);
			} else isCommon = false;
		}
		if (isCommon) {
			stack.set(srcValue, newValue);
			mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
			stack["delete"](srcValue);
		}
		assignMergeValue(object, key, newValue);
	}
	module.exports = baseMergeDeep;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseMerge.js
var require__baseMerge = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Stack = require__Stack();
	var assignMergeValue = require__assignMergeValue();
	var baseFor = require__baseFor();
	var baseMergeDeep = require__baseMergeDeep();
	var isObject = require_isObject();
	var keysIn = require_keysIn();
	var safeGet = require__safeGet();
	/**
	* The base implementation of `_.merge` without support for multiple sources.
	*
	* @private
	* @param {Object} object The destination object.
	* @param {Object} source The source object.
	* @param {number} srcIndex The index of `source`.
	* @param {Function} [customizer] The function to customize merged values.
	* @param {Object} [stack] Tracks traversed source values and their merged
	*  counterparts.
	*/
	function baseMerge(object, source, srcIndex, customizer, stack) {
		if (object === source) return;
		baseFor(source, function(srcValue, key) {
			stack || (stack = new Stack());
			if (isObject(srcValue)) baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
			else {
				var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : void 0;
				if (newValue === void 0) newValue = srcValue;
				assignMergeValue(object, key, newValue);
			}
		}, keysIn);
	}
	module.exports = baseMerge;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/identity.js
var require_identity = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This method returns the first argument it receives.
	*
	* @static
	* @since 0.1.0
	* @memberOf _
	* @category Util
	* @param {*} value Any value.
	* @returns {*} Returns `value`.
	* @example
	*
	* var object = { 'a': 1 };
	*
	* console.log(_.identity(object) === object);
	* // => true
	*/
	function identity(value) {
		return value;
	}
	module.exports = identity;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_apply.js
var require__apply = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* A faster alternative to `Function#apply`, this function invokes `func`
	* with the `this` binding of `thisArg` and the arguments of `args`.
	*
	* @private
	* @param {Function} func The function to invoke.
	* @param {*} thisArg The `this` binding of `func`.
	* @param {Array} args The arguments to invoke `func` with.
	* @returns {*} Returns the result of `func`.
	*/
	function apply(func, thisArg, args) {
		switch (args.length) {
			case 0: return func.call(thisArg);
			case 1: return func.call(thisArg, args[0]);
			case 2: return func.call(thisArg, args[0], args[1]);
			case 3: return func.call(thisArg, args[0], args[1], args[2]);
		}
		return func.apply(thisArg, args);
	}
	module.exports = apply;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_overRest.js
var require__overRest = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var apply = require__apply();
	var nativeMax = Math.max;
	/**
	* A specialized version of `baseRest` which transforms the rest array.
	*
	* @private
	* @param {Function} func The function to apply a rest parameter to.
	* @param {number} [start=func.length-1] The start position of the rest parameter.
	* @param {Function} transform The rest array transform.
	* @returns {Function} Returns the new function.
	*/
	function overRest(func, start, transform) {
		start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
		return function() {
			var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
			while (++index < length) array[index] = args[start + index];
			index = -1;
			var otherArgs = Array(start + 1);
			while (++index < start) otherArgs[index] = args[index];
			otherArgs[start] = transform(array);
			return apply(func, this, otherArgs);
		};
	}
	module.exports = overRest;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/constant.js
var require_constant = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Creates a function that returns `value`.
	*
	* @static
	* @memberOf _
	* @since 2.4.0
	* @category Util
	* @param {*} value The value to return from the new function.
	* @returns {Function} Returns the new constant function.
	* @example
	*
	* var objects = _.times(2, _.constant({ 'a': 1 }));
	*
	* console.log(objects);
	* // => [{ 'a': 1 }, { 'a': 1 }]
	*
	* console.log(objects[0] === objects[1]);
	* // => true
	*/
	function constant(value) {
		return function() {
			return value;
		};
	}
	module.exports = constant;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseSetToString.js
var require__baseSetToString = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var constant = require_constant();
	var defineProperty = require__defineProperty();
	var identity = require_identity();
	module.exports = !defineProperty ? identity : function(func, string) {
		return defineProperty(func, "toString", {
			"configurable": true,
			"enumerable": false,
			"value": constant(string),
			"writable": true
		});
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_shortOut.js
var require__shortOut = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** Used to detect hot functions by number of calls within a span of milliseconds. */
	var HOT_COUNT = 800;
	var HOT_SPAN = 16;
	var nativeNow = Date.now;
	/**
	* Creates a function that'll short out and invoke `identity` instead
	* of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
	* milliseconds.
	*
	* @private
	* @param {Function} func The function to restrict.
	* @returns {Function} Returns the new shortable function.
	*/
	function shortOut(func) {
		var count = 0, lastCalled = 0;
		return function() {
			var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
			lastCalled = stamp;
			if (remaining > 0) {
				if (++count >= HOT_COUNT) return arguments[0];
			} else count = 0;
			return func.apply(void 0, arguments);
		};
	}
	module.exports = shortOut;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_setToString.js
var require__setToString = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseSetToString = require__baseSetToString();
	module.exports = require__shortOut()(baseSetToString);
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseRest.js
var require__baseRest = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var identity = require_identity();
	var overRest = require__overRest();
	var setToString = require__setToString();
	/**
	* The base implementation of `_.rest` which doesn't validate or coerce arguments.
	*
	* @private
	* @param {Function} func The function to apply a rest parameter to.
	* @param {number} [start=func.length-1] The start position of the rest parameter.
	* @returns {Function} Returns the new function.
	*/
	function baseRest(func, start) {
		return setToString(overRest(func, start, identity), func + "");
	}
	module.exports = baseRest;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_isIterateeCall.js
var require__isIterateeCall = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var eq = require_eq();
	var isArrayLike = require_isArrayLike();
	var isIndex = require__isIndex();
	var isObject = require_isObject();
	/**
	* Checks if the given arguments are from an iteratee call.
	*
	* @private
	* @param {*} value The potential iteratee value argument.
	* @param {*} index The potential iteratee index or key argument.
	* @param {*} object The potential iteratee object argument.
	* @returns {boolean} Returns `true` if the arguments are from an iteratee call,
	*  else `false`.
	*/
	function isIterateeCall(value, index, object) {
		if (!isObject(object)) return false;
		var type = typeof index;
		if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) return eq(object[index], value);
		return false;
	}
	module.exports = isIterateeCall;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_createAssigner.js
var require__createAssigner = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseRest = require__baseRest();
	var isIterateeCall = require__isIterateeCall();
	/**
	* Creates a function like `_.assign`.
	*
	* @private
	* @param {Function} assigner The function to assign values.
	* @returns {Function} Returns the new assigner function.
	*/
	function createAssigner(assigner) {
		return baseRest(function(object, sources) {
			var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
			customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
			if (guard && isIterateeCall(sources[0], sources[1], guard)) {
				customizer = length < 3 ? void 0 : customizer;
				length = 1;
			}
			object = Object(object);
			while (++index < length) {
				var source = sources[index];
				if (source) assigner(object, source, index, customizer);
			}
			return object;
		});
	}
	module.exports = createAssigner;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/merge.js
var require_merge = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseMerge = require__baseMerge();
	module.exports = require__createAssigner()(function(object, source, srcIndex) {
		baseMerge(object, source, srcIndex);
	});
}));
require_browser();
require_merge();
require___vite_browser_external();
BigInt.prototype.toJSON = function() {
	return this.toString();
};
function syntaxNodeToValue(expression) {
	switch (expression?.type) {
		case Syntax.ObjectExpression: return Object.fromEntries(expression.properties.filter((prop) => prop.type === Syntax.Property).map(({ key, value }) => [syntaxNodeToValue(key), syntaxNodeToValue(value)]));
		case Syntax.Identifier: return expression.name;
		case Syntax.Literal: return expression.value;
		case Syntax.ArrayExpression: return expression.elements.map((exp) => syntaxNodeToValue(exp));
		case Syntax.UnaryExpression: {
			const value = syntaxNodeToValue(expression.argument);
			if (typeof value === "number" && expression.operator === "-") return -value;
			return value;
		}
		default: return;
	}
}
/**
* Parse any JavaScript ObjectExpression, including:
* - single quoted keys
* - unquoted keys
*/
function parseJSObject(objectAsString) {
	return syntaxNodeToValue(parse(`(${objectAsString})`).body.find((node) => node.type === Syntax.ExpressionStatement && node.expression.type === Syntax.ObjectExpression)?.expression);
}
/**
* Parses a JSON string into an object with optional error handling and recovery mechanisms.
*
* @param {string} jsonString - The JSON string to parse.
* @param {Object} [options] - Optional settings for parsing the JSON string. Either `fallbackValue` or `errorMessage` can be set, but not both.
* @param {boolean} [options.acceptJSObject=false] - If true, attempts to recover from common JSON format errors by parsing the JSON string as a JavaScript Object.
* @param {boolean} [options.repairJSON=false] - If true, attempts to repair common JSON format errors by repairing the JSON string.
* @param {string} [options.errorMessage] - A custom error message to throw if the JSON string cannot be parsed.
* @param {*} [options.fallbackValue] - A fallback value to return if the JSON string cannot be parsed.
* @returns {Object} - The parsed object, or the fallback value if parsing fails and `fallbackValue` is set.
*/
const jsonParse = (jsonString, options) => {
	try {
		return JSON.parse(jsonString);
	} catch (error) {
		if (options?.acceptJSObject) try {
			return parseJSObject(jsonString);
		} catch (e) {}
		if (options?.repairJSON) try {
			const jsonStringCleaned = jsonrepair(jsonString);
			return JSON.parse(jsonStringCleaned);
		} catch (e) {}
		if (options?.fallbackValue !== void 0) {
			if (options.fallbackValue instanceof Function) return options.fallbackValue();
			return options.fallbackValue;
		} else if (options?.errorMessage) throw new UserError(options.errorMessage);
		throw error;
	}
};
new RegExp(`\\b(?:${[.../* @__PURE__ */ new Set([
	"__proto__",
	"prototype",
	"constructor",
	"getPrototypeOf",
	"setPrototypeOf",
	"getOwnPropertyDescriptor",
	"getOwnPropertyDescriptors",
	"defineProperty",
	"defineProperties",
	"mainModule",
	"binding",
	"_linkedBinding",
	"_load",
	"prepareStackTrace",
	"__lookupGetter__",
	"__lookupSetter__",
	"__defineGetter__",
	"__defineSetter__",
	"caller",
	"callee",
	"arguments",
	"getBuiltinModule",
	"dlopen",
	"execve",
	"loadEnvFile"
])].map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`);
var MfaRequiredError = class extends Error {
	constructor() {
		super("MFA is required to access this resource. Please set up MFA in your user settings.");
		this.name = "MfaRequiredError";
	}
};
var ResponseError = class extends BaseError {
	httpStatusCode;
	errorCode;
	serverStackTrace;
	meta;
	hint;
	/**
	* Creates an instance of ResponseError.
	* @param {string} message The error message
	* @param {number} [errorCode] The error code which can be used by frontend to identify the actual error
	* @param {number} [httpStatusCode] The HTTP status code the response should have
	* @param {string} [stack] The stack trace
	* @param {Record<string, unknown>} [meta] Additional metadata from the server
	* @param {string} [hint] Additional hint from the server
	*/
	constructor(message, options = {}) {
		super(message);
		this.name = "ResponseError";
		const { errorCode, httpStatusCode, stack, meta, hint } = options;
		if (errorCode) this.errorCode = errorCode;
		if (httpStatusCode) this.httpStatusCode = httpStatusCode;
		if (stack) this.serverStackTrace = stack;
		if (meta) this.meta = meta;
		if (hint) this.hint = hint;
	}
};
const legacyParamSerializer = (params) => Object.keys(params).filter((key) => params[key] !== void 0).map((key) => {
	if (Array.isArray(params[key])) return params[key].map((v) => `${key}[]=${encodeURIComponent(v)}`).join("&");
	if (typeof params[key] === "object") params[key] = JSON.stringify(params[key]);
	return `${key}=${encodeURIComponent(params[key])}`;
}).join("&");
/** An error body arrives as a Blob when the request asked for one. Read it as the JSON it is. */
async function readErrorResponseData(data) {
	if (!(data instanceof Blob)) return data;
	try {
		return jsonParse(await data.text());
	} catch {
		return;
	}
}
async function request(config) {
	return (await requestResponse(config)).data;
}
/**
* The whole response, for a caller that needs the headers or a non-JSON body.
* Shares the error handling of `request`: the session-expired handler on a
* 401, and `MfaRequiredError` when the 401 asks for MFA.
*/
async function requestResponse(config) {
	const { method, baseURL, endpoint, headers, data, responseType } = config;
	const options = {
		method,
		url: endpoint,
		baseURL,
		headers: headers ?? {},
		responseType
	};
	if (baseURL.startsWith("/")) options.headers["browser-id"] = getBrowserId();
	if (!baseURL.includes("api.n8n.io") && !baseURL.includes("n8n.cloud")) options.withCredentials = options.withCredentials ?? true;
	if ([
		"POST",
		"PATCH",
		"PUT"
	].includes(method)) options.data = data;
	else if (data) {
		options.params = data;
		options.paramsSerializer = legacyParamSerializer;
	}
	try {
		return await axios.request(options);
	} catch (error) {
		if (error.message === "Network Error") throw new ResponseError("Can't connect to n8n.", { errorCode: 999 });
		const errorResponseData = await readErrorResponseData(error.response?.data);
		if (errorResponseData?.mfaRequired === true) throw new MfaRequiredError();
		if (error.response?.status === 401);
		if (errorResponseData?.message !== void 0) {
			if (errorResponseData.name === "NodeApiError") {
				errorResponseData.httpStatusCode = error.response.status;
				throw errorResponseData;
			}
			throw new ResponseError(errorResponseData.message, {
				errorCode: errorResponseData.code,
				httpStatusCode: error.response.status,
				stack: errorResponseData.stack,
				meta: errorResponseData.meta,
				hint: errorResponseData.hint
			});
		}
		throw error;
	}
}
async function makeRestApiRequest(context, method, endpoint, data) {
	return (await request({
		method,
		baseURL: context.baseUrl,
		endpoint,
		headers: { "push-ref": context.pushRef },
		data
	})).data;
}
//#endregion
//#region ../@n8n/rest-api-client/src/api/nodeTypes.ts
async function fetchNodeTypesJsonWithRetry(url, retries = 5, delay = 500) {
	for (let attempt = 0; attempt < retries; attempt++) {
		const response = await axios.get(url, { withCredentials: true });
		if (typeof response.data === "object" && response.data !== null) return response.data;
		await sleep(delay * attempt);
	}
	throw new Error("Could not fetch node types");
}
async function getNodeTypes(baseUrl) {
	return await fetchNodeTypesJsonWithRetry(baseUrl + "types/nodes.json");
}
async function getNodeTypeVersions(baseUrl) {
	return await fetchNodeTypesJsonWithRetry(baseUrl + "types/node-versions.json");
}
/**
* Fetch specific node types by their identifier (name@version format)
* This is useful for incremental syncs where only missing node types need to be fetched
*
* @param context - The REST API context containing base URL and auth info
* @param identifiers - Array of node type identifiers in "name@version" format
* @returns Array of node type descriptions for the requested identifiers
*/
async function getNodeTypesByIdentifier(context, identifiers) {
	return await makeRestApiRequest(context, "POST", "/node-types/by-identifier", { identifiers });
}
//#endregion
//#region src/app/workers/data/operations/query.ts
/**
* Database Operations
*
* This module provides shared database operations that can be used
* across different modules in the data worker. It accepts the worker
* state as a parameter to keep the code modular and testable.
*
* @note wa-sqlite namespace import for SQLite constants (SQLITE_ROW, SQLITE_INTEGER, etc.)
* @docs https://github.com/rhashimoto/wa-sqlite#api
*/
/**
* Execute a SQL statement (for INSERT, UPDATE, DELETE, CREATE, etc.)
*
* @param state - The data worker state
* @param sql - The SQL statement to execute
*/
async function exec$1(state, sql) {
	console.log("[DataWorker] Executing:", sql.substring(0, 100) + (sql.length > 100 ? "..." : ""));
	if (!state.sqlite3 || state.db === null) throw new Error("[DataWorker] Database not initialized");
	await state.sqlite3.exec(state.db, sql);
}
/**
* Execute a SQL query and return results (for SELECT)
*
* @param state - The data worker state
* @param sql - The SQL query to execute
* @returns Query result with columns and rows
*/
async function query$1(state, sql) {
	console.log("[DataWorker] Querying:", sql.substring(0, 100) + (sql.length > 100 ? "..." : ""));
	return await queryWithParams$1(state, sql);
}
/**
* Execute a SQL statement with bound parameters (for INSERT, UPDATE, DELETE)
*
* Uses wa-sqlite's statements() generator and bind_collection() for parameter binding.
* @see https://github.com/rhashimoto/wa-sqlite#api
*
* @param state - The data worker state
* @param sql - The SQL statement to execute
* @param params - The parameters to bind to the statement
*/
async function execWithParams(state, sql, params = []) {
	if (!state.sqlite3 || state.db === null) throw new Error("[DataWorker] Database not initialized");
	for await (const stmt of state.sqlite3.statements(state.db, sql)) {
		if (params.length > 0) state.sqlite3.bind_collection(stmt, params);
		await state.sqlite3.step(stmt);
	}
}
/**
* Execute a SQL query with bound parameters
*
* Uses wa-sqlite's statements() generator and bind_collection() for parameter binding.
* The column() method automatically returns typed values.
* @see https://github.com/rhashimoto/wa-sqlite#api
*
* @param state - The data worker state
* @param sql - The SQL query to execute
* @param params - The parameters to bind to the query
* @returns Query result with columns and rows
*/
async function queryWithParams$1(state, sql, params = []) {
	if (!state.sqlite3 || state.db === null) throw new Error("[DataWorker] Database not initialized");
	const result = {
		columns: [],
		rows: []
	};
	for await (const stmt of state.sqlite3.statements(state.db, sql)) {
		if (params.length > 0) state.sqlite3.bind_collection(stmt, params);
		const columnCount = state.sqlite3.column_count(stmt);
		for (let i = 0; i < columnCount; i++) result.columns.push(state.sqlite3.column_name(stmt, i));
		while (await state.sqlite3.step(stmt) === 100) {
			const row = [];
			for (let i = 0; i < columnCount; i++) row.push(state.sqlite3.column(stmt, i));
			result.rows.push(row);
		}
	}
	return result;
}
/**
* Execute operations within a transaction
*
* Automatically handles BEGIN/COMMIT/ROLLBACK. On success, commits the transaction.
* On error, rolls back and re-throws the error.
*
* @param state - The data worker state
* @param fn - Async function containing operations to execute within the transaction
* @returns The result of the callback function
*/
async function withTrx(state, fn) {
	await exec$1(state, "BEGIN TRANSACTION");
	try {
		const result = await fn();
		await exec$1(state, "COMMIT");
		return result;
	} catch (error) {
		await exec$1(state, "ROLLBACK");
		throw error;
	}
}
/**
* Close the database connection
*
* @param state - The data worker state
*/
async function close$1(state) {
	console.log("[DataWorker] Closing database...");
	if (state.sqlite3 && state.db !== null) {
		await state.sqlite3.close(state.db);
		state.db = null;
	}
	if (state.vfs) {
		await state.vfs.close();
		state.vfs = null;
	}
	state.initialized = false;
	console.log("[DataWorker] Database closed");
}
//#endregion
//#region src/app/workers/data/operations/storeVersion.ts
const VERSION_KEY = "version";
/**
* Store the n8n version in the database
*
* @param state - The data worker state
* @param version - The n8n version string (e.g., "1.75.0")
*/
async function storeVersion$1(state, version) {
	console.log("[DataWorker] storeVersion:", version);
	if (!state.initialized) throw new Error("[DataWorker] Database not initialized");
	await execWithParams(state, "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))", [VERSION_KEY, version]);
	console.log("[DataWorker] Version stored successfully");
}
/**
* Get the stored n8n version from the database
*
* @param state - The data worker state
* @returns The stored version string or null if not found
*/
async function getStoredVersion$1(state) {
	if (!state.initialized) throw new Error("[DataWorker] Database not initialized");
	const result = await queryWithParams$1(state, "SELECT value FROM metadata WHERE key = ?", [VERSION_KEY]);
	if (result.rows.length === 0) return null;
	return result.rows[0][0];
}
//#endregion
//#region src/app/workers/data/operations/loadNodeTypes.ts
/**
* Load Node Types
*
* This module handles loading and syncing node types from the server
* to the local SQLite database for caching.
*
* The functions accept the data worker state, allowing them to be
* called from within web workers while keeping the code modular.
*/
/**
* Generate a unique ID for a node type version
*/
function getNodeTypeId(name, version) {
	return `${name}@${version}`;
}
/**
* Convert a database row to a node type description
*/
function rowToNodeType(data) {
	return jsonParse(data);
}
/**
* Extract all version numbers from a node type description
*/
function getNodeTypeVersionsFromDescription(nodeType) {
	const version = nodeType.version;
	if (typeof version === "number") return [version];
	if (Array.isArray(version)) return version;
	return [1];
}
/**
* Create a REST API context for making authenticated requests
*/
function createRestApiContext(baseUrl) {
	return {
		baseUrl: baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl,
		pushRef: ""
	};
}
/**
* Upsert a node type into the database
*
* @param state - The data worker state
* @param id - The unique identifier for the node type (name@version)
* @param nodeType - The node type description to store
*/
async function upsertNodeType(state, id, nodeType) {
	await execWithParams(state, "INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES (?, ?, datetime('now'))", [id, JSON.stringify(nodeType)]);
}
/**
* Delete a node type from the database
*
* @param state - The data worker state
* @param id - The unique identifier for the node type (name@version)
*/
async function deleteNodeType(state, id) {
	await execWithParams(state, "DELETE FROM nodeTypes WHERE id = ?", [id]);
}
/**
* Load node types from the server and sync with the local database
*
* @param state - The data worker state
* @param baseUrl - The base URL for API requests
*/
async function loadNodeTypes$1(state, baseUrl) {
	console.log("[DataWorker] loadNodeTypes");
	if (!state.initialized) throw new Error("[DataWorker] Database not initialized");
	const storedVersion = await getStoredVersion$1(state);
	const currentVersion = state.version;
	console.log("[DataWorker] Stored version:", storedVersion);
	console.log("[DataWorker] Current version:", currentVersion);
	if (storedVersion !== null && currentVersion !== null && storedVersion !== currentVersion) {
		console.log(`[DataWorker] Version changed: ${storedVersion} -> ${currentVersion}, clearing node types`);
		await exec$1(state, "DELETE FROM nodeTypes");
		console.log("[DataWorker] Node types cleared");
	}
	if (currentVersion !== null && storedVersion !== currentVersion) await storeVersion$1(state, currentVersion);
	console.log("[DataWorker] Starting node types sync...");
	const count = (await query$1(state, "SELECT COUNT(*) as count FROM nodeTypes")).rows[0]?.[0];
	const isEmpty = count === 0;
	console.log(`[DataWorker] Database has ${count} node types, isEmpty: ${isEmpty}`);
	if (isEmpty) {
		console.log("[DataWorker] Performing initial load of all node types...");
		const nodeTypes = await getNodeTypes(baseUrl);
		console.log(`[DataWorker] Fetched ${nodeTypes.length} node types from server`);
		await withTrx(state, async () => {
			for (const nodeType of nodeTypes) {
				const versions = getNodeTypeVersionsFromDescription(nodeType);
				for (const version of versions) await upsertNodeType(state, getNodeTypeId(nodeType.name, version), nodeType);
			}
		});
		console.log("[DataWorker] Initial load complete");
	} else {
		console.log("[DataWorker] Performing incremental sync...");
		const serverVersions = await getNodeTypeVersions(baseUrl);
		const serverVersionSet = new Set(serverVersions);
		console.log(`[DataWorker] Server has ${serverVersions.length} node type versions`);
		const existingResult = await query$1(state, "SELECT id FROM nodeTypes");
		const existingIds = new Set(existingResult.rows.map((row) => row[0]));
		console.log(`[DataWorker] Database has ${existingIds.size} node type versions`);
		const addedVersions = serverVersions.filter((id) => !existingIds.has(id));
		const removedVersions = [...existingIds].filter((id) => !serverVersionSet.has(id));
		console.log(`[DataWorker] Changes: ${addedVersions.length} added, ${removedVersions.length} removed`);
		if (addedVersions.length > 0 || removedVersions.length > 0) {
			await withTrx(state, async () => {
				for (const id of removedVersions) await deleteNodeType(state, id);
				if (addedVersions.length > 0) {
					console.log(`[DataWorker] Fetching ${addedVersions.length} missing node types by identifier...`);
					const nodeTypes = await getNodeTypesByIdentifier(createRestApiContext(baseUrl), addedVersions);
					console.log(`[DataWorker] Received ${nodeTypes.length} node types from server`);
					for (const nodeType of nodeTypes) {
						const versions = getNodeTypeVersionsFromDescription(nodeType);
						for (const version of versions) {
							const id = getNodeTypeId(nodeType.name, version);
							if (addedVersions.includes(id)) await upsertNodeType(state, id, nodeType);
						}
					}
				}
			});
			console.log("[DataWorker] Incremental sync complete");
		} else console.log("[DataWorker] No changes detected");
	}
}
/**
* Get a node type from the local database
*
* @param state - The data worker state
* @param name - Node type name
* @param version - Node type version
* @returns The node type description or null if not found
*/
async function getNodeType$1(state, name, version) {
	const result = await queryWithParams$1(state, "SELECT data FROM nodeTypes WHERE id = ?", [getNodeTypeId(name, version)]);
	if (result.rows.length === 0) return null;
	return rowToNodeType(result.rows[0][0]);
}
/**
* Get all node types from the local database
*
* @param state - The data worker state
* @returns Array of all node type descriptions
*/
async function getAllNodeTypes$1(state) {
	return (await query$1(state, "SELECT data FROM nodeTypes")).rows.map((row) => rowToNodeType(row[0]));
}
//#endregion
//#region src/app/workers/data/worker.ts
/**
* Dedicated Data Worker
*
* This worker handles the actual SQLite/OPFS operations.
* It uses wa-sqlite with AccessHandlePoolVFS which works without cross-origin isolation.
*
* Architecture (based on Notion's approach):
* - Only ONE dedicated worker should access the database at a time
* - The SharedWorker coordinates which tab is "active"
* - All queries are routed through the SharedWorker to the active tab's dedicated worker
*/
const state = {
	initialized: false,
	sqlite3: null,
	db: null,
	vfs: null,
	initPromise: null,
	version: null
};
const DB_NAME = "n8n";
const VFS_NAME = "n8n-opfs";
const SQLITE_ACCESS_EXISTS = 0;
/**
* Check if OPFS is available in the current environment
*/
async function isOpfsAvailable() {
	try {
		if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return false;
		const root = await navigator.storage.getDirectory();
		return root !== null && root !== void 0;
	} catch {
		return false;
	}
}
/**
* Determine if the database file already exists within the AccessHandlePoolVFS directory
*/
function databaseAlreadyExists() {
	const vfs = state.vfs;
	if (!vfs) return false;
	const resultView = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(4));
	if (vfs.jAccess(DB_NAME, SQLITE_ACCESS_EXISTS, resultView) !== 0) {
		console.warn("[DataWorker] Unable to check database existence via VFS, assuming new database");
		return false;
	}
	return resultView.getInt32(0, true) === 1;
}
/**
* Initialize the SQLite database with OPFS persistence
*
* @param options.version - The current n8n version from settings
*/
async function initialize({ version }) {
	if (state.initPromise) return await state.initPromise;
	if (state.initialized) {
		console.log("[DataWorker] Already initialized");
		return;
	}
	console.log("[DataWorker] Initializing...");
	state.initPromise = (async () => {
		const opfsAvailable = await isOpfsAvailable();
		console.log("[DataWorker] OPFS available:", opfsAvailable);
		console.log("[DataWorker] Storage API:", typeof navigator !== "undefined" && !!navigator.storage);
		console.log("[DataWorker] getDirectory method:", typeof navigator !== "undefined" && !!navigator.storage?.getDirectory);
		if (!opfsAvailable) console.warn("[DataWorker] OPFS is not available - database will not persist across sessions");
		const module = await Module$1();
		state.sqlite3 = Factory(module);
		console.log("[DataWorker] Creating AccessHandlePoolVFS...");
		state.vfs = await AccessHandlePoolVFS.create(VFS_NAME, module);
		console.log("[DataWorker] AccessHandlePoolVFS created successfully");
		state.sqlite3.vfs_register(state.vfs, true);
		const databaseExists = databaseAlreadyExists();
		console.log("[DataWorker] Database exists:", databaseExists);
		state.db = await state.sqlite3.open_v2(DB_NAME, 6, VFS_NAME);
		console.log("[DataWorker] Database opened successfully");
		console.log("[DataWorker] SQLite version:", state.sqlite3.libversion());
		console.log("[DataWorker] VFS name:", VFS_NAME);
		console.log("[DataWorker] Database name:", DB_NAME);
		console.log("[DataWorker] Ensuring tables...");
		const tableSchemas = getAllTableSchemas();
		for (const schema of tableSchemas) await state.sqlite3.exec(state.db, schema);
		console.log("[DataWorker] Tables ensured successfully");
		state.initialized = true;
		state.version = version;
	})();
	try {
		await state.initPromise;
	} catch (error) {
		console.error("[DataWorker] Failed to initialize:", error);
		throw error;
	} finally {
		state.initPromise = null;
	}
}
/**
* Execute a SQL statement (for INSERT, UPDATE, DELETE, CREATE, etc.)
*/
async function exec(sql) {
	await exec$1(state, sql);
}
/**
* Execute a SQL query and return results (for SELECT)
*/
async function query(sql) {
	return await query$1(state, sql);
}
/**
* Execute a SQL query with bound parameters
*/
async function queryWithParams(sql, params = []) {
	return await queryWithParams$1(state, sql, params);
}
/**
* Close the database connection
*/
async function close() {
	await close$1(state);
}
/**
* Check if the worker is initialized
*/
function isInitialized() {
	return state.initialized;
}
/**
* Load node types from the server and sync with the local database
* This runs entirely within the worker (fetch + SQL operations)
*/
async function loadNodeTypes(baseUrl) {
	await loadNodeTypes$1(state, baseUrl);
}
/**
* Get all node types from the local database
*/
async function getAllNodeTypes() {
	return await getAllNodeTypes$1(state);
}
/**
* Get a single node type from the local database
*/
async function getNodeType(name, version) {
	return await getNodeType$1(state, name, version);
}
/**
* Store the n8n version in the database
*/
async function storeVersion(version) {
	await storeVersion$1(state, version);
}
/**
* Get the stored n8n version from the database
*/
async function getStoredVersion() {
	return await getStoredVersion$1(state);
}
const dataWorkerApi = {
	initialize,
	exec,
	query,
	queryWithParams,
	close,
	isInitialized,
	loadNodeTypes,
	getAllNodeTypes,
	getNodeType,
	storeVersion,
	getStoredVersion
};
expose(dataWorkerApi);
self.onmessage = (event) => {
	if (event.data?.type === "connect" && event.data.port instanceof MessagePort) {
		console.log("[DataWorker] Received connection from coordinator");
		expose(dataWorkerApi, event.data.port);
	}
};
//#endregion
