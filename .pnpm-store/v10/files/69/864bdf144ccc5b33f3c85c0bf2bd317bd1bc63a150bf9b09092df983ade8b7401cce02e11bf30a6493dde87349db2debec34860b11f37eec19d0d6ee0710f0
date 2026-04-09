import { createRequire as e } from "node:module";
import { spawn as t } from "node:child_process";
import { delimiter as n, dirname as r, normalize as i, resolve as a } from "node:path";
import { cwd as o } from "node:process";
import { PassThrough as s } from "node:stream";
import c from "node:readline";
//#region \0rolldown/runtime.js
var l = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
var u = /* @__PURE__ */ e(import.meta.url);
//#endregion
//#region src/env.ts
const d = /^path$/i;
const f = {
	key: "PATH",
	value: ""
};
function p(e) {
	for (const t in e) {
		if (!Object.prototype.hasOwnProperty.call(e, t) || !d.test(t)) continue;
		const n = e[t];
		if (!n) return f;
		return {
			key: t,
			value: n
		};
	}
	return f;
}
function m(e, t) {
	const i = t.value.split(n);
	const o = [];
	let s = e;
	let c;
	do {
		o.push(a(s, "node_modules", ".bin"));
		c = s;
		s = r(s);
	} while (s !== c);
	const l = o.concat(i).join(n);
	return {
		key: t.key,
		value: l
	};
}
function h(e, t) {
	const n = {
		...process.env,
		...t
	};
	const r = m(e, p(n));
	n[r.key] = r.value;
	return n;
}
//#endregion
//#region src/stream.ts
const g = (e) => {
	let t = e.length;
	const n = new s();
	const r = () => {
		if (--t === 0) n.emit("end");
	};
	for (const t of e) {
		t.pipe(n, { end: false });
		t.on("end", r);
	}
	return n;
};
//#endregion
//#region node_modules/isexe/windows.js
var _ = /* @__PURE__ */ l(((e, t) => {
	t.exports = a;
	a.sync = o;
	var n = u("fs");
	function r(e, t) {
		var n = t.pathExt !== void 0 ? t.pathExt : process.env.PATHEXT;
		if (!n) return true;
		n = n.split(";");
		if (n.indexOf("") !== -1) return true;
		for (var r = 0; r < n.length; r++) {
			var i = n[r].toLowerCase();
			if (i && e.substr(-i.length).toLowerCase() === i) return true;
		}
		return false;
	}
	function i(e, t, n) {
		if (!e.isSymbolicLink() && !e.isFile()) return false;
		return r(t, n);
	}
	function a(e, t, r) {
		n.stat(e, function(n, a) {
			r(n, n ? false : i(a, e, t));
		});
	}
	function o(e, t) {
		return i(n.statSync(e), e, t);
	}
}));
//#endregion
//#region node_modules/isexe/mode.js
var v = /* @__PURE__ */ l(((e, t) => {
	t.exports = r;
	r.sync = i;
	var n = u("fs");
	function r(e, t, r) {
		n.stat(e, function(e, n) {
			r(e, e ? false : a(n, t));
		});
	}
	function i(e, t) {
		return a(n.statSync(e), t);
	}
	function a(e, t) {
		return e.isFile() && o(e, t);
	}
	function o(e, t) {
		var n = e.mode;
		var r = e.uid;
		var i = e.gid;
		var a = t.uid !== void 0 ? t.uid : process.getuid && process.getuid();
		var o = t.gid !== void 0 ? t.gid : process.getgid && process.getgid();
		var s = parseInt("100", 8);
		var c = parseInt("010", 8);
		var l = parseInt("001", 8);
		var u = s | c;
		return n & l || n & c && i === o || n & s && r === a || n & u && a === 0;
	}
}));
//#endregion
//#region node_modules/isexe/index.js
var y = /* @__PURE__ */ l(((e, t) => {
	u("fs");
	var n;
	if (process.platform === "win32" || global.TESTING_WINDOWS) n = _();
	else n = v();
	t.exports = r;
	r.sync = i;
	function r(e, t, i) {
		if (typeof t === "function") {
			i = t;
			t = {};
		}
		if (!i) {
			if (typeof Promise !== "function") throw new TypeError("callback not provided");
			return new Promise(function(n, i) {
				r(e, t || {}, function(e, t) {
					if (e) i(e);
					else n(t);
				});
			});
		}
		n(e, t || {}, function(e, n) {
			if (e) {
				if (e.code === "EACCES" || t && t.ignoreErrors) {
					e = null;
					n = false;
				}
			}
			i(e, n);
		});
	}
	function i(e, t) {
		try {
			return n.sync(e, t || {});
		} catch (e) {
			if (t && t.ignoreErrors || e.code === "EACCES") return false;
			else throw e;
		}
	}
}));
//#endregion
//#region node_modules/which/which.js
var b = /* @__PURE__ */ l(((e, t) => {
	const n = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
	const r = u("path");
	const i = n ? ";" : ":";
	const a = y();
	const o = (e) => Object.assign(/* @__PURE__ */ new Error(`not found: ${e}`), { code: "ENOENT" });
	const s = (e, t) => {
		const r = t.colon || i;
		const a = e.match(/\//) || n && e.match(/\\/) ? [""] : [...n ? [process.cwd()] : [], ...(t.path || process.env.PATH || "").split(r)];
		const o = n ? t.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
		const s = n ? o.split(r) : [""];
		if (n) {
			if (e.indexOf(".") !== -1 && s[0] !== "") s.unshift("");
		}
		return {
			pathEnv: a,
			pathExt: s,
			pathExtExe: o
		};
	};
	const c = (e, t, n) => {
		if (typeof t === "function") {
			n = t;
			t = {};
		}
		if (!t) t = {};
		const { pathEnv: i, pathExt: c, pathExtExe: l } = s(e, t);
		const u = [];
		const d = (n) => new Promise((a, s) => {
			if (n === i.length) return t.all && u.length ? a(u) : s(o(e));
			const c = i[n];
			const l = /^".*"$/.test(c) ? c.slice(1, -1) : c;
			const d = r.join(l, e);
			a(f(!l && /^\.[\\\/]/.test(e) ? e.slice(0, 2) + d : d, n, 0));
		});
		const f = (e, n, r) => new Promise((i, o) => {
			if (r === c.length) return i(d(n + 1));
			const s = c[r];
			a(e + s, { pathExt: l }, (a, o) => {
				if (!a && o) if (t.all) u.push(e + s);
				else return i(e + s);
				return i(f(e, n, r + 1));
			});
		});
		return n ? d(0).then((e) => n(null, e), n) : d(0);
	};
	const l = (e, t) => {
		t = t || {};
		const { pathEnv: n, pathExt: i, pathExtExe: c } = s(e, t);
		const l = [];
		for (let o = 0; o < n.length; o++) {
			const s = n[o];
			const u = /^".*"$/.test(s) ? s.slice(1, -1) : s;
			const d = r.join(u, e);
			const f = !u && /^\.[\\\/]/.test(e) ? e.slice(0, 2) + d : d;
			for (let e = 0; e < i.length; e++) {
				const n = f + i[e];
				try {
					if (a.sync(n, { pathExt: c })) if (t.all) l.push(n);
					else return n;
				} catch (e) {}
			}
		}
		if (t.all && l.length) return l;
		if (t.nothrow) return null;
		throw o(e);
	};
	t.exports = c;
	c.sync = l;
}));
//#endregion
//#region node_modules/path-key/index.js
var x = /* @__PURE__ */ l(((e, t) => {
	const n = (e = {}) => {
		const t = e.env || process.env;
		if ((e.platform || process.platform) !== "win32") return "PATH";
		return Object.keys(t).reverse().find((e) => e.toUpperCase() === "PATH") || "Path";
	};
	t.exports = n;
	t.exports.default = n;
}));
//#endregion
//#region node_modules/cross-spawn/lib/util/resolveCommand.js
var S = /* @__PURE__ */ l(((e, t) => {
	const n = u("path");
	const r = b();
	const i = x();
	function a(e, t) {
		const a = e.options.env || process.env;
		const o = process.cwd();
		const s = e.options.cwd != null;
		const c = s && process.chdir !== void 0 && !process.chdir.disabled;
		if (c) try {
			process.chdir(e.options.cwd);
		} catch (e) {}
		let l;
		try {
			l = r.sync(e.command, {
				path: a[i({ env: a })],
				pathExt: t ? n.delimiter : void 0
			});
		} catch (e) {} finally {
			if (c) process.chdir(o);
		}
		if (l) l = n.resolve(s ? e.options.cwd : "", l);
		return l;
	}
	function o(e) {
		return a(e) || a(e, true);
	}
	t.exports = o;
}));
//#endregion
//#region node_modules/cross-spawn/lib/util/escape.js
var C = /* @__PURE__ */ l(((e, t) => {
	const n = /([()\][%!^"`<>&|;, *?])/g;
	function r(e) {
		e = e.replace(n, "^$1");
		return e;
	}
	function i(e, t) {
		e = `${e}`;
		e = e.replace(/(?=(\\+?)?)\1"/g, "$1$1\\\"");
		e = e.replace(/(?=(\\+?)?)\1$/, "$1$1");
		e = `"${e}"`;
		e = e.replace(n, "^$1");
		if (t) e = e.replace(n, "^$1");
		return e;
	}
	t.exports.command = r;
	t.exports.argument = i;
}));
//#endregion
//#region node_modules/shebang-regex/index.js
var w = /* @__PURE__ */ l(((e, t) => {
	t.exports = /^#!(.*)/;
}));
//#endregion
//#region node_modules/shebang-command/index.js
var T = /* @__PURE__ */ l(((e, t) => {
	const n = w();
	t.exports = (e = "") => {
		const t = e.match(n);
		if (!t) return null;
		const [r, i] = t[0].replace(/#! ?/, "").split(" ");
		const a = r.split("/").pop();
		if (a === "env") return i;
		return i ? `${a} ${i}` : a;
	};
}));
//#endregion
//#region node_modules/cross-spawn/lib/util/readShebang.js
var E = /* @__PURE__ */ l(((e, t) => {
	const n = u("fs");
	const r = T();
	function i(e) {
		const t = 150;
		const i = Buffer.alloc(t);
		let a;
		try {
			a = n.openSync(e, "r");
			n.readSync(a, i, 0, t, 0);
			n.closeSync(a);
		} catch (e) {}
		return r(i.toString());
	}
	t.exports = i;
}));
//#endregion
//#region node_modules/cross-spawn/lib/parse.js
var D = /* @__PURE__ */ l(((e, t) => {
	const n = u("path");
	const r = S();
	const i = C();
	const a = E();
	const o = process.platform === "win32";
	const s = /\.(?:com|exe)$/i;
	const c = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
	function l(e) {
		e.file = r(e);
		const t = e.file && a(e.file);
		if (t) {
			e.args.unshift(e.file);
			e.command = t;
			return r(e);
		}
		return e.file;
	}
	function d(e) {
		if (!o) return e;
		const t = l(e);
		const r = !s.test(t);
		if (e.options.forceShell || r) {
			const r = c.test(t);
			e.command = n.normalize(e.command);
			e.command = i.command(e.command);
			e.args = e.args.map((e) => i.argument(e, r));
			e.args = [
				"/d",
				"/s",
				"/c",
				`"${[e.command].concat(e.args).join(" ")}"`
			];
			e.command = process.env.comspec || "cmd.exe";
			e.options.windowsVerbatimArguments = true;
		}
		return e;
	}
	function f(e, t, n) {
		if (t && !Array.isArray(t)) {
			n = t;
			t = null;
		}
		t = t ? t.slice(0) : [];
		n = Object.assign({}, n);
		const r = {
			command: e,
			args: t,
			options: n,
			file: void 0,
			original: {
				command: e,
				args: t
			}
		};
		return n.shell ? r : d(r);
	}
	t.exports = f;
}));
//#endregion
//#region node_modules/cross-spawn/lib/enoent.js
var O = /* @__PURE__ */ l(((e, t) => {
	const n = process.platform === "win32";
	function r(e, t) {
		return Object.assign(/* @__PURE__ */ new Error(`${t} ${e.command} ENOENT`), {
			code: "ENOENT",
			errno: "ENOENT",
			syscall: `${t} ${e.command}`,
			path: e.command,
			spawnargs: e.args
		});
	}
	function i(e, t) {
		if (!n) return;
		const r = e.emit;
		e.emit = function(n, i) {
			if (n === "exit") {
				const n = a(i, t);
				if (n) return r.call(e, "error", n);
			}
			return r.apply(e, arguments);
		};
	}
	function a(e, t) {
		if (n && e === 1 && !t.file) return r(t.original, "spawn");
		return null;
	}
	function o(e, t) {
		if (n && e === 1 && !t.file) return r(t.original, "spawnSync");
		return null;
	}
	t.exports = {
		hookChildProcess: i,
		verifyENOENT: a,
		verifyENOENTSync: o,
		notFoundError: r
	};
}));
//#endregion
//#region node_modules/cross-spawn/index.js
var k = /* @__PURE__ */ l(((e, t) => {
	const n = u("child_process");
	const r = D();
	const i = O();
	function a(e, t, a) {
		const o = r(e, t, a);
		const s = n.spawn(o.command, o.args, o.options);
		i.hookChildProcess(s, o);
		return s;
	}
	function o(e, t, a) {
		const o = r(e, t, a);
		const s = n.spawnSync(o.command, o.args, o.options);
		s.error = s.error || i.verifyENOENTSync(s.status, o);
		return s;
	}
	t.exports = a;
	t.exports.spawn = a;
	t.exports.sync = o;
	t.exports._parse = r;
	t.exports._enoent = i;
}));
//#endregion
//#region src/non-zero-exit-error.ts
var A = k();
var j = class extends Error {
	result;
	output;
	get exitCode() {
		if (this.result.exitCode !== null) return this.result.exitCode;
	}
	constructor(e, t) {
		super(`Process exited with non-zero status (${e.exitCode})`);
		this.result = e;
		this.output = t;
	}
};
//#endregion
//#region src/main.ts
const M = {
	timeout: void 0,
	persist: false
};
const N = { windowsHide: true };
function P(e, t) {
	return {
		command: i(e),
		args: t ?? []
	};
}
function F(e) {
	const t = new AbortController();
	for (const n of e) {
		if (n.aborted) {
			t.abort();
			return n;
		}
		const e = () => {
			t.abort(n.reason);
		};
		n.addEventListener("abort", e, { signal: t.signal });
	}
	return t.signal;
}
async function I(e) {
	let t = "";
	for await (const n of e) t += n.toString();
	return t;
}
var L = class {
	_process;
	_aborted = false;
	_options;
	_command;
	_args;
	_resolveClose;
	_processClosed;
	_thrownError;
	get process() {
		return this._process;
	}
	get pid() {
		return this._process?.pid;
	}
	get exitCode() {
		if (this._process && this._process.exitCode !== null) return this._process.exitCode;
	}
	constructor(e, t, n) {
		this._options = {
			...M,
			...n
		};
		this._command = e;
		this._args = t ?? [];
		this._processClosed = new Promise((e) => {
			this._resolveClose = e;
		});
	}
	kill(e) {
		return this._process?.kill(e) === true;
	}
	get aborted() {
		return this._aborted;
	}
	get killed() {
		return this._process?.killed === true;
	}
	pipe(e, t, n) {
		return z(e, t, {
			...n,
			stdin: this
		});
	}
	async *[Symbol.asyncIterator]() {
		const e = this._process;
		if (!e) return;
		const t = [];
		if (this._streamErr) t.push(this._streamErr);
		if (this._streamOut) t.push(this._streamOut);
		const n = g(t);
		const r = c.createInterface({ input: n });
		for await (const e of r) yield e.toString();
		await this._processClosed;
		e.removeAllListeners();
		if (this._thrownError) throw this._thrownError;
		if (this._options?.throwOnError && this.exitCode !== 0 && this.exitCode !== void 0) throw new j(this);
	}
	async _waitForOutput() {
		const e = this._process;
		if (!e) throw new Error("No process was started");
		const [t, n] = await Promise.all([this._streamOut ? I(this._streamOut) : "", this._streamErr ? I(this._streamErr) : ""]);
		await this._processClosed;
		if (this._options?.stdin) await this._options.stdin;
		e.removeAllListeners();
		if (this._thrownError) throw this._thrownError;
		const r = {
			stderr: n,
			stdout: t,
			exitCode: this.exitCode
		};
		if (this._options.throwOnError && this.exitCode !== 0 && this.exitCode !== void 0) throw new j(this, r);
		return r;
	}
	then(e, t) {
		return this._waitForOutput().then(e, t);
	}
	_streamOut;
	_streamErr;
	spawn() {
		const e = o();
		const n = this._options;
		const r = {
			...N,
			...n.nodeOptions
		};
		const i = [];
		this._resetState();
		if (n.timeout !== void 0) i.push(AbortSignal.timeout(n.timeout));
		if (n.signal !== void 0) i.push(n.signal);
		if (n.persist === true) r.detached = true;
		if (i.length > 0) r.signal = F(i);
		r.env = h(e, r.env);
		const { command: a, args: s } = P(this._command, this._args);
		const c = (0, A._parse)(a, s, r);
		const l = t(c.command, c.args, c.options);
		if (l.stderr) this._streamErr = l.stderr;
		if (l.stdout) this._streamOut = l.stdout;
		this._process = l;
		l.once("error", this._onError);
		l.once("close", this._onClose);
		if (n.stdin !== void 0 && l.stdin && n.stdin.process) {
			const { stdout: e } = n.stdin.process;
			if (e) e.pipe(l.stdin);
		}
	}
	_resetState() {
		this._aborted = false;
		this._processClosed = new Promise((e) => {
			this._resolveClose = e;
		});
		this._thrownError = void 0;
	}
	_onError = (e) => {
		if (e.name === "AbortError" && (!(e.cause instanceof Error) || e.cause.name !== "TimeoutError")) {
			this._aborted = true;
			return;
		}
		this._thrownError = e;
	};
	_onClose = () => {
		if (this._resolveClose) this._resolveClose();
	};
};
const R = (e, t, n) => {
	const r = new L(e, t, n);
	r.spawn();
	return r;
};
const z = R;
//#endregion
export { L as ExecProcess, j as NonZeroExitError, z as exec, R as x };
