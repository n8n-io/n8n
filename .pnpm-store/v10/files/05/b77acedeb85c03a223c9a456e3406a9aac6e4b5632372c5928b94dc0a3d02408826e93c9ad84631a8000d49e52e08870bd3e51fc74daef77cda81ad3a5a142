// src/adapter/bun/serve-static.ts
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { serveStatic as baseServeStatic } from "../../middleware/serve-static/index.js";
var serveStatic = (options) => {
  return async function serveStatic2(c, next) {
    const getContent = async (path) => {
      const file = Bun.file(path);
      return await file.exists() ? file : null;
    };
    const isDir = async (path) => {
      let isDir2;
      try {
        const stats = await stat(path);
        isDir2 = stats.isDirectory();
      } catch {
      }
      return isDir2;
    };
    return baseServeStatic({
      ...options,
      getContent,
      join,
      isDir
    })(c, next);
  };
};
export {
  serveStatic
};
