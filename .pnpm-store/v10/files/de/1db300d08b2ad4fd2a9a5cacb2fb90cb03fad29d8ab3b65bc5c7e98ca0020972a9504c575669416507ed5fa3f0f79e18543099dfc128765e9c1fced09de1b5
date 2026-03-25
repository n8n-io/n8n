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
var networkDispatchers_exports = {};
__export(networkDispatchers_exports, {
  APIRequestContextDispatcher: () => APIRequestContextDispatcher,
  RequestDispatcher: () => RequestDispatcher,
  ResponseDispatcher: () => ResponseDispatcher,
  RouteDispatcher: () => RouteDispatcher,
  WebSocketDispatcher: () => WebSocketDispatcher
});
module.exports = __toCommonJS(networkDispatchers_exports);
var import_network = require("../network");
var import_dispatcher = require("./dispatcher");
var import_frameDispatcher = require("./frameDispatcher");
var import_pageDispatcher = require("./pageDispatcher");
var import_tracingDispatcher = require("./tracingDispatcher");
var import_network2 = require("../network");
class RequestDispatcher extends import_dispatcher.Dispatcher {
  static from(scope, request) {
    const result = scope.connection.existingDispatcher(request);
    return result || new RequestDispatcher(scope, request);
  }
  static fromNullable(scope, request) {
    return request ? RequestDispatcher.from(scope, request) : void 0;
  }
  constructor(scope, request) {
    const postData = request.postDataBuffer();
    const frame = request.frame();
    const page = request.frame()?._page;
    const pageDispatcher = page ? scope.connection.existingDispatcher(page) : null;
    const frameDispatcher = import_frameDispatcher.FrameDispatcher.fromNullable(scope, frame);
    super(pageDispatcher || frameDispatcher || scope, request, "Request", {
      frame: frameDispatcher,
      serviceWorker: import_pageDispatcher.WorkerDispatcher.fromNullable(scope, request.serviceWorker()),
      url: request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      postData: postData === null ? void 0 : postData,
      headers: request.headers(),
      isNavigationRequest: request.isNavigationRequest(),
      redirectedFrom: RequestDispatcher.fromNullable(scope, request.redirectedFrom()),
      hasResponse: !!request._existingResponse()
    });
    this._type_Request = true;
    this._browserContextDispatcher = scope;
    this.addObjectListener(import_network2.Request.Events.Response, () => this._dispatchEvent("response", {}));
  }
  async rawRequestHeaders(params, progress) {
    return { headers: await progress.race(this._object.rawRequestHeaders()) };
  }
  async response(params, progress) {
    return { response: ResponseDispatcher.fromNullable(this._browserContextDispatcher, await progress.race(this._object.response())) };
  }
}
class ResponseDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, response) {
    super(scope, response, "Response", {
      // TODO: responses in popups can point to non-reported requests.
      request: scope,
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      timing: response.timing(),
      fromServiceWorker: response.fromServiceWorker()
    });
    this._type_Response = true;
  }
  static from(scope, response) {
    const result = scope.connection.existingDispatcher(response);
    const requestDispatcher = RequestDispatcher.from(scope, response.request());
    return result || new ResponseDispatcher(requestDispatcher, response);
  }
  static fromNullable(scope, response) {
    return response ? ResponseDispatcher.from(scope, response) : void 0;
  }
  async body(params, progress) {
    return { binary: await progress.race(this._object.body()) };
  }
  async securityDetails(params, progress) {
    return { value: await progress.race(this._object.securityDetails()) || void 0 };
  }
  async serverAddr(params, progress) {
    return { value: await progress.race(this._object.serverAddr()) || void 0 };
  }
  async rawResponseHeaders(params, progress) {
    return { headers: await progress.race(this._object.rawResponseHeaders()) };
  }
  async sizes(params, progress) {
    return { sizes: await progress.race(this._object.sizes()) };
  }
}
class RouteDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, route) {
    super(scope, route, "Route", {
      // Context route can point to a non-reported request, so we send the request in the initializer.
      request: scope
    });
    this._type_Route = true;
    this._handled = false;
  }
  _checkNotHandled() {
    if (this._handled)
      throw new Error("Route is already handled!");
    this._handled = true;
  }
  async continue(params, progress) {
    this._checkNotHandled();
    await this._object.continue({
      url: params.url,
      method: params.method,
      headers: params.headers,
      postData: params.postData,
      isFallback: params.isFallback
    });
  }
  async fulfill(params, progress) {
    this._checkNotHandled();
    await this._object.fulfill(params);
  }
  async abort(params, progress) {
    this._checkNotHandled();
    await this._object.abort(params.errorCode || "failed");
  }
  async redirectNavigationRequest(params, progress) {
    this._checkNotHandled();
    this._object.redirectNavigationRequest(params.url);
  }
}
class WebSocketDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, webSocket) {
    super(scope, webSocket, "WebSocket", {
      url: webSocket.url()
    });
    this._type_EventTarget = true;
    this._type_WebSocket = true;
    this.addObjectListener(import_network.WebSocket.Events.FrameSent, (event) => this._dispatchEvent("frameSent", event));
    this.addObjectListener(import_network.WebSocket.Events.FrameReceived, (event) => this._dispatchEvent("frameReceived", event));
    this.addObjectListener(import_network.WebSocket.Events.SocketError, (error) => this._dispatchEvent("socketError", { error }));
    this.addObjectListener(import_network.WebSocket.Events.Close, () => this._dispatchEvent("close", {}));
  }
}
class APIRequestContextDispatcher extends import_dispatcher.Dispatcher {
  constructor(parentScope, request) {
    const tracing = import_tracingDispatcher.TracingDispatcher.from(parentScope, request.tracing());
    super(parentScope, request, "APIRequestContext", {
      tracing
    });
    this._type_APIRequestContext = true;
    this.adopt(tracing);
  }
  static from(scope, request) {
    const result = scope.connection.existingDispatcher(request);
    return result || new APIRequestContextDispatcher(scope, request);
  }
  static fromNullable(scope, request) {
    return request ? APIRequestContextDispatcher.from(scope, request) : void 0;
  }
  async storageState(params, progress) {
    return await this._object.storageState(progress, params.indexedDB);
  }
  async dispose(params, progress) {
    progress.metadata.potentiallyClosesScope = true;
    await this._object.dispose(params);
    this._dispose();
  }
  async fetch(params, progress) {
    const fetchResponse = await this._object.fetch(progress, params);
    return {
      response: {
        url: fetchResponse.url,
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: fetchResponse.headers,
        fetchUid: fetchResponse.fetchUid
      }
    };
  }
  async fetchResponseBody(params, progress) {
    return { binary: this._object.fetchResponses.get(params.fetchUid) };
  }
  async fetchLog(params, progress) {
    const log = this._object.fetchLog.get(params.fetchUid) || [];
    return { log };
  }
  async disposeAPIResponse(params, progress) {
    this._object.disposeResponse(params.fetchUid);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIRequestContextDispatcher,
  RequestDispatcher,
  ResponseDispatcher,
  RouteDispatcher,
  WebSocketDispatcher
});
