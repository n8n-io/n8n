// src/router/reg-exp-router/prepared-router.ts
import { METHOD_NAME_ALL } from "../../router.js";
import { match, emptyParam } from "./matcher.js";
import { RegExpRouter } from "./router.js";
var PreparedRegExpRouter = class {
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
      const all = this.#matchers[METHOD_NAME_ALL];
      const staticMap = {};
      for (const key in all[2]) {
        staticMap[key] = [all[2][key][0].slice(), emptyParam];
      }
      this.#matchers[method] = [
        all[0],
        all[1].map((list) => Array.isArray(list) ? list.slice() : 0),
        staticMap
      ];
    }
    if (path === "/*" || path === "*") {
      const handlerData = [handler, {}];
      if (method === METHOD_NAME_ALL) {
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
      if (method === METHOD_NAME_ALL) {
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
  match = match;
};
var buildInitParams = ({ paths }) => {
  const RegExpRouterWithMatcherExport = class extends RegExpRouter {
    buildAndExportAllMatchers() {
      return this.buildAllMatchers();
    }
  };
  const router = new RegExpRouterWithMatcherExport();
  for (const path of paths) {
    router.add(METHOD_NAME_ALL, path, path);
  }
  const matchers = router.buildAndExportAllMatchers();
  const all = matchers[METHOD_NAME_ALL];
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
var serializeInitParams = ([matchers, relocateMap]) => {
  const matchersStr = JSON.stringify(
    matchers,
    (_, value) => value instanceof RegExp ? `##${value.toString()}##` : value
  ).replace(/"##(.+?)##"/g, (_, str) => str.replace(/\\\\/g, "\\"));
  const relocateMapStr = JSON.stringify(relocateMap);
  return `[${matchersStr},${relocateMapStr}]`;
};
export {
  PreparedRegExpRouter,
  buildInitParams,
  serializeInitParams
};
