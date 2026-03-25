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
var timeoutRunner_exports = {};
__export(timeoutRunner_exports, {
  pollAgainstDeadline: () => pollAgainstDeadline,
  raceAgainstDeadline: () => raceAgainstDeadline
});
module.exports = __toCommonJS(timeoutRunner_exports);
var import_time = require("./time");
async function raceAgainstDeadline(cb, deadline) {
  let timer;
  return Promise.race([
    cb().then((result) => {
      return { result, timedOut: false };
    }),
    new Promise((resolve) => {
      const kMaxDeadline = 2147483647;
      const timeout = (deadline || kMaxDeadline) - (0, import_time.monotonicTime)();
      timer = setTimeout(() => resolve({ timedOut: true }), timeout);
    })
  ]).finally(() => {
    clearTimeout(timer);
  });
}
async function pollAgainstDeadline(callback, deadline, pollIntervals = [100, 250, 500, 1e3]) {
  const lastPollInterval = pollIntervals.pop() ?? 1e3;
  let lastResult;
  const wrappedCallback = () => Promise.resolve().then(callback);
  while (true) {
    const time = (0, import_time.monotonicTime)();
    if (deadline && time >= deadline)
      break;
    const received = await raceAgainstDeadline(wrappedCallback, deadline);
    if (received.timedOut)
      break;
    lastResult = received.result.result;
    if (!received.result.continuePolling)
      return { result: lastResult, timedOut: false };
    const interval = pollIntervals.shift() ?? lastPollInterval;
    if (deadline && deadline <= (0, import_time.monotonicTime)() + interval)
      break;
    await new Promise((x) => setTimeout(x, interval));
  }
  return { timedOut: true, result: lastResult };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pollAgainstDeadline,
  raceAgainstDeadline
});
