import { t as require_binding } from "./binding-DkT6owYZ.mjs";
import { a as logInvalidLogPosition, c as logPluginError, i as logInputHookInOutputPlugin, n as error, o as logMultiplyNotifyOption, r as logCycleLoading, t as augmentCodeLocation } from "./logs-CSQ_UMWp.mjs";
import { n as BuiltinPlugin, r as bindingifyBuiltInPlugin, t as normalizedStringOrRegex } from "./normalize-string-or-regex-vZ5EI4ro.mjs";
import { a as unreachable, i as unimplemented, o as unsupported, r as noop, t as arraify } from "./misc-DpQNcSw4.mjs";
import { t as parseAst } from "./parse-ast-index-w6oTGOhH.mjs";
import { Worker, isMainThread } from "node:worker_threads";
import path from "node:path";
import { styleText } from "node:util";
import * as filter from "@rolldown/pluginutils";
import fsp from "node:fs/promises";
import os from "node:os";

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
	#processEmit(ev, ...args$1) {
		const og = this.#originalProcessEmit;
		if (ev === "exit" && processOk(this.#process)) {
			if (typeof args$1[0] === "number") this.#process.exitCode = args$1[0];
			/* c8 ignore start */
			const ret = og.call(this.#process, ev, ...args$1);
			/* c8 ignore start */
			this.#emitter.emit("exit", this.#process.exitCode, null);
			/* c8 ignore stop */
			return ret;
		} else return og.call(this.#process, ev, ...args$1);
	}
};
const process$1 = globalThis.process;
const { onExit, load, unload } = signalExitWrap(processOk(process$1) ? new SignalExit(process$1) : new SignalExitFallback());

//#endregion
//#region src/setup.ts
var import_binding$7 = require_binding();
if (isMainThread) {
	const subscriberGuard = (0, import_binding$7.initTraceSubscriber)();
	onExit(() => {
		subscriberGuard?.close();
	});
}

//#endregion
//#region package.json
var version = "1.0.0-beta.50";
var description$1 = "Fast JavaScript/TypeScript bundler in Rust with Rollup-compatible API.";

//#endregion
//#region src/log/logging.ts
const LOG_LEVEL_SILENT = "silent";
const LOG_LEVEL_ERROR = "error";
const LOG_LEVEL_WARN = "warn";
const LOG_LEVEL_INFO = "info";
const LOG_LEVEL_DEBUG = "debug";
const logLevelPriority = {
	[LOG_LEVEL_DEBUG]: 0,
	[LOG_LEVEL_INFO]: 1,
	[LOG_LEVEL_WARN]: 2,
	[LOG_LEVEL_SILENT]: 3
};

//#endregion
//#region src/log/log-handler.ts
const normalizeLog = (log) => typeof log === "string" ? { message: log } : typeof log === "function" ? normalizeLog(log()) : log;
function getLogHandler(level, code, logger, pluginName, logLevel) {
	if (logLevelPriority[level] < logLevelPriority[logLevel]) return noop;
	return (log, pos) => {
		if (pos != null) logger(LOG_LEVEL_WARN, logInvalidLogPosition(pluginName));
		log = normalizeLog(log);
		if (log.code && !log.pluginCode) log.pluginCode = log.code;
		log.code = code;
		log.plugin = pluginName;
		logger(level, log);
	};
}

//#endregion
//#region src/log/logger.ts
function getLogger(plugins, onLog, logLevel, watchMode) {
	const minimalPriority = logLevelPriority[logLevel];
	const logger = (level, log, skipped = /* @__PURE__ */ new Set()) => {
		if (logLevelPriority[level] < minimalPriority) return;
		for (const plugin of getSortedPlugins("onLog", plugins)) {
			if (skipped.has(plugin)) continue;
			const { onLog: pluginOnLog } = plugin;
			if (pluginOnLog) {
				const getLogHandler$1 = (level$1) => {
					if (logLevelPriority[level$1] < minimalPriority) return () => {};
					return (log$1) => logger(level$1, normalizeLog(log$1), new Set(skipped).add(plugin));
				};
				if (("handler" in pluginOnLog ? pluginOnLog.handler : pluginOnLog).call({
					debug: getLogHandler$1(LOG_LEVEL_DEBUG),
					error: (log$1) => error(normalizeLog(log$1)),
					info: getLogHandler$1(LOG_LEVEL_INFO),
					meta: {
						rollupVersion: "4.23.0",
						rolldownVersion: VERSION,
						watchMode
					},
					warn: getLogHandler$1(LOG_LEVEL_WARN),
					pluginName: plugin.name || "unknown"
				}, level, log) === false) return;
			}
		}
		onLog(level, log);
	};
	return logger;
}
const getOnLog = (config, logLevel, printLog = defaultPrintLog) => {
	const { onwarn, onLog } = config;
	const defaultOnLog = getDefaultOnLog(printLog, onwarn);
	if (onLog) {
		const minimalPriority = logLevelPriority[logLevel];
		return (level, log) => onLog(level, addLogToString(log), (level$1, handledLog) => {
			if (level$1 === LOG_LEVEL_ERROR) return error(normalizeLog(handledLog));
			if (logLevelPriority[level$1] >= minimalPriority) defaultOnLog(level$1, normalizeLog(handledLog));
		});
	}
	return defaultOnLog;
};
const getDefaultOnLog = (printLog, onwarn) => onwarn ? (level, log) => {
	if (level === LOG_LEVEL_WARN) onwarn(addLogToString(log), (warning) => printLog(LOG_LEVEL_WARN, normalizeLog(warning)));
	else printLog(level, log);
} : printLog;
const addLogToString = (log) => {
	Object.defineProperty(log, "toString", {
		value: () => getExtendedLogMessage(log),
		writable: true
	});
	return log;
};
const defaultPrintLog = (level, log) => {
	const message = getExtendedLogMessage(log);
	switch (level) {
		case LOG_LEVEL_WARN: return console.warn(message);
		case LOG_LEVEL_DEBUG: return console.debug(message);
		default: return console.info(message);
	}
};
const getExtendedLogMessage = (log) => {
	let prefix = "";
	if (log.plugin) prefix += `(${log.plugin} plugin) `;
	if (log.loc) prefix += `${relativeId(log.loc.file)} (${log.loc.line}:${log.loc.column}) `;
	return prefix + log.message;
};
function relativeId(id) {
	if (!path.isAbsolute(id)) return id;
	return path.relative(path.resolve(), id);
}

//#endregion
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
//#region src/constants/plugin.ts
const ENUMERATED_INPUT_PLUGIN_HOOK_NAMES = [
	"options",
	"buildStart",
	"resolveId",
	"load",
	"transform",
	"moduleParsed",
	"buildEnd",
	"onLog",
	"resolveDynamicImport",
	"closeBundle",
	"closeWatcher",
	"watchChange"
];
const ENUMERATED_OUTPUT_PLUGIN_HOOK_NAMES = [
	"augmentChunkHash",
	"outputOptions",
	"renderChunk",
	"renderStart",
	"renderError",
	"writeBundle",
	"generateBundle"
];
const ENUMERATED_PLUGIN_HOOK_NAMES = [
	...ENUMERATED_INPUT_PLUGIN_HOOK_NAMES,
	...ENUMERATED_OUTPUT_PLUGIN_HOOK_NAMES,
	"footer",
	"banner",
	"intro",
	"outro"
];
/**
* Names of all defined hooks. It's like
* ```js
* const DEFINED_HOOK_NAMES ={
*   options: 'options',
*   buildStart: 'buildStart',
*   ...
* }
* ```
*/
const DEFINED_HOOK_NAMES = {
	[ENUMERATED_PLUGIN_HOOK_NAMES[0]]: ENUMERATED_PLUGIN_HOOK_NAMES[0],
	[ENUMERATED_PLUGIN_HOOK_NAMES[1]]: ENUMERATED_PLUGIN_HOOK_NAMES[1],
	[ENUMERATED_PLUGIN_HOOK_NAMES[2]]: ENUMERATED_PLUGIN_HOOK_NAMES[2],
	[ENUMERATED_PLUGIN_HOOK_NAMES[3]]: ENUMERATED_PLUGIN_HOOK_NAMES[3],
	[ENUMERATED_PLUGIN_HOOK_NAMES[4]]: ENUMERATED_PLUGIN_HOOK_NAMES[4],
	[ENUMERATED_PLUGIN_HOOK_NAMES[5]]: ENUMERATED_PLUGIN_HOOK_NAMES[5],
	[ENUMERATED_PLUGIN_HOOK_NAMES[6]]: ENUMERATED_PLUGIN_HOOK_NAMES[6],
	[ENUMERATED_PLUGIN_HOOK_NAMES[7]]: ENUMERATED_PLUGIN_HOOK_NAMES[7],
	[ENUMERATED_PLUGIN_HOOK_NAMES[8]]: ENUMERATED_PLUGIN_HOOK_NAMES[8],
	[ENUMERATED_PLUGIN_HOOK_NAMES[9]]: ENUMERATED_PLUGIN_HOOK_NAMES[9],
	[ENUMERATED_PLUGIN_HOOK_NAMES[10]]: ENUMERATED_PLUGIN_HOOK_NAMES[10],
	[ENUMERATED_PLUGIN_HOOK_NAMES[11]]: ENUMERATED_PLUGIN_HOOK_NAMES[11],
	[ENUMERATED_PLUGIN_HOOK_NAMES[12]]: ENUMERATED_PLUGIN_HOOK_NAMES[12],
	[ENUMERATED_PLUGIN_HOOK_NAMES[13]]: ENUMERATED_PLUGIN_HOOK_NAMES[13],
	[ENUMERATED_PLUGIN_HOOK_NAMES[14]]: ENUMERATED_PLUGIN_HOOK_NAMES[14],
	[ENUMERATED_PLUGIN_HOOK_NAMES[15]]: ENUMERATED_PLUGIN_HOOK_NAMES[15],
	[ENUMERATED_PLUGIN_HOOK_NAMES[16]]: ENUMERATED_PLUGIN_HOOK_NAMES[16],
	[ENUMERATED_PLUGIN_HOOK_NAMES[17]]: ENUMERATED_PLUGIN_HOOK_NAMES[17],
	[ENUMERATED_PLUGIN_HOOK_NAMES[18]]: ENUMERATED_PLUGIN_HOOK_NAMES[18],
	[ENUMERATED_PLUGIN_HOOK_NAMES[19]]: ENUMERATED_PLUGIN_HOOK_NAMES[19],
	[ENUMERATED_PLUGIN_HOOK_NAMES[20]]: ENUMERATED_PLUGIN_HOOK_NAMES[20],
	[ENUMERATED_PLUGIN_HOOK_NAMES[21]]: ENUMERATED_PLUGIN_HOOK_NAMES[21],
	[ENUMERATED_PLUGIN_HOOK_NAMES[22]]: ENUMERATED_PLUGIN_HOOK_NAMES[22]
};

//#endregion
//#region src/utils/async-flatten.ts
async function asyncFlatten(array$1) {
	do
		array$1 = (await Promise.all(array$1)).flat(Infinity);
	while (array$1.some((v) => v?.then));
	return array$1;
}

//#endregion
//#region src/utils/normalize-plugin-option.ts
const normalizePluginOption = async (plugins) => (await asyncFlatten([plugins])).filter(Boolean);
function checkOutputPluginOption(plugins, onLog) {
	for (const plugin of plugins) for (const hook of ENUMERATED_INPUT_PLUGIN_HOOK_NAMES) if (hook in plugin) {
		delete plugin[hook];
		onLog(LOG_LEVEL_WARN, logInputHookInOutputPlugin(plugin.name, hook));
	}
	return plugins;
}
function normalizePlugins(plugins, anonymousPrefix) {
	for (const [index, plugin] of plugins.entries()) {
		if ("_parallel" in plugin) continue;
		if (plugin instanceof BuiltinPlugin) continue;
		if (!plugin.name) plugin.name = `${anonymousPrefix}${index + 1}`;
	}
	return plugins;
}
const ANONYMOUS_PLUGIN_PREFIX = "at position ";
const ANONYMOUS_OUTPUT_PLUGIN_PREFIX = "at output position ";

//#endregion
//#region src/plugin/minimal-plugin-context.ts
var MinimalPluginContextImpl = class {
	info;
	warn;
	debug;
	meta;
	constructor(onLog, logLevel, pluginName, watchMode, hookName) {
		this.pluginName = pluginName;
		this.hookName = hookName;
		this.debug = getLogHandler(LOG_LEVEL_DEBUG, "PLUGIN_LOG", onLog, pluginName, logLevel);
		this.info = getLogHandler(LOG_LEVEL_INFO, "PLUGIN_LOG", onLog, pluginName, logLevel);
		this.warn = getLogHandler(LOG_LEVEL_WARN, "PLUGIN_WARNING", onLog, pluginName, logLevel);
		this.meta = {
			rollupVersion: "4.23.0",
			rolldownVersion: VERSION,
			watchMode
		};
	}
	error(e$1) {
		return error(logPluginError(normalizeLog(e$1), this.pluginName, { hook: this.hookName }));
	}
};

//#endregion
//#region src/plugin/plugin-driver.ts
var PluginDriver = class {
	static async callOptionsHook(inputOptions, watchMode = false) {
		const logLevel = inputOptions.logLevel || LOG_LEVEL_INFO;
		const plugins = getSortedPlugins("options", getObjectPlugins(await normalizePluginOption(inputOptions.plugins)));
		const logger = getLogger(plugins, getOnLog(inputOptions, logLevel), logLevel, watchMode);
		for (const plugin of plugins) {
			const name = plugin.name || "unknown";
			const options = plugin.options;
			if (options) {
				const { handler } = normalizeHook(options);
				const result = await handler.call(new MinimalPluginContextImpl(logger, logLevel, name, watchMode, "onLog"), inputOptions);
				if (result) inputOptions = result;
			}
		}
		return inputOptions;
	}
	static callOutputOptionsHook(rawPlugins, outputOptions, onLog, logLevel, watchMode) {
		const sortedPlugins = getSortedPlugins("outputOptions", getObjectPlugins(rawPlugins));
		for (const plugin of sortedPlugins) {
			const name = plugin.name || "unknown";
			const options = plugin.outputOptions;
			if (options) {
				const { handler } = normalizeHook(options);
				const result = handler.call(new MinimalPluginContextImpl(onLog, logLevel, name, watchMode), outputOptions);
				if (result) outputOptions = result;
			}
		}
		return outputOptions;
	}
};
function getObjectPlugins(plugins) {
	return plugins.filter((plugin) => {
		if (!plugin) return;
		if ("_parallel" in plugin) return;
		if (plugin instanceof BuiltinPlugin) return;
		return plugin;
	});
}
function getSortedPlugins(hookName, plugins) {
	const pre = [];
	const normal = [];
	const post = [];
	for (const plugin of plugins) {
		const hook = plugin[hookName];
		if (hook) {
			if (typeof hook === "object") {
				if (hook.order === "pre") {
					pre.push(plugin);
					continue;
				}
				if (hook.order === "post") {
					post.push(plugin);
					continue;
				}
			}
			normal.push(plugin);
		}
	}
	return [
		...pre,
		...normal,
		...post
	];
}

//#endregion
//#region ../../node_modules/.pnpm/valibot@1.1.0_typescript@5.9.3/node_modules/valibot/dist/index.js
var store;
/* @__NO_SIDE_EFFECTS__ */
function getGlobalConfig(config2) {
	return {
		lang: config2?.lang ?? store?.lang,
		message: config2?.message,
		abortEarly: config2?.abortEarly ?? store?.abortEarly,
		abortPipeEarly: config2?.abortPipeEarly ?? store?.abortPipeEarly
	};
}
var store2;
/* @__NO_SIDE_EFFECTS__ */
function getGlobalMessage(lang) {
	return store2?.get(lang);
}
var store3;
/* @__NO_SIDE_EFFECTS__ */
function getSchemaMessage(lang) {
	return store3?.get(lang);
}
var store4;
/* @__NO_SIDE_EFFECTS__ */
function getSpecificMessage(reference, lang) {
	return store4?.get(reference)?.get(lang);
}
/* @__NO_SIDE_EFFECTS__ */
function _stringify(input) {
	const type = typeof input;
	if (type === "string") return `"${input}"`;
	if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
	if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
	return type;
}
function _addIssue(context, label, dataset, config2, other) {
	const input = other && "input" in other ? other.input : dataset.value;
	const expected = other?.expected ?? context.expects ?? null;
	const received = other?.received ?? /* @__PURE__ */ _stringify(input);
	const issue = {
		kind: context.kind,
		type: context.type,
		input,
		expected,
		received,
		message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
		requirement: context.requirement,
		path: other?.path,
		issues: other?.issues,
		lang: config2.lang,
		abortEarly: config2.abortEarly,
		abortPipeEarly: config2.abortPipeEarly
	};
	const isSchema = context.kind === "schema";
	const message2 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config2.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
	if (message2 !== void 0) issue.message = typeof message2 === "function" ? message2(issue) : message2;
	if (isSchema) dataset.typed = false;
	if (dataset.issues) dataset.issues.push(issue);
	else dataset.issues = [issue];
}
/* @__NO_SIDE_EFFECTS__ */
function _getStandardProps(context) {
	return {
		version: 1,
		vendor: "valibot",
		validate(value2) {
			return context["~run"]({ value: value2 }, /* @__PURE__ */ getGlobalConfig());
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function _isValidObjectKey(object2, key) {
	return Object.hasOwn(object2, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
/* @__NO_SIDE_EFFECTS__ */
function _joinExpects(values2, separator) {
	const list = [...new Set(values2)];
	if (list.length > 1) return `(${list.join(` ${separator} `)})`;
	return list[0] ?? "never";
}
var ValiError = class extends Error {
	/**
	* Creates a Valibot error with useful information.
	*
	* @param issues The error issues.
	*/
	constructor(issues) {
		super(issues[0].message);
		this.name = "ValiError";
		this.issues = issues;
	}
};
/* @__NO_SIDE_EFFECTS__ */
function args(schema) {
	return {
		kind: "transformation",
		type: "args",
		reference: args,
		async: false,
		schema,
		"~run"(dataset, config2) {
			const func = dataset.value;
			dataset.value = (...args_) => {
				const argsDataset = this.schema["~run"]({ value: args_ }, config2);
				if (argsDataset.issues) throw new ValiError(argsDataset.issues);
				return func(...argsDataset.value);
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function awaitAsync() {
	return {
		kind: "transformation",
		type: "await",
		reference: awaitAsync,
		async: true,
		async "~run"(dataset) {
			dataset.value = await dataset.value;
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function description(description_) {
	return {
		kind: "metadata",
		type: "description",
		reference: description,
		description: description_
	};
}
/* @__NO_SIDE_EFFECTS__ */
function returns(schema) {
	return {
		kind: "transformation",
		type: "returns",
		reference: returns,
		async: false,
		schema,
		"~run"(dataset, config2) {
			const func = dataset.value;
			dataset.value = (...args_) => {
				const returnsDataset = this.schema["~run"]({ value: func(...args_) }, config2);
				if (returnsDataset.issues) throw new ValiError(returnsDataset.issues);
				return returnsDataset.value;
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function returnsAsync(schema) {
	return {
		kind: "transformation",
		type: "returns",
		reference: returnsAsync,
		async: false,
		schema,
		"~run"(dataset, config2) {
			const func = dataset.value;
			dataset.value = async (...args_) => {
				const returnsDataset = await this.schema["~run"]({ value: await func(...args_) }, config2);
				if (returnsDataset.issues) throw new ValiError(returnsDataset.issues);
				return returnsDataset.value;
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function getFallback(schema, dataset, config2) {
	return typeof schema.fallback === "function" ? schema.fallback(dataset, config2) : schema.fallback;
}
/* @__NO_SIDE_EFFECTS__ */
function getDefault(schema, dataset, config2) {
	return typeof schema.default === "function" ? schema.default(dataset, config2) : schema.default;
}
/* @__NO_SIDE_EFFECTS__ */
function any() {
	return {
		kind: "schema",
		type: "any",
		reference: any,
		expects: "any",
		async: false,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset) {
			dataset.typed = true;
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function array(item, message2) {
	return {
		kind: "schema",
		type: "array",
		reference: array,
		expects: "Array",
		async: false,
		item,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (Array.isArray(input)) {
				dataset.typed = true;
				dataset.value = [];
				for (let key = 0; key < input.length; key++) {
					const value2 = input[key];
					const itemDataset = this.item["~run"]({ value: value2 }, config2);
					if (itemDataset.issues) {
						const pathItem = {
							type: "array",
							origin: "value",
							input,
							key,
							value: value2
						};
						for (const issue of itemDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = itemDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!itemDataset.typed) dataset.typed = false;
					dataset.value.push(itemDataset.value);
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function boolean(message2) {
	return {
		kind: "schema",
		type: "boolean",
		reference: boolean,
		expects: "boolean",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "boolean") dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function custom(check2, message2) {
	return {
		kind: "schema",
		type: "custom",
		reference: custom,
		expects: "unknown",
		async: false,
		check: check2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (this.check(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function function_(message2) {
	return {
		kind: "schema",
		type: "function",
		reference: function_,
		expects: "Function",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "function") dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function instance(class_, message2) {
	return {
		kind: "schema",
		type: "instance",
		reference: instance,
		expects: class_.name,
		async: false,
		class: class_,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value instanceof this.class) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function literal(literal_, message2) {
	return {
		kind: "schema",
		type: "literal",
		reference: literal,
		expects: /* @__PURE__ */ _stringify(literal_),
		async: false,
		literal: literal_,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === this.literal) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function looseObject(entries2, message2) {
	return {
		kind: "schema",
		type: "loose_object",
		reference: looseObject,
		expects: "Object",
		async: false,
		entries: entries2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value2 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value2 }, config2);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value2
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config2.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config2, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config2.abortEarly) break;
					}
				}
				if (!dataset.issues || !config2.abortEarly) {
					for (const key in input) if (/* @__PURE__ */ _isValidObjectKey(input, key) && !(key in this.entries)) dataset.value[key] = input[key];
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function never(message2) {
	return {
		kind: "schema",
		type: "never",
		reference: never,
		expects: "never",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			_addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function nullish(wrapped, default_) {
	return {
		kind: "schema",
		type: "nullish",
		reference: nullish,
		expects: `(${wrapped.expects} | null | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === null || dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config2);
				if (dataset.value === null || dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config2);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function number(message2) {
	return {
		kind: "schema",
		type: "number",
		reference: number,
		expects: "number",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function object(entries2, message2) {
	return {
		kind: "schema",
		type: "object",
		reference: object,
		expects: "Object",
		async: false,
		entries: entries2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value2 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value2 }, config2);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value2
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config2.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config2, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config2.abortEarly) break;
					}
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function optional(wrapped, default_) {
	return {
		kind: "schema",
		type: "optional",
		reference: optional,
		expects: `(${wrapped.expects} | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config2);
				if (dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config2);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function picklist(options, message2) {
	return {
		kind: "schema",
		type: "picklist",
		reference: picklist,
		expects: /* @__PURE__ */ _joinExpects(options.map(_stringify), "|"),
		async: false,
		options,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (this.options.includes(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function promise(message2) {
	return {
		kind: "schema",
		type: "promise",
		reference: promise,
		expects: "Promise",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value instanceof Promise) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function record(key, value2, message2) {
	return {
		kind: "schema",
		type: "record",
		reference: record,
		expects: "Object",
		async: false,
		key,
		value: value2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const entryKey in input) if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
					const entryValue = input[entryKey];
					const keyDataset = this.key["~run"]({ value: entryKey }, config2);
					if (keyDataset.issues) {
						const pathItem = {
							type: "object",
							origin: "key",
							input,
							key: entryKey,
							value: entryValue
						};
						for (const issue of keyDataset.issues) {
							issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = keyDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					const valueDataset = this.value["~run"]({ value: entryValue }, config2);
					if (valueDataset.issues) {
						const pathItem = {
							type: "object",
							origin: "value",
							input,
							key: entryKey,
							value: entryValue
						};
						for (const issue of valueDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = valueDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!keyDataset.typed || !valueDataset.typed) dataset.typed = false;
					if (keyDataset.typed) dataset.value[keyDataset.value] = valueDataset.value;
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function strictObject(entries2, message2) {
	return {
		kind: "schema",
		type: "strict_object",
		reference: strictObject,
		expects: "Object",
		async: false,
		entries: entries2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value2 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value2 }, config2);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value2
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config2.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config2, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config2.abortEarly) break;
					}
				}
				if (!dataset.issues || !config2.abortEarly) {
					for (const key in input) if (!(key in this.entries)) {
						_addIssue(this, "key", dataset, config2, {
							input: key,
							expected: "never",
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						break;
					}
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function string(message2) {
	return {
		kind: "schema",
		type: "string",
		reference: string,
		expects: "string",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "string") dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function tuple(items, message2) {
	return {
		kind: "schema",
		type: "tuple",
		reference: tuple,
		expects: "Array",
		async: false,
		items,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (Array.isArray(input)) {
				dataset.typed = true;
				dataset.value = [];
				for (let key = 0; key < this.items.length; key++) {
					const value2 = input[key];
					const itemDataset = this.items[key]["~run"]({ value: value2 }, config2);
					if (itemDataset.issues) {
						const pathItem = {
							type: "array",
							origin: "value",
							input,
							key,
							value: value2
						};
						for (const issue of itemDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = itemDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!itemDataset.typed) dataset.typed = false;
					dataset.value.push(itemDataset.value);
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function undefined_(message2) {
	return {
		kind: "schema",
		type: "undefined",
		reference: undefined_,
		expects: "undefined",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === void 0) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function _subIssues(datasets) {
	let issues;
	if (datasets) for (const dataset of datasets) if (issues) issues.push(...dataset.issues);
	else issues = dataset.issues;
	return issues;
}
/* @__NO_SIDE_EFFECTS__ */
function union(options, message2) {
	return {
		kind: "schema",
		type: "union",
		reference: union,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: false,
		options,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = schema["~run"]({ value: dataset.value }, config2);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function unionAsync(options, message2) {
	return {
		kind: "schema",
		type: "union",
		reference: unionAsync,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: true,
		options,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		async "~run"(dataset, config2) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = await schema["~run"]({ value: dataset.value }, config2);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function void_(message2) {
	return {
		kind: "schema",
		type: "void",
		reference: void_,
		expects: "void",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === void 0) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function keyof(schema, message2) {
	return /* @__PURE__ */ picklist(Object.keys(schema.entries), message2);
}
/* @__NO_SIDE_EFFECTS__ */
function omit(schema, keys) {
	const entries2 = { ...schema.entries };
	for (const key of keys) delete entries2[key];
	return {
		...schema,
		entries: entries2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function partial(schema, keys) {
	const entries2 = {};
	for (const key in schema.entries) entries2[key] = !keys || keys.includes(key) ? /* @__PURE__ */ optional(schema.entries[key]) : schema.entries[key];
	return {
		...schema,
		entries: entries2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function pipe(...pipe2) {
	return {
		...pipe2[0],
		pipe: pipe2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			for (const item of pipe2) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) dataset = item["~run"](dataset, config2);
			}
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function pipeAsync(...pipe2) {
	return {
		...pipe2[0],
		pipe: pipe2,
		async: true,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		async "~run"(dataset, config2) {
			for (const item of pipe2) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) dataset = await item["~run"](dataset, config2);
			}
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function safeParse(schema, input, config2) {
	const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config2));
	return {
		typed: dataset.typed,
		success: !dataset.issues,
		output: dataset.value,
		issues: dataset.issues
	};
}

//#endregion
//#region src/utils/flatten-valibot-schema.ts
function unwrapSchema(schema) {
	if (!schema) return schema;
	if (schema.type === "optional" && schema.wrapped) return unwrapSchema(schema.wrapped);
	if (schema.type === "nullable" && schema.wrapped) return unwrapSchema(schema.wrapped);
	if (schema.type === "nullish" && schema.wrapped) return unwrapSchema(schema.wrapped);
	return schema;
}
function getValibotSchemaType(schema) {
	if (!schema) return "any";
	if (schema.type) switch (schema.type) {
		case "string": return "string";
		case "number": return "number";
		case "boolean": return "boolean";
		case "array": return "array";
		case "object":
		case "strict_object":
		case "loose_object": return "object";
		case "union": return "union";
		case "literal": return typeof schema.literal;
		case "record": return "object";
		case "optional": return getValibotSchemaType(schema.wrapped);
		case "nullable": return getValibotSchemaType(schema.wrapped);
		case "nullish": return getValibotSchemaType(schema.wrapped);
		case "never": return "never";
		case "any": return "any";
		case "custom": return "any";
		case "function": return "never";
		case "instance": return "object";
		default: return "any";
	}
	return "any";
}
function getValibotDescription(schema) {
	if (!schema) return void 0;
	if (schema.pipe && Array.isArray(schema.pipe)) {
		for (const action of schema.pipe) if (action.type === "description" && action.description) return action.description;
	}
	if (schema.type === "optional" && schema.wrapped) return getValibotDescription(schema.wrapped);
}
function flattenValibotSchema(schema, result = {}, prefix = "") {
	if (!schema || typeof schema !== "object") return result;
	if (schema.type === "strict_object" || schema.type === "object" || schema.type === "loose_object") {
		if (schema.entries && typeof schema.entries === "object") for (const [key, value] of Object.entries(schema.entries)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			const valueSchema = value;
			const type = getValibotSchemaType(valueSchema);
			const description$2 = getValibotDescription(valueSchema);
			if (type === "object") {
				const unwrappedSchema = unwrapSchema(valueSchema);
				if (unwrappedSchema && unwrappedSchema.entries) flattenValibotSchema(unwrappedSchema, result, fullKey);
				else result[fullKey] = {
					type,
					description: description$2
				};
			} else result[fullKey] = {
				type,
				description: description$2
			};
		}
	}
	return result;
}

//#endregion
//#region src/utils/style-text.ts
/**
* Cross-platform styleText utility that works in both Node.js and browser environments
* In Node.js, it uses the native `styleText` from `node:util`
* In browser, it provides empty styling functions for compatibility
*/
function styleText$1(...args$1) {
	return styleText(...args$1);
}

//#endregion
//#region src/utils/validator.ts
const StringOrRegExpSchema = union([string(), instance(RegExp)]);
function vFunction() {
	return function_();
}
const LogLevelSchema = union([
	literal("debug"),
	literal("info"),
	literal("warn")
]);
const LogLevelOptionSchema = union([LogLevelSchema, literal("silent")]);
const LogLevelWithErrorSchema = union([LogLevelSchema, literal("error")]);
const RollupLogSchema = any();
const RollupLogWithStringSchema = union([RollupLogSchema, string()]);
const InputOptionSchema = union([
	string(),
	array(string()),
	record(string(), string())
]);
const ExternalOptionFunctionSchema = pipe(vFunction(), args(tuple([
	string(),
	optional(string()),
	boolean()
])), returns(nullish(boolean())));
const ExternalOptionSchema = union([
	StringOrRegExpSchema,
	array(StringOrRegExpSchema),
	ExternalOptionFunctionSchema
]);
const ModuleTypesSchema = record(string(), union([
	literal("asset"),
	literal("base64"),
	literal("binary"),
	literal("css"),
	literal("dataurl"),
	literal("empty"),
	literal("js"),
	literal("json"),
	literal("jsx"),
	literal("text"),
	literal("ts"),
	literal("tsx")
]));
const JsxOptionsSchema = strictObject({
	runtime: pipe(optional(union([literal("classic"), literal("automatic")])), description("Which runtime to use")),
	development: pipe(optional(boolean()), description("Development specific information")),
	throwIfNamespace: pipe(optional(boolean()), description("Toggles whether to throw an error when a tag name uses an XML namespace")),
	importSource: pipe(optional(string()), description("Import the factory of element and fragment if mode is classic")),
	pragma: pipe(optional(string()), description("Jsx element transformation")),
	pragmaFrag: pipe(optional(string()), description("Jsx fragment transformation")),
	refresh: pipe(optional(boolean()), description("Enable react fast refresh"))
});
const HelperModeSchema = union([literal("Runtime"), literal("External")]);
const DecoratorOptionSchema = object({
	legacy: optional(boolean()),
	emitDecoratorMetadata: optional(boolean())
});
const HelpersSchema = object({ mode: optional(HelperModeSchema) });
const RewriteImportExtensionsSchema = union([
	literal("rewrite"),
	literal("remove"),
	boolean()
]);
const TypescriptSchema = object({
	jsxPragma: optional(string()),
	jsxPragmaFrag: optional(string()),
	onlyRemoveTypeImports: optional(boolean()),
	allowNamespaces: optional(boolean()),
	allowDeclareFields: optional(boolean()),
	declaration: optional(object({
		stripInternal: optional(boolean()),
		sourcemap: optional(boolean())
	})),
	rewriteImportExtensions: optional(RewriteImportExtensionsSchema)
});
const AssumptionsSchema = object({
	ignoreFunctionLength: optional(boolean()),
	noDocumentAll: optional(boolean()),
	objectRestNoSymbols: optional(boolean()),
	pureGetters: optional(boolean()),
	setPublicClassFields: optional(boolean())
});
const TransformOptionsSchema = object({
	assumptions: optional(AssumptionsSchema),
	typescript: optional(TypescriptSchema),
	helpers: optional(HelpersSchema),
	decorators: optional(DecoratorOptionSchema),
	jsx: optional(union([
		literal(false),
		literal("preserve"),
		literal("react"),
		literal("react-jsx"),
		JsxOptionsSchema
	])),
	target: pipe(optional(union([string(), array(string())])), description("The JavaScript target environment")),
	define: pipe(optional(record(string(), string())), description("Define global variables")),
	inject: pipe(optional(record(string(), union([string(), tuple([string(), string()])]))), description("Inject import statements on demand")),
	dropLabels: pipe(optional(array(string())), description("Remove labeled statements with these label names"))
});
const WatchOptionsSchema = strictObject({
	chokidar: optional(never(`The "watch.chokidar" option is deprecated, please use "watch.notify" instead of it`)),
	exclude: optional(union([StringOrRegExpSchema, array(StringOrRegExpSchema)])),
	include: optional(union([StringOrRegExpSchema, array(StringOrRegExpSchema)])),
	notify: pipe(optional(strictObject({
		compareContents: optional(boolean()),
		pollInterval: optional(number())
	})), description("Notify options")),
	skipWrite: pipe(optional(boolean()), description("Skip the bundle.write() step")),
	buildDelay: pipe(optional(number()), description("Throttle watch rebuilds")),
	clearScreen: pipe(optional(boolean()), description("Whether to clear the screen when a rebuild is triggered")),
	onInvalidate: pipe(optional(pipe(function_(), args(tuple([string()])))), description("An optional function that will be called immediately every time a module changes that is part of the build."))
});
const ChecksOptionsSchema = strictObject({
	circularDependency: pipe(optional(boolean()), description("Whether to emit warning when detecting circular dependency")),
	eval: pipe(optional(boolean()), description("Whether to emit warning when detecting eval")),
	missingGlobalName: pipe(optional(boolean()), description("Whether to emit warning when detecting missing global name")),
	missingNameOptionForIifeExport: pipe(optional(boolean()), description("Whether to emit warning when detecting missing name option for iife export")),
	mixedExport: pipe(optional(boolean()), description("Whether to emit warning when detecting mixed export")),
	unresolvedEntry: pipe(optional(boolean()), description("Whether to emit warning when detecting unresolved entry")),
	unresolvedImport: pipe(optional(boolean()), description("Whether to emit warning when detecting unresolved import")),
	filenameConflict: pipe(optional(boolean()), description("Whether to emit warning when detecting filename conflict")),
	commonJsVariableInEsm: pipe(optional(boolean()), description("Whether to emit warning when detecting common js variable in esm")),
	importIsUndefined: pipe(optional(boolean()), description("Whether to emit warning when detecting import is undefined")),
	emptyImportMeta: pipe(optional(boolean()), description("Whether to emit warning when detecting empty import meta")),
	configurationFieldConflict: pipe(optional(boolean()), description("Whether to emit warning when detecting configuration field conflict")),
	preferBuiltinFeature: pipe(optional(boolean()), description("Whether to emit warning when detecting prefer builtin feature"))
});
const CompressOptionsKeepNamesSchema = strictObject({
	function: boolean(),
	class: boolean()
});
const CompressOptionsSchema = strictObject({
	target: optional(union([
		literal("esnext"),
		literal("es2015"),
		literal("es2016"),
		literal("es2017"),
		literal("es2018"),
		literal("es2019"),
		literal("es2020"),
		literal("es2021"),
		literal("es2022"),
		literal("es2023"),
		literal("es2024")
	])),
	dropConsole: optional(boolean()),
	dropDebugger: optional(boolean()),
	keepNames: optional(CompressOptionsKeepNamesSchema),
	unused: optional(union([boolean(), literal("keep_assign")]))
});
const MangleOptionsKeepNamesSchema = strictObject({
	function: boolean(),
	class: boolean()
});
const MangleOptionsSchema = strictObject({
	toplevel: optional(boolean()),
	keepNames: optional(union([boolean(), MangleOptionsKeepNamesSchema])),
	debug: optional(boolean())
});
const CodegenOptionsSchema = strictObject({ removeWhitespace: optional(boolean()) });
const MinifyOptionsSchema = strictObject({
	compress: optional(union([boolean(), CompressOptionsSchema])),
	mangle: optional(union([boolean(), MangleOptionsSchema])),
	codegen: optional(union([boolean(), CodegenOptionsSchema]))
});
const ResolveOptionsSchema = strictObject({
	alias: optional(record(string(), union([
		literal(false),
		string(),
		array(string())
	]))),
	aliasFields: optional(array(array(string()))),
	conditionNames: optional(array(string())),
	extensionAlias: optional(record(string(), array(string()))),
	exportsFields: optional(array(array(string()))),
	extensions: optional(array(string())),
	mainFields: optional(array(string())),
	mainFiles: optional(array(string())),
	modules: optional(array(string())),
	symlinks: optional(boolean()),
	yarnPnp: optional(boolean())
});
const TreeshakingOptionsSchema = union([boolean(), looseObject({
	annotations: optional(boolean()),
	manualPureFunctions: optional(array(string())),
	unknownGlobalSideEffects: optional(boolean()),
	commonjs: optional(boolean()),
	propertyReadSideEffects: optional(union([literal(false), literal("always")])),
	propertyWriteSideEffects: optional(union([literal(false), literal("always")]))
})]);
const OptimizationOptionsSchema = strictObject({
	inlineConst: pipe(optional(union([boolean(), strictObject({
		mode: optional(union([literal("all"), literal("smart")])),
		pass: optional(number())
	})])), description("Enable crossmodule constant inlining")),
	pifeForModuleWrappers: pipe(optional(boolean()), description("Use PIFE pattern for module wrappers"))
});
const LogOrStringHandlerSchema = pipe(vFunction(), args(tuple([LogLevelWithErrorSchema, RollupLogWithStringSchema])));
const OnLogSchema = pipe(vFunction(), args(tuple([
	LogLevelSchema,
	RollupLogSchema,
	LogOrStringHandlerSchema
])));
const OnwarnSchema = pipe(vFunction(), args(tuple([RollupLogSchema, pipe(vFunction(), args(tuple([union([RollupLogWithStringSchema, pipe(vFunction(), returns(RollupLogWithStringSchema))])])))])));
const HmrSchema = union([boolean(), strictObject({
	new: optional(boolean()),
	port: optional(number()),
	host: optional(string()),
	implement: optional(string())
})]);
const InputOptionsSchema = strictObject({
	input: optional(InputOptionSchema),
	plugins: optional(custom(() => true)),
	external: optional(ExternalOptionSchema),
	makeAbsoluteExternalsRelative: optional(union([boolean(), literal("ifRelativeSource")])),
	resolve: optional(ResolveOptionsSchema),
	cwd: pipe(optional(string()), description("Current working directory")),
	platform: pipe(optional(union([
		literal("browser"),
		literal("neutral"),
		literal("node")
	])), description(`Platform for which the code should be generated (node, ${styleText$1("underline", "browser")}, neutral)`)),
	shimMissingExports: pipe(optional(boolean()), description("Create shim variables for missing exports")),
	treeshake: optional(TreeshakingOptionsSchema),
	optimization: optional(OptimizationOptionsSchema),
	logLevel: pipe(optional(LogLevelOptionSchema), description(`Log level (${styleText$1("dim", "silent")}, ${styleText$1(["underline", "gray"], "info")}, debug, ${styleText$1("yellow", "warn")})`)),
	onLog: optional(OnLogSchema),
	onwarn: optional(OnwarnSchema),
	moduleTypes: pipe(optional(ModuleTypesSchema), description("Module types for customized extensions")),
	experimental: optional(strictObject({
		disableLiveBindings: optional(boolean()),
		enableComposingJsPlugins: optional(boolean()),
		viteMode: optional(boolean()),
		resolveNewUrlToAsset: optional(boolean()),
		strictExecutionOrder: optional(boolean()),
		onDemandWrapping: optional(boolean()),
		incrementalBuild: optional(boolean()),
		hmr: optional(HmrSchema),
		attachDebugInfo: optional(union([
			literal("none"),
			literal("simple"),
			literal("full")
		])),
		chunkModulesOrder: optional(union([literal("module-id"), literal("exec-order")])),
		chunkImportMap: optional(union([boolean(), object({
			baseUrl: optional(string()),
			fileName: optional(string())
		})])),
		nativeMagicString: optional(boolean())
	})),
	transform: optional(TransformOptionsSchema),
	watch: optional(union([WatchOptionsSchema, literal(false)])),
	checks: optional(ChecksOptionsSchema),
	debug: pipe(optional(object({ sessionId: pipe(optional(string()), description("Used to name the build.")) })), description("Enable debug mode. Emit debug information to disk. This might slow down the build process significantly.")),
	preserveEntrySignatures: pipe(optional(union([
		literal("strict"),
		literal("allow-extension"),
		literal("exports-only"),
		literal(false)
	]))),
	tsconfig: pipe(optional(string()), description("Path to the tsconfig.json file."))
});
const InputCliOverrideSchema = strictObject({
	input: pipe(optional(array(string())), description("Entry file")),
	external: pipe(optional(array(string())), description("Comma-separated list of module ids to exclude from the bundle `<module-id>,...`")),
	treeshake: pipe(optional(boolean()), description("enable treeshaking")),
	makeAbsoluteExternalsRelative: pipe(optional(boolean()), description("Prevent normalization of external imports")),
	preserveEntrySignatures: pipe(optional(literal(false)), description("Avoid facade chunks for entry points")),
	context: pipe(optional(string()), description("The entity top-level `this` represents."))
});
const InputCliOptionsSchema = omit(strictObject({
	...InputOptionsSchema.entries,
	...InputCliOverrideSchema.entries
}), [
	"plugins",
	"onwarn",
	"onLog",
	"resolve",
	"experimental",
	"watch"
]);
const ModuleFormatSchema = union([
	literal("es"),
	literal("cjs"),
	literal("esm"),
	literal("module"),
	literal("commonjs"),
	literal("iife"),
	literal("umd")
]);
const AddonFunctionSchema = pipe(vFunction(), args(tuple([custom(() => true)])), returnsAsync(unionAsync([string(), pipeAsync(promise(), awaitAsync(), string())])));
const ChunkFileNamesFunctionSchema = pipe(vFunction(), args(tuple([custom(() => true)])), returns(string()));
const ChunkFileNamesSchema = union([string(), ChunkFileNamesFunctionSchema]);
const AssetFileNamesFunctionSchema = pipe(vFunction(), args(tuple([custom(() => true)])), returns(string()));
const AssetFileNamesSchema = union([string(), AssetFileNamesFunctionSchema]);
const SanitizeFileNameFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(string()));
const SanitizeFileNameSchema = union([boolean(), SanitizeFileNameFunctionSchema]);
const GlobalsFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(string()));
const PathsFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(string()));
const ManualChunksFunctionSchema = pipe(vFunction(), args(tuple([string(), object({})])), returns(nullish(string())));
const AdvancedChunksNameFunctionSchema = pipe(vFunction(), args(tuple([string(), object({})])), returns(nullish(string())));
const AdvancedChunksTestFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(union([
	boolean(),
	void_(),
	undefined_()
])));
const AdvancedChunksSchema = strictObject({
	includeDependenciesRecursively: optional(boolean()),
	minSize: optional(number()),
	maxSize: optional(number()),
	minModuleSize: optional(number()),
	maxModuleSize: optional(number()),
	minShareCount: optional(number()),
	groups: optional(array(strictObject({
		name: union([string(), AdvancedChunksNameFunctionSchema]),
		test: optional(union([StringOrRegExpSchema, AdvancedChunksTestFunctionSchema])),
		priority: optional(number()),
		minSize: optional(number()),
		minShareCount: optional(number()),
		maxSize: optional(number()),
		minModuleSize: optional(number()),
		maxModuleSize: optional(number())
	})))
});
const GeneratedCodePresetSchema = union([literal("es5"), literal("es2015")]);
const GeneratedCodeOptionsSchema = strictObject({
	symbols: pipe(optional(boolean()), description("Whether to use Symbol.toStringTag for namespace objects")),
	preset: GeneratedCodePresetSchema,
	profilerNames: pipe(optional(boolean()), description("Whether to add readable names to internal variables for profiling purposes"))
});
const OutputOptionsSchema = strictObject({
	dir: pipe(optional(string()), description("Output directory, defaults to `dist` if `file` is not set")),
	file: pipe(optional(string()), description("Single output file")),
	exports: pipe(optional(union([
		literal("auto"),
		literal("named"),
		literal("default"),
		literal("none")
	])), description(`Specify a export mode (${styleText$1("underline", "auto")}, named, default, none)`)),
	hashCharacters: pipe(optional(union([
		literal("base64"),
		literal("base36"),
		literal("hex")
	])), description("Use the specified character set for file hashes")),
	format: pipe(optional(ModuleFormatSchema), description(`Output format of the generated bundle (supports ${styleText$1("underline", "esm")}, cjs, and iife)`)),
	sourcemap: pipe(optional(union([
		boolean(),
		literal("inline"),
		literal("hidden")
	])), description(`Generate sourcemap (\`-s inline\` for inline, or ${styleText$1("bold", "pass the `-s` on the last argument if you want to generate `.map` file")})`)),
	sourcemapBaseUrl: pipe(optional(string()), description("Base URL used to prefix sourcemap paths")),
	sourcemapDebugIds: pipe(optional(boolean()), description("Inject sourcemap debug IDs")),
	sourcemapIgnoreList: optional(union([
		boolean(),
		custom(() => true),
		StringOrRegExpSchema
	])),
	sourcemapPathTransform: optional(custom(() => true)),
	banner: optional(union([string(), AddonFunctionSchema])),
	footer: optional(union([string(), AddonFunctionSchema])),
	intro: optional(union([string(), AddonFunctionSchema])),
	outro: optional(union([string(), AddonFunctionSchema])),
	extend: pipe(optional(boolean()), description("Extend global variable defined by name in IIFE / UMD formats")),
	esModule: optional(union([boolean(), literal("if-default-prop")])),
	assetFileNames: optional(AssetFileNamesSchema),
	entryFileNames: optional(ChunkFileNamesSchema),
	chunkFileNames: optional(ChunkFileNamesSchema),
	cssEntryFileNames: optional(ChunkFileNamesSchema),
	cssChunkFileNames: optional(ChunkFileNamesSchema),
	sanitizeFileName: optional(SanitizeFileNameSchema),
	minify: pipe(optional(union([
		boolean(),
		literal("dce-only"),
		MinifyOptionsSchema
	])), description("Minify the bundled file")),
	name: pipe(optional(string()), description("Name for UMD / IIFE format outputs")),
	globals: pipe(optional(union([record(string(), string()), GlobalsFunctionSchema])), description("Global variable of UMD / IIFE dependencies (syntax: `key=value`)")),
	paths: pipe(optional(union([record(string(), string()), PathsFunctionSchema])), description("Maps external module IDs to paths")),
	generatedCode: pipe(optional(partial(GeneratedCodeOptionsSchema)), description("Generated code options")),
	externalLiveBindings: pipe(optional(boolean()), description("external live bindings")),
	inlineDynamicImports: pipe(optional(boolean()), description("Inline dynamic imports")),
	manualChunks: optional(ManualChunksFunctionSchema),
	advancedChunks: optional(AdvancedChunksSchema),
	legalComments: pipe(optional(union([literal("none"), literal("inline")])), description("Control comments in the output")),
	plugins: optional(custom(() => true)),
	polyfillRequire: pipe(optional(boolean()), description("Disable require polyfill injection")),
	hoistTransitiveImports: optional(literal(false)),
	preserveModules: pipe(optional(boolean()), description("Preserve module structure")),
	preserveModulesRoot: pipe(optional(string()), description("Put preserved modules under this path at root level")),
	virtualDirname: optional(string()),
	minifyInternalExports: pipe(optional(boolean()), description("Minify internal exports")),
	topLevelVar: pipe(optional(boolean()), description("Rewrite top-level declarations to use `var`.")),
	cleanDir: pipe(optional(boolean()), description("Clean output directory before emitting output")),
	keepNames: pipe(optional(boolean()), description("Keep function and class names after bundling"))
});
const getAddonDescription = (placement, wrapper) => {
	return `Code to insert the ${styleText$1("bold", placement)} of the bundled file (${styleText$1("bold", wrapper)} the wrapper function)`;
};
const OutputCliOverrideSchema = strictObject({
	assetFileNames: pipe(optional(string()), description("Name pattern for asset files")),
	entryFileNames: pipe(optional(string()), description("Name pattern for emitted entry chunks")),
	chunkFileNames: pipe(optional(string()), description("Name pattern for emitted secondary chunks")),
	cssEntryFileNames: pipe(optional(string()), description("Name pattern for emitted css entry chunks")),
	cssChunkFileNames: pipe(optional(string()), description("Name pattern for emitted css secondary chunks")),
	sanitizeFileName: pipe(optional(boolean()), description("Sanitize file name")),
	banner: pipe(optional(string()), description(getAddonDescription("top", "outside"))),
	footer: pipe(optional(string()), description(getAddonDescription("bottom", "outside"))),
	intro: pipe(optional(string()), description(getAddonDescription("top", "inside"))),
	outro: pipe(optional(string()), description(getAddonDescription("bottom", "inside"))),
	esModule: pipe(optional(boolean()), description("Always generate `__esModule` marks in non-ESM formats, defaults to `if-default-prop` (use `--no-esModule` to always disable)")),
	globals: pipe(optional(record(string(), string())), description("Global variable of UMD / IIFE dependencies (syntax: `key=value`)")),
	advancedChunks: pipe(optional(strictObject({
		minSize: pipe(optional(number()), description("Minimum size of the chunk")),
		minShareCount: pipe(optional(number()), description("Minimum share count of the chunk"))
	})), description("Global variable of UMD / IIFE dependencies (syntax: `key=value`)")),
	minify: pipe(optional(boolean()), description("Minify the bundled file"))
});
const OutputCliOptionsSchema = omit(strictObject({
	...OutputOptionsSchema.entries,
	...OutputCliOverrideSchema.entries
}), [
	"sourcemapIgnoreList",
	"sourcemapPathTransform",
	"plugins",
	"hoistTransitiveImports"
]);
const CliOptionsSchema = strictObject({
	config: pipe(optional(union([string(), boolean()])), description("Path to the config file (default: `rolldown.config.js`)")),
	help: pipe(optional(boolean()), description("Show help")),
	environment: pipe(optional(union([string(), array(string())])), description("Pass additional settings to the config file via process.ENV.")),
	version: pipe(optional(boolean()), description("Show version number")),
	watch: pipe(optional(boolean()), description("Watch files in bundle and rebuild on changes")),
	...InputCliOptionsSchema.entries,
	...OutputCliOptionsSchema.entries
});
function validateCliOptions(options) {
	let parsed = safeParse(CliOptionsSchema, options);
	return [parsed.output, parsed.issues?.map((issue) => {
		return `Invalid value for option ${issue.path?.map((pathItem) => pathItem.key).join(" ")}: ${issue.message}`;
	})];
}
const inputHelperMsgRecord = {
	output: { ignored: true },
	"resolve.tsconfigFilename": { issueMsg: "It is deprecated. Please use the top-level `tsconfig` option instead." }
};
const outputHelperMsgRecord = {};
function validateOption(key, options) {
	if (typeof options !== "object") throw new Error(`Invalid ${key} options. Expected an Object but received ${JSON.stringify(options)}.`);
	if (globalThis.process?.env?.ROLLUP_TEST) return;
	let parsed = safeParse(key === "input" ? InputOptionsSchema : OutputOptionsSchema, options);
	if (!parsed.success) {
		const errors = parsed.issues.map((issue) => {
			let issueMsg = issue.message;
			const issuePaths = issue.path.map((path$1) => path$1.key);
			if (issue.type === "union") {
				const subIssue = issue.issues?.find((i) => !(i.type !== issue.received && i.input === issue.input));
				if (subIssue) {
					if (subIssue.path) issuePaths.push(subIssue.path.map((path$1) => path$1.key));
					issueMsg = subIssue.message;
				}
			}
			const stringPath = issuePaths.join(".");
			const helper = key === "input" ? inputHelperMsgRecord[stringPath] : outputHelperMsgRecord[stringPath];
			if (helper && helper.ignored) return "";
			return `- For the "${stringPath}". ${helper?.issueMsg || issueMsg + "."} ${helper?.help ? `\n  Help: ${helper.help}` : ""}`;
		}).filter(Boolean);
		if (errors.length) console.warn(`\x1b[33mWarning: Invalid ${key} options (${errors.length} issue${errors.length === 1 ? "" : "s"} found)\n${errors.join("\n")}\x1b[0m`);
	}
}
function getInputCliKeys() {
	return keyof(InputCliOptionsSchema).options;
}
function getOutputCliKeys() {
	return keyof(OutputCliOptionsSchema).options;
}
function getCliSchemaInfo() {
	return flattenValibotSchema(CliOptionsSchema);
}

//#endregion
//#region src/types/plain-object-like.ts
const LAZY_FIELDS_KEY = Symbol("__lazy_fields__");
/**
* Base class for classes that use `@lazyProp` decorated properties.
*
* **Design Pattern in Rolldown:**
* This is a common pattern in Rolldown due to its three-layer architecture:
* TypeScript API → NAPI Bindings → Rust Core
*
* **Why we use getters:**
* For performance - to lazily fetch data from Rust bindings only when needed,
* rather than eagerly fetching all data during object construction.
*
* **The problem:**
* Getters defined on class prototypes are non-enumerable by default, which breaks:
* - Object spread operators ({...obj})
* - Object.keys() and similar methods
* - Standard JavaScript object semantics
*
* **The solution:**
* This base class automatically converts `@lazyProp` decorated getters into
* own enumerable getters on each instance during construction.
*
* **Result:**
* Objects get both lazy-loading performance benefits AND plain JavaScript object behavior.
*
* @example
* ```typescript
* class MyClass extends PlainObjectLike {
*   @lazyProp
*   get myProp() {
*     return fetchFromRustBinding();
*   }
* }
* ```
*/
var PlainObjectLike = class {
	constructor() {
		setupLazyProperties(this);
	}
};
/**
* Set up lazy properties as own getters on an instance.
* This is called automatically by the `PlainObjectLike` base class constructor.
*
* @param instance - The instance to set up lazy properties on
* @internal
*/
function setupLazyProperties(instance$1) {
	const lazyFields = instance$1.constructor[LAZY_FIELDS_KEY];
	if (!lazyFields) return;
	for (const [propertyKey, originalGetter] of lazyFields.entries()) {
		let cachedValue;
		let hasValue = false;
		Object.defineProperty(instance$1, propertyKey, {
			get() {
				if (!hasValue) {
					cachedValue = originalGetter.call(this);
					hasValue = true;
				}
				return cachedValue;
			},
			enumerable: true,
			configurable: true
		});
	}
}
/**
* Get all lazy field names from a class instance.
*
* @param instance - Instance to inspect
* @returns Set of lazy property names
*/
function getLazyFields(instance$1) {
	const lazyFields = instance$1.constructor[LAZY_FIELDS_KEY];
	return lazyFields ? new Set(lazyFields.keys()) : /* @__PURE__ */ new Set();
}

//#endregion
//#region src/decorators/lazy.ts
/**
* Decorator that marks a getter as lazy-evaluated and cached.
*
* **What "lazy" means here:**
* 1. Data is lazily fetched from Rust bindings only when the property is accessed (not eagerly on construction)
* 2. Once fetched, the data is cached for subsequent accesses (performance optimization)
* 3. Despite being a getter, it behaves like a plain object property (enumerable, appears in Object.keys())
*
* **Important**: Properties decorated with `@lazyProp` are defined as own enumerable
* properties on each instance (not on the prototype). This ensures they:
* - Appear in Object.keys() and Object.getOwnPropertyNames()
* - Are included in object spreads ({...obj})
* - Are enumerable in for...in loops
*
* Classes using this decorator must extend `PlainObjectLike` base class.
*
* @example
* ```typescript
* class MyClass extends PlainObjectLike {
*   @lazyProp
*   get expensiveValue() {
*     return someExpensiveComputation();
*   }
* }
* ```
*/
function lazyProp(target, propertyKey, descriptor) {
	if (!target.constructor[LAZY_FIELDS_KEY]) target.constructor[LAZY_FIELDS_KEY] = /* @__PURE__ */ new Map();
	const originalGetter = descriptor.get;
	target.constructor[LAZY_FIELDS_KEY].set(propertyKey, originalGetter);
	return {
		enumerable: false,
		configurable: true
	};
}

//#endregion
//#region src/utils/asset-source.ts
function transformAssetSource(bindingAssetSource$1) {
	return bindingAssetSource$1.inner;
}
function bindingAssetSource(source) {
	return { inner: source };
}

//#endregion
//#region \0@oxc-project+runtime@0.97.0/helpers/decorate.js
function __decorate(decorators, target, key, desc) {
	var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	return c > 3 && r && Object.defineProperty(target, key, r), r;
}

//#endregion
//#region src/types/output-asset-impl.ts
var OutputAssetImpl = class extends PlainObjectLike {
	type = "asset";
	constructor(bindingAsset) {
		super();
		this.bindingAsset = bindingAsset;
	}
	get fileName() {
		return this.bindingAsset.getFileName();
	}
	get originalFileName() {
		return this.bindingAsset.getOriginalFileName() || null;
	}
	get originalFileNames() {
		return this.bindingAsset.getOriginalFileNames();
	}
	get name() {
		return this.bindingAsset.getName() ?? void 0;
	}
	get names() {
		return this.bindingAsset.getNames();
	}
	get source() {
		return transformAssetSource(this.bindingAsset.getSource());
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		if (keepDataAlive) this.#evaluateAllLazyFields();
		return this.bindingAsset.dropInner();
	}
	#evaluateAllLazyFields() {
		for (const field of getLazyFields(this)) this[field];
	}
};
__decorate([lazyProp], OutputAssetImpl.prototype, "fileName", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "originalFileName", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "originalFileNames", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "name", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "names", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "source", null);

//#endregion
//#region src/utils/transform-rendered-module.ts
function transformToRenderedModule(bindingRenderedModule) {
	return {
		get code() {
			return bindingRenderedModule.code;
		},
		get renderedLength() {
			return bindingRenderedModule.code?.length || 0;
		},
		get renderedExports() {
			return bindingRenderedModule.renderedExports;
		}
	};
}

//#endregion
//#region src/utils/transform-rendered-chunk.ts
function transformRenderedChunk(chunk) {
	let modules = null;
	return {
		type: "chunk",
		get name() {
			return chunk.name;
		},
		get isEntry() {
			return chunk.isEntry;
		},
		get isDynamicEntry() {
			return chunk.isDynamicEntry;
		},
		get facadeModuleId() {
			return chunk.facadeModuleId;
		},
		get moduleIds() {
			return chunk.moduleIds;
		},
		get exports() {
			return chunk.exports;
		},
		get fileName() {
			return chunk.fileName;
		},
		get imports() {
			return chunk.imports;
		},
		get dynamicImports() {
			return chunk.dynamicImports;
		},
		get modules() {
			if (!modules) modules = transformChunkModules(chunk.modules);
			return modules;
		}
	};
}
function transformChunkModules(modules) {
	const result = {};
	for (let i = 0; i < modules.values.length; i++) {
		let key = modules.keys[i];
		const mod = modules.values[i];
		result[key] = transformToRenderedModule(mod);
	}
	return result;
}

//#endregion
//#region src/types/output-chunk-impl.ts
var OutputChunkImpl = class extends PlainObjectLike {
	type = "chunk";
	constructor(bindingChunk) {
		super();
		this.bindingChunk = bindingChunk;
	}
	get fileName() {
		return this.bindingChunk.getFileName();
	}
	get name() {
		return this.bindingChunk.getName();
	}
	get exports() {
		return this.bindingChunk.getExports();
	}
	get isEntry() {
		return this.bindingChunk.getIsEntry();
	}
	get facadeModuleId() {
		return this.bindingChunk.getFacadeModuleId() || null;
	}
	get isDynamicEntry() {
		return this.bindingChunk.getIsDynamicEntry();
	}
	get sourcemapFileName() {
		return this.bindingChunk.getSourcemapFileName() || null;
	}
	get preliminaryFileName() {
		return this.bindingChunk.getPreliminaryFileName();
	}
	get code() {
		return this.bindingChunk.getCode();
	}
	get modules() {
		return transformChunkModules(this.bindingChunk.getModules());
	}
	get imports() {
		return this.bindingChunk.getImports();
	}
	get dynamicImports() {
		return this.bindingChunk.getDynamicImports();
	}
	get moduleIds() {
		return this.bindingChunk.getModuleIds();
	}
	get map() {
		const mapString = this.bindingChunk.getMap();
		return mapString ? transformToRollupSourceMap(mapString) : null;
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		if (keepDataAlive) this.#evaluateAllLazyFields();
		return this.bindingChunk.dropInner();
	}
	#evaluateAllLazyFields() {
		for (const field of getLazyFields(this)) this[field];
	}
};
__decorate([lazyProp], OutputChunkImpl.prototype, "fileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "name", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "exports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "isEntry", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "facadeModuleId", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "isDynamicEntry", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "sourcemapFileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "preliminaryFileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "code", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "modules", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "imports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "dynamicImports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "moduleIds", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "map", null);

//#endregion
//#region src/types/sourcemap.ts
function bindingifySourcemap$1(map) {
	if (map == null) return;
	return { inner: typeof map === "string" ? map : {
		file: map.file ?? void 0,
		mappings: map.mappings,
		sourceRoot: "sourceRoot" in map ? map.sourceRoot ?? void 0 : void 0,
		sources: map.sources?.map((s) => s ?? void 0),
		sourcesContent: map.sourcesContent?.map((s) => s ?? void 0),
		names: map.names,
		x_google_ignoreList: map.x_google_ignoreList,
		debugId: "debugId" in map ? map.debugId : void 0
	} };
}

//#endregion
//#region src/utils/transform-to-rollup-output.ts
function transformToRollupSourceMap(map) {
	const obj = {
		...JSON.parse(map),
		toString() {
			return JSON.stringify(obj);
		},
		toUrl() {
			return `data:application/json;charset=utf-8;base64,${Buffer.from(obj.toString(), "utf-8").toString("base64")}`;
		}
	};
	return obj;
}
function transformToRollupOutputChunk(bindingChunk) {
	return new OutputChunkImpl(bindingChunk);
}
function transformToMutableRollupOutputChunk(bindingChunk, changed) {
	const chunk = {
		type: "chunk",
		get code() {
			return bindingChunk.getCode();
		},
		fileName: bindingChunk.getFileName(),
		name: bindingChunk.getName(),
		get modules() {
			return transformChunkModules(bindingChunk.getModules());
		},
		get imports() {
			return bindingChunk.getImports();
		},
		get dynamicImports() {
			return bindingChunk.getDynamicImports();
		},
		exports: bindingChunk.getExports(),
		isEntry: bindingChunk.getIsEntry(),
		facadeModuleId: bindingChunk.getFacadeModuleId() || null,
		isDynamicEntry: bindingChunk.getIsDynamicEntry(),
		get moduleIds() {
			return bindingChunk.getModuleIds();
		},
		get map() {
			const map = bindingChunk.getMap();
			return map ? transformToRollupSourceMap(map) : null;
		},
		sourcemapFileName: bindingChunk.getSourcemapFileName() || null,
		preliminaryFileName: bindingChunk.getPreliminaryFileName()
	};
	const cache = {};
	return new Proxy(chunk, {
		get(target, p) {
			if (p in cache) return cache[p];
			const value = target[p];
			cache[p] = value;
			return value;
		},
		set(_target, p, newValue) {
			cache[p] = newValue;
			changed.updated.add(bindingChunk.getFileName());
			return true;
		},
		has(target, p) {
			if (p in cache) return true;
			return p in target;
		}
	});
}
function transformToRollupOutputAsset(bindingAsset) {
	return new OutputAssetImpl(bindingAsset);
}
function transformToMutableRollupOutputAsset(bindingAsset, changed) {
	const asset = {
		type: "asset",
		fileName: bindingAsset.getFileName(),
		originalFileName: bindingAsset.getOriginalFileName() || null,
		originalFileNames: bindingAsset.getOriginalFileNames(),
		get source() {
			return transformAssetSource(bindingAsset.getSource());
		},
		name: bindingAsset.getName() ?? void 0,
		names: bindingAsset.getNames()
	};
	const cache = {};
	return new Proxy(asset, {
		get(target, p) {
			if (p in cache) return cache[p];
			const value = target[p];
			cache[p] = value;
			return value;
		},
		set(_target, p, newValue) {
			cache[p] = newValue;
			changed.updated.add(bindingAsset.getFileName());
			return true;
		}
	});
}
function transformToRollupOutput(output) {
	const { chunks, assets } = output;
	return { output: [...chunks.map((chunk) => transformToRollupOutputChunk(chunk)), ...assets.map((asset) => transformToRollupOutputAsset(asset))] };
}
function transformToMutableRollupOutput(output, changed) {
	const { chunks, assets } = output;
	return { output: [...chunks.map((chunk) => transformToMutableRollupOutputChunk(chunk, changed)), ...assets.map((asset) => transformToMutableRollupOutputAsset(asset, changed))] };
}
function transformToOutputBundle(context, output, changed) {
	const bundle = Object.fromEntries(transformToMutableRollupOutput(output, changed).output.map((item) => [item.fileName, item]));
	return new Proxy(bundle, {
		set(_target, _p, _newValue, _receiver) {
			const originalStackTraceLimit = Error.stackTraceLimit;
			Error.stackTraceLimit = 2;
			const message = "This plugin assigns to bundle variable. This is discouraged by Rollup and is not supported by Rolldown. This will be ignored. https://rollupjs.org/plugin-development/#generatebundle:~:text=DANGER,this.emitFile.";
			const stack = new Error(message).stack ?? message;
			Error.stackTraceLimit = originalStackTraceLimit;
			context.warn({
				message: stack,
				code: "UNSUPPORTED_BUNDLE_ASSIGNMENT"
			});
			return true;
		},
		deleteProperty(target, property) {
			if (typeof property === "string") changed.deleted.add(property);
			return true;
		}
	});
}
function collectChangedBundle(changed, bundle) {
	const changes = {};
	for (const key in bundle) {
		if (changed.deleted.has(key) || !changed.updated.has(key)) continue;
		const item = bundle[key];
		if (item.type === "asset") changes[key] = {
			filename: item.fileName,
			originalFileNames: item.originalFileNames,
			source: bindingAssetSource(item.source),
			names: item.names
		};
		else changes[key] = {
			code: item.code,
			filename: item.fileName,
			name: item.name,
			isEntry: item.isEntry,
			exports: item.exports,
			modules: {},
			imports: item.imports,
			dynamicImports: item.dynamicImports,
			facadeModuleId: item.facadeModuleId || void 0,
			isDynamicEntry: item.isDynamicEntry,
			moduleIds: item.moduleIds,
			map: bindingifySourcemap$1(item.map),
			sourcemapFilename: item.sourcemapFileName || void 0,
			preliminaryFilename: item.preliminaryFileName
		};
	}
	return {
		changes,
		deleted: changed.deleted
	};
}

//#endregion
//#region src/types/rolldown-output-impl.ts
var RolldownOutputImpl = class extends PlainObjectLike {
	constructor(bindingOutputs) {
		super();
		this.bindingOutputs = bindingOutputs;
	}
	get output() {
		return transformToRollupOutput(this.bindingOutputs).output;
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		const results = this.output.map((item) => item.__rolldown_external_memory_handle__(keepDataAlive));
		if (!results.every((r) => r.freed)) {
			const reasons = results.filter((r) => !r.freed).map((r) => r.reason).filter(Boolean);
			return {
				freed: false,
				reason: `Failed to free ${reasons.length} item(s): ${reasons.join("; ")}`
			};
		}
		return { freed: true };
	}
};
__decorate([lazyProp], RolldownOutputImpl.prototype, "output", null);

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
function isEmptySourcemapFiled(array$1) {
	if (!array$1) return true;
	if (array$1.length === 0 || !array$1[0]) return true;
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
			let args$1 = expr.args;
			for (let i = args$1.length - 1; i >= 0; i--) bindingifyFilterExprImpl(args$1[i], list);
			list.push({
				kind: "And",
				payload: args$1.length
			});
			break;
		}
		case "or": {
			let args$1 = expr.args;
			for (let i = args$1.length - 1; i >= 0; i--) bindingifyFilterExprImpl(args$1[i], list);
			list.push({
				kind: "Or",
				payload: args$1.length
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
var import_binding$6 = require_binding();
function bindingifyPluginHookMeta(options) {
	return { order: bindingPluginOrder(options.order) };
}
function bindingPluginOrder(order) {
	switch (order) {
		case "post": return import_binding$6.BindingPluginOrder.Post;
		case "pre": return import_binding$6.BindingPluginOrder.Pre;
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
		const getLogHandler$1 = (handler) => (log, pos) => {
			log = normalizeLog(log);
			if (pos) augmentCodeLocation(log, pos, moduleSource, moduleId);
			log.id = moduleId;
			log.hook = "transform";
			handler(log);
		};
		this.debug = getLogHandler$1(this.debug);
		this.warn = getLogHandler$1(this.warn);
		this.info = getLogHandler$1(this.info);
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
var import_binding$5 = require_binding();
function bindingifyBuildStart(args$1) {
	const hook = args$1.plugin.buildStart;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, opts) => {
			await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), args$1.pluginContextData.getInputOptions(opts));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyBuildEnd(args$1) {
	const hook = args$1.plugin.buildEnd;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, err) => {
			await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), err ? aggregateBindingErrorsIntoJsError(err) : void 0);
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyResolveId(args$1) {
	const hook = args$1.plugin.resolveId;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, specifier, importer, extraOptions) => {
			const contextResolveOptions = extraOptions.custom != null ? args$1.pluginContextData.getSavedResolveOptions(extraOptions.custom) : void 0;
			const ret = await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), specifier, importer ?? void 0, {
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
			let exist = args$1.pluginContextData.updateModuleOption(ret.id, {
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
function bindingifyResolveDynamicImport(args$1) {
	const hook = args$1.plugin.resolveDynamicImport;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, specifier, importer) => {
			const ret = await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), specifier, importer ?? void 0);
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
			args$1.pluginContextData.updateModuleOption(ret.id, {
				meta: ret.meta || {},
				moduleSideEffects: ret.moduleSideEffects || null,
				invalidate: false
			});
			return result;
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyTransform(args$1) {
	const hook = args$1.plugin.transform;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, code, id, meta$1) => {
			let magicStringInstance, astInstance;
			Object.defineProperties(meta$1, {
				magicString: { get() {
					if (magicStringInstance) return magicStringInstance;
					magicStringInstance = new import_binding$5.BindingMagicString(code);
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
			const transformCtx = new TransformPluginContextImpl(args$1.outputOptions, ctx.inner(), args$1.plugin, args$1.pluginContextData, ctx, id, code, args$1.onLog, args$1.logLevel, args$1.watchMode);
			const ret = await handler.call(transformCtx, code, id, meta$1);
			if (ret == null) return;
			if (typeof ret === "string") return { code: ret };
			let moduleOption = args$1.pluginContextData.updateModuleOption(id, {
				meta: ret.meta ?? {},
				moduleSideEffects: ret.moduleSideEffects ?? null,
				invalidate: false
			});
			let normalizedCode = void 0;
			let map = ret.map;
			if (typeof ret.code === "string") normalizedCode = ret.code;
			else if (ret.code instanceof import_binding$5.BindingMagicString) {
				let magicString = ret.code;
				normalizedCode = magicString.toString();
				let fallbackSourcemap = ctx.sendMagicString(magicString);
				if (fallbackSourcemap != void 0) map = fallbackSourcemap;
			}
			return {
				code: normalizedCode,
				map: bindingifySourcemap$1(normalizeTransformHookSourcemap(id, code, map)),
				moduleSideEffects: moduleOption.moduleSideEffects ?? void 0,
				moduleType: ret.moduleType
			};
		},
		meta: bindingifyPluginHookMeta(meta),
		filter: bindingifyTransformFilter(options.filter)
	};
}
function bindingifyLoad(args$1) {
	const hook = args$1.plugin.load;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, id) => {
			const ret = await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode, id), id);
			if (ret == null) return;
			if (typeof ret === "string") return { code: ret };
			let moduleOption = args$1.pluginContextData.updateModuleOption(id, {
				meta: ret.meta || {},
				moduleSideEffects: ret.moduleSideEffects ?? null,
				invalidate: false
			});
			let map = preProcessSourceMap(ret, id);
			return {
				code: ret.code,
				map: bindingifySourcemap$1(map),
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
function bindingifyModuleParsed(args$1) {
	const hook = args$1.plugin.moduleParsed;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, moduleInfo) => {
			await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), transformModuleInfo(moduleInfo, args$1.pluginContextData.getModuleOption(moduleInfo.id)));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}

//#endregion
//#region src/plugin/bindingify-output-hooks.ts
function bindingifyRenderStart(args$1) {
	const hook = args$1.plugin.renderStart;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, opts) => {
			handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), args$1.pluginContextData.getOutputOptions(opts), args$1.pluginContextData.getInputOptions(opts));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyRenderChunk(args$1) {
	const hook = args$1.plugin.renderChunk;
	if (!hook) return {};
	const { handler, meta, options } = normalizeHook(hook);
	return {
		plugin: async (ctx, code, chunk, opts, meta$1) => {
			if (args$1.pluginContextData.getRenderChunkMeta() == null) args$1.pluginContextData.setRenderChunkMeta({ chunks: Object.fromEntries(Object.entries(meta$1.chunks).map(([key, value]) => [key, transformRenderedChunk(value)])) });
			const ret = await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), code, transformRenderedChunk(chunk), args$1.pluginContextData.getOutputOptions(opts), args$1.pluginContextData.getRenderChunkMeta());
			if (ret == null) return;
			if (typeof ret === "string") return { code: ret };
			if (!ret.map) return { code: ret.code };
			return {
				code: ret.code,
				map: bindingifySourcemap$1(ret.map)
			};
		},
		meta: bindingifyPluginHookMeta(meta),
		filter: bindingifyRenderChunkFilter(options.filter)
	};
}
function bindingifyAugmentChunkHash(args$1) {
	const hook = args$1.plugin.augmentChunkHash;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			return handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyRenderError(args$1) {
	const hook = args$1.plugin.renderError;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, err) => {
			handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), aggregateBindingErrorsIntoJsError(err));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyGenerateBundle(args$1) {
	const hook = args$1.plugin.generateBundle;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, bundle, isWrite, opts) => {
			const changed = {
				updated: /* @__PURE__ */ new Set(),
				deleted: /* @__PURE__ */ new Set()
			};
			const context = new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode);
			const output = transformToOutputBundle(context, unwrapBindingResult(bundle), changed);
			await handler.call(context, args$1.pluginContextData.getOutputOptions(opts), output, isWrite);
			return collectChangedBundle(changed, output);
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyWriteBundle(args$1) {
	const hook = args$1.plugin.writeBundle;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, bundle, opts) => {
			const changed = {
				updated: /* @__PURE__ */ new Set(),
				deleted: /* @__PURE__ */ new Set()
			};
			const context = new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode);
			const output = transformToOutputBundle(context, unwrapBindingResult(bundle), changed);
			await handler.call(context, args$1.pluginContextData.getOutputOptions(opts), output);
			return collectChangedBundle(changed, output);
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyCloseBundle(args$1) {
	const hook = args$1.plugin.closeBundle;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx) => {
			await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyBanner(args$1) {
	const hook = args$1.plugin.banner;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyFooter(args$1) {
	const hook = args$1.plugin.footer;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyIntro(args$1) {
	const hook = args$1.plugin.intro;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyOutro(args$1) {
	const hook = args$1.plugin.outro;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, chunk) => {
			if (typeof handler === "string") return handler;
			return handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), transformRenderedChunk(chunk));
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}

//#endregion
//#region src/plugin/bindingify-watch-hooks.ts
function bindingifyWatchChange(args$1) {
	const hook = args$1.plugin.watchChange;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx, id, event) => {
			await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode), id, { event });
		},
		meta: bindingifyPluginHookMeta(meta)
	};
}
function bindingifyCloseWatcher(args$1) {
	const hook = args$1.plugin.closeWatcher;
	if (!hook) return {};
	const { handler, meta } = normalizeHook(hook);
	return {
		plugin: async (ctx) => {
			await handler.call(new PluginContextImpl(args$1.outputOptions, ctx, args$1.plugin, args$1.pluginContextData, args$1.onLog, args$1.logLevel, args$1.watchMode));
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
	const args$1 = {
		plugin,
		options,
		outputOptions,
		pluginContextData,
		onLog,
		logLevel,
		watchMode,
		normalizedOutputPlugins
	};
	const { plugin: buildStart, meta: buildStartMeta } = bindingifyBuildStart(args$1);
	const { plugin: resolveId, meta: resolveIdMeta, filter: resolveIdFilter } = bindingifyResolveId(args$1);
	const { plugin: resolveDynamicImport, meta: resolveDynamicImportMeta } = bindingifyResolveDynamicImport(args$1);
	const { plugin: buildEnd, meta: buildEndMeta } = bindingifyBuildEnd(args$1);
	const { plugin: transform, meta: transformMeta, filter: transformFilter } = bindingifyTransform(args$1);
	const { plugin: moduleParsed, meta: moduleParsedMeta } = bindingifyModuleParsed(args$1);
	const { plugin: load$1, meta: loadMeta, filter: loadFilter } = bindingifyLoad(args$1);
	const { plugin: renderChunk, meta: renderChunkMeta, filter: renderChunkFilter } = bindingifyRenderChunk(args$1);
	const { plugin: augmentChunkHash, meta: augmentChunkHashMeta } = bindingifyAugmentChunkHash(args$1);
	const { plugin: renderStart, meta: renderStartMeta } = bindingifyRenderStart(args$1);
	const { plugin: renderError, meta: renderErrorMeta } = bindingifyRenderError(args$1);
	const { plugin: generateBundle, meta: generateBundleMeta } = bindingifyGenerateBundle(args$1);
	const { plugin: writeBundle, meta: writeBundleMeta } = bindingifyWriteBundle(args$1);
	const { plugin: closeBundle, meta: closeBundleMeta } = bindingifyCloseBundle(args$1);
	const { plugin: banner, meta: bannerMeta } = bindingifyBanner(args$1);
	const { plugin: footer, meta: footerMeta } = bindingifyFooter(args$1);
	const { plugin: intro, meta: introMeta } = bindingifyIntro(args$1);
	const { plugin: outro, meta: outroMeta } = bindingifyOutro(args$1);
	const { plugin: watchChange, meta: watchChangeMeta } = bindingifyWatchChange(args$1);
	const { plugin: closeWatcher, meta: closeWatcherMeta } = bindingifyCloseWatcher(args$1);
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
		load: load$1,
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
		if (handler) plugin[hookName] = async (...args$1) => {
			try {
				return await handler(...args$1);
			} catch (e$1) {
				return error(logPluginError(e$1, plugin.name, {
					hook: hookName,
					id: hookName === "transform" ? args$1[2] : void 0
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
var import_binding$4 = require_binding();
function bindingifyInputOptions(rawPlugins, inputOptions, outputOptions, normalizedOutputPlugins, onLog, logLevel, watchMode) {
	const pluginContextData = new PluginContextData(onLog, outputOptions, normalizedOutputPlugins);
	const plugins = rawPlugins.map((plugin) => {
		if ("_parallel" in plugin) return;
		if (plugin instanceof BuiltinPlugin) return bindingifyBuiltInPlugin(plugin);
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
		case "full": return import_binding$4.BindingAttachDebugInfo.Full;
		case "simple": return import_binding$4.BindingAttachDebugInfo.Simple;
		case "none": return import_binding$4.BindingAttachDebugInfo.None;
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
	let chunkModulesOrder = import_binding$4.BindingChunkModuleOrderBy.ExecOrder;
	if (experimental?.chunkModulesOrder) switch (experimental.chunkModulesOrder) {
		case "exec-order":
			chunkModulesOrder = import_binding$4.BindingChunkModuleOrderBy.ExecOrder;
			break;
		case "module-id":
			chunkModulesOrder = import_binding$4.BindingChunkModuleOrderBy.ModuleId;
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
		case "silent": return import_binding$4.BindingLogLevel.Silent;
		case "debug": return import_binding$4.BindingLogLevel.Debug;
		case "warn": return import_binding$4.BindingLogLevel.Warn;
		case "info": return import_binding$4.BindingLogLevel.Info;
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
function bindingifyWatch(watch$1) {
	if (watch$1) return {
		buildDelay: watch$1.buildDelay,
		skipWrite: watch$1.skipWrite,
		include: normalizedStringOrRegex(watch$1.include),
		exclude: normalizedStringOrRegex(watch$1.exclude),
		onInvalidate: (...args$1) => watch$1.onInvalidate?.(...args$1)
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
			normalizedConfig.propertyReadSideEffects = import_binding$4.BindingPropertyReadSideEffects.Always;
			break;
		case false:
			normalizedConfig.propertyReadSideEffects = import_binding$4.BindingPropertyReadSideEffects.False;
			break;
		default:
	}
	switch (config.propertyWriteSideEffects) {
		case "always":
			normalizedConfig.propertyWriteSideEffects = import_binding$4.BindingPropertyWriteSideEffects.Always;
			break;
		case false:
			normalizedConfig.propertyWriteSideEffects = import_binding$4.BindingPropertyWriteSideEffects.False;
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
//#region src/types/chunking-context.ts
var ChunkingContextImpl = class {
	constructor(context) {
		this.context = context;
	}
	getModuleInfo(moduleId) {
		const bindingInfo = this.context.getModuleInfo(moduleId);
		if (bindingInfo) return transformModuleInfo(bindingInfo, {
			moduleSideEffects: null,
			meta: {}
		});
		return null;
	}
};

//#endregion
//#region src/utils/bindingify-output-options.ts
function bindingifyOutputOptions(outputOptions) {
	const { dir, format, exports, hashCharacters, sourcemap, sourcemapBaseUrl, sourcemapDebugIds, sourcemapIgnoreList, sourcemapPathTransform, name, assetFileNames, entryFileNames, chunkFileNames, cssEntryFileNames, cssChunkFileNames, banner, footer, intro, outro, esModule, globals, paths, generatedCode, file, sanitizeFileName, preserveModules, virtualDirname, legalComments, preserveModulesRoot, manualChunks, topLevelVar, cleanDir } = outputOptions;
	const advancedChunks = bindingifyAdvancedChunks(outputOptions.advancedChunks, manualChunks);
	return {
		dir,
		file: file == null ? void 0 : file,
		format: bindingifyFormat(format),
		exports,
		hashCharacters,
		sourcemap: bindingifySourcemap(sourcemap),
		sourcemapBaseUrl,
		sourcemapDebugIds,
		sourcemapIgnoreList: sourcemapIgnoreList ?? /node_modules/,
		sourcemapPathTransform,
		banner: bindingifyAddon(banner),
		footer: bindingifyAddon(footer),
		intro: bindingifyAddon(intro),
		outro: bindingifyAddon(outro),
		extend: outputOptions.extend,
		globals,
		paths,
		generatedCode,
		esModule,
		name,
		assetFileNames: bindingifyAssetFilenames(assetFileNames),
		entryFileNames,
		chunkFileNames,
		cssEntryFileNames,
		cssChunkFileNames,
		plugins: [],
		minify: outputOptions.minify,
		externalLiveBindings: outputOptions.externalLiveBindings,
		inlineDynamicImports: outputOptions.inlineDynamicImports,
		advancedChunks,
		polyfillRequire: outputOptions.polyfillRequire,
		sanitizeFileName,
		preserveModules,
		virtualDirname,
		legalComments,
		preserveModulesRoot,
		topLevelVar,
		minifyInternalExports: outputOptions.minifyInternalExports,
		cleanDir
	};
}
function bindingifyAddon(configAddon) {
	return async (chunk) => {
		if (typeof configAddon === "function") return configAddon(transformRenderedChunk(chunk));
		return configAddon || "";
	};
}
function bindingifyFormat(format) {
	switch (format) {
		case void 0:
		case "es":
		case "esm":
		case "module": return "es";
		case "cjs":
		case "commonjs": return "cjs";
		case "iife": return "iife";
		case "umd": return "umd";
		default: unimplemented(`output.format: ${format}`);
	}
}
function bindingifySourcemap(sourcemap) {
	switch (sourcemap) {
		case true: return "file";
		case "inline": return "inline";
		case false:
		case void 0: return;
		case "hidden": return "hidden";
		default: throw new Error(`unknown sourcemap: ${sourcemap}`);
	}
}
function bindingifyAssetFilenames(assetFileNames) {
	if (typeof assetFileNames === "function") return (asset) => {
		return assetFileNames({
			name: asset.name,
			names: asset.names,
			originalFileName: asset.originalFileName,
			originalFileNames: asset.originalFileNames,
			source: transformAssetSource(asset.source),
			type: "asset"
		});
	};
	return assetFileNames;
}
function bindingifyAdvancedChunks(advancedChunks, manualChunks) {
	if (manualChunks != null && advancedChunks != null) console.warn("`manualChunks` option is ignored due to `advancedChunks` option is specified.");
	else if (manualChunks != null) advancedChunks = { groups: [{ name(moduleId, ctx) {
		return manualChunks(moduleId, { getModuleInfo: (id) => ctx.getModuleInfo(id) });
	} }] };
	if (advancedChunks == null) return;
	const { groups, ...restAdvancedChunks } = advancedChunks;
	return {
		...restAdvancedChunks,
		groups: groups?.map((group) => {
			const { name, ...restGroup } = group;
			return {
				...restGroup,
				name: typeof name === "function" ? (id, ctx) => name(id, new ChunkingContextImpl(ctx)) : name
			};
		})
	};
}

//#endregion
//#region src/utils/initialize-parallel-plugins.ts
var import_binding$3 = require_binding();
async function initializeParallelPlugins(plugins) {
	const pluginInfos = [];
	for (const [index, plugin] of plugins.entries()) if ("_parallel" in plugin) {
		const { fileUrl, options } = plugin._parallel;
		pluginInfos.push({
			index,
			fileUrl,
			options
		});
	}
	if (pluginInfos.length <= 0) return;
	const count = availableParallelism();
	const parallelJsPluginRegistry = new import_binding$3.ParallelJsPluginRegistry(count);
	const registryId = parallelJsPluginRegistry.id;
	const workers = await initializeWorkers(registryId, count, pluginInfos);
	const stopWorkers = async () => {
		await Promise.all(workers.map((worker) => worker.terminate()));
	};
	return {
		registry: parallelJsPluginRegistry,
		stopWorkers
	};
}
function initializeWorkers(registryId, count, pluginInfos) {
	return Promise.all(Array.from({ length: count }, (_, i) => initializeWorker(registryId, pluginInfos, i)));
}
async function initializeWorker(registryId, pluginInfos, threadNumber) {
	const urlString = import.meta.resolve("#parallel-plugin-worker");
	const workerData$1 = {
		registryId,
		pluginInfos,
		threadNumber
	};
	let worker;
	try {
		worker = new Worker(new URL(urlString), { workerData: workerData$1 });
		worker.unref();
		await new Promise((resolve, reject) => {
			worker.once("message", async (message) => {
				if (message.type === "error") reject(message.error);
				else resolve();
			});
		});
		return worker;
	} catch (e$1) {
		worker?.terminate();
		throw e$1;
	}
}
const availableParallelism = () => {
	let availableParallelism$1 = 1;
	try {
		availableParallelism$1 = os.availableParallelism();
	} catch {
		const cpus = os.cpus();
		if (Array.isArray(cpus) && cpus.length > 0) availableParallelism$1 = cpus.length;
	}
	return Math.min(availableParallelism$1, 8);
};

//#endregion
//#region src/utils/create-bundler-option.ts
async function createBundlerOptions(inputOptions, outputOptions, watchMode) {
	const inputPlugins = await normalizePluginOption(inputOptions.plugins);
	const outputPlugins = await normalizePluginOption(outputOptions.plugins);
	const logLevel = inputOptions.logLevel || LOG_LEVEL_INFO;
	const onLog = getLogger(getObjectPlugins(inputPlugins), getOnLog(inputOptions, logLevel), logLevel, watchMode);
	outputOptions = PluginDriver.callOutputOptionsHook([...inputPlugins, ...outputPlugins], outputOptions, onLog, logLevel, watchMode);
	const normalizedOutputPlugins = await normalizePluginOption(outputOptions.plugins);
	let plugins = [...normalizePlugins(inputPlugins, ANONYMOUS_PLUGIN_PREFIX), ...checkOutputPluginOption(normalizePlugins(normalizedOutputPlugins, ANONYMOUS_OUTPUT_PLUGIN_PREFIX), onLog)];
	const parallelPluginInitResult = await initializeParallelPlugins(plugins);
	try {
		return {
			bundlerOptions: {
				inputOptions: bindingifyInputOptions(plugins, inputOptions, outputOptions, normalizedOutputPlugins, onLog, logLevel, watchMode),
				outputOptions: bindingifyOutputOptions(outputOptions),
				parallelPluginsRegistry: parallelPluginInitResult?.registry
			},
			inputOptions,
			onLog,
			stopWorkers: parallelPluginInitResult?.stopWorkers
		};
	} catch (e$1) {
		await parallelPluginInitResult?.stopWorkers();
		throw e$1;
	}
}

//#endregion
//#region src/api/rolldown/rolldown-build.ts
var import_binding$2 = require_binding();
Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");
var RolldownBuild = class RolldownBuild {
	#inputOptions;
	#bundler;
	#stopWorkers;
	static asyncRuntimeShutdown = false;
	constructor(inputOptions) {
		this.#inputOptions = inputOptions;
		this.#bundler = new import_binding$2.BindingBundler();
	}
	get closed() {
		return this.#bundler.closed;
	}
	async generate(outputOptions = {}) {
		return this.#build(false, outputOptions);
	}
	async write(outputOptions = {}) {
		return this.#build(true, outputOptions);
	}
	/**
	* Close the build and free resources.
	*/
	async close() {
		await this.#stopWorkers?.();
		await this.#bundler.close();
		(0, import_binding$2.shutdownAsyncRuntime)();
		RolldownBuild.asyncRuntimeShutdown = true;
		this.#stopWorkers = void 0;
	}
	async [Symbol.asyncDispose]() {
		await this.close();
	}
	get watchFiles() {
		return Promise.resolve(this.#bundler.getWatchFiles());
	}
	async #build(isWrite, outputOptions) {
		validateOption("output", outputOptions);
		await this.#stopWorkers?.();
		const option = await createBundlerOptions(this.#inputOptions, outputOptions, false);
		if (RolldownBuild.asyncRuntimeShutdown) (0, import_binding$2.startAsyncRuntime)();
		try {
			this.#stopWorkers = option.stopWorkers;
			let output;
			if (isWrite) output = await this.#bundler.write(option.bundlerOptions);
			else output = await this.#bundler.generate(option.bundlerOptions);
			return new RolldownOutputImpl(unwrapBindingResult(output));
		} catch (e$1) {
			await option.stopWorkers?.();
			throw e$1;
		}
	}
};

//#endregion
//#region src/api/rolldown/index.ts
const rolldown = async (input) => {
	validateOption("input", input);
	return new RolldownBuild(await PluginDriver.callOptionsHook(input));
};

//#endregion
//#region src/api/build.ts
async function build(options) {
	if (Array.isArray(options)) return Promise.all(options.map((opts) => build(opts)));
	else {
		const { output, write = true, ...inputOptions } = options;
		const build$1 = await rolldown(inputOptions);
		try {
			if (write) return await build$1.write(output);
			else return await build$1.generate(output);
		} finally {
			await build$1.close();
		}
	}
}

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
					const { path: path$1, kind } = event.watchChangeData();
					await listener(path$1, { event: kind });
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
var import_binding$1 = require_binding();
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
		(0, import_binding$1.shutdownAsyncRuntime)();
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
	new Watcher(emitter, new import_binding$1.BindingWatcher(bundlerOptions.map((option) => option.bundlerOptions), notifyOptions), bundlerOptions.map((option) => option.stopWorkers)).start();
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
//#region src/utils/define-config.ts
function defineConfig(config) {
	return config;
}

//#endregion
//#region src/index.ts
var import_binding = require_binding();
const VERSION = version;

//#endregion
export { version as C, description$1 as S, getOutputCliKeys as _, build as a, styleText$1 as b, createBundlerOptions as c, normalizeBindingResult as d, unwrapBindingResult as f, getInputCliKeys as g, getCliSchemaInfo as h, watch as i, PluginContextData as l, bindingifySourcemap$1 as m, import_binding as n, rolldown as o, transformToRollupOutput as p, defineConfig as r, RolldownBuild as s, VERSION as t, bindingifyPlugin as u, validateCliOptions as v, onExit as w, PluginDriver as x, validateOption as y };