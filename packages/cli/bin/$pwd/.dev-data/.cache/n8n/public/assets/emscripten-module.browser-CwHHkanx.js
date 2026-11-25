//#region ../../../node_modules/.pnpm/@jitl+quickjs-wasmfile-release-sync@0.32.0/node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.browser.mjs
async function QuickJSRaw(moduleArg = {}) {
	var moduleRtn;
	var c = moduleArg, aa = !!globalThis.window, n = !!globalThis.WorkerGlobalScope;
	function q(a) {
		a = { log: a || function() {} };
		for (const d of q.Pa) d(a);
		return c.quickJSEmscriptenExtensions = a;
	}
	q.Pa = [];
	c.quickjsEmscriptenInit = q;
	q.Pa.push((a) => {
		a.getWasmMemory = function() {
			return r;
		};
	});
	var t = "./this.program", ba = import.meta.url, u = "", v, w;
	if (aa || n) {
		try {
			u = new URL(".", ba).href;
		} catch {}
		n && (w = (a) => {
			var d = new XMLHttpRequest();
			d.open("GET", a, !1);
			d.responseType = "arraybuffer";
			d.send(null);
			return new Uint8Array(d.response);
		});
		v = async (a) => {
			a = await fetch(a, { credentials: "same-origin" });
			if (a.ok) return a.arrayBuffer();
			throw Error(a.status + " : " + a.url);
		};
	}
	var y = console.log.bind(console), z = console.error.bind(console), A, B = !1, C, D, E, F, G, H, I, J = !1;
	function K() {
		var a = r.buffer;
		c.HEAP8 = F = new Int8Array(a);
		new Int16Array(a);
		c.HEAPU8 = G = new Uint8Array(a);
		new Uint16Array(a);
		H = new Int32Array(a);
		I = new Uint32Array(a);
		new Float32Array(a);
		new Float64Array(a);
		new BigInt64Array(a);
		new BigUint64Array(a);
	}
	function L(a) {
		c.onAbort?.(a);
		a = "Aborted(" + a + ")";
		z(a);
		B = !0;
		a = new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
		E?.(a);
		throw a;
	}
	var M;
	async function ca(a) {
		if (!A) try {
			var d = await v(a);
			return new Uint8Array(d);
		} catch {}
		if (a == M && A) a = new Uint8Array(A);
		else if (w) a = w(a);
		else throw "both async and sync fetching of the wasm failed";
		return a;
	}
	async function da(a, d) {
		try {
			var b = await ca(a);
			return await WebAssembly.instantiate(b, d);
		} catch (e) {
			z(`failed to asynchronously prepare wasm: ${e}`), L(e);
		}
	}
	async function ea(a) {
		var d = M;
		if (!A) try {
			var b = fetch(d, { credentials: "same-origin" });
			return await WebAssembly.instantiateStreaming(b, a);
		} catch (e) {
			z(`wasm streaming compile failed: ${e}`), z("falling back to ArrayBuffer instantiation");
		}
		return da(d, a);
	}
	class N {
		name = "ExitStatus";
		constructor(a) {
			this.message = `Program terminated with exit(${a})`;
			this.status = a;
		}
	}
	var O = (a) => {
		for (; 0 < a.length;) a.shift()(c);
	}, P = [], fa = [], ha = () => {
		var a = c.preRun.shift();
		fa.push(a);
	}, Q = !0, r, ia = new TextDecoder(), ja = (a, d, b, e) => {
		b = d + b;
		if (e) return b;
		for (; a[d] && !(d >= b);) ++d;
		return d;
	}, R = (a, d, b) => a ? ia.decode(G.subarray(a, ja(G, a, d, b))) : "", S = 0, ka = [
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
	], la = [
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
	], T = {}, ma = (a) => {
		if (!(a instanceof N || "unwind" == a)) throw a;
	}, na = (a) => {
		C = a;
		Q || 0 < S || (c.onExit?.(a), B = !0);
		throw new N(a);
	}, oa = (a) => {
		if (!B) try {
			a();
		} catch (d) {
			ma(d);
		} finally {
			if (!(Q || 0 < S)) try {
				C = a = C, na(a);
			} catch (d) {
				ma(d);
			}
		}
	}, U = (a, d, b) => {
		var e = G;
		if (!(0 < b)) return 0;
		var f = d;
		b = d + b - 1;
		for (var g = 0; g < a.length; ++g) {
			var h = a.codePointAt(g);
			if (127 >= h) {
				if (d >= b) break;
				e[d++] = h;
			} else if (2047 >= h) {
				if (d + 1 >= b) break;
				e[d++] = 192 | h >> 6;
				e[d++] = 128 | h & 63;
			} else if (65535 >= h) {
				if (d + 2 >= b) break;
				e[d++] = 224 | h >> 12;
				e[d++] = 128 | h >> 6 & 63;
				e[d++] = 128 | h & 63;
			} else {
				if (d + 3 >= b) break;
				e[d++] = 240 | h >> 18;
				e[d++] = 128 | h >> 12 & 63;
				e[d++] = 128 | h >> 6 & 63;
				e[d++] = 128 | h & 63;
				g++;
			}
		}
		e[d] = 0;
		return d - f;
	}, V = {}, pa = () => {
		if (!W) {
			var a = {
				USER: "web_user",
				LOGNAME: "web_user",
				PATH: "/",
				PWD: "/",
				HOME: "/home/web_user",
				LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8",
				_: t || "./this.program"
			}, d;
			for (d in V) void 0 === V[d] ? delete a[d] : a[d] = V[d];
			var b = [];
			for (d in a) b.push(`${d}=${a[d]}`);
			W = b;
		}
		return W;
	}, W, X = (a) => {
		for (var d = 0, b = 0; b < a.length; ++b) {
			var e = a.charCodeAt(b);
			127 >= e ? d++ : 2047 >= e ? d += 2 : 55296 <= e && 57343 >= e ? (d += 4, ++b) : d += 3;
		}
		return d;
	}, qa = [
		null,
		[],
		[]
	], ta = (a, d, b, e) => {
		var f = {
			string: (k) => {
				var l = 0;
				if (null !== k && void 0 !== k && 0 !== k) {
					l = X(k) + 1;
					var p = Y(l);
					U(k, p, l);
					l = p;
				}
				return l;
			},
			array: (k) => {
				var l = Y(k.length);
				F.set(k, l);
				return l;
			}
		};
		a = c["_" + a];
		var g = [], h = 0;
		if (e) for (var m = 0; m < e.length; m++) {
			var x = f[b[m]];
			x ? (0 === h && (h = ra()), g[m] = x(e[m])) : g[m] = e[m];
		}
		b = a(...g);
		return b = function(k) {
			0 !== h && sa(h);
			return "string" === d ? R(k) : "boolean" === d ? !!k : k;
		}(b);
	};
	c.wasmMemory ? r = c.wasmMemory : r = new WebAssembly.Memory({
		initial: (c.INITIAL_MEMORY || 16777216) / 65536,
		maximum: 32768
	});
	K();
	c.noExitRuntime && (Q = c.noExitRuntime);
	c.print && (y = c.print);
	c.printErr && (z = c.printErr);
	c.wasmBinary && (A = c.wasmBinary);
	c.thisProgram && (t = c.thisProgram);
	if (c.preInit) for ("function" == typeof c.preInit && (c.preInit = [c.preInit]); 0 < c.preInit.length;) c.preInit.shift()();
	c.cwrap = (a, d, b, e) => {
		var f = !b || b.every((g) => "number" === g || "boolean" === g);
		return "string" !== d && f && !e ? c["_" + a] : (...g) => ta(a, d, b, g);
	};
	c.UTF8ToString = R;
	c.stringToUTF8 = (a, d, b) => U(a, d, b);
	c.lengthBytesUTF8 = X;
	var ua, sa, Y, ra, va = {
		b: (a, d, b, e) => L(`Assertion failed: ${R(a)}, at: ` + [
			d ? R(d) : "unknown filename",
			b,
			e ? R(e) : "unknown function"
		]),
		q: () => L(""),
		l: () => {
			Q = !1;
			S = 0;
		},
		m: function(a, d) {
			a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
			a = /* @__PURE__ */ new Date(1e3 * a);
			H[d >> 2] = a.getSeconds();
			H[d + 4 >> 2] = a.getMinutes();
			H[d + 8 >> 2] = a.getHours();
			H[d + 12 >> 2] = a.getDate();
			H[d + 16 >> 2] = a.getMonth();
			H[d + 20 >> 2] = a.getFullYear() - 1900;
			H[d + 24 >> 2] = a.getDay();
			var b = a.getFullYear();
			H[d + 28 >> 2] = (0 !== b % 4 || 0 === b % 100 && 0 !== b % 400 ? la : ka)[a.getMonth()] + a.getDate() - 1 | 0;
			H[d + 36 >> 2] = -(60 * a.getTimezoneOffset());
			b = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
			var e = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
			H[d + 32 >> 2] = (b != e && a.getTimezoneOffset() == Math.min(e, b)) | 0;
		},
		j: (a, d) => {
			T[a] && (clearTimeout(T[a].id), delete T[a]);
			if (!d) return 0;
			T[a] = {
				id: setTimeout(() => {
					delete T[a];
					oa(() => ua(a, performance.now()));
				}, d),
				Qa: d
			};
			return 0;
		},
		n: (a, d, b, e) => {
			var f = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(f, 0, 1).getTimezoneOffset();
			f = new Date(f, 6, 1).getTimezoneOffset();
			I[a >> 2] = 60 * Math.max(g, f);
			H[d >> 2] = Number(g != f);
			d = (h) => {
				var m = Math.abs(h);
				return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
			};
			a = d(g);
			d = d(f);
			f < g ? (U(a, b, 17), U(d, e, 17)) : (U(a, e, 17), U(d, b, 17));
		},
		p: () => Date.now(),
		k: (a) => {
			var d = G.length;
			a >>>= 0;
			if (2147483648 < a) return !1;
			for (var b = 1; 4 >= b; b *= 2) {
				var e = d * (1 + .2 / b);
				e = Math.min(e, a + 100663296);
				a: {
					e = (Math.min(2147483648, 65536 * Math.ceil(Math.max(a, e) / 65536)) - r.buffer.byteLength + 65535) / 65536 | 0;
					try {
						r.grow(e);
						K();
						var f = 1;
						break a;
					} catch (g) {}
					f = void 0;
				}
				if (f) return !0;
			}
			return !1;
		},
		e: (a, d) => {
			var b = 0, e = 0, f;
			for (f of pa()) {
				var g = d + b;
				I[a + e >> 2] = g;
				b += U(f, g, Infinity) + 1;
				e += 4;
			}
			return 0;
		},
		f: (a, d) => {
			var b = pa();
			I[a >> 2] = b.length;
			a = 0;
			for (var e of b) a += X(e) + 1;
			I[d >> 2] = a;
			return 0;
		},
		d: () => 52,
		o: function() {
			return 70;
		},
		c: (a, d, b, e) => {
			for (var f = 0, g = 0; g < b; g++) {
				var h = I[d >> 2], m = I[d + 4 >> 2];
				d += 8;
				for (var x = 0; x < m; x++) {
					var k = a, l = G[h + x], p = qa[k];
					0 === l || 10 === l ? (k = 1 === k ? y : z, l = ja(p, 0), l = ia.decode(p.buffer ? p.subarray(0, l) : new Uint8Array(p.slice(0, l))), k(l), p.length = 0) : p.push(l);
				}
				f += m;
			}
			I[e >> 2] = f;
			return 0;
		},
		a: r,
		r: na,
		s: function(a, d, b, e, f) {
			return c.callbacks.callFunction(void 0, a, d, b, e, f);
		},
		i: function(a) {
			return c.callbacks.shouldInterrupt(void 0, a);
		},
		h: function(a, d, b) {
			b = R(b);
			return c.callbacks.loadModuleSource(void 0, a, d, b);
		},
		g: function(a, d, b, e) {
			b = R(b);
			e = R(e);
			return c.callbacks.normalizeModule(void 0, a, d, b, e);
		},
		t: function(a, d) {
			c.callbacks.freeHostRef(void 0, a, d);
		}
	}, Z = await async function() {
		function a(b) {
			b = Z = b.exports;
			c._malloc = b.v;
			c._QTS_Throw = b.w;
			c._QTS_NewError = b.x;
			c._QTS_RuntimeSetMemoryLimit = b.y;
			c._QTS_RuntimeComputeMemoryUsage = b.z;
			c._QTS_RuntimeDumpMemoryUsage = b.A;
			c._QTS_RecoverableLeakCheck = b.B;
			c._QTS_BuildIsSanitizeLeak = b.C;
			c._QTS_RuntimeSetMaxStackSize = b.D;
			c._QTS_GetUndefined = b.E;
			c._QTS_GetNull = b.F;
			c._QTS_GetFalse = b.G;
			c._QTS_GetTrue = b.H;
			c._QTS_NewHostRef = b.I;
			c._QTS_GetHostRefId = b.J;
			c._QTS_NewRuntime = b.K;
			c._QTS_FreeRuntime = b.L;
			c._free = b.M;
			c._QTS_NewContext = b.N;
			c._QTS_FreeContext = b.O;
			c._QTS_FreeValuePointer = b.P;
			c._QTS_FreeValuePointerRuntime = b.Q;
			c._QTS_FreeVoidPointer = b.R;
			c._QTS_FreeCString = b.S;
			c._QTS_DupValuePointer = b.T;
			c._QTS_NewObject = b.U;
			c._QTS_NewObjectProto = b.V;
			c._QTS_NewArray = b.W;
			c._QTS_NewArrayBuffer = b.X;
			c._QTS_NewFloat64 = b.Y;
			c._QTS_GetFloat64 = b.Z;
			c._QTS_NewString = b._;
			c._QTS_GetString = b.$;
			c._QTS_GetArrayBuffer = b.aa;
			c._QTS_GetArrayBufferLength = b.ba;
			c._QTS_NewSymbol = b.ca;
			c._QTS_GetSymbolDescriptionOrKey = b.da;
			c._QTS_IsGlobalSymbol = b.ea;
			c._QTS_IsJobPending = b.fa;
			c._QTS_ExecutePendingJob = b.ga;
			c._QTS_GetProp = b.ha;
			c._QTS_GetPropNumber = b.ia;
			c._QTS_SetProp = b.ja;
			c._QTS_DefineProp = b.ka;
			c._QTS_GetOwnPropertyNames = b.la;
			c._QTS_Call = b.ma;
			c._QTS_ResolveException = b.na;
			c._QTS_Dump = b.oa;
			c._QTS_Eval = b.pa;
			c._QTS_GetModuleNamespace = b.qa;
			c._QTS_Typeof = b.ra;
			c._QTS_GetLength = b.sa;
			c._QTS_IsEqual = b.ta;
			c._QTS_GetGlobalObject = b.ua;
			c._QTS_NewPromiseCapability = b.va;
			c._QTS_PromiseState = b.wa;
			c._QTS_PromiseResult = b.xa;
			c._QTS_TestStringArg = b.ya;
			c._QTS_GetDebugLogEnabled = b.za;
			c._QTS_SetDebugLogEnabled = b.Aa;
			c._QTS_BuildIsDebug = b.Ba;
			c._QTS_BuildIsAsyncify = b.Ca;
			c._QTS_NewFunction = b.Da;
			c._QTS_ArgvGetJSValueConstPointer = b.Ea;
			c._QTS_RuntimeEnableInterruptHandler = b.Fa;
			c._QTS_RuntimeDisableInterruptHandler = b.Ga;
			c._QTS_RuntimeEnableModuleLoader = b.Ha;
			c._QTS_RuntimeDisableModuleLoader = b.Ia;
			c._QTS_bjson_encode = b.Ja;
			c._QTS_bjson_decode = b.Ka;
			ua = b.La;
			sa = b.Ma;
			Y = b.Na;
			ra = b.Oa;
			return Z;
		}
		var d = { a: va };
		if (c.instantiateWasm) return new Promise((b) => {
			c.instantiateWasm(d, (e, f) => {
				b(a(e, f));
			});
		});
		M ??= c.locateFile ? c.locateFile ? c.locateFile("emscripten-module.wasm", u) : u + "emscripten-module.wasm" : new URL("/assets/emscripten-module-uFzwHH0Y.wasm", "" + import.meta.url).href;
		return a((await ea(d)).instance);
	}();
	(function() {
		function a() {
			c.calledRun = !0;
			if (!B) {
				J = !0;
				Z.u();
				D?.(c);
				c.onRuntimeInitialized?.();
				if (c.postRun) for ("function" == typeof c.postRun && (c.postRun = [c.postRun]); c.postRun.length;) {
					var d = c.postRun.shift();
					P.push(d);
				}
				O(P);
			}
		}
		if (c.preRun) for ("function" == typeof c.preRun && (c.preRun = [c.preRun]); c.preRun.length;) ha();
		O(fa);
		c.setStatus ? (c.setStatus("Running..."), setTimeout(() => {
			setTimeout(() => c.setStatus(""), 1);
			a();
		}, 1)) : a();
	})();
	J ? moduleRtn = c : moduleRtn = new Promise((a, d) => {
		D = a;
		E = d;
	});
	return moduleRtn;
}
//#endregion
export { QuickJSRaw as default };
