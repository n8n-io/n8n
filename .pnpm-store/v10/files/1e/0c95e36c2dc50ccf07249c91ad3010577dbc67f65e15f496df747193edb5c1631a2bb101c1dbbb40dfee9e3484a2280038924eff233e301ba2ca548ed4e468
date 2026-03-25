// src/middleware/request-id/request-id.ts
var requestId = ({
  limitLength = 255,
  headerName = "X-Request-Id",
  generator = () => crypto.randomUUID()
} = {}) => {
  return async function requestId2(c, next) {
    let reqId = headerName ? c.req.header(headerName) : void 0;
    if (!reqId || reqId.length > limitLength || /[^\w\-=]/.test(reqId)) {
      reqId = generator(c);
    }
    c.set("requestId", reqId);
    if (headerName) {
      c.header(headerName, reqId);
    }
    await next();
  };
};
export {
  requestId
};
