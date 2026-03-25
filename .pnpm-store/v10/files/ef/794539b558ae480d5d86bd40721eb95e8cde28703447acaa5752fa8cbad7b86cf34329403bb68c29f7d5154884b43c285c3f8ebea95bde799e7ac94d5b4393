"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = getLogger;
exports.makeDebug = makeDebug;
exports.setLogger = setLogger;
exports.clearLoggers = clearLoggers;
const debug_1 = __importDefault(require("debug"));
const OCLIF_NS = 'oclif';
function makeLogger(namespace = OCLIF_NS) {
    const debug = (0, debug_1.default)(namespace);
    return {
        child: (ns, delimiter) => makeLogger(`${namespace}${delimiter ?? ':'}${ns}`),
        debug,
        error: (formatter, ...args) => makeLogger(`${namespace}:error`).debug(formatter, ...args),
        info: debug,
        namespace,
        trace: debug,
        warn: debug,
    };
}
/**
 * Cache of logger instances. This is used to prevent creating multiple logger instances for the same namespace.
 *
 * The root logger is stored under the 'root' key as well as it's namespace.
 */
const cachedLoggers = new Map();
/**
 * Returns a logger instance for the given namespace.
 * If a namespace is provided, a child logger is returned.
 * If no namespace is provided, the root logger is returned.
 */
function getLogger(namespace) {
    let rootLogger = cachedLoggers.get('root');
    if (!rootLogger) {
        set(makeLogger(OCLIF_NS));
    }
    rootLogger = cachedLoggers.get('root');
    if (namespace) {
        const cachedLogger = cachedLoggers.get(namespace);
        if (cachedLogger)
            return cachedLogger;
        const logger = rootLogger.child(namespace);
        cachedLoggers.set(namespace, logger);
        return logger;
    }
    return rootLogger;
}
function ensureItMatchesInterface(newLogger) {
    return (typeof newLogger.child === 'function' &&
        typeof newLogger.debug === 'function' &&
        typeof newLogger.error === 'function' &&
        typeof newLogger.info === 'function' &&
        typeof newLogger.trace === 'function' &&
        typeof newLogger.warn === 'function' &&
        typeof newLogger.namespace === 'string');
}
function set(newLogger) {
    if (cachedLoggers.has(newLogger.namespace))
        return;
    if (cachedLoggers.has('root'))
        return;
    if (ensureItMatchesInterface(newLogger)) {
        cachedLoggers.set(newLogger.namespace, newLogger);
        cachedLoggers.set('root', newLogger);
    }
    else {
        process.emitWarning('Logger does not match the Logger interface. Using default logger.');
    }
}
/**
 * Convenience function to create a debug function for a specific namespace
 */
function makeDebug(namespace) {
    return (formatter, ...args) => getLogger(namespace).debug(formatter, ...args);
}
function setLogger(loadOptions) {
    if (loadOptions && typeof loadOptions !== 'string' && 'logger' in loadOptions && loadOptions.logger) {
        set(loadOptions.logger);
    }
    else {
        set(makeLogger(OCLIF_NS));
    }
}
function clearLoggers() {
    cachedLoggers.clear();
}
