// src/middleware/encode-json.ts
import { REGEXP_CONTENT_TYPE_JSON } from "../response.mjs";
var CONTENT_TYPE_JSON = "application/json;charset=utf-8";
var isJson = (contentType) => REGEXP_CONTENT_TYPE_JSON.test(contentType);
var alreadyEncoded = (body) => typeof body === "string";
var EncodeJsonMiddleware = () => ({
  async prepareRequest(next) {
    const request = await next();
    try {
      const body = request.body();
      const contentType = request.header("content-type");
      if (body) {
        const shouldEncodeBody = contentType == null || typeof contentType === "string" && isJson(contentType) && !alreadyEncoded(body);
        const encodedBody = shouldEncodeBody ? JSON.stringify(body) : body;
        return request.enhance({
          headers: { "content-type": contentType == null ? CONTENT_TYPE_JSON : contentType },
          body: encodedBody
        });
      }
    } catch (_e) {
    }
    return request;
  }
});
var encode_json_default = EncodeJsonMiddleware;
export {
  CONTENT_TYPE_JSON,
  EncodeJsonMiddleware,
  encode_json_default as default
};
//# sourceMappingURL=encode-json.mjs.map