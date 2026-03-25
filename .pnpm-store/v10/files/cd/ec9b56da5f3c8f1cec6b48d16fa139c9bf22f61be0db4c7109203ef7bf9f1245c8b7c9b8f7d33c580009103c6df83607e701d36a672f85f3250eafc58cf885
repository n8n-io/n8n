var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DEFAULT_REQUEST_TIMEOUT: () => DEFAULT_REQUEST_TIMEOUT,
  NodeHttp2Handler: () => NodeHttp2Handler,
  NodeHttpHandler: () => NodeHttpHandler,
  streamCollector: () => streamCollector
});
module.exports = __toCommonJS(src_exports);

// src/node-http-handler.ts
var import_protocol_http = require("@smithy/protocol-http");
var import_querystring_builder = require("@smithy/querystring-builder");
var import_http = require("http");
var import_https = require("https");

// src/constants.ts
var NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "EPIPE", "ETIMEDOUT"];

// src/get-transformed-headers.ts
var getTransformedHeaders = /* @__PURE__ */ __name((headers) => {
  const transformedHeaders = {};
  for (const name of Object.keys(headers)) {
    const headerValues = headers[name];
    transformedHeaders[name] = Array.isArray(headerValues) ? headerValues.join(",") : headerValues;
  }
  return transformedHeaders;
}, "getTransformedHeaders");

// src/timing.ts
var timing = {
  setTimeout: (cb, ms) => setTimeout(cb, ms),
  clearTimeout: (timeoutId) => clearTimeout(timeoutId)
};

// src/set-connection-timeout.ts
var DEFER_EVENT_LISTENER_TIME = 1e3;
var setConnectionTimeout = /* @__PURE__ */ __name((request, reject, timeoutInMs = 0) => {
  if (!timeoutInMs) {
    return -1;
  }
  const registerTimeout = /* @__PURE__ */ __name((offset) => {
    const timeoutId = timing.setTimeout(() => {
      request.destroy();
      reject(
        Object.assign(new Error(`Socket timed out without establishing a connection within ${timeoutInMs} ms`), {
          name: "TimeoutError"
        })
      );
    }, timeoutInMs - offset);
    const doWithSocket = /* @__PURE__ */ __name((socket) => {
      if (socket?.connecting) {
        socket.on("connect", () => {
          timing.clearTimeout(timeoutId);
        });
      } else {
        timing.clearTimeout(timeoutId);
      }
    }, "doWithSocket");
    if (request.socket) {
      doWithSocket(request.socket);
    } else {
      request.on("socket", doWithSocket);
    }
  }, "registerTimeout");
  if (timeoutInMs < 2e3) {
    registerTimeout(0);
    return 0;
  }
  return timing.setTimeout(registerTimeout.bind(null, DEFER_EVENT_LISTENER_TIME), DEFER_EVENT_LISTENER_TIME);
}, "setConnectionTimeout");

// src/set-socket-keep-alive.ts
var DEFER_EVENT_LISTENER_TIME2 = 3e3;
var setSocketKeepAlive = /* @__PURE__ */ __name((request, { keepAlive, keepAliveMsecs }, deferTimeMs = DEFER_EVENT_LISTENER_TIME2) => {
  if (keepAlive !== true) {
    return -1;
  }
  const registerListener = /* @__PURE__ */ __name(() => {
    if (request.socket) {
      request.socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
    } else {
      request.on("socket", (socket) => {
        socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
      });
    }
  }, "registerListener");
  if (deferTimeMs === 0) {
    registerListener();
    return 0;
  }
  return timing.setTimeout(registerListener, deferTimeMs);
}, "setSocketKeepAlive");

// src/set-socket-timeout.ts
var DEFER_EVENT_LISTENER_TIME3 = 3e3;
var setSocketTimeout = /* @__PURE__ */ __name((request, reject, timeoutInMs = DEFAULT_REQUEST_TIMEOUT) => {
  const registerTimeout = /* @__PURE__ */ __name((offset) => {
    const timeout = timeoutInMs - offset;
    const onTimeout = /* @__PURE__ */ __name(() => {
      request.destroy();
      reject(Object.assign(new Error(`Connection timed out after ${timeoutInMs} ms`), { name: "TimeoutError" }));
    }, "onTimeout");
    if (request.socket) {
      request.socket.setTimeout(timeout, onTimeout);
      request.on("close", () => request.socket?.removeListener("timeout", onTimeout));
    } else {
      request.setTimeout(timeout, onTimeout);
    }
  }, "registerTimeout");
  if (0 < timeoutInMs && timeoutInMs < 6e3) {
    registerTimeout(0);
    return 0;
  }
  return timing.setTimeout(
    registerTimeout.bind(null, timeoutInMs === 0 ? 0 : DEFER_EVENT_LISTENER_TIME3),
    DEFER_EVENT_LISTENER_TIME3
  );
}, "setSocketTimeout");

