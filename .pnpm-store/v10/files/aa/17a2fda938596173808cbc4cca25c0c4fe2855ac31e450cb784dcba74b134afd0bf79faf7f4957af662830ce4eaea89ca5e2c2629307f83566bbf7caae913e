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
var dev_exports = {};
__export(dev_exports, {
  getRouterName: () => getRouterName,
  inspectRoutes: () => inspectRoutes,
  showRoutes: () => showRoutes
});
module.exports = __toCommonJS(dev_exports);
var import_color = require("../../utils/color");
var import_handler = require("../../utils/handler");
const handlerName = (handler) => {
  return handler.name || ((0, import_handler.isMiddleware)(handler) ? "[middleware]" : "[handler]");
};
const inspectRoutes = (hono) => {
  return hono.routes.map(({ path, method, handler }) => {
    const targetHandler = (0, import_handler.findTargetHandler)(handler);
    return {
      path,
      method,
      name: handlerName(targetHandler),
      isMiddleware: (0, import_handler.isMiddleware)(targetHandler)
    };
  });
};
const showRoutes = (hono, opts) => {
  const colorEnabled = opts?.colorize ?? (0, import_color.getColorEnabled)();
  const routeData = {};
  let maxMethodLength = 0;
  let maxPathLength = 0;
  inspectRoutes(hono).filter(({ isMiddleware: isMiddleware2 }) => opts?.verbose || !isMiddleware2).map((route) => {
    const key = `${route.method}-${route.path}`;
    (routeData[key] ||= []).push(route);
    if (routeData[key].length > 1) {
      return;
    }
    maxMethodLength = Math.max(maxMethodLength, route.method.length);
    maxPathLength = Math.max(maxPathLength, route.path.length);
    return { method: route.method, path: route.path, routes: routeData[key] };
  }).forEach((data) => {
    if (!data) {
      return;
    }
    const { method, path, routes } = data;
    const methodStr = colorEnabled ? `\x1B[32m${method}\x1B[0m` : method;
    console.log(`${methodStr} ${" ".repeat(maxMethodLength - method.length)} ${path}`);
    if (!opts?.verbose) {
      return;
    }
    routes.forEach(({ name }) => {
      console.log(`${" ".repeat(maxMethodLength + 3)} ${name}`);
    });
  });
};
const getRouterName = (app) => {
  app.router.match("GET", "/");
  return app.router.name;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getRouterName,
  inspectRoutes,
  showRoutes
});
