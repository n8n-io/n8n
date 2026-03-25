"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBackend = void 0;
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
const isWebWorker = typeof self === "object" && self.constructor && self.constructor.name === "DedicatedWorkerGlobalScope";
exports.isBackend = !isBrowser && !isWebWorker;
