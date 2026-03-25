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
var client_exports = {};
__export(client_exports, {
  hc: () => hc
});
module.exports = __toCommonJS(client_exports);
var import_cookie = require("../utils/cookie");
var import_utils = require("./utils");
const createProxy = (callback, path) => {
  const proxy = new Proxy(() => {
  }, {
    get(_obj, key) {
      if (typeof key !== "string" || key === "then") {
        return void 0;
      }
      return createProxy(callback, [...path, key]);
    },
    apply(_1, _2, args) {
      return callback({
        path,
        args
      });
    }
  });
  return proxy;
};
class ClientRequestImpl {
  url;
  method;
  buildSearchParams;
  queryParams = void 0;
  pathParams = {};
  rBody;
  cType = void 0;
  constructor(url, method, options) {
    this.url = url;
    this.method = method;
    this.buildSearchParams = options.buildSearchParams;
  }
  fetch = async (args, opt) => {
    if (args) {
      if (args.query) {
        this.queryParams = this.buildSearchParams(args.query);
      }
      if (args.form) {
        const form = new FormData();
        for (const [k, v] of Object.entries(args.form)) {
          if (v === void 0) {
            continue;
          }
          if (Array.isArray(v)) {
            for (const v2 of v) {
              form.append(k, v2);
            }
          } else {
            form.append(k, v);
          }
        }
        this.rBody = form;
      }
      if (args.json) {
        this.rBody = JSON.stringify(args.json);
        this.cType = "application/json";
      }
      if (args.param) {
        this.pathParams = args.param;
      }
    }
    let methodUpperCase = this.method.toUpperCase();
    const headerValues = {
      ...args?.header,
      ...typeof opt?.headers === "function" ? await opt.headers() : opt?.headers
    };
    if (args?.cookie) {
      const cookies = [];
      for (const [key, value] of Object.entries(args.cookie)) {
        cookies.push((0, import_cookie.serialize)(key, value, { path: "/" }));
      }
      headerValues["Cookie"] = cookies.join(",");
    }
    if (this.cType) {
      headerValues["Content-Type"] = this.cType;
    }
    const headers = new Headers(headerValues ?? void 0);
    let url = this.url;
    url = (0, import_utils.removeIndexString)(url);
    url = (0, import_utils.replaceUrlParam)(url, this.pathParams);
    if (this.queryParams) {
      url = url + "?" + this.queryParams.toString();
    }
    methodUpperCase = this.method.toUpperCase();
    const setBody = !(methodUpperCase === "GET" || methodUpperCase === "HEAD");
    return (opt?.fetch || fetch)(url, {
      body: setBody ? this.rBody : void 0,
      method: methodUpperCase,
      headers,
      ...opt?.init
    });
  };
}
const hc = (baseUrl, options) => createProxy(function proxyCallback(opts) {
  const buildSearchParamsOption = options?.buildSearchParams ?? import_utils.buildSearchParams;
  const parts = [...opts.path];
  const lastParts = parts.slice(-3).reverse();
  if (lastParts[0] === "toString") {
    if (lastParts[1] === "name") {
      return lastParts[2] || "";
    }
    return proxyCallback.toString();
  }
  if (lastParts[0] === "valueOf") {
    if (lastParts[1] === "name") {
      return lastParts[2] || "";
    }
    return proxyCallback;
  }
  let method = "";
  if (/^\$/.test(lastParts[0])) {
    const last = parts.pop();
    if (last) {
      method = last.replace(/^\$/, "");
    }
  }
  const path = parts.join("/");
  const url = (0, import_utils.mergePath)(baseUrl, path);
  if (method === "url" || method === "path") {
    let result = url;
    if (opts.args[0]) {
      if (opts.args[0].param) {
        result = (0, import_utils.replaceUrlParam)(url, opts.args[0].param);
      }
      if (opts.args[0].query) {
        result = result + "?" + buildSearchParamsOption(opts.args[0].query).toString();
      }
    }
    result = (0, import_utils.removeIndexString)(result);
    if (method === "url") {
      return new URL(result);
    }
    return result.slice(baseUrl.replace(/\/+$/, "").length).replace(/^\/?/, "/");
  }
  if (method === "ws") {
    const webSocketUrl = (0, import_utils.replaceUrlProtocol)(
      opts.args[0] && opts.args[0].param ? (0, import_utils.replaceUrlParam)(url, opts.args[0].param) : url,
      "ws"
    );
    const targetUrl = new URL(webSocketUrl);
    const queryParams = opts.args[0]?.query;
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => targetUrl.searchParams.append(key, item));
        } else {
          targetUrl.searchParams.set(key, value);
        }
      });
    }
    const establishWebSocket = (...args) => {
      if (options?.webSocket !== void 0 && typeof options.webSocket === "function") {
        return options.webSocket(...args);
      }
      return new WebSocket(...args);
    };
    return establishWebSocket(targetUrl.toString());
  }
  const req = new ClientRequestImpl(url, method, {
    buildSearchParams: buildSearchParamsOption
  });
  if (method) {
    options ??= {};
    const args = (0, import_utils.deepMerge)(options, { ...opts.args[1] });
    return req.fetch(opts.args[0], args);
  }
  return req;
}, []);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hc
});
