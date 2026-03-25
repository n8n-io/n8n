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
var router_exports = {};
__export(router_exports, {
  PatternRouter: () => PatternRouter
});
module.exports = __toCommonJS(router_exports);
var import_router = require("../../router");
const emptyParams = /* @__PURE__ */ Object.create(null);
class PatternRouter {
  name = "PatternRouter";
  #routes = [];
  add(method, path, handler) {
    const endsWithWildcard = path.at(-1) === "*";
    if (endsWithWildcard) {
      path = path.slice(0, -2);
    }
    if (path.at(-1) === "?") {
      path = path.slice(0, -1);
      this.add(method, path.replace(/\/[^/]+$/, ""), handler);
    }
    const parts = (path.match(/\/?(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/?[^\/\?]+/g) || []).map(
      (part) => {
        const match = part.match(/^\/:([^{]+)(?:{(.*)})?/);
        return match ? `/(?<${match[1]}>${match[2] || "[^/]+"})` : part === "/*" ? "/[^/]+" : part.replace(/[.\\+*[^\]$()]/g, "\\$&");
      }
    );
    try {
      this.#routes.push([
        new RegExp(`^${parts.join("")}${endsWithWildcard ? "" : "/?$"}`),
        method,
        handler
      ]);
    } catch {
      throw new import_router.UnsupportedPathError();
    }
  }
  match(method, path) {
    const handlers = [];
    for (let i = 0, len = this.#routes.length; i < len; i++) {
      const [pattern, routeMethod, handler] = this.#routes[i];
      if (routeMethod === method || routeMethod === import_router.METHOD_NAME_ALL) {
        const match = pattern.exec(path);
        if (match) {
          handlers.push([handler, match.groups || emptyParams]);
        }
      }
    }
    return [handlers];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PatternRouter
});
