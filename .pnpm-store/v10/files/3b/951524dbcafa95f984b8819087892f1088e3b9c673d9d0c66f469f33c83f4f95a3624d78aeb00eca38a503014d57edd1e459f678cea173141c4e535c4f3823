// src/adapter/cloudflare-workers/serve-static.ts
import { serveStatic as baseServeStatic } from "../../middleware/serve-static/index.js";
import { getContentFromKVAsset } from "./utils.js";
var serveStatic = (options) => {
  return async function serveStatic2(c, next) {
    const getContent = async (path) => {
      return getContentFromKVAsset(path, {
        manifest: options.manifest,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        namespace: options.namespace ? options.namespace : c.env ? c.env.__STATIC_CONTENT : void 0
      });
    };
    return baseServeStatic({
      ...options,
      getContent
    })(c, next);
  };
};
export {
  serveStatic
};
