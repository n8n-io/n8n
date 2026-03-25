'use strict';

var path$1 = require('node:path');
var node_url = require('node:url');
var fs$1 = require('node:fs');
var esbuild = require('esbuild');
var node_child_process = require('node:child_process');
var node_module = require('node:module');
var require$$0 = require('tty');
var require$$1 = require('util');
var require$$1$1 = require('path');
var pm = require('picomatch');
var require$$0$1 = require('crypto');
var require$$1$2 = require('fs');
var readline = require('node:readline');
var require$$2 = require('os');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const { version: version$2 } = JSON.parse(
  fs$1.readFileSync(new URL("../../package.json", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('node-cjs/publicUtils.cjs', document.baseURI).href)))).toString()
);
const VERSION = version$2;
const DEFAULT_MAIN_FIELDS = [
  "browser",
  "module",
  "jsnext:main",
  // moment still uses this...
  "jsnext"
];
const DEFAULT_CLIENT_MAIN_FIELDS = Object.freeze(DEFAULT_MAIN_FIELDS);
const DEFAULT_SERVER_MAIN_FIELDS = Object.freeze(
  DEFAULT_MAIN_FIELDS.filter((f) => f !== "browser")
);
const DEV_PROD_CONDITION = `development|production`;
const DEFAULT_CONDITIONS = ["module", "browser", "node", DEV_PROD_CONDITION];
const DEFAULT_CLIENT_CONDITIONS = Object.freeze(
  DEFAULT_CONDITIONS.filter((c) => c !== "node")
);
const DEFAULT_SERVER_CONDITIONS = Object.freeze(
  DEFAULT_CONDITIONS.filter((c) => c !== "browser")
);
const FS_PREFIX = `/@fs/`;
const VITE_PACKAGE_DIR = path$1.resolve(
  // import.meta.url is `dist/node/constants.js` after bundle
  node_url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('node-cjs/publicUtils.cjs', document.baseURI).href))),
  "../../.."
);
const CLIENT_ENTRY = path$1.resolve(VITE_PACKAGE_DIR, "dist/client/client.mjs");
path$1.resolve(VITE_PACKAGE_DIR, "dist/client/env.mjs");
path$1.dirname(CLIENT_ENTRY);
const defaultAllowedOrigins = /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

const comma = ','.charCodeAt(0);
const semicolon = ';'.charCodeAt(0);
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const intToChar = new Uint8Array(64); // 64 possible chars.
const charToInt = new Uint8Array(128); // z is 122 in ASCII
for (let i = 0; i < chars.length; i++) {
    const c = chars.charCodeAt(i);
    intToChar[i] = c;
    charToInt[c] = i;
}
function encodeInteger(builder, num, relative) {
    let delta = num - relative;
    delta = delta < 0 ? (-delta << 1) | 1 : delta << 1;
    do {
        let clamped = delta & 0b011111;
        delta >>>= 5;
        if (delta > 0)
            clamped |= 0b100000;
        builder.write(intToChar[clamped]);
    } while (delta > 0);
    return num;
}

const bufLength = 1024 * 16;
// Provide a fallback for older environments.
const td = typeof TextDecoder !== 'undefined'
    ? /* #__PURE__ */ new TextDecoder()
    : typeof Buffer !== 'undefined'
        ? {
            decode(buf) {
                const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
                return out.toString();
            },
        }
        : {
            decode(buf) {
                let out = '';
                for (let i = 0; i < buf.length; i++) {
                    out += String.fromCharCode(buf[i]);
                }
                return out;
            },
        };
class StringWriter {
    constructor() {
        this.pos = 0;
        this.out = '';
        this.buffer = new Uint8Array(bufLength);
    }
    write(v) {
        const { buffer } = this;
        buffer[this.pos++] = v;
        if (this.pos === bufLength) {
            this.out += td.decode(buffer);
            this.pos = 0;
        }
    }
    flush() {
        const { buffer, out, pos } = this;
        return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
    }
}
function encode(decoded) {
    const writer = new StringWriter();
    let sourcesIndex = 0;
    let sourceLine = 0;
    let sourceColumn = 0;
    let namesIndex = 0;
    for (let i = 0; i < decoded.length; i++) {
        const line = decoded[i];
        if (i > 0)
            writer.write(semicolon);
        if (line.length === 0)
            continue;
        let genColumn = 0;
        for (let j = 0; j < line.length; j++) {
            const segment = line[j];
            if (j > 0)
                writer.write(comma);
            genColumn = encodeInteger(writer, segment[0], genColumn);
            if (segment.length === 1)
                continue;
            sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex);
            sourceLine = encodeInteger(writer, segment[2], sourceLine);
            sourceColumn = encodeInteger(writer, segment[3], sourceColumn);
            if (segment.length === 4)
                continue;
            namesIndex = encodeInteger(writer, segment[4], namesIndex);
        }
    }
    return writer.flush();
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var picocolors = {exports: {}};

let p = process || {}, argv = p.argv || [], env = p.env || {};
let isColorSupported =
	!(!!env.NO_COLOR || argv.includes("--no-color")) &&
	(!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || ((p.stdout || {}).isTTY && env.TERM !== "dumb") || !!env.CI);

let formatter = (open, close, replace = open) =>
	input => {
		let string = "" + input, index = string.indexOf(close, open.length);
		return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close
	};

let replaceClose = (string, close, replace, index) => {
	let result = "", cursor = 0;
	do {
		result += string.substring(cursor, index) + replace;
		cursor = index + close.length;
		index = string.indexOf(close, cursor);
	} while (~index)
	return result + string.substring(cursor)
};

let createColors = (enabled = isColorSupported) => {
	let f = enabled ? formatter : () => String;
	return {
		isColorSupported: enabled,
		reset: f("\x1b[0m", "\x1b[0m"),
		bold: f("\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m"),
		dim: f("\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m"),
		italic: f("\x1b[3m", "\x1b[23m"),
		underline: f("\x1b[4m", "\x1b[24m"),
		inverse: f("\x1b[7m", "\x1b[27m"),
		hidden: f("\x1b[8m", "\x1b[28m"),
		strikethrough: f("\x1b[9m", "\x1b[29m"),

		black: f("\x1b[30m", "\x1b[39m"),
		red: f("\x1b[31m", "\x1b[39m"),
		green: f("\x1b[32m", "\x1b[39m"),
		yellow: f("\x1b[33m", "\x1b[39m"),
		blue: f("\x1b[34m", "\x1b[39m"),
		magenta: f("\x1b[35m", "\x1b[39m"),
		cyan: f("\x1b[36m", "\x1b[39m"),
		white: f("\x1b[37m", "\x1b[39m"),
		gray: f("\x1b[90m", "\x1b[39m"),

		bgBlack: f("\x1b[40m", "\x1b[49m"),
		bgRed: f("\x1b[41m", "\x1b[49m"),
		bgGreen: f("\x1b[42m", "\x1b[49m"),
		bgYellow: f("\x1b[43m", "\x1b[49m"),
		bgBlue: f("\x1b[44m", "\x1b[49m"),
		bgMagenta: f("\x1b[45m", "\x1b[49m"),
		bgCyan: f("\x1b[46m", "\x1b[49m"),
		bgWhite: f("\x1b[47m", "\x1b[49m"),

		blackBright: f("\x1b[90m", "\x1b[39m"),
		redBright: f("\x1b[91m", "\x1b[39m"),
		greenBright: f("\x1b[92m", "\x1b[39m"),
		yellowBright: f("\x1b[93m", "\x1b[39m"),
		blueBright: f("\x1b[94m", "\x1b[39m"),
		magentaBright: f("\x1b[95m", "\x1b[39m"),
		cyanBright: f("\x1b[96m", "\x1b[39m"),
		whiteBright: f("\x1b[97m", "\x1b[39m"),

		bgBlackBright: f("\x1b[100m", "\x1b[49m"),
		bgRedBright: f("\x1b[101m", "\x1b[49m"),
		bgGreenBright: f("\x1b[102m", "\x1b[49m"),
		bgYellowBright: f("\x1b[103m", "\x1b[49m"),
		bgBlueBright: f("\x1b[104m", "\x1b[49m"),
		bgMagentaBright: f("\x1b[105m", "\x1b[49m"),
		bgCyanBright: f("\x1b[106m", "\x1b[49m"),
		bgWhiteBright: f("\x1b[107m", "\x1b[49m"),
	}
};

picocolors.exports = createColors();
picocolors.exports.createColors = createColors;

var picocolorsExports = picocolors.exports;
var colors = /*@__PURE__*/getDefaultExportFromCjs(picocolorsExports);

var node = {exports: {}};

/**
 * Helpers.
 */

var ms;
var hasRequiredMs;

function requireMs () {
	if (hasRequiredMs) return ms;
	hasRequiredMs = 1;
	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} [options]
	 * @throws {Error} throw an error if val is not a non-empty string or a number
	 * @return {String|Number}
	 * @api public
	 */

	ms = function (val, options) {
	  options = options || {};
	  var type = typeof val;
	  if (type === 'string' && val.length > 0) {
	    return parse(val);
	  } else if (type === 'number' && isFinite(val)) {
	    return options.long ? fmtLong(val) : fmtShort(val);
	  }
	  throw new Error(
	    'val is not a non-empty string or a valid number. val=' +
	      JSON.stringify(val)
	  );
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = String(str);
	  if (str.length > 100) {
	    return;
	  }
	  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
	    str
	  );
	  if (!match) {
	    return;
	  }
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'weeks':
	    case 'week':
	    case 'w':
	      return n * w;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	    default:
	      return undefined;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function fmtShort(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return Math.round(ms / d) + 'd';
	  }
	  if (msAbs >= h) {
	    return Math.round(ms / h) + 'h';
	  }
	  if (msAbs >= m) {
	    return Math.round(ms / m) + 'm';
	  }
	  if (msAbs >= s) {
	    return Math.round(ms / s) + 's';
	  }
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function fmtLong(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return plural(ms, msAbs, d, 'day');
	  }
	  if (msAbs >= h) {
	    return plural(ms, msAbs, h, 'hour');
	  }
	  if (msAbs >= m) {
	    return plural(ms, msAbs, m, 'minute');
	  }
	  if (msAbs >= s) {
	    return plural(ms, msAbs, s, 'second');
	  }
	  return ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, msAbs, n, name) {
	  var isPlural = msAbs >= n * 1.5;
	  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
	}
	return ms;
}

