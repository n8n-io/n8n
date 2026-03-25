// src/middleware/combine/index.ts
import { compose } from "../../compose.js";
import { METHOD_NAME_ALL } from "../../router.js";
import { TrieRouter } from "../../router/trie-router/index.js";
var some = (...middleware) => {
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
var every = (...middleware) => {
  return async function every2(c, next) {
    const currentRouteIndex = c.req.routeIndex;
    await compose(
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
var except = (condition, ...middleware) => {
  let router = void 0;
  const conditions = (Array.isArray(condition) ? condition : [condition]).map((condition2) => {
    if (typeof condition2 === "string") {
      router ||= new TrieRouter();
      router.add(METHOD_NAME_ALL, condition2, true);
    } else {
      return condition2;
    }
  }).filter(Boolean);
  if (router) {
    conditions.unshift((c) => !!router?.match(METHOD_NAME_ALL, c.req.path)?.[0]?.[0]?.[0]);
  }
  const handler = some((c) => conditions.some((cond) => cond(c)), every(...middleware));
  return async function except2(c, next) {
    await handler(c, next);
  };
};
export {
  every,
  except,
  some
};
