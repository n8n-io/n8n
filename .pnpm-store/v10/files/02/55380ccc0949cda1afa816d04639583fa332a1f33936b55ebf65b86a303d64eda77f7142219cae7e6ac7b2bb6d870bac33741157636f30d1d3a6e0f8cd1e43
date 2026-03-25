// src/adapter/cloudflare-workers/conninfo.ts
var getConnInfo = (c) => ({
  remote: {
    address: c.req.header("cf-connecting-ip")
  }
});
export {
  getConnInfo
};
