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

// src/submodules/protocols/index.ts
var protocols_exports = {};
__export(protocols_exports, {
  RequestBuilder: () => RequestBuilder,
  collectBody: () => collectBody,
  extendedEncodeURIComponent: () => extendedEncodeURIComponent,
  requestBuilder: () => requestBuilder,
  resolvedPath: () => resolvedPath
});
module.exports = __toCommonJS(protocols_exports);

// src/submodules/protocols/collect-stream-body.ts
var import_util_stream = require("@smithy/util-stream");
var collectBody = async (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return import_util_stream.Uint8ArrayBlobAdapter.mutate(streamBody);
  }
  if (!streamBody) {
    return import_util_stream.Uint8ArrayBlobAdapter.mutate(new Uint8Array());
  }
  const fromContext = context.streamCollector(streamBody);
  return import_util_stream.Uint8ArrayBlobAdapter.mutate(await fromContext);
};

// src/submodules/protocols/extended-encode-uri-component.ts
function extendedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

// src/submodules/protocols/requestBuilder.ts
var import_protocol_http = require("@smithy/protocol-http");

// src/submodules/protocols/resolve-path.ts
var resolvedPath = (resolvedPath2, input, memberName, labelValueProvider, uriLabel, isGreedyLabel) => {
  if (input != null && input[memberName] !== void 0) {
    const labelValue = labelValueProvider();
    if (labelValue.length <= 0) {
      throw new Error("Empty value provided for input HTTP label: " + memberName + ".");
    }
    resolvedPath2 = resolvedPath2.replace(
      uriLabel,
      isGreedyLabel ? labelValue.split("/").map((segment) => extendedEncodeURIComponent(segment)).join("/") : extendedEncodeURIComponent(labelValue)
    );
  } else {
    throw new Error("No value provided for input HTTP label: " + memberName + ".");
  }
  return resolvedPath2;
};

// src/submodules/protocols/requestBuilder.ts
function requestBuilder(input, context) {
  return new RequestBuilder(input, context);
}
var RequestBuilder = class {
  constructor(input, context) {
    this.input = input;
    this.context = context;
    this.query = {};
    this.method = "";
    this.headers = {};
    this.path = "";
    this.body = null;
    this.hostname = "";
    this.resolvePathStack = [];
  }
  async build() {
    const { hostname, protocol = "https", port, path: basePath } = await this.context.endpoint();
    this.path = basePath;
    for (const resolvePath of this.resolvePathStack) {
      resolvePath(this.path);
    }
    return new import_protocol_http.HttpRequest({
      protocol,
      hostname: this.hostname || hostname,
      port,
      method: this.method,
      path: this.path,
      query: this.query,
      body: this.body,
      headers: this.headers
    });
  }
  /**
   * Brevity setter for "hostname".
   */
  hn(hostname) {
    this.hostname = hostname;
    return this;
  }
  /**
   * Brevity initial builder for "basepath".
   */
  bp(uriLabel) {
    this.resolvePathStack.push((basePath) => {
      this.path = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}` + uriLabel;
    });
    return this;
  }
  /**
   * Brevity incremental builder for "path".
   */
  p(memberName, labelValueProvider, uriLabel, isGreedyLabel) {
    this.resolvePathStack.push((path) => {
      this.path = resolvedPath(path, this.input, memberName, labelValueProvider, uriLabel, isGreedyLabel);
    });
    return this;
  }
  /**
   * Brevity setter for "headers".
   */
  h(headers) {
    this.headers = headers;
    return this;
  }
  /**
   * Brevity setter for "query".
   */
  q(query) {
    this.query = query;
    return this;
  }
  /**
   * Brevity setter for "body".
   */
  b(body) {
    this.body = body;
    return this;
  }
  /**
   * Brevity setter for "method".
   */
  m(method) {
    this.method = method;
    return this;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RequestBuilder,
  collectBody,
  extendedEncodeURIComponent,
  requestBuilder,
  resolvedPath
});
