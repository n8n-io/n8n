"use strict";
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

// src/utils/response.ts
var response_exports = {};
__export(response_exports, {
  RESPONSE_ALREADY_SENT: () => RESPONSE_ALREADY_SENT
});
module.exports = __toCommonJS(response_exports);

// src/utils/response/constants.ts
var X_ALREADY_SENT = "x-hono-already-sent";

// src/utils/response.ts
var RESPONSE_ALREADY_SENT = new Response(null, {
  headers: { [X_ALREADY_SENT]: "true" }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RESPONSE_ALREADY_SENT
});
