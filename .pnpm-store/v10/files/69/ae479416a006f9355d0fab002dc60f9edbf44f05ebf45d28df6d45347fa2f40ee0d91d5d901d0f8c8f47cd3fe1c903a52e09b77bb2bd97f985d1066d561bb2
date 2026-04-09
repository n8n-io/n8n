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
var nodeHttpClient_exports = {};
__export(nodeHttpClient_exports, {
  createNodeHttpClient: () => createNodeHttpClient,
  getBodyLength: () => getBodyLength
});
module.exports = __toCommonJS(nodeHttpClient_exports);
var import_node_http = __toESM(require("node:http"));
var import_node_https = __toESM(require("node:https"));
var import_node_zlib = __toESM(require("node:zlib"));
var import_node_stream = require("node:stream");
var import_AbortError = require("./abort-controller/AbortError.js");
var import_httpHeaders = require("./httpHeaders.js");
var import_restError = require("./restError.js");
var import_log = require("./log.js");
var import_sanitizer = require("./util/sanitizer.js");
const DEFAULT_TLS_SETTINGS = {};
function isReadableStream(body) {
  return body && typeof body.pipe === "function";
}
function isStreamComplete(stream) {
  if (stream.readable === false) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const handler = () => {
      resolve();
      stream.removeListener("close", handler);
      stream.removeListener("end", handler);
      stream.removeListener("error", handler);
    };
    stream.on("close", handler);
    stream.on("end", handler);
    stream.on("error", handler);
  });
}
function isArrayBuffer(body) {
  return body && typeof body.byteLength === "number";
}
class ReportTransform extends import_node_stream.Transform {
  loadedBytes = 0;
  progressCallback;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  _transform(chunk, _encoding, callback) {
    this.push(chunk);
    this.loadedBytes += chunk.length;
    try {
      this.progressCallback({ loadedBytes: this.loadedBytes });
      callback();
    } catch (e) {
      callback(e);
    }
  }
  constructor(progressCallback) {
    super();
    this.progressCallback = progressCallback;
  }
}
class NodeHttpClient {
  cachedHttpAgent;
  cachedHttpsAgents = /* @__PURE__ */ new WeakMap();
  /**
   * Makes a request over an underlying transport layer and returns the response.
   * @param request - The request to be made.
   */
  async sendRequest(request) {
    const abortController = new AbortController();
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
    }
    let timeoutId;
    if (request.timeout > 0) {
      timeoutId = setTimeout(() => {
        const sanitizer = new import_sanitizer.Sanitizer();
        import_log.logger.info(`request to '${sanitizer.sanitizeUrl(request.url)}' timed out. canceling...`);
        abortController.abort();
      }, request.timeout);
    }
    const acceptEncoding = request.headers.get("Accept-Encoding");
    const shouldDecompress = acceptEncoding?.includes("gzip") || acceptEncoding?.includes("deflate");
    let body = typeof request.body === "function" ? request.body() : request.body;
    if (body && !request.headers.has("Content-Length")) {
      const bodyLength = getBodyLength(body);
      if (bodyLength !== null) {
        request.headers.set("Content-Length", bodyLength);
      }
    }
    let responseStream;
    try {
      if (body && request.onUploadProgress) {
        const onUploadProgress = request.onUploadProgress;
        const uploadReportStream = new ReportTransform(onUploadProgress);
        uploadReportStream.on("error", (e) => {
          import_log.logger.error("Error in upload progress", e);
        });
        if (isReadableStream(body)) {
          body.pipe(uploadReportStream);
        } else {
          uploadReportStream.end(body);
        }
        body = uploadReportStream;
      }
      const res = await this.makeRequest(request, abortController, body);
      if (timeoutId !== void 0) {
        clearTimeout(timeoutId);
      }
      const headers = getResponseHeaders(res);
      const status = res.statusCode ?? 0;
      const response = {
        status,
        headers,
        request
      };
      if (request.method === "HEAD") {
        res.resume();
        return response;
      }
      responseStream = shouldDecompress ? getDecodedResponseStream(res, headers) : res;
      const onDownloadProgress = request.onDownloadProgress;
      if (onDownloadProgress) {
        const downloadReportStream = new ReportTransform(onDownloadProgress);
        downloadReportStream.on("error", (e) => {
          import_log.logger.error("Error in download progress", e);
        });
        responseStream.pipe(downloadReportStream);
        responseStream = downloadReportStream;
      }
      if (
        // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
        request.streamResponseStatusCodes?.has(Number.POSITIVE_INFINITY) || request.streamResponseStatusCodes?.has(response.status)
      ) {
        response.readableStreamBody = responseStream;
      } else {
        response.bodyAsText = await streamToText(responseStream);
      }
      return response;
    } finally {
      if (request.abortSignal && abortListener) {
        let uploadStreamDone = Promise.resolve();
        if (isReadableStream(body)) {
          uploadStreamDone = isStreamComplete(body);
        }
        let downloadStreamDone = Promise.resolve();
        if (isReadableStream(responseStream)) {
          downloadStreamDone = isStreamComplete(responseStream);
        }
        Promise.all([uploadStreamDone, downloadStreamDone]).then(() => {
          if (abortListener) {
            request.abortSignal?.removeEventListener("abort", abortListener);
          }
        }).catch((e) => {
          import_log.logger.warning("Error when cleaning up abortListener on httpRequest", e);
        });
      }
    }
  }
  makeRequest(request, abortController, body) {
    const url = new URL(request.url);
    const isInsecure = url.protocol !== "https:";
    if (isInsecure && !request.allowInsecureConnection) {
      throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
    }
    const agent = request.agent ?? this.getOrCreateAgent(request, isInsecure);
    const options = {
      agent,
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      port: url.port,
      method: request.method,
      headers: request.headers.toJSON({ preserveCase: true }),
      ...request.requestOverrides
    };
    return new Promise((resolve, reject) => {
      const req = isInsecure ? import_node_http.default.request(options, resolve) : import_node_https.default.request(options, resolve);
      req.once("error", (err) => {
        reject(
          new import_restError.RestError(err.message, { code: err.code ?? import_restError.RestError.REQUEST_SEND_ERROR, request })
        );
      });
      abortController.signal.addEventListener("abort", () => {
        const abortError = new import_AbortError.AbortError(
          "The operation was aborted. Rejecting from abort signal callback while making request."
        );
        req.destroy(abortError);
        reject(abortError);
      });
      if (body && isReadableStream(body)) {
        body.pipe(req);
      } else if (body) {
        if (typeof body === "string" || Buffer.isBuffer(body)) {
          req.end(body);
        } else if (isArrayBuffer(body)) {
          req.end(ArrayBuffer.isView(body) ? Buffer.from(body.buffer) : Buffer.from(body));
        } else {
          import_log.logger.error("Unrecognized body type", body);
          reject(new import_restError.RestError("Unrecognized body type"));
        }
      } else {
        req.end();
      }
    });
  }
  getOrCreateAgent(request, isInsecure) {
    const disableKeepAlive = request.disableKeepAlive;
    if (isInsecure) {
      if (disableKeepAlive) {
        return import_node_http.default.globalAgent;
      }
      if (!this.cachedHttpAgent) {
        this.cachedHttpAgent = new import_node_http.default.Agent({ keepAlive: true });
      }
      return this.cachedHttpAgent;
    } else {
      if (disableKeepAlive && !request.tlsSettings) {
        return import_node_https.default.globalAgent;
      }
      const tlsSettings = request.tlsSettings ?? DEFAULT_TLS_SETTINGS;
      let agent = this.cachedHttpsAgents.get(tlsSettings);
      if (agent && agent.options.keepAlive === !disableKeepAlive) {
        return agent;
      }
      import_log.logger.info("No cached TLS Agent exist, creating a new Agent");
      agent = new import_node_https.default.Agent({
        // keepAlive is true if disableKeepAlive is false.
        keepAlive: !disableKeepAlive,
        // Since we are spreading, if no tslSettings were provided, nothing is added to the agent options.
        ...tlsSettings
      });
      this.cachedHttpsAgents.set(tlsSettings, agent);
      return agent;
    }
  }
}
function getResponseHeaders(res) {
  const headers = (0, import_httpHeaders.createHttpHeaders)();
  for (const header of Object.keys(res.headers)) {
    const value = res.headers[header];
    if (Array.isArray(value)) {
      if (value.length > 0) {
        headers.set(header, value[0]);
      }
    } else if (value) {
      headers.set(header, value);
    }
  }
  return headers;
}
function getDecodedResponseStream(stream, headers) {
  const contentEncoding = headers.get("Content-Encoding");
  if (contentEncoding === "gzip") {
    const unzip = import_node_zlib.default.createGunzip();
    stream.pipe(unzip);
    return unzip;
  } else if (contentEncoding === "deflate") {
    const inflate = import_node_zlib.default.createInflate();
    stream.pipe(inflate);
    return inflate;
  }
  return stream;
}
function streamToText(stream) {
  return new Promise((resolve, reject) => {
    const buffer = [];
    stream.on("data", (chunk) => {
      if (Buffer.isBuffer(chunk)) {
        buffer.push(chunk);
      } else {
        buffer.push(Buffer.from(chunk));
      }
    });
    stream.on("end", () => {
      resolve(Buffer.concat(buffer).toString("utf8"));
    });
    stream.on("error", (e) => {
      if (e && e?.name === "AbortError") {
        reject(e);
      } else {
        reject(
          new import_restError.RestError(`Error reading response as text: ${e.message}`, {
            code: import_restError.RestError.PARSE_ERROR
          })
        );
      }
    });
  });
}
function getBodyLength(body) {
  if (!body) {
    return 0;
  } else if (Buffer.isBuffer(body)) {
    return body.length;
  } else if (isReadableStream(body)) {
    return null;
  } else if (isArrayBuffer(body)) {
    return body.byteLength;
  } else if (typeof body === "string") {
    return Buffer.from(body).length;
  } else {
    return null;
  }
}
function createNodeHttpClient() {
  return new NodeHttpClient();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createNodeHttpClient,
  getBodyLength
});
