// src/conninfo.ts
var getConnInfo = (c) => {
  const bindings = c.env.server ? c.env.server : c.env;
  const address = bindings.incoming.socket.remoteAddress;
  const port = bindings.incoming.socket.remotePort;
  const family = bindings.incoming.socket.remoteFamily;
  return {
    remote: {
      address,
      port,
      addressType: family === "IPv4" ? "IPv4" : family === "IPv6" ? "IPv6" : void 0
    }
  };
};
export {
  getConnInfo
};
