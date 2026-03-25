// src/helper/ssg/middleware.ts
import { isDynamicRoute } from "./utils.js";
var SSG_CONTEXT = "HONO_SSG_CONTEXT";
var X_HONO_DISABLE_SSG_HEADER_KEY = "x-hono-disable-ssg";
var SSG_DISABLED_RESPONSE = (() => {
  try {
    return new Response("SSG is disabled", {
      status: 404,
      headers: { [X_HONO_DISABLE_SSG_HEADER_KEY]: "true" }
    });
  } catch {
    return null;
  }
})();
var ssgParams = (params) => async (c, next) => {
  if (isDynamicRoute(c.req.path)) {
    ;
    c.req.raw.ssgParams = Array.isArray(params) ? params : await params(c);
    return c.notFound();
  }
  await next();
};
var isSSGContext = (c) => !!c.env?.[SSG_CONTEXT];
var disableSSG = () => async function disableSSG2(c, next) {
  if (isSSGContext(c)) {
    c.header(X_HONO_DISABLE_SSG_HEADER_KEY, "true");
    return c.notFound();
  }
  await next();
};
var onlySSG = () => async function onlySSG2(c, next) {
  if (!isSSGContext(c)) {
    return c.notFound();
  }
  await next();
};
export {
  SSG_CONTEXT,
  SSG_DISABLED_RESPONSE,
  X_HONO_DISABLE_SSG_HEADER_KEY,
  disableSSG,
  isSSGContext,
  onlySSG,
  ssgParams
};
