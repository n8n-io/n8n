import { i as __require, o as __toESM, t as __commonJSMin } from "./rolldown-runtime-EITvVbkG.js";
import { Eo as require_get, Nf as init_reactivity_esm_bundler, Xf as unref, ss as require___vite_browser_external } from "./vendor-Hx42-oQF.js";
import { Lw as assert, Uu as importCurlEventBus, dC as useToast, jN as useI18n, nC as CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS, tC as CURL_IMPORT_NODES_PROTOCOLS } from "./app-D5flEmb-.js";
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/utils.js
var import_get = /* @__PURE__ */ __toESM(require_get(), 1);
var CCError = class extends Error {};
var UTF8encoder = new TextEncoder();
function has(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}
function isInt(s) {
	return /^\s*[+-]?\d+$/.test(s);
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/shell/Word.js
var Word = class Word {
	constructor(tokens) {
		this.valueOf = Word.toString;
		if (typeof tokens === "string") tokens = [tokens];
		if (tokens === void 0 || tokens.length === 0) tokens = [""];
		this.tokens = [];
		for (const t of tokens) if (typeof t === "string") {
			if (this.tokens.length > 0 && typeof this.tokens[this.tokens.length - 1] === "string") this.tokens[this.tokens.length - 1] += t;
			else if (t) this.tokens.push(t);
		} else this.tokens.push(t);
		if (this.tokens.length === 0) this.tokens.push("");
	}
	get length() {
		let len = 0;
		for (const t of this.tokens) if (typeof t === "string") len += t.length;
		else len += 1;
		return len;
	}
	*[Symbol.iterator]() {
		for (const t of this.tokens) if (typeof t === "string") for (const c of t) yield c;
		else yield t;
	}
	get(index) {
		let i = 0;
		for (const t of this.tokens) if (typeof t === "string") {
			if (i + t.length > index) return t[index - i];
			i += t.length;
		} else {
			if (i === index) return t;
			i += 1;
		}
		throw new CCError("Index out of bounds");
	}
	charAt(index = 0) {
		try {
			return this.get(index);
		} catch (_a) {}
		return "";
	}
	indexOf(search, start) {
		if (start === void 0) start = 0;
		let i = 0;
		for (const t of this.tokens) if (typeof t === "string") {
			if (i + t.length > start) {
				const index = t.indexOf(search, start - i);
				if (index !== -1) return i + index;
			}
			i += t.length;
		} else i += 1;
		return -1;
	}
	indexOfFirstChar(search) {
		let i = 0;
		for (const t of this.tokens) if (typeof t === "string") for (const c of t) {
			if (search.includes(c)) return i;
			i += 1;
		}
		else i += 1;
		return -1;
	}
	removeFirstChar(c) {
		if (this.length === 0) return new Word();
		if (this.charAt(0) === c) return this.slice(1);
		return this.copy();
	}
	copy() {
		return new Word(this.tokens);
	}
	slice(indexStart, indexEnd) {
		if (indexStart === void 0) indexStart = this.length;
		if (indexEnd === void 0) indexEnd = this.length;
		if (indexStart >= this.length) return new Word();
		if (indexStart < 0) indexStart = Math.max(indexStart + this.length, 0);
		if (indexEnd < 0) indexEnd = Math.max(indexEnd + this.length, 0);
		if (indexEnd <= indexStart) return new Word();
		const ret = [];
		let i = 0;
		for (const t of this.tokens) if (typeof t === "string") {
			if (i + t.length > indexStart) {
				if (i < indexEnd) ret.push(t.slice(Math.max(indexStart - i, 0), indexEnd - i));
			}
			i += t.length;
		} else {
			if (i >= indexStart && i < indexEnd) ret.push(t);
			i += 1;
		}
		return new Word(ret);
	}
	includes(search, start) {
		if (start === void 0) start = 0;
		let i = 0;
		for (const t of this.tokens) if (typeof t === "string") {
			if (i + t.length > start) {
				if (t.includes(search, start - i)) return true;
			}
			i += t.length;
		} else i += 1;
		return false;
	}
	test(search) {
		for (const t of this.tokens) if (typeof t === "string") {
			if (search.test(t)) return true;
		}
		return false;
	}
	prepend(c) {
		const ret = this.copy();
		if (ret.tokens.length && typeof ret.tokens[0] === "string") ret.tokens[0] = c + ret.tokens[0];
		else ret.tokens.unshift(c);
		return ret;
	}
	append(c) {
		const ret = this.copy();
		if (ret.tokens.length && typeof ret.tokens[ret.tokens.length - 1] === "string") ret.tokens[ret.tokens.length - 1] += c;
		else ret.tokens.push(c);
		return ret;
	}
	add(other) {
		return new Word([...this.tokens, ...other.tokens]);
	}
	match(regex) {
		for (const t of this.tokens) if (typeof t === "string") {
			const match = t.match(regex);
			if (match) return match;
		}
		return null;
	}
	search(regex) {
		let offset = 0;
		for (const t of this.tokens) if (typeof t === "string") {
			const match = t.search(regex);
			if (match !== -1) return offset + match;
			offset += t.length;
		}
		return -1;
	}
	replace(search, replacement) {
		const ret = [];
		for (const t of this.tokens) if (typeof t === "string") ret.push(t.replace(search, replacement));
		else ret.push(t);
		return new Word(ret);
	}
	split(separator, limit) {
		const ret = [];
		let i = 0;
		let start = 0;
		while (i < this.length) {
			let match = true;
			for (let j = 0; j < separator.length; j++) if (this.get(i + j) !== separator.charAt(j)) {
				match = false;
				break;
			}
			if (match) {
				ret.push(this.slice(start, i));
				i += separator.length;
				start = i;
				if (limit !== void 0 && ret.length === limit - 1) break;
			} else i += 1;
		}
		if (start <= this.length) ret.push(this.slice(start));
		return ret;
	}
	toLowerCase() {
		return new Word(this.tokens.map((t) => typeof t === "string" ? t.toLowerCase() : t));
	}
	toUpperCase() {
		return new Word(this.tokens.map((t) => typeof t === "string" ? t.toUpperCase() : t));
	}
	trimStart() {
		const ret = [];
		let i, t;
		for ([i, t] of this.tokens.entries()) if (typeof t === "string") {
			if (i === 0) t = t.trimStart();
			if (t) ret.push(t);
		} else ret.push(t);
		if (ret.length === 0) return new Word();
		return new Word(ret);
	}
	trimEnd() {
		const ret = [];
		let i, t;
		for ([i, t] of this.tokens.entries()) if (typeof t === "string") {
			if (i === this.tokens.length - 1) t = t.trimEnd();
			if (t) ret.push(t);
		} else ret.push(t);
		if (ret.length === 0) return new Word();
		return new Word(ret);
	}
	trim() {
		const ret = [];
		let i, t;
		for ([i, t] of this.tokens.entries()) if (typeof t === "string") {
			if (i === 0) t = t.trimStart();
			if (i === this.tokens.length - 1) t = t.trimEnd();
			if (t) ret.push(t);
		} else ret.push(t);
		if (ret.length === 0) return new Word();
		return new Word(ret);
	}
	isEmpty() {
		if (this.tokens.length === 0) return true;
		if (this.tokens.length === 1 && typeof this.tokens[0] === "string") return this.tokens[0].length === 0;
		return false;
	}
	toBool() {
		return !this.isEmpty();
	}
	isString() {
		for (const t of this.tokens) if (typeof t !== "string") return false;
		return true;
	}
	firstShellToken() {
		for (const t of this.tokens) if (typeof t !== "string") return t;
		return null;
	}
	startsWith(prefix) {
		if (this.tokens.length === 0) return false;
		if (typeof this.tokens[0] === "string") return this.tokens[0].startsWith(prefix);
		return false;
	}
	endsWith(suffix) {
		if (this.tokens.length === 0) return false;
		const lastToken = this.tokens[this.tokens.length - 1];
		if (typeof lastToken === "string") return lastToken.endsWith(suffix);
		return false;
	}
	toString() {
		return this.tokens.map((t) => typeof t === "string" ? t : t.text).join("");
	}
};
function eq(it, other) {
	if (it === void 0 || it === null || other === void 0 || other === null) return it === other;
	if (typeof other === "string") return it.tokens.length === 1 && typeof it.tokens[0] === "string" && it.tokens[0] === other;
	return it.tokens.length === other.tokens.length && it.tokens.every((itToken, i) => {
		const otherToken = other.tokens[i];
		if (typeof itToken === "string") return itToken === otherToken;
		else if (typeof otherToken !== "string") return itToken.text === otherToken.text;
		return false;
	});
}
function firstShellToken(word) {
	if (typeof word === "string") return null;
	return word.firstShellToken();
}
function mergeWords(...words) {
	const ret = [];
	for (const w of words) if (w instanceof Word) ret.push(...w.tokens);
	else ret.push(w);
	return new Word(ret);
}
function joinWords(words, joinChar) {
	const ret = [];
	for (const w of words) {
		if (ret.length) ret.push(joinChar);
		ret.push(...w.tokens);
	}
	return new Word(ret);
}
//#endregion
//#region ../../../node_modules/.pnpm/web-tree-sitter@0.24.3/node_modules/web-tree-sitter/tree-sitter.js
var require_tree_sitter = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Module = typeof Module != "undefined" ? Module : {};
	var ENVIRONMENT_IS_WEB = typeof window == "object";
	var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
	var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
	var TreeSitter = function() {
		var initPromise;
		var document = typeof window == "object" ? { currentScript: window.document.currentScript } : null;
		class Parser {
			constructor() {
				this.initialize();
			}
			initialize() {
				throw new Error("cannot construct a Parser before calling `init()`");
			}
			static init(moduleOptions) {
				if (initPromise) return initPromise;
				Module = Object.assign({}, Module, moduleOptions);
				return initPromise = new Promise((resolveInitPromise) => {
					var moduleOverrides = Object.assign({}, Module);
					var arguments_ = [];
					var thisProgram = "./this.program";
					var quit_ = (status, toThrow) => {
						throw toThrow;
					};
					var scriptDirectory = "";
					function locateFile(path) {
						if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
						return scriptDirectory + path;
					}
					var readAsync, readBinary;
					if (ENVIRONMENT_IS_NODE) {
						var fs = require___vite_browser_external();
						var nodePath = require___vite_browser_external();
						scriptDirectory = __dirname + "/";
						readBinary = (filename) => {
							filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
							return fs.readFileSync(filename);
						};
						readAsync = (filename, binary = true) => {
							filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
							return new Promise((resolve, reject) => {
								fs.readFile(filename, binary ? void 0 : "utf8", (err, data) => {
									if (err) reject(err);
									else resolve(binary ? data.buffer : data);
								});
							});
						};
						if (!Module["thisProgram"] && process.argv.length > 1) thisProgram = process.argv[1].replace(/\\/g, "/");
						arguments_ = process.argv.slice(2);
						if (typeof module != "undefined") module["exports"] = Module;
						quit_ = (status, toThrow) => {
							process.exitCode = status;
							throw toThrow;
						};
					} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
						if (ENVIRONMENT_IS_WORKER) scriptDirectory = self.location.href;
						else if (typeof document != "undefined" && document.currentScript) scriptDirectory = document.currentScript.src;
						if (scriptDirectory.startsWith("blob:")) scriptDirectory = "";
						else scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
						if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
							var xhr = new XMLHttpRequest();
							xhr.open("GET", url, false);
							xhr.responseType = "arraybuffer";
							xhr.send(null);
							return new Uint8Array(xhr.response);
						};
						readAsync = (url) => {
							if (isFileURI(url)) return new Promise((reject, resolve) => {
								var xhr = new XMLHttpRequest();
								xhr.open("GET", url, true);
								xhr.responseType = "arraybuffer";
								xhr.onload = () => {
									if (xhr.status == 200 || xhr.status == 0 && xhr.response) resolve(xhr.response);
									reject(xhr.status);
								};
								xhr.onerror = reject;
								xhr.send(null);
							});
							return fetch(url, { credentials: "same-origin" }).then((response) => {
								if (response.ok) return response.arrayBuffer();
								return Promise.reject(/* @__PURE__ */ new Error(response.status + " : " + response.url));
							});
						};
					}
					var out = Module["print"] || console.log.bind(console);
					var err = Module["printErr"] || console.error.bind(console);
					Object.assign(Module, moduleOverrides);
					moduleOverrides = null;
					if (Module["arguments"]) arguments_ = Module["arguments"];
					if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
					if (Module["quit"]) quit_ = Module["quit"];
					var dynamicLibraries = Module["dynamicLibraries"] || [];
					var wasmBinary;
					if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
					var wasmMemory;
					var ABORT = false;
					var EXITSTATUS;
					var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
					var HEAP_DATA_VIEW;
					function updateMemoryViews() {
						var b = wasmMemory.buffer;
						Module["HEAP_DATA_VIEW"] = HEAP_DATA_VIEW = new DataView(b);
						Module["HEAP8"] = HEAP8 = new Int8Array(b);
						Module["HEAP16"] = new Int16Array(b);
						Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
						Module["HEAPU16"] = new Uint16Array(b);
						Module["HEAP32"] = new Int32Array(b);
						Module["HEAPU32"] = new Uint32Array(b);
						Module["HEAPF32"] = new Float32Array(b);
						Module["HEAPF64"] = new Float64Array(b);
					}
					if (Module["wasmMemory"]) wasmMemory = Module["wasmMemory"];
					else {
						var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 33554432;
						wasmMemory = new WebAssembly.Memory({
							"initial": INITIAL_MEMORY / 65536,
							"maximum": 32768
						});
					}
					updateMemoryViews();
					var __ATPRERUN__ = [];
					var __ATINIT__ = [];
					var __ATMAIN__ = [];
					var __ATPOSTRUN__ = [];
					var __RELOC_FUNCS__ = [];
					var runtimeInitialized = false;
					function preRun() {
						if (Module["preRun"]) {
							if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
							while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
						}
						callRuntimeCallbacks(__ATPRERUN__);
					}
					function initRuntime() {
						runtimeInitialized = true;
						callRuntimeCallbacks(__RELOC_FUNCS__);
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
					/** @param {string|number=} what */ function abort(what) {
						Module["onAbort"]?.(what);
						what = "Aborted(" + what + ")";
						err(what);
						ABORT = true;
						EXITSTATUS = 1;
						what += ". Build with -sASSERTIONS for more info.";
						throw new WebAssembly.RuntimeError(what);
					}
					var dataURIPrefix = "data:application/octet-stream;base64,";
					/**
					* Indicates whether filename is a base64 data URI.
					* @noinline
					*/ var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
					/**
					* Indicates whether filename is delivered via file protocol (as opposed to http/https)
					* @noinline
					*/ var isFileURI = (filename) => filename.startsWith("file://");
					function findWasmBinary() {
						var f = "tree-sitter.wasm";
						if (!isDataURI(f)) return locateFile(f);
						return f;
					}
					var wasmBinaryFile;
					function getBinarySync(file) {
						if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
						if (readBinary) return readBinary(file);
						throw "both async and sync fetching of the wasm failed";
					}
					function getBinaryPromise(binaryFile) {
						if (!wasmBinary) return readAsync(binaryFile).then((response) => new Uint8Array(response), () => getBinarySync(binaryFile));
						return Promise.resolve().then(() => getBinarySync(binaryFile));
					}
					function instantiateArrayBuffer(binaryFile, imports, receiver) {
						return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then(receiver, (reason) => {
							err(`failed to asynchronously prepare wasm: ${reason}`);
							abort(reason);
						});
					}
					function instantiateAsync(binary, binaryFile, imports, callback) {
						if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
							return WebAssembly.instantiateStreaming(response, imports).then(callback, function(reason) {
								err(`wasm streaming compile failed: ${reason}`);
								err("falling back to ArrayBuffer instantiation");
								return instantiateArrayBuffer(binaryFile, imports, callback);
							});
						});
						return instantiateArrayBuffer(binaryFile, imports, callback);
					}
					function getWasmImports() {
						return {
							"env": wasmImports,
							"wasi_snapshot_preview1": wasmImports,
							"GOT.mem": new Proxy(wasmImports, GOTHandler),
							"GOT.func": new Proxy(wasmImports, GOTHandler)
						};
					}
					function createWasm() {
						var info = getWasmImports();
						/** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
							wasmExports = instance.exports;
							wasmExports = relocateExports(wasmExports, 1024);
							var metadata = getDylinkMetadata(module);
							if (metadata.neededDynlibs) dynamicLibraries = metadata.neededDynlibs.concat(dynamicLibraries);
							mergeLibSymbols(wasmExports, "main");
							LDSO.init();
							loadDylibs();
							addOnInit(wasmExports["__wasm_call_ctors"]);
							__RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
							removeRunDependency("wasm-instantiate");
							return wasmExports;
						}
						addRunDependency("wasm-instantiate");
						function receiveInstantiationResult(result) {
							receiveInstance(result["instance"], result["module"]);
						}
						if (Module["instantiateWasm"]) try {
							return Module["instantiateWasm"](info, receiveInstance);
						} catch (e) {
							err(`Module.instantiateWasm callback failed with error: ${e}`);
							return false;
						}
						if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();
						instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
						return {};
					}
					var ASM_CONSTS = {};
					/** @constructor */ function ExitStatus(status) {
						this.name = "ExitStatus";
						this.message = `Program terminated with exit(${status})`;
						this.status = status;
					}
					var GOT = {};
					var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
					var GOTHandler = { get(obj, symName) {
						var rtn = GOT[symName];
						if (!rtn) rtn = GOT[symName] = new WebAssembly.Global({
							"value": "i32",
							"mutable": true
						});
						if (!currentModuleWeakSymbols.has(symName)) rtn.required = true;
						return rtn;
					} };
					var LE_HEAP_LOAD_F32 = (byteOffset) => HEAP_DATA_VIEW.getFloat32(byteOffset, true);
					var LE_HEAP_LOAD_F64 = (byteOffset) => HEAP_DATA_VIEW.getFloat64(byteOffset, true);
					var LE_HEAP_LOAD_I16 = (byteOffset) => HEAP_DATA_VIEW.getInt16(byteOffset, true);
					var LE_HEAP_LOAD_I32 = (byteOffset) => HEAP_DATA_VIEW.getInt32(byteOffset, true);
					var LE_HEAP_LOAD_U32 = (byteOffset) => HEAP_DATA_VIEW.getUint32(byteOffset, true);
					var LE_HEAP_STORE_F32 = (byteOffset, value) => HEAP_DATA_VIEW.setFloat32(byteOffset, value, true);
					var LE_HEAP_STORE_F64 = (byteOffset, value) => HEAP_DATA_VIEW.setFloat64(byteOffset, value, true);
					var LE_HEAP_STORE_I16 = (byteOffset, value) => HEAP_DATA_VIEW.setInt16(byteOffset, value, true);
					var LE_HEAP_STORE_I32 = (byteOffset, value) => HEAP_DATA_VIEW.setInt32(byteOffset, value, true);
					var LE_HEAP_STORE_U32 = (byteOffset, value) => HEAP_DATA_VIEW.setUint32(byteOffset, value, true);
					var callRuntimeCallbacks = (callbacks) => {
						while (callbacks.length > 0) callbacks.shift()(Module);
					};
					var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
					/**
					* Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
					* array that contains uint8 values, returns a copy of that string as a
					* Javascript String object.
					* heapOrArray is either a regular array, or a JavaScript typed array view.
					* @param {number} idx
					* @param {number=} maxBytesToRead
					* @return {string}
					*/ var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
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
					var getDylinkMetadata = (binary) => {
						var offset = 0;
						var end = 0;
						function getU8() {
							return binary[offset++];
						}
						function getLEB() {
							var ret = 0;
							var mul = 1;
							while (1) {
								var byte = binary[offset++];
								ret += (byte & 127) * mul;
								mul *= 128;
								if (!(byte & 128)) break;
							}
							return ret;
						}
						function getString() {
							var len = getLEB();
							offset += len;
							return UTF8ArrayToString(binary, offset - len, len);
						}
						/** @param {string=} message */ function failIf(condition, message) {
							if (condition) throw new Error(message);
						}
						var name = "dylink.0";
						if (binary instanceof WebAssembly.Module) {
							var dylinkSection = WebAssembly.Module.customSections(binary, name);
							if (dylinkSection.length === 0) {
								name = "dylink";
								dylinkSection = WebAssembly.Module.customSections(binary, name);
							}
							failIf(dylinkSection.length === 0, "need dylink section");
							binary = new Uint8Array(dylinkSection[0]);
							end = binary.length;
						} else {
							var int32View = new Uint32Array(new Uint8Array(binary.subarray(0, 24)).buffer);
							failIf(!(int32View[0] == 1836278016 || int32View[0] == 6386541), "need to see wasm magic number");
							failIf(binary[8] !== 0, "need the dylink section to be first");
							offset = 9;
							var section_size = getLEB();
							end = offset + section_size;
							name = getString();
						}
						var customSection = {
							neededDynlibs: [],
							tlsExports: /* @__PURE__ */ new Set(),
							weakImports: /* @__PURE__ */ new Set()
						};
						if (name == "dylink") {
							customSection.memorySize = getLEB();
							customSection.memoryAlign = getLEB();
							customSection.tableSize = getLEB();
							customSection.tableAlign = getLEB();
							var neededDynlibsCount = getLEB();
							for (var i = 0; i < neededDynlibsCount; ++i) {
								var libname = getString();
								customSection.neededDynlibs.push(libname);
							}
						} else {
							failIf(name !== "dylink.0");
							var WASM_DYLINK_MEM_INFO = 1;
							var WASM_DYLINK_NEEDED = 2;
							var WASM_DYLINK_EXPORT_INFO = 3;
							var WASM_DYLINK_IMPORT_INFO = 4;
							var WASM_SYMBOL_TLS = 256;
							var WASM_SYMBOL_BINDING_MASK = 3;
							var WASM_SYMBOL_BINDING_WEAK = 1;
							while (offset < end) {
								var subsectionType = getU8();
								var subsectionSize = getLEB();
								if (subsectionType === WASM_DYLINK_MEM_INFO) {
									customSection.memorySize = getLEB();
									customSection.memoryAlign = getLEB();
									customSection.tableSize = getLEB();
									customSection.tableAlign = getLEB();
								} else if (subsectionType === WASM_DYLINK_NEEDED) {
									var neededDynlibsCount = getLEB();
									for (var i = 0; i < neededDynlibsCount; ++i) {
										libname = getString();
										customSection.neededDynlibs.push(libname);
									}
								} else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
									var count = getLEB();
									while (count--) {
										var symname = getString();
										var flags = getLEB();
										if (flags & WASM_SYMBOL_TLS) customSection.tlsExports.add(symname);
									}
								} else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
									var count = getLEB();
									while (count--) {
										var modname = getString();
										var symname = getString();
										var flags = getLEB();
										if ((flags & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) customSection.weakImports.add(symname);
									}
								} else offset += subsectionSize;
							}
						}
						return customSection;
					};
					/**
					* @param {number} ptr
					* @param {string} type
					*/ function getValue(ptr, type = "i8") {
						if (type.endsWith("*")) type = "*";
						switch (type) {
							case "i1": return HEAP8[ptr];
							case "i8": return HEAP8[ptr];
							case "i16": return LE_HEAP_LOAD_I16((ptr >> 1) * 2);
							case "i32": return LE_HEAP_LOAD_I32((ptr >> 2) * 4);
							case "i64": abort("to do getValue(i64) use WASM_BIGINT");
							case "float": return LE_HEAP_LOAD_F32((ptr >> 2) * 4);
							case "double": return LE_HEAP_LOAD_F64((ptr >> 3) * 8);
							case "*": return LE_HEAP_LOAD_U32((ptr >> 2) * 4);
							default: abort(`invalid type for getValue: ${type}`);
						}
					}
					var newDSO = (name, handle, syms) => {
						var dso = {
							refcount: Infinity,
							name,
							exports: syms,
							global: true
						};
						LDSO.loadedLibsByName[name] = dso;
						if (handle != void 0) LDSO.loadedLibsByHandle[handle] = dso;
						return dso;
					};
					var LDSO = {
						loadedLibsByName: {},
						loadedLibsByHandle: {},
						init() {
							newDSO("__main__", 0, wasmImports);
						}
					};
					var ___heap_base = 78112;
					var zeroMemory = (address, size) => {
						HEAPU8.fill(0, address, address + size);
						return address;
					};
					var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
					var getMemory = (size) => {
						if (runtimeInitialized) return zeroMemory(_malloc(size), size);
						var ret = ___heap_base;
						var end = ret + alignMemory(size, 16);
						___heap_base = end;
						GOT["__heap_base"].value = end;
						return ret;
					};
					var isInternalSym = (symName) => [
						"__cpp_exception",
						"__c_longjmp",
						"__wasm_apply_data_relocs",
						"__dso_handle",
						"__tls_size",
						"__tls_align",
						"__set_stack_limits",
						"_emscripten_tls_init",
						"__wasm_init_tls",
						"__wasm_call_ctors",
						"__start_em_asm",
						"__stop_em_asm",
						"__start_em_js",
						"__stop_em_js"
					].includes(symName) || symName.startsWith("__em_js__");
					var uleb128Encode = (n, target) => {
						if (n < 128) target.push(n);
						else target.push(n % 128 | 128, n >> 7);
					};
					var sigToWasmTypes = (sig) => {
						var typeNames = {
							"i": "i32",
							"j": "i64",
							"f": "f32",
							"d": "f64",
							"e": "externref",
							"p": "i32"
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
							"i": 127,
							"p": 127,
							"j": 126,
							"f": 125,
							"d": 124,
							"e": 111
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
						return new WebAssembly.Instance(module, { "e": { "f": func } }).exports["f"];
					};
					var wasmTableMirror = [];
					/** @type {WebAssembly.Table} */ var wasmTable = new WebAssembly.Table({
						"initial": 28,
						"element": "anyfunc"
					});
					var getWasmTableEntry = (funcPtr) => {
						var func = wasmTableMirror[funcPtr];
						if (!func) {
							if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
							wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
						}
						return func;
					};
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
					var setWasmTableEntry = (idx, func) => {
						wasmTable.set(idx, func);
						wasmTableMirror[idx] = wasmTable.get(idx);
					};
					/** @param {string=} sig */ var addFunction = (func, sig) => {
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
					var updateGOT = (exports, replace) => {
						for (var symName in exports) {
							if (isInternalSym(symName)) continue;
							var value = exports[symName];
							if (symName.startsWith("orig$")) {
								symName = symName.split("$")[1];
								replace = true;
							}
							GOT[symName] ||= new WebAssembly.Global({
								"value": "i32",
								"mutable": true
							});
							if (replace || GOT[symName].value == 0) {
								if (typeof value == "function") GOT[symName].value = addFunction(value);
								else if (typeof value == "number") GOT[symName].value = value;
								else err(`unhandled export type for '${symName}': ${typeof value}`);
							}
						}
					};
					/** @param {boolean=} replace */ var relocateExports = (exports, memoryBase, replace) => {
						var relocated = {};
						for (var e in exports) {
							var value = exports[e];
							if (typeof value == "object") value = value.value;
							if (typeof value == "number") value += memoryBase;
							relocated[e] = value;
						}
						updateGOT(relocated, replace);
						return relocated;
					};
					var isSymbolDefined = (symName) => {
						var existing = wasmImports[symName];
						if (!existing || existing.stub) return false;
						return true;
					};
					var dynCallLegacy = (sig, ptr, args) => {
						sig = sig.replace(/p/g, "i");
						var f = Module["dynCall_" + sig];
						return f(ptr, ...args);
					};
					var dynCall = (sig, ptr, args = []) => {
						if (sig.includes("j")) return dynCallLegacy(sig, ptr, args);
						return getWasmTableEntry(ptr)(...args);
					};
					var stackSave = () => _emscripten_stack_get_current();
					var stackRestore = (val) => __emscripten_stack_restore(val);
					var createInvokeFunction = (sig) => (ptr, ...args) => {
						var sp = stackSave();
						try {
							return dynCall(sig, ptr, args);
						} catch (e) {
							stackRestore(sp);
							if (e !== e + 0) throw e;
							_setThrew(1, 0);
						}
					};
					var resolveGlobalSymbol = (symName, direct = false) => {
						var sym;
						if (direct && "orig$" + symName in wasmImports) symName = "orig$" + symName;
						if (isSymbolDefined(symName)) sym = wasmImports[symName];
						else if (symName.startsWith("invoke_")) sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
						return {
							sym,
							name: symName
						};
					};
					/**
					* Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
					* emscripten HEAP, returns a copy of that string as a Javascript String object.
					*
					* @param {number} ptr
					* @param {number=} maxBytesToRead - An optional length that specifies the
					*   maximum number of bytes to read. You can omit this parameter to scan the
					*   string until the first 0 byte. If maxBytesToRead is passed, and the string
					*   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
					*   string will cut short at that byte index (i.e. maxBytesToRead will not
					*   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
					*   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
					*   JS JIT optimizations off, so it is worth to consider consistently using one
					* @return {string}
					*/ var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
					/**
					* @param {string=} libName
					* @param {Object=} localScope
					* @param {number=} handle
					*/ var loadWebAssemblyModule = (binary, flags, libName, localScope, handle) => {
						var metadata = getDylinkMetadata(binary);
						currentModuleWeakSymbols = metadata.weakImports;
						function loadModule() {
							var firstLoad = !handle || !HEAP8[handle + 8];
							if (firstLoad) {
								var memAlign = Math.pow(2, metadata.memoryAlign);
								var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
								var tableBase = metadata.tableSize ? wasmTable.length : 0;
								if (handle) {
									HEAP8[handle + 8] = 1;
									LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase);
									LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize);
									LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase);
									LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize);
								}
							} else {
								memoryBase = LE_HEAP_LOAD_U32((handle + 12 >> 2) * 4);
								tableBase = LE_HEAP_LOAD_U32((handle + 20 >> 2) * 4);
							}
							var tableGrowthNeeded = tableBase + metadata.tableSize - wasmTable.length;
							if (tableGrowthNeeded > 0) wasmTable.grow(tableGrowthNeeded);
							var moduleExports;
							function resolveSymbol(sym) {
								var resolved = resolveGlobalSymbol(sym).sym;
								if (!resolved && localScope) resolved = localScope[sym];
								if (!resolved) resolved = moduleExports[sym];
								return resolved;
							}
							var proxyHandler = { get(stubs, prop) {
								switch (prop) {
									case "__memory_base": return memoryBase;
									case "__table_base": return tableBase;
								}
								if (prop in wasmImports && !wasmImports[prop].stub) return wasmImports[prop];
								if (!(prop in stubs)) {
									var resolved;
									stubs[prop] = (...args) => {
										resolved ||= resolveSymbol(prop);
										return resolved(...args);
									};
								}
								return stubs[prop];
							} };
							var proxy = new Proxy({}, proxyHandler);
							var info = {
								"GOT.mem": new Proxy({}, GOTHandler),
								"GOT.func": new Proxy({}, GOTHandler),
								"env": proxy,
								"wasi_snapshot_preview1": proxy
							};
							function postInstantiation(module, instance) {
								updateTableMap(tableBase, metadata.tableSize);
								moduleExports = relocateExports(instance.exports, memoryBase);
								if (!flags.allowUndefined) reportUndefinedSymbols();
								function addEmAsm(addr, body) {
									var args = [];
									var arity = 0;
									for (; arity < 16; arity++) if (body.indexOf("$" + arity) != -1) args.push("$" + arity);
									else break;
									args = args.join(",");
									var func = `(${args}) => { ${body} };`;
									ASM_CONSTS[start] = eval(func);
								}
								if ("__start_em_asm" in moduleExports) {
									var start = moduleExports["__start_em_asm"];
									var stop = moduleExports["__stop_em_asm"];
									while (start < stop) {
										var jsString = UTF8ToString(start);
										addEmAsm(start, jsString);
										start = HEAPU8.indexOf(0, start) + 1;
									}
								}
								function addEmJs(name, cSig, body) {
									var jsArgs = [];
									cSig = cSig.slice(1, -1);
									if (cSig != "void") {
										cSig = cSig.split(",");
										for (var i in cSig) {
											var jsArg = cSig[i].split(" ").pop();
											jsArgs.push(jsArg.replace("*", ""));
										}
									}
									var func = `(${jsArgs}) => ${body};`;
									moduleExports[name] = eval(func);
								}
								for (var name in moduleExports) if (name.startsWith("__em_js__")) {
									var start = moduleExports[name];
									var jsString = UTF8ToString(start);
									var parts = jsString.split("<::>");
									addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
									delete moduleExports[name];
								}
								var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
								if (applyRelocs) {
									if (runtimeInitialized) applyRelocs();
									else __RELOC_FUNCS__.push(applyRelocs);
								}
								var init = moduleExports["__wasm_call_ctors"];
								if (init) {
									if (runtimeInitialized) init();
									else __ATINIT__.push(init);
								}
								return moduleExports;
							}
							if (flags.loadAsync) {
								if (binary instanceof WebAssembly.Module) {
									var instance = new WebAssembly.Instance(binary, info);
									return Promise.resolve(postInstantiation(binary, instance));
								}
								return WebAssembly.instantiate(binary, info).then((result) => postInstantiation(result.module, result.instance));
							}
							var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
							var instance = new WebAssembly.Instance(module, info);
							return postInstantiation(module, instance);
						}
						if (flags.loadAsync) return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
						metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
						return loadModule();
					};
					var mergeLibSymbols = (exports, libName) => {
						for (var [sym, exp] of Object.entries(exports)) {
							const setImport = (target) => {
								if (!isSymbolDefined(target)) wasmImports[target] = exp;
							};
							setImport(sym);
							const main_alias = "__main_argc_argv";
							if (sym == "main") setImport(main_alias);
							if (sym == main_alias) setImport("main");
							if (sym.startsWith("dynCall_") && !Module.hasOwnProperty(sym)) Module[sym] = exp;
						}
					};
					/** @param {boolean=} noRunDep */ var asyncLoad = (url, onload, onerror, noRunDep) => {
						var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : "";
						readAsync(url).then((arrayBuffer) => {
							onload(new Uint8Array(arrayBuffer));
							if (dep) removeRunDependency(dep);
						}, (err) => {
							if (onerror) onerror();
							else throw `Loading data file "${url}" failed.`;
						});
						if (dep) addRunDependency(dep);
					};
					/**
					* @param {number=} handle
					* @param {Object=} localScope
					*/ function loadDynamicLibrary(libName, flags = {
						global: true,
						nodelete: true
					}, localScope, handle) {
						var dso = LDSO.loadedLibsByName[libName];
						if (dso) {
							if (!flags.global) {
								if (localScope) Object.assign(localScope, dso.exports);
							} else if (!dso.global) {
								dso.global = true;
								mergeLibSymbols(dso.exports, libName);
							}
							if (flags.nodelete && dso.refcount !== Infinity) dso.refcount = Infinity;
							dso.refcount++;
							if (handle) LDSO.loadedLibsByHandle[handle] = dso;
							return flags.loadAsync ? Promise.resolve(true) : true;
						}
						dso = newDSO(libName, handle, "loading");
						dso.refcount = flags.nodelete ? Infinity : 1;
						dso.global = flags.global;
						function loadLibData() {
							if (handle) {
								var data = LE_HEAP_LOAD_U32((handle + 28 >> 2) * 4);
								var dataSize = LE_HEAP_LOAD_U32((handle + 32 >> 2) * 4);
								if (data && dataSize) {
									var libData = HEAP8.slice(data, data + dataSize);
									return flags.loadAsync ? Promise.resolve(libData) : libData;
								}
							}
							var libFile = locateFile(libName);
							if (flags.loadAsync) return new Promise(function(resolve, reject) {
								asyncLoad(libFile, resolve, reject);
							});
							if (!readBinary) throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
							return readBinary(libFile);
						}
						function getExports() {
							if (flags.loadAsync) return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags, libName, localScope, handle));
							return loadWebAssemblyModule(loadLibData(), flags, libName, localScope, handle);
						}
						function moduleLoaded(exports) {
							if (dso.global) mergeLibSymbols(exports, libName);
							else if (localScope) Object.assign(localScope, exports);
							dso.exports = exports;
						}
						if (flags.loadAsync) return getExports().then((exports) => {
							moduleLoaded(exports);
							return true;
						});
						moduleLoaded(getExports());
						return true;
					}
					var reportUndefinedSymbols = () => {
						for (var [symName, entry] of Object.entries(GOT)) if (entry.value == 0) {
							var value = resolveGlobalSymbol(symName, true).sym;
							if (!value && !entry.required) continue;
							if (typeof value == "function")
 /** @suppress {checkTypes} */ entry.value = addFunction(value, value.sig);
							else if (typeof value == "number") entry.value = value;
							else throw new Error(`bad export type for '${symName}': ${typeof value}`);
						}
					};
					var loadDylibs = () => {
						if (!dynamicLibraries.length) {
							reportUndefinedSymbols();
							return;
						}
						addRunDependency("loadDylibs");
						dynamicLibraries.reduce((chain, lib) => chain.then(() => loadDynamicLibrary(lib, {
							loadAsync: true,
							global: true,
							nodelete: true,
							allowUndefined: true
						})), Promise.resolve()).then(() => {
							reportUndefinedSymbols();
							removeRunDependency("loadDylibs");
						});
					};
					var noExitRuntime = Module["noExitRuntime"] || true;
					/**
					* @param {number} ptr
					* @param {number} value
					* @param {string} type
					*/ function setValue(ptr, value, type = "i8") {
						if (type.endsWith("*")) type = "*";
						switch (type) {
							case "i1":
								HEAP8[ptr] = value;
								break;
							case "i8":
								HEAP8[ptr] = value;
								break;
							case "i16":
								LE_HEAP_STORE_I16((ptr >> 1) * 2, value);
								break;
							case "i32":
								LE_HEAP_STORE_I32((ptr >> 2) * 4, value);
								break;
							case "i64": abort("to do setValue(i64) use WASM_BIGINT");
							case "float":
								LE_HEAP_STORE_F32((ptr >> 2) * 4, value);
								break;
							case "double":
								LE_HEAP_STORE_F64((ptr >> 3) * 8, value);
								break;
							case "*":
								LE_HEAP_STORE_U32((ptr >> 2) * 4, value);
								break;
							default: abort(`invalid type for setValue: ${type}`);
						}
					}
					var ___memory_base = new WebAssembly.Global({
						"value": "i32",
						"mutable": false
					}, 1024);
					var ___stack_pointer = new WebAssembly.Global({
						"value": "i32",
						"mutable": true
					}, 78112);
					var ___table_base = new WebAssembly.Global({
						"value": "i32",
						"mutable": false
					}, 1);
					var __abort_js = () => {
						abort("");
					};
					__abort_js.sig = "v";
					var nowIsMonotonic = 1;
					var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
					__emscripten_get_now_is_monotonic.sig = "i";
					var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);
					__emscripten_memcpy_js.sig = "vppp";
					var _emscripten_date_now = () => Date.now();
					_emscripten_date_now.sig = "d";
					var _emscripten_get_now = () => performance.now();
					_emscripten_get_now.sig = "d";
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
					_emscripten_resize_heap.sig = "ip";
					var _fd_close = (fd) => 52;
					_fd_close.sig = "ii";
					var convertI32PairToI53Checked = (lo, hi) => hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
					function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
						var offset = convertI32PairToI53Checked(offset_low, offset_high);
						return 70;
					}
					_fd_seek.sig = "iiiiip";
					var printCharBuffers = [
						null,
						[],
						[]
					];
					var printChar = (stream, curr) => {
						var buffer = printCharBuffers[stream];
						if (curr === 0 || curr === 10) {
							(stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
							buffer.length = 0;
						} else buffer.push(curr);
					};
					var _fd_write = (fd, iov, iovcnt, pnum) => {
						var num = 0;
						for (var i = 0; i < iovcnt; i++) {
							var ptr = LE_HEAP_LOAD_U32((iov >> 2) * 4);
							var len = LE_HEAP_LOAD_U32((iov + 4 >> 2) * 4);
							iov += 8;
							for (var j = 0; j < len; j++) printChar(fd, HEAPU8[ptr + j]);
							num += len;
						}
						LE_HEAP_STORE_U32((pnum >> 2) * 4, num);
						return 0;
					};
					_fd_write.sig = "iippp";
					function _tree_sitter_log_callback(isLexMessage, messageAddress) {
						if (currentLogCallback) {
							const message = UTF8ToString(messageAddress);
							currentLogCallback(message, isLexMessage !== 0);
						}
					}
					function _tree_sitter_parse_callback(inputBufferAddress, index, row, column, lengthAddress) {
						const INPUT_BUFFER_SIZE = 10240;
						const string = currentParseCallback(index, {
							row,
							column
						});
						if (typeof string === "string") {
							setValue(lengthAddress, string.length, "i32");
							stringToUTF16(string, inputBufferAddress, INPUT_BUFFER_SIZE);
						} else setValue(lengthAddress, 0, "i32");
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
					_proc_exit.sig = "vi";
					/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
						EXITSTATUS = status;
						_proc_exit(status);
					};
					var handleException = (e) => {
						if (e instanceof ExitStatus || e == "unwind") return EXITSTATUS;
						quit_(1, e);
					};
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
					var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
					var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
					var stringToUTF8OnStack = (str) => {
						var size = lengthBytesUTF8(str) + 1;
						var ret = stackAlloc(size);
						stringToUTF8(str, ret, size);
						return ret;
					};
					var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
						maxBytesToWrite ??= 2147483647;
						if (maxBytesToWrite < 2) return 0;
						maxBytesToWrite -= 2;
						var startPtr = outPtr;
						var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
						for (var i = 0; i < numCharsToWrite; ++i) {
							var codeUnit = str.charCodeAt(i);
							LE_HEAP_STORE_I16((outPtr >> 1) * 2, codeUnit);
							outPtr += 2;
						}
						LE_HEAP_STORE_I16((outPtr >> 1) * 2, 0);
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
					var wasmImports = {
						/** @export */ __heap_base: ___heap_base,
						/** @export */ __indirect_function_table: wasmTable,
						/** @export */ __memory_base: ___memory_base,
						/** @export */ __stack_pointer: ___stack_pointer,
						/** @export */ __table_base: ___table_base,
						/** @export */ _abort_js: __abort_js,
						/** @export */ _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
						/** @export */ _emscripten_memcpy_js: __emscripten_memcpy_js,
						/** @export */ emscripten_get_now: _emscripten_get_now,
						/** @export */ emscripten_resize_heap: _emscripten_resize_heap,
						/** @export */ fd_close: _fd_close,
						/** @export */ fd_seek: _fd_seek,
						/** @export */ fd_write: _fd_write,
						/** @export */ memory: wasmMemory,
						/** @export */ tree_sitter_log_callback: _tree_sitter_log_callback,
						/** @export */ tree_sitter_parse_callback: _tree_sitter_parse_callback
					};
					var wasmExports = createWasm();
					var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["__wasm_call_ctors"])();
					var ___wasm_apply_data_relocs = () => (___wasm_apply_data_relocs = wasmExports["__wasm_apply_data_relocs"])();
					var _malloc = Module["_malloc"] = (a0) => (_malloc = Module["_malloc"] = wasmExports["malloc"])(a0);
					var _calloc = Module["_calloc"] = (a0, a1) => (_calloc = Module["_calloc"] = wasmExports["calloc"])(a0, a1);
					var _realloc = Module["_realloc"] = (a0, a1) => (_realloc = Module["_realloc"] = wasmExports["realloc"])(a0, a1);
					var _free = Module["_free"] = (a0) => (_free = Module["_free"] = wasmExports["free"])(a0);
					var _ts_language_symbol_count = Module["_ts_language_symbol_count"] = (a0) => (_ts_language_symbol_count = Module["_ts_language_symbol_count"] = wasmExports["ts_language_symbol_count"])(a0);
					var _ts_language_state_count = Module["_ts_language_state_count"] = (a0) => (_ts_language_state_count = Module["_ts_language_state_count"] = wasmExports["ts_language_state_count"])(a0);
					var _ts_language_version = Module["_ts_language_version"] = (a0) => (_ts_language_version = Module["_ts_language_version"] = wasmExports["ts_language_version"])(a0);
					var _ts_language_field_count = Module["_ts_language_field_count"] = (a0) => (_ts_language_field_count = Module["_ts_language_field_count"] = wasmExports["ts_language_field_count"])(a0);
					var _ts_language_next_state = Module["_ts_language_next_state"] = (a0, a1, a2) => (_ts_language_next_state = Module["_ts_language_next_state"] = wasmExports["ts_language_next_state"])(a0, a1, a2);
					var _ts_language_symbol_name = Module["_ts_language_symbol_name"] = (a0, a1) => (_ts_language_symbol_name = Module["_ts_language_symbol_name"] = wasmExports["ts_language_symbol_name"])(a0, a1);
					var _ts_language_symbol_for_name = Module["_ts_language_symbol_for_name"] = (a0, a1, a2, a3) => (_ts_language_symbol_for_name = Module["_ts_language_symbol_for_name"] = wasmExports["ts_language_symbol_for_name"])(a0, a1, a2, a3);
					var _strncmp = Module["_strncmp"] = (a0, a1, a2) => (_strncmp = Module["_strncmp"] = wasmExports["strncmp"])(a0, a1, a2);
					var _ts_language_symbol_type = Module["_ts_language_symbol_type"] = (a0, a1) => (_ts_language_symbol_type = Module["_ts_language_symbol_type"] = wasmExports["ts_language_symbol_type"])(a0, a1);
					var _ts_language_field_name_for_id = Module["_ts_language_field_name_for_id"] = (a0, a1) => (_ts_language_field_name_for_id = Module["_ts_language_field_name_for_id"] = wasmExports["ts_language_field_name_for_id"])(a0, a1);
					var _ts_lookahead_iterator_new = Module["_ts_lookahead_iterator_new"] = (a0, a1) => (_ts_lookahead_iterator_new = Module["_ts_lookahead_iterator_new"] = wasmExports["ts_lookahead_iterator_new"])(a0, a1);
					var _ts_lookahead_iterator_delete = Module["_ts_lookahead_iterator_delete"] = (a0) => (_ts_lookahead_iterator_delete = Module["_ts_lookahead_iterator_delete"] = wasmExports["ts_lookahead_iterator_delete"])(a0);
					var _ts_lookahead_iterator_reset_state = Module["_ts_lookahead_iterator_reset_state"] = (a0, a1) => (_ts_lookahead_iterator_reset_state = Module["_ts_lookahead_iterator_reset_state"] = wasmExports["ts_lookahead_iterator_reset_state"])(a0, a1);
					var _ts_lookahead_iterator_reset = Module["_ts_lookahead_iterator_reset"] = (a0, a1, a2) => (_ts_lookahead_iterator_reset = Module["_ts_lookahead_iterator_reset"] = wasmExports["ts_lookahead_iterator_reset"])(a0, a1, a2);
					var _ts_lookahead_iterator_next = Module["_ts_lookahead_iterator_next"] = (a0) => (_ts_lookahead_iterator_next = Module["_ts_lookahead_iterator_next"] = wasmExports["ts_lookahead_iterator_next"])(a0);
					var _ts_lookahead_iterator_current_symbol = Module["_ts_lookahead_iterator_current_symbol"] = (a0) => (_ts_lookahead_iterator_current_symbol = Module["_ts_lookahead_iterator_current_symbol"] = wasmExports["ts_lookahead_iterator_current_symbol"])(a0);
					var _memset = Module["_memset"] = (a0, a1, a2) => (_memset = Module["_memset"] = wasmExports["memset"])(a0, a1, a2);
					var _memcpy = Module["_memcpy"] = (a0, a1, a2) => (_memcpy = Module["_memcpy"] = wasmExports["memcpy"])(a0, a1, a2);
					var _ts_parser_delete = Module["_ts_parser_delete"] = (a0) => (_ts_parser_delete = Module["_ts_parser_delete"] = wasmExports["ts_parser_delete"])(a0);
					var _ts_parser_reset = Module["_ts_parser_reset"] = (a0) => (_ts_parser_reset = Module["_ts_parser_reset"] = wasmExports["ts_parser_reset"])(a0);
					var _ts_parser_set_language = Module["_ts_parser_set_language"] = (a0, a1) => (_ts_parser_set_language = Module["_ts_parser_set_language"] = wasmExports["ts_parser_set_language"])(a0, a1);
					var _ts_parser_timeout_micros = Module["_ts_parser_timeout_micros"] = (a0) => (_ts_parser_timeout_micros = Module["_ts_parser_timeout_micros"] = wasmExports["ts_parser_timeout_micros"])(a0);
					var _ts_parser_set_timeout_micros = Module["_ts_parser_set_timeout_micros"] = (a0, a1, a2) => (_ts_parser_set_timeout_micros = Module["_ts_parser_set_timeout_micros"] = wasmExports["ts_parser_set_timeout_micros"])(a0, a1, a2);
					var _ts_parser_set_included_ranges = Module["_ts_parser_set_included_ranges"] = (a0, a1, a2) => (_ts_parser_set_included_ranges = Module["_ts_parser_set_included_ranges"] = wasmExports["ts_parser_set_included_ranges"])(a0, a1, a2);
					var _memmove = Module["_memmove"] = (a0, a1, a2) => (_memmove = Module["_memmove"] = wasmExports["memmove"])(a0, a1, a2);
					var _memcmp = Module["_memcmp"] = (a0, a1, a2) => (_memcmp = Module["_memcmp"] = wasmExports["memcmp"])(a0, a1, a2);
					var _ts_query_new = Module["_ts_query_new"] = (a0, a1, a2, a3, a4) => (_ts_query_new = Module["_ts_query_new"] = wasmExports["ts_query_new"])(a0, a1, a2, a3, a4);
					var _ts_query_delete = Module["_ts_query_delete"] = (a0) => (_ts_query_delete = Module["_ts_query_delete"] = wasmExports["ts_query_delete"])(a0);
					var _iswspace = Module["_iswspace"] = (a0) => (_iswspace = Module["_iswspace"] = wasmExports["iswspace"])(a0);
					var _iswalnum = Module["_iswalnum"] = (a0) => (_iswalnum = Module["_iswalnum"] = wasmExports["iswalnum"])(a0);
					var _ts_query_pattern_count = Module["_ts_query_pattern_count"] = (a0) => (_ts_query_pattern_count = Module["_ts_query_pattern_count"] = wasmExports["ts_query_pattern_count"])(a0);
					var _ts_query_capture_count = Module["_ts_query_capture_count"] = (a0) => (_ts_query_capture_count = Module["_ts_query_capture_count"] = wasmExports["ts_query_capture_count"])(a0);
					var _ts_query_string_count = Module["_ts_query_string_count"] = (a0) => (_ts_query_string_count = Module["_ts_query_string_count"] = wasmExports["ts_query_string_count"])(a0);
					var _ts_query_capture_name_for_id = Module["_ts_query_capture_name_for_id"] = (a0, a1, a2) => (_ts_query_capture_name_for_id = Module["_ts_query_capture_name_for_id"] = wasmExports["ts_query_capture_name_for_id"])(a0, a1, a2);
					var _ts_query_string_value_for_id = Module["_ts_query_string_value_for_id"] = (a0, a1, a2) => (_ts_query_string_value_for_id = Module["_ts_query_string_value_for_id"] = wasmExports["ts_query_string_value_for_id"])(a0, a1, a2);
					var _ts_query_predicates_for_pattern = Module["_ts_query_predicates_for_pattern"] = (a0, a1, a2) => (_ts_query_predicates_for_pattern = Module["_ts_query_predicates_for_pattern"] = wasmExports["ts_query_predicates_for_pattern"])(a0, a1, a2);
					var _ts_query_disable_capture = Module["_ts_query_disable_capture"] = (a0, a1, a2) => (_ts_query_disable_capture = Module["_ts_query_disable_capture"] = wasmExports["ts_query_disable_capture"])(a0, a1, a2);
					var _ts_tree_copy = Module["_ts_tree_copy"] = (a0) => (_ts_tree_copy = Module["_ts_tree_copy"] = wasmExports["ts_tree_copy"])(a0);
					var _ts_tree_delete = Module["_ts_tree_delete"] = (a0) => (_ts_tree_delete = Module["_ts_tree_delete"] = wasmExports["ts_tree_delete"])(a0);
					var _ts_init = Module["_ts_init"] = () => (_ts_init = Module["_ts_init"] = wasmExports["ts_init"])();
					var _ts_parser_new_wasm = Module["_ts_parser_new_wasm"] = () => (_ts_parser_new_wasm = Module["_ts_parser_new_wasm"] = wasmExports["ts_parser_new_wasm"])();
					var _ts_parser_enable_logger_wasm = Module["_ts_parser_enable_logger_wasm"] = (a0, a1) => (_ts_parser_enable_logger_wasm = Module["_ts_parser_enable_logger_wasm"] = wasmExports["ts_parser_enable_logger_wasm"])(a0, a1);
					var _ts_parser_parse_wasm = Module["_ts_parser_parse_wasm"] = (a0, a1, a2, a3, a4) => (_ts_parser_parse_wasm = Module["_ts_parser_parse_wasm"] = wasmExports["ts_parser_parse_wasm"])(a0, a1, a2, a3, a4);
					var _ts_parser_included_ranges_wasm = Module["_ts_parser_included_ranges_wasm"] = (a0) => (_ts_parser_included_ranges_wasm = Module["_ts_parser_included_ranges_wasm"] = wasmExports["ts_parser_included_ranges_wasm"])(a0);
					var _ts_language_type_is_named_wasm = Module["_ts_language_type_is_named_wasm"] = (a0, a1) => (_ts_language_type_is_named_wasm = Module["_ts_language_type_is_named_wasm"] = wasmExports["ts_language_type_is_named_wasm"])(a0, a1);
					var _ts_language_type_is_visible_wasm = Module["_ts_language_type_is_visible_wasm"] = (a0, a1) => (_ts_language_type_is_visible_wasm = Module["_ts_language_type_is_visible_wasm"] = wasmExports["ts_language_type_is_visible_wasm"])(a0, a1);
					var _ts_tree_root_node_wasm = Module["_ts_tree_root_node_wasm"] = (a0) => (_ts_tree_root_node_wasm = Module["_ts_tree_root_node_wasm"] = wasmExports["ts_tree_root_node_wasm"])(a0);
					var _ts_tree_root_node_with_offset_wasm = Module["_ts_tree_root_node_with_offset_wasm"] = (a0) => (_ts_tree_root_node_with_offset_wasm = Module["_ts_tree_root_node_with_offset_wasm"] = wasmExports["ts_tree_root_node_with_offset_wasm"])(a0);
					var _ts_tree_edit_wasm = Module["_ts_tree_edit_wasm"] = (a0) => (_ts_tree_edit_wasm = Module["_ts_tree_edit_wasm"] = wasmExports["ts_tree_edit_wasm"])(a0);
					var _ts_tree_included_ranges_wasm = Module["_ts_tree_included_ranges_wasm"] = (a0) => (_ts_tree_included_ranges_wasm = Module["_ts_tree_included_ranges_wasm"] = wasmExports["ts_tree_included_ranges_wasm"])(a0);
					var _ts_tree_get_changed_ranges_wasm = Module["_ts_tree_get_changed_ranges_wasm"] = (a0, a1) => (_ts_tree_get_changed_ranges_wasm = Module["_ts_tree_get_changed_ranges_wasm"] = wasmExports["ts_tree_get_changed_ranges_wasm"])(a0, a1);
					var _ts_tree_cursor_new_wasm = Module["_ts_tree_cursor_new_wasm"] = (a0) => (_ts_tree_cursor_new_wasm = Module["_ts_tree_cursor_new_wasm"] = wasmExports["ts_tree_cursor_new_wasm"])(a0);
					var _ts_tree_cursor_delete_wasm = Module["_ts_tree_cursor_delete_wasm"] = (a0) => (_ts_tree_cursor_delete_wasm = Module["_ts_tree_cursor_delete_wasm"] = wasmExports["ts_tree_cursor_delete_wasm"])(a0);
					var _ts_tree_cursor_reset_wasm = Module["_ts_tree_cursor_reset_wasm"] = (a0) => (_ts_tree_cursor_reset_wasm = Module["_ts_tree_cursor_reset_wasm"] = wasmExports["ts_tree_cursor_reset_wasm"])(a0);
					var _ts_tree_cursor_reset_to_wasm = Module["_ts_tree_cursor_reset_to_wasm"] = (a0, a1) => (_ts_tree_cursor_reset_to_wasm = Module["_ts_tree_cursor_reset_to_wasm"] = wasmExports["ts_tree_cursor_reset_to_wasm"])(a0, a1);
					var _ts_tree_cursor_goto_first_child_wasm = Module["_ts_tree_cursor_goto_first_child_wasm"] = (a0) => (_ts_tree_cursor_goto_first_child_wasm = Module["_ts_tree_cursor_goto_first_child_wasm"] = wasmExports["ts_tree_cursor_goto_first_child_wasm"])(a0);
					var _ts_tree_cursor_goto_last_child_wasm = Module["_ts_tree_cursor_goto_last_child_wasm"] = (a0) => (_ts_tree_cursor_goto_last_child_wasm = Module["_ts_tree_cursor_goto_last_child_wasm"] = wasmExports["ts_tree_cursor_goto_last_child_wasm"])(a0);
					var _ts_tree_cursor_goto_first_child_for_index_wasm = Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = (a0) => (_ts_tree_cursor_goto_first_child_for_index_wasm = Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = wasmExports["ts_tree_cursor_goto_first_child_for_index_wasm"])(a0);
					var _ts_tree_cursor_goto_first_child_for_position_wasm = Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = (a0) => (_ts_tree_cursor_goto_first_child_for_position_wasm = Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = wasmExports["ts_tree_cursor_goto_first_child_for_position_wasm"])(a0);
					var _ts_tree_cursor_goto_next_sibling_wasm = Module["_ts_tree_cursor_goto_next_sibling_wasm"] = (a0) => (_ts_tree_cursor_goto_next_sibling_wasm = Module["_ts_tree_cursor_goto_next_sibling_wasm"] = wasmExports["ts_tree_cursor_goto_next_sibling_wasm"])(a0);
					var _ts_tree_cursor_goto_previous_sibling_wasm = Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = (a0) => (_ts_tree_cursor_goto_previous_sibling_wasm = Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = wasmExports["ts_tree_cursor_goto_previous_sibling_wasm"])(a0);
					var _ts_tree_cursor_goto_descendant_wasm = Module["_ts_tree_cursor_goto_descendant_wasm"] = (a0, a1) => (_ts_tree_cursor_goto_descendant_wasm = Module["_ts_tree_cursor_goto_descendant_wasm"] = wasmExports["ts_tree_cursor_goto_descendant_wasm"])(a0, a1);
					var _ts_tree_cursor_goto_parent_wasm = Module["_ts_tree_cursor_goto_parent_wasm"] = (a0) => (_ts_tree_cursor_goto_parent_wasm = Module["_ts_tree_cursor_goto_parent_wasm"] = wasmExports["ts_tree_cursor_goto_parent_wasm"])(a0);
					var _ts_tree_cursor_current_node_type_id_wasm = Module["_ts_tree_cursor_current_node_type_id_wasm"] = (a0) => (_ts_tree_cursor_current_node_type_id_wasm = Module["_ts_tree_cursor_current_node_type_id_wasm"] = wasmExports["ts_tree_cursor_current_node_type_id_wasm"])(a0);
					var _ts_tree_cursor_current_node_state_id_wasm = Module["_ts_tree_cursor_current_node_state_id_wasm"] = (a0) => (_ts_tree_cursor_current_node_state_id_wasm = Module["_ts_tree_cursor_current_node_state_id_wasm"] = wasmExports["ts_tree_cursor_current_node_state_id_wasm"])(a0);
					var _ts_tree_cursor_current_node_is_named_wasm = Module["_ts_tree_cursor_current_node_is_named_wasm"] = (a0) => (_ts_tree_cursor_current_node_is_named_wasm = Module["_ts_tree_cursor_current_node_is_named_wasm"] = wasmExports["ts_tree_cursor_current_node_is_named_wasm"])(a0);
					var _ts_tree_cursor_current_node_is_missing_wasm = Module["_ts_tree_cursor_current_node_is_missing_wasm"] = (a0) => (_ts_tree_cursor_current_node_is_missing_wasm = Module["_ts_tree_cursor_current_node_is_missing_wasm"] = wasmExports["ts_tree_cursor_current_node_is_missing_wasm"])(a0);
					var _ts_tree_cursor_current_node_id_wasm = Module["_ts_tree_cursor_current_node_id_wasm"] = (a0) => (_ts_tree_cursor_current_node_id_wasm = Module["_ts_tree_cursor_current_node_id_wasm"] = wasmExports["ts_tree_cursor_current_node_id_wasm"])(a0);
					var _ts_tree_cursor_start_position_wasm = Module["_ts_tree_cursor_start_position_wasm"] = (a0) => (_ts_tree_cursor_start_position_wasm = Module["_ts_tree_cursor_start_position_wasm"] = wasmExports["ts_tree_cursor_start_position_wasm"])(a0);
					var _ts_tree_cursor_end_position_wasm = Module["_ts_tree_cursor_end_position_wasm"] = (a0) => (_ts_tree_cursor_end_position_wasm = Module["_ts_tree_cursor_end_position_wasm"] = wasmExports["ts_tree_cursor_end_position_wasm"])(a0);
					var _ts_tree_cursor_start_index_wasm = Module["_ts_tree_cursor_start_index_wasm"] = (a0) => (_ts_tree_cursor_start_index_wasm = Module["_ts_tree_cursor_start_index_wasm"] = wasmExports["ts_tree_cursor_start_index_wasm"])(a0);
					var _ts_tree_cursor_end_index_wasm = Module["_ts_tree_cursor_end_index_wasm"] = (a0) => (_ts_tree_cursor_end_index_wasm = Module["_ts_tree_cursor_end_index_wasm"] = wasmExports["ts_tree_cursor_end_index_wasm"])(a0);
					var _ts_tree_cursor_current_field_id_wasm = Module["_ts_tree_cursor_current_field_id_wasm"] = (a0) => (_ts_tree_cursor_current_field_id_wasm = Module["_ts_tree_cursor_current_field_id_wasm"] = wasmExports["ts_tree_cursor_current_field_id_wasm"])(a0);
					var _ts_tree_cursor_current_depth_wasm = Module["_ts_tree_cursor_current_depth_wasm"] = (a0) => (_ts_tree_cursor_current_depth_wasm = Module["_ts_tree_cursor_current_depth_wasm"] = wasmExports["ts_tree_cursor_current_depth_wasm"])(a0);
					var _ts_tree_cursor_current_descendant_index_wasm = Module["_ts_tree_cursor_current_descendant_index_wasm"] = (a0) => (_ts_tree_cursor_current_descendant_index_wasm = Module["_ts_tree_cursor_current_descendant_index_wasm"] = wasmExports["ts_tree_cursor_current_descendant_index_wasm"])(a0);
					var _ts_tree_cursor_current_node_wasm = Module["_ts_tree_cursor_current_node_wasm"] = (a0) => (_ts_tree_cursor_current_node_wasm = Module["_ts_tree_cursor_current_node_wasm"] = wasmExports["ts_tree_cursor_current_node_wasm"])(a0);
					var _ts_node_symbol_wasm = Module["_ts_node_symbol_wasm"] = (a0) => (_ts_node_symbol_wasm = Module["_ts_node_symbol_wasm"] = wasmExports["ts_node_symbol_wasm"])(a0);
					var _ts_node_field_name_for_child_wasm = Module["_ts_node_field_name_for_child_wasm"] = (a0, a1) => (_ts_node_field_name_for_child_wasm = Module["_ts_node_field_name_for_child_wasm"] = wasmExports["ts_node_field_name_for_child_wasm"])(a0, a1);
					var _ts_node_children_by_field_id_wasm = Module["_ts_node_children_by_field_id_wasm"] = (a0, a1) => (_ts_node_children_by_field_id_wasm = Module["_ts_node_children_by_field_id_wasm"] = wasmExports["ts_node_children_by_field_id_wasm"])(a0, a1);
					var _ts_node_first_child_for_byte_wasm = Module["_ts_node_first_child_for_byte_wasm"] = (a0) => (_ts_node_first_child_for_byte_wasm = Module["_ts_node_first_child_for_byte_wasm"] = wasmExports["ts_node_first_child_for_byte_wasm"])(a0);
					var _ts_node_first_named_child_for_byte_wasm = Module["_ts_node_first_named_child_for_byte_wasm"] = (a0) => (_ts_node_first_named_child_for_byte_wasm = Module["_ts_node_first_named_child_for_byte_wasm"] = wasmExports["ts_node_first_named_child_for_byte_wasm"])(a0);
					var _ts_node_grammar_symbol_wasm = Module["_ts_node_grammar_symbol_wasm"] = (a0) => (_ts_node_grammar_symbol_wasm = Module["_ts_node_grammar_symbol_wasm"] = wasmExports["ts_node_grammar_symbol_wasm"])(a0);
					var _ts_node_child_count_wasm = Module["_ts_node_child_count_wasm"] = (a0) => (_ts_node_child_count_wasm = Module["_ts_node_child_count_wasm"] = wasmExports["ts_node_child_count_wasm"])(a0);
					var _ts_node_named_child_count_wasm = Module["_ts_node_named_child_count_wasm"] = (a0) => (_ts_node_named_child_count_wasm = Module["_ts_node_named_child_count_wasm"] = wasmExports["ts_node_named_child_count_wasm"])(a0);
					var _ts_node_child_wasm = Module["_ts_node_child_wasm"] = (a0, a1) => (_ts_node_child_wasm = Module["_ts_node_child_wasm"] = wasmExports["ts_node_child_wasm"])(a0, a1);
					var _ts_node_named_child_wasm = Module["_ts_node_named_child_wasm"] = (a0, a1) => (_ts_node_named_child_wasm = Module["_ts_node_named_child_wasm"] = wasmExports["ts_node_named_child_wasm"])(a0, a1);
					var _ts_node_child_by_field_id_wasm = Module["_ts_node_child_by_field_id_wasm"] = (a0, a1) => (_ts_node_child_by_field_id_wasm = Module["_ts_node_child_by_field_id_wasm"] = wasmExports["ts_node_child_by_field_id_wasm"])(a0, a1);
					var _ts_node_next_sibling_wasm = Module["_ts_node_next_sibling_wasm"] = (a0) => (_ts_node_next_sibling_wasm = Module["_ts_node_next_sibling_wasm"] = wasmExports["ts_node_next_sibling_wasm"])(a0);
					var _ts_node_prev_sibling_wasm = Module["_ts_node_prev_sibling_wasm"] = (a0) => (_ts_node_prev_sibling_wasm = Module["_ts_node_prev_sibling_wasm"] = wasmExports["ts_node_prev_sibling_wasm"])(a0);
					var _ts_node_next_named_sibling_wasm = Module["_ts_node_next_named_sibling_wasm"] = (a0) => (_ts_node_next_named_sibling_wasm = Module["_ts_node_next_named_sibling_wasm"] = wasmExports["ts_node_next_named_sibling_wasm"])(a0);
					var _ts_node_prev_named_sibling_wasm = Module["_ts_node_prev_named_sibling_wasm"] = (a0) => (_ts_node_prev_named_sibling_wasm = Module["_ts_node_prev_named_sibling_wasm"] = wasmExports["ts_node_prev_named_sibling_wasm"])(a0);
					var _ts_node_descendant_count_wasm = Module["_ts_node_descendant_count_wasm"] = (a0) => (_ts_node_descendant_count_wasm = Module["_ts_node_descendant_count_wasm"] = wasmExports["ts_node_descendant_count_wasm"])(a0);
					var _ts_node_parent_wasm = Module["_ts_node_parent_wasm"] = (a0) => (_ts_node_parent_wasm = Module["_ts_node_parent_wasm"] = wasmExports["ts_node_parent_wasm"])(a0);
					var _ts_node_descendant_for_index_wasm = Module["_ts_node_descendant_for_index_wasm"] = (a0) => (_ts_node_descendant_for_index_wasm = Module["_ts_node_descendant_for_index_wasm"] = wasmExports["ts_node_descendant_for_index_wasm"])(a0);
					var _ts_node_named_descendant_for_index_wasm = Module["_ts_node_named_descendant_for_index_wasm"] = (a0) => (_ts_node_named_descendant_for_index_wasm = Module["_ts_node_named_descendant_for_index_wasm"] = wasmExports["ts_node_named_descendant_for_index_wasm"])(a0);
					var _ts_node_descendant_for_position_wasm = Module["_ts_node_descendant_for_position_wasm"] = (a0) => (_ts_node_descendant_for_position_wasm = Module["_ts_node_descendant_for_position_wasm"] = wasmExports["ts_node_descendant_for_position_wasm"])(a0);
					var _ts_node_named_descendant_for_position_wasm = Module["_ts_node_named_descendant_for_position_wasm"] = (a0) => (_ts_node_named_descendant_for_position_wasm = Module["_ts_node_named_descendant_for_position_wasm"] = wasmExports["ts_node_named_descendant_for_position_wasm"])(a0);
					var _ts_node_start_point_wasm = Module["_ts_node_start_point_wasm"] = (a0) => (_ts_node_start_point_wasm = Module["_ts_node_start_point_wasm"] = wasmExports["ts_node_start_point_wasm"])(a0);
					var _ts_node_end_point_wasm = Module["_ts_node_end_point_wasm"] = (a0) => (_ts_node_end_point_wasm = Module["_ts_node_end_point_wasm"] = wasmExports["ts_node_end_point_wasm"])(a0);
					var _ts_node_start_index_wasm = Module["_ts_node_start_index_wasm"] = (a0) => (_ts_node_start_index_wasm = Module["_ts_node_start_index_wasm"] = wasmExports["ts_node_start_index_wasm"])(a0);
					var _ts_node_end_index_wasm = Module["_ts_node_end_index_wasm"] = (a0) => (_ts_node_end_index_wasm = Module["_ts_node_end_index_wasm"] = wasmExports["ts_node_end_index_wasm"])(a0);
					var _ts_node_to_string_wasm = Module["_ts_node_to_string_wasm"] = (a0) => (_ts_node_to_string_wasm = Module["_ts_node_to_string_wasm"] = wasmExports["ts_node_to_string_wasm"])(a0);
					var _ts_node_children_wasm = Module["_ts_node_children_wasm"] = (a0) => (_ts_node_children_wasm = Module["_ts_node_children_wasm"] = wasmExports["ts_node_children_wasm"])(a0);
					var _ts_node_named_children_wasm = Module["_ts_node_named_children_wasm"] = (a0) => (_ts_node_named_children_wasm = Module["_ts_node_named_children_wasm"] = wasmExports["ts_node_named_children_wasm"])(a0);
					var _ts_node_descendants_of_type_wasm = Module["_ts_node_descendants_of_type_wasm"] = (a0, a1, a2, a3, a4, a5, a6) => (_ts_node_descendants_of_type_wasm = Module["_ts_node_descendants_of_type_wasm"] = wasmExports["ts_node_descendants_of_type_wasm"])(a0, a1, a2, a3, a4, a5, a6);
					var _ts_node_is_named_wasm = Module["_ts_node_is_named_wasm"] = (a0) => (_ts_node_is_named_wasm = Module["_ts_node_is_named_wasm"] = wasmExports["ts_node_is_named_wasm"])(a0);
					var _ts_node_has_changes_wasm = Module["_ts_node_has_changes_wasm"] = (a0) => (_ts_node_has_changes_wasm = Module["_ts_node_has_changes_wasm"] = wasmExports["ts_node_has_changes_wasm"])(a0);
					var _ts_node_has_error_wasm = Module["_ts_node_has_error_wasm"] = (a0) => (_ts_node_has_error_wasm = Module["_ts_node_has_error_wasm"] = wasmExports["ts_node_has_error_wasm"])(a0);
					var _ts_node_is_error_wasm = Module["_ts_node_is_error_wasm"] = (a0) => (_ts_node_is_error_wasm = Module["_ts_node_is_error_wasm"] = wasmExports["ts_node_is_error_wasm"])(a0);
					var _ts_node_is_missing_wasm = Module["_ts_node_is_missing_wasm"] = (a0) => (_ts_node_is_missing_wasm = Module["_ts_node_is_missing_wasm"] = wasmExports["ts_node_is_missing_wasm"])(a0);
					var _ts_node_is_extra_wasm = Module["_ts_node_is_extra_wasm"] = (a0) => (_ts_node_is_extra_wasm = Module["_ts_node_is_extra_wasm"] = wasmExports["ts_node_is_extra_wasm"])(a0);
					var _ts_node_parse_state_wasm = Module["_ts_node_parse_state_wasm"] = (a0) => (_ts_node_parse_state_wasm = Module["_ts_node_parse_state_wasm"] = wasmExports["ts_node_parse_state_wasm"])(a0);
					var _ts_node_next_parse_state_wasm = Module["_ts_node_next_parse_state_wasm"] = (a0) => (_ts_node_next_parse_state_wasm = Module["_ts_node_next_parse_state_wasm"] = wasmExports["ts_node_next_parse_state_wasm"])(a0);
					var _ts_query_matches_wasm = Module["_ts_query_matches_wasm"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (_ts_query_matches_wasm = Module["_ts_query_matches_wasm"] = wasmExports["ts_query_matches_wasm"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
					var _ts_query_captures_wasm = Module["_ts_query_captures_wasm"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (_ts_query_captures_wasm = Module["_ts_query_captures_wasm"] = wasmExports["ts_query_captures_wasm"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
					var _iswalpha = Module["_iswalpha"] = (a0) => (_iswalpha = Module["_iswalpha"] = wasmExports["iswalpha"])(a0);
					var _iswblank = Module["_iswblank"] = (a0) => (_iswblank = Module["_iswblank"] = wasmExports["iswblank"])(a0);
					var _iswdigit = Module["_iswdigit"] = (a0) => (_iswdigit = Module["_iswdigit"] = wasmExports["iswdigit"])(a0);
					var _iswlower = Module["_iswlower"] = (a0) => (_iswlower = Module["_iswlower"] = wasmExports["iswlower"])(a0);
					var _iswupper = Module["_iswupper"] = (a0) => (_iswupper = Module["_iswupper"] = wasmExports["iswupper"])(a0);
					var _iswxdigit = Module["_iswxdigit"] = (a0) => (_iswxdigit = Module["_iswxdigit"] = wasmExports["iswxdigit"])(a0);
					var _memchr = Module["_memchr"] = (a0, a1, a2) => (_memchr = Module["_memchr"] = wasmExports["memchr"])(a0, a1, a2);
					var _strlen = Module["_strlen"] = (a0) => (_strlen = Module["_strlen"] = wasmExports["strlen"])(a0);
					var _strcmp = Module["_strcmp"] = (a0, a1) => (_strcmp = Module["_strcmp"] = wasmExports["strcmp"])(a0, a1);
					var _strncat = Module["_strncat"] = (a0, a1, a2) => (_strncat = Module["_strncat"] = wasmExports["strncat"])(a0, a1, a2);
					var _strncpy = Module["_strncpy"] = (a0, a1, a2) => (_strncpy = Module["_strncpy"] = wasmExports["strncpy"])(a0, a1, a2);
					var _towlower = Module["_towlower"] = (a0) => (_towlower = Module["_towlower"] = wasmExports["towlower"])(a0);
					var _towupper = Module["_towupper"] = (a0) => (_towupper = Module["_towupper"] = wasmExports["towupper"])(a0);
					var _setThrew = (a0, a1) => (_setThrew = wasmExports["setThrew"])(a0, a1);
					var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0);
					var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0);
					var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();
					var dynCall_jiji = Module["dynCall_jiji"] = (a0, a1, a2, a3, a4) => (dynCall_jiji = Module["dynCall_jiji"] = wasmExports["dynCall_jiji"])(a0, a1, a2, a3, a4);
					var _orig$ts_parser_timeout_micros = Module["_orig$ts_parser_timeout_micros"] = (a0) => (_orig$ts_parser_timeout_micros = Module["_orig$ts_parser_timeout_micros"] = wasmExports["orig$ts_parser_timeout_micros"])(a0);
					var _orig$ts_parser_set_timeout_micros = Module["_orig$ts_parser_set_timeout_micros"] = (a0, a1) => (_orig$ts_parser_set_timeout_micros = Module["_orig$ts_parser_set_timeout_micros"] = wasmExports["orig$ts_parser_set_timeout_micros"])(a0, a1);
					Module["AsciiToString"] = AsciiToString;
					Module["stringToUTF16"] = stringToUTF16;
					var calledRun;
					dependenciesFulfilled = function runCaller() {
						if (!calledRun) run();
						if (!calledRun) dependenciesFulfilled = runCaller;
					};
					function callMain(args = []) {
						var entryFunction = resolveGlobalSymbol("main").sym;
						if (!entryFunction) return;
						args.unshift(thisProgram);
						var argc = args.length;
						var argv = stackAlloc((argc + 1) * 4);
						var argv_ptr = argv;
						args.forEach((arg) => {
							LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, stringToUTF8OnStack(arg));
							argv_ptr += 4;
						});
						LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, 0);
						try {
							var ret = entryFunction(argc, argv);
							exitJS(ret, true);
							return ret;
						} catch (e) {
							return handleException(e);
						}
					}
					function run(args = arguments_) {
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
							Module["onRuntimeInitialized"]?.();
							if (shouldRunNow) callMain(args);
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
					const C = Module;
					const INTERNAL = {};
					const SIZE_OF_INT = 4;
					const SIZE_OF_CURSOR = 4 * SIZE_OF_INT;
					const SIZE_OF_NODE = 5 * SIZE_OF_INT;
					const SIZE_OF_POINT = 2 * SIZE_OF_INT;
					const SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT;
					const ZERO_POINT = {
						row: 0,
						column: 0
					};
					const QUERY_WORD_REGEX = /[\w-.]*/g;
					const PREDICATE_STEP_TYPE_CAPTURE = 1;
					const PREDICATE_STEP_TYPE_STRING = 2;
					const LANGUAGE_FUNCTION_REGEX = /^_?tree_sitter_\w+/;
					let VERSION;
					let MIN_COMPATIBLE_VERSION;
					let TRANSFER_BUFFER;
					let currentParseCallback;
					let currentLogCallback;
					class ParserImpl {
						static init() {
							TRANSFER_BUFFER = C._ts_init();
							VERSION = getValue(TRANSFER_BUFFER, "i32");
							MIN_COMPATIBLE_VERSION = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
						}
						initialize() {
							C._ts_parser_new_wasm();
							this[0] = getValue(TRANSFER_BUFFER, "i32");
							this[1] = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
						}
						delete() {
							C._ts_parser_delete(this[0]);
							C._free(this[1]);
							this[0] = 0;
							this[1] = 0;
						}
						setLanguage(language) {
							let address;
							if (!language) {
								address = 0;
								language = null;
							} else if (language.constructor === Language) {
								address = language[0];
								const version = C._ts_language_version(address);
								if (version < MIN_COMPATIBLE_VERSION || VERSION < version) throw new Error(`Incompatible language version ${version}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${VERSION}.`);
							} else throw new Error("Argument must be a Language");
							this.language = language;
							C._ts_parser_set_language(this[0], address);
							return this;
						}
						getLanguage() {
							return this.language;
						}
						parse(callback, oldTree, options) {
							if (typeof callback === "string") currentParseCallback = (index, _) => callback.slice(index);
							else if (typeof callback === "function") currentParseCallback = callback;
							else throw new Error("Argument must be a string or a function");
							if (this.logCallback) {
								currentLogCallback = this.logCallback;
								C._ts_parser_enable_logger_wasm(this[0], 1);
							} else {
								currentLogCallback = null;
								C._ts_parser_enable_logger_wasm(this[0], 0);
							}
							let rangeCount = 0;
							let rangeAddress = 0;
							if (options?.includedRanges) {
								rangeCount = options.includedRanges.length;
								rangeAddress = C._calloc(rangeCount, SIZE_OF_RANGE);
								let address = rangeAddress;
								for (let i = 0; i < rangeCount; i++) {
									marshalRange(address, options.includedRanges[i]);
									address += SIZE_OF_RANGE;
								}
							}
							const treeAddress = C._ts_parser_parse_wasm(this[0], this[1], oldTree ? oldTree[0] : 0, rangeAddress, rangeCount);
							if (!treeAddress) {
								currentParseCallback = null;
								currentLogCallback = null;
								throw new Error("Parsing failed");
							}
							const result = new Tree(INTERNAL, treeAddress, this.language, currentParseCallback);
							currentParseCallback = null;
							currentLogCallback = null;
							return result;
						}
						reset() {
							C._ts_parser_reset(this[0]);
						}
						getIncludedRanges() {
							C._ts_parser_included_ranges_wasm(this[0]);
							const count = getValue(TRANSFER_BUFFER, "i32");
							const buffer = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const result = new Array(count);
							if (count > 0) {
								let address = buffer;
								for (let i = 0; i < count; i++) {
									result[i] = unmarshalRange(address);
									address += SIZE_OF_RANGE;
								}
								C._free(buffer);
							}
							return result;
						}
						getTimeoutMicros() {
							return C._ts_parser_timeout_micros(this[0]);
						}
						setTimeoutMicros(timeout) {
							C._ts_parser_set_timeout_micros(this[0], timeout);
						}
						setLogger(callback) {
							if (!callback) callback = null;
							else if (typeof callback !== "function") throw new Error("Logger callback must be a function");
							this.logCallback = callback;
							return this;
						}
						getLogger() {
							return this.logCallback;
						}
					}
					class Tree {
						constructor(internal, address, language, textCallback) {
							assertInternal(internal);
							this[0] = address;
							this.language = language;
							this.textCallback = textCallback;
						}
						copy() {
							const address = C._ts_tree_copy(this[0]);
							return new Tree(INTERNAL, address, this.language, this.textCallback);
						}
						delete() {
							C._ts_tree_delete(this[0]);
							this[0] = 0;
						}
						edit(edit) {
							marshalEdit(edit);
							C._ts_tree_edit_wasm(this[0]);
						}
						get rootNode() {
							C._ts_tree_root_node_wasm(this[0]);
							return unmarshalNode(this);
						}
						rootNodeWithOffset(offsetBytes, offsetExtent) {
							const address = TRANSFER_BUFFER + SIZE_OF_NODE;
							setValue(address, offsetBytes, "i32");
							marshalPoint(address + SIZE_OF_INT, offsetExtent);
							C._ts_tree_root_node_with_offset_wasm(this[0]);
							return unmarshalNode(this);
						}
						getLanguage() {
							return this.language;
						}
						walk() {
							return this.rootNode.walk();
						}
						getChangedRanges(other) {
							if (other.constructor !== Tree) throw new TypeError("Argument must be a Tree");
							C._ts_tree_get_changed_ranges_wasm(this[0], other[0]);
							const count = getValue(TRANSFER_BUFFER, "i32");
							const buffer = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const result = new Array(count);
							if (count > 0) {
								let address = buffer;
								for (let i = 0; i < count; i++) {
									result[i] = unmarshalRange(address);
									address += SIZE_OF_RANGE;
								}
								C._free(buffer);
							}
							return result;
						}
						getIncludedRanges() {
							C._ts_tree_included_ranges_wasm(this[0]);
							const count = getValue(TRANSFER_BUFFER, "i32");
							const buffer = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const result = new Array(count);
							if (count > 0) {
								let address = buffer;
								for (let i = 0; i < count; i++) {
									result[i] = unmarshalRange(address);
									address += SIZE_OF_RANGE;
								}
								C._free(buffer);
							}
							return result;
						}
					}
					class Node {
						constructor(internal, tree) {
							assertInternal(internal);
							this.tree = tree;
						}
						get typeId() {
							marshalNode(this);
							return C._ts_node_symbol_wasm(this.tree[0]);
						}
						get grammarId() {
							marshalNode(this);
							return C._ts_node_grammar_symbol_wasm(this.tree[0]);
						}
						get type() {
							return this.tree.language.types[this.typeId] || "ERROR";
						}
						get grammarType() {
							return this.tree.language.types[this.grammarId] || "ERROR";
						}
						get endPosition() {
							marshalNode(this);
							C._ts_node_end_point_wasm(this.tree[0]);
							return unmarshalPoint(TRANSFER_BUFFER);
						}
						get endIndex() {
							marshalNode(this);
							return C._ts_node_end_index_wasm(this.tree[0]);
						}
						get text() {
							return getText(this.tree, this.startIndex, this.endIndex);
						}
						get parseState() {
							marshalNode(this);
							return C._ts_node_parse_state_wasm(this.tree[0]);
						}
						get nextParseState() {
							marshalNode(this);
							return C._ts_node_next_parse_state_wasm(this.tree[0]);
						}
						get isNamed() {
							marshalNode(this);
							return C._ts_node_is_named_wasm(this.tree[0]) === 1;
						}
						get hasError() {
							marshalNode(this);
							return C._ts_node_has_error_wasm(this.tree[0]) === 1;
						}
						get hasChanges() {
							marshalNode(this);
							return C._ts_node_has_changes_wasm(this.tree[0]) === 1;
						}
						get isError() {
							marshalNode(this);
							return C._ts_node_is_error_wasm(this.tree[0]) === 1;
						}
						get isMissing() {
							marshalNode(this);
							return C._ts_node_is_missing_wasm(this.tree[0]) === 1;
						}
						get isExtra() {
							marshalNode(this);
							return C._ts_node_is_extra_wasm(this.tree[0]) === 1;
						}
						equals(other) {
							return this.id === other.id;
						}
						child(index) {
							marshalNode(this);
							C._ts_node_child_wasm(this.tree[0], index);
							return unmarshalNode(this.tree);
						}
						namedChild(index) {
							marshalNode(this);
							C._ts_node_named_child_wasm(this.tree[0], index);
							return unmarshalNode(this.tree);
						}
						childForFieldId(fieldId) {
							marshalNode(this);
							C._ts_node_child_by_field_id_wasm(this.tree[0], fieldId);
							return unmarshalNode(this.tree);
						}
						childForFieldName(fieldName) {
							const fieldId = this.tree.language.fields.indexOf(fieldName);
							if (fieldId !== -1) return this.childForFieldId(fieldId);
							return null;
						}
						fieldNameForChild(index) {
							marshalNode(this);
							const address = C._ts_node_field_name_for_child_wasm(this.tree[0], index);
							if (!address) return null;
							return AsciiToString(address);
						}
						childrenForFieldName(fieldName) {
							const fieldId = this.tree.language.fields.indexOf(fieldName);
							if (fieldId !== -1 && fieldId !== 0) return this.childrenForFieldId(fieldId);
							return [];
						}
						childrenForFieldId(fieldId) {
							marshalNode(this);
							C._ts_node_children_by_field_id_wasm(this.tree[0], fieldId);
							const count = getValue(TRANSFER_BUFFER, "i32");
							const buffer = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const result = new Array(count);
							if (count > 0) {
								let address = buffer;
								for (let i = 0; i < count; i++) {
									result[i] = unmarshalNode(this.tree, address);
									address += SIZE_OF_NODE;
								}
								C._free(buffer);
							}
							return result;
						}
						firstChildForIndex(index) {
							marshalNode(this);
							setValue(TRANSFER_BUFFER + SIZE_OF_NODE, index, "i32");
							C._ts_node_first_child_for_byte_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						firstNamedChildForIndex(index) {
							marshalNode(this);
							setValue(TRANSFER_BUFFER + SIZE_OF_NODE, index, "i32");
							C._ts_node_first_named_child_for_byte_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						get childCount() {
							marshalNode(this);
							return C._ts_node_child_count_wasm(this.tree[0]);
						}
						get namedChildCount() {
							marshalNode(this);
							return C._ts_node_named_child_count_wasm(this.tree[0]);
						}
						get firstChild() {
							return this.child(0);
						}
						get firstNamedChild() {
							return this.namedChild(0);
						}
						get lastChild() {
							return this.child(this.childCount - 1);
						}
						get lastNamedChild() {
							return this.namedChild(this.namedChildCount - 1);
						}
						get children() {
							if (!this._children) {
								marshalNode(this);
								C._ts_node_children_wasm(this.tree[0]);
								const count = getValue(TRANSFER_BUFFER, "i32");
								const buffer = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
								this._children = new Array(count);
								if (count > 0) {
									let address = buffer;
									for (let i = 0; i < count; i++) {
										this._children[i] = unmarshalNode(this.tree, address);
										address += SIZE_OF_NODE;
									}
									C._free(buffer);
								}
							}
							return this._children;
						}
						get namedChildren() {
							if (!this._namedChildren) {
								marshalNode(this);
								C._ts_node_named_children_wasm(this.tree[0]);
								const count = getValue(TRANSFER_BUFFER, "i32");
								const buffer = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
								this._namedChildren = new Array(count);
								if (count > 0) {
									let address = buffer;
									for (let i = 0; i < count; i++) {
										this._namedChildren[i] = unmarshalNode(this.tree, address);
										address += SIZE_OF_NODE;
									}
									C._free(buffer);
								}
							}
							return this._namedChildren;
						}
						descendantsOfType(types, startPosition, endPosition) {
							if (!Array.isArray(types)) types = [types];
							if (!startPosition) startPosition = ZERO_POINT;
							if (!endPosition) endPosition = ZERO_POINT;
							const symbols = [];
							const typesBySymbol = this.tree.language.types;
							for (let i = 0, n = typesBySymbol.length; i < n; i++) if (types.includes(typesBySymbol[i])) symbols.push(i);
							const symbolsAddress = C._malloc(SIZE_OF_INT * symbols.length);
							for (let i = 0, n = symbols.length; i < n; i++) setValue(symbolsAddress + i * SIZE_OF_INT, symbols[i], "i32");
							marshalNode(this);
							C._ts_node_descendants_of_type_wasm(this.tree[0], symbolsAddress, symbols.length, startPosition.row, startPosition.column, endPosition.row, endPosition.column);
							const descendantCount = getValue(TRANSFER_BUFFER, "i32");
							const descendantAddress = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const result = new Array(descendantCount);
							if (descendantCount > 0) {
								let address = descendantAddress;
								for (let i = 0; i < descendantCount; i++) {
									result[i] = unmarshalNode(this.tree, address);
									address += SIZE_OF_NODE;
								}
							}
							C._free(descendantAddress);
							C._free(symbolsAddress);
							return result;
						}
						get nextSibling() {
							marshalNode(this);
							C._ts_node_next_sibling_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						get previousSibling() {
							marshalNode(this);
							C._ts_node_prev_sibling_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						get nextNamedSibling() {
							marshalNode(this);
							C._ts_node_next_named_sibling_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						get previousNamedSibling() {
							marshalNode(this);
							C._ts_node_prev_named_sibling_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						get descendantCount() {
							marshalNode(this);
							return C._ts_node_descendant_count_wasm(this.tree[0]);
						}
						get parent() {
							marshalNode(this);
							C._ts_node_parent_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						descendantForIndex(start, end = start) {
							if (typeof start !== "number" || typeof end !== "number") throw new Error("Arguments must be numbers");
							marshalNode(this);
							const address = TRANSFER_BUFFER + SIZE_OF_NODE;
							setValue(address, start, "i32");
							setValue(address + SIZE_OF_INT, end, "i32");
							C._ts_node_descendant_for_index_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						namedDescendantForIndex(start, end = start) {
							if (typeof start !== "number" || typeof end !== "number") throw new Error("Arguments must be numbers");
							marshalNode(this);
							const address = TRANSFER_BUFFER + SIZE_OF_NODE;
							setValue(address, start, "i32");
							setValue(address + SIZE_OF_INT, end, "i32");
							C._ts_node_named_descendant_for_index_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						descendantForPosition(start, end = start) {
							if (!isPoint(start) || !isPoint(end)) throw new Error("Arguments must be {row, column} objects");
							marshalNode(this);
							const address = TRANSFER_BUFFER + SIZE_OF_NODE;
							marshalPoint(address, start);
							marshalPoint(address + SIZE_OF_POINT, end);
							C._ts_node_descendant_for_position_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						namedDescendantForPosition(start, end = start) {
							if (!isPoint(start) || !isPoint(end)) throw new Error("Arguments must be {row, column} objects");
							marshalNode(this);
							const address = TRANSFER_BUFFER + SIZE_OF_NODE;
							marshalPoint(address, start);
							marshalPoint(address + SIZE_OF_POINT, end);
							C._ts_node_named_descendant_for_position_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						walk() {
							marshalNode(this);
							C._ts_tree_cursor_new_wasm(this.tree[0]);
							return new TreeCursor(INTERNAL, this.tree);
						}
						toString() {
							marshalNode(this);
							const address = C._ts_node_to_string_wasm(this.tree[0]);
							const result = AsciiToString(address);
							C._free(address);
							return result;
						}
					}
					class TreeCursor {
						constructor(internal, tree) {
							assertInternal(internal);
							this.tree = tree;
							unmarshalTreeCursor(this);
						}
						delete() {
							marshalTreeCursor(this);
							C._ts_tree_cursor_delete_wasm(this.tree[0]);
							this[0] = this[1] = this[2] = 0;
						}
						reset(node) {
							marshalNode(node);
							marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE);
							C._ts_tree_cursor_reset_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
						}
						resetTo(cursor) {
							marshalTreeCursor(this, TRANSFER_BUFFER);
							marshalTreeCursor(cursor, TRANSFER_BUFFER + SIZE_OF_CURSOR);
							C._ts_tree_cursor_reset_to_wasm(this.tree[0], cursor.tree[0]);
							unmarshalTreeCursor(this);
						}
						get nodeType() {
							return this.tree.language.types[this.nodeTypeId] || "ERROR";
						}
						get nodeTypeId() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
						}
						get nodeStateId() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
						}
						get nodeId() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
						}
						get nodeIsNamed() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
						}
						get nodeIsMissing() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
						}
						get nodeText() {
							marshalTreeCursor(this);
							const startIndex = C._ts_tree_cursor_start_index_wasm(this.tree[0]);
							const endIndex = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
							return getText(this.tree, startIndex, endIndex);
						}
						get startPosition() {
							marshalTreeCursor(this);
							C._ts_tree_cursor_start_position_wasm(this.tree[0]);
							return unmarshalPoint(TRANSFER_BUFFER);
						}
						get endPosition() {
							marshalTreeCursor(this);
							C._ts_tree_cursor_end_position_wasm(this.tree[0]);
							return unmarshalPoint(TRANSFER_BUFFER);
						}
						get startIndex() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_start_index_wasm(this.tree[0]);
						}
						get endIndex() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_end_index_wasm(this.tree[0]);
						}
						get currentNode() {
							marshalTreeCursor(this);
							C._ts_tree_cursor_current_node_wasm(this.tree[0]);
							return unmarshalNode(this.tree);
						}
						get currentFieldId() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
						}
						get currentFieldName() {
							return this.tree.language.fields[this.currentFieldId];
						}
						get currentDepth() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
						}
						get currentDescendantIndex() {
							marshalTreeCursor(this);
							return C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
						}
						gotoFirstChild() {
							marshalTreeCursor(this);
							const result = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
						gotoLastChild() {
							marshalTreeCursor(this);
							const result = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
						gotoFirstChildForIndex(goalIndex) {
							marshalTreeCursor(this);
							setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalIndex, "i32");
							const result = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
						gotoFirstChildForPosition(goalPosition) {
							marshalTreeCursor(this);
							marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalPosition);
							const result = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
						gotoNextSibling() {
							marshalTreeCursor(this);
							const result = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
						gotoPreviousSibling() {
							marshalTreeCursor(this);
							const result = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
						gotoDescendant(goalDescendantindex) {
							marshalTreeCursor(this);
							C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], goalDescendantindex);
							unmarshalTreeCursor(this);
						}
						gotoParent() {
							marshalTreeCursor(this);
							const result = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
							unmarshalTreeCursor(this);
							return result === 1;
						}
					}
					class Language {
						constructor(internal, address) {
							assertInternal(internal);
							this[0] = address;
							this.types = new Array(C._ts_language_symbol_count(this[0]));
							for (let i = 0, n = this.types.length; i < n; i++) if (C._ts_language_symbol_type(this[0], i) < 2) this.types[i] = UTF8ToString(C._ts_language_symbol_name(this[0], i));
							this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
							for (let i = 0, n = this.fields.length; i < n; i++) {
								const fieldName = C._ts_language_field_name_for_id(this[0], i);
								if (fieldName !== 0) this.fields[i] = UTF8ToString(fieldName);
								else this.fields[i] = null;
							}
						}
						get version() {
							return C._ts_language_version(this[0]);
						}
						get fieldCount() {
							return this.fields.length - 1;
						}
						get stateCount() {
							return C._ts_language_state_count(this[0]);
						}
						fieldIdForName(fieldName) {
							const result = this.fields.indexOf(fieldName);
							if (result !== -1) return result;
							else return null;
						}
						fieldNameForId(fieldId) {
							return this.fields[fieldId] || null;
						}
						idForNodeType(type, named) {
							const typeLength = lengthBytesUTF8(type);
							const typeAddress = C._malloc(typeLength + 1);
							stringToUTF8(type, typeAddress, typeLength + 1);
							const result = C._ts_language_symbol_for_name(this[0], typeAddress, typeLength, named);
							C._free(typeAddress);
							return result || null;
						}
						get nodeTypeCount() {
							return C._ts_language_symbol_count(this[0]);
						}
						nodeTypeForId(typeId) {
							const name = C._ts_language_symbol_name(this[0], typeId);
							return name ? UTF8ToString(name) : null;
						}
						nodeTypeIsNamed(typeId) {
							return C._ts_language_type_is_named_wasm(this[0], typeId) ? true : false;
						}
						nodeTypeIsVisible(typeId) {
							return C._ts_language_type_is_visible_wasm(this[0], typeId) ? true : false;
						}
						nextState(stateId, typeId) {
							return C._ts_language_next_state(this[0], stateId, typeId);
						}
						lookaheadIterator(stateId) {
							const address = C._ts_lookahead_iterator_new(this[0], stateId);
							if (address) return new LookaheadIterable(INTERNAL, address, this);
							return null;
						}
						query(source) {
							const sourceLength = lengthBytesUTF8(source);
							const sourceAddress = C._malloc(sourceLength + 1);
							stringToUTF8(source, sourceAddress, sourceLength + 1);
							const address = C._ts_query_new(this[0], sourceAddress, sourceLength, TRANSFER_BUFFER, TRANSFER_BUFFER + SIZE_OF_INT);
							if (!address) {
								const errorId = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
								const errorIndex = UTF8ToString(sourceAddress, getValue(TRANSFER_BUFFER, "i32")).length;
								const suffix = source.substr(errorIndex, 100).split("\n")[0];
								let word = suffix.match(QUERY_WORD_REGEX)[0];
								let error;
								switch (errorId) {
									case 2:
										error = /* @__PURE__ */ new RangeError(`Bad node name '${word}'`);
										break;
									case 3:
										error = /* @__PURE__ */ new RangeError(`Bad field name '${word}'`);
										break;
									case 4:
										error = /* @__PURE__ */ new RangeError(`Bad capture name @${word}`);
										break;
									case 5:
										error = /* @__PURE__ */ new TypeError(`Bad pattern structure at offset ${errorIndex}: '${suffix}'...`);
										word = "";
										break;
									default:
										error = /* @__PURE__ */ new SyntaxError(`Bad syntax at offset ${errorIndex}: '${suffix}'...`);
										word = "";
								}
								error.index = errorIndex;
								error.length = word.length;
								C._free(sourceAddress);
								throw error;
							}
							const stringCount = C._ts_query_string_count(address);
							const captureCount = C._ts_query_capture_count(address);
							const patternCount = C._ts_query_pattern_count(address);
							const captureNames = new Array(captureCount);
							const stringValues = new Array(stringCount);
							for (let i = 0; i < captureCount; i++) {
								const nameAddress = C._ts_query_capture_name_for_id(address, i, TRANSFER_BUFFER);
								const nameLength = getValue(TRANSFER_BUFFER, "i32");
								captureNames[i] = UTF8ToString(nameAddress, nameLength);
							}
							for (let i = 0; i < stringCount; i++) {
								const valueAddress = C._ts_query_string_value_for_id(address, i, TRANSFER_BUFFER);
								const nameLength = getValue(TRANSFER_BUFFER, "i32");
								stringValues[i] = UTF8ToString(valueAddress, nameLength);
							}
							const setProperties = new Array(patternCount);
							const assertedProperties = new Array(patternCount);
							const refutedProperties = new Array(patternCount);
							const predicates = new Array(patternCount);
							const textPredicates = new Array(patternCount);
							for (let i = 0; i < patternCount; i++) {
								const predicatesAddress = C._ts_query_predicates_for_pattern(address, i, TRANSFER_BUFFER);
								const stepCount = getValue(TRANSFER_BUFFER, "i32");
								predicates[i] = [];
								textPredicates[i] = [];
								const steps = [];
								let stepAddress = predicatesAddress;
								for (let j = 0; j < stepCount; j++) {
									const stepType = getValue(stepAddress, "i32");
									stepAddress += SIZE_OF_INT;
									const stepValueId = getValue(stepAddress, "i32");
									stepAddress += SIZE_OF_INT;
									if (stepType === PREDICATE_STEP_TYPE_CAPTURE) steps.push({
										type: "capture",
										name: captureNames[stepValueId]
									});
									else if (stepType === PREDICATE_STEP_TYPE_STRING) steps.push({
										type: "string",
										value: stringValues[stepValueId]
									});
									else if (steps.length > 0) {
										if (steps[0].type !== "string") throw new Error("Predicates must begin with a literal value");
										const operator = steps[0].value;
										let isPositive = true;
										let matchAll = true;
										let captureName;
										switch (operator) {
											case "any-not-eq?":
											case "not-eq?": isPositive = false;
											case "any-eq?":
											case "eq?":
												if (steps.length !== 3) throw new Error(`Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}`);
												if (steps[1].type !== "capture") throw new Error(`First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}"`);
												matchAll = !operator.startsWith("any-");
												if (steps[2].type === "capture") {
													const captureName1 = steps[1].name;
													const captureName2 = steps[2].name;
													textPredicates[i].push((captures) => {
														const nodes1 = [];
														const nodes2 = [];
														for (const c of captures) {
															if (c.name === captureName1) nodes1.push(c.node);
															if (c.name === captureName2) nodes2.push(c.node);
														}
														const compare = (n1, n2, positive) => positive ? n1.text === n2.text : n1.text !== n2.text;
														return matchAll ? nodes1.every((n1) => nodes2.some((n2) => compare(n1, n2, isPositive))) : nodes1.some((n1) => nodes2.some((n2) => compare(n1, n2, isPositive)));
													});
												} else {
													captureName = steps[1].name;
													const stringValue = steps[2].value;
													const matches = (n) => n.text === stringValue;
													const doesNotMatch = (n) => n.text !== stringValue;
													textPredicates[i].push((captures) => {
														const nodes = [];
														for (const c of captures) if (c.name === captureName) nodes.push(c.node);
														const test = isPositive ? matches : doesNotMatch;
														return matchAll ? nodes.every(test) : nodes.some(test);
													});
												}
												break;
											case "any-not-match?":
											case "not-match?": isPositive = false;
											case "any-match?":
											case "match?":
												if (steps.length !== 3) throw new Error(`Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}.`);
												if (steps[1].type !== "capture") throw new Error(`First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`);
												if (steps[2].type !== "string") throw new Error(`Second argument of \`#${operator}\` predicate must be a string. Got @${steps[2].value}.`);
												captureName = steps[1].name;
												const regex = new RegExp(steps[2].value);
												matchAll = !operator.startsWith("any-");
												textPredicates[i].push((captures) => {
													const nodes = [];
													for (const c of captures) if (c.name === captureName) nodes.push(c.node.text);
													const test = (text, positive) => positive ? regex.test(text) : !regex.test(text);
													if (nodes.length === 0) return !isPositive;
													return matchAll ? nodes.every((text) => test(text, isPositive)) : nodes.some((text) => test(text, isPositive));
												});
												break;
											case "set!":
												if (steps.length < 2 || steps.length > 3) throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
												if (steps.some((s) => s.type !== "string")) throw new Error(`Arguments to \`#set!\` predicate must be a strings.".`);
												if (!setProperties[i]) setProperties[i] = {};
												setProperties[i][steps[1].value] = steps[2] ? steps[2].value : null;
												break;
											case "is?":
											case "is-not?":
												if (steps.length < 2 || steps.length > 3) throw new Error(`Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
												if (steps.some((s) => s.type !== "string")) throw new Error(`Arguments to \`#${operator}\` predicate must be a strings.".`);
												const properties = operator === "is?" ? assertedProperties : refutedProperties;
												if (!properties[i]) properties[i] = {};
												properties[i][steps[1].value] = steps[2] ? steps[2].value : null;
												break;
											case "not-any-of?": isPositive = false;
											case "any-of?":
												if (steps.length < 2) throw new Error(`Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${steps.length - 1}.`);
												if (steps[1].type !== "capture") throw new Error(`First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`);
												for (let i = 2; i < steps.length; i++) if (steps[i].type !== "string") throw new Error(`Arguments to \`#${operator}\` predicate must be a strings.".`);
												captureName = steps[1].name;
												const values = steps.slice(2).map((s) => s.value);
												textPredicates[i].push((captures) => {
													const nodes = [];
													for (const c of captures) if (c.name === captureName) nodes.push(c.node.text);
													if (nodes.length === 0) return !isPositive;
													return nodes.every((text) => values.includes(text)) === isPositive;
												});
												break;
											default: predicates[i].push({
												operator,
												operands: steps.slice(1)
											});
										}
										steps.length = 0;
									}
								}
								Object.freeze(setProperties[i]);
								Object.freeze(assertedProperties[i]);
								Object.freeze(refutedProperties[i]);
							}
							C._free(sourceAddress);
							return new Query(INTERNAL, address, captureNames, textPredicates, predicates, Object.freeze(setProperties), Object.freeze(assertedProperties), Object.freeze(refutedProperties));
						}
						static load(input) {
							let bytes;
							if (input instanceof Uint8Array) bytes = Promise.resolve(input);
							else {
								const url = input;
								if (typeof process !== "undefined" && process.versions && process.versions.node) {
									const fs = require___vite_browser_external();
									bytes = Promise.resolve(fs.readFileSync(url));
								} else bytes = fetch(url).then((response) => response.arrayBuffer().then((buffer) => {
									if (response.ok) return new Uint8Array(buffer);
									else {
										const body = new TextDecoder("utf-8").decode(buffer);
										throw new Error(`Language.load failed with status ${response.status}.\n\n${body}`);
									}
								}));
							}
							return bytes.then((bytes) => loadWebAssemblyModule(bytes, { loadAsync: true })).then((mod) => {
								const symbolNames = Object.keys(mod);
								const functionName = symbolNames.find((key) => LANGUAGE_FUNCTION_REGEX.test(key) && !key.includes("external_scanner_"));
								if (!functionName) console.log(`Couldn't find language function in WASM file. Symbols:\n${JSON.stringify(symbolNames, null, 2)}`);
								const languageAddress = mod[functionName]();
								return new Language(INTERNAL, languageAddress);
							});
						}
					}
					class LookaheadIterable {
						constructor(internal, address, language) {
							assertInternal(internal);
							this[0] = address;
							this.language = language;
						}
						get currentTypeId() {
							return C._ts_lookahead_iterator_current_symbol(this[0]);
						}
						get currentType() {
							return this.language.types[this.currentTypeId] || "ERROR";
						}
						delete() {
							C._ts_lookahead_iterator_delete(this[0]);
							this[0] = 0;
						}
						resetState(stateId) {
							return C._ts_lookahead_iterator_reset_state(this[0], stateId);
						}
						reset(language, stateId) {
							if (C._ts_lookahead_iterator_reset(this[0], language[0], stateId)) {
								this.language = language;
								return true;
							}
							return false;
						}
						[Symbol.iterator]() {
							const self = this;
							return { next() {
								if (C._ts_lookahead_iterator_next(self[0])) return {
									done: false,
									value: self.currentType
								};
								return {
									done: true,
									value: ""
								};
							} };
						}
					}
					class Query {
						constructor(internal, address, captureNames, textPredicates, predicates, setProperties, assertedProperties, refutedProperties) {
							assertInternal(internal);
							this[0] = address;
							this.captureNames = captureNames;
							this.textPredicates = textPredicates;
							this.predicates = predicates;
							this.setProperties = setProperties;
							this.assertedProperties = assertedProperties;
							this.refutedProperties = refutedProperties;
							this.exceededMatchLimit = false;
						}
						delete() {
							C._ts_query_delete(this[0]);
							this[0] = 0;
						}
						matches(node, { startPosition = ZERO_POINT, endPosition = ZERO_POINT, startIndex = 0, endIndex = 0, matchLimit = 4294967295, maxStartDepth = 4294967295, timeoutMicros = 0 } = {}) {
							if (typeof matchLimit !== "number") throw new Error("Arguments must be numbers");
							marshalNode(node);
							C._ts_query_matches_wasm(this[0], node.tree[0], startPosition.row, startPosition.column, endPosition.row, endPosition.column, startIndex, endIndex, matchLimit, maxStartDepth, timeoutMicros);
							const rawCount = getValue(TRANSFER_BUFFER, "i32");
							const startAddress = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const didExceedMatchLimit = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
							const result = new Array(rawCount);
							this.exceededMatchLimit = Boolean(didExceedMatchLimit);
							let filteredCount = 0;
							let address = startAddress;
							for (let i = 0; i < rawCount; i++) {
								const pattern = getValue(address, "i32");
								address += SIZE_OF_INT;
								const captureCount = getValue(address, "i32");
								address += SIZE_OF_INT;
								const captures = new Array(captureCount);
								address = unmarshalCaptures(this, node.tree, address, captures);
								if (this.textPredicates[pattern].every((p) => p(captures))) {
									result[filteredCount] = {
										pattern,
										captures
									};
									const setProperties = this.setProperties[pattern];
									if (setProperties) result[filteredCount].setProperties = setProperties;
									const assertedProperties = this.assertedProperties[pattern];
									if (assertedProperties) result[filteredCount].assertedProperties = assertedProperties;
									const refutedProperties = this.refutedProperties[pattern];
									if (refutedProperties) result[filteredCount].refutedProperties = refutedProperties;
									filteredCount++;
								}
							}
							result.length = filteredCount;
							C._free(startAddress);
							return result;
						}
						captures(node, { startPosition = ZERO_POINT, endPosition = ZERO_POINT, startIndex = 0, endIndex = 0, matchLimit = 4294967295, maxStartDepth = 4294967295, timeoutMicros = 0 } = {}) {
							if (typeof matchLimit !== "number") throw new Error("Arguments must be numbers");
							marshalNode(node);
							C._ts_query_captures_wasm(this[0], node.tree[0], startPosition.row, startPosition.column, endPosition.row, endPosition.column, startIndex, endIndex, matchLimit, maxStartDepth, timeoutMicros);
							const count = getValue(TRANSFER_BUFFER, "i32");
							const startAddress = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
							const didExceedMatchLimit = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
							const result = [];
							this.exceededMatchLimit = Boolean(didExceedMatchLimit);
							const captures = [];
							let address = startAddress;
							for (let i = 0; i < count; i++) {
								const pattern = getValue(address, "i32");
								address += SIZE_OF_INT;
								const captureCount = getValue(address, "i32");
								address += SIZE_OF_INT;
								const captureIndex = getValue(address, "i32");
								address += SIZE_OF_INT;
								captures.length = captureCount;
								address = unmarshalCaptures(this, node.tree, address, captures);
								if (this.textPredicates[pattern].every((p) => p(captures))) {
									const capture = captures[captureIndex];
									const setProperties = this.setProperties[pattern];
									if (setProperties) capture.setProperties = setProperties;
									const assertedProperties = this.assertedProperties[pattern];
									if (assertedProperties) capture.assertedProperties = assertedProperties;
									const refutedProperties = this.refutedProperties[pattern];
									if (refutedProperties) capture.refutedProperties = refutedProperties;
									result.push(capture);
								}
							}
							C._free(startAddress);
							return result;
						}
						predicatesForPattern(patternIndex) {
							return this.predicates[patternIndex];
						}
						disableCapture(captureName) {
							const captureNameLength = lengthBytesUTF8(captureName);
							const captureNameAddress = C._malloc(captureNameLength + 1);
							stringToUTF8(captureName, captureNameAddress, captureNameLength + 1);
							C._ts_query_disable_capture(this[0], captureNameAddress, captureNameLength);
							C._free(captureNameAddress);
						}
						didExceedMatchLimit() {
							return this.exceededMatchLimit;
						}
					}
					function getText(tree, startIndex, endIndex) {
						const length = endIndex - startIndex;
						let result = tree.textCallback(startIndex, null, endIndex);
						startIndex += result.length;
						while (startIndex < endIndex) {
							const string = tree.textCallback(startIndex, null, endIndex);
							if (string && string.length > 0) {
								startIndex += string.length;
								result += string;
							} else break;
						}
						if (startIndex > endIndex) result = result.slice(0, length);
						return result;
					}
					function unmarshalCaptures(query, tree, address, result) {
						for (let i = 0, n = result.length; i < n; i++) {
							const captureIndex = getValue(address, "i32");
							address += SIZE_OF_INT;
							const node = unmarshalNode(tree, address);
							address += SIZE_OF_NODE;
							result[i] = {
								name: query.captureNames[captureIndex],
								node
							};
						}
						return address;
					}
					function assertInternal(x) {
						if (x !== INTERNAL) throw new Error("Illegal constructor");
					}
					function isPoint(point) {
						return point && typeof point.row === "number" && typeof point.column === "number";
					}
					function marshalNode(node) {
						let address = TRANSFER_BUFFER;
						setValue(address, node.id, "i32");
						address += SIZE_OF_INT;
						setValue(address, node.startIndex, "i32");
						address += SIZE_OF_INT;
						setValue(address, node.startPosition.row, "i32");
						address += SIZE_OF_INT;
						setValue(address, node.startPosition.column, "i32");
						address += SIZE_OF_INT;
						setValue(address, node[0], "i32");
					}
					function unmarshalNode(tree, address = TRANSFER_BUFFER) {
						const id = getValue(address, "i32");
						address += SIZE_OF_INT;
						if (id === 0) return null;
						const index = getValue(address, "i32");
						address += SIZE_OF_INT;
						const row = getValue(address, "i32");
						address += SIZE_OF_INT;
						const column = getValue(address, "i32");
						address += SIZE_OF_INT;
						const other = getValue(address, "i32");
						const result = new Node(INTERNAL, tree);
						result.id = id;
						result.startIndex = index;
						result.startPosition = {
							row,
							column
						};
						result[0] = other;
						return result;
					}
					function marshalTreeCursor(cursor, address = TRANSFER_BUFFER) {
						setValue(address + 0 * SIZE_OF_INT, cursor[0], "i32");
						setValue(address + 1 * SIZE_OF_INT, cursor[1], "i32");
						setValue(address + 2 * SIZE_OF_INT, cursor[2], "i32");
						setValue(address + 3 * SIZE_OF_INT, cursor[3], "i32");
					}
					function unmarshalTreeCursor(cursor) {
						cursor[0] = getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32");
						cursor[1] = getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32");
						cursor[2] = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
						cursor[3] = getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
					}
					function marshalPoint(address, point) {
						setValue(address, point.row, "i32");
						setValue(address + SIZE_OF_INT, point.column, "i32");
					}
					function unmarshalPoint(address) {
						return {
							row: getValue(address, "i32") >>> 0,
							column: getValue(address + SIZE_OF_INT, "i32") >>> 0
						};
					}
					function marshalRange(address, range) {
						marshalPoint(address, range.startPosition);
						address += SIZE_OF_POINT;
						marshalPoint(address, range.endPosition);
						address += SIZE_OF_POINT;
						setValue(address, range.startIndex, "i32");
						address += SIZE_OF_INT;
						setValue(address, range.endIndex, "i32");
						address += SIZE_OF_INT;
					}
					function unmarshalRange(address) {
						const result = {};
						result.startPosition = unmarshalPoint(address);
						address += SIZE_OF_POINT;
						result.endPosition = unmarshalPoint(address);
						address += SIZE_OF_POINT;
						result.startIndex = getValue(address, "i32") >>> 0;
						address += SIZE_OF_INT;
						result.endIndex = getValue(address, "i32") >>> 0;
						return result;
					}
					function marshalEdit(edit) {
						let address = TRANSFER_BUFFER;
						marshalPoint(address, edit.startPosition);
						address += SIZE_OF_POINT;
						marshalPoint(address, edit.oldEndPosition);
						address += SIZE_OF_POINT;
						marshalPoint(address, edit.newEndPosition);
						address += SIZE_OF_POINT;
						setValue(address, edit.startIndex, "i32");
						address += SIZE_OF_INT;
						setValue(address, edit.oldEndIndex, "i32");
						address += SIZE_OF_INT;
						setValue(address, edit.newEndIndex, "i32");
						address += SIZE_OF_INT;
					}
					for (const name of Object.getOwnPropertyNames(ParserImpl.prototype)) Object.defineProperty(Parser.prototype, name, {
						value: ParserImpl.prototype[name],
						enumerable: false,
						writable: false
					});
					Parser.Language = Language;
					Module.onRuntimeInitialized = () => {
						ParserImpl.init();
						resolveInitPromise();
					};
				});
			}
		}
		return Parser;
	}();
	if (typeof exports === "object") module.exports = TreeSitter;
}));
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/shell/webParser.js
var import_tree_sitter = /* @__PURE__ */ __toESM(require_tree_sitter(), 1);
await import_tree_sitter.default.init({ locateFile(scriptName, scriptDirectory) {
	return "/" + scriptName;
} });
var Bash = await import_tree_sitter.default.Language.load("/tree-sitter-bash.wasm");
var parser = new import_tree_sitter.default();
parser.setLanguage(Bash);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/Warnings.js
function warnf(global_, warning) {
	global_.warnings.push(warning);
}
function underline(node, startIndex, endIndex, curlCommand) {
	if (startIndex === endIndex) endIndex++;
	let lineStart = startIndex;
	if (startIndex > 0) lineStart = curlCommand.lastIndexOf("\n", startIndex - 1) + 1;
	let underlineLength = endIndex - startIndex;
	let lineEnd = curlCommand.indexOf("\n", startIndex);
	if (lineEnd === -1) lineEnd = curlCommand.length;
	else if (lineEnd < endIndex) underlineLength = lineEnd - startIndex + 1;
	const line = curlCommand.slice(lineStart, lineEnd);
	const underline = " ".repeat(startIndex - lineStart) + "^".repeat(underlineLength);
	return line + "\n" + underline;
}
function underlineCursor(node, curlCommand) {
	return underline(node, node.startIndex, node.endIndex, curlCommand);
}
function underlineNode(node, curlCommand) {
	const command = node.tree.rootNode;
	let startIndex = node.startIndex;
	let endIndex = node.endIndex;
	if (!curlCommand) {
		curlCommand = command.text;
		startIndex -= command.startIndex;
		endIndex -= command.startIndex;
	}
	return underline(node, startIndex, endIndex, curlCommand);
}
function warnIfPartsIgnored(request, warnings, support) {
	if (request.urls.length > 1 && !(support === null || support === void 0 ? void 0 : support.multipleUrls)) warnings.push(["multiple-urls", "found " + request.urls.length + " URLs, only the first one will be used: " + request.urls.map((u) => JSON.stringify(u.originalUrl.toString())).join(", ")]);
	if (request.dataReadsFile && !(support === null || support === void 0 ? void 0 : support.dataReadsFile)) warnings.push(["unsafe-data", "the generated data content is wrong, " + JSON.stringify("@" + request.dataReadsFile) + " means read the file " + JSON.stringify(request.dataReadsFile)]);
	if (request.urls[0].queryReadsFile && !(support === null || support === void 0 ? void 0 : support.queryReadsFile)) warnings.push(["unsafe-query", "the generated URL query string is wrong, " + JSON.stringify("@" + request.urls[0].queryReadsFile) + " means read the file " + JSON.stringify(request.urls[0].queryReadsFile)]);
	if (request.cookieFiles && !(support === null || support === void 0 ? void 0 : support.cookieFiles)) warnings.push(["cookie-files", "passing a file for --cookie/-b is not supported: " + request.cookieFiles.map((c) => JSON.stringify(c.toString())).join(", ")]);
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/shell/tokenizer.js
var BACKSLASHES = /\\./gs;
function removeBackslash(m) {
	return m.charAt(1) === "\n" ? "" : m.charAt(1);
}
function removeBackslashes(str) {
	return str.replace(BACKSLASHES, removeBackslash);
}
var DOUBLE_QUOTE_BACKSLASHES = /\\[\\$`"\n]/gs;
function removeDoubleQuoteBackslashes(str) {
	return str.replace(DOUBLE_QUOTE_BACKSLASHES, removeBackslash);
}
var ANSI_BACKSLASHES = /\\(\\|a|b|e|E|f|n|r|t|v|'|"|\?|[0-7]{1,3}|x[0-9A-Fa-f]{1,2}|u[0-9A-Fa-f]{1,4}|U[0-9A-Fa-f]{1,8}|c.)/gs;
function removeAnsiCBackslashes(str) {
	function unescapeChar(m) {
		switch (m.charAt(1)) {
			case "\\": return "\\";
			case "a": return "\x07";
			case "b": return "\b";
			case "e":
			case "E": return "\x1B";
			case "f": return "\f";
			case "n": return "\n";
			case "r": return "\r";
			case "t": return "	";
			case "v": return "\v";
			case "'": return "'";
			case "\"": return "\"";
			case "?": return "?";
			case "c":
				if (m.codePointAt(2) > 127) throw new CCError("non-ASCII control character in ANSI-C quoted string: \"\\u{" + m.codePointAt(2).toString(16) + "}\"");
				return m[2] === "?" ? "" : String.fromCodePoint(m[2].toUpperCase().codePointAt(0) & 31);
			case "x":
			case "u":
			case "U": return String.fromCodePoint(parseInt(m.slice(2), 16));
			case "0":
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7": return String.fromCodePoint(parseInt(m.slice(1), 8) % 256);
			default: throw new CCError("unhandled character in ANSI-C escape code: " + JSON.stringify(m));
		}
	}
	return str.replace(ANSI_BACKSLASHES, unescapeChar);
}
function toTokens(node, curlCommand, warnings) {
	let vals = [];
	switch (node.type) {
		case "$": return ["$"];
		case "word":
		case "number": return [removeBackslashes(node.text)];
		case "raw_string": return [node.text.slice(1, -1)];
		case "ansi_c_string": return [removeAnsiCBackslashes(node.text.slice(2, -1))];
		case "string":
		case "translated_string": {
			let res = "";
			for (const child of node.namedChildren) if (child.type === "string_content") res += removeDoubleQuoteBackslashes(child.text);
			else {
				const subVal = toTokens(child, curlCommand, warnings);
				if (typeof subVal === "string") res += subVal;
				else {
					if (res) {
						vals.push(res);
						res = "";
					}
					vals = vals.concat(subVal);
				}
			}
			if (res || vals.length === 0) vals.push(res);
			return vals;
		}
		case "simple_expansion":
			warnings.push(["expansion", "found environment variable\n" + underlineNode(node, curlCommand)]);
			if (node.firstNamedChild && node.firstNamedChild.type === "special_variable_name") warnings.push(["special_variable_name", node.text + " is a special Bash variable\n" + underlineNode(node.firstNamedChild, curlCommand)]);
			return [{
				type: "variable",
				value: node.text.slice(1),
				text: node.text,
				syntaxNode: node
			}];
		case "expansion":
			warnings.push(["expansion", "found expansion expression\n" + underlineNode(node, curlCommand)]);
			return [{
				type: "variable",
				value: node.text.slice(2, -1),
				text: node.text,
				syntaxNode: node
			}];
		case "command_substitution":
			warnings.push(["expansion", "found command substitution expression\n" + underlineNode(node, curlCommand)]);
			return [{
				type: "command",
				value: node.text.slice(node.text.startsWith("$(") ? 2 : 1, -1),
				text: node.text,
				syntaxNode: node
			}];
		case "concatenation": {
			let prevEnd = 0;
			let res = "";
			for (const child of node.children) {
				res += node.text.slice(prevEnd, child.startIndex - node.startIndex);
				prevEnd = child.endIndex - node.startIndex;
				const subVal = toTokens(child, curlCommand, warnings);
				if (typeof subVal === "string") res += subVal;
				else {
					if (res) {
						vals.push(res);
						res = "";
					}
					vals = vals.concat(subVal);
				}
			}
			res += node.text.slice(prevEnd);
			if (res || vals.length === 0) vals.push(res);
			return vals;
		}
		default: throw new CCError("unexpected syntax node type " + JSON.stringify(node.type) + ". Must be one of \"word\", \"number\", \"string\", \"raw_string\", \"ansi_c_string\", \"expansion\", \"simple_expansion\", \"translated_string\", \"command_substitution\" or \"concatenation\"\n" + underlineNode(node, curlCommand));
	}
}
function toWord(node, curlCommand, warnings) {
	return new Word(toTokens(node, curlCommand, warnings));
}
function* traverseLookingForBadNodes(tree) {
	const cursor = tree.walk();
	let reachedRoot = false;
	while (!reachedRoot) {
		if (cursor.nodeType === "ERROR" || cursor.nodeIsMissing) yield cursor;
		if (cursor.gotoFirstChild()) continue;
		if (cursor.gotoNextSibling()) continue;
		let retracing = true;
		while (retracing) {
			if (!cursor.gotoParent()) {
				retracing = false;
				reachedRoot = true;
			}
			if (cursor.gotoNextSibling()) retracing = false;
		}
	}
}
function warnAboutBadNodes(ast, curlCommand, warnings) {
	const maxShown = 3;
	let count = 0;
	for (const badNode of traverseLookingForBadNodes(ast)) {
		if (count < maxShown) {
			let underlinedNode = "";
			try {
				underlinedNode = ":\n" + underlineCursor(badNode, curlCommand);
			} catch (_a) {}
			const line = badNode.startPosition.row;
			const column = badNode.startPosition.column;
			warnings.push(["bash", `Bash parsing error on line ${line + 1}` + (column !== 0 ? `, column ${column + 1}` : "") + underlinedNode]);
		}
		count += 1;
	}
	const extra = count - maxShown;
	if (extra > 0) warnings.push(["bash", `${extra} more Bash parsing error${extra > 1 ? "s" : ""} omitted`]);
}
function warnAboutUselessBackslash(n, curlCommandLines, warnings) {
	const lastCommandLine = curlCommandLines[n.endPosition.row];
	const impromperBackslash = lastCommandLine.match(/\\\s+$/);
	if (impromperBackslash && curlCommandLines.length > n.endPosition.row + 1 && impromperBackslash.index !== void 0) warnings.push(["unescaped-newline", "The trailling '\\' on line " + (n.endPosition.row + 1) + " is followed by whitespace, so it won't escape the newline after it:\n" + lastCommandLine + "\n" + " ".repeat(impromperBackslash.index) + "^".repeat(impromperBackslash[0].length)]);
}
function extractRedirect(node, curlCommand, warnings) {
	if (!node.namedChildCount) throw new CCError("got empty \"redirected_statement\" AST node");
	let stdin, stdinFile;
	const [command, ...redirects] = node.namedChildren;
	if (command.type !== "command") throw new CCError("got \"redirected_statement\" AST node whose first child is not a \"command\", got " + command.type + " instead\n" + underlineNode(command, curlCommand));
	if (node.childCount < 2) throw new CCError("got \"redirected_statement\" AST node with only one child - no redirect");
	if (redirects.length > 1) warnings.push(["multiple-redirects", "found " + redirects.length + " redirect nodes. Only the first one will be used:\n" + underlineNode(redirects[1], curlCommand)]);
	const redirect = redirects[0];
	if (redirect.type === "file_redirect") {
		const destination = redirect.childForFieldName("destination");
		if (!destination) throw new CCError("got \"file_redirect\" AST node with no \"destination\" child");
		stdinFile = toWord(destination, curlCommand, warnings);
	} else if (redirect.type === "heredoc_redirect") {
		const heredocBody = redirect.descendantsOfType("heredoc_body")[0];
		if (!heredocBody) throw new CCError("got \"redirected_statement\" AST node without heredoc_body");
		stdin = new Word(heredocBody.text);
	} else if (redirect.type === "herestring_redirect") {
		if (redirect.namedChildCount < 1 || !redirect.firstNamedChild) throw new CCError("got \"redirected_statement\" AST node with empty herestring");
		stdin = toWord(redirect.firstNamedChild, curlCommand, warnings);
	} else throw new CCError("got \"redirected_statement\" AST node whose second child is not one of \"file_redirect\", \"heredoc_redirect\" or \"herestring_redirect\", got " + command.type + " instead");
	return [
		command,
		stdin,
		stdinFile
	];
}
function _findCurlInPipeline(node, curlCommand, warnings) {
	let command, stdin, stdinFile;
	for (const child of node.namedChildren) if (child.type === "command") {
		const commandName = child.namedChildren[0];
		if (commandName.type !== "command_name") throw new CCError("got \"command\" AST node whose first child is not a \"command_name\", got " + commandName.type + " instead\n" + underlineNode(commandName, curlCommand));
		const commandNameWord = commandName.namedChildren[0];
		if (commandNameWord.type !== "word") throw new CCError("got \"command_name\" AST node whose first child is not a \"word\", got " + commandNameWord.type + " instead\n" + underlineNode(commandNameWord, curlCommand));
		if (commandNameWord.text === "curl") {
			if (!command) command = child;
			else warnings.push(["multiple-curl-in-pipeline", "found multiple curl commands in pipeline:\n" + underlineNode(child, curlCommand)]);
		}
	} else if (child.type === "redirected_statement") {
		const [redirCommand, redirStdin, redirStdinFile] = extractRedirect(child, curlCommand, warnings);
		if (redirCommand.namedChildren[0].text === "curl") {
			if (!command) [command, stdin, stdinFile] = [
				redirCommand,
				redirStdin,
				redirStdinFile
			];
			else warnings.push(["multiple-curl-in-pipeline", "found multiple curl commands in pipeline:\n" + underlineNode(redirCommand, curlCommand)]);
		}
	} else if (child.type === "pipeline") {
		const [nestedCommand, nestedStdin, nestedStdinFile] = _findCurlInPipeline(child, curlCommand, warnings);
		if (!nestedCommand) continue;
		if (nestedCommand.namedChildren[0].text === "curl") {
			if (!command) [command, stdin, stdinFile] = [
				nestedCommand,
				nestedStdin,
				nestedStdinFile
			];
			else warnings.push(["multiple-curl-in-pipeline", "found multiple curl commands in pipeline:\n" + underlineNode(nestedCommand, curlCommand)]);
		}
	}
	return [
		command,
		stdin,
		stdinFile
	];
}
function findCurlInPipeline(node, curlCommand, warnings) {
	const [command, stdin, stdinFile] = _findCurlInPipeline(node, curlCommand, warnings);
	if (!command) throw new CCError("could not find curl command in pipeline\n" + underlineNode(node, curlCommand));
	return [
		command,
		stdin,
		stdinFile
	];
}
function extractCommandNodes(ast, curlCommand, warnings) {
	if (ast.rootNode.type !== "program") throw new CCError("expected a \"program\" top-level AST node, got " + ast.rootNode.type + " instead");
	if (ast.rootNode.namedChildCount < 1 || !ast.rootNode.namedChildren) throw new CCError("empty \"program\" node");
	const curlCommandLines = curlCommand.split("\n");
	let sawComment = false;
	const commands = [];
	for (const n of ast.rootNode.namedChildren) switch (n.type) {
		case "comment":
			sawComment = true;
			continue;
		case "command":
			commands.push([
				n,
				void 0,
				void 0
			]);
			warnAboutUselessBackslash(n, curlCommandLines, warnings);
			break;
		case "redirected_statement":
			commands.push(extractRedirect(n, curlCommand, warnings));
			warnAboutUselessBackslash(n, curlCommandLines, warnings);
			break;
		case "pipeline":
			commands.push(findCurlInPipeline(n, curlCommand, warnings));
			warnAboutUselessBackslash(n, curlCommandLines, warnings);
			break;
		case "heredoc_body": continue;
		case "ERROR": throw new CCError(`Bash parsing error on line ${n.startPosition.row + 1}:\n` + underlineNode(n, curlCommand));
		default: throw new CCError("found " + JSON.stringify(n.type) + " AST node, only \"command\", \"pipeline\" or \"redirected_statement\" are supported\n" + underlineNode(n, curlCommand));
	}
	if (!commands.length) throw new CCError("expected a \"command\" or \"redirected_statement\" AST node" + (sawComment ? ", only found \"comment\" nodes" : ""));
	return commands;
}
function toNameAndArgv(command, curlCommand, warnings) {
	if (command.childCount < 1) throw new CCError("empty \"command\" node\n" + underlineNode(command, curlCommand));
	const name = command.childForFieldName("name");
	const args = command.childrenForFieldName("argument");
	if (!name) throw new CCError("found \"command\" AST node with no \"command_name\" child\n" + underlineNode(command, curlCommand));
	return [name, args];
}
function nameToWord(name, curlCommand, warnings) {
	if (name.childCount < 1 || !name.firstChild) throw new CCError("found empty \"command_name\" AST node\n" + underlineNode(name, curlCommand));
	else if (name.childCount > 1) warnings.push(["extra-command_name-children", "expected \"command_name\" node to only have one child but it has " + name.childCount]);
	const nameNode = name.firstChild;
	const nameWord = toWord(nameNode, curlCommand, warnings);
	const nameWordStr = nameWord.toString();
	const cmdNameShellToken = firstShellToken(nameWord);
	if (cmdNameShellToken) {
		if (nameWordStr !== "$curl") throw new CCError("expected command name to be a simple value but found a " + cmdNameShellToken.type + "\n" + underlineNode(cmdNameShellToken.syntaxNode, curlCommand));
	} else if (nameWordStr.trim() !== "curl") {
		const c = nameWordStr.trim();
		if (!c) throw new CCError("found command without a command_name\n" + underlineNode(nameNode, curlCommand));
		throw new CCError("command should begin with \"curl\" but instead begins with " + JSON.stringify(clip(c)) + "\n" + underlineNode(nameNode, curlCommand));
	}
	return nameWord;
}
function tokenize(curlCommand, warnings = []) {
	const ast = parser.parse(curlCommand);
	warnAboutBadNodes(ast, curlCommand, warnings);
	const commandNodes = extractCommandNodes(ast, curlCommand, warnings);
	const commands = [];
	for (const [command, stdin, stdinFile] of commandNodes) {
		const [name, argv] = toNameAndArgv(command, curlCommand, warnings);
		commands.push([
			[nameToWord(name, curlCommand, warnings), ...argv.map((arg) => toWord(arg, curlCommand, warnings))],
			stdin,
			stdinFile
		]);
	}
	return commands;
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/curl/auth.js
var CURLAUTH_BASIC = 1;
var CURLAUTH_DIGEST = 2;
var CURLAUTH_NEGOTIATE = 4;
var CURLAUTH_NTLM = 8;
var CURLAUTH_NTLM_WB = 32;
var CURLAUTH_BEARER = 64;
var CURLAUTH_AWS_SIGV4 = 128;
var CURLAUTH_ANY = -17;
function pickAuth(mask) {
	if (mask === -17) return "basic";
	for (const [auth, authName] of [
		[4, "negotiate"],
		[64, "bearer"],
		[2, "digest"],
		[8, "ntlm"],
		[32, "ntlm-wb"],
		[1, "basic"],
		[128, "aws-sigv4"]
	]) if (mask & auth) return authName;
	return "none";
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/curl/opts.js
var curlLongOpts = {
	"url": {
		type: "string",
		name: "url"
	},
	"dns-ipv4-addr": {
		type: "string",
		name: "dns-ipv4-addr"
	},
	"dns-ipv6-addr": {
		type: "string",
		name: "dns-ipv6-addr"
	},
	"random-file": {
		type: "string",
		name: "random-file"
	},
	"egd-file": {
		type: "string",
		name: "egd-file"
	},
	"oauth2-bearer": {
		type: "string",
		name: "oauth2-bearer"
	},
	"connect-timeout": {
		type: "string",
		name: "connect-timeout"
	},
	"doh-url": {
		type: "string",
		name: "doh-url"
	},
	"ciphers": {
		type: "string",
		name: "ciphers"
	},
	"dns-interface": {
		type: "string",
		name: "dns-interface"
	},
	"disable-epsv": {
		type: "bool",
		name: "disable-epsv"
	},
	"no-disable-epsv": {
		type: "bool",
		name: "disable-epsv",
		expand: false
	},
	"disallow-username-in-url": {
		type: "bool",
		name: "disallow-username-in-url"
	},
	"no-disallow-username-in-url": {
		type: "bool",
		name: "disallow-username-in-url",
		expand: false
	},
	"epsv": {
		type: "bool",
		name: "epsv"
	},
	"no-epsv": {
		type: "bool",
		name: "epsv",
		expand: false
	},
	"dns-servers": {
		type: "string",
		name: "dns-servers"
	},
	"trace": {
		type: "string",
		name: "trace"
	},
	"npn": {
		type: "bool",
		name: "npn"
	},
	"no-npn": {
		type: "bool",
		name: "npn",
		expand: false
	},
	"trace-ascii": {
		type: "string",
		name: "trace-ascii"
	},
	"alpn": {
		type: "bool",
		name: "alpn"
	},
	"no-alpn": {
		type: "bool",
		name: "alpn",
		expand: false
	},
	"limit-rate": {
		type: "string",
		name: "limit-rate"
	},
	"rate": {
		type: "string",
		name: "rate"
	},
	"compressed": {
		type: "bool",
		name: "compressed"
	},
	"no-compressed": {
		type: "bool",
		name: "compressed",
		expand: false
	},
	"tr-encoding": {
		type: "bool",
		name: "tr-encoding"
	},
	"no-tr-encoding": {
		type: "bool",
		name: "tr-encoding",
		expand: false
	},
	"digest": {
		type: "bool",
		name: "digest"
	},
	"no-digest": {
		type: "bool",
		name: "digest",
		expand: false
	},
	"negotiate": {
		type: "bool",
		name: "negotiate"
	},
	"no-negotiate": {
		type: "bool",
		name: "negotiate",
		expand: false
	},
	"ntlm": {
		type: "bool",
		name: "ntlm"
	},
	"no-ntlm": {
		type: "bool",
		name: "ntlm",
		expand: false
	},
	"ntlm-wb": {
		type: "bool",
		name: "ntlm-wb"
	},
	"no-ntlm-wb": {
		type: "bool",
		name: "ntlm-wb",
		expand: false
	},
	"basic": {
		type: "bool",
		name: "basic"
	},
	"no-basic": {
		type: "bool",
		name: "basic",
		expand: false
	},
	"anyauth": {
		type: "bool",
		name: "anyauth"
	},
	"no-anyauth": {
		type: "bool",
		name: "anyauth",
		expand: false
	},
	"wdebug": {
		type: "bool",
		name: "wdebug"
	},
	"no-wdebug": {
		type: "bool",
		name: "wdebug",
		expand: false
	},
	"ftp-create-dirs": {
		type: "bool",
		name: "ftp-create-dirs"
	},
	"no-ftp-create-dirs": {
		type: "bool",
		name: "ftp-create-dirs",
		expand: false
	},
	"create-dirs": {
		type: "bool",
		name: "create-dirs"
	},
	"no-create-dirs": {
		type: "bool",
		name: "create-dirs",
		expand: false
	},
	"create-file-mode": {
		type: "string",
		name: "create-file-mode"
	},
	"max-redirs": {
		type: "string",
		name: "max-redirs"
	},
	"proxy-ntlm": {
		type: "bool",
		name: "proxy-ntlm"
	},
	"no-proxy-ntlm": {
		type: "bool",
		name: "proxy-ntlm",
		expand: false
	},
	"crlf": {
		type: "bool",
		name: "crlf"
	},
	"no-crlf": {
		type: "bool",
		name: "crlf",
		expand: false
	},
	"stderr": {
		type: "string",
		name: "stderr"
	},
	"aws-sigv4": {
		type: "string",
		name: "aws-sigv4"
	},
	"interface": {
		type: "string",
		name: "interface"
	},
	"krb": {
		type: "string",
		name: "krb"
	},
	"krb4": {
		type: "string",
		name: "krb"
	},
	"haproxy-protocol": {
		type: "bool",
		name: "haproxy-protocol"
	},
	"no-haproxy-protocol": {
		type: "bool",
		name: "haproxy-protocol",
		expand: false
	},
	"haproxy-clientip": {
		type: "string",
		name: "haproxy-clientip"
	},
	"max-filesize": {
		type: "string",
		name: "max-filesize"
	},
	"disable-eprt": {
		type: "bool",
		name: "disable-eprt"
	},
	"no-disable-eprt": {
		type: "bool",
		name: "disable-eprt",
		expand: false
	},
	"eprt": {
		type: "bool",
		name: "eprt"
	},
	"no-eprt": {
		type: "bool",
		name: "eprt",
		expand: false
	},
	"xattr": {
		type: "bool",
		name: "xattr"
	},
	"no-xattr": {
		type: "bool",
		name: "xattr",
		expand: false
	},
	"ftp-ssl": {
		type: "bool",
		name: "ssl"
	},
	"no-ftp-ssl": {
		type: "bool",
		name: "ssl",
		expand: false
	},
	"ssl": {
		type: "bool",
		name: "ssl"
	},
	"no-ssl": {
		type: "bool",
		name: "ssl",
		expand: false
	},
	"ftp-pasv": {
		type: "bool",
		name: "ftp-pasv"
	},
	"no-ftp-pasv": {
		type: "bool",
		name: "ftp-pasv",
		expand: false
	},
	"socks5": {
		type: "string",
		name: "socks5"
	},
	"tcp-nodelay": {
		type: "bool",
		name: "tcp-nodelay"
	},
	"no-tcp-nodelay": {
		type: "bool",
		name: "tcp-nodelay",
		expand: false
	},
	"proxy-digest": {
		type: "bool",
		name: "proxy-digest"
	},
	"no-proxy-digest": {
		type: "bool",
		name: "proxy-digest",
		expand: false
	},
	"proxy-basic": {
		type: "bool",
		name: "proxy-basic"
	},
	"no-proxy-basic": {
		type: "bool",
		name: "proxy-basic",
		expand: false
	},
	"retry": {
		type: "string",
		name: "retry"
	},
	"retry-connrefused": {
		type: "bool",
		name: "retry-connrefused"
	},
	"no-retry-connrefused": {
		type: "bool",
		name: "retry-connrefused",
		expand: false
	},
	"retry-delay": {
		type: "string",
		name: "retry-delay"
	},
	"retry-max-time": {
		type: "string",
		name: "retry-max-time"
	},
	"proxy-negotiate": {
		type: "bool",
		name: "proxy-negotiate"
	},
	"no-proxy-negotiate": {
		type: "bool",
		name: "proxy-negotiate",
		expand: false
	},
	"form-escape": {
		type: "bool",
		name: "form-escape"
	},
	"no-form-escape": {
		type: "bool",
		name: "form-escape",
		expand: false
	},
	"ftp-account": {
		type: "string",
		name: "ftp-account"
	},
	"proxy-anyauth": {
		type: "bool",
		name: "proxy-anyauth"
	},
	"no-proxy-anyauth": {
		type: "bool",
		name: "proxy-anyauth",
		expand: false
	},
	"trace-time": {
		type: "bool",
		name: "trace-time"
	},
	"no-trace-time": {
		type: "bool",
		name: "trace-time",
		expand: false
	},
	"ignore-content-length": {
		type: "bool",
		name: "ignore-content-length"
	},
	"no-ignore-content-length": {
		type: "bool",
		name: "ignore-content-length",
		expand: false
	},
	"ftp-skip-pasv-ip": {
		type: "bool",
		name: "ftp-skip-pasv-ip"
	},
	"no-ftp-skip-pasv-ip": {
		type: "bool",
		name: "ftp-skip-pasv-ip",
		expand: false
	},
	"ftp-method": {
		type: "string",
		name: "ftp-method"
	},
	"local-port": {
		type: "string",
		name: "local-port"
	},
	"socks4": {
		type: "string",
		name: "socks4"
	},
	"socks4a": {
		type: "string",
		name: "socks4a"
	},
	"ftp-alternative-to-user": {
		type: "string",
		name: "ftp-alternative-to-user"
	},
	"ftp-ssl-reqd": {
		type: "bool",
		name: "ssl-reqd"
	},
	"no-ftp-ssl-reqd": {
		type: "bool",
		name: "ssl-reqd",
		expand: false
	},
	"ssl-reqd": {
		type: "bool",
		name: "ssl-reqd"
	},
	"no-ssl-reqd": {
		type: "bool",
		name: "ssl-reqd",
		expand: false
	},
	"sessionid": {
		type: "bool",
		name: "sessionid"
	},
	"no-sessionid": {
		type: "bool",
		name: "sessionid",
		expand: false
	},
	"ftp-ssl-control": {
		type: "bool",
		name: "ftp-ssl-control"
	},
	"no-ftp-ssl-control": {
		type: "bool",
		name: "ftp-ssl-control",
		expand: false
	},
	"ftp-ssl-ccc": {
		type: "bool",
		name: "ftp-ssl-ccc"
	},
	"no-ftp-ssl-ccc": {
		type: "bool",
		name: "ftp-ssl-ccc",
		expand: false
	},
	"ftp-ssl-ccc-mode": {
		type: "string",
		name: "ftp-ssl-ccc-mode"
	},
	"libcurl": {
		type: "string",
		name: "libcurl"
	},
	"raw": {
		type: "bool",
		name: "raw"
	},
	"no-raw": {
		type: "bool",
		name: "raw",
		expand: false
	},
	"post301": {
		type: "bool",
		name: "post301"
	},
	"no-post301": {
		type: "bool",
		name: "post301",
		expand: false
	},
	"keepalive": {
		type: "bool",
		name: "keepalive"
	},
	"no-keepalive": {
		type: "bool",
		name: "keepalive",
		expand: false
	},
	"socks5-hostname": {
		type: "string",
		name: "socks5-hostname"
	},
	"keepalive-time": {
		type: "string",
		name: "keepalive-time"
	},
	"post302": {
		type: "bool",
		name: "post302"
	},
	"no-post302": {
		type: "bool",
		name: "post302",
		expand: false
	},
	"noproxy": {
		type: "string",
		name: "noproxy"
	},
	"socks5-gssapi-nec": {
		type: "bool",
		name: "socks5-gssapi-nec"
	},
	"no-socks5-gssapi-nec": {
		type: "bool",
		name: "socks5-gssapi-nec",
		expand: false
	},
	"proxy1.0": {
		type: "string",
		name: "proxy1.0"
	},
	"tftp-blksize": {
		type: "string",
		name: "tftp-blksize"
	},
	"mail-from": {
		type: "string",
		name: "mail-from"
	},
	"mail-rcpt": {
		type: "string",
		name: "mail-rcpt"
	},
	"ftp-pret": {
		type: "bool",
		name: "ftp-pret"
	},
	"no-ftp-pret": {
		type: "bool",
		name: "ftp-pret",
		expand: false
	},
	"proto": {
		type: "string",
		name: "proto"
	},
	"proto-redir": {
		type: "string",
		name: "proto-redir"
	},
	"resolve": {
		type: "string",
		name: "resolve"
	},
	"delegation": {
		type: "string",
		name: "delegation"
	},
	"mail-auth": {
		type: "string",
		name: "mail-auth"
	},
	"post303": {
		type: "bool",
		name: "post303"
	},
	"no-post303": {
		type: "bool",
		name: "post303",
		expand: false
	},
	"metalink": {
		type: "bool",
		name: "metalink"
	},
	"no-metalink": {
		type: "bool",
		name: "metalink",
		expand: false
	},
	"sasl-authzid": {
		type: "string",
		name: "sasl-authzid"
	},
	"sasl-ir": {
		type: "bool",
		name: "sasl-ir"
	},
	"no-sasl-ir": {
		type: "bool",
		name: "sasl-ir",
		expand: false
	},
	"test-event": {
		type: "bool",
		name: "test-event"
	},
	"no-test-event": {
		type: "bool",
		name: "test-event",
		expand: false
	},
	"unix-socket": {
		type: "string",
		name: "unix-socket"
	},
	"path-as-is": {
		type: "bool",
		name: "path-as-is"
	},
	"no-path-as-is": {
		type: "bool",
		name: "path-as-is",
		expand: false
	},
	"socks5-gssapi-service": {
		type: "string",
		name: "proxy-service-name"
	},
	"proxy-service-name": {
		type: "string",
		name: "proxy-service-name"
	},
	"service-name": {
		type: "string",
		name: "service-name"
	},
	"proto-default": {
		type: "string",
		name: "proto-default"
	},
	"expect100-timeout": {
		type: "string",
		name: "expect100-timeout"
	},
	"tftp-no-options": {
		type: "bool",
		name: "tftp-no-options"
	},
	"no-tftp-no-options": {
		type: "bool",
		name: "tftp-no-options",
		expand: false
	},
	"connect-to": {
		type: "string",
		name: "connect-to"
	},
	"abstract-unix-socket": {
		type: "string",
		name: "abstract-unix-socket"
	},
	"tls-max": {
		type: "string",
		name: "tls-max"
	},
	"suppress-connect-headers": {
		type: "bool",
		name: "suppress-connect-headers"
	},
	"no-suppress-connect-headers": {
		type: "bool",
		name: "suppress-connect-headers",
		expand: false
	},
	"compressed-ssh": {
		type: "bool",
		name: "compressed-ssh"
	},
	"no-compressed-ssh": {
		type: "bool",
		name: "compressed-ssh",
		expand: false
	},
	"happy-eyeballs-timeout-ms": {
		type: "string",
		name: "happy-eyeballs-timeout-ms"
	},
	"retry-all-errors": {
		type: "bool",
		name: "retry-all-errors"
	},
	"no-retry-all-errors": {
		type: "bool",
		name: "retry-all-errors",
		expand: false
	},
	"trace-ids": {
		type: "bool",
		name: "trace-ids"
	},
	"no-trace-ids": {
		type: "bool",
		name: "trace-ids",
		expand: false
	},
	"http1.0": {
		type: "bool",
		name: "http1.0"
	},
	"http1.1": {
		type: "bool",
		name: "http1.1"
	},
	"http2": {
		type: "bool",
		name: "http2"
	},
	"http2-prior-knowledge": {
		type: "bool",
		name: "http2-prior-knowledge"
	},
	"http3": {
		type: "bool",
		name: "http3"
	},
	"http3-only": {
		type: "bool",
		name: "http3-only"
	},
	"http0.9": {
		type: "bool",
		name: "http0.9"
	},
	"no-http0.9": {
		type: "bool",
		name: "http0.9",
		expand: false
	},
	"proxy-http2": {
		type: "bool",
		name: "proxy-http2"
	},
	"no-proxy-http2": {
		type: "bool",
		name: "proxy-http2",
		expand: false
	},
	"tlsv1": {
		type: "bool",
		name: "tlsv1"
	},
	"tlsv1.0": {
		type: "bool",
		name: "tlsv1.0"
	},
	"tlsv1.1": {
		type: "bool",
		name: "tlsv1.1"
	},
	"tlsv1.2": {
		type: "bool",
		name: "tlsv1.2"
	},
	"tlsv1.3": {
		type: "bool",
		name: "tlsv1.3"
	},
	"tls13-ciphers": {
		type: "string",
		name: "tls13-ciphers"
	},
	"proxy-tls13-ciphers": {
		type: "string",
		name: "proxy-tls13-ciphers"
	},
	"sslv2": {
		type: "bool",
		name: "sslv2"
	},
	"sslv3": {
		type: "bool",
		name: "sslv3"
	},
	"ipv4": {
		type: "bool",
		name: "ipv4"
	},
	"ipv6": {
		type: "bool",
		name: "ipv6"
	},
	"append": {
		type: "bool",
		name: "append"
	},
	"no-append": {
		type: "bool",
		name: "append",
		expand: false
	},
	"user-agent": {
		type: "string",
		name: "user-agent"
	},
	"cookie": {
		type: "string",
		name: "cookie"
	},
	"alt-svc": {
		type: "string",
		name: "alt-svc"
	},
	"hsts": {
		type: "string",
		name: "hsts"
	},
	"use-ascii": {
		type: "bool",
		name: "use-ascii"
	},
	"no-use-ascii": {
		type: "bool",
		name: "use-ascii",
		expand: false
	},
	"cookie-jar": {
		type: "string",
		name: "cookie-jar"
	},
	"continue-at": {
		type: "string",
		name: "continue-at"
	},
	"data": {
		type: "string",
		name: "data"
	},
	"data-raw": {
		type: "string",
		name: "data-raw"
	},
	"data-ascii": {
		type: "string",
		name: "data-ascii"
	},
	"data-binary": {
		type: "string",
		name: "data-binary"
	},
	"data-urlencode": {
		type: "string",
		name: "data-urlencode"
	},
	"json": {
		type: "string",
		name: "json"
	},
	"url-query": {
		type: "string",
		name: "url-query"
	},
	"dump-header": {
		type: "string",
		name: "dump-header"
	},
	"referer": {
		type: "string",
		name: "referer"
	},
	"cert": {
		type: "string",
		name: "cert"
	},
	"cacert": {
		type: "string",
		name: "cacert"
	},
	"cert-type": {
		type: "string",
		name: "cert-type"
	},
	"key": {
		type: "string",
		name: "key"
	},
	"key-type": {
		type: "string",
		name: "key-type"
	},
	"pass": {
		type: "string",
		name: "pass"
	},
	"engine": {
		type: "string",
		name: "engine"
	},
	"ca-native": {
		type: "bool",
		name: "ca-native"
	},
	"no-ca-native": {
		type: "bool",
		name: "ca-native",
		expand: false
	},
	"proxy-ca-native": {
		type: "bool",
		name: "proxy-ca-native"
	},
	"no-proxy-ca-native": {
		type: "bool",
		name: "proxy-ca-native",
		expand: false
	},
	"capath": {
		type: "string",
		name: "capath"
	},
	"pubkey": {
		type: "string",
		name: "pubkey"
	},
	"hostpubmd5": {
		type: "string",
		name: "hostpubmd5"
	},
	"hostpubsha256": {
		type: "string",
		name: "hostpubsha256"
	},
	"crlfile": {
		type: "string",
		name: "crlfile"
	},
	"tlsuser": {
		type: "string",
		name: "tlsuser"
	},
	"tlspassword": {
		type: "string",
		name: "tlspassword"
	},
	"tlsauthtype": {
		type: "string",
		name: "tlsauthtype"
	},
	"ssl-allow-beast": {
		type: "bool",
		name: "ssl-allow-beast"
	},
	"no-ssl-allow-beast": {
		type: "bool",
		name: "ssl-allow-beast",
		expand: false
	},
	"ssl-auto-client-cert": {
		type: "bool",
		name: "ssl-auto-client-cert"
	},
	"no-ssl-auto-client-cert": {
		type: "bool",
		name: "ssl-auto-client-cert",
		expand: false
	},
	"proxy-ssl-auto-client-cert": {
		type: "bool",
		name: "proxy-ssl-auto-client-cert"
	},
	"no-proxy-ssl-auto-client-cert": {
		type: "bool",
		name: "proxy-ssl-auto-client-cert",
		expand: false
	},
	"pinnedpubkey": {
		type: "string",
		name: "pinnedpubkey"
	},
	"proxy-pinnedpubkey": {
		type: "string",
		name: "proxy-pinnedpubkey"
	},
	"cert-status": {
		type: "bool",
		name: "cert-status"
	},
	"no-cert-status": {
		type: "bool",
		name: "cert-status",
		expand: false
	},
	"doh-cert-status": {
		type: "bool",
		name: "doh-cert-status"
	},
	"no-doh-cert-status": {
		type: "bool",
		name: "doh-cert-status",
		expand: false
	},
	"false-start": {
		type: "bool",
		name: "false-start"
	},
	"no-false-start": {
		type: "bool",
		name: "false-start",
		expand: false
	},
	"ssl-no-revoke": {
		type: "bool",
		name: "ssl-no-revoke"
	},
	"no-ssl-no-revoke": {
		type: "bool",
		name: "ssl-no-revoke",
		expand: false
	},
	"ssl-revoke-best-effort": {
		type: "bool",
		name: "ssl-revoke-best-effort"
	},
	"no-ssl-revoke-best-effort": {
		type: "bool",
		name: "ssl-revoke-best-effort",
		expand: false
	},
	"tcp-fastopen": {
		type: "bool",
		name: "tcp-fastopen"
	},
	"no-tcp-fastopen": {
		type: "bool",
		name: "tcp-fastopen",
		expand: false
	},
	"proxy-tlsuser": {
		type: "string",
		name: "proxy-tlsuser"
	},
	"proxy-tlspassword": {
		type: "string",
		name: "proxy-tlspassword"
	},
	"proxy-tlsauthtype": {
		type: "string",
		name: "proxy-tlsauthtype"
	},
	"proxy-cert": {
		type: "string",
		name: "proxy-cert"
	},
	"proxy-cert-type": {
		type: "string",
		name: "proxy-cert-type"
	},
	"proxy-key": {
		type: "string",
		name: "proxy-key"
	},
	"proxy-key-type": {
		type: "string",
		name: "proxy-key-type"
	},
	"proxy-pass": {
		type: "string",
		name: "proxy-pass"
	},
	"proxy-ciphers": {
		type: "string",
		name: "proxy-ciphers"
	},
	"proxy-crlfile": {
		type: "string",
		name: "proxy-crlfile"
	},
	"proxy-ssl-allow-beast": {
		type: "bool",
		name: "proxy-ssl-allow-beast"
	},
	"no-proxy-ssl-allow-beast": {
		type: "bool",
		name: "proxy-ssl-allow-beast",
		expand: false
	},
	"login-options": {
		type: "string",
		name: "login-options"
	},
	"proxy-cacert": {
		type: "string",
		name: "proxy-cacert"
	},
	"proxy-capath": {
		type: "string",
		name: "proxy-capath"
	},
	"proxy-insecure": {
		type: "bool",
		name: "proxy-insecure"
	},
	"no-proxy-insecure": {
		type: "bool",
		name: "proxy-insecure",
		expand: false
	},
	"proxy-tlsv1": {
		type: "bool",
		name: "proxy-tlsv1"
	},
	"socks5-basic": {
		type: "bool",
		name: "socks5-basic"
	},
	"no-socks5-basic": {
		type: "bool",
		name: "socks5-basic",
		expand: false
	},
	"socks5-gssapi": {
		type: "bool",
		name: "socks5-gssapi"
	},
	"no-socks5-gssapi": {
		type: "bool",
		name: "socks5-gssapi",
		expand: false
	},
	"etag-save": {
		type: "string",
		name: "etag-save"
	},
	"etag-compare": {
		type: "string",
		name: "etag-compare"
	},
	"curves": {
		type: "string",
		name: "curves"
	},
	"fail": {
		type: "bool",
		name: "fail"
	},
	"no-fail": {
		type: "bool",
		name: "fail",
		expand: false
	},
	"fail-early": {
		type: "bool",
		name: "fail-early"
	},
	"no-fail-early": {
		type: "bool",
		name: "fail-early",
		expand: false
	},
	"styled-output": {
		type: "bool",
		name: "styled-output"
	},
	"no-styled-output": {
		type: "bool",
		name: "styled-output",
		expand: false
	},
	"mail-rcpt-allowfails": {
		type: "bool",
		name: "mail-rcpt-allowfails"
	},
	"no-mail-rcpt-allowfails": {
		type: "bool",
		name: "mail-rcpt-allowfails",
		expand: false
	},
	"fail-with-body": {
		type: "bool",
		name: "fail-with-body"
	},
	"no-fail-with-body": {
		type: "bool",
		name: "fail-with-body",
		expand: false
	},
	"remove-on-error": {
		type: "bool",
		name: "remove-on-error"
	},
	"no-remove-on-error": {
		type: "bool",
		name: "remove-on-error",
		expand: false
	},
	"form": {
		type: "string",
		name: "form"
	},
	"form-string": {
		type: "string",
		name: "form-string"
	},
	"globoff": {
		type: "bool",
		name: "globoff"
	},
	"no-globoff": {
		type: "bool",
		name: "globoff",
		expand: false
	},
	"get": {
		type: "bool",
		name: "get"
	},
	"no-get": {
		type: "bool",
		name: "get",
		expand: false
	},
	"request-target": {
		type: "string",
		name: "request-target"
	},
	"help": {
		type: "bool",
		name: "help"
	},
	"no-help": {
		type: "bool",
		name: "help",
		expand: false
	},
	"header": {
		type: "string",
		name: "header"
	},
	"proxy-header": {
		type: "string",
		name: "proxy-header"
	},
	"include": {
		type: "bool",
		name: "include"
	},
	"no-include": {
		type: "bool",
		name: "include",
		expand: false
	},
	"head": {
		type: "bool",
		name: "head"
	},
	"no-head": {
		type: "bool",
		name: "head",
		expand: false
	},
	"junk-session-cookies": {
		type: "bool",
		name: "junk-session-cookies"
	},
	"no-junk-session-cookies": {
		type: "bool",
		name: "junk-session-cookies",
		expand: false
	},
	"remote-header-name": {
		type: "bool",
		name: "remote-header-name"
	},
	"no-remote-header-name": {
		type: "bool",
		name: "remote-header-name",
		expand: false
	},
	"insecure": {
		type: "bool",
		name: "insecure"
	},
	"no-insecure": {
		type: "bool",
		name: "insecure",
		expand: false
	},
	"doh-insecure": {
		type: "bool",
		name: "doh-insecure"
	},
	"no-doh-insecure": {
		type: "bool",
		name: "doh-insecure",
		expand: false
	},
	"config": {
		type: "string",
		name: "config"
	},
	"list-only": {
		type: "bool",
		name: "list-only"
	},
	"no-list-only": {
		type: "bool",
		name: "list-only",
		expand: false
	},
	"location": {
		type: "bool",
		name: "location"
	},
	"no-location": {
		type: "bool",
		name: "location",
		expand: false
	},
	"location-trusted": {
		type: "bool",
		name: "location-trusted"
	},
	"no-location-trusted": {
		type: "bool",
		name: "location-trusted",
		expand: false
	},
	"max-time": {
		type: "string",
		name: "max-time"
	},
	"manual": {
		type: "bool",
		name: "manual"
	},
	"no-manual": {
		type: "bool",
		name: "manual",
		expand: false
	},
	"netrc": {
		type: "bool",
		name: "netrc"
	},
	"no-netrc": {
		type: "bool",
		name: "netrc",
		expand: false
	},
	"netrc-optional": {
		type: "bool",
		name: "netrc-optional"
	},
	"no-netrc-optional": {
		type: "bool",
		name: "netrc-optional",
		expand: false
	},
	"netrc-file": {
		type: "string",
		name: "netrc-file"
	},
	"buffer": {
		type: "bool",
		name: "buffer"
	},
	"no-buffer": {
		type: "bool",
		name: "buffer",
		expand: false
	},
	"output": {
		type: "string",
		name: "output"
	},
	"remote-name": {
		type: "bool",
		name: "remote-name"
	},
	"no-remote-name": {
		type: "bool",
		name: "remote-name",
		expand: false
	},
	"remote-name-all": {
		type: "bool",
		name: "remote-name-all"
	},
	"no-remote-name-all": {
		type: "bool",
		name: "remote-name-all",
		expand: false
	},
	"output-dir": {
		type: "string",
		name: "output-dir"
	},
	"clobber": {
		type: "bool",
		name: "clobber"
	},
	"no-clobber": {
		type: "bool",
		name: "clobber",
		expand: false
	},
	"proxytunnel": {
		type: "bool",
		name: "proxytunnel"
	},
	"no-proxytunnel": {
		type: "bool",
		name: "proxytunnel",
		expand: false
	},
	"ftp-port": {
		type: "string",
		name: "ftp-port"
	},
	"disable": {
		type: "bool",
		name: "disable"
	},
	"no-disable": {
		type: "bool",
		name: "disable",
		expand: false
	},
	"quote": {
		type: "string",
		name: "quote"
	},
	"range": {
		type: "string",
		name: "range"
	},
	"remote-time": {
		type: "bool",
		name: "remote-time"
	},
	"no-remote-time": {
		type: "bool",
		name: "remote-time",
		expand: false
	},
	"silent": {
		type: "bool",
		name: "silent"
	},
	"no-silent": {
		type: "bool",
		name: "silent",
		expand: false
	},
	"show-error": {
		type: "bool",
		name: "show-error"
	},
	"no-show-error": {
		type: "bool",
		name: "show-error",
		expand: false
	},
	"telnet-option": {
		type: "string",
		name: "telnet-option"
	},
	"upload-file": {
		type: "string",
		name: "upload-file"
	},
	"user": {
		type: "string",
		name: "user"
	},
	"proxy-user": {
		type: "string",
		name: "proxy-user"
	},
	"verbose": {
		type: "bool",
		name: "verbose"
	},
	"no-verbose": {
		type: "bool",
		name: "verbose",
		expand: false
	},
	"version": {
		type: "bool",
		name: "version"
	},
	"no-version": {
		type: "bool",
		name: "version",
		expand: false
	},
	"write-out": {
		type: "string",
		name: "write-out"
	},
	"proxy": {
		type: "string",
		name: "proxy"
	},
	"preproxy": {
		type: "string",
		name: "preproxy"
	},
	"request": {
		type: "string",
		name: "request"
	},
	"speed-limit": {
		type: "string",
		name: "speed-limit"
	},
	"speed-time": {
		type: "string",
		name: "speed-time"
	},
	"time-cond": {
		type: "string",
		name: "time-cond"
	},
	"parallel": {
		type: "bool",
		name: "parallel"
	},
	"no-parallel": {
		type: "bool",
		name: "parallel",
		expand: false
	},
	"parallel-max": {
		type: "string",
		name: "parallel-max"
	},
	"parallel-immediate": {
		type: "bool",
		name: "parallel-immediate"
	},
	"no-parallel-immediate": {
		type: "bool",
		name: "parallel-immediate",
		expand: false
	},
	"progress-bar": {
		type: "bool",
		name: "progress-bar"
	},
	"no-progress-bar": {
		type: "bool",
		name: "progress-bar",
		expand: false
	},
	"progress-meter": {
		type: "bool",
		name: "progress-meter"
	},
	"no-progress-meter": {
		type: "bool",
		name: "progress-meter",
		expand: false
	},
	"next": {
		type: "bool",
		name: "next"
	},
	port: {
		type: "string",
		name: "port",
		removed: "7.3"
	},
	"ftp-ascii": {
		type: "bool",
		name: "use-ascii",
		removed: "7.10.7"
	},
	"3p-url": {
		type: "string",
		name: "3p-url",
		removed: "7.16.0"
	},
	"3p-user": {
		type: "string",
		name: "3p-user",
		removed: "7.16.0"
	},
	"3p-quote": {
		type: "string",
		name: "3p-quote",
		removed: "7.16.0"
	},
	"http2.0": {
		type: "bool",
		name: "http2",
		removed: "7.36.0"
	},
	"no-http2.0": {
		type: "bool",
		name: "http2",
		removed: "7.36.0"
	},
	"telnet-options": {
		type: "string",
		name: "telnet-option",
		removed: "7.49.0"
	},
	"http-request": {
		type: "string",
		name: "request",
		removed: "7.49.0"
	},
	"capath ": {
		type: "string",
		name: "capath",
		removed: "7.49.0"
	},
	ftpport: {
		type: "string",
		name: "ftp-port",
		removed: "7.49.0"
	},
	environment: {
		type: "bool",
		name: "environment",
		removed: "7.54.1"
	},
	"no-tlsv1": {
		type: "bool",
		name: "tlsv1",
		removed: "7.54.1"
	},
	"no-tlsv1.2": {
		type: "bool",
		name: "tlsv1.2",
		removed: "7.54.1"
	},
	"no-http2-prior-knowledge": {
		type: "bool",
		name: "http2-prior-knowledge",
		removed: "7.54.1"
	},
	"no-ipv6": {
		type: "bool",
		name: "ipv6",
		removed: "7.54.1"
	},
	"no-ipv4": {
		type: "bool",
		name: "ipv4",
		removed: "7.54.1"
	},
	"no-sslv2": {
		type: "bool",
		name: "sslv2",
		removed: "7.54.1"
	},
	"no-tlsv1.0": {
		type: "bool",
		name: "tlsv1.0",
		removed: "7.54.1"
	},
	"no-tlsv1.1": {
		type: "bool",
		name: "tlsv1.1",
		removed: "7.54.1"
	},
	"no-sslv3": {
		type: "bool",
		name: "sslv3",
		removed: "7.54.1"
	},
	"no-http1.0": {
		type: "bool",
		name: "http1.0",
		removed: "7.54.1"
	},
	"no-next": {
		type: "bool",
		name: "next",
		removed: "7.54.1"
	},
	"no-tlsv1.3": {
		type: "bool",
		name: "tlsv1.3",
		removed: "7.54.1"
	},
	"no-environment": {
		type: "bool",
		name: "environment",
		removed: "7.54.1"
	},
	"no-http1.1": {
		type: "bool",
		name: "http1.1",
		removed: "7.54.1"
	},
	"no-proxy-tlsv1": {
		type: "bool",
		name: "proxy-tlsv1",
		removed: "7.54.1"
	},
	"no-http2": {
		type: "bool",
		name: "http2",
		removed: "7.54.1"
	}
};
var curlLongOptsShortened = {};
for (const [opt, val] of Object.entries(curlLongOpts)) {
	const expand = "expand" in val ? val.expand : true;
	const removed = "removed" in val ? val.removed : false;
	if (expand && !removed) for (let i = 1; i < opt.length; i++) {
		const shortenedOpt = opt.slice(0, i);
		if (!Object.prototype.hasOwnProperty.call(curlLongOptsShortened, shortenedOpt)) {
			if (!Object.prototype.hasOwnProperty.call(curlLongOpts, shortenedOpt)) curlLongOptsShortened[shortenedOpt] = val;
		} else curlLongOptsShortened[shortenedOpt] = null;
	}
}
var COMMON_SUPPORTED_ARGS = [
	"url",
	"proto-default",
	"globoff",
	"disallow-username-in-url",
	"request",
	"get",
	"head",
	"no-head",
	"header",
	"user-agent",
	"referer",
	"range",
	"time-cond",
	"cookie",
	"oauth2-bearer",
	"user",
	"basic",
	"no-basic",
	"data",
	"data-raw",
	"data-ascii",
	"data-binary",
	"data-urlencode",
	"json",
	"url-query"
];
function toBoolean(opt) {
	if (opt.startsWith("no-disable-")) return true;
	if (opt.startsWith("disable-") || opt.startsWith("no-")) return false;
	return true;
}
var curlShortOpts = {
	"0": "http1.0",
	"1": "tlsv1",
	"2": "sslv2",
	"3": "sslv3",
	"4": "ipv4",
	"6": "ipv6",
	"a": "append",
	"A": "user-agent",
	"b": "cookie",
	"B": "use-ascii",
	"c": "cookie-jar",
	"C": "continue-at",
	"d": "data",
	"D": "dump-header",
	"e": "referer",
	"E": "cert",
	"f": "fail",
	"F": "form",
	"g": "globoff",
	"G": "get",
	"h": "help",
	"H": "header",
	"i": "include",
	"I": "head",
	"j": "junk-session-cookies",
	"J": "remote-header-name",
	"k": "insecure",
	"K": "config",
	"l": "list-only",
	"L": "location",
	"m": "max-time",
	"M": "manual",
	"n": "netrc",
	"N": "no-buffer",
	"o": "output",
	"O": "remote-name",
	"p": "proxytunnel",
	"P": "ftp-port",
	"q": "disable",
	"Q": "quote",
	"r": "range",
	"R": "remote-time",
	"s": "silent",
	"S": "show-error",
	"t": "telnet-option",
	"T": "upload-file",
	"u": "user",
	"U": "proxy-user",
	"v": "verbose",
	"V": "version",
	"w": "write-out",
	"x": "proxy",
	"X": "request",
	"Y": "speed-limit",
	"y": "speed-time",
	"z": "time-cond",
	"Z": "parallel",
	"#": "progress-bar",
	":": "next"
};
var changedShortOpts = {
	p: "used to be short for --port <port> (a since-deleted flag) until curl 7.3",
	t: "used to be short for --upload (a since-deleted boolean flag) until curl 7.7",
	c: "used to be short for --continue (a since-deleted boolean flag) until curl 7.9",
	"@": "used to be short for --create-dirs until curl 7.10.7",
	Z: "used to be short for --max-redirs <num> until curl 7.10.7",
	9: "used to be short for --crlf until curl 7.10.8",
	8: "used to be short for --stderr <file> until curl 7.10.8",
	7: "used to be short for --interface <name> until curl 7.10.8",
	6: "used to be short for --krb <level> (which itself used to be --krb4 <level>) until curl 7.10.8",
	5: "used to be another way to specify the url until curl 7.10.8",
	"*": "used to be another way to specify the url until curl 7.49.0",
	"~": "used to be short for --xattr until curl 7.49.0"
};
var canBeList = /* @__PURE__ */ new Set([
	"connect-to",
	"cookie",
	"data",
	"form",
	"header",
	"hsts",
	"mail-rcpt",
	"output",
	"proxy-header",
	"quote",
	"resolve",
	"telnet-option",
	"upload-file",
	"url-query",
	"url"
]);
function checkSupported(global_, lookup, longArg, supportedOpts) {
	if (supportedOpts && !supportedOpts.has(longArg.name)) warnf(global_, [longArg.name, lookup + " is not a supported option" + (longArg.removed ? ", it was removed in curl " + longArg.removed : "")]);
}
function pushProp(obj, prop, value) {
	if (!Object.prototype.hasOwnProperty.call(obj, prop)) obj[prop] = [];
	obj[prop].push(value);
	return obj;
}
function pushArgValue(global_, config, argName, value) {
	switch (argName) {
		case "data":
		case "data-ascii": return pushProp(config, "data", ["data", value]);
		case "data-binary": return pushProp(config, "data", [value.startsWith("@") ? "binary" : "data", value]);
		case "data-raw": return pushProp(config, "data", [value.startsWith("@") ? "raw" : "data", value]);
		case "data-urlencode": return pushProp(config, "data", ["urlencode", value]);
		case "json":
			config.json = true;
			return pushProp(config, "data", ["json", value]);
		case "url-query":
			if (value.startsWith("+")) return pushProp(config, "url-query", ["raw", value.slice(1)]);
			return pushProp(config, "url-query", ["urlencode", value]);
		case "form": return pushProp(config, "form", {
			value,
			type: "form"
		});
		case "form-string": return pushProp(config, "form", {
			value,
			type: "string"
		});
		case "aws-sigv4":
			config.authtype |= 128;
			break;
		case "oauth2-bearer":
			config.authtype |= 64;
			break;
		case "unix-socket":
		case "abstract-unix-socket":
			pushProp(config, "unix-socket", value);
			break;
		case "trace":
		case "trace-ascii":
		case "stderr":
		case "libcurl":
		case "config":
		case "parallel-max":
			global_[argName] = value;
			break;
		case "language":
			global_[argName] = value.toString();
			return;
	}
	return pushProp(config, argName, value);
}
function setArgValue(global_, config, argName, toggle) {
	switch (argName) {
		case "digest":
			if (toggle) config.authtype |= 2;
			else config.authtype &= -3;
			break;
		case "proxy-digest":
			if (toggle) config.proxyauthtype |= 2;
			else config.proxyauthtype &= -3;
			break;
		case "negotiate":
			if (toggle) config.authtype |= 4;
			else config.authtype &= -5;
			break;
		case "proxy-negotiate":
			if (toggle) config.proxyauthtype |= 4;
			else config.proxyauthtype &= -5;
			break;
		case "ntlm":
			if (toggle) config.authtype |= 8;
			else config.authtype &= -9;
			break;
		case "proxy-ntlm":
			if (toggle) config.proxyauthtype |= 8;
			else config.proxyauthtype &= -9;
			break;
		case "ntlm-wb":
			if (toggle) config.authtype |= 32;
			else config.authtype &= -33;
			break;
		case "basic":
			if (toggle) config.authtype |= 1;
			else config.authtype &= -2;
			break;
		case "proxy-basic":
			if (toggle) config.proxyauthtype |= 1;
			else config.proxyauthtype &= -2;
			break;
		case "anyauth":
			if (toggle) config.authtype = -17;
			break;
		case "proxy-anyauth":
			if (toggle) config.proxyauthtype = -17;
			break;
		case "location":
			config["location"] = toggle;
			break;
		case "location-trusted":
			config["location"] = toggle;
			config["location-trusted"] = toggle;
			break;
		case "http1.0":
			config.httpVersion = "1.0";
			break;
		case "http1.1":
			config.httpVersion = "1.1";
			break;
		case "http2":
			config.httpVersion = "2";
			break;
		case "http2-prior-knowledge":
			config.httpVersion = "2-prior-knowledge";
			break;
		case "http3":
			config.httpVersion = "3";
			break;
		case "http3-only":
			config.httpVersion = "3-only";
			break;
		case "tlsv1":
			config.tlsVersion = "1";
			break;
		case "tlsv1.0":
			config.tlsVersion = "1.0";
			break;
		case "tlsv1.1":
			config.tlsVersion = "1.1";
			break;
		case "tlsv1.2":
			config.tlsVersion = "1.2";
			break;
		case "tlsv1.3":
			config.tlsVersion = "1.3";
			break;
		case "verbose":
		case "version":
		case "trace-time":
		case "test-event":
		case "progress-bar":
		case "progress-meter":
		case "fail-early":
		case "styled-output":
		case "help":
		case "silent":
		case "show-error":
		case "parallel":
		case "parallel-immediate":
		case "stdin":
			global_[argName] = toggle;
			break;
		case "next":
			if (toggle && config.url && config.url.length > 0 && config.url.length >= (config["upload-file"] || []).length && config.url.length >= (config.output || []).length) {
				config = {
					authtype: 1,
					proxyauthtype: 1
				};
				global_.configs.push(config);
			}
			break;
		default: config[argName] = toggle;
	}
	return config;
}
function parseArgs(args, longOpts = curlLongOpts, shortenedLongOpts = curlLongOptsShortened, shortOpts = curlShortOpts, supportedOpts, warnings = []) {
	let config = {
		authtype: 1,
		proxyauthtype: 1
	};
	const global_ = {
		configs: [config],
		warnings
	};
	const seen = [];
	for (let i = 1, stillflags = true; i < args.length; i++) {
		const arg = args[i];
		if (stillflags && arg.startsWith("-")) {
			if (eq(arg, "--")) stillflags = false;
			else if (arg.startsWith("--")) {
				const shellToken = firstShellToken(arg);
				if (shellToken) throw new CCError("this " + shellToken.type + " could " + (shellToken.type === "command" ? "return" : "be") + " anything\n" + underlineNode(shellToken.syntaxNode));
				const argStr = arg.toString();
				const lookup = argStr.slice(2);
				let longArg = shortenedLongOpts[lookup];
				if (typeof longArg === "undefined") longArg = longOpts[lookup];
				if (longArg === null) throw new CCError("option " + argStr + ": is ambiguous");
				if (typeof longArg === "undefined") throw new CCError("option " + argStr + ": is unknown");
				if (longArg.type === "string") {
					i++;
					if (i >= args.length) throw new CCError("option " + argStr + ": requires parameter");
					pushArgValue(global_, config, longArg.name, args[i]);
				} else config = setArgValue(global_, config, longArg.name, toBoolean(argStr.slice(2)));
				checkSupported(global_, argStr, longArg, supportedOpts);
				seen.push([longArg.name, argStr]);
			} else {
				if (arg.length === 1) {
					if (Object.prototype.hasOwnProperty.call(shortOpts, "")) {
						const shortFor = shortOpts[""];
						const longArg = longOpts[shortFor];
						if (longArg === null) throw new CCError("option -: is unknown");
						config = setArgValue(global_, config, longArg.name, toBoolean(shortFor));
						seen.push([longArg.name, "-"]);
					} else throw new CCError("option -: is unknown");
				}
				for (let j = 1; j < arg.length; j++) {
					const jthChar = arg.get(j);
					if (typeof jthChar !== "string") throw new CCError("this " + jthChar.type + " could " + (jthChar.type === "command" ? "return" : "be") + " anything\n" + underlineNode(jthChar.syntaxNode));
					if (!has(shortOpts, jthChar)) {
						if (has(changedShortOpts, jthChar)) throw new CCError("option " + arg + ": " + changedShortOpts[jthChar]);
						throw new CCError("option " + arg + ": is unknown");
					}
					const lookup = jthChar;
					const shortFor = shortOpts[lookup];
					const longArg = longOpts[shortFor];
					if (longArg === null) throw new CCError("ambiguous short option -" + jthChar);
					if (longArg.type === "string") {
						let val;
						if (j + 1 < arg.length) {
							val = arg.slice(j + 1);
							j = arg.length;
						} else if (i + 1 < args.length) {
							i++;
							val = args[i];
						} else throw new CCError("option " + arg.toString() + ": requires parameter");
						pushArgValue(global_, config, longArg.name, val);
					} else config = setArgValue(global_, config, longArg.name, toBoolean(shortFor));
					if (lookup) {
						checkSupported(global_, "-" + lookup, longArg, supportedOpts);
						seen.push([longArg.name, "-" + lookup]);
					}
				}
			}
		} else {
			if (typeof arg !== "string" && arg.tokens.length && typeof arg.tokens[0] !== "string") {
				const isOrBeginsWith = arg.tokens.length === 1 ? "is" : "begins with";
				warnings.push(["ambiguous argument", "argument " + isOrBeginsWith + " a " + arg.tokens[0].type + ", assuming it's a URL\n" + underlineNode(arg.tokens[0].syntaxNode)]);
			}
			pushArgValue(global_, config, "url", arg);
			seen.push(["url", "--url"]);
		}
	}
	for (const cfg of global_.configs) for (const [arg, values] of Object.entries(cfg)) if (Array.isArray(values) && !canBeList.has(arg)) cfg[arg] = values[values.length - 1];
	return [global_, seen];
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/Headers.js
var COMMA_SEPARATED = new Set([
	"A-IM",
	"Accept",
	"Accept-Charset",
	"Accept-Encoding",
	"Accept-Language",
	"Access-Control-Request-Headers",
	"Cache-Control",
	"Connection",
	"Content-Encoding",
	"Expect",
	"Forwarded",
	"If-Match",
	"If-None-Match",
	"Range",
	"TE",
	"Trailer",
	"Transfer-Encoding",
	"Upgrade",
	"Via",
	"Warning"
].map((h) => h.toLowerCase()));
var SEMICOLON_SEPARATED = new Set([
	"Content-Type",
	"Cookie",
	"Prefer"
].map((h) => h.toLowerCase()));
var Headers = class {
	constructor(headerArgs, warnings = [], argName = "--header/H") {
		let headers = [];
		if (headerArgs) for (const header of headerArgs) {
			if (header.startsWith("@")) {
				warnings.push(["header-file", "passing a file for " + argName + " is not supported: " + JSON.stringify(header.toString())]);
				continue;
			}
			if (header.includes(":")) {
				const [name, value] = header.split(":", 2);
				const headerValue = value && (eq(name, "Host") ? value : value.trim()).toBool() ? value.removeFirstChar(" ") : null;
				headers.push([name, headerValue]);
			} else if (header.includes(";")) {
				const [name] = header.split(";", 2);
				headers.push([name, new Word()]);
			}
		}
		this.lowercase = headers.length > 0 && headers.every((h) => eq(h[0], h[0].toLowerCase()));
		const uniqueHeaders = {};
		for (const [name, value] of headers) {
			const lowerName = name.toLowerCase().toString();
			if (!uniqueHeaders[lowerName]) uniqueHeaders[lowerName] = [];
			uniqueHeaders[lowerName].push([name, value]);
		}
		headers = [];
		for (const [lowerName, repeatedHeaders] of Object.entries(uniqueHeaders)) {
			if (repeatedHeaders.length === 1) {
				headers.push(repeatedHeaders[0]);
				continue;
			}
			if (repeatedHeaders.every((h) => h[1] === null)) {
				const lastRepeat = repeatedHeaders[repeatedHeaders.length - 1];
				if (new Set(repeatedHeaders.map((h) => h[0])).size > 1) warnings.push(["repeated-header", `"${lastRepeat[0]}" header unset ${repeatedHeaders.length} times`]);
				headers.push(lastRepeat);
				continue;
			}
			const nonEmptyHeaders = repeatedHeaders.filter((h) => h[1] !== null);
			if (nonEmptyHeaders.length === 1) {
				headers.push(nonEmptyHeaders[0]);
				continue;
			}
			let mergeChar = "";
			if (COMMA_SEPARATED.has(lowerName)) mergeChar = ", ";
			else if (SEMICOLON_SEPARATED.has(lowerName)) mergeChar = "; ";
			if (mergeChar) {
				const merged = joinWords(nonEmptyHeaders.map((h) => h[1]), mergeChar);
				warnings.push(["repeated-header", `merged ${nonEmptyHeaders.length} "${nonEmptyHeaders[nonEmptyHeaders.length - 1][0]}" headers together with "${mergeChar.trim()}"`]);
				headers.push([nonEmptyHeaders[0][0], merged]);
				continue;
			}
			warnings.push(["repeated-header", `found ${nonEmptyHeaders.length} "${nonEmptyHeaders[nonEmptyHeaders.length - 1][0]}" headers, only the last one will be sent`]);
			headers = headers.concat(nonEmptyHeaders);
		}
		this.headers = headers;
	}
	get length() {
		return this.headers.length;
	}
	*[Symbol.iterator]() {
		for (const h of this.headers) yield h;
	}
	get(header) {
		const lookup = header.toLowerCase();
		for (const [h, v] of this.headers) if (h.toLowerCase().toString() === lookup) return v;
	}
	getContentType() {
		const contentTypeHeader = this.get("content-type");
		if (!contentTypeHeader) return contentTypeHeader;
		return contentTypeHeader.split(";")[0].trim().toString();
	}
	has(header) {
		const lookup = header.toLowerCase();
		for (const h of this.headers) if (eq(h[0].toLowerCase(), lookup)) return true;
		return false;
	}
	setIfMissing(header, value) {
		if (this.has(header)) return false;
		if (this.lowercase) header = header.toLowerCase();
		const k = typeof header === "string" ? new Word(header) : header;
		const v = typeof value === "string" ? new Word(value) : value;
		this.headers.push([k, v]);
		return true;
	}
	prependIfMissing(header, value) {
		if (this.has(header)) return false;
		if (this.lowercase) header = header.toLowerCase();
		const k = typeof header === "string" ? new Word(header) : header;
		const v = typeof value === "string" ? new Word(value) : value;
		this.headers.unshift([k, v]);
		return true;
	}
	set(header, value) {
		if (this.lowercase) header = header.toLowerCase();
		const k = typeof header === "string" ? new Word(header) : header;
		const v = typeof value === "string" ? new Word(value) : value;
		const searchHeader = k.toLowerCase().toString();
		for (let i = 0; i < this.headers.length; i++) if (eq(this.headers[i][0].toLowerCase(), searchHeader)) {
			this.headers[i][1] = v;
			return;
		}
		this.headers.push([k, v]);
	}
	delete(header) {
		const lookup = header.toLowerCase();
		for (let i = this.headers.length - 1; i >= 0; i--) if (this.headers[i][0].toLowerCase().toString() === lookup) this.headers.splice(i, 1);
	}
	clearNulls() {
		for (let i = this.headers.length - 1; i >= 0; i--) if (this.headers[i][1] === null) this.headers.splice(i, 1);
	}
	count(header) {
		let count = 0;
		const lookup = header.toLowerCase();
		for (const h of this.headers || []) if (h[0].toLowerCase().toString() === lookup) count += 1;
		return count;
	}
	toBool() {
		return this.headers.length > 0 && this.headers.some((h) => h[1] !== null);
	}
};
function parseCookiesStrict(cookieString) {
	const cookies = [];
	for (let cookie of cookieString.split(";")) {
		cookie = cookie.replace(/^ /, "");
		const [name, value] = cookie.split("=", 2);
		if (value === void 0) return null;
		cookies.push([name, value]);
	}
	if (new Set(cookies.map((c) => c[0])).size !== cookies.length) return null;
	return cookies;
}
function parseCookies(cookieString) {
	const cookies = [];
	for (let cookie of cookieString.split(";")) {
		cookie = cookie.trim();
		if (!cookie) continue;
		const [name, value] = cookie.split("=", 2);
		cookies.push([name.trim(), (value || "").trim()]);
	}
	if (new Set(cookies.map((c) => c[0])).size !== cookies.length) return null;
	return cookies;
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/curl/url.js
var MAX_IP6LEN = 128;
function isIpv6(glob) {
	if (glob.length > MAX_IP6LEN) return false;
	return !glob.includes("-");
}
function warnAboutGlobs(global_, url) {
	let prev = "";
	for (let i = 0; i < url.length; i++) {
		const cur = url[i];
		if (cur === "[" && prev !== "\\") {
			let j = i + 1;
			while (j < url.length && url[j] !== "]") j++;
			if (j < url.length && url[j] === "]") {
				const glob = url.slice(i, j + 1);
				if (!isIpv6(glob)) warnf(global_, ["glob-in-url", `globs in the URL are not supported:\n${url}\n` + " ".repeat(i) + "^".repeat(glob.length)]);
				prev = "";
			} else {
				warnf(global_, ["unbalanced-glob", `bracket doesn't have a closing bracket:
${url}\n${" ".repeat(i)}^`]);
				return;
			}
		} else if (cur === "{" && prev !== "\\") {
			let j = i + 1;
			while (j < url.length && url[j] !== "}") j++;
			if (j < url.length && url[j] === "}") {
				const glob = url.slice(i, j + 1);
				warnf(global_, ["glob-in-url", `globs in the URL are not supported:\n${url}\n` + " ".repeat(i) + "^".repeat(glob.length)]);
				prev = "";
			} else {
				warnf(global_, ["unbalanced-glob", `bracket doesn't have a closing bracket:
${url}\n${" ".repeat(i)}^`]);
				return;
			}
		}
		prev = cur;
	}
}
function parseurl(global_, config, url) {
	var _a;
	const u = {
		scheme: new Word(),
		host: new Word(),
		port: new Word(),
		path: new Word(),
		query: new Word(),
		fragment: new Word()
	};
	if (!config.globoff) {
		if (url.isString()) warnAboutGlobs(global_, url.toString());
		url = url.replace(/\\([[\]{}])/g, "$1");
	}
	let schemeMatch = null;
	if (url.tokens.length && typeof url.tokens[0] === "string") schemeMatch = url.tokens[0].match(/^([a-zA-Z0-9+-.]*):\/\/*/);
	if (schemeMatch) {
		const [schemeAndSlashes, scheme] = schemeMatch;
		u.scheme = new Word(scheme.toLowerCase());
		url = url.slice(schemeAndSlashes.length);
	} else u.scheme = (_a = config["proto-default"]) !== null && _a !== void 0 ? _a : new Word("http");
	if (!eq(u.scheme, "http") && !eq(u.scheme, "https")) warnf(global_, ["bad-scheme", `Protocol "${u.scheme}" not supported`]);
	const hostMatch = url.indexOfFirstChar("/?#");
	if (hostMatch !== -1) {
		u.host = url.slice(0, hostMatch);
		u.path = url.slice(hostMatch);
		const fragmentIndex = u.path.indexOf("#");
		const queryIndex = u.path.indexOf("?");
		if (fragmentIndex !== -1) {
			u.fragment = u.path.slice(fragmentIndex);
			if (queryIndex !== -1 && queryIndex < fragmentIndex) {
				u.query = u.path.slice(queryIndex, fragmentIndex);
				u.path = u.path.slice(0, queryIndex);
			} else u.path = u.path.slice(0, fragmentIndex);
		} else if (queryIndex !== -1) {
			u.query = u.path.slice(queryIndex);
			u.path = u.path.slice(0, queryIndex);
		}
	} else u.host = url;
	const authMatch = u.host.indexOf("@");
	if (authMatch !== -1) {
		const auth = u.host.slice(0, authMatch);
		u.host = u.host.slice(authMatch + 1);
		if (!config["disallow-username-in-url"]) {
			u.auth = auth;
			if (auth.includes(":")) [u.user, u.password] = auth.split(":", 2);
			else {
				u.user = auth;
				u.password = new Word();
			}
		} else warnf(global_, ["login-denied", `Found auth in URL but --disallow-username-in-url was passed: ${auth.toString()}`]);
	}
	return u;
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/Query.js
function _percentEncode(s) {
	return [...UTF8encoder.encode(s)].map((b) => {
		if (b >= 65 && b <= 90 || b >= 97 && b <= 122 || b >= 48 && b <= 57 || b === 45 || b === 46 || b === 95 || b === 126) return String.fromCharCode(b);
		return "%" + b.toString(16).toUpperCase().padStart(2, "0");
	}).join("");
}
function percentEncode(s) {
	const newTokens = [];
	for (const token of s.tokens) if (typeof token === "string") newTokens.push(_percentEncode(token));
	else newTokens.push(token);
	return new Word(newTokens);
}
function percentEncodePlus(s) {
	const newTokens = [];
	for (const token of s.tokens) if (typeof token === "string") newTokens.push(_percentEncode(token).replace(/%20/g, "+"));
	else newTokens.push(token);
	return new Word(newTokens);
}
function wordDecodeURIComponent(s) {
	const newTokens = [];
	for (const token of s.tokens) if (typeof token === "string") newTokens.push(decodeURIComponent(token));
	else newTokens.push(token);
	return new Word(newTokens);
}
function parseQueryString(s) {
	if (!s || s.isEmpty()) return [null, null];
	const asList = [];
	for (const param of s.split("&")) {
		if (!param.includes("=")) return [null, null];
		const [key, val] = param.split("=", 2);
		let decodedKey;
		let decodedVal;
		try {
			decodedKey = wordDecodeURIComponent(key.replace(/\+/g, " "));
			decodedVal = wordDecodeURIComponent(val.replace(/\+/g, " "));
		} catch (e) {
			if (e instanceof URIError) return [null, null];
			throw e;
		}
		const roundTripKey = percentEncode(decodedKey);
		const roundTripVal = percentEncode(decodedVal);
		if (!eq(roundTripKey, key) && !eq(roundTripKey.replace(/%20/g, "+"), key) || !eq(roundTripVal, val) && !eq(roundTripVal.replace(/%20/g, "+"), val)) return [null, null];
		asList.push([decodedKey, decodedVal]);
	}
	const keyWords = {};
	const uniqueKeys = {};
	let prevKey = null;
	for (const [key, val] of asList) {
		const keyStr = key.toString();
		if (prevKey === keyStr) uniqueKeys[keyStr].push(val);
		else if (!Object.prototype.hasOwnProperty.call(uniqueKeys, keyStr)) {
			uniqueKeys[keyStr] = [val];
			keyWords[keyStr] = key;
		} else return [asList, null];
		prevKey = keyStr;
	}
	const asDict = [];
	for (const [keyStr, val] of Object.entries(uniqueKeys)) asDict.push([keyWords[keyStr], val.length === 1 ? val[0] : val]);
	return [asList, asDict];
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/curl/form.js
function parseDetails(formParam, p, ptr, supported, warnings) {
	while (ptr < p.length && p.charAt(ptr) === ";") {
		ptr += 1;
		while (ptr < p.length && isSpace(p.charAt(ptr))) ptr += 1;
		if (ptr >= p.length) return formParam;
		const value = p.slice(ptr);
		if (value.startsWith("type=")) [formParam.contentType, ptr] = getParamWord(p, ptr + 5, warnings);
		else if (value.startsWith("filename=")) {
			const [filename, filenameEnd] = getParamWord(p, ptr + 9, warnings);
			ptr = filenameEnd;
			if (supported.filename) formParam.filename = filename;
			else warnings.push(["unsupported-form-detail", "Field file name not allowed here: " + filename.toString()]);
		} else if (value.startsWith("encoder=")) {
			const [encoder, encoderEnd] = getParamWord(p, ptr + 8, warnings);
			ptr = encoderEnd;
			if (supported.encoder) formParam.encoder = encoder;
			else warnings.push(["unsupported-form-detail", "Field encoder not allowed here: " + encoder.toString()]);
		} else if (value.startsWith("headers=")) {
			const [headers, headersEnd] = getParamWord(p, ptr + 8, warnings);
			ptr = headersEnd;
			if (supported.headers) {
				if (headers.startsWith("@")) {
					if (formParam.headerFiles === void 0) formParam.headerFiles = [];
					formParam.headerFiles.push(headers.slice(1));
				} else {
					if (formParam.headers === void 0) formParam.headers = [];
					formParam.headers.push(headers);
				}
			} else warnings.push(["unsupported-form-detail", "Field headers not allowed here: " + headers.toString()]);
		} else {
			ptr = getParamWord(p, ptr, warnings)[1];
			warnings.push(["unknown-form-detail", "skip unknown form field: " + value.toString()]);
		}
	}
	return formParam;
}
function isSpace(c) {
	return typeof c === "string" && (c === " " || c === "	" || c >= "\n" && c <= "\r");
}
function getParamWord(p, start, warnings) {
	let ptr = start;
	if (p.charAt(ptr) === "\"") {
		ptr += 1;
		const parts = [];
		while (ptr < p.length) {
			let curChar = p.charAt(ptr);
			if (curChar === "\\") {
				if (ptr + 1 < p.length) {
					const nextChar = p.charAt(ptr + 1);
					if (nextChar === "\"" || nextChar === "\\") {
						ptr += 1;
						curChar = p.charAt(ptr);
					}
				}
			} else if (curChar === "\"") {
				ptr += 1;
				let trailingData = false;
				while (ptr < p.length && p.charAt(ptr) !== ";") {
					if (!isSpace(p.charAt(ptr))) trailingData = true;
					ptr += 1;
				}
				if (trailingData) warnings.push(["trailing-form-data", "Trailing data after quoted form parameter"]);
				return [new Word(parts), ptr];
			}
			parts.push(curChar);
			ptr += 1;
		}
	}
	let sepIdx = p.indexOf(";", start);
	if (sepIdx === -1) sepIdx = p.length;
	return [p.slice(start, sepIdx), sepIdx];
}
function getParamPart(formParam, p, ptr, supported, warnings) {
	while (ptr < p.length && isSpace(p.charAt(ptr))) ptr += 1;
	const [content, contentEnd] = getParamWord(p, ptr, warnings);
	formParam.content = content;
	parseDetails(formParam, p, contentEnd, supported, warnings);
	return formParam;
}
function parseForm(form, warnings) {
	const multipartUploads = [];
	let depth = 0;
	for (const multipartArgument of form) {
		const isString = multipartArgument.type === "string";
		if (!multipartArgument.value.includes("=")) throw new CCError("invalid value for --form/-F, missing \"=\": " + JSON.stringify(multipartArgument.value.toString()));
		const [name, value] = multipartArgument.value.split("=", 2);
		const formParam = { name };
		if (!isString && value.charAt(0) === "(") {
			depth += 1;
			warnings.push(["nested-form", "Nested form data with \"=(\" is not supported, it will be flattened"]);
			getParamPart(formParam, value, 1, { headers: true }, warnings);
		} else if (!isString && name.length === 0 && eq(value, ")")) {
			depth -= 1;
			if (depth < 0) throw new CCError("no multipart to terminate: " + JSON.stringify(multipartArgument.value.toString()));
		} else if (!isString && value.charAt(0) === "@") {
			getParamPart(formParam, value, 1, {
				filename: true,
				encoder: true,
				headers: true
			}, warnings);
			formParam.contentFile = formParam.content;
			delete formParam.content;
			if (formParam.filename === null || formParam.filename === void 0) formParam.filename = formParam.contentFile;
			if (formParam.contentType === null || formParam.contentType === void 0) {}
		} else if (!isString && value.charAt(0) === "<") {
			getParamPart(formParam, value, 1, {
				encoder: true,
				headers: true
			}, warnings);
			formParam.contentFile = formParam.content;
			delete formParam.content;
			if (formParam.contentType === null || formParam.contentType === void 0) {}
		} else if (isString) formParam.content = value;
		else getParamPart(formParam, value, 0, {
			filename: true,
			encoder: true,
			headers: true
		}, warnings);
		multipartUploads.push(formParam);
	}
	return multipartUploads;
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/Request.js
function buildURL(global_, config, url, uploadFile, outputFile, stdin, stdinFile) {
	const originalUrl = url;
	const u = parseurl(global_, config, url);
	if (uploadFile) {
		if (u.path.isEmpty()) u.path = uploadFile.prepend("/");
		else if (u.path.endsWith("/")) u.path = u.path.add(uploadFile);
		if (config.get) warnf(global_, ["data-ignored", "curl doesn't let you pass --get and --upload-file together"]);
	}
	const urlWithOriginalQuery = mergeWords(u.scheme, "://", u.host, u.path, u.query, u.fragment);
	let urlQueryArray = null;
	let queryArray = null;
	let queryStrReadsFile = null;
	if (u.query.toBool() || config["url-query"] && config["url-query"].length) {
		let queryStr = null;
		let queryParts = [];
		if (u.query.toBool()) {
			queryParts.push(["raw", u.query.slice(1)]);
			[queryArray, queryStr, queryStrReadsFile] = buildData(queryParts, stdin, stdinFile);
			urlQueryArray = queryArray;
		}
		if (config["url-query"]) {
			queryParts = queryParts.concat(config["url-query"]);
			[queryArray, queryStr, queryStrReadsFile] = buildData(queryParts, stdin, stdinFile);
		}
		u.query = new Word();
		if (queryStr && queryStr.toBool()) u.query = queryStr.prepend("?");
	}
	const urlWithoutQueryArray = mergeWords(u.scheme, "://", u.host, u.path, u.fragment);
	url = mergeWords(u.scheme, "://", u.host, u.path, u.query, u.fragment);
	let urlWithoutQueryList = url;
	let [queryList, queryDict] = parseQueryString(u.query.toBool() ? u.query.slice(1) : new Word());
	if (queryList && queryList.length) urlWithoutQueryList = mergeWords(u.scheme, "://", u.host, u.path, u.fragment);
	else {
		queryList = null;
		queryDict = null;
	}
	let method = new Word("GET");
	if (config.request && !eq(config.request, "null")) method = config.request;
	else if (config.head) method = new Word("HEAD");
	else if (uploadFile && uploadFile.toBool()) method = new Word("PUT");
	else if (!config.get && (has(config, "data") || has(config, "form"))) method = new Word("POST");
	const requestUrl = {
		originalUrl,
		urlWithoutQueryList,
		url,
		urlObj: u,
		urlWithOriginalQuery,
		urlWithoutQueryArray,
		method
	};
	if (queryStrReadsFile) requestUrl.queryReadsFile = queryStrReadsFile;
	if (queryList) {
		requestUrl.queryList = queryList;
		if (queryDict) requestUrl.queryDict = queryDict;
	}
	if (queryArray) requestUrl.queryArray = queryArray;
	if (urlQueryArray) requestUrl.urlQueryArray = urlQueryArray;
	if (uploadFile) {
		if (eq(uploadFile, "-") || eq(uploadFile, ".")) {
			if (stdinFile) requestUrl.uploadFile = stdinFile;
			else if (stdin) {
				warnf(global_, ["upload-file-with-stdin-content", "--upload-file with stdin content is not supported"]);
				requestUrl.uploadFile = uploadFile;
			} else requestUrl.uploadFile = uploadFile;
		} else requestUrl.uploadFile = uploadFile;
	}
	if (outputFile) requestUrl.output = outputFile;
	const auth = config.user || u.auth;
	if (auth) {
		const [user, pass] = auth.split(":", 2);
		requestUrl.auth = [user, pass || new Word()];
	}
	return requestUrl;
}
function buildData(configData, stdin, stdinFile) {
	const data = [];
	let dataStrState = new Word();
	for (const [i, x] of configData.entries()) {
		const type = x[0];
		let value = x[1];
		let name = null;
		if (i > 0 && type !== "json") dataStrState = dataStrState.append("&");
		if (type === "urlencode") {
			const splitOn = value.includes("=") || !value.includes("@") ? "=" : "@";
			if (value.includes("@") || value.includes("=")) [name, value] = value.split(splitOn, 2);
			if (splitOn === "=") {
				if (name && name.toBool()) dataStrState = dataStrState.add(name).append("=");
				dataStrState = dataStrState.add(percentEncodePlus(value));
				continue;
			}
			name = name && name.toBool() ? name : null;
			value = value.prepend("@");
		}
		let filename = null;
		if (type !== "raw" && value.startsWith("@")) {
			filename = value.slice(1);
			if (eq(filename, "-")) {
				if (stdin !== void 0) {
					switch (type) {
						case "binary":
						case "json":
							value = stdin;
							break;
						case "urlencode":
							value = mergeWords(name && name.length ? name.append("=") : new Word(), percentEncodePlus(stdin));
							break;
						default: value = stdin.replace(/[\n\r]/g, "");
					}
					filename = null;
				} else if (stdinFile !== void 0) filename = stdinFile;
			}
		}
		if (filename !== null) {
			if (dataStrState.toBool()) {
				data.push(dataStrState);
				dataStrState = new Word();
			}
			const dataParam = {
				filetype: type,
				filename
			};
			if (name) dataParam.name = name;
			data.push(dataParam);
		} else dataStrState = dataStrState.add(value);
	}
	if (dataStrState.toBool()) data.push(dataStrState);
	let dataStrReadsFile = null;
	return [
		data,
		mergeWords(...data.map((d) => {
			if (!(d instanceof Word)) {
				dataStrReadsFile || (dataStrReadsFile = d.filename.toString());
				if (d.name) return mergeWords(d.name, "=@", d.filename);
				return d.filename.prepend("@");
			}
			return d;
		})),
		dataStrReadsFile
	];
}
function parseContentType(string) {
	if (!string.includes(";")) return [string, []];
	const semi = string.indexOf(";");
	const type = string.slice(0, semi);
	const rest = string.slice(semi);
	const params = rest.match(/;\s*([^;=]+)=(?:("[^"]*")|([^()<>@,;:\\"/[\]?.=]*))/g);
	if (rest.trim() && !params) return null;
	const parsedParams = [];
	for (const param of params || []) {
		const parsedParam = param.match(/;\s*([^;=]+)=(?:("[^"]*")|([^()<>@,;:\\"/[\]?.=]*))/);
		if (!parsedParam) return null;
		const name = parsedParam[1];
		const value = parsedParam[3] || parsedParam[2].slice(1, -1);
		parsedParams.push([name, value]);
	}
	return [type, parsedParams];
}
function parseBoundary(string) {
	const header = parseContentType(string);
	if (!header) return null;
	for (const [name, value] of header[1]) if (name === "boundary") return value;
	return null;
}
function parseRawForm(data, boundary) {
	const endBoundary = "\r\n--" + boundary + "--\r\n";
	if (!data.endsWith(endBoundary)) return null;
	data = data.slice(0, -endBoundary.length);
	boundary = "--" + boundary + "\r\n";
	if (data && !data.startsWith(boundary)) return null;
	data = data.slice(boundary.length);
	const parts = data.split("\r\n" + boundary);
	const form = [];
	let roundtrips = true;
	for (const part of parts) {
		const lines = part.split("\r\n");
		if (lines.length < 2) return null;
		const formParam = {
			name: new Word(),
			content: new Word()
		};
		let seenContentDisposition = false;
		const headers = [];
		let i = 0;
		for (; i < lines.length; i++) {
			if (lines[i].length === 0) break;
			const [name, value] = lines[i].split(": ", 2);
			if (name === void 0 || value === void 0) return null;
			if (name.toLowerCase() === "content-disposition") {
				if (seenContentDisposition) return null;
				const contentDisposition = parseContentType(value);
				if (!contentDisposition) return null;
				const [type, params] = contentDisposition;
				if (type !== "form-data") return null;
				let extra = 0;
				for (const [paramName, paramValue] of params) switch (paramName) {
					case "name":
						formParam.name = new Word(paramValue);
						break;
					case "filename":
						formParam.filename = new Word(paramValue);
						break;
					default: extra++;
				}
				if (extra) roundtrips = false;
				seenContentDisposition = true;
			} else if (name.toLowerCase() === "content-type") formParam.contentType = new Word(value);
			else headers.push(new Word(lines[i]));
		}
		if (headers.length) formParam.headers = headers;
		if (!seenContentDisposition) return null;
		if (i === lines.length) return null;
		if (formParam.name.isEmpty()) return null;
		formParam.content = new Word(lines.slice(i + 1).join("\n"));
		form.push(formParam);
	}
	return [form, roundtrips];
}
function buildRequest(global_, config, stdin, stdinFile) {
	var _a, _b;
	if (!config.url || !config.url.length) throw new CCError("no URL specified!");
	const headers = new Headers(config.header, global_.warnings);
	const proxyHeaders = new Headers(config["proxy-header"], global_.warnings, "--proxy-header");
	let cookies;
	const cookieFiles = [];
	const cookieHeader = headers.get("cookie");
	if (cookieHeader) {
		const parsedCookies = parseCookiesStrict(cookieHeader);
		if (parsedCookies) cookies = parsedCookies;
	} else if (cookieHeader === void 0 && config.cookie) {
		const cookieStrings = [];
		for (const c of config.cookie) if (c.includes("=")) cookieStrings.push(c);
		else cookieFiles.push(c);
		if (cookieStrings.length) {
			const cookieString = joinWords(config.cookie, "; ");
			headers.setIfMissing("Cookie", cookieString);
			const parsedCookies = parseCookies(cookieString);
			if (parsedCookies) cookies = parsedCookies;
		}
	}
	let refererAuto = false;
	if (config["user-agent"]) headers.setIfMissing("User-Agent", config["user-agent"]);
	if (config.referer) {
		if (config.referer.includes(";auto")) refererAuto = true;
		const referer = config.referer.replace(/;auto$/, "");
		if (referer.length) headers.setIfMissing("Referer", referer);
	}
	if (config.range) {
		let range = config.range.prepend("bytes=");
		if (!range.includes("-")) range = range.append("-");
		headers.setIfMissing("Range", range);
	}
	if (config["time-cond"]) {
		let timecond = config["time-cond"];
		let header = "If-Modified-Since";
		switch (timecond.charAt(0)) {
			case "+":
				timecond = timecond.slice(1);
				break;
			case "-":
				timecond = timecond.slice(1);
				header = "If-Unmodified-Since";
				break;
			case "=":
				timecond = timecond.slice(1);
				header = "Last-Modified";
		}
		headers.setIfMissing(header, timecond);
	}
	let data;
	let dataStr;
	let dataStrReadsFile;
	let queryArray;
	if (config.data && config.data.length) {
		if (config.get) {
			config["url-query"] = config.data;
			delete config.data;
		} else [data, dataStr, dataStrReadsFile] = buildData(config.data, stdin, stdinFile);
	}
	if (config["url-query"]) [queryArray] = buildData(config["url-query"], stdin, stdinFile);
	const urls = [];
	const uploadFiles = config["upload-file"] || [];
	const outputFiles = config.output || [];
	for (const [i, url] of config.url.entries()) urls.push(buildURL(global_, config, url, uploadFiles[i], outputFiles[i], stdin, stdinFile));
	if (config.get && config.data) delete config.data;
	if ((config["upload-file"] || []).length > config.url.length) warnf(global_, ["too-many-upload-files", "Got more --upload-file/-T options than URLs: " + ((_a = config["upload-file"]) === null || _a === void 0 ? void 0 : _a.map((f) => JSON.stringify(f.toString())).join(", "))]);
	if ((config.output || []).length > config.url.length) warnf(global_, ["too-many-output-files", "Got more --output/-o options than URLs: " + ((_b = config.output) === null || _b === void 0 ? void 0 : _b.map((f) => JSON.stringify(f.toString())).join(", "))]);
	const request = {
		urls,
		authType: pickAuth(config.authtype),
		proxyAuthType: pickAuth(config.proxyauthtype),
		headers,
		proxyHeaders
	};
	if (stdin) request.stdin = stdin;
	if (stdinFile) request.stdinFile = stdinFile;
	if (Object.prototype.hasOwnProperty.call(config, "globoff")) request.globoff = config.globoff;
	if (Object.prototype.hasOwnProperty.call(config, "disallow-username-in-url")) request.disallowUsernameInUrl = config["disallow-username-in-url"];
	if (Object.prototype.hasOwnProperty.call(config, "path-as-is")) request.pathAsIs = config["path-as-is"];
	if (refererAuto) request.refererAuto = true;
	if (cookies) request.cookies = cookies;
	if (cookieFiles.length) request.cookieFiles = cookieFiles;
	if (config["cookie-jar"]) request.cookieJar = config["cookie-jar"];
	if (Object.prototype.hasOwnProperty.call(config, "junk-session-cookies")) request.junkSessionCookies = config["junk-session-cookies"];
	if (Object.prototype.hasOwnProperty.call(config, "compressed")) request.compressed = config.compressed;
	if (Object.prototype.hasOwnProperty.call(config, "tr-encoding")) request.transferEncoding = config["tr-encoding"];
	if (config.include) request.include = true;
	if (config.json) {
		headers.setIfMissing("Content-Type", "application/json");
		headers.setIfMissing("Accept", "application/json");
	} else if (config.data) headers.setIfMissing("Content-Type", "application/x-www-form-urlencoded");
	else if (config.form) request.multipartUploads = parseForm(config.form, global_.warnings);
	const contentType = headers.getContentType();
	const exactContentType = headers.get("Content-Type");
	if (config.data && !dataStrReadsFile && dataStr && dataStr.isString() && !config.form && !request.multipartUploads && contentType === "multipart/form-data" && exactContentType && exactContentType.isString()) {
		const boundary = parseBoundary(exactContentType.toString());
		if (boundary) {
			const form = parseRawForm(dataStr.toString(), boundary);
			if (form) {
				const [parsedForm, roundtrip] = form;
				request.multipartUploads = parsedForm;
				if (!roundtrip) request.multipartUploadsDoesntRoundtrip = true;
			}
		}
	}
	if (Object.prototype.hasOwnProperty.call(config, "form-escape")) request.formEscape = config["form-escape"];
	if (config["aws-sigv4"]) {
		request.authType = "aws-sigv4";
		request.awsSigV4 = config["aws-sigv4"];
	}
	if (request.authType === "bearer" && config["oauth2-bearer"]) {
		const bearer = config["oauth2-bearer"].prepend("Bearer ");
		headers.setIfMissing("Authorization", bearer);
		request.oauth2Bearer = config["oauth2-bearer"];
	}
	if (config.delegation) request.delegation = config.delegation;
	if (config.krb) request.krb = config.krb;
	if (config["sasl-authzid"]) request.saslAuthzid = config["sasl-authzid"];
	if (Object.prototype.hasOwnProperty.call(config, "sasl-ir")) request.saslIr = config["sasl-ir"];
	if (config.negotiate) request.authType = "negotiate";
	if (config["service-name"]) request.serviceName = config["service-name"];
	headers.clearNulls();
	if (config.data && config.data.length) {
		request.data = dataStr;
		if (dataStrReadsFile) request.dataReadsFile = dataStrReadsFile;
		request.dataArray = data;
		request.isDataRaw = false;
		request.isDataBinary = (data || []).some((d) => !(d instanceof Word) && d.filetype === "binary");
	}
	if (queryArray) request.queryArray = queryArray;
	if (Object.prototype.hasOwnProperty.call(config, "ipv4")) request["ipv4"] = config["ipv4"];
	if (Object.prototype.hasOwnProperty.call(config, "ipv6")) request["ipv6"] = config["ipv6"];
	if (config.proto) request.proto = config.proto;
	if (config["proto-redir"]) request.protoRedir = config["proto-redir"];
	if (config["proto-default"]) request.protoDefault = config["proto-default"];
	if (config["tcp-fastopen"]) request.tcpFastopen = config["tcp-fastopen"];
	if (config["local-port"]) {
		const [start, end] = config["local-port"].split("-", 1);
		if (end && end.toBool()) request.localPort = [start, end];
		else request.localPort = [config["local-port"], null];
	}
	if (Object.prototype.hasOwnProperty.call(config, "ignore-content-length")) request.ignoreContentLength = config["ignore-content-length"];
	if (config.interface) request.interface = config.interface;
	if (config.ciphers) request.ciphers = config.ciphers;
	if (config.curves) request.curves = config.curves;
	if (config.insecure) request.insecure = true;
	if (Object.prototype.hasOwnProperty.call(config, "cert-status")) request.certStatus = config["cert-status"];
	if (config.cert) {
		if (config.cert.startsWith("pkcs11:") || !config.cert.match(/[:\\]/)) request.cert = [config.cert, null];
		else {
			let colon = -1;
			try {
				colon = config.cert.search(/(?<!\\)(?:\\\\)*:/);
			} catch (_c) {
				colon = config.cert.search(/:/);
			}
			if (colon === -1) request.cert = [config.cert, null];
			else {
				const cert = config.cert.slice(0, colon);
				const password = config.cert.slice(colon + 1);
				if (password.toBool()) request.cert = [cert, password];
				else request.cert = [cert, null];
			}
		}
	}
	if (config["cert-type"]) {
		const certType = config["cert-type"];
		request.certType = certType;
		if (certType.isString() && ![
			"PEM",
			"DER",
			"ENG",
			"P12"
		].includes(certType.toString().toUpperCase())) warnf(global_, ["cert-type-unknown", "not supported file type " + JSON.stringify(certType.toString()) + " for certificate"]);
	}
	if (config.key) request.key = config.key;
	if (config["key-type"]) request.keyType = config["key-type"];
	if (config.pass) request.pass = config.pass;
	if (config.cacert) request.cacert = config.cacert;
	if (Object.prototype.hasOwnProperty.call(config, "ca-native")) request.caNative = config["ca-native"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl-allow-beast")) request.sslAllowBeast = config["ssl-allow-beast"];
	if (config.capath) request.capath = config.capath;
	if (config.crlfile) request.crlfile = config.crlfile;
	if (config.pinnedpubkey) request.pinnedpubkey = config.pinnedpubkey;
	if (config["random-file"]) request.randomFile = config["random-file"];
	if (config["egd-file"]) request.egdFile = config["egd-file"];
	if (config.hsts) request.hsts = config.hsts;
	if (Object.prototype.hasOwnProperty.call(config, "alpn")) request.alpn = config.alpn;
	if (config.tlsVersion) request.tlsVersion = config.tlsVersion;
	if (config["tls-max"]) request.tlsMax = config["tls-max"];
	if (config["tls13-ciphers"]) request.tls13Ciphers = config["tls13-ciphers"];
	if (config["tlsauthtype"]) request.tlsauthtype = config["tlsauthtype"];
	if (config["tlspassword"]) request.tlspassword = config["tlspassword"];
	if (config["tlsuser"]) request.tlsuser = config["tlsuser"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl-allow-beast")) request.sslAllowBeast = config["ssl-allow-beast"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl-auto-client-cert")) request.sslAutoClientCert = config["ssl-auto-client-cert"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl-no-revoke")) request.sslNoRevoke = config["ssl-no-revoke"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl-reqd")) request.sslReqd = config["ssl-reqd"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl-revoke-best-effort")) request.sslRevokeBestEffort = config["ssl-revoke-best-effort"];
	if (Object.prototype.hasOwnProperty.call(config, "ssl")) request.ssl = config["ssl"];
	if (Object.prototype.hasOwnProperty.call(config, "sslv2")) request.sslv2 = config["sslv2"];
	if (Object.prototype.hasOwnProperty.call(config, "sslv3")) request.sslv3 = config["sslv3"];
	if (config["doh-url"]) request.dohUrl = config["doh-url"];
	if (Object.prototype.hasOwnProperty.call(config, "doh-insecure")) request.dohInsecure = config["doh-insecure"];
	if (Object.prototype.hasOwnProperty.call(config, "doh-cert-status")) request.dohCertStatus = config["doh-cert-status"];
	if (config.proxy) {
		request.proxy = config.proxy;
		if (request.proxyType && request.proxyType !== "http2") delete request.proxyType;
		if (config["proxy-user"]) request.proxyAuth = config["proxy-user"];
	}
	if (Object.prototype.hasOwnProperty.call(config, "proxytunnel")) request.proxytunnel = config.proxytunnel;
	if (config.noproxy) request.noproxy = config.noproxy;
	if (config.preproxy) request.preproxy = config.preproxy;
	if (Object.prototype.hasOwnProperty.call(config, "proxy-anyauth")) request.proxyAnyauth = config["proxy-anyauth"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-basic")) request.proxyBasic = config["proxy-basic"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-digest")) request.proxyDigest = config["proxy-digest"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-negotiate")) request.proxyNegotiate = config["proxy-negotiate"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-ntlm")) request.proxyNtlm = config["proxy-ntlm"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-ca-native")) request.proxyCaNative = config["proxy-ca-native"];
	if (config["proxy-cacert"]) request.proxyCacert = config["proxy-cacert"];
	if (config["proxy-capath"]) request.proxyCapath = config["proxy-capath"];
	if (config["proxy-cert-type"]) request.proxyCertType = config["proxy-cert-type"];
	if (config["proxy-cert"]) request.proxyCert = config["proxy-cert"];
	if (config["proxy-ciphers"]) request.proxyCiphers = config["proxy-ciphers"];
	if (config["proxy-crlfile"]) request.proxyCrlfile = config["proxy-crlfile"];
	if (config["proxy-http2"]) request.proxyType = "http2";
	if (config["proxy1.0"]) {
		request.proxy = config["proxy1.0"];
		request.proxyType = "http1";
	}
	if (Object.prototype.hasOwnProperty.call(config, "proxy-insecure")) request.proxyInsecure = config["proxy-insecure"];
	if (config["proxy-key"]) request.proxyKey = config["proxy-key"];
	if (config["proxy-key-type"]) request.proxyKeyType = config["proxy-key-type"];
	if (config["proxy-pass"]) request.proxyPass = config["proxy-pass"];
	if (config["proxy-pinnedpubkey"]) request.proxyPinnedpubkey = config["proxy-pinnedpubkey"];
	if (config["proxy-pinnedpubkey"]) request.proxyPinnedpubkey = config["proxy-pinnedpubkey"];
	if (config["proxy-service-name"]) request.proxyServiceName = config["proxy-service-name"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-ssl-allow-beast")) request.proxySslAllowBeast = config["proxy-ssl-allow-beast"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-ssl-auto-client-cert")) request.proxySslAutoClientCert = config["proxy-ssl-auto-client-cert"];
	if (config["proxy-tls13-ciphers"]) request.proxyTls13Ciphers = config["proxy-tls13-ciphers"];
	if (config["proxy-tlsauthtype"]) {
		request.proxyTlsauthtype = config["proxy-tlsauthtype"];
		if (request.proxyTlsauthtype.isString() && !eq(request.proxyTlsauthtype, "SRP")) warnf(global_, ["proxy-tlsauthtype", "proxy-tlsauthtype is not supported: " + request.proxyTlsauthtype]);
	}
	if (config["proxy-tlspassword"]) request.proxyTlspassword = config["proxy-tlspassword"];
	if (config["proxy-tlsuser"]) request.proxyTlsuser = config["proxy-tlsuser"];
	if (Object.prototype.hasOwnProperty.call(config, "proxy-tlsv1")) request.proxyTlsv1 = config["proxy-tlsv1"];
	if (config["proxy-user"]) request.proxyUser = config["proxy-user"];
	if (Object.prototype.hasOwnProperty.call(config, "proxytunnel")) request.proxytunnel = config["proxytunnel"];
	if (config["socks4"]) {
		request.proxy = config["socks4"];
		request.proxyType = "socks4";
	}
	if (config["socks4a"]) {
		request.proxy = config["socks4a"];
		request.proxyType = "socks4a";
	}
	if (config["socks5"]) {
		request.proxy = config["socks5"];
		request.proxyType = "socks5";
	}
	if (config["socks5-hostname"]) {
		request.proxy = config["socks5-hostname"];
		request.proxyType = "socks5-hostname";
	}
	if (Object.prototype.hasOwnProperty.call(config, "socks5-basic")) request.socks5Basic = config["socks5-basic"];
	if (Object.prototype.hasOwnProperty.call(config, "socks5-gssapi-nec")) request.socks5GssapiNec = config["socks5-gssapi-nec"];
	if (config["socks5-gssapi-service"]) request.socks5GssapiService = config["socks5-gssapi-service"];
	if (Object.prototype.hasOwnProperty.call(config, "socks5-gssapi")) request.socks5Gssapi = config["socks5-gssapi"];
	if (config["haproxy-clientip"]) request.haproxyClientIp = config["haproxy-clientip"];
	if (Object.prototype.hasOwnProperty.call(config, "haproxy-protocol")) request.haproxyProtocol = config["haproxy-protocol"];
	if (config["max-time"]) {
		request.timeout = config["max-time"];
		if (config["max-time"].isString() && isNaN(parseFloat(config["max-time"].toString()))) warnf(global_, ["max-time-not-number", "option --max-time: expected a proper numerical parameter: " + JSON.stringify(config["max-time"].toString())]);
	}
	if (config["connect-timeout"]) {
		request.connectTimeout = config["connect-timeout"];
		if (config["connect-timeout"].isString() && isNaN(parseFloat(config["connect-timeout"].toString()))) warnf(global_, ["connect-timeout-not-number", "option --connect-timeout: expected a proper numerical parameter: " + JSON.stringify(config["connect-timeout"].toString())]);
	}
	if (config["expect100-timeout"]) {
		request.expect100Timeout = config["expect100-timeout"];
		if (config["expect100-timeout"].isString() && isNaN(parseFloat(config["expect100-timeout"].toString()))) warnf(global_, ["expect100-timeout-not-number", "option --expect100-timeout: expected a proper numerical parameter: " + JSON.stringify(config["expect100-timeout"].toString())]);
	}
	if (config["happy-eyeballs-timeout-ms"]) request.happyEyeballsTimeoutMs = config["happy-eyeballs-timeout-ms"];
	if (config["speed-limit"]) request.speedLimit = config["speed-limit"];
	if (config["speed-time"]) request.speedTime = config["speed-time"];
	if (config["limit-rate"]) request.limitRate = config["limit-rate"];
	if (config["max-filesize"]) request.maxFilesize = config["max-filesize"];
	if (Object.prototype.hasOwnProperty.call(config, "keepalive")) request.keepAlive = config.keepalive;
	if (config["keepalive-time"]) request.keepAliveTime = config["keepalive-time"];
	if (config["alt-svc"]) request.altSvc = config["alt-svc"];
	if (Object.prototype.hasOwnProperty.call(config, "location")) request.followRedirects = config.location;
	if (config["location-trusted"]) request.followRedirectsTrusted = config["location-trusted"];
	if (config["max-redirs"]) {
		request.maxRedirects = config["max-redirs"].trim();
		if (config["max-redirs"].isString() && !isInt(config["max-redirs"].toString())) warnf(global_, ["max-redirs-not-int", "option --max-redirs: expected a proper numerical parameter: " + JSON.stringify(config["max-redirs"].toString())]);
	}
	if (Object.prototype.hasOwnProperty.call(config, "post301")) request.post301 = config.post301;
	if (Object.prototype.hasOwnProperty.call(config, "post302")) request.post302 = config.post302;
	if (Object.prototype.hasOwnProperty.call(config, "post303")) request.post303 = config.post303;
	if (config.fail) request.fail = config.fail;
	if (config.retry) request.retry = config.retry;
	if (config["retry-max-time"]) request.retryMaxTime = config["retry-max-time"];
	if (Object.prototype.hasOwnProperty.call(config, "ftp-skip-pasv-ip")) request.ftpSkipPasvIp = config["ftp-skip-pasv-ip"];
	if (config.httpVersion) {
		if (config.httpVersion === "2" || config.httpVersion === "2-prior-knowledge") request.http2 = true;
		if (config.httpVersion === "3" || config.httpVersion === "3-only") request.http3 = true;
		request.httpVersion = config.httpVersion;
	}
	if (Object.prototype.hasOwnProperty.call(config, "http0.9")) request.http0_9 = config["http0.9"];
	if (config.resolve && config.resolve.length) request.resolve = config.resolve;
	if (config["connect-to"] && config["connect-to"].length) request.connectTo = config["connect-to"];
	if (config["unix-socket"]) request.unixSocket = config["unix-socket"];
	if (config["abstract-unix-socket"]) request.abstractUnixSocket = config["abstract-unix-socket"];
	if (config["netrc-optional"]) request.netrc = "optional";
	else if (config.netrc || config["netrc-file"]) request.netrc = "required";
	else if (config.netrc === false) request.netrc = "ignored";
	if (config["netrc-file"]) request.netrcFile = config["netrc-file"];
	if (config["use-ascii"]) request.useAscii = config["use-ascii"];
	if (config["continue-at"]) request.continueAt = config["continue-at"];
	if (Object.prototype.hasOwnProperty.call(config, "crlf")) request.crlf = config.crlf;
	if (Object.prototype.hasOwnProperty.call(config, "clobber")) request.clobber = config.clobber;
	if (Object.prototype.hasOwnProperty.call(config, "remote-time")) request.remoteTime = config["remote-time"];
	if (Object.prototype.hasOwnProperty.call(global_, "verbose")) request.verbose = global_.verbose;
	if (Object.prototype.hasOwnProperty.call(global_, "silent")) request.silent = global_.silent;
	return request;
}
function buildRequests(global_, stdin, stdinFile) {
	if (!global_.configs.length) warnf(global_, ["no-configs", "got empty config object"]);
	return global_.configs.map((config) => buildRequest(global_, config, stdin, stdinFile));
}
function getFirst(requests, warnings, support) {
	if (requests.length > 1) warnings.push(["next", "got " + requests.length + " curl requests, only converting the first one"]);
	const request = requests[0];
	warnIfPartsIgnored(request, warnings, support);
	return request;
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/parse.js
function clip(s, maxLength = 30) {
	if (s.length > maxLength) return s.slice(0, maxLength - 3) + "...";
	return s;
}
function findCommands(curlCommand, warnings) {
	if (typeof curlCommand === "string") return tokenize(curlCommand, warnings);
	if (curlCommand.length === 0) throw new CCError("no arguments provided");
	if (curlCommand[0].trim() !== "curl") throw new CCError("command should begin with \"curl\" but instead begins with " + JSON.stringify(clip(curlCommand[0])));
	return [[
		curlCommand.map((arg) => new Word(arg)),
		void 0,
		void 0
	]];
}
/**
* Accepts a string of Bash code or a tokenized argv array.
* Returns an array of parsed curl objects.
* @param command a string of Bash code containing at least one curl command or an
* array of shell argument tokens (meant for passing process.argv).
*/
function parse(command, supportedArgs, warnings = []) {
	let requests = [];
	const curlCommands = findCommands(command, warnings);
	for (const [argv, stdin, stdinFile] of curlCommands) {
		const [globalConfig] = parseArgs(argv, curlLongOpts, curlLongOptsShortened, curlShortOpts, supportedArgs, warnings);
		requests = requests.concat(buildRequests(globalConfig, stdin, stdinFile));
	}
	return requests;
}
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Pattern.js
var require_Pattern = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = (function() {
		Pattern.prototype.regex = null;
		Pattern.prototype.rawRegex = null;
		Pattern.prototype.cleanedRegex = null;
		Pattern.prototype.mapping = null;
		function Pattern(rawRegex, modifiers) {
			var _char, capturingBracketNumber, cleanedRegex, i, len, mapping, name, part, subChar;
			if (modifiers == null) modifiers = "";
			cleanedRegex = "";
			len = rawRegex.length;
			mapping = null;
			capturingBracketNumber = 0;
			i = 0;
			while (i < len) {
				_char = rawRegex.charAt(i);
				if (_char === "\\") {
					cleanedRegex += rawRegex.slice(i, +(i + 1) + 1 || 9e9);
					i++;
				} else if (_char === "(") {
					if (i < len - 2) {
						part = rawRegex.slice(i, +(i + 2) + 1 || 9e9);
						if (part === "(?:") {
							i += 2;
							cleanedRegex += part;
						} else if (part === "(?<") {
							capturingBracketNumber++;
							i += 2;
							name = "";
							while (i + 1 < len) {
								subChar = rawRegex.charAt(i + 1);
								if (subChar === ">") {
									cleanedRegex += "(";
									i++;
									if (name.length > 0) {
										if (mapping == null) mapping = {};
										mapping[name] = capturingBracketNumber;
									}
									break;
								} else name += subChar;
								i++;
							}
						} else {
							cleanedRegex += _char;
							capturingBracketNumber++;
						}
					} else cleanedRegex += _char;
				} else cleanedRegex += _char;
				i++;
			}
			this.rawRegex = rawRegex;
			this.cleanedRegex = cleanedRegex;
			this.regex = new RegExp(this.cleanedRegex, "g" + modifiers.replace("g", ""));
			this.mapping = mapping;
		}
		Pattern.prototype.exec = function(str) {
			var index, matches, name, ref;
			this.regex.lastIndex = 0;
			matches = this.regex.exec(str);
			if (matches == null) return null;
			if (this.mapping != null) {
				ref = this.mapping;
				for (name in ref) {
					index = ref[name];
					matches[name] = matches[index];
				}
			}
			return matches;
		};
		Pattern.prototype.test = function(str) {
			this.regex.lastIndex = 0;
			return this.regex.test(str);
		};
		Pattern.prototype.replace = function(str, replacement) {
			this.regex.lastIndex = 0;
			return str.replace(this.regex, replacement);
		};
		Pattern.prototype.replaceAll = function(str, replacement, limit) {
			var count;
			if (limit == null) limit = 0;
			this.regex.lastIndex = 0;
			count = 0;
			while (this.regex.test(str) && (limit === 0 || count < limit)) {
				this.regex.lastIndex = 0;
				str = str.replace(this.regex, replacement);
				count++;
			}
			return [str, count];
		};
		return Pattern;
	})();
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Utils.js
var require_Utils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Pattern;
	var Utils;
	var hasProp = {}.hasOwnProperty;
	Pattern = require_Pattern();
	Utils = (function() {
		function Utils() {}
		Utils.REGEX_LEFT_TRIM_BY_CHAR = {};
		Utils.REGEX_RIGHT_TRIM_BY_CHAR = {};
		Utils.REGEX_SPACES = /\s+/g;
		Utils.REGEX_DIGITS = /^\d+$/;
		Utils.REGEX_OCTAL = /[^0-7]/gi;
		Utils.REGEX_HEXADECIMAL = /[^a-f0-9]/gi;
		Utils.PATTERN_DATE = new Pattern("^(?<year>[0-9][0-9][0-9][0-9])-(?<month>[0-9][0-9]?)-(?<day>[0-9][0-9]?)(?:(?:[Tt]|[ 	]+)(?<hour>[0-9][0-9]?):(?<minute>[0-9][0-9]):(?<second>[0-9][0-9])(?:.(?<fraction>[0-9]*))?(?:[ 	]*(?<tz>Z|(?<tz_sign>[-+])(?<tz_hour>[0-9][0-9]?)(?::(?<tz_minute>[0-9][0-9]))?))?)?$", "i");
		Utils.LOCAL_TIMEZONE_OFFSET = (/* @__PURE__ */ new Date()).getTimezoneOffset() * 60 * 1e3;
		Utils.trim = function(str, _char) {
			var regexLeft, regexRight;
			if (_char == null) _char = "\\s";
			regexLeft = this.REGEX_LEFT_TRIM_BY_CHAR[_char];
			if (regexLeft == null) this.REGEX_LEFT_TRIM_BY_CHAR[_char] = regexLeft = new RegExp("^" + _char + _char + "*");
			regexLeft.lastIndex = 0;
			regexRight = this.REGEX_RIGHT_TRIM_BY_CHAR[_char];
			if (regexRight == null) this.REGEX_RIGHT_TRIM_BY_CHAR[_char] = regexRight = new RegExp(_char + "" + _char + "*$");
			regexRight.lastIndex = 0;
			return str.replace(regexLeft, "").replace(regexRight, "");
		};
		Utils.ltrim = function(str, _char) {
			var regexLeft;
			if (_char == null) _char = "\\s";
			regexLeft = this.REGEX_LEFT_TRIM_BY_CHAR[_char];
			if (regexLeft == null) this.REGEX_LEFT_TRIM_BY_CHAR[_char] = regexLeft = new RegExp("^" + _char + _char + "*");
			regexLeft.lastIndex = 0;
			return str.replace(regexLeft, "");
		};
		Utils.rtrim = function(str, _char) {
			var regexRight;
			if (_char == null) _char = "\\s";
			regexRight = this.REGEX_RIGHT_TRIM_BY_CHAR[_char];
			if (regexRight == null) this.REGEX_RIGHT_TRIM_BY_CHAR[_char] = regexRight = new RegExp(_char + "" + _char + "*$");
			regexRight.lastIndex = 0;
			return str.replace(regexRight, "");
		};
		Utils.isEmpty = function(value) {
			return !value || value === "" || value === "0" || value instanceof Array && value.length === 0 || this.isEmptyObject(value);
		};
		Utils.isEmptyObject = function(value) {
			var k;
			return value instanceof Object && (function() {
				var results = [];
				for (k in value) {
					if (!hasProp.call(value, k)) continue;
					results.push(k);
				}
				return results;
			})().length === 0;
		};
		Utils.subStrCount = function(string, subString, start, length) {
			var c = 0, i, j, len, ref, sublen;
			string = "" + string;
			subString = "" + subString;
			if (start != null) string = string.slice(start);
			if (length != null) string = string.slice(0, length);
			len = string.length;
			sublen = subString.length;
			for (i = j = 0, ref = len; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) if (subString === string.slice(i, sublen)) {
				c++;
				i += sublen - 1;
			}
			return c;
		};
		Utils.isDigits = function(input) {
			this.REGEX_DIGITS.lastIndex = 0;
			return this.REGEX_DIGITS.test(input);
		};
		Utils.octDec = function(input) {
			this.REGEX_OCTAL.lastIndex = 0;
			return parseInt((input + "").replace(this.REGEX_OCTAL, ""), 8);
		};
		Utils.hexDec = function(input) {
			this.REGEX_HEXADECIMAL.lastIndex = 0;
			input = this.trim(input);
			if ((input + "").slice(0, 2) === "0x") input = (input + "").slice(2);
			return parseInt((input + "").replace(this.REGEX_HEXADECIMAL, ""), 16);
		};
		Utils.utf8chr = function(c) {
			var ch = String.fromCharCode;
			if (128 > (c %= 2097152)) return ch(c);
			if (2048 > c) return ch(192 | c >> 6) + ch(128 | c & 63);
			if (65536 > c) return ch(224 | c >> 12) + ch(128 | c >> 6 & 63) + ch(128 | c & 63);
			return ch(240 | c >> 18) + ch(128 | c >> 12 & 63) + ch(128 | c >> 6 & 63) + ch(128 | c & 63);
		};
		Utils.parseBoolean = function(input, strict) {
			var lowerInput;
			if (strict == null) strict = true;
			if (typeof input === "string") {
				lowerInput = input.toLowerCase();
				if (!strict) {
					if (lowerInput === "no") return false;
				}
				if (lowerInput === "0") return false;
				if (lowerInput === "false") return false;
				if (lowerInput === "") return false;
				return true;
			}
			return !!input;
		};
		Utils.isNumeric = function(input) {
			this.REGEX_SPACES.lastIndex = 0;
			return typeof input === "number" || typeof input === "string" && !isNaN(input) && input.replace(this.REGEX_SPACES, "") !== "";
		};
		Utils.stringToDate = function(str) {
			var date, day, fraction, hour, info, minute, month, second, tz_hour, tz_minute, tz_offset, year;
			if (!(str != null ? str.length : void 0)) return null;
			info = this.PATTERN_DATE.exec(str);
			if (!info) return null;
			year = parseInt(info.year, 10);
			month = parseInt(info.month, 10) - 1;
			day = parseInt(info.day, 10);
			if (info.hour == null) {
				date = new Date(Date.UTC(year, month, day));
				return date;
			}
			hour = parseInt(info.hour, 10);
			minute = parseInt(info.minute, 10);
			second = parseInt(info.second, 10);
			if (info.fraction != null) {
				fraction = info.fraction.slice(0, 3);
				while (fraction.length < 3) fraction += "0";
				fraction = parseInt(fraction, 10);
			} else fraction = 0;
			if (info.tz != null) {
				tz_hour = parseInt(info.tz_hour, 10);
				if (info.tz_minute != null) tz_minute = parseInt(info.tz_minute, 10);
				else tz_minute = 0;
				tz_offset = (tz_hour * 60 + tz_minute) * 6e4;
				if ("-" === info.tz_sign) tz_offset *= -1;
			}
			date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
			if (tz_offset) date.setTime(date.getTime() - tz_offset);
			return date;
		};
		Utils.strRepeat = function(str, number) {
			var i, res = "";
			i = 0;
			while (i < number) {
				res += str;
				i++;
			}
			return res;
		};
		Utils.getStringFromFile = function(path, callback) {
			var data, fs, j, len1, name, ref, req, xhr;
			if (callback == null) callback = null;
			xhr = null;
			if (typeof window !== "undefined" && window !== null) {
				if (window.XMLHttpRequest) xhr = new XMLHttpRequest();
				else if (window.ActiveXObject) {
					ref = [
						"Msxml2.XMLHTTP.6.0",
						"Msxml2.XMLHTTP.3.0",
						"Msxml2.XMLHTTP",
						"Microsoft.XMLHTTP"
					];
					for (j = 0, len1 = ref.length; j < len1; j++) {
						name = ref[j];
						try {
							xhr = new ActiveXObject(name);
						} catch (error) {}
					}
				}
			}
			if (xhr != null) {
				if (callback != null) {
					xhr.onreadystatechange = function() {
						if (xhr.readyState === 4) {
							if (xhr.status === 200 || xhr.status === 0) return callback(xhr.responseText);
							else return callback(null);
						}
					};
					xhr.open("GET", path, true);
					return xhr.send(null);
				} else {
					xhr.open("GET", path, false);
					xhr.send(null);
					if (xhr.status === 200 || xhr.status === 0) return xhr.responseText;
					return null;
				}
			} else {
				req = __require;
				fs = req("fs");
				if (callback != null) return fs.readFile(path, function(err, data) {
					if (err) return callback(null);
					else return callback(String(data));
				});
				else {
					data = fs.readFileSync(path);
					if (data != null) return String(data);
					return null;
				}
			}
		};
		return Utils;
	})();
	module.exports = Utils;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Unescaper.js
var require_Unescaper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Pattern;
	var Unescaper;
	var Utils = require_Utils();
	Pattern = require_Pattern();
	Unescaper = (function() {
		function Unescaper() {}
		Unescaper.PATTERN_ESCAPED_CHARACTER = new Pattern("\\\\([0abt	nvfre \"\\/\\\\N_LP]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})");
		Unescaper.unescapeSingleQuotedString = function(value) {
			return value.replace(/\'\'/g, "'");
		};
		Unescaper.unescapeDoubleQuotedString = function(value) {
			if (this._unescapeCallback == null) this._unescapeCallback = (function(_this) {
				return function(str) {
					return _this.unescapeCharacter(str);
				};
			})(this);
			return this.PATTERN_ESCAPED_CHARACTER.replace(value, this._unescapeCallback);
		};
		Unescaper.unescapeCharacter = function(value) {
			var ch = String.fromCharCode;
			switch (value.charAt(1)) {
				case "0": return ch(0);
				case "a": return ch(7);
				case "b": return ch(8);
				case "t": return "	";
				case "	": return "	";
				case "n": return "\n";
				case "v": return ch(11);
				case "f": return ch(12);
				case "r": return ch(13);
				case "e": return ch(27);
				case " ": return " ";
				case "\"": return "\"";
				case "/": return "/";
				case "\\": return "\\";
				case "N": return ch(133);
				case "_": return ch(160);
				case "L": return ch(8232);
				case "P": return ch(8233);
				case "x": return Utils.utf8chr(Utils.hexDec(value.substr(2, 2)));
				case "u": return Utils.utf8chr(Utils.hexDec(value.substr(2, 4)));
				case "U": return Utils.utf8chr(Utils.hexDec(value.substr(2, 8)));
				default: return "";
			}
		};
		return Unescaper;
	})();
	module.exports = Unescaper;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Escaper.js
var require_Escaper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Escaper;
	var Pattern = require_Pattern();
	Escaper = (function() {
		var ch;
		function Escaper() {}
		Escaper.LIST_ESCAPEES = [
			"\\",
			"\\\\",
			"\\\"",
			"\"",
			"\0",
			"",
			"",
			"",
			"",
			"",
			"",
			"\x07",
			"\b",
			"	",
			"\n",
			"\v",
			"\f",
			"\r",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"\x1B",
			"",
			"",
			"",
			"",
			(ch = String.fromCharCode)(133),
			ch(160),
			ch(8232),
			ch(8233)
		];
		Escaper.LIST_ESCAPED = [
			"\\\\",
			"\\\"",
			"\\\"",
			"\\\"",
			"\\0",
			"\\x01",
			"\\x02",
			"\\x03",
			"\\x04",
			"\\x05",
			"\\x06",
			"\\a",
			"\\b",
			"\\t",
			"\\n",
			"\\v",
			"\\f",
			"\\r",
			"\\x0e",
			"\\x0f",
			"\\x10",
			"\\x11",
			"\\x12",
			"\\x13",
			"\\x14",
			"\\x15",
			"\\x16",
			"\\x17",
			"\\x18",
			"\\x19",
			"\\x1a",
			"\\e",
			"\\x1c",
			"\\x1d",
			"\\x1e",
			"\\x1f",
			"\\N",
			"\\_",
			"\\L",
			"\\P"
		];
		Escaper.MAPPING_ESCAPEES_TO_ESCAPED = (function() {
			var i, j, mapping = {}, ref;
			for (i = j = 0, ref = Escaper.LIST_ESCAPEES.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) mapping[Escaper.LIST_ESCAPEES[i]] = Escaper.LIST_ESCAPED[i];
			return mapping;
		})();
		Escaper.PATTERN_CHARACTERS_TO_ESCAPE = new Pattern("[\\x00-\\x1f]|Â|Â\xA0|â¨|â©");
		Escaper.PATTERN_MAPPING_ESCAPEES = new Pattern(Escaper.LIST_ESCAPEES.join("|").split("\\").join("\\\\"));
		Escaper.PATTERN_SINGLE_QUOTING = new Pattern("[\\s'\":{}[\\],&*#?]|^[-?|<>=!%@`]");
		Escaper.requiresDoubleQuoting = function(value) {
			return this.PATTERN_CHARACTERS_TO_ESCAPE.test(value);
		};
		Escaper.escapeWithDoubleQuotes = function(value) {
			return "\"" + this.PATTERN_MAPPING_ESCAPEES.replace(value, (function(_this) {
				return function(str) {
					return _this.MAPPING_ESCAPEES_TO_ESCAPED[str];
				};
			})(this)) + "\"";
		};
		Escaper.requiresSingleQuoting = function(value) {
			return this.PATTERN_SINGLE_QUOTING.test(value);
		};
		Escaper.escapeWithSingleQuotes = function(value) {
			return "'" + value.replace(/'/g, "''") + "'";
		};
		return Escaper;
	})();
	module.exports = Escaper;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Exception/ParseException.js
var require_ParseException = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ParseException;
	var extend = function(child, parent) {
		for (var key in parent) if (hasProp.call(parent, key)) child[key] = parent[key];
		function ctor() {
			this.constructor = child;
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
		child.__super__ = parent.prototype;
		return child;
	};
	var hasProp = {}.hasOwnProperty;
	ParseException = (function(superClass) {
		extend(ParseException, superClass);
		function ParseException(message, parsedLine, snippet) {
			this.message = message;
			this.parsedLine = parsedLine;
			this.snippet = snippet;
		}
		ParseException.prototype.toString = function() {
			if (this.parsedLine != null && this.snippet != null) return "<ParseException> " + this.message + " (line " + this.parsedLine + ": '" + this.snippet + "')";
			else return "<ParseException> " + this.message;
		};
		return ParseException;
	})(Error);
	module.exports = ParseException;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Exception/ParseMore.js
var require_ParseMore = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ParseMore;
	var extend = function(child, parent) {
		for (var key in parent) if (hasProp.call(parent, key)) child[key] = parent[key];
		function ctor() {
			this.constructor = child;
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
		child.__super__ = parent.prototype;
		return child;
	};
	var hasProp = {}.hasOwnProperty;
	ParseMore = (function(superClass) {
		extend(ParseMore, superClass);
		function ParseMore(message, parsedLine, snippet) {
			this.message = message;
			this.parsedLine = parsedLine;
			this.snippet = snippet;
		}
		ParseMore.prototype.toString = function() {
			if (this.parsedLine != null && this.snippet != null) return "<ParseMore> " + this.message + " (line " + this.parsedLine + ": '" + this.snippet + "')";
			else return "<ParseMore> " + this.message;
		};
		return ParseMore;
	})(Error);
	module.exports = ParseMore;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Exception/DumpException.js
var require_DumpException = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var DumpException;
	var extend = function(child, parent) {
		for (var key in parent) if (hasProp.call(parent, key)) child[key] = parent[key];
		function ctor() {
			this.constructor = child;
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
		child.__super__ = parent.prototype;
		return child;
	};
	var hasProp = {}.hasOwnProperty;
	DumpException = (function(superClass) {
		extend(DumpException, superClass);
		function DumpException(message, parsedLine, snippet) {
			this.message = message;
			this.parsedLine = parsedLine;
			this.snippet = snippet;
		}
		DumpException.prototype.toString = function() {
			if (this.parsedLine != null && this.snippet != null) return "<DumpException> " + this.message + " (line " + this.parsedLine + ": '" + this.snippet + "')";
			else return "<DumpException> " + this.message;
		};
		return DumpException;
	})(Error);
	module.exports = DumpException;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Inline.js
var require_Inline = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Escaper;
	var Inline;
	var ParseException;
	var ParseMore;
	var Pattern;
	var Unescaper;
	var Utils;
	var indexOf = [].indexOf || function(item) {
		for (var i = 0, l = this.length; i < l; i++) if (i in this && this[i] === item) return i;
		return -1;
	};
	Pattern = require_Pattern();
	Unescaper = require_Unescaper();
	Escaper = require_Escaper();
	Utils = require_Utils();
	ParseException = require_ParseException();
	ParseMore = require_ParseMore();
	require_DumpException();
	Inline = (function() {
		function Inline() {}
		Inline.REGEX_QUOTED_STRING = "(?:\"(?:[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"|'(?:[^']*(?:''[^']*)*)')";
		Inline.PATTERN_TRAILING_COMMENTS = new Pattern("^\\s*#.*$");
		Inline.PATTERN_QUOTED_SCALAR = new Pattern("^" + Inline.REGEX_QUOTED_STRING);
		Inline.PATTERN_THOUSAND_NUMERIC_SCALAR = new Pattern("^(-|\\+)?[0-9,]+(\\.[0-9]+)?$");
		Inline.PATTERN_SCALAR_BY_DELIMITERS = {};
		Inline.settings = {};
		Inline.configure = function(exceptionOnInvalidType, objectDecoder) {
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = null;
			if (objectDecoder == null) objectDecoder = null;
			this.settings.exceptionOnInvalidType = exceptionOnInvalidType;
			this.settings.objectDecoder = objectDecoder;
		};
		Inline.parse = function(value, exceptionOnInvalidType, objectDecoder) {
			var context, result;
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectDecoder == null) objectDecoder = null;
			this.settings.exceptionOnInvalidType = exceptionOnInvalidType;
			this.settings.objectDecoder = objectDecoder;
			if (value == null) return "";
			value = Utils.trim(value);
			if (0 === value.length) return "";
			context = {
				exceptionOnInvalidType,
				objectDecoder,
				i: 0
			};
			switch (value.charAt(0)) {
				case "[":
					result = this.parseSequence(value, context);
					++context.i;
					break;
				case "{":
					result = this.parseMapping(value, context);
					++context.i;
					break;
				default: result = this.parseScalar(value, null, ["\"", "'"], context);
			}
			if (this.PATTERN_TRAILING_COMMENTS.replace(value.slice(context.i), "") !== "") throw new ParseException("Unexpected characters near \"" + value.slice(context.i) + "\".");
			return result;
		};
		Inline.dump = function(value, exceptionOnInvalidType, objectEncoder) {
			var ref, result, type;
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectEncoder == null) objectEncoder = null;
			if (value == null) return "null";
			type = typeof value;
			if (type === "object") {
				if (value instanceof Date) return value.toISOString();
				else if (objectEncoder != null) {
					result = objectEncoder(value);
					if (typeof result === "string" || result != null) return result;
				}
				return this.dumpObject(value);
			}
			if (type === "boolean") return value ? "true" : "false";
			if (Utils.isDigits(value)) return type === "string" ? "'" + value + "'" : String(parseInt(value));
			if (Utils.isNumeric(value)) return type === "string" ? "'" + value + "'" : String(parseFloat(value));
			if (type === "number") return value === Infinity ? ".Inf" : value === -Infinity ? "-.Inf" : isNaN(value) ? ".NaN" : value;
			if (Escaper.requiresDoubleQuoting(value)) return Escaper.escapeWithDoubleQuotes(value);
			if (Escaper.requiresSingleQuoting(value)) return Escaper.escapeWithSingleQuotes(value);
			if ("" === value) return "\"\"";
			if (Utils.PATTERN_DATE.test(value)) return "'" + value + "'";
			if ((ref = value.toLowerCase()) === "null" || ref === "~" || ref === "true" || ref === "false") return "'" + value + "'";
			return value;
		};
		Inline.dumpObject = function(value, exceptionOnInvalidType, objectSupport) {
			var j, key, len1, output, val;
			if (objectSupport == null) objectSupport = null;
			if (value instanceof Array) {
				output = [];
				for (j = 0, len1 = value.length; j < len1; j++) {
					val = value[j];
					output.push(this.dump(val));
				}
				return "[" + output.join(", ") + "]";
			} else {
				output = [];
				for (key in value) {
					val = value[key];
					output.push(this.dump(key) + ": " + this.dump(val));
				}
				return "{" + output.join(", ") + "}";
			}
		};
		Inline.parseScalar = function(scalar, delimiters, stringDelimiters, context, evaluate) {
			var i, joinedDelimiters, match, output, pattern, ref, ref1, strpos, tmp;
			if (delimiters == null) delimiters = null;
			if (stringDelimiters == null) stringDelimiters = ["\"", "'"];
			if (context == null) context = null;
			if (evaluate == null) evaluate = true;
			if (context == null) context = {
				exceptionOnInvalidType: this.settings.exceptionOnInvalidType,
				objectDecoder: this.settings.objectDecoder,
				i: 0
			};
			i = context.i;
			if (ref = scalar.charAt(i), indexOf.call(stringDelimiters, ref) >= 0) {
				output = this.parseQuotedScalar(scalar, context);
				i = context.i;
				if (delimiters != null) {
					tmp = Utils.ltrim(scalar.slice(i), " ");
					if (!(ref1 = tmp.charAt(0), indexOf.call(delimiters, ref1) >= 0)) throw new ParseException("Unexpected characters (" + scalar.slice(i) + ").");
				}
			} else {
				if (!delimiters) {
					output = scalar.slice(i);
					i += output.length;
					strpos = output.indexOf(" #");
					if (strpos !== -1) output = Utils.rtrim(output.slice(0, strpos));
				} else {
					joinedDelimiters = delimiters.join("|");
					pattern = this.PATTERN_SCALAR_BY_DELIMITERS[joinedDelimiters];
					if (pattern == null) {
						pattern = new Pattern("^(.+?)(" + joinedDelimiters + ")");
						this.PATTERN_SCALAR_BY_DELIMITERS[joinedDelimiters] = pattern;
					}
					if (match = pattern.exec(scalar.slice(i))) {
						output = match[1];
						i += output.length;
					} else throw new ParseException("Malformed inline YAML string (" + scalar + ").");
				}
				if (evaluate) output = this.evaluateScalar(output, context);
			}
			context.i = i;
			return output;
		};
		Inline.parseQuotedScalar = function(scalar, context) {
			var i = context.i, match, output;
			if (!(match = this.PATTERN_QUOTED_SCALAR.exec(scalar.slice(i)))) throw new ParseMore("Malformed inline YAML string (" + scalar.slice(i) + ").");
			output = match[0].substr(1, match[0].length - 2);
			if ("\"" === scalar.charAt(i)) output = Unescaper.unescapeDoubleQuotedString(output);
			else output = Unescaper.unescapeSingleQuotedString(output);
			i += match[0].length;
			context.i = i;
			return output;
		};
		Inline.parseSequence = function(sequence, context) {
			var i, isQuoted, len, output = [], ref, value;
			len = sequence.length;
			i = context.i;
			i += 1;
			while (i < len) {
				context.i = i;
				switch (sequence.charAt(i)) {
					case "[":
						output.push(this.parseSequence(sequence, context));
						i = context.i;
						break;
					case "{":
						output.push(this.parseMapping(sequence, context));
						i = context.i;
						break;
					case "]": return output;
					case ",":
					case " ":
					case "\n": break;
					default:
						isQuoted = (ref = sequence.charAt(i)) === "\"" || ref === "'";
						value = this.parseScalar(sequence, [",", "]"], ["\"", "'"], context);
						i = context.i;
						if (!isQuoted && typeof value === "string" && (value.indexOf(": ") !== -1 || value.indexOf(":\n") !== -1)) try {
							value = this.parseMapping("{" + value + "}");
						} catch (error) {}
						output.push(value);
						--i;
				}
				++i;
			}
			throw new ParseMore("Malformed inline YAML string " + sequence);
		};
		Inline.parseMapping = function(mapping, context) {
			var done, i, key, len, output = {}, shouldContinueWhileLoop, value;
			len = mapping.length;
			i = context.i;
			i += 1;
			shouldContinueWhileLoop = false;
			while (i < len) {
				context.i = i;
				switch (mapping.charAt(i)) {
					case " ":
					case ",":
					case "\n":
						++i;
						context.i = i;
						shouldContinueWhileLoop = true;
						break;
					case "}": return output;
				}
				if (shouldContinueWhileLoop) {
					shouldContinueWhileLoop = false;
					continue;
				}
				key = this.parseScalar(mapping, [
					":",
					" ",
					"\n"
				], ["\"", "'"], context, false);
				i = context.i;
				done = false;
				while (i < len) {
					context.i = i;
					switch (mapping.charAt(i)) {
						case "[":
							value = this.parseSequence(mapping, context);
							i = context.i;
							if (output[key] === void 0) output[key] = value;
							done = true;
							break;
						case "{":
							value = this.parseMapping(mapping, context);
							i = context.i;
							if (output[key] === void 0) output[key] = value;
							done = true;
							break;
						case ":":
						case " ":
						case "\n": break;
						default:
							value = this.parseScalar(mapping, [",", "}"], ["\"", "'"], context);
							i = context.i;
							if (output[key] === void 0) output[key] = value;
							done = true;
							--i;
					}
					++i;
					if (done) break;
				}
			}
			throw new ParseMore("Malformed inline YAML string " + mapping);
		};
		Inline.evaluateScalar = function(scalar, context) {
			var cast, date, exceptionOnInvalidType, firstChar, firstSpace, firstWord, objectDecoder, raw, scalarLower, subValue, trimmedScalar;
			scalar = Utils.trim(scalar);
			scalarLower = scalar.toLowerCase();
			switch (scalarLower) {
				case "null":
				case "":
				case "~": return null;
				case "true": return true;
				case "false": return false;
				case ".inf": return Infinity;
				case ".nan": return NaN;
				case "-.inf": return Infinity;
				default:
					firstChar = scalarLower.charAt(0);
					switch (firstChar) {
						case "!":
							firstSpace = scalar.indexOf(" ");
							if (firstSpace === -1) firstWord = scalarLower;
							else firstWord = scalarLower.slice(0, firstSpace);
							switch (firstWord) {
								case "!":
									if (firstSpace !== -1) return parseInt(this.parseScalar(scalar.slice(2)));
									return null;
								case "!str": return Utils.ltrim(scalar.slice(4));
								case "!!str": return Utils.ltrim(scalar.slice(5));
								case "!!int": return parseInt(this.parseScalar(scalar.slice(5)));
								case "!!bool": return Utils.parseBoolean(this.parseScalar(scalar.slice(6)), false);
								case "!!float": return parseFloat(this.parseScalar(scalar.slice(7)));
								case "!!timestamp": return Utils.stringToDate(Utils.ltrim(scalar.slice(11)));
								default:
									if (context == null) context = {
										exceptionOnInvalidType: this.settings.exceptionOnInvalidType,
										objectDecoder: this.settings.objectDecoder,
										i: 0
									};
									objectDecoder = context.objectDecoder, exceptionOnInvalidType = context.exceptionOnInvalidType;
									if (objectDecoder) {
										trimmedScalar = Utils.rtrim(scalar);
										firstSpace = trimmedScalar.indexOf(" ");
										if (firstSpace === -1) return objectDecoder(trimmedScalar, null);
										else {
											subValue = Utils.ltrim(trimmedScalar.slice(firstSpace + 1));
											if (!(subValue.length > 0)) subValue = null;
											return objectDecoder(trimmedScalar.slice(0, firstSpace), subValue);
										}
									}
									if (exceptionOnInvalidType) throw new ParseException("Custom object support when parsing a YAML file has been disabled.");
									return null;
							}
							break;
						case "0": if ("0x" === scalar.slice(0, 2)) return Utils.hexDec(scalar);
						else if (Utils.isDigits(scalar)) return Utils.octDec(scalar);
						else if (Utils.isNumeric(scalar)) return parseFloat(scalar);
						else return scalar;
						case "+":
							if (Utils.isDigits(scalar)) {
								raw = scalar;
								cast = parseInt(raw);
								if (raw === String(cast)) return cast;
								else return raw;
							} else if (Utils.isNumeric(scalar)) return parseFloat(scalar);
							else if (this.PATTERN_THOUSAND_NUMERIC_SCALAR.test(scalar)) return parseFloat(scalar.replace(",", ""));
							return scalar;
						case "-":
							if (Utils.isDigits(scalar.slice(1))) {
								if ("0" === scalar.charAt(1)) return -Utils.octDec(scalar.slice(1));
								else {
									raw = scalar.slice(1);
									cast = parseInt(raw);
									if (raw === String(cast)) return -cast;
									else return -raw;
								}
							} else if (Utils.isNumeric(scalar)) return parseFloat(scalar);
							else if (this.PATTERN_THOUSAND_NUMERIC_SCALAR.test(scalar)) return parseFloat(scalar.replace(",", ""));
							return scalar;
						default:
							if (date = Utils.stringToDate(scalar)) return date;
							else if (Utils.isNumeric(scalar)) return parseFloat(scalar);
							else if (this.PATTERN_THOUSAND_NUMERIC_SCALAR.test(scalar)) return parseFloat(scalar.replace(",", ""));
							return scalar;
					}
			}
		};
		return Inline;
	})();
	module.exports = Inline;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Parser.js
var require_Parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Inline = require_Inline();
	var ParseException;
	var ParseMore;
	var Parser;
	var Pattern = require_Pattern();
	var Utils = require_Utils();
	ParseException = require_ParseException();
	ParseMore = require_ParseMore();
	Parser = (function() {
		Parser.prototype.PATTERN_FOLDED_SCALAR_ALL = new Pattern("^(?:(?<type>![^\\|>]*)\\s+)?(?<separator>\\||>)(?<modifiers>\\+|\\-|\\d+|\\+\\d+|\\-\\d+|\\d+\\+|\\d+\\-)?(?<comments> +#.*)?$");
		Parser.prototype.PATTERN_FOLDED_SCALAR_END = new Pattern("(?<separator>\\||>)(?<modifiers>\\+|\\-|\\d+|\\+\\d+|\\-\\d+|\\d+\\+|\\d+\\-)?(?<comments> +#.*)?$");
		Parser.prototype.PATTERN_SEQUENCE_ITEM = new Pattern("^\\-((?<leadspaces>\\s+)(?<value>.+?))?\\s*$");
		Parser.prototype.PATTERN_ANCHOR_VALUE = new Pattern("^&(?<ref>[^ ]+) *(?<value>.*)");
		Parser.prototype.PATTERN_COMPACT_NOTATION = new Pattern("^(?<key>" + Inline.REGEX_QUOTED_STRING + "|[^ '\"\\{\\[].*?) *\\:(\\s+(?<value>.+?))?\\s*$");
		Parser.prototype.PATTERN_MAPPING_ITEM = new Pattern("^(?<key>" + Inline.REGEX_QUOTED_STRING + "|[^ '\"\\[\\{].*?) *\\:(\\s+(?<value>.+?))?\\s*$");
		Parser.prototype.PATTERN_DECIMAL = new Pattern("\\d+");
		Parser.prototype.PATTERN_INDENT_SPACES = new Pattern("^ +");
		Parser.prototype.PATTERN_TRAILING_LINES = new Pattern("(\n*)$");
		Parser.prototype.PATTERN_YAML_HEADER = new Pattern("^\\%YAML[: ][\\d\\.]+.*\n", "m");
		Parser.prototype.PATTERN_LEADING_COMMENTS = new Pattern("^(\\#.*?\n)+", "m");
		Parser.prototype.PATTERN_DOCUMENT_MARKER_START = new Pattern("^\\-\\-\\-.*?\n", "m");
		Parser.prototype.PATTERN_DOCUMENT_MARKER_END = new Pattern("^\\.\\.\\.\\s*$", "m");
		Parser.prototype.PATTERN_FOLDED_SCALAR_BY_INDENTATION = {};
		Parser.prototype.CONTEXT_NONE = 0;
		Parser.prototype.CONTEXT_SEQUENCE = 1;
		Parser.prototype.CONTEXT_MAPPING = 2;
		function Parser(offset) {
			this.offset = offset != null ? offset : 0;
			this.lines = [];
			this.currentLineNb = -1;
			this.currentLine = "";
			this.refs = {};
		}
		Parser.prototype.parse = function(value, exceptionOnInvalidType, objectDecoder) {
			var alias, allowOverwrite, block, c, context, data, e, first, i, indent, isRef, j, k, key, l, lastKey, len, len1, len2, len3, lineCount, m, matches, mergeNode, n, name, parsed, parsedItem, parser, ref, ref1, ref2, refName, refValue, val, values;
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectDecoder == null) objectDecoder = null;
			this.currentLineNb = -1;
			this.currentLine = "";
			this.lines = this.cleanup(value).split("\n");
			data = null;
			context = this.CONTEXT_NONE;
			allowOverwrite = false;
			while (this.moveToNextLine()) {
				if (this.isCurrentLineEmpty()) continue;
				if ("	" === this.currentLine[0]) throw new ParseException("A YAML file cannot contain tabs as indentation.", this.getRealCurrentLineNb() + 1, this.currentLine);
				isRef = mergeNode = false;
				if (values = this.PATTERN_SEQUENCE_ITEM.exec(this.currentLine)) {
					if (this.CONTEXT_MAPPING === context) throw new ParseException("You cannot define a sequence item when in a mapping");
					context = this.CONTEXT_SEQUENCE;
					if (data == null) data = [];
					if (values.value != null && (matches = this.PATTERN_ANCHOR_VALUE.exec(values.value))) {
						isRef = matches.ref;
						values.value = matches.value;
					}
					if (!(values.value != null) || "" === Utils.trim(values.value, " ") || Utils.ltrim(values.value, " ").indexOf("#") === 0) {
						if (this.currentLineNb < this.lines.length - 1 && !this.isNextLineUnIndentedCollection()) {
							c = this.getRealCurrentLineNb() + 1;
							parser = new Parser(c);
							parser.refs = this.refs;
							data.push(parser.parse(this.getNextEmbedBlock(null, true), exceptionOnInvalidType, objectDecoder));
						} else data.push(null);
					} else if (((ref = values.leadspaces) != null ? ref.length : void 0) && (matches = this.PATTERN_COMPACT_NOTATION.exec(values.value))) {
						c = this.getRealCurrentLineNb();
						parser = new Parser(c);
						parser.refs = this.refs;
						block = values.value;
						indent = this.getCurrentLineIndentation();
						if (this.isNextLineIndented(false)) block += "\n" + this.getNextEmbedBlock(indent + values.leadspaces.length + 1, true);
						data.push(parser.parse(block, exceptionOnInvalidType, objectDecoder));
					} else data.push(this.parseValue(values.value, exceptionOnInvalidType, objectDecoder));
				} else if ((values = this.PATTERN_MAPPING_ITEM.exec(this.currentLine)) && values.key.indexOf(" #") === -1) {
					if (this.CONTEXT_SEQUENCE === context) throw new ParseException("You cannot define a mapping item when in a sequence");
					context = this.CONTEXT_MAPPING;
					if (data == null) data = {};
					Inline.configure(exceptionOnInvalidType, objectDecoder);
					try {
						key = Inline.parseScalar(values.key);
					} catch (error) {
						e = error;
						e.parsedLine = this.getRealCurrentLineNb() + 1;
						e.snippet = this.currentLine;
						throw e;
					}
					if ("<<" === key) {
						mergeNode = true;
						allowOverwrite = true;
						if (((ref1 = values.value) != null ? ref1.indexOf("*") : void 0) === 0) {
							refName = values.value.slice(1);
							if (this.refs[refName] == null) throw new ParseException("Reference \"" + refName + "\" does not exist.", this.getRealCurrentLineNb() + 1, this.currentLine);
							refValue = this.refs[refName];
							if (typeof refValue !== "object") throw new ParseException("YAML merge keys used with a scalar value instead of an object.", this.getRealCurrentLineNb() + 1, this.currentLine);
							if (refValue instanceof Array) for (i = j = 0, len = refValue.length; j < len; i = ++j) {
								value = refValue[i];
								if (data[name = String(i)] == null) data[name] = value;
							}
							else for (key in refValue) {
								value = refValue[key];
								if (data[key] == null) data[key] = value;
							}
						} else {
							if (values.value != null && values.value !== "") value = values.value;
							else value = this.getNextEmbedBlock();
							c = this.getRealCurrentLineNb() + 1;
							parser = new Parser(c);
							parser.refs = this.refs;
							parsed = parser.parse(value, exceptionOnInvalidType);
							if (typeof parsed !== "object") throw new ParseException("YAML merge keys used with a scalar value instead of an object.", this.getRealCurrentLineNb() + 1, this.currentLine);
							if (parsed instanceof Array) for (l = 0, len1 = parsed.length; l < len1; l++) {
								parsedItem = parsed[l];
								if (typeof parsedItem !== "object") throw new ParseException("Merge items must be objects.", this.getRealCurrentLineNb() + 1, parsedItem);
								if (parsedItem instanceof Array) for (i = m = 0, len2 = parsedItem.length; m < len2; i = ++m) {
									value = parsedItem[i];
									k = String(i);
									if (!data.hasOwnProperty(k)) data[k] = value;
								}
								else for (key in parsedItem) {
									value = parsedItem[key];
									if (!data.hasOwnProperty(key)) data[key] = value;
								}
							}
							else for (key in parsed) {
								value = parsed[key];
								if (!data.hasOwnProperty(key)) data[key] = value;
							}
						}
					} else if (values.value != null && (matches = this.PATTERN_ANCHOR_VALUE.exec(values.value))) {
						isRef = matches.ref;
						values.value = matches.value;
					}
					if (mergeNode) {} else if (!(values.value != null) || "" === Utils.trim(values.value, " ") || Utils.ltrim(values.value, " ").indexOf("#") === 0) {
						if (!this.isNextLineIndented() && !this.isNextLineUnIndentedCollection()) {
							if (allowOverwrite || data[key] === void 0) data[key] = null;
						} else {
							c = this.getRealCurrentLineNb() + 1;
							parser = new Parser(c);
							parser.refs = this.refs;
							val = parser.parse(this.getNextEmbedBlock(), exceptionOnInvalidType, objectDecoder);
							if (allowOverwrite || data[key] === void 0) data[key] = val;
						}
					} else {
						val = this.parseValue(values.value, exceptionOnInvalidType, objectDecoder);
						if (allowOverwrite || data[key] === void 0) data[key] = val;
					}
				} else {
					lineCount = this.lines.length;
					if (1 === lineCount || 2 === lineCount && Utils.isEmpty(this.lines[1])) {
						try {
							value = Inline.parse(this.lines[0], exceptionOnInvalidType, objectDecoder);
						} catch (error) {
							e = error;
							e.parsedLine = this.getRealCurrentLineNb() + 1;
							e.snippet = this.currentLine;
							throw e;
						}
						if (typeof value === "object") {
							if (value instanceof Array) first = value[0];
							else for (key in value) {
								first = value[key];
								break;
							}
							if (typeof first === "string" && first.indexOf("*") === 0) {
								data = [];
								for (n = 0, len3 = value.length; n < len3; n++) {
									alias = value[n];
									data.push(this.refs[alias.slice(1)]);
								}
								value = data;
							}
						}
						return value;
					} else if ((ref2 = Utils.ltrim(value).charAt(0)) === "[" || ref2 === "{") try {
						return Inline.parse(value, exceptionOnInvalidType, objectDecoder);
					} catch (error) {
						e = error;
						e.parsedLine = this.getRealCurrentLineNb() + 1;
						e.snippet = this.currentLine;
						throw e;
					}
					throw new ParseException("Unable to parse.", this.getRealCurrentLineNb() + 1, this.currentLine);
				}
				if (isRef) {
					if (data instanceof Array) this.refs[isRef] = data[data.length - 1];
					else {
						lastKey = null;
						for (key in data) lastKey = key;
						this.refs[isRef] = data[lastKey];
					}
				}
			}
			if (Utils.isEmpty(data)) return null;
			else return data;
		};
		Parser.prototype.getRealCurrentLineNb = function() {
			return this.currentLineNb + this.offset;
		};
		Parser.prototype.getCurrentLineIndentation = function() {
			return this.currentLine.length - Utils.ltrim(this.currentLine, " ").length;
		};
		Parser.prototype.getNextEmbedBlock = function(indentation, includeUnindentedCollection) {
			var data, indent, isItUnindentedCollection, newIndent, removeComments, removeCommentsPattern, unindentedEmbedBlock;
			if (indentation == null) indentation = null;
			if (includeUnindentedCollection == null) includeUnindentedCollection = false;
			this.moveToNextLine();
			if (indentation == null) {
				newIndent = this.getCurrentLineIndentation();
				unindentedEmbedBlock = this.isStringUnIndentedCollectionItem(this.currentLine);
				if (!this.isCurrentLineEmpty() && 0 === newIndent && !unindentedEmbedBlock) throw new ParseException("Indentation problem.", this.getRealCurrentLineNb() + 1, this.currentLine);
			} else newIndent = indentation;
			data = [this.currentLine.slice(newIndent)];
			if (!includeUnindentedCollection) isItUnindentedCollection = this.isStringUnIndentedCollectionItem(this.currentLine);
			removeCommentsPattern = this.PATTERN_FOLDED_SCALAR_END;
			removeComments = !removeCommentsPattern.test(this.currentLine);
			while (this.moveToNextLine()) {
				indent = this.getCurrentLineIndentation();
				if (indent === newIndent) removeComments = !removeCommentsPattern.test(this.currentLine);
				if (removeComments && this.isCurrentLineComment()) continue;
				if (this.isCurrentLineBlank()) {
					data.push(this.currentLine.slice(newIndent));
					continue;
				}
				if (isItUnindentedCollection && !this.isStringUnIndentedCollectionItem(this.currentLine) && indent === newIndent) {
					this.moveToPreviousLine();
					break;
				}
				if (indent >= newIndent) data.push(this.currentLine.slice(newIndent));
				else if (Utils.ltrim(this.currentLine).charAt(0) === "#") {} else if (0 === indent) {
					this.moveToPreviousLine();
					break;
				} else throw new ParseException("Indentation problem.", this.getRealCurrentLineNb() + 1, this.currentLine);
			}
			return data.join("\n");
		};
		Parser.prototype.moveToNextLine = function() {
			if (this.currentLineNb >= this.lines.length - 1) return false;
			this.currentLine = this.lines[++this.currentLineNb];
			return true;
		};
		Parser.prototype.moveToPreviousLine = function() {
			this.currentLine = this.lines[--this.currentLineNb];
		};
		Parser.prototype.parseValue = function(value, exceptionOnInvalidType, objectDecoder) {
			var e, foldedIndent, matches, modifiers, pos, ref, ref1, val;
			if (0 === value.indexOf("*")) {
				pos = value.indexOf("#");
				if (pos !== -1) value = value.substr(1, pos - 2);
				else value = value.slice(1);
				if (this.refs[value] === void 0) throw new ParseException("Reference \"" + value + "\" does not exist.", this.currentLine);
				return this.refs[value];
			}
			if (matches = this.PATTERN_FOLDED_SCALAR_ALL.exec(value)) {
				modifiers = (ref = matches.modifiers) != null ? ref : "";
				foldedIndent = Math.abs(parseInt(modifiers));
				if (isNaN(foldedIndent)) foldedIndent = 0;
				val = this.parseFoldedScalar(matches.separator, this.PATTERN_DECIMAL.replace(modifiers, ""), foldedIndent);
				if (matches.type != null) {
					Inline.configure(exceptionOnInvalidType, objectDecoder);
					return Inline.parseScalar(matches.type + " " + val);
				} else return val;
			}
			if ((ref1 = value.charAt(0)) === "[" || ref1 === "{" || ref1 === "\"" || ref1 === "'") while (true) try {
				return Inline.parse(value, exceptionOnInvalidType, objectDecoder);
			} catch (error) {
				e = error;
				if (e instanceof ParseMore && this.moveToNextLine()) value += "\n" + Utils.trim(this.currentLine, " ");
				else {
					e.parsedLine = this.getRealCurrentLineNb() + 1;
					e.snippet = this.currentLine;
					throw e;
				}
			}
			else {
				if (this.isNextLineIndented()) value += "\n" + this.getNextEmbedBlock();
				return Inline.parse(value, exceptionOnInvalidType, objectDecoder);
			}
		};
		Parser.prototype.parseFoldedScalar = function(separator, indicator, indentation) {
			var isCurrentLineBlank, j, len, line, matches, newText, notEOF, pattern, ref, text;
			if (indicator == null) indicator = "";
			if (indentation == null) indentation = 0;
			notEOF = this.moveToNextLine();
			if (!notEOF) return "";
			isCurrentLineBlank = this.isCurrentLineBlank();
			text = "";
			while (notEOF && isCurrentLineBlank) if (notEOF = this.moveToNextLine()) {
				text += "\n";
				isCurrentLineBlank = this.isCurrentLineBlank();
			}
			if (0 === indentation) {
				if (matches = this.PATTERN_INDENT_SPACES.exec(this.currentLine)) indentation = matches[0].length;
			}
			if (indentation > 0) {
				pattern = this.PATTERN_FOLDED_SCALAR_BY_INDENTATION[indentation];
				if (pattern == null) {
					pattern = new Pattern("^ {" + indentation + "}(.*)$");
					Parser.prototype.PATTERN_FOLDED_SCALAR_BY_INDENTATION[indentation] = pattern;
				}
				while (notEOF && (isCurrentLineBlank || (matches = pattern.exec(this.currentLine)))) {
					if (isCurrentLineBlank) text += this.currentLine.slice(indentation);
					else text += matches[1];
					if (notEOF = this.moveToNextLine()) {
						text += "\n";
						isCurrentLineBlank = this.isCurrentLineBlank();
					}
				}
			} else if (notEOF) text += "\n";
			if (notEOF) this.moveToPreviousLine();
			if (">" === separator) {
				newText = "";
				ref = text.split("\n");
				for (j = 0, len = ref.length; j < len; j++) {
					line = ref[j];
					if (line.length === 0 || line.charAt(0) === " ") newText = Utils.rtrim(newText, " ") + line + "\n";
					else newText += line + " ";
				}
				text = newText;
			}
			if ("+" !== indicator) text = Utils.rtrim(text);
			if ("" === indicator) text = this.PATTERN_TRAILING_LINES.replace(text, "\n");
			else if ("-" === indicator) text = this.PATTERN_TRAILING_LINES.replace(text, "");
			return text;
		};
		Parser.prototype.isNextLineIndented = function(ignoreComments) {
			var EOF, currentIndentation, ret;
			if (ignoreComments == null) ignoreComments = true;
			currentIndentation = this.getCurrentLineIndentation();
			EOF = !this.moveToNextLine();
			if (ignoreComments) while (!EOF && this.isCurrentLineEmpty()) EOF = !this.moveToNextLine();
			else while (!EOF && this.isCurrentLineBlank()) EOF = !this.moveToNextLine();
			if (EOF) return false;
			ret = false;
			if (this.getCurrentLineIndentation() > currentIndentation) ret = true;
			this.moveToPreviousLine();
			return ret;
		};
		Parser.prototype.isCurrentLineEmpty = function() {
			var trimmedLine = Utils.trim(this.currentLine, " ");
			return trimmedLine.length === 0 || trimmedLine.charAt(0) === "#";
		};
		Parser.prototype.isCurrentLineBlank = function() {
			return "" === Utils.trim(this.currentLine, " ");
		};
		Parser.prototype.isCurrentLineComment = function() {
			return Utils.ltrim(this.currentLine, " ").charAt(0) === "#";
		};
		Parser.prototype.cleanup = function(value) {
			var count, i, indent, j, l, len, len1, line, lines, ref, ref1, ref2, smallestIndent, trimmedValue;
			if (value.indexOf("\r") !== -1) value = value.split("\r\n").join("\n").split("\r").join("\n");
			count = 0;
			ref = this.PATTERN_YAML_HEADER.replaceAll(value, ""), value = ref[0], count = ref[1];
			this.offset += count;
			ref1 = this.PATTERN_LEADING_COMMENTS.replaceAll(value, "", 1), trimmedValue = ref1[0], count = ref1[1];
			if (count === 1) {
				this.offset += Utils.subStrCount(value, "\n") - Utils.subStrCount(trimmedValue, "\n");
				value = trimmedValue;
			}
			ref2 = this.PATTERN_DOCUMENT_MARKER_START.replaceAll(value, "", 1), trimmedValue = ref2[0], count = ref2[1];
			if (count === 1) {
				this.offset += Utils.subStrCount(value, "\n") - Utils.subStrCount(trimmedValue, "\n");
				value = trimmedValue;
				value = this.PATTERN_DOCUMENT_MARKER_END.replace(value, "");
			}
			lines = value.split("\n");
			smallestIndent = -1;
			for (j = 0, len = lines.length; j < len; j++) {
				line = lines[j];
				if (Utils.trim(line, " ").length === 0) continue;
				indent = line.length - Utils.ltrim(line).length;
				if (smallestIndent === -1 || indent < smallestIndent) smallestIndent = indent;
			}
			if (smallestIndent > 0) {
				for (i = l = 0, len1 = lines.length; l < len1; i = ++l) {
					line = lines[i];
					lines[i] = line.slice(smallestIndent);
				}
				value = lines.join("\n");
			}
			return value;
		};
		Parser.prototype.isNextLineUnIndentedCollection = function(currentIndentation) {
			var notEOF, ret;
			if (currentIndentation == null) currentIndentation = null;
			if (currentIndentation == null) currentIndentation = this.getCurrentLineIndentation();
			notEOF = this.moveToNextLine();
			while (notEOF && this.isCurrentLineEmpty()) notEOF = this.moveToNextLine();
			if (false === notEOF) return false;
			ret = false;
			if (this.getCurrentLineIndentation() === currentIndentation && this.isStringUnIndentedCollectionItem(this.currentLine)) ret = true;
			this.moveToPreviousLine();
			return ret;
		};
		Parser.prototype.isStringUnIndentedCollectionItem = function() {
			return this.currentLine === "-" || this.currentLine.slice(0, 2) === "- ";
		};
		return Parser;
	})();
	module.exports = Parser;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Dumper.js
var require_Dumper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Dumper;
	var Inline;
	var Utils = require_Utils();
	Inline = require_Inline();
	Dumper = (function() {
		function Dumper() {}
		Dumper.indentation = 4;
		Dumper.prototype.dump = function(input, inline, indent, exceptionOnInvalidType, objectEncoder) {
			var i, key, len, output, prefix, value, willBeInlined;
			if (inline == null) inline = 0;
			if (indent == null) indent = 0;
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectEncoder == null) objectEncoder = null;
			output = "";
			prefix = indent ? Utils.strRepeat(" ", indent) : "";
			if (inline <= 0 || typeof input !== "object" || input instanceof Date || Utils.isEmpty(input)) output += prefix + Inline.dump(input, exceptionOnInvalidType, objectEncoder);
			else if (input instanceof Array) for (i = 0, len = input.length; i < len; i++) {
				value = input[i];
				willBeInlined = inline - 1 <= 0 || typeof value !== "object" || Utils.isEmpty(value);
				output += prefix + "-" + (willBeInlined ? " " : "\n") + this.dump(value, inline - 1, willBeInlined ? 0 : indent + this.indentation, exceptionOnInvalidType, objectEncoder) + (willBeInlined ? "\n" : "");
			}
			else for (key in input) {
				value = input[key];
				willBeInlined = inline - 1 <= 0 || typeof value !== "object" || Utils.isEmpty(value);
				output += prefix + Inline.dump(key, exceptionOnInvalidType, objectEncoder) + ":" + (willBeInlined ? " " : "\n") + this.dump(value, inline - 1, willBeInlined ? 0 : indent + this.indentation, exceptionOnInvalidType, objectEncoder) + (willBeInlined ? "\n" : "");
			}
			return output;
		};
		return Dumper;
	})();
	module.exports = Dumper;
}));
//#endregion
//#region ../../../node_modules/.pnpm/yamljs@0.3.0/node_modules/yamljs/lib/Yaml.js
var require_Yaml = /* @__PURE__ */ __commonJSMin(((exports, module, this$1) => {
	var Dumper;
	var Parser = require_Parser();
	var Utils;
	var Yaml;
	Dumper = require_Dumper();
	Utils = require_Utils();
	Yaml = (function() {
		function Yaml() {}
		Yaml.parse = function(input, exceptionOnInvalidType, objectDecoder) {
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectDecoder == null) objectDecoder = null;
			return new Parser().parse(input, exceptionOnInvalidType, objectDecoder);
		};
		Yaml.parseFile = function(path, callback, exceptionOnInvalidType, objectDecoder) {
			var input;
			if (callback == null) callback = null;
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectDecoder == null) objectDecoder = null;
			if (callback != null) return Utils.getStringFromFile(path, (function(_this) {
				return function(input) {
					var result = null;
					if (input != null) result = _this.parse(input, exceptionOnInvalidType, objectDecoder);
					callback(result);
				};
			})(this));
			else {
				input = Utils.getStringFromFile(path);
				if (input != null) return this.parse(input, exceptionOnInvalidType, objectDecoder);
				return null;
			}
		};
		Yaml.dump = function(input, inline, indent, exceptionOnInvalidType, objectEncoder) {
			var yaml;
			if (inline == null) inline = 2;
			if (indent == null) indent = 4;
			if (exceptionOnInvalidType == null) exceptionOnInvalidType = false;
			if (objectEncoder == null) objectEncoder = null;
			yaml = new Dumper();
			yaml.indentation = indent;
			return yaml.dump(input, inline, 0, exceptionOnInvalidType, objectEncoder);
		};
		Yaml.stringify = function(input, inline, indent, exceptionOnInvalidType, objectEncoder) {
			return this.dump(input, inline, indent, exceptionOnInvalidType, objectEncoder);
		};
		Yaml.load = function(path, callback, exceptionOnInvalidType, objectDecoder) {
			return this.parseFile(path, callback, exceptionOnInvalidType, objectDecoder);
		};
		return Yaml;
	})();
	if (typeof window !== "undefined" && window !== null) window.YAML = Yaml;
	if (typeof window === "undefined" || window === null) this$1.YAML = Yaml;
	module.exports = Yaml;
}));
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/ansible.js
var import_Yaml = /* @__PURE__ */ __toESM(require_Yaml(), 1);
var supportedArgs$43 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"compressed",
	"no-compressed",
	"netrc",
	"netrc-optional",
	"no-netrc",
	"no-netrc-optional",
	"cacert",
	"cert",
	"key",
	"ciphers",
	"insecure",
	"no-insecure",
	"anyauth",
	"no-anyauth",
	"digest",
	"no-digest",
	"aws-sigv4",
	"negotiate",
	"no-negotiate",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb",
	"unix-socket",
	"abstract-unix-socket",
	"max-time",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"upload-file",
	"output",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/c.js
var supportedArgs$42 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"disallow-username-in-url",
	"path-as-is",
	"alt-svc",
	"unix-socket",
	"abstract-unix-socket",
	"compressed",
	"no-compressed",
	"verbose",
	"no-verbose",
	"proxy",
	"proxy-user",
	"proxytunnel",
	"noproxy",
	"preproxy",
	"proxy-anyauth",
	"proxy-basic",
	"proxy-digest",
	"proxy-negotiate",
	"proxy-ntlm",
	"proxy-ca-native",
	"proxy-cacert",
	"proxy-capath",
	"proxy-cert-type",
	"proxy-cert",
	"proxy-ciphers",
	"proxy-crlfile",
	"proxy-header",
	"proxy-http2",
	"proxy-insecure",
	"proxy-key",
	"proxy-key-type",
	"proxy-pass",
	"proxy-pinnedpubkey",
	"proxy-service-name",
	"proxy-ssl-allow-beast",
	"proxy-ssl-auto-client-cert",
	"proxy-tls13-ciphers",
	"proxy-tlsuser",
	"proxy-tlspassword",
	"proxy-tlsauthtype",
	"proxy-tlsv1",
	"socks4",
	"socks4a",
	"socks5",
	"socks5-hostname",
	"socks5-basic",
	"socks5-gssapi",
	"socks5-gssapi-nec",
	"socks5-gssapi-service",
	"haproxy-clientip",
	"haproxy-protocol",
	"interface",
	"netrc",
	"netrc-file",
	"netrc-optional",
	"digest",
	"no-digest",
	"negotiate",
	"no-negotiate",
	"service-name",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb",
	"aws-sigv4",
	"delegation",
	"oauth2-bearer",
	"ipv4",
	"ipv6",
	"local-port",
	"ftp-skip-pasv-ip",
	"sasl-authzid",
	"sasl-ir",
	"tr-encoding",
	"tcp-fastopen",
	"proto-default",
	"ignore-content-length",
	"no-ignore-content-length",
	"remote-time",
	"fail",
	"continue-at",
	"speed-limit",
	"speed-time",
	"limit-rate",
	"max-filesize",
	"http0.9",
	"http1.0",
	"http1.1",
	"http2",
	"http2-prior-knowledge",
	"http3",
	"http3-only",
	"cookie-jar",
	"junk-session-cookies",
	"crlf",
	"no-crlf",
	"use-ascii",
	"pass",
	"cacert",
	"capath",
	"crlfile",
	"pinnedpubkey",
	"curves",
	"cert",
	"cert-status",
	"cert-type",
	"key",
	"key-type",
	"ca-native",
	"ssl-allow-beast",
	"ciphers",
	"tls13-ciphers",
	"tlsuser",
	"tlspassword",
	"tlsauthtype",
	"ssl",
	"ssl-auto-client-cert",
	"ssl-no-revoke",
	"ssl-reqd",
	"ssl-revoke-best-effort",
	"tlsv1",
	"tlsv1.0",
	"tlsv1.1",
	"tlsv1.2",
	"tlsv1.3",
	"tls-max",
	"hsts",
	"alpn",
	"no-alpn",
	"form",
	"form-string",
	"form-escape",
	"no-form-escape",
	"doh-url",
	"doh-cert-status",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"max-redirs",
	"post301",
	"post302",
	"post303",
	"max-time",
	"connect-timeout",
	"expect100-timeout",
	"happy-eyeballs-timeout-ms",
	"resolve",
	"connect-to",
	"keepalive",
	"no-keepalive",
	"keepalive-time",
	"insecure",
	"no-insecure"
]);
//#endregion
//#region ../../../node_modules/.pnpm/jsesc@3.1.0/node_modules/jsesc/jsesc.js
var require_jsesc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var object = {};
	var hasOwnProperty = object.hasOwnProperty;
	var forOwn = (object, callback) => {
		for (const key in object) if (hasOwnProperty.call(object, key)) callback(key, object[key]);
	};
	var extend = (destination, source) => {
		if (!source) return destination;
		forOwn(source, (key, value) => {
			destination[key] = value;
		});
		return destination;
	};
	var forEach = (array, callback) => {
		const length = array.length;
		let index = -1;
		while (++index < length) callback(array[index]);
	};
	var fourHexEscape = (hex) => {
		return "\\u" + ("0000" + hex).slice(-4);
	};
	var hexadecimal = (code, lowercase) => {
		let hexadecimal = code.toString(16);
		if (lowercase) return hexadecimal;
		return hexadecimal.toUpperCase();
	};
	var toString = object.toString;
	var isArray = Array.isArray;
	var isBuffer = (value) => {
		return typeof Buffer === "function" && Buffer.isBuffer(value);
	};
	var isObject = (value) => {
		return toString.call(value) == "[object Object]";
	};
	var isString = (value) => {
		return typeof value == "string" || toString.call(value) == "[object String]";
	};
	var isNumber = (value) => {
		return typeof value == "number" || toString.call(value) == "[object Number]";
	};
	var isBigInt = (value) => {
		return typeof value == "bigint";
	};
	var isFunction = (value) => {
		return typeof value == "function";
	};
	var isMap = (value) => {
		return toString.call(value) == "[object Map]";
	};
	var isSet = (value) => {
		return toString.call(value) == "[object Set]";
	};
	var singleEscapes = {
		"\\": "\\\\",
		"\b": "\\b",
		"\f": "\\f",
		"\n": "\\n",
		"\r": "\\r",
		"	": "\\t"
	};
	var regexSingleEscape = /[\\\b\f\n\r\t]/;
	var regexDigit = /[0-9]/;
	var regexWhitespace = /[\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;
	var escapeEverythingRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF])|([\uD800-\uDFFF])|(['"`])|[^]/g;
	var escapeNonAsciiRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF])|([\uD800-\uDFFF])|(['"`])|[^ !#-&\(-\[\]-_a-~]/g;
	var jsesc = (argument, options) => {
		const increaseIndentation = () => {
			oldIndent = indent;
			++options.indentLevel;
			indent = options.indent.repeat(options.indentLevel);
		};
		const defaults = {
			"escapeEverything": false,
			"minimal": false,
			"isScriptContext": false,
			"quotes": "single",
			"wrap": false,
			"es6": false,
			"json": false,
			"compact": true,
			"lowercaseHex": false,
			"numbers": "decimal",
			"indent": "	",
			"indentLevel": 0,
			"__inline1__": false,
			"__inline2__": false
		};
		const json = options && options.json;
		if (json) {
			defaults.quotes = "double";
			defaults.wrap = true;
		}
		options = extend(defaults, options);
		if (options.quotes != "single" && options.quotes != "double" && options.quotes != "backtick") options.quotes = "single";
		const quote = options.quotes == "double" ? "\"" : options.quotes == "backtick" ? "`" : "'";
		const compact = options.compact;
		const lowercaseHex = options.lowercaseHex;
		let indent = options.indent.repeat(options.indentLevel);
		let oldIndent = "";
		const inline1 = options.__inline1__;
		const inline2 = options.__inline2__;
		const newLine = compact ? "" : "\n";
		let result;
		let isEmpty = true;
		const useBinNumbers = options.numbers == "binary";
		const useOctNumbers = options.numbers == "octal";
		const useDecNumbers = options.numbers == "decimal";
		const useHexNumbers = options.numbers == "hexadecimal";
		if (json && argument && isFunction(argument.toJSON)) argument = argument.toJSON();
		if (!isString(argument)) {
			if (isMap(argument)) {
				if (argument.size == 0) return "new Map()";
				if (!compact) {
					options.__inline1__ = true;
					options.__inline2__ = false;
				}
				return "new Map(" + jsesc(Array.from(argument), options) + ")";
			}
			if (isSet(argument)) {
				if (argument.size == 0) return "new Set()";
				return "new Set(" + jsesc(Array.from(argument), options) + ")";
			}
			if (isBuffer(argument)) {
				if (argument.length == 0) return "Buffer.from([])";
				return "Buffer.from(" + jsesc(Array.from(argument), options) + ")";
			}
			if (isArray(argument)) {
				result = [];
				options.wrap = true;
				if (inline1) {
					options.__inline1__ = false;
					options.__inline2__ = true;
				}
				if (!inline2) increaseIndentation();
				forEach(argument, (value) => {
					isEmpty = false;
					if (inline2) options.__inline2__ = false;
					result.push((compact || inline2 ? "" : indent) + jsesc(value, options));
				});
				if (isEmpty) return "[]";
				if (inline2) return "[" + result.join(", ") + "]";
				return "[" + newLine + result.join("," + newLine) + newLine + (compact ? "" : oldIndent) + "]";
			} else if (isNumber(argument) || isBigInt(argument)) {
				if (json) return JSON.stringify(Number(argument));
				let result;
				if (useDecNumbers) result = String(argument);
				else if (useHexNumbers) {
					let hexadecimal = argument.toString(16);
					if (!lowercaseHex) hexadecimal = hexadecimal.toUpperCase();
					result = "0x" + hexadecimal;
				} else if (useBinNumbers) result = "0b" + argument.toString(2);
				else if (useOctNumbers) result = "0o" + argument.toString(8);
				if (isBigInt(argument)) return result + "n";
				return result;
			} else if (isBigInt(argument)) {
				if (json) return JSON.stringify(Number(argument));
				return argument + "n";
			} else if (!isObject(argument)) {
				if (json) return JSON.stringify(argument) || "null";
				return String(argument);
			} else {
				result = [];
				options.wrap = true;
				increaseIndentation();
				forOwn(argument, (key, value) => {
					isEmpty = false;
					result.push((compact ? "" : indent) + jsesc(key, options) + ":" + (compact ? "" : " ") + jsesc(value, options));
				});
				if (isEmpty) return "{}";
				return "{" + newLine + result.join("," + newLine) + newLine + (compact ? "" : oldIndent) + "}";
			}
		}
		const regex = options.escapeEverything ? escapeEverythingRegex : escapeNonAsciiRegex;
		result = argument.replace(regex, (char, pair, lone, quoteChar, index, string) => {
			if (pair) {
				if (options.minimal) return pair;
				const first = pair.charCodeAt(0);
				const second = pair.charCodeAt(1);
				if (options.es6) return "\\u{" + hexadecimal((first - 55296) * 1024 + second - 56320 + 65536, lowercaseHex) + "}";
				return fourHexEscape(hexadecimal(first, lowercaseHex)) + fourHexEscape(hexadecimal(second, lowercaseHex));
			}
			if (lone) return fourHexEscape(hexadecimal(lone.charCodeAt(0), lowercaseHex));
			if (char == "\0" && !json && !regexDigit.test(string.charAt(index + 1))) return "\\0";
			if (quoteChar) {
				if (quoteChar == quote || options.escapeEverything) return "\\" + quoteChar;
				return quoteChar;
			}
			if (regexSingleEscape.test(char)) return singleEscapes[char];
			if (options.minimal && !regexWhitespace.test(char)) return char;
			const hex = hexadecimal(char.charCodeAt(0), lowercaseHex);
			if (json || hex.length > 2) return fourHexEscape(hex);
			return "\\x" + ("00" + hex).slice(-2);
		});
		if (quote == "`") result = result.replace(/\$\{/g, "\\${");
		if (options.isScriptContext) result = result.replace(/<\/(script|style)/gi, "<\\/$1").replace(/<!--/g, json ? "\\u003C!--" : "\\x3C!--");
		if (options.wrap) result = quote + result + quote;
		return result;
	};
	jsesc.version = "3.0.2";
	module.exports = jsesc;
}));
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/javascript.js
var import_jsesc = /* @__PURE__ */ __toESM(require_jsesc(), 1);
var javaScriptSupportedArgs = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"upload-file",
	"form",
	"form-string",
	"digest",
	"no-digest",
	"next",
	"compressed"
]);
var nodeSupportedArgs = /* @__PURE__ */ new Set([...javaScriptSupportedArgs, "proxy"]);
var FORBIDDEN_HEADERS = [
	"Accept-Charset",
	"Accept-Encoding",
	"Access-Control-Request-Headers",
	"Access-Control-Request-Method",
	"Connection",
	"Content-Length",
	"Cookie",
	"Cookie2",
	"Date",
	"DNT",
	"Expect",
	"Host",
	"Keep-Alive",
	"Origin",
	"Referer",
	"Set-Cookie",
	"TE",
	"Trailer",
	"Transfer-Encoding",
	"Upgrade",
	"Via"
].map((h) => h.toLowerCase());
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/cfml.js
var supportedArgs$41 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-time",
	"proxy",
	"proxy-user"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/java/java.js
var supportedArgs$40 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"connect-timeout",
	"location",
	"upload-file",
	"http2"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/clojure.js
var supportedArgs$39 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"insecure",
	"no-insecure",
	"compressed",
	"no-compressed",
	"max-time",
	"connect-timeout",
	"max-redirs",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"digest",
	"no-digest",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/csharp.js
var supportedArgs$38 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"compressed",
	"form",
	"form-string",
	"http0.9",
	"http1.0",
	"http1.1",
	"insecure",
	"no-compressed",
	"no-digest",
	"no-http0.9",
	"no-insecure",
	"proxy",
	"upload-file"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/dart.js
var supportedArgs$37 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"compressed",
	"form",
	"form-string",
	"no-compressed"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/elixir.js
var supportedArgs$36 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"insecure",
	"no-insecure",
	"next"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/python/python.js
var supportedArgs$35 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"compressed",
	"digest",
	"no-digest",
	"aws-sigv4",
	"negotiate",
	"no-negotiate",
	"delegation",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb",
	"http1.1",
	"http2",
	"http2-prior-knowledge",
	"http3",
	"http3-only",
	"cookie-jar",
	"cert",
	"cacert",
	"key",
	"capath",
	"form",
	"form-string",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"max-redirs",
	"max-time",
	"connect-timeout",
	"insecure",
	"no-insecure",
	"output",
	"upload-file",
	"next",
	"proxy",
	"proxy-user"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/go.js
var supportedArgs$34 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"insecure",
	"no-insecure",
	"compressed",
	"no-compressed",
	"max-time",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/har.js
var supportedArgs$33 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"anyauth",
	"no-anyauth",
	"http1.1",
	"http2",
	"http2-prior-knowledge",
	"http3",
	"http3-only"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/http.js
var supportedArgs$32 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"http0.9",
	"http1.0",
	"http1.1",
	"http2",
	"http2-prior-knowledge",
	"http3",
	"http3-only",
	"no-http0.9",
	"compressed",
	"no-compressed",
	"upload-file"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/wget.js
var supportedArgs$31 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"cookie-jar",
	"ipv4",
	"no-ipv4",
	"ipv6",
	"no-ipv6",
	"form",
	"form-string",
	"ciphers",
	"insecure",
	"cert",
	"cert-type",
	"key",
	"key-type",
	"cacert",
	"capath",
	"crlfile",
	"pinnedpubkey",
	"random-file",
	"egd-file",
	"hsts",
	"noproxy",
	"proxy",
	"proxy-user",
	"globoff",
	"no-globoff",
	"netrc",
	"netrc-optional",
	"timeout",
	"connect-timeout",
	"limit-rate",
	"compressed",
	"no-compressed",
	"anyauth",
	"no-anyauth",
	"digest",
	"no-digest",
	"aws-sigv4",
	"negotiate",
	"no-negotiate",
	"delegation",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb",
	"no-digest",
	"output",
	"upload-file",
	"continue-at",
	"clobber",
	"remote-time",
	"keep-alive",
	"silent",
	"verbose",
	"next"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/httpie.js
var supportedArgs$30 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"max-redirs",
	"ciphers",
	"insecure",
	"cert",
	"key",
	"cacert",
	"capath",
	"proxy",
	"noproxy",
	"timeout",
	"connect-timeout",
	"anyauth",
	"no-anyauth",
	"digest",
	"no-digest",
	"negotiate",
	"no-negotiate",
	"delegation",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb",
	"no-netrc",
	"verbose",
	"silent",
	"upload-file",
	"next"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/java/httpurlconnection.js
var supportedArgs$29 = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/java/jsoup.js
var supportedArgs$28 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-time"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/java/okhttp.js
var supportedArgs$27 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"connect-timeout",
	"location",
	"location-trusted",
	"upload-file",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/jquery.js
var supportedArgs$26 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-time"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/xhr.js
var supportedArgs$25 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-time"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/json.js
var supportedArgs$24 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"insecure",
	"no-insecure",
	"form",
	"form-string",
	"compressed",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"max-redirs",
	"output",
	"include",
	"proxy",
	"max-time",
	"connect-timeout",
	"anyauth",
	"no-anyauth",
	"digest",
	"no-digest",
	"aws-sigv4",
	"negotiate",
	"no-negotiate",
	"delegation",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb"
]);
function getDataString(request) {
	if (!request.data) return {};
	const contentType = request.headers.getContentType();
	if (contentType === "application/json") try {
		return JSON.parse(request.data.toString());
	} catch (e) {}
	if (contentType === "application/x-www-form-urlencoded") {
		const [parsedQuery, parsedQueryDict] = parseQueryString(request.data);
		if (parsedQueryDict) return Object.fromEntries(parsedQueryDict.map((param) => [param[0].toString(), Array.isArray(param[1]) ? param[1].map((v) => v.toString()) : param[1].toString()]));
		if (parsedQuery) return Object.fromEntries(parsedQuery.map((param) => [param[0].toString(), param[1].toString()]));
	}
	return request.data.toString();
}
function getFilesString(request) {
	if (!request.multipartUploads) return;
	const data = {
		files: {},
		data: {}
	};
	for (const m of request.multipartUploads) if ("contentFile" in m) data.files[m.name.toString()] = m.contentFile.toString();
	else data.data[m.name.toString()] = m.content.toString();
	return {
		files: Object.keys(data.files).length ? data.files : void 0,
		data: Object.keys(data.data).length ? data.data : void 0
	};
}
function _toJsonObject(requests, warnings = []) {
	const request = getFirst(requests, warnings);
	const requestUrl = request.urls[0];
	const requestJson = {
		url: (requestUrl.queryDict ? requestUrl.urlWithoutQueryList : requestUrl.url).toString().replace(/\/$/, ""),
		raw_url: requestUrl.url.toString(),
		method: requestUrl.method.toLowerCase().toString()
	};
	if (request.cookies) requestJson.cookies = Object.fromEntries(request.cookies.map((c) => [c[0].toString(), c[1].toString()]));
	if (request.headers.length) {
		const headers = request.headers.headers.filter((h) => h[1] !== null).map((h) => [h[0].toString(), h[1].toString()]);
		requestJson.headers = Object.fromEntries(headers);
	}
	if (requestUrl.queryDict) requestJson.queries = Object.fromEntries(requestUrl.queryDict.map((q) => [q[0].toString(), Array.isArray(q[1]) ? q[1].map((qq) => qq.toString()) : q[1].toString()]));
	if (request.data) requestJson.data = getDataString(request);
	else if (request.multipartUploads) Object.assign(requestJson, getFilesString(request));
	if (request.compressed) requestJson.compressed = true;
	if (request.insecure) requestJson.insecure = false;
	if (request.include) requestJson.include = true;
	if (requestUrl.auth) {
		const [user, password] = requestUrl.auth;
		requestJson.auth = {
			user: user.toString(),
			password: password.toString()
		};
		if (request.authType) requestJson.auth_type = request.authType;
	}
	if (request.awsSigV4) requestJson.aws_sigv4 = request.awsSigV4.toString();
	if (request.delegation) requestJson.delegation = request.delegation.toString();
	if (Object.prototype.hasOwnProperty.call(request, "followRedirects")) {
		requestJson.follow_redirects = request.followRedirects;
		if (request.maxRedirects) requestJson.max_redirects = parseInt(request.maxRedirects.toString(), 10);
	}
	if (request.proxy) requestJson.proxy = request.proxy.toString();
	if (request.timeout) requestJson.timeout = parseFloat(request.timeout.toString());
	if (request.connectTimeout) requestJson.connect_timeout = parseFloat(request.connectTimeout.toString());
	if (requestUrl.output) requestJson.output = requestUrl.output.toString();
	return requestJson;
}
function toJsonObjectWarn(curlCommand, warnings = []) {
	return [_toJsonObject(parse(curlCommand, supportedArgs$24, warnings), warnings), warnings];
}
function toJsonObject(curlCommand) {
	return toJsonObjectWarn(curlCommand)[0];
}
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/julia.js
var supportedArgs$23 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"no-compressed",
	"insecure",
	"no-insecure",
	"upload-file",
	"connect-timeout",
	"timeout",
	"retry",
	"location",
	"max-redirs",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/kotlin.js
var supportedArgs$22 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"connect-timeout",
	"location",
	"location-trusted",
	"upload-file",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/lua.js
var supportedArgs$21 = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/matlab/matlab.js
var supportedArgs$20 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"insecure",
	"no-insecure",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/axios.js
var supportedArgs$19 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"form",
	"form-string",
	"proxy",
	"proxy-user"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/got.js
var supportedArgs$18 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"connect-timeout",
	"location",
	"no-location",
	"location-trusted",
	"no-location-trusted",
	"max-redirs",
	"compressed",
	"insecure",
	"http2",
	"http2-prior-knowledge",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/http.js
var supportedArgs$17 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-time"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/ky.js
var supportedArgs$16 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"upload-file",
	"form",
	"form-string",
	"next",
	"compressed",
	"upload-file",
	"retry",
	"max-time"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/superagent.js
var supportedArgs$15 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-time",
	"connect-timeout",
	"location",
	"max-redirs",
	"retry",
	"insecure",
	"cert",
	"key",
	"cacert",
	"http2"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/javascript/request.js
var supportedArgs$14 = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS, "next"]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/objectivec.js
var supportedArgs$13 = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS, "max-time"]);
var reservedHeaders = [
	"Content-Length",
	"Authorization",
	"Connection",
	"Host",
	"Proxy-Authenticate",
	"Proxy-Authorization",
	"WWW-Authenticate"
].map((h) => h.toLowerCase());
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/ocaml.js
var supportedArgs$12 = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/perl.js
var supportedArgs$11 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"insecure",
	"no-insecure",
	"upload-file",
	"max-redirs",
	"max-time",
	"form",
	"form-string"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/php/php.js
var supportedArgs$10 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"insecure",
	"no-insecure",
	"compressed",
	"no-compressed",
	"digest",
	"no-digest",
	"location",
	"no-location",
	"form",
	"form-string",
	"proxy",
	"proxy-user",
	"unix-socket"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/php/guzzle.js
var supportedArgs$9 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"digest",
	"no-digest",
	"ntlm",
	"no-ntlm",
	"ntlm-wb",
	"no-ntlm-wb",
	"http3",
	"http3-only",
	"http2",
	"http2-prior-knowledge",
	"max-time",
	"connect-timeout",
	"insecure",
	"no-insecure",
	"cacert",
	"capath",
	"cert",
	"key",
	"compressed",
	"no-compressed",
	"location",
	"no-location",
	"proxy",
	"noproxy"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/php/requests.js
var supportedArgs$8 = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/powershell.js
var supportedArgs$7 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"upload-file",
	"output",
	"location",
	"location-trusted",
	"max-redirs",
	"proxy",
	"insecure",
	"max-time",
	"keepalive",
	"http2",
	"http3"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/python/http.js
var supportedArgs$6 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"max-time",
	"insecure",
	"no-insecure",
	"upload-file"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/r/httr.js
var supportedArgs$5 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"insecure",
	"no-insecure"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/r/httr2.js
var supportedArgs$4 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"insecure",
	"no-insecure",
	"oauth2-bearer",
	"max-redirs",
	"max-time",
	"connect-timeout",
	"retry",
	"retry-max-time"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/ruby/ruby.js
var supportedArgs$3 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"http0.9",
	"http1.0",
	"http1.1",
	"insecure",
	"no-digest",
	"no-http0.9",
	"no-insecure",
	"output",
	"proxy",
	"proxy-user",
	"upload-file",
	"next"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/ruby/httparty.js
var supportedArgs$2 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"digest",
	"no-digest",
	"form",
	"form-string",
	"http0.9",
	"http1.0",
	"http1.1",
	"insecure",
	"output",
	"upload-file",
	"next"
]);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/rust.js
var supportedArgs$1 = /* @__PURE__ */ new Set([
	...COMMON_SUPPORTED_ARGS,
	"form",
	"form-string",
	"max-redirs",
	"location",
	"no-location"
]);
var INDENTATION = " ".repeat(4);
//#endregion
//#region ../../../node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/src/generators/swift.js
var supportedArgs = /* @__PURE__ */ new Set([...COMMON_SUPPORTED_ARGS, "max-time"]);
//#endregion
//#region src/app/composables/useImportCurlCommand.ts
init_reactivity_esm_bundler();
var SUPPORTED_CONTENT_TYPES = [
	"application/json",
	"application/x-www-form-urlencoded",
	"multipart/form-data"
];
var CONTENT_TYPE_KEY = "content-type";
var getContentTypeHeader = (headers) => {
	return (0, import_get.default)(headers, CONTENT_TYPE_KEY) ?? void 0;
};
var isContentType = (headers, contentType) => {
	return getContentTypeHeader(headers) === contentType;
};
var isJsonRequest = (curlJson) => {
	if (isContentType(curlJson.headers, "application/json")) return true;
	if (curlJson.data && !getContentTypeHeader(curlJson.headers)) {
		const bodyKey = Object.keys(curlJson.data)[0];
		try {
			JSON.parse(bodyKey);
			return true;
		} catch {
			return false;
		}
	}
	return false;
};
var isFormUrlEncodedRequest = (curlJson) => {
	if (isContentType(curlJson.headers, "application/x-www-form-urlencoded")) return true;
	if (!getContentTypeHeader(curlJson.headers) && curlJson.data && !curlJson.files) return true;
	return false;
};
var isMultipartRequest = (curlJson) => {
	if (isContentType(curlJson.headers, "multipart/form-data")) return true;
	if (curlJson.files) return true;
	return false;
};
var isBinaryRequest = (curlJson) => {
	if (curlJson?.headers?.[CONTENT_TYPE_KEY]) {
		const contentType = curlJson?.headers?.[CONTENT_TYPE_KEY];
		return [
			"image",
			"video",
			"audio"
		].some((d) => contentType.includes(d));
	}
	return false;
};
var toKeyValueArray = ([key, value]) => ({
	name: key,
	value: typeof value === "string" ? value : `={{ ${value} }}`
});
var extractHeaders = (headers = {}) => {
	const emptyHeaders = !Object.keys(headers).length;
	const onlyContentTypeHeaderDefined = Object.keys(headers).length === 1 && headers[CONTENT_TYPE_KEY] !== void 0;
	if (emptyHeaders || onlyContentTypeHeaderDefined) return { sendHeaders: false };
	return {
		sendHeaders: true,
		headerParameters: { parameters: Object.entries(headers).map(toKeyValueArray).filter((parameter) => parameter.name !== CONTENT_TYPE_KEY) }
	};
};
var extractQueries = (queries = {}) => {
	if (!Object.keys(queries).length) return { sendQuery: false };
	return {
		sendQuery: true,
		queryParameters: { parameters: Object.entries(queries).flatMap(([key, value]) => Array.isArray(value) ? value.map((v) => ({
			name: key,
			value: v
		})) : [{
			name: key,
			value
		}]) }
	};
};
var keyValueBodyToNodeParameters = (body = {}) => {
	return Object.entries(body).map(toKeyValueArray);
};
var jsonBodyToNodeParameters = (body = {}) => {
	if (typeof body === "string") return [...new URLSearchParams(body).entries()].map((parameter) => {
		return toKeyValueArray(parameter);
	});
	return keyValueBodyToNodeParameters(body);
};
var multipartToNodeParameters = (body = {}, files = {}) => {
	return [...Object.entries(body).map(toKeyValueArray).map((e) => ({
		parameterType: "formData",
		...e
	})), ...Object.entries(files).map(toKeyValueArray).map((e) => ({
		parameterType: "formBinaryData",
		...e
	}))];
};
var lowerCaseContentTypeKey = (obj) => {
	if (!obj) return;
	const regex = new RegExp(CONTENT_TYPE_KEY, "gi");
	const contentTypeKey = Object.keys(obj).find((key) => !!Array.from(key.matchAll(regex)).length);
	if (!contentTypeKey) return;
	const value = obj[contentTypeKey];
	delete obj[contentTypeKey];
	obj[CONTENT_TYPE_KEY] = value;
};
var encodeBasicAuthentication = (username, password) => btoa(`${username}:${password}`);
var jsonHasNestedObjects = (json) => Object.values(json).some((e) => typeof e === "object" && e !== null);
var mapCookies = (cookies) => {
	if (!cookies) return {};
	const cookiesValues = Object.entries(cookies).reduce((accumulator, entry) => {
		accumulator += `${entry[0]}=${entry[1]};`;
		return accumulator;
	}, "");
	if (!cookiesValues) return {};
	return { cookie: cookiesValues };
};
var flattenObject = (obj, prefix = "") => Object.keys(obj).reduce((acc, k) => {
	const pre = prefix.length ? prefix + "." : "";
	if (typeof obj[k] === "object") Object.assign(acc, flattenObject(obj[k], pre + k));
	else acc[pre + k] = obj[k];
	return acc;
}, {});
/**
* Extracts and sanitizes the URL in a cURL command.
* Converts invalid placeholder syntax like \<PLACEHOLDER\> → {PLACEHOLDER}
*/
function sanitizeCurlUrlPlaceholders(curlCommand) {
	const CURL_URL_REGEX = /curl\s+(['"]?)(https?:\/\/[^\s'"]+)\1/;
	const PLACEHOLDER_REGEX = /<([A-Za-z0-9_-]+)>/g;
	const urlMatch = curlCommand.match(CURL_URL_REGEX);
	if (!urlMatch || !urlMatch[2]) return curlCommand;
	const originalUrl = urlMatch[2];
	const sanitizedUrl = originalUrl.replaceAll(PLACEHOLDER_REGEX, "{$1}");
	return curlCommand.replace(originalUrl, sanitizedUrl);
}
var toHttpNodeParameters = (curlCommand) => {
	const curlJson = toJsonObject(sanitizeCurlUrlPlaceholders(curlCommand));
	const headers = curlJson.headers ?? {};
	lowerCaseContentTypeKey(headers);
	if (curlJson.auth) {
		const { user, password: pass } = curlJson.auth;
		headers.authorization = `Basic ${encodeBasicAuthentication(user, pass)}`;
	}
	const url = new URL(curlJson.url);
	const queries = curlJson.queries ?? {};
	for (const [key, value] of url.searchParams) {
		const existing = queries[key];
		if (existing === void 0) queries[key] = value;
		else if (Array.isArray(existing)) queries[key] = [...existing, value];
		else queries[key] = [existing, value];
	}
	url.search = "";
	const httpNodeParameters = {
		url: url.pathname === "/" ? url.href.slice(0, -1) : url.href,
		authentication: "none",
		method: curlJson.method.toUpperCase(),
		...extractHeaders({
			...headers,
			...mapCookies(curlJson.cookies)
		}),
		...extractQueries(queries),
		options: {
			redirect: { redirect: {} },
			response: { response: {} }
		}
	};
	if (curlJson.follow_redirects) {
		httpNodeParameters.options.redirect.redirect.followRedirects = true;
		if (curlJson.max_redirects) httpNodeParameters.options.redirect.redirect.maxRedirects = curlJson.max_redirects;
	}
	if (curlJson.proxy) httpNodeParameters.options.proxy = curlJson.proxy;
	if (curlJson.connect_timeout !== void 0) httpNodeParameters.options.timeout = Math.floor(curlJson.connect_timeout * 1e3);
	if (curlJson.output) httpNodeParameters.options.response.response = {
		responseFormat: "file",
		outputPropertyName: curlJson.output ?? "data"
	};
	if (curlJson.insecure !== void 0) httpNodeParameters.options.allowUnauthorizedCerts = true;
	if (curlJson.include) {
		httpNodeParameters.options.response.response.fullResponse = true;
		httpNodeParameters.options.response.response.responseFormat = "autodetect";
	}
	const contentType = curlJson?.headers?.[CONTENT_TYPE_KEY];
	if (isBinaryRequest(curlJson)) return Object.assign(httpNodeParameters, {
		contentType: "binaryData",
		sendBody: true
	});
	if (contentType && !SUPPORTED_CONTENT_TYPES.includes(contentType)) {
		const data = curlJson?.data;
		return Object.assign(httpNodeParameters, {
			sendBody: true,
			contentType: "raw",
			rawContentType: contentType,
			body: data ? typeof data === "string" ? data : JSON.stringify(data) : void 0
		});
	}
	if (isJsonRequest(curlJson)) {
		Object.assign(httpNodeParameters, {
			contentType: "json",
			sendBody: true
		});
		if (curlJson.data) {
			const json = curlJson.data;
			if (jsonHasNestedObjects(json)) Object.assign(httpNodeParameters, {
				specifyBody: "json",
				jsonBody: JSON.stringify(json, null, 2)
			});
			else Object.assign(httpNodeParameters, {
				specifyBody: "keypair",
				bodyParameters: { parameters: jsonBodyToNodeParameters(curlJson.data) }
			});
		}
	} else if (isFormUrlEncodedRequest(curlJson)) Object.assign(httpNodeParameters, {
		contentType: "form-urlencoded",
		sendBody: true,
		specifyBody: "keypair",
		bodyParameters: { parameters: jsonBodyToNodeParameters(curlJson.data) }
	});
	else if (isMultipartRequest(curlJson)) Object.assign(httpNodeParameters, {
		contentType: "multipart-form-data",
		sendBody: true,
		bodyParameters: { parameters: multipartToNodeParameters(curlJson.data, curlJson.files) }
	});
	else Object.assign(httpNodeParameters, { sendBody: false });
	if (!Object.keys(httpNodeParameters.options?.redirect.redirect).length) delete httpNodeParameters.options.redirect;
	if (!Object.keys(httpNodeParameters.options.response.response).length) delete httpNodeParameters.options.response;
	return httpNodeParameters;
};
function useImportCurlCommand(options) {
	const toast = useToast();
	const i18n = useI18n();
	const translationStrings = {
		invalidCurCommand: {
			title: "importCurlParameter.showError.invalidCurlCommand.title",
			message: "importCurlParameter.showError.invalidCurlCommand.message"
		},
		...options?.i18n
	};
	function importCurlCommand(curlCommandRef) {
		const curlCommand = unref(curlCommandRef);
		if (curlCommand === "") return;
		try {
			const parameters = flattenObject(toHttpNodeParameters(curlCommand), "parameters");
			assert(typeof parameters["parameters.url"] === "string", "parameters.url has to be string");
			const url = parameters["parameters.url"].replaceAll("%7B", "{").replaceAll("%7D", "}");
			const invalidProtocol = CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS.find((p) => url.includes(`${p}://`));
			if (!invalidProtocol) {
				parameters["parameters.url"] = url;
				importCurlEventBus.emit("setHttpNodeParameters", parameters);
				options?.onImportSuccess?.();
				return;
			} else if (CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol]) {
				const useNode = CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol];
				showProtocolErrorWithSupportedNode(invalidProtocol, useNode);
			} else showProtocolError(invalidProtocol);
			options?.onImportFailure?.({
				invalidProtocol: true,
				protocol: invalidProtocol
			});
		} catch (e) {
			showInvalidcURLCommandError();
			options?.onImportFailure?.({ invalidProtocol: false });
		} finally {
			options?.onAfterImport?.();
		}
	}
	function showProtocolErrorWithSupportedNode(protocol, node) {
		toast.showToast({
			title: i18n.baseText("importCurlParameter.showError.invalidProtocol1.title", { interpolate: { node } }),
			message: i18n.baseText("importCurlParameter.showError.invalidProtocol.message", { interpolate: { protocol: protocol.toUpperCase() } }),
			type: "error",
			duration: 0
		});
	}
	function showProtocolError(protocol) {
		toast.showToast({
			title: i18n.baseText("importCurlParameter.showError.invalidProtocol2.title"),
			message: i18n.baseText("importCurlParameter.showError.invalidProtocol.message", { interpolate: { protocol } }),
			type: "error",
			duration: 0
		});
	}
	function showInvalidcURLCommandError() {
		toast.showToast({
			title: i18n.baseText(translationStrings.invalidCurCommand.title),
			message: i18n.baseText(translationStrings.invalidCurCommand.message),
			type: "error",
			duration: 0
		});
	}
	return { importCurlCommand };
}
//#endregion
export { useImportCurlCommand };
