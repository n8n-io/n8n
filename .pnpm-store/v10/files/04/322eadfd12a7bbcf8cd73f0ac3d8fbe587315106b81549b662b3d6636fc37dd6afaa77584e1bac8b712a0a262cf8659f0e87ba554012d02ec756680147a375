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
var quick_exports = {};
__export(quick_exports, {
  Hono: () => Hono
});
module.exports = __toCommonJS(quick_exports);
var import_hono_base = require("../hono-base");
var import_linear_router = require("../router/linear-router");
var import_smart_router = require("../router/smart-router");
var import_trie_router = require("../router/trie-router");
class Hono extends import_hono_base.HonoBase {
  constructor(options = {}) {
    super(options);
    this.router = new import_smart_router.SmartRouter({
      routers: [new import_linear_router.LinearRouter(), new import_trie_router.TrieRouter()]
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Hono
});
