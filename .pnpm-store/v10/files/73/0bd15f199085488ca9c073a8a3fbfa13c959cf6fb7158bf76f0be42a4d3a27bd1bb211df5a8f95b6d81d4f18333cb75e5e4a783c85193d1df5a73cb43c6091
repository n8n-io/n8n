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
var etag_exports = {};
__export(etag_exports, {
  RETAINED_304_HEADERS: () => RETAINED_304_HEADERS,
  etag: () => etag
});
module.exports = __toCommonJS(etag_exports);
var import_digest = require("./digest");
const RETAINED_304_HEADERS = [
  "cache-control",
  "content-location",
  "date",
  "etag",
  "expires",
  "vary"
];
const stripWeak = (tag) => tag.replace(/^W\//, "");
function etagMatches(etag2, ifNoneMatch) {
  return ifNoneMatch != null && ifNoneMatch.split(/,\s*/).some((t) => stripWeak(t) === stripWeak(etag2));
}
function initializeGenerator(generator) {
  if (!generator) {
    if (crypto && crypto.subtle) {
      generator = (body) => crypto.subtle.digest(
        {
          name: "SHA-1"
        },
        body
      );
    }
  }
  return generator;
}
const etag = (options) => {
  const retainedHeaders = options?.retainedHeaders ?? RETAINED_304_HEADERS;
  const weak = options?.weak ?? false;
  const generator = initializeGenerator(options?.generateDigest);
  return async function etag2(c, next) {
    const ifNoneMatch = c.req.header("If-None-Match") ?? null;
    await next();
    const res = c.res;
    let etag3 = res.headers.get("ETag");
    if (!etag3) {
      if (!generator) {
        return;
      }
      const hash = await (0, import_digest.generateDigest)(
        // This type casing avoids the type error for `deno publish`
        res.clone().body,
        generator
      );
      if (hash === null) {
        return;
      }
      etag3 = weak ? `W/"${hash}"` : `"${hash}"`;
    }
    if (etagMatches(etag3, ifNoneMatch)) {
      c.res = new Response(null, {
        status: 304,
        statusText: "Not Modified",
        headers: {
          ETag: etag3
        }
      });
      c.res.headers.forEach((_, key) => {
        if (retainedHeaders.indexOf(key.toLowerCase()) === -1) {
          c.res.headers.delete(key);
        }
      });
    } else {
      c.res.headers.set("ETag", etag3);
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RETAINED_304_HEADERS,
  etag
});
