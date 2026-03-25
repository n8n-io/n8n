'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController = require('@azure/abort-controller');
var crypto = require('crypto');

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Creates an abortable promise.
 * @param buildPromise - A function that takes the resolve and reject functions as parameters.
 * @param options - The options for the abortable promise.
 * @returns A promise that can be aborted.
 */
function createAbortablePromise(buildPromise, options) {
    const { cleanupBeforeAbort, abortSignal, abortErrorMsg } = options !== null && options !== void 0 ? options : {};
    return new Promise((resolve, reject) => {
        function rejectOnAbort() {
            reject(new abortController.AbortError(abortErrorMsg !== null && abortErrorMsg !== void 0 ? abortErrorMsg : "The operation was aborted."));
        }
        function removeListeners() {
            abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.removeEventListener("abort", onAbort);
        }
        function onAbort() {
            cleanupBeforeAbort === null || cleanupBeforeAbort === void 0 ? void 0 : cleanupBeforeAbort();
            removeListeners();
            rejectOnAbort();
        }
        if (abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.aborted) {
            return rejectOnAbort();
        }
        try {
            buildPromise((x) => {
                removeListeners();
                resolve(x);
            }, (x) => {
                removeListeners();
                reject(x);
            });
        }
        catch (err) {
            reject(err);
        }
        abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.addEventListener("abort", onAbort);
    });
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const StandardAbortMessage = "The delay was aborted.";
/**
 * A wrapper for setTimeout that resolves a promise after timeInMs milliseconds.
 * @param timeInMs - The number of milliseconds to be delayed.
 * @param options - The options for delay - currently abort options
 * @returns Promise that is resolved after timeInMs
 */
function delay(timeInMs, options) {
    let token;
    const { abortSignal, abortErrorMsg } = options !== null && options !== void 0 ? options : {};
    return createAbortablePromise((resolve) => {
        token = setTimeout(resolve, timeInMs);
    }, {
        cleanupBeforeAbort: () => clearTimeout(token),
        abortSignal,
        abortErrorMsg: abortErrorMsg !== null && abortErrorMsg !== void 0 ? abortErrorMsg : StandardAbortMessage,
    });
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * promise.race() wrapper that aborts rest of promises as soon as the first promise settles.
 */
async function cancelablePromiseRace(abortablePromiseBuilders, options) {
    var _a, _b;
    const aborter = new AbortController();
    function abortHandler() {
        aborter.abort();
    }
    (_a = options === null || options === void 0 ? void 0 : options.abortSignal) === null || _a === void 0 ? void 0 : _a.addEventListener("abort", abortHandler);
    try {
        return await Promise.race(abortablePromiseBuilders.map((p) => p({ abortSignal: aborter.signal })));
    }
    finally {
        aborter.abort();
        (_b = options === null || options === void 0 ? void 0 : options.abortSignal) === null || _b === void 0 ? void 0 : _b.removeEventListener("abort", abortHandler);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Returns a random integer value between a lower and upper bound,
 * inclusive of both bounds.
 * Note that this uses Math.random and isn't secure. If you need to use
 * this for any kind of security purpose, find a better source of random.
 * @param min - The smallest integer value allowed.
 * @param max - The largest integer value allowed.
 */
function getRandomIntegerInclusive(min, max) {
    // Make sure inputs are integers.
    min = Math.ceil(min);
    max = Math.floor(max);
    // Pick a random offset from zero to the size of the range.
    // Since Math.random() can never return 1, we have to make the range one larger
    // in order to be inclusive of the maximum value after we take the floor.
    const offset = Math.floor(Math.random() * (max - min + 1));
    return offset + min;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Helper to determine when an input is a generic JS object.
 * @returns true when input is an object type that is not null, Array, RegExp, or Date.
 */
function isObject(input) {
    return (typeof input === "object" &&
        input !== null &&
        !Array.isArray(input) &&
        !(input instanceof RegExp) &&
        !(input instanceof Date));
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Typeguard for an error object shape (has name and message)
 * @param e - Something caught by a catch clause.
 */
function isError(e) {
    if (isObject(e)) {
        const hasName = typeof e.name === "string";
        const hasMessage = typeof e.message === "string";
        return hasName && hasMessage;
    }
    return false;
}
/**
 * Given what is thought to be an error object, return the message if possible.
 * If the message is missing, returns a stringified version of the input.
 * @param e - Something thrown from a try block
 * @returns The error message or a string of the input
 */
function getErrorMessage(e) {
    if (isError(e)) {
        return e.message;
    }
    else {
        let stringified;
        try {
            if (typeof e === "object" && e) {
                stringified = JSON.stringify(e);
            }
            else {
                stringified = String(e);
            }
        }
        catch (err) {
            stringified = "[unable to stringify input]";
        }
        return `Unknown error ${stringified}`;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Generates a SHA-256 HMAC signature.
 * @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
 * @param stringToSign - The data to be signed.
 * @param encoding - The textual encoding to use for the returned HMAC digest.
 */
async function computeSha256Hmac(key, stringToSign, encoding) {
    const decodedKey = Buffer.from(key, "base64");
    return crypto.createHmac("sha256", decodedKey).update(stringToSign).digest(encoding);
}
/**
 * Generates a SHA-256 hash.
 * @param content - The data to be included in the hash.
 * @param encoding - The textual encoding to use for the returned hash.
 */
async function computeSha256Hash(content, encoding) {
    return crypto.createHash("sha256").update(content).digest(encoding);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Helper TypeGuard that checks if something is defined or not.
 * @param thing - Anything
 */
function isDefined(thing) {
    return typeof thing !== "undefined" && thing !== null;
}
/**
 * Helper TypeGuard that checks if the input is an object with the specified properties.
 * @param thing - Anything.
 * @param properties - The name of the properties that should appear in the object.
 */
function isObjectWithProperties(thing, properties) {
    if (!isDefined(thing) || typeof thing !== "object") {
        return false;
    }
    for (const property of properties) {
        if (!objectHasProperty(thing, property)) {
            return false;
        }
    }
    return true;
}
/**
 * Helper TypeGuard that checks if the input is an object with the specified property.
 * @param thing - Any object.
 * @param property - The name of the property that should appear in the object.
 */
function objectHasProperty(thing, property) {
    return (isDefined(thing) && typeof thing === "object" && property in thing);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/*
 * NOTE: When moving this file, please update "react-native" section in package.json.
 */
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
function generateUUID() {
    let uuid = "";
    for (let i = 0; i < 32; i++) {
        // Generate a random number between 0 and 15
        const randomNumber = Math.floor(Math.random() * 16);
        // Set the UUID version to 4 in the 13th position
        if (i === 12) {
            uuid += "4";
        }
        else if (i === 16) {
            // Set the UUID variant to "10" in the 17th position
            uuid += (randomNumber & 0x3) | 0x8;
        }
        else {
            // Add a random hexadecimal digit to the UUID string
            uuid += randomNumber.toString(16);
        }
        // Add hyphens to the UUID string at the appropriate positions
        if (i === 7 || i === 11 || i === 15 || i === 19) {
            uuid += "-";
        }
    }
    return uuid;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var _a$1;
// NOTE: This is a workaround until we can use `globalThis.crypto.randomUUID` in Node.js 19+.
let uuidFunction = typeof ((_a$1 = globalThis === null || globalThis === void 0 ? void 0 : globalThis.crypto) === null || _a$1 === void 0 ? void 0 : _a$1.randomUUID) === "function"
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : crypto.randomUUID;
// Not defined in earlier versions of Node.js 14
if (!uuidFunction) {
    uuidFunction = generateUUID;
}
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
function randomUUID() {
    return uuidFunction();
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var _a, _b, _c, _d;
/**
 * A constant that indicates whether the environment the code is running is a Web Browser.
 */
// eslint-disable-next-line @azure/azure-sdk/ts-no-window
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is a Web Worker.
 */
const isWebWorker = typeof self === "object" &&
    typeof (self === null || self === void 0 ? void 0 : self.importScripts) === "function" &&
    (((_a = self.constructor) === null || _a === void 0 ? void 0 : _a.name) === "DedicatedWorkerGlobalScope" ||
        ((_b = self.constructor) === null || _b === void 0 ? void 0 : _b.name) === "ServiceWorkerGlobalScope" ||
        ((_c = self.constructor) === null || _c === void 0 ? void 0 : _c.name) === "SharedWorkerGlobalScope");
/**
 * A constant that indicates whether the environment the code is running is Deno.
 */
const isDeno = typeof Deno !== "undefined" &&
    typeof Deno.version !== "undefined" &&
    typeof Deno.version.deno !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
const isNode = typeof process !== "undefined" &&
    Boolean(process.version) &&
    Boolean((_d = process.versions) === null || _d === void 0 ? void 0 : _d.node) &&
    // Deno thought it was a good idea to spoof process.versions.node, see https://deno.land/std@0.177.0/node/process.ts?s=versions
    !isDeno;
/**
 * A constant that indicates whether the environment the code is running is Bun.sh.
 */
const isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 */
// https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/setUpNavigator.js
const isReactNative = typeof navigator !== "undefined" && (navigator === null || navigator === void 0 ? void 0 : navigator.product) === "ReactNative";

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The helper that transforms bytes with specific character encoding into string
 * @param bytes - the uint8array bytes
 * @param format - the format we use to encode the byte
 * @returns a string of the encoded string
 */
function uint8ArrayToString(bytes, format) {
    return Buffer.from(bytes).toString(format);
}
/**
 * The helper that transforms string to specific character encoded bytes array.
 * @param value - the string to be converted
 * @param format - the format we use to decode the value
 * @returns a uint8array
 */
function stringToUint8Array(value, format) {
    return Buffer.from(value, format);
}

exports.cancelablePromiseRace = cancelablePromiseRace;
exports.computeSha256Hash = computeSha256Hash;
exports.computeSha256Hmac = computeSha256Hmac;
exports.createAbortablePromise = createAbortablePromise;
exports.delay = delay;
exports.getErrorMessage = getErrorMessage;
exports.getRandomIntegerInclusive = getRandomIntegerInclusive;
exports.isBrowser = isBrowser;
exports.isBun = isBun;
exports.isDefined = isDefined;
exports.isDeno = isDeno;
exports.isError = isError;
exports.isNode = isNode;
exports.isObject = isObject;
exports.isObjectWithProperties = isObjectWithProperties;
exports.isReactNative = isReactNative;
exports.isWebWorker = isWebWorker;
exports.objectHasProperty = objectHasProperty;
exports.randomUUID = randomUUID;
exports.stringToUint8Array = stringToUint8Array;
exports.uint8ArrayToString = uint8ArrayToString;
//# sourceMappingURL=index.js.map