var common;
var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 */

	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = requireMs();
		createDebug.destroy = destroy;

		Object.keys(env).forEach(key => {
			createDebug[key] = env[key];
		});

		/**
		* The currently active debug mode names, and names to skip.
		*/

		createDebug.names = [];
		createDebug.skips = [];

		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};

		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;

			for (let i = 0; i < namespace.length; i++) {
				hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
				hash |= 0; // Convert to 32bit integer
			}

			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;

		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;

			function debug(...args) {
				// Disabled?
				if (!debug.enabled) {
					return;
				}

				const self = debug;

				// Set `diff` timestamp
				const curr = Number(new Date());
				const ms = curr - (prevTime || curr);
				self.diff = ms;
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;

				args[0] = createDebug.coerce(args[0]);

				if (typeof args[0] !== 'string') {
					// Anything else let's inspect with %O
					args.unshift('%O');
				}

				// Apply any `formatters` transformations
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					// If we encounter an escaped % then don't increase the array index
					if (match === '%%') {
						return '%';
					}
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === 'function') {
						const val = args[index];
						match = formatter.call(self, val);

						// Now we need to remove `args[index]` since it's inlined in the `format`
						args.splice(index, 1);
						index--;
					}
					return match;
				});

				// Apply env-specific formatting (colors, etc.)
				createDebug.formatArgs.call(self, args);

				const logFn = self.log || createDebug.log;
				logFn.apply(self, args);
			}

			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

			Object.defineProperty(debug, 'enabled', {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) {
						return enableOverride;
					}
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}

					return enabledCache;
				},
				set: v => {
					enableOverride = v;
				}
			});

			// Env-specific initialization logic for debug instances
			if (typeof createDebug.init === 'function') {
				createDebug.init(debug);
			}

			return debug;
		}

		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}

		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;

			createDebug.names = [];
			createDebug.skips = [];

			const split = (typeof namespaces === 'string' ? namespaces : '')
				.trim()
				.replace(' ', ',')
				.split(',')
				.filter(Boolean);

			for (const ns of split) {
				if (ns[0] === '-') {
					createDebug.skips.push(ns.slice(1));
				} else {
					createDebug.names.push(ns);
				}
			}
		}

		/**
		 * Checks if the given string matches a namespace template, honoring
		 * asterisks as wildcards.
		 *
		 * @param {String} search
		 * @param {String} template
		 * @return {Boolean}
		 */
		function matchesTemplate(search, template) {
			let searchIndex = 0;
			let templateIndex = 0;
			let starIndex = -1;
			let matchIndex = 0;

			while (searchIndex < search.length) {
				if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === '*')) {
					// Match character or proceed with wildcard
					if (template[templateIndex] === '*') {
						starIndex = templateIndex;
						matchIndex = searchIndex;
						templateIndex++; // Skip the '*'
					} else {
						searchIndex++;
						templateIndex++;
					}
				} else if (starIndex !== -1) { // eslint-disable-line no-negated-condition
					// Backtrack to the last '*' and try to match more characters
					templateIndex = starIndex + 1;
					matchIndex++;
					searchIndex = matchIndex;
				} else {
					return false; // No match
				}
			}

			// Handle trailing '*' in template
			while (templateIndex < template.length && template[templateIndex] === '*') {
				templateIndex++;
			}

			return templateIndex === template.length;
		}

		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [
				...createDebug.names,
				...createDebug.skips.map(namespace => '-' + namespace)
			].join(',');
			createDebug.enable('');
			return namespaces;
		}

		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			for (const skip of createDebug.skips) {
				if (matchesTemplate(name, skip)) {
					return false;
				}
			}

			for (const ns of createDebug.names) {
				if (matchesTemplate(name, ns)) {
					return true;
				}
			}

			return false;
		}

		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) {
				return val.stack || val.message;
			}
			return val;
		}

		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}

		createDebug.enable(createDebug.load());

		return createDebug;
	}

	common = setup;
	return common;
}

/**
 * Module dependencies.
 */

(function (module, exports) {
	const tty = require$$0;
	const util = require$$1;

	/**
	 * This is the Node.js implementation of `debug()`.
	 */

	exports.init = init;
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.destroy = util.deprecate(
		() => {},
		'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
	);

	/**
	 * Colors.
	 */

	exports.colors = [6, 2, 3, 4, 5, 1];

	try {
		// Optional dependency (as in, doesn't need to be installed, NOT like optionalDependencies in package.json)
		// eslint-disable-next-line import/no-extraneous-dependencies
		const supportsColor = require('supports-color');

		if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
			exports.colors = [
				20,
				21,
				26,
				27,
				32,
				33,
				38,
				39,
				40,
				41,
				42,
				43,
				44,
				45,
				56,
				57,
				62,
				63,
				68,
				69,
				74,
				75,
				76,
				77,
				78,
				79,
				80,
				81,
				92,
				93,
				98,
				99,
				112,
				113,
				128,
				129,
				134,
				135,
				148,
				149,
				160,
				161,
				162,
				163,
				164,
				165,
				166,
				167,
				168,
				169,
				170,
				171,
				172,
				173,
				178,
				179,
				184,
				185,
				196,
				197,
				198,
				199,
				200,
				201,
				202,
				203,
				204,
				205,
				206,
				207,
				208,
				209,
				214,
				215,
				220,
				221
			];
		}
	} catch (error) {
		// Swallow - we only care if `supports-color` is available; it doesn't have to be.
	}

	/**
	 * Build up the default `inspectOpts` object from the environment variables.
	 *
	 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
	 */

	exports.inspectOpts = Object.keys(process.env).filter(key => {
		return /^debug_/i.test(key);
	}).reduce((obj, key) => {
		// Camel-case
		const prop = key
			.substring(6)
			.toLowerCase()
			.replace(/_([a-z])/g, (_, k) => {
				return k.toUpperCase();
			});

		// Coerce string value into JS value
		let val = process.env[key];
		if (/^(yes|on|true|enabled)$/i.test(val)) {
			val = true;
		} else if (/^(no|off|false|disabled)$/i.test(val)) {
			val = false;
		} else if (val === 'null') {
			val = null;
		} else {
			val = Number(val);
		}

		obj[prop] = val;
		return obj;
	}, {});

	/**
	 * Is stdout a TTY? Colored output is enabled when `true`.
	 */

	function useColors() {
		return 'colors' in exports.inspectOpts ?
			Boolean(exports.inspectOpts.colors) :
			tty.isatty(process.stderr.fd);
	}

	/**
	 * Adds ANSI color escape codes if enabled.
	 *
	 * @api public
	 */

	function formatArgs(args) {
		const {namespace: name, useColors} = this;

		if (useColors) {
			const c = this.color;
			const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
			const prefix = `  ${colorCode};1m${name} \u001B[0m`;

			args[0] = prefix + args[0].split('\n').join('\n' + prefix);
			args.push(colorCode + 'm+' + module.exports.humanize(this.diff) + '\u001B[0m');
		} else {
			args[0] = getDate() + name + ' ' + args[0];
		}
	}

	function getDate() {
		if (exports.inspectOpts.hideDate) {
			return '';
		}
		return new Date().toISOString() + ' ';
	}

	/**
	 * Invokes `util.formatWithOptions()` with the specified arguments and writes to stderr.
	 */

	function log(...args) {
		return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + '\n');
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */
	function save(namespaces) {
		if (namespaces) {
			process.env.DEBUG = namespaces;
		} else {
			// If you set a process.env field to null or undefined, it gets cast to the
			// string 'null' or 'undefined'. Just delete instead.
			delete process.env.DEBUG;
		}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
		return process.env.DEBUG;
	}

	/**
	 * Init logic for `debug` instances.
	 *
	 * Create a new `inspectOpts` object in case `useColors` is set
	 * differently for a particular `debug` instance.
	 */

	function init(debug) {
		debug.inspectOpts = {};

		const keys = Object.keys(exports.inspectOpts);
		for (let i = 0; i < keys.length; i++) {
			debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
		}
	}

	module.exports = requireCommon()(exports);

	const {formatters} = module.exports;

	/**
	 * Map %o to `util.inspect()`, all on a single line.
	 */

	formatters.o = function (v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts)
			.split('\n')
			.map(str => str.trim())
			.join(' ');
	};

	/**
	 * Map %O to `util.inspect()`, allowing multiple lines if needed.
	 */

	formatters.O = function (v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts);
	}; 
} (node, node.exports));

var nodeExports = node.exports;
var debug$3 = /*@__PURE__*/getDefaultExportFromCjs(nodeExports);

// Helper since Typescript can't detect readonly arrays with Array.isArray
function isArray(arg) {
    return Array.isArray(arg);
}
function ensureArray(thing) {
    if (isArray(thing))
        return thing;
    if (thing == null)
        return [];
    return [thing];
}

const normalizePathRegExp = new RegExp(`\\${require$$1$1.win32.sep}`, 'g');
const normalizePath$1 = function normalizePath(filename) {
    return filename.replace(normalizePathRegExp, require$$1$1.posix.sep);
};

function getMatcherString(id, resolutionBase) {
    if (resolutionBase === false || require$$1$1.isAbsolute(id) || id.startsWith('**')) {
        return normalizePath$1(id);
    }
    // resolve('') is valid and will default to process.cwd()
    const basePath = normalizePath$1(require$$1$1.resolve(resolutionBase || ''))
        // escape all possible (posix + win) path characters that might interfere with regex
        .replace(/[-^$*+?.()|[\]{}]/g, '\\$&');
    // Note that we use posix.join because:
    // 1. the basePath has been normalized to use /
    // 2. the incoming glob (id) matcher, also uses /
    // otherwise Node will force backslash (\) on windows
    return require$$1$1.posix.join(basePath, normalizePath$1(id));
}
const createFilter$1 = function createFilter(include, exclude, options) {
    const resolutionBase = options && options.resolve;
    const getMatcher = (id) => id instanceof RegExp
        ? id
        : {
            test: (what) => {
                // this refactor is a tad overly verbose but makes for easy debugging
                const pattern = getMatcherString(id, resolutionBase);
                const fn = pm(pattern, { dot: true });
                const result = fn(what);
                return result;
            }
        };
    const includeMatchers = ensureArray(include).map(getMatcher);
    const excludeMatchers = ensureArray(exclude).map(getMatcher);
    if (!includeMatchers.length && !excludeMatchers.length)
        return (id) => typeof id === 'string' && !id.includes('\0');
    return function result(id) {
        if (typeof id !== 'string')
            return false;
        if (id.includes('\0'))
            return false;
        const pathId = normalizePath$1(id);
        for (let i = 0; i < excludeMatchers.length; ++i) {
            const matcher = excludeMatchers[i];
            if (matcher instanceof RegExp) {
                matcher.lastIndex = 0;
            }
            if (matcher.test(pathId))
                return false;
        }
        for (let i = 0; i < includeMatchers.length; ++i) {
            const matcher = includeMatchers[i];
            if (matcher instanceof RegExp) {
                matcher.lastIndex = 0;
            }
            if (matcher.test(pathId))
                return true;
        }
        return !includeMatchers.length;
    };
};

const reservedWords = 'break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum await implements package protected static interface private public';
const builtins = 'arguments Infinity NaN undefined null true false eval uneval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Symbol Error EvalError InternalError RangeError ReferenceError SyntaxError TypeError URIError Number Math Date String RegExp Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array Map Set WeakMap WeakSet SIMD ArrayBuffer DataView JSON Promise Generator GeneratorFunction Reflect Proxy Intl';
const forbiddenIdentifiers = new Set(`${reservedWords} ${builtins}`.split(' '));
forbiddenIdentifiers.add('');

const isWindows = typeof process !== "undefined" && process.platform === "win32";
const windowsSlashRE = /\\/g;
function slash(p) {
  return p.replace(windowsSlashRE, "/");
}
const postfixRE = /[?#].*$/;
function cleanUrl(url) {
  return url.replace(postfixRE, "");
}
function withTrailingSlash(path) {
  if (path[path.length - 1] !== "/") {
    return `${path}/`;
  }
  return path;
}

let pnp;
if (process.versions.pnp) {
  try {
    pnp = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('node-cjs/publicUtils.cjs', document.baseURI).href)))("pnpapi");
  } catch {
  }
}
function resolvePackageData(pkgName, basedir, preserveSymlinks = false, packageCache) {
  if (pnp) {
    try {
      const pkg = pnp.resolveToUnqualified(pkgName, basedir, {
        considerBuiltins: false
      });
      if (!pkg) return null;
      const pkgData = loadPackageData(path$1.join(pkg, "package.json"));
      return pkgData;
    } catch {
      return null;
    }
  }
  while (basedir) {
    const pkg = path$1.join(basedir, "node_modules", pkgName, "package.json");
    try {
      if (fs$1.existsSync(pkg)) {
        const pkgPath = preserveSymlinks ? pkg : safeRealpathSync(pkg);
        const pkgData = loadPackageData(pkgPath);
        return pkgData;
      }
    } catch {
    }
    const nextBasedir = path$1.dirname(basedir);
    if (nextBasedir === basedir) break;
    basedir = nextBasedir;
  }
  return null;
}
function loadPackageData(pkgPath) {
  const data = JSON.parse(stripBomTag(fs$1.readFileSync(pkgPath, "utf-8")));
  const pkgDir = normalizePath(path$1.dirname(pkgPath));
  const { sideEffects } = data;
  let hasSideEffects;
  if (typeof sideEffects === "boolean") {
    hasSideEffects = () => sideEffects;
  } else if (Array.isArray(sideEffects)) {
    if (sideEffects.length <= 0) {
      hasSideEffects = () => false;
    } else {
      const finalPackageSideEffects = sideEffects.map((sideEffect) => {
        if (sideEffect.includes("/")) {
          return sideEffect;
        }
        return `**/${sideEffect}`;
      });
      hasSideEffects = createFilter(finalPackageSideEffects, null, {
        resolve: pkgDir
      });
    }
  } else {
    hasSideEffects = () => null;
  }
  const resolvedCache = {};
  const pkg = {
    dir: pkgDir,
    data,
    hasSideEffects,
    setResolvedCache(key, entry, options) {
      resolvedCache[getResolveCacheKey(key, options)] = entry;
    },
    getResolvedCache(key, options) {
      return resolvedCache[getResolveCacheKey(key, options)];
    }
  };
  return pkg;
}
function getResolveCacheKey(key, options) {
  return [
    key,
    options.isRequire ? "1" : "0",
    options.conditions.join("_"),
    options.extensions.join("_"),
    options.mainFields.join("_")
  ].join("|");
}

