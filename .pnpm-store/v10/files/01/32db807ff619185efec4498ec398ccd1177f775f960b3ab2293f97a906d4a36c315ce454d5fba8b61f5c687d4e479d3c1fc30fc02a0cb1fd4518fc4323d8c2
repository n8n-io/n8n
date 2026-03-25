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
var hono_exports = {};
__export(hono_exports, {
  Hono: () => Hono
});
module.exports = __toCommonJS(hono_exports);
var import_hono_base = require("./hono-base");
var import_reg_exp_router = require("./router/reg-exp-router");
var import_smart_router = require("./router/smart-router");
var import_trie_router = require("./router/trie-router");
class Hono extends import_hono_base.HonoBase {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new import_smart_router.SmartRouter({
      routers: [new import_reg_exp_router.RegExpRouter(), new import_trie_router.TrieRouter()]
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Hono
});
