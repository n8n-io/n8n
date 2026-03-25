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
var socksProxy_exports = {};
__export(socksProxy_exports, {
  SocksProxy: () => SocksProxy,
  SocksProxyHandler: () => SocksProxyHandler,
  parsePattern: () => parsePattern
});
module.exports = __toCommonJS(socksProxy_exports);
var import_events = __toESM(require("events"));
var import_net = __toESM(require("net"));
var import_assert = require("../../utils/isomorphic/assert");
var import_crypto = require("./crypto");
var import_debugLogger = require("./debugLogger");
var import_happyEyeballs = require("./happyEyeballs");
var SocksAuth = /* @__PURE__ */ ((SocksAuth2) => {
  SocksAuth2[SocksAuth2["NO_AUTHENTICATION_REQUIRED"] = 0] = "NO_AUTHENTICATION_REQUIRED";
  SocksAuth2[SocksAuth2["GSSAPI"] = 1] = "GSSAPI";
  SocksAuth2[SocksAuth2["USERNAME_PASSWORD"] = 2] = "USERNAME_PASSWORD";
  SocksAuth2[SocksAuth2["NO_ACCEPTABLE_METHODS"] = 255] = "NO_ACCEPTABLE_METHODS";
  return SocksAuth2;
})(SocksAuth || {});
var SocksAddressType = /* @__PURE__ */ ((SocksAddressType2) => {
  SocksAddressType2[SocksAddressType2["IPv4"] = 1] = "IPv4";
  SocksAddressType2[SocksAddressType2["FqName"] = 3] = "FqName";
  SocksAddressType2[SocksAddressType2["IPv6"] = 4] = "IPv6";
  return SocksAddressType2;
})(SocksAddressType || {});
var SocksCommand = /* @__PURE__ */ ((SocksCommand2) => {
  SocksCommand2[SocksCommand2["CONNECT"] = 1] = "CONNECT";
  SocksCommand2[SocksCommand2["BIND"] = 2] = "BIND";
  SocksCommand2[SocksCommand2["UDP_ASSOCIATE"] = 3] = "UDP_ASSOCIATE";
  return SocksCommand2;
})(SocksCommand || {});
var SocksReply = /* @__PURE__ */ ((SocksReply2) => {
  SocksReply2[SocksReply2["Succeeded"] = 0] = "Succeeded";
  SocksReply2[SocksReply2["GeneralServerFailure"] = 1] = "GeneralServerFailure";
  SocksReply2[SocksReply2["NotAllowedByRuleSet"] = 2] = "NotAllowedByRuleSet";
  SocksReply2[SocksReply2["NetworkUnreachable"] = 3] = "NetworkUnreachable";
  SocksReply2[SocksReply2["HostUnreachable"] = 4] = "HostUnreachable";
  SocksReply2[SocksReply2["ConnectionRefused"] = 5] = "ConnectionRefused";
  SocksReply2[SocksReply2["TtlExpired"] = 6] = "TtlExpired";
  SocksReply2[SocksReply2["CommandNotSupported"] = 7] = "CommandNotSupported";
  SocksReply2[SocksReply2["AddressTypeNotSupported"] = 8] = "AddressTypeNotSupported";
  return SocksReply2;
})(SocksReply || {});
class SocksConnection {
  constructor(uid, socket, client) {
    this._buffer = Buffer.from([]);
    this._offset = 0;
    this._fence = 0;
    this._uid = uid;
    this._socket = socket;
    this._client = client;
    this._boundOnData = this._onData.bind(this);
    socket.on("data", this._boundOnData);
    socket.on("close", () => this._onClose());
    socket.on("end", () => this._onClose());
    socket.on("error", () => this._onClose());
    this._run().catch(() => this._socket.end());
  }
  async _run() {
    (0, import_assert.assert)(await this._authenticate());
    const { command, host, port } = await this._parseRequest();
    if (command !== 1 /* CONNECT */) {
      this._writeBytes(Buffer.from([
        5,
        7 /* CommandNotSupported */,
        0,
        // RSV
        1,
        // IPv4
        0,
        0,
        0,
        0,
        // Address
        0,
        0
        // Port
      ]));
      return;
    }
    this._socket.off("data", this._boundOnData);
    this._client.onSocketRequested({ uid: this._uid, host, port });
  }
  async _authenticate() {
    const version = await this._readByte();
    (0, import_assert.assert)(version === 5, "The VER field must be set to x05 for this version of the protocol, was " + version);
    const nMethods = await this._readByte();
    (0, import_assert.assert)(nMethods, "No authentication methods specified");
    const methods = await this._readBytes(nMethods);
    for (const method of methods) {
      if (method === 0) {
        this._writeBytes(Buffer.from([version, method]));
        return true;
      }
    }
    this._writeBytes(Buffer.from([version, 255 /* NO_ACCEPTABLE_METHODS */]));
    return false;
  }
  async _parseRequest() {
    const version = await this._readByte();
    (0, import_assert.assert)(version === 5, "The VER field must be set to x05 for this version of the protocol, was " + version);
    const command = await this._readByte();
    await this._readByte();
    const addressType = await this._readByte();
    let host = "";
    switch (addressType) {
      case 1 /* IPv4 */:
        host = (await this._readBytes(4)).join(".");
        break;
      case 3 /* FqName */:
        const length = await this._readByte();
        host = (await this._readBytes(length)).toString();
        break;
      case 4 /* IPv6 */:
        const bytes = await this._readBytes(16);
        const tokens = [];
        for (let i = 0; i < 8; ++i)
          tokens.push(bytes.readUInt16BE(i * 2).toString(16));
        host = tokens.join(":");
        break;
    }
    const port = (await this._readBytes(2)).readUInt16BE(0);
    this._buffer = Buffer.from([]);
    this._offset = 0;
    this._fence = 0;
    return {
      command,
      host,
      port
    };
  }
  async _readByte() {
    const buffer = await this._readBytes(1);
    return buffer[0];
  }
  async _readBytes(length) {
    this._fence = this._offset + length;
    if (!this._buffer || this._buffer.length < this._fence)
      await new Promise((f) => this._fenceCallback = f);
    this._offset += length;
    return this._buffer.slice(this._offset - length, this._offset);
  }
  _writeBytes(buffer) {
    if (this._socket.writable)
      this._socket.write(buffer);
  }
  _onClose() {
    this._client.onSocketClosed({ uid: this._uid });
  }
  _onData(buffer) {
    this._buffer = Buffer.concat([this._buffer, buffer]);
    if (this._fenceCallback && this._buffer.length >= this._fence) {
      const callback = this._fenceCallback;
      this._fenceCallback = void 0;
      callback();
    }
  }
  socketConnected(host, port) {
    this._writeBytes(Buffer.from([
      5,
      0 /* Succeeded */,
      0,
      // RSV
      ...ipToSocksAddress(host),
      // ATYP, Address
      port >> 8,
      port & 255
      // Port
    ]));
    this._socket.on("data", (data) => this._client.onSocketData({ uid: this._uid, data }));
  }
  socketFailed(errorCode) {
    const buffer = Buffer.from([
      5,
      0,
      0,
      // RSV
      ...ipToSocksAddress("0.0.0.0"),
      // ATYP, Address
      0,
      0
      // Port
    ]);
    switch (errorCode) {
      case "ENOENT":
      case "ENOTFOUND":
      case "ETIMEDOUT":
      case "EHOSTUNREACH":
        buffer[1] = 4 /* HostUnreachable */;
        break;
      case "ENETUNREACH":
        buffer[1] = 3 /* NetworkUnreachable */;
        break;
      case "ECONNREFUSED":
        buffer[1] = 5 /* ConnectionRefused */;
        break;
      case "ERULESET":
        buffer[1] = 2 /* NotAllowedByRuleSet */;
        break;
    }
    this._writeBytes(buffer);
    this._socket.end();
  }
  sendData(data) {
    this._socket.write(data);
  }
  end() {
    this._socket.end();
  }
  error(error) {
    this._socket.destroy(new Error(error));
  }
}
function hexToNumber(hex) {
  return [...hex].reduce((value, digit) => {
    const code = digit.charCodeAt(0);
    if (code >= 48 && code <= 57)
      return value + code;
    if (code >= 97 && code <= 102)
      return value + (code - 97) + 10;
    if (code >= 65 && code <= 70)
      return value + (code - 65) + 10;
    throw new Error("Invalid IPv6 token " + hex);
  }, 0);
}
function ipToSocksAddress(address) {
  if (import_net.default.isIPv4(address)) {
    return [
      1,
      // IPv4
      ...address.split(".", 4).map((t) => +t & 255)
      // Address
    ];
  }
  if (import_net.default.isIPv6(address)) {
    const result = [4];
    const tokens = address.split(":", 8);
    while (tokens.length < 8)
      tokens.unshift("");
    for (const token of tokens) {
      const value = hexToNumber(token);
      result.push(value >> 8 & 255, value & 255);
    }
    return result;
  }
  throw new Error("Only IPv4 and IPv6 addresses are supported");
}
function starMatchToRegex(pattern) {
  const source = pattern.split("*").map((s) => {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join(".*");
  return new RegExp("^" + source + "$");
}
function parsePattern(pattern) {
  if (!pattern)
    return () => false;
  const matchers = pattern.split(",").map((token) => {
    const match = token.match(/^(.*?)(?::(\d+))?$/);
    if (!match)
      throw new Error(`Unsupported token "${token}" in pattern "${pattern}"`);
    const tokenPort = match[2] ? +match[2] : void 0;
    const portMatches = (port) => tokenPort === void 0 || tokenPort === port;
    let tokenHost = match[1];
    if (tokenHost === "<loopback>") {
      return (host, port) => {
        if (!portMatches(port))
          return false;
        return host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "[::1]";
      };
    }
    if (tokenHost === "*")
      return (host, port) => portMatches(port);
    if (import_net.default.isIPv4(tokenHost) || import_net.default.isIPv6(tokenHost))
      return (host, port) => host === tokenHost && portMatches(port);
    if (tokenHost[0] === ".")
      tokenHost = "*" + tokenHost;
    const tokenRegex = starMatchToRegex(tokenHost);
    return (host, port) => {
      if (!portMatches(port))
        return false;
      if (import_net.default.isIPv4(host) || import_net.default.isIPv6(host))
        return false;
      return !!host.match(tokenRegex);
    };
  });
  return (host, port) => matchers.some((matcher) => matcher(host, port));
}
class SocksProxy extends import_events.default {
  constructor() {
    super();
    this._connections = /* @__PURE__ */ new Map();
    this._sockets = /* @__PURE__ */ new Set();
    this._closed = false;
    this._patternMatcher = () => false;
    this._directSockets = /* @__PURE__ */ new Map();
    this._server = new import_net.default.Server((socket) => {
      const uid = (0, import_crypto.createGuid)();
      const connection = new SocksConnection(uid, socket, this);
      this._connections.set(uid, connection);
    });
    this._server.on("connection", (socket) => {
      if (this._closed) {
        socket.destroy();
        return;
      }
      this._sockets.add(socket);
      socket.once("close", () => this._sockets.delete(socket));
    });
  }
  static {
    this.Events = {
      SocksRequested: "socksRequested",
      SocksData: "socksData",
      SocksClosed: "socksClosed"
    };
  }
  setPattern(pattern) {
    try {
      this._patternMatcher = parsePattern(pattern);
    } catch (e) {
      this._patternMatcher = () => false;
    }
  }
  async _handleDirect(request) {
    try {
      const socket = await (0, import_happyEyeballs.createSocket)(request.host, request.port);
      socket.on("data", (data) => this._connections.get(request.uid)?.sendData(data));
      socket.on("error", (error) => {
        this._connections.get(request.uid)?.error(error.message);
        this._directSockets.delete(request.uid);
      });
      socket.on("end", () => {
        this._connections.get(request.uid)?.end();
        this._directSockets.delete(request.uid);
      });
      const localAddress = socket.localAddress;
      const localPort = socket.localPort;
      this._directSockets.set(request.uid, socket);
      this._connections.get(request.uid)?.socketConnected(localAddress, localPort);
    } catch (error) {
      this._connections.get(request.uid)?.socketFailed(error.code);
    }
  }
  port() {
    return this._port;
  }
  async listen(port, hostname) {
    return new Promise((f) => {
      this._server.listen(port, hostname, () => {
        const port2 = this._server.address().port;
        this._port = port2;
        f(port2);
      });
    });
  }
  async close() {
    if (this._closed)
      return;
    this._closed = true;
    for (const socket of this._sockets)
      socket.destroy();
    this._sockets.clear();
    await new Promise((f) => this._server.close(f));
  }
  onSocketRequested(payload) {
    if (!this._patternMatcher(payload.host, payload.port)) {
      this._handleDirect(payload);
      return;
    }
    this.emit(SocksProxy.Events.SocksRequested, payload);
  }
  onSocketData(payload) {
    const direct = this._directSockets.get(payload.uid);
    if (direct) {
      direct.write(payload.data);
      return;
    }
    this.emit(SocksProxy.Events.SocksData, payload);
  }
  onSocketClosed(payload) {
    const direct = this._directSockets.get(payload.uid);
    if (direct) {
      direct.destroy();
      this._directSockets.delete(payload.uid);
      return;
    }
    this.emit(SocksProxy.Events.SocksClosed, payload);
  }
  socketConnected({ uid, host, port }) {
    this._connections.get(uid)?.socketConnected(host, port);
  }
  socketFailed({ uid, errorCode }) {
    this._connections.get(uid)?.socketFailed(errorCode);
  }
  sendSocketData({ uid, data }) {
    this._connections.get(uid)?.sendData(data);
  }
  sendSocketEnd({ uid }) {
    this._connections.get(uid)?.end();
  }
  sendSocketError({ uid, error }) {
    this._connections.get(uid)?.error(error);
  }
}
class SocksProxyHandler extends import_events.default {
  constructor(pattern, redirectPortForTest) {
    super();
    this._sockets = /* @__PURE__ */ new Map();
    this._patternMatcher = () => false;
    this._patternMatcher = parsePattern(pattern);
    this._redirectPortForTest = redirectPortForTest;
  }
  static {
    this.Events = {
      SocksConnected: "socksConnected",
      SocksData: "socksData",
      SocksError: "socksError",
      SocksFailed: "socksFailed",
      SocksEnd: "socksEnd"
    };
  }
  cleanup() {
    for (const uid of this._sockets.keys())
      this.socketClosed({ uid });
  }
  async socketRequested({ uid, host, port }) {
    import_debugLogger.debugLogger.log("socks", `[${uid}] => request ${host}:${port}`);
    if (!this._patternMatcher(host, port)) {
      const payload = { uid, errorCode: "ERULESET" };
      import_debugLogger.debugLogger.log("socks", `[${uid}] <= pattern error ${payload.errorCode}`);
      this.emit(SocksProxyHandler.Events.SocksFailed, payload);
      return;
    }
    if (host === "local.playwright")
      host = "localhost";
    try {
      if (this._redirectPortForTest)
        port = this._redirectPortForTest;
      const socket = await (0, import_happyEyeballs.createSocket)(host, port);
      socket.on("data", (data) => {
        const payload2 = { uid, data };
        this.emit(SocksProxyHandler.Events.SocksData, payload2);
      });
      socket.on("error", (error) => {
        const payload2 = { uid, error: error.message };
        import_debugLogger.debugLogger.log("socks", `[${uid}] <= network socket error ${payload2.error}`);
        this.emit(SocksProxyHandler.Events.SocksError, payload2);
        this._sockets.delete(uid);
      });
      socket.on("end", () => {
        const payload2 = { uid };
        import_debugLogger.debugLogger.log("socks", `[${uid}] <= network socket closed`);
        this.emit(SocksProxyHandler.Events.SocksEnd, payload2);
        this._sockets.delete(uid);
      });
      const localAddress = socket.localAddress;
      const localPort = socket.localPort;
      this._sockets.set(uid, socket);
      const payload = { uid, host: localAddress, port: localPort };
      import_debugLogger.debugLogger.log("socks", `[${uid}] <= connected to network ${payload.host}:${payload.port}`);
      this.emit(SocksProxyHandler.Events.SocksConnected, payload);
    } catch (error) {
      const payload = { uid, errorCode: error.code };
      import_debugLogger.debugLogger.log("socks", `[${uid}] <= connect error ${payload.errorCode}`);
      this.emit(SocksProxyHandler.Events.SocksFailed, payload);
    }
  }
  sendSocketData({ uid, data }) {
    this._sockets.get(uid)?.write(data);
  }
  socketClosed({ uid }) {
    import_debugLogger.debugLogger.log("socks", `[${uid}] <= browser socket closed`);
    this._sockets.get(uid)?.destroy();
    this._sockets.delete(uid);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SocksProxy,
  SocksProxyHandler,
  parsePattern
});
