// src/middleware/etag/index.ts
import { generateDigest } from "./digest.js";
var RETAINED_304_HEADERS = [
  "cache-control",
  "content-location",
  "date",
  "etag",
  "expires",
  "vary"
];
var stripWeak = (tag) => tag.replace(/^W\//, "");
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
var etag = (options) => {
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
      const hash = await generateDigest(
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
export {
  RETAINED_304_HEADERS,
  etag
};
