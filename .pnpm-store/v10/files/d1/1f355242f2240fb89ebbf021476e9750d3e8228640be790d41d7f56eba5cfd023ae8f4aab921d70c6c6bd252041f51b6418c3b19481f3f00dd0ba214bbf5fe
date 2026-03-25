"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genRedactedString = exports.getStringValue = exports.MAX_ARGUMENT_LENGTH = void 0;
const debug_1 = require("debug");
const MAX_ARGUMENT_LENGTH = 200;
exports.MAX_ARGUMENT_LENGTH = MAX_ARGUMENT_LENGTH;
const NAMESPACE_PREFIX = "ioredis";
/**
 * helper function that tried to get a string value for
 * arbitrary "debug" arg
 */
function getStringValue(v) {
    if (v === null) {
        return;
    }
    switch (typeof v) {
        case "boolean":
            return;
        case "number":
            return;
        case "object":
            if (Buffer.isBuffer(v)) {
                return v.toString("hex");
            }
            if (Array.isArray(v)) {
                return v.join(",");
            }
            try {
                return JSON.stringify(v);
            }
            catch (e) {
                return;
            }
        case "string":
            return v;
    }
}
exports.getStringValue = getStringValue;
/**
 * helper function that redacts a string representation of a "debug" arg
 */
function genRedactedString(str, maxLen) {
    const { length } = str;
    return length <= maxLen
        ? str
        : str.slice(0, maxLen) + ' ... <REDACTED full-length="' + length + '">';
}
exports.genRedactedString = genRedactedString;
/**
 * a wrapper for the `debug` module, used to generate
 * "debug functions" that trim the values in their output
 */
function genDebugFunction(namespace) {
    const fn = (0, debug_1.default)(`${NAMESPACE_PREFIX}:${namespace}`);
    function wrappedDebug(...args) {
        if (!fn.enabled) {
            return; // no-op
        }
        // we skip the first arg because that is the message
        for (let i = 1; i < args.length; i++) {
            const str = getStringValue(args[i]);
            if (typeof str === "string" && str.length > MAX_ARGUMENT_LENGTH) {
                args[i] = genRedactedString(str, MAX_ARGUMENT_LENGTH);
            }
        }
        return fn.apply(null, args);
    }
    Object.defineProperties(wrappedDebug, {
        namespace: {
            get() {
                return fn.namespace;
            },
        },
        enabled: {
            get() {
                return fn.enabled;
            },
        },
        destroy: {
            get() {
                return fn.destroy;
            },
        },
        log: {
            get() {
                return fn.log;
            },
            set(l) {
                fn.log = l;
            },
        },
    });
    return wrappedDebug;
}
exports.default = genDebugFunction;
