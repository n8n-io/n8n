// src/middleware/jsx-renderer/index.ts
import { html, raw } from "../../helper/html/index.js";
import { Fragment, createContext, jsx, useContext } from "../../jsx/index.js";
import { renderToReadableStream } from "../../jsx/streaming.js";
var RequestContext = createContext(null);
var createRenderer = (c, Layout, component, options) => (children, props) => {
  options = typeof options === "function" ? options(c) : options;
  const docType = typeof options?.docType === "string" ? options.docType : options?.docType === false ? "" : "<!DOCTYPE html>";
  const currentLayout = component ? jsx(
    (props2) => component(props2, c),
    {
      Layout,
      ...props
    },
    children
  ) : children;
  const body = html`${raw(docType)}${jsx(
    RequestContext.Provider,
    { value: c },
    currentLayout
  )}`;
  if (options?.stream) {
    if (options.stream === true) {
      c.header("Transfer-Encoding", "chunked");
      c.header("Content-Type", "text/html; charset=UTF-8");
      c.header("Content-Encoding", "Identity");
    } else {
      for (const [key, value] of Object.entries(options.stream)) {
        c.header(key, value);
      }
    }
    return c.body(renderToReadableStream(body));
  } else {
    return c.html(body);
  }
};
var jsxRenderer = (component, options) => function jsxRenderer2(c, next) {
  const Layout = c.getLayout() ?? Fragment;
  if (component) {
    c.setLayout((props) => {
      return component({ ...props, Layout }, c);
    });
  }
  c.setRenderer(createRenderer(c, Layout, component, options));
  return next();
};
var useRequestContext = () => {
  const c = useContext(RequestContext);
  if (!c) {
    throw new Error("RequestContext is not provided.");
  }
  return c;
};
export {
  RequestContext,
  jsxRenderer,
  useRequestContext
};
