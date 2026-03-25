// src/middleware/basic-auth.ts
import { assign } from "../utils/index.mjs";
var BasicAuthMiddleware = (authConfig) => function BasicAuthMiddleware2() {
  return {
    async prepareRequest(next) {
      const request = await next();
      const auth = request.auth();
      return !auth ? request.enhance({ auth: assign({}, authConfig) }) : request;
    }
  };
};
var basic_auth_default = BasicAuthMiddleware;
export {
  BasicAuthMiddleware,
  basic_auth_default as default
};
//# sourceMappingURL=basic-auth.mjs.map