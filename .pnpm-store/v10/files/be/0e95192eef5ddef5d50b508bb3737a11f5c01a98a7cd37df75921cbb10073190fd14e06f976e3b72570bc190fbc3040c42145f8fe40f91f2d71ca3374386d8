// src/helper/css/index.ts
import { raw } from "../../helper/html/index.js";
import { DOM_RENDERER } from "../../jsx/constants.js";
import { createCssJsxDomObjects } from "../../jsx/dom/css.js";
import {
  CLASS_NAME,
  DEFAULT_STYLE_ID,
  PSEUDO_GLOBAL_SELECTOR,
  SELECTOR,
  SELECTORS,
  STYLE_STRING,
  cssCommon,
  cxCommon,
  keyframesCommon,
  viewTransitionCommon
} from "./common.js";
import { rawCssString } from "./common.js";
var createCssContext = ({ id }) => {
  const [cssJsxDomObject, StyleRenderToDom] = createCssJsxDomObjects({ id });
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
        stylesStr += className2.startsWith(PSEUDO_GLOBAL_SELECTOR) ? toAdd[className2] : `${className2[0] === "@" ? "" : "."}${className2}{${toAdd[className2]}}`;
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
      if (!added[cssClassName[SELECTOR]]) {
        allAdded = false;
        toAdd[cssClassName[SELECTOR]] = cssClassName[STYLE_STRING];
      }
      cssClassName[SELECTORS].forEach(
        ({ [CLASS_NAME]: className2, [STYLE_STRING]: styleString }) => {
          if (!added[className2]) {
            allAdded = false;
            toAdd[className2] = styleString;
          }
        }
      );
      if (allAdded) {
        return;
      }
      return Promise.resolve(raw("", [appendStyle]));
    };
    const className = new String(cssClassName[CLASS_NAME]);
    Object.assign(className, cssClassName);
    className.isEscaped = true;
    className.callbacks = [addClassNameToContext];
    const promise = Promise.resolve(className);
    Object.assign(promise, cssClassName);
    promise.toString = cssJsxDomObject.toString;
    return promise;
  };
  const css2 = (strings, ...values) => {
    return newCssClassNameObject(cssCommon(strings, values));
  };
  const cx2 = (...args) => {
    args = cxCommon(args);
    return css2(Array(args.length).fill(""), ...args);
  };
  const keyframes2 = keyframesCommon;
  const viewTransition2 = ((strings, ...values) => {
    return newCssClassNameObject(viewTransitionCommon(strings, values));
  });
  const Style2 = ({ children, nonce } = {}) => raw(
    `<style id="${id}"${nonce ? ` nonce="${nonce}"` : ""}>${children ? children[STYLE_STRING] : ""}</style>`,
    [
      ({ context }) => {
        nonceMap.set(context, nonce);
        return void 0;
      }
    ]
  );
  Style2[DOM_RENDERER] = StyleRenderToDom;
  return {
    css: css2,
    cx: cx2,
    keyframes: keyframes2,
    viewTransition: viewTransition2,
    Style: Style2
  };
};
var defaultContext = createCssContext({
  id: DEFAULT_STYLE_ID
});
var css = defaultContext.css;
var cx = defaultContext.cx;
var keyframes = defaultContext.keyframes;
var viewTransition = defaultContext.viewTransition;
var Style = defaultContext.Style;
export {
  Style,
  createCssContext,
  css,
  cx,
  keyframes,
  rawCssString,
  viewTransition
};