// src/write-request-body.ts
var import_stream = require("stream");
var MIN_WAIT_TIME = 6e3;
async function writeRequestBody(httpRequest, request, maxContinueTimeoutMs = MIN_WAIT_TIME) {
  const headers = request.headers ?? {};
  const expect = headers["Expect"] || headers["expect"];
  let timeoutId = -1;
  let sendBody = true;
  if (expect === "100-continue") {
    sendBody = await Promise.race([
      new Promise((resolve) => {
        timeoutId = Number(timing.setTimeout(() => resolve(true), Math.max(MIN_WAIT_TIME, maxContinueTimeoutMs)));
      }),
      new Promise((resolve) => {
        httpRequest.on("continue", () => {
          timing.clearTimeout(timeoutId);
          resolve(true);
        });
        httpRequest.on("response", () => {
          timing.clearTimeout(timeoutId);
          resolve(false);
        });
        httpRequest.on("error", () => {
          timing.clearTimeout(timeoutId);
          resolve(false);
        });
      })
    ]);
  }
  if (sendBody) {
    writeBody(httpRequest, request.body);
  }
}
__name(writeRequestBody, "writeRequestBody");
function writeBody(httpRequest, body) {
  if (body instanceof import_stream.Readable) {
    body.pipe(httpRequest);
    return;
  }
  if (body) {
    if (Buffer.isBuffer(body) || typeof body === "string") {
      httpRequest.end(body);
      return;
    }
    const uint8 = body;
    if (typeof uint8 === "object" && uint8.buffer && typeof uint8.byteOffset === "number" && typeof uint8.byteLength === "number") {
      httpRequest.end(Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength));
      return;
    }
    httpRequest.end(Buffer.from(body));
    return;
  }
  httpRequest.end();
}
__name(writeBody, "writeBody");

