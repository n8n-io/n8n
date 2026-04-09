import "./shared/binding-kg77KQCQ.mjs";
import { n as onExit, t as watch } from "./shared/watch-BWN40jw1.mjs";
import "./shared/logs-CSQ_UMWp.mjs";
import { t as arraify } from "./shared/misc-CxyvWjTr.mjs";
import { v as description, y as version } from "./shared/normalize-string-or-regex-VlPkMWXA.mjs";
import { a as getOutputCliKeys, c as styleText$1, i as getInputCliKeys, o as validateCliOptions, r as getCliSchemaInfo } from "./shared/rolldown-build-D2CkFbcq.mjs";
import "./shared/bindingify-input-options-6nBAYjYP.mjs";
import "./shared/parse-ast-index-C44ewaWh.mjs";
import { t as rolldown } from "./shared/rolldown-CpwN72kC.mjs";
import { t as loadConfig } from "./shared/load-config-DS8fzWF9.mjs";
import path, { sep } from "node:path";
import { formatWithOptions, parseArgs } from "node:util";
import process$1 from "node:process";
import * as tty from "node:tty";
import { performance } from "node:perf_hooks";

//#region ../../node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/core.mjs
const LogLevels = {
	silent: Number.NEGATIVE_INFINITY,
	fatal: 0,
	error: 0,
	warn: 1,
	log: 2,
	info: 3,
	success: 3,
	fail: 3,
	ready: 3,
	start: 3,
	box: 3,
	debug: 4,
	trace: 5,
	verbose: Number.POSITIVE_INFINITY
};
const LogTypes = {
	silent: { level: -1 },
	fatal: { level: LogLevels.fatal },
	error: { level: LogLevels.error },
	warn: { level: LogLevels.warn },
	log: { level: LogLevels.log },
	info: { level: LogLevels.info },
	success: { level: LogLevels.success },
	fail: { level: LogLevels.fail },
	ready: { level: LogLevels.info },
	start: { level: LogLevels.info },
	box: { level: LogLevels.info },
	debug: { level: LogLevels.debug },
	trace: { level: LogLevels.trace },
	verbose: { level: LogLevels.verbose }
};
function isPlainObject$1(value) {
	if (value === null || typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) return false;
	if (Symbol.iterator in value) return false;
	if (Symbol.toStringTag in value) return Object.prototype.toString.call(value) === "[object Module]";
	return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
	if (!isPlainObject$1(defaults)) return _defu(baseObject, {}, namespace, merger);
	const object = Object.assign({}, defaults);
	for (const key in baseObject) {
		if (key === "__proto__" || key === "constructor") continue;
		const value = baseObject[key];
		if (value === null || value === void 0) continue;
		if (merger && merger(object, key, value, namespace)) continue;
		if (Array.isArray(value) && Array.isArray(object[key])) object[key] = [...value, ...object[key]];
		else if (isPlainObject$1(value) && isPlainObject$1(object[key])) object[key] = _defu(value, object[key], (namespace ? `${namespace}.` : "") + key.toString(), merger);
		else object[key] = value;
	}
	return object;
}
function createDefu(merger) {
	return (...arguments_) => arguments_.reduce((p, c$1) => _defu(p, c$1, "", merger), {});
}
const defu = createDefu();
function isPlainObject(obj) {
	return Object.prototype.toString.call(obj) === "[object Object]";
}
function isLogObj(arg) {
	if (!isPlainObject(arg)) return false;
	if (!arg.message && !arg.args) return false;
	if (arg.stack) return false;
	return true;
}
let paused = false;
const queue = [];
var Consola = class Consola {
	options;
	_lastLog;
	_mockFn;
	/**
	* Creates an instance of Consola with specified options or defaults.
	*
	* @param {Partial<ConsolaOptions>} [options={}] - Configuration options for the Consola instance.
	*/
	constructor(options$1 = {}) {
		const types = options$1.types || LogTypes;
		this.options = defu({
			...options$1,
			defaults: { ...options$1.defaults },
			level: _normalizeLogLevel(options$1.level, types),
			reporters: [...options$1.reporters || []]
		}, {
			types: LogTypes,
			throttle: 1e3,
			throttleMin: 5,
			formatOptions: {
				date: true,
				colors: false,
				compact: true
			}
		});
		for (const type in types) {
			const defaults = {
				type,
				...this.options.defaults,
				...types[type]
			};
			this[type] = this._wrapLogFn(defaults);
			this[type].raw = this._wrapLogFn(defaults, true);
		}
		if (this.options.mockFn) this.mockTypes();
		this._lastLog = {};
	}
	/**
	* Gets the current log level of the Consola instance.
	*
	* @returns {number} The current log level.
	*/
	get level() {
		return this.options.level;
	}
	/**
	* Sets the minimum log level that will be output by the instance.
	*
	* @param {number} level - The new log level to set.
	*/
	set level(level) {
		this.options.level = _normalizeLogLevel(level, this.options.types, this.options.level);
	}
	/**
	* Displays a prompt to the user and returns the response.
	* Throw an error if `prompt` is not supported by the current configuration.
	*
	* @template T
	* @param {string} message - The message to display in the prompt.
	* @param {T} [opts] - Optional options for the prompt. See {@link PromptOptions}.
	* @returns {promise<T>} A promise that infer with the prompt options. See {@link PromptOptions}.
	*/
	prompt(message, opts) {
		if (!this.options.prompt) throw new Error("prompt is not supported!");
		return this.options.prompt(message, opts);
	}
	/**
	* Creates a new instance of Consola, inheriting options from the current instance, with possible overrides.
	*
	* @param {Partial<ConsolaOptions>} options - Optional overrides for the new instance. See {@link ConsolaOptions}.
	* @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
	*/
	create(options$1) {
		const instance = new Consola({
			...this.options,
			...options$1
		});
		if (this._mockFn) instance.mockTypes(this._mockFn);
		return instance;
	}
	/**
	* Creates a new Consola instance with the specified default log object properties.
	*
	* @param {InputLogObject} defaults - Default properties to include in any log from the new instance. See {@link InputLogObject}.
	* @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
	*/
	withDefaults(defaults) {
		return this.create({
			...this.options,
			defaults: {
				...this.options.defaults,
				...defaults
			}
		});
	}
	/**
	* Creates a new Consola instance with a specified tag, which will be included in every log.
	*
	* @param {string} tag - The tag to include in each log of the new instance.
	* @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
	*/
	withTag(tag) {
		return this.withDefaults({ tag: this.options.defaults.tag ? this.options.defaults.tag + ":" + tag : tag });
	}
	/**
	* Adds a custom reporter to the Consola instance.
	* Reporters will be called for each log message, depending on their implementation and log level.
	*
	* @param {ConsolaReporter} reporter - The reporter to add. See {@link ConsolaReporter}.
	* @returns {Consola} The current Consola instance.
	*/
	addReporter(reporter) {
		this.options.reporters.push(reporter);
		return this;
	}
	/**
	* Removes a custom reporter from the Consola instance.
	* If no reporter is specified, all reporters will be removed.
	*
	* @param {ConsolaReporter} reporter - The reporter to remove. See {@link ConsolaReporter}.
	* @returns {Consola} The current Consola instance.
	*/
	removeReporter(reporter) {
		if (reporter) {
			const i$1 = this.options.reporters.indexOf(reporter);
			if (i$1 !== -1) return this.options.reporters.splice(i$1, 1);
		} else this.options.reporters.splice(0);
		return this;
	}
	/**
	* Replaces all reporters of the Consola instance with the specified array of reporters.
	*
	* @param {ConsolaReporter[]} reporters - The new reporters to set. See {@link ConsolaReporter}.
	* @returns {Consola} The current Consola instance.
	*/
	setReporters(reporters) {
		this.options.reporters = Array.isArray(reporters) ? reporters : [reporters];
		return this;
	}
	wrapAll() {
		this.wrapConsole();
		this.wrapStd();
	}
	restoreAll() {
		this.restoreConsole();
		this.restoreStd();
	}
	/**
	* Overrides console methods with Consola logging methods for consistent logging.
	*/
	wrapConsole() {
		for (const type in this.options.types) {
			if (!console["__" + type]) console["__" + type] = console[type];
			console[type] = this[type].raw;
		}
	}
	/**
	* Restores the original console methods, removing Consola overrides.
	*/
	restoreConsole() {
		for (const type in this.options.types) if (console["__" + type]) {
			console[type] = console["__" + type];
			delete console["__" + type];
		}
	}
	/**
	* Overrides standard output and error streams to redirect them through Consola.
	*/
	wrapStd() {
		this._wrapStream(this.options.stdout, "log");
		this._wrapStream(this.options.stderr, "log");
	}
	_wrapStream(stream, type) {
		if (!stream) return;
		if (!stream.__write) stream.__write = stream.write;
		stream.write = (data) => {
			this[type].raw(String(data).trim());
		};
	}
	/**
	* Restores the original standard output and error streams, removing the Consola redirection.
	*/
	restoreStd() {
		this._restoreStream(this.options.stdout);
		this._restoreStream(this.options.stderr);
	}
	_restoreStream(stream) {
		if (!stream) return;
		if (stream.__write) {
			stream.write = stream.__write;
			delete stream.__write;
		}
	}
	/**
	* Pauses logging, queues incoming logs until resumed.
	*/
	pauseLogs() {
		paused = true;
	}
	/**
	* Resumes logging, processing any queued logs.
	*/
	resumeLogs() {
		paused = false;
		const _queue = queue.splice(0);
		for (const item of _queue) item[0]._logFn(item[1], item[2]);
	}
	/**
	* Replaces logging methods with mocks if a mock function is provided.
	*
	* @param {ConsolaOptions["mockFn"]} mockFn - The function to use for mocking logging methods. See {@link ConsolaOptions["mockFn"]}.
	*/
	mockTypes(mockFn) {
		const _mockFn = mockFn || this.options.mockFn;
		this._mockFn = _mockFn;
		if (typeof _mockFn !== "function") return;
		for (const type in this.options.types) {
			this[type] = _mockFn(type, this.options.types[type]) || this[type];
			this[type].raw = this[type];
		}
	}
	_wrapLogFn(defaults, isRaw) {
		return (...args) => {
			if (paused) {
				queue.push([
					this,
					defaults,
					args,
					isRaw
				]);
				return;
			}
			return this._logFn(defaults, args, isRaw);
		};
	}
	_logFn(defaults, args, isRaw) {
		if ((defaults.level || 0) > this.level) return false;
		const logObj = {
			date: /* @__PURE__ */ new Date(),
			args: [],
			...defaults,
			level: _normalizeLogLevel(defaults.level, this.options.types)
		};
		if (!isRaw && args.length === 1 && isLogObj(args[0])) Object.assign(logObj, args[0]);
		else logObj.args = [...args];
		if (logObj.message) {
			logObj.args.unshift(logObj.message);
			delete logObj.message;
		}
		if (logObj.additional) {
			if (!Array.isArray(logObj.additional)) logObj.additional = logObj.additional.split("\n");
			logObj.args.push("\n" + logObj.additional.join("\n"));
			delete logObj.additional;
		}
		logObj.type = typeof logObj.type === "string" ? logObj.type.toLowerCase() : "log";
		logObj.tag = typeof logObj.tag === "string" ? logObj.tag : "";
		const resolveLog = (newLog = false) => {
			const repeated = (this._lastLog.count || 0) - this.options.throttleMin;
			if (this._lastLog.object && repeated > 0) {
				const args2 = [...this._lastLog.object.args];
				if (repeated > 1) args2.push(`(repeated ${repeated} times)`);
				this._log({
					...this._lastLog.object,
					args: args2
				});
				this._lastLog.count = 1;
			}
			if (newLog) {
				this._lastLog.object = logObj;
				this._log(logObj);
			}
		};
		clearTimeout(this._lastLog.timeout);
		const diffTime = this._lastLog.time && logObj.date ? logObj.date.getTime() - this._lastLog.time.getTime() : 0;
		this._lastLog.time = logObj.date;
		if (diffTime < this.options.throttle) try {
			const serializedLog = JSON.stringify([
				logObj.type,
				logObj.tag,
				logObj.args
			]);
			const isSameLog = this._lastLog.serialized === serializedLog;
			this._lastLog.serialized = serializedLog;
			if (isSameLog) {
				this._lastLog.count = (this._lastLog.count || 0) + 1;
				if (this._lastLog.count > this.options.throttleMin) {
					this._lastLog.timeout = setTimeout(resolveLog, this.options.throttle);
					return;
				}
			}
		} catch {}
		resolveLog(true);
	}
	_log(logObj) {
		for (const reporter of this.options.reporters) reporter.log(logObj, { options: this.options });
	}
};
function _normalizeLogLevel(input, types = {}, defaultLevel = 3) {
	if (input === void 0) return defaultLevel;
	if (typeof input === "number") return input;
	if (types[input] && types[input].level !== void 0) return types[input].level;
	return defaultLevel;
}
Consola.prototype.add = Consola.prototype.addReporter;
Consola.prototype.remove = Consola.prototype.removeReporter;
Consola.prototype.clear = Consola.prototype.removeReporter;
Consola.prototype.withScope = Consola.prototype.withTag;
Consola.prototype.mock = Consola.prototype.mockTypes;
Consola.prototype.pause = Consola.prototype.pauseLogs;
Consola.prototype.resume = Consola.prototype.resumeLogs;
function createConsola$1(options$1 = {}) {
	return new Consola(options$1);
}

