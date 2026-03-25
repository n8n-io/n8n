// src/jsx/dom/css.ts
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
} from "../../helper/css/common.js";
import { rawCssString } from "../../helper/css/common.js";
var splitRule = (rule) => {
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
var createCssJsxDomObjects = ({ id }) => {
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
      (className.startsWith(PSEUDO_GLOBAL_SELECTOR) ? splitRule(styleString) : [`${className[0] === "@" ? "" : "."}${className}{${styleString}}`]).forEach((rule) => {
        sheet.insertRule(rule, sheet.cssRules.length);
      });
    }
  };
  const cssObject = {
    toString() {
      const selector = this[SELECTOR];
      insertRule(selector, this[STYLE_STRING]);
      this[SELECTORS].forEach(({ [CLASS_NAME]: className, [STYLE_STRING]: styleString }) => {
        insertRule(className, styleString);
      });
      return this[CLASS_NAME];
    }
  };
  const Style2 = ({ children, nonce }) => ({
    tag: "style",
    props: {
      id,
      nonce,
      children: children && (Array.isArray(children) ? children : [children]).map(
        (c) => c[STYLE_STRING]
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  });
  return [cssObject, Style2];
};
var createCssContext = ({ id }) => {
  const [cssObject, Style2] = createCssJsxDomObjects({ id });
  const newCssClassNameObject = (cssClassName) => {
    cssClassName.toString = cssObject.toString;
    return cssClassName;
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
  return {
    css: css2,
    cx: cx2,
    keyframes: keyframes2,
    viewTransition: viewTransition2,
    Style: Style2
  };
};
var defaultContext = createCssContext({ id: DEFAULT_STYLE_ID });
var css = defaultContext.css;
var cx = defaultContext.cx;
var keyframes = defaultContext.keyframes;
var viewTransition = defaultContext.viewTransition;
var Style = defaultContext.Style;
export {
  Style,
  createCssContext,
  createCssJsxDomObjects,
  css,
  cx,
  keyframes,
  rawCssString,
  viewTransition
};
