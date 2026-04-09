var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var checkEnvironment_exports = {};
__export(checkEnvironment_exports, {
  isBrowser: () => isBrowser,
  isBun: () => isBun,
  isDeno: () => isDeno,
  isNodeLike: () => isNodeLike,
  isNodeRuntime: () => isNodeRuntime,
  isReactNative: () => isReactNative,
  isWebWorker: () => isWebWorker
});
module.exports = __toCommonJS(checkEnvironment_exports);
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
const isWebWorker = typeof self === "object" && typeof self?.importScripts === "function" && (self.constructor?.name === "DedicatedWorkerGlobalScope" || self.constructor?.name === "ServiceWorkerGlobalScope" || self.constructor?.name === "SharedWorkerGlobalScope");
const isDeno = typeof Deno !== "undefined" && typeof Deno.version !== "undefined" && typeof Deno.version.deno !== "undefined";
const isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
const isNodeLike = typeof globalThis.process !== "undefined" && Boolean(globalThis.process.version) && Boolean(globalThis.process.versions?.node);
const isNodeRuntime = isNodeLike && !isBun && !isDeno;
const isReactNative = typeof navigator !== "undefined" && navigator?.product === "ReactNative";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isBrowser,
  isBun,
  isDeno,
  isNodeLike,
  isNodeRuntime,
  isReactNative,
  isWebWorker
});
