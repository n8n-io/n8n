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
var bearer_auth_exports = {};
__export(bearer_auth_exports, {
  bearerAuth: () => bearerAuth
});
module.exports = __toCommonJS(bearer_auth_exports);
var import_http_exception = require("../../http-exception");
var import_buffer = require("../../utils/buffer");
const TOKEN_STRINGS = "[A-Za-z0-9._~+/-]+=*";
const PREFIX = "Bearer";
const HEADER = "Authorization";
const bearerAuth = (options) => {
  if (!("token" in options || "verifyToken" in options)) {
    throw new Error('bearer auth middleware requires options for "token"');
  }
  if (!options.realm) {
    options.realm = "";
  }
  if (options.prefix === void 0) {
    options.prefix = PREFIX;
  }
  const realm = options.realm?.replace(/"/g, '\\"');
  const prefixRegexStr = options.prefix === "" ? "" : `${options.prefix} +`;
  const regexp = new RegExp(`^${prefixRegexStr}(${TOKEN_STRINGS}) *$`, "i");
  const wwwAuthenticatePrefix = options.prefix === "" ? "" : `${options.prefix} `;
  const throwHTTPException = async (c, status, wwwAuthenticateHeader, messageOption) => {
    const wwwAuthenticateHeaderValue = typeof wwwAuthenticateHeader === "function" ? await wwwAuthenticateHeader(c) : wwwAuthenticateHeader;
    const headers = {
      "WWW-Authenticate": typeof wwwAuthenticateHeaderValue === "string" ? wwwAuthenticateHeaderValue : `${wwwAuthenticatePrefix}${Object.entries(wwwAuthenticateHeaderValue).map(([key, value]) => `${key}="${value}"`).join(",")}`
    };
    const responseMessage = typeof messageOption === "function" ? await messageOption(c) : messageOption;
    const res = typeof responseMessage === "string" ? new Response(responseMessage, { status, headers }) : new Response(JSON.stringify(responseMessage), {
      status,
      headers: {
        ...headers,
        "content-type": "application/json"
      }
    });
    throw new import_http_exception.HTTPException(status, { res });
  };
  return async function bearerAuth2(c, next) {
    const headerToken = c.req.header(options.headerName || HEADER);
    if (!headerToken) {
      await throwHTTPException(
        c,
        401,
        options.noAuthenticationHeader?.wwwAuthenticateHeader || `${wwwAuthenticatePrefix}realm="${realm}"`,
        options.noAuthenticationHeader?.message || options.noAuthenticationHeaderMessage || "Unauthorized"
      );
    } else {
      const match = regexp.exec(headerToken);
      if (!match) {
        await throwHTTPException(
          c,
          400,
          options.invalidAuthenticationHeader?.wwwAuthenticateHeader || `${wwwAuthenticatePrefix}error="invalid_request"`,
          options.invalidAuthenticationHeader?.message || options.invalidAuthenticationHeaderMessage || "Bad Request"
        );
      } else {
        let equal = false;
        if ("verifyToken" in options) {
          equal = await options.verifyToken(match[1], c);
        } else if (typeof options.token === "string") {
          equal = await (0, import_buffer.timingSafeEqual)(options.token, match[1], options.hashFunction);
        } else if (Array.isArray(options.token) && options.token.length > 0) {
          for (const token of options.token) {
            if (await (0, import_buffer.timingSafeEqual)(token, match[1], options.hashFunction)) {
              equal = true;
              break;
            }
          }
        }
        if (!equal) {
          await throwHTTPException(
            c,
            401,
            options.invalidToken?.wwwAuthenticateHeader || `${wwwAuthenticatePrefix}error="invalid_token"`,
            options.invalidToken?.message || options.invalidTokenMessage || "Unauthorized"
          );
        }
      }
    }
    await next();
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bearerAuth
});
