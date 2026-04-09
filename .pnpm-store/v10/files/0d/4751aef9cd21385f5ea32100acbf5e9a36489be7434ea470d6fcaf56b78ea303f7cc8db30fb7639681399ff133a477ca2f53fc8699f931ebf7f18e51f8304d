/* Logging utilities. The things in this file are named to work nicely when you import as a namespace. */
import { List } from 'utilium';
import { join } from '../vfs/path.js';
import { ErrnoError } from './error.js';
export var Level;
(function (Level) {
    /** Emergency */
    Level[Level["EMERG"] = 0] = "EMERG";
    /** Alert */
    Level[Level["ALERT"] = 1] = "ALERT";
    /** Critical */
    Level[Level["CRIT"] = 2] = "CRIT";
    /** Error */
    Level[Level["ERR"] = 3] = "ERR";
    /** Warning */
    Level[Level["WARN"] = 4] = "WARN";
    /** Notice */
    Level[Level["NOTICE"] = 5] = "NOTICE";
    /** Informational */
    Level[Level["INFO"] = 6] = "INFO";
    /** Debug */
    Level[Level["DEBUG"] = 7] = "DEBUG";
})(Level || (Level = {}));
/** An object mapping log levels to a textual representation of them */
export const levels = {
    [Level.EMERG]: 'emergency',
    [Level.ALERT]: 'alert',
    [Level.CRIT]: 'critical',
    [Level.ERR]: 'error',
    [Level.WARN]: 'warning',
    [Level.NOTICE]: 'notice',
    [Level.INFO]: 'info',
    [Level.DEBUG]: 'debug',
};
export function levelOf(value) {
    return Object.values(levels).indexOf(value);
}
/** The list of log entries */
export const entries = new List();
export function log(level, message) {
    if (!isEnabled)
        return;
    const entry = {
        level,
        message,
        timestamp: new Date(),
        elapsedMs: performance.now(),
    };
    entries.add(entry);
    output(entry);
}
function _messageString(msg, options) {
    var _a, _b;
    if (!(msg instanceof ErrnoError))
        return msg.toString();
    const beforePath = msg.code + ': ' + msg.message;
    if (!msg.path)
        return beforePath;
    const mountPoint = typeof options.fs == 'string' ? options.fs : ((_b = (_a = options.fs) === null || _a === void 0 ? void 0 : _a._mountPoint) !== null && _b !== void 0 ? _b : '<unknown>');
    return beforePath + ': ' + join(mountPoint, msg.path);
}
function _shortcut(level) {
    return function (message, options = {}) {
        log(level, _messageString(message, options));
        return message;
    };
}
// Shortcuts
/** Shortcut for logging emergencies */
export const emerg = _shortcut(Level.EMERG);
/** Shortcut for logging alerts */
export const alert = _shortcut(Level.ALERT);
/** Shortcut for logging critical errors */
export const crit = _shortcut(Level.CRIT);
/** Shortcut for logging non-critical errors */
export const err = _shortcut(Level.ERR);
/** Shortcut for logging warnings */
export const warn = _shortcut(Level.WARN);
/** Shortcut for logging notices */
export const notice = _shortcut(Level.NOTICE);
/** Shortcut for logging informational messages */
export const info = _shortcut(Level.INFO);
/** Shortcut for logging debug messages */
export const debug = _shortcut(Level.DEBUG);
/**
 * Shortcut for logging usage of deprecated functions at runtime
 * @param symbol The thing that is deprecated
 * @internal @hidden
 */
export function log_deprecated(symbol) {
    log(Level.WARN, symbol + ' is deprecated and should not be used.');
}
// Formatting and output
/**
 * @internal @hidden
 */
