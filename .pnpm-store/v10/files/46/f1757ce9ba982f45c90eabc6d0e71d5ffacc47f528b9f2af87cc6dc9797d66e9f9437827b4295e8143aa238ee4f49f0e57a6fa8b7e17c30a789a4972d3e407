// src/adapter/cloudflare-pages/handler.ts
import { Context } from "../../context.js";
import { HTTPException } from "../../http-exception.js";
var handle = (app) => (eventContext) => {
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
    const context = new Context(executionCtx.request, {
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
    if (context.error instanceof HTTPException) {
      return context.error.getResponse();
    }
    if (context.error) {
      throw context.error;
    }
    return context.res;
  };
}
var serveStatic = () => {
  return async (c) => {
    const env = c.env;
    const res = await env.ASSETS.fetch(c.req.raw);
    if (res.status === 404) {
      return c.notFound();
    }
    return res;
  };
};
export {
  handle,
  handleMiddleware,
  serveStatic
};
