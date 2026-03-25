"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var localUtilsDispatcher_exports = {};
__export(localUtilsDispatcher_exports, {
  LocalUtilsDispatcher: () => LocalUtilsDispatcher
});
module.exports = __toCommonJS(localUtilsDispatcher_exports);
var import_dispatcher = require("./dispatcher");
var import_instrumentation = require("../../server/instrumentation");
var localUtils = __toESM(require("../localUtils"));
var import_userAgent = require("../utils/userAgent");
var import_deviceDescriptors = require("../deviceDescriptors");
var import_jsonPipeDispatcher = require("../dispatchers/jsonPipeDispatcher");
var import_socksInterceptor = require("../socksInterceptor");
var import_transport = require("../transport");
var import_network = require("../utils/network");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
class LocalUtilsDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, playwright) {
    const localUtils2 = new import_instrumentation.SdkObject(playwright, "localUtils", "localUtils");
    localUtils2.logName = "browser";
    const deviceDescriptors = Object.entries(import_deviceDescriptors.deviceDescriptors).map(([name, descriptor]) => ({ name, descriptor }));
    super(scope, localUtils2, "LocalUtils", {
      deviceDescriptors
    });
    this._harBackends = /* @__PURE__ */ new Map();
    this._stackSessions = /* @__PURE__ */ new Map();
    this._type_LocalUtils = true;
  }
  async zip(params, progress) {
    return await localUtils.zip(progress, this._stackSessions, params);
  }
  async harOpen(params, progress) {
    return await localUtils.harOpen(progress, this._harBackends, params);
  }
  async harLookup(params, progress) {
    return await localUtils.harLookup(progress, this._harBackends, params);
  }
  async harClose(params, progress) {
    localUtils.harClose(this._harBackends, params);
  }
  async harUnzip(params, progress) {
    return await localUtils.harUnzip(progress, params);
  }
  async tracingStarted(params, progress) {
    return await localUtils.tracingStarted(progress, this._stackSessions, params);
  }
  async traceDiscarded(params, progress) {
    return await localUtils.traceDiscarded(progress, this._stackSessions, params);
  }
  async addStackToTracingNoReply(params, progress) {
    localUtils.addStackToTracingNoReply(this._stackSessions, params);
  }
  async connect(params, progress) {
    const wsHeaders = {
      "User-Agent": (0, import_userAgent.getUserAgent)(),
      "x-playwright-proxy": params.exposeNetwork ?? "",
      ...params.headers
    };
    const wsEndpoint = await urlToWSEndpoint(progress, params.wsEndpoint);
    const transport = await import_transport.WebSocketTransport.connect(progress, wsEndpoint, { headers: wsHeaders, followRedirects: true, debugLogHeader: "x-playwright-debug-log" });
    const socksInterceptor = new import_socksInterceptor.SocksInterceptor(transport, params.exposeNetwork, params.socksProxyRedirectPortForTest);
    const pipe = new import_jsonPipeDispatcher.JsonPipeDispatcher(this);
    transport.onmessage = (json) => {
      if (socksInterceptor.interceptMessage(json))
        return;
      const cb = () => {
        try {
          pipe.dispatch(json);
        } catch (e) {
          transport.close();
        }
      };
      if (params.slowMo)
        setTimeout(cb, params.slowMo);
      else
        cb();
    };
    pipe.on("message", (message) => {
      transport.send(message);
    });
    transport.onclose = (reason) => {
      socksInterceptor?.cleanup();
      pipe.wasClosed(reason);
    };
    pipe.on("close", () => transport.close());
    return { pipe, headers: transport.headers };
  }
  async globToRegex(params, progress) {
    const regex = (0, import_urlMatch.resolveGlobToRegexPattern)(params.baseURL, params.glob, params.webSocketUrl);
    return { regex };
  }
}
async function urlToWSEndpoint(progress, endpointURL) {
  if (endpointURL.startsWith("ws"))
    return endpointURL;
  progress.log(`<ws preparing> retrieving websocket url from ${endpointURL}`);
  const fetchUrl = new URL(endpointURL);
  if (!fetchUrl.pathname.endsWith("/"))
    fetchUrl.pathname += "/";
  fetchUrl.pathname += "json";
  const json = await (0, import_network.fetchData)(progress, {
    url: fetchUrl.toString(),
    method: "GET",
    headers: { "User-Agent": (0, import_userAgent.getUserAgent)() }
  }, async (params, response) => {
    return new Error(`Unexpected status ${response.statusCode} when connecting to ${fetchUrl.toString()}.
This does not look like a Playwright server, try connecting via ws://.`);
  });
  const wsUrl = new URL(endpointURL);
  let wsEndpointPath = JSON.parse(json).wsEndpointPath;
  if (wsEndpointPath.startsWith("/"))
    wsEndpointPath = wsEndpointPath.substring(1);
  if (!wsUrl.pathname.endsWith("/"))
    wsUrl.pathname += "/";
  wsUrl.pathname += wsEndpointPath;
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  return wsUrl.toString();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LocalUtilsDispatcher
});
