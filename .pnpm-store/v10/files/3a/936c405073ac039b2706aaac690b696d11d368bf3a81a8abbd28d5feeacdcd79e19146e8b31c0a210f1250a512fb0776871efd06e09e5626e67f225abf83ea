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
var route_exports = {};
__export(route_exports, {
  basePath: () => basePath,
  baseRoutePath: () => baseRoutePath,
  matchedRoutes: () => matchedRoutes,
  routePath: () => routePath
});
module.exports = __toCommonJS(route_exports);
var import_constants = require("../../request/constants");
var import_url = require("../../utils/url");
const matchedRoutes = (c) => (
  // @ts-expect-error c.req[GET_MATCH_RESULT] is not typed
  c.req[import_constants.GET_MATCH_RESULT][0].map(([[, route]]) => route)
);
const routePath = (c, index) => matchedRoutes(c).at(index ?? c.req.routeIndex)?.path ?? "";
const baseRoutePath = (c, index) => matchedRoutes(c).at(index ?? c.req.routeIndex)?.basePath ?? "";
const basePathCacheMap = /* @__PURE__ */ new WeakMap();
const basePath = (c, index) => {
  index ??= c.req.routeIndex;
  const cache = basePathCacheMap.get(c) || [];
  if (typeof cache[index] === "string") {
    return cache[index];
  }
  let result;
  const rp = baseRoutePath(c, index);
  if (!/[:*]/.test(rp)) {
    result = rp;
  } else {
    const paths = (0, import_url.splitRoutingPath)(rp);
    const reqPath = c.req.path;
    let basePathLength = 0;
    for (let i = 0, len = paths.length; i < len; i++) {
      const pattern = (0, import_url.getPattern)(paths[i], paths[i + 1]);
      if (pattern) {
        const re = pattern[2] === true || pattern === "*" ? /[^\/]+/ : pattern[2];
        basePathLength += reqPath.substring(basePathLength + 1).match(re)?.[0].length || 0;
      } else {
        basePathLength += paths[i].length;
      }
      basePathLength += 1;
    }
    result = reqPath.substring(0, basePathLength);
  }
  cache[index] = result;
  basePathCacheMap.set(c, cache);
  return result;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  basePath,
  baseRoutePath,
  matchedRoutes,
  routePath
});
