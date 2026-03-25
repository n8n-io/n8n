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
var http_exports = {};
__export(http_exports, {
  addressToString: () => addressToString,
  startMcpHttpServer: () => startMcpHttpServer
});
module.exports = __toCommonJS(http_exports);
var import_assert = __toESM(require("assert"));
var import_crypto = __toESM(require("crypto"));
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var mcpBundle = __toESM(require("playwright-core/lib/mcpBundle"));
var import_utils = require("playwright-core/lib/utils");
var mcpServer = __toESM(require("./server"));
const testDebug = (0, import_utilsBundle.debug)("pw:mcp:test");
async function startMcpHttpServer(config, serverBackendFactory, allowedHosts) {
  const httpServer = (0, import_utils.createHttpServer)();
  await (0, import_utils.startHttpServer)(httpServer, config);
  return await installHttpTransport(httpServer, serverBackendFactory, allowedHosts);
}
function addressToString(address, options) {
  (0, import_assert.default)(address, "Could not bind server socket");
  if (typeof address === "string")
    throw new Error("Unexpected address type: " + address);
  let host = address.family === "IPv4" ? address.address : `[${address.address}]`;
  if (options.normalizeLoopback && (host === "0.0.0.0" || host === "[::]" || host === "[::1]" || host === "127.0.0.1"))
    host = "localhost";
  return `${options.protocol}://${host}:${address.port}`;
}
async function installHttpTransport(httpServer, serverBackendFactory, allowedHosts) {
  const url = addressToString(httpServer.address(), { protocol: "http", normalizeLoopback: true });
  const host = new URL(url).host;
  allowedHosts = (allowedHosts || [host]).map((h) => h.toLowerCase());
  const allowAnyHost = allowedHosts.includes("*");
  const sseSessions = /* @__PURE__ */ new Map();
  const streamableSessions = /* @__PURE__ */ new Map();
  httpServer.on("request", async (req, res) => {
    if (!allowAnyHost) {
      const host2 = req.headers.host?.toLowerCase();
      if (!host2) {
        res.statusCode = 400;
        return res.end("Missing host");
      }
      if (!allowedHosts.includes(host2)) {
        res.statusCode = 403;
        return res.end("Access is only allowed at " + allowedHosts.join(", "));
      }
    }
    const url2 = new URL(`http://localhost${req.url}`);
    if (url2.pathname === "/killkillkill" && req.method === "GET") {
      res.statusCode = 200;
      res.end("Killing process");
      process.emit("SIGINT");
      return;
    }
    if (url2.pathname.startsWith("/sse"))
      await handleSSE(serverBackendFactory, req, res, url2, sseSessions);
    else
      await handleStreamable(serverBackendFactory, req, res, streamableSessions);
  });
  return url;
}
async function handleSSE(serverBackendFactory, req, res, url, sessions) {
  if (req.method === "POST") {
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      res.statusCode = 400;
      return res.end("Missing sessionId");
    }
    const transport = sessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      return res.end("Session not found");
    }
    return await transport.handlePostMessage(req, res);
  } else if (req.method === "GET") {
    const transport = new mcpBundle.SSEServerTransport("/sse", res);
    sessions.set(transport.sessionId, transport);
    testDebug(`create SSE session: ${transport.sessionId}`);
    await mcpServer.connect(serverBackendFactory, transport, false);
    res.on("close", () => {
      testDebug(`delete SSE session: ${transport.sessionId}`);
      sessions.delete(transport.sessionId);
    });
    return;
  }
  res.statusCode = 405;
  res.end("Method not allowed");
}
async function handleStreamable(serverBackendFactory, req, res, sessions) {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId) {
    const transport = sessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      res.end("Session not found");
      return;
    }
    return await transport.handleRequest(req, res);
  }
  if (req.method === "POST") {
    const transport = new mcpBundle.StreamableHTTPServerTransport({
      sessionIdGenerator: () => import_crypto.default.randomUUID(),
      onsessioninitialized: async (sessionId2) => {
        testDebug(`create http session: ${transport.sessionId}`);
        await mcpServer.connect(serverBackendFactory, transport, true);
        sessions.set(sessionId2, transport);
      }
    });
    transport.onclose = () => {
      if (!transport.sessionId)
        return;
      sessions.delete(transport.sessionId);
      testDebug(`delete http session: ${transport.sessionId}`);
    };
    await transport.handleRequest(req, res);
    return;
  }
  res.statusCode = 400;
  res.end("Invalid request");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addressToString,
  startMcpHttpServer
});
