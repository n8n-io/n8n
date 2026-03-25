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
var utils_exports = {};
__export(utils_exports, {
  callOnPageNoTrace: () => callOnPageNoTrace,
  dateAsFileName: () => dateAsFileName,
  eventWaiter: () => eventWaiter,
  waitForCompletion: () => waitForCompletion
});
module.exports = __toCommonJS(utils_exports);
async function waitForCompletion(tab, callback) {
  const requests = [];
  const requestListener = (request) => requests.push(request);
  const disposeListeners = () => {
    tab.page.off("request", requestListener);
  };
  tab.page.on("request", requestListener);
  let result;
  try {
    result = await callback();
    await tab.waitForTimeout(500);
  } finally {
    disposeListeners();
  }
  const requestedNavigation = requests.some((request) => request.isNavigationRequest());
  if (requestedNavigation) {
    await tab.page.mainFrame().waitForLoadState("load", { timeout: 1e4 }).catch(() => {
    });
    return result;
  }
  const promises = [];
  for (const request of requests) {
    if (["document", "stylesheet", "script", "xhr", "fetch"].includes(request.resourceType()))
      promises.push(request.response().then((r) => r?.finished()).catch(() => {
      }));
    else
      promises.push(request.response().catch(() => {
      }));
  }
  const timeout = new Promise((resolve) => setTimeout(resolve, 5e3));
  await Promise.race([Promise.all(promises), timeout]);
  if (requests.length)
    await tab.waitForTimeout(500);
  return result;
}
async function callOnPageNoTrace(page, callback) {
  return await page._wrapApiCall(() => callback(page), { internal: true });
}
function dateAsFileName(extension) {
  const date = /* @__PURE__ */ new Date();
  return `page-${date.toISOString().replace(/[:.]/g, "-")}.${extension}`;
}
function eventWaiter(page, event, timeout) {
  const disposables = [];
  const eventPromise = new Promise((resolve, reject) => {
    page.on(event, resolve);
    disposables.push(() => page.off(event, resolve));
  });
  let abort;
  const abortPromise = new Promise((resolve, reject) => {
    abort = () => resolve(void 0);
  });
  const timeoutPromise = new Promise((f) => {
    const timeoutId = setTimeout(() => f(void 0), timeout);
    disposables.push(() => clearTimeout(timeoutId));
  });
  return {
    promise: Promise.race([eventPromise, abortPromise, timeoutPromise]).finally(() => disposables.forEach((dispose) => dispose())),
    abort
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  callOnPageNoTrace,
  dateAsFileName,
  eventWaiter,
  waitForCompletion
});
