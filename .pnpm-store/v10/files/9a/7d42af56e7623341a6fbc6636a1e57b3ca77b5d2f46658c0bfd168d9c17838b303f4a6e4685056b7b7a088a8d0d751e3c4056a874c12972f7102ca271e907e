"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noop = exports.defaults = exports.Debug = exports.zipMap = exports.CONNECTION_CLOSED_ERROR_MSG = exports.shuffle = exports.sample = exports.resolveTLSProfile = exports.parseURL = exports.optimizeErrorStack = exports.toArg = exports.convertMapToArray = exports.convertObjectToArray = exports.timeout = exports.packObject = exports.isInt = exports.wrapMultiResult = exports.convertBufferToString = void 0;
const url_1 = require("url");
const lodash_1 = require("./lodash");
Object.defineProperty(exports, "defaults", { enumerable: true, get: function () { return lodash_1.defaults; } });
Object.defineProperty(exports, "noop", { enumerable: true, get: function () { return lodash_1.noop; } });
const debug_1 = require("./debug");
exports.Debug = debug_1.default;
const TLSProfiles_1 = require("../constants/TLSProfiles");
/**
 * Convert a buffer to string, supports buffer array
 *
 * @example
 * ```js
 * const input = [Buffer.from('foo'), [Buffer.from('bar')]]
 * const res = convertBufferToString(input, 'utf8')
 * expect(res).to.eql(['foo', ['bar']])
 * ```
 */
function convertBufferToString(value, encoding) {
    if (value instanceof Buffer) {
        return value.toString(encoding);
    }
    if (Array.isArray(value)) {
        const length = value.length;
        const res = Array(length);
        for (let i = 0; i < length; ++i) {
            res[i] =
                value[i] instanceof Buffer && encoding === "utf8"
                    ? value[i].toString()
                    : convertBufferToString(value[i], encoding);
        }
        return res;
    }
    return value;
}
exports.convertBufferToString = convertBufferToString;
/**
 * Convert a list of results to node-style
 *
 * @example
 * ```js
 * const input = ['a', 'b', new Error('c'), 'd']
 * const output = exports.wrapMultiResult(input)
 * expect(output).to.eql([[null, 'a'], [null, 'b'], [new Error('c')], [null, 'd'])
 * ```
 */
function wrapMultiResult(arr) {
    // When using WATCH/EXEC transactions, the EXEC will return
    // a null instead of an array
    if (!arr) {
        return null;
    }
    const result = [];
    const length = arr.length;
    for (let i = 0; i < length; ++i) {
        const item = arr[i];
        if (item instanceof Error) {
            result.push([item]);
        }
        else {
            result.push([null, item]);
        }
    }
    return result;
}
exports.wrapMultiResult = wrapMultiResult;
/**
 * Detect if the argument is a int
 * @example
 * ```js
 * > isInt('123')
 * true
 * > isInt('123.3')
 * false
 * > isInt('1x')
 * false
 * > isInt(123)
 * true
 * > isInt(true)
 * false
 * ```
 */
function isInt(value) {
    const x = parseFloat(value);
    return !isNaN(value) && (x | 0) === x;
}
exports.isInt = isInt;
/**
 * Pack an array to an Object
 *
 * @example
 * ```js
 * > packObject(['a', 'b', 'c', 'd'])
 * { a: 'b', c: 'd' }
 * ```
 */
function packObject(array) {
    const result = {};
    const length = array.length;
    for (let i = 1; i < length; i += 2) {
        result[array[i - 1]] = array[i];
    }
    return result;
}
exports.packObject = packObject;
/**
 * Return a callback with timeout
 */
function timeout(callback, timeout) {
    let timer = null;
    const run = function () {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            callback.apply(this, arguments);
        }
    };
    timer = setTimeout(run, timeout, new Error("timeout"));
    return run;
}
exports.timeout = timeout;
/**
 * Convert an object to an array
 * @example
 * ```js
 * > convertObjectToArray({ a: '1' })
 * ['a', '1']
 * ```
 */
function convertObjectToArray(obj) {
    const result = [];
    const keys = Object.keys(obj); // Object.entries requires node 7+
    for (let i = 0, l = keys.length; i < l; i++) {
        result.push(keys[i], obj[keys[i]]);
    }
    return result;
}
exports.convertObjectToArray = convertObjectToArray;
/**
 * Convert a map to an array
 * @example
 * ```js
 * > convertMapToArray(new Map([[1, '2']]))
 * [1, '2']
 * ```
 */
