// src/adapter/bun/conninfo.ts
import { getBunServer } from "./server.js";
var getConnInfo = (c) => {
  const server = getBunServer(c);
  if (!server) {
    throw new TypeError("env has to include the 2nd argument of fetch.");
  }
  if (typeof server.requestIP !== "function") {
    throw new TypeError("server.requestIP is not a function.");
  }
  const info = server.requestIP(c.req.raw);
  if (!info) {
    return {
      remote: {}
    };
  }
  return {
    remote: {
      address: info.address,
      addressType: info.family === "IPv6" || info.family === "IPv4" ? info.family : void 0,
      port: info.port
    }
  };
};
export {
  getConnInfo
};
