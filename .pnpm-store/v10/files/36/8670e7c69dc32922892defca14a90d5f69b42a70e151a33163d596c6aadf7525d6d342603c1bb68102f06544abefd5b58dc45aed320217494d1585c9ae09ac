"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReactNative = exports.isNodeRuntime = exports.isNodeLike = exports.isBun = exports.isDeno = exports.isWebWorker = exports.isBrowser = void 0;
/**
 * A constant that indicates whether the environment the code is running is a Web Browser.
 */
// eslint-disable-next-line @azure/azure-sdk/ts-no-window
exports.isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is a Web Worker.
 */
exports.isWebWorker = typeof self === "object" &&
    typeof (self === null || self === void 0 ? void 0 : self.importScripts) === "function" &&
    (((_a = self.constructor) === null || _a === void 0 ? void 0 : _a.name) === "DedicatedWorkerGlobalScope" ||
        ((_b = self.constructor) === null || _b === void 0 ? void 0 : _b.name) === "ServiceWorkerGlobalScope" ||
        ((_c = self.constructor) === null || _c === void 0 ? void 0 : _c.name) === "SharedWorkerGlobalScope");
/**
 * A constant that indicates whether the environment the code is running is Deno.
 */
exports.isDeno = typeof Deno !== "undefined" &&
    typeof Deno.version !== "undefined" &&
    typeof Deno.version.deno !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is Bun.sh.
 */
exports.isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
/**
 * A constant that indicates whether the environment the code is running is a Node.js compatible environment.
 */
exports.isNodeLike = typeof globalThis.process !== "undefined" &&
    Boolean(globalThis.process.version) &&
    Boolean((_d = globalThis.process.versions) === null || _d === void 0 ? void 0 : _d.node);
/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
exports.isNodeRuntime = exports.isNodeLike && !exports.isBun && !exports.isDeno;
/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 */
// https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/setUpNavigator.js
exports.isReactNative = typeof navigator !== "undefined" && (navigator === null || navigator === void 0 ? void 0 : navigator.product) === "ReactNative";
//# sourceMappingURL=checkEnvironment.js.map