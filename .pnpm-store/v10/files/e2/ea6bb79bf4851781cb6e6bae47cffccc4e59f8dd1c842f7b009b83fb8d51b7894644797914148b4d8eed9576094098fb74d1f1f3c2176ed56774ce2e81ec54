import {
  DEFAULT_BACKGROUNDS,
  PARAM_KEY as PARAM_KEY2,
  PARAM_KEY2 as PARAM_KEY3,
  PARAM_KEY3 as PARAM_KEY4
} from "../_browser-chunks/chunk-FNXWN6IK.js";
import {
  composeConfigs,
  composeStory,
  mountDestructured,
  normalizeArrays,
  normalizeProjectAnnotations
} from "../_browser-chunks/chunk-MDLQUVZN.js";
import "../_browser-chunks/chunk-IPA5A322.js";
import "../_browser-chunks/chunk-3OXGAGBE.js";
import {
  combineParameters
} from "../_browser-chunks/chunk-VYJQ7RU5.js";
import "../_browser-chunks/chunk-3IAH5M2U.js";
import "../_browser-chunks/chunk-QKODTO7K.js";
import {
  invariant
} from "../_browser-chunks/chunk-AS2HQEYC.js";
import "../_browser-chunks/chunk-YKE5S47A.js";
import "../_browser-chunks/chunk-AIOS4NGK.js";
import "../_browser-chunks/chunk-GFLS4VP3.js";
import "../_browser-chunks/chunk-WJYERY3R.js";
import {
  dedent
} from "../_browser-chunks/chunk-JP7NCOJX.js";
import {
  HIGHLIGHT,
  MAX_Z_INDEX,
  MIN_TOUCH_AREA_SIZE,
  REMOVE_HIGHLIGHT,
  RESET_HIGHLIGHT,
  SCROLL_INTO_VIEW
} from "../_browser-chunks/chunk-KJHJLCBK.js";
import "../_browser-chunks/chunk-ECQ75MKQ.js";
import {
  action
} from "../_browser-chunks/chunk-EUVGDK4H.js";
import "../_browser-chunks/chunk-6XWLIJQL.js";
import {
  PARAM_KEY
} from "../_browser-chunks/chunk-SL75JR6Y.js";
import {
  __commonJS,
  __export,
  __toESM
} from "../_browser-chunks/chunk-A242L54C.js";

// ../node_modules/@ngard/tiny-isequal/index.js
var require_tiny_isequal = __commonJS({
  "../node_modules/@ngard/tiny-isequal/index.js"(exports) {
    Object.defineProperty(exports, "__esModule", { value: !0 }), exports.isEqual = /* @__PURE__ */ (function() {
      var e = Object.prototype.toString, r = Object.getPrototypeOf, t = Object.getOwnPropertySymbols ? function(e2) {
        return Object.keys(e2).concat(Object.getOwnPropertySymbols(e2));
      } : Object.keys;
      return function(n, a) {
        return (function n2(a2, c, u) {
          var i, s, l, o = e.call(a2), f = e.call(c);
          if (a2 === c) return !0;
          if (a2 == null || c == null) return !1;
          if (u.indexOf(a2) > -1 && u.indexOf(c) > -1) return !0;
          if (u.push(a2, c), o != f || (i = t(a2), s = t(c), i.length != s.length || i.some(function(e2) {
            return !n2(a2[e2], c[e2], u);
          }))) return !1;
          switch (o.slice(8, -1)) {
            case "Symbol":
              return a2.valueOf() == c.valueOf();
            case "Date":
            case "Number":
              return +a2 == +c || +a2 != +a2 && +c != +c;
            case "RegExp":
            case "Function":
            case "String":
            case "Boolean":
              return "" + a2 == "" + c;
            case "Set":
            case "Map":
              i = a2.entries(), s = c.entries();
              do
                if (!n2((l = i.next()).value, s.next().value, u)) return !1;
              while (!l.done);
              return !0;
            case "ArrayBuffer":
              a2 = new Uint8Array(a2), c = new Uint8Array(c);
            case "DataView":
              a2 = new Uint8Array(a2.buffer), c = new Uint8Array(c.buffer);
            case "Float32Array":
            case "Float64Array":
            case "Int8Array":
            case "Int16Array":
            case "Int32Array":
            case "Uint8Array":
            case "Uint16Array":
            case "Uint32Array":
            case "Uint8ClampedArray":
            case "Arguments":
            case "Array":
              if (a2.length != c.length) return !1;
              for (l = 0; l < a2.length; l++) if ((l in a2 || l in c) && (l in a2 != l in c || !n2(a2[l], c[l], u))) return !1;
              return !0;
            case "Object":
              return n2(r(a2), r(c), u);
            default:
              return !1;
          }
        })(n, a, []);
      };
    })();
  }
});

// src/csf/toStartCaseStr.ts
function toStartCaseStr(str) {
  return str.replace(/_/g, " ").replace(/-/g, " ").replace(/\./g, " ").replace(/([^\n])([A-Z])([a-z])/g, (str2, $1, $2, $3) => `${$1} ${$2}${$3}`).replace(/([a-z])([A-Z])/g, (str2, $1, $2) => `${$1} ${$2}`).replace(/([a-z])([0-9])/gi, (str2, $1, $2) => `${$1} ${$2}`).replace(/([0-9])([a-z])/gi, (str2, $1, $2) => `${$1} ${$2}`).replace(/(\s|^)(\w)/g, (str2, $1, $2) => `${$1}${$2.toUpperCase()}`).replace(/ +/g, " ").trim();
}

// src/csf/includeConditionalArg.ts
var import_tiny_isequal = __toESM(require_tiny_isequal(), 1), count = (vals) => vals.map((v) => typeof v < "u").filter(Boolean).length, testValue = (cond, value) => {
  let { exists, eq, neq, truthy } = cond;
  if (count([exists, eq, neq, truthy]) > 1)
    throw new Error(`Invalid conditional test ${JSON.stringify({ exists, eq, neq })}`);
  if (typeof eq < "u")
    return (0, import_tiny_isequal.isEqual)(value, eq);
  if (typeof neq < "u")
    return !(0, import_tiny_isequal.isEqual)(value, neq);
  if (typeof exists < "u") {
    let valueExists = typeof value < "u";
    return exists ? valueExists : !valueExists;
  }
  return (typeof truthy > "u" ? !0 : truthy) ? !!value : !value;
}, includeConditionalArg = (argType, args, globals) => {
  if (!argType.if)
    return !0;
  let { arg, global: global5 } = argType.if;
  if (count([arg, global5]) !== 1)
    throw new Error(`Invalid conditional value ${JSON.stringify({ arg, global: global5 })}`);
  let value = arg ? args[arg] : globals[global5];
  return testValue(argType.if, value);
};

// src/csf/csf-factories.ts
import { combineTags } from "storybook/internal/csf";

// src/actions/preview.ts
import { definePreviewAddon } from "storybook/internal/csf";

// src/actions/addArgs.ts
var addArgs_exports = {};
__export(addArgs_exports, {
  argsEnhancers: () => argsEnhancers
});

// src/actions/addArgsHelpers.ts
var isInInitialArgs = (name, initialArgs) => typeof initialArgs[name] > "u" && !(name in initialArgs), inferActionsFromArgTypesRegex = (context) => {
  let {
    initialArgs,
    argTypes,
    id,
    parameters: { actions }
  } = context;
  if (!actions || actions.disable || !actions.argTypesRegex || !argTypes)
    return {};
  let argTypesRegex = new RegExp(actions.argTypesRegex);
  return Object.entries(argTypes).filter(
    ([name]) => !!argTypesRegex.test(name)
  ).reduce((acc, [name, argType]) => (isInInitialArgs(name, initialArgs) && (acc[name] = action(name, { implicit: !0, id })), acc), {});
}, addActionsFromArgTypes = (context) => {
  let {
    initialArgs,
    argTypes,
    parameters: { actions }
  } = context;
  return actions?.disable || !argTypes ? {} : Object.entries(argTypes).filter(([name, argType]) => !!argType.action).reduce((acc, [name, argType]) => (isInInitialArgs(name, initialArgs) && (acc[name] = action(typeof argType.action == "string" ? argType.action : name)), acc), {});
};

// src/actions/addArgs.ts
var argsEnhancers = [
  addActionsFromArgTypes,
  inferActionsFromArgTypesRegex
];

// src/actions/loaders.ts
var loaders_exports = {};
__export(loaders_exports, {
  loaders: () => loaders
});
import { onMockCall } from "storybook/test";
var subscribed = !1, logActionsWhenMockCalled = (context) => {
  let { parameters: parameters2 } = context;
  parameters2?.actions?.disable || subscribed || (onMockCall((mock, args) => {
    let name = mock.getMockName();
    name !== "spy" && name !== "vi.fn()" && (!/^next\/.*::/.test(name) || [
      "next/router::useRouter()",
      "next/navigation::useRouter()",
      "next/navigation::redirect",
      "next/cache::",
      "next/headers::cookies().set",
      "next/headers::cookies().delete",
      "next/headers::headers().set",
      "next/headers::headers().delete"
    ].some((prefix) => name.startsWith(prefix))) && action(name)(args);
  }), subscribed = !0);
}, loaders = [logActionsWhenMockCalled];

// src/actions/preview.ts
var preview_default = () => definePreviewAddon({
  ...addArgs_exports,
  ...loaders_exports
});

// src/backgrounds/preview.ts
import { definePreviewAddon as definePreviewAddon2 } from "storybook/internal/csf";

// src/backgrounds/decorator.ts
import { useEffect } from "storybook/preview-api";

