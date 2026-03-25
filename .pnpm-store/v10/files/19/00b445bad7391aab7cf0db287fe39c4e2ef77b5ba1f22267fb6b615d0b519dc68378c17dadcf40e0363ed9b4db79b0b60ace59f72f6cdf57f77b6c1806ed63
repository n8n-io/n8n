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
var components_exports = {};
__export(components_exports, {
  ErrorBoundary: () => ErrorBoundary,
  childrenToString: () => childrenToString
});
module.exports = __toCommonJS(components_exports);
var import_html = require("../helper/html");
var import_html2 = require("../utils/html");
var import_base = require("./base");
var import_constants = require("./constants");
var import_context = require("./context");
var import_components = require("./dom/components");
var import_streaming = require("./streaming");
let errorBoundaryCounter = 0;
const childrenToString = async (children) => {
  try {
    return children.flat().map((c) => c == null || typeof c === "boolean" ? "" : c.toString());
  } catch (e) {
    if (e instanceof Promise) {
      await e;
      return childrenToString(children);
    } else {
      throw e;
    }
  }
};
const resolveChildEarly = (c) => {
  if (c == null || typeof c === "boolean") {
    return "";
  } else if (typeof c === "string") {
    return c;
  } else {
    const str = c.toString();
    if (!(str instanceof Promise)) {
      return (0, import_html.raw)(str);
    } else {
      return str;
    }
  }
};
const ErrorBoundary = async ({ children, fallback, fallbackRender, onError }) => {
  if (!children) {
    return (0, import_html.raw)("");
  }
  if (!Array.isArray(children)) {
    children = [children];
  }
  const nonce = (0, import_context.useContext)(import_streaming.StreamingContext)?.scriptNonce;
  let fallbackStr;
  const resolveFallbackStr = async () => {
    const awaitedFallback = await fallback;
    if (typeof awaitedFallback === "string") {
      fallbackStr = awaitedFallback;
    } else {
      fallbackStr = await awaitedFallback?.toString();
      if (typeof fallbackStr === "string") {
        fallbackStr = (0, import_html.raw)(fallbackStr);
      }
    }
  };
  const fallbackRes = (error) => {
    onError?.(error);
    return fallbackStr || fallbackRender && (0, import_base.jsx)(import_base.Fragment, {}, fallbackRender(error)) || "";
  };
  let resArray = [];
  try {
    resArray = children.map(resolveChildEarly);
  } catch (e) {
    await resolveFallbackStr();
    if (e instanceof Promise) {
      resArray = [
        e.then(() => childrenToString(children)).catch((e2) => fallbackRes(e2))
      ];
    } else {
      resArray = [fallbackRes(e)];
    }
  }
  if (resArray.some((res) => res instanceof Promise)) {
    await resolveFallbackStr();
    const index = errorBoundaryCounter++;
    const replaceRe = RegExp(`(<template id="E:${index}"></template>.*?)(.*?)(<!--E:${index}-->)`);
    const caught = false;
    const catchCallback = async ({ error: error2, buffer }) => {
      if (caught) {
        return "";
      }
      const fallbackResString = await (0, import_base.Fragment)({
        children: fallbackRes(error2)
      }).toString();
      if (buffer) {
        buffer[0] = buffer[0].replace(replaceRe, fallbackResString);
      }
      return buffer ? "" : `<template data-hono-target="E:${index}">${fallbackResString}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='E:${index}')
d.replaceWith(c.content)
})(document)
</script>`;
    };
    let error;
    const promiseAll = Promise.all(resArray).catch((e) => error = e);
    return (0, import_html.raw)(`<template id="E:${index}"></template><!--E:${index}-->`, [
      ({ phase, buffer, context }) => {
        if (phase === import_html2.HtmlEscapedCallbackPhase.BeforeStream) {
          return;
        }
        return promiseAll.then(async (htmlArray) => {
          if (error) {
            throw error;
          }
          htmlArray = htmlArray.flat();
          const content = htmlArray.join("");
          let html = buffer ? "" : `<template data-hono-target="E:${index}">${content}</template><script${nonce ? ` nonce="${nonce}"` : ""}>
((d,c) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
d.parentElement.insertBefore(c.content,d.nextSibling)
})(document)
</script>`;
          if (htmlArray.every((html2) => !html2.callbacks?.length)) {
            if (buffer) {
              buffer[0] = buffer[0].replace(replaceRe, content);
            }
            return html;
          }
          if (buffer) {
            buffer[0] = buffer[0].replace(
              replaceRe,
              (_all, pre, _, post) => `${pre}${content}${post}`
            );
          }
          const callbacks = htmlArray.map((html2) => html2.callbacks || []).flat();
          if (phase === import_html2.HtmlEscapedCallbackPhase.Stream) {
            html = await (0, import_html2.resolveCallback)(
              html,
              import_html2.HtmlEscapedCallbackPhase.BeforeStream,
              true,
              context
            );
          }
          let resolvedCount = 0;
          const promises = callbacks.map(
            (c) => (...args) => c(...args)?.then((content2) => {
              resolvedCount++;
              if (buffer) {
                if (resolvedCount === callbacks.length) {
                  buffer[0] = buffer[0].replace(replaceRe, (_all, _pre, content3) => content3);
                }
                buffer[0] += content2;
                return (0, import_html.raw)("", content2.callbacks);
              }
              return (0, import_html.raw)(
                content2 + (resolvedCount !== callbacks.length ? "" : `<script>
((d,c,n) => {
d=d.getElementById('E:${index}')
if(!d)return
n=d.nextSibling
while(n.nodeType!=8||n.nodeValue!='E:${index}'){n=n.nextSibling}
n.remove()
d.remove()
})(document)
</script>`),
                content2.callbacks
              );
            }).catch((error2) => catchCallback({ error: error2, buffer }))
          );
          return (0, import_html.raw)(html, promises);
        }).catch((error2) => catchCallback({ error: error2, buffer }));
      }
    ]);
  } else {
    return (0, import_base.Fragment)({ children: resArray });
  }
};
ErrorBoundary[import_constants.DOM_RENDERER] = import_components.ErrorBoundary;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ErrorBoundary,
  childrenToString
});
