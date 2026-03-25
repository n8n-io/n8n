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
var middleware_exports = {};
__export(middleware_exports, {
  SSG_CONTEXT: () => SSG_CONTEXT,
  SSG_DISABLED_RESPONSE: () => SSG_DISABLED_RESPONSE,
  X_HONO_DISABLE_SSG_HEADER_KEY: () => X_HONO_DISABLE_SSG_HEADER_KEY,
  disableSSG: () => disableSSG,
  isSSGContext: () => isSSGContext,
  onlySSG: () => onlySSG,
  ssgParams: () => ssgParams
});
module.exports = __toCommonJS(middleware_exports);
var import_utils = require("./utils");
const SSG_CONTEXT = "HONO_SSG_CONTEXT";
const X_HONO_DISABLE_SSG_HEADER_KEY = "x-hono-disable-ssg";
const SSG_DISABLED_RESPONSE = (() => {
  try {
    return new Response("SSG is disabled", {
      status: 404,
      headers: { [X_HONO_DISABLE_SSG_HEADER_KEY]: "true" }
    });
  } catch {
    return null;
  }
})();
const ssgParams = (params) => async (c, next) => {
  if ((0, import_utils.isDynamicRoute)(c.req.path)) {
    ;
    c.req.raw.ssgParams = Array.isArray(params) ? params : await params(c);
    return c.notFound();
  }
  await next();
};
const isSSGContext = (c) => !!c.env?.[SSG_CONTEXT];
const disableSSG = () => async function disableSSG2(c, next) {
  if (isSSGContext(c)) {
    c.header(X_HONO_DISABLE_SSG_HEADER_KEY, "true");
    return c.notFound();
  }
  await next();
};
const onlySSG = () => async function onlySSG2(c, next) {
  if (!isSSGContext(c)) {
    return c.notFound();
  }
  await next();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SSG_CONTEXT,
  SSG_DISABLED_RESPONSE,
  X_HONO_DISABLE_SSG_HEADER_KEY,
  disableSSG,
  isSSGContext,
  onlySSG,
  ssgParams
});
