// src/adapter/deno/serve-static.ts
import { join } from "node:path";
import { serveStatic as baseServeStatic } from "../../middleware/serve-static/index.js";
var { open, lstatSync, errors } = Deno;
var serveStatic = (options) => {
  return async function serveStatic2(c, next) {
    const getContent = async (path) => {
      try {
        if (isDir(path)) {
          return null;
        }
        const file = await open(path);
        return file.readable;
      } catch (e) {
        if (!(e instanceof errors.NotFound)) {
          console.warn(`${e}`);
        }
        return null;
      }
    };
    const isDir = (path) => {
      let isDir2;
      try {
        const stat = lstatSync(path);
        isDir2 = stat.isDirectory;
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
