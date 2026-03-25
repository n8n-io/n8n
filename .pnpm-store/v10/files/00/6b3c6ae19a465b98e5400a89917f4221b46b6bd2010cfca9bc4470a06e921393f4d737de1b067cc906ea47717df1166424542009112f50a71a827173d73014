// src/helper/factory/index.ts
import { Hono } from "../../hono.js";
var Factory = class {
  initApp;
  #defaultAppOptions;
  constructor(init) {
    this.initApp = init?.initApp;
    this.#defaultAppOptions = init?.defaultAppOptions;
  }
  createApp = (options) => {
    const app = new Hono(
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
};
var createFactory = (init) => new Factory(init);
var createMiddleware = (middleware) => middleware;
export {
  Factory,
  createFactory,
  createMiddleware
};
