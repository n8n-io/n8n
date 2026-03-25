// src/middleware/csrf/index.ts
import { HTTPException } from "../../http-exception.js";
var secFetchSiteValues = ["same-origin", "same-site", "none", "cross-site"];
var isSecFetchSite = (value) => secFetchSiteValues.includes(value);
var isSafeMethodRe = /^(GET|HEAD)$/;
var isRequestedByFormElementRe = /^\b(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i;
var csrf = (options) => {
  const originHandler = ((optsOrigin) => {
    if (!optsOrigin) {
      return (origin, c) => origin === new URL(c.req.url).origin;
    } else if (typeof optsOrigin === "string") {
      return (origin) => origin === optsOrigin;
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin);
    }
  })(options?.origin);
  const isAllowedOrigin = async (origin, c) => {
    if (origin === void 0) {
      return false;
    }
    return await originHandler(origin, c);
  };
  const secFetchSiteHandler = ((optsSecFetchSite) => {
    if (!optsSecFetchSite) {
      return (secFetchSite) => secFetchSite === "same-origin";
    } else if (typeof optsSecFetchSite === "string") {
      return (secFetchSite) => secFetchSite === optsSecFetchSite;
    } else if (typeof optsSecFetchSite === "function") {
      return optsSecFetchSite;
    } else {
      return (secFetchSite) => optsSecFetchSite.includes(secFetchSite);
    }
  })(options?.secFetchSite);
  const isAllowedSecFetchSite = async (secFetchSite, c) => {
    if (secFetchSite === void 0) {
      return false;
    }
    if (!isSecFetchSite(secFetchSite)) {
      return false;
    }
    return await secFetchSiteHandler(secFetchSite, c);
  };
  return async function csrf2(c, next) {
    if (!isSafeMethodRe.test(c.req.method) && isRequestedByFormElementRe.test(c.req.header("content-type") || "text/plain") && !await isAllowedSecFetchSite(c.req.header("sec-fetch-site"), c) && !await isAllowedOrigin(c.req.header("origin"), c)) {
      const res = new Response("Forbidden", { status: 403 });
      throw new HTTPException(403, { res });
    }
    await next();
  };
};
export {
  csrf
};