//#endregion
//#region ../../node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/shared/consola.DRwqZj3T.mjs
function parseStack(stack, message) {
	const cwd$1 = process.cwd() + sep;
	return stack.split("\n").splice(message.split("\n").length).map((l$1) => l$1.trim().replace("file://", "").replace(cwd$1, ""));
}
function writeStream(data, stream) {
	return (stream.__write || stream.write).call(stream, data);
}
const bracket = (x) => x ? `[${x}]` : "";
var BasicReporter = class {
	formatStack(stack, message, opts) {
		const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
		return indent + parseStack(stack, message).join(`
${indent}`);
	}
	formatError(err, opts) {
		const message = err.message ?? formatWithOptions(opts, err);
		const stack = err.stack ? this.formatStack(err.stack, message, opts) : "";
		const level = opts?.errorLevel || 0;
		const causedPrefix = level > 0 ? `${"  ".repeat(level)}[cause]: ` : "";
		const causedError = err.cause ? "\n\n" + this.formatError(err.cause, {
			...opts,
			errorLevel: level + 1
		}) : "";
		return causedPrefix + message + "\n" + stack + causedError;
	}
	formatArgs(args, opts) {
		return formatWithOptions(opts, ...args.map((arg) => {
			if (arg && typeof arg.stack === "string") return this.formatError(arg, opts);
			return arg;
		}));
	}
	formatDate(date, opts) {
		return opts.date ? date.toLocaleTimeString() : "";
	}
	filterAndJoin(arr) {
		return arr.filter(Boolean).join(" ");
	}
	formatLogObj(logObj, opts) {
		const message = this.formatArgs(logObj.args, opts);
		if (logObj.type === "box") return "\n" + [
			bracket(logObj.tag),
			logObj.title && logObj.title,
			...message.split("\n")
		].filter(Boolean).map((l$1) => " > " + l$1).join("\n") + "\n";
		return this.filterAndJoin([
			bracket(logObj.type),
			bracket(logObj.tag),
			message
		]);
	}
	log(logObj, ctx) {
		return writeStream(this.formatLogObj(logObj, {
			columns: ctx.options.stdout.columns || 0,
			...ctx.options.formatOptions
		}) + "\n", logObj.level < 2 ? ctx.options.stderr || process.stderr : ctx.options.stdout || process.stdout);
	}
};