function convertMapToArray(map) {
    const result = [];
    let pos = 0;
    map.forEach(function (value, key) {
        result[pos] = key;
        result[pos + 1] = value;
        pos += 2;
    });
    return result;
}
exports.convertMapToArray = convertMapToArray;
/**
 * Convert a non-string arg to a string
 */
function toArg(arg) {
    if (arg === null || typeof arg === "undefined") {
        return "";
    }
    return String(arg);
}
exports.toArg = toArg;
/**
 * Optimize error stack
 *
 * @param error actually error
 * @param friendlyStack the stack that more meaningful
 * @param filterPath only show stacks with the specified path
 */
function optimizeErrorStack(error, friendlyStack, filterPath) {
    const stacks = friendlyStack.split("\n");
    let lines = "";
    let i;
    for (i = 1; i < stacks.length; ++i) {
        if (stacks[i].indexOf(filterPath) === -1) {
            break;
        }
    }
    for (let j = i; j < stacks.length; ++j) {
        lines += "\n" + stacks[j];
    }
    if (error.stack) {
        const pos = error.stack.indexOf("\n");
        error.stack = error.stack.slice(0, pos) + lines;
    }
    return error;
}
exports.optimizeErrorStack = optimizeErrorStack;
/**
 * Parse the redis protocol url
 */
function parseURL(url) {
    if (isInt(url)) {
        return { port: url };
    }
    let parsed = (0, url_1.parse)(url, true, true);
    if (!parsed.slashes && url[0] !== "/") {
        url = "//" + url;
        parsed = (0, url_1.parse)(url, true, true);
    }
    const options = parsed.query || {};
    const result = {};
    if (parsed.auth) {
        const index = parsed.auth.indexOf(":");
        result.username = index === -1 ? parsed.auth : parsed.auth.slice(0, index);
        result.password = index === -1 ? "" : parsed.auth.slice(index + 1);
    }
    if (parsed.pathname) {
        if (parsed.protocol === "redis:" || parsed.protocol === "rediss:") {
            if (parsed.pathname.length > 1) {
                result.db = parsed.pathname.slice(1);
            }
        }
        else {
            result.path = parsed.pathname;
        }
    }
    if (parsed.host) {
        result.host = parsed.hostname;
    }
    if (parsed.port) {
        result.port = parsed.port;
    }
    if (typeof options.family === "string") {
        const intFamily = Number.parseInt(options.family, 10);
        if (!Number.isNaN(intFamily)) {
            result.family = intFamily;
        }
    }
    (0, lodash_1.defaults)(result, options);
    return result;
}
exports.parseURL = parseURL;
/**
 * Resolve TLS profile shortcut in connection options
 */
function resolveTLSProfile(options) {
    let tls = options === null || options === void 0 ? void 0 : options.tls;
    if (typeof tls === "string")
        tls = { profile: tls };
    const profile = TLSProfiles_1.default[tls === null || tls === void 0 ? void 0 : tls.profile];
    if (profile) {
        tls = Object.assign({}, profile, tls);
        delete tls.profile;
        options = Object.assign({}, options, { tls });
    }
    return options;
}
exports.resolveTLSProfile = resolveTLSProfile;
/**
 * Get a random element from `array`
 */
function sample(array, from = 0) {
    const length = array.length;
    if (from >= length) {
        return null;
    }
    return array[from + Math.floor(Math.random() * (length - from))];
}
exports.sample = sample;
/**
 * Shuffle the array using the Fisher-Yates Shuffle.
 * This method will mutate the original array.
 */
function shuffle(array) {
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        const index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        [array[counter], array[index]] = [array[index], array[counter]];
    }
    return array;
}
exports.shuffle = shuffle;
/**
 * Error message for connection being disconnected
 */
exports.CONNECTION_CLOSED_ERROR_MSG = "Connection is closed.";
function zipMap(keys, values) {
    const map = new Map();
    keys.forEach((key, index) => {
        map.set(key, values[index]);
    });
    return map;
}
exports.zipMap = zipMap;
