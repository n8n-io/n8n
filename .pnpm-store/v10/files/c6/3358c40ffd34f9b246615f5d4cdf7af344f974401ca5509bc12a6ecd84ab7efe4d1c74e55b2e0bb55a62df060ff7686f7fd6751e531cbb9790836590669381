// src/middleware/jwk/jwk.ts
import { getCookie, getSignedCookie } from "../../helper/cookie/index.js";
import { HTTPException } from "../../http-exception.js";
import { Jwt } from "../../utils/jwt/index.js";
import "../../context.js";
var jwk = (options, init) => {
  const verifyOpts = options.verification || {};
  if (!options || !(options.keys || options.jwks_uri)) {
    throw new Error('JWK auth middleware requires options for either "keys" or "jwks_uri" or both');
  }
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWK auth middleware requires it.");
  }
  return async function jwk2(ctx, next) {
    const headerName = options.headerName || "Authorization";
    const credentials = ctx.req.raw.headers.get(headerName);
    let token;
    if (credentials) {
      const parts = credentials.split(/\s+/);
      if (parts.length !== 2) {
        const errDescription = "invalid credentials structure";
        throw new HTTPException(401, {
          message: errDescription,
          res: unauthorizedResponse({
            ctx,
            error: "invalid_request",
            errDescription
          })
        });
      } else {
        token = parts[1];
      }
    } else if (options.cookie) {
      if (typeof options.cookie == "string") {
        token = getCookie(ctx, options.cookie);
      } else if (options.cookie.secret) {
        if (options.cookie.prefixOptions) {
          token = await getSignedCookie(
            ctx,
            options.cookie.secret,
            options.cookie.key,
            options.cookie.prefixOptions
          );
        } else {
          token = await getSignedCookie(ctx, options.cookie.secret, options.cookie.key);
        }
      } else {
        if (options.cookie.prefixOptions) {
          token = getCookie(ctx, options.cookie.key, options.cookie.prefixOptions);
        } else {
          token = getCookie(ctx, options.cookie.key);
        }
      }
    }
    if (!token) {
      if (options.allow_anon) {
        return next();
      }
      const errDescription = "no authorization included in request";
      throw new HTTPException(401, {
        message: errDescription,
        res: unauthorizedResponse({
          ctx,
          error: "invalid_request",
          errDescription
        })
      });
    }
    let payload;
    let cause;
    try {
      const keys = typeof options.keys === "function" ? await options.keys(ctx) : options.keys;
      const jwks_uri = typeof options.jwks_uri === "function" ? await options.jwks_uri(ctx) : options.jwks_uri;
      payload = await Jwt.verifyWithJwks(
        token,
        { keys, jwks_uri, verification: verifyOpts, allowedAlgorithms: options.alg },
        init
      );
    } catch (e) {
      cause = e;
    }
    if (!payload) {
      if (cause instanceof Error && cause.constructor === Error) {
        throw cause;
      }
      throw new HTTPException(401, {
        message: "Unauthorized",
        res: unauthorizedResponse({
          ctx,
          error: "invalid_token",
          statusText: "Unauthorized",
          errDescription: "token verification failure"
        }),
        cause
      });
    }
    ctx.set("jwtPayload", payload);
    await next();
  };
};
function unauthorizedResponse(opts) {
  return new Response("Unauthorized", {
    status: 401,
    statusText: opts.statusText,
    headers: {
      "WWW-Authenticate": `Bearer realm="${opts.ctx.req.url}",error="${opts.error}",error_description="${opts.errDescription}"`
    }
  });
}
export {
  jwk
};
