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
var csrf_exports = {};
__export(csrf_exports, {
  CsrfMiddleware: () => CsrfMiddleware,
  default: () => csrf_default
});
module.exports = __toCommonJS(csrf_exports);
const CsrfMiddleware = (cookieName = "csrfToken", headerName = "x-csrf-token") => function CsrfMiddleware2() {
  const REGEXP_COOKIE_NAME = new RegExp(cookieName + "[^;]+");
  const getCookie = () => {
    const cookieString = REGEXP_COOKIE_NAME.exec((document || {}).cookie || "");
    return cookieString ? decodeURIComponent(cookieString.toString().replace(/^[^=]+./, "")) : void 0;
  };
  return {
    async prepareRequest(next) {
      const request = await next();
      if (typeof document === "undefined") {
        return request;
      }
      const csrf = getCookie();
      return !csrf ? request : request.enhance({
        headers: { [headerName]: csrf }
      });
    }
  };
};
var csrf_default = CsrfMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CsrfMiddleware
});
//# sourceMappingURL=csrf.js.map