// src/backgrounds/utils.ts
var { document: document2 } = globalThis, isReduceMotionEnabled = () => globalThis?.matchMedia ? !!globalThis.matchMedia("(prefers-reduced-motion: reduce)")?.matches : !1, clearStyles = (selector) => {
  (Array.isArray(selector) ? selector : [selector]).forEach(clearStyle);
}, clearStyle = (selector) => {
  if (!document2)
    return;
  let element = document2.getElementById(selector);
  element && element.parentElement && element.parentElement.removeChild(element);
}, addGridStyle = (selector, css) => {
  if (!document2)
    return;
  let existingStyle = document2.getElementById(selector);
  if (existingStyle)
    existingStyle.innerHTML !== css && (existingStyle.innerHTML = css);
  else {
    let style = document2.createElement("style");
    style.setAttribute("id", selector), style.innerHTML = css, document2.head.appendChild(style);
  }
}, addBackgroundStyle = (selector, css, storyId) => {
  if (!document2)
    return;
  let existingStyle = document2.getElementById(selector);
  if (existingStyle)
    existingStyle.innerHTML !== css && (existingStyle.innerHTML = css);
  else {
    let style = document2.createElement("style");
    style.setAttribute("id", selector), style.innerHTML = css;
    let gridStyleSelector = `addon-backgrounds-grid${storyId ? `-docs-${storyId}` : ""}`, existingGridStyle = document2.getElementById(gridStyleSelector);
    existingGridStyle ? existingGridStyle.parentElement?.insertBefore(style, existingGridStyle) : document2.head.appendChild(style);
  }
};

// src/backgrounds/decorator.ts
var defaultGrid = {
  cellSize: 100,
  cellAmount: 10,
  opacity: 0.8
}, BG_SELECTOR_BASE = "addon-backgrounds", GRID_SELECTOR_BASE = "addon-backgrounds-grid", transitionStyle = isReduceMotionEnabled() ? "" : "transition: background-color 0.3s;", withBackgroundAndGrid = (StoryFn, context) => {
  let { globals = {}, parameters: parameters2 = {}, viewMode, id } = context, {
    options = DEFAULT_BACKGROUNDS,
    disable,
    grid = defaultGrid
  } = parameters2[PARAM_KEY2] || {}, data = globals[PARAM_KEY2] || {}, backgroundName = typeof data == "string" ? data : data?.value, item = backgroundName ? options[backgroundName] : void 0, value = typeof item == "string" ? item : item?.value || "transparent", showGrid = typeof data == "string" ? !1 : data.grid || !1, shownBackground = !!item && !disable, backgroundSelector = viewMode === "docs" ? `#anchor--${id} .docs-story` : ".sb-show-main", gridSelector = viewMode === "docs" ? `#anchor--${id} .docs-story` : ".sb-show-main", isLayoutPadded = parameters2.layout === void 0 || parameters2.layout === "padded", defaultOffset = viewMode === "docs" ? 20 : isLayoutPadded ? 16 : 0, { cellAmount, cellSize, opacity, offsetX = defaultOffset, offsetY = defaultOffset } = grid, backgroundSelectorId = viewMode === "docs" ? `${BG_SELECTOR_BASE}-docs-${id}` : `${BG_SELECTOR_BASE}-color`, backgroundTarget = viewMode === "docs" ? id : null;
  useEffect(() => {
    let backgroundStyles = `
    ${backgroundSelector} {
      background: ${value} !important;
      ${transitionStyle}
      }`;
    if (!shownBackground) {
      clearStyles(backgroundSelectorId);
      return;
    }
    addBackgroundStyle(backgroundSelectorId, backgroundStyles, backgroundTarget);
  }, [backgroundSelector, backgroundSelectorId, backgroundTarget, shownBackground, value]);
  let gridSelectorId = viewMode === "docs" ? `${GRID_SELECTOR_BASE}-docs-${id}` : `${GRID_SELECTOR_BASE}`;
  return useEffect(() => {
    if (!showGrid) {
      clearStyles(gridSelectorId);
      return;
    }
    let gridSize = [
      `${cellSize * cellAmount}px ${cellSize * cellAmount}px`,
      `${cellSize * cellAmount}px ${cellSize * cellAmount}px`,
      `${cellSize}px ${cellSize}px`,
      `${cellSize}px ${cellSize}px`
    ].join(", "), gridStyles = `
        ${gridSelector} {
          background-size: ${gridSize} !important;
          background-position: ${offsetX}px ${offsetY}px, ${offsetX}px ${offsetY}px, ${offsetX}px ${offsetY}px, ${offsetX}px ${offsetY}px !important;
          background-blend-mode: difference !important;
          background-image: linear-gradient(rgba(130, 130, 130, ${opacity}) 1px, transparent 1px),
           linear-gradient(90deg, rgba(130, 130, 130, ${opacity}) 1px, transparent 1px),
           linear-gradient(rgba(130, 130, 130, ${opacity / 2}) 1px, transparent 1px),
           linear-gradient(90deg, rgba(130, 130, 130, ${opacity / 2}) 1px, transparent 1px) !important;
        }
      `;
    addGridStyle(gridSelectorId, gridStyles);
  }, [cellAmount, cellSize, gridSelector, gridSelectorId, showGrid, offsetX, offsetY, opacity]), StoryFn();
};

// src/backgrounds/preview.ts
var decorators = globalThis.FEATURES?.backgrounds ? [withBackgroundAndGrid] : [], parameters = {
  [PARAM_KEY2]: {
    grid: {
      cellSize: 20,
      opacity: 0.5,
      cellAmount: 5
    },
    disable: !1
  }
}, initialGlobals = {
  [PARAM_KEY2]: { value: void 0, grid: !1 }
}, preview_default2 = () => definePreviewAddon2({
  decorators,
  parameters,
  initialGlobals
});

// src/component-testing/preview.ts
import { definePreviewAddon as definePreviewAddon3 } from "storybook/internal/csf";
import { instrument } from "storybook/internal/instrumenter";
var { step } = instrument(
  {
    // It seems like the label is unused, but the instrumenter has access to it
    // The context will be bounded later in StoryRender, so that the user can write just:
    // await step("label", (context) => {
    //   // labeled step
    // });
    step: async (label, play, context) => play(context)
  },
  { intercept: !0 }
), preview_default3 = () => definePreviewAddon3({
  parameters: {
    throwPlayFunctionExceptions: !1
  },
  runStep: step
});

// src/highlight/preview.ts
import { definePreviewAddon as definePreviewAddon4 } from "storybook/internal/csf";
import { addons } from "storybook/preview-api";

// src/highlight/useHighlights.ts
import { STORY_RENDER_PHASE_CHANGED } from "storybook/internal/core-events";

// src/highlight/icons.ts
var iconPaths = {
  chevronLeft: [
    "M9.10355 10.1464C9.29882 10.3417 9.29882 10.6583 9.10355 10.8536C8.90829 11.0488 8.59171 11.0488 8.39645 10.8536L4.89645 7.35355C4.70118 7.15829 4.70118 6.84171 4.89645 6.64645L8.39645 3.14645C8.59171 2.95118 8.90829 2.95118 9.10355 3.14645C9.29882 3.34171 9.29882 3.65829 9.10355 3.85355L5.95711 7L9.10355 10.1464Z"
  ],
  chevronRight: [
    "M4.89645 10.1464C4.70118 10.3417 4.70118 10.6583 4.89645 10.8536C5.09171 11.0488 5.40829 11.0488 5.60355 10.8536L9.10355 7.35355C9.29882 7.15829 9.29882 6.84171 9.10355 6.64645L5.60355 3.14645C5.40829 2.95118 5.09171 2.95118 4.89645 3.14645C4.70118 3.34171 4.70118 3.65829 4.89645 3.85355L8.04289 7L4.89645 10.1464Z"
  ],
  info: [
    "M7 5.5a.5.5 0 01.5.5v4a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM7 4.5A.75.75 0 107 3a.75.75 0 000 1.5z",
    "M7 14A7 7 0 107 0a7 7 0 000 14zm0-1A6 6 0 107 1a6 6 0 000 12z"
  ],
  shareAlt: [
    "M2 1.004a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-4.5a.5.5 0 00-1 0v4.5H2v-10h4.5a.5.5 0 000-1H2z",
    "M7.354 7.357L12 2.711v1.793a.5.5 0 001 0v-3a.5.5 0 00-.5-.5h-3a.5.5 0 100 1h1.793L6.646 6.65a.5.5 0 10.708.707z"
  ]
};