// src/node-http-handler.ts
var DEFAULT_REQUEST_TIMEOUT = 0;
var NodeHttpHandler = class _NodeHttpHandler {
  constructor(options) {
    this.socketWarningTimestamp = 0;
    // Node http handler is hard-coded to http/1.1: https://github.com/nodejs/node/blob/ff5664b83b89c55e4ab5d5f60068fb457f1f5872/lib/_http_server.js#L286
    this.metadata = { handlerProtocol: "http/1.1" };
    this.configProvider = new Promise((resolve, reject) => {
      if (typeof options === "function") {
        options().then((_options) => {
          resolve(this.resolveDefaultConfig(_options));
        }).catch(reject);
      } else {
        resolve(this.resolveDefaultConfig(options));
      }
    });
  }
  static {
    __name(this, "NodeHttpHandler");
  }
  /**
   * @returns the input if it is an HttpHandler of any class,
   * or instantiates a new instance of this handler.
   */
  static create(instanceOrOptions) {
    if (typeof instanceOrOptions?.handle === "function") {
      return instanceOrOptions;
    }
    return new _NodeHttpHandler(instanceOrOptions);
  }
  /**
   * @internal
   *
   * @param agent - http(s) agent in use by the NodeHttpHandler instance.
   * @param socketWarningTimestamp - last socket usage check timestamp.
   * @param logger - channel for the warning.
   * @returns timestamp of last emitted warning.
   */
  static checkSocketUsage(agent, socketWarningTimestamp, logger = console) {
    const { sockets, requests, maxSockets } = agent;
    if (typeof maxSockets !== "number" || maxSockets === Infinity) {
      return socketWarningTimestamp;
    }
    const interval = 15e3;
    if (Date.now() - interval < socketWarningTimestamp) {
      return socketWarningTimestamp;
    }
    if (sockets && requests) {
      for (const origin in sockets) {
        const socketsInUse = sockets[origin]?.length ?? 0;
        const requestsEnqueued = requests[origin]?.length ?? 0;
        if (socketsInUse >= maxSockets && requestsEnqueued >= 2 * maxSockets) {
          logger?.warn?.(
            `@smithy/node-http-handler:WARN - socket usage at capacity=${socketsInUse} and ${requestsEnqueued} additional requests are enqueued.
See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxsockets.html
or increase socketAcquisitionWarningTimeout=(millis) in the NodeHttpHandler config.`
          );
          return Date.now();
        }
      }
    }
    return socketWarningTimestamp;
  }
  resolveDefaultConfig(options) {
    const { requestTimeout, connectionTimeout, socketTimeout, socketAcquisitionWarningTimeout, httpAgent, httpsAgent } = options || {};
    const keepAlive = true;
    const maxSockets = 50;
    return {
      connectionTimeout,
      requestTimeout: requestTimeout ?? socketTimeout,
      socketAcquisitionWarningTimeout,
      httpAgent: (() => {
        if (httpAgent instanceof import_http.Agent || typeof httpAgent?.destroy === "function") {
          return httpAgent;
        }
        return new import_http.Agent({ keepAlive, maxSockets, ...httpAgent });
      })(),
      httpsAgent: (() => {
        if (httpsAgent instanceof import_https.Agent || typeof httpsAgent?.destroy === "function") {
          return httpsAgent;
        }
        return new import_https.Agent({ keepAlive, maxSockets, ...httpsAgent });
      })(),
      logger: console
    };
  }
  destroy() {
    this.config?.httpAgent?.destroy();
    this.config?.httpsAgent?.destroy();
  }
  async handle(request, { abortSignal } = {}) {
    if (!this.config) {
      this.config = await this.configProvider;
    }
    return new Promise((_resolve, _reject) => {
      let writeRequestBodyPromise = void 0;
      const timeouts = [];
      const resolve = /* @__PURE__ */ __name(async (arg) => {
        await writeRequestBodyPromise;
        timeouts.forEach(timing.clearTimeout);
        _resolve(arg);
      }, "resolve");
      const reject = /* @__PURE__ */ __name(async (arg) => {
        await writeRequestBodyPromise;
        timeouts.forEach(timing.clearTimeout);
        _reject(arg);
      }, "reject");
      if (!this.config) {
        throw new Error("Node HTTP request handler config is not resolved");
      }
      if (abortSignal?.aborted) {
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";
        reject(abortError);
        return;
      }
      const isSSL = request.protocol === "https:";
      const agent = isSSL ? this.config.httpsAgent : this.config.httpAgent;
      timeouts.push(
        timing.setTimeout(
          () => {
            this.socketWarningTimestamp = _NodeHttpHandler.checkSocketUsage(
              agent,
              this.socketWarningTimestamp,
              this.config.logger
            );
          },
          this.config.socketAcquisitionWarningTimeout ?? (this.config.requestTimeout ?? 2e3) + (this.config.connectionTimeout ?? 1e3)
        )
      );
      const queryString = (0, import_querystring_builder.buildQueryString)(request.query || {});
      let auth = void 0;
      if (request.username != null || request.password != null) {
        const username = request.username ?? "";
        const password = request.password ?? "";
        auth = `${username}:${password}`;
      }
      let path = request.path;
      if (queryString) {
        path += `?${queryString}`;
      }
      if (request.fragment) {
        path += `#${request.fragment}`;
      }
      let hostname = request.hostname ?? "";
      if (hostname[0] === "[" && hostname.endsWith("]")) {
        hostname = request.hostname.slice(1, -1);
      } else {
        hostname = request.hostname;
      }
      const nodeHttpsOptions = {
        headers: request.headers,
        host: hostname,
        method: request.method,
        path,
        port: request.port,
        agent,
        auth
      };
      const requestFunc = isSSL ? import_https.request : import_http.request;
      const req = requestFunc(nodeHttpsOptions, (res) => {
        const httpResponse = new import_protocol_http.HttpResponse({
          statusCode: res.statusCode || -1,
          reason: res.statusMessage,
          headers: getTransformedHeaders(res.headers),
          body: res
        });
        resolve({ response: httpResponse });
      });
      req.on("error", (err) => {
        if (NODEJS_TIMEOUT_ERROR_CODES.includes(err.code)) {
          reject(Object.assign(err, { name: "TimeoutError" }));
        } else {
          reject(err);
        }
      });
      if (abortSignal) {
        const onAbort = /* @__PURE__ */ __name(() => {
          req.destroy();
          const abortError = new Error("Request aborted");
          abortError.name = "AbortError";
          reject(abortError);
        }, "onAbort");
        if (typeof abortSignal.addEventListener === "function") {
          const signal = abortSignal;
          signal.addEventListener("abort", onAbort, { once: true });
          req.once("close", () => signal.removeEventListener("abort", onAbort));
        } else {
          abortSignal.onabort = onAbort;
        }
      }
      timeouts.push(setConnectionTimeout(req, reject, this.config.connectionTimeout));
      timeouts.push(setSocketTimeout(req, reject, this.config.requestTimeout));
      const httpAgent = nodeHttpsOptions.agent;
      if (typeof httpAgent === "object" && "keepAlive" in httpAgent) {
        timeouts.push(
          setSocketKeepAlive(req, {
            // @ts-expect-error keepAlive is not public on httpAgent.
            keepAlive: httpAgent.keepAlive,
            // @ts-expect-error keepAliveMsecs is not public on httpAgent.
            keepAliveMsecs: httpAgent.keepAliveMsecs
          })
        );
      }
      writeRequestBodyPromise = writeRequestBody(req, request, this.config.requestTimeout).catch((e) => {
        timeouts.forEach(timing.clearTimeout);
        return _reject(e);
      });
    });
  }
  updateHttpClientConfig(key, value) {
    this.config = void 0;
    this.configProvider = this.configProvider.then((config) => {
      return {
        ...config,
        [key]: value
      };
    });
  }
  httpHandlerConfigs() {
    return this.config ?? {};
  }
};

