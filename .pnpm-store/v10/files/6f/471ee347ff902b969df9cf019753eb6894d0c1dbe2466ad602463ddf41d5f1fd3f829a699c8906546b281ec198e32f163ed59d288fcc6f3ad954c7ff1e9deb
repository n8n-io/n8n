"use strict";
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUNTIME = void 0;
/**
 * A constant that indicates whether the environment the code is running is a Web Browser.
 */
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is a Web Worker.
 */
const isWebWorker = typeof self === "object" &&
    // @ts-ignore
    typeof (self === null || self === void 0 ? void 0 : self.importScripts) === "function" &&
    (((_a = self.constructor) === null || _a === void 0 ? void 0 : _a.name) === "DedicatedWorkerGlobalScope" ||
        ((_b = self.constructor) === null || _b === void 0 ? void 0 : _b.name) === "ServiceWorkerGlobalScope" ||
        ((_c = self.constructor) === null || _c === void 0 ? void 0 : _c.name) === "SharedWorkerGlobalScope");
/**
 * A constant that indicates whether the environment the code is running is Deno.
 */
const isDeno = typeof Deno !== "undefined" && typeof Deno.version !== "undefined" && typeof Deno.version.deno !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is Bun.sh.
 */
const isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
const isNode = typeof process !== "undefined" &&
    Boolean(process.version) &&
    Boolean((_d = process.versions) === null || _d === void 0 ? void 0 : _d.node) &&
    // Deno spoofs process.versions.node, see https://deno.land/std@0.177.0/node/process.ts?s=versions
    !isDeno &&
    !isBun;
/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 * https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/setUpNavigator.js
 */
const isReactNative = typeof navigator !== "undefined" && (navigator === null || navigator === void 0 ? void 0 : navigator.product) === "ReactNative";
/**
 * A constant that indicates which environment and version the SDK is running in.
 */
exports.RUNTIME = evaluateRuntime();
function evaluateRuntime() {
    if (isBrowser) {
        return {
            type: "browser",
            version: window.navigator.userAgent,
        };
    }
    if (isWebWorker) {
        return {
            type: "web-worker",
        };
    }
    if (isDeno) {
        return {
            type: "deno",
            version: Deno.version.deno,
        };
    }
    if (isBun) {
        return {
            type: "bun",
            version: Bun.version,
        };
    }
    if (isNode) {
        return {
            type: "node",
            version: process.versions.node,
        };
    }
    if (isReactNative) {
        return {
            type: "react-native",
        };
    }
    return {
        type: "unknown",
    };
}