const createFilter = createFilter$1;
node_module.builtinModules.filter((id) => !id.includes(":"));
function isInNodeModules(id) {
  return id.includes("node_modules");
}
node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('node-cjs/publicUtils.cjs', document.baseURI).href)));
const _dirname = path$1.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('node-cjs/publicUtils.cjs', document.baseURI).href))));
const rollupVersion = resolvePackageData("rollup", _dirname, true)?.data.version ?? "";
const filter = process.env.VITE_DEBUG_FILTER;
const DEBUG = process.env.DEBUG;
function createDebugger(namespace, options = {}) {
  const log = debug$3(namespace);
  const { onlyWhenFocused, depth } = options;
  if (depth && log.inspectOpts && log.inspectOpts.depth == null) {
    log.inspectOpts.depth = options.depth;
  }
  let enabled = log.enabled;
  if (enabled && onlyWhenFocused) {
    const ns = typeof onlyWhenFocused === "string" ? onlyWhenFocused : namespace;
    enabled = !!DEBUG?.includes(ns);
  }
  if (enabled) {
    return (...args) => {
      if (!filter || args.some((a) => a?.includes?.(filter))) {
        log(...args);
      }
    };
  }
}
function testCaseInsensitiveFS() {
  if (!CLIENT_ENTRY.endsWith("client.mjs")) {
    throw new Error(
      `cannot test case insensitive FS, CLIENT_ENTRY const doesn't contain client.mjs`
    );
  }
  if (!fs$1.existsSync(CLIENT_ENTRY)) {
    throw new Error(
      "cannot test case insensitive FS, CLIENT_ENTRY does not point to an existing file: " + CLIENT_ENTRY
    );
  }
  return fs$1.existsSync(CLIENT_ENTRY.replace("client.mjs", "cLiEnT.mjs"));
}
const isCaseInsensitiveFS = testCaseInsensitiveFS();
const VOLUME_RE = /^[A-Z]:/i;
function normalizePath(id) {
  return path$1.posix.normalize(isWindows ? slash(id) : id);
}
function fsPathFromId(id) {
  const fsPath = normalizePath(
    id.startsWith(FS_PREFIX) ? id.slice(FS_PREFIX.length) : id
  );
  return fsPath[0] === "/" || VOLUME_RE.test(fsPath) ? fsPath : `/${fsPath}`;
}
function fsPathFromUrl(url) {
  return fsPathFromId(cleanUrl(url));
}
function isParentDirectory(dir, file) {
  dir = withTrailingSlash(dir);
  return file.startsWith(dir) || isCaseInsensitiveFS && file.toLowerCase().startsWith(dir.toLowerCase());
}
function isSameFileUri(file1, file2) {
  return file1 === file2 || isCaseInsensitiveFS && file1.toLowerCase() === file2.toLowerCase();
}
const trailingSeparatorRE = /[?&]$/;
const timestampRE = /\bt=\d{13}&?\b/;
function removeTimestampQuery(url) {
  return url.replace(timestampRE, "").replace(trailingSeparatorRE, "");
}
function isObject$1(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
function tryStatSync(file) {
  try {
    return fs$1.statSync(file, { throwIfNoEntry: false });
  } catch {
  }
}
function isFileReadable(filename) {
  if (!tryStatSync(filename)) {
    return false;
  }
  try {
    fs$1.accessSync(filename, fs$1.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
let safeRealpathSync = isWindows ? windowsSafeRealPathSync : fs$1.realpathSync.native;
const windowsNetworkMap = /* @__PURE__ */ new Map();
function windowsMappedRealpathSync(path2) {
  const realPath = fs$1.realpathSync.native(path2);
  if (realPath.startsWith("\\\\")) {
    for (const [network, volume] of windowsNetworkMap) {
      if (realPath.startsWith(network)) return realPath.replace(network, volume);
    }
  }
  return realPath;
}
const parseNetUseRE = /^\w* +(\w:) +([^ ]+)\s/;
let firstSafeRealPathSyncRun = false;
function windowsSafeRealPathSync(path2) {
  if (!firstSafeRealPathSyncRun) {
    optimizeSafeRealPathSync();
    firstSafeRealPathSyncRun = true;
  }
  return fs$1.realpathSync(path2);
}
function optimizeSafeRealPathSync() {
  const nodeVersion = process.versions.node.split(".").map(Number);
  if (nodeVersion[0] < 18 || nodeVersion[0] === 18 && nodeVersion[1] < 10) {
    safeRealpathSync = fs$1.realpathSync;
    return;
  }
  try {
    fs$1.realpathSync.native(path$1.resolve("./"));
  } catch (error) {
    if (error.message.includes("EISDIR: illegal operation on a directory")) {
      safeRealpathSync = fs$1.realpathSync;
      return;
    }
  }
  node_child_process.exec("net use", (error, stdout) => {
    if (error) return;
    const lines = stdout.split("\n");
    for (const line of lines) {
      const m = parseNetUseRE.exec(line);
      if (m) windowsNetworkMap.set(m[2], m[1]);
    }
    if (windowsNetworkMap.size === 0) {
      safeRealpathSync = fs$1.realpathSync.native;
    } else {
      safeRealpathSync = windowsMappedRealpathSync;
    }
  });
}
function arraify(target) {
  return Array.isArray(target) ? target : [target];
}
function backwardCompatibleWorkerPlugins(plugins) {
  if (Array.isArray(plugins)) {
    return plugins;
  }
  if (typeof plugins === "function") {
    return plugins();
  }
  return [];
}
function mergeConfigRecursively(defaults, overrides, rootPath) {
  const merged = { ...defaults };
  for (const key in overrides) {
    const value = overrides[key];
    if (value == null) {
      continue;
    }
    const existing = merged[key];
    if (existing == null) {
      merged[key] = value;
      continue;
    }
    if (key === "alias" && (rootPath === "resolve" || rootPath === "")) {
      merged[key] = mergeAlias(existing, value);
      continue;
    } else if (key === "assetsInclude" && rootPath === "") {
      merged[key] = [].concat(existing, value);
      continue;
    } else if (key === "noExternal" && (rootPath === "ssr" || rootPath === "resolve") && (existing === true || value === true)) {
      merged[key] = true;
      continue;
    } else if (key === "plugins" && rootPath === "worker") {
      merged[key] = () => [
        ...backwardCompatibleWorkerPlugins(existing),
        ...backwardCompatibleWorkerPlugins(value)
      ];
      continue;
    } else if (key === "server" && rootPath === "server.hmr") {
      merged[key] = value;
      continue;
    }
    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = [...arraify(existing), ...arraify(value)];
      continue;
    }
    if (isObject$1(existing) && isObject$1(value)) {
      merged[key] = mergeConfigRecursively(
        existing,
        value,
        rootPath ? `${rootPath}.${key}` : key
      );
      continue;
    }
    merged[key] = value;
  }
  return merged;
}
function mergeConfig(defaults, overrides, isRoot = true) {
  if (typeof defaults === "function" || typeof overrides === "function") {
    throw new Error(`Cannot merge config in form of callback`);
  }
  return mergeConfigRecursively(defaults, overrides, isRoot ? "" : ".");
}
function mergeAlias(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (isObject$1(a) && isObject$1(b)) {
    return { ...a, ...b };
  }
  return [...normalizeAlias(b), ...normalizeAlias(a)];
}
function normalizeAlias(o = []) {
  return Array.isArray(o) ? o.map(normalizeSingleAlias) : Object.keys(o).map(
    (find) => normalizeSingleAlias({
      find,
      replacement: o[find]
    })
  );
}
function normalizeSingleAlias({
  find,
  replacement,
  customResolver
}) {
  if (typeof find === "string" && find.endsWith("/") && replacement.endsWith("/")) {
    find = find.slice(0, find.length - 1);
    replacement = replacement.slice(0, replacement.length - 1);
  }
  const alias = {
    find,
    replacement
  };
  if (customResolver) {
    alias.customResolver = customResolver;
  }
  return alias;
}
function stripBomTag(content) {
  if (content.charCodeAt(0) === 65279) {
    return content.slice(1);
  }
  return content;
}

const CSS_LANGS_RE = (
  // eslint-disable-next-line regexp/no-unused-capturing-group
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/
);
const isCSSRequest = (request) => CSS_LANGS_RE.test(request);
class SplitVendorChunkCache {
  cache;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  reset() {
    this.cache = /* @__PURE__ */ new Map();
  }
}
function splitVendorChunk(options = {}) {
  const cache = options.cache ?? new SplitVendorChunkCache();
  return (id, { getModuleInfo }) => {
    if (isInNodeModules(id) && !isCSSRequest(id) && staticImportedByEntry(id, getModuleInfo, cache.cache)) {
      return "vendor";
    }
  };
}
function staticImportedByEntry(id, getModuleInfo, cache, importStack = []) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  if (importStack.includes(id)) {
    cache.set(id, false);
    return false;
  }
  const mod = getModuleInfo(id);
  if (!mod) {
    cache.set(id, false);
    return false;
  }
  if (mod.isEntry) {
    cache.set(id, true);
    return true;
  }
  const someImporterIs = mod.importers.some(
    (importer) => staticImportedByEntry(
      importer,
      getModuleInfo,
      cache,
      importStack.concat(id)
    )
  );
  cache.set(id, someImporterIs);
  return someImporterIs;
}
function splitVendorChunkPlugin() {
  const caches = [];
  function createSplitVendorChunk(output, config) {
    const cache = new SplitVendorChunkCache();
    caches.push(cache);
    const build = config.build ?? {};
    const format = output.format;
    if (!build.ssr && !build.lib && format !== "umd" && format !== "iife") {
      return splitVendorChunk({ cache });
    }
  }
  return {
    name: "vite:split-vendor-chunk",
    config(config) {
      let outputs = config.build?.rollupOptions?.output;
      if (outputs) {
        outputs = arraify(outputs);
        for (const output of outputs) {
          const viteManualChunks = createSplitVendorChunk(output, config);
          if (viteManualChunks) {
            if (output.manualChunks) {
              if (typeof output.manualChunks === "function") {
                const userManualChunks = output.manualChunks;
                output.manualChunks = (id, api) => {
                  return userManualChunks(id, api) ?? viteManualChunks(id, api);
                };
              } else {
                console.warn(
                  "(!) the `splitVendorChunk` plugin doesn't have any effect when using the object form of `build.rollupOptions.output.manualChunks`. Consider using the function form instead."
                );
              }
            } else {
              output.manualChunks = viteManualChunks;
            }
          }
        }
      } else {
        return {
          build: {
            rollupOptions: {
              output: {
                manualChunks: createSplitVendorChunk({}, config)
              }
            }
          }
        };
      }
    },
    buildStart() {
      caches.forEach((cache) => cache.reset());
    }
  };
}

function perEnvironmentPlugin(name, applyToEnvironment) {
  return {
    name,
    applyToEnvironment
  };
}

function perEnvironmentState(initial) {
  const stateMap = /* @__PURE__ */ new WeakMap();
  return function(context) {
    const { environment } = context;
    let state = stateMap.get(environment);
    if (!state) {
      state = initial(environment);
      stateMap.set(environment, state);
    }
    return state;
  };
}

var convertSourceMap$1 = {};

(function (exports) {

	Object.defineProperty(exports, 'commentRegex', {
	  get: function getCommentRegex () {
	    // Groups: 1: media type, 2: MIME type, 3: charset, 4: encoding, 5: data.
	    return /^\s*?\/[\/\*][@#]\s+?sourceMappingURL=data:(((?:application|text)\/json)(?:;charset=([^;,]+?)?)?)?(?:;(base64))?,(.*?)$/mg;
	  }
	});


	Object.defineProperty(exports, 'mapFileCommentRegex', {
	  get: function getMapFileCommentRegex () {
	    // Matches sourceMappingURL in either // or /* comment styles.
	    return /(?:\/\/[@#][ \t]+?sourceMappingURL=([^\s'"`]+?)[ \t]*?$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*?(?:\*\/){1}[ \t]*?$)/mg;
	  }
	});

	var decodeBase64;
	if (typeof Buffer !== 'undefined') {
	  if (typeof Buffer.from === 'function') {
	    decodeBase64 = decodeBase64WithBufferFrom;
	  } else {
	    decodeBase64 = decodeBase64WithNewBuffer;
	  }
	} else {
	  decodeBase64 = decodeBase64WithAtob;
	}

	function decodeBase64WithBufferFrom(base64) {
	  return Buffer.from(base64, 'base64').toString();
	}

	function decodeBase64WithNewBuffer(base64) {
	  if (typeof value === 'number') {
	    throw new TypeError('The value to decode must not be of type number.');
	  }
	  return new Buffer(base64, 'base64').toString();
	}

	function decodeBase64WithAtob(base64) {
	  return decodeURIComponent(escape(atob(base64)));
	}

	function stripComment(sm) {
	  return sm.split(',').pop();
	}

	function readFromFileMap(sm, read) {
	  var r = exports.mapFileCommentRegex.exec(sm);
	  // for some odd reason //# .. captures in 1 and /* .. */ in 2
	  var filename = r[1] || r[2];

	  try {
	    var sm = read(filename);
	    if (sm != null && typeof sm.catch === 'function') {
	      return sm.catch(throwError);
	    } else {
	      return sm;
	    }
	  } catch (e) {
	    throwError(e);
	  }

	  function throwError(e) {
	    throw new Error('An error occurred while trying to read the map file at ' + filename + '\n' + e.stack);
	  }
	}

	function Converter (sm, opts) {
	  opts = opts || {};

	  if (opts.hasComment) {
	    sm = stripComment(sm);
	  }

	  if (opts.encoding === 'base64') {
	    sm = decodeBase64(sm);
	  } else if (opts.encoding === 'uri') {
	    sm = decodeURIComponent(sm);
	  }

	  if (opts.isJSON || opts.encoding) {
	    sm = JSON.parse(sm);
	  }

	  this.sourcemap = sm;
	}

	Converter.prototype.toJSON = function (space) {
	  return JSON.stringify(this.sourcemap, null, space);
	};

	if (typeof Buffer !== 'undefined') {
	  if (typeof Buffer.from === 'function') {
	    Converter.prototype.toBase64 = encodeBase64WithBufferFrom;
	  } else {
	    Converter.prototype.toBase64 = encodeBase64WithNewBuffer;
	  }
	} else {
	  Converter.prototype.toBase64 = encodeBase64WithBtoa;
	}

	function encodeBase64WithBufferFrom() {
	  var json = this.toJSON();
	  return Buffer.from(json, 'utf8').toString('base64');
	}

	function encodeBase64WithNewBuffer() {
	  var json = this.toJSON();
	  if (typeof json === 'number') {
	    throw new TypeError('The json to encode must not be of type number.');
	  }
	  return new Buffer(json, 'utf8').toString('base64');
	}

	function encodeBase64WithBtoa() {
	  var json = this.toJSON();
	  return btoa(unescape(encodeURIComponent(json)));
	}

	Converter.prototype.toURI = function () {
	  var json = this.toJSON();
	  return encodeURIComponent(json);
	};

	Converter.prototype.toComment = function (options) {
	  var encoding, content, data;
	  if (options != null && options.encoding === 'uri') {
	    encoding = '';
	    content = this.toURI();
	  } else {
	    encoding = ';base64';
	    content = this.toBase64();
	  }
	  data = 'sourceMappingURL=data:application/json;charset=utf-8' + encoding + ',' + content;
	  return options != null && options.multiline ? '/*# ' + data + ' */' : '//# ' + data;
	};

	// returns copy instead of original
	Converter.prototype.toObject = function () {
	  return JSON.parse(this.toJSON());
	};

	Converter.prototype.addProperty = function (key, value) {
	  if (this.sourcemap.hasOwnProperty(key)) throw new Error('property "' + key + '" already exists on the sourcemap, use set property instead');
	  return this.setProperty(key, value);
	};

	Converter.prototype.setProperty = function (key, value) {
	  this.sourcemap[key] = value;
	  return this;
	};

	Converter.prototype.getProperty = function (key) {
	  return this.sourcemap[key];
	};

	exports.fromObject = function (obj) {
	  return new Converter(obj);
	};

	exports.fromJSON = function (json) {
	  return new Converter(json, { isJSON: true });
	};

	exports.fromURI = function (uri) {
	  return new Converter(uri, { encoding: 'uri' });
	};

	exports.fromBase64 = function (base64) {
	  return new Converter(base64, { encoding: 'base64' });
	};

	exports.fromComment = function (comment) {
	  var m, encoding;
	  comment = comment
	    .replace(/^\/\*/g, '//')
	    .replace(/\*\/$/g, '');
	  m = exports.commentRegex.exec(comment);
	  encoding = m && m[4] || 'uri';
	  return new Converter(comment, { encoding: encoding, hasComment: true });
	};

	function makeConverter(sm) {
	  return new Converter(sm, { isJSON: true });
	}

	exports.fromMapFileComment = function (comment, read) {
	  if (typeof read === 'string') {
	    throw new Error(
	      'String directory paths are no longer supported with `fromMapFileComment`\n' +
	      'Please review the Upgrading documentation at https://github.com/thlorenz/convert-source-map#upgrading'
	    )
	  }

	  var sm = readFromFileMap(comment, read);
	  if (sm != null && typeof sm.then === 'function') {
	    return sm.then(makeConverter);
	  } else {
	    return makeConverter(sm);
	  }
	};

	// Finds last sourcemap comment in file or returns null if none was found
	exports.fromSource = function (content) {
	  var m = content.match(exports.commentRegex);
	  return m ? exports.fromComment(m.pop()) : null;
	};

	// Finds last sourcemap comment in file or returns null if none was found
	exports.fromMapFileSource = function (content, read) {
	  if (typeof read === 'string') {
	    throw new Error(
	      'String directory paths are no longer supported with `fromMapFileSource`\n' +
	      'Please review the Upgrading documentation at https://github.com/thlorenz/convert-source-map#upgrading'
	    )
	  }
	  var m = content.match(exports.mapFileCommentRegex);
	  return m ? exports.fromMapFileComment(m.pop(), read) : null;
	};

	exports.removeComments = function (src) {
	  return src.replace(exports.commentRegex, '');
	};

	exports.removeMapFileComments = function (src) {
	  return src.replace(exports.mapFileCommentRegex, '');
	};

	exports.generateMapFileComment = function (file, options) {
	  var data = 'sourceMappingURL=' + file;
	  return options && options.multiline ? '/*# ' + data + ' */' : '//# ' + data;
	}; 
} (convertSourceMap$1));

var convertSourceMap = /*@__PURE__*/getDefaultExportFromCjs(convertSourceMap$1);

/*!
 * etag
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 * @public
 */

var etag_1 = etag;

/**
 * Module dependencies.
 * @private
 */

var crypto$1 = require$$0$1;
var Stats = require$$1$2.Stats;

/**
 * Module variables.
 * @private
 */

var toString$1 = Object.prototype.toString;

/**
 * Generate an entity tag.
 *
 * @param {Buffer|string} entity
 * @return {string}
 * @private
 */

function entitytag (entity) {
  if (entity.length === 0) {
    // fast-path empty
    return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"'
  }

  // compute hash of entity
  var hash = crypto$1
    .createHash('sha1')
    .update(entity, 'utf8')
    .digest('base64')
    .substring(0, 27);

  // compute length of entity
  var len = typeof entity === 'string'
    ? Buffer.byteLength(entity, 'utf8')
    : entity.length;

  return '"' + len.toString(16) + '-' + hash + '"'
}

/**
 * Create a simple ETag.
 *
 * @param {string|Buffer|Stats} entity
 * @param {object} [options]
 * @param {boolean} [options.weak]
 * @return {String}
 * @public
 */

function etag (entity, options) {
  if (entity == null) {
    throw new TypeError('argument entity is required')
  }

  // support fs.Stats object
  var isStats = isstats(entity);
  var weak = options && typeof options.weak === 'boolean'
    ? options.weak
    : isStats;

  // validate argument
  if (!isStats && typeof entity !== 'string' && !Buffer.isBuffer(entity)) {
    throw new TypeError('argument entity must be string, Buffer, or fs.Stats')
  }

  // generate entity tag
  var tag = isStats
    ? stattag(entity)
    : entitytag(entity);

  return weak
    ? 'W/' + tag
    : tag
}

/**
 * Determine if object is a Stats object.
 *
 * @param {object} obj
 * @return {boolean}
 * @api private
 */

function isstats (obj) {
  // genuine fs.Stats
  if (typeof Stats === 'function' && obj instanceof Stats) {
    return true
  }

  // quack quack
  return obj && typeof obj === 'object' &&
    'ctime' in obj && toString$1.call(obj.ctime) === '[object Date]' &&
    'mtime' in obj && toString$1.call(obj.mtime) === '[object Date]' &&
    'ino' in obj && typeof obj.ino === 'number' &&
    'size' in obj && typeof obj.size === 'number'
}

/**
 * Generate a tag for a stat.
 *
 * @param {object} stat
 * @return {string}
 * @private
 */

function stattag (stat) {
  var mtime = stat.mtime.getTime().toString(16);
  var size = stat.size.toString(16);

  return '"' + size + '-' + mtime + '"'
}

var getEtag = /*@__PURE__*/getDefaultExportFromCjs(etag_1);

class BitSet {
	constructor(arg) {
		this.bits = arg instanceof BitSet ? arg.bits.slice() : [];
	}

	add(n) {
		this.bits[n >> 5] |= 1 << (n & 31);
	}

	has(n) {
		return !!(this.bits[n >> 5] & (1 << (n & 31)));
	}
}

class Chunk {
	constructor(start, end, content) {
		this.start = start;
		this.end = end;
		this.original = content;

		this.intro = '';
		this.outro = '';

		this.content = content;
		this.storeName = false;
		this.edited = false;

		{
			this.previous = null;
			this.next = null;
		}
	}

	appendLeft(content) {
		this.outro += content;
	}

	appendRight(content) {
		this.intro = this.intro + content;
	}

	clone() {
		const chunk = new Chunk(this.start, this.end, this.original);

		chunk.intro = this.intro;
		chunk.outro = this.outro;
		chunk.content = this.content;
		chunk.storeName = this.storeName;
		chunk.edited = this.edited;

		return chunk;
	}

	contains(index) {
		return this.start < index && index < this.end;
	}

	eachNext(fn) {
		let chunk = this;
		while (chunk) {
			fn(chunk);
			chunk = chunk.next;
		}
	}

	eachPrevious(fn) {
		let chunk = this;
		while (chunk) {
			fn(chunk);
			chunk = chunk.previous;
		}
	}

	edit(content, storeName, contentOnly) {
		this.content = content;
		if (!contentOnly) {
			this.intro = '';
			this.outro = '';
		}
		this.storeName = storeName;

		this.edited = true;

		return this;
	}

	prependLeft(content) {
		this.outro = content + this.outro;
	}

	prependRight(content) {
		this.intro = content + this.intro;
	}

	reset() {
		this.intro = '';
		this.outro = '';
		if (this.edited) {
			this.content = this.original;
			this.storeName = false;
			this.edited = false;
		}
	}

	split(index) {
		const sliceIndex = index - this.start;

		const originalBefore = this.original.slice(0, sliceIndex);
		const originalAfter = this.original.slice(sliceIndex);

		this.original = originalBefore;

		const newChunk = new Chunk(index, this.end, originalAfter);
		newChunk.outro = this.outro;
		this.outro = '';

		this.end = index;

		if (this.edited) {
			// after split we should save the edit content record into the correct chunk
			// to make sure sourcemap correct
			// For example:
			// '  test'.trim()
			//     split   -> '  ' + 'test'
			//   ✔️ edit    -> '' + 'test'
			//   ✖️ edit    -> 'test' + ''
			// TODO is this block necessary?...
			newChunk.edit('', false);
			this.content = '';
		} else {
			this.content = originalBefore;
		}

		newChunk.next = this.next;
		if (newChunk.next) newChunk.next.previous = newChunk;
		newChunk.previous = this;
		this.next = newChunk;

		return newChunk;
	}

	toString() {
		return this.intro + this.content + this.outro;
	}

	trimEnd(rx) {
		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) return true;

		const trimmed = this.content.replace(rx, '');

		if (trimmed.length) {
			if (trimmed !== this.content) {
				this.split(this.start + trimmed.length).edit('', undefined, true);
				if (this.edited) {
					// save the change, if it has been edited
					this.edit(trimmed, this.storeName, true);
				}
			}
			return true;
		} else {
			this.edit('', undefined, true);

			this.intro = this.intro.replace(rx, '');
			if (this.intro.length) return true;
		}
	}

	trimStart(rx) {
		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) return true;

		const trimmed = this.content.replace(rx, '');

		if (trimmed.length) {
			if (trimmed !== this.content) {
				const newChunk = this.split(this.end - trimmed.length);
				if (this.edited) {
					// save the change, if it has been edited
					newChunk.edit(trimmed, this.storeName, true);
				}
				this.edit('', undefined, true);
			}
			return true;
		} else {
			this.edit('', undefined, true);

			this.outro = this.outro.replace(rx, '');
			if (this.outro.length) return true;
		}
	}
}

function getBtoa() {
	if (typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function') {
		return (str) => globalThis.btoa(unescape(encodeURIComponent(str)));
	} else if (typeof Buffer === 'function') {
		return (str) => Buffer.from(str, 'utf-8').toString('base64');
	} else {
		return () => {
			throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
		};
	}
}

const btoa$1 = /*#__PURE__*/ getBtoa();

class SourceMap {
	constructor(properties) {
		this.version = 3;
		this.file = properties.file;
		this.sources = properties.sources;
		this.sourcesContent = properties.sourcesContent;
		this.names = properties.names;
		this.mappings = encode(properties.mappings);
		if (typeof properties.x_google_ignoreList !== 'undefined') {
			this.x_google_ignoreList = properties.x_google_ignoreList;
		}
		if (typeof properties.debugId !== 'undefined') {
			this.debugId = properties.debugId;
		}
	}

	toString() {
		return JSON.stringify(this);
	}

	toUrl() {
		return 'data:application/json;charset=utf-8;base64,' + btoa$1(this.toString());
	}
}

function guessIndent(code) {
	const lines = code.split('\n');

	const tabbed = lines.filter((line) => /^\t+/.test(line));
	const spaced = lines.filter((line) => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const numSpaces = /^ +/.exec(current)[0].length;
		return Math.min(numSpaces, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}

function getRelativePath(from, to) {
	const fromParts = from.split(/[/\\]/);
	const toParts = to.split(/[/\\]/);

	fromParts.pop(); // get dirname

	while (fromParts[0] === toParts[0]) {
		fromParts.shift();
		toParts.shift();
	}

	if (fromParts.length) {
		let i = fromParts.length;
		while (i--) fromParts[i] = '..';
	}

	return fromParts.concat(toParts).join('/');
}

const toString = Object.prototype.toString;

function isObject(thing) {
	return toString.call(thing) === '[object Object]';
}

function getLocator(source) {
	const originalLines = source.split('\n');
	const lineOffsets = [];

	for (let i = 0, pos = 0; i < originalLines.length; i++) {
		lineOffsets.push(pos);
		pos += originalLines[i].length + 1;
	}

	return function locate(index) {
		let i = 0;
		let j = lineOffsets.length;
		while (i < j) {
			const m = (i + j) >> 1;
			if (index < lineOffsets[m]) {
				j = m;
			} else {
				i = m + 1;
			}
		}
		const line = i - 1;
		const column = index - lineOffsets[line];
		return { line, column };
	};
}

const wordRegex = /\w/;

class Mappings {
	constructor(hires) {
		this.hires = hires;
		this.generatedCodeLine = 0;
		this.generatedCodeColumn = 0;
		this.raw = [];
		this.rawSegments = this.raw[this.generatedCodeLine] = [];
		this.pending = null;
	}

	addEdit(sourceIndex, content, loc, nameIndex) {
		if (content.length) {
			const contentLengthMinusOne = content.length - 1;
			let contentLineEnd = content.indexOf('\n', 0);
			let previousContentLineEnd = -1;
			// Loop through each line in the content and add a segment, but stop if the last line is empty,
			// else code afterwards would fill one line too many
			while (contentLineEnd >= 0 && contentLengthMinusOne > contentLineEnd) {
				const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
				if (nameIndex >= 0) {
					segment.push(nameIndex);
				}
				this.rawSegments.push(segment);

				this.generatedCodeLine += 1;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
				this.generatedCodeColumn = 0;

				previousContentLineEnd = contentLineEnd;
				contentLineEnd = content.indexOf('\n', contentLineEnd + 1);
			}

			const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
			if (nameIndex >= 0) {
				segment.push(nameIndex);
			}
			this.rawSegments.push(segment);

			this.advance(content.slice(previousContentLineEnd + 1));
		} else if (this.pending) {
			this.rawSegments.push(this.pending);
			this.advance(content);
		}

		this.pending = null;
	}

	addUneditedChunk(sourceIndex, chunk, original, loc, sourcemapLocations) {
		let originalCharIndex = chunk.start;
		let first = true;
		// when iterating each char, check if it's in a word boundary
		let charInHiresBoundary = false;

		while (originalCharIndex < chunk.end) {
			if (original[originalCharIndex] === '\n') {
				loc.line += 1;
				loc.column = 0;
				this.generatedCodeLine += 1;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
				this.generatedCodeColumn = 0;
				first = true;
				charInHiresBoundary = false;
			} else {
				if (this.hires || first || sourcemapLocations.has(originalCharIndex)) {
					const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];

					if (this.hires === 'boundary') {
						// in hires "boundary", group segments per word boundary than per char
						if (wordRegex.test(original[originalCharIndex])) {
							// for first char in the boundary found, start the boundary by pushing a segment
							if (!charInHiresBoundary) {
								this.rawSegments.push(segment);
								charInHiresBoundary = true;
							}
						} else {
							// for non-word char, end the boundary by pushing a segment
							this.rawSegments.push(segment);
							charInHiresBoundary = false;
						}
					} else {
						this.rawSegments.push(segment);
					}
				}

				loc.column += 1;
				this.generatedCodeColumn += 1;
				first = false;
			}

			originalCharIndex += 1;
		}

		this.pending = null;
	}

	advance(str) {
		if (!str) return;

		const lines = str.split('\n');

		if (lines.length > 1) {
			for (let i = 0; i < lines.length - 1; i++) {
				this.generatedCodeLine++;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
			}
			this.generatedCodeColumn = 0;
		}

		this.generatedCodeColumn += lines[lines.length - 1].length;
	}
}

const n = '\n';

const warned = {
	insertLeft: false,
	insertRight: false,
	storeName: false,
};

class MagicString {
	constructor(string, options = {}) {
		const chunk = new Chunk(0, string.length, string);

		Object.defineProperties(this, {
			original: { writable: true, value: string },
			outro: { writable: true, value: '' },
			intro: { writable: true, value: '' },
			firstChunk: { writable: true, value: chunk },
			lastChunk: { writable: true, value: chunk },
			lastSearchedChunk: { writable: true, value: chunk },
			byStart: { writable: true, value: {} },
			byEnd: { writable: true, value: {} },
			filename: { writable: true, value: options.filename },
			indentExclusionRanges: { writable: true, value: options.indentExclusionRanges },
			sourcemapLocations: { writable: true, value: new BitSet() },
			storedNames: { writable: true, value: {} },
			indentStr: { writable: true, value: undefined },
			ignoreList: { writable: true, value: options.ignoreList },
			offset: { writable: true, value: options.offset || 0 },
		});

		this.byStart[0] = chunk;
		this.byEnd[string.length] = chunk;
	}

	addSourcemapLocation(char) {
		this.sourcemapLocations.add(char);
	}

	append(content) {
		if (typeof content !== 'string') throw new TypeError('outro content must be a string');

		this.outro += content;
		return this;
	}

	appendLeft(index, content) {
		index = index + this.offset;

		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byEnd[index];

		if (chunk) {
			chunk.appendLeft(content);
		} else {
			this.intro += content;
		}
		return this;
	}

	appendRight(index, content) {
		index = index + this.offset;

		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byStart[index];

		if (chunk) {
			chunk.appendRight(content);
		} else {
			this.outro += content;
		}
		return this;
	}

	clone() {
		const cloned = new MagicString(this.original, { filename: this.filename, offset: this.offset });

		let originalChunk = this.firstChunk;
		let clonedChunk = (cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone());

		while (originalChunk) {
			cloned.byStart[clonedChunk.start] = clonedChunk;
			cloned.byEnd[clonedChunk.end] = clonedChunk;

			const nextOriginalChunk = originalChunk.next;
			const nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();

			if (nextClonedChunk) {
				clonedChunk.next = nextClonedChunk;
				nextClonedChunk.previous = clonedChunk;

				clonedChunk = nextClonedChunk;
			}

			originalChunk = nextOriginalChunk;
		}

		cloned.lastChunk = clonedChunk;

		if (this.indentExclusionRanges) {
			cloned.indentExclusionRanges = this.indentExclusionRanges.slice();
		}

		cloned.sourcemapLocations = new BitSet(this.sourcemapLocations);

		cloned.intro = this.intro;
		cloned.outro = this.outro;

		return cloned;
	}

	generateDecodedMap(options) {
		options = options || {};

		const sourceIndex = 0;
		const names = Object.keys(this.storedNames);
		const mappings = new Mappings(options.hires);

		const locate = getLocator(this.original);

		if (this.intro) {
			mappings.advance(this.intro);
		}

		this.firstChunk.eachNext((chunk) => {
			const loc = locate(chunk.start);

			if (chunk.intro.length) mappings.advance(chunk.intro);

			if (chunk.edited) {
				mappings.addEdit(
					sourceIndex,
					chunk.content,
					loc,
					chunk.storeName ? names.indexOf(chunk.original) : -1,
				);
			} else {
				mappings.addUneditedChunk(sourceIndex, chunk, this.original, loc, this.sourcemapLocations);
			}

			if (chunk.outro.length) mappings.advance(chunk.outro);
		});

		return {
			file: options.file ? options.file.split(/[/\\]/).pop() : undefined,
			sources: [
				options.source ? getRelativePath(options.file || '', options.source) : options.file || '',
			],
			sourcesContent: options.includeContent ? [this.original] : undefined,
			names,
			mappings: mappings.raw,
			x_google_ignoreList: this.ignoreList ? [sourceIndex] : undefined,
		};
	}

	generateMap(options) {
		return new SourceMap(this.generateDecodedMap(options));
	}

	_ensureindentStr() {
		if (this.indentStr === undefined) {
			this.indentStr = guessIndent(this.original);
		}
	}

	_getRawIndentString() {
		this._ensureindentStr();
		return this.indentStr;
	}

	getIndentString() {
		this._ensureindentStr();
		return this.indentStr === null ? '\t' : this.indentStr;
	}

	indent(indentStr, options) {
		const pattern = /^[^\r\n]/gm;

		if (isObject(indentStr)) {
			options = indentStr;
			indentStr = undefined;
		}

		if (indentStr === undefined) {
			this._ensureindentStr();
			indentStr = this.indentStr || '\t';
		}

		if (indentStr === '') return this; // noop

		options = options || {};

		// Process exclusion ranges
		const isExcluded = {};

		if (options.exclude) {
			const exclusions =
				typeof options.exclude[0] === 'number' ? [options.exclude] : options.exclude;
			exclusions.forEach((exclusion) => {
				for (let i = exclusion[0]; i < exclusion[1]; i += 1) {
					isExcluded[i] = true;
				}
			});
		}

		let shouldIndentNextCharacter = options.indentStart !== false;
		const replacer = (match) => {
			if (shouldIndentNextCharacter) return `${indentStr}${match}`;
			shouldIndentNextCharacter = true;
			return match;
		};

		this.intro = this.intro.replace(pattern, replacer);

		let charIndex = 0;
		let chunk = this.firstChunk;

		while (chunk) {
			const end = chunk.end;

			if (chunk.edited) {
				if (!isExcluded[charIndex]) {
					chunk.content = chunk.content.replace(pattern, replacer);

					if (chunk.content.length) {
						shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === '\n';
					}
				}
			} else {
				charIndex = chunk.start;

				while (charIndex < end) {
					if (!isExcluded[charIndex]) {
						const char = this.original[charIndex];

						if (char === '\n') {
							shouldIndentNextCharacter = true;
						} else if (char !== '\r' && shouldIndentNextCharacter) {
							shouldIndentNextCharacter = false;

							if (charIndex === chunk.start) {
								chunk.prependRight(indentStr);
							} else {
								this._splitChunk(chunk, charIndex);
								chunk = chunk.next;
								chunk.prependRight(indentStr);
							}
						}
					}

					charIndex += 1;
				}
			}

			charIndex = chunk.end;
			chunk = chunk.next;
		}

		this.outro = this.outro.replace(pattern, replacer);

		return this;
	}

	insert() {
		throw new Error(
			'magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)',
		);
	}

	insertLeft(index, content) {
		if (!warned.insertLeft) {
			console.warn(
				'magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead',
			);
			warned.insertLeft = true;
		}

		return this.appendLeft(index, content);
	}

	insertRight(index, content) {
		if (!warned.insertRight) {
			console.warn(
				'magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead',
			);
			warned.insertRight = true;
		}

		return this.prependRight(index, content);
	}

	move(start, end, index) {
		start = start + this.offset;
		end = end + this.offset;
		index = index + this.offset;

		if (index >= start && index <= end) throw new Error('Cannot move a selection inside itself');

		this._split(start);
		this._split(end);
		this._split(index);

		const first = this.byStart[start];
		const last = this.byEnd[end];

		const oldLeft = first.previous;
		const oldRight = last.next;

		const newRight = this.byStart[index];
		if (!newRight && last === this.lastChunk) return this;
		const newLeft = newRight ? newRight.previous : this.lastChunk;

		if (oldLeft) oldLeft.next = oldRight;
		if (oldRight) oldRight.previous = oldLeft;

		if (newLeft) newLeft.next = first;
		if (newRight) newRight.previous = last;

		if (!first.previous) this.firstChunk = last.next;
		if (!last.next) {
			this.lastChunk = first.previous;
			this.lastChunk.next = null;
		}

		first.previous = newLeft;
		last.next = newRight || null;

		if (!newLeft) this.firstChunk = first;
		if (!newRight) this.lastChunk = last;
		return this;
	}

	overwrite(start, end, content, options) {
		options = options || {};
		return this.update(start, end, content, { ...options, overwrite: !options.contentOnly });
	}

	update(start, end, content, options) {
		start = start + this.offset;
		end = end + this.offset;

		if (typeof content !== 'string') throw new TypeError('replacement content must be a string');

		if (this.original.length !== 0) {
			while (start < 0) start += this.original.length;
			while (end < 0) end += this.original.length;
		}

		if (end > this.original.length) throw new Error('end is out of bounds');
		if (start === end)
			throw new Error(
				'Cannot overwrite a zero-length range – use appendLeft or prependRight instead',
			);

		this._split(start);
		this._split(end);

		if (options === true) {
			if (!warned.storeName) {
				console.warn(
					'The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string',
				);
				warned.storeName = true;
			}

			options = { storeName: true };
		}
		const storeName = options !== undefined ? options.storeName : false;
		const overwrite = options !== undefined ? options.overwrite : false;

		if (storeName) {
			const original = this.original.slice(start, end);
			Object.defineProperty(this.storedNames, original, {
				writable: true,
				value: true,
				enumerable: true,
			});
		}

		const first = this.byStart[start];
		const last = this.byEnd[end];

		if (first) {
			let chunk = first;
			while (chunk !== last) {
				if (chunk.next !== this.byStart[chunk.end]) {
					throw new Error('Cannot overwrite across a split point');
				}
				chunk = chunk.next;
				chunk.edit('', false);
			}

			first.edit(content, storeName, !overwrite);
		} else {
			// must be inserting at the end
			const newChunk = new Chunk(start, end, '').edit(content, storeName);

			// TODO last chunk in the array may not be the last chunk, if it's moved...
			last.next = newChunk;
			newChunk.previous = last;
		}
		return this;
	}

	prepend(content) {
		if (typeof content !== 'string') throw new TypeError('outro content must be a string');

		this.intro = content + this.intro;
		return this;
	}

	prependLeft(index, content) {
		index = index + this.offset;

		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byEnd[index];

		if (chunk) {
			chunk.prependLeft(content);
		} else {
			this.intro = content + this.intro;
		}
		return this;
	}

	prependRight(index, content) {
		index = index + this.offset;

		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byStart[index];

		if (chunk) {
			chunk.prependRight(content);
		} else {
			this.outro = content + this.outro;
		}
		return this;
	}

	remove(start, end) {
		start = start + this.offset;
		end = end + this.offset;

		if (this.original.length !== 0) {
			while (start < 0) start += this.original.length;
			while (end < 0) end += this.original.length;
		}

		if (start === end) return this;

		if (start < 0 || end > this.original.length) throw new Error('Character is out of bounds');
		if (start > end) throw new Error('end must be greater than start');

		this._split(start);
		this._split(end);

		let chunk = this.byStart[start];

		while (chunk) {
			chunk.intro = '';
			chunk.outro = '';
			chunk.edit('');

			chunk = end > chunk.end ? this.byStart[chunk.end] : null;
		}
		return this;
	}

	reset(start, end) {
		start = start + this.offset;
		end = end + this.offset;

		if (this.original.length !== 0) {
			while (start < 0) start += this.original.length;
			while (end < 0) end += this.original.length;
		}

		if (start === end) return this;

		if (start < 0 || end > this.original.length) throw new Error('Character is out of bounds');
		if (start > end) throw new Error('end must be greater than start');

		this._split(start);
		this._split(end);

		let chunk = this.byStart[start];

		while (chunk) {
			chunk.reset();

			chunk = end > chunk.end ? this.byStart[chunk.end] : null;
		}
		return this;
	}

	lastChar() {
		if (this.outro.length) return this.outro[this.outro.length - 1];
		let chunk = this.lastChunk;
		do {
			if (chunk.outro.length) return chunk.outro[chunk.outro.length - 1];
			if (chunk.content.length) return chunk.content[chunk.content.length - 1];
			if (chunk.intro.length) return chunk.intro[chunk.intro.length - 1];
		} while ((chunk = chunk.previous));
		if (this.intro.length) return this.intro[this.intro.length - 1];
		return '';
	}

	lastLine() {
		let lineIndex = this.outro.lastIndexOf(n);
		if (lineIndex !== -1) return this.outro.substr(lineIndex + 1);
		let lineStr = this.outro;
		let chunk = this.lastChunk;
		do {
			if (chunk.outro.length > 0) {
				lineIndex = chunk.outro.lastIndexOf(n);
				if (lineIndex !== -1) return chunk.outro.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.outro + lineStr;
			}

			if (chunk.content.length > 0) {
				lineIndex = chunk.content.lastIndexOf(n);
				if (lineIndex !== -1) return chunk.content.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.content + lineStr;
			}

			if (chunk.intro.length > 0) {
				lineIndex = chunk.intro.lastIndexOf(n);
				if (lineIndex !== -1) return chunk.intro.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.intro + lineStr;
			}
		} while ((chunk = chunk.previous));
		lineIndex = this.intro.lastIndexOf(n);
		if (lineIndex !== -1) return this.intro.substr(lineIndex + 1) + lineStr;
		return this.intro + lineStr;
	}

	slice(start = 0, end = this.original.length - this.offset) {
		start = start + this.offset;
		end = end + this.offset;

		if (this.original.length !== 0) {
			while (start < 0) start += this.original.length;
			while (end < 0) end += this.original.length;
		}

		let result = '';

		// find start chunk
		let chunk = this.firstChunk;
		while (chunk && (chunk.start > start || chunk.end <= start)) {
			// found end chunk before start
			if (chunk.start < end && chunk.end >= end) {
				return result;
			}

			chunk = chunk.next;
		}

		if (chunk && chunk.edited && chunk.start !== start)
			throw new Error(`Cannot use replaced character ${start} as slice start anchor.`);

		const startChunk = chunk;
		while (chunk) {
			if (chunk.intro && (startChunk !== chunk || chunk.start === start)) {
				result += chunk.intro;
			}

			const containsEnd = chunk.start < end && chunk.end >= end;
			if (containsEnd && chunk.edited && chunk.end !== end)
				throw new Error(`Cannot use replaced character ${end} as slice end anchor.`);

			const sliceStart = startChunk === chunk ? start - chunk.start : 0;
			const sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;

			result += chunk.content.slice(sliceStart, sliceEnd);

			if (chunk.outro && (!containsEnd || chunk.end === end)) {
				result += chunk.outro;
			}

			if (containsEnd) {
				break;
			}

			chunk = chunk.next;
		}

		return result;
	}

	// TODO deprecate this? not really very useful
	snip(start, end) {
		const clone = this.clone();
		clone.remove(0, start);
		clone.remove(end, clone.original.length);

		return clone;
	}

	_split(index) {
		if (this.byStart[index] || this.byEnd[index]) return;

		let chunk = this.lastSearchedChunk;
		const searchForward = index > chunk.end;

		while (chunk) {
			if (chunk.contains(index)) return this._splitChunk(chunk, index);

			chunk = searchForward ? this.byStart[chunk.end] : this.byEnd[chunk.start];
		}
	}

	_splitChunk(chunk, index) {
		if (chunk.edited && chunk.content.length) {
			// zero-length edited chunks are a special case (overlapping replacements)
			const loc = getLocator(this.original)(index);
			throw new Error(
				`Cannot split a chunk that has already been edited (${loc.line}:${loc.column} – "${chunk.original}")`,
			);
		}

		const newChunk = chunk.split(index);

		this.byEnd[index] = chunk;
		this.byStart[index] = newChunk;
		this.byEnd[newChunk.end] = newChunk;

		if (chunk === this.lastChunk) this.lastChunk = newChunk;

		this.lastSearchedChunk = chunk;
		return true;
	}

	toString() {
		let str = this.intro;

		let chunk = this.firstChunk;
		while (chunk) {
			str += chunk.toString();
			chunk = chunk.next;
		}

		return str + this.outro;
	}

	isEmpty() {
		let chunk = this.firstChunk;
		do {
			if (
				(chunk.intro.length && chunk.intro.trim()) ||
				(chunk.content.length && chunk.content.trim()) ||
				(chunk.outro.length && chunk.outro.trim())
			)
				return false;
		} while ((chunk = chunk.next));
		return true;
	}

	length() {
		let chunk = this.firstChunk;
		let length = 0;
		do {
			length += chunk.intro.length + chunk.content.length + chunk.outro.length;
		} while ((chunk = chunk.next));
		return length;
	}

	trimLines() {
		return this.trim('[\\r\\n]');
	}

	trim(charType) {
		return this.trimStart(charType).trimEnd(charType);
	}

	trimEndAborted(charType) {
		const rx = new RegExp((charType || '\\s') + '+$');

		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) return true;

		let chunk = this.lastChunk;

		do {
			const end = chunk.end;
			const aborted = chunk.trimEnd(rx);

			// if chunk was trimmed, we have a new lastChunk
			if (chunk.end !== end) {
				if (this.lastChunk === chunk) {
					this.lastChunk = chunk.next;
				}

				this.byEnd[chunk.end] = chunk;
				this.byStart[chunk.next.start] = chunk.next;
				this.byEnd[chunk.next.end] = chunk.next;
			}

			if (aborted) return true;
			chunk = chunk.previous;
		} while (chunk);

		return false;
	}

	trimEnd(charType) {
		this.trimEndAborted(charType);
		return this;
	}
	trimStartAborted(charType) {
		const rx = new RegExp('^' + (charType || '\\s') + '+');

		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) return true;

		let chunk = this.firstChunk;

		do {
			const end = chunk.end;
			const aborted = chunk.trimStart(rx);

			if (chunk.end !== end) {
				// special case...
				if (chunk === this.lastChunk) this.lastChunk = chunk.next;

				this.byEnd[chunk.end] = chunk;
				this.byStart[chunk.next.start] = chunk.next;
				this.byEnd[chunk.next.end] = chunk.next;
			}

			if (aborted) return true;
			chunk = chunk.next;
		} while (chunk);

		return false;
	}

	trimStart(charType) {
		this.trimStartAborted(charType);
		return this;
	}

	hasChanged() {
		return this.original !== this.toString();
	}

	_replaceRegexp(searchValue, replacement) {
		function getReplacement(match, str) {
			if (typeof replacement === 'string') {
				return replacement.replace(/\$(\$|&|\d+)/g, (_, i) => {
					// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter
					if (i === '$') return '$';
					if (i === '&') return match[0];
					const num = +i;
					if (num < match.length) return match[+i];
					return `$${i}`;
				});
			} else {
				return replacement(...match, match.index, str, match.groups);
			}
		}
		function matchAll(re, str) {
			let match;
			const matches = [];
			while ((match = re.exec(str))) {
				matches.push(match);
			}
			return matches;
		}
		if (searchValue.global) {
			const matches = matchAll(searchValue, this.original);
			matches.forEach((match) => {
				if (match.index != null) {
					const replacement = getReplacement(match, this.original);
					if (replacement !== match[0]) {
						this.overwrite(match.index, match.index + match[0].length, replacement);
					}
				}
			});
		} else {
			const match = this.original.match(searchValue);
			if (match && match.index != null) {
				const replacement = getReplacement(match, this.original);
				if (replacement !== match[0]) {
					this.overwrite(match.index, match.index + match[0].length, replacement);
				}
			}
		}
		return this;
	}

	_replaceString(string, replacement) {
		const { original } = this;
		const index = original.indexOf(string);

		if (index !== -1) {
			this.overwrite(index, index + string.length, replacement);
		}

		return this;
	}

	replace(searchValue, replacement) {
		if (typeof searchValue === 'string') {
			return this._replaceString(searchValue, replacement);
		}

		return this._replaceRegexp(searchValue, replacement);
	}

	_replaceAllString(string, replacement) {
		const { original } = this;
		const stringLength = string.length;
		for (
			let index = original.indexOf(string);
			index !== -1;
			index = original.indexOf(string, index + stringLength)
		) {
			const previous = original.slice(index, index + stringLength);
			if (previous !== replacement) this.overwrite(index, index + stringLength, replacement);
		}

		return this;
	}

	replaceAll(searchValue, replacement) {
		if (typeof searchValue === 'string') {
			return this._replaceAllString(searchValue, replacement);
		}

		if (!searchValue.global) {
			throw new TypeError(
				'MagicString.prototype.replaceAll called with a non-global RegExp argument',
			);
		}

		return this._replaceRegexp(searchValue, replacement);
	}
}

const debug$2 = createDebugger("vite:sourcemap", {
  onlyWhenFocused: true
});
function genSourceMapUrl(map) {
  if (typeof map !== "string") {
    map = JSON.stringify(map);
  }
  return `data:application/json;base64,${Buffer.from(map).toString("base64")}`;
}
function getCodeWithSourcemap(type, code, map) {
  if (debug$2) {
    code += `
/*${JSON.stringify(map, null, 2).replace(/\*\//g, "*\\/")}*/
`;
  }
  if (type === "js") {
    code += `
//# sourceMappingURL=${genSourceMapUrl(map)}`;
  } else if (type === "css") {
    code += `
/*# sourceMappingURL=${genSourceMapUrl(map)} */`;
  }
  return code;
}

const debug$1 = createDebugger("vite:send", {
  onlyWhenFocused: true
});
const alias = {
  js: "text/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json"
};
function send(req, res, content, type, options) {
  const {
    etag = getEtag(content, { weak: true }),
    cacheControl = "no-cache",
    headers,
    map
  } = options;
  if (res.writableEnded) {
    return;
  }
  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }
  res.setHeader("Content-Type", alias[type] || type);
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Etag", etag);
  if (headers) {
    for (const name in headers) {
      res.setHeader(name, headers[name]);
    }
  }
  if (map && "version" in map && map.mappings) {
    if (type === "js" || type === "css") {
      content = getCodeWithSourcemap(type, content.toString(), map);
    }
  } else if (type === "js" && (!map || map.mappings !== "")) {
    const code = content.toString();
    if (convertSourceMap.mapFileCommentRegex.test(code)) {
      debug$1?.(`Skipped injecting fallback sourcemap for ${req.url}`);
    } else {
      const urlWithoutTimestamp = removeTimestampQuery(req.url);
      const ms = new MagicString(code);
      content = getCodeWithSourcemap(
        type,
        code,
        ms.generateMap({
          source: path$1.basename(urlWithoutTimestamp),
          hires: "boundary",
          includeContent: true
        })
      );
    }
  }
  res.statusCode = 200;
  res.end(content);
  return;
}

const LogLevels = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3
};
let lastType;
let lastMsg;
let sameCount = 0;
function clearScreen() {
  const repeatCount = process.stdout.rows - 2;
  const blank = repeatCount > 0 ? "\n".repeat(repeatCount) : "";
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}
let timeFormatter;
function getTimeFormatter() {
  timeFormatter ??= new Intl.DateTimeFormat(void 0, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  });
  return timeFormatter;
}
function createLogger(level = "info", options = {}) {
  if (options.customLogger) {
    return options.customLogger;
  }
  const loggedErrors = /* @__PURE__ */ new WeakSet();
  const {
    prefix = "[vite]",
    allowClearScreen = true,
    console: console2 = globalThis.console
  } = options;
  const thresh = LogLevels[level];
  const canClearScreen = allowClearScreen && process.stdout.isTTY && !process.env.CI;
  const clear = canClearScreen ? clearScreen : () => {
  };
  function format(type, msg, options2 = {}) {
    if (options2.timestamp) {
      let tag = "";
      if (type === "info") {
        tag = colors.cyan(colors.bold(prefix));
      } else if (type === "warn") {
        tag = colors.yellow(colors.bold(prefix));
      } else {
        tag = colors.red(colors.bold(prefix));
      }
      const environment = options2.environment ? options2.environment + " " : "";
      return `${colors.dim(getTimeFormatter().format(/* @__PURE__ */ new Date()))} ${tag} ${environment}${msg}`;
    } else {
      return msg;
    }
  }
  function output(type, msg, options2 = {}) {
    if (thresh >= LogLevels[type]) {
      const method = type === "info" ? "log" : type;
      if (options2.error) {
        loggedErrors.add(options2.error);
      }
      if (canClearScreen) {
        if (type === lastType && msg === lastMsg) {
          sameCount++;
          clear();
          console2[method](
            format(type, msg, options2),
            colors.yellow(`(x${sameCount + 1})`)
          );
        } else {
          sameCount = 0;
          lastMsg = msg;
          lastType = type;
          if (options2.clear) {
            clear();
          }
          console2[method](format(type, msg, options2));
        }
      } else {
        console2[method](format(type, msg, options2));
      }
    }
  }
  const warnedMessages = /* @__PURE__ */ new Set();
  const logger = {
    hasWarned: false,
    info(msg, opts) {
      output("info", msg, opts);
    },
    warn(msg, opts) {
      logger.hasWarned = true;
      output("warn", msg, opts);
    },
    warnOnce(msg, opts) {
      if (warnedMessages.has(msg)) return;
      logger.hasWarned = true;
      output("warn", msg, opts);
      warnedMessages.add(msg);
    },
    error(msg, opts) {
      logger.hasWarned = true;
      output("error", msg, opts);
    },
    clearScreen(type) {
      if (thresh >= LogLevels[type]) {
        clear();
      }
    },
    hasErrorLogged(error) {
      return loggedErrors.has(error);
    }
  };
  return logger;
}

