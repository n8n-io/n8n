// src/router/pattern-router/router.ts
import { METHOD_NAME_ALL, UnsupportedPathError } from "../../router.js";
var emptyParams = /* @__PURE__ */ Object.create(null);
var PatternRouter = class {
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
      throw new UnsupportedPathError();
    }
  }
  match(method, path) {
    const handlers = [];
    for (let i = 0, len = this.#routes.length; i < len; i++) {
      const [pattern, routeMethod, handler] = this.#routes[i];
      if (routeMethod === method || routeMethod === METHOD_NAME_ALL) {
        const match = pattern.exec(path);
        if (match) {
          handlers.push([handler, match.groups || emptyParams]);
        }
      }
    }
    return [handlers];
  }
};
export {
  PatternRouter
};
