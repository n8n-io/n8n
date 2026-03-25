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
var prepared_router_exports = {};
__export(prepared_router_exports, {
  PreparedRegExpRouter: () => PreparedRegExpRouter,
  buildInitParams: () => buildInitParams,
  serializeInitParams: () => serializeInitParams
});
module.exports = __toCommonJS(prepared_router_exports);
var import_router = require("../../router");
var import_matcher = require("./matcher");
var import_router2 = require("./router");
class PreparedRegExpRouter {
  name = "PreparedRegExpRouter";
  #matchers;
  #relocateMap;
  constructor(matchers, relocateMap) {
    this.#matchers = matchers;
    this.#relocateMap = relocateMap;
  }
  #addWildcard(method, handlerData) {
    const matcher = this.#matchers[method];
    matcher[1].forEach((list) => list && list.push(handlerData));
    Object.values(matcher[2]).forEach((list) => list[0].push(handlerData));
  }
  #addPath(method, path, handler, indexes, map) {
    const matcher = this.#matchers[method];
    if (!map) {
      matcher[2][path][0].push([handler, {}]);
    } else {
      indexes.forEach((index) => {
        if (typeof index === "number") {
          matcher[1][index].push([handler, map]);
        } else {
          ;
          matcher[2][index || path][0].push([handler, map]);
        }
      });
    }
  }
  add(method, path, handler) {
    if (!this.#matchers[method]) {
      const all = this.#matchers[import_router.METHOD_NAME_ALL];
      const staticMap = {};
      for (const key in all[2]) {
        staticMap[key] = [all[2][key][0].slice(), import_matcher.emptyParam];
      }
      this.#matchers[method] = [
        all[0],
        all[1].map((list) => Array.isArray(list) ? list.slice() : 0),
        staticMap
      ];
    }
    if (path === "/*" || path === "*") {
      const handlerData = [handler, {}];
      if (method === import_router.METHOD_NAME_ALL) {
        for (const m in this.#matchers) {
          this.#addWildcard(m, handlerData);
        }
      } else {
        this.#addWildcard(method, handlerData);
      }
      return;
    }
    const data = this.#relocateMap[path];
    if (!data) {
      throw new Error(`Path ${path} is not registered`);
    }
    for (const [indexes, map] of data) {
      if (method === import_router.METHOD_NAME_ALL) {
        for (const m in this.#matchers) {
          this.#addPath(m, path, handler, indexes, map);
        }
      } else {
        this.#addPath(method, path, handler, indexes, map);
      }
    }
  }
  buildAllMatchers() {
    return this.#matchers;
  }
  match = import_matcher.match;
}
const buildInitParams = ({ paths }) => {
  const RegExpRouterWithMatcherExport = class extends import_router2.RegExpRouter {
    buildAndExportAllMatchers() {
      return this.buildAllMatchers();
    }
  };
  const router = new RegExpRouterWithMatcherExport();
  for (const path of paths) {
    router.add(import_router.METHOD_NAME_ALL, path, path);
  }
  const matchers = router.buildAndExportAllMatchers();
  const all = matchers[import_router.METHOD_NAME_ALL];
  const relocateMap = {};
  for (const path of paths) {
    if (path === "/*" || path === "*") {
      continue;
    }
    all[1].forEach((list, i) => {
      list.forEach(([p, map]) => {
        if (p === path) {
          if (relocateMap[path]) {
            relocateMap[path][0][1] = {
              ...relocateMap[path][0][1],
              ...map
            };
          } else {
            relocateMap[path] = [[[], map]];
          }
          if (relocateMap[path][0][0].findIndex((j) => j === i) === -1) {
            relocateMap[path][0][0].push(i);
          }
        }
      });
    });
    for (const path2 in all[2]) {
      all[2][path2][0].forEach(([p]) => {
        if (p === path) {
          relocateMap[path] ||= [[[]]];
          const value = path2 === path ? "" : path2;
          if (relocateMap[path][0][0].findIndex((v) => v === value) === -1) {
            relocateMap[path][0][0].push(value);
          }
        }
      });
    }
  }
  for (let i = 0, len = all[1].length; i < len; i++) {
    all[1][i] = all[1][i] ? [] : 0;
  }
  for (const path in all[2]) {
    all[2][path][0] = [];
  }
  return [matchers, relocateMap];
};
const serializeInitParams = ([matchers, relocateMap]) => {
  const matchersStr = JSON.stringify(
    matchers,
    (_, value) => value instanceof RegExp ? `##${value.toString()}##` : value
  ).replace(/"##(.+?)##"/g, (_, str) => str.replace(/\\\\/g, "\\"));
  const relocateMapStr = JSON.stringify(relocateMap);
  return `[${matchersStr},${relocateMapStr}]`;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PreparedRegExpRouter,
  buildInitParams,
  serializeInitParams
});
