// src/preset/quick.ts
import { HonoBase } from "../hono-base.js";
import { LinearRouter } from "../router/linear-router/index.js";
import { SmartRouter } from "../router/smart-router/index.js";
import { TrieRouter } from "../router/trie-router/index.js";
var Hono = class extends HonoBase {
  constructor(options = {}) {
    super(options);
    this.router = new SmartRouter({
      routers: [new LinearRouter(), new TrieRouter()]
    });
  }
};
export {
  Hono
};
