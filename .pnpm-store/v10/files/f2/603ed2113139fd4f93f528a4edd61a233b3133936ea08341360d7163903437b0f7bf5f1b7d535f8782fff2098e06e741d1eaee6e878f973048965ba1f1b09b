// src/helper/testing/index.ts
import { hc } from "../../client/index.js";
var testClient = (app, Env, executionCtx, options) => {
  const customFetch = (input, init) => {
    return app.request(input, init, Env, executionCtx);
  };
  return hc("http://localhost", { ...options, fetch: customFetch });
};
export {
  testClient
};
