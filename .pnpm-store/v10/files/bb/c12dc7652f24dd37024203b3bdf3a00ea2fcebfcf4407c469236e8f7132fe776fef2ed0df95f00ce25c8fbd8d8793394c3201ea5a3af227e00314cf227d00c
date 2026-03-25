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
var network_exports = {};
__export(network_exports, {
  NET_DEFAULT_TIMEOUT: () => NET_DEFAULT_TIMEOUT,
  createHttp2Server: () => createHttp2Server,
  createHttpServer: () => createHttpServer,
  createHttpsServer: () => createHttpsServer,
  createProxyAgent: () => createProxyAgent,
  fetchData: () => fetchData,
  httpRequest: () => httpRequest,
  isURLAvailable: () => isURLAvailable,
  startHttpServer: () => startHttpServer
});
module.exports = __toCommonJS(network_exports);
var import_http = __toESM(require("http"));
var import_http2 = __toESM(require("http2"));
var import_https = __toESM(require("https"));
var import_utilsBundle = require("../../utilsBundle");
var import_happyEyeballs = require("./happyEyeballs");
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
const NET_DEFAULT_TIMEOUT = 3e4;
function httpRequest(params, onResponse, onError) {
  let url = new URL(params.url);
  const options = {
    method: params.method || "GET",
    headers: params.headers
  };
  if (params.rejectUnauthorized !== void 0)
    options.rejectUnauthorized = params.rejectUnauthorized;
  const proxyURL = (0, import_utilsBundle.getProxyForUrl)(params.url);
  if (proxyURL) {
    const parsedProxyURL = normalizeProxyURL(proxyURL);
    if (params.url.startsWith("http:")) {
      parsedProxyURL.pathname = url.toString();
      url = parsedProxyURL;
    } else {
      options.agent = new import_utilsBundle.HttpsProxyAgent(parsedProxyURL);
      options.rejectUnauthorized = false;
    }
  }
  options.agent ??= url.protocol === "https:" ? import_happyEyeballs.httpsHappyEyeballsAgent : import_happyEyeballs.httpHappyEyeballsAgent;
  let cancelRequest;
  const requestCallback = (res) => {
    const statusCode = res.statusCode || 0;
    if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
      request.destroy();
      cancelRequest = httpRequest({ ...params, url: new URL(res.headers.location, params.url).toString() }, onResponse, onError).cancel;
    } else {
      onResponse(res);
    }
  };
  const request = url.protocol === "https:" ? import_https.default.request(url, options, requestCallback) : import_http.default.request(url, options, requestCallback);
  request.on("error", onError);
  if (params.socketTimeout !== void 0) {
    request.setTimeout(params.socketTimeout, () => {
      onError(new Error(`Request to ${params.url} timed out after ${params.socketTimeout}ms`));
      request.abort();
    });
  }
  cancelRequest = (e) => {
    try {
      request.destroy(e);
    } catch {
    }
  };
  request.end(params.data);
  return { cancel: (e) => cancelRequest(e) };
}
async function fetchData(progress, params, onError) {
  const promise = new import_manualPromise.ManualPromise();
  const { cancel } = httpRequest(params, async (response) => {
    if (response.statusCode !== 200) {
      const error = onError ? await onError(params, response) : new Error(`fetch failed: server returned code ${response.statusCode}. URL: ${params.url}`);
      promise.reject(error);
      return;
    }
    let body = "";
    response.on("data", (chunk) => body += chunk);
    response.on("error", (error) => promise.reject(error));
    response.on("end", () => promise.resolve(body));
  }, (error) => promise.reject(error));
  if (!progress)
    return promise;
  try {
    return await progress.race(promise);
  } catch (error) {
    cancel(error);
    throw error;
  }
}
function shouldBypassProxy(url, bypass) {
  if (!bypass)
    return false;
  const domains = bypass.split(",").map((s) => {
    s = s.trim();
    if (!s.startsWith("."))
      s = "." + s;
    return s;
  });
  const domain = "." + url.hostname;
  return domains.some((d) => domain.endsWith(d));
}
function normalizeProxyURL(proxy) {
  proxy = proxy.trim();
  if (!/^\w+:\/\//.test(proxy))
    proxy = "http://" + proxy;
  return new URL(proxy);
}
function createProxyAgent(proxy, forUrl) {
  if (!proxy)
    return;
  if (forUrl && proxy.bypass && shouldBypassProxy(forUrl, proxy.bypass))
    return;
  const proxyURL = normalizeProxyURL(proxy.server);
  if (proxyURL.protocol?.startsWith("socks")) {
    if (proxyURL.protocol === "socks5:")
      proxyURL.protocol = "socks5h:";
    else if (proxyURL.protocol === "socks4:")
      proxyURL.protocol = "socks4a:";
    return new import_utilsBundle.SocksProxyAgent(proxyURL);
  }
  if (proxy.username) {
    proxyURL.username = proxy.username;
    proxyURL.password = proxy.password || "";
  }
  if (forUrl && ["ws:", "wss:"].includes(forUrl.protocol)) {
    return new import_utilsBundle.HttpsProxyAgent(proxyURL);
  }
  return new import_utilsBundle.HttpsProxyAgent(proxyURL);
}
function createHttpServer(...args) {
  const server = import_http.default.createServer(...args);
  decorateServer(server);
  return server;
}
function createHttpsServer(...args) {
  const server = import_https.default.createServer(...args);
  decorateServer(server);
  return server;
}
function createHttp2Server(...args) {
  const server = import_http2.default.createSecureServer(...args);
  decorateServer(server);
  return server;
}
async function startHttpServer(server, options) {
  const { host = "localhost", port = 0 } = options;
  const errorPromise = new import_manualPromise.ManualPromise();
  const errorListener = (error) => errorPromise.reject(error);
  server.on("error", errorListener);
  try {
    server.listen(port, host);
    await Promise.race([
      new Promise((cb) => server.once("listening", cb)),
      errorPromise
    ]);
  } finally {
    server.removeListener("error", errorListener);
  }
}
async function isURLAvailable(url, ignoreHTTPSErrors, onLog, onStdErr) {
  let statusCode = await httpStatusCode(url, ignoreHTTPSErrors, onLog, onStdErr);
  if (statusCode === 404 && url.pathname === "/") {
    const indexUrl = new URL(url);
    indexUrl.pathname = "/index.html";
    statusCode = await httpStatusCode(indexUrl, ignoreHTTPSErrors, onLog, onStdErr);
  }
  return statusCode >= 200 && statusCode < 404;
}
async function httpStatusCode(url, ignoreHTTPSErrors, onLog, onStdErr) {
  return new Promise((resolve) => {
    onLog?.(`HTTP GET: ${url}`);
    httpRequest({
      url: url.toString(),
      headers: { Accept: "*/*" },
      rejectUnauthorized: !ignoreHTTPSErrors
    }, (res) => {
      res.resume();
      const statusCode = res.statusCode ?? 0;
      onLog?.(`HTTP Status: ${statusCode}`);
      resolve(statusCode);
    }, (error) => {
      if (error.code === "DEPTH_ZERO_SELF_SIGNED_CERT")
        onStdErr?.(`[WebServer] Self-signed certificate detected. Try adding ignoreHTTPSErrors: true to config.webServer.`);
      onLog?.(`Error while checking if ${url} is available: ${error.message}`);
      resolve(0);
    });
  });
}
function decorateServer(server) {
  const sockets = /* @__PURE__ */ new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  const close = server.close;
  server.close = (callback) => {
    for (const socket of sockets)
      socket.destroy();
    sockets.clear();
    return close.call(server, callback);
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NET_DEFAULT_TIMEOUT,
  createHttp2Server,
  createHttpServer,
  createHttpsServer,
  createProxyAgent,
  fetchData,
  httpRequest,
  isURLAvailable,
  startHttpServer
});
