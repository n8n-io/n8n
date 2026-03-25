// src/middleware/powered-by/index.ts
var poweredBy = (options) => {
  return async function poweredBy2(c, next) {
    await next();
    c.res.headers.set("X-Powered-By", options?.serverName ?? "Hono");
  };
};
export {
  poweredBy
};