// src/node-http2-handler.ts


var import_http22 = require("http2");

// src/node-http2-connection-manager.ts
var import_http2 = __toESM(require("http2"));

// src/node-http2-connection-pool.ts
var NodeHttp2ConnectionPool = class {
  constructor(sessions) {
    this.sessions = [];
    this.sessions = sessions ?? [];
  }
  static {
    __name(this, "NodeHttp2ConnectionPool");
  }
  poll() {
    if (this.sessions.length > 0) {
      return this.sessions.shift();
    }
  }
  offerLast(session) {
    this.sessions.push(session);
  }
  contains(session) {
    return this.sessions.includes(session);
  }
  remove(session) {
    this.sessions = this.sessions.filter((s) => s !== session);
  }
  [Symbol.iterator]() {
    return this.sessions[Symbol.iterator]();
  }
  destroy(connection) {
    for (const session of this.sessions) {
      if (session === connection) {
        if (!session.destroyed) {
          session.destroy();
        }
      }
    }
  }
};

// src/node-http2-connection-manager.ts
var NodeHttp2ConnectionManager = class {
  constructor(config) {
    this.sessionCache = /* @__PURE__ */ new Map();
    this.config = config;
    if (this.config.maxConcurrency && this.config.maxConcurrency <= 0) {
      throw new RangeError("maxConcurrency must be greater than zero.");
    }
  }
  static {
    __name(this, "NodeHttp2ConnectionManager");
  }
  lease(requestContext, connectionConfiguration) {
    const url = this.getUrlString(requestContext);
    const existingPool = this.sessionCache.get(url);
    if (existingPool) {
      const existingSession = existingPool.poll();
      if (existingSession && !this.config.disableConcurrency) {
        return existingSession;
      }
    }
    const session = import_http2.default.connect(url);
    if (this.config.maxConcurrency) {
      session.settings({ maxConcurrentStreams: this.config.maxConcurrency }, (err) => {
        if (err) {
          throw new Error(
            "Fail to set maxConcurrentStreams to " + this.config.maxConcurrency + "when creating new session for " + requestContext.destination.toString()
          );
        }
      });
    }
    session.unref();
    const destroySessionCb = /* @__PURE__ */ __name(() => {
      session.destroy();
      this.deleteSession(url, session);
    }, "destroySessionCb");
    session.on("goaway", destroySessionCb);
    session.on("error", destroySessionCb);
    session.on("frameError", destroySessionCb);
    session.on("close", () => this.deleteSession(url, session));
    if (connectionConfiguration.requestTimeout) {
      session.setTimeout(connectionConfiguration.requestTimeout, destroySessionCb);
    }
    const connectionPool = this.sessionCache.get(url) || new NodeHttp2ConnectionPool();
    connectionPool.offerLast(session);
    this.sessionCache.set(url, connectionPool);
    return session;
  }
  /**
   * Delete a session from the connection pool.
   * @param authority The authority of the session to delete.
   * @param session The session to delete.
   */
  deleteSession(authority, session) {
    const existingConnectionPool = this.sessionCache.get(authority);
    if (!existingConnectionPool) {
      return;
    }
    if (!existingConnectionPool.contains(session)) {
      return;
    }
    existingConnectionPool.remove(session);
    this.sessionCache.set(authority, existingConnectionPool);
  }
  release(requestContext, session) {
    const cacheKey = this.getUrlString(requestContext);
    this.sessionCache.get(cacheKey)?.offerLast(session);
  }
  destroy() {
    for (const [key, connectionPool] of this.sessionCache) {
      for (const session of connectionPool) {
        if (!session.destroyed) {
          session.destroy();
        }
        connectionPool.remove(session);
      }
      this.sessionCache.delete(key);
    }
  }
  setMaxConcurrentStreams(maxConcurrentStreams) {
    if (maxConcurrentStreams && maxConcurrentStreams <= 0) {
      throw new RangeError("maxConcurrentStreams must be greater than zero.");
    }
    this.config.maxConcurrency = maxConcurrentStreams;
  }
  setDisableConcurrentStreams(disableConcurrentStreams) {
    this.config.disableConcurrency = disableConcurrentStreams;
  }
  getUrlString(request) {
    return request.destination.toString();
  }
};

