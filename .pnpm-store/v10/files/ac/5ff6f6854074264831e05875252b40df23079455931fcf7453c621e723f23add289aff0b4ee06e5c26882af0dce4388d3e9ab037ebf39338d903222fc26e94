import { t as require_binding } from "./binding-kg77KQCQ.mjs";
import { o as logMultiplyNotifyOption } from "./logs-CSQ_UMWp.mjs";
import { t as arraify } from "./misc-CxyvWjTr.mjs";
import { w as LOG_LEVEL_WARN } from "./normalize-string-or-regex-VlPkMWXA.mjs";
import { l as PluginDriver, n as createBundlerOptions } from "./rolldown-build-D2CkFbcq.mjs";
import { a as aggregateBindingErrorsIntoJsError } from "./bindingify-input-options-6nBAYjYP.mjs";

//#region ../../node_modules/.pnpm/signal-exit@4.1.0/node_modules/signal-exit/dist/mjs/signals.js
/**
* This is not the set of all possible signals.
*
* It IS, however, the set of all signals that trigger
* an exit on either Linux or BSD systems.  Linux is a
* superset of the signal names supported on BSD, and
* the unknown signals just fail to register, so we can
* catch that easily enough.
*
* Windows signals are a different set, since there are
* signals that terminate Windows processes, but don't
* terminate (or don't even exist) on Posix systems.
*
* Don't bother with SIGKILL.  It's uncatchable, which
* means that we can't fire any callbacks anyway.
*
* If a user does happen to register a handler on a non-
* fatal signal like SIGWINCH or something, and then
* exit, it'll end up firing `process.emit('exit')`, so
* the handler will be fired anyway.
*
* SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
* artificially, inherently leave the process in a
* state from which it is not safe to try and enter JS
* listeners.
*/
const signals = [];
signals.push("SIGHUP", "SIGINT", "SIGTERM");
if (process.platform !== "win32") signals.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
if (process.platform === "linux") signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");

