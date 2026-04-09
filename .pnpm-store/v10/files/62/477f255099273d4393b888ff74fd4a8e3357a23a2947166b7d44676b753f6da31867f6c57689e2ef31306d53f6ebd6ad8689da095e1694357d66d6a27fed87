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
var fetchHttpClient_exports = {};
__export(fetchHttpClient_exports, {
  createFetchHttpClient: () => createFetchHttpClient
});
module.exports = __toCommonJS(fetchHttpClient_exports);
var import_AbortError = require("./abort-controller/AbortError.js");
var import_restError = require("./restError.js");
var import_httpHeaders = require("./httpHeaders.js");
var import_typeGuards = require("./util/typeGuards.js");
var import_arrayBuffer = require("./util/arrayBuffer.js");
function isBlob(body) {
  return (typeof Blob === "function" || typeof Blob === "object") && body instanceof Blob;
}
class FetchHttpClient {
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
    if (request.proxySettings) {
      throw new Error("HTTP proxy is not supported in browser environment");
    }
    try {
      return await makeRequest(request);
    } catch (e) {
      throw getError(e, request);
    }
  }
}
async function makeRequest(request) {
  const { abortController, abortControllerCleanup } = setupAbortSignal(request);
  try {
    const headers = buildFetchHeaders(request.headers);
    const { streaming, body: requestBody } = buildRequestBody(request);
    const requestInit = {
      body: requestBody,
      method: request.method,
      headers,
      signal: abortController.signal,
      // Cloudflare doesn't implement the full Fetch API spec
      // because of some of it doesn't make sense in the edge.
      // See https://github.com/cloudflare/workerd/issues/902
      ..."credentials" in Request.prototype ? { credentials: request.withCredentials ? "include" : "same-origin" } : {},
      ..."cache" in Request.prototype ? { cache: "no-store" } : {}
    };
    if (streaming) {
      requestInit.duplex = "half";
    }
    const response = await fetch(request.url, {
      ...requestInit,
      ...request.requestOverrides
    });
    if (isBlob(request.body) && request.onUploadProgress) {
      request.onUploadProgress({ loadedBytes: request.body.size });
    }
    return buildPipelineResponse(response, request, abortControllerCleanup);
  } catch (e) {
    abortControllerCleanup?.();
    throw e;
  }
}
async function buildPipelineResponse(httpResponse, request, abortControllerCleanup) {
  const headers = buildPipelineHeaders(httpResponse);
  const response = {
    request,
    headers,
    status: httpResponse.status
  };
  const bodyStream = (0, import_typeGuards.isWebReadableStream)(httpResponse.body) ? buildBodyStream(httpResponse.body, {
    onProgress: request.onDownloadProgress,
    onEnd: abortControllerCleanup
  }) : httpResponse.body;
  if (
    // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
    request.streamResponseStatusCodes?.has(Number.POSITIVE_INFINITY) || request.streamResponseStatusCodes?.has(response.status)
  ) {
    if (request.enableBrowserStreams) {
      response.browserStreamBody = bodyStream ?? void 0;
    } else {
      const responseStream = new Response(bodyStream);
      response.blobBody = responseStream.blob();
      abortControllerCleanup?.();
    }
  } else {
    const responseStream = new Response(bodyStream);
    response.bodyAsText = await responseStream.text();
    abortControllerCleanup?.();
  }
  return response;
}
function setupAbortSignal(request) {
  const abortController = new AbortController();
  let abortControllerCleanup;
  let abortListener;
  if (request.abortSignal) {
    if (request.abortSignal.aborted) {
      throw new import_AbortError.AbortError("The operation was aborted. Request has already been canceled.");
    }
    abortListener = (event) => {
      if (event.type === "abort") {
        abortController.abort();
      }
    };
    request.abortSignal.addEventListener("abort", abortListener);
    abortControllerCleanup = () => {
      if (abortListener) {
        request.abortSignal?.removeEventListener("abort", abortListener);
      }
    };
  }
  if (request.timeout > 0) {
    setTimeout(() => {
      abortController.abort();
    }, request.timeout);
  }
  return { abortController, abortControllerCleanup };
}
function getError(e, request) {
  if (e && e?.name === "AbortError") {
    return e;
  } else {
    return new import_restError.RestError(`Error sending request: ${e.message}`, {
      code: e?.code ?? import_restError.RestError.REQUEST_SEND_ERROR,
      request
    });
  }
}
function buildFetchHeaders(pipelineHeaders) {
  const headers = new Headers();
  for (const [name, value] of pipelineHeaders) {
    headers.append(name, value);
  }
  return headers;
}
function buildPipelineHeaders(httpResponse) {
  const responseHeaders = (0, import_httpHeaders.createHttpHeaders)();
  for (const [name, value] of httpResponse.headers) {
    responseHeaders.set(name, value);
  }
  return responseHeaders;
}
function buildRequestBody(request) {
  const body = typeof request.body === "function" ? request.body() : request.body;
  if ((0, import_typeGuards.isNodeReadableStream)(body)) {
    throw new Error("Node streams are not supported in browser environment.");
  }
  if ((0, import_typeGuards.isWebReadableStream)(body)) {
    return {
      streaming: true,
      body: buildBodyStream(body, { onProgress: request.onUploadProgress })
    };
  } else if (typeof body === "object" && body && "buffer" in body) {
    return { streaming: false, body: (0, import_arrayBuffer.arrayBufferViewToArrayBuffer)(body) };
  } else if (body === void 0) {
    return { streaming: false };
  } else {
    return { streaming: false, body };
  }
}
function buildBodyStream(readableStream, options = {}) {
  let loadedBytes = 0;
  const { onProgress, onEnd } = options;
  if (isTransformStreamSupported(readableStream)) {
    return readableStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk === null) {
            controller.terminate();
            return;
          }
          controller.enqueue(chunk);
          loadedBytes += chunk.length;
          if (onProgress) {
            onProgress({ loadedBytes });
          }
        },
        flush() {
          onEnd?.();
        }
      })
    );
  } else {
    const reader = readableStream.getReader();
    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done || !value) {
          onEnd?.();
          controller.close();
          reader.releaseLock();
          return;
        }
        loadedBytes += value?.length ?? 0;
        controller.enqueue(value);
        if (onProgress) {
          onProgress({ loadedBytes });
        }
      },
      cancel(reason) {
        onEnd?.();
        return reader.cancel(reason);
      }
    });
  }
}
function createFetchHttpClient() {
  return new FetchHttpClient();
}
function isTransformStreamSupported(readableStream) {
  return readableStream.pipeThrough !== void 0 && self.TransformStream !== void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createFetchHttpClient
});
