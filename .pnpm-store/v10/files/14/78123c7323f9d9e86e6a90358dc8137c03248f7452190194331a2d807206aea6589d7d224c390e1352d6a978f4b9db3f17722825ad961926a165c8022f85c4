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
  createCssJsxDomObjects: () => createCssJsxDomObjects,
  css: () => css,
  cx: () => cx,
  keyframes: () => keyframes,
  rawCssString: () => import_common2.rawCssString,
  viewTransition: () => viewTransition
});
module.exports = __toCommonJS(css_exports);
var import_common = require("../../helper/css/common");
var import_common2 = require("../../helper/css/common");
const splitRule = (rule) => {
  const result = [];
  let startPos = 0;
  let depth = 0;
  for (let i = 0, len = rule.length; i < len; i++) {
    const char = rule[i];
    if (char === "'" || char === '"') {
      const quote = char;
      i++;
      for (; i < len; i++) {
        if (rule[i] === "\\") {
          i++;
          continue;
        }
        if (rule[i] === quote) {
          break;
        }
      }
      continue;
    }
    if (char === "{") {
      depth++;
      continue;
    }
    if (char === "}") {
      depth--;
      if (depth === 0) {
        result.push(rule.slice(startPos, i + 1));
        startPos = i + 1;
      }
      continue;
    }
  }
  return result;
};
const createCssJsxDomObjects = ({ id }) => {
  let styleSheet = void 0;
  const findStyleSheet = () => {
    if (!styleSheet) {
      styleSheet = document.querySelector(`style#${id}`)?.sheet;
      if (styleSheet) {
        ;
        styleSheet.addedStyles = /* @__PURE__ */ new Set();
      }
    }
    return styleSheet ? [styleSheet, styleSheet.addedStyles] : [];
  };
  const insertRule = (className, styleString) => {
    const [sheet, addedStyles] = findStyleSheet();
    if (!sheet || !addedStyles) {
      Promise.resolve().then(() => {
        if (!findStyleSheet()[0]) {
          throw new Error("style sheet not found");
        }
        insertRule(className, styleString);
      });
      return;
    }
    if (!addedStyles.has(className)) {
      addedStyles.add(className);
      (className.startsWith(import_common.PSEUDO_GLOBAL_SELECTOR) ? splitRule(styleString) : [`${className[0] === "@" ? "" : "."}${className}{${styleString}}`]).forEach((rule) => {
        sheet.insertRule(rule, sheet.cssRules.length);
      });
    }
  };
  const cssObject = {
    toString() {
      const selector = this[import_common.SELECTOR];
      insertRule(selector, this[import_common.STYLE_STRING]);
      this[import_common.SELECTORS].forEach(({ [import_common.CLASS_NAME]: className, [import_common.STYLE_STRING]: styleString }) => {
        insertRule(className, styleString);
      });
      return this[import_common.CLASS_NAME];
    }
  };
  const Style2 = ({ children, nonce }) => ({
    tag: "style",
    props: {
      id,
      nonce,
      children: children && (Array.isArray(children) ? children : [children]).map(
        (c) => c[import_common.STYLE_STRING]
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  });
  return [cssObject, Style2];
};
const createCssContext = ({ id }) => {
  const [cssObject, Style2] = createCssJsxDomObjects({ id });
  const newCssClassNameObject = (cssClassName) => {
    cssClassName.toString = cssObject.toString;
    return cssClassName;
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
  return {
    css: css2,
    cx: cx2,
    keyframes: keyframes2,
    viewTransition: viewTransition2,
    Style: Style2
  };
};
const defaultContext = createCssContext({ id: import_common.DEFAULT_STYLE_ID });
const css = defaultContext.css;
const cx = defaultContext.cx;
const keyframes = defaultContext.keyframes;
const viewTransition = defaultContext.viewTransition;
const Style = defaultContext.Style;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Style,
  createCssContext,
  createCssJsxDomObjects,
  css,
  cx,
  keyframes,
  rawCssString,
  viewTransition
});
