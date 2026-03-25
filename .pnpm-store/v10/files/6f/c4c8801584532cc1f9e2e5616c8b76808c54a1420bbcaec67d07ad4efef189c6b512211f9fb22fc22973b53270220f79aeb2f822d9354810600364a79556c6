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
var happyEyeballs_exports = {};
__export(happyEyeballs_exports, {
  createConnectionAsync: () => createConnectionAsync,
  createSocket: () => createSocket,
  createTLSSocket: () => createTLSSocket,
  httpHappyEyeballsAgent: () => httpHappyEyeballsAgent,
  httpsHappyEyeballsAgent: () => httpsHappyEyeballsAgent,
  timingForSocket: () => timingForSocket
});
module.exports = __toCommonJS(happyEyeballs_exports);
var import_dns = __toESM(require("dns"));
var import_http = __toESM(require("http"));
var import_https = __toESM(require("https"));
var import_net = __toESM(require("net"));
var import_tls = __toESM(require("tls"));
var import_assert = require("../../utils/isomorphic/assert");
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
var import_time = require("../../utils/isomorphic/time");
const connectionAttemptDelayMs = 300;
const kDNSLookupAt = Symbol("kDNSLookupAt");
const kTCPConnectionAt = Symbol("kTCPConnectionAt");
class HttpHappyEyeballsAgent extends import_http.default.Agent {
  createConnection(options, oncreate) {
    if (import_net.default.isIP(clientRequestArgsToHostName(options)))
      return import_net.default.createConnection(options);
    createConnectionAsync(
      options,
      oncreate,
      /* useTLS */
      false
    ).catch((err) => oncreate?.(err));
  }
}
class HttpsHappyEyeballsAgent extends import_https.default.Agent {
  createConnection(options, oncreate) {
    if (import_net.default.isIP(clientRequestArgsToHostName(options)))
      return import_tls.default.connect(options);
    createConnectionAsync(
      options,
      oncreate,
      /* useTLS */
      true
    ).catch((err) => oncreate?.(err));
  }
}
const httpsHappyEyeballsAgent = new HttpsHappyEyeballsAgent({ keepAlive: true });
const httpHappyEyeballsAgent = new HttpHappyEyeballsAgent({ keepAlive: true });
async function createSocket(host, port) {
  return new Promise((resolve, reject) => {
    if (import_net.default.isIP(host)) {
      const socket = import_net.default.createConnection({ host, port });
      socket.on("connect", () => resolve(socket));
      socket.on("error", (error) => reject(error));
    } else {
      createConnectionAsync(
        { host, port },
        (err, socket) => {
          if (err)
            reject(err);
          if (socket)
            resolve(socket);
        },
        /* useTLS */
        false
      ).catch((err) => reject(err));
    }
  });
}
async function createTLSSocket(options) {
  return new Promise((resolve, reject) => {
    (0, import_assert.assert)(options.host, "host is required");
    if (import_net.default.isIP(options.host)) {
      const socket = import_tls.default.connect(options);
      socket.on("secureConnect", () => resolve(socket));
      socket.on("error", (error) => reject(error));
    } else {
      createConnectionAsync(options, (err, socket) => {
        if (err)
          reject(err);
        if (socket) {
          socket.on("secureConnect", () => resolve(socket));
          socket.on("error", (error) => reject(error));
        }
      }, true).catch((err) => reject(err));
    }
  });
}
async function createConnectionAsync(options, oncreate, useTLS) {
  const lookup = options.__testHookLookup || lookupAddresses;
  const hostname = clientRequestArgsToHostName(options);
  const addresses = await lookup(hostname);
  const dnsLookupAt = (0, import_time.monotonicTime)();
  const sockets = /* @__PURE__ */ new Set();
  let firstError;
  let errorCount = 0;
  const handleError = (socket, err) => {
    if (!sockets.delete(socket))
      return;
    ++errorCount;
    firstError ??= err;
    if (errorCount === addresses.length)
      oncreate?.(firstError);
  };
  const connected = new import_manualPromise.ManualPromise();
  for (const { address } of addresses) {
    const socket = useTLS ? import_tls.default.connect({
      ...options,
      port: options.port,
      host: address,
      servername: hostname
    }) : import_net.default.createConnection({
      ...options,
      port: options.port,
      host: address
    });
    socket[kDNSLookupAt] = dnsLookupAt;
    socket.on("connect", () => {
      socket[kTCPConnectionAt] = (0, import_time.monotonicTime)();
      connected.resolve();
      oncreate?.(null, socket);
      sockets.delete(socket);
      for (const s of sockets)
        s.destroy();
      sockets.clear();
    });
    socket.on("timeout", () => {
      socket.destroy();
      handleError(socket, new Error("Connection timeout"));
    });
    socket.on("error", (e) => handleError(socket, e));
    sockets.add(socket);
    await Promise.race([
      connected,
      new Promise((f) => setTimeout(f, connectionAttemptDelayMs))
    ]);
    if (connected.isDone())
      break;
  }
}
async function lookupAddresses(hostname) {
  const addresses = await import_dns.default.promises.lookup(hostname, { all: true, family: 0, verbatim: true });
  let firstFamily = addresses.filter(({ family }) => family === 6);
  let secondFamily = addresses.filter(({ family }) => family === 4);
  if (firstFamily.length && firstFamily[0] !== addresses[0]) {
    const tmp = firstFamily;
    firstFamily = secondFamily;
    secondFamily = tmp;
  }
  const result = [];
  for (let i = 0; i < Math.max(firstFamily.length, secondFamily.length); i++) {
    if (firstFamily[i])
      result.push(firstFamily[i]);
    if (secondFamily[i])
      result.push(secondFamily[i]);
  }
  return result;
}
function clientRequestArgsToHostName(options) {
  if (options.hostname)
    return options.hostname;
  if (options.host)
    return options.host;
  throw new Error("Either options.hostname or options.host must be provided");
}
function timingForSocket(socket) {
  return {
    dnsLookupAt: socket[kDNSLookupAt],
    tcpConnectionAt: socket[kTCPConnectionAt]
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createConnectionAsync,
  createSocket,
  createTLSSocket,
  httpHappyEyeballsAgent,
  httpsHappyEyeballsAgent,
  timingForSocket
});
