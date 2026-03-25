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
var jsx_renderer_exports = {};
__export(jsx_renderer_exports, {
  RequestContext: () => RequestContext,
  jsxRenderer: () => jsxRenderer,
  useRequestContext: () => useRequestContext
});
module.exports = __toCommonJS(jsx_renderer_exports);
var import_html = require("../../helper/html");
var import_jsx = require("../../jsx");
var import_streaming = require("../../jsx/streaming");
const RequestContext = (0, import_jsx.createContext)(null);
const createRenderer = (c, Layout, component, options) => (children, props) => {
  options = typeof options === "function" ? options(c) : options;
  const docType = typeof options?.docType === "string" ? options.docType : options?.docType === false ? "" : "<!DOCTYPE html>";
  const currentLayout = component ? (0, import_jsx.jsx)(
    (props2) => component(props2, c),
    {
      Layout,
      ...props
    },
    children
  ) : children;
  const body = import_html.html`${(0, import_html.raw)(docType)}${(0, import_jsx.jsx)(
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
    return c.body((0, import_streaming.renderToReadableStream)(body));
  } else {
    return c.html(body);
  }
};
const jsxRenderer = (component, options) => function jsxRenderer2(c, next) {
  const Layout = c.getLayout() ?? import_jsx.Fragment;
  if (component) {
    c.setLayout((props) => {
      return component({ ...props, Layout }, c);
    });
  }
  c.setRenderer(createRenderer(c, Layout, component, options));
  return next();
};
const useRequestContext = () => {
  const c = (0, import_jsx.useContext)(RequestContext);
  if (!c) {
    throw new Error("RequestContext is not provided.");
  }
  return c;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RequestContext,
  jsxRenderer,
  useRequestContext
});
