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
var streaming_exports = {};
__export(streaming_exports, {
  StreamingContext: () => StreamingContext,
  Suspense: () => Suspense,
  renderToReadableStream: () => renderToReadableStream
});
module.exports = __toCommonJS(streaming_exports);
var import_html = require("../helper/html");
var import_html2 = require("../utils/html");
var import_base = require("./base");
var import_components = require("./components");
var import_constants = require("./constants");
var import_context = require("./context");
var import_components2 = require("./dom/components");
var import_render = require("./dom/render");
const StreamingContext = (0, import_context.createContext)(null);
let suspenseCounter = 0;
const Suspense = async ({
  children,
  fallback
}) => {
  if (!Array.isArray(children)) {
    children = [children];
  }
  const nonce = (0, import_context.useContext)(StreamingContext)?.scriptNonce;
  let resArray = [];
  const stackNode = { [import_constants.DOM_STASH]: [0, []] };
  const popNodeStack = (value) => {
    import_render.buildDataStack.pop();
    return value;
  };
  try {
    stackNode[import_constants.DOM_STASH][0] = 0;
    import_render.buildDataStack.push([[], stackNode]);
    resArray = children.map(
      (c) => c == null || typeof c === "boolean" ? "" : c.toString()
    );
  } catch (e) {
    if (e instanceof Promise) {
      resArray = [
        e.then(() => {
          stackNode[import_constants.DOM_STASH][0] = 0;
          import_render.buildDataStack.push([[], stackNode]);
          return (0, import_components.childrenToString)(children).then(popNodeStack);
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
    return (0, import_html.raw)(`<template id="H:${index}"></template>${fallbackStr}<!--/$-->`, [
      ...fallbackStr.callbacks || [],
      ({ phase, buffer, context }) => {
        if (phase === import_html2.HtmlEscapedCallbackPhase.BeforeStream) {
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
          if (phase === import_html2.HtmlEscapedCallbackPhase.Stream) {
            html = await (0, import_html2.resolveCallback)(html, import_html2.HtmlEscapedCallbackPhase.BeforeStream, true, context);
          }
          return (0, import_html.raw)(html, callbacks);
        });
      }
    ]);
  } else {
    return (0, import_html.raw)(resArray.join(""));
  }
};
Suspense[import_constants.DOM_RENDERER] = import_components2.Suspense;
const textEncoder = new TextEncoder();
const renderToReadableStream = (content, onError = console.trace) => {
  let cancelled = false;
  const reader = new ReadableStream({
    async start(controller) {
      try {
        if (content instanceof import_base.JSXNode) {
          content = content.toString();
        }
        const context = typeof content === "object" ? content : {};
        const resolved = await (0, import_html2.resolveCallback)(
          content,
          import_html2.HtmlEscapedCallbackPhase.BeforeStream,
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
              res = await (0, import_html2.resolveCallback)(
                res,
                import_html2.HtmlEscapedCallbackPhase.BeforeStream,
                true,
                context
              );
              res.callbacks?.map((c) => c({ phase: import_html2.HtmlEscapedCallbackPhase.Stream, context })).filter(Boolean).forEach(then);
              resolvedCount++;
              if (!cancelled) {
                controller.enqueue(textEncoder.encode(res));
              }
            })
          );
        };
        resolved.callbacks?.map((c) => c({ phase: import_html2.HtmlEscapedCallbackPhase.Stream, context })).filter(Boolean).forEach(then);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StreamingContext,
  Suspense,
  renderToReadableStream
});
