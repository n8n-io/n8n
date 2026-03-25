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
var trailing_slash_exports = {};
__export(trailing_slash_exports, {
  appendTrailingSlash: () => appendTrailingSlash,
  trimTrailingSlash: () => trimTrailingSlash
});
module.exports = __toCommonJS(trailing_slash_exports);
const trimTrailingSlash = (options) => {
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
const appendTrailingSlash = (options) => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appendTrailingSlash,
  trimTrailingSlash
});
