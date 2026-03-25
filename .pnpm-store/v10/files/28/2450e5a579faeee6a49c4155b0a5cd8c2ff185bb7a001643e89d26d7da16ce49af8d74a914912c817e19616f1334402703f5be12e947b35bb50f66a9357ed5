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
var request_id_exports = {};
__export(request_id_exports, {
  requestId: () => requestId
});
module.exports = __toCommonJS(request_id_exports);
const requestId = ({
  limitLength = 255,
  headerName = "X-Request-Id",
  generator = () => crypto.randomUUID()
} = {}) => {
  return async function requestId2(c, next) {
    let reqId = headerName ? c.req.header(headerName) : void 0;
    if (!reqId || reqId.length > limitLength || /[^\w\-=]/.test(reqId)) {
      reqId = generator(c);
    }
    c.set("requestId", reqId);
    if (headerName) {
      c.header(headerName, reqId);
    }
    await next();
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requestId
});
