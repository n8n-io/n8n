"use strict";Object.defineProperty(exports, "__esModule", {value: true});



var _chunkLK6DILFKjs = require('./chunk-LK6DILFK.js');


var _chunkPFGO5BSMjs = require('./chunk-PFGO5BSM.js');


var _chunk73NOP3T5js = require('./chunk-73NOP3T5.js');



var _chunk6L3PFBGTjs = require('./chunk-6L3PFBGT.js');





var _chunkWZTE4PCOjs = require('./chunk-WZTE4PCO.js');

// src/interceptors/XMLHttpRequest/index.ts
var _outvariant = require('outvariant');

// src/interceptors/XMLHttpRequest/XMLHttpRequestController.ts

var _isnodeprocess = require('is-node-process');

// src/interceptors/XMLHttpRequest/utils/concatArrayBuffer.ts
function concatArrayBuffer(left, right) {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left, 0);
  result.set(right, left.byteLength);
  return result;
}

// src/interceptors/XMLHttpRequest/polyfills/EventPolyfill.ts
var EventPolyfill = class {
  constructor(type, options) {
    this.NONE = 0;
    this.CAPTURING_PHASE = 1;
    this.AT_TARGET = 2;
    this.BUBBLING_PHASE = 3;
    this.type = "";
    this.srcElement = null;
    this.currentTarget = null;
    this.eventPhase = 0;
    this.isTrusted = true;
    this.composed = false;
    this.cancelable = true;
    this.defaultPrevented = false;
    this.bubbles = true;
    this.lengthComputable = true;
    this.loaded = 0;
    this.total = 0;
    this.cancelBubble = false;
    this.returnValue = true;
    this.type = type;
    this.target = (options == null ? void 0 : options.target) || null;
    this.currentTarget = (options == null ? void 0 : options.currentTarget) || null;
    this.timeStamp = Date.now();
  }
  composedPath() {
    return [];
  }
  initEvent(type, bubbles, cancelable) {
    this.type = type;
    this.bubbles = !!bubbles;
    this.cancelable = !!cancelable;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
  }
  stopImmediatePropagation() {
  }
};

// src/interceptors/XMLHttpRequest/polyfills/ProgressEventPolyfill.ts
var ProgressEventPolyfill = class extends EventPolyfill {
  constructor(type, init) {
    super(type);
    this.lengthComputable = (init == null ? void 0 : init.lengthComputable) || false;
    this.composed = (init == null ? void 0 : init.composed) || false;
    this.loaded = (init == null ? void 0 : init.loaded) || 0;
    this.total = (init == null ? void 0 : init.total) || 0;
  }
};

// src/interceptors/XMLHttpRequest/utils/createEvent.ts
var SUPPORTS_PROGRESS_EVENT = typeof ProgressEvent !== "undefined";
function createEvent(target, type, init) {
  const progressEvents = [
    "error",
    "progress",
    "loadstart",
    "loadend",
    "load",
    "timeout",
    "abort"
  ];
  const ProgressEventClass = SUPPORTS_PROGRESS_EVENT ? ProgressEvent : ProgressEventPolyfill;
  const event = progressEvents.includes(type) ? new ProgressEventClass(type, {
    lengthComputable: true,
    loaded: (init == null ? void 0 : init.loaded) || 0,
    total: (init == null ? void 0 : init.total) || 0
  }) : new EventPolyfill(type, {
    target,
    currentTarget: target
  });
  return event;
}

// src/utils/findPropertySource.ts
function findPropertySource(target, propertyName) {
  if (!(propertyName in target)) {
    return null;
  }
  const hasProperty = Object.prototype.hasOwnProperty.call(target, propertyName);
  if (hasProperty) {
    return target;
  }
  const prototype = Reflect.getPrototypeOf(target);
  return prototype ? findPropertySource(prototype, propertyName) : null;
}

