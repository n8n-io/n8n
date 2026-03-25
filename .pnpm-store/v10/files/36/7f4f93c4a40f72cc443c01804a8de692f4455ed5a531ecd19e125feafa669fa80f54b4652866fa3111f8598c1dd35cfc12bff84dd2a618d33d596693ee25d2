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
var css_exports = {};
__export(css_exports, {
  Style: () => Style,
  createCssContext: () => createCssContext,
  css: () => css,
  cx: () => cx,
  keyframes: () => keyframes,
  rawCssString: () => import_common2.rawCssString,
  viewTransition: () => viewTransition
});
module.exports = __toCommonJS(css_exports);
var import_html = require("../../helper/html");
var import_constants = require("../../jsx/constants");
var import_css = require("../../jsx/dom/css");
var import_common = require("./common");
var import_common2 = require("./common");
const createCssContext = ({ id }) => {
  const [cssJsxDomObject, StyleRenderToDom] = (0, import_css.createCssJsxDomObjects)({ id });
  const contextMap = /* @__PURE__ */ new WeakMap();
  const nonceMap = /* @__PURE__ */ new WeakMap();
  const replaceStyleRe = new RegExp(`(<style id="${id}"(?: nonce="[^"]*")?>.*?)(</style>)`);
  const newCssClassNameObject = (cssClassName) => {
    const appendStyle = ({ buffer, context }) => {
      const [toAdd, added] = contextMap.get(context);
      const names = Object.keys(toAdd);
      if (!names.length) {
        return;
      }
      let stylesStr = "";
      names.forEach((className2) => {
        added[className2] = true;
        stylesStr += className2.startsWith(import_common.PSEUDO_GLOBAL_SELECTOR) ? toAdd[className2] : `${className2[0] === "@" ? "" : "."}${className2}{${toAdd[className2]}}`;
      });
      contextMap.set(context, [{}, added]);
      if (buffer && replaceStyleRe.test(buffer[0])) {
        buffer[0] = buffer[0].replace(replaceStyleRe, (_, pre, post) => `${pre}${stylesStr}${post}`);
        return;
      }
      const nonce = nonceMap.get(context);
      const appendStyleScript = `<script${nonce ? ` nonce="${nonce}"` : ""}>document.querySelector('#${id}').textContent+=${JSON.stringify(stylesStr)}</script>`;
      if (buffer) {
        buffer[0] = `${appendStyleScript}${buffer[0]}`;
        return;
      }
      return Promise.resolve(appendStyleScript);
    };
    const addClassNameToContext = ({ context }) => {
      if (!contextMap.has(context)) {
        contextMap.set(context, [{}, {}]);
      }
      const [toAdd, added] = contextMap.get(context);
      let allAdded = true;
      if (!added[cssClassName[import_common.SELECTOR]]) {
        allAdded = false;
        toAdd[cssClassName[import_common.SELECTOR]] = cssClassName[import_common.STYLE_STRING];
      }
      cssClassName[import_common.SELECTORS].forEach(
        ({ [import_common.CLASS_NAME]: className2, [import_common.STYLE_STRING]: styleString }) => {
          if (!added[className2]) {
            allAdded = false;
            toAdd[className2] = styleString;
          }
        }
      );
      if (allAdded) {
        return;
      }
      return Promise.resolve((0, import_html.raw)("", [appendStyle]));
    };
    const className = new String(cssClassName[import_common.CLASS_NAME]);
    Object.assign(className, cssClassName);
    className.isEscaped = true;
    className.callbacks = [addClassNameToContext];
    const promise = Promise.resolve(className);
    Object.assign(promise, cssClassName);
    promise.toString = cssJsxDomObject.toString;
    return promise;
  };
  const css2 = (strings, ...values) => {
    return newCssClassNameObject((0, import_common.cssCommon)(strings, values));
  };
  const cx2 = (...args) => {
    args = (0, import_common.cxCommon)(args);
    return css2(Array(args.length).fill(""), ...args);
  };
  const keyframes2 = import_common.keyframesCommon;
  const viewTransition2 = ((strings, ...values) => {
    return newCssClassNameObject((0, import_common.viewTransitionCommon)(strings, values));
  });
  const Style2 = ({ children, nonce } = {}) => (0, import_html.raw)(
    `<style id="${id}"${nonce ? ` nonce="${nonce}"` : ""}>${children ? children[import_common.STYLE_STRING] : ""}</style>`,
    [
      ({ context }) => {
        nonceMap.set(context, nonce);
        return void 0;
      }
    ]
  );
  Style2[import_constants.DOM_RENDERER] = StyleRenderToDom;
  return {
    css: css2,
    cx: cx2,
    keyframes: keyframes2,
    viewTransition: viewTransition2,
    Style: Style2
  };
};
const defaultContext = createCssContext({
  id: import_common.DEFAULT_STYLE_ID
});
const css = defaultContext.css;
const cx = defaultContext.cx;
const keyframes = defaultContext.keyframes;
const viewTransition = defaultContext.viewTransition;
const Style = defaultContext.Style;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Style,
  createCssContext,
  css,
  cx,
  keyframes,
  rawCssString,
  viewTransition
});