// src/node-http2-handler.ts
var NodeHttp2Handler = class _NodeHttp2Handler {
  constructor(options) {
    this.metadata = { handlerProtocol: "h2" };
    this.connectionManager = new NodeHttp2ConnectionManager({});
    this.configProvider = new Promise((resolve, reject) => {
      if (typeof options === "function") {
        options().then((opts) => {
          resolve(opts || {});
        }).catch(reject);
      } else {
        resolve(options || {});
      }
    });
  }
  static {
    __name(this, "NodeHttp2Handler");
  }
  /**
   * @returns the input if it is an HttpHandler of any class,
   * or instantiates a new instance of this handler.
   */
  static create(instanceOrOptions) {
    if (typeof instanceOrOptions?.handle === "function") {
      return instanceOrOptions;
    }
    return new _NodeHttp2Handler(instanceOrOptions);
  }
  destroy() {
    this.connectionManager.destroy();
  }
  async handle(request, { abortSignal } = {}) {
    if (!this.config) {
      this.config = await this.configProvider;
      this.connectionManager.setDisableConcurrentStreams(this.config.disableConcurrentStreams || false);
      if (this.config.maxConcurrentStreams) {
        this.connectionManager.setMaxConcurrentStreams(this.config.maxConcurrentStreams);
      }
    }
    const { requestTimeout, disableConcurrentStreams } = this.config;
    return new Promise((_resolve, _reject) => {
      let fulfilled = false;
      let writeRequestBodyPromise = void 0;
      const resolve = /* @__PURE__ */ __name(async (arg) => {
        await writeRequestBodyPromise;
        _resolve(arg);
      }, "resolve");
      const reject = /* @__PURE__ */ __name(async (arg) => {
        await writeRequestBodyPromise;
        _reject(arg);
      }, "reject");
      if (abortSignal?.aborted) {
        fulfilled = true;
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";
        reject(abortError);
        return;
      }
      const { hostname, method, port, protocol, query } = request;
      let auth = "";
      if (request.username != null || request.password != null) {
        const username = request.username ?? "";
        const password = request.password ?? "";
        auth = `${username}:${password}@`;
      }
      const authority = `${protocol}//${auth}${hostname}${port ? `:${port}` : ""}`;
      const requestContext = { destination: new URL(authority) };
      const session = this.connectionManager.lease(requestContext, {
        requestTimeout: this.config?.sessionTimeout,
        disableConcurrentStreams: disableConcurrentStreams || false
      });
      const rejectWithDestroy = /* @__PURE__ */ __name((err) => {
        if (disableConcurrentStreams) {
          this.destroySession(session);
        }
        fulfilled = true;
        reject(err);
      }, "rejectWithDestroy");
      const queryString = (0, import_querystring_builder.buildQueryString)(query || {});
      let path = request.path;
      if (queryString) {
        path += `?${queryString}`;
      }
      if (request.fragment) {
        path += `#${request.fragment}`;
      }
      const req = session.request({
        ...request.headers,
        [import_http22.constants.HTTP2_HEADER_PATH]: path,
        [import_http22.constants.HTTP2_HEADER_METHOD]: method
      });
      session.ref();
      req.on("response", (headers) => {
        const httpResponse = new import_protocol_http.HttpResponse({
          statusCode: headers[":status"] || -1,
          headers: getTransformedHeaders(headers),
          body: req
        });
        fulfilled = true;
        resolve({ response: httpResponse });
        if (disableConcurrentStreams) {
          session.close();
          this.connectionManager.deleteSession(authority, session);
        }
      });
      if (requestTimeout) {
        req.setTimeout(requestTimeout, () => {
          req.close();
          const timeoutError = new Error(`Stream timed out because of no activity for ${requestTimeout} ms`);
          timeoutError.name = "TimeoutError";
          rejectWithDestroy(timeoutError);
        });
      }
      if (abortSignal) {
        const onAbort = /* @__PURE__ */ __name(() => {
          req.close();
          const abortError = new Error("Request aborted");
          abortError.name = "AbortError";
          rejectWithDestroy(abortError);
        }, "onAbort");
        if (typeof abortSignal.addEventListener === "function") {
          const signal = abortSignal;
          signal.addEventListener("abort", onAbort, { once: true });
          req.once("close", () => signal.removeEventListener("abort", onAbort));
        } else {
          abortSignal.onabort = onAbort;
        }
      }
      req.on("frameError", (type, code, id) => {
        rejectWithDestroy(new Error(`Frame type id ${type} in stream id ${id} has failed with code ${code}.`));
      });
      req.on("error", rejectWithDestroy);
      req.on("aborted", () => {
        rejectWithDestroy(
          new Error(`HTTP/2 stream is abnormally aborted in mid-communication with result code ${req.rstCode}.`)
        );
      });
      req.on("close", () => {
        session.unref();
        if (disableConcurrentStreams) {
          session.destroy();
        }
        if (!fulfilled) {
          rejectWithDestroy(new Error("Unexpected error: http2 request did not get a response"));
        }
      });
      writeRequestBodyPromise = writeRequestBody(req, request, requestTimeout);
    });
  }
  updateHttpClientConfig(key, value) {
    this.config = void 0;
    this.configProvider = this.configProvider.then((config) => {
      return {
        ...config,
        [key]: value
      };
    });
  }
  httpHandlerConfigs() {
    return this.config ?? {};
  }
  /**
   * Destroys a session.
   * @param session - the session to destroy.
   */
  destroySession(session) {
    if (!session.destroyed) {
      session.destroy();
    }
  }
};

