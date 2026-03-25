var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var basic_auth_exports = {};
__export(basic_auth_exports, {
  basicAuth: () => basicAuth
});
module.exports = __toCommonJS(basic_auth_exports);
var import_http_exception = require("../../http-exception");
var import_basic_auth = require("../../utils/basic-auth");
var import_buffer = require("../../utils/buffer");
const basicAuth = (options, ...users) => {
  const usernamePasswordInOptions = "username" in options && "password" in options;
  const verifyUserInOptions = "verifyUser" in options;
  if (!(usernamePasswordInOptions || verifyUserInOptions)) {
    throw new Error(
      'basic auth middleware requires options for "username and password" or "verifyUser"'
    );
  }
  if (!options.realm) {
    options.realm = "Secure Area";
  }
  if (!options.invalidUserMessage) {
    options.invalidUserMessage = "Unauthorized";
  }
  if (usernamePasswordInOptions) {
    users.unshift({ username: options.username, password: options.password });
  }
  return async function basicAuth2(ctx, next) {
    const requestUser = (0, import_basic_auth.auth)(ctx.req.raw);
    if (requestUser) {
      if (verifyUserInOptions) {
        if (await options.verifyUser(requestUser.username, requestUser.password, ctx)) {
          if (options.onAuthSuccess) {
            await options.onAuthSuccess(ctx, requestUser.username);
          }
          await next();
          return;
        }
      } else {
        for (const user of users) {
          const [usernameEqual, passwordEqual] = await Promise.all([
            (0, import_buffer.timingSafeEqual)(user.username, requestUser.username, options.hashFunction),
            (0, import_buffer.timingSafeEqual)(user.password, requestUser.password, options.hashFunction)
          ]);
          if (usernameEqual && passwordEqual) {
            if (options.onAuthSuccess) {
              await options.onAuthSuccess(ctx, requestUser.username);
            }
            await next();
            return;
          }
        }
      }
    }
    const status = 401;
    const headers = {
      "WWW-Authenticate": 'Basic realm="' + options.realm?.replace(/"/g, '\\"') + '"'
    };
    const responseMessage = typeof options.invalidUserMessage === "function" ? await options.invalidUserMessage(ctx) : options.invalidUserMessage;
    const res = typeof responseMessage === "string" ? new Response(responseMessage, { status, headers }) : new Response(JSON.stringify(responseMessage), {
      status,
      headers: {
        ...headers,
        "content-type": "application/json"
      }
    });
    throw new import_http_exception.HTTPException(status, { res });
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  basicAuth
});
