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
var handler_exports = {};
__export(handler_exports, {
  handle: () => handle,
  handleMiddleware: () => handleMiddleware,
  serveStatic: () => serveStatic
});
module.exports = __toCommonJS(handler_exports);
var import_context = require("../../context");
var import_http_exception = require("../../http-exception");
const handle = (app) => (eventContext) => {
  return app.fetch(
    eventContext.request,
    { ...eventContext.env, eventContext },
    {
      waitUntil: eventContext.waitUntil,
      passThroughOnException: eventContext.passThroughOnException,
      props: {}
    }
  );
};
function handleMiddleware(middleware) {
  return async (executionCtx) => {
    const context = new import_context.Context(executionCtx.request, {
      env: { ...executionCtx.env, eventContext: executionCtx },
      executionCtx
    });
    let response = void 0;
    try {
      response = await middleware(context, async () => {
        try {
          context.res = await executionCtx.next();
        } catch (error) {
          if (error instanceof Error) {
            context.error = error;
          } else {
            throw error;
          }
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        context.error = error;
      } else {
        throw error;
      }
    }
    if (response) {
      return response;
    }
    if (context.error instanceof import_http_exception.HTTPException) {
      return context.error.getResponse();
    }
    if (context.error) {
      throw context.error;
    }
    return context.res;
  };
}
const serveStatic = () => {
  return async (c) => {
    const env = c.env;
    const res = await env.ASSETS.fetch(c.req.raw);
    if (res.status === 404) {
      return c.notFound();
    }
    return res;
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handle,
  handleMiddleware,
  serveStatic
});
