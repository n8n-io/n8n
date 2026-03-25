// src/adapter/lambda-edge/conninfo.ts
var getConnInfo = (c) => ({
  remote: {
    address: c.env.event.Records[0].cf.request.clientIp
  }
});
export {
  getConnInfo
};
