// src/middleware/basic-auth/index.ts
import { HTTPException } from "../../http-exception.js";
import { auth } from "../../utils/basic-auth.js";
import { timingSafeEqual } from "../../utils/buffer.js";
var basicAuth = (options, ...users) => {
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
    const requestUser = auth(ctx.req.raw);
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
            timingSafeEqual(user.username, requestUser.username, options.hashFunction),
            timingSafeEqual(user.password, requestUser.password, options.hashFunction)
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
    throw new HTTPException(status, { res });
  };
};
export {
  basicAuth
};