//#endregion
//#region ../../node_modules/.pnpm/signal-exit@4.1.0/node_modules/signal-exit/dist/mjs/index.js
const processOk = (process$2) => !!process$2 && typeof process$2 === "object" && typeof process$2.removeListener === "function" && typeof process$2.emit === "function" && typeof process$2.reallyExit === "function" && typeof process$2.listeners === "function" && typeof process$2.kill === "function" && typeof process$2.pid === "number" && typeof process$2.on === "function";
const kExitEmitter = Symbol.for("signal-exit emitter");
const global = globalThis;
const ObjectDefineProperty = Object.defineProperty.bind(Object);
var Emitter = class {
	emitted = {
		afterExit: false,
		exit: false
	};
	listeners = {
		afterExit: [],
		exit: []
	};
	count = 0;
	id = Math.random();
	constructor() {
		if (global[kExitEmitter]) return global[kExitEmitter];
		ObjectDefineProperty(global, kExitEmitter, {
			value: this,
			writable: false,
			enumerable: false,
			configurable: false
		});
	}
	on(ev, fn) {
		this.listeners[ev].push(fn);
	}
	removeListener(ev, fn) {
		const list = this.listeners[ev];
		const i = list.indexOf(fn);
		/* c8 ignore start */
		if (i === -1) return;
		/* c8 ignore stop */
		if (i === 0 && list.length === 1) list.length = 0;
		else list.splice(i, 1);
	}
	emit(ev, code, signal) {
		if (this.emitted[ev]) return false;
		this.emitted[ev] = true;
		let ret = false;
		for (const fn of this.listeners[ev]) ret = fn(code, signal) === true || ret;
		if (ev === "exit") ret = this.emit("afterExit", code, signal) || ret;
		return ret;
	}
};
var SignalExitBase = class {};
const signalExitWrap = (handler) => {
	return {
		onExit(cb, opts) {
			return handler.onExit(cb, opts);
		},
		load() {
			return handler.load();
		},
		unload() {
			return handler.unload();
		}
	};
};
var SignalExitFallback = class extends SignalExitBase {
	onExit() {
		return () => {};
	}
	load() {}
	unload() {}
};
var SignalExit = class extends SignalExitBase {
	/* c8 ignore start */
	#hupSig = process$1.platform === "win32" ? "SIGINT" : "SIGHUP";
	/* c8 ignore stop */
	#emitter = new Emitter();
	#process;
	#originalProcessEmit;
	#originalProcessReallyExit;
	#sigListeners = {};
	#loaded = false;
	constructor(process$2) {
		super();
		this.#process = process$2;
		this.#sigListeners = {};
		for (const sig of signals) this.#sigListeners[sig] = () => {
			const listeners = this.#process.listeners(sig);
			let { count } = this.#emitter;
			/* c8 ignore start */
			const p = process$2;
			if (typeof p.__signal_exit_emitter__ === "object" && typeof p.__signal_exit_emitter__.count === "number") count += p.__signal_exit_emitter__.count;
			/* c8 ignore stop */
			if (listeners.length === count) {
				this.unload();
				const ret = this.#emitter.emit("exit", null, sig);
				/* c8 ignore start */
				const s = sig === "SIGHUP" ? this.#hupSig : sig;
				if (!ret) process$2.kill(process$2.pid, s);
			}
		};
		this.#originalProcessReallyExit = process$2.reallyExit;
		this.#originalProcessEmit = process$2.emit;
	}
	onExit(cb, opts) {
		/* c8 ignore start */
		if (!processOk(this.#process)) return () => {};
		/* c8 ignore stop */
		if (this.#loaded === false) this.load();
		const ev = opts?.alwaysLast ? "afterExit" : "exit";
		this.#emitter.on(ev, cb);
		return () => {
			this.#emitter.removeListener(ev, cb);
			if (this.#emitter.listeners["exit"].length === 0 && this.#emitter.listeners["afterExit"].length === 0) this.unload();
		};
	}
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		this.#emitter.count += 1;
		for (const sig of signals) try {
			const fn = this.#sigListeners[sig];
			if (fn) this.#process.on(sig, fn);
		} catch (_) {}
		this.#process.emit = (ev, ...a) => {
			return this.#processEmit(ev, ...a);
		};
		this.#process.reallyExit = (code) => {
			return this.#processReallyExit(code);
		};
	}
	unload() {
		if (!this.#loaded) return;
		this.#loaded = false;
		signals.forEach((sig) => {
			const listener = this.#sigListeners[sig];
			/* c8 ignore start */
			if (!listener) throw new Error("Listener not defined for signal: " + sig);
			/* c8 ignore stop */
			try {
				this.#process.removeListener(sig, listener);
			} catch (_) {}
			/* c8 ignore stop */
		});
		this.#process.emit = this.#originalProcessEmit;
		this.#process.reallyExit = this.#originalProcessReallyExit;
		this.#emitter.count -= 1;
	}
	#processReallyExit(code) {
		/* c8 ignore start */
		if (!processOk(this.#process)) return 0;
		this.#process.exitCode = code || 0;
		/* c8 ignore stop */
		this.#emitter.emit("exit", this.#process.exitCode, null);
		return this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode);
	}
	#processEmit(ev, ...args) {
		const og = this.#originalProcessEmit;
		if (ev === "exit" && processOk(this.#process)) {
			if (typeof args[0] === "number") this.#process.exitCode = args[0];
			/* c8 ignore start */
			const ret = og.call(this.#process, ev, ...args);
			/* c8 ignore start */
			this.#emitter.emit("exit", this.#process.exitCode, null);
			/* c8 ignore stop */
			return ret;
		} else return og.call(this.#process, ev, ...args);
	}
};
const process$1 = globalThis.process;
const { onExit, load, unload } = signalExitWrap(processOk(process$1) ? new SignalExit(process$1) : new SignalExitFallback());

//#endregion
//#region src/api/watch/watch-emitter.ts
var WatcherEmitter = class {
	listeners = /* @__PURE__ */ new Map();
	timer;
	constructor() {
		this.timer = setInterval(() => {}, 1e9);
	}
	on(event, listener) {
		const listeners = this.listeners.get(event);
		if (listeners) listeners.push(listener);
		else this.listeners.set(event, [listener]);
		return this;
	}
	off(event, listener) {
		const listeners = this.listeners.get(event);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index !== -1) listeners.splice(index, 1);
		}
		return this;
	}
	clear(event) {
		if (this.listeners.has(event)) this.listeners.delete(event);
	}
	async onEvent(event) {
		const listeners = this.listeners.get(event.eventKind());
		if (listeners) switch (event.eventKind()) {
			case "close":
			case "restart":
				for (const listener of listeners) await listener();
				break;
			case "event":
				for (const listener of listeners) {
					const code = event.bundleEventKind();
					switch (code) {
						case "BUNDLE_END":
							const { duration, output, result } = event.bundleEndData();
							await listener({
								code: "BUNDLE_END",
								duration,
								output: [output],
								result
							});
							break;
						case "ERROR":
							const data = event.bundleErrorData();
							await listener({
								code: "ERROR",
								error: aggregateBindingErrorsIntoJsError(data.error),
								result: data.result
							});
							break;
						default:
							await listener({ code });
							break;
					}
				}
				break;
			case "change":
				for (const listener of listeners) {
					const { path, kind } = event.watchChangeData();
					await listener(path, { event: kind });
				}
				break;
			default: throw new Error(`Unknown event: ${event}`);
		}
	}
	async close() {
		clearInterval(this.timer);
	}
};

//#endregion
//#region src/api/watch/watcher.ts
var import_binding = require_binding();
var Watcher = class {
	closed;
	inner;
	emitter;
	stopWorkers;
	constructor(emitter, inner, stopWorkers) {
		this.closed = false;
		this.inner = inner;
		this.emitter = emitter;
		const originClose = emitter.close.bind(emitter);
		emitter.close = async () => {
			await this.close();
			originClose();
		};
		this.stopWorkers = stopWorkers;
	}
	async close() {
		if (this.closed) return;
		this.closed = true;
		for (const stop of this.stopWorkers) await stop?.();
		await this.inner.close();
		(0, import_binding.shutdownAsyncRuntime)();
	}
	start() {
		process.nextTick(() => this.inner.start(this.emitter.onEvent.bind(this.emitter)));
	}
};
async function createWatcher(emitter, input) {
	const options = arraify(input);
	const bundlerOptions = await Promise.all(options.map((option) => arraify(option.output || {}).map(async (output) => {
		return createBundlerOptions(await PluginDriver.callOptionsHook(option, true), output, true);
	})).flat());
	const notifyOptions = getValidNotifyOption(bundlerOptions);
	new Watcher(emitter, new import_binding.BindingWatcher(bundlerOptions.map((option) => option.bundlerOptions), notifyOptions), bundlerOptions.map((option) => option.stopWorkers)).start();
}
function getValidNotifyOption(bundlerOptions) {
	let result;
	for (const option of bundlerOptions) if (option.inputOptions.watch) {
		const notifyOption = option.inputOptions.watch.notify;
		if (notifyOption) if (result) {
			option.onLog(LOG_LEVEL_WARN, logMultiplyNotifyOption());
			return result;
		} else result = notifyOption;
	}
}

//#endregion
//#region src/api/watch/index.ts
const watch = (input) => {
	const emitter = new WatcherEmitter();
	createWatcher(emitter, input);
	return emitter;
};

//#endregion
export { onExit as n, watch as t };