(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
var b = {
  reset: [0, 0],
  bold: [1, 22, "\x1B[22m\x1B[1m"],
  dim: [2, 22, "\x1B[22m\x1B[2m"],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
  blackBright: [90, 39],
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  whiteBright: [97, 39],
  bgBlackBright: [100, 49],
  bgRedBright: [101, 49],
  bgGreenBright: [102, 49],
  bgYellowBright: [103, 49],
  bgBlueBright: [104, 49],
  bgMagentaBright: [105, 49],
  bgCyanBright: [106, 49],
  bgWhiteBright: [107, 49]
};
function i(e) {
  return String(e);
}
i.open = "";
i.close = "";
function B() {
  let e = typeof process != "undefined" ? process : void 0, r = (e == null ? void 0 : e.env) || {}, a = r.FORCE_TTY !== "false", l = (e == null ? void 0 : e.argv) || [];
  return !("NO_COLOR" in r || l.includes("--no-color")) && ("FORCE_COLOR" in r || l.includes("--color") || (e == null ? void 0 : e.platform) === "win32" || a && r.TERM !== "dumb" || "CI" in r) || typeof window != "undefined" && !!window.chrome;
}
function C({ force: e } = {}) {
  let r = e || B(), a = (t, o, u, n) => {
    let g = "", s = 0;
    do
      g += t.substring(s, n) + u, s = n + o.length, n = t.indexOf(o, s);
    while (~n);
    return g + t.substring(s);
  }, l = (t, o, u = t) => {
    let n = (g) => {
      let s = String(g), h = s.indexOf(o, t.length);
      return ~h ? t + a(s, o, u, h) + o : t + s + o;
    };
    return n.open = t, n.close = o, n;
  }, c = {
    isColorSupported: r
  }, f = (t) => `\x1B[${t}m`;
  for (let t in b) {
    let o = b[t];
    c[t] = r ? l(
      f(o[0]),
      f(o[1]),
      o[2]
    ) : i;
  }
  return c;
}
var d = C();
var y = d;
function _mergeNamespaces$1(n, m) {
  m.forEach(function(e) {
    e && typeof e !== "string" && !Array.isArray(e) && Object.keys(e).forEach(function(k) {
      if (k !== "default" && !(k in n)) {
        var d2 = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d2.get ? d2 : {
          enumerable: true,
          get: function() {
            return e[k];
          }
        });
      }
    });
  });
  return Object.freeze(n);
}
function getKeysOfEnumerableProperties(object, compareKeys) {
  const rawKeys = Object.keys(object);
  const keys = compareKeys === null ? rawKeys : rawKeys.sort(compareKeys);
  if (Object.getOwnPropertySymbols) {
    for (const symbol of Object.getOwnPropertySymbols(object)) {
      if (Object.getOwnPropertyDescriptor(object, symbol).enumerable) {
        keys.push(symbol);
      }
    }
  }
  return keys;
}
function printIteratorEntries(iterator, config, indentation, depth, refs, printer2, separator = ": ") {
  let result = "";
  let width = 0;
  let current = iterator.next();
  if (!current.done) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    while (!current.done) {
      result += indentationNext;
      if (width++ === config.maxWidth) {
        result += "…";
        break;
      }
      const name = printer2(current.value[0], config, indentationNext, depth, refs);
      const value = printer2(current.value[1], config, indentationNext, depth, refs);
      result += name + separator + value;
      current = iterator.next();
      if (!current.done) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printIteratorValues(iterator, config, indentation, depth, refs, printer2) {
  let result = "";
  let width = 0;
  let current = iterator.next();
  if (!current.done) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    while (!current.done) {
      result += indentationNext;
      if (width++ === config.maxWidth) {
        result += "…";
        break;
      }
      result += printer2(current.value, config, indentationNext, depth, refs);
      current = iterator.next();
      if (!current.done) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printListItems(list, config, indentation, depth, refs, printer2) {
  let result = "";
  list = list instanceof ArrayBuffer ? new DataView(list) : list;
  const isDataView = (l) => l instanceof DataView;
  const length = isDataView(list) ? list.byteLength : list.length;
  if (length > 0) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    for (let i2 = 0; i2 < length; i2++) {
      result += indentationNext;
      if (i2 === config.maxWidth) {
        result += "…";
        break;
      }
      if (isDataView(list) || i2 in list) {
        result += printer2(isDataView(list) ? list.getInt8(i2) : list[i2], config, indentationNext, depth, refs);
      }
      if (i2 < length - 1) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printObjectProperties(val, config, indentation, depth, refs, printer2) {
  let result = "";
  const keys = getKeysOfEnumerableProperties(val, config.compareKeys);
  if (keys.length > 0) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    for (let i2 = 0; i2 < keys.length; i2++) {
      const key = keys[i2];
      const name = printer2(key, config, indentationNext, depth, refs);
      const value = printer2(val[key], config, indentationNext, depth, refs);
      result += `${indentationNext + name}: ${value}`;
      if (i2 < keys.length - 1) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
const asymmetricMatcher = typeof Symbol === "function" && Symbol.for ? Symbol.for("jest.asymmetricMatcher") : 1267621;
const SPACE$2 = " ";
const serialize$5 = (val, config, indentation, depth, refs, printer2) => {
  const stringedValue = val.toString();
  if (stringedValue === "ArrayContaining" || stringedValue === "ArrayNotContaining") {
    if (++depth > config.maxDepth) {
      return `[${stringedValue}]`;
    }
    return `${stringedValue + SPACE$2}[${printListItems(val.sample, config, indentation, depth, refs, printer2)}]`;
  }
  if (stringedValue === "ObjectContaining" || stringedValue === "ObjectNotContaining") {
    if (++depth > config.maxDepth) {
      return `[${stringedValue}]`;
    }
    return `${stringedValue + SPACE$2}{${printObjectProperties(val.sample, config, indentation, depth, refs, printer2)}}`;
  }
  if (stringedValue === "StringMatching" || stringedValue === "StringNotMatching") {
    return stringedValue + SPACE$2 + printer2(val.sample, config, indentation, depth, refs);
  }
  if (stringedValue === "StringContaining" || stringedValue === "StringNotContaining") {
    return stringedValue + SPACE$2 + printer2(val.sample, config, indentation, depth, refs);
  }
  if (typeof val.toAsymmetricMatcher !== "function") {
    throw new TypeError(`Asymmetric matcher ${val.constructor.name} does not implement toAsymmetricMatcher()`);
  }
  return val.toAsymmetricMatcher();
};
const test$5 = (val) => val && val.$$typeof === asymmetricMatcher;
const plugin$5 = {
  serialize: serialize$5,
  test: test$5
};
const SPACE$1 = " ";
const OBJECT_NAMES = /* @__PURE__ */ new Set(["DOMStringMap", "NamedNodeMap"]);
const ARRAY_REGEXP = /^(?:HTML\w*Collection|NodeList)$/;
function testName(name) {
  return OBJECT_NAMES.has(name) || ARRAY_REGEXP.test(name);
}
const test$4 = (val) => val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
function isNamedNodeMap(collection) {
  return collection.constructor.name === "NamedNodeMap";
}
const serialize$4 = (collection, config, indentation, depth, refs, printer2) => {
  const name = collection.constructor.name;
  if (++depth > config.maxDepth) {
    return `[${name}]`;
  }
  return (config.min ? "" : name + SPACE$1) + (OBJECT_NAMES.has(name) ? `{${printObjectProperties(isNamedNodeMap(collection) ? [...collection].reduce((props, attribute) => {
    props[attribute.name] = attribute.value;
    return props;
  }, {}) : { ...collection }, config, indentation, depth, refs, printer2)}}` : `[${printListItems([...collection], config, indentation, depth, refs, printer2)}]`);
};
const plugin$4 = {
  serialize: serialize$4,
  test: test$4
};
function escapeHTML(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function printProps(keys, props, config, indentation, depth, refs, printer2) {
  const indentationNext = indentation + config.indent;
  const colors = config.colors;
  return keys.map((key) => {
    const value = props[key];
    if (typeof value === "string" && value[0] === "_" && value.startsWith("__vitest_") && value.match(/__vitest_\d+__/)) {
      return "";
    }
    let printed = printer2(value, config, indentationNext, depth, refs);
    if (typeof value !== "string") {
      if (printed.includes("\n")) {
        printed = config.spacingOuter + indentationNext + printed + config.spacingOuter + indentation;
      }
      printed = `{${printed}}`;
    }
    return `${config.spacingInner + indentation + colors.prop.open + key + colors.prop.close}=${colors.value.open}${printed}${colors.value.close}`;
  }).join("");
}
function printChildren(children, config, indentation, depth, refs, printer2) {
  return children.map((child) => config.spacingOuter + indentation + (typeof child === "string" ? printText(child, config) : printer2(child, config, indentation, depth, refs))).join("");
}
function printShadowRoot(children, config, indentation, depth, refs, printer2) {
  if (config.printShadowRoot === false) {
    return "";
  }
  return [`${config.spacingOuter + indentation}#shadow-root`, printChildren(children, config, indentation + config.indent, depth, refs, printer2)].join("");
}
function printText(text, config) {
  const contentColor = config.colors.content;
  return contentColor.open + escapeHTML(text) + contentColor.close;
}
function printComment(comment, config) {
  const commentColor = config.colors.comment;
  return `${commentColor.open}<!--${escapeHTML(comment)}-->${commentColor.close}`;
}
function printElement(type, printedProps, printedChildren, config, indentation) {
  const tagColor = config.colors.tag;
  return `${tagColor.open}<${type}${printedProps && tagColor.close + printedProps + config.spacingOuter + indentation + tagColor.open}${printedChildren ? `>${tagColor.close}${printedChildren}${config.spacingOuter}${indentation}${tagColor.open}</${type}` : `${printedProps && !config.min ? "" : " "}/`}>${tagColor.close}`;
}
function printElementAsLeaf(type, config) {
  const tagColor = config.colors.tag;
  return `${tagColor.open}<${type}${tagColor.close} …${tagColor.open} />${tagColor.close}`;
}
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const FRAGMENT_NODE = 11;
const ELEMENT_REGEXP = /^(?:(?:HTML|SVG)\w*)?Element$/;
function testHasAttribute(val) {
  try {
    return typeof val.hasAttribute === "function" && val.hasAttribute("is");
  } catch {
    return false;
  }
}
function testNode(val) {
  const constructorName = val.constructor.name;
  const { nodeType, tagName } = val;
  const isCustomElement = typeof tagName === "string" && tagName.includes("-") || testHasAttribute(val);
  return nodeType === ELEMENT_NODE && (ELEMENT_REGEXP.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE && constructorName === "Text" || nodeType === COMMENT_NODE && constructorName === "Comment" || nodeType === FRAGMENT_NODE && constructorName === "DocumentFragment";
}
const test$3 = (val) => {
  var _a;
  return ((_a = val == null ? void 0 : val.constructor) == null ? void 0 : _a.name) && testNode(val);
};
function nodeIsText(node) {
  return node.nodeType === TEXT_NODE;
}
function nodeIsComment(node) {
  return node.nodeType === COMMENT_NODE;
}
function nodeIsFragment(node) {
  return node.nodeType === FRAGMENT_NODE;
}
function filterChildren(children, filterNode) {
  let filtered = children.filter((node) => {
    if (node.nodeType === TEXT_NODE) {
      const text = node.data || "";
      return text.trim().length > 0;
    }
    return true;
  });
  if (filterNode) {
    filtered = filtered.filter(filterNode);
  }
  return filtered;
}
function serializeDOM(node, config, indentation, depth, refs, printer2, filterNode) {
  if (nodeIsText(node)) {
    return printText(node.data, config);
  }
  if (nodeIsComment(node)) {
    return printComment(node.data, config);
  }
  const type = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();
  if (++depth > config.maxDepth) {
    return printElementAsLeaf(type, config);
  }
  const children = Array.prototype.slice.call(node.childNodes || node.children);
  const shadowChildren = nodeIsFragment(node) || !node.shadowRoot ? [] : Array.prototype.slice.call(node.shadowRoot.children);
  const resolvedChildren = filterNode ? filterChildren(children, filterNode) : children;
  const resolvedShadowChildren = filterNode ? filterChildren(shadowChildren, filterNode) : shadowChildren;
  return printElement(type, printProps(nodeIsFragment(node) ? [] : Array.from(node.attributes, (attr) => attr.name).sort(), nodeIsFragment(node) ? {} : [...node.attributes].reduce((props, attribute) => {
    props[attribute.name] = attribute.value;
    return props;
  }, {}), config, indentation + config.indent, depth, refs, printer2), (resolvedShadowChildren.length > 0 ? printShadowRoot(resolvedShadowChildren, config, indentation + config.indent, depth, refs, printer2) : "") + printChildren(resolvedChildren, config, indentation + config.indent, depth, refs, printer2), config, indentation);
}
const serialize$3 = (node, config, indentation, depth, refs, printer2) => serializeDOM(node, config, indentation, depth, refs, printer2);
function createDOMElementFilter(filterNode) {
  return {
    test: test$3,
    serialize: (node, config, indentation, depth, refs, printer2) => serializeDOM(node, config, indentation, depth, refs, printer2, filterNode)
  };
}
const plugin$3 = {
  serialize: serialize$3,
  test: test$3
};
const IS_ITERABLE_SENTINEL = "@@__IMMUTABLE_ITERABLE__@@";
const IS_LIST_SENTINEL = "@@__IMMUTABLE_LIST__@@";
const IS_KEYED_SENTINEL = "@@__IMMUTABLE_KEYED__@@";
const IS_MAP_SENTINEL = "@@__IMMUTABLE_MAP__@@";
const IS_ORDERED_SENTINEL = "@@__IMMUTABLE_ORDERED__@@";
const IS_RECORD_SENTINEL = "@@__IMMUTABLE_RECORD__@@";
const IS_SEQ_SENTINEL = "@@__IMMUTABLE_SEQ__@@";
const IS_SET_SENTINEL = "@@__IMMUTABLE_SET__@@";
const IS_STACK_SENTINEL = "@@__IMMUTABLE_STACK__@@";
const getImmutableName = (name) => `Immutable.${name}`;
const printAsLeaf = (name) => `[${name}]`;
const SPACE = " ";
const LAZY = "…";
function printImmutableEntries(val, config, indentation, depth, refs, printer2, type) {
  return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}{${printIteratorEntries(val.entries(), config, indentation, depth, refs, printer2)}}`;
}
function getRecordEntries(val) {
  let i2 = 0;
  return { next() {
    if (i2 < val._keys.length) {
      const key = val._keys[i2++];
      return {
        done: false,
        value: [key, val.get(key)]
      };
    }
    return {
      done: true,
      value: void 0
    };
  } };
}
function printImmutableRecord(val, config, indentation, depth, refs, printer2) {
  const name = getImmutableName(val._name || "Record");
  return ++depth > config.maxDepth ? printAsLeaf(name) : `${name + SPACE}{${printIteratorEntries(getRecordEntries(val), config, indentation, depth, refs, printer2)}}`;
}
function printImmutableSeq(val, config, indentation, depth, refs, printer2) {
  const name = getImmutableName("Seq");
  if (++depth > config.maxDepth) {
    return printAsLeaf(name);
  }
  if (val[IS_KEYED_SENTINEL]) {
    return `${name + SPACE}{${val._iter || val._object ? printIteratorEntries(val.entries(), config, indentation, depth, refs, printer2) : LAZY}}`;
  }
  return `${name + SPACE}[${val._iter || val._array || val._collection || val._iterable ? printIteratorValues(val.values(), config, indentation, depth, refs, printer2) : LAZY}]`;
}
function printImmutableValues(val, config, indentation, depth, refs, printer2, type) {
  return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}[${printIteratorValues(val.values(), config, indentation, depth, refs, printer2)}]`;
}
const serialize$2 = (val, config, indentation, depth, refs, printer2) => {
  if (val[IS_MAP_SENTINEL]) {
    return printImmutableEntries(val, config, indentation, depth, refs, printer2, val[IS_ORDERED_SENTINEL] ? "OrderedMap" : "Map");
  }
  if (val[IS_LIST_SENTINEL]) {
    return printImmutableValues(val, config, indentation, depth, refs, printer2, "List");
  }
  if (val[IS_SET_SENTINEL]) {
    return printImmutableValues(val, config, indentation, depth, refs, printer2, val[IS_ORDERED_SENTINEL] ? "OrderedSet" : "Set");
  }
  if (val[IS_STACK_SENTINEL]) {
    return printImmutableValues(val, config, indentation, depth, refs, printer2, "Stack");
  }
  if (val[IS_SEQ_SENTINEL]) {
    return printImmutableSeq(val, config, indentation, depth, refs, printer2);
  }
  return printImmutableRecord(val, config, indentation, depth, refs, printer2);
};
const test$2 = (val) => val && (val[IS_ITERABLE_SENTINEL] === true || val[IS_RECORD_SENTINEL] === true);
const plugin$2 = {
  serialize: serialize$2,
  test: test$2
};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var reactIs$1 = { exports: {} };
var reactIs_production = {};
/**
 * @license React
 * react-is.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactIs_production;
function requireReactIs_production() {
  if (hasRequiredReactIs_production) return reactIs_production;
  hasRequiredReactIs_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
  function typeOf(object) {
    if ("object" === typeof object && null !== object) {
      var $$typeof = object.$$typeof;
      switch ($$typeof) {
        case REACT_ELEMENT_TYPE:
          switch (object = object.type, object) {
            case REACT_FRAGMENT_TYPE:
            case REACT_PROFILER_TYPE:
            case REACT_STRICT_MODE_TYPE:
            case REACT_SUSPENSE_TYPE:
            case REACT_SUSPENSE_LIST_TYPE:
            case REACT_VIEW_TRANSITION_TYPE:
              return object;
            default:
              switch (object = object && object.$$typeof, object) {
                case REACT_CONTEXT_TYPE:
                case REACT_FORWARD_REF_TYPE:
                case REACT_LAZY_TYPE:
                case REACT_MEMO_TYPE:
                  return object;
                case REACT_CONSUMER_TYPE:
                  return object;
                default:
                  return $$typeof;
              }
          }
        case REACT_PORTAL_TYPE:
          return $$typeof;
      }
    }
  }
  reactIs_production.ContextConsumer = REACT_CONSUMER_TYPE;
  reactIs_production.ContextProvider = REACT_CONTEXT_TYPE;
  reactIs_production.Element = REACT_ELEMENT_TYPE;
  reactIs_production.ForwardRef = REACT_FORWARD_REF_TYPE;
  reactIs_production.Fragment = REACT_FRAGMENT_TYPE;
  reactIs_production.Lazy = REACT_LAZY_TYPE;
  reactIs_production.Memo = REACT_MEMO_TYPE;
  reactIs_production.Portal = REACT_PORTAL_TYPE;
  reactIs_production.Profiler = REACT_PROFILER_TYPE;
  reactIs_production.StrictMode = REACT_STRICT_MODE_TYPE;
  reactIs_production.Suspense = REACT_SUSPENSE_TYPE;
  reactIs_production.SuspenseList = REACT_SUSPENSE_LIST_TYPE;
  reactIs_production.isContextConsumer = function(object) {
    return typeOf(object) === REACT_CONSUMER_TYPE;
  };
  reactIs_production.isContextProvider = function(object) {
    return typeOf(object) === REACT_CONTEXT_TYPE;
  };
  reactIs_production.isElement = function(object) {
    return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
  };
  reactIs_production.isForwardRef = function(object) {
    return typeOf(object) === REACT_FORWARD_REF_TYPE;
  };
  reactIs_production.isFragment = function(object) {
    return typeOf(object) === REACT_FRAGMENT_TYPE;
  };
  reactIs_production.isLazy = function(object) {
    return typeOf(object) === REACT_LAZY_TYPE;
  };
  reactIs_production.isMemo = function(object) {
    return typeOf(object) === REACT_MEMO_TYPE;
  };
  reactIs_production.isPortal = function(object) {
    return typeOf(object) === REACT_PORTAL_TYPE;
  };
  reactIs_production.isProfiler = function(object) {
    return typeOf(object) === REACT_PROFILER_TYPE;
  };
  reactIs_production.isStrictMode = function(object) {
    return typeOf(object) === REACT_STRICT_MODE_TYPE;
  };
  reactIs_production.isSuspense = function(object) {
    return typeOf(object) === REACT_SUSPENSE_TYPE;
  };
  reactIs_production.isSuspenseList = function(object) {
    return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
  };
  reactIs_production.isValidElementType = function(type) {
    return "string" === typeof type || "function" === typeof type || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || "object" === typeof type && null !== type && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE || void 0 !== type.getModuleId) ? true : false;
  };
  reactIs_production.typeOf = typeOf;
  return reactIs_production;
}
var hasRequiredReactIs$1;
function requireReactIs$1() {
  if (hasRequiredReactIs$1) return reactIs$1.exports;
  hasRequiredReactIs$1 = 1;
  {
    reactIs$1.exports = requireReactIs_production();
  }
  return reactIs$1.exports;
}
var reactIsExports$1 = requireReactIs$1();
var index$1 = /* @__PURE__ */ getDefaultExportFromCjs(reactIsExports$1);
var ReactIs19 = /* @__PURE__ */ _mergeNamespaces$1({
  __proto__: null,
  default: index$1
}, [reactIsExports$1]);
var reactIs = { exports: {} };
var reactIs_production_min = {};
/**
 * @license React
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactIs_production_min;
function requireReactIs_production_min() {
  if (hasRequiredReactIs_production_min) return reactIs_production_min;
  hasRequiredReactIs_production_min = 1;
  var b2 = Symbol.for("react.element"), c = Symbol.for("react.portal"), d2 = Symbol.for("react.fragment"), e = Symbol.for("react.strict_mode"), f = Symbol.for("react.profiler"), g = Symbol.for("react.provider"), h = Symbol.for("react.context"), k = Symbol.for("react.server_context"), l = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), n = Symbol.for("react.suspense_list"), p = Symbol.for("react.memo"), q = Symbol.for("react.lazy"), t = Symbol.for("react.offscreen"), u;
  u = Symbol.for("react.module.reference");
  function v(a) {
    if ("object" === typeof a && null !== a) {
      var r = a.$$typeof;
      switch (r) {
        case b2:
          switch (a = a.type, a) {
            case d2:
            case f:
            case e:
            case m:
            case n:
              return a;
            default:
              switch (a = a && a.$$typeof, a) {
                case k:
                case h:
                case l:
                case q:
                case p:
                case g:
                  return a;
                default:
                  return r;
              }
          }
        case c:
          return r;
      }
    }
  }
  reactIs_production_min.ContextConsumer = h;
  reactIs_production_min.ContextProvider = g;
  reactIs_production_min.Element = b2;
  reactIs_production_min.ForwardRef = l;
  reactIs_production_min.Fragment = d2;
  reactIs_production_min.Lazy = q;
  reactIs_production_min.Memo = p;
  reactIs_production_min.Portal = c;
  reactIs_production_min.Profiler = f;
  reactIs_production_min.StrictMode = e;
  reactIs_production_min.Suspense = m;
  reactIs_production_min.SuspenseList = n;
  reactIs_production_min.isAsyncMode = function() {
    return false;
  };
  reactIs_production_min.isConcurrentMode = function() {
    return false;
  };
  reactIs_production_min.isContextConsumer = function(a) {
    return v(a) === h;
  };
  reactIs_production_min.isContextProvider = function(a) {
    return v(a) === g;
  };
  reactIs_production_min.isElement = function(a) {
    return "object" === typeof a && null !== a && a.$$typeof === b2;
  };
  reactIs_production_min.isForwardRef = function(a) {
    return v(a) === l;
  };
  reactIs_production_min.isFragment = function(a) {
    return v(a) === d2;
  };
  reactIs_production_min.isLazy = function(a) {
    return v(a) === q;
  };
  reactIs_production_min.isMemo = function(a) {
    return v(a) === p;
  };
  reactIs_production_min.isPortal = function(a) {
    return v(a) === c;
  };
  reactIs_production_min.isProfiler = function(a) {
    return v(a) === f;
  };
  reactIs_production_min.isStrictMode = function(a) {
    return v(a) === e;
  };
  reactIs_production_min.isSuspense = function(a) {
    return v(a) === m;
  };
  reactIs_production_min.isSuspenseList = function(a) {
    return v(a) === n;
  };
  reactIs_production_min.isValidElementType = function(a) {
    return "string" === typeof a || "function" === typeof a || a === d2 || a === f || a === e || a === m || a === n || a === t || "object" === typeof a && null !== a && (a.$$typeof === q || a.$$typeof === p || a.$$typeof === g || a.$$typeof === h || a.$$typeof === l || a.$$typeof === u || void 0 !== a.getModuleId) ? true : false;
  };
  reactIs_production_min.typeOf = v;
  return reactIs_production_min;
}
var hasRequiredReactIs;
function requireReactIs() {
  if (hasRequiredReactIs) return reactIs.exports;
  hasRequiredReactIs = 1;
  {
    reactIs.exports = requireReactIs_production_min();
  }
  return reactIs.exports;
}
var reactIsExports = requireReactIs();
var index = /* @__PURE__ */ getDefaultExportFromCjs(reactIsExports);
var ReactIs18 = /* @__PURE__ */ _mergeNamespaces$1({
  __proto__: null,
  default: index
}, [reactIsExports]);
const reactIsMethods = [
  "isAsyncMode",
  "isConcurrentMode",
  "isContextConsumer",
  "isContextProvider",
  "isElement",
  "isForwardRef",
  "isFragment",
  "isLazy",
  "isMemo",
  "isPortal",
  "isProfiler",
  "isStrictMode",
  "isSuspense",
  "isSuspenseList",
  "isValidElementType"
];
const ReactIs = Object.fromEntries(reactIsMethods.map((m) => [m, (v) => ReactIs18[m](v) || ReactIs19[m](v)]));
function getChildren(arg, children = []) {
  if (Array.isArray(arg)) {
    for (const item of arg) {
      getChildren(item, children);
    }
  } else if (arg != null && arg !== false && arg !== "") {
    children.push(arg);
  }
  return children;
}
function getType(element) {
  const type = element.type;
  if (typeof type === "string") {
    return type;
  }
  if (typeof type === "function") {
    return type.displayName || type.name || "Unknown";
  }
  if (ReactIs.isFragment(element)) {
    return "React.Fragment";
  }
  if (ReactIs.isSuspense(element)) {
    return "React.Suspense";
  }
  if (typeof type === "object" && type !== null) {
    if (ReactIs.isContextProvider(element)) {
      return "Context.Provider";
    }
    if (ReactIs.isContextConsumer(element)) {
      return "Context.Consumer";
    }
    if (ReactIs.isForwardRef(element)) {
      if (type.displayName) {
        return type.displayName;
      }
      const functionName = type.render.displayName || type.render.name || "";
      return functionName === "" ? "ForwardRef" : `ForwardRef(${functionName})`;
    }
    if (ReactIs.isMemo(element)) {
      const functionName = type.displayName || type.type.displayName || type.type.name || "";
      return functionName === "" ? "Memo" : `Memo(${functionName})`;
    }
  }
  return "UNDEFINED";
}
function getPropKeys$1(element) {
  const { props } = element;
  return Object.keys(props).filter((key) => key !== "children" && props[key] !== void 0).sort();
}
const serialize$1 = (element, config, indentation, depth, refs, printer2) => ++depth > config.maxDepth ? printElementAsLeaf(getType(element), config) : printElement(getType(element), printProps(getPropKeys$1(element), element.props, config, indentation + config.indent, depth, refs, printer2), printChildren(getChildren(element.props.children), config, indentation + config.indent, depth, refs, printer2), config, indentation);
const test$1 = (val) => val != null && ReactIs.isElement(val);
const plugin$1 = {
  serialize: serialize$1,
  test: test$1
};
const testSymbol = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.test.json") : 245830487;
function getPropKeys(object) {
  const { props } = object;
  return props ? Object.keys(props).filter((key) => props[key] !== void 0).sort() : [];
}
const serialize = (object, config, indentation, depth, refs, printer2) => ++depth > config.maxDepth ? printElementAsLeaf(object.type, config) : printElement(object.type, object.props ? printProps(getPropKeys(object), object.props, config, indentation + config.indent, depth, refs, printer2) : "", object.children ? printChildren(object.children, config, indentation + config.indent, depth, refs, printer2) : "", config, indentation);
const test = (val) => val && val.$$typeof === testSymbol;
const plugin = {
  serialize,
  test
};
const toString$1 = Object.prototype.toString;
const toISOString = Date.prototype.toISOString;
const errorToString = Error.prototype.toString;
const regExpToString = RegExp.prototype.toString;
function getConstructorName(val) {
  return typeof val.constructor === "function" && val.constructor.name || "Object";
}
function isWindow(val) {
  return typeof window !== "undefined" && val === window;
}
const SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
const NEWLINE_REGEXP = /\n/g;
class PrettyFormatPluginError extends Error {
  constructor(message, stack) {
    super(message);
    this.stack = stack;
    this.name = this.constructor.name;
  }
}
function isToStringedArrayType(toStringed) {
  return toStringed === "[object Array]" || toStringed === "[object ArrayBuffer]" || toStringed === "[object DataView]" || toStringed === "[object Float32Array]" || toStringed === "[object Float64Array]" || toStringed === "[object Int8Array]" || toStringed === "[object Int16Array]" || toStringed === "[object Int32Array]" || toStringed === "[object Uint8Array]" || toStringed === "[object Uint8ClampedArray]" || toStringed === "[object Uint16Array]" || toStringed === "[object Uint32Array]";
}
function printNumber(val) {
  return Object.is(val, -0) ? "-0" : String(val);
}
function printBigInt(val) {
  return String(`${val}n`);
}
function printFunction(val, printFunctionName) {
  if (!printFunctionName) {
    return "[Function]";
  }
  return `[Function ${val.name || "anonymous"}]`;
}
function printSymbol(val) {
  return String(val).replace(SYMBOL_REGEXP, "Symbol($1)");
}
function printError(val) {
  return `[${errorToString.call(val)}]`;
}
function printBasicValue(val, printFunctionName, escapeRegex, escapeString) {
  if (val === true || val === false) {
    return `${val}`;
  }
  if (val === void 0) {
    return "undefined";
  }
  if (val === null) {
    return "null";
  }
  const typeOf = typeof val;
  if (typeOf === "number") {
    return printNumber(val);
  }
  if (typeOf === "bigint") {
    return printBigInt(val);
  }
  if (typeOf === "string") {
    if (escapeString) {
      return `"${val.replaceAll(/"|\\/g, "\\$&")}"`;
    }
    return `"${val}"`;
  }
  if (typeOf === "function") {
    return printFunction(val, printFunctionName);
  }
  if (typeOf === "symbol") {
    return printSymbol(val);
  }
  const toStringed = toString$1.call(val);
  if (toStringed === "[object WeakMap]") {
    return "WeakMap {}";
  }
  if (toStringed === "[object WeakSet]") {
    return "WeakSet {}";
  }
  if (toStringed === "[object Function]" || toStringed === "[object GeneratorFunction]") {
    return printFunction(val, printFunctionName);
  }
  if (toStringed === "[object Symbol]") {
    return printSymbol(val);
  }
  if (toStringed === "[object Date]") {
    return Number.isNaN(+val) ? "Date { NaN }" : toISOString.call(val);
  }
  if (toStringed === "[object Error]") {
    return printError(val);
  }
  if (toStringed === "[object RegExp]") {
    if (escapeRegex) {
      return regExpToString.call(val).replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&");
    }
    return regExpToString.call(val);
  }
  if (val instanceof Error) {
    return printError(val);
  }
  return null;
}
function printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON) {
  if (refs.includes(val)) {
    return "[Circular]";
  }
  refs = [...refs];
  refs.push(val);
  const hitMaxDepth = ++depth > config.maxDepth;
  const min = config.min;
  if (config.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON === "function" && !hasCalledToJSON) {
    return printer(val.toJSON(), config, indentation, depth, refs, true);
  }
  const toStringed = toString$1.call(val);
  if (toStringed === "[object Arguments]") {
    return hitMaxDepth ? "[Arguments]" : `${min ? "" : "Arguments "}[${printListItems(val, config, indentation, depth, refs, printer)}]`;
  }
  if (isToStringedArrayType(toStringed)) {
    return hitMaxDepth ? `[${val.constructor.name}]` : `${min ? "" : !config.printBasicPrototype && val.constructor.name === "Array" ? "" : `${val.constructor.name} `}[${printListItems(val, config, indentation, depth, refs, printer)}]`;
  }
  if (toStringed === "[object Map]") {
    return hitMaxDepth ? "[Map]" : `Map {${printIteratorEntries(val.entries(), config, indentation, depth, refs, printer, " => ")}}`;
  }
  if (toStringed === "[object Set]") {
    return hitMaxDepth ? "[Set]" : `Set {${printIteratorValues(val.values(), config, indentation, depth, refs, printer)}}`;
  }
  return hitMaxDepth || isWindow(val) ? `[${getConstructorName(val)}]` : `${min ? "" : !config.printBasicPrototype && getConstructorName(val) === "Object" ? "" : `${getConstructorName(val)} `}{${printObjectProperties(val, config, indentation, depth, refs, printer)}}`;
}
function isNewPlugin(plugin2) {
  return plugin2.serialize != null;
}
function printPlugin(plugin2, val, config, indentation, depth, refs) {
  let printed;
  try {
    printed = isNewPlugin(plugin2) ? plugin2.serialize(val, config, indentation, depth, refs, printer) : plugin2.print(val, (valChild) => printer(valChild, config, indentation, depth, refs), (str) => {
      const indentationNext = indentation + config.indent;
      return indentationNext + str.replaceAll(NEWLINE_REGEXP, `
${indentationNext}`);
    }, {
      edgeSpacing: config.spacingOuter,
      min: config.min,
      spacing: config.spacingInner
    }, config.colors);
  } catch (error) {
    throw new PrettyFormatPluginError(error.message, error.stack);
  }
  if (typeof printed !== "string") {
    throw new TypeError(`pretty-format: Plugin must return type "string" but instead returned "${typeof printed}".`);
  }
  return printed;
}
function findPlugin(plugins2, val) {
  for (const plugin2 of plugins2) {
    try {
      if (plugin2.test(val)) {
        return plugin2;
      }
    } catch (error) {
      throw new PrettyFormatPluginError(error.message, error.stack);
    }
  }
  return null;
}
function printer(val, config, indentation, depth, refs, hasCalledToJSON) {
  var _a;
  let result;
  const plugin2 = findPlugin(config.plugins, val);
  if (plugin2 !== null) {
    result = printPlugin(plugin2, val, config, indentation, depth, refs);
  } else {
    const basicResult = printBasicValue(val, config.printFunctionName, config.escapeRegex, config.escapeString);
    if (basicResult !== null) {
      result = basicResult;
    } else {
      result = printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON);
    }
  }
  (_a = config._outputLengthPerDepth)[depth] ?? (_a[depth] = 0);
  config._outputLengthPerDepth[depth] += result.length;
  if (config._outputLengthPerDepth[depth] > config.maxOutputLength) {
    config.maxDepth = 0;
  }
  return result;
}
const DEFAULT_THEME = {
  comment: "gray",
  content: "reset",
  prop: "yellow",
  tag: "cyan",
  value: "green"
};
const DEFAULT_THEME_KEYS = Object.keys(DEFAULT_THEME);
const DEFAULT_OPTIONS = {
  callToJSON: true,
  compareKeys: void 0,
  escapeRegex: false,
  escapeString: true,
  highlight: false,
  indent: 2,
  maxDepth: Number.POSITIVE_INFINITY,
  maxOutputLength: 1e6,
  maxWidth: Number.POSITIVE_INFINITY,
  min: false,
  plugins: [],
  printBasicPrototype: true,
  printFunctionName: true,
  printShadowRoot: true,
  theme: DEFAULT_THEME
};
function validateOptions(options) {
  for (const key of Object.keys(options)) {
    if (!Object.hasOwn(DEFAULT_OPTIONS, key)) {
      throw new Error(`pretty-format: Unknown option "${key}".`);
    }
  }
  if (options.min && options.indent !== void 0 && options.indent !== 0) {
    throw new Error('pretty-format: Options "min" and "indent" cannot be used together.');
  }
}
function getColorsHighlight() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    const value = DEFAULT_THEME[key];
    const color = value && y[value];
    if (color && typeof color.close === "string" && typeof color.open === "string") {
      colors[key] = color;
    } else {
      throw new Error(`pretty-format: Option "theme" has a key "${key}" whose value "${value}" is undefined in ansi-styles.`);
    }
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getColorsEmpty() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    colors[key] = {
      close: "",
      open: ""
    };
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getPrintFunctionName(options) {
  return (options == null ? void 0 : options.printFunctionName) ?? DEFAULT_OPTIONS.printFunctionName;
}
function getEscapeRegex(options) {
  return (options == null ? void 0 : options.escapeRegex) ?? DEFAULT_OPTIONS.escapeRegex;
}
function getEscapeString(options) {
  return (options == null ? void 0 : options.escapeString) ?? DEFAULT_OPTIONS.escapeString;
}
function getConfig$1(options) {
  return {
    callToJSON: (options == null ? void 0 : options.callToJSON) ?? DEFAULT_OPTIONS.callToJSON,
    colors: (options == null ? void 0 : options.highlight) ? getColorsHighlight() : getColorsEmpty(),
    compareKeys: typeof (options == null ? void 0 : options.compareKeys) === "function" || (options == null ? void 0 : options.compareKeys) === null ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
    escapeRegex: getEscapeRegex(options),
    escapeString: getEscapeString(options),
    indent: (options == null ? void 0 : options.min) ? "" : createIndent((options == null ? void 0 : options.indent) ?? DEFAULT_OPTIONS.indent),
    maxDepth: (options == null ? void 0 : options.maxDepth) ?? DEFAULT_OPTIONS.maxDepth,
    maxWidth: (options == null ? void 0 : options.maxWidth) ?? DEFAULT_OPTIONS.maxWidth,
    min: (options == null ? void 0 : options.min) ?? DEFAULT_OPTIONS.min,
    plugins: (options == null ? void 0 : options.plugins) ?? DEFAULT_OPTIONS.plugins,
    printBasicPrototype: (options == null ? void 0 : options.printBasicPrototype) ?? true,
    printFunctionName: getPrintFunctionName(options),
    printShadowRoot: (options == null ? void 0 : options.printShadowRoot) ?? true,
    spacingInner: (options == null ? void 0 : options.min) ? " " : "\n",
    spacingOuter: (options == null ? void 0 : options.min) ? "" : "\n",
    maxOutputLength: (options == null ? void 0 : options.maxOutputLength) ?? DEFAULT_OPTIONS.maxOutputLength,
    _outputLengthPerDepth: []
  };
}
function createIndent(indent) {
  return Array.from({ length: indent + 1 }).join(" ");
}
function format$1(val, options) {
  if (options) {
    validateOptions(options);
    if (options.plugins) {
      const plugin2 = findPlugin(options.plugins, val);
      if (plugin2 !== null) {
        return printPlugin(plugin2, val, getConfig$1(options), "", 0, []);
      }
    }
  }
  const basicResult = printBasicValue(val, getPrintFunctionName(options), getEscapeRegex(options), getEscapeString(options));
  if (basicResult !== null) {
    return basicResult;
  }
  return printComplexValue(val, getConfig$1(options), "", 0, []);
}
const plugins = {
  AsymmetricMatcher: plugin$5,
  DOMCollection: plugin$4,
  DOMElement: plugin$3,
  Immutable: plugin$2,
  ReactElement: plugin$1,
  ReactTestComponent: plugin
};
const ansiColors = {
  bold: ["1", "22"],
  dim: ["2", "22"],
  italic: ["3", "23"],
  underline: ["4", "24"],
  // 5 & 6 are blinking
  inverse: ["7", "27"],
  hidden: ["8", "28"],
  strike: ["9", "29"],
  // 10-20 are fonts
  // 21-29 are resets for 1-9
  black: ["30", "39"],
  red: ["31", "39"],
  green: ["32", "39"],
  yellow: ["33", "39"],
  blue: ["34", "39"],
  magenta: ["35", "39"],
  cyan: ["36", "39"],
  white: ["37", "39"],
  brightblack: ["30;1", "39"],
  brightred: ["31;1", "39"],
  brightgreen: ["32;1", "39"],
  brightyellow: ["33;1", "39"],
  brightblue: ["34;1", "39"],
  brightmagenta: ["35;1", "39"],
  brightcyan: ["36;1", "39"],
  brightwhite: ["37;1", "39"],
  grey: ["90", "39"]
};
const styles = {
  special: "cyan",
  number: "yellow",
  bigint: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  symbol: "green",
  date: "magenta",
  regexp: "red"
};
const truncator = "…";
function colorise(value, styleType) {
  const color = ansiColors[styles[styleType]] || ansiColors[styleType] || "";
  if (!color) {
    return String(value);
  }
  return `\x1B[${color[0]}m${String(value)}\x1B[${color[1]}m`;
}
function normaliseOptions({
  showHidden = false,
  depth = 2,
  colors = false,
  customInspect = true,
  showProxy = false,
  maxArrayLength = Infinity,
  breakLength = Infinity,
  seen = [],
  // eslint-disable-next-line no-shadow
  truncate: truncate2 = Infinity,
  stylize = String
} = {}, inspect2) {
  const options = {
    showHidden: Boolean(showHidden),
    depth: Number(depth),
    colors: Boolean(colors),
    customInspect: Boolean(customInspect),
    showProxy: Boolean(showProxy),
    maxArrayLength: Number(maxArrayLength),
    breakLength: Number(breakLength),
    truncate: Number(truncate2),
    seen,
    inspect: inspect2,
    stylize
  };
  if (options.colors) {
    options.stylize = colorise;
  }
  return options;
}
function isHighSurrogate(char) {
  return char >= "\uD800" && char <= "\uDBFF";
}
function truncate(string, length, tail = truncator) {
  string = String(string);
  const tailLength = tail.length;
  const stringLength = string.length;
  if (tailLength > length && stringLength > tailLength) {
    return tail;
  }
  if (stringLength > length && stringLength > tailLength) {
    let end = length - tailLength;
    if (end > 0 && isHighSurrogate(string[end - 1])) {
      end = end - 1;
    }
    return `${string.slice(0, end)}${tail}`;
  }
  return string;
}
function inspectList(list, options, inspectItem, separator = ", ") {
  inspectItem = inspectItem || options.inspect;
  const size = list.length;
  if (size === 0)
    return "";
  const originalLength = options.truncate;
  let output = "";
  let peek = "";
  let truncated = "";
  for (let i2 = 0; i2 < size; i2 += 1) {
    const last = i2 + 1 === list.length;
    const secondToLast = i2 + 2 === list.length;
    truncated = `${truncator}(${list.length - i2})`;
    const value = list[i2];
    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
    const string = peek || inspectItem(value, options) + (last ? "" : separator);
    const nextLength = output.length + string.length;
    const truncatedLength = nextLength + truncated.length;
    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
      break;
    }
    if (!last && !secondToLast && truncatedLength > originalLength) {
      break;
    }
    peek = last ? "" : inspectItem(list[i2 + 1], options) + (secondToLast ? "" : separator);
    if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
      break;
    }
    output += string;
    if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
      truncated = `${truncator}(${list.length - i2 - 1})`;
      break;
    }
    truncated = "";
  }
  return `${output}${truncated}`;
}
function quoteComplexKey(key) {
  if (key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
    return key;
  }
  return JSON.stringify(key).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
function inspectProperty([key, value], options) {
  options.truncate -= 2;
  if (typeof key === "string") {
    key = quoteComplexKey(key);
  } else if (typeof key !== "number") {
    key = `[${options.inspect(key, options)}]`;
  }
  options.truncate -= key.length;
  value = options.inspect(value, options);
  return `${key}: ${value}`;
}
function inspectArray(array, options) {
  const nonIndexProperties = Object.keys(array).slice(array.length);
  if (!array.length && !nonIndexProperties.length)
    return "[]";
  options.truncate -= 4;
  const listContents = inspectList(array, options);
  options.truncate -= listContents.length;
  let propertyContents = "";
  if (nonIndexProperties.length) {
    propertyContents = inspectList(nonIndexProperties.map((key) => [key, array[key]]), options, inspectProperty);
  }
  return `[ ${listContents}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
const getArrayName = (array) => {
  if (typeof Buffer === "function" && array instanceof Buffer) {
    return "Buffer";
  }
  if (array[Symbol.toStringTag]) {
    return array[Symbol.toStringTag];
  }
  return array.constructor.name;
};
function inspectTypedArray(array, options) {
  const name = getArrayName(array);
  options.truncate -= name.length + 4;
  const nonIndexProperties = Object.keys(array).slice(array.length);
  if (!array.length && !nonIndexProperties.length)
    return `${name}[]`;
  let output = "";
  for (let i2 = 0; i2 < array.length; i2++) {
    const string = `${options.stylize(truncate(array[i2], options.truncate), "number")}${i2 === array.length - 1 ? "" : ", "}`;
    options.truncate -= string.length;
    if (array[i2] !== array.length && options.truncate <= 3) {
      output += `${truncator}(${array.length - array[i2] + 1})`;
      break;
    }
    output += string;
  }
  let propertyContents = "";
  if (nonIndexProperties.length) {
    propertyContents = inspectList(nonIndexProperties.map((key) => [key, array[key]]), options, inspectProperty);
  }
  return `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
function inspectDate(dateObject, options) {
  const stringRepresentation = dateObject.toJSON();
  if (stringRepresentation === null) {
    return "Invalid Date";
  }
  const split = stringRepresentation.split("T");
  const date = split[0];
  return options.stylize(`${date}T${truncate(split[1], options.truncate - date.length - 1)}`, "date");
}
function inspectFunction(func, options) {
  const functionType = func[Symbol.toStringTag] || "Function";
  const name = func.name;
  if (!name) {
    return options.stylize(`[${functionType}]`, "special");
  }
  return options.stylize(`[${functionType} ${truncate(name, options.truncate - 11)}]`, "special");
}
function inspectMapEntry([key, value], options) {
  options.truncate -= 4;
  key = options.inspect(key, options);
  options.truncate -= key.length;
  value = options.inspect(value, options);
  return `${key} => ${value}`;
}
function mapToEntries(map) {
  const entries = [];
  map.forEach((value, key) => {
    entries.push([key, value]);
  });
  return entries;
}
function inspectMap(map, options) {
  if (map.size === 0)
    return "Map{}";
  options.truncate -= 7;
  return `Map{ ${inspectList(mapToEntries(map), options, inspectMapEntry)} }`;
}
const isNaN = Number.isNaN || ((i2) => i2 !== i2);
function inspectNumber(number, options) {
  if (isNaN(number)) {
    return options.stylize("NaN", "number");
  }
  if (number === Infinity) {
    return options.stylize("Infinity", "number");
  }
  if (number === -Infinity) {
    return options.stylize("-Infinity", "number");
  }
  if (number === 0) {
    return options.stylize(1 / number === Infinity ? "+0" : "-0", "number");
  }
  return options.stylize(truncate(String(number), options.truncate), "number");
}
function inspectBigInt(number, options) {
  let nums = truncate(number.toString(), options.truncate - 1);
  if (nums !== truncator)
    nums += "n";
  return options.stylize(nums, "bigint");
}
function inspectRegExp(value, options) {
  const flags = value.toString().split("/")[2];
  const sourceLength = options.truncate - (2 + flags.length);
  const source = value.source;
  return options.stylize(`/${truncate(source, sourceLength)}/${flags}`, "regexp");
}
function arrayFromSet(set) {
  const values = [];
  set.forEach((value) => {
    values.push(value);
  });
  return values;
}
function inspectSet(set, options) {
  if (set.size === 0)
    return "Set{}";
  options.truncate -= 7;
  return `Set{ ${inspectList(arrayFromSet(set), options)} }`;
}
const stringEscapeChars = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g");
const escapeCharacters = {
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "'": "\\'",
  "\\": "\\\\"
};
const hex = 16;
function escape(char) {
  return escapeCharacters[char] || `\\u${`0000${char.charCodeAt(0).toString(hex)}`.slice(-4)}`;
}
function inspectString(string, options) {
  if (stringEscapeChars.test(string)) {
    string = string.replace(stringEscapeChars, escape);
  }
  return options.stylize(`'${truncate(string, options.truncate - 2)}'`, "string");
}
function inspectSymbol(value) {
  if ("description" in Symbol.prototype) {
    return value.description ? `Symbol(${value.description})` : "Symbol()";
  }
  return value.toString();
}
const getPromiseValue = () => "Promise{…}";
function inspectObject$1(object, options) {
  const properties = Object.getOwnPropertyNames(object);
  const symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : [];
  if (properties.length === 0 && symbols.length === 0) {
    return "{}";
  }
  options.truncate -= 4;
  options.seen = options.seen || [];
  if (options.seen.includes(object)) {
    return "[Circular]";
  }
  options.seen.push(object);
  const propertyContents = inspectList(properties.map((key) => [key, object[key]]), options, inspectProperty);
  const symbolContents = inspectList(symbols.map((key) => [key, object[key]]), options, inspectProperty);
  options.seen.pop();
  let sep = "";
  if (propertyContents && symbolContents) {
    sep = ", ";
  }
  return `{ ${propertyContents}${sep}${symbolContents} }`;
}
const toStringTag = typeof Symbol !== "undefined" && Symbol.toStringTag ? Symbol.toStringTag : false;
function inspectClass(value, options) {
  let name = "";
  if (toStringTag && toStringTag in value) {
    name = value[toStringTag];
  }
  name = name || value.constructor.name;
  if (!name || name === "_class") {
    name = "<Anonymous Class>";
  }
  options.truncate -= name.length;
  return `${name}${inspectObject$1(value, options)}`;
}
function inspectArguments(args, options) {
  if (args.length === 0)
    return "Arguments[]";
  options.truncate -= 13;
  return `Arguments[ ${inspectList(args, options)} ]`;
}
const errorKeys = [
  "stack",
  "line",
  "column",
  "name",
  "message",
  "fileName",
  "lineNumber",
  "columnNumber",
  "number",
  "description",
  "cause"
];
function inspectObject(error, options) {
  const properties = Object.getOwnPropertyNames(error).filter((key) => errorKeys.indexOf(key) === -1);
  const name = error.name;
  options.truncate -= name.length;
  let message = "";
  if (typeof error.message === "string") {
    message = truncate(error.message, options.truncate);
  } else {
    properties.unshift("message");
  }
  message = message ? `: ${message}` : "";
  options.truncate -= message.length + 5;
  options.seen = options.seen || [];
  if (options.seen.includes(error)) {
    return "[Circular]";
  }
  options.seen.push(error);
  const propertyContents = inspectList(properties.map((key) => [key, error[key]]), options, inspectProperty);
  return `${name}${message}${propertyContents ? ` { ${propertyContents} }` : ""}`;
}
function inspectAttribute([key, value], options) {
  options.truncate -= 3;
  if (!value) {
    return `${options.stylize(String(key), "yellow")}`;
  }
  return `${options.stylize(String(key), "yellow")}=${options.stylize(`"${value}"`, "string")}`;
}
function inspectNodeCollection(collection, options) {
  return inspectList(collection, options, inspectNode, "\n");
}
function inspectNode(node, options) {
  switch (node.nodeType) {
    case 1:
      return inspectHTML(node, options);
    case 3:
      return options.inspect(node.data, options);
    default:
      return options.inspect(node, options);
  }
}
function inspectHTML(element, options) {
  const properties = element.getAttributeNames();
  const name = element.tagName.toLowerCase();
  const head = options.stylize(`<${name}`, "special");
  const headClose = options.stylize(`>`, "special");
  const tail = options.stylize(`</${name}>`, "special");
  options.truncate -= name.length * 2 + 5;
  let propertyContents = "";
  if (properties.length > 0) {
    propertyContents += " ";
    propertyContents += inspectList(properties.map((key) => [key, element.getAttribute(key)]), options, inspectAttribute, " ");
  }
  options.truncate -= propertyContents.length;
  const truncate2 = options.truncate;
  let children = inspectNodeCollection(element.children, options);
  if (children && children.length > truncate2) {
    children = `${truncator}(${element.children.length})`;
  }
  return `${head}${propertyContents}${headClose}${children}${tail}`;
}
const symbolsSupported = typeof Symbol === "function" && typeof Symbol.for === "function";
const chaiInspect = symbolsSupported ? Symbol.for("chai/inspect") : "@@chai/inspect";
const nodeInspect = Symbol.for("nodejs.util.inspect.custom");
const constructorMap = /* @__PURE__ */ new WeakMap();
const stringTagMap = {};
const baseTypesMap = {
  undefined: (value, options) => options.stylize("undefined", "undefined"),
  null: (value, options) => options.stylize("null", "null"),
  boolean: (value, options) => options.stylize(String(value), "boolean"),
  Boolean: (value, options) => options.stylize(String(value), "boolean"),
  number: inspectNumber,
  Number: inspectNumber,
  bigint: inspectBigInt,
  BigInt: inspectBigInt,
  string: inspectString,
  String: inspectString,
  function: inspectFunction,
  Function: inspectFunction,
  symbol: inspectSymbol,
  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
  Symbol: inspectSymbol,
  Array: inspectArray,
  Date: inspectDate,
  Map: inspectMap,
  Set: inspectSet,
  RegExp: inspectRegExp,
  Promise: getPromiseValue,
  // WeakSet, WeakMap are totally opaque to us
  WeakSet: (value, options) => options.stylize("WeakSet{…}", "special"),
  WeakMap: (value, options) => options.stylize("WeakMap{…}", "special"),
  Arguments: inspectArguments,
  Int8Array: inspectTypedArray,
  Uint8Array: inspectTypedArray,
  Uint8ClampedArray: inspectTypedArray,
  Int16Array: inspectTypedArray,
  Uint16Array: inspectTypedArray,
  Int32Array: inspectTypedArray,
  Uint32Array: inspectTypedArray,
  Float32Array: inspectTypedArray,
  Float64Array: inspectTypedArray,
  Generator: () => "",
  DataView: () => "",
  ArrayBuffer: () => "",
  Error: inspectObject,
  HTMLCollection: inspectNodeCollection,
  NodeList: inspectNodeCollection
};
const inspectCustom = (value, options, type, inspectFn) => {
  if (chaiInspect in value && typeof value[chaiInspect] === "function") {
    return value[chaiInspect](options);
  }
  if (nodeInspect in value && typeof value[nodeInspect] === "function") {
    return value[nodeInspect](options.depth, options, inspectFn);
  }
  if ("inspect" in value && typeof value.inspect === "function") {
    return value.inspect(options.depth, options);
  }
  if ("constructor" in value && constructorMap.has(value.constructor)) {
    return constructorMap.get(value.constructor)(value, options);
  }
  if (stringTagMap[type]) {
    return stringTagMap[type](value, options);
  }
  return "";
};
const toString = Object.prototype.toString;
function inspect$1(value, opts = {}) {
  const options = normaliseOptions(opts, inspect$1);
  const { customInspect } = options;
  let type = value === null ? "null" : typeof value;
  if (type === "object") {
    type = toString.call(value).slice(8, -1);
  }
  if (type in baseTypesMap) {
    return baseTypesMap[type](value, options);
  }
  if (customInspect && value) {
    const output = inspectCustom(value, options, type, inspect$1);
    if (output) {
      if (typeof output === "string")
        return output;
      return inspect$1(output, options);
    }
  }
  const proto = value ? Object.getPrototypeOf(value) : false;
  if (proto === Object.prototype || proto === null) {
    return inspectObject$1(value, options);
  }
  if (value && typeof HTMLElement === "function" && value instanceof HTMLElement) {
    return inspectHTML(value, options);
  }
  if ("constructor" in value) {
    if (value.constructor !== Object) {
      return inspectClass(value, options);
    }
    return inspectObject$1(value, options);
  }
  if (value === Object(value)) {
    return inspectObject$1(value, options);
  }
  return options.stylize(String(value), type);
}
const { AsymmetricMatcher, DOMCollection, DOMElement, Immutable, ReactElement, ReactTestComponent } = plugins;
const PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher
];
function stringify(object, maxDepth = 10, { maxLength, filterNode, ...options } = {}) {
  const MAX_LENGTH = maxLength ?? 1e4;
  let result;
  const filterFn = typeof filterNode === "string" ? createNodeFilterFromSelector(filterNode) : filterNode;
  const plugins2 = filterFn ? [
    ReactTestComponent,
    ReactElement,
    createDOMElementFilter(filterFn),
    DOMCollection,
    Immutable,
    AsymmetricMatcher
  ] : PLUGINS;
  try {
    result = format$1(object, {
      maxDepth,
      escapeString: false,
      plugins: plugins2,
      ...options
    });
  } catch {
    result = format$1(object, {
      callToJSON: false,
      maxDepth,
      escapeString: false,
      plugins: plugins2,
      ...options
    });
  }
  return result.length >= MAX_LENGTH && maxDepth > 1 ? stringify(object, Math.floor(Math.min(maxDepth, Number.MAX_SAFE_INTEGER) / 2), {
    maxLength,
    filterNode,
    ...options
  }) : result;
}
function createNodeFilterFromSelector(selector) {
  const ELEMENT_NODE2 = 1;
  const COMMENT_NODE2 = 8;
  return (node) => {
    if (node.nodeType === COMMENT_NODE2) {
      return false;
    }
    if (node.nodeType === ELEMENT_NODE2 && node.matches) {
      try {
        return !node.matches(selector);
      } catch {
        return true;
      }
    }
    return true;
  };
}
const formatRegExp = /%[sdjifoOc%]/g;
function baseFormat(args, options = {}) {
  const formatArg = (item, inspecOptions) => {
    if (options.prettifyObject) {
      return stringify(item, void 0, {
        printBasicPrototype: false,
        escapeString: false
      });
    }
    return inspect(item, inspecOptions);
  };
  if (typeof args[0] !== "string") {
    const objects = [];
    for (let i3 = 0; i3 < args.length; i3++) {
      objects.push(formatArg(args[i3], {
        depth: 0,
        colors: false
      }));
    }
    return objects.join(" ");
  }
  const len = args.length;
  let i2 = 1;
  const template = args[0];
  let str = String(template).replace(formatRegExp, (x) => {
    if (x === "%%") {
      return "%";
    }
    if (i2 >= len) {
      return x;
    }
    switch (x) {
      case "%s": {
        const value = args[i2++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        if (typeof value === "number" && value === 0 && 1 / value < 0) {
          return "-0";
        }
        if (typeof value === "object" && value !== null) {
          if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
            return value.toString();
          }
          return formatArg(value, {
            depth: 0,
            colors: false
          });
        }
        return String(value);
      }
      case "%d": {
        const value = args[i2++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        if (typeof value === "symbol") {
          return "NaN";
        }
        return Number(value).toString();
      }
      case "%i": {
        const value = args[i2++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        return Number.parseInt(String(value)).toString();
      }
      case "%f":
        return Number.parseFloat(String(args[i2++])).toString();
      case "%o":
        return formatArg(args[i2++], {
          showHidden: true,
          showProxy: true
        });
      case "%O":
        return formatArg(args[i2++]);
      case "%c": {
        i2++;
        return "";
      }
      case "%j":
        try {
          return JSON.stringify(args[i2++]);
        } catch (err) {
          const m = err.message;
          if (m.includes("circular structure") || m.includes("cyclic structures") || m.includes("cyclic object")) {
            return "[Circular]";
          }
          throw err;
        }
      default:
        return x;
    }
  });
  for (let x = args[i2]; i2 < len; x = args[++i2]) {
    if (x === null || typeof x !== "object") {
      str += ` ${typeof x === "symbol" ? x.toString() : x}`;
    } else {
      str += ` ${formatArg(x)}`;
    }
  }
  return str;
}
function format(...args) {
  return baseFormat(args);
}
function inspect(obj, options = {}) {
  if (options.truncate === 0) {
    options.truncate = Number.POSITIVE_INFINITY;
  }
  return inspect$1(obj, options);
}
function objDisplay(obj, options = {}) {
  if (typeof options.truncate === "undefined") {
    options.truncate = 40;
  }
  const str = inspect(obj, options);
  const type = Object.prototype.toString.call(obj);
  if (options.truncate && str.length >= options.truncate) {
    if (type === "[object Function]") {
      const fn = obj;
      return !fn.name ? "[Function]" : `[Function: ${fn.name}]`;
    } else if (type === "[object Array]") {
      return `[ Array(${obj.length}) ]`;
    } else if (type === "[object Object]") {
      const keys = Object.keys(obj);
      const kstr = keys.length > 2 ? `${keys.splice(0, 2).join(", ")}, ...` : keys.join(", ");
      return `{ Object (${kstr}) }`;
    } else {
      return str;
    }
  }
  return str;
}
function assertTypes(value, name, types) {
  const receivedType = typeof value;
  const pass = types.includes(receivedType);
  if (!pass) {
    throw new TypeError(`${name} value must be ${types.join(" or ")}, received "${receivedType}"`);
  }
}
function filterOutComments(s) {
  const result = [];
  let commentState = "none";
  for (let i2 = 0; i2 < s.length; ++i2) {
    if (commentState === "singleline") {
      if (s[i2] === "\n") {
        commentState = "none";
      }
    } else if (commentState === "multiline") {
      if (s[i2 - 1] === "*" && s[i2] === "/") {
        commentState = "none";
      }
    } else if (commentState === "none") {
      if (s[i2] === "/" && s[i2 + 1] === "/") {
        commentState = "singleline";
      } else if (s[i2] === "/" && s[i2 + 1] === "*") {
        commentState = "multiline";
        i2 += 2;
      } else {
        result.push(s[i2]);
      }
    }
  }
  return result.join("");
}
function toArray(array) {
  if (array === null || array === void 0) {
    array = [];
  }
  if (Array.isArray(array)) {
    return array;
  }
  return [array];
}
function isObject(item) {
  return item != null && typeof item === "object" && !Array.isArray(item);
}
function objectAttr(source, path, defaultValue = void 0) {
  const paths = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let result = source;
  for (const p of paths) {
    result = new Object(result)[p];
    if (result === void 0) {
      return defaultValue;
    }
  }
  return result;
}
function createDefer() {
  let resolve2 = null;
  let reject = null;
  const p = new Promise((_resolve, _reject) => {
    resolve2 = _resolve;
    reject = _reject;
  });
  p.resolve = resolve2;
  p.reject = reject;
  return p;
}
function isNegativeNaN(val) {
  if (!Number.isNaN(val)) {
    return false;
  }
  const f64 = new Float64Array(1);
  f64[0] = val;
  const u32 = new Uint32Array(f64.buffer);
  const isNegative = u32[1] >>> 31 === 1;
  return isNegative;
}
function ordinal(i2) {
  const j = i2 % 10;
  const k = i2 % 100;
  if (j === 1 && k !== 11) {
    return `${i2}st`;
  }
  if (j === 2 && k !== 12) {
    return `${i2}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${i2}rd`;
  }
  return `${i2}th`;
}
function unique(array) {
  return Array.from(new Set(array));
}
const SAFE_TIMERS_SYMBOL = Symbol("vitest:SAFE_TIMERS");
function getSafeTimers() {
  const { setTimeout: safeSetTimeout, setInterval: safeSetInterval, clearInterval: safeClearInterval, clearTimeout: safeClearTimeout, setImmediate: safeSetImmediate, clearImmediate: safeClearImmediate, queueMicrotask: safeQueueMicrotask } = globalThis[SAFE_TIMERS_SYMBOL] || globalThis;
  const { nextTick: safeNextTick } = globalThis[SAFE_TIMERS_SYMBOL] || globalThis.process || {};
  return {
    nextTick: safeNextTick,
    setTimeout: safeSetTimeout,
    setInterval: safeSetInterval,
    clearInterval: safeClearInterval,
    clearTimeout: safeClearTimeout,
    setImmediate: safeSetImmediate,
    clearImmediate: safeClearImmediate,
    queueMicrotask: safeQueueMicrotask
  };
}
const _DRIVE_LETTER_START_RE$1 = /^[A-Za-z]:\//;
function normalizeWindowsPath$1(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE$1, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE$1 = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
function cwd$1() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve$1 = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath$1(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index2 = arguments_.length - 1; index2 >= -1 && !resolvedAbsolute; index2--) {
    const path = index2 >= 0 ? arguments_[index2] : cwd$1();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute$1(path);
  }
  resolvedPath = normalizeString$1(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute$1(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString$1(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index2 = 0; index2 <= path.length; ++index2) {
    if (index2 < path.length) {
      char = path[index2];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index2 - 1 || dots === 1) ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index2;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index2;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index2)}`;
        } else {
          res = path.slice(lastSlash + 1, index2);
        }
        lastSegmentLength = index2 - lastSlash - 1;
      }
      lastSlash = index2;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute$1 = function(p) {
  return _IS_ABSOLUTE_RE$1.test(p);
};
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInt = new Uint8Array(128);
for (let i2 = 0; i2 < chars.length; i2++) {
  const c = chars.charCodeAt(i2);
  intToChar[i2] = c;
  charToInt[c] = i2;
}
const CHROME_IE_STACK_REGEXP = /^\s*at .*(?:\S:\d+|\(native\))/m;
const SAFARI_NATIVE_CODE_REGEXP = /^(?:eval@)?(?:\[native code\])?$/;
const NOW_LENGTH = Date.now().toString().length;
const REGEXP_VITEST = new RegExp(`vitest=\\d{${NOW_LENGTH}}`);
function extractLocation(urlLike) {
  if (!urlLike.includes(":")) {
    return [urlLike];
  }
  const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
  const parts = regExp.exec(urlLike.replace(/^\(|\)$/g, ""));
  if (!parts) {
    return [urlLike];
  }
  let url = parts[1];
  if (url.startsWith("async ")) {
    url = url.slice(6);
  }
  if (url.startsWith("http:") || url.startsWith("https:")) {
    const urlObj = new URL(url);
    urlObj.searchParams.delete("import");
    urlObj.searchParams.delete("browserv");
    url = urlObj.pathname + urlObj.hash + urlObj.search;
  }
  if (url.startsWith("/@fs/")) {
    const isWindows = /^\/@fs\/[a-zA-Z]:\//.test(url);
    url = url.slice(isWindows ? 5 : 4);
  }
  if (url.includes("vitest=")) {
    url = url.replace(REGEXP_VITEST, "").replace(/[?&]$/, "");
  }
  return [
    url,
    parts[2] || void 0,
    parts[3] || void 0
  ];
}
function parseSingleFFOrSafariStack(raw) {
  let line = raw.trim();
  if (SAFARI_NATIVE_CODE_REGEXP.test(line)) {
    return null;
  }
  if (line.includes(" > eval")) {
    line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
  }
  if (!line.includes("@")) {
    return null;
  }
  let atIndex = -1;
  let locationPart = "";
  let functionName;
  for (let i2 = 0; i2 < line.length; i2++) {
    if (line[i2] === "@") {
      const candidateLocation = line.slice(i2 + 1);
      if (candidateLocation.includes(":") && candidateLocation.length >= 3) {
        atIndex = i2;
        locationPart = candidateLocation;
        functionName = i2 > 0 ? line.slice(0, i2) : void 0;
        break;
      }
    }
  }
  if (atIndex === -1 || !locationPart.includes(":") || locationPart.length < 3) {
    return null;
  }
  const [url, lineNumber, columnNumber] = extractLocation(locationPart);
  if (!url || !lineNumber || !columnNumber) {
    return null;
  }
  return {
    file: url,
    method: functionName || "",
    line: Number.parseInt(lineNumber),
    column: Number.parseInt(columnNumber)
  };
}
function parseSingleStack(raw) {
  const line = raw.trim();
  if (!CHROME_IE_STACK_REGEXP.test(line)) {
    return parseSingleFFOrSafariStack(line);
  }
  return parseSingleV8Stack(line);
}
function parseSingleV8Stack(raw) {
  let line = raw.trim();
  if (!CHROME_IE_STACK_REGEXP.test(line)) {
    return null;
  }
  if (line.includes("(eval ")) {
    line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
  }
  let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
  const location = sanitizedLine.match(/ (\(.+\)$)/);
  sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
  const [url, lineNumber, columnNumber] = extractLocation(location ? location[1] : sanitizedLine);
  let method = location && sanitizedLine || "";
  let file = url && ["eval", "<anonymous>"].includes(url) ? void 0 : url;
  if (!file || !lineNumber || !columnNumber) {
    return null;
  }
  if (method.startsWith("async ")) {
    method = method.slice(6);
  }
  if (file.startsWith("file://")) {
    file = file.slice(7);
  }
  file = file.startsWith("node:") || file.startsWith("internal:") ? file : resolve$1(file);
  if (method) {
    method = method.replace(/\(0\s?,\s?__vite_ssr_import_\d+__.(\w+)\)/g, "$1").replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "").replace(/(Object\.)?__vite_ssr_export_default__\s?/g, "");
  }
  return {
    method,
    file,
    line: Number.parseInt(lineNumber),
    column: Number.parseInt(columnNumber)
  };
}
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index2 = arguments_.length - 1; index2 >= -1 && !resolvedAbsolute; index2--) {
    const path = index2 >= 0 ? arguments_[index2] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index2 = 0; index2 <= path.length; ++index2) {
    if (index2 < path.length) {
      char = path[index2];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index2 - 1 || dots === 1) ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index2;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index2;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index2)}`;
        } else {
          res = path.slice(lastSlash + 1, index2);
        }
        lastSegmentLength = index2 - lastSlash - 1;
      }
      lastSlash = index2;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const relative = function(from, to) {
  const _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/");
  const _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0]) {
    return _to.join("/");
  }
  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};
class PendingError extends Error {
  code = "VITEST_PENDING";
  taskId;
  constructor(message, task, note) {
    super(message);
    this.message = message;
    this.note = note;
    this.taskId = task.id;
  }
}
class FixtureDependencyError extends Error {
  name = "FixtureDependencyError";
}
class FixtureAccessError extends Error {
  name = "FixtureAccessError";
}
class FixtureParseError extends Error {
  name = "FixtureParseError";
}
const fnMap = /* @__PURE__ */ new WeakMap();
const testFixtureMap = /* @__PURE__ */ new WeakMap();
const hooksMap = /* @__PURE__ */ new WeakMap();
function setFn(key, fn) {
  fnMap.set(key, fn);
}
function setTestFixture(key, fixture) {
  testFixtureMap.set(key, fixture);
}
function getTestFixtures(key) {
  return testFixtureMap.get(key);
}
function setHooks(key, hooks) {
  hooksMap.set(key, hooks);
}
function getHooks(key) {
  return hooksMap.get(key);
}
const FIXTURE_STACK_TRACE_KEY = Symbol.for("VITEST_FIXTURE_STACK_TRACE");
class TestFixtures {
  _suiteContexts;
  _overrides = /* @__PURE__ */ new WeakMap();
  _registrations;
  static _definitions = [];
  static _builtinFixtures = [
    "task",
    "signal",
    "onTestFailed",
    "onTestFinished",
    "skip",
    "annotate"
  ];
  static _fixtureOptionKeys = [
    "auto",
    "injected",
    "scope"
  ];
  static _fixtureScopes = [
    "test",
    "file",
    "worker"
  ];
  static _workerContextSuite = { type: "worker" };
  static clearDefinitions() {
    TestFixtures._definitions.length = 0;
  }
  static getWorkerContexts() {
    return TestFixtures._definitions.map((f) => f.getWorkerContext());
  }
  static getFileContexts(file) {
    return TestFixtures._definitions.map((f) => f.getFileContext(file));
  }
  static isFixtureOptions(obj) {
    return isObject(obj) && Object.keys(obj).some((key) => TestFixtures._fixtureOptionKeys.includes(key));
  }
  constructor(registrations) {
    this._registrations = registrations ?? /* @__PURE__ */ new Map();
    this._suiteContexts = /* @__PURE__ */ new WeakMap();
    TestFixtures._definitions.push(this);
  }
  extend(runner2, userFixtures) {
    const { suite: suite2 } = getCurrentSuite();
    const isTopLevel = !suite2 || suite2.file === suite2;
    const registrations = this.parseUserFixtures(runner2, userFixtures, isTopLevel);
    return new TestFixtures(registrations);
  }
  get(suite2) {
    let currentSuite = suite2;
    while (currentSuite) {
      const overrides = this._overrides.get(currentSuite);
      if (overrides) {
        return overrides;
      }
      if (currentSuite === currentSuite.file) {
        break;
      }
      currentSuite = currentSuite.suite || currentSuite.file;
    }
    return this._registrations;
  }
  override(runner2, userFixtures) {
    const { suite: currentSuite, file } = getCurrentSuite();
    const suite2 = currentSuite || file;
    const isTopLevel = !currentSuite || currentSuite.file === currentSuite;
    const suiteRegistrations = new Map(this.get(suite2));
    const registrations = this.parseUserFixtures(runner2, userFixtures, isTopLevel, suiteRegistrations);
    if (isTopLevel) {
      this._registrations = registrations;
    } else {
      this._overrides.set(suite2, registrations);
    }
  }
  getFileContext(file) {
    if (!this._suiteContexts.has(file)) {
      this._suiteContexts.set(file, /* @__PURE__ */ Object.create(null));
    }
    return this._suiteContexts.get(file);
  }
  getWorkerContext() {
    if (!this._suiteContexts.has(TestFixtures._workerContextSuite)) {
      this._suiteContexts.set(TestFixtures._workerContextSuite, /* @__PURE__ */ Object.create(null));
    }
    return this._suiteContexts.get(TestFixtures._workerContextSuite);
  }
  parseUserFixtures(runner2, userFixtures, supportNonTest, registrations = new Map(this._registrations)) {
    const errors = [];
    Object.entries(userFixtures).forEach(([name, fn]) => {
      var _a;
      let options;
      let value;
      let _options;
      if (Array.isArray(fn) && fn.length >= 2 && TestFixtures.isFixtureOptions(fn[1])) {
        _options = fn[1];
        options = {
          auto: _options.auto ?? false,
          scope: _options.scope ?? "test",
          injected: _options.injected ?? false
        };
        value = options.injected ? ((_a = runner2.injectValue) == null ? void 0 : _a.call(runner2, name)) ?? fn[0] : fn[0];
      } else {
        value = fn;
      }
      const parent = registrations.get(name);
      if (parent && options) {
        if (parent.scope !== options.scope) {
          errors.push(new FixtureDependencyError(`The "${name}" fixture was already registered with a "${options.scope}" scope.`));
        }
        if (parent.auto !== options.auto) {
          errors.push(new FixtureDependencyError(`The "${name}" fixture was already registered as { auto: ${options.auto} }.`));
        }
      } else if (parent) {
        options = {
          auto: parent.auto,
          scope: parent.scope,
          injected: parent.injected
        };
      } else if (!options) {
        options = {
          auto: false,
          injected: false,
          scope: "test"
        };
      }
      if (options.scope && !TestFixtures._fixtureScopes.includes(options.scope)) {
        errors.push(new FixtureDependencyError(`The "${name}" fixture has unknown scope "${options.scope}".`));
      }
      if (!supportNonTest && options.scope !== "test") {
        errors.push(new FixtureDependencyError(`The "${name}" fixture cannot be defined with a ${options.scope} scope${!(_options == null ? void 0 : _options.scope) && (parent == null ? void 0 : parent.scope) ? " (inherited from the base fixture)" : ""} inside the describe block. Define it at the top level of the file instead.`));
      }
      const deps = isFixtureFunction(value) ? getUsedProps(value) : /* @__PURE__ */ new Set();
      const item = {
        name,
        value,
        auto: options.auto ?? false,
        injected: options.injected ?? false,
        scope: options.scope ?? "test",
        deps,
        parent
      };
      if (isFixtureFunction(value)) {
        Object.assign(value, { [FIXTURE_STACK_TRACE_KEY]: new Error("STACK_TRACE_ERROR") });
      }
      registrations.set(name, item);
      if (item.scope === "worker" && (runner2.pool === "vmThreads" || runner2.pool === "vmForks")) {
        item.scope = "file";
      }
    });
    for (const fixture of registrations.values()) {
      for (const depName of fixture.deps) {
        if (TestFixtures._builtinFixtures.includes(depName)) {
          continue;
        }
        const dep = registrations.get(depName);
        if (!dep) {
          errors.push(new FixtureDependencyError(`The "${fixture.name}" fixture depends on unknown fixture "${depName}".`));
          continue;
        }
        if (depName === fixture.name && !fixture.parent) {
          errors.push(new FixtureDependencyError(`The "${fixture.name}" fixture depends on itself, but does not have a base implementation.`));
          continue;
        }
        if (TestFixtures._fixtureScopes.indexOf(fixture.scope) > TestFixtures._fixtureScopes.indexOf(dep.scope)) {
          errors.push(new FixtureDependencyError(`The ${fixture.scope} "${fixture.name}" fixture cannot depend on a ${dep.scope} fixture "${dep.name}".`));
          continue;
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "Cannot resolve user fixtures. See errors for more information.");
    }
    return registrations;
  }
}
const cleanupFnArrayMap = /* @__PURE__ */ new WeakMap();
const contextHasFixturesCache = /* @__PURE__ */ new WeakMap();
function withFixtures(fn, options) {
  const collector = getCurrentSuite();
  const suite2 = (options == null ? void 0 : options.suite) || collector.suite || collector.file;
  return async (hookContext) => {
    var _a;
    const context = hookContext || (options == null ? void 0 : options.context);
    if (!context) {
      if (options == null ? void 0 : options.suiteHook) {
        validateSuiteHook(fn, options.suiteHook, options.stackTraceError);
      }
      return fn({});
    }
    const fixtures = (options == null ? void 0 : options.fixtures) || getTestFixtures(context);
    if (!fixtures) {
      return fn(context);
    }
    const registrations = fixtures.get(suite2);
    if (!registrations.size) {
      return fn(context);
    }
    const usedFixtures = [];
    const usedProps = getUsedProps(fn);
    for (const fixture of registrations.values()) {
      if (fixture.auto || usedProps.has(fixture.name)) {
        usedFixtures.push(fixture);
      }
    }
    if (!usedFixtures.length) {
      return fn(context);
    }
    if (!cleanupFnArrayMap.has(context)) {
      cleanupFnArrayMap.set(context, []);
    }
    const cleanupFnArray = cleanupFnArrayMap.get(context);
    const pendingFixtures = resolveDeps(usedFixtures, registrations);
    if (!pendingFixtures.length) {
      return fn(context);
    }
    if (options == null ? void 0 : options.suiteHook) {
      const testScopedFixtures = pendingFixtures.filter((f) => f.scope === "test");
      if (testScopedFixtures.length > 0) {
        const fixtureNames = testScopedFixtures.map((f) => `"${f.name}"`).join(", ");
        const alternativeHook = {
          aroundAll: "aroundEach",
          beforeAll: "beforeEach",
          afterAll: "afterEach"
        };
        const error = new FixtureDependencyError(`Test-scoped fixtures cannot be used inside ${options.suiteHook} hook. The following fixtures are test-scoped: ${fixtureNames}. Use { scope: 'file' } or { scope: 'worker' } fixtures instead, or move the logic to ${alternativeHook[options.suiteHook]} hook.`);
        if ((_a = options.stackTraceError) == null ? void 0 : _a.stack) {
          error.stack = error.message + options.stackTraceError.stack.replace(options.stackTraceError.message, "");
        }
        throw error;
      }
    }
    if (!contextHasFixturesCache.has(context)) {
      contextHasFixturesCache.set(context, /* @__PURE__ */ new WeakSet());
    }
    const cachedFixtures = contextHasFixturesCache.get(context);
    for (const fixture of pendingFixtures) {
      if (fixture.scope === "test") {
        if (cachedFixtures.has(fixture)) {
          continue;
        }
        cachedFixtures.add(fixture);
        const resolvedValue = await resolveTestFixtureValue(fixture, context, cleanupFnArray);
        context[fixture.name] = resolvedValue;
        cleanupFnArray.push(() => {
          cachedFixtures.delete(fixture);
        });
      } else {
        const resolvedValue = await resolveScopeFixtureValue(fixtures, suite2, fixture);
        context[fixture.name] = resolvedValue;
      }
    }
    return fn(context);
  };
}
function isFixtureFunction(value) {
  return typeof value === "function";
}
function resolveTestFixtureValue(fixture, context, cleanupFnArray) {
  if (!isFixtureFunction(fixture.value)) {
    return fixture.value;
  }
  return resolveFixtureFunction(fixture.value, fixture.name, context, cleanupFnArray);
}
const scopedFixturePromiseCache = /* @__PURE__ */ new WeakMap();
async function resolveScopeFixtureValue(fixtures, suite2, fixture) {
  const workerContext = fixtures.getWorkerContext();
  const fileContext = fixtures.getFileContext(suite2.file);
  const fixtureContext = fixture.scope === "worker" ? workerContext : fileContext;
  if (!isFixtureFunction(fixture.value)) {
    fixtureContext[fixture.name] = fixture.value;
    return fixture.value;
  }
  if (fixture.name in fixtureContext) {
    return fixtureContext[fixture.name];
  }
  if (scopedFixturePromiseCache.has(fixture)) {
    return scopedFixturePromiseCache.get(fixture);
  }
  if (!cleanupFnArrayMap.has(fixtureContext)) {
    cleanupFnArrayMap.set(fixtureContext, []);
  }
  const cleanupFnFileArray = cleanupFnArrayMap.get(fixtureContext);
  const promise = resolveFixtureFunction(fixture.value, fixture.name, fixture.scope === "file" ? {
    ...workerContext,
    ...fileContext
  } : fixtureContext, cleanupFnFileArray).then((value) => {
    fixtureContext[fixture.name] = value;
    scopedFixturePromiseCache.delete(fixture);
    return value;
  });
  scopedFixturePromiseCache.set(fixture, promise);
  return promise;
}
async function resolveFixtureFunction(fixtureFn, fixtureName, context, cleanupFnArray) {
  const useFnArgPromise = createDefer();
  const stackTraceError = FIXTURE_STACK_TRACE_KEY in fixtureFn && fixtureFn[FIXTURE_STACK_TRACE_KEY] instanceof Error ? fixtureFn[FIXTURE_STACK_TRACE_KEY] : void 0;
  let isUseFnArgResolved = false;
  const fixtureReturn = fixtureFn(context, async (useFnArg) => {
    isUseFnArgResolved = true;
    useFnArgPromise.resolve(useFnArg);
    const useReturnPromise = createDefer();
    cleanupFnArray.push(async () => {
      useReturnPromise.resolve();
      await fixtureReturn;
    });
    await useReturnPromise;
  }).then(() => {
    if (!isUseFnArgResolved) {
      const error = new Error(`Fixture "${fixtureName}" returned without calling "use". Make sure to call "use" in every code path of the fixture function.`);
      if (stackTraceError == null ? void 0 : stackTraceError.stack) {
        error.stack = error.message + stackTraceError.stack.replace(stackTraceError.message, "");
      }
      useFnArgPromise.reject(error);
    }
  }).catch((e) => {
    if (!isUseFnArgResolved) {
      useFnArgPromise.reject(e);
      return;
    }
    throw e;
  });
  return useFnArgPromise;
}
function resolveDeps(usedFixtures, registrations, depSet = /* @__PURE__ */ new Set(), pendingFixtures = []) {
  usedFixtures.forEach((fixture) => {
    if (pendingFixtures.includes(fixture)) {
      return;
    }
    if (!isFixtureFunction(fixture.value) || !fixture.deps) {
      pendingFixtures.push(fixture);
      return;
    }
    if (depSet.has(fixture)) {
      if (fixture.parent) {
        fixture = fixture.parent;
      } else {
        throw new Error(`Circular fixture dependency detected: ${fixture.name} <- ${[...depSet].reverse().map((d2) => d2.name).join(" <- ")}`);
      }
    }
    depSet.add(fixture);
    resolveDeps([...fixture.deps].map((n) => n === fixture.name ? fixture.parent : registrations.get(n)).filter((n) => !!n), registrations, depSet, pendingFixtures);
    pendingFixtures.push(fixture);
    depSet.clear();
  });
  return pendingFixtures;
}
function validateSuiteHook(fn, hook, suiteError) {
  var _a;
  const usedProps = getUsedProps(fn, {
    sourceError: suiteError,
    suiteHook: hook
  });
  if (usedProps.size) {
    const error = new FixtureAccessError(`The ${hook} hook uses fixtures "${[...usedProps].join('", "')}", but has no access to context. Did you forget to call it as "test.${hook}()" instead of "${hook}()"?
If you used internal "suite" task as the first argument previously, access it in the second argument instead. See https://vitest.dev/guide/test-context#suite-level-hooks`);
    if (suiteError) {
      error.stack = (_a = suiteError.stack) == null ? void 0 : _a.replace(suiteError.message, error.message);
    }
    throw error;
  }
}
const kPropsSymbol = Symbol("$vitest:fixture-props");
const kPropNamesSymbol = Symbol("$vitest:fixture-prop-names");
function configureProps(fn, options) {
  Object.defineProperty(fn, kPropsSymbol, {
    value: options,
    enumerable: false
  });
}
function memoProps(fn, props) {
  fn[kPropNamesSymbol] = props;
  return props;
}
function getUsedProps(fn, { sourceError, suiteHook } = {}) {
  var _a, _b;
  if (kPropNamesSymbol in fn) {
    return fn[kPropNamesSymbol];
  }
  const { index: fixturesIndex = 0, original: implementation = fn } = kPropsSymbol in fn ? fn[kPropsSymbol] : {};
  let fnString = filterOutComments(implementation.toString());
  if (/__async\((?:this|null), (?:null|arguments|\[[_0-9, ]*\]), function\*/.test(fnString)) {
    fnString = fnString.split(/__async\((?:this|null),/)[1];
  }
  const match = fnString.match(/[^(]*\(([^)]*)/);
  if (!match) {
    return memoProps(fn, /* @__PURE__ */ new Set());
  }
  const args = splitByComma(match[1]);
  if (!args.length) {
    return memoProps(fn, /* @__PURE__ */ new Set());
  }
  const fixturesArgument = args[fixturesIndex];
  if (!fixturesArgument) {
    return memoProps(fn, /* @__PURE__ */ new Set());
  }
  if (!(fixturesArgument[0] === "{" && fixturesArgument.endsWith("}"))) {
    const ordinalArgument = ordinal(fixturesIndex + 1);
    const error = new FixtureParseError(`The ${ordinalArgument} argument inside a fixture must use object destructuring pattern, e.g. ({ task } => {}). Instead, received "${fixturesArgument}".${suiteHook ? ` If you used internal "suite" task as the ${ordinalArgument} argument previously, access it in the ${ordinal(fixturesIndex + 2)} argument instead.` : ""}`);
    if (sourceError) {
      error.stack = (_a = sourceError.stack) == null ? void 0 : _a.replace(sourceError.message, error.message);
    }
    throw error;
  }
  const _first = fixturesArgument.slice(1, -1).replace(/\s/g, "");
  const props = splitByComma(_first).map((prop) => {
    return prop.replace(/:.*|=.*/g, "");
  });
  const last = props.at(-1);
  if (last && last.startsWith("...")) {
    const error = new FixtureParseError(`Rest parameters are not supported in fixtures, received "${last}".`);
    if (sourceError) {
      error.stack = (_b = sourceError.stack) == null ? void 0 : _b.replace(sourceError.message, error.message);
    }
    throw error;
  }
  return memoProps(fn, new Set(props));
}
function splitByComma(s) {
  const result = [];
  const stack = [];
  let start = 0;
  for (let i2 = 0; i2 < s.length; i2++) {
    if (s[i2] === "{" || s[i2] === "[") {
      stack.push(s[i2] === "{" ? "}" : "]");
    } else if (s[i2] === stack.at(-1)) {
      stack.pop();
    } else if (!stack.length && s[i2] === ",") {
      const token = s.substring(start, i2).trim();
      if (token) {
        result.push(token);
      }
      start = i2 + 1;
    }
  }
  const lastToken = s.substring(start).trim();
  if (lastToken) {
    result.push(lastToken);
  }
  return result;
}
const kChainableContext = Symbol("kChainableContext");
function getChainableContext(chainable) {
  return chainable == null ? void 0 : chainable[kChainableContext];
}
function createChainable(keys, fn, context) {
  function create(context2) {
    const chain2 = function(...args) {
      return fn.apply(context2, args);
    };
    Object.assign(chain2, fn);
    Object.defineProperty(chain2, kChainableContext, {
      value: {
        withContext: () => chain2.bind(context2),
        getFixtures: () => context2.fixtures,
        setContext: (key, value) => {
          context2[key] = value;
        },
        mergeContext: (ctx) => {
          Object.assign(context2, ctx);
        }
      },
      enumerable: false
    });
    for (const key of keys) {
      Object.defineProperty(chain2, key, { get() {
        return create({
          ...context2,
          [key]: true
        });
      } });
    }
    return chain2;
  }
  const chain = create(context ?? {});
  Object.defineProperty(chain, "fn", {
    value: fn,
    enumerable: false
  });
  return chain;
}
function getDefaultHookTimeout() {
  return getRunner().config.hookTimeout;
}
const CLEANUP_TIMEOUT_KEY = Symbol.for("VITEST_CLEANUP_TIMEOUT");
const CLEANUP_STACK_TRACE_KEY = Symbol.for("VITEST_CLEANUP_STACK_TRACE");
const AROUND_TIMEOUT_KEY = Symbol.for("VITEST_AROUND_TIMEOUT");
const AROUND_STACK_TRACE_KEY = Symbol.for("VITEST_AROUND_STACK_TRACE");
function beforeAll(fn, timeout = getDefaultHookTimeout()) {
  assertTypes(fn, '"beforeAll" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const context = getChainableContext(this);
  return getCurrentSuite().on("beforeAll", Object.assign(withTimeout(withSuiteFixtures("beforeAll", fn, context, stackTraceError), timeout, true, stackTraceError), {
    [CLEANUP_TIMEOUT_KEY]: timeout,
    [CLEANUP_STACK_TRACE_KEY]: stackTraceError
  }));
}
function afterAll(fn, timeout) {
  assertTypes(fn, '"afterAll" callback', ["function"]);
  const context = getChainableContext(this);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  return getCurrentSuite().on("afterAll", withTimeout(withSuiteFixtures("afterAll", fn, context, stackTraceError), timeout ?? getDefaultHookTimeout(), true, stackTraceError));
}
function beforeEach(fn, timeout = getDefaultHookTimeout()) {
  assertTypes(fn, '"beforeEach" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const wrapper = (context, suite2) => {
    const fixtureResolver = withFixtures(fn, { suite: suite2 });
    return fixtureResolver(context);
  };
  return getCurrentSuite().on("beforeEach", Object.assign(withTimeout(wrapper, timeout ?? getDefaultHookTimeout(), true, stackTraceError, abortIfTimeout), {
    [CLEANUP_TIMEOUT_KEY]: timeout,
    [CLEANUP_STACK_TRACE_KEY]: stackTraceError
  }));
}
function afterEach(fn, timeout) {
  assertTypes(fn, '"afterEach" callback', ["function"]);
  const wrapper = (context, suite2) => {
    const fixtureResolver = withFixtures(fn, { suite: suite2 });
    return fixtureResolver(context);
  };
  return getCurrentSuite().on("afterEach", withTimeout(wrapper, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
}
function aroundAll(fn, timeout) {
  assertTypes(fn, '"aroundAll" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const resolvedTimeout = timeout ?? getDefaultHookTimeout();
  const context = getChainableContext(this);
  return getCurrentSuite().on("aroundAll", Object.assign(withSuiteFixtures("aroundAll", fn, context, stackTraceError, 1), {
    [AROUND_TIMEOUT_KEY]: resolvedTimeout,
    [AROUND_STACK_TRACE_KEY]: stackTraceError
  }));
}
function aroundEach(fn, timeout) {
  assertTypes(fn, '"aroundEach" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const resolvedTimeout = timeout ?? getDefaultHookTimeout();
  const wrapper = (runTest, context, suite2) => {
    const innerFn = (ctx) => fn(runTest, ctx, suite2);
    configureProps(innerFn, {
      index: 1,
      original: fn
    });
    const fixtureResolver = withFixtures(innerFn, { suite: suite2 });
    return fixtureResolver(context);
  };
  return getCurrentSuite().on("aroundEach", Object.assign(wrapper, {
    [AROUND_TIMEOUT_KEY]: resolvedTimeout,
    [AROUND_STACK_TRACE_KEY]: stackTraceError
  }));
}
function withSuiteFixtures(suiteHook, fn, context, stackTraceError, contextIndex = 0) {
  return (...args) => {
    const suite2 = args.at(-1);
    const prefix = args.slice(0, -1);
    const wrapper = (ctx) => fn(...prefix, ctx, suite2);
    configureProps(wrapper, {
      index: contextIndex,
      original: fn
    });
    const fixtures = context == null ? void 0 : context.getFixtures();
    const fileContext = fixtures == null ? void 0 : fixtures.getFileContext(suite2.file);
    const fixtured = withFixtures(wrapper, {
      suiteHook,
      fixtures,
      context: fileContext,
      stackTraceError
    });
    return fixtured();
  };
}
// @__NO_SIDE_EFFECTS__
function generateHash(str) {
  let hash = 0;
  if (str.length === 0) {
    return `${hash}`;
  }
  for (let i2 = 0; i2 < str.length; i2++) {
    const char = str.charCodeAt(i2);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${hash}`;
}
// @__NO_SIDE_EFFECTS__
function generateFileHash(file, projectName) {
  return /* @__PURE__ */ generateHash(`${file}${projectName || ""}`);
}
function findTestFileStackTrace(testFilePath, error) {
  const lines = error.split("\n").slice(1);
  for (const line of lines) {
    const stack = parseSingleStack(line);
    if (stack && stack.file === testFilePath) {
      return stack;
    }
  }
}
function validateTags(config, tags) {
  if (!config.strictTags) {
    return;
  }
  const availableTags = new Set(config.tags.map((tag) => tag.name));
  for (const tag of tags) {
    if (!availableTags.has(tag)) {
      throw createNoTagsError(config.tags, tag);
    }
  }
}
function createNoTagsError(availableTags, tag, prefix = "tag") {
  if (!availableTags.length) {
    throw new Error(`The Vitest config does't define any "tags", cannot apply "${tag}" ${prefix} for this test. See: https://vitest.dev/guide/test-tags`);
  }
  throw new Error(`The ${prefix} "${tag}" is not defined in the configuration. Available tags are:
${availableTags.map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")}`);
}
function getNames(task) {
  const names = [task.name];
  let current = task;
  while (current == null ? void 0 : current.suite) {
    current = current.suite;
    if (current == null ? void 0 : current.name) {
      names.unshift(current.name);
    }
  }
  if (current !== task.file) {
    names.unshift(task.file.name);
  }
  return names;
}
function getTestName(task, separator = " > ") {
  return getNames(task).slice(1).join(separator);
}
function createTaskName(names, separator = " > ") {
  return names.filter((name) => name !== void 0).join(separator);
}
const suite = createSuite();
createTest(function(name, optionsOrFn, optionsOrTest) {
  getCurrentSuite().test.fn.call(this, formatName(name), optionsOrFn, optionsOrTest);
});
let runner;
let defaultSuite;
let currentTestFilepath;
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Vitest failed to find ${message}. One of the following is possible:
- "vitest" is imported directly without running "vitest" command
- "vitest" is imported inside "globalSetup" (to fix this, use "setupFiles" instead, because "globalSetup" runs in a different context)
- "vitest" is imported inside Vite / Vitest config file
- Otherwise, it might be a Vitest bug. Please report it to https://github.com/vitest-dev/vitest/issues
`);
  }
}
function getRunner() {
  assert(runner, "the runner");
  return runner;
}
function getCurrentSuite() {
  const currentSuite = collectorContext.currentSuite || defaultSuite;
  assert(currentSuite, "the current suite");
  return currentSuite;
}
function createSuiteHooks() {
  return {
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
    aroundEach: [],
    aroundAll: []
  };
}
const POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
function parseArguments(optionsOrFn, timeoutOrTest) {
  if (timeoutOrTest != null && typeof timeoutOrTest === "object") {
    throw new TypeError(`Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.`);
  }
  let options = {};
  let fn;
  if (typeof timeoutOrTest === "number") {
    options = { timeout: timeoutOrTest };
  } else if (typeof optionsOrFn === "object") {
    options = optionsOrFn;
  }
  if (typeof optionsOrFn === "function") {
    if (typeof timeoutOrTest === "function") {
      throw new TypeError("Cannot use two functions as arguments. Please use the second argument for options.");
    }
    fn = optionsOrFn;
  } else if (typeof timeoutOrTest === "function") {
    fn = timeoutOrTest;
  }
  return {
    options,
    handler: fn
  };
}
function createSuiteCollector(name, factory = () => {
}, mode, each, suiteOptions) {
  const tasks = [];
  let suite2;
  initSuite();
  const task = function(name2 = "", options = {}) {
    var _a, _b, _c, _d, _e;
    const currentSuite = (_a = collectorContext.currentSuite) == null ? void 0 : _a.suite;
    const parentTask = currentSuite ?? ((_b = collectorContext.currentSuite) == null ? void 0 : _b.file);
    const parentTags = (parentTask == null ? void 0 : parentTask.tags) || [];
    const testTags = unique([...parentTags, ...toArray(options.tags)]);
    const tagsOptions = testTags.map((tag) => {
      var _a2;
      const tagDefinition = (_a2 = runner.config.tags) == null ? void 0 : _a2.find((t) => t.name === tag);
      if (!tagDefinition && runner.config.strictTags) {
        throw createNoTagsError(runner.config.tags, tag);
      }
      return tagDefinition;
    }).filter((r) => r != null).sort((tag1, tag2) => (tag2.priority ?? POSITIVE_INFINITY) - (tag1.priority ?? POSITIVE_INFINITY)).reduce((acc, tag) => {
      const { name: name3, description, priority, meta, ...options2 } = tag;
      Object.assign(acc, options2);
      if (meta) {
        acc.meta = Object.assign(acc.meta ?? /* @__PURE__ */ Object.create(null), meta);
      }
      return acc;
    }, {});
    const testOwnMeta = options.meta;
    options = {
      ...tagsOptions,
      ...options
    };
    const timeout = options.timeout ?? runner.config.testTimeout;
    const parentMeta = currentSuite == null ? void 0 : currentSuite.meta;
    const tagMeta = tagsOptions.meta;
    const testMeta = /* @__PURE__ */ Object.create(null);
    if (tagMeta) {
      Object.assign(testMeta, tagMeta);
    }
    if (parentMeta) {
      Object.assign(testMeta, parentMeta);
    }
    if (testOwnMeta) {
      Object.assign(testMeta, testOwnMeta);
    }
    const task2 = {
      id: "",
      name: name2,
      fullName: createTaskName([(currentSuite == null ? void 0 : currentSuite.fullName) ?? ((_d = (_c = collectorContext.currentSuite) == null ? void 0 : _c.file) == null ? void 0 : _d.fullName), name2]),
      fullTestName: createTaskName([currentSuite == null ? void 0 : currentSuite.fullTestName, name2]),
      suite: currentSuite,
      each: options.each,
      fails: options.fails,
      context: void 0,
      type: "test",
      file: (currentSuite == null ? void 0 : currentSuite.file) ?? ((_e = collectorContext.currentSuite) == null ? void 0 : _e.file),
      timeout,
      retry: options.retry ?? runner.config.retry,
      repeats: options.repeats,
      mode: options.only ? "only" : options.skip ? "skip" : options.todo ? "todo" : "run",
      meta: testMeta,
      annotations: [],
      artifacts: [],
      tags: testTags
    };
    const handler = options.handler;
    if (task2.mode === "run" && !handler) {
      task2.mode = "todo";
    }
    if (options.concurrent || !options.sequential && runner.config.sequence.concurrent) {
      task2.concurrent = true;
    }
    task2.shuffle = suiteOptions == null ? void 0 : suiteOptions.shuffle;
    const context = createTestContext(task2, runner);
    Object.defineProperty(task2, "context", {
      value: context,
      enumerable: false
    });
    setTestFixture(context, options.fixtures ?? new TestFixtures());
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 10;
    const stackTraceError = new Error("STACK_TRACE_ERROR");
    Error.stackTraceLimit = limit;
    if (handler) {
      setFn(task2, withTimeout(withCancel(withAwaitAsyncAssertions(withFixtures(handler, { context }), task2), task2.context.signal), timeout, false, stackTraceError, (_, error) => abortIfTimeout([context], error)));
    }
    if (runner.config.includeTaskLocation) {
      const error = stackTraceError.stack;
      const stack = findTestFileStackTrace(currentTestFilepath, error);
      if (stack) {
        task2.location = {
          line: stack.line,
          column: stack.column
        };
      }
    }
    tasks.push(task2);
    return task2;
  };
  const test2 = createTest(function(name2, optionsOrFn, timeoutOrTest) {
    let { options, handler } = parseArguments(optionsOrFn, timeoutOrTest);
    if (typeof suiteOptions === "object") {
      options = Object.assign({}, suiteOptions, options);
    }
    const concurrent = this.concurrent ?? (!this.sequential && (options == null ? void 0 : options.concurrent));
    if (options.concurrent != null && concurrent != null) {
      options.concurrent = concurrent;
    }
    const sequential = this.sequential ?? (!this.concurrent && (options == null ? void 0 : options.sequential));
    if (options.sequential != null && sequential != null) {
      options.sequential = sequential;
    }
    const test3 = task(formatName(name2), {
      ...this,
      ...options,
      handler
    });
    test3.type = "test";
  });
  const collector = {
    type: "collector",
    name,
    mode,
    suite: suite2,
    options: suiteOptions,
    test: test2,
    file: suite2.file,
    tasks,
    collect,
    task,
    clear,
    on: addHook
  };
  function addHook(name2, ...fn) {
    getHooks(suite2)[name2].push(...fn);
  }
  function initSuite(includeLocation) {
    var _a, _b, _c, _d, _e;
    if (typeof suiteOptions === "number") {
      suiteOptions = { timeout: suiteOptions };
    }
    const currentSuite = (_a = collectorContext.currentSuite) == null ? void 0 : _a.suite;
    const parentTask = currentSuite ?? ((_b = collectorContext.currentSuite) == null ? void 0 : _b.file);
    const suiteTags = toArray(suiteOptions == null ? void 0 : suiteOptions.tags);
    validateTags(runner.config, suiteTags);
    suite2 = {
      id: "",
      type: "suite",
      name,
      fullName: createTaskName([(currentSuite == null ? void 0 : currentSuite.fullName) ?? ((_d = (_c = collectorContext.currentSuite) == null ? void 0 : _c.file) == null ? void 0 : _d.fullName), name]),
      fullTestName: createTaskName([currentSuite == null ? void 0 : currentSuite.fullTestName, name]),
      suite: currentSuite,
      mode,
      each,
      file: (currentSuite == null ? void 0 : currentSuite.file) ?? ((_e = collectorContext.currentSuite) == null ? void 0 : _e.file),
      shuffle: suiteOptions == null ? void 0 : suiteOptions.shuffle,
      tasks: [],
      meta: (suiteOptions == null ? void 0 : suiteOptions.meta) ?? /* @__PURE__ */ Object.create(null),
      concurrent: suiteOptions == null ? void 0 : suiteOptions.concurrent,
      tags: unique([...(parentTask == null ? void 0 : parentTask.tags) || [], ...suiteTags])
    };
    setHooks(suite2, createSuiteHooks());
  }
  function clear() {
    tasks.length = 0;
    initSuite();
  }
  async function collect(file) {
    if (!file) {
      throw new TypeError("File is required to collect tasks.");
    }
    if (factory) {
      await runWithSuite(collector, () => factory(test2));
    }
    const allChildren = [];
    for (const i2 of tasks) {
      allChildren.push(i2.type === "collector" ? await i2.collect(file) : i2);
    }
    suite2.tasks = allChildren;
    return suite2;
  }
  collectTask(collector);
  return collector;
}
function withAwaitAsyncAssertions(fn, task) {
  return (async (...args) => {
    const fnResult = await fn(...args);
    if (task.promises) {
      const result = await Promise.allSettled(task.promises);
      const errors = result.map((r) => r.status === "rejected" ? r.reason : void 0).filter(Boolean);
      if (errors.length) {
        throw errors;
      }
    }
    return fnResult;
  });
}
function createSuite() {
  function suiteFn(name, factoryOrOptions, optionsOrFactory) {
    var _a;
    const currentSuite = collectorContext.currentSuite || defaultSuite;
    let { options, handler: factory } = parseArguments(factoryOrOptions, optionsOrFactory);
    const isConcurrentSpecified = options.concurrent || this.concurrent || options.sequential === false;
    const isSequentialSpecified = options.sequential || this.sequential || options.concurrent === false;
    const { meta: parentMeta, ...parentOptions } = (currentSuite == null ? void 0 : currentSuite.options) || {};
    options = {
      ...parentOptions,
      ...options
    };
    const shuffle = this.shuffle ?? options.shuffle ?? ((_a = currentSuite == null ? void 0 : currentSuite.options) == null ? void 0 : _a.shuffle) ?? (runner == null ? void 0 : runner.config.sequence.shuffle);
    if (shuffle != null) {
      options.shuffle = shuffle;
    }
    let mode = this.only ?? options.only ? "only" : this.skip ?? options.skip ? "skip" : this.todo ?? options.todo ? "todo" : "run";
    if (mode === "run" && !factory) {
      mode = "todo";
    }
    const isConcurrent = isConcurrentSpecified || options.concurrent && !isSequentialSpecified;
    const isSequential = isSequentialSpecified || options.sequential && !isConcurrentSpecified;
    if (isConcurrent != null) {
      options.concurrent = isConcurrent && !isSequential;
    }
    if (isSequential != null) {
      options.sequential = isSequential && !isConcurrent;
    }
    if (parentMeta) {
      options.meta = Object.assign(/* @__PURE__ */ Object.create(null), parentMeta, options.meta);
    }
    return createSuiteCollector(formatName(name), factory, mode, this.each, options);
  }
  suiteFn.each = function(cases, ...args) {
    const context = getChainableContext(this);
    const suite2 = context.withContext();
    context.setContext("each", true);
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const _name = formatName(name);
      const arrayOnlyCases = cases.every(Array.isArray);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      const fnFirst = typeof optionsOrFn === "function";
      cases.forEach((i2, idx) => {
        const items = Array.isArray(i2) ? i2 : [i2];
        if (fnFirst) {
          if (arrayOnlyCases) {
            suite2(formatTitle(_name, items, idx), handler ? () => handler(...items) : void 0, options.timeout);
          } else {
            suite2(formatTitle(_name, items, idx), handler ? () => handler(i2) : void 0, options.timeout);
          }
        } else {
          if (arrayOnlyCases) {
            suite2(formatTitle(_name, items, idx), options, handler ? () => handler(...items) : void 0);
          } else {
            suite2(formatTitle(_name, items, idx), options, handler ? () => handler(i2) : void 0);
          }
        }
      });
      context.setContext("each", void 0);
    };
  };
  suiteFn.for = function(cases, ...args) {
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const name_ = formatName(name);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      cases.forEach((item, idx) => {
        suite(formatTitle(name_, toArray(item), idx), options, handler ? () => handler(item) : void 0);
      });
    };
  };
  suiteFn.skipIf = (condition) => condition ? suite.skip : suite;
  suiteFn.runIf = (condition) => condition ? suite : suite.skip;
  return createChainable([
    "concurrent",
    "sequential",
    "shuffle",
    "skip",
    "only",
    "todo"
  ], suiteFn);
}
function createTaskCollector(fn) {
  const taskFn = fn;
  taskFn.each = function(cases, ...args) {
    const context = getChainableContext(this);
    const test2 = context.withContext();
    context.setContext("each", true);
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const _name = formatName(name);
      const arrayOnlyCases = cases.every(Array.isArray);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      const fnFirst = typeof optionsOrFn === "function";
      cases.forEach((i2, idx) => {
        const items = Array.isArray(i2) ? i2 : [i2];
        if (fnFirst) {
          if (arrayOnlyCases) {
            test2(formatTitle(_name, items, idx), handler ? () => handler(...items) : void 0, options.timeout);
          } else {
            test2(formatTitle(_name, items, idx), handler ? () => handler(i2) : void 0, options.timeout);
          }
        } else {
          if (arrayOnlyCases) {
            test2(formatTitle(_name, items, idx), options, handler ? () => handler(...items) : void 0);
          } else {
            test2(formatTitle(_name, items, idx), options, handler ? () => handler(i2) : void 0);
          }
        }
      });
      context.setContext("each", void 0);
    };
  };
  taskFn.for = function(cases, ...args) {
    const context = getChainableContext(this);
    const test2 = context.withContext();
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const _name = formatName(name);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      cases.forEach((item, idx) => {
        const handlerWrapper = handler ? (ctx) => handler(item, ctx) : void 0;
        if (handlerWrapper) {
          configureProps(handlerWrapper, {
            index: 1,
            original: handler
          });
        }
        test2(formatTitle(_name, toArray(item), idx), options, handlerWrapper);
      });
    };
  };
  taskFn.skipIf = function(condition) {
    return condition ? this.skip : this;
  };
  taskFn.runIf = function(condition) {
    return condition ? this : this.skip;
  };
  function parseBuilderFixtures(fixturesOrName, optionsOrFn, maybeFn) {
    if (typeof fixturesOrName !== "string") {
      return fixturesOrName;
    }
    const fixtureName = fixturesOrName;
    let fixtureOptions;
    let fixtureValue;
    if (maybeFn !== void 0) {
      fixtureOptions = optionsOrFn;
      fixtureValue = maybeFn;
    } else {
      if (optionsOrFn !== null && typeof optionsOrFn === "object" && !Array.isArray(optionsOrFn) && TestFixtures.isFixtureOptions(optionsOrFn)) {
        fixtureOptions = optionsOrFn;
        fixtureValue = {};
      } else {
        fixtureOptions = void 0;
        fixtureValue = optionsOrFn;
      }
    }
    if (typeof fixtureValue === "function") {
      const builderFn = fixtureValue;
      const fixture = async (ctx, use) => {
        let cleanup;
        const onCleanup = (fn2) => {
          if (cleanup !== void 0) {
            throw new Error(`onCleanup can only be called once per fixture. Define separate fixtures if you need multiple cleanup functions.`);
          }
          cleanup = fn2;
        };
        const value = await builderFn(ctx, { onCleanup });
        await use(value);
        if (cleanup) {
          await cleanup();
        }
      };
      configureProps(fixture, { original: builderFn });
      if (fixtureOptions) {
        return { [fixtureName]: [fixture, fixtureOptions] };
      }
      return { [fixtureName]: fixture };
    }
    if (fixtureOptions) {
      return { [fixtureName]: [fixtureValue, fixtureOptions] };
    }
    return { [fixtureName]: fixtureValue };
  }
  taskFn.override = function(fixturesOrName, optionsOrFn, maybeFn) {
    const userFixtures = parseBuilderFixtures(fixturesOrName, optionsOrFn, maybeFn);
    getChainableContext(this).getFixtures().override(runner, userFixtures);
    return this;
  };
  taskFn.scoped = function(fixtures) {
    console.warn(`test.scoped() is deprecated and will be removed in future versions. Please use test.override() instead.`);
    return this.override(fixtures);
  };
  taskFn.extend = function(fixturesOrName, optionsOrFn, maybeFn) {
    const userFixtures = parseBuilderFixtures(fixturesOrName, optionsOrFn, maybeFn);
    const fixtures = getChainableContext(this).getFixtures().extend(runner, userFixtures);
    const _test2 = createTest(function(name, optionsOrFn2, optionsOrTest) {
      fn.call(this, formatName(name), optionsOrFn2, optionsOrTest);
    });
    getChainableContext(_test2).mergeContext({ fixtures });
    return _test2;
  };
  taskFn.describe = suite;
  taskFn.suite = suite;
  taskFn.beforeEach = beforeEach;
  taskFn.afterEach = afterEach;
  taskFn.beforeAll = beforeAll;
  taskFn.afterAll = afterAll;
  taskFn.aroundEach = aroundEach;
  taskFn.aroundAll = aroundAll;
  const _test = createChainable([
    "concurrent",
    "sequential",
    "skip",
    "only",
    "todo",
    "fails"
  ], taskFn, { fixtures: new TestFixtures() });
  return _test;
}
function createTest(fn) {
  return createTaskCollector(fn);
}
function formatName(name) {
  return typeof name === "string" ? name : typeof name === "function" ? name.name || "<anonymous>" : String(name);
}
function formatTitle(template, items, idx) {
  if (template.includes("%#") || template.includes("%$")) {
    template = template.replace(/%%/g, "__vitest_escaped_%__").replace(/%#/g, `${idx}`).replace(/%\$/g, `${idx + 1}`).replace(/__vitest_escaped_%__/g, "%%");
  }
  const count = template.split("%").length - 1;
  if (template.includes("%f")) {
    const placeholders = template.match(/%f/g) || [];
    placeholders.forEach((_, i3) => {
      if (isNegativeNaN(items[i3]) || Object.is(items[i3], -0)) {
        let occurrence = 0;
        template = template.replace(/%f/g, (match) => {
          occurrence++;
          return occurrence === i3 + 1 ? "-%f" : match;
        });
      }
    });
  }
  const isObjectItem = isObject(items[0]);
  function formatAttribute(s) {
    return s.replace(/\$([$\w.]+)/g, (_, key) => {
      var _a, _b;
      const isArrayKey = /^\d+$/.test(key);
      if (!isObjectItem && !isArrayKey) {
        return `$${key}`;
      }
      const arrayElement = isArrayKey ? objectAttr(items, key) : void 0;
      const value = isObjectItem ? objectAttr(items[0], key, arrayElement) : arrayElement;
      return objDisplay(value, { truncate: (_b = (_a = runner == null ? void 0 : runner.config) == null ? void 0 : _a.chaiConfig) == null ? void 0 : _b.truncateThreshold });
    });
  }
  let output = "";
  let i2 = 0;
  handleRegexMatch(
    template,
    formatRegExp,
    // format "%"
    (match) => {
      if (i2 < count) {
        output += format(match[0], items[i2++]);
      } else {
        output += match[0];
      }
    },
    // format "$"
    (nonMatch) => {
      output += formatAttribute(nonMatch);
    }
  );
  return output;
}
function handleRegexMatch(input, regex, onMatch, onNonMatch) {
  let lastIndex = 0;
  for (const m of input.matchAll(regex)) {
    if (lastIndex < m.index) {
      onNonMatch(input.slice(lastIndex, m.index));
    }
    onMatch(m);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < input.length) {
    onNonMatch(input.slice(lastIndex));
  }
}
function formatTemplateString(cases, args) {
  const header = cases.join("").trim().replace(/ /g, "").split("\n").map((i2) => i2.split("|"))[0];
  const res = [];
  for (let i2 = 0; i2 < Math.floor(args.length / header.length); i2++) {
    const oneCase = {};
    for (let j = 0; j < header.length; j++) {
      oneCase[header[j]] = args[i2 * header.length + j];
    }
    res.push(oneCase);
  }
  return res;
}
const now$2 = globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
const collectorContext = {
  currentSuite: null
};
function collectTask(task) {
  var _a;
  (_a = collectorContext.currentSuite) == null ? void 0 : _a.tasks.push(task);
}
async function runWithSuite(suite2, fn) {
  const prev = collectorContext.currentSuite;
  collectorContext.currentSuite = suite2;
  await fn();
  collectorContext.currentSuite = prev;
}
function withTimeout(fn, timeout, isHook = false, stackTraceError, onTimeout) {
  if (timeout <= 0 || timeout === Number.POSITIVE_INFINITY) {
    return fn;
  }
  const { setTimeout, clearTimeout } = getSafeTimers();
  return (function runWithTimeout(...args) {
    const startTime = now$2();
    const runner2 = getRunner();
    runner2._currentTaskStartTime = startTime;
    runner2._currentTaskTimeout = timeout;
    return new Promise((resolve_, reject_) => {
      var _a;
      const timer = setTimeout(() => {
        clearTimeout(timer);
        rejectTimeoutError();
      }, timeout);
      (_a = timer.unref) == null ? void 0 : _a.call(timer);
      function rejectTimeoutError() {
        const error = makeTimeoutError(isHook, timeout, stackTraceError);
        onTimeout == null ? void 0 : onTimeout(args, error);
        reject_(error);
      }
      function resolve2(result) {
        runner2._currentTaskStartTime = void 0;
        runner2._currentTaskTimeout = void 0;
        clearTimeout(timer);
        if (now$2() - startTime >= timeout) {
          rejectTimeoutError();
          return;
        }
        resolve_(result);
      }
      function reject(error) {
        runner2._currentTaskStartTime = void 0;
        runner2._currentTaskTimeout = void 0;
        clearTimeout(timer);
        reject_(error);
      }
      try {
        const result = fn(...args);
        if (typeof result === "object" && result != null && typeof result.then === "function") {
          result.then(resolve2, reject);
        } else {
          resolve2(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}
function withCancel(fn, signal) {
  return (function runWithCancel(...args) {
    return new Promise((resolve2, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason));
      try {
        const result = fn(...args);
        if (typeof result === "object" && result != null && typeof result.then === "function") {
          result.then(resolve2, reject);
        } else {
          resolve2(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}
const abortControllers = /* @__PURE__ */ new WeakMap();
function abortIfTimeout([context], error) {
  if (context) {
    abortContextSignal(context, error);
  }
}
function abortContextSignal(context, error) {
  const abortController = abortControllers.get(context);
  abortController == null ? void 0 : abortController.abort(error);
}
function createTestContext(test2, runner2) {
  var _a;
  const context = function() {
    throw new Error("done() callback is deprecated, use promise instead");
  };
  let abortController = abortControllers.get(context);
  if (!abortController) {
    abortController = new AbortController();
    abortControllers.set(context, abortController);
  }
  context.signal = abortController.signal;
  context.task = test2;
  context.skip = (condition, note) => {
    if (condition === false) {
      return void 0;
    }
    test2.result ?? (test2.result = { state: "skip" });
    test2.result.pending = true;
    throw new PendingError("test is skipped; abort execution", test2, typeof condition === "string" ? condition : note);
  };
  context.annotate = ((message, type, attachment) => {
    if (test2.result && test2.result.state !== "run") {
      throw new Error(`Cannot annotate tests outside of the test run. The test "${test2.name}" finished running with the "${test2.result.state}" state already.`);
    }
    const annotation = {
      message,
      type: typeof type === "object" || type === void 0 ? "notice" : type
    };
    const annotationAttachment = typeof type === "object" ? type : attachment;
    if (annotationAttachment) {
      annotation.attachment = annotationAttachment;
      manageArtifactAttachment(annotation.attachment);
    }
    return recordAsyncOperation(test2, recordArtifact(test2, {
      type: "internal:annotation",
      annotation
    }).then(async ({ annotation: annotation2 }) => {
      if (!runner2.onTestAnnotate) {
        throw new Error(`Test runner doesn't support test annotations.`);
      }
      await finishSendTasksUpdate(runner2);
      const resolvedAnnotation = await runner2.onTestAnnotate(test2, annotation2);
      test2.annotations.push(resolvedAnnotation);
      return resolvedAnnotation;
    }));
  });
  context.onTestFailed = (handler, timeout) => {
    test2.onFailed || (test2.onFailed = []);
    test2.onFailed.push(withTimeout(handler, timeout ?? runner2.config.hookTimeout, true, new Error("STACK_TRACE_ERROR"), (_, error) => abortController.abort(error)));
  };
  context.onTestFinished = (handler, timeout) => {
    test2.onFinished || (test2.onFinished = []);
    test2.onFinished.push(withTimeout(handler, timeout ?? runner2.config.hookTimeout, true, new Error("STACK_TRACE_ERROR"), (_, error) => abortController.abort(error)));
  };
  return ((_a = runner2.extendTaskContext) == null ? void 0 : _a.call(runner2, context)) || context;
}
function makeTimeoutError(isHook, timeout, stackTraceError) {
  const message = `${isHook ? "Hook" : "Test"} timed out in ${timeout}ms.
If this is a long-running ${isHook ? "hook" : "test"}, pass a timeout value as the last argument or configure it globally with "${isHook ? "hookTimeout" : "testTimeout"}".`;
  const error = new Error(message);
  if (stackTraceError == null ? void 0 : stackTraceError.stack) {
    error.stack = stackTraceError.stack.replace(error.message, stackTraceError.message);
  }
  return error;
}
globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
getSafeTimers();
const packs = /* @__PURE__ */ new Map();
const eventsPacks = [];
const pendingTasksUpdates = [];
function sendTasksUpdate(runner2) {
  var _a;
  if (packs.size) {
    const taskPacks = Array.from(packs).map(([id, task]) => {
      return [
        id,
        task[0],
        task[1]
      ];
    });
    const p = (_a = runner2.onTaskUpdate) == null ? void 0 : _a.call(runner2, taskPacks, eventsPacks);
    if (p) {
      pendingTasksUpdates.push(p);
      p.then(() => pendingTasksUpdates.splice(pendingTasksUpdates.indexOf(p), 1), () => {
      });
    }
    eventsPacks.length = 0;
    packs.clear();
  }
}
async function finishSendTasksUpdate(runner2) {
  sendTasksUpdate(runner2);
  await Promise.all(pendingTasksUpdates);
}
async function recordArtifact(task, artifact) {
  const runner2 = getRunner();
  const stack = findTestFileStackTrace(task.file.filepath, new Error("STACK_TRACE").stack);
  if (stack) {
    artifact.location = {
      file: stack.file,
      line: stack.line,
      column: stack.column
    };
    if (artifact.type === "internal:annotation") {
      artifact.annotation.location = artifact.location;
    }
  }
  if (Array.isArray(artifact.attachments)) {
    for (const attachment of artifact.attachments) {
      manageArtifactAttachment(attachment);
    }
  }
  if (artifact.type === "internal:annotation") {
    return artifact;
  }
  if (!runner2.onTestArtifactRecord) {
    throw new Error(`Test runner doesn't support test artifacts.`);
  }
  await finishSendTasksUpdate(runner2);
  const resolvedArtifact = await runner2.onTestArtifactRecord(task, artifact);
  task.artifacts.push(resolvedArtifact);
  return resolvedArtifact;
}
const table = [];
for (let i2 = 65; i2 < 91; i2++) {
  table.push(String.fromCharCode(i2));
}
for (let i2 = 97; i2 < 123; i2++) {
  table.push(String.fromCharCode(i2));
}
for (let i2 = 0; i2 < 10; i2++) {
  table.push(i2.toString(10));
}
table.push("+", "/");
function encodeUint8Array(bytes) {
  let base64 = "";
  const len = bytes.byteLength;
  for (let i2 = 0; i2 < len; i2 += 3) {
    if (len === i2 + 1) {
      const a = (bytes[i2] & 252) >> 2;
      const b2 = (bytes[i2] & 3) << 4;
      base64 += table[a];
      base64 += table[b2];
      base64 += "==";
    } else if (len === i2 + 2) {
      const a = (bytes[i2] & 252) >> 2;
      const b2 = (bytes[i2] & 3) << 4 | (bytes[i2 + 1] & 240) >> 4;
      const c = (bytes[i2 + 1] & 15) << 2;
      base64 += table[a];
      base64 += table[b2];
      base64 += table[c];
      base64 += "=";
    } else {
      const a = (bytes[i2] & 252) >> 2;
      const b2 = (bytes[i2] & 3) << 4 | (bytes[i2 + 1] & 240) >> 4;
      const c = (bytes[i2 + 1] & 15) << 2 | (bytes[i2 + 2] & 192) >> 6;
      const d2 = bytes[i2 + 2] & 63;
      base64 += table[a];
      base64 += table[b2];
      base64 += table[c];
      base64 += table[d2];
    }
  }
  return base64;
}
function recordAsyncOperation(test2, promise) {
  promise = promise.finally(() => {
    if (!test2.promises) {
      return;
    }
    const index2 = test2.promises.indexOf(promise);
    if (index2 !== -1) {
      test2.promises.splice(index2, 1);
    }
  });
  if (!test2.promises) {
    test2.promises = [];
  }
  test2.promises.push(promise);
  return promise;
}
function manageArtifactAttachment(attachment) {
  if (attachment.body == null && !attachment.path) {
    throw new TypeError(`Test attachment requires "body" or "path" to be set. Both are missing.`);
  }
  if (attachment.body && attachment.path) {
    throw new TypeError(`Test attachment requires only one of "body" or "path" to be set. Both are specified.`);
  }
  if (attachment.body instanceof Uint8Array) {
    attachment.body = encodeUint8Array(attachment.body);
  }
}
async function importId(id) {
  const name = `/@id/${id}`.replace(/\\/g, "/");
  return (/* @__PURE__ */ getBrowserState()).wrapModule(() => import(
    /* @vite-ignore */
    name
  ));
}
async function importFs(id) {
  const name = `/@fs/${id}`.replace(/\\/g, "/");
  return (/* @__PURE__ */ getBrowserState()).wrapModule(() => import(
    /* @vite-ignore */
    name
  ));
}
const moduleRunner = {
  isBrowser: true,
  import: (id) => {
    if (id[0] === "/" || id[1] === ":") {
      return importFs(id);
    }
    return importId(id);
  }
};
function getConfig() {
  return (/* @__PURE__ */ getBrowserState()).config;
}
// @__NO_SIDE_EFFECTS__
function getBrowserState() {
  return window.__vitest_browser_runner__;
}
// @__NO_SIDE_EFFECTS__
function getWorkerState() {
  const state = window.__vitest_worker__;
  if (!state) {
    throw new Error("Worker state is not found. This is an issue with Vitest. Please, open an issue.");
  }
  return state;
}
export {
  getConfig as a,
  generateFileHash as b,
  resolve as c,
  getWorkerState as d,
  getTestName as e,
  getBrowserState as g,
  moduleRunner as m,
  relative as r
};
