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
var httpServer_exports = {};
__export(httpServer_exports, {
  HttpServer: () => HttpServer
});
module.exports = __toCommonJS(httpServer_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utilsBundle = require("../../utilsBundle");
var import_crypto = require("./crypto");
var import_assert = require("../../utils/isomorphic/assert");
var import_network = require("./network");
class HttpServer {
  constructor() {
    this._urlPrefixPrecise = "";
    this._urlPrefixHumanReadable = "";
    this._port = 0;
    this._started = false;
    this._routes = [];
    this._server = (0, import_network.createHttpServer)(this._onRequest.bind(this));
  }
  server() {
    return this._server;
  }
  routePrefix(prefix, handler) {
    this._routes.push({ prefix, handler });
  }
  routePath(path2, handler) {
    this._routes.push({ exact: path2, handler });
  }
  port() {
    return this._port;
  }
  createWebSocket(transport, guid) {
    (0, import_assert.assert)(!this._wsGuid, "can only create one main websocket transport per server");
    this._wsGuid = guid || (0, import_crypto.createGuid)();
    const wss = new import_utilsBundle.wsServer({ server: this._server, path: "/" + this._wsGuid });
    wss.on("connection", (ws) => {
      transport.onconnect();
      transport.sendEvent = (method, params) => ws.send(JSON.stringify({ method, params }));
      transport.close = () => ws.close();
      ws.on("message", async (message) => {
        const { id, method, params } = JSON.parse(String(message));
        try {
          const result = await transport.dispatch(method, params);
          ws.send(JSON.stringify({ id, result }));
        } catch (e) {
          ws.send(JSON.stringify({ id, error: String(e) }));
        }
      });
      ws.on("close", () => transport.onclose());
      ws.on("error", () => transport.onclose());
    });
  }
  wsGuid() {
    return this._wsGuid;
  }
  async start(options = {}) {
    (0, import_assert.assert)(!this._started, "server already started");
    this._started = true;
    const host = options.host;
    if (options.preferredPort) {
      try {
        await (0, import_network.startHttpServer)(this._server, { port: options.preferredPort, host });
      } catch (e) {
        if (!e || !e.message || !e.message.includes("EADDRINUSE"))
          throw e;
        await (0, import_network.startHttpServer)(this._server, { host });
      }
    } else {
      await (0, import_network.startHttpServer)(this._server, { port: options.port, host });
    }
    const address = this._server.address();
    (0, import_assert.assert)(address, "Could not bind server socket");
    if (typeof address === "string") {
      this._urlPrefixPrecise = address;
      this._urlPrefixHumanReadable = address;
    } else {
      this._port = address.port;
      const resolvedHost = address.family === "IPv4" ? address.address : `[${address.address}]`;
      this._urlPrefixPrecise = `http://${resolvedHost}:${address.port}`;
      this._urlPrefixHumanReadable = `http://${host ?? "localhost"}:${address.port}`;
    }
  }
  async stop() {
    await new Promise((cb) => this._server.close(cb));
  }
  urlPrefix(purpose) {
    return purpose === "human-readable" ? this._urlPrefixHumanReadable : this._urlPrefixPrecise;
  }
  serveFile(request, response, absoluteFilePath, headers) {
    try {
      for (const [name, value] of Object.entries(headers || {}))
        response.setHeader(name, value);
      if (request.headers.range)
        this._serveRangeFile(request, response, absoluteFilePath);
      else
        this._serveFile(response, absoluteFilePath);
      return true;
    } catch (e) {
      return false;
    }
  }
  _serveFile(response, absoluteFilePath) {
    const content = import_fs.default.readFileSync(absoluteFilePath);
    response.statusCode = 200;
    const contentType = import_utilsBundle.mime.getType(import_path.default.extname(absoluteFilePath)) || "application/octet-stream";
    response.setHeader("Content-Type", contentType);
    response.setHeader("Content-Length", content.byteLength);
    response.end(content);
  }
  _serveRangeFile(request, response, absoluteFilePath) {
    const range = request.headers.range;
    if (!range || !range.startsWith("bytes=") || range.includes(", ") || [...range].filter((char) => char === "-").length !== 1) {
      response.statusCode = 400;
      return response.end("Bad request");
    }
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    let start;
    let end;
    const size = import_fs.default.statSync(absoluteFilePath).size;
    if (startStr !== "" && endStr === "") {
      start = +startStr;
      end = size - 1;
    } else if (startStr === "" && endStr !== "") {
      start = size - +endStr;
      end = size - 1;
    } else {
      start = +startStr;
      end = +endStr;
    }
    if (Number.isNaN(start) || Number.isNaN(end) || start >= size || end >= size || start > end) {
      response.writeHead(416, {
        "Content-Range": `bytes */${size}`
      });
      return response.end();
    }
    response.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": import_utilsBundle.mime.getType(import_path.default.extname(absoluteFilePath))
    });
    const readable = import_fs.default.createReadStream(absoluteFilePath, { start, end });
    readable.pipe(response);
  }
  _onRequest(request, response) {
    if (request.method === "OPTIONS") {
      response.writeHead(200);
      response.end();
      return;
    }
    request.on("error", () => response.end());
    try {
      if (!request.url) {
        response.end();
        return;
      }
      const url = new URL("http://localhost" + request.url);
      for (const route of this._routes) {
        if (route.exact && url.pathname === route.exact && route.handler(request, response))
          return;
        if (route.prefix && url.pathname.startsWith(route.prefix) && route.handler(request, response))
          return;
      }
      response.statusCode = 404;
      response.end();
    } catch (e) {
      response.end();
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HttpServer
});