const ROOT_FILES = [
  // '.git',
  // https://pnpm.io/workspaces/
  "pnpm-workspace.yaml",
  // https://rushjs.io/pages/advanced/config_files/
  // 'rush.json',
  // https://nx.dev/latest/react/getting-started/nx-setup
  // 'workspace.json',
  // 'nx.json',
  // https://github.com/lerna/lerna#lernajson
  "lerna.json"
];
function hasWorkspacePackageJSON(root) {
  const path = path$1.join(root, "package.json");
  if (!isFileReadable(path)) {
    return false;
  }
  try {
    const content = JSON.parse(fs$1.readFileSync(path, "utf-8")) || {};
    return !!content.workspaces;
  } catch {
    return false;
  }
}
function hasRootFile(root) {
  return ROOT_FILES.some((file) => fs$1.existsSync(path$1.join(root, file)));
}
function hasPackageJSON(root) {
  const path = path$1.join(root, "package.json");
  return fs$1.existsSync(path);
}
function searchForPackageRoot(current, root = current) {
  if (hasPackageJSON(current)) return current;
  const dir = path$1.dirname(current);
  if (!dir || dir === current) return root;
  return searchForPackageRoot(dir, root);
}
function searchForWorkspaceRoot(current, root = searchForPackageRoot(current)) {
  if (hasRootFile(current)) return current;
  if (hasWorkspacePackageJSON(current)) return current;
  const dir = path$1.dirname(current);
  if (!dir || dir === current) return root;
  return searchForWorkspaceRoot(dir, root);
}

