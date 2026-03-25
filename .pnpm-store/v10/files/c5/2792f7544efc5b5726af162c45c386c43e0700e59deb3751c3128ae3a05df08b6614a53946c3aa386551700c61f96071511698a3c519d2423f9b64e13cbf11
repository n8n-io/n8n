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
var fetch_exports = {};
__export(fetch_exports, {
  APIRequestContext: () => APIRequestContext,
  BrowserContextAPIRequestContext: () => BrowserContextAPIRequestContext,
  GlobalAPIRequestContext: () => GlobalAPIRequestContext
});
module.exports = __toCommonJS(fetch_exports);
var import_http = __toESM(require("http"));
var import_https = __toESM(require("https"));
var import_stream = require("stream");
var import_tls = require("tls");
var zlib = __toESM(require("zlib"));
var import_utils = require("../utils");
var import_crypto = require("./utils/crypto");
var import_userAgent = require("./utils/userAgent");
var import_browserContext = require("./browserContext");
var import_cookieStore = require("./cookieStore");
var import_formData = require("./formData");
var import_instrumentation = require("./instrumentation");
var import_progress = require("./progress");
var import_socksClientCertificatesInterceptor = require("./socksClientCertificatesInterceptor");
var import_happyEyeballs = require("./utils/happyEyeballs");
var import_tracing = require("./trace/recorder/tracing");
class APIRequestContext extends import_instrumentation.SdkObject {
  constructor(parent) {
    super(parent, "request-context");
    this.fetchResponses = /* @__PURE__ */ new Map();
    this.fetchLog = /* @__PURE__ */ new Map();
    APIRequestContext.allInstances.add(this);
  }
  static {
    this.Events = {
      Dispose: "dispose",
      Request: "request",
      RequestFinished: "requestfinished"
    };
  }
  static {
    this.allInstances = /* @__PURE__ */ new Set();
  }
  static findResponseBody(guid) {
    for (const request of APIRequestContext.allInstances) {
      const body = request.fetchResponses.get(guid);
      if (body)
        return body;
    }
    return void 0;
  }
  _disposeImpl() {
    APIRequestContext.allInstances.delete(this);
    this.fetchResponses.clear();
    this.fetchLog.clear();
    this.emit(APIRequestContext.Events.Dispose);
  }
  disposeResponse(fetchUid) {
    this.fetchResponses.delete(fetchUid);
    this.fetchLog.delete(fetchUid);
  }
  _storeResponseBody(body) {
    const uid = (0, import_crypto.createGuid)();
    this.fetchResponses.set(uid, body);
    return uid;
  }
  async fetch(progress, params) {
    const defaults = this._defaultOptions();
    const headers = {
      "user-agent": defaults.userAgent,
      "accept": "*/*",
      "accept-encoding": "gzip,deflate,br"
    };
    if (defaults.extraHTTPHeaders) {
      for (const { name, value } of defaults.extraHTTPHeaders)
        setHeader(headers, name, value);
    }
    if (params.headers) {
      for (const { name, value } of params.headers)
        setHeader(headers, name, value);
    }
    const requestUrl = new URL((0, import_utils.constructURLBasedOnBaseURL)(defaults.baseURL, params.url));
    if (params.encodedParams) {
      requestUrl.search = params.encodedParams;
    } else if (params.params) {
      for (const { name, value } of params.params)
        requestUrl.searchParams.append(name, value);
    }
    const credentials = this._getHttpCredentials(requestUrl);
    if (credentials?.send === "always")
      setBasicAuthorizationHeader(headers, credentials);
    const method = params.method?.toUpperCase() || "GET";
    const proxy = defaults.proxy;
    let agent;
    if (proxy?.server !== "per-context")
      agent = (0, import_utils.createProxyAgent)(proxy, requestUrl);
    let maxRedirects = params.maxRedirects ?? (defaults.maxRedirects ?? 20);
    maxRedirects = maxRedirects === 0 ? -1 : maxRedirects;
    const options = {
      method,
      headers,
      agent,
      maxRedirects,
      ...(0, import_socksClientCertificatesInterceptor.getMatchingTLSOptionsForOrigin)(this._defaultOptions().clientCertificates, requestUrl.origin),
      __testHookLookup: params.__testHookLookup
    };
    if (params.ignoreHTTPSErrors || defaults.ignoreHTTPSErrors)
      options.rejectUnauthorized = false;
    const postData = serializePostData(params, headers);
    if (postData)
      setHeader(headers, "content-length", String(postData.byteLength));
    const fetchResponse = await this._sendRequestWithRetries(progress, requestUrl, options, postData, params.maxRetries);
    const fetchUid = this._storeResponseBody(fetchResponse.body);
    this.fetchLog.set(fetchUid, progress.metadata.log);
    const failOnStatusCode = params.failOnStatusCode !== void 0 ? params.failOnStatusCode : !!defaults.failOnStatusCode;
    if (failOnStatusCode && (fetchResponse.status < 200 || fetchResponse.status >= 400)) {
      let responseText = "";
      if (fetchResponse.body.byteLength) {
        let text = fetchResponse.body.toString("utf8");
        if (text.length > 1e3)
          text = text.substring(0, 997) + "...";
        responseText = `
Response text:
${text}`;
      }
      throw new Error(`${fetchResponse.status} ${fetchResponse.statusText}${responseText}`);
    }
    return { ...fetchResponse, fetchUid };
  }
  _parseSetCookieHeader(responseUrl, setCookie) {
    if (!setCookie)
      return [];
    const url = new URL(responseUrl);
    const defaultPath = "/" + url.pathname.substr(1).split("/").slice(0, -1).join("/");
    const cookies = [];
    for (const header of setCookie) {
      const cookie = parseCookie(header);
      if (!cookie)
        continue;
      if (!cookie.domain)
        cookie.domain = url.hostname;
      else
        (0, import_utils.assert)(cookie.domain.startsWith(".") || !cookie.domain.includes("."));
      if (!(0, import_cookieStore.domainMatches)(url.hostname, cookie.domain))
        continue;
      if (!cookie.path || !cookie.path.startsWith("/"))
        cookie.path = defaultPath;
      cookies.push(cookie);
    }
    return cookies;
  }
  async _updateRequestCookieHeader(progress, url, headers) {
    if (getHeader(headers, "cookie") !== void 0)
      return;
    const contextCookies = await progress.race(this._cookies(url));
    const cookies = contextCookies.filter((c) => new import_cookieStore.Cookie(c).matches(url));
    if (cookies.length) {
      const valueArray = cookies.map((c) => `${c.name}=${c.value}`);
      setHeader(headers, "cookie", valueArray.join("; "));
    }
  }
  async _sendRequestWithRetries(progress, url, options, postData, maxRetries) {
    maxRetries ??= 0;
    let backoff = 250;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this._sendRequest(progress, url, options, postData);
      } catch (e) {
        if ((0, import_progress.isAbortError)(e))
          throw e;
        e = (0, import_socksClientCertificatesInterceptor.rewriteOpenSSLErrorIfNeeded)(e);
        if (maxRetries === 0)
          throw e;
        if (i === maxRetries)
          throw new Error(`Failed after ${i + 1} attempt(s): ${e}`);
        if (e.code !== "ECONNRESET")
          throw e;
        progress.log(`  Received ECONNRESET, will retry after ${backoff}ms.`);
        await progress.wait(backoff);
        backoff *= 2;
      }
    }
    throw new Error("Unreachable");
  }
  async _sendRequest(progress, url, options, postData) {
    await this._updateRequestCookieHeader(progress, url, options.headers);
    const requestCookies = getHeader(options.headers, "cookie")?.split(";").map((p) => {
      const [name, value] = p.split("=").map((v) => v.trim());
      return { name, value };
    }) || [];
    const requestEvent = {
      url,
      method: options.method,
      headers: options.headers,
      cookies: requestCookies,
      postData
    };
    this.emit(APIRequestContext.Events.Request, requestEvent);
    let destroyRequest;
    const resultPromise = new Promise((fulfill, reject) => {
      const requestConstructor = (url.protocol === "https:" ? import_https.default : import_http.default).request;
      const agent = options.agent || (url.protocol === "https:" ? import_happyEyeballs.httpsHappyEyeballsAgent : import_happyEyeballs.httpHappyEyeballsAgent);
      const requestOptions = { ...options, agent };
      const startAt = (0, import_utils.monotonicTime)();
      let reusedSocketAt;
      let dnsLookupAt;
      let tcpConnectionAt;
      let tlsHandshakeAt;
      let requestFinishAt;
      let serverIPAddress;
      let serverPort;
      let securityDetails;
      const listeners = [];
      const request = requestConstructor(url, requestOptions, async (response) => {
        const responseAt = (0, import_utils.monotonicTime)();
        const notifyRequestFinished = (body2) => {
          const endAt = (0, import_utils.monotonicTime)();
          const connectEnd = tlsHandshakeAt ?? tcpConnectionAt;
          const timings = {
            send: requestFinishAt - startAt,
            wait: responseAt - requestFinishAt,
            receive: endAt - responseAt,
            dns: dnsLookupAt ? dnsLookupAt - startAt : -1,
            connect: connectEnd ? connectEnd - startAt : -1,
            // "If [ssl] is defined then the time is also included in the connect field "
            ssl: tlsHandshakeAt ? tlsHandshakeAt - tcpConnectionAt : -1,
            blocked: reusedSocketAt ? reusedSocketAt - startAt : -1
          };
          const requestFinishedEvent = {
            requestEvent,
            httpVersion: response.httpVersion,
            statusCode: response.statusCode || 0,
            statusMessage: response.statusMessage || "",
            headers: response.headers,
            rawHeaders: response.rawHeaders,
            cookies,
            body: body2,
            timings,
            serverIPAddress,
            serverPort,
            securityDetails
          };
          this.emit(APIRequestContext.Events.RequestFinished, requestFinishedEvent);
        };
        progress.log(`\u2190 ${response.statusCode} ${response.statusMessage}`);
        for (const [name, value] of Object.entries(response.headers))
          progress.log(`  ${name}: ${value}`);
        const cookies = this._parseSetCookieHeader(response.url || url.toString(), response.headers["set-cookie"]);
        if (cookies.length) {
          try {
            await this._addCookies(cookies);
          } catch (e) {
            await Promise.all(cookies.map((c) => this._addCookies([c]).catch(() => {
            })));
          }
        }
        if (redirectStatus.includes(response.statusCode) && options.maxRedirects >= 0) {
          if (options.maxRedirects === 0) {
            reject(new Error("Max redirect count exceeded"));
            request.destroy();
            return;
          }
          const headers = { ...options.headers };
          removeHeader(headers, `cookie`);
          const status = response.statusCode;
          let method = options.method;
          if ((status === 301 || status === 302) && method === "POST" || status === 303 && !["GET", "HEAD"].includes(method)) {
            method = "GET";
            postData = void 0;
            removeHeader(headers, `content-encoding`);
            removeHeader(headers, `content-language`);
            removeHeader(headers, `content-length`);
            removeHeader(headers, `content-location`);
            removeHeader(headers, `content-type`);
          }
          const redirectOptions = {
            method,
            headers,
            agent: options.agent,
            maxRedirects: options.maxRedirects - 1,
            ...(0, import_socksClientCertificatesInterceptor.getMatchingTLSOptionsForOrigin)(this._defaultOptions().clientCertificates, url.origin),
            __testHookLookup: options.__testHookLookup
          };
          if (options.rejectUnauthorized === false)
            redirectOptions.rejectUnauthorized = false;
          const locationHeaderValue = Buffer.from(response.headers.location ?? "", "latin1").toString("utf8");
          if (locationHeaderValue) {
            let locationURL;
            try {
              locationURL = new URL(locationHeaderValue, url);
            } catch (error) {
              reject(new Error(`uri requested responds with an invalid redirect URL: ${locationHeaderValue}`));
              request.destroy();
              return;
            }
            if (headers["host"])
              headers["host"] = locationURL.host;
            notifyRequestFinished();
            fulfill(this._sendRequest(progress, locationURL, redirectOptions, postData));
            request.destroy();
            return;
          }
        }
        if (response.statusCode === 401 && !getHeader(options.headers, "authorization")) {
          const auth = response.headers["www-authenticate"];
          const credentials = this._getHttpCredentials(url);
          if (auth?.trim().startsWith("Basic") && credentials) {
            setBasicAuthorizationHeader(options.headers, credentials);
            notifyRequestFinished();
            fulfill(this._sendRequest(progress, url, options, postData));
            request.destroy();
            return;
          }
        }
        response.on("aborted", () => reject(new Error("aborted")));
        const chunks = [];
        const notifyBodyFinished = () => {
          const body2 = Buffer.concat(chunks);
          notifyRequestFinished(body2);
          fulfill({
            url: response.url || url.toString(),
            status: response.statusCode || 0,
            statusText: response.statusMessage || "",
            headers: toHeadersArray(response.rawHeaders),
            body: body2
          });
        };
        let body = response;
        let transform;
        const encoding = response.headers["content-encoding"];
        if (encoding === "gzip" || encoding === "x-gzip") {
          transform = zlib.createGunzip({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH
          });
        } else if (encoding === "br") {
          transform = zlib.createBrotliDecompress({
            flush: zlib.constants.BROTLI_OPERATION_FLUSH,
            finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
          });
        } else if (encoding === "deflate") {
          transform = zlib.createInflate();
        }
        if (transform) {
          const emptyStreamTransform = new SafeEmptyStreamTransform(notifyBodyFinished);
          body = (0, import_stream.pipeline)(response, emptyStreamTransform, transform, (e) => {
            if (e)
              reject(new Error(`failed to decompress '${encoding}' encoding: ${e.message}`));
          });
          body.on("error", (e) => reject(new Error(`failed to decompress '${encoding}' encoding: ${e}`)));
        } else {
          body.on("error", reject);
        }
        body.on("data", (chunk) => chunks.push(chunk));
        body.on("end", notifyBodyFinished);
      });
      request.on("error", reject);
      destroyRequest = () => request.destroy();
      listeners.push(
        import_utils.eventsHelper.addEventListener(this, APIRequestContext.Events.Dispose, () => {
          reject(new Error("Request context disposed."));
          request.destroy();
        })
      );
      request.on("close", () => import_utils.eventsHelper.removeEventListeners(listeners));
      request.on("socket", (socket) => {
        if (request.reusedSocket) {
          reusedSocketAt = (0, import_utils.monotonicTime)();
          return;
        }
        const happyEyeBallsTimings = (0, import_happyEyeballs.timingForSocket)(socket);
        dnsLookupAt = happyEyeBallsTimings.dnsLookupAt;
        tcpConnectionAt = happyEyeBallsTimings.tcpConnectionAt;
        listeners.push(
          import_utils.eventsHelper.addEventListener(socket, "lookup", () => {
            dnsLookupAt = (0, import_utils.monotonicTime)();
          }),
          import_utils.eventsHelper.addEventListener(socket, "connect", () => {
            tcpConnectionAt = (0, import_utils.monotonicTime)();
          }),
          import_utils.eventsHelper.addEventListener(socket, "secureConnect", () => {
            tlsHandshakeAt = (0, import_utils.monotonicTime)();
            if (socket instanceof import_tls.TLSSocket) {
              const peerCertificate = socket.getPeerCertificate();
              securityDetails = {
                protocol: socket.getProtocol() ?? void 0,
                subjectName: peerCertificate.subject.CN,
                validFrom: new Date(peerCertificate.valid_from).getTime() / 1e3,
                validTo: new Date(peerCertificate.valid_to).getTime() / 1e3,
                issuer: peerCertificate.issuer.CN
              };
            }
          })
        );
        serverIPAddress = socket.remoteAddress;
        serverPort = socket.remotePort;
      });
      request.on("finish", () => {
        requestFinishAt = (0, import_utils.monotonicTime)();
      });
      progress.log(`\u2192 ${options.method} ${url.toString()}`);
      if (options.headers) {
        for (const [name, value] of Object.entries(options.headers))
          progress.log(`  ${name}: ${value}`);
      }
      if (postData)
        request.write(postData);
      request.end();
    });
    return progress.race(resultPromise).catch((error) => {
      destroyRequest?.();
      throw error;
    });
  }
  _getHttpCredentials(url) {
    if (!this._defaultOptions().httpCredentials?.origin || url.origin.toLowerCase() === this._defaultOptions().httpCredentials?.origin?.toLowerCase())
      return this._defaultOptions().httpCredentials;
    return void 0;
  }
}
class SafeEmptyStreamTransform extends import_stream.Transform {
  constructor(onEmptyStreamCallback) {
    super();
    this._receivedSomeData = false;
    this._onEmptyStreamCallback = onEmptyStreamCallback;
  }
  _transform(chunk, encoding, callback) {
    this._receivedSomeData = true;
    callback(null, chunk);
  }
  _flush(callback) {
    if (this._receivedSomeData)
      callback(null);
    else
      this._onEmptyStreamCallback();
  }
}
class BrowserContextAPIRequestContext extends APIRequestContext {
  constructor(context) {
    super(context);
    this._context = context;
    context.once(import_browserContext.BrowserContext.Events.Close, () => this._disposeImpl());
  }
  tracing() {
    return this._context.tracing;
  }
  async dispose(options) {
    this._closeReason = options.reason;
    this.fetchResponses.clear();
  }
  _defaultOptions() {
    return {
      userAgent: this._context._options.userAgent || this._context._browser.userAgent(),
      extraHTTPHeaders: this._context._options.extraHTTPHeaders,
      failOnStatusCode: void 0,
      httpCredentials: this._context._options.httpCredentials,
      proxy: this._context._options.proxy || this._context._browser.options.proxy,
      ignoreHTTPSErrors: this._context._options.ignoreHTTPSErrors,
      baseURL: this._context._options.baseURL,
      clientCertificates: this._context._options.clientCertificates
    };
  }
  async _addCookies(cookies) {
    await this._context.addCookies(cookies);
  }
  async _cookies(url) {
    return await this._context.cookies(url.toString());
  }
  async storageState(progress, indexedDB) {
    return this._context.storageState(progress, indexedDB);
  }
}
class GlobalAPIRequestContext extends APIRequestContext {
  constructor(playwright, options) {
    super(playwright);
    this._cookieStore = new import_cookieStore.CookieStore();
    this.attribution.context = this;
    if (options.storageState) {
      this._origins = options.storageState.origins?.map((origin) => ({ indexedDB: [], ...origin }));
      this._cookieStore.addCookies(options.storageState.cookies || []);
    }
    (0, import_browserContext.verifyClientCertificates)(options.clientCertificates);
    this._options = {
      baseURL: options.baseURL,
      userAgent: options.userAgent || (0, import_userAgent.getUserAgent)(),
      extraHTTPHeaders: options.extraHTTPHeaders,
      failOnStatusCode: !!options.failOnStatusCode,
      ignoreHTTPSErrors: !!options.ignoreHTTPSErrors,
      maxRedirects: options.maxRedirects,
      httpCredentials: options.httpCredentials,
      clientCertificates: options.clientCertificates,
      proxy: options.proxy
    };
    this._tracing = new import_tracing.Tracing(this, options.tracesDir);
  }
  tracing() {
    return this._tracing;
  }
  async dispose(options) {
    this._closeReason = options.reason;
    await this._tracing.flush();
    await this._tracing.deleteTmpTracesDir();
    this._disposeImpl();
  }
  _defaultOptions() {
    return this._options;
  }
  async _addCookies(cookies) {
    this._cookieStore.addCookies(cookies);
  }
  async _cookies(url) {
    return this._cookieStore.cookies(url);
  }
  async storageState(progress, indexedDB = false) {
    return {
      cookies: this._cookieStore.allCookies(),
      origins: (this._origins || []).map((origin) => ({ ...origin, indexedDB: indexedDB ? origin.indexedDB : [] }))
    };
  }
}
function toHeadersArray(rawHeaders) {
  const result = [];
  for (let i = 0; i < rawHeaders.length; i += 2)
    result.push({ name: rawHeaders[i], value: rawHeaders[i + 1] });
  return result;
}
const redirectStatus = [301, 302, 303, 307, 308];
function parseCookie(header) {
  const raw = (0, import_cookieStore.parseRawCookie)(header);
  if (!raw)
    return null;
  const cookie = {
    domain: "",
    path: "",
    expires: -1,
    httpOnly: false,
    secure: false,
    // From https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
    // The cookie-sending behavior if SameSite is not specified is SameSite=Lax.
    sameSite: "Lax",
    ...raw
  };
  return cookie;
}
function serializePostData(params, headers) {
  (0, import_utils.assert)((params.postData ? 1 : 0) + (params.jsonData ? 1 : 0) + (params.formData ? 1 : 0) + (params.multipartData ? 1 : 0) <= 1, `Only one of 'data', 'form' or 'multipart' can be specified`);
  if (params.jsonData !== void 0) {
    setHeader(headers, "content-type", "application/json", true);
    return Buffer.from(params.jsonData, "utf8");
  } else if (params.formData) {
    const searchParams = new URLSearchParams();
    for (const { name, value } of params.formData)
      searchParams.append(name, value);
    setHeader(headers, "content-type", "application/x-www-form-urlencoded", true);
    return Buffer.from(searchParams.toString(), "utf8");
  } else if (params.multipartData) {
    const formData = new import_formData.MultipartFormData();
    for (const field of params.multipartData) {
      if (field.file)
        formData.addFileField(field.name, field.file);
      else if (field.value)
        formData.addField(field.name, field.value);
    }
    setHeader(headers, "content-type", formData.contentTypeHeader(), true);
    return formData.finish();
  } else if (params.postData !== void 0) {
    setHeader(headers, "content-type", "application/octet-stream", true);
    return params.postData;
  }
  return void 0;
}
function setHeader(headers, name, value, keepExisting = false) {
  const existing = Object.entries(headers).find((pair) => pair[0].toLowerCase() === name.toLowerCase());
  if (!existing)
    headers[name] = value;
  else if (!keepExisting)
    headers[existing[0]] = value;
}
function getHeader(headers, name) {
  const existing = Object.entries(headers).find((pair) => pair[0].toLowerCase() === name.toLowerCase());
  return existing ? existing[1] : void 0;
}
function removeHeader(headers, name) {
  delete headers[name];
}
function setBasicAuthorizationHeader(headers, credentials) {
  const { username, password } = credentials;
  const encoded = Buffer.from(`${username || ""}:${password || ""}`).toString("base64");
  setHeader(headers, "authorization", `Basic ${encoded}`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIRequestContext,
  BrowserContextAPIRequestContext,
  GlobalAPIRequestContext
});
