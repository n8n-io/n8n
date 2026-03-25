// src/jsx/streaming.ts
import { raw } from "../helper/html/index.js";
import { HtmlEscapedCallbackPhase, resolveCallback } from "../utils/html.js";
import { JSXNode } from "./base.js";
import { childrenToString } from "./components.js";
import { DOM_RENDERER, DOM_STASH } from "./constants.js";
import { createContext, useContext } from "./context.js";
import { Suspense as SuspenseDomRenderer } from "./dom/components.js";
import { buildDataStack } from "./dom/render.js";
var StreamingContext = createContext(null);
var suspenseCounter = 0;
var Suspense = async ({
  children,
  fallback
}) => {
  if (!Array.isArray(children)) {
    children = [children];
  }
  const nonce = useContext(StreamingContext)?.scriptNonce;
  let resArray = [];
  const stackNode = { [DOM_STASH]: [0, []] };
  const popNodeStack = (value) => {
    buildDataStack.pop();
    return value;
  };
  try {
    stackNode[DOM_STASH][0] = 0;
    buildDataStack.push([[], stackNode]);
    resArray = children.map(
      (c) => c == null || typeof c === "boolean" ? "" : c.toString()
    );
  } catch (e) {
    if (e instanceof Promise) {
      resArray = [
        e.then(() => {
          stackNode[DOM_STASH][0] = 0;
          buildDataStack.push([[], stackNode]);
          return childrenToString(children).then(popNodeStack);
        })
      ];
    } else {
      throw e;
    }
  } finally {
    popNodeStack();
  }
  if (resArray.some((res) => res instanceof Promise)) {
    const index = suspenseCounter++;
    const fallbackStr = await fallback.toString();
    return raw(`<template id="H:${index}"></template>${fallbackStr}<!--/$-->`, [
      ...fallbackStr.callbacks || [],
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
          return;
        }
        return Promise.all(resArray).then(async (htmlArray) => {
          htmlArray = htmlArray.flat();
          const content = htmlArray.join("");
          if (buffer) {
            buffer[0] = buffer[0].replace(
              new RegExp(`<template id="H:${index}"></template>.*?<!--/\\$-->`),
              content
            );
          }
          let html = buffer ? "" : `<template data-hono-target="H:${index}">${content}</template><script${nonce ? ` nonce="${nonce}"` : ""}>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`;
          const callbacks = htmlArray.map((html2) => html2.callbacks || []).flat();
          if (!callbacks.length) {
            return html;
          }
          if (phase === HtmlEscapedCallbackPhase.Stream) {
            html = await resolveCallback(html, HtmlEscapedCallbackPhase.BeforeStream, true, context);
          }
          return raw(html, callbacks);
        });
      }
    ]);
  } else {
    return raw(resArray.join(""));
  }
};
Suspense[DOM_RENDERER] = SuspenseDomRenderer;
var textEncoder = new TextEncoder();
var renderToReadableStream = (content, onError = console.trace) => {
  let cancelled = false;
  const reader = new ReadableStream({
    async start(controller) {
      try {
        if (content instanceof JSXNode) {
          content = content.toString();
        }
        const context = typeof content === "object" ? content : {};
        const resolved = await resolveCallback(
          content,
          HtmlEscapedCallbackPhase.BeforeStream,
          true,
          context
        );
        if (!cancelled) {
          controller.enqueue(textEncoder.encode(resolved));
        }
        let resolvedCount = 0;
        const callbacks = [];
        const then = (promise) => {
          callbacks.push(
            promise.catch((err) => {
              console.log(err);
              onError(err);
              return "";
            }).then(async (res) => {
              res = await resolveCallback(
                res,
                HtmlEscapedCallbackPhase.BeforeStream,
                true,
                context
              );
              res.callbacks?.map((c) => c({ phase: HtmlEscapedCallbackPhase.Stream, context })).filter(Boolean).forEach(then);
              resolvedCount++;
              if (!cancelled) {
                controller.enqueue(textEncoder.encode(res));
              }
            })
          );
        };
        resolved.callbacks?.map((c) => c({ phase: HtmlEscapedCallbackPhase.Stream, context })).filter(Boolean).forEach(then);
        while (resolvedCount !== callbacks.length) {
          await Promise.all(callbacks);
        }
      } catch (e) {
        onError(e);
      }
      if (!cancelled) {
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    }
  });
  return reader;
};
export {
  StreamingContext,
  Suspense,
  renderToReadableStream
};
