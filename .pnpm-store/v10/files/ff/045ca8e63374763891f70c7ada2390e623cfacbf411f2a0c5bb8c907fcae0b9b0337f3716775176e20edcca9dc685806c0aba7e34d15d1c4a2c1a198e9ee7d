// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var _a, _b, _c, _d;
/**
 * A constant that indicates whether the environment the code is running is a Web Browser.
 */
// eslint-disable-next-line @azure/azure-sdk/ts-no-window
export const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is a Web Worker.
 */
export const isWebWorker = typeof self === "object" &&
    typeof (self === null || self === void 0 ? void 0 : self.importScripts) === "function" &&
    (((_a = self.constructor) === null || _a === void 0 ? void 0 : _a.name) === "DedicatedWorkerGlobalScope" ||
        ((_b = self.constructor) === null || _b === void 0 ? void 0 : _b.name) === "ServiceWorkerGlobalScope" ||
        ((_c = self.constructor) === null || _c === void 0 ? void 0 : _c.name) === "SharedWorkerGlobalScope");
/**
 * A constant that indicates whether the environment the code is running is Deno.
 */
export const isDeno = typeof Deno !== "undefined" &&
    typeof Deno.version !== "undefined" &&
    typeof Deno.version.deno !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
export const isNode = typeof process !== "undefined" &&
    Boolean(process.version) &&
    Boolean((_d = process.versions) === null || _d === void 0 ? void 0 : _d.node) &&
    // Deno thought it was a good idea to spoof process.versions.node, see https://deno.land/std@0.177.0/node/process.ts?s=versions
    !isDeno;
/**
 * A constant that indicates whether the environment the code is running is Bun.sh.
 */
export const isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 */
// https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/setUpNavigator.js
export const isReactNative = typeof navigator !== "undefined" && (navigator === null || navigator === void 0 ? void 0 : navigator.product) === "ReactNative";
//# sourceMappingURL=checkEnvironment.js.map