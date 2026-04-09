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
var wrapAbortSignal_exports = {};
__export(wrapAbortSignal_exports, {
  wrapAbortSignalLike: () => wrapAbortSignalLike
});
module.exports = __toCommonJS(wrapAbortSignal_exports);
function wrapAbortSignalLike(abortSignalLike) {
  if (abortSignalLike instanceof AbortSignal) {
    return { abortSignal: abortSignalLike };
  }
  if (abortSignalLike.aborted) {
    return { abortSignal: AbortSignal.abort(abortSignalLike.reason) };
  }
  const controller = new AbortController();
  let needsCleanup = true;
  function cleanup() {
    if (needsCleanup) {
      abortSignalLike.removeEventListener("abort", listener);
      needsCleanup = false;
    }
  }
  function listener() {
    controller.abort(abortSignalLike.reason);
    cleanup();
  }
  abortSignalLike.addEventListener("abort", listener);
  return { abortSignal: controller.signal, cleanup };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  wrapAbortSignalLike
});