//#endregion
//#region ../../node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/shared/consola.DXBYu-KD.mjs
const { env = {}, argv = [], platform = "" } = typeof process === "undefined" ? {} : process;
const isDisabled = "NO_COLOR" in env || argv.includes("--no-color");
const isForced = "FORCE_COLOR" in env || argv.includes("--color");
const isWindows = platform === "win32";
const isDumbTerminal = env.TERM === "dumb";
const isCompatibleTerminal = tty && tty.isatty && tty.isatty(1) && env.TERM && !isDumbTerminal;
const isCI = "CI" in env && ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env);
const isColorSupported = !isDisabled && (isForced || isWindows && !isDumbTerminal || isCompatibleTerminal || isCI);
function replaceClose(index, string, close, replace, head = string.slice(0, Math.max(0, index)) + replace, tail = string.slice(Math.max(0, index + close.length)), next = tail.indexOf(close)) {
	return head + (next < 0 ? tail : replaceClose(next, tail, close, replace));
}
function clearBleed(index, string, open, close, replace) {
	return index < 0 ? open + string + close : open + replaceClose(index, string, close, replace) + close;
}
function filterEmpty(open, close, replace = open, at = open.length + 1) {
	return (string) => string || !(string === "" || string === void 0) ? clearBleed(("" + string).indexOf(close, at), string, open, close, replace) : "";
}
function init(open, close, replace) {
	return filterEmpty(`\x1B[${open}m`, `\x1B[${close}m`, replace);
}
const colorDefs = {
	reset: init(0, 0),
	bold: init(1, 22, "\x1B[22m\x1B[1m"),
	dim: init(2, 22, "\x1B[22m\x1B[2m"),
	italic: init(3, 23),
	underline: init(4, 24),
	inverse: init(7, 27),
	hidden: init(8, 28),
	strikethrough: init(9, 29),
	black: init(30, 39),
	red: init(31, 39),
	green: init(32, 39),
	yellow: init(33, 39),
	blue: init(34, 39),
	magenta: init(35, 39),
	cyan: init(36, 39),
	white: init(37, 39),
	gray: init(90, 39),
	bgBlack: init(40, 49),
	bgRed: init(41, 49),
	bgGreen: init(42, 49),
	bgYellow: init(43, 49),
	bgBlue: init(44, 49),
	bgMagenta: init(45, 49),
	bgCyan: init(46, 49),
	bgWhite: init(47, 49),
	blackBright: init(90, 39),
	redBright: init(91, 39),
	greenBright: init(92, 39),
	yellowBright: init(93, 39),
	blueBright: init(94, 39),
	magentaBright: init(95, 39),
	cyanBright: init(96, 39),
	whiteBright: init(97, 39),
	bgBlackBright: init(100, 49),
	bgRedBright: init(101, 49),
	bgGreenBright: init(102, 49),
	bgYellowBright: init(103, 49),
	bgBlueBright: init(104, 49),
	bgMagentaBright: init(105, 49),
	bgCyanBright: init(106, 49),
	bgWhiteBright: init(107, 49)
};
function createColors(useColor = isColorSupported) {
	return useColor ? colorDefs : Object.fromEntries(Object.keys(colorDefs).map((key) => [key, String]));
}
const colors = createColors();
function getColor$1(color, fallback = "reset") {
	return colors[color] || colors[fallback];
}
const ansiRegex$1 = [String.raw`[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)`, String.raw`(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))`].join("|");
function stripAnsi(text) {
	return text.replace(new RegExp(ansiRegex$1, "g"), "");
}
const boxStylePresets = {
	solid: {
		tl: "┌",
		tr: "┐",
		bl: "└",
		br: "┘",
		h: "─",
		v: "│"
	},
	double: {
		tl: "╔",
		tr: "╗",
		bl: "╚",
		br: "╝",
		h: "═",
		v: "║"
	},
	doubleSingle: {
		tl: "╓",
		tr: "╖",
		bl: "╙",
		br: "╜",
		h: "─",
		v: "║"
	},
	doubleSingleRounded: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "─",
		v: "║"
	},
	singleThick: {
		tl: "┏",
		tr: "┓",
		bl: "┗",
		br: "┛",
		h: "━",
		v: "┃"
	},
	singleDouble: {
		tl: "╒",
		tr: "╕",
		bl: "╘",
		br: "╛",
		h: "═",
		v: "│"
	},
	singleDoubleRounded: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "═",
		v: "│"
	},
	rounded: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "─",
		v: "│"
	}
};
const defaultStyle = {
	borderColor: "white",
	borderStyle: "rounded",
	valign: "center",
	padding: 2,
	marginLeft: 1,
	marginTop: 1,
	marginBottom: 1
};
function box(text, _opts = {}) {
	const opts = {
		..._opts,
		style: {
			...defaultStyle,
			..._opts.style
		}
	};
	const textLines = text.split("\n");
	const boxLines = [];
	const _color = getColor$1(opts.style.borderColor);
	const borderStyle = { ...typeof opts.style.borderStyle === "string" ? boxStylePresets[opts.style.borderStyle] || boxStylePresets.solid : opts.style.borderStyle };
	if (_color) for (const key in borderStyle) borderStyle[key] = _color(borderStyle[key]);
	const paddingOffset = opts.style.padding % 2 === 0 ? opts.style.padding : opts.style.padding + 1;
	const height = textLines.length + paddingOffset;
	const width = Math.max(...textLines.map((line) => stripAnsi(line).length), opts.title ? stripAnsi(opts.title).length : 0) + paddingOffset;
	const widthOffset = width + paddingOffset;
	const leftSpace = opts.style.marginLeft > 0 ? " ".repeat(opts.style.marginLeft) : "";
	if (opts.style.marginTop > 0) boxLines.push("".repeat(opts.style.marginTop));
	if (opts.title) {
		const title = _color ? _color(opts.title) : opts.title;
		const left = borderStyle.h.repeat(Math.floor((width - stripAnsi(opts.title).length) / 2));
		const right = borderStyle.h.repeat(width - stripAnsi(opts.title).length - stripAnsi(left).length + paddingOffset);
		boxLines.push(`${leftSpace}${borderStyle.tl}${left}${title}${right}${borderStyle.tr}`);
	} else boxLines.push(`${leftSpace}${borderStyle.tl}${borderStyle.h.repeat(widthOffset)}${borderStyle.tr}`);
	const valignOffset = opts.style.valign === "center" ? Math.floor((height - textLines.length) / 2) : opts.style.valign === "top" ? height - textLines.length - paddingOffset : height - textLines.length;
	for (let i$1 = 0; i$1 < height; i$1++) if (i$1 < valignOffset || i$1 >= valignOffset + textLines.length) boxLines.push(`${leftSpace}${borderStyle.v}${" ".repeat(widthOffset)}${borderStyle.v}`);
	else {
		const line = textLines[i$1 - valignOffset];
		const left = " ".repeat(paddingOffset);
		const right = " ".repeat(width - stripAnsi(line).length);
		boxLines.push(`${leftSpace}${borderStyle.v}${left}${line}${right}${borderStyle.v}`);
	}
	boxLines.push(`${leftSpace}${borderStyle.bl}${borderStyle.h.repeat(widthOffset)}${borderStyle.br}`);
	if (opts.style.marginBottom > 0) boxLines.push("".repeat(opts.style.marginBottom));
	return boxLines.join("\n");
}

