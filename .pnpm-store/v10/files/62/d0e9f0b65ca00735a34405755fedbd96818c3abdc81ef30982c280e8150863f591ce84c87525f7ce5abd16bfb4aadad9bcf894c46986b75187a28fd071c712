// src/gateway/fetch.ts
import { Gateway } from "./gateway.mjs";
import Response from "../response.mjs";
import { configs } from "../mappersmith.mjs";
import { assign, btoa } from "../utils/index.mjs";
import { createTimeoutError } from "./timeout-error.mjs";
function mergeAbortSignals(signalA, signalB) {
  const controller = new AbortController();
  signalA.addEventListener("abort", () => controller.abort(), { once: true });
  signalB == null ? void 0 : signalB.addEventListener("abort", () => controller.abort(), { once: true });
  return controller.signal;
}
var Fetch = class extends Gateway {
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
    const fetch = configs.fetch;
    if (!fetch) {
      throw new Error(
        `[Mappersmith] global fetch does not exist, please assign "configs.fetch" to a valid implementation`
      );
    }
    const customHeaders = {};
    const body = this.prepareBody(requestMethod, customHeaders);
    const auth = this.request.auth();
    if (auth) {
      const username = auth.username || "";
      const password = auth.password || "";
      customHeaders["authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
    }
    const headers = assign(customHeaders, this.request.headers());
    const method = this.shouldEmulateHTTP() ? "post" : requestMethod;
    const userSignal = this.request.signal();
    const abortController = new AbortController();
    let signal;
    if (userSignal) {
      signal = mergeAbortSignals(abortController.signal, userSignal);
    } else {
      signal = abortController.signal;
    }
    const init = assign({ method, headers, body, signal }, this.options().Fetch);
    const timeout = this.request.timeout();
    let timer = null;
    let canceled = false;
    if (timeout) {
      timer = setTimeout(() => {
        abortController.abort();
        canceled = true;
        const error = createTimeoutError(`Timeout (${timeout}ms)`);
        this.dispatchClientError(error.message, error);
      }, timeout);
    }
    fetch(this.request.url(), init).then((fetchResponse) => {
      if (canceled) {
        return;
      }
      let responseData;
      if (this.request.isBinary()) {
        if (typeof fetchResponse.buffer === "function") {
          responseData = fetchResponse.buffer();
        } else {
          responseData = fetchResponse.arrayBuffer();
        }
      } else {
        responseData = fetchResponse.text();
      }
      responseData.then((data) => {
        this.dispatchResponse(this.createResponse(fetchResponse, data));
      });
    }).catch((error) => {
      if (canceled) {
        return;
      }
      this.dispatchClientError(error.message, error);
    }).finally(() => {
      timer && clearTimeout(timer);
    });
  }
  createResponse(fetchResponse, data) {
    const status = fetchResponse.status;
    const responseHeaders = {};
    fetchResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    return new Response(this.request, status, data, responseHeaders);
  }
};
var fetch_default = Fetch;
export {
  Fetch,
  fetch_default as default
};
//# sourceMappingURL=fetch.mjs.map