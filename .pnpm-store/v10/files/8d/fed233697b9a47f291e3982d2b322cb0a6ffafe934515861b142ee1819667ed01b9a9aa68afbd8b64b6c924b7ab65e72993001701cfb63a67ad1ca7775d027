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
var factory_exports = {};
__export(factory_exports, {
  Factory: () => Factory,
  createFactory: () => createFactory,
  createMiddleware: () => createMiddleware
});
module.exports = __toCommonJS(factory_exports);
var import_hono = require("../../hono");
class Factory {
  initApp;
  #defaultAppOptions;
  constructor(init) {
    this.initApp = init?.initApp;
    this.#defaultAppOptions = init?.defaultAppOptions;
  }
  createApp = (options) => {
    const app = new import_hono.Hono(
      options && this.#defaultAppOptions ? { ...this.#defaultAppOptions, ...options } : options ?? this.#defaultAppOptions
    );
    if (this.initApp) {
      this.initApp(app);
    }
    return app;
  };
  createMiddleware = (middleware) => middleware;
  createHandlers = (...handlers) => {
    return handlers.filter((handler) => handler !== void 0);
  };
}
const createFactory = (init) => new Factory(init);
const createMiddleware = (middleware) => middleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Factory,
  createFactory,
  createMiddleware
});