function isFileServingAllowed(configOrUrl, urlOrServer) {
  const config = typeof urlOrServer === "string" ? configOrUrl : urlOrServer.config;
  const url = typeof urlOrServer === "string" ? urlOrServer : configOrUrl;
  if (!config.server.fs.strict) return true;
  const filePath = fsPathFromUrl(url);
  return isFileLoadingAllowed(config, filePath);
}
function isUriInFilePath(uri, filePath) {
  return isSameFileUri(uri, filePath) || isParentDirectory(uri, filePath);
}
function isFileLoadingAllowed(config, filePath) {
  const { fs } = config.server;
  if (!fs.strict) return true;
  if (config.fsDenyGlob(filePath)) return false;
  if (config.safeModulePaths.has(filePath)) return true;
  if (fs.allow.some((uri) => isUriInFilePath(uri, filePath))) return true;
  return false;
}

var main = {exports: {}};

var version$1 = "16.5.0";
var require$$4 = {
	version: version$1};

const fs = require$$1$2;
const path = require$$1$1;
const os = require$$2;
const crypto = require$$0$1;
const packageJson = require$$4;

const version = packageJson.version;

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;

// Parse src into an Object
function parse (src) {
  const obj = {};

  // Convert buffer to string
  let lines = src.toString();

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/mg, '\n');

  let match;
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1];

    // Default undefined or null to empty string
    let value = (match[2] || '');

    // Remove whitespace
    value = value.trim();

    // Check if double quoted
    const maybeQuote = value[0];

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n');
      value = value.replace(/\\r/g, '\r');
    }

    // Add to object
    obj[key] = value;
  }

  return obj
}

