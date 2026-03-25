// src/middleware/duration.ts
var DurationMiddleware = ({ mockRequest }) => ({
  async prepareRequest(next) {
    if (mockRequest) {
      return next();
    }
    const request = await next();
    return request.enhance({
      headers: { "X-Started-At": Date.now() }
    });
  },
  async response(next) {
    const response = await next();
    const endedAt = Date.now();
    const startedAt = response.request().header("x-started-at");
    return response.enhance({
      headers: {
        "X-Started-At": startedAt,
        "X-Ended-At": endedAt,
        "X-Duration": endedAt - startedAt
      }
    });
  }
});
var duration_default = DurationMiddleware;
export {
  DurationMiddleware,
  duration_default as default
};
//# sourceMappingURL=duration.mjs.map