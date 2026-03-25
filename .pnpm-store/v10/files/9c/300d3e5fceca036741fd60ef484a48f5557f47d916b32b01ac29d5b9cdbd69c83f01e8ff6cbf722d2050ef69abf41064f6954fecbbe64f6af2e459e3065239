// src/middleware/method-override/index.ts
import { parseBody } from "../../utils/body.js";
var DEFAULT_METHOD_FORM_NAME = "_method";
var methodOverride = (options) => async function methodOverride2(c, next) {
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
      const params = await parseBody(clonedRequest);
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
var getExecutionCtx = (c) => {
  let executionCtx;
  try {
    executionCtx = c.executionCtx;
  } catch {
  }
  return executionCtx;
};
export {
  methodOverride
};
