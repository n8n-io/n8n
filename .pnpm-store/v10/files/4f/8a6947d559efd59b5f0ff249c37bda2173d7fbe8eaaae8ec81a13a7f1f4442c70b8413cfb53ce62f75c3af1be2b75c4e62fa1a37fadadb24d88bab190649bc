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
var xhrHttpClient_exports = {};
__export(xhrHttpClient_exports, {
  createXhrHttpClient: () => createXhrHttpClient
});
module.exports = __toCommonJS(xhrHttpClient_exports);
var import_AbortError = require("./abort-controller/AbortError.js");
var import_httpHeaders = require("./httpHeaders.js");
var import_restError = require("./restError.js");
var import_typeGuards = require("./util/typeGuards.js");
var import_arrayBuffer = require("./util/arrayBuffer.js");
class XhrHttpClient {
  /**
   * Makes a request over an underlying transport layer and returns the response.
   * @param request - The request to be made.
   */
  async sendRequest(request) {
    const url = new URL(request.url);
    const isInsecure = url.protocol !== "https:";
    if (isInsecure && !request.allowInsecureConnection) {
      throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
    }
    const xhr = new XMLHttpRequest();
    if (request.proxySettings) {
      throw new Error("HTTP proxy is not supported in browser environment");
    }
    const abortSignal = request.abortSignal;
    if (abortSignal) {
      if (abortSignal.aborted) {
        throw new import_AbortError.AbortError("The operation was aborted. Request has already been canceled.");
      }
      const listener = () => {
        xhr.abort();
      };
      abortSignal.addEventListener("abort", listener);
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          abortSignal.removeEventListener("abort", listener);
        }
      });
    }
    addProgressListener(xhr.upload, request.onUploadProgress);
    addProgressListener(xhr, request.onDownloadProgress);
    xhr.open(request.method, request.url);
    xhr.timeout = request.timeout;
    xhr.withCredentials = request.withCredentials;
    for (const [name, value] of request.headers) {
      xhr.setRequestHeader(name, value);
    }
    xhr.responseType = request.streamResponseStatusCodes?.size ? "blob" : "text";
    const body = typeof request.body === "function" ? request.body() : request.body;
    if ((0, import_typeGuards.isReadableStream)(body)) {
      throw new Error("streams are not supported in XhrHttpClient.");
    }
    if (body instanceof ArrayBuffer) {
      xhr.send(body);
    } else if (typeof body === "object" && body && "buffer" in body) {
      xhr.send((0, import_arrayBuffer.arrayBufferViewToArrayBuffer)(body));
    } else {
      xhr.send(body === void 0 ? null : body);
    }
    if (xhr.responseType === "blob") {
      return new Promise((resolve, reject) => {
        handleBlobResponse(xhr, request, resolve, reject);
        rejectOnTerminalEvent(request, xhr, reject);
      });
    } else {
      return new Promise(function(resolve, reject) {
        xhr.addEventListener(
          "load",
          () => resolve({
            request,
            status: xhr.status,
            headers: parseHeaders(xhr),
            bodyAsText: xhr.responseText
          })
        );
        rejectOnTerminalEvent(request, xhr, reject);
      });
    }
  }
}
function handleBlobResponse(xhr, request, res, rej) {
  xhr.addEventListener("readystatechange", () => {
    if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      if (
        // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
        request.streamResponseStatusCodes?.has(Number.POSITIVE_INFINITY) || request.streamResponseStatusCodes?.has(xhr.status)
      ) {
        const blobBody = new Promise((resolve, reject) => {
          xhr.addEventListener("load", () => {
            resolve(xhr.response);
          });
          rejectOnTerminalEvent(request, xhr, reject);
        });
        res({
          request,
          status: xhr.status,
          headers: parseHeaders(xhr),
          blobBody
        });
      } else {
        xhr.addEventListener("load", () => {
          if (xhr.response) {
            xhr.response.text().then((text) => {
              res({
                request,
                status: xhr.status,
                headers: parseHeaders(xhr),
                bodyAsText: text
              });
              return;
            }).catch((e) => {
              rej(e);
            });
          } else {
            res({
              request,
              status: xhr.status,
              headers: parseHeaders(xhr)
            });
          }
        });
      }
    }
  });
}
function addProgressListener(xhr, listener) {
  if (listener) {
    xhr.addEventListener(
      "progress",
      (rawEvent) => listener({
        loadedBytes: rawEvent.loaded
      })
    );
  }
}
function parseHeaders(xhr) {
  const responseHeaders = (0, import_httpHeaders.createHttpHeaders)();
  const headerLines = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/);
  for (const line of headerLines) {
    const index = line.indexOf(":");
    const headerName = line.slice(0, index);
    const headerValue = line.slice(index + 2);
    responseHeaders.set(headerName, headerValue);
  }
  return responseHeaders;
}
function rejectOnTerminalEvent(request, xhr, reject) {
  xhr.addEventListener(
    "error",
    () => reject(
      new import_restError.RestError(`Failed to send request to ${request.url}`, {
        code: import_restError.RestError.REQUEST_SEND_ERROR,
        request
      })
    )
  );
  const abortError = new import_AbortError.AbortError("The operation was aborted.");
  xhr.addEventListener("abort", () => reject(abortError));
  xhr.addEventListener("timeout", () => reject(abortError));
}
function createXhrHttpClient() {
  return new XhrHttpClient();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createXhrHttpClient
});