//#endregion
//#region ../../node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/index.mjs
const r = Object.create(null), i = (e) => globalThis.process?.env || import.meta.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e ? r : globalThis), o = new Proxy(r, {
	get(e, s$1) {
		return i()[s$1] ?? r[s$1];
	},
	has(e, s$1) {
		return s$1 in i() || s$1 in r;
	},
	set(e, s$1, E) {
		const B = i(true);
		return B[s$1] = E, true;
	},
	deleteProperty(e, s$1) {
		if (!s$1) return false;
		const E = i(true);
		return delete E[s$1], true;
	},
	ownKeys() {
		const e = i(true);
		return Object.keys(e);
	}
}), t = typeof process < "u" && process.env && process.env.NODE_ENV || "", f = [
	["APPVEYOR"],
	[
		"AWS_AMPLIFY",
		"AWS_APP_ID",
		{ ci: true }
	],
	["AZURE_PIPELINES", "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"],
	["AZURE_STATIC", "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN"],
	["APPCIRCLE", "AC_APPCIRCLE"],
	["BAMBOO", "bamboo_planKey"],
	["BITBUCKET", "BITBUCKET_COMMIT"],
	["BITRISE", "BITRISE_IO"],
	["BUDDY", "BUDDY_WORKSPACE_ID"],
	["BUILDKITE"],
	["CIRCLE", "CIRCLECI"],
	["CIRRUS", "CIRRUS_CI"],
	[
		"CLOUDFLARE_PAGES",
		"CF_PAGES",
		{ ci: true }
	],
	["CODEBUILD", "CODEBUILD_BUILD_ARN"],
	["CODEFRESH", "CF_BUILD_ID"],
	["DRONE"],
	["DRONE", "DRONE_BUILD_EVENT"],
	["DSARI"],
	["GITHUB_ACTIONS"],
	["GITLAB", "GITLAB_CI"],
	["GITLAB", "CI_MERGE_REQUEST_ID"],
	["GOCD", "GO_PIPELINE_LABEL"],
	["LAYERCI"],
	["HUDSON", "HUDSON_URL"],
	["JENKINS", "JENKINS_URL"],
	["MAGNUM"],
	["NETLIFY"],
	[
		"NETLIFY",
		"NETLIFY_LOCAL",
		{ ci: false }
	],
	["NEVERCODE"],
	["RENDER"],
	["SAIL", "SAILCI"],
	["SEMAPHORE"],
	["SCREWDRIVER"],
	["SHIPPABLE"],
	["SOLANO", "TDDIUM"],
	["STRIDER"],
	["TEAMCITY", "TEAMCITY_VERSION"],
	["TRAVIS"],
	["VERCEL", "NOW_BUILDER"],
	[
		"VERCEL",
		"VERCEL",
		{ ci: false }
	],
	[
		"VERCEL",
		"VERCEL_ENV",
		{ ci: false }
	],
	["APPCENTER", "APPCENTER_BUILD_ID"],
	[
		"CODESANDBOX",
		"CODESANDBOX_SSE",
		{ ci: false }
	],
	[
		"CODESANDBOX",
		"CODESANDBOX_HOST",
		{ ci: false }
	],
	["STACKBLITZ"],
	["STORMKIT"],
	["CLEAVR"],
	["ZEABUR"],
	[
		"CODESPHERE",
		"CODESPHERE_APP_ID",
		{ ci: true }
	],
	["RAILWAY", "RAILWAY_PROJECT_ID"],
	["RAILWAY", "RAILWAY_SERVICE_ID"],
	["DENO-DEPLOY", "DENO_DEPLOYMENT_ID"],
	[
		"FIREBASE_APP_HOSTING",
		"FIREBASE_APP_HOSTING",
		{ ci: true }
	]
];
function b() {
	if (globalThis.process?.env) for (const e of f) {
		const s$1 = e[1] || e[0];
		if (globalThis.process?.env[s$1]) return {
			name: e[0].toLowerCase(),
			...e[2]
		};
	}
	return globalThis.process?.env?.SHELL === "/bin/jsh" && globalThis.process?.versions?.webcontainer ? {
		name: "stackblitz",
		ci: false
	} : {
		name: "",
		ci: false
	};
}
const l = b();
l.name;
function n(e) {
	return e ? e !== "false" : false;
}
const I = globalThis.process?.platform || "", T = n(o.CI) || l.ci !== false, a = n(globalThis.process?.stdout && globalThis.process?.stdout.isTTY), g = n(o.DEBUG), R = t === "test" || n(o.TEST);
n(o.MINIMAL);
const A = /^win/i.test(I);
!n(o.NO_COLOR) && (n(o.FORCE_COLOR) || (a || A) && o.TERM);
const C = (globalThis.process?.versions?.node || "").replace(/^v/, "") || null;
Number(C?.split(".")[0]);
const y = globalThis.process || Object.create(null), _ = { versions: {} };
new Proxy(y, { get(e, s$1) {
	if (s$1 === "env") return o;
	if (s$1 in e) return e[s$1];
	if (s$1 in _) return _[s$1];
} });
const c = globalThis.process?.release?.name === "node", O = !!globalThis.Bun || !!globalThis.process?.versions?.bun, D = !!globalThis.Deno, L = !!globalThis.fastly, S = !!globalThis.Netlify, u = !!globalThis.EdgeRuntime, N = globalThis.navigator?.userAgent === "Cloudflare-Workers", F = [
	[S, "netlify"],
	[u, "edge-light"],
	[N, "workerd"],
	[L, "fastly"],
	[D, "deno"],
	[O, "bun"],
	[c, "node"]
];
function G() {
	const e = F.find((s$1) => s$1[0]);
	if (e) return { name: e[1] };
}
G()?.name;
function ansiRegex({ onlyFirst = false } = {}) {
	const pattern = [`[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))`, "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
	return new RegExp(pattern, onlyFirst ? void 0 : "g");
}
const regex = ansiRegex();
function stripAnsi$1(string) {
	if (typeof string !== "string") throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
	return string.replace(regex, "");
}
function isAmbiguous(x) {
	return x === 161 || x === 164 || x === 167 || x === 168 || x === 170 || x === 173 || x === 174 || x >= 176 && x <= 180 || x >= 182 && x <= 186 || x >= 188 && x <= 191 || x === 198 || x === 208 || x === 215 || x === 216 || x >= 222 && x <= 225 || x === 230 || x >= 232 && x <= 234 || x === 236 || x === 237 || x === 240 || x === 242 || x === 243 || x >= 247 && x <= 250 || x === 252 || x === 254 || x === 257 || x === 273 || x === 275 || x === 283 || x === 294 || x === 295 || x === 299 || x >= 305 && x <= 307 || x === 312 || x >= 319 && x <= 322 || x === 324 || x >= 328 && x <= 331 || x === 333 || x === 338 || x === 339 || x === 358 || x === 359 || x === 363 || x === 462 || x === 464 || x === 466 || x === 468 || x === 470 || x === 472 || x === 474 || x === 476 || x === 593 || x === 609 || x === 708 || x === 711 || x >= 713 && x <= 715 || x === 717 || x === 720 || x >= 728 && x <= 731 || x === 733 || x === 735 || x >= 768 && x <= 879 || x >= 913 && x <= 929 || x >= 931 && x <= 937 || x >= 945 && x <= 961 || x >= 963 && x <= 969 || x === 1025 || x >= 1040 && x <= 1103 || x === 1105 || x === 8208 || x >= 8211 && x <= 8214 || x === 8216 || x === 8217 || x === 8220 || x === 8221 || x >= 8224 && x <= 8226 || x >= 8228 && x <= 8231 || x === 8240 || x === 8242 || x === 8243 || x === 8245 || x === 8251 || x === 8254 || x === 8308 || x === 8319 || x >= 8321 && x <= 8324 || x === 8364 || x === 8451 || x === 8453 || x === 8457 || x === 8467 || x === 8470 || x === 8481 || x === 8482 || x === 8486 || x === 8491 || x === 8531 || x === 8532 || x >= 8539 && x <= 8542 || x >= 8544 && x <= 8555 || x >= 8560 && x <= 8569 || x === 8585 || x >= 8592 && x <= 8601 || x === 8632 || x === 8633 || x === 8658 || x === 8660 || x === 8679 || x === 8704 || x === 8706 || x === 8707 || x === 8711 || x === 8712 || x === 8715 || x === 8719 || x === 8721 || x === 8725 || x === 8730 || x >= 8733 && x <= 8736 || x === 8739 || x === 8741 || x >= 8743 && x <= 8748 || x === 8750 || x >= 8756 && x <= 8759 || x === 8764 || x === 8765 || x === 8776 || x === 8780 || x === 8786 || x === 8800 || x === 8801 || x >= 8804 && x <= 8807 || x === 8810 || x === 8811 || x === 8814 || x === 8815 || x === 8834 || x === 8835 || x === 8838 || x === 8839 || x === 8853 || x === 8857 || x === 8869 || x === 8895 || x === 8978 || x >= 9312 && x <= 9449 || x >= 9451 && x <= 9547 || x >= 9552 && x <= 9587 || x >= 9600 && x <= 9615 || x >= 9618 && x <= 9621 || x === 9632 || x === 9633 || x >= 9635 && x <= 9641 || x === 9650 || x === 9651 || x === 9654 || x === 9655 || x === 9660 || x === 9661 || x === 9664 || x === 9665 || x >= 9670 && x <= 9672 || x === 9675 || x >= 9678 && x <= 9681 || x >= 9698 && x <= 9701 || x === 9711 || x === 9733 || x === 9734 || x === 9737 || x === 9742 || x === 9743 || x === 9756 || x === 9758 || x === 9792 || x === 9794 || x === 9824 || x === 9825 || x >= 9827 && x <= 9829 || x >= 9831 && x <= 9834 || x === 9836 || x === 9837 || x === 9839 || x === 9886 || x === 9887 || x === 9919 || x >= 9926 && x <= 9933 || x >= 9935 && x <= 9939 || x >= 9941 && x <= 9953 || x === 9955 || x === 9960 || x === 9961 || x >= 9963 && x <= 9969 || x === 9972 || x >= 9974 && x <= 9977 || x === 9979 || x === 9980 || x === 9982 || x === 9983 || x === 10045 || x >= 10102 && x <= 10111 || x >= 11094 && x <= 11097 || x >= 12872 && x <= 12879 || x >= 57344 && x <= 63743 || x >= 65024 && x <= 65039 || x === 65533 || x >= 127232 && x <= 127242 || x >= 127248 && x <= 127277 || x >= 127280 && x <= 127337 || x >= 127344 && x <= 127373 || x === 127375 || x === 127376 || x >= 127387 && x <= 127404 || x >= 917760 && x <= 917999 || x >= 983040 && x <= 1048573 || x >= 1048576 && x <= 1114109;
}
function isFullWidth(x) {
	return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
}
function isWide(x) {
	return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x === 94192 || x === 94193 || x >= 94208 && x <= 100343 || x >= 100352 && x <= 101589 || x >= 101631 && x <= 101640 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128727 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129673 || x >= 129679 && x <= 129734 || x >= 129742 && x <= 129756 || x >= 129759 && x <= 129769 || x >= 129776 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
}
function validate(codePoint) {
	if (!Number.isSafeInteger(codePoint)) throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
}
function eastAsianWidth(codePoint, { ambiguousAsWide = false } = {}) {
	validate(codePoint);
	if (isFullWidth(codePoint) || isWide(codePoint) || ambiguousAsWide && isAmbiguous(codePoint)) return 2;
	return 1;
}
const emojiRegex = () => {
	return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE89\uDE8F-\uDEC2\uDEC6\uDECE-\uDEDC\uDEDF-\uDEE9]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};
