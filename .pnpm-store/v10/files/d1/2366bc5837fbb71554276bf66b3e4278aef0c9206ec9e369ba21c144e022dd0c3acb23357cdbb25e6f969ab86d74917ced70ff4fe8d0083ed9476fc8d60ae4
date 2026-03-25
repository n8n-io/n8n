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
var ssg_exports = {};
__export(ssg_exports, {
  DEFAULT_OUTPUT_DIR: () => DEFAULT_OUTPUT_DIR,
  combineAfterGenerateHooks: () => combineAfterGenerateHooks,
  combineAfterResponseHooks: () => combineAfterResponseHooks,
  combineBeforeRequestHooks: () => combineBeforeRequestHooks,
  defaultExtensionMap: () => defaultExtensionMap,
  fetchRoutesContent: () => fetchRoutesContent,
  saveContentToFile: () => saveContentToFile,
  toSSG: () => toSSG
});
module.exports = __toCommonJS(ssg_exports);
var import_utils = require("../../client/utils");
var import_concurrent = require("../../utils/concurrent");
var import_mime = require("../../utils/mime");
var import_middleware = require("./middleware");
var import_plugins = require("./plugins");
var import_utils2 = require("./utils");
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_CONTENT_TYPE = "text/plain";
const DEFAULT_OUTPUT_DIR = "./static";
const generateFilePath = (routePath, outDir, mimeType, extensionMap) => {
  const extension = determineExtension(mimeType, extensionMap);
  if (routePath.endsWith(`.${extension}`)) {
    return (0, import_utils2.joinPaths)(outDir, routePath);
  }
  if (routePath === "/") {
    return (0, import_utils2.joinPaths)(outDir, `index.${extension}`);
  }
  if (routePath.endsWith("/")) {
    return (0, import_utils2.joinPaths)(outDir, routePath, `index.${extension}`);
  }
  return (0, import_utils2.joinPaths)(outDir, `${routePath}.${extension}`);
};
const parseResponseContent = async (response) => {
  const contentType = response.headers.get("Content-Type");
  try {
    if (contentType?.includes("text") || contentType?.includes("json")) {
      return await response.text();
    } else {
      return await response.arrayBuffer();
    }
  } catch (error) {
    throw new Error(
      `Error processing response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};
const defaultExtensionMap = {
  "text/html": "html",
  "text/xml": "xml",
  "application/xml": "xml",
  "application/yaml": "yaml"
};
const determineExtension = (mimeType, userExtensionMap) => {
  const extensionMap = userExtensionMap || defaultExtensionMap;
  if (mimeType in extensionMap) {
    return extensionMap[mimeType];
  }
  return (0, import_mime.getExtension)(mimeType) || "html";
};
const combineBeforeRequestHooks = (hooks) => {
  if (!Array.isArray(hooks)) {
    return hooks;
  }
  return async (req) => {
    let currentReq = req;
    for (const hook of hooks) {
      const result = await hook(currentReq);
      if (result === false) {
        return false;
      }
      if (result instanceof Request) {
        currentReq = result;
      }
    }
    return currentReq;
  };
};
const combineAfterResponseHooks = (hooks) => {
  if (!Array.isArray(hooks)) {
    return hooks;
  }
  return async (res) => {
    let currentRes = res;
    for (const hook of hooks) {
      const result = await hook(currentRes);
      if (result === false) {
        return false;
      }
      if (result instanceof Response) {
        currentRes = result;
      }
    }
    return currentRes;
  };
};
const combineAfterGenerateHooks = (hooks, fsModule, options) => {
  if (!Array.isArray(hooks)) {
    return hooks;
  }
  return async (result) => {
    for (const hook of hooks) {
      await hook(result, fsModule, options);
    }
  };
};
const fetchRoutesContent = function* (app, beforeRequestHook, afterResponseHook, concurrency) {
  const baseURL = "http://localhost";
  const pool = (0, import_concurrent.createPool)({ concurrency });
  for (const route of (0, import_utils2.filterStaticGenerateRoutes)(app)) {
    const thisRouteBaseURL = new URL(route.path, baseURL).toString();
    let forGetInfoURLRequest = new Request(thisRouteBaseURL);
    yield new Promise(async (resolveGetInfo, rejectGetInfo) => {
      try {
        if (beforeRequestHook) {
          const maybeRequest = await beforeRequestHook(forGetInfoURLRequest);
          if (!maybeRequest) {
            resolveGetInfo(void 0);
            return;
          }
          forGetInfoURLRequest = maybeRequest;
        }
        await pool.run(() => app.fetch(forGetInfoURLRequest));
        if (!forGetInfoURLRequest.ssgParams) {
          if ((0, import_utils2.isDynamicRoute)(route.path)) {
            resolveGetInfo(void 0);
            return;
          }
          forGetInfoURLRequest.ssgParams = [{}];
        }
        const requestInit = {
          method: forGetInfoURLRequest.method,
          headers: forGetInfoURLRequest.headers
        };
        resolveGetInfo(
          (function* () {
            for (const param of forGetInfoURLRequest.ssgParams) {
              yield new Promise(async (resolveReq, rejectReq) => {
                try {
                  const replacedUrlParam = (0, import_utils.replaceUrlParam)(route.path, param);
                  let response = await pool.run(
                    () => app.request(replacedUrlParam, requestInit, {
                      [import_middleware.SSG_CONTEXT]: true
                    })
                  );
                  if (response.headers.get(import_middleware.X_HONO_DISABLE_SSG_HEADER_KEY)) {
                    resolveReq(void 0);
                    return;
                  }
                  if (afterResponseHook) {
                    const maybeResponse = await afterResponseHook(response);
                    if (!maybeResponse) {
                      resolveReq(void 0);
                      return;
                    }
                    response = maybeResponse;
                  }
                  const mimeType = response.headers.get("Content-Type")?.split(";")[0] || DEFAULT_CONTENT_TYPE;
                  const content = await parseResponseContent(response);
                  resolveReq({
                    routePath: replacedUrlParam,
                    mimeType,
                    content
                  });
                } catch (error) {
                  rejectReq(error);
                }
              });
            }
          })()
        );
      } catch (error) {
        rejectGetInfo(error);
      }
    });
  }
};
const createdDirs = /* @__PURE__ */ new Set();
const saveContentToFile = async (data, fsModule, outDir, extensionMap) => {
  const awaitedData = await data;
  if (!awaitedData) {
    return;
  }
  const { routePath, content, mimeType } = awaitedData;
  const filePath = generateFilePath(routePath, outDir, mimeType, extensionMap);
  const dirPath = (0, import_utils2.dirname)(filePath);
  if (!createdDirs.has(dirPath)) {
    await fsModule.mkdir(dirPath, { recursive: true });
    createdDirs.add(dirPath);
  }
  if (typeof content === "string") {
    await fsModule.writeFile(filePath, content);
  } else if (content instanceof ArrayBuffer) {
    await fsModule.writeFile(filePath, new Uint8Array(content));
  }
  return filePath;
};
const toSSG = async (app, fs, options) => {
  let result;
  const getInfoPromises = [];
  const savePromises = [];
  const plugins = options?.plugins || [(0, import_plugins.defaultPlugin)()];
  const beforeRequestHooks = [];
  const afterResponseHooks = [];
  const afterGenerateHooks = [];
  if (options?.beforeRequestHook) {
    beforeRequestHooks.push(
      ...Array.isArray(options.beforeRequestHook) ? options.beforeRequestHook : [options.beforeRequestHook]
    );
  }
  if (options?.afterResponseHook) {
    afterResponseHooks.push(
      ...Array.isArray(options.afterResponseHook) ? options.afterResponseHook : [options.afterResponseHook]
    );
  }
  if (options?.afterGenerateHook) {
    afterGenerateHooks.push(
      ...Array.isArray(options.afterGenerateHook) ? options.afterGenerateHook : [options.afterGenerateHook]
    );
  }
  for (const plugin of plugins) {
    if (plugin.beforeRequestHook) {
      beforeRequestHooks.push(
        ...Array.isArray(plugin.beforeRequestHook) ? plugin.beforeRequestHook : [plugin.beforeRequestHook]
      );
    }
    if (plugin.afterResponseHook) {
      afterResponseHooks.push(
        ...Array.isArray(plugin.afterResponseHook) ? plugin.afterResponseHook : [plugin.afterResponseHook]
      );
    }
    if (plugin.afterGenerateHook) {
      afterGenerateHooks.push(
        ...Array.isArray(plugin.afterGenerateHook) ? plugin.afterGenerateHook : [plugin.afterGenerateHook]
      );
    }
  }
  try {
    const outputDir = options?.dir ?? DEFAULT_OUTPUT_DIR;
    const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
    const combinedBeforeRequestHook = combineBeforeRequestHooks(
      beforeRequestHooks.length > 0 ? beforeRequestHooks : [(req) => req]
    );
    const combinedAfterResponseHook = combineAfterResponseHooks(
      afterResponseHooks.length > 0 ? afterResponseHooks : [(req) => req]
    );
    const getInfoGen = fetchRoutesContent(
      app,
      combinedBeforeRequestHook,
      combinedAfterResponseHook,
      concurrency
    );
    for (const getInfo of getInfoGen) {
      getInfoPromises.push(
        getInfo.then((getContentGen) => {
          if (!getContentGen) {
            return;
          }
          for (const content of getContentGen) {
            savePromises.push(
              saveContentToFile(content, fs, outputDir, options?.extensionMap).catch((e) => e)
            );
          }
        })
      );
    }
    await Promise.all(getInfoPromises);
    const files = [];
    for (const savePromise of savePromises) {
      const fileOrError = await savePromise;
      if (typeof fileOrError === "string") {
        files.push(fileOrError);
      } else if (fileOrError) {
        throw fileOrError;
      }
    }
    result = { success: true, files };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    result = { success: false, files: [], error: errorObj };
  }
  if (afterGenerateHooks.length > 0) {
    const combinedAfterGenerateHooks = combineAfterGenerateHooks(afterGenerateHooks, fs, options);
    await combinedAfterGenerateHooks(result, fs, options);
  }
  return result;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_OUTPUT_DIR,
  combineAfterGenerateHooks,
  combineAfterResponseHooks,
  combineBeforeRequestHooks,
  defaultExtensionMap,
  fetchRoutesContent,
  saveContentToFile,
  toSSG
});