function _parseVault (options) {
  const vaultPath = _vaultPath(options);

  // Parse .env.vault
  const result = DotenvModule.configDotenv({ path: vaultPath });
  if (!result.parsed) {
    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
    err.code = 'MISSING_DATA';
    throw err
  }

  // handle scenario for comma separated keys - for use with key rotation
  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
  const keys = _dotenvKey(options).split(',');
  const length = keys.length;

  let decrypted;
  for (let i = 0; i < length; i++) {
    try {
      // Get full key
      const key = keys[i].trim();

      // Get instructions for decrypt
      const attrs = _instructions(result, key);

      // Decrypt
      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);

      break
    } catch (error) {
      // last key
      if (i + 1 >= length) {
        throw error
      }
      // try next key
    }
  }

  // Parse decrypted .env string
  return DotenvModule.parse(decrypted)
}

function _warn (message) {
  console.log(`[dotenv@${version}][WARN] ${message}`);
}

function _debug (message) {
  console.log(`[dotenv@${version}][DEBUG] ${message}`);
}

function _dotenvKey (options) {
  // prioritize developer directly setting options.DOTENV_KEY
  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
    return options.DOTENV_KEY
  }

  // secondary infra already contains a DOTENV_KEY environment variable
  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
    return process.env.DOTENV_KEY
  }

  // fallback to empty string
  return ''
}