const segmenter = globalThis.Intl?.Segmenter ? new Intl.Segmenter() : { segment: (str) => str.split("") };
const defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u;
function stringWidth$1(string, options$1 = {}) {
	if (typeof string !== "string" || string.length === 0) return 0;
	const { ambiguousIsNarrow = true, countAnsiEscapeCodes = false } = options$1;
	if (!countAnsiEscapeCodes) string = stripAnsi$1(string);
	if (string.length === 0) return 0;
	let width = 0;
	const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };
	for (const { segment: character } of segmenter.segment(string)) {
		const codePoint = character.codePointAt(0);
		if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) continue;
		if (codePoint >= 8203 && codePoint <= 8207 || codePoint === 65279) continue;
		if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) continue;
		if (codePoint >= 55296 && codePoint <= 57343) continue;
		if (codePoint >= 65024 && codePoint <= 65039) continue;
		if (defaultIgnorableCodePointRegex.test(character)) continue;
		if (emojiRegex().test(character)) {
			width += 2;
			continue;
		}
		width += eastAsianWidth(codePoint, eastAsianWidthOptions);
	}
	return width;
}
function isUnicodeSupported() {
	const { env: env$1 } = process$1;
	const { TERM, TERM_PROGRAM } = env$1;
	if (process$1.platform !== "win32") return TERM !== "linux";
	return Boolean(env$1.WT_SESSION) || Boolean(env$1.TERMINUS_SUBLIME) || env$1.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env$1.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
const TYPE_COLOR_MAP = {
	info: "cyan",
	fail: "red",
	success: "green",
	ready: "green",
	start: "magenta"
};
const LEVEL_COLOR_MAP = {
	0: "red",
	1: "yellow"
};
const unicode = isUnicodeSupported();
const s = (c$1, fallback) => unicode ? c$1 : fallback;
const TYPE_ICONS = {
	error: s("✖", "×"),
	fatal: s("✖", "×"),
	ready: s("✔", "√"),
	warn: s("⚠", "‼"),
	info: s("ℹ", "i"),
	success: s("✔", "√"),
	debug: s("⚙", "D"),
	trace: s("→", "→"),
	fail: s("✖", "×"),
	start: s("◐", "o"),
	log: ""
};
function stringWidth(str) {
	if (!(typeof Intl === "object") || !Intl.Segmenter) return stripAnsi(str).length;
	return stringWidth$1(str);
}
var FancyReporter = class extends BasicReporter {
	formatStack(stack, message, opts) {
		const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
		return `
${indent}` + parseStack(stack, message).map((line) => "  " + line.replace(/^at +/, (m) => colors.gray(m)).replace(/\((.+)\)/, (_$1, m) => `(${colors.cyan(m)})`)).join(`
${indent}`);
	}
	formatType(logObj, isBadge, opts) {
		const typeColor = TYPE_COLOR_MAP[logObj.type] || LEVEL_COLOR_MAP[logObj.level] || "gray";
		if (isBadge) return getBgColor(typeColor)(colors.black(` ${logObj.type.toUpperCase()} `));
		const _type = typeof TYPE_ICONS[logObj.type] === "string" ? TYPE_ICONS[logObj.type] : logObj.icon || logObj.type;
		return _type ? getColor(typeColor)(_type) : "";
	}
	formatLogObj(logObj, opts) {
		const [message, ...additional] = this.formatArgs(logObj.args, opts).split("\n");
		if (logObj.type === "box") return box(characterFormat(message + (additional.length > 0 ? "\n" + additional.join("\n") : "")), {
			title: logObj.title ? characterFormat(logObj.title) : void 0,
			style: logObj.style
		});
		const date = this.formatDate(logObj.date, opts);
		const coloredDate = date && colors.gray(date);
		const isBadge = logObj.badge ?? logObj.level < 2;
		const type = this.formatType(logObj, isBadge, opts);
		const tag = logObj.tag ? colors.gray(logObj.tag) : "";
		let line;
		const left = this.filterAndJoin([type, characterFormat(message)]);
		const right = this.filterAndJoin(opts.columns ? [tag, coloredDate] : [tag]);
		const space = (opts.columns || 0) - stringWidth(left) - stringWidth(right) - 2;
		line = space > 0 && (opts.columns || 0) >= 80 ? left + " ".repeat(space) + right : (right ? `${colors.gray(`[${right}]`)} ` : "") + left;
		line += characterFormat(additional.length > 0 ? "\n" + additional.join("\n") : "");
		if (logObj.type === "trace") {
			const _err = /* @__PURE__ */ new Error("Trace: " + logObj.message);
			line += this.formatStack(_err.stack || "", _err.message);
		}
		return isBadge ? "\n" + line + "\n" : line;
	}
};
function characterFormat(str) {
	return str.replace(/`([^`]+)`/gm, (_$1, m) => colors.cyan(m)).replace(/\s+_([^_]+)_\s+/gm, (_$1, m) => ` ${colors.underline(m)} `);
}
function getColor(color = "white") {
	return colors[color] || colors.white;
}
function getBgColor(color = "bgWhite") {
	return colors[`bg${color[0].toUpperCase()}${color.slice(1)}`] || colors.bgWhite;
}
function createConsola(options$1 = {}) {
	let level = _getDefaultLogLevel();
	if (process.env.CONSOLA_LEVEL) level = Number.parseInt(process.env.CONSOLA_LEVEL) ?? level;
	return createConsola$1({
		level,
		defaults: { level },
		stdout: process.stdout,
		stderr: process.stderr,
		prompt: (...args) => import("./shared/prompt-pmGBC3ws.mjs").then((m) => m.prompt(...args)),
		reporters: options$1.reporters || [options$1.fancy ?? !(T || R) ? new FancyReporter() : new BasicReporter()],
		...options$1
	});
}
function _getDefaultLogLevel() {
	if (g) return LogLevels.debug;
	if (R) return LogLevels.warn;
	return LogLevels.info;
}
const consola = createConsola();

//#endregion
//#region src/cli/logger.ts
/**
* Console logger
*/
const logger = process.env.ROLLDOWN_TEST ? createTestingLogger() : createConsola({ formatOptions: { date: false } });
function createTestingLogger() {
	const types = [
		"silent",
		"fatal",
		"error",
		"warn",
		"log",
		"info",
		"success",
		"fail",
		"ready",
		"start",
		"box",
		"debug",
		"trace",
		"verbose"
	];
	const ret = Object.create(null);
	for (const type of types) ret[type] = console.log;
	return ret;
}

//#endregion
//#region src/cli/arguments/alias.ts
const alias = {
	config: {
		abbreviation: "c",
		hint: "filename"
	},
	help: { abbreviation: "h" },
	version: { abbreviation: "v" },
	watch: { abbreviation: "w" },
	dir: { abbreviation: "d" },
	file: { abbreviation: "o" },
	external: { abbreviation: "e" },
	format: { abbreviation: "f" },
	name: { abbreviation: "n" },
	globals: { abbreviation: "g" },
	sourcemap: {
		abbreviation: "s",
		default: true
	},
	minify: { abbreviation: "m" },
	platform: { abbreviation: "p" },
	assetFileNames: { hint: "name" },
	chunkFileNames: { hint: "name" },
	entryFileNames: { hint: "name" },
	externalLiveBindings: {
		default: true,
		reverse: true
	},
	treeshake: {
		default: true,
		reverse: true
	},
	preserveEntrySignatures: {
		default: "strict",
		reverse: true
	},
	moduleTypes: { hint: "types" }
};

//#endregion
//#region src/cli/arguments/utils.ts
function setNestedProperty(obj, path$1, value) {
	const keys = path$1.split(".");
	let current = obj;
	for (let i$1 = 0; i$1 < keys.length - 1; i$1++) {
		if (!current[keys[i$1]]) current[keys[i$1]] = {};
		current = current[keys[i$1]];
	}
	const finalKey = keys[keys.length - 1];
	Object.defineProperty(current, finalKey, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function camelCaseToKebabCase(str) {
	return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
function kebabCaseToCamelCase(str) {
	return str.replace(/-./g, (match) => match[1].toUpperCase());
}

//#endregion
//#region src/cli/arguments/normalize.ts
function normalizeCliOptions(cliOptions, positionals) {
	const prototypePollutionKeys = [
		"__proto__",
		"constructor",
		"prototype"
	];
	const unflattenedCliOptions = {};
	for (let [key, value] of Object.entries(cliOptions)) if (prototypePollutionKeys.includes(key)) {} else if (key.includes(".")) {
		const [parentKey] = key.split(".");
		unflattenedCliOptions[parentKey] ??= {};
		setNestedProperty(unflattenedCliOptions, key, value);
	} else unflattenedCliOptions[key] = value;
	const [data, errors] = validateCliOptions(unflattenedCliOptions);
	if (errors?.length) {
		errors.forEach((error) => {
			logger.error(`${error}. You can use \`rolldown -h\` to see the help.`);
		});
		process.exit(1);
	}
	const options$1 = data ?? {};
	const result = {
		input: {},
		output: {},
		help: options$1.help ?? false,
		version: options$1.version ?? false,
		watch: options$1.watch ?? false
	};
	if (typeof options$1.config === "string") result.config = options$1.config;
	if (options$1.environment !== void 0) result.environment = options$1.environment;
	const keysOfInput = getInputCliKeys();
	const keysOfOutput = getOutputCliKeys();
	const reservedKeys = [
		"help",
		"version",
		"config",
		"watch",
		"environment"
	];
	for (let [key, value] of Object.entries(options$1)) {
		const [primary] = key.split(".");
		if (keysOfInput.includes(primary)) setNestedProperty(result.input, key, value);
		else if (keysOfOutput.includes(primary)) setNestedProperty(result.output, key, value);
		else if (!reservedKeys.includes(key)) {
			logger.error(`Unknown option: ${key}`);
			process.exit(1);
		}
	}
	if (!result.config && positionals.length > 0) if (Array.isArray(result.input.input)) result.input.input.push(...positionals);
	else result.input.input = positionals;
	return result;
}

