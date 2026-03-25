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
var method_override_exports = {};
__export(method_override_exports, {
  methodOverride: () => methodOverride
});
module.exports = __toCommonJS(method_override_exports);
var import_body = require("../../utils/body");
const DEFAULT_METHOD_FORM_NAME = "_method";
const methodOverride = (options) => async function methodOverride2(c, next) {
  if (c.req.method === "GET") {
    return await next();
  }
  const app = options.app;
  if (!(options.header || options.query)) {
    const contentType = c.req.header("content-type");
    const methodFormName = options.form || DEFAULT_METHOD_FORM_NAME;
    const clonedRequest = c.req.raw.clone();
    const newRequest = clonedRequest.clone();
    if (contentType?.startsWith("multipart/form-data")) {
      const form = await clonedRequest.formData();
      const method = form.get(methodFormName);
      if (method) {
        const newForm = await newRequest.formData();
        newForm.delete(methodFormName);
        const newHeaders = new Headers(clonedRequest.headers);
        newHeaders.delete("content-type");
        newHeaders.delete("content-length");
        const request = new Request(c.req.url, {
          body: newForm,
          headers: newHeaders,
          method
        });
        return app.fetch(request, c.env, getExecutionCtx(c));
      }
    }
    if (contentType === "application/x-www-form-urlencoded") {
      const params = await (0, import_body.parseBody)(clonedRequest);
      const method = params[methodFormName];
      if (method) {
        delete params[methodFormName];
        const newParams = new URLSearchParams(params);
        const request = new Request(newRequest, {
          body: newParams,
          method
        });
        return app.fetch(request, c.env, getExecutionCtx(c));
      }
    }
  } else if (options.header) {
    const headerName = options.header;
    const method = c.req.header(headerName);
    if (method) {
      const newHeaders = new Headers(c.req.raw.headers);
      newHeaders.delete(headerName);
      const request = new Request(c.req.raw, {
        headers: newHeaders,
        method
      });
      return app.fetch(request, c.env, getExecutionCtx(c));
    }
  } else if (options.query) {
    const queryName = options.query;
    const method = c.req.query(queryName);
    if (method) {
      const url = new URL(c.req.url);
      url.searchParams.delete(queryName);
      const request = new Request(url.toString(), {
        body: c.req.raw.body,
        headers: c.req.raw.headers,
        method
      });
      return app.fetch(request, c.env, getExecutionCtx(c));
    }
  }
  await next();
};
const getExecutionCtx = (c) => {
  let executionCtx;
  try {
    executionCtx = c.executionCtx;
  } catch {
  }
  return executionCtx;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  methodOverride
});
