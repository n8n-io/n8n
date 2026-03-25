"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
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
    typeof self?.importScripts === "function" &&
    (self.constructor?.name === "DedicatedWorkerGlobalScope" ||
        self.constructor?.name === "ServiceWorkerGlobalScope" ||
        self.constructor?.name === "SharedWorkerGlobalScope");
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
    Boolean(globalThis.process.versions?.node);
/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
exports.isNodeRuntime = exports.isNodeLike && !exports.isBun && !exports.isDeno;
/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 */
// https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/setUpNavigator.js
exports.isReactNative = typeof navigator !== "undefined" && navigator?.product === "ReactNative";
//# sourceMappingURL=checkEnvironment.js.map