// src/utils/createProxy.ts
function createProxy(target, options) {
  const proxy = new Proxy(target, optionsToProxyHandler(options));
  return proxy;
}
function optionsToProxyHandler(options) {
  const { constructorCall, methodCall, getProperty, setProperty } = options;
  const handler = {};
  if (typeof constructorCall !== "undefined") {
    handler.construct = function(target, args, newTarget) {
      const next = Reflect.construct.bind(null, target, args, newTarget);
      return constructorCall.call(newTarget, args, next);
    };
  }
  handler.set = function(target, propertyName, nextValue) {
    const next = () => {
      const propertySource = findPropertySource(target, propertyName) || target;
      const ownDescriptors = Reflect.getOwnPropertyDescriptor(
        propertySource,
        propertyName
      );
      if (typeof (ownDescriptors == null ? void 0 : ownDescriptors.set) !== "undefined") {
        ownDescriptors.set.apply(target, [nextValue]);
        return true;
      }
      return Reflect.defineProperty(propertySource, propertyName, {
        writable: true,
        enumerable: true,
        configurable: true,
        value: nextValue
      });
    };
    if (typeof setProperty !== "undefined") {
      return setProperty.call(target, [propertyName, nextValue], next);
    }
    return next();
  };
  handler.get = function(target, propertyName, receiver) {
    const next = () => target[propertyName];
    const value = typeof getProperty !== "undefined" ? getProperty.call(target, [propertyName, receiver], next) : next();
    if (typeof value === "function") {
      return (...args) => {
        const next2 = value.bind(target, ...args);
        if (typeof methodCall !== "undefined") {
          return methodCall.call(target, [propertyName, args], next2);
        }
        return next2();
      };
    }
    return value;
  };
  return handler;
}

// src/interceptors/XMLHttpRequest/utils/isDomParserSupportedType.ts
function isDomParserSupportedType(type) {
  const supportedTypes = [
    "application/xhtml+xml",
    "application/xml",
    "image/svg+xml",
    "text/html",
    "text/xml"
  ];
  return supportedTypes.some((supportedType) => {
    return type.startsWith(supportedType);
  });
}

// src/utils/parseJson.ts
function parseJson(data) {
  try {
    const json = JSON.parse(data);
    return json;
  } catch (_) {
    return null;
  }
}

// src/interceptors/XMLHttpRequest/utils/createResponse.ts
function createResponse(request, body) {
  const responseBodyOrNull = _chunkWZTE4PCOjs.FetchResponse.isResponseWithBody(request.status) ? body : null;
  return new (0, _chunkWZTE4PCOjs.FetchResponse)(responseBodyOrNull, {
    url: request.responseURL,
    status: request.status,
    statusText: request.statusText,
    headers: createHeadersFromXMLHttpReqestHeaders(
      request.getAllResponseHeaders()
    )
  });
}
function createHeadersFromXMLHttpReqestHeaders(headersString) {
  const headers = new Headers();
  const lines = headersString.split(/[\r\n]+/);
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    const [name, ...parts] = line.split(": ");
    const value = parts.join(": ");
    headers.append(name, value);
  }
  return headers;
}

// src/interceptors/XMLHttpRequest/utils/getBodyByteLength.ts
async function getBodyByteLength(input) {
  const explicitContentLength = input.headers.get("content-length");
  if (explicitContentLength != null && explicitContentLength !== "") {
    return Number(explicitContentLength);
  }
  const buffer = await input.arrayBuffer();
  return buffer.byteLength;
}

