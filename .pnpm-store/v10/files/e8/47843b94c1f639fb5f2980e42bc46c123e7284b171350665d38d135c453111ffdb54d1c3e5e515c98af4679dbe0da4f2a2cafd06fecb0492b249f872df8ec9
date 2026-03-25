// src/middleware/compress/index.ts
import { COMPRESSIBLE_CONTENT_TYPE_REGEX } from "../../utils/compress.js";
var ENCODING_TYPES = ["gzip", "deflate"];
var cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/i;
var compress = (options) => {
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
var shouldCompress = (res) => {
  const type = res.headers.get("Content-Type");
  return type && COMPRESSIBLE_CONTENT_TYPE_REGEX.test(type);
};
var shouldTransform = (res) => {
  const cacheControl = res.headers.get("Cache-Control");
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl);
};
export {
  compress
};
