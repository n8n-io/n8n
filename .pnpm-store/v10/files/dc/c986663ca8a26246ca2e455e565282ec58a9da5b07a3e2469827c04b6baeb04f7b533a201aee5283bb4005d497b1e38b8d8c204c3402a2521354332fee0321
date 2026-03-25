// src/hono.ts
import { HonoBase } from "./hono-base.js";
import { RegExpRouter } from "./router/reg-exp-router/index.js";
import { SmartRouter } from "./router/smart-router/index.js";
import { TrieRouter } from "./router/trie-router/index.js";
var Hono = class extends HonoBase {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};
export {
  Hono
};