// src/interceptors/XMLHttpRequest/XMLHttpRequestController.ts
var kIsRequestHandled = Symbol("kIsRequestHandled");
var IS_NODE = _isnodeprocess.isNodeProcess.call(void 0, );
var kFetchRequest = Symbol("kFetchRequest");
var XMLHttpRequestController = class {
  constructor(initialRequest, logger) {
    this.initialRequest = initialRequest;
    this.logger = logger;
    this.method = "GET";
    this.url = null;
    this[kIsRequestHandled] = false;
    this.events = /* @__PURE__ */ new Map();
    this.uploadEvents = /* @__PURE__ */ new Map();
    this.requestId = _chunkWZTE4PCOjs.createRequestId.call(void 0, );
    this.requestHeaders = new Headers();
    this.responseBuffer = new Uint8Array();
    this.request = createProxy(initialRequest, {
      setProperty: ([propertyName, nextValue], invoke) => {
        switch (propertyName) {
          case "ontimeout": {
            const eventName = propertyName.slice(
              2
            );
            this.request.addEventListener(eventName, nextValue);
            return invoke();
          }
          default: {
            return invoke();
          }
        }
      },
      methodCall: ([methodName, args], invoke) => {
        var _a;
        switch (methodName) {
          case "open": {
            const [method, url] = args;
            if (typeof url === "undefined") {
              this.method = "GET";
              this.url = toAbsoluteUrl(method);
            } else {
              this.method = method;
              this.url = toAbsoluteUrl(url);
            }
            this.logger = this.logger.extend(`${this.method} ${this.url.href}`);
            this.logger.info("open", this.method, this.url.href);
            return invoke();
          }
          case "addEventListener": {
            const [eventName, listener] = args;
            this.registerEvent(eventName, listener);
            this.logger.info("addEventListener", eventName, listener);
            return invoke();
          }
          case "setRequestHeader": {
            const [name, value] = args;
            this.requestHeaders.set(name, value);
            this.logger.info("setRequestHeader", name, value);
            return invoke();
          }
          case "send": {
            const [body] = args;
            this.request.addEventListener("load", () => {
              if (typeof this.onResponse !== "undefined") {
                const fetchResponse = createResponse(
                  this.request,
                  /**
                   * The `response` property is the right way to read
                   * the ambiguous response body, as the request's "responseType" may differ.
                   * @see https://xhr.spec.whatwg.org/#the-response-attribute
                   */
                  this.request.response
                );
                this.onResponse.call(this, {
                  response: fetchResponse,
                  isMockedResponse: this[kIsRequestHandled],
                  request: fetchRequest,
                  requestId: this.requestId
                });
              }
            });
            const requestBody = typeof body === "string" ? _chunkLK6DILFKjs.encodeBuffer.call(void 0, body) : body;
            const fetchRequest = this.toFetchApiRequest(requestBody);
            this[kFetchRequest] = fetchRequest.clone();
            const onceRequestSettled = ((_a = this.onRequest) == null ? void 0 : _a.call(this, {
              request: fetchRequest,
              requestId: this.requestId
            })) || Promise.resolve();
            onceRequestSettled.finally(() => {
              if (!this[kIsRequestHandled]) {
                this.logger.info(
                  "request callback settled but request has not been handled (readystate %d), performing as-is...",
                  this.request.readyState
                );
                if (IS_NODE) {
                  this.request.setRequestHeader(
                    _chunkWZTE4PCOjs.INTERNAL_REQUEST_ID_HEADER_NAME,
                    this.requestId
                  );
                }
                return invoke();
              }
            });
            break;
          }
          default: {
            return invoke();
          }
        }
      }
    });
    define(
      this.request,
      "upload",
      createProxy(this.request.upload, {
        setProperty: ([propertyName, nextValue], invoke) => {
          switch (propertyName) {
            case "onloadstart":
            case "onprogress":
            case "onaboart":
            case "onerror":
            case "onload":
            case "ontimeout":
            case "onloadend": {
              const eventName = propertyName.slice(
                2
              );
              this.registerUploadEvent(eventName, nextValue);
            }
          }
          return invoke();
        },
        methodCall: ([methodName, args], invoke) => {
          switch (methodName) {
            case "addEventListener": {
              const [eventName, listener] = args;
              this.registerUploadEvent(eventName, listener);
              this.logger.info("upload.addEventListener", eventName, listener);
              return invoke();
            }
          }
        }
      })
    );
  }
  registerEvent(eventName, listener) {
    const prevEvents = this.events.get(eventName) || [];
    const nextEvents = prevEvents.concat(listener);
    this.events.set(eventName, nextEvents);
    this.logger.info('registered event "%s"', eventName, listener);
  }
  registerUploadEvent(eventName, listener) {
    const prevEvents = this.uploadEvents.get(eventName) || [];
    const nextEvents = prevEvents.concat(listener);
    this.uploadEvents.set(eventName, nextEvents);
    this.logger.info('registered upload event "%s"', eventName, listener);
  }
  /**
   * Responds to the current request with the given
   * Fetch API `Response` instance.
   */
  async respondWith(response) {
    this[kIsRequestHandled] = true;
    if (this[kFetchRequest]) {
      const totalRequestBodyLength = await getBodyByteLength(
        this[kFetchRequest]
      );
      this.trigger("loadstart", this.request.upload, {
        loaded: 0,
        total: totalRequestBodyLength
      });
      this.trigger("progress", this.request.upload, {
        loaded: totalRequestBodyLength,
        total: totalRequestBodyLength
      });
      this.trigger("load", this.request.upload, {
        loaded: totalRequestBodyLength,
        total: totalRequestBodyLength
      });
      this.trigger("loadend", this.request.upload, {
        loaded: totalRequestBodyLength,
        total: totalRequestBodyLength
      });
    }
    this.logger.info(
      "responding with a mocked response: %d %s",
      response.status,
      response.statusText
    );
    define(this.request, "status", response.status);
    define(this.request, "statusText", response.statusText);
    define(this.request, "responseURL", this.url.href);
    this.request.getResponseHeader = new Proxy(this.request.getResponseHeader, {
      apply: (_, __, args) => {
        this.logger.info("getResponseHeader", args[0]);
        if (this.request.readyState < this.request.HEADERS_RECEIVED) {
          this.logger.info("headers not received yet, returning null");
          return null;
        }
        const headerValue = response.headers.get(args[0]);
        this.logger.info(
          'resolved response header "%s" to',
          args[0],
          headerValue
        );
        return headerValue;
      }
    });
    this.request.getAllResponseHeaders = new Proxy(
      this.request.getAllResponseHeaders,
      {
        apply: () => {
          this.logger.info("getAllResponseHeaders");
          if (this.request.readyState < this.request.HEADERS_RECEIVED) {
            this.logger.info("headers not received yet, returning empty string");
            return "";
          }
          const headersList = Array.from(response.headers.entries());
          const allHeaders = headersList.map(([headerName, headerValue]) => {
            return `${headerName}: ${headerValue}`;
          }).join("\r\n");
          this.logger.info("resolved all response headers to", allHeaders);
          return allHeaders;
        }
      }
    );
    Object.defineProperties(this.request, {
      response: {
        enumerable: true,
        configurable: false,
        get: () => this.response
      },
      responseText: {
        enumerable: true,
        configurable: false,
        get: () => this.responseText
      },
      responseXML: {
        enumerable: true,
        configurable: false,
        get: () => this.responseXML
      }
    });
    const totalResponseBodyLength = await getBodyByteLength(response.clone());
    this.logger.info("calculated response body length", totalResponseBodyLength);
    this.trigger("loadstart", this.request, {
      loaded: 0,
      total: totalResponseBodyLength
    });
    this.setReadyState(this.request.HEADERS_RECEIVED);
    this.setReadyState(this.request.LOADING);
    const finalizeResponse = () => {
      this.logger.info("finalizing the mocked response...");
      this.setReadyState(this.request.DONE);
      this.trigger("load", this.request, {
        loaded: this.responseBuffer.byteLength,
        total: totalResponseBodyLength
      });
      this.trigger("loadend", this.request, {
        loaded: this.responseBuffer.byteLength,
        total: totalResponseBodyLength
      });
    };
    if (response.body) {
      this.logger.info("mocked response has body, streaming...");
      const reader = response.body.getReader();
      const readNextResponseBodyChunk = async () => {
        const { value, done } = await reader.read();
        if (done) {
          this.logger.info("response body stream done!");
          finalizeResponse();
          return;
        }
        if (value) {
          this.logger.info("read response body chunk:", value);
          this.responseBuffer = concatArrayBuffer(this.responseBuffer, value);
          this.trigger("progress", this.request, {
            loaded: this.responseBuffer.byteLength,
            total: totalResponseBodyLength
          });
        }
        readNextResponseBodyChunk();
      };
      readNextResponseBodyChunk();
    } else {
      finalizeResponse();
    }
  }
  responseBufferToText() {
    return _chunkLK6DILFKjs.decodeBuffer.call(void 0, this.responseBuffer);
  }
  get response() {
    this.logger.info(
      "getResponse (responseType: %s)",
      this.request.responseType
    );
    if (this.request.readyState !== this.request.DONE) {
      return null;
    }
    switch (this.request.responseType) {
      case "json": {
        const responseJson = parseJson(this.responseBufferToText());
        this.logger.info("resolved response JSON", responseJson);
        return responseJson;
      }
      case "arraybuffer": {
        const arrayBuffer = _chunkLK6DILFKjs.toArrayBuffer.call(void 0, this.responseBuffer);
        this.logger.info("resolved response ArrayBuffer", arrayBuffer);
        return arrayBuffer;
      }
      case "blob": {
        const mimeType = this.request.getResponseHeader("Content-Type") || "text/plain";
        const responseBlob = new Blob([this.responseBufferToText()], {
          type: mimeType
        });
        this.logger.info(
          "resolved response Blob (mime type: %s)",
          responseBlob,
          mimeType
        );
        return responseBlob;
      }
      default: {
        const responseText = this.responseBufferToText();
        this.logger.info(
          'resolving "%s" response type as text',
          this.request.responseType,
          responseText
        );
        return responseText;
      }
    }
  }
  get responseText() {
    _outvariant.invariant.call(void 0, 
      this.request.responseType === "" || this.request.responseType === "text",
      "InvalidStateError: The object is in invalid state."
    );
    if (this.request.readyState !== this.request.LOADING && this.request.readyState !== this.request.DONE) {
      return "";
    }
    const responseText = this.responseBufferToText();
    this.logger.info('getResponseText: "%s"', responseText);
    return responseText;
  }
  get responseXML() {
    _outvariant.invariant.call(void 0, 
      this.request.responseType === "" || this.request.responseType === "document",
      "InvalidStateError: The object is in invalid state."
    );
    if (this.request.readyState !== this.request.DONE) {
      return null;
    }
    const contentType = this.request.getResponseHeader("Content-Type") || "";
    if (typeof DOMParser === "undefined") {
      console.warn(
        "Cannot retrieve XMLHttpRequest response body as XML: DOMParser is not defined. You are likely using an environment that is not browser or does not polyfill browser globals correctly."
      );
      return null;
    }
    if (isDomParserSupportedType(contentType)) {
      return new DOMParser().parseFromString(
        this.responseBufferToText(),
        contentType
      );
    }
    return null;
  }
  errorWith(error) {
    this[kIsRequestHandled] = true;
    this.logger.info("responding with an error");
    this.setReadyState(this.request.DONE);
    this.trigger("error", this.request);
    this.trigger("loadend", this.request);
  }
  /**
   * Transitions this request's `readyState` to the given one.
   */
  setReadyState(nextReadyState) {
    this.logger.info(
      "setReadyState: %d -> %d",
      this.request.readyState,
      nextReadyState
    );
    if (this.request.readyState === nextReadyState) {
      this.logger.info("ready state identical, skipping transition...");
      return;
    }
    define(this.request, "readyState", nextReadyState);
    this.logger.info("set readyState to: %d", nextReadyState);
    if (nextReadyState !== this.request.UNSENT) {
      this.logger.info('triggerring "readystatechange" event...');
      this.trigger("readystatechange", this.request);
    }
  }
  /**
   * Triggers given event on the `XMLHttpRequest` instance.
   */
  trigger(eventName, target, options) {
    const callback = target[`on${eventName}`];
    const event = createEvent(target, eventName, options);
    this.logger.info('trigger "%s"', eventName, options || "");
    if (typeof callback === "function") {
      this.logger.info('found a direct "%s" callback, calling...', eventName);
      callback.call(target, event);
    }
    const events = target instanceof XMLHttpRequestUpload ? this.uploadEvents : this.events;
    for (const [registeredEventName, listeners] of events) {
      if (registeredEventName === eventName) {
        this.logger.info(
          'found %d listener(s) for "%s" event, calling...',
          listeners.length,
          eventName
        );
        listeners.forEach((listener) => listener.call(target, event));
      }
    }
  }
  /**
   * Converts this `XMLHttpRequest` instance into a Fetch API `Request` instance.
   */
  toFetchApiRequest(body) {
    this.logger.info("converting request to a Fetch API Request...");
    const resolvedBody = body instanceof Document ? body.documentElement.innerText : body;
    const fetchRequest = new Request(this.url.href, {
      method: this.method,
      headers: this.requestHeaders,
      /**
       * @see https://xhr.spec.whatwg.org/#cross-origin-credentials
       */
      credentials: this.request.withCredentials ? "include" : "same-origin",
      body: ["GET", "HEAD"].includes(this.method.toUpperCase()) ? null : resolvedBody
    });
    const proxyHeaders = createProxy(fetchRequest.headers, {
      methodCall: ([methodName, args], invoke) => {
        switch (methodName) {
          case "append":
          case "set": {
            const [headerName, headerValue] = args;
            this.request.setRequestHeader(headerName, headerValue);
            break;
          }
          case "delete": {
            const [headerName] = args;
            console.warn(
              `XMLHttpRequest: Cannot remove a "${headerName}" header from the Fetch API representation of the "${fetchRequest.method} ${fetchRequest.url}" request. XMLHttpRequest headers cannot be removed.`
            );
            break;
          }
        }
        return invoke();
      }
    });
    define(fetchRequest, "headers", proxyHeaders);
    this.logger.info("converted request to a Fetch API Request!", fetchRequest);
    return fetchRequest;
  }
};
kIsRequestHandled, kFetchRequest;
function toAbsoluteUrl(url) {
  if (typeof location === "undefined") {
    return new URL(url);
  }
  return new URL(url.toString(), location.href);
}
function define(target, property, value) {
  Reflect.defineProperty(target, property, {
    // Ensure writable properties to allow redefining readonly properties.
    writable: true,
    enumerable: true,
    value
  });
}

