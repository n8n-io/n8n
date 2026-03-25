// src/adapter/bun/ssg.ts
import { toSSG as baseToSSG } from "../../helper/ssg/index.js";
var { write } = Bun;
var bunFileSystemModule = {
  writeFile: async (path, data) => {
    await write(path, data);
  },
  mkdir: async () => {
  }
};
var toSSG = async (app, options) => {
  return baseToSSG(app, bunFileSystemModule, options);
};
export {
  bunFileSystemModule,
  toSSG
};