//#endregion
//#region src/cli/arguments/index.ts
const schemaInfo = getCliSchemaInfo();
const options = Object.fromEntries(Object.entries(schemaInfo).filter(([_key, info]) => info.type !== "never").map(([key, info]) => {
	const config = Object.getOwnPropertyDescriptor(alias, key)?.value;
	const result = {
		type: info.type === "boolean" ? "boolean" : "string",
		description: info?.description ?? config?.description ?? "",
		hint: config?.hint
	};
	if (config && config?.abbreviation) result.short = config?.abbreviation;
	if (config && config.reverse) {
		if (result.description.startsWith("enable")) result.description = result.description.replace("enable", "disable");
		else if (!result.description.startsWith("Avoid")) result.description = `disable ${result.description}`;
	}
	key = camelCaseToKebabCase(key);
	return [config?.reverse ? `no-${key}` : key, result];
}));
function parseCliArguments() {
	const { values, tokens, positionals } = parseArgs({
		options,
		tokens: true,
		allowPositionals: true,
		strict: false
	});
	let invalid_options = tokens.filter((token) => token.kind === "option").map((option) => {
		let negative = false;
		if (option.name.startsWith("no-")) {
			const name = kebabCaseToCamelCase(option.name.substring(3));
			if (name in schemaInfo) {
				delete values[option.name];
				option.name = name;
				negative = true;
			}
		}
		delete values[option.name];
		option.name = kebabCaseToCamelCase(option.name);
		let originalInfo = schemaInfo[option.name];
		if (!originalInfo) return {
			name: option.name,
			value: option.value
		};
		let type = originalInfo.type;
		if (type === "string" && typeof option.value !== "string") {
			let opt = option;
			let defaultValue = Object.getOwnPropertyDescriptor(alias, opt.name)?.value;
			Object.defineProperty(values, opt.name, {
				value: defaultValue.default ?? "",
				enumerable: true,
				configurable: true,
				writable: true
			});
		} else if (type === "object" && typeof option.value === "string") {
			const [key, value] = option.value.split(",").map((x) => x.split("="))[0];
			if (!values[option.name]) Object.defineProperty(values, option.name, {
				value: {},
				enumerable: true,
				configurable: true,
				writable: true
			});
			if (key && value) Object.defineProperty(values[option.name], key, {
				value,
				enumerable: true,
				configurable: true,
				writable: true
			});
		} else if (type === "array" && typeof option.value === "string") {
			if (!values[option.name]) Object.defineProperty(values, option.name, {
				value: [],
				enumerable: true,
				configurable: true,
				writable: true
			});
			values[option.name].push(option.value);
		} else if (type === "boolean") Object.defineProperty(values, option.name, {
			value: !negative,
			enumerable: true,
			configurable: true,
			writable: true
		});
		else if (type === "union") {
			let defaultValue = Object.getOwnPropertyDescriptor(alias, option.name)?.value;
			Object.defineProperty(values, option.name, {
				value: option.value ?? defaultValue?.default ?? "",
				enumerable: true,
				configurable: true,
				writable: true
			});
		} else Object.defineProperty(values, option.name, {
			value: option.value ?? "",
			enumerable: true,
			configurable: true,
			writable: true
		});
	}).filter((item) => {
		return item !== void 0;
	});
	invalid_options.sort((a$1, b$1) => {
		return a$1.name.localeCompare(b$1.name);
	});
	if (invalid_options.length !== 0) {
		let single = invalid_options.length === 1;
		logger.warn(`Option \`${invalid_options.map((item) => item.name).join(",")}\` ${single ? "is" : "are"} unrecognized. We will ignore ${single ? "this" : "those"} option${single ? "" : "s"}.`);
	}
	let rawArgs = {
		...values,
		...invalid_options.reduce((acc, cur) => {
			acc[cur.name] = cur.value;
			return acc;
		}, Object.create(null))
	};
	return {
		...normalizeCliOptions(values, positionals),
		rawArgs
	};
}

