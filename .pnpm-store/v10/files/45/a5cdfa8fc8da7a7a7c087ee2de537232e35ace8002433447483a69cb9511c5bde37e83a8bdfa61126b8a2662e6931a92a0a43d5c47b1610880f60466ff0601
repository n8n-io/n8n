// src/helper/route/index.ts
import { GET_MATCH_RESULT } from "../../request/constants.js";
import { getPattern, splitRoutingPath } from "../../utils/url.js";
var matchedRoutes = (c) => (
  // @ts-expect-error c.req[GET_MATCH_RESULT] is not typed
  c.req[GET_MATCH_RESULT][0].map(([[, route]]) => route)
);
var routePath = (c, index) => matchedRoutes(c).at(index ?? c.req.routeIndex)?.path ?? "";
var baseRoutePath = (c, index) => matchedRoutes(c).at(index ?? c.req.routeIndex)?.basePath ?? "";
var basePathCacheMap = /* @__PURE__ */ new WeakMap();
var basePath = (c, index) => {
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
    const paths = splitRoutingPath(rp);
    const reqPath = c.req.path;
    let basePathLength = 0;
    for (let i = 0, len = paths.length; i < len; i++) {
      const pattern = getPattern(paths[i], paths[i + 1]);
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
export {
  basePath,
  baseRoutePath,
  matchedRoutes,
  routePath
};
