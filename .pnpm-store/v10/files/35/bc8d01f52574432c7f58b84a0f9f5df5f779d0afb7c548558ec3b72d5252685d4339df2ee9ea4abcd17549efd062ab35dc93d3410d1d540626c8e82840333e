var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Field: () => Field,
  Fields: () => Fields,
  HttpRequest: () => HttpRequest,
  HttpResponse: () => HttpResponse,
  IHttpRequest: () => import_types.HttpRequest,
  getHttpHandlerExtensionConfiguration: () => getHttpHandlerExtensionConfiguration,
  isValidHostname: () => isValidHostname,
  resolveHttpHandlerRuntimeConfig: () => resolveHttpHandlerRuntimeConfig
});
module.exports = __toCommonJS(src_exports);

// src/extensions/httpExtensionConfiguration.ts
var getHttpHandlerExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
  return {
    setHttpHandler(handler) {
      runtimeConfig.httpHandler = handler;
    },
    httpHandler() {
      return runtimeConfig.httpHandler;
    },
    updateHttpClientConfig(key, value) {
      runtimeConfig.httpHandler?.updateHttpClientConfig(key, value);
    },
    httpHandlerConfigs() {
      return runtimeConfig.httpHandler.httpHandlerConfigs();
    }
  };
}, "getHttpHandlerExtensionConfiguration");
var resolveHttpHandlerRuntimeConfig = /* @__PURE__ */ __name((httpHandlerExtensionConfiguration) => {
  return {
    httpHandler: httpHandlerExtensionConfiguration.httpHandler()
  };
}, "resolveHttpHandlerRuntimeConfig");

// src/Field.ts
var import_types = require("@smithy/types");
var Field = class {
  static {
    __name(this, "Field");
  }
  constructor({ name, kind = import_types.FieldPosition.HEADER, values = [] }) {
    this.name = name;
    this.kind = kind;
    this.values = values;
  }
  /**
   * Appends a value to the field.
   *
   * @param value The value to append.
   */
  add(value) {
    this.values.push(value);
  }
  /**
   * Overwrite existing field values.
   *
   * @param values The new field values.
   */
  set(values) {
    this.values = values;
  }
  /**
   * Remove all matching entries from list.
   *
   * @param value Value to remove.
   */
  remove(value) {
    this.values = this.values.filter((v) => v !== value);
  }
  /**
   * Get comma-delimited string.
   *
   * @returns String representation of {@link Field}.
   */
  toString() {
    return this.values.map((v) => v.includes(",") || v.includes(" ") ? `"${v}"` : v).join(", ");
  }
  /**
   * Get string values as a list
   *
   * @returns Values in {@link Field} as a list.
   */
  get() {
    return this.values;
  }
};

// src/Fields.ts
var Fields = class {
  constructor({ fields = [], encoding = "utf-8" }) {
    this.entries = {};
    fields.forEach(this.setField.bind(this));
    this.encoding = encoding;
  }
  static {
    __name(this, "Fields");
  }
  /**
   * Set entry for a {@link Field} name. The `name`
   * attribute will be used to key the collection.
   *
   * @param field The {@link Field} to set.
   */
  setField(field) {
    this.entries[field.name.toLowerCase()] = field;
  }
  /**
   *  Retrieve {@link Field} entry by name.
   *
   * @param name The name of the {@link Field} entry
   *  to retrieve
   * @returns The {@link Field} if it exists.
   */
  getField(name) {
    return this.entries[name.toLowerCase()];
  }
  /**
   * Delete entry from collection.
   *
   * @param name Name of the entry to delete.
   */
  removeField(name) {
    delete this.entries[name.toLowerCase()];
  }
  /**
   * Helper function for retrieving specific types of fields.
   * Used to grab all headers or all trailers.
   *
   * @param kind {@link FieldPosition} of entries to retrieve.
   * @returns The {@link Field} entries with the specified
   *  {@link FieldPosition}.
   */
  getByType(kind) {
    return Object.values(this.entries).filter((field) => field.kind === kind);
  }
};

// src/httpRequest.ts

var HttpRequest = class _HttpRequest {
  static {
    __name(this, "HttpRequest");
  }
  constructor(options) {
    this.method = options.method || "GET";
    this.hostname = options.hostname || "localhost";
    this.port = options.port;
    this.query = options.query || {};
    this.headers = options.headers || {};
    this.body = options.body;
    this.protocol = options.protocol ? options.protocol.slice(-1) !== ":" ? `${options.protocol}:` : options.protocol : "https:";
    this.path = options.path ? options.path.charAt(0) !== "/" ? `/${options.path}` : options.path : "/";
    this.username = options.username;
    this.password = options.password;
    this.fragment = options.fragment;
  }
  /**
   * Note: this does not deep-clone the body.
   */
  static clone(request) {
    const cloned = new _HttpRequest({
      ...request,
      headers: { ...request.headers }
    });
    if (cloned.query) {
      cloned.query = cloneQuery(cloned.query);
    }
    return cloned;
  }
  /**
   * This method only actually asserts that request is the interface {@link IHttpRequest},
   * and not necessarily this concrete class. Left in place for API stability.
   *
   * Do not call instance methods on the input of this function, and
   * do not assume it has the HttpRequest prototype.
   */
  static isInstance(request) {
    if (!request) {
      return false;
    }
    const req = request;
    return "method" in req && "protocol" in req && "hostname" in req && "path" in req && typeof req["query"] === "object" && typeof req["headers"] === "object";
  }
  /**
   * @deprecated use static HttpRequest.clone(request) instead. It's not safe to call
   * this method because {@link HttpRequest.isInstance} incorrectly
   * asserts that IHttpRequest (interface) objects are of type HttpRequest (class).
   */
  clone() {
    return _HttpRequest.clone(this);
  }
};
function cloneQuery(query) {
  return Object.keys(query).reduce((carry, paramName) => {
    const param = query[paramName];
    return {
      ...carry,
      [paramName]: Array.isArray(param) ? [...param] : param
    };
  }, {});
}
__name(cloneQuery, "cloneQuery");

// src/httpResponse.ts
var HttpResponse = class {
  static {
    __name(this, "HttpResponse");
  }
  constructor(options) {
    this.statusCode = options.statusCode;
    this.reason = options.reason;
    this.headers = options.headers || {};
    this.body = options.body;
  }
  static isInstance(response) {
    if (!response)
      return false;
    const resp = response;
    return typeof resp.statusCode === "number" && typeof resp.headers === "object";
  }
};

// src/isValidHostname.ts
function isValidHostname(hostname) {
  const hostPattern = /^[a-z0-9][a-z0-9\.\-]*[a-z0-9]$/;
  return hostPattern.test(hostname);
}
__name(isValidHostname, "isValidHostname");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  getHttpHandlerExtensionConfiguration,
  resolveHttpHandlerRuntimeConfig,
  Field,
  Fields,
  HttpRequest,
  HttpResponse,
  isValidHostname
});

