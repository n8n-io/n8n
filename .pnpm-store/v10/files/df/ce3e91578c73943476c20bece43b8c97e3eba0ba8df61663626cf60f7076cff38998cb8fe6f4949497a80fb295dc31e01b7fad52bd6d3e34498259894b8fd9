// src/jsx/components.ts
import { raw } from "../helper/html/index.js";
import { HtmlEscapedCallbackPhase, resolveCallback } from "../utils/html.js";
import { jsx, Fragment } from "./base.js";
import { DOM_RENDERER } from "./constants.js";
import { useContext } from "./context.js";
import { ErrorBoundary as ErrorBoundaryDomRenderer } from "./dom/components.js";
import { StreamingContext } from "./streaming.js";
var errorBoundaryCounter = 0;
var childrenToString = async (children) => {
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
var resolveChildEarly = (c) => {
  if (c == null || typeof c === "boolean") {
    return "";
  } else if (typeof c === "string") {
    return c;
  } else {
    const str = c.toString();
    if (!(str instanceof Promise)) {
      return raw(str);
    } else {
      return str;
    }
  }
};
var ErrorBoundary = async ({ children, fallback, fallbackRender, onError }) => {
  if (!children) {
    return raw("");
  }
  if (!Array.isArray(children)) {
    children = [children];
  }
  const nonce = useContext(StreamingContext)?.scriptNonce;
  let fallbackStr;
  const resolveFallbackStr = async () => {
    const awaitedFallback = await fallback;
    if (typeof awaitedFallback === "string") {
      fallbackStr = awaitedFallback;
    } else {
      fallbackStr = await awaitedFallback?.toString();
      if (typeof fallbackStr === "string") {
        fallbackStr = raw(fallbackStr);
      }
    }
  };
  const fallbackRes = (error) => {
    onError?.(error);
    return fallbackStr || fallbackRender && jsx(Fragment, {}, fallbackRender(error)) || "";
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
      const fallbackResString = await Fragment({
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
    return raw(`<template id="E:${index}"></template><!--E:${index}-->`, [
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
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
          if (phase === HtmlEscapedCallbackPhase.Stream) {
            html = await resolveCallback(
              html,
              HtmlEscapedCallbackPhase.BeforeStream,
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
                return raw("", content2.callbacks);
              }
              return raw(
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
          return raw(html, promises);
        }).catch((error2) => catchCallback({ error: error2, buffer }));
      }
    ]);
  } else {
    return Fragment({ children: resArray });
  }
};
ErrorBoundary[DOM_RENDERER] = ErrorBoundaryDomRenderer;
export {
  ErrorBoundary,
  childrenToString
};