//#endregion
//#region src/utils/clear-screen.ts
const CLEAR_SCREEN = "\x1Bc";
function getClearScreenFunction(options$1) {
	const isTTY = process.stdout.isTTY;
	const isAnyOptionNotAllowingClearScreen = arraify(options$1).some(({ watch: watch$1 }) => watch$1 === false || watch$1?.clearScreen === false);
	if (isTTY && !isAnyOptionNotAllowingClearScreen) return () => {
		process.stdout.write(CLEAR_SCREEN);
	};
}

//#endregion
//#region \0@oxc-project+runtime@0.99.0/helpers/usingCtx.js
function _usingCtx() {
	var r$1 = "function" == typeof SuppressedError ? SuppressedError : function(r$2, e$1) {
		var n$2 = Error();
		return n$2.name = "SuppressedError", n$2.error = r$2, n$2.suppressed = e$1, n$2;
	}, e = {}, n$1 = [];
	function using(r$2, e$1) {
		if (null != e$1) {
			if (Object(e$1) !== e$1) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined.");
			if (r$2) var o$1 = e$1[Symbol.asyncDispose || Symbol["for"]("Symbol.asyncDispose")];
			if (void 0 === o$1 && (o$1 = e$1[Symbol.dispose || Symbol["for"]("Symbol.dispose")], r$2)) var t$1 = o$1;
			if ("function" != typeof o$1) throw new TypeError("Object is not disposable.");
			t$1 && (o$1 = function o$2() {
				try {
					t$1.call(e$1);
				} catch (r$3) {
					return Promise.reject(r$3);
				}
			}), n$1.push({
				v: e$1,
				d: o$1,
				a: r$2
			});
		} else r$2 && n$1.push({
			d: e$1,
			a: r$2
		});
		return e$1;
	}
	return {
		e,
		u: using.bind(null, !1),
		a: using.bind(null, !0),
		d: function d() {
			var o$1, t$1 = this.e, s$1 = 0;
			function next() {
				for (; o$1 = n$1.pop();) try {
					if (!o$1.a && 1 === s$1) return s$1 = 0, n$1.push(o$1), Promise.resolve().then(next);
					if (o$1.d) {
						var r$2 = o$1.d.call(o$1.v);
						if (o$1.a) return s$1 |= 2, Promise.resolve(r$2).then(next, err);
					} else s$1 |= 1;
				} catch (r$3) {
					return err(r$3);
				}
				if (1 === s$1) return t$1 !== e ? Promise.reject(t$1) : Promise.resolve();
				if (t$1 !== e) throw t$1;
			}
			function err(n$2) {
				return t$1 = t$1 !== e ? new r$1(n$2, t$1) : n$2, next();
			}
			return next();
		}
	};
}

