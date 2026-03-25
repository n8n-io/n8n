// src/middleware/trailing-slash/index.ts
var trimTrailingSlash = (options) => {
  return async function trimTrailingSlash2(c, next) {
    if (options?.alwaysRedirect) {
      if ((c.req.method === "GET" || c.req.method === "HEAD") && c.req.path !== "/" && c.req.path.at(-1) === "/") {
        const url = new URL(c.req.url);
        url.pathname = url.pathname.substring(0, url.pathname.length - 1);
        return c.redirect(url.toString(), 301);
      }
    }
    await next();
    if (!options?.alwaysRedirect && c.res.status === 404 && (c.req.method === "GET" || c.req.method === "HEAD") && c.req.path !== "/" && c.req.path.at(-1) === "/") {
      const url = new URL(c.req.url);
      url.pathname = url.pathname.substring(0, url.pathname.length - 1);
      c.res = c.redirect(url.toString(), 301);
    }
  };
};
var appendTrailingSlash = (options) => {
  return async function appendTrailingSlash2(c, next) {
    if (options?.alwaysRedirect) {
      if ((c.req.method === "GET" || c.req.method === "HEAD") && c.req.path.at(-1) !== "/") {
        const url = new URL(c.req.url);
        url.pathname += "/";
        return c.redirect(url.toString(), 301);
      }
    }
    await next();
    if (!options?.alwaysRedirect && c.res.status === 404 && (c.req.method === "GET" || c.req.method === "HEAD") && c.req.path.at(-1) !== "/") {
      const url = new URL(c.req.url);
      url.pathname += "/";
      c.res = c.redirect(url.toString(), 301);
    }
  };
};
export {
  appendTrailingSlash,
  trimTrailingSlash
};
