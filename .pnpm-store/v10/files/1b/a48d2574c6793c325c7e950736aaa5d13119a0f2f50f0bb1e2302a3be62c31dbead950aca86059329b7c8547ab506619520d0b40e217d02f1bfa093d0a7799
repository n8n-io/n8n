// src/adapter/deno/ssg.ts
import { toSSG as baseToSSG } from "../../helper/ssg/index.js";
var denoFileSystemModule = {
  writeFile: async (path, data) => {
    const uint8Data = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    await Deno.writeFile(path, uint8Data);
  },
  mkdir: async (path, options) => {
    return Deno.mkdir(path, { recursive: options?.recursive ?? false });
  }
};
var toSSG = async (app, options) => {
  return baseToSSG(app, denoFileSystemModule, options);
};
export {
  denoFileSystemModule,
  toSSG
};
