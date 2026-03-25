// src/adapter/deno/conninfo.ts
var getConnInfo = (c) => {
  const { remoteAddr } = c.env;
  return {
    remote: {
      address: remoteAddr.hostname,
      port: remoteAddr.port,
      transport: remoteAddr.transport
    }
  };
};
export {
  getConnInfo
};