// src/highlight/utils.ts
var svgElements = "svg,path,rect,circle,line,polyline,polygon,ellipse,text".split(","), createElement = (type, props = {}, children) => {
  let element = svgElements.includes(type) ? document.createElementNS("http://www.w3.org/2000/svg", type) : document.createElement(type);
  return Object.entries(props).forEach(([key, val]) => {
    /[A-Z]/.test(key) ? (key === "onClick" && (element.addEventListener("click", val), element.addEventListener("keydown", (e) => {
      (e.key === "Enter" || e.key === " ") && (e.preventDefault(), val());
    })), key === "onMouseEnter" && element.addEventListener("mouseenter", val), key === "onMouseLeave" && element.addEventListener("mouseleave", val)) : element.setAttribute(key, val);
  }), children?.forEach((child) => {
    if (!(child == null || child === !1))
      try {
        element.appendChild(child);
      } catch {
        element.appendChild(document.createTextNode(String(child)));
      }
  }), element;
}, createIcon = (name) => iconPaths[name] && createElement(
  "svg",
  { width: "14", height: "14", viewBox: "0 0 14 14", xmlns: "http://www.w3.org/2000/svg" },
  iconPaths[name].map(
    (d) => createElement("path", {
      fill: "currentColor",
      "fill-rule": "evenodd",
      "clip-rule": "evenodd",
      d
    })
  )
), normalizeOptions = (options) => {
  if ("elements" in options) {
    let { elements, color, style } = options;
    return {
      id: void 0,
      priority: 0,
      selectors: elements,
      styles: {
        outline: `2px ${style} ${color}`,
        outlineOffset: "2px",
        boxShadow: "0 0 0 6px rgba(255,255,255,0.6)"
      },
      menu: void 0
    };
  }
  let { menu, ...rest } = options;
  return {
    id: void 0,
    priority: 0,
    styles: {
      outline: "2px dashed #029cfd"
    },
    ...rest,
    menu: Array.isArray(menu) ? menu.every(Array.isArray) ? menu : [menu] : void 0
  };
}, isFunction = (obj) => obj instanceof Function, state = /* @__PURE__ */ new Map(), listeners = /* @__PURE__ */ new Map(), teardowns = /* @__PURE__ */ new Map(), useStore = (initialValue) => {
  let key = Symbol();
  return listeners.set(key, []), state.set(key, initialValue), { get: () => state.get(key), set: (update) => {
    let current = state.get(key), next = isFunction(update) ? update(current) : update;
    next !== current && (state.set(key, next), listeners.get(key)?.forEach((listener) => {
      teardowns.get(listener)?.(), teardowns.set(listener, listener(next));
    }));
  }, subscribe: (listener) => (listeners.get(key)?.push(listener), () => {
    let list = listeners.get(key);
    list && listeners.set(
      key,
      list.filter((l) => l !== listener)
    );
  }), teardown: () => {
    listeners.get(key)?.forEach((listener) => {
      teardowns.get(listener)?.(), teardowns.delete(listener);
    }), listeners.delete(key), state.delete(key);
  } };
}, mapElements = (highlights) => {
  let root = document.getElementById("storybook-root"), map = /* @__PURE__ */ new Map();
  for (let highlight of highlights) {
    let { priority = 0 } = highlight;
    for (let selector of highlight.selectors) {
      let elements = [
        ...document.querySelectorAll(
          // Elements matching the selector, excluding storybook elements and their descendants.
          // Necessary to find portaled elements (e.g. children of `body`).
          `:is(${selector}):not([id^="storybook-"], [id^="storybook-"] *, [class^="sb-"], [class^="sb-"] *)`
        ),
        // Elements matching the selector inside the storybook root, as these were excluded above.
        ...root?.querySelectorAll(selector) || []
      ];
      for (let element of elements) {
        let existing = map.get(element);
        (!existing || existing.priority <= priority) && map.set(element, {
          ...highlight,
          priority,
          selectors: Array.from(new Set((existing?.selectors || []).concat(selector)))
        });
      }
    }
  }
  return map;
}, mapBoxes = (elements) => Array.from(elements.entries()).map(([element, { selectors, styles, hoverStyles, focusStyles, menu }]) => {
  let { top, left, width, height } = element.getBoundingClientRect(), { position } = getComputedStyle(element);
  return {
    element,
    selectors,
    styles,
    hoverStyles,
    focusStyles,
    menu,
    top: position === "fixed" ? top : top + window.scrollY,
    left: position === "fixed" ? left : left + window.scrollX,
    width,
    height
  };
}).sort((a, b) => b.width * b.height - a.width * a.height), isOverMenu = (menuElement, coordinates) => {
  let menu = menuElement.getBoundingClientRect(), { x, y } = coordinates;
  return menu?.top && menu?.left && x >= menu.left && x <= menu.left + menu.width && y >= menu.top && y <= menu.top + menu.height;
}, isTargeted = (box, boxElement, coordinates) => {
  if (!boxElement || !coordinates)
    return !1;
  let { left, top, width, height } = box;
  height < MIN_TOUCH_AREA_SIZE && (top = top - Math.round((MIN_TOUCH_AREA_SIZE - height) / 2), height = MIN_TOUCH_AREA_SIZE), width < MIN_TOUCH_AREA_SIZE && (left = left - Math.round((MIN_TOUCH_AREA_SIZE - width) / 2), width = MIN_TOUCH_AREA_SIZE), boxElement.style.position === "fixed" && (left += window.scrollX, top += window.scrollY);
  let { x, y } = coordinates;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}, keepInViewport = (element, targetCoordinates, options = {}) => {
  let { x, y } = targetCoordinates, { margin = 5, topOffset = 0, centered = !1 } = options, { scrollX, scrollY, innerHeight: windowHeight, innerWidth: windowWidth } = window, top = Math.min(
    element.style.position === "fixed" ? y - scrollY : y,
    windowHeight - element.clientHeight - margin - topOffset + scrollY
  ), leftOffset = centered ? element.clientWidth / 2 : 0, left = element.style.position === "fixed" ? Math.max(Math.min(x - scrollX, windowWidth - leftOffset - margin), leftOffset + margin) : Math.max(
    Math.min(x, windowWidth - leftOffset - margin + scrollX),
    leftOffset + margin + scrollX
  );
  Object.assign(element.style, {
    ...left !== x && { left: `${left}px` },
    ...top !== y && { top: `${top}px` }
  });
}, showPopover = (element) => {
  window.HTMLElement.prototype.hasOwnProperty("showPopover") && element.showPopover();
}, hidePopover = (element) => {
  window.HTMLElement.prototype.hasOwnProperty("showPopover") && element.hidePopover();
}, getEventDetails = (target) => ({
  top: target.top,
  left: target.left,
  width: target.width,
  height: target.height,
  selectors: target.selectors,
  element: {
    attributes: Object.fromEntries(
      Array.from(target.element.attributes).map((attr) => [attr.name, attr.value])
    ),
    localName: target.element.localName,
    tagName: target.element.tagName,
    outerHTML: target.element.outerHTML
  }
});

