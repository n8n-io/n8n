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
var cdpRelay_exports = {};
__export(cdpRelay_exports, {
  CDPRelayServer: () => CDPRelayServer
});
module.exports = __toCommonJS(cdpRelay_exports);
var import_child_process = require("child_process");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_registry = require("playwright-core/lib/server/registry/index");
var import_utils = require("playwright-core/lib/utils");
var import_http2 = require("../sdk/http");
var import_log = require("../log");
var protocol = __toESM(require("./protocol"));
const debugLogger = (0, import_utilsBundle.debug)("pw:mcp:relay");
class CDPRelayServer {
  constructor(server, browserChannel, userDataDir, executablePath) {
    this._playwrightConnection = null;
    this._extensionConnection = null;
    this._nextSessionId = 1;
    this._wsHost = (0, import_http2.addressToString)(server.address(), { protocol: "ws" });
    this._browserChannel = browserChannel;
    this._userDataDir = userDataDir;
    this._executablePath = executablePath;
    const uuid = crypto.randomUUID();
    this._cdpPath = `/cdp/${uuid}`;
    this._extensionPath = `/extension/${uuid}`;
    this._resetExtensionConnection();
    this._wss = new import_utilsBundle.wsServer({ server });
    this._wss.on("connection", this._onConnection.bind(this));
  }
  cdpEndpoint() {
    return `${this._wsHost}${this._cdpPath}`;
  }
  extensionEndpoint() {
    return `${this._wsHost}${this._extensionPath}`;
  }
  async ensureExtensionConnectionForMCPContext(clientInfo, abortSignal, toolName) {
    debugLogger("Ensuring extension connection for MCP context");
    if (this._extensionConnection)
      return;
    this._connectBrowser(clientInfo, toolName);
    debugLogger("Waiting for incoming extension connection");
    await Promise.race([
      this._extensionConnectionPromise,
      new Promise((_, reject) => setTimeout(() => {
        reject(new Error(`Extension connection timeout. Make sure the "Playwright MCP Bridge" extension is installed. See https://github.com/microsoft/playwright-mcp/blob/main/extension/README.md for installation instructions.`));
      }, process.env.PWMCP_TEST_CONNECTION_TIMEOUT ? parseInt(process.env.PWMCP_TEST_CONNECTION_TIMEOUT, 10) : 5e3)),
      new Promise((_, reject) => abortSignal.addEventListener("abort", reject))
    ]);
    debugLogger("Extension connection established");
  }
  _connectBrowser(clientInfo, toolName) {
    const mcpRelayEndpoint = `${this._wsHost}${this._extensionPath}`;
    const url = new URL("chrome-extension://jakfalbnbhgkpmoaakfflhflbfpkailf/connect.html");
    url.searchParams.set("mcpRelayUrl", mcpRelayEndpoint);
    const client = {
      name: clientInfo.name,
      version: clientInfo.version
    };
    url.searchParams.set("client", JSON.stringify(client));
    url.searchParams.set("protocolVersion", process.env.PWMCP_TEST_PROTOCOL_VERSION ?? protocol.VERSION.toString());
    if (toolName)
      url.searchParams.set("newTab", String(toolName === "browser_navigate"));
    const token = process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN;
    if (token)
      url.searchParams.set("token", token);
    const href = url.toString();
    let executablePath = this._executablePath;
    if (!executablePath) {
      const executableInfo = import_registry.registry.findExecutable(this._browserChannel);
      if (!executableInfo)
        throw new Error(`Unsupported channel: "${this._browserChannel}"`);
      executablePath = executableInfo.executablePath("javascript");
      if (!executablePath)
        throw new Error(`"${this._browserChannel}" executable not found. Make sure it is installed at a standard location.`);
    }
    const args = [];
    if (this._userDataDir)
      args.push(`--user-data-dir=${this._userDataDir}`);
    args.push(href);
    (0, import_child_process.spawn)(executablePath, args, {
      windowsHide: true,
      detached: true,
      shell: false,
      stdio: "ignore"
    });
  }
  stop() {
    this.closeConnections("Server stopped");
    this._wss.close();
  }
  closeConnections(reason) {
    this._closePlaywrightConnection(reason);
    this._closeExtensionConnection(reason);
  }
  _onConnection(ws2, request) {
    const url = new URL(`http://localhost${request.url}`);
    debugLogger(`New connection to ${url.pathname}`);
    if (url.pathname === this._cdpPath) {
      this._handlePlaywrightConnection(ws2);
    } else if (url.pathname === this._extensionPath) {
      this._handleExtensionConnection(ws2);
    } else {
      debugLogger(`Invalid path: ${url.pathname}`);
      ws2.close(4004, "Invalid path");
    }
  }
  _handlePlaywrightConnection(ws2) {
    if (this._playwrightConnection) {
      debugLogger("Rejecting second Playwright connection");
      ws2.close(1e3, "Another CDP client already connected");
      return;
    }
    this._playwrightConnection = ws2;
    ws2.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this._handlePlaywrightMessage(message);
      } catch (error) {
        debugLogger(`Error while handling Playwright message
${data.toString()}
`, error);
      }
    });
    ws2.on("close", () => {
      if (this._playwrightConnection !== ws2)
        return;
      this._playwrightConnection = null;
      this._closeExtensionConnection("Playwright client disconnected");
      debugLogger("Playwright WebSocket closed");
    });
    ws2.on("error", (error) => {
      debugLogger("Playwright WebSocket error:", error);
    });
    debugLogger("Playwright MCP connected");
  }
  _closeExtensionConnection(reason) {
    this._extensionConnection?.close(reason);
    this._extensionConnectionPromise.reject(new Error(reason));
    this._resetExtensionConnection();
  }
  _resetExtensionConnection() {
    this._connectedTabInfo = void 0;
    this._extensionConnection = null;
    this._extensionConnectionPromise = new import_utils.ManualPromise();
    void this._extensionConnectionPromise.catch(import_log.logUnhandledError);
  }
  _closePlaywrightConnection(reason) {
    if (this._playwrightConnection?.readyState === import_utilsBundle.ws.OPEN)
      this._playwrightConnection.close(1e3, reason);
    this._playwrightConnection = null;
  }
  _handleExtensionConnection(ws2) {
    if (this._extensionConnection) {
      ws2.close(1e3, "Another extension connection already established");
      return;
    }
    this._extensionConnection = new ExtensionConnection(ws2);
    this._extensionConnection.onclose = (c, reason) => {
      debugLogger("Extension WebSocket closed:", reason, c === this._extensionConnection);
      if (this._extensionConnection !== c)
        return;
      this._resetExtensionConnection();
      this._closePlaywrightConnection(`Extension disconnected: ${reason}`);
    };
    this._extensionConnection.onmessage = this._handleExtensionMessage.bind(this);
    this._extensionConnectionPromise.resolve();
  }
  _handleExtensionMessage(method, params) {
    switch (method) {
      case "forwardCDPEvent":
        const sessionId = params.sessionId || this._connectedTabInfo?.sessionId;
        this._sendToPlaywright({
          sessionId,
          method: params.method,
          params: params.params
        });
        break;
    }
  }
  async _handlePlaywrightMessage(message) {
    debugLogger("\u2190 Playwright:", `${message.method} (id=${message.id})`);
    const { id, sessionId, method, params } = message;
    try {
      const result = await this._handleCDPCommand(method, params, sessionId);
      this._sendToPlaywright({ id, sessionId, result });
    } catch (e) {
      debugLogger("Error in the extension:", e);
      this._sendToPlaywright({
        id,
        sessionId,
        error: { message: e.message }
      });
    }
  }
  async _handleCDPCommand(method, params, sessionId) {
    switch (method) {
      case "Browser.getVersion": {
        return {
          protocolVersion: "1.3",
          product: "Chrome/Extension-Bridge",
          userAgent: "CDP-Bridge-Server/1.0.0"
        };
      }
      case "Browser.setDownloadBehavior": {
        return {};
      }
      case "Target.setAutoAttach": {
        if (sessionId)
          break;
        const { targetInfo } = await this._extensionConnection.send("attachToTab", {});
        this._connectedTabInfo = {
          targetInfo,
          sessionId: `pw-tab-${this._nextSessionId++}`
        };
        debugLogger("Simulating auto-attach");
        this._sendToPlaywright({
          method: "Target.attachedToTarget",
          params: {
            sessionId: this._connectedTabInfo.sessionId,
            targetInfo: {
              ...this._connectedTabInfo.targetInfo,
              attached: true
            },
            waitingForDebugger: false
          }
        });
        return {};
      }
      case "Target.getTargetInfo": {
        return this._connectedTabInfo?.targetInfo;
      }
    }
    return await this._forwardToExtension(method, params, sessionId);
  }
  async _forwardToExtension(method, params, sessionId) {
    if (!this._extensionConnection)
      throw new Error("Extension not connected");
    if (this._connectedTabInfo?.sessionId === sessionId)
      sessionId = void 0;
    return await this._extensionConnection.send("forwardCDPCommand", { sessionId, method, params });
  }
  _sendToPlaywright(message) {
    debugLogger("\u2192 Playwright:", `${message.method ?? `response(id=${message.id})`}`);
    this._playwrightConnection?.send(JSON.stringify(message));
  }
}
class ExtensionConnection {
  constructor(ws2) {
    this._callbacks = /* @__PURE__ */ new Map();
    this._lastId = 0;
    this._ws = ws2;
    this._ws.on("message", this._onMessage.bind(this));
    this._ws.on("close", this._onClose.bind(this));
    this._ws.on("error", this._onError.bind(this));
  }
  async send(method, params) {
    if (this._ws.readyState !== import_utilsBundle.ws.OPEN)
      throw new Error(`Unexpected WebSocket state: ${this._ws.readyState}`);
    const id = ++this._lastId;
    this._ws.send(JSON.stringify({ id, method, params }));
    const error = new Error(`Protocol error: ${method}`);
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject, error });
    });
  }
  close(message) {
    debugLogger("closing extension connection:", message);
    if (this._ws.readyState === import_utilsBundle.ws.OPEN)
      this._ws.close(1e3, message);
  }
  _onMessage(event) {
    const eventData = event.toString();
    let parsedJson;
    try {
      parsedJson = JSON.parse(eventData);
    } catch (e) {
      debugLogger(`<closing ws> Closing websocket due to malformed JSON. eventData=${eventData} e=${e?.message}`);
      this._ws.close();
      return;
    }
    try {
      this._handleParsedMessage(parsedJson);
    } catch (e) {
      debugLogger(`<closing ws> Closing websocket due to failed onmessage callback. eventData=${eventData} e=${e?.message}`);
      this._ws.close();
    }
  }
  _handleParsedMessage(object) {
    if (object.id && this._callbacks.has(object.id)) {
      const callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error) {
        const error = callback.error;
        error.message = object.error;
        callback.reject(error);
      } else {
        callback.resolve(object.result);
      }
    } else if (object.id) {
      debugLogger("\u2190 Extension: unexpected response", object);
    } else {
      this.onmessage?.(object.method, object.params);
    }
  }
  _onClose(event) {
    debugLogger(`<ws closed> code=${event.code} reason=${event.reason}`);
    this._dispose();
    this.onclose?.(this, event.reason);
  }
  _onError(event) {
    debugLogger(`<ws error> message=${event.message} type=${event.type} target=${event.target}`);
    this._dispose();
  }
  _dispose() {
    for (const callback of this._callbacks.values())
      callback.reject(new Error("WebSocket closed"));
    this._callbacks.clear();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CDPRelayServer
});
