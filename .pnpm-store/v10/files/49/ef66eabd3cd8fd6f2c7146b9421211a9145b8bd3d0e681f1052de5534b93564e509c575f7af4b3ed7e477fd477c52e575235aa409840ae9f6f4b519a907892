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
var testing_exports = {};
__export(testing_exports, {
  testClient: () => testClient
});
module.exports = __toCommonJS(testing_exports);
var import_client = require("../../client");
const testClient = (app, Env, executionCtx, options) => {
  const customFetch = (input, init) => {
    return app.request(input, init, Env, executionCtx);
  };
  return (0, import_client.hc)("http://localhost", { ...options, fetch: customFetch });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  testClient
});