// src/highlight/useHighlights.ts
var menuId = "storybook-highlights-menu", rootId = "storybook-highlights-root", storybookRootId = "storybook-root", useHighlights = (channel) => {
  if (globalThis.__STORYBOOK_HIGHLIGHT_INITIALIZED)
    return;
  globalThis.__STORYBOOK_HIGHLIGHT_INITIALIZED = !0;
  let { document: document3 } = globalThis, highlights = useStore([]), elements = useStore(/* @__PURE__ */ new Map()), boxes = useStore([]), clickCoords = useStore(), hoverCoords = useStore(), targets = useStore([]), hovered = useStore([]), focused = useStore(), selected = useStore(), root = document3.getElementById(rootId);
  highlights.subscribe(() => {
    root || (root = createElement("div", { id: rootId }), document3.body.appendChild(root));
  }), highlights.subscribe((value) => {
    let storybookRoot = document3.getElementById(storybookRootId);
    if (!storybookRoot)
      return;
    elements.set(mapElements(value));
    let observer = new MutationObserver(() => elements.set(mapElements(value)));
    return observer.observe(storybookRoot, { subtree: !0, childList: !0 }), () => {
      observer.disconnect();
    };
  }), elements.subscribe((value) => {
    let updateBoxes = () => requestAnimationFrame(() => boxes.set(mapBoxes(value))), observer = new ResizeObserver(updateBoxes);
    observer.observe(document3.body), Array.from(value.keys()).forEach((element) => observer.observe(element));
    let scrollers = Array.from(document3.body.querySelectorAll("*")).filter((el) => {
      let { overflow, overflowX, overflowY } = window.getComputedStyle(el);
      return ["auto", "scroll"].some((o) => [overflow, overflowX, overflowY].includes(o));
    });
    return scrollers.forEach((element) => element.addEventListener("scroll", updateBoxes)), () => {
      observer.disconnect(), scrollers.forEach((element) => element.removeEventListener("scroll", updateBoxes));
    };
  }), elements.subscribe((value) => {
    let sticky = Array.from(value.keys()).filter(({ style }) => style.position === "sticky"), updateBoxes = () => requestAnimationFrame(() => {
      boxes.set(
        (current) => current.map((box) => {
          if (sticky.includes(box.element)) {
            let { top, left } = box.element.getBoundingClientRect();
            return { ...box, top: top + window.scrollY, left: left + window.scrollX };
          }
          return box;
        })
      );
    });
    return document3.addEventListener("scroll", updateBoxes), () => document3.removeEventListener("scroll", updateBoxes);
  }), elements.subscribe((value) => {
    targets.set((t) => t.filter(({ element }) => value.has(element)));
  }), targets.subscribe((value) => {
    value.length ? (selected.set((s) => value.some((t) => t.element === s?.element) ? s : void 0), focused.set((s) => value.some((t) => t.element === s?.element) ? s : void 0)) : (selected.set(void 0), focused.set(void 0), clickCoords.set(void 0));
  });
  let styleElementByHighlight = new Map(/* @__PURE__ */ new Map());
  highlights.subscribe((value) => {
    value.forEach(({ keyframes }) => {
      if (keyframes) {
        let style = styleElementByHighlight.get(keyframes);
        style || (style = document3.createElement("style"), style.setAttribute("data-highlight", "keyframes"), styleElementByHighlight.set(keyframes, style), document3.head.appendChild(style)), style.innerHTML = keyframes;
      }
    }), styleElementByHighlight.forEach((style, keyframes) => {
      value.some((v) => v.keyframes === keyframes) || (style.remove(), styleElementByHighlight.delete(keyframes));
    });
  });
  let boxElementByTargetElement = new Map(/* @__PURE__ */ new Map());
  boxes.subscribe((value) => {
    value.forEach((box) => {
      let boxElement = boxElementByTargetElement.get(box.element);
      if (root && !boxElement) {
        let props = {
          popover: "manual",
          "data-highlight-dimensions": `w${box.width.toFixed(0)}h${box.height.toFixed(0)}`,
          "data-highlight-coordinates": `x${box.left.toFixed(0)}y${box.top.toFixed(0)}`
        };
        boxElement = root.appendChild(
          createElement("div", props, [createElement("div")])
        ), boxElementByTargetElement.set(box.element, boxElement);
      }
    }), boxElementByTargetElement.forEach((box, element) => {
      value.some(({ element: e }) => e === element) || (box.remove(), boxElementByTargetElement.delete(element));
    });
  }), boxes.subscribe((value) => {
    let targetable = value.filter((box) => box.menu);
    if (!targetable.length)
      return;
    let onClick = (event) => {
      requestAnimationFrame(() => {
        let menu = document3.getElementById(menuId), coords = { x: event.pageX, y: event.pageY };
        if (menu && !isOverMenu(menu, coords)) {
          let results = targetable.filter((box) => {
            let boxElement = boxElementByTargetElement.get(box.element);
            return isTargeted(box, boxElement, coords);
          });
          clickCoords.set(results.length ? coords : void 0), targets.set(results);
        }
      });
    };
    return document3.addEventListener("click", onClick), () => document3.removeEventListener("click", onClick);
  });
  let updateHovered = () => {
    let menu = document3.getElementById(menuId), coords = hoverCoords.get();
    !coords || menu && isOverMenu(menu, coords) || hovered.set((current) => {
      let update = boxes.get().filter((box) => {
        let boxElement = boxElementByTargetElement.get(box.element);
        return isTargeted(box, boxElement, coords);
      }), existing = current.filter((box) => update.includes(box)), additions = update.filter((box) => !current.includes(box)), hasRemovals = current.length - existing.length;
      return additions.length || hasRemovals ? [...existing, ...additions] : current;
    });
  };
  hoverCoords.subscribe(updateHovered), boxes.subscribe(updateHovered);
  let updateBoxStyles = () => {
    let selectedElement = selected.get(), targetElements = selectedElement ? [selectedElement] : targets.get(), focusedElement = targetElements.length === 1 ? targetElements[0] : focused.get(), isMenuOpen = clickCoords.get() !== void 0;
    boxes.get().forEach((box) => {
      let boxElement = boxElementByTargetElement.get(box.element);
      if (boxElement) {
        let isFocused = focusedElement === box, isHovered = isMenuOpen ? focusedElement ? isFocused : targetElements.includes(box) : hovered.get()?.includes(box);
        Object.assign(boxElement.style, {
          animation: "none",
          background: "transparent",
          border: "none",
          boxSizing: "border-box",
          outline: "none",
          outlineOffset: "0px",
          ...box.styles,
          ...isHovered ? box.hoverStyles : {},
          ...isFocused ? box.focusStyles : {},
          position: getComputedStyle(box.element).position === "fixed" ? "fixed" : "absolute",
          zIndex: MAX_Z_INDEX - 10,
          top: `${box.top}px`,
          left: `${box.left}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
          margin: 0,
          padding: 0,
          cursor: box.menu && isHovered ? "pointer" : "default",
          pointerEvents: box.menu ? "auto" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible"
        }), Object.assign(boxElement.children[0].style, {
          width: "100%",
          height: "100%",
          minHeight: `${MIN_TOUCH_AREA_SIZE}px`,
          minWidth: `${MIN_TOUCH_AREA_SIZE}px`,
          boxSizing: "content-box",
          padding: boxElement.style.outlineWidth || "0px"
        }), showPopover(boxElement);
      }
    });
  };
  boxes.subscribe(updateBoxStyles), targets.subscribe(updateBoxStyles), hovered.subscribe(updateBoxStyles), focused.subscribe(updateBoxStyles), selected.subscribe(updateBoxStyles);
  let renderMenu = () => {
    if (!root)
      return;
    let menu = document3.getElementById(menuId);
    if (menu)
      menu.innerHTML = "";
    else {
      let props = { id: menuId, popover: "manual" };
      menu = root.appendChild(createElement("div", props)), root.appendChild(
        createElement("style", {}, [
          `
            #${menuId} {
              position: absolute;
              z-index: ${MAX_Z_INDEX};
              width: 300px;
              padding: 0px;
              margin: 15px 0 0 0;
              transform: translateX(-50%);
              font-family: "Nunito Sans", -apple-system, ".SFNSText-Regular", "San Francisco", BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
              font-size: 12px;
              background: white;
              border: none;
              border-radius: 6px;
              box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.05), 0 5px 15px 0 rgba(0, 0, 0, 0.1);
              color: #2E3438;
            }
            #${menuId} ul {
              list-style: none;
              margin: 0;
              padding: 0;
            }
            #${menuId} > ul {
              max-height: 300px;
              overflow-y: auto;
              padding: 4px 0;
            }
            #${menuId} li {
              padding: 0 4px;
              margin: 0;
            }
            #${menuId} li > :not(ul) {
              display: flex;
              padding: 8px;
              margin: 0;
              align-items: center;
              gap: 8px;
              border-radius: 4px;
            }
            #${menuId} button {
              width: 100%;
              border: 0;
              background: transparent;
              color: inherit;
              text-align: left;
              font-family: inherit;
              font-size: inherit;
            }
            #${menuId} button:focus-visible {
              outline-color: #029CFD;
            }
            #${menuId} button:hover {
              background: rgba(2, 156, 253, 0.07);
              color: #029CFD;
              cursor: pointer;
            }
            #${menuId} li code {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 16px;
              font-size: 11px;
            }
            #${menuId} li svg {
              flex-shrink: 0;
              margin: 1px;
              color: #73828C;
            }
            #${menuId} li > button:hover svg, #${menuId} li > button:focus-visible svg {
              color: #029CFD;
            }
            #${menuId} .element-list li svg {
              display: none;
            }
            #${menuId} li.selectable svg, #${menuId} li.selected svg {
              display: block;
            }
            #${menuId} .menu-list {
              border-top: 1px solid rgba(38, 85, 115, 0.15);
            }
            #${menuId} .menu-list > li:not(:last-child) {
              padding-bottom: 4px;
              margin-bottom: 4px;
              border-bottom: 1px solid rgba(38, 85, 115, 0.15);
            }
            #${menuId} .menu-items, #${menuId} .menu-items li {
              padding: 0;
            }
            #${menuId} .menu-item {
              display: flex;
            }
            #${menuId} .menu-item-content {
              display: flex;
              flex-direction: column;
              flex-grow: 1;
            }
          `
        ])
      );
    }
    let selectedElement = selected.get(), elementList = selectedElement ? [selectedElement] : targets.get();
    if (elementList.length && (menu.style.position = getComputedStyle(elementList[0].element).position === "fixed" ? "fixed" : "absolute", menu.appendChild(
      createElement(
        "ul",
        { class: "element-list" },
        elementList.map((target) => {
          let selectable = elementList.length > 1 && !!target.menu?.some(
            (group) => group.some(
              (item) => !item.selectors || item.selectors.some((s) => target.selectors.includes(s))
            )
          ), props = selectable ? {
            class: "selectable",
            onClick: () => selected.set(target),
            onMouseEnter: () => focused.set(target),
            onMouseLeave: () => focused.set(void 0)
          } : selectedElement ? { class: "selected", onClick: () => selected.set(void 0) } : {}, asButton = selectable || selectedElement;
          return createElement("li", props, [
            createElement(asButton ? "button" : "div", asButton ? { type: "button" } : {}, [
              selectedElement ? createIcon("chevronLeft") : null,
              createElement("code", {}, [target.element.outerHTML]),
              selectable ? createIcon("chevronRight") : null
            ])
          ]);
        })
      )
    )), selected.get() || targets.get().length === 1) {
      let target = selected.get() || targets.get()[0], menuGroups = target.menu?.filter(
        (group) => group.some(
          (item) => !item.selectors || item.selectors.some((s) => target.selectors.includes(s))
        )
      );
      menuGroups?.length && menu.appendChild(
        createElement(
          "ul",
          { class: "menu-list" },
          menuGroups.map(
            (menuItems) => createElement("li", {}, [
              createElement(
                "ul",
                { class: "menu-items" },
                menuItems.map(
                  ({ id, title, description, iconLeft, iconRight, clickEvent: event }) => {
                    let onClick = event && (() => channel.emit(event, id, getEventDetails(target)));
                    return createElement("li", {}, [
                      createElement(
                        onClick ? "button" : "div",
                        onClick ? { class: "menu-item", type: "button", onClick } : { class: "menu-item" },
                        [
                          iconLeft ? createIcon(iconLeft) : null,
                          createElement("div", { class: "menu-item-content" }, [
                            createElement(description ? "strong" : "span", {}, [title]),
                            description && createElement("span", {}, [description])
                          ]),
                          iconRight ? createIcon(iconRight) : null
                        ]
                      )
                    ]);
                  }
                )
              )
            ])
          )
        )
      );
    }
    let coords = clickCoords.get();
    coords ? (Object.assign(menu.style, {
      display: "block",
      left: `${menu.style.position === "fixed" ? coords.x - window.scrollX : coords.x}px`,
      top: `${menu.style.position === "fixed" ? coords.y - window.scrollY : coords.y}px`
    }), showPopover(menu), requestAnimationFrame(() => keepInViewport(menu, coords, { topOffset: 15, centered: !0 }))) : (hidePopover(menu), Object.assign(menu.style, { display: "none" }));
  };
  targets.subscribe(renderMenu), selected.subscribe(renderMenu);
  let addHighlight = (highlight) => {
    let info = normalizeOptions(highlight);
    highlights.set((value) => {
      let others = info.id ? value.filter((h) => h.id !== info.id) : value;
      return info.selectors?.length ? [...others, info] : others;
    });
  }, removeHighlight = (id) => {
    id && highlights.set((value) => value.filter((h) => h.id !== id));
  }, resetState = () => {
    highlights.set([]), elements.set(/* @__PURE__ */ new Map()), boxes.set([]), clickCoords.set(void 0), hoverCoords.set(void 0), targets.set([]), hovered.set([]), focused.set(void 0), selected.set(void 0);
  }, removeTimeout, scrollIntoView = (target, options) => {
    let id = "scrollIntoView-highlight";
    clearTimeout(removeTimeout), removeHighlight(id);
    let element = document3.querySelector(target);
    if (!element) {
      console.warn(`Cannot scroll into view: ${target} not found`);
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center", ...options });
    let keyframeName = `kf-${Math.random().toString(36).substring(2, 15)}`;
    highlights.set((value) => [
      ...value,
      {
        id,
        priority: 1e3,
        selectors: [target],
        styles: {
          outline: "2px solid #1EA7FD",
          outlineOffset: "-1px",
          animation: `${keyframeName} 3s linear forwards`
        },
        keyframes: `@keyframes ${keyframeName} {
          0% { outline: 2px solid #1EA7FD; }
          20% { outline: 2px solid #1EA7FD00; }
          40% { outline: 2px solid #1EA7FD; }
          60% { outline: 2px solid #1EA7FD00; }
          80% { outline: 2px solid #1EA7FD; }
          100% { outline: 2px solid #1EA7FD00; }
        }`
      }
    ]), removeTimeout = setTimeout(() => removeHighlight(id), 3500);
  }, onMouseMove = (event) => {
    requestAnimationFrame(() => hoverCoords.set({ x: event.pageX, y: event.pageY }));
  };
  document3.body.addEventListener("mousemove", onMouseMove), channel.on(HIGHLIGHT, addHighlight), channel.on(REMOVE_HIGHLIGHT, removeHighlight), channel.on(RESET_HIGHLIGHT, resetState), channel.on(SCROLL_INTO_VIEW, scrollIntoView), channel.on(STORY_RENDER_PHASE_CHANGED, ({ newPhase }) => {
    newPhase === "loading" && resetState();
  });
};

// src/highlight/preview.ts
globalThis?.FEATURES?.highlight && addons?.ready && addons.ready().then(useHighlights);
var preview_default4 = () => definePreviewAddon4({});

// src/measure/preview.ts
import { definePreviewAddon as definePreviewAddon5 } from "storybook/internal/csf";

// src/measure/withMeasure.ts
import { useEffect as useEffect2 } from "storybook/preview-api";

// src/measure/box-model/canvas.ts
import { global } from "@storybook/global";
function getDocumentWidthAndHeight() {
  let container = global.document.documentElement, height = Math.max(container.scrollHeight, container.offsetHeight);
  return { width: Math.max(container.scrollWidth, container.offsetWidth), height };
}
function createCanvas() {
  let canvas = global.document.createElement("canvas");
  canvas.id = "storybook-addon-measure";
  let context = canvas.getContext("2d");
  invariant(context != null);
  let { width, height } = getDocumentWidthAndHeight();
  return setCanvasWidthAndHeight(canvas, context, { width, height }), canvas.style.position = "absolute", canvas.style.left = "0", canvas.style.top = "0", canvas.style.zIndex = "2147483647", canvas.style.pointerEvents = "none", global.document.body.appendChild(canvas), { canvas, context, width, height };
}
function setCanvasWidthAndHeight(canvas, context, { width, height }) {
  canvas.style.width = `${width}px`, canvas.style.height = `${height}px`;
  let scale = global.window.devicePixelRatio;
  canvas.width = Math.floor(width * scale), canvas.height = Math.floor(height * scale), context.scale(scale, scale);
}
var state2 = {};
function init() {
  state2.canvas || (state2 = createCanvas());
}
function clear() {
  state2.context && state2.context.clearRect(0, 0, state2.width ?? 0, state2.height ?? 0);
}
function draw(callback) {
  clear(), callback(state2.context);
}
function rescale() {
  invariant(state2.canvas, "Canvas should exist in the state."), invariant(state2.context, "Context should exist in the state."), setCanvasWidthAndHeight(state2.canvas, state2.context, { width: 0, height: 0 });
  let { width, height } = getDocumentWidthAndHeight();
  setCanvasWidthAndHeight(state2.canvas, state2.context, { width, height }), state2.width = width, state2.height = height;
}
function destroy() {
  state2.canvas && (clear(), state2.canvas.parentNode?.removeChild(state2.canvas), state2 = {});
}

// src/measure/box-model/visualizer.ts
import { global as global2 } from "@storybook/global";

// src/measure/box-model/labels.ts
var colors = {
  margin: "#f6b26b",
  border: "#ffe599",
  padding: "#93c47d",
  content: "#6fa8dc",
  text: "#232020"
}, labelPadding = 6;
function roundedRect(context, { x, y, w, h, r }) {
  x = x - w / 2, y = y - h / 2, w < 2 * r && (r = w / 2), h < 2 * r && (r = h / 2), context.beginPath(), context.moveTo(x + r, y), context.arcTo(x + w, y, x + w, y + h, r), context.arcTo(x + w, y + h, x, y + h, r), context.arcTo(x, y + h, x, y, r), context.arcTo(x, y, x + w, y, r), context.closePath();
}
function positionCoordinate(position, { padding, border, width, height, top, left }) {
  let contentWidth = width - border.left - border.right - padding.left - padding.right, contentHeight = height - padding.top - padding.bottom - border.top - border.bottom, x = left + border.left + padding.left, y = top + border.top + padding.top;
  return position === "top" ? x += contentWidth / 2 : position === "right" ? (x += contentWidth, y += contentHeight / 2) : position === "bottom" ? (x += contentWidth / 2, y += contentHeight) : position === "left" ? y += contentHeight / 2 : position === "center" && (x += contentWidth / 2, y += contentHeight / 2), { x, y };
}
function offset(type, position, { margin, border, padding }, labelPaddingSize, external) {
  let shift = (dir) => 0, offsetX = 0, offsetY = 0, locationMultiplier = external ? 1 : 0.5, labelPaddingShift = external ? labelPaddingSize * 2 : 0;
  return type === "padding" ? shift = (dir) => padding[dir] * locationMultiplier + labelPaddingShift : type === "border" ? shift = (dir) => padding[dir] + border[dir] * locationMultiplier + labelPaddingShift : type === "margin" && (shift = (dir) => padding[dir] + border[dir] + margin[dir] * locationMultiplier + labelPaddingShift), position === "top" ? offsetY = -shift("top") : position === "right" ? offsetX = shift("right") : position === "bottom" ? offsetY = shift("bottom") : position === "left" && (offsetX = -shift("left")), { offsetX, offsetY };
}
function collide(a, b) {
  return Math.abs(a.x - b.x) < Math.abs(a.w + b.w) / 2 && Math.abs(a.y - b.y) < Math.abs(a.h + b.h) / 2;
}
function overlapAdjustment(position, currentRect, prevRect) {
  return position === "top" ? currentRect.y = prevRect.y - prevRect.h - labelPadding : position === "right" ? currentRect.x = prevRect.x + prevRect.w / 2 + labelPadding + currentRect.w / 2 : position === "bottom" ? currentRect.y = prevRect.y + prevRect.h + labelPadding : position === "left" && (currentRect.x = prevRect.x - prevRect.w / 2 - labelPadding - currentRect.w / 2), { x: currentRect.x, y: currentRect.y };
}
function textWithRect(context, type, { x, y, w, h }, text) {
  return roundedRect(context, { x, y, w, h, r: 3 }), context.fillStyle = `${colors[type]}dd`, context.fill(), context.strokeStyle = colors[type], context.stroke(), context.fillStyle = colors.text, context.fillText(text, x, y), roundedRect(context, { x, y, w, h, r: 3 }), context.fillStyle = `${colors[type]}dd`, context.fill(), context.strokeStyle = colors[type], context.stroke(), context.fillStyle = colors.text, context.fillText(text, x, y), { x, y, w, h };
}
function configureText(context, text) {
  context.font = "600 12px monospace", context.textBaseline = "middle", context.textAlign = "center";
  let metrics = context.measureText(text), actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent, w = metrics.width + labelPadding * 2, h = actualHeight + labelPadding * 2;
  return { w, h };
}
function drawLabel(context, measurements, { type, position = "center", text }, prevRect, external = !1) {
  let { x, y } = positionCoordinate(position, measurements), { offsetX, offsetY } = offset(type, position, measurements, labelPadding + 1, external);
  x += offsetX, y += offsetY;
  let { w, h } = configureText(context, text);
  if (prevRect && collide({ x, y, w, h }, prevRect)) {
    let adjusted = overlapAdjustment(position, { x, y, w, h }, prevRect);
    x = adjusted.x, y = adjusted.y;
  }
  return textWithRect(context, type, { x, y, w, h }, text);
}
function floatingOffset(alignment, { w, h }) {
  let deltaW = w * 0.5 + labelPadding, deltaH = h * 0.5 + labelPadding;
  return {
    offsetX: (alignment.x === "left" ? -1 : 1) * deltaW,
    offsetY: (alignment.y === "top" ? -1 : 1) * deltaH
  };
}
function drawFloatingLabel(context, measurements, { type, text }) {
  let { floatingAlignment: floatingAlignment2, extremities } = measurements, x = extremities[floatingAlignment2.x], y = extremities[floatingAlignment2.y], { w, h } = configureText(context, text), { offsetX, offsetY } = floatingOffset(floatingAlignment2, {
    w,
    h
  });
  return x += offsetX, y += offsetY, textWithRect(context, type, { x, y, w, h }, text);
}
function drawStack(context, measurements, stack, external) {
  let rects = [];
  stack.forEach((l, idx) => {
    let rect = external && l.position === "center" ? drawFloatingLabel(context, measurements, l) : drawLabel(context, measurements, l, rects[idx - 1], external);
    rects[idx] = rect;
  });
}
function labelStacks(context, measurements, labels, externalLabels) {
  let stacks = labels.reduce((acc, l) => (Object.prototype.hasOwnProperty.call(acc, l.position) || (acc[l.position] = []), acc[l.position]?.push(l), acc), {});
  stacks.top && drawStack(context, measurements, stacks.top, externalLabels), stacks.right && drawStack(context, measurements, stacks.right, externalLabels), stacks.bottom && drawStack(context, measurements, stacks.bottom, externalLabels), stacks.left && drawStack(context, measurements, stacks.left, externalLabels), stacks.center && drawStack(context, measurements, stacks.center, externalLabels);
}

// src/measure/box-model/visualizer.ts
var colors2 = {
  margin: "#f6b26ba8",
  border: "#ffe599a8",
  padding: "#93c47d8c",
  content: "#6fa8dca8"
}, SMALL_NODE_SIZE = 30;
function pxToNumber(px) {
  return parseInt(px.replace("px", ""), 10);
}
function round(value) {
  return Number.isInteger(value) ? value : value.toFixed(2);
}
function filterZeroValues(labels) {
  return labels.filter((l) => l.text !== 0 && l.text !== "0");
}
function floatingAlignment(extremities) {
  let windowExtremities = {
    top: global2.window.scrollY,
    bottom: global2.window.scrollY + global2.window.innerHeight,
    left: global2.window.scrollX,
    right: global2.window.scrollX + global2.window.innerWidth
  }, distances = {
    top: Math.abs(windowExtremities.top - extremities.top),
    bottom: Math.abs(windowExtremities.bottom - extremities.bottom),
    left: Math.abs(windowExtremities.left - extremities.left),
    right: Math.abs(windowExtremities.right - extremities.right)
  };
  return {
    x: distances.left > distances.right ? "left" : "right",
    y: distances.top > distances.bottom ? "top" : "bottom"
  };
}
function measureElement(element) {
  let style = global2.getComputedStyle(element), { top, left, right, bottom, width, height } = element.getBoundingClientRect(), {
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    borderBottomWidth,
    borderTopWidth,
    borderLeftWidth,
    borderRightWidth
  } = style;
  top = top + global2.window.scrollY, left = left + global2.window.scrollX, bottom = bottom + global2.window.scrollY, right = right + global2.window.scrollX;
  let margin = {
    top: pxToNumber(marginTop),
    bottom: pxToNumber(marginBottom),
    left: pxToNumber(marginLeft),
    right: pxToNumber(marginRight)
  }, padding = {
    top: pxToNumber(paddingTop),
    bottom: pxToNumber(paddingBottom),
    left: pxToNumber(paddingLeft),
    right: pxToNumber(paddingRight)
  }, border = {
    top: pxToNumber(borderTopWidth),
    bottom: pxToNumber(borderBottomWidth),
    left: pxToNumber(borderLeftWidth),
    right: pxToNumber(borderRightWidth)
  }, extremities = {
    top: top - margin.top,
    bottom: bottom + margin.bottom,
    left: left - margin.left,
    right: right + margin.right
  };
  return {
    margin,
    padding,
    border,
    top,
    left,
    bottom,
    right,
    width,
    height,
    extremities,
    floatingAlignment: floatingAlignment(extremities)
  };
}
function drawMargin(context, { margin, width, height, top, left, bottom, right }) {
  let marginHeight = height + margin.bottom + margin.top;
  context.fillStyle = colors2.margin, context.fillRect(left, top - margin.top, width, margin.top), context.fillRect(right, top - margin.top, margin.right, marginHeight), context.fillRect(left, bottom, width, margin.bottom), context.fillRect(left - margin.left, top - margin.top, margin.left, marginHeight);
  let marginLabels = [
    {
      type: "margin",
      text: round(margin.top),
      position: "top"
    },
    {
      type: "margin",
      text: round(margin.right),
      position: "right"
    },
    {
      type: "margin",
      text: round(margin.bottom),
      position: "bottom"
    },
    {
      type: "margin",
      text: round(margin.left),
      position: "left"
    }
  ];
  return filterZeroValues(marginLabels);
}
function drawPadding(context, { padding, border, width, height, top, left, bottom, right }) {
  let paddingWidth = width - border.left - border.right, paddingHeight = height - padding.top - padding.bottom - border.top - border.bottom;
  context.fillStyle = colors2.padding, context.fillRect(left + border.left, top + border.top, paddingWidth, padding.top), context.fillRect(
    right - padding.right - border.right,
    top + padding.top + border.top,
    padding.right,
    paddingHeight
  ), context.fillRect(
    left + border.left,
    bottom - padding.bottom - border.bottom,
    paddingWidth,
    padding.bottom
  ), context.fillRect(left + border.left, top + padding.top + border.top, padding.left, paddingHeight);
  let paddingLabels = [
    {
      type: "padding",
      text: padding.top,
      position: "top"
    },
    {
      type: "padding",
      text: padding.right,
      position: "right"
    },
    {
      type: "padding",
      text: padding.bottom,
      position: "bottom"
    },
    {
      type: "padding",
      text: padding.left,
      position: "left"
    }
  ];
  return filterZeroValues(paddingLabels);
}
function drawBorder(context, { border, width, height, top, left, bottom, right }) {
  let borderHeight = height - border.top - border.bottom;
  context.fillStyle = colors2.border, context.fillRect(left, top, width, border.top), context.fillRect(left, bottom - border.bottom, width, border.bottom), context.fillRect(left, top + border.top, border.left, borderHeight), context.fillRect(right - border.right, top + border.top, border.right, borderHeight);
  let borderLabels = [
    {
      type: "border",
      text: border.top,
      position: "top"
    },
    {
      type: "border",
      text: border.right,
      position: "right"
    },
    {
      type: "border",
      text: border.bottom,
      position: "bottom"
    },
    {
      type: "border",
      text: border.left,
      position: "left"
    }
  ];
  return filterZeroValues(borderLabels);
}
function drawContent(context, { padding, border, width, height, top, left }) {
  let contentWidth = width - border.left - border.right - padding.left - padding.right, contentHeight = height - padding.top - padding.bottom - border.top - border.bottom;
  return context.fillStyle = colors2.content, context.fillRect(
    left + border.left + padding.left,
    top + border.top + padding.top,
    contentWidth,
    contentHeight
  ), [
    {
      type: "content",
      position: "center",
      text: `${round(contentWidth)} x ${round(contentHeight)}`
    }
  ];
}
function drawBoxModel(element) {
  return (context) => {
    if (element && context) {
      let measurements = measureElement(element), marginLabels = drawMargin(context, measurements), paddingLabels = drawPadding(context, measurements), borderLabels = drawBorder(context, measurements), contentLabels = drawContent(context, measurements), externalLabels = measurements.width <= SMALL_NODE_SIZE * 3 || measurements.height <= SMALL_NODE_SIZE;
      labelStacks(
        context,
        measurements,
        [...contentLabels, ...paddingLabels, ...borderLabels, ...marginLabels],
        externalLabels
      );
    }
  };
}
function drawSelectedElement(element) {
  draw(drawBoxModel(element));
}

// src/measure/util.ts
import { global as global3 } from "@storybook/global";
var deepElementFromPoint = (x, y) => {
  let element = global3.document.elementFromPoint(x, y), crawlShadows = (node) => {
    if (node && node.shadowRoot) {
      let nestedElement = node.shadowRoot.elementFromPoint(x, y);
      return node.isEqualNode(nestedElement) ? node : nestedElement.shadowRoot ? crawlShadows(nestedElement) : nestedElement;
    }
    return node;
  };
  return crawlShadows(element) || element;
};

// src/measure/withMeasure.ts
var nodeAtPointerRef, pointer = { x: 0, y: 0 };
function findAndDrawElement(x, y) {
  nodeAtPointerRef = deepElementFromPoint(x, y), drawSelectedElement(nodeAtPointerRef);
}
var withMeasure = (StoryFn, context) => {
  let { measureEnabled } = context.globals || {};
  return useEffect2(() => {
    if (typeof globalThis.document > "u")
      return;
    let onPointerMove = (event) => {
      window.requestAnimationFrame(() => {
        event.stopPropagation(), pointer.x = event.clientX, pointer.y = event.clientY;
      });
    };
    return globalThis.document.addEventListener("pointermove", onPointerMove), () => {
      globalThis.document.removeEventListener("pointermove", onPointerMove);
    };
  }, []), useEffect2(() => {
    let onPointerOver = (event) => {
      window.requestAnimationFrame(() => {
        event.stopPropagation(), findAndDrawElement(event.clientX, event.clientY);
      });
    }, onResize = () => {
      window.requestAnimationFrame(() => {
        rescale();
      });
    };
    return context.viewMode === "story" && measureEnabled && (globalThis.document.addEventListener("pointerover", onPointerOver), init(), globalThis.window.addEventListener("resize", onResize), findAndDrawElement(pointer.x, pointer.y)), () => {
      globalThis.window.removeEventListener("resize", onResize), destroy();
    };
  }, [measureEnabled, context.viewMode]), StoryFn();
};

// src/measure/preview.ts
var decorators2 = globalThis.FEATURES?.measure ? [withMeasure] : [], initialGlobals2 = {
  [PARAM_KEY3]: !1
}, preview_default5 = () => definePreviewAddon5({
  decorators: decorators2,
  initialGlobals: initialGlobals2
});

// src/outline/preview.ts
import { definePreviewAddon as definePreviewAddon6 } from "storybook/internal/csf";

// src/outline/withOutline.ts
import { useEffect as useEffect3, useMemo } from "storybook/preview-api";

// src/outline/helpers.ts
import { global as global4 } from "@storybook/global";
var clearStyles2 = (selector) => {
  (Array.isArray(selector) ? selector : [selector]).forEach(clearStyle2);
}, clearStyle2 = (input) => {
  let selector = typeof input == "string" ? input : input.join(""), element = global4.document.getElementById(selector);
  element && element.parentElement && element.parentElement.removeChild(element);
}, addOutlineStyles = (selector, css) => {
  let existingStyle = global4.document.getElementById(selector);
  if (existingStyle)
    existingStyle.innerHTML !== css && (existingStyle.innerHTML = css);
  else {
    let style = global4.document.createElement("style");
    style.setAttribute("id", selector), style.innerHTML = css, global4.document.head.appendChild(style);
  }
};

// src/outline/outlineCSS.ts
function outlineCSS(selector) {
  return dedent`
    ${selector} body {
      outline: 1px solid #2980b9 !important;
    }

    ${selector} article {
      outline: 1px solid #3498db !important;
    }

    ${selector} nav {
      outline: 1px solid #0088c3 !important;
    }

    ${selector} aside {
      outline: 1px solid #33a0ce !important;
    }

    ${selector} section {
      outline: 1px solid #66b8da !important;
    }

    ${selector} header {
      outline: 1px solid #99cfe7 !important;
    }

    ${selector} footer {
      outline: 1px solid #cce7f3 !important;
    }

    ${selector} h1 {
      outline: 1px solid #162544 !important;
    }

    ${selector} h2 {
      outline: 1px solid #314e6e !important;
    }

    ${selector} h3 {
      outline: 1px solid #3e5e85 !important;
    }

    ${selector} h4 {
      outline: 1px solid #449baf !important;
    }

    ${selector} h5 {
      outline: 1px solid #c7d1cb !important;
    }

    ${selector} h6 {
      outline: 1px solid #4371d0 !important;
    }

    ${selector} main {
      outline: 1px solid #2f4f90 !important;
    }

    ${selector} address {
      outline: 1px solid #1a2c51 !important;
    }

    ${selector} div {
      outline: 1px solid #036cdb !important;
    }

    ${selector} p {
      outline: 1px solid #ac050b !important;
    }

    ${selector} hr {
      outline: 1px solid #ff063f !important;
    }

    ${selector} pre {
      outline: 1px solid #850440 !important;
    }

    ${selector} blockquote {
      outline: 1px solid #f1b8e7 !important;
    }

    ${selector} ol {
      outline: 1px solid #ff050c !important;
    }

    ${selector} ul {
      outline: 1px solid #d90416 !important;
    }

    ${selector} li {
      outline: 1px solid #d90416 !important;
    }

    ${selector} dl {
      outline: 1px solid #fd3427 !important;
    }

    ${selector} dt {
      outline: 1px solid #ff0043 !important;
    }

    ${selector} dd {
      outline: 1px solid #e80174 !important;
    }

    ${selector} figure {
      outline: 1px solid #ff00bb !important;
    }

    ${selector} figcaption {
      outline: 1px solid #bf0032 !important;
    }

    ${selector} table {
      outline: 1px solid #00cc99 !important;
    }

    ${selector} caption {
      outline: 1px solid #37ffc4 !important;
    }

    ${selector} thead {
      outline: 1px solid #98daca !important;
    }

    ${selector} tbody {
      outline: 1px solid #64a7a0 !important;
    }

    ${selector} tfoot {
      outline: 1px solid #22746b !important;
    }

    ${selector} tr {
      outline: 1px solid #86c0b2 !important;
    }

    ${selector} th {
      outline: 1px solid #a1e7d6 !important;
    }

    ${selector} td {
      outline: 1px solid #3f5a54 !important;
    }

    ${selector} col {
      outline: 1px solid #6c9a8f !important;
    }

    ${selector} colgroup {
      outline: 1px solid #6c9a9d !important;
    }

    ${selector} button {
      outline: 1px solid #da8301 !important;
    }

    ${selector} datalist {
      outline: 1px solid #c06000 !important;
    }

    ${selector} fieldset {
      outline: 1px solid #d95100 !important;
    }

    ${selector} form {
      outline: 1px solid #d23600 !important;
    }

    ${selector} input {
      outline: 1px solid #fca600 !important;
    }

    ${selector} keygen {
      outline: 1px solid #b31e00 !important;
    }

    ${selector} label {
      outline: 1px solid #ee8900 !important;
    }

    ${selector} legend {
      outline: 1px solid #de6d00 !important;
    }

    ${selector} meter {
      outline: 1px solid #e8630c !important;
    }

    ${selector} optgroup {
      outline: 1px solid #b33600 !important;
    }

    ${selector} option {
      outline: 1px solid #ff8a00 !important;
    }

    ${selector} output {
      outline: 1px solid #ff9619 !important;
    }

    ${selector} progress {
      outline: 1px solid #e57c00 !important;
    }

    ${selector} select {
      outline: 1px solid #e26e0f !important;
    }

    ${selector} textarea {
      outline: 1px solid #cc5400 !important;
    }

    ${selector} details {
      outline: 1px solid #33848f !important;
    }

    ${selector} summary {
      outline: 1px solid #60a1a6 !important;
    }

    ${selector} command {
      outline: 1px solid #438da1 !important;
    }

    ${selector} menu {
      outline: 1px solid #449da6 !important;
    }

    ${selector} del {
      outline: 1px solid #bf0000 !important;
    }

    ${selector} ins {
      outline: 1px solid #400000 !important;
    }

    ${selector} img {
      outline: 1px solid #22746b !important;
    }

    ${selector} iframe {
      outline: 1px solid #64a7a0 !important;
    }

    ${selector} embed {
      outline: 1px solid #98daca !important;
    }

    ${selector} object {
      outline: 1px solid #00cc99 !important;
    }

    ${selector} param {
      outline: 1px solid #37ffc4 !important;
    }

    ${selector} video {
      outline: 1px solid #6ee866 !important;
    }

    ${selector} audio {
      outline: 1px solid #027353 !important;
    }

    ${selector} source {
      outline: 1px solid #012426 !important;
    }

    ${selector} canvas {
      outline: 1px solid #a2f570 !important;
    }

    ${selector} track {
      outline: 1px solid #59a600 !important;
    }

    ${selector} map {
      outline: 1px solid #7be500 !important;
    }

    ${selector} area {
      outline: 1px solid #305900 !important;
    }

    ${selector} a {
      outline: 1px solid #ff62ab !important;
    }

    ${selector} em {
      outline: 1px solid #800b41 !important;
    }

    ${selector} strong {
      outline: 1px solid #ff1583 !important;
    }

    ${selector} i {
      outline: 1px solid #803156 !important;
    }

    ${selector} b {
      outline: 1px solid #cc1169 !important;
    }

    ${selector} u {
      outline: 1px solid #ff0430 !important;
    }

    ${selector} s {
      outline: 1px solid #f805e3 !important;
    }

    ${selector} small {
      outline: 1px solid #d107b2 !important;
    }

    ${selector} abbr {
      outline: 1px solid #4a0263 !important;
    }

    ${selector} q {
      outline: 1px solid #240018 !important;
    }

    ${selector} cite {
      outline: 1px solid #64003c !important;
    }

    ${selector} dfn {
      outline: 1px solid #b4005a !important;
    }

    ${selector} sub {
      outline: 1px solid #dba0c8 !important;
    }

    ${selector} sup {
      outline: 1px solid #cc0256 !important;
    }

    ${selector} time {
      outline: 1px solid #d6606d !important;
    }

    ${selector} code {
      outline: 1px solid #e04251 !important;
    }

    ${selector} kbd {
      outline: 1px solid #5e001f !important;
    }

    ${selector} samp {
      outline: 1px solid #9c0033 !important;
    }

    ${selector} var {
      outline: 1px solid #d90047 !important;
    }

    ${selector} mark {
      outline: 1px solid #ff0053 !important;
    }

    ${selector} bdi {
      outline: 1px solid #bf3668 !important;
    }

    ${selector} bdo {
      outline: 1px solid #6f1400 !important;
    }

    ${selector} ruby {
      outline: 1px solid #ff7b93 !important;
    }

    ${selector} rt {
      outline: 1px solid #ff2f54 !important;
    }

    ${selector} rp {
      outline: 1px solid #803e49 !important;
    }

    ${selector} span {
      outline: 1px solid #cc2643 !important;
    }

    ${selector} br {
      outline: 1px solid #db687d !important;
    }

    ${selector} wbr {
      outline: 1px solid #db175b !important;
    }`;
}

// src/outline/withOutline.ts
var withOutline = (StoryFn, context) => {
  let globals = context.globals || {}, isActive = [!0, "true"].includes(globals[PARAM_KEY4]), isInDocs = context.viewMode === "docs", outlineStyles = useMemo(() => outlineCSS(isInDocs ? '[data-story-block="true"]' : ".sb-show-main"), [context]);
  return useEffect3(() => {
    let selectorId = isInDocs ? `addon-outline-docs-${context.id}` : "addon-outline";
    return isActive ? addOutlineStyles(selectorId, outlineStyles) : clearStyles2(selectorId), () => {
      clearStyles2(selectorId);
    };
  }, [isActive, outlineStyles, context]), StoryFn();
};

// src/outline/preview.ts
var decorators3 = globalThis.FEATURES?.outline ? [withOutline] : [], initialGlobals3 = {
  [PARAM_KEY4]: !1
}, preview_default6 = () => definePreviewAddon6({ decorators: decorators3, initialGlobals: initialGlobals3 });

// src/test/preview.ts
import { definePreviewAddon as definePreviewAddon7 } from "storybook/internal/csf";
import { instrument as instrument2 } from "storybook/internal/instrumenter";
import {
  clearAllMocks,
  fn,
  isMockFunction,
  resetAllMocks,
  restoreAllMocks,
  uninstrumentedUserEvent,
  within
} from "storybook/test";
var resetAllMocksLoader = ({ parameters: parameters2 }) => {
  parameters2?.test?.mockReset === !0 ? resetAllMocks() : parameters2?.test?.clearMocks === !0 ? clearAllMocks() : parameters2?.test?.restoreMocks !== !1 && restoreAllMocks();
}, traverseArgs = (value, depth = 0, key) => {
  if (depth > 5 || value == null)
    return value;
  if (isMockFunction(value))
    return key && value.mockName(key), value;
  if (typeof value == "function" && "isAction" in value && value.isAction && !("implicit" in value && value.implicit)) {
    let mock = fn(value);
    return key && mock.mockName(key), mock;
  }
  if (Array.isArray(value)) {
    depth++;
    for (let i = 0; i < value.length; i++)
      Object.getOwnPropertyDescriptor(value, i)?.writable && (value[i] = traverseArgs(value[i], depth));
    return value;
  }
  if (typeof value == "object" && value.constructor === Object) {
    depth++;
    for (let [k, v] of Object.entries(value))
      Object.getOwnPropertyDescriptor(value, k)?.writable && (value[k] = traverseArgs(v, depth, k));
    return value;
  }
  return value;
}, nameSpiesAndWrapActionsInSpies = ({ initialArgs }) => {
  traverseArgs(initialArgs);
}, patchedFocus = !1, enhanceContext = async (context) => {
  globalThis.HTMLElement && context.canvasElement instanceof globalThis.HTMLElement && (context.canvas = within(context.canvasElement));
  let clipboard = globalThis.window?.navigator?.clipboard;
  if (clipboard && (context.userEvent = instrument2(
    { userEvent: uninstrumentedUserEvent.setup() },
    {
      intercept: !0,
      getKeys: (obj) => Object.keys(obj).filter((key) => key !== "eventWrapper")
    }
  ).userEvent, Object.defineProperty(globalThis.window.navigator, "clipboard", {
    get: () => clipboard,
    configurable: !0
  }), !patchedFocus)) {
    let originalFocus = HTMLElement.prototype.focus, currentFocus = HTMLElement.prototype.focus, focusingElements = /* @__PURE__ */ new Set();
    Object.defineProperties(HTMLElement.prototype, {
      focus: {
        configurable: !0,
        set: (newFocus) => {
          currentFocus = newFocus;
        },
        get() {
          return focusingElements.has(this) ? originalFocus : (focusingElements.add(this), setTimeout(() => focusingElements.delete(this), 0), currentFocus);
        }
      }
    }), patchedFocus = !0;
  }
}, preview_default7 = () => definePreviewAddon7({
  loaders: [resetAllMocksLoader, nameSpiesAndWrapActionsInSpies, enhanceContext]
});

// src/viewport/preview.ts
import { definePreviewAddon as definePreviewAddon8 } from "storybook/internal/csf";
var initialGlobals4 = {
  [PARAM_KEY]: { value: void 0, isRotated: !1 }
}, preview_default8 = () => definePreviewAddon8({
  initialGlobals: initialGlobals4
});

// src/csf/core-annotations.ts
function getCoreAnnotations() {
  return [
    // @ts-expect-error CJS fallback
    (preview_default5.default ?? preview_default5)(),
    // @ts-expect-error CJS fallback
    (preview_default2.default ?? preview_default2)(),
    // @ts-expect-error CJS fallback
    (preview_default4.default ?? preview_default4)(),
    // @ts-expect-error CJS fallback
    (preview_default6.default ?? preview_default6)(),
    // @ts-expect-error CJS fallback
    (preview_default8.default ?? preview_default8)(),
    // @ts-expect-error CJS fallback
    (preview_default.default ?? preview_default)(),
    // @ts-expect-error CJS fallback
    (preview_default3.default ?? preview_default3)(),
    // @ts-expect-error CJS fallback
    (preview_default7.default ?? preview_default7)()
  ];
}

// src/csf/csf-factories.ts
function definePreview(input) {
  let composed, preview = {
    _tag: "Preview",
    input,
    get composed() {
      if (composed)
        return composed;
      let { addons: addons2, ...rest } = input;
      return composed = normalizeProjectAnnotations(
        composeConfigs([...getCoreAnnotations(), ...addons2 ?? [], rest])
      ), composed;
    },
    meta(meta) {
      return defineMeta(meta, this);
    }
  };
  return globalThis.globalProjectAnnotations = preview.composed, preview;
}
function definePreviewAddon9(preview) {
  return preview;
}
function isPreview(input) {
  return input != null && typeof input == "object" && "_tag" in input && input?._tag === "Preview";
}
function isMeta(input) {
  return input != null && typeof input == "object" && "_tag" in input && input?._tag === "Meta";
}
function defineMeta(input, preview) {
  return {
    _tag: "Meta",
    input,
    preview,
    // @ts-expect-error hard
    story(story = {}) {
      return defineStory(typeof story == "function" ? { render: story } : story, this);
    }
  };
}
function isStory(input) {
  return input != null && typeof input == "object" && "_tag" in input && input?._tag === "Story";
}
function defineStory(input, meta) {
  let composed, compose = () => (composed || (composed = composeStory(
    input,
    meta.input,
    void 0,
    meta.preview.composed
  )), composed), __children = [];
  return {
    _tag: "Story",
    input,
    meta,
    // @ts-expect-error this is a private property used only once in renderers/react/src/preview
    __compose: compose,
    __children,
    get composed() {
      let composed2 = compose(), { args, argTypes, parameters: parameters2, id, tags, globals, storyName: name } = composed2;
      return { args, argTypes, parameters: parameters2, id, tags, name, globals };
    },
    get play() {
      return input.play ?? meta.input?.play ?? (async () => {
      });
    },
    async run(context) {
      await compose().run(context);
    },
    test(name, overridesOrTestFn, testFn) {
      let annotations = typeof overridesOrTestFn != "function" ? overridesOrTestFn : {}, testFunction = typeof overridesOrTestFn != "function" ? testFn : overridesOrTestFn, play = mountDestructured(this.play) || mountDestructured(testFunction) ? (
        // mount needs to be explicitly destructured
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async ({ mount, context }) => {
          await this.play?.(context), await testFunction(context);
        }
      ) : async (context) => {
        await this.play?.(context), await testFunction(context);
      }, test = this.extend({
        ...annotations,
        name,
        tags: ["test-fn", "!autodocs", ...annotations.tags ?? []],
        play
      });
      return __children.push(test), test;
    },
    extend(input2) {
      return defineStory(
        {
          ...this.input,
          ...input2,
          args: { ...this.input.args || {}, ...input2.args },
          argTypes: combineParameters(this.input.argTypes, input2.argTypes),
          afterEach: [
            ...normalizeArrays(this.input?.afterEach ?? []),
            ...normalizeArrays(input2.afterEach ?? [])
          ],
          beforeEach: [
            ...normalizeArrays(this.input?.beforeEach ?? []),
            ...normalizeArrays(input2.beforeEach ?? [])
          ],
          decorators: [
            ...normalizeArrays(this.input?.decorators ?? []),
            ...normalizeArrays(input2.decorators ?? [])
          ],
          globals: { ...this.input.globals, ...input2.globals },
          loaders: [
            ...normalizeArrays(this.input?.loaders ?? []),
            ...normalizeArrays(input2.loaders ?? [])
          ],
          parameters: combineParameters(this.input.parameters, input2.parameters),
          tags: combineTags(...this.input.tags ?? [], ...input2.tags ?? [])
        },
        this.meta
      );
    }
  };
}
function getStoryChildren(story) {
  return "__children" in story ? story.__children : [];
}

// src/csf/index.ts
var sanitize = (string) => string.toLowerCase().replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "-").replace(/-+/g, "-").replace(/^-+/, "").replace(/-+$/, ""), sanitizeSafe = (string, part) => {
  let sanitized = sanitize(string);
  if (sanitized === "")
    throw new Error(`Invalid ${part} '${string}', must include alphanumeric characters`);
  return sanitized;
}, toId = (kind, name) => `${sanitizeSafe(kind, "kind")}${name ? `--${sanitizeSafe(name, "name")}` : ""}`, toTestId = (parentId, testName) => `${parentId}:${sanitizeSafe(testName, "test")}`, storyNameFromExport = (key) => toStartCaseStr(key);
function matches(storyKey, arrayOrRegex) {
  return Array.isArray(arrayOrRegex) ? arrayOrRegex.includes(storyKey) : storyKey.match(arrayOrRegex);
}
function isExportStory(key, { includeStories, excludeStories }) {
  return (
    // https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs
    key !== "__esModule" && (!includeStories || matches(key, includeStories)) && (!excludeStories || !matches(key, excludeStories))
  );
}
var parseKind = (kind, { rootSeparator, groupSeparator }) => {
  let [root, remainder] = kind.split(rootSeparator, 2), groups = (remainder || kind).split(groupSeparator).filter((i) => !!i);
  return {
    root: remainder ? root : null,
    groups
  };
}, combineTags2 = (...tags) => {
  let result = tags.reduce((acc, tag) => (tag.startsWith("!") ? acc.delete(tag.slice(1)) : acc.add(tag), acc), /* @__PURE__ */ new Set());
  return Array.from(result);
};
export {
  combineTags2 as combineTags,
  definePreview,
  definePreviewAddon9 as definePreviewAddon,
  getCoreAnnotations,
  getStoryChildren,
  includeConditionalArg,
  isExportStory,
  isMeta,
  isPreview,
  isStory,
  parseKind,
  sanitize,
  storyNameFromExport,
  toId,
  toTestId
};