// src/interceptors/XMLHttpRequest/XMLHttpRequestProxy.ts
function createXMLHttpRequestProxy({
  emitter,
  logger
}) {
  const XMLHttpRequestProxy = new Proxy(globalThis.XMLHttpRequest, {
    construct(target, args, newTarget) {
      logger.info("constructed new XMLHttpRequest");
      const originalRequest = Reflect.construct(
        target,
        args,
        newTarget
      );
      const prototypeDescriptors = Object.getOwnPropertyDescriptors(
        target.prototype
      );
      for (const propertyName in prototypeDescriptors) {
        Reflect.defineProperty(
          originalRequest,
          propertyName,
          prototypeDescriptors[propertyName]
        );
      }
      const xhrRequestController = new XMLHttpRequestController(
        originalRequest,
        logger
      );
      xhrRequestController.onRequest = async function({ request, requestId }) {
        const controller = new (0, _chunk6L3PFBGTjs.RequestController)(request);
        this.logger.info("awaiting mocked response...");
        this.logger.info(
          'emitting the "request" event for %s listener(s)...',
          emitter.listenerCount("request")
        );
        const isRequestHandled = await _chunk6L3PFBGTjs.handleRequest.call(void 0, {
          request,
          requestId,
          controller,
          emitter,
          onResponse: async (response) => {
            await this.respondWith(response);
          },
          onRequestError: () => {
            this.errorWith(new TypeError("Network error"));
          },
          onError: (error) => {
            this.logger.info("request errored!", { error });
            if (error instanceof Error) {
              this.errorWith(error);
            }
          }
        });
        if (!isRequestHandled) {
          this.logger.info(
            "no mocked response received, performing request as-is..."
          );
        }
      };
      xhrRequestController.onResponse = async function({
        response,
        isMockedResponse,
        request,
        requestId
      }) {
        this.logger.info(
          'emitting the "response" event for %s listener(s)...',
          emitter.listenerCount("response")
        );
        emitter.emit("response", {
          response,
          isMockedResponse,
          request,
          requestId
        });
      };
      return xhrRequestController.request;
    }
  });
  return XMLHttpRequestProxy;
}

