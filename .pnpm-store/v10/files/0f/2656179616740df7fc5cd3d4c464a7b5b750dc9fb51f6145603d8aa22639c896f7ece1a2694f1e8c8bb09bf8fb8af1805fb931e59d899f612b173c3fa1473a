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
var transport_exports = {};
__export(transport_exports, {
  WebSocketTransport: () => WebSocketTransport,
  perMessageDeflate: () => perMessageDeflate
});
module.exports = __toCommonJS(transport_exports);
var import_utils = require("../utils");
var import_happyEyeballs = require("./utils/happyEyeballs");
var import_utilsBundle = require("../utilsBundle");
const perMessageDeflate = {
  clientNoContextTakeover: true,
  zlibDeflateOptions: {
    level: 3
  },
  zlibInflateOptions: {
    chunkSize: 10 * 1024
  },
  threshold: 10 * 1024
};
class WebSocketTransport {
  constructor(progress, url, logUrl, options) {
    this.headers = [];
    this.wsEndpoint = url;
    this._logUrl = logUrl;
    this._ws = new import_utilsBundle.ws(url, [], {
      maxPayload: 256 * 1024 * 1024,
      // 256Mb,
      headers: options.headers,
      followRedirects: options.followRedirects,
      agent: /^(https|wss):\/\//.test(url) ? import_happyEyeballs.httpsHappyEyeballsAgent : import_happyEyeballs.httpHappyEyeballsAgent,
      perMessageDeflate
    });
    this._ws.on("upgrade", (response) => {
      for (let i = 0; i < response.rawHeaders.length; i += 2) {
        this.headers.push({ name: response.rawHeaders[i], value: response.rawHeaders[i + 1] });
        if (options.debugLogHeader && response.rawHeaders[i] === options.debugLogHeader)
          progress?.log(response.rawHeaders[i + 1]);
      }
    });
    this._progress = progress;
    const messageWrap = (0, import_utils.makeWaitForNextTask)();
    this._ws.addEventListener("message", (event) => {
      messageWrap(() => {
        const eventData = event.data;
        let parsedJson;
        try {
          parsedJson = JSON.parse(eventData);
        } catch (e) {
          this._progress?.log(`<closing ws> Closing websocket due to malformed JSON. eventData=${eventData} e=${e?.message}`);
          this._ws.close();
          return;
        }
        try {
          if (this.onmessage)
            this.onmessage.call(null, parsedJson);
        } catch (e) {
          this._progress?.log(`<closing ws> Closing websocket due to failed onmessage callback. eventData=${eventData} e=${e?.message}`);
          this._ws.close();
        }
      });
    });
    this._ws.addEventListener("close", (event) => {
      this._progress?.log(`<ws disconnected> ${logUrl} code=${event.code} reason=${event.reason}`);
      if (this.onclose)
        this.onclose.call(null, event.reason);
    });
    this._ws.addEventListener("error", (error) => this._progress?.log(`<ws error> ${logUrl} ${error.type} ${error.message}`));
  }
  static async connect(progress, url, options = {}) {
    return await WebSocketTransport._connect(
      progress,
      url,
      options,
      false
      /* hadRedirects */
    );
  }
  static async _connect(progress, url, options, hadRedirects) {
    const logUrl = stripQueryParams(url);
    progress?.log(`<ws connecting> ${logUrl}`);
    const transport = new WebSocketTransport(progress, url, logUrl, { ...options, followRedirects: !!options.followRedirects && hadRedirects });
    const resultPromise = new Promise((fulfill, reject) => {
      transport._ws.on("open", async () => {
        progress?.log(`<ws connected> ${logUrl}`);
        fulfill({});
      });
      transport._ws.on("error", (event) => {
        progress?.log(`<ws connect error> ${logUrl} ${event.message}`);
        reject(new Error("WebSocket error: " + event.message));
        transport._ws.close();
      });
      transport._ws.on("unexpected-response", (request, response) => {
        if (options.followRedirects && !hadRedirects && (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308)) {
          fulfill({ redirect: response });
          transport._ws.close();
          return;
        }
        for (let i = 0; i < response.rawHeaders.length; i += 2) {
          if (options.debugLogHeader && response.rawHeaders[i] === options.debugLogHeader)
            progress?.log(response.rawHeaders[i + 1]);
        }
        const chunks = [];
        const errorPrefix = `${logUrl} ${response.statusCode} ${response.statusMessage}`;
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("close", () => {
          const error = chunks.length ? `${errorPrefix}
${Buffer.concat(chunks)}` : errorPrefix;
          progress?.log(`<ws unexpected response> ${error}`);
          reject(new Error("WebSocket error: " + error));
          transport._ws.close();
        });
      });
    });
    try {
      const result = progress ? await progress.race(resultPromise) : await resultPromise;
      if (result.redirect) {
        const newHeaders = Object.fromEntries(Object.entries(options.headers || {}).filter(([name]) => {
          return !name.includes("access-key") && name.toLowerCase() !== "authorization";
        }));
        return WebSocketTransport._connect(
          progress,
          result.redirect.headers.location,
          { ...options, headers: newHeaders },
          true
          /* hadRedirects */
        );
      }
      return transport;
    } catch (error) {
      await transport.closeAndWait();
      throw error;
    }
  }
  send(message) {
    this._ws.send(JSON.stringify(message));
  }
  close() {
    this._progress?.log(`<ws disconnecting> ${this._logUrl}`);
    this._ws.close();
  }
  async closeAndWait() {
    if (this._ws.readyState === import_utilsBundle.ws.CLOSED)
      return;
    const promise = new Promise((f) => this._ws.once("close", f));
    this.close();
    await promise;
  }
}
function stripQueryParams(url) {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebSocketTransport,
  perMessageDeflate
});
