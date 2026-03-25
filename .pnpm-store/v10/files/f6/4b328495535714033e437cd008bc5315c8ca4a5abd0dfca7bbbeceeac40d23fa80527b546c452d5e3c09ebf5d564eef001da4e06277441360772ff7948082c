import { bgRed, bgYellow, blue, green, rgb, yellow } from "ansis";

//#region src/utils/general.ts
function toArray(val, defaultValue) {
	if (Array.isArray(val)) return val;
	else if (val == null) {
		if (defaultValue) return [defaultValue];
		return [];
	} else return [val];
}
function resolveComma(arr) {
	return arr.flatMap((format$1) => format$1.split(","));
}
function resolveRegex(str) {
	if (typeof str === "string" && str.length > 2 && str[0] === "/" && str.at(-1) === "/") return new RegExp(str.slice(1, -1));
	return str;
}
function debounce(fn, wait) {
	let timeout;
	return function(...args) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => {
			timeout = void 0;
			fn.apply(this, args);
		}, wait);
	};
}
function slash(string) {
	return string.replaceAll("\\", "/");
}
const noop = (v) => v;
function matchPattern(id, patterns) {
	return patterns.some((pattern) => {
		if (pattern instanceof RegExp) {
			pattern.lastIndex = 0;
			return pattern.test(id);
		}
		return id === pattern;
	});
}
function pkgExists(moduleName) {
	try {
		import.meta.resolve(moduleName);
		return true;
	} catch {}
	return false;
}
async function importWithError(moduleName) {
	try {
		return await import(moduleName);
	} catch (error) {
		throw new Error(`Failed to import module "${moduleName}". Please ensure it is installed.`, { cause: error });
	}
}

//#endregion
//#region src/utils/logger.ts
const LogLevels = {
	silent: 0,
	error: 1,
	warn: 2,
	info: 3
};
function format(msgs) {
	return msgs.filter((arg) => arg !== void 0 && arg !== false).join(" ");
}
const warnedMessages = /* @__PURE__ */ new Set();
function createLogger(level = "info", { customLogger, console = globalThis.console, failOnWarn = false } = {}) {
	if (customLogger) return customLogger;
	function output(type, msg) {
		if (LogLevels[logger.level] < LogLevels[type]) return;
		console[type === "info" ? "log" : type](msg);
	}
	const logger = {
		level,
		info(...msgs) {
			output("info", `${blue`ℹ`} ${format(msgs)}`);
		},
		warn(...msgs) {
			const message = format(msgs);
			if (failOnWarn) throw new Error(message);
			warnedMessages.add(message);
			output("warn", `\n${bgYellow` WARN `} ${message}\n`);
		},
		warnOnce(...msgs) {
			const message = format(msgs);
			if (warnedMessages.has(message)) return;
			if (failOnWarn) throw new Error(message);
			warnedMessages.add(message);
			output("warn", `\n${bgYellow` WARN `} ${message}\n`);
		},
		error(...msgs) {
			output("error", `\n${bgRed` ERROR `} ${format(msgs)}\n`);
		},
		success(...msgs) {
			output("info", `${green`✔`} ${format(msgs)}`);
		}
	};
	return logger;
}
const globalLogger = createLogger();
function prettyName(name) {
	if (!name) return void 0;
	return generateColor(name)(`[${name}]`);
}
function prettyFormat(format$1) {
	const formatColor = format$1 === "es" ? blue : format$1 === "cjs" ? yellow : noop;
	let formatText;
	switch (format$1) {
		case "es":
			formatText = "ESM";
			break;
		default:
			formatText = format$1.toUpperCase();
			break;
	}
	return formatColor(`[${formatText}]`);
}
const colors = /* @__PURE__ */ new Map();
function generateColor(name = "default") {
	if (colors.has(name)) return colors.get(name);
	let color;
	if (name === "default") color = blue;
	else {
		let hash = 0;
		for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
		color = rgb(...hslToRgb(hash % 360, 35, 55));
	}
	colors.set(name, color);
	return color;
}
function hslToRgb(h, s, l) {
	h = h % 360;
	h /= 360;
	s /= 100;
	l /= 100;
	let r, g, b;
	if (s === 0) r = g = b = l;
	else {
		const q = l < .5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return [
		Math.max(0, Math.round(r * 255)),
		Math.max(0, Math.round(g * 255)),
		Math.max(0, Math.round(b * 255))
	];
}
function hue2rgb(p, q, t) {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}

//#endregion
//#region package.json
var version = "0.16.5";

//#endregion
export { globalLogger as a, debounce as c, noop as d, pkgExists as f, toArray as g, slash as h, generateColor as i, importWithError as l, resolveRegex as m, LogLevels as n, prettyFormat as o, resolveComma as p, createLogger as r, prettyName as s, version as t, matchPattern as u };