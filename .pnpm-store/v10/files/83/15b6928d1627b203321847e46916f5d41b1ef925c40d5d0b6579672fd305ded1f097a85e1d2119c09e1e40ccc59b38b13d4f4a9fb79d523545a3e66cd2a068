import {
  RequestController,
  createServerErrorResponse,
  emitAsync,
  handleRequest,
  isPropertyAccessible
} from "./chunk-5KMS5CTP.mjs";
import {
  FetchResponse,
  INTERNAL_REQUEST_ID_HEADER_NAME,
  Interceptor,
  createRequestId
} from "./chunk-I7HQIBT7.mjs";

// src/interceptors/ClientRequest/index.ts
import http2 from "http";
import https2 from "https";

// src/interceptors/ClientRequest/MockHttpSocket.ts
import net2 from "net";
import {
  HTTPParser
} from "_http_common";
import { STATUS_CODES, IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { invariant } from "outvariant";

// src/interceptors/Socket/MockSocket.ts
import net from "net";

// src/interceptors/Socket/utils/normalizeSocketWriteArgs.ts
function normalizeSocketWriteArgs(args) {
  const normalized = [args[0], void 0, void 0];
  if (typeof args[1] === "string") {
    normalized[1] = args[1];
  } else if (typeof args[1] === "function") {
    normalized[2] = args[1];
  }
  if (typeof args[2] === "function") {
    normalized[2] = args[2];
  }
  return normalized;
}

// src/interceptors/Socket/MockSocket.ts
var MockSocket = class extends net.Socket {
  constructor(options) {
    super();
    this.options = options;
    this.connecting = false;
    this.connect();
    this._final = (callback) => {
      callback(null);
    };
  }
  connect() {
    this.connecting = true;
    return this;
  }
  write(...args) {
    const [chunk, encoding, callback] = normalizeSocketWriteArgs(
      args
    );
    this.options.write(chunk, encoding, callback);
    return true;
  }
  end(...args) {
    const [chunk, encoding, callback] = normalizeSocketWriteArgs(
      args
    );
    this.options.write(chunk, encoding, callback);
    return super.end.apply(this, args);
  }
  push(chunk, encoding) {
    this.options.read(chunk, encoding);
    return super.push(chunk, encoding);
  }
};

// src/interceptors/Socket/utils/baseUrlFromConnectionOptions.ts
function baseUrlFromConnectionOptions(options) {
  if ("href" in options) {
    return new URL(options.href);
  }
  const protocol = options.port === 443 ? "https:" : "http:";
  const host = options.host;
  const url = new URL(`${protocol}//${host}`);
  if (options.port) {
    url.port = options.port.toString();
  }
  if (options.path) {
    url.pathname = options.path;
  }
  if (options.auth) {
    const [username, password] = options.auth.split(":");
    url.username = username;
    url.password = password;
  }
  return url;
}

// src/interceptors/ClientRequest/utils/recordRawHeaders.ts
var kRawHeaders = Symbol("kRawHeaders");
var kRestorePatches = Symbol("kRestorePatches");
function recordRawHeader(headers, args, behavior) {
  ensureRawHeadersSymbol(headers, []);
  const rawHeaders = Reflect.get(headers, kRawHeaders);
  if (behavior === "set") {
    for (let index = rawHeaders.length - 1; index >= 0; index--) {
      if (rawHeaders[index][0].toLowerCase() === args[0].toLowerCase()) {
        rawHeaders.splice(index, 1);
      }
    }
  }
  rawHeaders.push(args);
}
function ensureRawHeadersSymbol(headers, rawHeaders) {
  if (Reflect.has(headers, kRawHeaders)) {
    return;
  }
  defineRawHeadersSymbol(headers, rawHeaders);
}
function defineRawHeadersSymbol(headers, rawHeaders) {
  Object.defineProperty(headers, kRawHeaders, {
    value: rawHeaders,
    enumerable: false,
    // Mark the symbol as configurable so its value can be overridden.
    // Overrides happen when merging raw headers from multiple sources.
    // E.g. new Request(new Request(url, { headers }), { headers })
    configurable: true
  });
}
function recordRawFetchHeaders() {
  if (Reflect.get(Headers, kRestorePatches)) {
    return Reflect.get(Headers, kRestorePatches);
  }
  const {
    Headers: OriginalHeaders,
    Request: OriginalRequest,
    Response: OriginalResponse
  } = globalThis;
  const { set, append, delete: headersDeleteMethod } = Headers.prototype;
  Object.defineProperty(Headers, kRestorePatches, {
    value: () => {
      Headers.prototype.set = set;
      Headers.prototype.append = append;
      Headers.prototype.delete = headersDeleteMethod;
      globalThis.Headers = OriginalHeaders;
      globalThis.Request = OriginalRequest;
      globalThis.Response = OriginalResponse;
      Reflect.deleteProperty(Headers, kRestorePatches);
    },
    enumerable: false,
    /**
     * @note Mark this property as configurable
     * so we can delete it using `Reflect.delete` during cleanup.
     */
    configurable: true
  });
  Object.defineProperty(globalThis, "Headers", {
    enumerable: true,
    writable: true,
    value: new Proxy(Headers, {
      construct(target, args, newTarget) {
        const headersInit = args[0] || [];
        if (headersInit instanceof Headers && Reflect.has(headersInit, kRawHeaders)) {
          const headers2 = Reflect.construct(
            target,
            [Reflect.get(headersInit, kRawHeaders)],
            newTarget
          );
          ensureRawHeadersSymbol(headers2, [
            /**
             * @note Spread the retrieved headers to clone them.
             * This prevents multiple Headers instances from pointing
             * at the same internal "rawHeaders" array.
             */
            ...Reflect.get(headersInit, kRawHeaders)
          ]);
          return headers2;
        }
        const headers = Reflect.construct(target, args, newTarget);
        if (!Reflect.has(headers, kRawHeaders)) {
          const rawHeadersInit = Array.isArray(headersInit) ? headersInit : Object.entries(headersInit);
          ensureRawHeadersSymbol(headers, rawHeadersInit);
        }
        return headers;
      }
    })
  });
  Headers.prototype.set = new Proxy(Headers.prototype.set, {
    apply(target, thisArg, args) {
      recordRawHeader(thisArg, args, "set");
      return Reflect.apply(target, thisArg, args);
    }
  });
  Headers.prototype.append = new Proxy(Headers.prototype.append, {
    apply(target, thisArg, args) {
      recordRawHeader(thisArg, args, "append");
      return Reflect.apply(target, thisArg, args);
    }
  });
  Headers.prototype.delete = new Proxy(Headers.prototype.delete, {
    apply(target, thisArg, args) {
      const rawHeaders = Reflect.get(thisArg, kRawHeaders);
      if (rawHeaders) {
        for (let index = rawHeaders.length - 1; index >= 0; index--) {
          if (rawHeaders[index][0].toLowerCase() === args[0].toLowerCase()) {
            rawHeaders.splice(index, 1);
          }
        }
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
  Object.defineProperty(globalThis, "Request", {
    enumerable: true,
    writable: true,
    value: new Proxy(Request, {
      construct(target, args, newTarget) {
        const request = Reflect.construct(target, args, newTarget);
        const inferredRawHeaders = [];
        if (typeof args[0] === "object" && args[0].headers != null) {
          inferredRawHeaders.push(...inferRawHeaders(args[0].headers));
        }
        if (typeof args[1] === "object" && args[1].headers != null) {
          inferredRawHeaders.push(...inferRawHeaders(args[1].headers));
        }
        if (inferredRawHeaders.length > 0) {
          ensureRawHeadersSymbol(request.headers, inferredRawHeaders);
        }
        return request;
      }
    })
  });
  Object.defineProperty(globalThis, "Response", {
    enumerable: true,
    writable: true,
    value: new Proxy(Response, {
      construct(target, args, newTarget) {
        const response = Reflect.construct(target, args, newTarget);
        if (typeof args[1] === "object" && args[1].headers != null) {
          ensureRawHeadersSymbol(
            response.headers,
            inferRawHeaders(args[1].headers)
          );
        }
        return response;
      }
    })
  });
}
function restoreHeadersPrototype() {
  if (!Reflect.get(Headers, kRestorePatches)) {
    return;
  }
  Reflect.get(Headers, kRestorePatches)();
}
function getRawFetchHeaders(headers) {
  if (!Reflect.has(headers, kRawHeaders)) {
    return Array.from(headers.entries());
  }
  const rawHeaders = Reflect.get(headers, kRawHeaders);
  return rawHeaders.length > 0 ? rawHeaders : Array.from(headers.entries());
}
function inferRawHeaders(headers) {
  if (headers instanceof Headers) {
    return Reflect.get(headers, kRawHeaders) || [];
  }
  return Reflect.get(new Headers(headers), kRawHeaders);
}

// src/interceptors/ClientRequest/MockHttpSocket.ts
var kRequestId = Symbol("kRequestId");
var MockHttpSocket = class extends MockSocket {
  constructor(options) {
    super({
      write: (chunk, encoding, callback) => {
        var _a;
        if (this.socketState !== "passthrough") {
          this.writeBuffer.push([chunk, encoding, callback]);
        }
        if (chunk) {
          if (this.socketState === "passthrough") {
            (_a = this.originalSocket) == null ? void 0 : _a.write(chunk, encoding, callback);
          }
          this.requestParser.execute(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
          );
        }
      },
      read: (chunk) => {
        if (chunk !== null) {
          this.responseParser.execute(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          );
        }
      }
    });
    this.writeBuffer = [];
    this.socketState = "unknown";
    this.onRequestStart = (versionMajor, versionMinor, rawHeaders, _, path, __, ___, ____, shouldKeepAlive) => {
      var _a;
      this.shouldKeepAlive = shouldKeepAlive;
      const url = new URL(path, this.baseUrl);
      const method = ((_a = this.connectionOptions.method) == null ? void 0 : _a.toUpperCase()) || "GET";
      const headers = FetchResponse.parseRawHeaders(rawHeaders);
      const canHaveBody = method !== "GET" && method !== "HEAD";
      if (url.username || url.password) {
        if (!headers.has("authorization")) {
          headers.set("authorization", `Basic ${url.username}:${url.password}`);
        }
        url.username = "";
        url.password = "";
      }
      if (canHaveBody) {
        this.requestStream = new Readable({
          /**
           * @note Provide the `read()` method so a `Readable` could be
           * used as the actual request body (the stream calls "read()").
           * We control the queue in the onRequestBody/End functions.
           */
          read: () => {
            this.flushWriteBuffer();
          }
        });
      }
      const requestId = createRequestId();
      this.request = new Request(url, {
        method,
        headers,
        credentials: "same-origin",
        // @ts-expect-error Undocumented Fetch property.
        duplex: canHaveBody ? "half" : void 0,
        body: canHaveBody ? Readable.toWeb(this.requestStream) : null
      });
      Reflect.set(this.request, kRequestId, requestId);
      if (this.request.headers.has(INTERNAL_REQUEST_ID_HEADER_NAME)) {
        this.passthrough();
        return;
      }
      this.onRequest({
        requestId,
        request: this.request,
        socket: this
      });
    };
    this.onResponseStart = (versionMajor, versionMinor, rawHeaders, method, url, status, statusText) => {
      const headers = FetchResponse.parseRawHeaders(rawHeaders);
      const response = new FetchResponse(
        /**
         * @note The Fetch API response instance exposed to the consumer
         * is created over the response stream of the HTTP parser. It is NOT
         * related to the Socket instance. This way, you can read response body
         * in response listener while the Socket instance delays the emission
         * of "end" and other events until those response listeners are finished.
         */
        FetchResponse.isResponseWithBody(status) ? Readable.toWeb(
          this.responseStream = new Readable({ read() {
          } })
        ) : null,
        {
          url,
          status,
          statusText,
          headers
        }
      );
      invariant(
        this.request,
        "Failed to handle a response: request does not exist"
      );
      if (this.request.headers.has(INTERNAL_REQUEST_ID_HEADER_NAME)) {
        return;
      }
      this.responseListenersPromise = this.onResponse({
        response,
        isMockedResponse: this.socketState === "mock",
        requestId: Reflect.get(this.request, kRequestId),
        request: this.request,
        socket: this
      });
    };
    this.connectionOptions = options.connectionOptions;
    this.createConnection = options.createConnection;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
    this.baseUrl = baseUrlFromConnectionOptions(this.connectionOptions);
    this.requestParser = new HTTPParser();
    this.requestParser.initialize(HTTPParser.REQUEST, {});
    this.requestParser[HTTPParser.kOnHeadersComplete] = this.onRequestStart.bind(this);
    this.requestParser[HTTPParser.kOnBody] = this.onRequestBody.bind(this);
    this.requestParser[HTTPParser.kOnMessageComplete] = this.onRequestEnd.bind(this);
    this.responseParser = new HTTPParser();
    this.responseParser.initialize(HTTPParser.RESPONSE, {});
    this.responseParser[HTTPParser.kOnHeadersComplete] = this.onResponseStart.bind(this);
    this.responseParser[HTTPParser.kOnBody] = this.onResponseBody.bind(this);
    this.responseParser[HTTPParser.kOnMessageComplete] = this.onResponseEnd.bind(this);
    this.once("finish", () => this.requestParser.free());
    if (this.baseUrl.protocol === "https:") {
      Reflect.set(this, "encrypted", true);
      Reflect.set(this, "authorized", false);
      Reflect.set(this, "getProtocol", () => "TLSv1.3");
      Reflect.set(this, "getSession", () => void 0);
      Reflect.set(this, "isSessionReused", () => false);
    }
  }
  emit(event, ...args) {
    const emitEvent = super.emit.bind(this, event, ...args);
    if (this.responseListenersPromise) {
      this.responseListenersPromise.finally(emitEvent);
      return this.listenerCount(event) > 0;
    }
    return emitEvent();
  }
  destroy(error) {
    this.responseParser.free();
    if (error) {
      this.emit("error", error);
    }
    return super.destroy(error);
  }
  /**
   * Establish this Socket connection as-is and pipe
   * its data/events through this Socket.
   */
  passthrough() {
    this.socketState = "passthrough";
    if (this.destroyed) {
      return;
    }
    const socket = this.createConnection();
    this.originalSocket = socket;
    this.once("error", (error) => {
      socket.destroy(error);
    });
    this.address = socket.address.bind(socket);
    let writeArgs;
    let headersWritten = false;
    while (writeArgs = this.writeBuffer.shift()) {
      if (writeArgs !== void 0) {
        if (!headersWritten) {
          const [chunk, encoding, callback] = writeArgs;
          const chunkString = chunk.toString();
          const chunkBeforeRequestHeaders = chunkString.slice(
            0,
            chunkString.indexOf("\r\n") + 2
          );
          const chunkAfterRequestHeaders = chunkString.slice(
            chunk.indexOf("\r\n\r\n")
          );
          const rawRequestHeaders = getRawFetchHeaders(this.request.headers);
          const requestHeadersString = rawRequestHeaders.filter(([name]) => {
            return name.toLowerCase() !== INTERNAL_REQUEST_ID_HEADER_NAME;
          }).map(([name, value]) => `${name}: ${value}`).join("\r\n");
          const headersChunk = `${chunkBeforeRequestHeaders}${requestHeadersString}${chunkAfterRequestHeaders}`;
          socket.write(headersChunk, encoding, callback);
          headersWritten = true;
          continue;
        }
        socket.write(...writeArgs);
      }
    }
    if (Reflect.get(socket, "encrypted")) {
      const tlsProperties = [
        "encrypted",
        "authorized",
        "getProtocol",
        "getSession",
        "isSessionReused"
      ];
      tlsProperties.forEach((propertyName) => {
        Object.defineProperty(this, propertyName, {
          enumerable: true,
          get: () => {
            const value = Reflect.get(socket, propertyName);
            return typeof value === "function" ? value.bind(socket) : value;
          }
        });
      });
    }
    socket.on("lookup", (...args) => this.emit("lookup", ...args)).on("connect", () => {
      this.connecting = socket.connecting;
      this.emit("connect");
    }).on("secureConnect", () => this.emit("secureConnect")).on("secure", () => this.emit("secure")).on("session", (session) => this.emit("session", session)).on("ready", () => this.emit("ready")).on("drain", () => this.emit("drain")).on("data", (chunk) => {
      this.push(chunk);
    }).on("error", (error) => {
      Reflect.set(this, "_hadError", Reflect.get(socket, "_hadError"));
      this.emit("error", error);
    }).on("resume", () => this.emit("resume")).on("timeout", () => this.emit("timeout")).on("prefinish", () => this.emit("prefinish")).on("finish", () => this.emit("finish")).on("close", (hadError) => this.emit("close", hadError)).on("end", () => this.emit("end"));
  }
  /**
   * Convert the given Fetch API `Response` instance to an
   * HTTP message and push it to the socket.
   */
  async respondWith(response) {
    var _a;
    if (this.destroyed) {
      return;
    }
    if (isPropertyAccessible(response, "type") && response.type === "error") {
      this.errorWith(new TypeError("Network error"));
      return;
    }
    this.mockConnect();
    this.socketState = "mock";
    this.flushWriteBuffer();
    const serverResponse = new ServerResponse(new IncomingMessage(this));
    serverResponse.assignSocket(
      new MockSocket({
        write: (chunk, encoding, callback) => {
          this.push(chunk, encoding);
          callback == null ? void 0 : callback();
        },
        read() {
        }
      })
    );
    serverResponse.removeHeader("connection");
    serverResponse.removeHeader("date");
    const rawResponseHeaders = getRawFetchHeaders(response.headers);
    serverResponse.writeHead(
      response.status,
      response.statusText || STATUS_CODES[response.status],
      rawResponseHeaders
    );
    this.once("error", () => {
      serverResponse.destroy();
    });
    if (response.body) {
      try {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            serverResponse.end();
            break;
          }
          serverResponse.write(value);
        }
      } catch (error) {
        this.respondWith(createServerErrorResponse(error));
        return;
      }
    } else {
      serverResponse.end();
    }
    if (!this.shouldKeepAlive) {
      this.emit("readable");
      (_a = this.responseStream) == null ? void 0 : _a.push(null);
      this.push(null);
    }
  }
  /**
   * Close this socket connection with the given error.
   */
  errorWith(error) {
    this.destroy(error);
  }
  mockConnect() {
    this.connecting = false;
    const isIPv6 = net2.isIPv6(this.connectionOptions.hostname) || this.connectionOptions.family === 6;
    const addressInfo = {
      address: isIPv6 ? "::1" : "127.0.0.1",
      family: isIPv6 ? "IPv6" : "IPv4",
      port: this.connectionOptions.port
    };
    this.address = () => addressInfo;
    this.emit(
      "lookup",
      null,
      addressInfo.address,
      addressInfo.family === "IPv6" ? 6 : 4,
      this.connectionOptions.host
    );
    this.emit("connect");
    this.emit("ready");
    if (this.baseUrl.protocol === "https:") {
      this.emit("secure");
      this.emit("secureConnect");
      this.emit(
        "session",
        this.connectionOptions.session || Buffer.from("mock-session-renegotiate")
      );
      this.emit("session", Buffer.from("mock-session-resume"));
    }
  }
  flushWriteBuffer() {
    for (const writeCall of this.writeBuffer) {
      if (typeof writeCall[2] === "function") {
        writeCall[2]();
        writeCall[2] = void 0;
      }
    }
  }
  onRequestBody(chunk) {
    invariant(
      this.requestStream,
      "Failed to write to a request stream: stream does not exist"
    );
    this.requestStream.push(chunk);
  }
  onRequestEnd() {
    if (this.requestStream) {
      this.requestStream.push(null);
    }
  }
  onResponseBody(chunk) {
    invariant(
      this.responseStream,
      "Failed to write to a response stream: stream does not exist"
    );
    this.responseStream.push(chunk);
  }
  onResponseEnd() {
    if (this.responseStream) {
      this.responseStream.push(null);
    }
  }
};

// src/interceptors/ClientRequest/agents.ts
import http from "http";
import https from "https";
var MockAgent = class extends http.Agent {
  constructor(options) {
    super();
    this.customAgent = options.customAgent;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
  }
  createConnection(options, callback) {
    const createConnection = this.customAgent instanceof http.Agent && this.customAgent.createConnection || super.createConnection;
    const socket = new MockHttpSocket({
      connectionOptions: options,
      createConnection: createConnection.bind(
        this.customAgent || this,
        options,
        callback
      ),
      onRequest: this.onRequest.bind(this),
      onResponse: this.onResponse.bind(this)
    });
    return socket;
  }
};
var MockHttpsAgent = class extends https.Agent {
  constructor(options) {
    super();
    this.customAgent = options.customAgent;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
  }
  createConnection(options, callback) {
    const createConnection = this.customAgent instanceof https.Agent && this.customAgent.createConnection || super.createConnection;
    const socket = new MockHttpSocket({
      connectionOptions: options,
      createConnection: createConnection.bind(
        this.customAgent || this,
        options,
        callback
      ),
      onRequest: this.onRequest.bind(this),
      onResponse: this.onResponse.bind(this)
    });
    return socket;
  }
};

// src/interceptors/ClientRequest/utils/normalizeClientRequestArgs.ts
import { urlToHttpOptions } from "url";
import {
  Agent as HttpAgent,
  globalAgent as httpGlobalAgent
} from "http";
import {
  Agent as HttpsAgent,
  globalAgent as httpsGlobalAgent
} from "https";
import {
  URL as URL2,
  parse as parseUrl
} from "url";
import { Logger as Logger3 } from "@open-draft/logger";

// src/utils/getUrlByRequestOptions.ts
import { Agent } from "http";
import { Logger } from "@open-draft/logger";
var logger = new Logger("utils getUrlByRequestOptions");
var DEFAULT_PATH = "/";
var DEFAULT_PROTOCOL = "http:";
var DEFAULT_HOSTNAME = "localhost";
var SSL_PORT = 443;
function getAgent(options) {
  return options.agent instanceof Agent ? options.agent : void 0;
}
function getProtocolByRequestOptions(options) {
  var _a;
  if (options.protocol) {
    return options.protocol;
  }
  const agent = getAgent(options);
  const agentProtocol = agent == null ? void 0 : agent.protocol;
  if (agentProtocol) {
    return agentProtocol;
  }
  const port = getPortByRequestOptions(options);
  const isSecureRequest = options.cert || port === SSL_PORT;
  return isSecureRequest ? "https:" : ((_a = options.uri) == null ? void 0 : _a.protocol) || DEFAULT_PROTOCOL;
}
function getPortByRequestOptions(options) {
  if (options.port) {
    return Number(options.port);
  }
  const agent = getAgent(options);
  if (agent == null ? void 0 : agent.options.port) {
    return Number(agent.options.port);
  }
  if (agent == null ? void 0 : agent.defaultPort) {
    return Number(agent.defaultPort);
  }
  return void 0;
}
function getAuthByRequestOptions(options) {
  if (options.auth) {
    const [username, password] = options.auth.split(":");
    return { username, password };
  }
}
function isRawIPv6Address(host) {
  return host.includes(":") && !host.startsWith("[") && !host.endsWith("]");
}
function getHostname(options) {
  let host = options.hostname || options.host;
  if (host) {
    if (isRawIPv6Address(host)) {
      host = `[${host}]`;
    }
    return new URL(`http://${host}`).hostname;
  }
  return DEFAULT_HOSTNAME;
}
function getUrlByRequestOptions(options) {
  logger.info("request options", options);
  if (options.uri) {
    logger.info(
      'constructing url from explicitly provided "options.uri": %s',
      options.uri
    );
    return new URL(options.uri.href);
  }
  logger.info("figuring out url from request options...");
  const protocol = getProtocolByRequestOptions(options);
  logger.info("protocol", protocol);
  const port = getPortByRequestOptions(options);
  logger.info("port", port);
  const hostname = getHostname(options);
  logger.info("hostname", hostname);
  const path = options.path || DEFAULT_PATH;
  logger.info("path", path);
  const credentials = getAuthByRequestOptions(options);
  logger.info("credentials", credentials);
  const authString = credentials ? `${credentials.username}:${credentials.password}@` : "";
  logger.info("auth string:", authString);
  const portString = typeof port !== "undefined" ? `:${port}` : "";
  const url = new URL(`${protocol}//${hostname}${portString}${path}`);
  url.username = (credentials == null ? void 0 : credentials.username) || "";
  url.password = (credentials == null ? void 0 : credentials.password) || "";
  logger.info("created url:", url);
  return url;
}

// src/utils/cloneObject.ts
import { Logger as Logger2 } from "@open-draft/logger";
var logger2 = new Logger2("cloneObject");
function isPlainObject(obj) {
  var _a;
  logger2.info("is plain object?", obj);
  if (obj == null || !((_a = obj.constructor) == null ? void 0 : _a.name)) {
    logger2.info("given object is undefined, not a plain object...");
    return false;
  }
  logger2.info("checking the object constructor:", obj.constructor.name);
  return obj.constructor.name === "Object";
}
function cloneObject(obj) {
  logger2.info("cloning object:", obj);
  const enumerableProperties = Object.entries(obj).reduce(
    (acc, [key, value]) => {
      logger2.info("analyzing key-value pair:", key, value);
      acc[key] = isPlainObject(value) ? cloneObject(value) : value;
      return acc;
    },
    {}
  );
  return isPlainObject(obj) ? enumerableProperties : Object.assign(Object.getPrototypeOf(obj), enumerableProperties);
}

// src/utils/isObject.ts
function isObject(value, loose = false) {
  return loose ? Object.prototype.toString.call(value).startsWith("[object ") : Object.prototype.toString.call(value) === "[object Object]";
}

// src/interceptors/ClientRequest/utils/normalizeClientRequestArgs.ts
var logger3 = new Logger3("http normalizeClientRequestArgs");
function resolveRequestOptions(args, url) {
  if (typeof args[1] === "undefined" || typeof args[1] === "function") {
    logger3.info("request options not provided, deriving from the url", url);
    return urlToHttpOptions(url);
  }
  if (args[1]) {
    logger3.info("has custom RequestOptions!", args[1]);
    const requestOptionsFromUrl = urlToHttpOptions(url);
    logger3.info("derived RequestOptions from the URL:", requestOptionsFromUrl);
    logger3.info("cloning RequestOptions...");
    const clonedRequestOptions = cloneObject(args[1]);
    logger3.info("successfully cloned RequestOptions!", clonedRequestOptions);
    return {
      ...requestOptionsFromUrl,
      ...clonedRequestOptions
    };
  }
  logger3.info("using an empty object as request options");
  return {};
}
function overrideUrlByRequestOptions(url, options) {
  url.host = options.host || url.host;
  url.hostname = options.hostname || url.hostname;
  url.port = options.port ? options.port.toString() : url.port;
  if (options.path) {
    const parsedOptionsPath = parseUrl(options.path, false);
    url.pathname = parsedOptionsPath.pathname || "";
    url.search = parsedOptionsPath.search || "";
  }
  return url;
}
function resolveCallback(args) {
  return typeof args[1] === "function" ? args[1] : args[2];
}
function normalizeClientRequestArgs(defaultProtocol, args) {
  let url;
  let options;
  let callback;
  logger3.info("arguments", args);
  logger3.info("using default protocol:", defaultProtocol);
  if (args.length === 0) {
    const url2 = new URL2("http://localhost");
    const options2 = resolveRequestOptions(args, url2);
    return [url2, options2];
  }
  if (typeof args[0] === "string") {
    logger3.info("first argument is a location string:", args[0]);
    url = new URL2(args[0]);
    logger3.info("created a url:", url);
    const requestOptionsFromUrl = urlToHttpOptions(url);
    logger3.info("request options from url:", requestOptionsFromUrl);
    options = resolveRequestOptions(args, url);
    logger3.info("resolved request options:", options);
    callback = resolveCallback(args);
  } else if (args[0] instanceof URL2) {
    url = args[0];
    logger3.info("first argument is a URL:", url);
    if (typeof args[1] !== "undefined" && isObject(args[1])) {
      url = overrideUrlByRequestOptions(url, args[1]);
    }
    options = resolveRequestOptions(args, url);
    logger3.info("derived request options:", options);
    callback = resolveCallback(args);
  } else if ("hash" in args[0] && !("method" in args[0])) {
    const [legacyUrl] = args;
    logger3.info("first argument is a legacy URL:", legacyUrl);
    if (legacyUrl.hostname === null) {
      logger3.info("given legacy URL is relative (no hostname)");
      return isObject(args[1]) ? normalizeClientRequestArgs(defaultProtocol, [
        { path: legacyUrl.path, ...args[1] },
        args[2]
      ]) : normalizeClientRequestArgs(defaultProtocol, [
        { path: legacyUrl.path },
        args[1]
      ]);
    }
    logger3.info("given legacy url is absolute");
    const resolvedUrl = new URL2(legacyUrl.href);
    return args[1] === void 0 ? normalizeClientRequestArgs(defaultProtocol, [resolvedUrl]) : typeof args[1] === "function" ? normalizeClientRequestArgs(defaultProtocol, [resolvedUrl, args[1]]) : normalizeClientRequestArgs(defaultProtocol, [
      resolvedUrl,
      args[1],
      args[2]
    ]);
  } else if (isObject(args[0])) {
    options = { ...args[0] };
    logger3.info("first argument is RequestOptions:", options);
    options.protocol = options.protocol || defaultProtocol;
    logger3.info("normalized request options:", options);
    url = getUrlByRequestOptions(options);
    logger3.info("created a URL from RequestOptions:", url.href);
    callback = resolveCallback(args);
  } else {
    throw new Error(
      `Failed to construct ClientRequest with these parameters: ${args}`
    );
  }
  options.protocol = options.protocol || url.protocol;
  options.method = options.method || "GET";
  if (typeof options.agent === "undefined") {
    const agent = options.protocol === "https:" ? new HttpsAgent({
      rejectUnauthorized: options.rejectUnauthorized
    }) : new HttpAgent();
    options.agent = agent;
    logger3.info("resolved fallback agent:", agent);
  }
  if (!options._defaultAgent) {
    logger3.info(
      'has no default agent, setting the default agent for "%s"',
      options.protocol
    );
    options._defaultAgent = options.protocol === "https:" ? httpsGlobalAgent : httpGlobalAgent;
  }
  logger3.info("successfully resolved url:", url.href);
  logger3.info("successfully resolved options:", options);
  logger3.info("successfully resolved callback:", callback);
  if (!(url instanceof URL2)) {
    url = url.toString();
  }
  return [url, options, callback];
}

// src/interceptors/ClientRequest/index.ts
var _ClientRequestInterceptor = class extends Interceptor {
  constructor() {
    super(_ClientRequestInterceptor.symbol);
    this.onRequest = async ({
      request,
      socket
    }) => {
      const requestId = Reflect.get(request, kRequestId);
      const controller = new RequestController(request);
      const isRequestHandled = await handleRequest({
        request,
        requestId,
        controller,
        emitter: this.emitter,
        onResponse: (response) => {
          socket.respondWith(response);
        },
        onRequestError: (response) => {
          socket.respondWith(response);
        },
        onError: (error) => {
          if (error instanceof Error) {
            socket.errorWith(error);
          }
        }
      });
      if (!isRequestHandled) {
        return socket.passthrough();
      }
    };
    this.onResponse = async ({
      requestId,
      request,
      response,
      isMockedResponse
    }) => {
      return emitAsync(this.emitter, "response", {
        requestId,
        request,
        response,
        isMockedResponse
      });
    };
  }
  setup() {
    const { get: originalGet, request: originalRequest } = http2;
    const { get: originalHttpsGet, request: originalHttpsRequest } = https2;
    const onRequest = this.onRequest.bind(this);
    const onResponse = this.onResponse.bind(this);
    http2.request = new Proxy(http2.request, {
      apply: (target, thisArg, args) => {
        const [url, options, callback] = normalizeClientRequestArgs(
          "http:",
          args
        );
        const mockAgent = new MockAgent({
          customAgent: options.agent,
          onRequest,
          onResponse
        });
        options.agent = mockAgent;
        return Reflect.apply(target, thisArg, [url, options, callback]);
      }
    });
    http2.get = new Proxy(http2.get, {
      apply: (target, thisArg, args) => {
        const [url, options, callback] = normalizeClientRequestArgs(
          "http:",
          args
        );
        const mockAgent = new MockAgent({
          customAgent: options.agent,
          onRequest,
          onResponse
        });
        options.agent = mockAgent;
        return Reflect.apply(target, thisArg, [url, options, callback]);
      }
    });
    https2.request = new Proxy(https2.request, {
      apply: (target, thisArg, args) => {
        const [url, options, callback] = normalizeClientRequestArgs(
          "https:",
          args
        );
        const mockAgent = new MockHttpsAgent({
          customAgent: options.agent,
          onRequest,
          onResponse
        });
        options.agent = mockAgent;
        return Reflect.apply(target, thisArg, [url, options, callback]);
      }
    });
    https2.get = new Proxy(https2.get, {
      apply: (target, thisArg, args) => {
        const [url, options, callback] = normalizeClientRequestArgs(
          "https:",
          args
        );
        const mockAgent = new MockHttpsAgent({
          customAgent: options.agent,
          onRequest,
          onResponse
        });
        options.agent = mockAgent;
        return Reflect.apply(target, thisArg, [url, options, callback]);
      }
    });
    recordRawFetchHeaders();
    this.subscriptions.push(() => {
      http2.get = originalGet;
      http2.request = originalRequest;
      https2.get = originalHttpsGet;
      https2.request = originalHttpsRequest;
      restoreHeadersPrototype();
    });
  }
};
var ClientRequestInterceptor = _ClientRequestInterceptor;
ClientRequestInterceptor.symbol = Symbol("client-request-interceptor");

export {
  ClientRequestInterceptor
};
//# sourceMappingURL=chunk-QFFDMWKW.mjs.map