//#endregion
//#region src/cli/commands/bundle.ts
async function bundleWithConfig(configPath, cliOptions, rawArgs = {}) {
	if (cliOptions.watch) {
		process.env.ROLLUP_WATCH = "true";
		process.env.ROLLDOWN_WATCH = "true";
	}
	const config = await loadConfig(configPath);
	if (!config) {
		logger.error(`No configuration found at ${configPath}`);
		process.exit(1);
	}
	const resolvedConfig = typeof config === "function" ? await config(rawArgs) : config;
	if (cliOptions.watch) await watchInner(resolvedConfig, cliOptions);
	else await bundleInner(resolvedConfig, cliOptions);
}
async function bundleWithCliOptions(cliOptions) {
	try {
		var _usingCtx$1 = _usingCtx();
		if (cliOptions.output.dir || cliOptions.output.file) {
			await (cliOptions.watch ? watchInner : bundleInner)({}, cliOptions);
			return;
		}
		if (cliOptions.watch) {
			logger.error("You must specify `output.dir` to use watch mode");
			process.exit(1);
		}
		const { output: outputs } = await _usingCtx$1.a(await rolldown(cliOptions.input)).generate(cliOptions.output);
		if (outputs.length === 0) {
			logger.error("No output generated");
			process.exit(1);
		}
		for (const file of outputs) {
			if (outputs.length > 1) logger.log(`\n${styleText$1(["cyan", "bold"], `|→ ${file.fileName}:`)}\n`);
			console.log(file.type === "asset" ? file.source : file.code);
		}
	} catch (_$1) {
		_usingCtx$1.e = _$1;
	} finally {
		await _usingCtx$1.d();
	}
}
async function watchInner(config, cliOptions) {
	let normalizedConfig = arraify(config).map((option) => {
		return {
			...option,
			...cliOptions.input,
			output: arraify(option.output || {}).map((output) => {
				return {
					...output,
					...cliOptions.output
				};
			})
		};
	});
	const watcher = watch(normalizedConfig);
	onExit((code) => {
		Promise.resolve(watcher.close()).finally(() => {
			process.exit(typeof code === "number" ? code : 0);
		});
		return true;
	});
	const changedFile = [];
	watcher.on("change", (id, event) => {
		if (event.event === "update") changedFile.push(id);
	});
	const clearScreen = getClearScreenFunction(normalizedConfig);
	watcher.on("event", async (event) => {
		switch (event.code) {
			case "START":
				clearScreen?.();
				break;
			case "BUNDLE_START":
				if (changedFile.length > 0) logger.log(`Found ${styleText$1("bold", changedFile.map(relativeId).join(", "))} changed, rebuilding...`);
				changedFile.length = 0;
				break;
			case "BUNDLE_END":
				await event.result.close();
				logger.success(`Rebuilt ${styleText$1("bold", relativeId(event.output[0]))} in ${styleText$1("green", ms(event.duration))}.`);
				break;
			case "ERROR":
				await event.result.close();
				logger.error(event.error);
				break;
			default: break;
		}
	});
	logger.log(`Waiting for changes...`);
}
async function bundleInner(config, cliOptions) {
	const startTime = performance.now();
	const result = [];
	const configList = arraify(config);
	for (const config$1 of configList) {
		const outputList = arraify(config$1.output || {});
		const build = await rolldown({
			...config$1,
			...cliOptions.input
		});
		try {
			for (const output of outputList) result.push(await build.write({
				...output,
				...cliOptions.output
			}));
		} finally {
			await build.close();
		}
	}
	result.forEach(printBundleOutputPretty);
	logger.log(``);
	const duration = performance.now() - startTime;
	logger.success(`rolldown v${version} Finished in ${styleText$1("green", ms(duration))}`);
}
function printBundleOutputPretty(output) {
	const outputEntries = collectOutputEntries(output.output);
	printOutputEntries(outputEntries, collectOutputLayoutAdjustmentSizes(outputEntries), "<DIR>");
}
function collectOutputEntries(output) {
	return output.map((chunk) => ({
		type: chunk.type,
		fileName: chunk.fileName,
		size: chunk.type === "chunk" ? Buffer.byteLength(chunk.code) : Buffer.byteLength(chunk.source)
	}));
}
function collectOutputLayoutAdjustmentSizes(entries) {
	let longest = 0;
	let biggestSize = 0;
	for (const entry of entries) {
		if (entry.fileName.length > longest) longest = entry.fileName.length;
		if (entry.size > biggestSize) biggestSize = entry.size;
	}
	const sizePad = displaySize(biggestSize).length;
	return {
		longest,
		biggestSize,
		sizePad
	};
}
const numberFormatter = new Intl.NumberFormat("en", {
	maximumFractionDigits: 2,
	minimumFractionDigits: 2
});
function displaySize(bytes) {
	return `${numberFormatter.format(bytes / 1e3)} kB`;
}
const CHUNK_GROUPS = [{
	type: "asset",
	color: "green"
}, {
	type: "chunk",
	color: "cyan"
}];
function printOutputEntries(entries, sizeAdjustment, distPath) {
	for (const group of CHUNK_GROUPS) {
		const filtered = entries.filter((e) => e.type === group.type);
		if (!filtered.length) continue;
		for (const entry of filtered.sort((a$1, z) => a$1.size - z.size)) {
			let log = styleText$1("dim", withTrailingSlash(distPath));
			log += styleText$1(group.color, entry.fileName.padEnd(sizeAdjustment.longest + 2));
			log += styleText$1("dim", entry.type);
			log += styleText$1("dim", ` │ size: ${displaySize(entry.size).padStart(sizeAdjustment.sizePad)}`);
			logger.log(log);
		}
	}
}
function withTrailingSlash(path$1) {
	if (path$1[path$1.length - 1] !== "/") return `${path$1}/`;
	return path$1;
}
function ms(duration) {
	return duration < 1e3 ? `${duration.toFixed(2)} ms` : `${(duration / 1e3).toFixed(2)} s`;
}
function relativeId(id) {
	if (!path.isAbsolute(id)) return id;
	return path.relative(path.resolve(), id);
}

//#endregion
//#region src/cli/commands/help.ts
const introduction = `${styleText$1("gray", `${description} (rolldown v${version})`)}

${styleText$1(["bold", "underline"], "USAGE")} ${styleText$1("cyan", "rolldown -c <config>")} or ${styleText$1("cyan", "rolldown <input> <options>")}`;
const examples = [
	{
		title: "Bundle with a config file `rolldown.config.mjs`",
		command: "rolldown -c rolldown.config.mjs"
	},
	{
		title: "Bundle the `src/main.ts` to `dist` with `cjs` format",
		command: "rolldown src/main.ts -d dist -f cjs"
	},
	{
		title: "Bundle the `src/main.ts` and handle the `.png` assets to Data URL",
		command: "rolldown src/main.ts -d dist --moduleTypes .png=dataurl"
	},
	{
		title: "Bundle the `src/main.tsx` and minify the output with sourcemap",
		command: "rolldown src/main.tsx -d dist -m -s"
	},
	{
		title: "Create self-executing IIFE using external jQuery as `$` and `_`",
		command: "rolldown src/main.ts -d dist -n bundle -f iife -e jQuery,window._ -g jQuery=$"
	}
];
const notes = [
	"Due to the API limitation, you need to pass `-s` for `.map` sourcemap file as the last argument.",
	"If you are using the configuration, please pass the `-c` as the last argument if you ignore the default configuration file.",
	"CLI options will override the configuration file.",
	"For more information, please visit https://rolldown.rs/."
];
function showHelp() {
	logger.log(introduction);
	logger.log("");
	logger.log(`${styleText$1(["bold", "underline"], "OPTIONS")}`);
	logger.log("");
	logger.log(Object.entries(options).sort(([a$1], [b$1]) => {
		if (options[a$1].short && !options[b$1].short) return -1;
		if (!options[a$1].short && options[b$1].short) return 1;
		if (options[a$1].short && options[b$1].short) return options[a$1].short.localeCompare(options[b$1].short);
		return a$1.localeCompare(b$1);
	}).map(([option, { type, short, hint, description: description$1 }]) => {
		let optionStr = `  --${option} `;
		option = camelCaseToKebabCase(option);
		if (short) optionStr += `-${short}, `;
		if (type === "string") optionStr += `<${hint ?? option}>`;
		if (description$1 && description$1.length > 0) description$1 = description$1[0].toUpperCase() + description$1.slice(1);
		return styleText$1("cyan", optionStr.padEnd(30)) + description$1 + (description$1 && description$1?.endsWith(".") ? "" : ".");
	}).join("\n"));
	logger.log("");
	logger.log(`${styleText$1(["bold", "underline"], "EXAMPLES")}`);
	logger.log("");
	examples.forEach(({ title, command }, ord) => {
		logger.log(`  ${ord + 1}. ${title}:`);
		logger.log(`    ${styleText$1("cyan", command)}`);
		logger.log("");
	});
	logger.log(`${styleText$1(["bold", "underline"], "NOTES")}`);
	logger.log("");
	notes.forEach((note) => {
		logger.log(`  * ${styleText$1("gray", note)}`);
	});
}

//#endregion
//#region src/cli/version-check.ts
function checkNodeVersion(nodeVersion) {
	const currentVersion = nodeVersion.split(".");
	const major = parseInt(currentVersion[0], 10);
	const minor = parseInt(currentVersion[1], 10);
	return major === 20 && minor >= 19 || major === 22 && minor >= 12 || major > 22;
}

//#endregion
//#region src/cli/index.ts
if (!checkNodeVersion(process$1.versions.node)) logger.warn(`You are using Node.js ${process$1.versions.node}. Rolldown requires Node.js version 20.19+ or 22.12+. Please upgrade your Node.js version.`);
async function main() {
	const { rawArgs, ...cliOptions } = parseCliArguments();
	if (cliOptions.environment) {
		const environment = Array.isArray(cliOptions.environment) ? cliOptions.environment : [cliOptions.environment];
		for (const argument of environment) for (const pair of argument.split(",")) {
			const [key, ...value] = pair.split(":");
			process$1.env[key] = value.length === 0 ? String(true) : value.join(":");
		}
	}
	if (cliOptions.config || cliOptions.config === "") {
		await bundleWithConfig(cliOptions.config, cliOptions, rawArgs);
		return;
	}
	if ("input" in cliOptions.input) {
		await bundleWithCliOptions(cliOptions);
		return;
	}
	if (cliOptions.version) {
		logger.log(`rolldown v${version}`);
		return;
	}
	showHelp();
}
main().catch((err) => {
	logger.error(err);
	process$1.exit(1);
});

//#endregion
export {  };