function ansi(text, format) {
    return `\x1b[${format}m${text}\x1b[0m`;
}
function _prettyMs(entry, style) {
    const text = '[' + (entry.elapsedMs / 1000).toFixed(3).padStart(10) + '] ';
    switch (style) {
        case 'ansi':
            return ansi(text, '2;37');
        case 'css':
            return ['%c' + text, 'opacity: 0.8; color: white;'];
        default:
            return text;
    }
}
const _ansiLevelColor = {
    [Level.EMERG]: '1;4;37;41',
    [Level.ALERT]: '1;37;41',
    [Level.CRIT]: '1;35',
    [Level.ERR]: '1;31',
    [Level.WARN]: '1;33',
    [Level.NOTICE]: '1;36',
    [Level.INFO]: '1;37',
    [Level.DEBUG]: '0;2;37',
};
const _ansiMessageColor = {
    [Level.EMERG]: '1;31',
    [Level.ALERT]: '1;31',
    [Level.CRIT]: '1;31',
    [Level.ERR]: '31',
    [Level.WARN]: '33',
    [Level.NOTICE]: '1;37',
    [Level.INFO]: '37',
    [Level.DEBUG]: '2;37',
};
const _cssLevelColor = {
    [Level.EMERG]: 'font-weight: bold; text-decoration: underline; color: white; background-color: red;',
    [Level.ALERT]: 'font-weight: bold; color: white; background-color: red;',
    [Level.CRIT]: 'font-weight: bold; color: magenta;',
    [Level.ERR]: 'font-weight: bold; color: red;',
    [Level.WARN]: 'font-weight: bold; color: yellow;',
    [Level.NOTICE]: 'font-weight: bold; color: cyan;',
    [Level.INFO]: 'font-weight: bold; color: white;',
    [Level.DEBUG]: 'opacity: 0.8; color: white;',
};
const _cssMessageColor = {
    [Level.EMERG]: 'font-weight: bold; color: red;',
    [Level.ALERT]: 'font-weight: bold; color: red;',
    [Level.CRIT]: 'font-weight: bold; color: red;',
    [Level.ERR]: 'color: red;',
    [Level.WARN]: 'color: yellow;',
    [Level.NOTICE]: 'font-weight: bold; color: white;',
    [Level.INFO]: 'color: white;',
    [Level.DEBUG]: 'opacity: 0.8; color: white;',
};
/**
 * Various format functions included to make using the logger easier.
 * These are not the only formats you can use.
 */
export const formats = {
    /** Format with a timestamp and the level, colorized with ANSI escape codes */
    ansi_level(entry) {
        const levelText = ansi(levels[entry.level].toUpperCase(), _ansiLevelColor[entry.level]);
        return [_prettyMs(entry, 'ansi'), levelText, entry.message];
    },
    /**
     * Format with a timestamp and colorize the message with ANSI escape codes.
     * For EMERG and ALERT, the levels are included
     */
    ansi_message(entry) {
        let msg = _prettyMs(entry, 'ansi');
        const isImportant = entry.level < Level.CRIT;
        if (isImportant)
            msg += ansi(levels[entry.level].toUpperCase(), _ansiLevelColor[entry.level]) + ': ';
        msg += ansi(entry.message, _ansiMessageColor[entry.level]);
        return msg;
    },
    css_level(entry) {
        const levelLabel = levels[entry.level].toUpperCase();
        return [..._prettyMs(entry, 'css'), '%c' + levelLabel, _cssLevelColor[entry.level], entry.message];
    },
    css_message(entry) {
        const text = _prettyMs(entry, 'css');
        const isImportant = entry.level < Level.CRIT;
        if (isImportant) {
            const levelLabel = levels[entry.level].toUpperCase();
            text.push('%c' + levelLabel, _cssLevelColor[entry.level]);
        }
        text.push('%c' + entry.message, _cssMessageColor[entry.level]);
        return text;
    },
    default(entry) {
        return [_prettyMs(entry), entry.message];
    },
};
let _format = formats.default;
export function format(entry) {
    const formatted = _format(entry);
    return Array.isArray(formatted) ? formatted : [formatted];
}
let _output = console.error;
function output(entry) {
    if (entry.level > minLevel)
        return;
    _output(...format(entry));
}
let minLevel = Level.ALERT;
// Configuration
/** Whether log entries are being recorded */
export let isEnabled = true;
/** Configure logging behavior */
export function configure(options) {
    var _a, _b, _c, _d;
    _format = (_a = options.format) !== null && _a !== void 0 ? _a : _format;
    _output = (_b = options.output) !== null && _b !== void 0 ? _b : _output;
    minLevel = typeof options.level == 'string' ? levelOf(options.level) : ((_c = options.level) !== null && _c !== void 0 ? _c : minLevel);
    isEnabled = (_d = options.enabled) !== null && _d !== void 0 ? _d : isEnabled;
    if (!options.dumpBacklog)
        return;
    for (const entry of entries) {
        output(entry);
    }
}
