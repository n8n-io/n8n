async function createPcre2WrapperModule(moduleArg = {}) {
	var Module = moduleArg;
	var { createRequire: aa } = await import('node:module'),
		ba = aa(import.meta.url),
		n = (a, b) => {
			throw b;
		},
		ca = import.meta.url,
		da = '',
		ea,
		fa,
		ha = ba('node:fs');
	ca.startsWith('file:') && (da = ba('node:path').dirname(ba('node:url').fileURLToPath(ca)) + '/');
	fa = (a) => {
		a = ia(a) ? new URL(a) : a;
		return ha.readFileSync(a);
	};
	ea = async (a) => {
		a = ia(a) ? new URL(a) : a;
		return ha.readFileSync(a, void 0);
	};
	process.argv.slice(2);
	n = (a, b) => {
		process.exitCode = a;
		throw b;
	};
	console.log.bind(console);
	var ja = console.error.bind(console),
		q = !1,
		ka,
		ia = (a) => a.startsWith('file://');
	function la() {
		if (!v?.buffer?.resizable) {
			var a = w.buffer;
			v = new Int8Array(a);
			z = new Int16Array(a);
			A = new Uint8Array(a);
			C = new Uint16Array(a);
			D = new Int32Array(a);
			E = new Uint32Array(a);
			ma = new Float32Array(a);
			na = new Float64Array(a);
			oa = new BigInt64Array(a);
			pa = new BigUint64Array(a);
		}
	}
	function qa() {
		var a = Module.preRun;
		a && (typeof a == 'function' && (a = [a]), ra.push(...a));
		for (a = ra; a.length > 0; ) a.shift()(Module);
	}
	function sa() {
		var a = Module.postRun;
		a && (typeof a == 'function' && (a = [a]), ta.push(...a));
		for (a = ta; a.length > 0; ) a.shift()(Module);
	}
	function ua(a) {
		Module.onAbort?.(a);
		a = `Aborted(${a})`;
		ja(a);
		q = !0;
		throw new WebAssembly.RuntimeError(a + '. Build with -sASSERTIONS for more info.');
	}
	var va;
	async function wa(a) {
		try {
			var b = await ea(a);
			return new Uint8Array(b);
		} catch {}
		if (fa) a = fa(a);
		else throw 'both async and sync fetching of the wasm failed';
		return a;
	}
	async function ya(a) {
		var b = va;
		try {
			var c = await wa(b);
			return await WebAssembly.instantiate(c, a);
		} catch (d) {
			ja(`failed to asynchronously prepare wasm: ${d}`), ua(d);
		}
	}
	async function za(a) {
		return ya(a);
	}
	class Aa {
		name = 'ExitStatus';
		constructor(a) {
			this.message = `Program terminated with exit(${a})`;
			this.status = a;
		}
	}
	var v,
		ta = [],
		ra = [],
		F = !0,
		Ba = [],
		Da = (a) => {
			var b = Ba[a];
			b || (Ba[a] = b = Ca.get(a));
			return b;
		},
		G = {},
		Ea = (a) => {
			for (; a.length; ) {
				var b = a.pop();
				a.pop()(b);
			}
		},
		E;
	function H(a) {
		return this.M(E[a >> 2]);
	}
	var I = {},
		J = {},
		K = {};
	class L extends Error {
		constructor(a) {
			super(a);
			this.name = 'InternalError';
		}
	}
	var N = (a, b, c) => {
			function d(g) {
				g = c(g);
				if (g.length !== a.length) throw new L('Mismatched type converter count');
				for (var k = 0; k < a.length; ++k) M(a[k], g[k]);
			}
			a.forEach((g) => (K[g] = b));
			var e = Array(b.length),
				f = [],
				h = 0;
			for (let [g, k] of b.entries())
				J.hasOwnProperty(k)
					? (e[g] = J[k])
					: (f.push(k),
						I.hasOwnProperty(k) || (I[k] = []),
						I[k].push(() => {
							e[g] = J[k];
							++h;
							h === f.length && d(e);
						}));
			0 === f.length && d(e);
		},
		A,
		O = (a) => {
			for (var b = ''; ; ) {
				var c = A[a++];
				if (!c) return b;
				b += String.fromCharCode(c);
			}
		};
	class R extends Error {
		constructor(a) {
			super(a);
			this.name = 'BindingError';
		}
	}
	var Fa = (a) => {
		throw new R(a);
	};
	function Ga(a, b, c = {}) {
		var d = b.name;
		if (!a) throw new R(`type "${d}" must have a positive integer typeid pointer`);
		if (J.hasOwnProperty(a)) {
			if (c.ya) return;
			throw new R(`Cannot register type '${d}' twice`);
		}
		J[a] = b;
		delete K[a];
		I.hasOwnProperty(a) && ((b = I[a]), delete I[a], b.forEach((e) => e()));
	}
	function M(a, b, c = {}) {
		return Ga(a, b, c);
	}
	var z,
		C,
		D,
		oa,
		pa,
		Ha = (a, b, c) => {
			switch (b) {
				case 1:
					return c ? (d) => v[d] : (d) => A[d];
				case 2:
					return c ? (d) => z[d >> 1] : (d) => C[d >> 1];
				case 4:
					return c ? (d) => D[d >> 2] : (d) => E[d >> 2];
				case 8:
					return c ? (d) => oa[d >> 3] : (d) => pa[d >> 3];
				default:
					throw new TypeError(`invalid integer width (${b}): ${a}`);
			}
		},
		Ia = (a) => {
			throw new R(a.K.O.L.name + ' instance already deleted');
		},
		Ja = !1,
		Ka = () => {},
		S = (a) => {
			if (!globalThis.FinalizationRegistry) return (S = (b) => b), a;
			Ja = new FinalizationRegistry((b) => {
				b = b.K;
				--b.count.value;
				0 === b.count.value && (b.S ? b.V.W(b.S) : b.O.L.W(b.N));
			});
			S = (b) => {
				var c = b.K;
				c.S && Ja.register(b, { K: c }, b);
				return b;
			};
			Ka = (b) => {
				Ja.unregister(b);
			};
			return S(a);
		},
		La = [];
	function T() {}
	var U = (a, b) => Object.defineProperty(b, 'name', { value: a }),
		Ma = {},
		Na = (a, b, c) => {
			if (void 0 === a[b].X) {
				var d = a[b];
				a[b] = function (...e) {
					if (!a[b].X.hasOwnProperty(e.length))
						throw new R(
							`Function '${c}' called with an invalid number of arguments (${e.length}) - expects one of (${a[b].X})!`,
						);
					return a[b].X[e.length].apply(this, e);
				};
				a[b].X = [];
				a[b].X[d.Y] = d;
			}
		},
		Oa = (a, b) => {
			if (Module.hasOwnProperty(a)) throw new R(`Cannot register public name '${a}' twice`);
			Module[a] = b;
			Module[a].Y = void 0;
		},
		Pa = (a) => {
			a = a.replace(/[^a-zA-Z0-9_]/g, '$');
			var b = a.charCodeAt(0);
			return b >= 48 && b <= 57 ? `_${a}` : a;
		};
	function Qa(a, b, c, d, e, f, h, g) {
		this.name = a;
		this.constructor = b;
		this.$ = c;
		this.W = d;
		this.T = e;
		this.ta = f;
		this.da = h;
		this.ra = g;
		this.Aa = [];
	}
	var Ra = (a, b, c) => {
			for (; b !== c; ) {
				if (!b.da)
					throw new R(`Expected null or instance of ${c.name}, got an instance of ${b.name}`);
				a = b.da(a);
				b = b.T;
			}
			return a;
		},
		Sa = (a) => {
			if (a === null) return 'null';
			var b = typeof a;
			return b === 'object' || b === 'array' || b === 'function' ? a.toString() : '' + a;
		};
	function Ta(a, b) {
		if (b === null) {
			if (this.ga) throw new R(`null is not a valid ${this.name}`);
			return 0;
		}
		if (!b.K) throw new R(`Cannot pass "${Sa(b)}" as a ${this.name}`);
		if (!b.K.N) throw new R(`Cannot pass deleted object as a pointer of type ${this.name}`);
		return Ra(b.K.N, b.K.O.L, this.L);
	}
	function Ua(a, b) {
		if (b === null) {
			if (this.ga) throw new R(`null is not a valid ${this.name}`);
			if (this.fa) {
				var c = this.ia();
				a !== null && a.push(this.W, c);
				return c;
			}
			return 0;
		}
		if (!b || !b.K) throw new R(`Cannot pass "${Sa(b)}" as a ${this.name}`);
		if (!b.K.N) throw new R(`Cannot pass deleted object as a pointer of type ${this.name}`);
		if (!this.ea && b.K.O.ea)
			throw new R(
				`Cannot convert argument of type ${b.K.V ? b.K.V.name : b.K.O.name} to parameter type ${this.name}`,
			);
		c = Ra(b.K.N, b.K.O.L, this.L);
		if (this.fa) {
			if (void 0 === b.K.S) throw new R('Passing raw pointer to smart pointer is illegal');
			switch (this.Fa) {
				case 0:
					if (b.K.V === this) c = b.K.S;
					else
						throw new R(
							`Cannot convert argument of type ${b.K.V ? b.K.V.name : b.K.O.name} to parameter type ${this.name}`,
						);
					break;
				case 1:
					c = b.K.S;
					break;
				case 2:
					if (b.K.V === this) c = b.K.S;
					else {
						var d = b.clone();
						c = this.Ba(
							c,
							Va(() => d['delete']()),
						);
						a !== null && a.push(this.W, c);
					}
					break;
				default:
					throw new R('Unsupported sharing policy');
			}
		}
		return c;
	}
	function Wa(a, b) {
		if (b === null) {
			if (this.ga) throw new R(`null is not a valid ${this.name}`);
			return 0;
		}
		if (!b.K) throw new R(`Cannot pass "${Sa(b)}" as a ${this.name}`);
		if (!b.K.N) throw new R(`Cannot pass deleted object as a pointer of type ${this.name}`);
		if (b.K.O.ea)
			throw new R(`Cannot convert argument of type ${b.K.O.name} to parameter type ${this.name}`);
		return Ra(b.K.N, b.K.O.L, this.L);
	}
	var Xa = (a, b, c) => {
			if (b === c) return a;
			if (void 0 === c.T) return null;
			a = Xa(a, b, c.T);
			return a === null ? null : c.ra(a);
		},
		Ya = {},
		Za = (a, b) => {
			if (b === void 0) throw new R('ptr should not be undefined');
			for (; a.T; ) (b = a.da(b)), (a = a.T);
			return Ya[b];
		},
		$a = (a, b) => {
			if (!b.O || !b.N) throw new L('makeClassHandle requires ptr and ptrType');
			if (!!b.V !== !!b.S) throw new L('Both smartPtrType and smartPtr must be specified');
			b.count = { value: 1 };
			return S(Object.create(a, { K: { value: b, writable: !0 } }));
		};
	function ab(a, b, c, d, e, f, h, g, k, l, m) {
		this.name = a;
		this.L = b;
		this.ga = c;
		this.ea = d;
		this.fa = e;
		this.za = f;
		this.Fa = h;
		this.na = g;
		this.ia = k;
		this.Ba = l;
		this.W = m;
		e || b.T !== void 0 ? (this.P = Ua) : ((this.P = d ? Ta : Wa), (this.R = null));
	}
	var bb = (a, b) => {
			if (!Module.hasOwnProperty(a)) throw new L('Replacing nonexistent public symbol');
			Module[a] = b;
			Module[a].Y = void 0;
		},
		V = (a, b) => {
			a = O(a);
			var c = Da(b);
			if (typeof c != 'function') throw new R(`unknown function pointer with signature ${a}: ${b}`);
			return c;
		};
	class cb extends Error {}
	var eb = (a) => {
			a = db(a);
			var b = O(a);
			W(a);
			return b;
		},
		gb = (a, b) => {
			function c(f) {
				e[f] || J[f] || (K[f] ? K[f].forEach(c) : (d.push(f), (e[f] = !0)));
			}
			var d = [],
				e = {};
			b.forEach(c);
			throw new cb(`${a}: ` + d.map(eb).join([', ']));
		},
		hb = (a, b) => {
			for (var c = [], d = 0; d < a; d++) c.push(E[(b + d * 4) >> 2]);
			return c;
		};
	function ib(a) {
		for (var b = 1; b < a.length; ++b) if (a[b] !== null && a[b].R === void 0) return !0;
		return !1;
	}
	function jb(a, b, c, d, e, f) {
		var h = b.length;
		if (h < 2)
			throw new R(
				'argTypes array size mismatch! Must at least get return value and receiver (this) types!',
			);
		var g = b[1] !== null && c !== null,
			k = ib(b);
		c = !b[0].ma;
		var l = b[0],
			m = b[1];
		d = [a, Fa, d, e, Ea, l.M.bind(l), m?.P.bind(m)];
		for (e = 2; e < h; ++e) (l = b[e]), d.push(l.P.bind(l));
		if (!k) for (e = g ? 1 : 2; e < b.length; ++e) b[e].R !== null && d.push(b[e].R);
		k = ib(b);
		e = b.length - 2;
		m = [];
		l = ['fn'];
		g && l.push('thisWired');
		for (h = 0; h < e; ++h) m.push(`arg${h}`), l.push(`arg${h}Wired`);
		m = m.join();
		l = l.join();
		m = `return function (${m}) {\n`;
		k && (m += 'var destructors = [];\n');
		var t = k ? 'destructors' : 'null',
			p =
				'humanName throwBindingError invoker fn runDestructors fromRetWire toClassParamWire'.split(
					' ',
				);
		g && (m += `var thisWired = toClassParamWire(${t}, this);\n`);
		for (h = 0; h < e; ++h) {
			var r = `toArg${h}Wire`;
			m += `var arg${h}Wired = ${r}(${t}, arg${h});\n`;
			p.push(r);
		}
		m += (c || f ? 'var rv = ' : '') + `invoker(${l});\n`;
		if (k) m += 'runDestructors(destructors);\n';
		else
			for (h = g ? 1 : 2; h < b.length; ++h)
				(f = h === 1 ? 'thisWired' : `arg${h - 2}Wired`),
					b[h].R !== null && ((m += `${f}_dtor(${f});\n`), p.push(`${f}_dtor`));
		c && (m += 'var ret = fromRetWire(rv);\nreturn ret;\n');
		b = new Function(p, m + '}\n')(...d);
		return U(a, b);
	}
	var kb = (a) => {
			a = a.trim();
			var b = a.indexOf('(');
			return b === -1 ? a : a.slice(0, b);
		},
		lb = [],
		X = [0, 1, , 1, null, 1, !0, 1, !1, 1],
		mb = (a) => {
			a > 9 && 0 === --X[a + 1] && ((X[a] = void 0), lb.push(a));
		},
		nb = (a) => {
			if (!a) throw new R(`Cannot use deleted val. handle = ${a}`);
			return X[a];
		},
		Va = (a) => {
			switch (a) {
				case void 0:
					return 2;
				case null:
					return 4;
				case !0:
					return 6;
				case !1:
					return 8;
				default:
					let b = lb.pop() || X.length;
					X[b] = a;
					X[b + 1] = 1;
					return b;
			}
		},
		ob = {
			name: 'emscripten::val',
			M: (a) => {
				var b = nb(a);
				mb(a);
				return b;
			},
			P: (a, b) => Va(b),
			U: H,
			R: null,
		},
		pb = (a, b, c) => {
			switch (b) {
				case 1:
					return c
						? function (d) {
								return this.M(v[d]);
							}
						: function (d) {
								return this.M(A[d]);
							};
				case 2:
					return c
						? function (d) {
								return this.M(z[d >> 1]);
							}
						: function (d) {
								return this.M(C[d >> 1]);
							};
				case 4:
					return c
						? function (d) {
								return this.M(D[d >> 2]);
							}
						: function (d) {
								return this.M(E[d >> 2]);
							};
				default:
					throw new TypeError(`invalid integer width (${b}): ${a}`);
			}
		},
		qb = (a, b) => {
			var c = J[a];
			if (void 0 === c) throw ((a = `${b} has unknown type ${eb(a)}`), new R(a));
			return c;
		},
		ma,
		na,
		rb = (a, b) => {
			switch (b) {
				case 4:
					return function (c) {
						return this.M(ma[c >> 2]);
					};
				case 8:
					return function (c) {
						return this.M(na[c >> 3]);
					};
				default:
					throw new TypeError(`invalid float width (${b}): ${a}`);
			}
		},
		sb = (a, b, c) => {
			var d = (e, f) => {
				var h = 0;
				return {
					next() {
						if (h >= e) return { done: !0 };
						var g = h;
						h++;
						return { value: f(g), done: !1 };
					},
					[Symbol.iterator]() {
						return this;
					},
				};
			};
			a[Symbol.iterator] ||
				(a[Symbol.iterator] = function () {
					var e = this[b]();
					return d(e, (f) => this[c](f));
				});
		},
		tb = Object.assign({ optional: !0 }, ob),
		ub = globalThis.TextDecoder && new TextDecoder(),
		vb = (a, b, c, d) => {
			c = b + c;
			if (d) return c;
			for (; a[b] && !(b >= c); ) ++b;
			return b;
		},
		wb = (a = 0, b) => {
			var c = A;
			b = vb(c, a, b, !0);
			if (b - a > 16 && c.buffer && ub) return ub.decode(c.subarray(a, b));
			for (var d = ''; a < b; ) {
				var e = c[a++];
				if (e & 128) {
					var f = c[a++] & 63;
					if ((e & 224) == 192) d += String.fromCharCode(((e & 31) << 6) | f);
					else {
						var h = c[a++] & 63;
						e =
							(e & 240) == 224
								? ((e & 15) << 12) | (f << 6) | h
								: ((e & 7) << 18) | (f << 12) | (h << 6) | (c[a++] & 63);
						e < 65536
							? (d += String.fromCharCode(e))
							: ((e -= 65536), (d += String.fromCharCode(55296 | (e >> 10), 56320 | (e & 1023))));
					}
				} else d += String.fromCharCode(e);
			}
			return d;
		},
		xb = globalThis.TextDecoder ? new TextDecoder('utf-16le') : void 0,
		yb = (a, b, c) => {
			a >>= 1;
			b = vb(C, a, b / 2, c);
			if (b - a > 16 && xb) return xb.decode(C.subarray(a, b));
			for (c = ''; a < b; ++a) c += String.fromCharCode(C[a]);
			return c;
		},
		zb = (a, b, c = 2147483647) => {
			if (c < 2) return 0;
			c -= 2;
			var d = b;
			c = c < a.length * 2 ? c / 2 : a.length;
			for (var e = 0; e < c; ++e) (z[b >> 1] = a.charCodeAt(e)), (b += 2);
			z[b >> 1] = 0;
			return b - d;
		},
		Ab = (a) => a.length * 2,
		Bb = (a, b, c) => {
			var d = '';
			a >>= 2;
			for (var e = 0; !(e >= b / 4); e++) {
				var f = E[a + e];
				if (!f && !c) break;
				d += String.fromCodePoint(f);
			}
			return d;
		},
		Cb = (a, b, c = 2147483647) => {
			if (c < 4) return 0;
			var d = b;
			c = d + c - 4;
			for (var e = 0; e < a.length; ++e) {
				var f = a.codePointAt(e);
				f > 65535 && e++;
				D[b >> 2] = f;
				b += 4;
				if (b + 4 > c) break;
			}
			D[b >> 2] = 0;
			return b - d;
		},
		Db = (a) => {
			for (var b = 0, c = 0; c < a.length; ++c) a.codePointAt(c) > 65535 && c++, (b += 4);
			return b;
		},
		Eb = 0,
		Fb = [],
		Gb = (a) => {
			var b = Fb.length;
			Fb.push(a);
			return b;
		},
		Hb = (a, b) => {
			for (var c = Array(a), d = 0; d < a; ++d) c[d] = qb(E[(b + d * 4) >> 2], `parameter ${d}`);
			return c;
		},
		Ib = (a, b, c) => {
			var d = [];
			a = a(d, c);
			d.length && (E[b >> 2] = Va(d));
			return a;
		},
		Jb = {},
		Kb = (a) => {
			var b = Jb[a];
			return b === void 0 ? O(a) : b;
		},
		Y = {},
		Lb = (a) => {
			ka = a;
			F || Eb > 0 || (Module.onExit?.(a), (q = !0));
			n(a, new Aa(a));
		},
		Mb = (a) => {
			if (!q)
				try {
					a();
				} catch (b) {
					b instanceof Aa || b == 'unwind' || n(1, b);
				} finally {
					if (!(F || Eb > 0))
						try {
							(ka = a = ka), Lb(a);
						} catch (b) {
							b instanceof Aa || b == 'unwind' || n(1, b);
						}
				}
		};
	(() => {
		var a = T.prototype;
		Object.assign(a, {
			isAliasOf: function (c) {
				if (!(this instanceof T && c instanceof T)) return !1;
				var d = this.K.O.L,
					e = this.K.N;
				c.K = c.K;
				var f = c.K.O.L;
				for (c = c.K.N; d.T; ) (e = d.da(e)), (d = d.T);
				for (; f.T; ) (c = f.da(c)), (f = f.T);
				return d === f && e === c;
			},
			clone: function () {
				this.K.N || Ia(this);
				if (this.K.ba) return (this.K.count.value += 1), this;
				var c = S,
					d = Object,
					e = d.create,
					f = Object.getPrototypeOf(this),
					h = this.K;
				c = c(
					e.call(d, f, {
						K: { value: { count: h.count, aa: h.aa, ba: h.ba, N: h.N, O: h.O, S: h.S, V: h.V } },
					}),
				);
				c.K.count.value += 1;
				c.K.aa = !1;
				return c;
			},
			['delete']() {
				this.K.N || Ia(this);
				if (this.K.aa && !this.K.ba) throw new R('Object already scheduled for deletion');
				Ka(this);
				var c = this.K;
				--c.count.value;
				0 === c.count.value && (c.S ? c.V.W(c.S) : c.O.L.W(c.N));
				this.K.ba || ((this.K.S = void 0), (this.K.N = void 0));
			},
			isDeleted: function () {
				return !this.K.N;
			},
			deleteLater: function () {
				this.K.N || Ia(this);
				if (this.K.aa && !this.K.ba) throw new R('Object already scheduled for deletion');
				La.push(this);
				this.K.aa = !0;
				return this;
			},
		});
		var b = Symbol.dispose;
		b && (a[b] = a['delete']);
	})();
	Object.assign(ab.prototype, {
		ua(a) {
			this.na && (a = this.na(a));
			return a;
		},
		ka(a) {
			this.W?.(a);
		},
		U: H,
		M: function (a) {
			function b() {
				return this.fa
					? $a(this.L.$, { O: this.za, N: c, V: this, S: a })
					: $a(this.L.$, { O: this, N: a });
			}
			var c = this.ua(a);
			if (!c) return this.ka(a), null;
			var d = Za(this.L, c);
			if (void 0 !== d) {
				if (0 === d.K.count.value) return (d.K.N = c), (d.K.S = a), d.clone();
				d = d.clone();
				this.ka(a);
				return d;
			}
			d = this.L.ta(c);
			d = Ma[d];
			if (!d) return b.call(this);
			d = this.ea ? d.qa : d.pointerType;
			var e = Xa(c, this.L, d.L);
			return e === null
				? b.call(this)
				: this.fa
					? $a(d.L.$, { O: d, N: e, V: this, S: a })
					: $a(d.L.$, { O: d, N: e });
		},
	});
	Module.noExitRuntime && (F = Module.noExitRuntime);
	Module.printErr && (ja = Module.printErr);
	var Z = Module.preInit;
	if (Z) for (typeof Z == 'function' && (Module.preInit = Z = [Z]); Z.length > 0; ) Z.shift()();
	var db,
		Nb,
		W,
		Ob,
		w,
		Ca,
		Pb = {
			u: (a, b) => Da(a)(b),
			x: () => ua(''),
			k: (a) => {
				var b = G[a];
				delete G[a];
				var c = b.ia,
					d = b.W,
					e = b.la,
					f = e.map((h) => h.xa).concat(e.map((h) => h.Da));
				N([a], f, (h) => {
					var g = {},
						k,
						l;
					for ([k, l] of e.entries()) {
						let m = h[k],
							t = l.va,
							p = l.wa,
							r = h[k + e.length],
							u = l.Ca,
							y = l.Ea;
						g[l.sa] = {
							read: (B) => m.M(t(p, B)),
							write: (B, P) => {
								var x = [];
								u(y, B, r.P(x, P));
								Ea(x);
							},
							optional: m.optional,
						};
					}
					return [
						{
							name: b.name,
							M: (m) => {
								var t = {},
									p;
								for (p in g) t[p] = g[p].read(m);
								d(m);
								return t;
							},
							P: (m, t) => {
								for (var p in g)
									if (!(p in t || g[p].optional)) throw new TypeError(`Missing field: "${p}"`);
								var r = c();
								for (p in g) g[p].write(r, t[p]);
								m !== null && m.push(d, r);
								return r;
							},
							U: H,
							R: d,
						},
					];
				});
			},
			r: (a, b, c, d, e) => {
				b = O(b);
				d = d === 0n;
				var f = (h) => h;
				if (d) {
					let h = c * 8;
					f = (g) => BigInt.asUintN(h, g);
					e = f(e);
				}
				M(a, {
					name: b,
					M: f,
					P: (h, g) => {
						typeof g == 'number' && (g = BigInt(g));
						return g;
					},
					U: Ha(b, c, !d),
					R: null,
				});
			},
			A: (a, b, c, d) => {
				b = O(b);
				M(a, {
					name: b,
					M: function (e) {
						return !!e;
					},
					P: function (e, f) {
						return f ? c : d;
					},
					U: function (e) {
						return this.M(A[e]);
					},
					R: null,
				});
			},
			h: (a, b, c, d, e, f, h, g, k, l, m, t, p) => {
				m = O(m);
				f = V(e, f);
				g &&= V(h, g);
				l &&= V(k, l);
				p = V(t, p);
				var r = Pa(m);
				Oa(r, function () {
					gb(`Cannot construct ${m} due to unbound types`, [d]);
				});
				N([a, b, c], d ? [d] : [], (u) => {
					u = u[0];
					if (d) {
						var y = u.L;
						var B = y.$;
					} else B = T.prototype;
					u = U(m, function (...xa) {
						if (Object.getPrototypeOf(this) !== P) throw new R(`Use 'new' to construct ${m}`);
						if (void 0 === x.Z) throw new R(`${m} has no accessible constructor`);
						var fb = x.Z[xa.length];
						if (void 0 === fb)
							throw new R(
								`Tried to invoke ctor of ${m} with invalid number of parameters (${xa.length}) - expected (${Object.keys(x.Z).toString()}) parameters instead!`,
							);
						return fb.apply(this, xa);
					});
					var P = Object.create(B, { constructor: { value: u } });
					u.prototype = P;
					var x = new Qa(m, u, P, p, y, f, g, l);
					if (x.T) {
						var Q;
						(Q = x.T).ja ?? (Q.ja = []);
						x.T.ja.push(x);
					}
					y = new ab(m, x, !0, !1, !1);
					Q = new ab(m + '*', x, !1, !1, !1);
					B = new ab(m + ' const*', x, !1, !0, !1);
					Ma[a] = { pointerType: Q, qa: B };
					bb(r, u);
					return [y, Q, B];
				});
			},
			g: (a, b, c, d, e, f) => {
				var h = hb(b, c);
				e = V(d, e);
				N([], [a], (g) => {
					g = g[0];
					var k = `constructor ${g.name}`;
					void 0 === g.L.Z && (g.L.Z = []);
					if (void 0 !== g.L.Z[b - 1])
						throw new R(
							`Cannot register multiple constructors with identical number of parameters (${b - 1}) for class '${g.name}'! Overload resolution is currently only performed using the parameter count, not actual type info!`,
						);
					g.L.Z[b - 1] = () => {
						gb(`Cannot construct ${g.name} due to unbound types`, h);
					};
					N([], h, (l) => {
						l.splice(1, 0, null);
						g.L.Z[b - 1] = jb(k, l, null, e, f);
						return [];
					});
					return [];
				});
			},
			b: (a, b, c, d, e, f, h, g, k) => {
				var l = hb(c, d);
				b = O(b);
				b = kb(b);
				f = V(e, f);
				N([], [a], (m) => {
					function t() {
						gb(`Cannot call ${p} due to unbound types`, l);
					}
					m = m[0];
					var p = `${m.name}.${b}`;
					b.startsWith('@@') && (b = Symbol[b.substring(2)]);
					g && m.L.Aa.push(b);
					var r = m.L.$,
						u = r[b];
					void 0 === u || (void 0 === u.X && u.className !== m.name && u.Y === c - 2)
						? ((t.Y = c - 2), (t.className = m.name), (r[b] = t))
						: (Na(r, b, p), (r[b].X[c - 2] = t));
					N([], l, (y) => {
						y = jb(p, y, m, f, h, k);
						void 0 === r[b].X ? ((y.Y = c - 2), (r[b] = y)) : (r[b].X[c - 2] = y);
						return [];
					});
					return [];
				});
			},
			f: (a, b, c) => {
				a = O(a);
				N([], [b], (d) => {
					d = d[0];
					Module[a] = d.M(c);
					return [];
				});
			},
			y: (a) => M(a, ob),
			C: (a, b, c, d, e) => {
				b = O(b);
				e = e ? (e === 1 ? 'number' : 'string') : 'object';
				switch (e) {
					case 'object':
						function h() {}
						h.values = {};
						M(a, {
							name: b,
							constructor: h,
							valueType: e,
							M: function (g) {
								return this.constructor.values[g];
							},
							P: (g, k) => k.value,
							U: pb(b, c, d),
							R: null,
						});
						Oa(b, h);
						break;
					case 'number':
						var f = {};
						M(a, {
							name: b,
							ha: f,
							valueType: e,
							M: (g) => g,
							P: (g, k) => k,
							U: pb(b, c, d),
							R: null,
						});
						Oa(b, f);
						delete Module[b].Y;
						break;
					case 'string':
						(f = {}),
							M(a, {
								name: b,
								pa: {},
								oa: {},
								ha: f,
								valueType: e,
								M: function (g) {
									return this.oa[g];
								},
								P: function (g, k) {
									return this.pa[k];
								},
								U: pb(b, c, d),
								R: null,
							}),
							Oa(b, f),
							delete Module[b].Y;
				}
			},
			e: (a, b, c) => {
				var d = qb(a, 'enum');
				b = O(b);
				switch (d.valueType) {
					case 'object':
						a = d.constructor;
						d = Object.create(d.constructor.prototype, {
							value: { value: c },
							constructor: { value: U(`${d.name}_${b}`, function () {}) },
						});
						a.values[c] = d;
						a[b] = d;
						break;
					case 'number':
						d.ha[b] = c;
						break;
					case 'string':
						(d.pa[b] = c), (d.oa[c] = b), (d.ha[b] = b);
				}
			},
			q: (a, b, c) => {
				b = O(b);
				M(a, { name: b, M: (d) => d, P: (d, e) => e, U: rb(b, c), R: null });
			},
			d: (a, b, c, d, e) => {
				b = O(b);
				var f = (g) => g;
				if (d === 0) {
					var h = 32 - 8 * c;
					f = (g) => (g << h) >>> h;
					e = f(e);
				}
				M(a, { name: b, M: f, P: (g, k) => k, U: Ha(b, c, d !== 0), R: null });
			},
			n: (a, b, c, d) => {
				c = O(c);
				d = O(d);
				N([], [a, b], (e) => {
					sb(e[0].L.$, c, d);
					return [];
				});
			},
			a: (a, b, c) => {
				function d(f) {
					return new e(v.buffer, E[(f + 4) >> 2], E[f >> 2]);
				}
				var e = [
					Int8Array,
					Uint8Array,
					Int16Array,
					Uint16Array,
					Int32Array,
					Uint32Array,
					Float32Array,
					Float64Array,
					BigInt64Array,
					BigUint64Array,
				][b];
				c = O(c);
				M(a, { name: c, M: d, U: d }, { ya: !0 });
			},
			j: (a) => {
				M(a, tb);
			},
			z: (a, b) => {
				b = O(b);
				M(a, {
					name: b,
					M(c) {
						var d = (d = c + 4) ? wb(d, E[c >> 2]) : '';
						W(c);
						return d;
					},
					P(c, d) {
						d instanceof ArrayBuffer && (d = new Uint8Array(d));
						var e,
							f = typeof d == 'string';
						if (!(f || (ArrayBuffer.isView(d) && d.BYTES_PER_ELEMENT == 1)))
							throw new R('Cannot pass non-string to std::string');
						var h;
						if (f)
							for (e = h = 0; e < d.length; ++e) {
								var g = d.charCodeAt(e);
								g <= 127
									? h++
									: g <= 2047
										? (h += 2)
										: g >= 55296 && g <= 57343
											? ((h += 4), ++e)
											: (h += 3);
							}
						else h = d.length;
						e = h;
						h = Nb(4 + e + 1);
						g = h + 4;
						E[h >> 2] = e;
						if (f) {
							if (((f = g), (g = e + 1), (e = A), g > 0)) {
								g = f + g - 1;
								for (var k = 0; k < d.length; ++k) {
									var l = d.codePointAt(k);
									if (l <= 127) {
										if (f >= g) break;
										e[f++] = l;
									} else if (l <= 2047) {
										if (f + 1 >= g) break;
										e[f++] = 192 | (l >> 6);
										e[f++] = 128 | (l & 63);
									} else if (l <= 65535) {
										if (f + 2 >= g) break;
										e[f++] = 224 | (l >> 12);
										e[f++] = 128 | ((l >> 6) & 63);
										e[f++] = 128 | (l & 63);
									} else {
										if (f + 3 >= g) break;
										e[f++] = 240 | (l >> 18);
										e[f++] = 128 | ((l >> 12) & 63);
										e[f++] = 128 | ((l >> 6) & 63);
										e[f++] = 128 | (l & 63);
										k++;
									}
								}
								e[f] = 0;
							}
						} else A.set(d, g);
						c !== null && c.push(W, h);
						return h;
					},
					U: H,
					R(c) {
						W(c);
					},
				});
			},
			m: (a, b, c) => {
				c = O(c);
				if (b === 2) {
					var d = yb;
					var e = zb;
					var f = Ab;
				} else (d = Bb), (e = Cb), (f = Db);
				M(a, {
					name: c,
					M: (h) => {
						var g = d(h + 4, E[h >> 2] * b, !0);
						W(h);
						return g;
					},
					P: (h, g) => {
						if (typeof g != 'string') throw new R(`Cannot pass non-string to C++ string type ${c}`);
						var k = f(g),
							l = Nb(4 + k + b);
						E[l >> 2] = k / b;
						e(g, l + 4, k + b);
						h !== null && h.push(W, l);
						return l;
					},
					U: H,
					R(h) {
						W(h);
					},
				});
			},
			l: (a, b, c, d, e, f) => {
				G[a] = { name: O(b), ia: V(c, d), W: V(e, f), la: [] };
			},
			c: (a, b, c, d, e, f, h, g, k, l) => {
				G[a].la.push({ sa: O(b), xa: c, va: V(d, e), wa: f, Da: h, Ca: V(g, k), Ea: l });
			},
			B: (a, b) => {
				b = O(b);
				M(a, { ma: !0, name: b, M: () => {}, P: () => {} });
			},
			w: () => {
				F = !1;
				Eb = 0;
			},
			i: (a, b, c) => {
				var d;
				[b, ...d] = Hb(a, b);
				var e = b.P.bind(b),
					f = d.map((k) => k.U.bind(k));
				a--;
				var h = { toValue: nb };
				a = f.map((k, l) => {
					var m = `argFromPtr${l}`;
					h[m] = k;
					return `${m}(args${l ? '+' + l * 8 : ''})`;
				});
				switch (c) {
					case 0:
						var g = 'toValue(handle)';
						break;
					case 2:
						g = 'new (toValue(handle))';
						break;
					case 3:
						g = '';
						break;
					case 1:
						(h.getStringOrSymbol = Kb), (g = 'toValue(handle)[getStringOrSymbol(methodName)]');
				}
				g += `(${a})`;
				b.ma ||
					((h.toReturnWire = e),
					(h.emval_returnValue = Ib),
					(g = `return emval_returnValue(toReturnWire, destructorsRef, ${g})`));
				g = `return function (handle, methodName, destructorsRef, args) {\n${g}\n}`;
				c = new Function(Object.keys(h), g)(...Object.values(h));
				b = `methodCaller<(${d.map((k) => k.name)}) => ${b.name}>`;
				return Gb(U(b, c));
			},
			p: (a, b, c, d, e) => Fb[a](b, c, d, e),
			o: (a) => {
				var b = nb(a);
				Ea(b);
				mb(a);
			},
			s: (a, b) => {
				Y[a] && (clearTimeout(Y[a].id), delete Y[a]);
				if (!b) return 0;
				var c = setTimeout(() => {
					delete Y[a];
					Mb(() => Ob(a, performance.now()));
				}, b);
				Y[a] = { id: c, Ga: b };
				return 0;
			},
			t: (a) => {
				var b = A.length;
				a >>>= 0;
				if (a > 2147483648) return !1;
				for (var c = 1; c <= 4; c *= 2) {
					var d = b * (1 + 0.2 / c);
					d = Math.min(d, a + 100663296);
					a: {
						d =
							((Math.min(2147483648, Math.ceil(Math.max(a, d) / 65536) * 65536) -
								w.buffer.byteLength +
								65535) /
								65536) |
							0;
						try {
							w.grow(d);
							la();
							var e = 1;
							break a;
						} catch (f) {}
						e = void 0;
					}
					if (e) return !0;
				}
				return !1;
			},
			v: Lb,
		},
		Qb;
	Qb = await (async function () {
		function a(d) {
			d = Qb = d.exports;
			db = d.F;
			Nb = d.G;
			W = d.H;
			Ob = d.I;
			w = d.D;
			Ca = d.J;
			la();
			return Qb;
		}
		var b = { a: Pb },
			c = Module.instantiateWasm;
		if (c)
			return new Promise((d) => {
				c(b, (e) => d(a(e)));
			});
		va ??= Module.locateFile
			? Module.locateFile
				? Module.locateFile('pcre2_wrapper.wasm', da)
				: da + 'pcre2_wrapper.wasm'
			: new URL('pcre2_wrapper.wasm', import.meta.url).href;
		return (function (d) {
			return a(d.instance);
		})(await za(b));
	})();
	await (async function () {
		qa();
		var a = Module.setStatus;
		a && (a('Running...'), await new Promise((b) => setTimeout(b, 1)), setTimeout(a, 1, ''));
		q || (Qb.E(), Module.onRuntimeInitialized?.(), sa());
	})();
	return Module;
}
export default createPcre2WrapperModule;