// src/interceptors/XMLHttpRequest/index.ts
var _XMLHttpRequestInterceptor = class extends _chunkWZTE4PCOjs.Interceptor {
  constructor() {
    super(_XMLHttpRequestInterceptor.interceptorSymbol);
  }
  checkEnvironment() {
    return _chunkPFGO5BSMjs.hasConfigurableGlobal.call(void 0, "XMLHttpRequest");
  }
  setup() {
    const logger = this.logger.extend("setup");
    logger.info('patching "XMLHttpRequest" module...');
    const PureXMLHttpRequest = globalThis.XMLHttpRequest;
    _outvariant.invariant.call(void 0, 
      !PureXMLHttpRequest[_chunk73NOP3T5js.IS_PATCHED_MODULE],
      'Failed to patch the "XMLHttpRequest" module: already patched.'
    );
    globalThis.XMLHttpRequest = createXMLHttpRequestProxy({
      emitter: this.emitter,
      logger: this.logger
    });
    logger.info(
      'native "XMLHttpRequest" module patched!',
      globalThis.XMLHttpRequest.name
    );
    Object.defineProperty(globalThis.XMLHttpRequest, _chunk73NOP3T5js.IS_PATCHED_MODULE, {
      enumerable: true,
      configurable: true,
      value: true
    });
    this.subscriptions.push(() => {
      Object.defineProperty(globalThis.XMLHttpRequest, _chunk73NOP3T5js.IS_PATCHED_MODULE, {
        value: void 0
      });
      globalThis.XMLHttpRequest = PureXMLHttpRequest;
      logger.info(
        'native "XMLHttpRequest" module restored!',
        globalThis.XMLHttpRequest.name
      );
    });
  }
};
var XMLHttpRequestInterceptor = _XMLHttpRequestInterceptor;
XMLHttpRequestInterceptor.interceptorSymbol = Symbol("xhr");



exports.XMLHttpRequestInterceptor = XMLHttpRequestInterceptor;
//# sourceMappingURL=chunk-LCA4FKWY.js.map