function _instructions (result, dotenvKey) {
  // Parse DOTENV_KEY. Format is a URI
  let uri;
  try {
    uri = new URL(dotenvKey);
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development');
      err.code = 'INVALID_DOTENV_KEY';
      throw err
    }

    throw error
  }

  // Get decrypt key
  const key = uri.password;
  if (!key) {
    const err = new Error('INVALID_DOTENV_KEY: Missing key part');
    err.code = 'INVALID_DOTENV_KEY';
    throw err
  }

  // Get environment
  const environment = uri.searchParams.get('environment');
  if (!environment) {
    const err = new Error('INVALID_DOTENV_KEY: Missing environment part');
    err.code = 'INVALID_DOTENV_KEY';
    throw err
  }

  // Get ciphertext payload
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
  const ciphertext = result.parsed[environmentKey]; // DOTENV_VAULT_PRODUCTION
  if (!ciphertext) {
    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT';
    throw err
  }

  return { ciphertext, key }
}

function _vaultPath (options) {
  let possibleVaultPath = null;

  if (options && options.path && options.path.length > 0) {
    if (Array.isArray(options.path)) {
      for (const filepath of options.path) {
        if (fs.existsSync(filepath)) {
          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`;
        }
      }
    } else {
      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`;
    }
  } else {
    possibleVaultPath = path.resolve(process.cwd(), '.env.vault');
  }

  if (fs.existsSync(possibleVaultPath)) {
    return possibleVaultPath
  }

  return null
}

function _resolveHome (envPath) {
  return envPath[0] === '~' ? path.join(os.homedir(), envPath.slice(1)) : envPath
}

function _configVault (options) {
  const debug = Boolean(options && options.debug);
  if (debug) {
    _debug('Loading env from encrypted .env.vault');
  }

  const parsed = DotenvModule._parseVault(options);

  let processEnv = process.env;
  if (options && options.processEnv != null) {
    processEnv = options.processEnv;
  }

  DotenvModule.populate(processEnv, parsed, options);

  return { parsed }
}

function configDotenv (options) {
  const dotenvPath = path.resolve(process.cwd(), '.env');
  let encoding = 'utf8';
  const debug = Boolean(options && options.debug);

  if (options && options.encoding) {
    encoding = options.encoding;
  } else {
    if (debug) {
      _debug('No encoding is specified. UTF-8 is used by default');
    }
  }

  let optionPaths = [dotenvPath]; // default, look for .env
  if (options && options.path) {
    if (!Array.isArray(options.path)) {
      optionPaths = [_resolveHome(options.path)];
    } else {
      optionPaths = []; // reset default
      for (const filepath of options.path) {
        optionPaths.push(_resolveHome(filepath));
      }
    }
  }

  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final
  // parsed data, we will combine it with process.env (or options.processEnv if provided).
  let lastError;
  const parsedAll = {};
  for (const path of optionPaths) {
    try {
      // Specifying an encoding returns a string instead of a buffer
      const parsed = DotenvModule.parse(fs.readFileSync(path, { encoding }));

      DotenvModule.populate(parsedAll, parsed, options);
    } catch (e) {
      if (debug) {
        _debug(`Failed to load ${path} ${e.message}`);
      }
      lastError = e;
    }
  }

  let processEnv = process.env;
  if (options && options.processEnv != null) {
    processEnv = options.processEnv;
  }

  DotenvModule.populate(processEnv, parsedAll, options);

  if (lastError) {
    return { parsed: parsedAll, error: lastError }
  } else {
    return { parsed: parsedAll }
  }
}

// Populates process.env from .env file
function config (options) {
  // fallback to original dotenv if DOTENV_KEY is not set
  if (_dotenvKey(options).length === 0) {
    return DotenvModule.configDotenv(options)
  }

  const vaultPath = _vaultPath(options);

  // dotenvKey exists but .env.vault file does not exist
  if (!vaultPath) {
    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);

    return DotenvModule.configDotenv(options)
  }

  return DotenvModule._configVault(options)
}

function decrypt (encrypted, keyStr) {
  const key = Buffer.from(keyStr.slice(-64), 'hex');
  let ciphertext = Buffer.from(encrypted, 'base64');

  const nonce = ciphertext.subarray(0, 12);
  const authTag = ciphertext.subarray(-16);
  ciphertext = ciphertext.subarray(12, -16);

  try {
    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    aesgcm.setAuthTag(authTag);
    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
  } catch (error) {
    const isRange = error instanceof RangeError;
    const invalidKeyLength = error.message === 'Invalid key length';
    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data';

    if (isRange || invalidKeyLength) {
      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)');
      err.code = 'INVALID_DOTENV_KEY';
      throw err
    } else if (decryptionFailed) {
      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY');
      err.code = 'DECRYPTION_FAILED';
      throw err
    } else {
      throw error
    }
  }
}

