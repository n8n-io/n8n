// src/middleware/csrf.ts
var CsrfMiddleware = (cookieName = "csrfToken", headerName = "x-csrf-token") => function CsrfMiddleware2() {
  const REGEXP_COOKIE_NAME = new RegExp(cookieName + "[^;]+");
  const getCookie = () => {
    const cookieString = REGEXP_COOKIE_NAME.exec((document || {}).cookie || "");
    return cookieString ? decodeURIComponent(cookieString.toString().replace(/^[^=]+./, "")) : void 0;
  };
  return {
    async prepareRequest(next) {
      const request = await next();
      if (typeof document === "undefined") {
        return request;
      }
      const csrf = getCookie();
      return !csrf ? request : request.enhance({
        headers: { [headerName]: csrf }
      });
    }
  };
};
var csrf_default = CsrfMiddleware;
export {
  CsrfMiddleware,
  csrf_default as default
};
//# sourceMappingURL=csrf.mjs.map