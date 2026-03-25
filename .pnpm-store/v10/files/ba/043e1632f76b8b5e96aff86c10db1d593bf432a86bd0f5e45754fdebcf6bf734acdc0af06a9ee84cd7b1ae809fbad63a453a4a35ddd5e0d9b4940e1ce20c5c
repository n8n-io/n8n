// src/gateway/http.ts
import url from "url";
import http from "http";
import https from "https";
import { assign } from "../utils/index.mjs";
import { Gateway } from "./gateway.mjs";
import Response from "../response.mjs";
import { createTimeoutError } from "./timeout-error.mjs";
var HTTP = class extends Gateway {
  canceled = false;
  get() {
    this.performRequest("get");
  }
  head() {
    this.performRequest("head");
  }
  post() {
    this.performRequest("post");
  }
  put() {
    this.performRequest("put");
  }
  patch() {
    this.performRequest("patch");
  }
  delete() {
    this.performRequest("delete");
  }
  performRequest(requestMethod) {
    const headers = {};
    const defaults = url.parse(this.request.url());
    const method = this.shouldEmulateHTTP() ? "post" : requestMethod;
    const body = this.prepareBody(requestMethod, headers);
    const timeout = this.request.timeout();
    const signal = this.request.signal();
    this.canceled = false;
    if (body && typeof body !== "boolean" && typeof body !== "number" && typeof body.length === "number") {
      headers["content-length"] = Buffer.byteLength(body);
    }
    const handler = defaults.protocol === "https:" ? https : http;
    const requestParams = assign(defaults, {
      method,
      headers: assign(headers, this.request.headers())
    });
    const auth = this.request.auth();
    if (auth) {
      const username = auth.username || "";
      const password = auth.password || "";
      requestParams["auth"] = `${username}:${password}`;
    }
    const httpOptions = this.options().HTTP;
    if (httpOptions.useSocketConnectionTimeout) {
      requestParams["timeout"] = timeout;
    }
    if (httpOptions.configure) {
      assign(requestParams, httpOptions.configure(requestParams));
    }
    if (httpOptions.onRequestWillStart) {
      httpOptions.onRequestWillStart(requestParams);
    }
    if (signal) {
      requestParams.signal = signal;
    }
    const httpRequest = handler.request(
      requestParams,
      (httpResponse) => this.onResponse(httpResponse, httpOptions, requestParams)
    );
    httpRequest.on("socket", (socket) => {
      if (httpOptions.onRequestSocketAssigned) {
        httpOptions.onRequestSocketAssigned(requestParams);
      }
      if (httpRequest.reusedSocket) {
        return;
      }
      if (httpOptions.onSocketLookup) {
        socket.on("lookup", () => {
          var _a;
          (_a = httpOptions.onSocketLookup) == null ? void 0 : _a.call(httpOptions, requestParams);
        });
      }
      if (httpOptions.onSocketConnect) {
        socket.on("connect", () => {
          var _a;
          (_a = httpOptions.onSocketConnect) == null ? void 0 : _a.call(httpOptions, requestParams);
        });
      }
      if (httpOptions.onSocketSecureConnect) {
        socket.on("secureConnect", () => {
          var _a;
          (_a = httpOptions.onSocketSecureConnect) == null ? void 0 : _a.call(httpOptions, requestParams);
        });
      }
    });
    httpRequest.on("error", (e) => this.onError(e));
    body && httpRequest.write(body);
    if (timeout) {
      if (!httpOptions.useSocketConnectionTimeout) {
        httpRequest.setTimeout(timeout);
      }
      httpRequest.on("timeout", () => {
        this.canceled = true;
        httpRequest.abort();
        const error = createTimeoutError(`Timeout (${timeout}ms)`);
        this.dispatchClientError(error.message, error);
      });
    }
    httpRequest.end();
  }
  onResponse(httpResponse, httpOptions, requestParams) {
    const rawData = [];
    if (!this.request.isBinary()) {
      httpResponse.setEncoding("utf8");
    }
    httpResponse.once("readable", () => {
      if (httpOptions.onResponseReadable) {
        httpOptions.onResponseReadable(requestParams);
      }
    });
    httpResponse.on("data", (chunk) => rawData.push(chunk)).on("end", () => {
      if (this.canceled) {
        return;
      }
      this.dispatchResponse(this.createResponse(httpResponse, rawData));
    });
    httpResponse.on("end", () => {
      if (httpOptions.onResponseEnd) {
        httpOptions.onResponseEnd(requestParams);
      }
    });
  }
  onError(e) {
    if (this.canceled) {
      return;
    }
    this.dispatchClientError(e.message, e);
  }
  createResponse(httpResponse, rawData) {
    const responseData = this.request.isBinary() ? Buffer.concat(rawData) : rawData.join("");
    return new Response(
      this.request,
      httpResponse.statusCode,
      responseData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      httpResponse.headers
    );
  }
};
var http_default = HTTP;
export {
  HTTP,
  http_default as default
};
//# sourceMappingURL=http.mjs.map