// Populate process.env with parsed values
function populate (processEnv, parsed, options = {}) {
  const debug = Boolean(options && options.debug);
  const override = Boolean(options && options.override);

  if (typeof parsed !== 'object') {
    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate');
    err.code = 'OBJECT_REQUIRED';
    throw err
  }

  // Set process.env
  for (const key of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      if (override === true) {
        processEnv[key] = parsed[key];
      }

      if (debug) {
        if (override === true) {
          _debug(`"${key}" is already defined and WAS overwritten`);
        } else {
          _debug(`"${key}" is already defined and was NOT overwritten`);
        }
      }
    } else {
      processEnv[key] = parsed[key];
    }
  }
}

const DotenvModule = {
  configDotenv,
  _configVault,
  _parseVault,
  config,
  decrypt,
  parse,
  populate
};

main.exports.configDotenv = DotenvModule.configDotenv;
main.exports._configVault = DotenvModule._configVault;
main.exports._parseVault = DotenvModule._parseVault;
main.exports.config = DotenvModule.config;
main.exports.decrypt = DotenvModule.decrypt;
var parse_1 = main.exports.parse = DotenvModule.parse;
main.exports.populate = DotenvModule.populate;

main.exports = DotenvModule;

function _resolveEscapeSequences (value) {
  return value.replace(/\\\$/g, '$')
}

function expandValue (value, processEnv, runningParsed) {
  const env = { ...runningParsed, ...processEnv }; // process.env wins

  const regex = /(?<!\\)\${([^{}]+)}|(?<!\\)\$([A-Za-z_][A-Za-z0-9_]*)/g;

  let result = value;
  let match;
  const seen = new Set(); // self-referential checker

  while ((match = regex.exec(result)) !== null) {
    seen.add(result);

    const [template, bracedExpression, unbracedExpression] = match;
    const expression = bracedExpression || unbracedExpression;

    // match the operators `:+`, `+`, `:-`, and `-`
    const opRegex = /(:\+|\+|:-|-)/;
    // find first match
    const opMatch = expression.match(opRegex);
    const splitter = opMatch ? opMatch[0] : null;

    const r = expression.split(splitter);

    let defaultValue;
    let value;

    const key = r.shift();

    if ([':+', '+'].includes(splitter)) {
      defaultValue = env[key] ? r.join(splitter) : '';
      value = null;
    } else {
      defaultValue = r.join(splitter);
      value = env[key];
    }

    if (value) {
      // self-referential check
      if (seen.has(value)) {
        result = result.replace(template, defaultValue);
      } else {
        result = result.replace(template, value);
      }
    } else {
      result = result.replace(template, defaultValue);
    }

    // if the result equaled what was in process.env and runningParsed then stop expanding
    if (result === runningParsed[key]) {
      break
    }

    regex.lastIndex = 0; // reset regex search position to re-evaluate after each replacement
  }

  return result
}

function expand (options) {
  // for use with progressive expansion
  // const runningParsed = {}

  let processEnv = process.env;
  if (options && options.processEnv != null) {
    processEnv = options.processEnv;
  }

  // dotenv.config() ran before this so the assumption is process.env has already been set
  for (const key in options.parsed) {
    let value = options.parsed[key];

    // short-circuit scenario: process.env was already set prior to the file value
    if (processEnv[key] && processEnv[key] !== value) {
      value = processEnv[key];
    } else {
      // PATCH: we pass options.parsed instead of runningParsed
      //        to allow variables declared in other files to be used
      value = expandValue(value, processEnv, options.parsed);
    }

    options.parsed[key] = _resolveEscapeSequences(value);

    // for use with progressive expansion
    // runningParsed[key] = _resolveEscapeSequences(value)
  }

  for (const processKey in options.parsed) {
    processEnv[processKey] = options.parsed[processKey];
  }

  return options
}

var expand_1 = expand;

const debug = createDebugger("vite:env");
function getEnvFilesForMode(mode, envDir) {
  if (envDir !== false) {
    return [
      /** default file */
      `.env`,
      /** local file */
      `.env.local`,
      /** mode file */
      `.env.${mode}`,
      /** mode local file */
      `.env.${mode}.local`
    ].map((file) => normalizePath(path$1.join(envDir, file)));
  }
  return [];
}
function loadEnv(mode, envDir, prefixes = "VITE_") {
  const start = performance.now();
  const getTime = () => `${(performance.now() - start).toFixed(2)}ms`;
  if (mode === "local") {
    throw new Error(
      `"local" cannot be used as a mode name because it conflicts with the .local postfix for .env files.`
    );
  }
  prefixes = arraify(prefixes);
  const env = {};
  const envFiles = getEnvFilesForMode(mode, envDir);
  debug?.(`loading env files: %O`, envFiles);
  const parsed = Object.fromEntries(
    envFiles.flatMap((filePath) => {
      if (!tryStatSync(filePath)?.isFile()) return [];
      return Object.entries(parse_1(fs$1.readFileSync(filePath)));
    })
  );
  debug?.(`env files loaded in ${getTime()}`);
  if (parsed.NODE_ENV && process.env.VITE_USER_NODE_ENV === void 0) {
    process.env.VITE_USER_NODE_ENV = parsed.NODE_ENV;
  }
  if (parsed.BROWSER && process.env.BROWSER === void 0) {
    process.env.BROWSER = parsed.BROWSER;
  }
  if (parsed.BROWSER_ARGS && process.env.BROWSER_ARGS === void 0) {
    process.env.BROWSER_ARGS = parsed.BROWSER_ARGS;
  }
  const processEnv = { ...process.env };
  expand_1({ parsed, processEnv });
  for (const [key, value] of Object.entries(parsed)) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      env[key] = value;
    }
  }
  for (const key in process.env) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      env[key] = process.env[key];
    }
  }
  debug?.(`using resolved env: %O`, env);
  return env;
}
function resolveEnvPrefix({
  envPrefix = "VITE_"
}) {
  envPrefix = arraify(envPrefix);
  if (envPrefix.includes("")) {
    throw new Error(
      `envPrefix option contains value '', which could lead unexpected exposure of sensitive information.`
    );
  }
  return envPrefix;
}

exports.esbuildVersion = esbuild.version;
exports.createFilter = createFilter;
exports.createLogger = createLogger;
exports.defaultAllowedOrigins = defaultAllowedOrigins;
exports.defaultClientConditions = DEFAULT_CLIENT_CONDITIONS;
exports.defaultClientMainFields = DEFAULT_CLIENT_MAIN_FIELDS;
exports.defaultServerConditions = DEFAULT_SERVER_CONDITIONS;
exports.defaultServerMainFields = DEFAULT_SERVER_MAIN_FIELDS;
exports.isCSSRequest = isCSSRequest;
exports.isFileLoadingAllowed = isFileLoadingAllowed;
exports.isFileServingAllowed = isFileServingAllowed;
exports.loadEnv = loadEnv;
exports.mergeAlias = mergeAlias;
exports.mergeConfig = mergeConfig;
exports.normalizePath = normalizePath;
exports.perEnvironmentPlugin = perEnvironmentPlugin;
exports.perEnvironmentState = perEnvironmentState;
exports.resolveEnvPrefix = resolveEnvPrefix;
exports.rollupVersion = rollupVersion;
exports.searchForWorkspaceRoot = searchForWorkspaceRoot;
exports.send = send;
exports.splitVendorChunk = splitVendorChunk;
exports.splitVendorChunkPlugin = splitVendorChunkPlugin;
exports.version = VERSION;
