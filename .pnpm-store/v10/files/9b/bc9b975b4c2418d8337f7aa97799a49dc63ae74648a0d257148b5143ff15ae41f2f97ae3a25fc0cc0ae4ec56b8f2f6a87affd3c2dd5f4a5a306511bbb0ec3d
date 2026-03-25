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
var jwk_exports = {};
__export(jwk_exports, {
  jwk: () => jwk
});
module.exports = __toCommonJS(jwk_exports);
var import_cookie = require("../../helper/cookie");
var import_http_exception = require("../../http-exception");
var import_jwt = require("../../utils/jwt");
var import_context = require("../../context");
const jwk = (options, init) => {
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
        throw new import_http_exception.HTTPException(401, {
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
        token = (0, import_cookie.getCookie)(ctx, options.cookie);
      } else if (options.cookie.secret) {
        if (options.cookie.prefixOptions) {
          token = await (0, import_cookie.getSignedCookie)(
            ctx,
            options.cookie.secret,
            options.cookie.key,
            options.cookie.prefixOptions
          );
        } else {
          token = await (0, import_cookie.getSignedCookie)(ctx, options.cookie.secret, options.cookie.key);
        }
      } else {
        if (options.cookie.prefixOptions) {
          token = (0, import_cookie.getCookie)(ctx, options.cookie.key, options.cookie.prefixOptions);
        } else {
          token = (0, import_cookie.getCookie)(ctx, options.cookie.key);
        }
      }
    }
    if (!token) {
      if (options.allow_anon) {
        return next();
      }
      const errDescription = "no authorization included in request";
      throw new import_http_exception.HTTPException(401, {
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
      payload = await import_jwt.Jwt.verifyWithJwks(
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
      throw new import_http_exception.HTTPException(401, {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  jwk
});
