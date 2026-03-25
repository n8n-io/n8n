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
var plugins_exports = {};
__export(plugins_exports, {
  defaultPlugin: () => defaultPlugin,
  redirectPlugin: () => redirectPlugin
});
module.exports = __toCommonJS(plugins_exports);
var import_html = require("../html");
const defaultPlugin = () => {
  return {
    afterResponseHook: (res) => {
      if (res.status !== 200) {
        return false;
      }
      return res;
    }
  };
};
const REDIRECT_STATUS_CODES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
const generateRedirectHtml = (location) => {
  const content = import_html.html`<!DOCTYPE html>
<title>Redirecting to: ${location}</title>
<meta http-equiv="refresh" content="0;url=${location}" />
<meta name="robots" content="noindex" />
<link rel="canonical" href="${location}" />
<body>
<a href="${location}">Redirecting to <code>${location}</code></a>
</body>
`;
  return content.toString().replace(/\n/g, "");
};
const redirectPlugin = () => {
  return {
    afterResponseHook: (res) => {
      if (REDIRECT_STATUS_CODES.has(res.status)) {
        const location = res.headers.get("Location");
        if (!location) {
          return false;
        }
        const htmlBody = generateRedirectHtml(location);
        return new Response(htmlBody, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return res;
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defaultPlugin,
  redirectPlugin
});
