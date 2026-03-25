// src/helper/ssg/plugins.ts
import { html } from "../html/index.js";
var defaultPlugin = () => {
  return {
    afterResponseHook: (res) => {
      if (res.status !== 200) {
        return false;
      }
      return res;
    }
  };
};
var REDIRECT_STATUS_CODES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
var generateRedirectHtml = (location) => {
  const content = html`<!DOCTYPE html>
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
var redirectPlugin = () => {
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
export {
  defaultPlugin,
  redirectPlugin
};