// src/stream-collector/collector.ts

var Collector = class extends import_stream.Writable {
  constructor() {
    super(...arguments);
    this.bufferedBytes = [];
  }
  static {
    __name(this, "Collector");
  }
  _write(chunk, encoding, callback) {
    this.bufferedBytes.push(chunk);
    callback();
  }
};

// src/stream-collector/index.ts
var streamCollector = /* @__PURE__ */ __name((stream) => {
  if (isReadableStreamInstance(stream)) {
    return collectReadableStream(stream);
  }
  return new Promise((resolve, reject) => {
    const collector = new Collector();
    stream.pipe(collector);
    stream.on("error", (err) => {
      collector.end();
      reject(err);
    });
    collector.on("error", reject);
    collector.on("finish", function() {
      const bytes = new Uint8Array(Buffer.concat(this.bufferedBytes));
      resolve(bytes);
    });
  });
}, "streamCollector");
var isReadableStreamInstance = /* @__PURE__ */ __name((stream) => typeof ReadableStream === "function" && stream instanceof ReadableStream, "isReadableStreamInstance");
async function collectReadableStream(stream) {
  const chunks = [];
  const reader = stream.getReader();
  let isDone = false;
  let length = 0;
  while (!isDone) {
    const { done, value } = await reader.read();
    if (value) {
      chunks.push(value);
      length += value.length;
    }
    isDone = done;
  }
  const collected = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    collected.set(chunk, offset);
    offset += chunk.length;
  }
  return collected;
}
__name(collectReadableStream, "collectReadableStream");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  DEFAULT_REQUEST_TIMEOUT,
  NodeHttpHandler,
  NodeHttp2Handler,
  streamCollector
});

