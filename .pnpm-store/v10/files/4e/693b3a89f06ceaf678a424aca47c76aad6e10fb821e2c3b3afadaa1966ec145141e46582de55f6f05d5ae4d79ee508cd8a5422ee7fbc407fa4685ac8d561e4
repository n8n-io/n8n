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
var compress_exports = {};
__export(compress_exports, {
  compress: () => compress
});
module.exports = __toCommonJS(compress_exports);
var import_compress = require("../../utils/compress");
const ENCODING_TYPES = ["gzip", "deflate"];
const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/i;
const compress = (options) => {
  const threshold = options?.threshold ?? 1024;
  return async function compress2(ctx, next) {
    await next();
    const contentLength = ctx.res.headers.get("Content-Length");
    if (ctx.res.headers.has("Content-Encoding") || // already encoded
    ctx.res.headers.has("Transfer-Encoding") || // already encoded or chunked
    ctx.req.method === "HEAD" || // HEAD request
    contentLength && Number(contentLength) < threshold || // content-length below threshold
    !shouldCompress(ctx.res) || // not compressible type
    !shouldTransform(ctx.res)) {
      return;
    }
    const accepted = ctx.req.header("Accept-Encoding");
    const encoding = options?.encoding ?? ENCODING_TYPES.find((encoding2) => accepted?.includes(encoding2));
    if (!encoding || !ctx.res.body) {
      return;
    }
    const stream = new CompressionStream(encoding);
    ctx.res = new Response(ctx.res.body.pipeThrough(stream), ctx.res);
    ctx.res.headers.delete("Content-Length");
    ctx.res.headers.set("Content-Encoding", encoding);
  };
};
const shouldCompress = (res) => {
  const type = res.headers.get("Content-Type");
  return type && import_compress.COMPRESSIBLE_CONTENT_TYPE_REGEX.test(type);
};
const shouldTransform = (res) => {
  const cacheControl = res.headers.get("Cache-Control");
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  compress
});
