"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWebWorker = exports.isReactNative = exports.isNodeRuntime = exports.isNodeLike = exports.isNode = exports.isDeno = exports.isBun = exports.isBrowser = exports.objectHasProperty = exports.isObjectWithProperties = exports.isDefined = exports.getErrorMessage = exports.delay = exports.createAbortablePromise = exports.cancelablePromiseRace = void 0;
exports.calculateRetryDelay = calculateRetryDelay;
exports.computeSha256Hash = computeSha256Hash;
exports.computeSha256Hmac = computeSha256Hmac;
exports.getRandomIntegerInclusive = getRandomIntegerInclusive;
exports.isError = isError;
exports.isObject = isObject;
exports.randomUUID = randomUUID;
exports.uint8ArrayToString = uint8ArrayToString;
exports.stringToUint8Array = stringToUint8Array;
const tslib_1 = require("tslib");
const tspRuntime = tslib_1.__importStar(require("@typespec/ts-http-runtime/internal/util"));
var aborterUtils_js_1 = require("./aborterUtils.js");
Object.defineProperty(exports, "cancelablePromiseRace", { enumerable: true, get: function () { return aborterUtils_js_1.cancelablePromiseRace; } });
var createAbortablePromise_js_1 = require("./createAbortablePromise.js");
Object.defineProperty(exports, "createAbortablePromise", { enumerable: true, get: function () { return createAbortablePromise_js_1.createAbortablePromise; } });
var delay_js_1 = require("./delay.js");
Object.defineProperty(exports, "delay", { enumerable: true, get: function () { return delay_js_1.delay; } });
var error_js_1 = require("./error.js");
Object.defineProperty(exports, "getErrorMessage", { enumerable: true, get: function () { return error_js_1.getErrorMessage; } });
var typeGuards_js_1 = require("./typeGuards.js");
Object.defineProperty(exports, "isDefined", { enumerable: true, get: function () { return typeGuards_js_1.isDefined; } });
Object.defineProperty(exports, "isObjectWithProperties", { enumerable: true, get: function () { return typeGuards_js_1.isObjectWithProperties; } });
Object.defineProperty(exports, "objectHasProperty", { enumerable: true, get: function () { return typeGuards_js_1.objectHasProperty; } });
/**
 * Calculates the delay interval for retry attempts using exponential delay with jitter.
 *
 * @param retryAttempt - The current retry attempt number.
 *
 * @param config - The exponential retry configuration.
 *
 * @returns An object containing the calculated retry delay.
 */
function calculateRetryDelay(retryAttempt, config) {
    return tspRuntime.calculateRetryDelay(retryAttempt, config);
}
/**
 * Generates a SHA-256 hash.
 *
 * @param content - The data to be included in the hash.
 *
 * @param encoding - The textual encoding to use for the returned hash.
 */
function computeSha256Hash(content, encoding) {
    return tspRuntime.computeSha256Hash(content, encoding);
}
/**
 * Generates a SHA-256 HMAC signature.
 *
 * @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
 *
 * @param stringToSign - The data to be signed.
 *
 * @param encoding - The textual encoding to use for the returned HMAC digest.
 */
function computeSha256Hmac(key, stringToSign, encoding) {
    return tspRuntime.computeSha256Hmac(key, stringToSign, encoding);
}
/**
 * Returns a random integer value between a lower and upper bound, inclusive of both bounds. Note that this uses Math.random and isn't secure. If you need to use this for any kind of security purpose, find a better source of random.
 *
 * @param min - The smallest integer value allowed.
 *
 * @param max - The largest integer value allowed.
 */
function getRandomIntegerInclusive(min, max) {
    return tspRuntime.getRandomIntegerInclusive(min, max);
}
/**
 * Typeguard for an error object shape (has name and message)
 *
 * @param e - Something caught by a catch clause.
 */
function isError(e) {
    return tspRuntime.isError(e);
}
/**
 * Helper to determine when an input is a generic JS object.
 *
 * @returns true when input is an object type that is not null, Array, RegExp, or Date.
 */
function isObject(input) {
    return tspRuntime.isObject(input);
}
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
function randomUUID() {
    return tspRuntime.randomUUID();
}
/**
 * A constant that indicates whether the environment the code is running is a Web Browser.
 */
exports.isBrowser = tspRuntime.isBrowser;
/**
 * A constant that indicates whether the environment the code is running is Bun.sh.
 */
exports.isBun = tspRuntime.isBun;
/**
 * A constant that indicates whether the environment the code is running is Deno.
 */
exports.isDeno = tspRuntime.isDeno;
/**
 * A constant that indicates whether the environment the code is running is a Node.js compatible environment.
 *
 * @deprecated
 *
 * Use `isNodeLike` instead.
 */
exports.isNode = tspRuntime.isNodeLike;
/**
 * A constant that indicates whether the environment the code is running is a Node.js compatible environment.
 */
exports.isNodeLike = tspRuntime.isNodeLike;
/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
exports.isNodeRuntime = tspRuntime.isNodeRuntime;
/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 */
exports.isReactNative = tspRuntime.isReactNative;
/**
 * A constant that indicates whether the environment the code is running is a Web Worker.
 */
exports.isWebWorker = tspRuntime.isWebWorker;
/**
 * The helper that transforms bytes with specific character encoding into string
 * @param bytes - the uint8array bytes
 * @param format - the format we use to encode the byte
 * @returns a string of the encoded string
 */
function uint8ArrayToString(bytes, format) {
    return tspRuntime.uint8ArrayToString(bytes, format);
}
/**
 * The helper that transforms string to specific character encoded bytes array.
 * @param value - the string to be converted
 * @param format - the format we use to decode the value
 * @returns a uint8array
 */
function stringToUint8Array(value, format) {
    return tspRuntime.stringToUint8Array(value, format);
}
//# sourceMappingURL=index.js.map