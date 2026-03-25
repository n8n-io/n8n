"use strict";
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
var task_exports = {};
__export(task_exports, {
  makeWaitForNextTask: () => makeWaitForNextTask
});
module.exports = __toCommonJS(task_exports);
function makeWaitForNextTask() {
  if (process.versions.electron)
    return (callback) => setTimeout(callback, 0);
  if (parseInt(process.versions.node, 10) >= 11)
    return setImmediate;
  let spinning = false;
  const callbacks = [];
  const loop = () => {
    const callback = callbacks.shift();
    if (!callback) {
      spinning = false;
      return;
    }
    setImmediate(loop);
    callback();
  };
  return (callback) => {
    callbacks.push(callback);
    if (!spinning) {
      spinning = true;
      setImmediate(loop);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeWaitForNextTask
});
