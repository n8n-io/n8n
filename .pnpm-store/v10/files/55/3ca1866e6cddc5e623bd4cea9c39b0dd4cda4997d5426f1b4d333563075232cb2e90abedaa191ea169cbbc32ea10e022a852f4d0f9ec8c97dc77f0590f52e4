var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except2, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except2)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var combine_exports = {};
__export(combine_exports, {
  every: () => every,
  except: () => except,
  some: () => some
});
module.exports = __toCommonJS(combine_exports);
var import_compose = require("../../compose");
var import_router = require("../../router");
var import_trie_router = require("../../router/trie-router");
const some = (...middleware) => {
  return async function some2(c, next) {
    let isNextCalled = false;
    const wrappedNext = () => {
      isNextCalled = true;
      return next();
    };
    let lastError;
    for (const handler of middleware) {
      try {
        const result = await handler(c, wrappedNext);
        if (result === true && !c.finalized) {
          await wrappedNext();
        } else if (result === false) {
          lastError = new Error("No successful middleware found");
          continue;
        }
        lastError = void 0;
        break;
      } catch (error) {
        lastError = error;
        if (isNextCalled) {
          break;
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
  };
};
const every = (...middleware) => {
  return async function every2(c, next) {
    const currentRouteIndex = c.req.routeIndex;
    await (0, import_compose.compose)(
      middleware.map((m) => [
        [
          async (c2, next2) => {
            c2.req.routeIndex = currentRouteIndex;
            const res = await m(c2, next2);
            if (res === false) {
              throw new Error("Unmet condition");
            }
            return res;
          }
        ]
      ])
    )(c, next);
  };
};
const except = (condition, ...middleware) => {
  let router = void 0;
  const conditions = (Array.isArray(condition) ? condition : [condition]).map((condition2) => {
    if (typeof condition2 === "string") {
      router ||= new import_trie_router.TrieRouter();
      router.add(import_router.METHOD_NAME_ALL, condition2, true);
    } else {
      return condition2;
    }
  }).filter(Boolean);
  if (router) {
    conditions.unshift((c) => !!router?.match(import_router.METHOD_NAME_ALL, c.req.path)?.[0]?.[0]?.[0]);
  }
  const handler = some((c) => conditions.some((cond) => cond(c)), every(...middleware));
  return async function except2(c, next) {
    await handler(c, next);
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  every,
  except,
  some
});
