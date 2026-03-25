// ../node_modules/tinyrainbow/dist/chunk-BVHSVHOK.js
var f = {
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
}, h = Object.entries(f);
function a(n) {
  return String(n);
}
a.open = "";
a.close = "";
var B = h.reduce(
  (n, [e]) => (n[e] = a, n),
  { isColorSupported: !1 }
);
function C(n = !1) {
  let e = typeof process < "u" ? process : void 0, i = e?.env || {}, g = e?.argv || [];
  return !("NO_COLOR" in i || g.includes("--no-color")) && ("FORCE_COLOR" in i || g.includes("--color") || e?.platform === "win32" || n && i.TERM !== "dumb" || "CI" in i) || typeof window < "u" && !!window.chrome;
}
function p(n = !1) {
  let e = C(n), i = (r, t, c, o) => {
    let l = "", s2 = 0;
    do
      l += r.substring(s2, o) + c, s2 = o + t.length, o = r.indexOf(t, s2);
    while (~o);
    return l + r.substring(s2);
  }, g = (r, t, c = r) => {
    let o = (l) => {
      let s2 = String(l), b = s2.indexOf(t, r.length);
      return ~b ? r + i(s2, t, c, b) + t : r + s2 + t;
    };
    return o.open = r, o.close = t, o;
  }, u = {
    isColorSupported: e
  }, d = (r) => `\x1B[${r}m`;
  for (let [r, t] of h)
    u[r] = e ? g(
      d(t[0]),
      d(t[1]),
      t[2]
    ) : a;
  return u;
}

// ../node_modules/tinyrainbow/dist/browser.js
var s = p();

// ../node_modules/@vitest/pretty-format/dist/index.js
function _mergeNamespaces(n, m2) {
  return m2.forEach(function(e) {
    e && typeof e != "string" && !Array.isArray(e) && Object.keys(e).forEach(function(k) {
      if (k !== "default" && !(k in n)) {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: !0,
          get: function() {
            return e[k];
          }
        });
      }
    });
  }), Object.freeze(n);
}
function getKeysOfEnumerableProperties(object, compareKeys) {
  let rawKeys = Object.keys(object), keys = compareKeys === null ? rawKeys : rawKeys.sort(compareKeys);
  if (Object.getOwnPropertySymbols)
    for (let symbol of Object.getOwnPropertySymbols(object))
      Object.getOwnPropertyDescriptor(object, symbol).enumerable && keys.push(symbol);
  return keys;
}
function printIteratorEntries(iterator, config, indentation, depth, refs, printer2, separator = ": ") {
  let result = "", width = 0, current = iterator.next();
  if (!current.done) {
    result += config.spacingOuter;
    let indentationNext = indentation + config.indent;
    for (; !current.done; ) {
      if (result += indentationNext, width++ === config.maxWidth) {
        result += "\u2026";
        break;
      }
      let name = printer2(current.value[0], config, indentationNext, depth, refs), value = printer2(current.value[1], config, indentationNext, depth, refs);
      result += name + separator + value, current = iterator.next(), current.done ? config.min || (result += ",") : result += `,${config.spacingInner}`;
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printIteratorValues(iterator, config, indentation, depth, refs, printer2) {
  let result = "", width = 0, current = iterator.next();
  if (!current.done) {
    result += config.spacingOuter;
    let indentationNext = indentation + config.indent;
    for (; !current.done; ) {
      if (result += indentationNext, width++ === config.maxWidth) {
        result += "\u2026";
        break;
      }
      result += printer2(current.value, config, indentationNext, depth, refs), current = iterator.next(), current.done ? config.min || (result += ",") : result += `,${config.spacingInner}`;
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printListItems(list, config, indentation, depth, refs, printer2) {
  let result = "";
  list = list instanceof ArrayBuffer ? new DataView(list) : list;
  let isDataView = (l) => l instanceof DataView, length = isDataView(list) ? list.byteLength : list.length;
  if (length > 0) {
    result += config.spacingOuter;
    let indentationNext = indentation + config.indent;
    for (let i = 0; i < length; i++) {
      if (result += indentationNext, i === config.maxWidth) {
        result += "\u2026";
        break;
      }
      (isDataView(list) || i in list) && (result += printer2(isDataView(list) ? list.getInt8(i) : list[i], config, indentationNext, depth, refs)), i < length - 1 ? result += `,${config.spacingInner}` : config.min || (result += ",");
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printObjectProperties(val, config, indentation, depth, refs, printer2) {
  let result = "", keys = getKeysOfEnumerableProperties(val, config.compareKeys);
  if (keys.length > 0) {
    result += config.spacingOuter;
    let indentationNext = indentation + config.indent;
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i], name = printer2(key, config, indentationNext, depth, refs), value = printer2(val[key], config, indentationNext, depth, refs);
      result += `${indentationNext + name}: ${value}`, i < keys.length - 1 ? result += `,${config.spacingInner}` : config.min || (result += ",");
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
var asymmetricMatcher = typeof Symbol == "function" && Symbol.for ? Symbol.for("jest.asymmetricMatcher") : 1267621, SPACE$2 = " ", serialize$5 = (val, config, indentation, depth, refs, printer2) => {
  let stringedValue = val.toString();
  if (stringedValue === "ArrayContaining" || stringedValue === "ArrayNotContaining")
    return ++depth > config.maxDepth ? `[${stringedValue}]` : `${stringedValue + SPACE$2}[${printListItems(val.sample, config, indentation, depth, refs, printer2)}]`;
  if (stringedValue === "ObjectContaining" || stringedValue === "ObjectNotContaining")
    return ++depth > config.maxDepth ? `[${stringedValue}]` : `${stringedValue + SPACE$2}{${printObjectProperties(val.sample, config, indentation, depth, refs, printer2)}}`;
  if (stringedValue === "StringMatching" || stringedValue === "StringNotMatching" || stringedValue === "StringContaining" || stringedValue === "StringNotContaining")
    return stringedValue + SPACE$2 + printer2(val.sample, config, indentation, depth, refs);
  if (typeof val.toAsymmetricMatcher != "function")
    throw new TypeError(`Asymmetric matcher ${val.constructor.name} does not implement toAsymmetricMatcher()`);
  return val.toAsymmetricMatcher();
}, test$5 = (val) => val && val.$$typeof === asymmetricMatcher, plugin$5 = {
  serialize: serialize$5,
  test: test$5
}, SPACE$1 = " ", OBJECT_NAMES = /* @__PURE__ */ new Set(["DOMStringMap", "NamedNodeMap"]), ARRAY_REGEXP = /^(?:HTML\w*Collection|NodeList)$/;
function testName(name) {
  return OBJECT_NAMES.has(name) || ARRAY_REGEXP.test(name);
}
var test$4 = (val) => val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
function isNamedNodeMap(collection) {
  return collection.constructor.name === "NamedNodeMap";
}
var serialize$4 = (collection, config, indentation, depth, refs, printer2) => {
  let name = collection.constructor.name;
  return ++depth > config.maxDepth ? `[${name}]` : (config.min ? "" : name + SPACE$1) + (OBJECT_NAMES.has(name) ? `{${printObjectProperties(isNamedNodeMap(collection) ? [...collection].reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}) : { ...collection }, config, indentation, depth, refs, printer2)}}` : `[${printListItems([...collection], config, indentation, depth, refs, printer2)}]`);
}, plugin$4 = {
  serialize: serialize$4,
  test: test$4
};
function escapeHTML(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function printProps(keys, props, config, indentation, depth, refs, printer2) {
  let indentationNext = indentation + config.indent, colors = config.colors;
  return keys.map((key) => {
    let value = props[key], printed = printer2(value, config, indentationNext, depth, refs);
    return typeof value != "string" && (printed.includes(`
`) && (printed = config.spacingOuter + indentationNext + printed + config.spacingOuter + indentation), printed = `{${printed}}`), `${config.spacingInner + indentation + colors.prop.open + key + colors.prop.close}=${colors.value.open}${printed}${colors.value.close}`;
  }).join("");
}
function printChildren(children, config, indentation, depth, refs, printer2) {
  return children.map((child) => config.spacingOuter + indentation + (typeof child == "string" ? printText(child, config) : printer2(child, config, indentation, depth, refs))).join("");
}
function printText(text, config) {
  let contentColor = config.colors.content;
  return contentColor.open + escapeHTML(text) + contentColor.close;
}
function printComment(comment, config) {
  let commentColor = config.colors.comment;
  return `${commentColor.open}<!--${escapeHTML(comment)}-->${commentColor.close}`;
}
function printElement(type, printedProps, printedChildren, config, indentation) {
  let tagColor = config.colors.tag;
  return `${tagColor.open}<${type}${printedProps && tagColor.close + printedProps + config.spacingOuter + indentation + tagColor.open}${printedChildren ? `>${tagColor.close}${printedChildren}${config.spacingOuter}${indentation}${tagColor.open}</${type}` : `${printedProps && !config.min ? "" : " "}/`}>${tagColor.close}`;
}
function printElementAsLeaf(type, config) {
  let tagColor = config.colors.tag;
  return `${tagColor.open}<${type}${tagColor.close} \u2026${tagColor.open} />${tagColor.close}`;
}
var ELEMENT_NODE = 1, TEXT_NODE = 3, COMMENT_NODE = 8, FRAGMENT_NODE = 11, ELEMENT_REGEXP = /^(?:(?:HTML|SVG)\w*)?Element$/;
function testHasAttribute(val) {
  try {
    return typeof val.hasAttribute == "function" && val.hasAttribute("is");
  } catch {
    return !1;
  }
}
function testNode(val) {
  let constructorName = val.constructor.name, { nodeType, tagName } = val, isCustomElement = typeof tagName == "string" && tagName.includes("-") || testHasAttribute(val);
  return nodeType === ELEMENT_NODE && (ELEMENT_REGEXP.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE && constructorName === "Text" || nodeType === COMMENT_NODE && constructorName === "Comment" || nodeType === FRAGMENT_NODE && constructorName === "DocumentFragment";
}
var test$3 = (val) => {
  var _val$constructor;
  return (val == null || (_val$constructor = val.constructor) === null || _val$constructor === void 0 ? void 0 : _val$constructor.name) && testNode(val);
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
var serialize$3 = (node, config, indentation, depth, refs, printer2) => {
  if (nodeIsText(node))
    return printText(node.data, config);
  if (nodeIsComment(node))
    return printComment(node.data, config);
  let type = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();
  return ++depth > config.maxDepth ? printElementAsLeaf(type, config) : printElement(type, printProps(nodeIsFragment(node) ? [] : Array.from(node.attributes, (attr) => attr.name).sort(), nodeIsFragment(node) ? {} : [...node.attributes].reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}), config, indentation + config.indent, depth, refs, printer2), printChildren(Array.prototype.slice.call(node.childNodes || node.children), config, indentation + config.indent, depth, refs, printer2), config, indentation);
}, plugin$3 = {
  serialize: serialize$3,
  test: test$3
}, IS_ITERABLE_SENTINEL = "@@__IMMUTABLE_ITERABLE__@@", IS_LIST_SENTINEL = "@@__IMMUTABLE_LIST__@@", IS_KEYED_SENTINEL = "@@__IMMUTABLE_KEYED__@@", IS_MAP_SENTINEL = "@@__IMMUTABLE_MAP__@@", IS_ORDERED_SENTINEL = "@@__IMMUTABLE_ORDERED__@@", IS_RECORD_SENTINEL = "@@__IMMUTABLE_RECORD__@@", IS_SEQ_SENTINEL = "@@__IMMUTABLE_SEQ__@@", IS_SET_SENTINEL = "@@__IMMUTABLE_SET__@@", IS_STACK_SENTINEL = "@@__IMMUTABLE_STACK__@@", getImmutableName = (name) => `Immutable.${name}`, printAsLeaf = (name) => `[${name}]`, SPACE = " ", LAZY = "\u2026";
function printImmutableEntries(val, config, indentation, depth, refs, printer2, type) {
  return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}{${printIteratorEntries(val.entries(), config, indentation, depth, refs, printer2)}}`;
}
function getRecordEntries(val) {
  let i = 0;
  return { next() {
    if (i < val._keys.length) {
      let key = val._keys[i++];
      return {
        done: !1,
        value: [key, val.get(key)]
      };
    }
    return {
      done: !0,
      value: void 0
    };
  } };
}
function printImmutableRecord(val, config, indentation, depth, refs, printer2) {
  let name = getImmutableName(val._name || "Record");
  return ++depth > config.maxDepth ? printAsLeaf(name) : `${name + SPACE}{${printIteratorEntries(getRecordEntries(val), config, indentation, depth, refs, printer2)}}`;
}
function printImmutableSeq(val, config, indentation, depth, refs, printer2) {
  let name = getImmutableName("Seq");
  return ++depth > config.maxDepth ? printAsLeaf(name) : val[IS_KEYED_SENTINEL] ? `${name + SPACE}{${val._iter || val._object ? printIteratorEntries(val.entries(), config, indentation, depth, refs, printer2) : LAZY}}` : `${name + SPACE}[${val._iter || val._array || val._collection || val._iterable ? printIteratorValues(val.values(), config, indentation, depth, refs, printer2) : LAZY}]`;
}
function printImmutableValues(val, config, indentation, depth, refs, printer2, type) {
  return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}[${printIteratorValues(val.values(), config, indentation, depth, refs, printer2)}]`;
}
var serialize$2 = (val, config, indentation, depth, refs, printer2) => val[IS_MAP_SENTINEL] ? printImmutableEntries(val, config, indentation, depth, refs, printer2, val[IS_ORDERED_SENTINEL] ? "OrderedMap" : "Map") : val[IS_LIST_SENTINEL] ? printImmutableValues(val, config, indentation, depth, refs, printer2, "List") : val[IS_SET_SENTINEL] ? printImmutableValues(val, config, indentation, depth, refs, printer2, val[IS_ORDERED_SENTINEL] ? "OrderedSet" : "Set") : val[IS_STACK_SENTINEL] ? printImmutableValues(val, config, indentation, depth, refs, printer2, "Stack") : val[IS_SEQ_SENTINEL] ? printImmutableSeq(val, config, indentation, depth, refs, printer2) : printImmutableRecord(val, config, indentation, depth, refs, printer2), test$2 = (val) => val && (val[IS_ITERABLE_SENTINEL] === !0 || val[IS_RECORD_SENTINEL] === !0), plugin$2 = {
  serialize: serialize$2,
  test: test$2
};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x.default : x;
}
var reactIs$1 = { exports: {} }, reactIs_production = {};
var hasRequiredReactIs_production;
function requireReactIs_production() {
  if (hasRequiredReactIs_production) return reactIs_production;
  hasRequiredReactIs_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
  function typeOf(object) {
    if (typeof object == "object" && object !== null) {
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
  return reactIs_production.ContextConsumer = REACT_CONSUMER_TYPE, reactIs_production.ContextProvider = REACT_CONTEXT_TYPE, reactIs_production.Element = REACT_ELEMENT_TYPE, reactIs_production.ForwardRef = REACT_FORWARD_REF_TYPE, reactIs_production.Fragment = REACT_FRAGMENT_TYPE, reactIs_production.Lazy = REACT_LAZY_TYPE, reactIs_production.Memo = REACT_MEMO_TYPE, reactIs_production.Portal = REACT_PORTAL_TYPE, reactIs_production.Profiler = REACT_PROFILER_TYPE, reactIs_production.StrictMode = REACT_STRICT_MODE_TYPE, reactIs_production.Suspense = REACT_SUSPENSE_TYPE, reactIs_production.SuspenseList = REACT_SUSPENSE_LIST_TYPE, reactIs_production.isContextConsumer = function(object) {
    return typeOf(object) === REACT_CONSUMER_TYPE;
  }, reactIs_production.isContextProvider = function(object) {
    return typeOf(object) === REACT_CONTEXT_TYPE;
  }, reactIs_production.isElement = function(object) {
    return typeof object == "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
  }, reactIs_production.isForwardRef = function(object) {
    return typeOf(object) === REACT_FORWARD_REF_TYPE;
  }, reactIs_production.isFragment = function(object) {
    return typeOf(object) === REACT_FRAGMENT_TYPE;
  }, reactIs_production.isLazy = function(object) {
    return typeOf(object) === REACT_LAZY_TYPE;
  }, reactIs_production.isMemo = function(object) {
    return typeOf(object) === REACT_MEMO_TYPE;
  }, reactIs_production.isPortal = function(object) {
    return typeOf(object) === REACT_PORTAL_TYPE;
  }, reactIs_production.isProfiler = function(object) {
    return typeOf(object) === REACT_PROFILER_TYPE;
  }, reactIs_production.isStrictMode = function(object) {
    return typeOf(object) === REACT_STRICT_MODE_TYPE;
  }, reactIs_production.isSuspense = function(object) {
    return typeOf(object) === REACT_SUSPENSE_TYPE;
  }, reactIs_production.isSuspenseList = function(object) {
    return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
  }, reactIs_production.isValidElementType = function(type) {
    return typeof type == "string" || typeof type == "function" || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type == "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE || type.getModuleId !== void 0);
  }, reactIs_production.typeOf = typeOf, reactIs_production;
}
var reactIs_development$1 = {};
var hasRequiredReactIs_development$1;
function requireReactIs_development$1() {
  return hasRequiredReactIs_development$1 || (hasRequiredReactIs_development$1 = 1, process.env.NODE_ENV !== "production" && (function() {
    function typeOf(object) {
      if (typeof object == "object" && object !== null) {
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
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
    reactIs_development$1.ContextConsumer = REACT_CONSUMER_TYPE, reactIs_development$1.ContextProvider = REACT_CONTEXT_TYPE, reactIs_development$1.Element = REACT_ELEMENT_TYPE, reactIs_development$1.ForwardRef = REACT_FORWARD_REF_TYPE, reactIs_development$1.Fragment = REACT_FRAGMENT_TYPE, reactIs_development$1.Lazy = REACT_LAZY_TYPE, reactIs_development$1.Memo = REACT_MEMO_TYPE, reactIs_development$1.Portal = REACT_PORTAL_TYPE, reactIs_development$1.Profiler = REACT_PROFILER_TYPE, reactIs_development$1.StrictMode = REACT_STRICT_MODE_TYPE, reactIs_development$1.Suspense = REACT_SUSPENSE_TYPE, reactIs_development$1.SuspenseList = REACT_SUSPENSE_LIST_TYPE, reactIs_development$1.isContextConsumer = function(object) {
      return typeOf(object) === REACT_CONSUMER_TYPE;
    }, reactIs_development$1.isContextProvider = function(object) {
      return typeOf(object) === REACT_CONTEXT_TYPE;
    }, reactIs_development$1.isElement = function(object) {
      return typeof object == "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }, reactIs_development$1.isForwardRef = function(object) {
      return typeOf(object) === REACT_FORWARD_REF_TYPE;
    }, reactIs_development$1.isFragment = function(object) {
      return typeOf(object) === REACT_FRAGMENT_TYPE;
    }, reactIs_development$1.isLazy = function(object) {
      return typeOf(object) === REACT_LAZY_TYPE;
    }, reactIs_development$1.isMemo = function(object) {
      return typeOf(object) === REACT_MEMO_TYPE;
    }, reactIs_development$1.isPortal = function(object) {
      return typeOf(object) === REACT_PORTAL_TYPE;
    }, reactIs_development$1.isProfiler = function(object) {
      return typeOf(object) === REACT_PROFILER_TYPE;
    }, reactIs_development$1.isStrictMode = function(object) {
      return typeOf(object) === REACT_STRICT_MODE_TYPE;
    }, reactIs_development$1.isSuspense = function(object) {
      return typeOf(object) === REACT_SUSPENSE_TYPE;
    }, reactIs_development$1.isSuspenseList = function(object) {
      return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
    }, reactIs_development$1.isValidElementType = function(type) {
      return typeof type == "string" || typeof type == "function" || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type == "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE || type.getModuleId !== void 0);
    }, reactIs_development$1.typeOf = typeOf;
  })()), reactIs_development$1;
}
var hasRequiredReactIs$1;
function requireReactIs$1() {
  return hasRequiredReactIs$1 || (hasRequiredReactIs$1 = 1, process.env.NODE_ENV === "production" ? reactIs$1.exports = requireReactIs_production() : reactIs$1.exports = requireReactIs_development$1()), reactIs$1.exports;
}
var reactIsExports$1 = requireReactIs$1(), index$1 = getDefaultExportFromCjs(reactIsExports$1), ReactIs19 = _mergeNamespaces({
  __proto__: null,
  default: index$1
}, [reactIsExports$1]), reactIs = { exports: {} }, reactIs_production_min = {};
var hasRequiredReactIs_production_min;
function requireReactIs_production_min() {
  if (hasRequiredReactIs_production_min) return reactIs_production_min;
  hasRequiredReactIs_production_min = 1;
  var b = Symbol.for("react.element"), c = Symbol.for("react.portal"), d = Symbol.for("react.fragment"), e = Symbol.for("react.strict_mode"), f2 = Symbol.for("react.profiler"), g = Symbol.for("react.provider"), h2 = Symbol.for("react.context"), k = Symbol.for("react.server_context"), l = Symbol.for("react.forward_ref"), m2 = Symbol.for("react.suspense"), n = Symbol.for("react.suspense_list"), p2 = Symbol.for("react.memo"), q = Symbol.for("react.lazy"), t = Symbol.for("react.offscreen"), u;
  u = Symbol.for("react.module.reference");
  function v(a2) {
    if (typeof a2 == "object" && a2 !== null) {
      var r = a2.$$typeof;
      switch (r) {
        case b:
          switch (a2 = a2.type, a2) {
            case d:
            case f2:
            case e:
            case m2:
            case n:
              return a2;
            default:
              switch (a2 = a2 && a2.$$typeof, a2) {
                case k:
                case h2:
                case l:
                case q:
                case p2:
                case g:
                  return a2;
                default:
                  return r;
              }
          }
        case c:
          return r;
      }
    }
  }
  return reactIs_production_min.ContextConsumer = h2, reactIs_production_min.ContextProvider = g, reactIs_production_min.Element = b, reactIs_production_min.ForwardRef = l, reactIs_production_min.Fragment = d, reactIs_production_min.Lazy = q, reactIs_production_min.Memo = p2, reactIs_production_min.Portal = c, reactIs_production_min.Profiler = f2, reactIs_production_min.StrictMode = e, reactIs_production_min.Suspense = m2, reactIs_production_min.SuspenseList = n, reactIs_production_min.isAsyncMode = function() {
    return !1;
  }, reactIs_production_min.isConcurrentMode = function() {
    return !1;
  }, reactIs_production_min.isContextConsumer = function(a2) {
    return v(a2) === h2;
  }, reactIs_production_min.isContextProvider = function(a2) {
    return v(a2) === g;
  }, reactIs_production_min.isElement = function(a2) {
    return typeof a2 == "object" && a2 !== null && a2.$$typeof === b;
  }, reactIs_production_min.isForwardRef = function(a2) {
    return v(a2) === l;
  }, reactIs_production_min.isFragment = function(a2) {
    return v(a2) === d;
  }, reactIs_production_min.isLazy = function(a2) {
    return v(a2) === q;
  }, reactIs_production_min.isMemo = function(a2) {
    return v(a2) === p2;
  }, reactIs_production_min.isPortal = function(a2) {
    return v(a2) === c;
  }, reactIs_production_min.isProfiler = function(a2) {
    return v(a2) === f2;
  }, reactIs_production_min.isStrictMode = function(a2) {
    return v(a2) === e;
  }, reactIs_production_min.isSuspense = function(a2) {
    return v(a2) === m2;
  }, reactIs_production_min.isSuspenseList = function(a2) {
    return v(a2) === n;
  }, reactIs_production_min.isValidElementType = function(a2) {
    return typeof a2 == "string" || typeof a2 == "function" || a2 === d || a2 === f2 || a2 === e || a2 === m2 || a2 === n || a2 === t || typeof a2 == "object" && a2 !== null && (a2.$$typeof === q || a2.$$typeof === p2 || a2.$$typeof === g || a2.$$typeof === h2 || a2.$$typeof === l || a2.$$typeof === u || a2.getModuleId !== void 0);
  }, reactIs_production_min.typeOf = v, reactIs_production_min;
}
var reactIs_development = {};
var hasRequiredReactIs_development;
function requireReactIs_development() {
  return hasRequiredReactIs_development || (hasRequiredReactIs_development = 1, process.env.NODE_ENV !== "production" && (function() {
    var REACT_ELEMENT_TYPE = Symbol.for("react.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_PROVIDER_TYPE = Symbol.for("react.provider"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_SERVER_CONTEXT_TYPE = Symbol.for("react.server_context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"), enableScopeAPI = !1, enableCacheElement = !1, enableTransitionTracing = !1, enableLegacyHidden = !1, enableDebugTracing = !1, REACT_MODULE_REFERENCE;
    REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
    function isValidElementType(type) {
      return !!(typeof type == "string" || typeof type == "function" || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing || typeof type == "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0));
    }
    function typeOf(object) {
      if (typeof object == "object" && object !== null) {
        var $$typeof = object.$$typeof;
        switch ($$typeof) {
          case REACT_ELEMENT_TYPE:
            var type = object.type;
            switch (type) {
              case REACT_FRAGMENT_TYPE:
              case REACT_PROFILER_TYPE:
              case REACT_STRICT_MODE_TYPE:
              case REACT_SUSPENSE_TYPE:
              case REACT_SUSPENSE_LIST_TYPE:
                return type;
              default:
                var $$typeofType = type && type.$$typeof;
                switch ($$typeofType) {
                  case REACT_SERVER_CONTEXT_TYPE:
                  case REACT_CONTEXT_TYPE:
                  case REACT_FORWARD_REF_TYPE:
                  case REACT_LAZY_TYPE:
                  case REACT_MEMO_TYPE:
                  case REACT_PROVIDER_TYPE:
                    return $$typeofType;
                  default:
                    return $$typeof;
                }
            }
          case REACT_PORTAL_TYPE:
            return $$typeof;
        }
      }
    }
    var ContextConsumer = REACT_CONTEXT_TYPE, ContextProvider = REACT_PROVIDER_TYPE, Element2 = REACT_ELEMENT_TYPE, ForwardRef = REACT_FORWARD_REF_TYPE, Fragment = REACT_FRAGMENT_TYPE, Lazy = REACT_LAZY_TYPE, Memo = REACT_MEMO_TYPE, Portal = REACT_PORTAL_TYPE, Profiler = REACT_PROFILER_TYPE, StrictMode = REACT_STRICT_MODE_TYPE, Suspense = REACT_SUSPENSE_TYPE, SuspenseList = REACT_SUSPENSE_LIST_TYPE, hasWarnedAboutDeprecatedIsAsyncMode = !1, hasWarnedAboutDeprecatedIsConcurrentMode = !1;
    function isAsyncMode(object) {
      return hasWarnedAboutDeprecatedIsAsyncMode || (hasWarnedAboutDeprecatedIsAsyncMode = !0, console.warn("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 18+.")), !1;
    }
    function isConcurrentMode(object) {
      return hasWarnedAboutDeprecatedIsConcurrentMode || (hasWarnedAboutDeprecatedIsConcurrentMode = !0, console.warn("The ReactIs.isConcurrentMode() alias has been deprecated, and will be removed in React 18+.")), !1;
    }
    function isContextConsumer(object) {
      return typeOf(object) === REACT_CONTEXT_TYPE;
    }
    function isContextProvider(object) {
      return typeOf(object) === REACT_PROVIDER_TYPE;
    }
    function isElement(object) {
      return typeof object == "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function isForwardRef(object) {
      return typeOf(object) === REACT_FORWARD_REF_TYPE;
    }
    function isFragment(object) {
      return typeOf(object) === REACT_FRAGMENT_TYPE;
    }
    function isLazy(object) {
      return typeOf(object) === REACT_LAZY_TYPE;
    }
    function isMemo(object) {
      return typeOf(object) === REACT_MEMO_TYPE;
    }
    function isPortal(object) {
      return typeOf(object) === REACT_PORTAL_TYPE;
    }
    function isProfiler(object) {
      return typeOf(object) === REACT_PROFILER_TYPE;
    }
    function isStrictMode(object) {
      return typeOf(object) === REACT_STRICT_MODE_TYPE;
    }
    function isSuspense(object) {
      return typeOf(object) === REACT_SUSPENSE_TYPE;
    }
    function isSuspenseList(object) {
      return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
    }
    reactIs_development.ContextConsumer = ContextConsumer, reactIs_development.ContextProvider = ContextProvider, reactIs_development.Element = Element2, reactIs_development.ForwardRef = ForwardRef, reactIs_development.Fragment = Fragment, reactIs_development.Lazy = Lazy, reactIs_development.Memo = Memo, reactIs_development.Portal = Portal, reactIs_development.Profiler = Profiler, reactIs_development.StrictMode = StrictMode, reactIs_development.Suspense = Suspense, reactIs_development.SuspenseList = SuspenseList, reactIs_development.isAsyncMode = isAsyncMode, reactIs_development.isConcurrentMode = isConcurrentMode, reactIs_development.isContextConsumer = isContextConsumer, reactIs_development.isContextProvider = isContextProvider, reactIs_development.isElement = isElement, reactIs_development.isForwardRef = isForwardRef, reactIs_development.isFragment = isFragment, reactIs_development.isLazy = isLazy, reactIs_development.isMemo = isMemo, reactIs_development.isPortal = isPortal, reactIs_development.isProfiler = isProfiler, reactIs_development.isStrictMode = isStrictMode, reactIs_development.isSuspense = isSuspense, reactIs_development.isSuspenseList = isSuspenseList, reactIs_development.isValidElementType = isValidElementType, reactIs_development.typeOf = typeOf;
  })()), reactIs_development;
}
var hasRequiredReactIs;
function requireReactIs() {
  return hasRequiredReactIs || (hasRequiredReactIs = 1, process.env.NODE_ENV === "production" ? reactIs.exports = requireReactIs_production_min() : reactIs.exports = requireReactIs_development()), reactIs.exports;
}
var reactIsExports = requireReactIs(), index = getDefaultExportFromCjs(reactIsExports), ReactIs18 = _mergeNamespaces({
  __proto__: null,
  default: index
}, [reactIsExports]), reactIsMethods = [
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
], ReactIs = Object.fromEntries(reactIsMethods.map((m2) => [m2, (v) => ReactIs18[m2](v) || ReactIs19[m2](v)]));
function getChildren(arg, children = []) {
  if (Array.isArray(arg))
    for (let item of arg)
      getChildren(item, children);
  else arg != null && arg !== !1 && arg !== "" && children.push(arg);
  return children;
}
function getType(element) {
  let type = element.type;
  if (typeof type == "string")
    return type;
  if (typeof type == "function")
    return type.displayName || type.name || "Unknown";
  if (ReactIs.isFragment(element))
    return "React.Fragment";
  if (ReactIs.isSuspense(element))
    return "React.Suspense";
  if (typeof type == "object" && type !== null) {
    if (ReactIs.isContextProvider(element))
      return "Context.Provider";
    if (ReactIs.isContextConsumer(element))
      return "Context.Consumer";
    if (ReactIs.isForwardRef(element)) {
      if (type.displayName)
        return type.displayName;
      let functionName = type.render.displayName || type.render.name || "";
      return functionName === "" ? "ForwardRef" : `ForwardRef(${functionName})`;
    }
    if (ReactIs.isMemo(element)) {
      let functionName = type.displayName || type.type.displayName || type.type.name || "";
      return functionName === "" ? "Memo" : `Memo(${functionName})`;
    }
  }
  return "UNDEFINED";
}
function getPropKeys$1(element) {
  let { props } = element;
  return Object.keys(props).filter((key) => key !== "children" && props[key] !== void 0).sort();
}
var serialize$1 = (element, config, indentation, depth, refs, printer2) => ++depth > config.maxDepth ? printElementAsLeaf(getType(element), config) : printElement(getType(element), printProps(getPropKeys$1(element), element.props, config, indentation + config.indent, depth, refs, printer2), printChildren(getChildren(element.props.children), config, indentation + config.indent, depth, refs, printer2), config, indentation), test$1 = (val) => val != null && ReactIs.isElement(val), plugin$1 = {
  serialize: serialize$1,
  test: test$1
}, testSymbol = typeof Symbol == "function" && Symbol.for ? Symbol.for("react.test.json") : 245830487;
function getPropKeys(object) {
  let { props } = object;
  return props ? Object.keys(props).filter((key) => props[key] !== void 0).sort() : [];
}
var serialize = (object, config, indentation, depth, refs, printer2) => ++depth > config.maxDepth ? printElementAsLeaf(object.type, config) : printElement(object.type, object.props ? printProps(getPropKeys(object), object.props, config, indentation + config.indent, depth, refs, printer2) : "", object.children ? printChildren(object.children, config, indentation + config.indent, depth, refs, printer2) : "", config, indentation), test = (val) => val && val.$$typeof === testSymbol, plugin = {
  serialize,
  test
}, toString = Object.prototype.toString, toISOString = Date.prototype.toISOString, errorToString = Error.prototype.toString, regExpToString = RegExp.prototype.toString;
function getConstructorName(val) {
  return typeof val.constructor == "function" && val.constructor.name || "Object";
}
function isWindow(val) {
  return typeof window < "u" && val === window;
}
var SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/, NEWLINE_REGEXP = /\n/g, PrettyFormatPluginError = class extends Error {
  constructor(message, stack) {
    super(message), this.stack = stack, this.name = this.constructor.name;
  }
};
function isToStringedArrayType(toStringed) {
  return toStringed === "[object Array]" || toStringed === "[object ArrayBuffer]" || toStringed === "[object DataView]" || toStringed === "[object Float32Array]" || toStringed === "[object Float64Array]" || toStringed === "[object Int8Array]" || toStringed === "[object Int16Array]" || toStringed === "[object Int32Array]" || toStringed === "[object Uint8Array]" || toStringed === "[object Uint8ClampedArray]" || toStringed === "[object Uint16Array]" || toStringed === "[object Uint32Array]";
}
function printNumber(val) {
  return Object.is(val, -0) ? "-0" : String(val);
}
function printBigInt(val) {
  return `${val}n`;
}
function printFunction(val, printFunctionName) {
  return printFunctionName ? `[Function ${val.name || "anonymous"}]` : "[Function]";
}
function printSymbol(val) {
  return String(val).replace(SYMBOL_REGEXP, "Symbol($1)");
}
function printError(val) {
  return `[${errorToString.call(val)}]`;
}
function printBasicValue(val, printFunctionName, escapeRegex, escapeString) {
  if (val === !0 || val === !1)
    return `${val}`;
  if (val === void 0)
    return "undefined";
  if (val === null)
    return "null";
  let typeOf = typeof val;
  if (typeOf === "number")
    return printNumber(val);
  if (typeOf === "bigint")
    return printBigInt(val);
  if (typeOf === "string")
    return escapeString ? `"${val.replaceAll(/"|\\/g, "\\$&")}"` : `"${val}"`;
  if (typeOf === "function")
    return printFunction(val, printFunctionName);
  if (typeOf === "symbol")
    return printSymbol(val);
  let toStringed = toString.call(val);
  return toStringed === "[object WeakMap]" ? "WeakMap {}" : toStringed === "[object WeakSet]" ? "WeakSet {}" : toStringed === "[object Function]" || toStringed === "[object GeneratorFunction]" ? printFunction(val, printFunctionName) : toStringed === "[object Symbol]" ? printSymbol(val) : toStringed === "[object Date]" ? Number.isNaN(+val) ? "Date { NaN }" : toISOString.call(val) : toStringed === "[object Error]" ? printError(val) : toStringed === "[object RegExp]" ? escapeRegex ? regExpToString.call(val).replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&") : regExpToString.call(val) : val instanceof Error ? printError(val) : null;
}
function printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON) {
  if (refs.includes(val))
    return "[Circular]";
  refs = [...refs], refs.push(val);
  let hitMaxDepth = ++depth > config.maxDepth, min = config.min;
  if (config.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON == "function" && !hasCalledToJSON)
    return printer(val.toJSON(), config, indentation, depth, refs, !0);
  let toStringed = toString.call(val);
  return toStringed === "[object Arguments]" ? hitMaxDepth ? "[Arguments]" : `${min ? "" : "Arguments "}[${printListItems(val, config, indentation, depth, refs, printer)}]` : isToStringedArrayType(toStringed) ? hitMaxDepth ? `[${val.constructor.name}]` : `${min || !config.printBasicPrototype && val.constructor.name === "Array" ? "" : `${val.constructor.name} `}[${printListItems(val, config, indentation, depth, refs, printer)}]` : toStringed === "[object Map]" ? hitMaxDepth ? "[Map]" : `Map {${printIteratorEntries(val.entries(), config, indentation, depth, refs, printer, " => ")}}` : toStringed === "[object Set]" ? hitMaxDepth ? "[Set]" : `Set {${printIteratorValues(val.values(), config, indentation, depth, refs, printer)}}` : hitMaxDepth || isWindow(val) ? `[${getConstructorName(val)}]` : `${min || !config.printBasicPrototype && getConstructorName(val) === "Object" ? "" : `${getConstructorName(val)} `}{${printObjectProperties(val, config, indentation, depth, refs, printer)}}`;
}
var ErrorPlugin = {
  test: (val) => val && val instanceof Error,
  serialize(val, config, indentation, depth, refs, printer2) {
    if (refs.includes(val))
      return "[Circular]";
    refs = [...refs, val];
    let hitMaxDepth = ++depth > config.maxDepth, { message, cause, ...rest } = val, entries = {
      message,
      ...typeof cause < "u" ? { cause } : {},
      ...val instanceof AggregateError ? { errors: val.errors } : {},
      ...rest
    }, name = val.name !== "Error" ? val.name : getConstructorName(val);
    return hitMaxDepth ? `[${name}]` : `${name} {${printIteratorEntries(Object.entries(entries).values(), config, indentation, depth, refs, printer2)}}`;
  }
};
function isNewPlugin(plugin2) {
  return plugin2.serialize != null;
}
function printPlugin(plugin2, val, config, indentation, depth, refs) {
  let printed;
  try {
    printed = isNewPlugin(plugin2) ? plugin2.serialize(val, config, indentation, depth, refs, printer) : plugin2.print(val, (valChild) => printer(valChild, config, indentation, depth, refs), (str) => {
      let indentationNext = indentation + config.indent;
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
  if (typeof printed != "string")
    throw new TypeError(`pretty-format: Plugin must return type "string" but instead returned "${typeof printed}".`);
  return printed;
}
function findPlugin(plugins2, val) {
  for (let plugin2 of plugins2)
    try {
      if (plugin2.test(val))
        return plugin2;
    } catch (error) {
      throw new PrettyFormatPluginError(error.message, error.stack);
    }
  return null;
}
function printer(val, config, indentation, depth, refs, hasCalledToJSON) {
  let plugin2 = findPlugin(config.plugins, val);
  if (plugin2 !== null)
    return printPlugin(plugin2, val, config, indentation, depth, refs);
  let basicResult = printBasicValue(val, config.printFunctionName, config.escapeRegex, config.escapeString);
  return basicResult !== null ? basicResult : printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON);
}
var DEFAULT_THEME = {
  comment: "gray",
  content: "reset",
  prop: "yellow",
  tag: "cyan",
  value: "green"
}, DEFAULT_THEME_KEYS = Object.keys(DEFAULT_THEME), DEFAULT_OPTIONS = {
  callToJSON: !0,
  compareKeys: void 0,
  escapeRegex: !1,
  escapeString: !0,
  highlight: !1,
  indent: 2,
  maxDepth: Number.POSITIVE_INFINITY,
  maxWidth: Number.POSITIVE_INFINITY,
  min: !1,
  plugins: [],
  printBasicPrototype: !0,
  printFunctionName: !0,
  theme: DEFAULT_THEME
};
function validateOptions(options) {
  for (let key of Object.keys(options))
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_OPTIONS, key))
      throw new Error(`pretty-format: Unknown option "${key}".`);
  if (options.min && options.indent !== void 0 && options.indent !== 0)
    throw new Error('pretty-format: Options "min" and "indent" cannot be used together.');
}
function getColorsHighlight() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    let value = DEFAULT_THEME[key], color = value && s[value];
    if (color && typeof color.close == "string" && typeof color.open == "string")
      colors[key] = color;
    else
      throw new Error(`pretty-format: Option "theme" has a key "${key}" whose value "${value}" is undefined in ansi-styles.`);
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getColorsEmpty() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => (colors[key] = {
    close: "",
    open: ""
  }, colors), /* @__PURE__ */ Object.create(null));
}
function getPrintFunctionName(options) {
  return options?.printFunctionName ?? DEFAULT_OPTIONS.printFunctionName;
}
function getEscapeRegex(options) {
  return options?.escapeRegex ?? DEFAULT_OPTIONS.escapeRegex;
}
function getEscapeString(options) {
  return options?.escapeString ?? DEFAULT_OPTIONS.escapeString;
}
function getConfig(options) {
  return {
    callToJSON: options?.callToJSON ?? DEFAULT_OPTIONS.callToJSON,
    colors: options?.highlight ? getColorsHighlight() : getColorsEmpty(),
    compareKeys: typeof options?.compareKeys == "function" || options?.compareKeys === null ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
    escapeRegex: getEscapeRegex(options),
    escapeString: getEscapeString(options),
    indent: options?.min ? "" : createIndent(options?.indent ?? DEFAULT_OPTIONS.indent),
    maxDepth: options?.maxDepth ?? DEFAULT_OPTIONS.maxDepth,
    maxWidth: options?.maxWidth ?? DEFAULT_OPTIONS.maxWidth,
    min: options?.min ?? DEFAULT_OPTIONS.min,
    plugins: options?.plugins ?? DEFAULT_OPTIONS.plugins,
    printBasicPrototype: options?.printBasicPrototype ?? !0,
    printFunctionName: getPrintFunctionName(options),
    spacingInner: options?.min ? " " : `
`,
    spacingOuter: options?.min ? "" : `
`
  };
}
function createIndent(indent) {
  return Array.from({ length: indent + 1 }).join(" ");
}
function format(val, options) {
  if (options && (validateOptions(options), options.plugins)) {
    let plugin2 = findPlugin(options.plugins, val);
    if (plugin2 !== null)
      return printPlugin(plugin2, val, getConfig(options), "", 0, []);
  }
  let basicResult = printBasicValue(val, getPrintFunctionName(options), getEscapeRegex(options), getEscapeString(options));
  return basicResult !== null ? basicResult : printComplexValue(val, getConfig(options), "", 0, []);
}
var plugins = {
  AsymmetricMatcher: plugin$5,
  DOMCollection: plugin$4,
  DOMElement: plugin$3,
  Immutable: plugin$2,
  ReactElement: plugin$1,
  ReactTestComponent: plugin,
  Error: ErrorPlugin
};

// ../node_modules/loupe/lib/helpers.js
var ansiColors = {
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
}, styles = {
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
}, truncator = "\u2026";
function colorise(value, styleType) {
  let color = ansiColors[styles[styleType]] || ansiColors[styleType] || "";
  return color ? `\x1B[${color[0]}m${String(value)}\x1B[${color[1]}m` : String(value);
}
function normaliseOptions({
  showHidden = !1,
  depth = 2,
  colors = !1,
  customInspect = !0,
  showProxy = !1,
  maxArrayLength = 1 / 0,
  breakLength = 1 / 0,
  seen = [],
  // eslint-disable-next-line no-shadow
  truncate: truncate2 = 1 / 0,
  stylize = String
} = {}, inspect3) {
  let options = {
    showHidden: !!showHidden,
    depth: Number(depth),
    colors: !!colors,
    customInspect: !!customInspect,
    showProxy: !!showProxy,
    maxArrayLength: Number(maxArrayLength),
    breakLength: Number(breakLength),
    truncate: Number(truncate2),
    seen,
    inspect: inspect3,
    stylize
  };
  return options.colors && (options.stylize = colorise), options;
}
function isHighSurrogate(char) {
  return char >= "\uD800" && char <= "\uDBFF";
}
function truncate(string, length, tail = truncator) {
  string = String(string);
  let tailLength = tail.length, stringLength = string.length;
  if (tailLength > length && stringLength > tailLength)
    return tail;
  if (stringLength > length && stringLength > tailLength) {
    let end = length - tailLength;
    return end > 0 && isHighSurrogate(string[end - 1]) && (end = end - 1), `${string.slice(0, end)}${tail}`;
  }
  return string;
}
function inspectList(list, options, inspectItem, separator = ", ") {
  inspectItem = inspectItem || options.inspect;
  let size = list.length;
  if (size === 0)
    return "";
  let originalLength = options.truncate, output = "", peek = "", truncated = "";
  for (let i = 0; i < size; i += 1) {
    let last = i + 1 === list.length, secondToLast = i + 2 === list.length;
    truncated = `${truncator}(${list.length - i})`;
    let value = list[i];
    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
    let string = peek || inspectItem(value, options) + (last ? "" : separator), nextLength = output.length + string.length, truncatedLength = nextLength + truncated.length;
    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength || !last && !secondToLast && truncatedLength > originalLength || (peek = last ? "" : inspectItem(list[i + 1], options) + (secondToLast ? "" : separator), !last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength))
      break;
    if (output += string, !last && !secondToLast && nextLength + peek.length >= originalLength) {
      truncated = `${truncator}(${list.length - i - 1})`;
      break;
    }
    truncated = "";
  }
  return `${output}${truncated}`;
}
function quoteComplexKey(key) {
  return key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/) ? key : JSON.stringify(key).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
function inspectProperty([key, value], options) {
  return options.truncate -= 2, typeof key == "string" ? key = quoteComplexKey(key) : typeof key != "number" && (key = `[${options.inspect(key, options)}]`), options.truncate -= key.length, value = options.inspect(value, options), `${key}: ${value}`;
}

// ../node_modules/loupe/lib/array.js
function inspectArray(array, options) {
  let nonIndexProperties = Object.keys(array).slice(array.length);
  if (!array.length && !nonIndexProperties.length)
    return "[]";
  options.truncate -= 4;
  let listContents = inspectList(array, options);
  options.truncate -= listContents.length;
  let propertyContents = "";
  return nonIndexProperties.length && (propertyContents = inspectList(nonIndexProperties.map((key) => [key, array[key]]), options, inspectProperty)), `[ ${listContents}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}

// ../node_modules/loupe/lib/typedarray.js
var getArrayName = (array) => typeof Buffer == "function" && array instanceof Buffer ? "Buffer" : array[Symbol.toStringTag] ? array[Symbol.toStringTag] : array.constructor.name;
function inspectTypedArray(array, options) {
  let name = getArrayName(array);
  options.truncate -= name.length + 4;
  let nonIndexProperties = Object.keys(array).slice(array.length);
  if (!array.length && !nonIndexProperties.length)
    return `${name}[]`;
  let output = "";
  for (let i = 0; i < array.length; i++) {
    let string = `${options.stylize(truncate(array[i], options.truncate), "number")}${i === array.length - 1 ? "" : ", "}`;
    if (options.truncate -= string.length, array[i] !== array.length && options.truncate <= 3) {
      output += `${truncator}(${array.length - array[i] + 1})`;
      break;
    }
    output += string;
  }
  let propertyContents = "";
  return nonIndexProperties.length && (propertyContents = inspectList(nonIndexProperties.map((key) => [key, array[key]]), options, inspectProperty)), `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}

// ../node_modules/loupe/lib/date.js
function inspectDate(dateObject, options) {
  let stringRepresentation = dateObject.toJSON();
  if (stringRepresentation === null)
    return "Invalid Date";
  let split = stringRepresentation.split("T"), date = split[0];
  return options.stylize(`${date}T${truncate(split[1], options.truncate - date.length - 1)}`, "date");
}

// ../node_modules/loupe/lib/function.js
function inspectFunction(func, options) {
  let functionType = func[Symbol.toStringTag] || "Function", name = func.name;
  return name ? options.stylize(`[${functionType} ${truncate(name, options.truncate - 11)}]`, "special") : options.stylize(`[${functionType}]`, "special");
}

// ../node_modules/loupe/lib/map.js
function inspectMapEntry([key, value], options) {
  return options.truncate -= 4, key = options.inspect(key, options), options.truncate -= key.length, value = options.inspect(value, options), `${key} => ${value}`;
}
function mapToEntries(map) {
  let entries = [];
  return map.forEach((value, key) => {
    entries.push([key, value]);
  }), entries;
}
function inspectMap(map, options) {
  return map.size === 0 ? "Map{}" : (options.truncate -= 7, `Map{ ${inspectList(mapToEntries(map), options, inspectMapEntry)} }`);
}

// ../node_modules/loupe/lib/number.js
var isNaN = Number.isNaN || ((i) => i !== i);
function inspectNumber(number, options) {
  return isNaN(number) ? options.stylize("NaN", "number") : number === 1 / 0 ? options.stylize("Infinity", "number") : number === -1 / 0 ? options.stylize("-Infinity", "number") : number === 0 ? options.stylize(1 / number === 1 / 0 ? "+0" : "-0", "number") : options.stylize(truncate(String(number), options.truncate), "number");
}

// ../node_modules/loupe/lib/bigint.js
function inspectBigInt(number, options) {
  let nums = truncate(number.toString(), options.truncate - 1);
  return nums !== truncator && (nums += "n"), options.stylize(nums, "bigint");
}

// ../node_modules/loupe/lib/regexp.js
function inspectRegExp(value, options) {
  let flags = value.toString().split("/")[2], sourceLength = options.truncate - (2 + flags.length), source = value.source;
  return options.stylize(`/${truncate(source, sourceLength)}/${flags}`, "regexp");
}

// ../node_modules/loupe/lib/set.js
function arrayFromSet(set) {
  let values = [];
  return set.forEach((value) => {
    values.push(value);
  }), values;
}
function inspectSet(set, options) {
  return set.size === 0 ? "Set{}" : (options.truncate -= 7, `Set{ ${inspectList(arrayFromSet(set), options)} }`);
}

// ../node_modules/loupe/lib/string.js
var stringEscapeChars = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g"), escapeCharacters = {
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "'": "\\'",
  "\\": "\\\\"
}, hex = 16, unicodeLength = 4;
function escape(char) {
  return escapeCharacters[char] || `\\u${`0000${char.charCodeAt(0).toString(hex)}`.slice(-unicodeLength)}`;
}
function inspectString(string, options) {
  return stringEscapeChars.test(string) && (string = string.replace(stringEscapeChars, escape)), options.stylize(`'${truncate(string, options.truncate - 2)}'`, "string");
}

// ../node_modules/loupe/lib/symbol.js
function inspectSymbol(value) {
  return "description" in Symbol.prototype ? value.description ? `Symbol(${value.description})` : "Symbol()" : value.toString();
}

// ../node_modules/loupe/lib/promise.js
var getPromiseValue = () => "Promise{\u2026}", promise_default = getPromiseValue;

// ../node_modules/loupe/lib/object.js
function inspectObject(object, options) {
  let properties = Object.getOwnPropertyNames(object), symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : [];
  if (properties.length === 0 && symbols.length === 0)
    return "{}";
  if (options.truncate -= 4, options.seen = options.seen || [], options.seen.includes(object))
    return "[Circular]";
  options.seen.push(object);
  let propertyContents = inspectList(properties.map((key) => [key, object[key]]), options, inspectProperty), symbolContents = inspectList(symbols.map((key) => [key, object[key]]), options, inspectProperty);
  options.seen.pop();
  let sep = "";
  return propertyContents && symbolContents && (sep = ", "), `{ ${propertyContents}${sep}${symbolContents} }`;
}

// ../node_modules/loupe/lib/class.js
var toStringTag = typeof Symbol < "u" && Symbol.toStringTag ? Symbol.toStringTag : !1;
function inspectClass(value, options) {
  let name = "";
  return toStringTag && toStringTag in value && (name = value[toStringTag]), name = name || value.constructor.name, (!name || name === "_class") && (name = "<Anonymous Class>"), options.truncate -= name.length, `${name}${inspectObject(value, options)}`;
}

// ../node_modules/loupe/lib/arguments.js
function inspectArguments(args, options) {
  return args.length === 0 ? "Arguments[]" : (options.truncate -= 13, `Arguments[ ${inspectList(args, options)} ]`);
}

// ../node_modules/loupe/lib/error.js
var errorKeys = [
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
function inspectObject2(error, options) {
  let properties = Object.getOwnPropertyNames(error).filter((key) => errorKeys.indexOf(key) === -1), name = error.name;
  options.truncate -= name.length;
  let message = "";
  if (typeof error.message == "string" ? message = truncate(error.message, options.truncate) : properties.unshift("message"), message = message ? `: ${message}` : "", options.truncate -= message.length + 5, options.seen = options.seen || [], options.seen.includes(error))
    return "[Circular]";
  options.seen.push(error);
  let propertyContents = inspectList(properties.map((key) => [key, error[key]]), options, inspectProperty);
  return `${name}${message}${propertyContents ? ` { ${propertyContents} }` : ""}`;
}

// ../node_modules/loupe/lib/html.js
function inspectAttribute([key, value], options) {
  return options.truncate -= 3, value ? `${options.stylize(String(key), "yellow")}=${options.stylize(`"${value}"`, "string")}` : `${options.stylize(String(key), "yellow")}`;
}
function inspectNodeCollection(collection, options) {
  return inspectList(collection, options, inspectNode, `
`);
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
  let properties = element.getAttributeNames(), name = element.tagName.toLowerCase(), head = options.stylize(`<${name}`, "special"), headClose = options.stylize(">", "special"), tail = options.stylize(`</${name}>`, "special");
  options.truncate -= name.length * 2 + 5;
  let propertyContents = "";
  properties.length > 0 && (propertyContents += " ", propertyContents += inspectList(properties.map((key) => [key, element.getAttribute(key)]), options, inspectAttribute, " ")), options.truncate -= propertyContents.length;
  let truncate2 = options.truncate, children = inspectNodeCollection(element.children, options);
  return children && children.length > truncate2 && (children = `${truncator}(${element.children.length})`), `${head}${propertyContents}${headClose}${children}${tail}`;
}

// ../node_modules/loupe/lib/index.js
var symbolsSupported = typeof Symbol == "function" && typeof Symbol.for == "function", chaiInspect = symbolsSupported ? Symbol.for("chai/inspect") : "@@chai/inspect", nodeInspect = Symbol.for("nodejs.util.inspect.custom"), constructorMap = /* @__PURE__ */ new WeakMap(), stringTagMap = {}, baseTypesMap = {
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
  Promise: promise_default,
  // WeakSet, WeakMap are totally opaque to us
  WeakSet: (value, options) => options.stylize("WeakSet{\u2026}", "special"),
  WeakMap: (value, options) => options.stylize("WeakMap{\u2026}", "special"),
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
  Error: inspectObject2,
  HTMLCollection: inspectNodeCollection,
  NodeList: inspectNodeCollection
}, inspectCustom = (value, options, type, inspectFn) => chaiInspect in value && typeof value[chaiInspect] == "function" ? value[chaiInspect](options) : nodeInspect in value && typeof value[nodeInspect] == "function" ? value[nodeInspect](options.depth, options, inspectFn) : "inspect" in value && typeof value.inspect == "function" ? value.inspect(options.depth, options) : "constructor" in value && constructorMap.has(value.constructor) ? constructorMap.get(value.constructor)(value, options) : stringTagMap[type] ? stringTagMap[type](value, options) : "", toString2 = Object.prototype.toString;
function inspect(value, opts = {}) {
  let options = normaliseOptions(opts, inspect), { customInspect } = options, type = value === null ? "null" : typeof value;
  if (type === "object" && (type = toString2.call(value).slice(8, -1)), type in baseTypesMap)
    return baseTypesMap[type](value, options);
  if (customInspect && value) {
    let output = inspectCustom(value, options, type, inspect);
    if (output)
      return typeof output == "string" ? output : inspect(output, options);
  }
  let proto = value ? Object.getPrototypeOf(value) : !1;
  return proto === Object.prototype || proto === null ? inspectObject(value, options) : value && typeof HTMLElement == "function" && value instanceof HTMLElement ? inspectHTML(value, options) : "constructor" in value ? value.constructor !== Object ? inspectClass(value, options) : inspectObject(value, options) : value === Object(value) ? inspectObject(value, options) : options.stylize(String(value), type);
}

// ../node_modules/@vitest/utils/dist/chunk-_commonjsHelpers.js
var { AsymmetricMatcher, DOMCollection, DOMElement, Immutable, ReactElement, ReactTestComponent } = plugins, PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher
];
function stringify(object, maxDepth = 10, { maxLength, ...options } = {}) {
  let MAX_LENGTH = maxLength ?? 1e4, result;
  try {
    result = format(object, {
      maxDepth,
      escapeString: !1,
      plugins: PLUGINS,
      ...options
    });
  } catch {
    result = format(object, {
      callToJSON: !1,
      maxDepth,
      escapeString: !1,
      plugins: PLUGINS,
      ...options
    });
  }
  return result.length >= MAX_LENGTH && maxDepth > 1 ? stringify(object, Math.floor(Math.min(maxDepth, Number.MAX_SAFE_INTEGER) / 2), {
    maxLength,
    ...options
  }) : result;
}
var formatRegExp = /%[sdjifoOc%]/g;
function format2(...args) {
  if (typeof args[0] != "string") {
    let objects = [];
    for (let i2 = 0; i2 < args.length; i2++)
      objects.push(inspect2(args[i2], {
        depth: 0,
        colors: !1
      }));
    return objects.join(" ");
  }
  let len = args.length, i = 1, template = args[0], str = String(template).replace(formatRegExp, (x) => {
    if (x === "%%")
      return "%";
    if (i >= len)
      return x;
    switch (x) {
      case "%s": {
        let value = args[i++];
        return typeof value == "bigint" ? `${value.toString()}n` : typeof value == "number" && value === 0 && 1 / value < 0 ? "-0" : typeof value == "object" && value !== null ? typeof value.toString == "function" && value.toString !== Object.prototype.toString ? value.toString() : inspect2(value, {
          depth: 0,
          colors: !1
        }) : String(value);
      }
      case "%d": {
        let value = args[i++];
        return typeof value == "bigint" ? `${value.toString()}n` : Number(value).toString();
      }
      case "%i": {
        let value = args[i++];
        return typeof value == "bigint" ? `${value.toString()}n` : Number.parseInt(String(value)).toString();
      }
      case "%f":
        return Number.parseFloat(String(args[i++])).toString();
      case "%o":
        return inspect2(args[i++], {
          showHidden: !0,
          showProxy: !0
        });
      case "%O":
        return inspect2(args[i++]);
      case "%c":
        return i++, "";
      case "%j":
        try {
          return JSON.stringify(args[i++]);
        } catch (err) {
          let m2 = err.message;
          if (m2.includes("circular structure") || m2.includes("cyclic structures") || m2.includes("cyclic object"))
            return "[Circular]";
          throw err;
        }
      default:
        return x;
    }
  });
  for (let x = args[i]; i < len; x = args[++i])
    x === null || typeof x != "object" ? str += ` ${x}` : str += ` ${inspect2(x)}`;
  return str;
}
function inspect2(obj, options = {}) {
  return options.truncate === 0 && (options.truncate = Number.POSITIVE_INFINITY), inspect(obj, options);
}
function getDefaultExportFromCjs2(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x.default : x;
}

// ../node_modules/@vitest/utils/dist/helpers.js
function assertTypes(value, name, types) {
  let receivedType = typeof value;
  if (!types.includes(receivedType))
    throw new TypeError(`${name} value must be ${types.join(" or ")}, received "${receivedType}"`);
}
function isObject(item) {
  return item != null && typeof item == "object" && !Array.isArray(item);
}
function isFinalObj(obj) {
  return obj === Object.prototype || obj === Function.prototype || obj === RegExp.prototype;
}
function getType2(value) {
  return Object.prototype.toString.apply(value).slice(8, -1);
}
function collectOwnProperties(obj, collector) {
  let collect = typeof collector == "function" ? collector : (key) => collector.add(key);
  Object.getOwnPropertyNames(obj).forEach(collect), Object.getOwnPropertySymbols(obj).forEach(collect);
}
function getOwnProperties(obj) {
  let ownProps = /* @__PURE__ */ new Set();
  return isFinalObj(obj) ? [] : (collectOwnProperties(obj, ownProps), Array.from(ownProps));
}
var defaultCloneOptions = { forceWritable: !1 };
function deepClone(val, options = defaultCloneOptions) {
  return clone(val, /* @__PURE__ */ new WeakMap(), options);
}
function clone(val, seen, options = defaultCloneOptions) {
  let k, out;
  if (seen.has(val))
    return seen.get(val);
  if (Array.isArray(val)) {
    for (out = Array.from({ length: k = val.length }), seen.set(val, out); k--; )
      out[k] = clone(val[k], seen, options);
    return out;
  }
  if (Object.prototype.toString.call(val) === "[object Object]") {
    out = Object.create(Object.getPrototypeOf(val)), seen.set(val, out);
    let props = getOwnProperties(val);
    for (let k2 of props) {
      let descriptor = Object.getOwnPropertyDescriptor(val, k2);
      if (!descriptor)
        continue;
      let cloned = clone(val[k2], seen, options);
      options.forceWritable ? Object.defineProperty(out, k2, {
        enumerable: descriptor.enumerable,
        configurable: !0,
        writable: !0,
        value: cloned
      }) : "get" in descriptor ? Object.defineProperty(out, k2, {
        ...descriptor,
        get() {
          return cloned;
        }
      }) : Object.defineProperty(out, k2, {
        ...descriptor,
        value: cloned
      });
    }
    return out;
  }
  return val;
}
function noop() {
}

// ../node_modules/@vitest/utils/dist/diff.js
var DIFF_DELETE = -1, DIFF_INSERT = 1, DIFF_EQUAL = 0, Diff = class {
  0;
  1;
  constructor(op, text) {
    this[0] = op, this[1] = text;
  }
};
function diff_commonPrefix(text1, text2) {
  if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0))
    return 0;
  let pointermin = 0, pointermax = Math.min(text1.length, text2.length), pointermid = pointermax, pointerstart = 0;
  for (; pointermin < pointermid; )
    text1.substring(pointerstart, pointermid) === text2.substring(pointerstart, pointermid) ? (pointermin = pointermid, pointerstart = pointermin) : pointermax = pointermid, pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  return pointermid;
}
function diff_commonSuffix(text1, text2) {
  if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1))
    return 0;
  let pointermin = 0, pointermax = Math.min(text1.length, text2.length), pointermid = pointermax, pointerend = 0;
  for (; pointermin < pointermid; )
    text1.substring(text1.length - pointermid, text1.length - pointerend) === text2.substring(text2.length - pointermid, text2.length - pointerend) ? (pointermin = pointermid, pointerend = pointermin) : pointermax = pointermid, pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  return pointermid;
}
function diff_commonOverlap_(text1, text2) {
  let text1_length = text1.length, text2_length = text2.length;
  if (text1_length === 0 || text2_length === 0)
    return 0;
  text1_length > text2_length ? text1 = text1.substring(text1_length - text2_length) : text1_length < text2_length && (text2 = text2.substring(0, text1_length));
  let text_length = Math.min(text1_length, text2_length);
  if (text1 === text2)
    return text_length;
  let best = 0, length = 1;
  for (; ; ) {
    let pattern = text1.substring(text_length - length), found = text2.indexOf(pattern);
    if (found === -1)
      return best;
    length += found, (found === 0 || text1.substring(text_length - length) === text2.substring(0, length)) && (best = length, length++);
  }
}
function diff_cleanupSemantic(diffs) {
  let changes = !1, equalities = [], equalitiesLength = 0, lastEquality = null, pointer = 0, length_insertions1 = 0, length_deletions1 = 0, length_insertions2 = 0, length_deletions2 = 0;
  for (; pointer < diffs.length; )
    diffs[pointer][0] === DIFF_EQUAL ? (equalities[equalitiesLength++] = pointer, length_insertions1 = length_insertions2, length_deletions1 = length_deletions2, length_insertions2 = 0, length_deletions2 = 0, lastEquality = diffs[pointer][1]) : (diffs[pointer][0] === DIFF_INSERT ? length_insertions2 += diffs[pointer][1].length : length_deletions2 += diffs[pointer][1].length, lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(length_insertions2, length_deletions2) && (diffs.splice(equalities[equalitiesLength - 1], 0, new Diff(DIFF_DELETE, lastEquality)), diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT, equalitiesLength--, equalitiesLength--, pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1, length_insertions1 = 0, length_deletions1 = 0, length_insertions2 = 0, length_deletions2 = 0, lastEquality = null, changes = !0)), pointer++;
  for (changes && diff_cleanupMerge(diffs), diff_cleanupSemanticLossless(diffs), pointer = 1; pointer < diffs.length; ) {
    if (diffs[pointer - 1][0] === DIFF_DELETE && diffs[pointer][0] === DIFF_INSERT) {
      let deletion = diffs[pointer - 1][1], insertion = diffs[pointer][1], overlap_length1 = diff_commonOverlap_(deletion, insertion), overlap_length2 = diff_commonOverlap_(insertion, deletion);
      overlap_length1 >= overlap_length2 ? (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) && (diffs.splice(pointer, 0, new Diff(DIFF_EQUAL, insertion.substring(0, overlap_length1))), diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1), diffs[pointer + 1][1] = insertion.substring(overlap_length1), pointer++) : (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) && (diffs.splice(pointer, 0, new Diff(DIFF_EQUAL, deletion.substring(0, overlap_length2))), diffs[pointer - 1][0] = DIFF_INSERT, diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2), diffs[pointer + 1][0] = DIFF_DELETE, diffs[pointer + 1][1] = deletion.substring(overlap_length2), pointer++), pointer++;
    }
    pointer++;
  }
}
var nonAlphaNumericRegex_ = /[^a-z0-9]/i, whitespaceRegex_ = /\s/, linebreakRegex_ = /[\r\n]/, blanklineEndRegex_ = /\n\r?\n$/, blanklineStartRegex_ = /^\r?\n\r?\n/;
function diff_cleanupSemanticLossless(diffs) {
  let pointer = 1;
  for (; pointer < diffs.length - 1; ) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
      let equality1 = diffs[pointer - 1][1], edit = diffs[pointer][1], equality2 = diffs[pointer + 1][1], commonOffset = diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        let commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset), edit = commonString + edit.substring(0, edit.length - commonOffset), equality2 = commonString + equality2;
      }
      let bestEquality1 = equality1, bestEdit = edit, bestEquality2 = equality2, bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
      for (; edit.charAt(0) === equality2.charAt(0); ) {
        equality1 += edit.charAt(0), edit = edit.substring(1) + equality2.charAt(0), equality2 = equality2.substring(1);
        let score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
        score >= bestScore && (bestScore = score, bestEquality1 = equality1, bestEdit = edit, bestEquality2 = equality2);
      }
      diffs[pointer - 1][1] !== bestEquality1 && (bestEquality1 ? diffs[pointer - 1][1] = bestEquality1 : (diffs.splice(pointer - 1, 1), pointer--), diffs[pointer][1] = bestEdit, bestEquality2 ? diffs[pointer + 1][1] = bestEquality2 : (diffs.splice(pointer + 1, 1), pointer--));
    }
    pointer++;
  }
}
function diff_cleanupMerge(diffs) {
  diffs.push(new Diff(DIFF_EQUAL, ""));
  let pointer = 0, count_delete = 0, count_insert = 0, text_delete = "", text_insert = "", commonlength;
  for (; pointer < diffs.length; )
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++, text_insert += diffs[pointer][1], pointer++;
        break;
      case DIFF_DELETE:
        count_delete++, text_delete += diffs[pointer][1], pointer++;
        break;
      case DIFF_EQUAL:
        count_delete + count_insert > 1 ? (count_delete !== 0 && count_insert !== 0 && (commonlength = diff_commonPrefix(text_insert, text_delete), commonlength !== 0 && (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] === DIFF_EQUAL ? diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength) : (diffs.splice(0, 0, new Diff(DIFF_EQUAL, text_insert.substring(0, commonlength))), pointer++), text_insert = text_insert.substring(commonlength), text_delete = text_delete.substring(commonlength)), commonlength = diff_commonSuffix(text_insert, text_delete), commonlength !== 0 && (diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1], text_insert = text_insert.substring(0, text_insert.length - commonlength), text_delete = text_delete.substring(0, text_delete.length - commonlength))), pointer -= count_delete + count_insert, diffs.splice(pointer, count_delete + count_insert), text_delete.length && (diffs.splice(pointer, 0, new Diff(DIFF_DELETE, text_delete)), pointer++), text_insert.length && (diffs.splice(pointer, 0, new Diff(DIFF_INSERT, text_insert)), pointer++), pointer++) : pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL ? (diffs[pointer - 1][1] += diffs[pointer][1], diffs.splice(pointer, 1)) : pointer++, count_insert = 0, count_delete = 0, text_delete = "", text_insert = "";
        break;
    }
  diffs[diffs.length - 1][1] === "" && diffs.pop();
  let changes = !1;
  for (pointer = 1; pointer < diffs.length - 1; )
    diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL && (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) === diffs[pointer - 1][1] ? (diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length), diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1], diffs.splice(pointer - 1, 1), changes = !0) : diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) === diffs[pointer + 1][1] && (diffs[pointer - 1][1] += diffs[pointer + 1][1], diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1], diffs.splice(pointer + 1, 1), changes = !0)), pointer++;
  changes && diff_cleanupMerge(diffs);
}
function diff_cleanupSemanticScore_(one, two) {
  if (!one || !two)
    return 6;
  let char1 = one.charAt(one.length - 1), char2 = two.charAt(0), nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_), nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_), whitespace1 = nonAlphaNumeric1 && char1.match(whitespaceRegex_), whitespace2 = nonAlphaNumeric2 && char2.match(whitespaceRegex_), lineBreak1 = whitespace1 && char1.match(linebreakRegex_), lineBreak2 = whitespace2 && char2.match(linebreakRegex_), blankLine1 = lineBreak1 && one.match(blanklineEndRegex_), blankLine2 = lineBreak2 && two.match(blanklineStartRegex_);
  return blankLine1 || blankLine2 ? 5 : lineBreak1 || lineBreak2 ? 4 : nonAlphaNumeric1 && !whitespace1 && whitespace2 ? 3 : whitespace1 || whitespace2 ? 2 : nonAlphaNumeric1 || nonAlphaNumeric2 ? 1 : 0;
}
var NO_DIFF_MESSAGE = "Compared values have no visual difference.", SIMILAR_MESSAGE = "Compared values serialize to the same structure.\nPrinting internal object structure without calling `toJSON` instead.", build = {}, hasRequiredBuild;
function requireBuild() {
  if (hasRequiredBuild) return build;
  hasRequiredBuild = 1, Object.defineProperty(build, "__esModule", {
    value: !0
  }), build.default = diffSequence;
  let pkg = "diff-sequences", NOT_YET_SET = 0, countCommonItemsF = (aIndex, aEnd, bIndex, bEnd, isCommon) => {
    let nCommon = 0;
    for (; aIndex < aEnd && bIndex < bEnd && isCommon(aIndex, bIndex); )
      aIndex += 1, bIndex += 1, nCommon += 1;
    return nCommon;
  }, countCommonItemsR = (aStart, aIndex, bStart, bIndex, isCommon) => {
    let nCommon = 0;
    for (; aStart <= aIndex && bStart <= bIndex && isCommon(aIndex, bIndex); )
      aIndex -= 1, bIndex -= 1, nCommon += 1;
    return nCommon;
  }, extendPathsF = (d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF) => {
    let iF = 0, kF = -d, aFirst = aIndexesF[iF], aIndexPrev1 = aFirst;
    aIndexesF[iF] += countCommonItemsF(
      aFirst + 1,
      aEnd,
      bF + aFirst - kF + 1,
      bEnd,
      isCommon
    );
    let nF = d < iMaxF ? d : iMaxF;
    for (iF += 1, kF += 2; iF <= nF; iF += 1, kF += 2) {
      if (iF !== d && aIndexPrev1 < aIndexesF[iF])
        aFirst = aIndexesF[iF];
      else if (aFirst = aIndexPrev1 + 1, aEnd <= aFirst)
        return iF - 1;
      aIndexPrev1 = aIndexesF[iF], aIndexesF[iF] = aFirst + countCommonItemsF(aFirst + 1, aEnd, bF + aFirst - kF + 1, bEnd, isCommon);
    }
    return iMaxF;
  }, extendPathsR = (d, aStart, bStart, bR, isCommon, aIndexesR, iMaxR) => {
    let iR = 0, kR = d, aFirst = aIndexesR[iR], aIndexPrev1 = aFirst;
    aIndexesR[iR] -= countCommonItemsR(
      aStart,
      aFirst - 1,
      bStart,
      bR + aFirst - kR - 1,
      isCommon
    );
    let nR = d < iMaxR ? d : iMaxR;
    for (iR += 1, kR -= 2; iR <= nR; iR += 1, kR -= 2) {
      if (iR !== d && aIndexesR[iR] < aIndexPrev1)
        aFirst = aIndexesR[iR];
      else if (aFirst = aIndexPrev1 - 1, aFirst < aStart)
        return iR - 1;
      aIndexPrev1 = aIndexesR[iR], aIndexesR[iR] = aFirst - countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bR + aFirst - kR - 1,
        isCommon
      );
    }
    return iMaxR;
  }, extendOverlappablePathsF = (d, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, iMaxF, aIndexesR, iMaxR, division) => {
    let bF = bStart - aStart, aLength = aEnd - aStart, baDeltaLength = bEnd - bStart - aLength, kMinOverlapF = -baDeltaLength - (d - 1), kMaxOverlapF = -baDeltaLength + (d - 1), aIndexPrev1 = NOT_YET_SET, nF = d < iMaxF ? d : iMaxF;
    for (let iF = 0, kF = -d; iF <= nF; iF += 1, kF += 2) {
      let insert = iF === 0 || iF !== d && aIndexPrev1 < aIndexesF[iF], aLastPrev = insert ? aIndexesF[iF] : aIndexPrev1, aFirst = insert ? aLastPrev : aLastPrev + 1, bFirst = bF + aFirst - kF, nCommonF = countCommonItemsF(
        aFirst + 1,
        aEnd,
        bFirst + 1,
        bEnd,
        isCommon
      ), aLast = aFirst + nCommonF;
      if (aIndexPrev1 = aIndexesF[iF], aIndexesF[iF] = aLast, kMinOverlapF <= kF && kF <= kMaxOverlapF) {
        let iR = (d - 1 - (kF + baDeltaLength)) / 2;
        if (iR <= iMaxR && aIndexesR[iR] - 1 <= aLast) {
          let bLastPrev = bF + aLastPrev - (insert ? kF + 1 : kF - 1), nCommonR = countCommonItemsR(
            aStart,
            aLastPrev,
            bStart,
            bLastPrev,
            isCommon
          ), aIndexPrevFirst = aLastPrev - nCommonR, bIndexPrevFirst = bLastPrev - nCommonR, aEndPreceding = aIndexPrevFirst + 1, bEndPreceding = bIndexPrevFirst + 1;
          division.nChangePreceding = d - 1, d - 1 === aEndPreceding + bEndPreceding - aStart - bStart ? (division.aEndPreceding = aStart, division.bEndPreceding = bStart) : (division.aEndPreceding = aEndPreceding, division.bEndPreceding = bEndPreceding), division.nCommonPreceding = nCommonR, nCommonR !== 0 && (division.aCommonPreceding = aEndPreceding, division.bCommonPreceding = bEndPreceding), division.nCommonFollowing = nCommonF, nCommonF !== 0 && (division.aCommonFollowing = aFirst + 1, division.bCommonFollowing = bFirst + 1);
          let aStartFollowing = aLast + 1, bStartFollowing = bFirst + nCommonF + 1;
          return division.nChangeFollowing = d - 1, d - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing ? (division.aStartFollowing = aEnd, division.bStartFollowing = bEnd) : (division.aStartFollowing = aStartFollowing, division.bStartFollowing = bStartFollowing), !0;
        }
      }
    }
    return !1;
  }, extendOverlappablePathsR = (d, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, iMaxF, aIndexesR, iMaxR, division) => {
    let bR = bEnd - aEnd, aLength = aEnd - aStart, baDeltaLength = bEnd - bStart - aLength, kMinOverlapR = baDeltaLength - d, kMaxOverlapR = baDeltaLength + d, aIndexPrev1 = NOT_YET_SET, nR = d < iMaxR ? d : iMaxR;
    for (let iR = 0, kR = d; iR <= nR; iR += 1, kR -= 2) {
      let insert = iR === 0 || iR !== d && aIndexesR[iR] < aIndexPrev1, aLastPrev = insert ? aIndexesR[iR] : aIndexPrev1, aFirst = insert ? aLastPrev : aLastPrev - 1, bFirst = bR + aFirst - kR, nCommonR = countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bFirst - 1,
        isCommon
      ), aLast = aFirst - nCommonR;
      if (aIndexPrev1 = aIndexesR[iR], aIndexesR[iR] = aLast, kMinOverlapR <= kR && kR <= kMaxOverlapR) {
        let iF = (d + (kR - baDeltaLength)) / 2;
        if (iF <= iMaxF && aLast - 1 <= aIndexesF[iF]) {
          let bLast = bFirst - nCommonR;
          if (division.nChangePreceding = d, d === aLast + bLast - aStart - bStart ? (division.aEndPreceding = aStart, division.bEndPreceding = bStart) : (division.aEndPreceding = aLast, division.bEndPreceding = bLast), division.nCommonPreceding = nCommonR, nCommonR !== 0 && (division.aCommonPreceding = aLast, division.bCommonPreceding = bLast), division.nChangeFollowing = d - 1, d === 1)
            division.nCommonFollowing = 0, division.aStartFollowing = aEnd, division.bStartFollowing = bEnd;
          else {
            let bLastPrev = bR + aLastPrev - (insert ? kR - 1 : kR + 1), nCommonF = countCommonItemsF(
              aLastPrev,
              aEnd,
              bLastPrev,
              bEnd,
              isCommon
            );
            division.nCommonFollowing = nCommonF, nCommonF !== 0 && (division.aCommonFollowing = aLastPrev, division.bCommonFollowing = bLastPrev);
            let aStartFollowing = aLastPrev + nCommonF, bStartFollowing = bLastPrev + nCommonF;
            d - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing ? (division.aStartFollowing = aEnd, division.bStartFollowing = bEnd) : (division.aStartFollowing = aStartFollowing, division.bStartFollowing = bStartFollowing);
          }
          return !0;
        }
      }
    }
    return !1;
  }, divide = (nChange, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, aIndexesR, division) => {
    let bF = bStart - aStart, bR = bEnd - aEnd, aLength = aEnd - aStart, bLength = bEnd - bStart, baDeltaLength = bLength - aLength, iMaxF = aLength, iMaxR = aLength;
    if (aIndexesF[0] = aStart - 1, aIndexesR[0] = aEnd, baDeltaLength % 2 === 0) {
      let dMin = (nChange || baDeltaLength) / 2, dMax = (aLength + bLength) / 2;
      for (let d = 1; d <= dMax; d += 1)
        if (iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF), d < dMin)
          iMaxR = extendPathsR(d, aStart, bStart, bR, isCommon, aIndexesR, iMaxR);
        else if (
          // If a reverse path overlaps a forward path in the same diagonal,
          // return a division of the index intervals at the middle change.
          extendOverlappablePathsR(
            d,
            aStart,
            aEnd,
            bStart,
            bEnd,
            isCommon,
            aIndexesF,
            iMaxF,
            aIndexesR,
            iMaxR,
            division
          )
        )
          return;
    } else {
      let dMin = ((nChange || baDeltaLength) + 1) / 2, dMax = (aLength + bLength + 1) / 2, d = 1;
      for (iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF), d += 1; d <= dMax; d += 1)
        if (iMaxR = extendPathsR(
          d - 1,
          aStart,
          bStart,
          bR,
          isCommon,
          aIndexesR,
          iMaxR
        ), d < dMin)
          iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
        else if (
          // If a forward path overlaps a reverse path in the same diagonal,
          // return a division of the index intervals at the middle change.
          extendOverlappablePathsF(
            d,
            aStart,
            aEnd,
            bStart,
            bEnd,
            isCommon,
            aIndexesF,
            iMaxF,
            aIndexesR,
            iMaxR,
            division
          )
        )
          return;
    }
    throw new Error(
      `${pkg}: no overlap aStart=${aStart} aEnd=${aEnd} bStart=${bStart} bEnd=${bEnd}`
    );
  }, findSubsequences = (nChange, aStart, aEnd, bStart, bEnd, transposed, callbacks, aIndexesF, aIndexesR, division) => {
    if (bEnd - bStart < aEnd - aStart) {
      if (transposed = !transposed, transposed && callbacks.length === 1) {
        let { foundSubsequence: foundSubsequence2, isCommon: isCommon2 } = callbacks[0];
        callbacks[1] = {
          foundSubsequence: (nCommon, bCommon, aCommon) => {
            foundSubsequence2(nCommon, aCommon, bCommon);
          },
          isCommon: (bIndex, aIndex) => isCommon2(aIndex, bIndex)
        };
      }
      let tStart = aStart, tEnd = aEnd;
      aStart = bStart, aEnd = bEnd, bStart = tStart, bEnd = tEnd;
    }
    let { foundSubsequence, isCommon } = callbacks[transposed ? 1 : 0];
    divide(
      nChange,
      aStart,
      aEnd,
      bStart,
      bEnd,
      isCommon,
      aIndexesF,
      aIndexesR,
      division
    );
    let {
      nChangePreceding,
      aEndPreceding,
      bEndPreceding,
      nCommonPreceding,
      aCommonPreceding,
      bCommonPreceding,
      nCommonFollowing,
      aCommonFollowing,
      bCommonFollowing,
      nChangeFollowing,
      aStartFollowing,
      bStartFollowing
    } = division;
    aStart < aEndPreceding && bStart < bEndPreceding && findSubsequences(
      nChangePreceding,
      aStart,
      aEndPreceding,
      bStart,
      bEndPreceding,
      transposed,
      callbacks,
      aIndexesF,
      aIndexesR,
      division
    ), nCommonPreceding !== 0 && foundSubsequence(nCommonPreceding, aCommonPreceding, bCommonPreceding), nCommonFollowing !== 0 && foundSubsequence(nCommonFollowing, aCommonFollowing, bCommonFollowing), aStartFollowing < aEnd && bStartFollowing < bEnd && findSubsequences(
      nChangeFollowing,
      aStartFollowing,
      aEnd,
      bStartFollowing,
      bEnd,
      transposed,
      callbacks,
      aIndexesF,
      aIndexesR,
      division
    );
  }, validateLength = (name, arg) => {
    if (typeof arg != "number")
      throw new TypeError(`${pkg}: ${name} typeof ${typeof arg} is not a number`);
    if (!Number.isSafeInteger(arg))
      throw new RangeError(`${pkg}: ${name} value ${arg} is not a safe integer`);
    if (arg < 0)
      throw new RangeError(`${pkg}: ${name} value ${arg} is a negative integer`);
  }, validateCallback = (name, arg) => {
    let type = typeof arg;
    if (type !== "function")
      throw new TypeError(`${pkg}: ${name} typeof ${type} is not a function`);
  };
  function diffSequence(aLength, bLength, isCommon, foundSubsequence) {
    validateLength("aLength", aLength), validateLength("bLength", bLength), validateCallback("isCommon", isCommon), validateCallback("foundSubsequence", foundSubsequence);
    let nCommonF = countCommonItemsF(0, aLength, 0, bLength, isCommon);
    if (nCommonF !== 0 && foundSubsequence(nCommonF, 0, 0), aLength !== nCommonF || bLength !== nCommonF) {
      let aStart = nCommonF, bStart = nCommonF, nCommonR = countCommonItemsR(
        aStart,
        aLength - 1,
        bStart,
        bLength - 1,
        isCommon
      ), aEnd = aLength - nCommonR, bEnd = bLength - nCommonR, nCommonFR = nCommonF + nCommonR;
      aLength !== nCommonFR && bLength !== nCommonFR && findSubsequences(
        0,
        aStart,
        aEnd,
        bStart,
        bEnd,
        !1,
        [
          {
            foundSubsequence,
            isCommon
          }
        ],
        [NOT_YET_SET],
        [NOT_YET_SET],
        {
          aCommonFollowing: NOT_YET_SET,
          aCommonPreceding: NOT_YET_SET,
          aEndPreceding: NOT_YET_SET,
          aStartFollowing: NOT_YET_SET,
          bCommonFollowing: NOT_YET_SET,
          bCommonPreceding: NOT_YET_SET,
          bEndPreceding: NOT_YET_SET,
          bStartFollowing: NOT_YET_SET,
          nChangeFollowing: NOT_YET_SET,
          nChangePreceding: NOT_YET_SET,
          nCommonFollowing: NOT_YET_SET,
          nCommonPreceding: NOT_YET_SET
        }
      ), nCommonR !== 0 && foundSubsequence(nCommonR, aEnd, bEnd);
    }
  }
  return build;
}
var buildExports = requireBuild(), diffSequences = getDefaultExportFromCjs2(buildExports);
function formatTrailingSpaces(line, trailingSpaceFormatter) {
  return line.replace(/\s+$/, (match) => trailingSpaceFormatter(match));
}
function printDiffLine(line, isFirstOrLast, color, indicator, trailingSpaceFormatter, emptyFirstOrLastLinePlaceholder) {
  return line.length !== 0 ? color(`${indicator} ${formatTrailingSpaces(line, trailingSpaceFormatter)}`) : indicator !== " " ? color(indicator) : isFirstOrLast && emptyFirstOrLastLinePlaceholder.length !== 0 ? color(`${indicator} ${emptyFirstOrLastLinePlaceholder}`) : "";
}
function printDeleteLine(line, isFirstOrLast, { aColor, aIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder }) {
  return printDiffLine(line, isFirstOrLast, aColor, aIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder);
}
function printInsertLine(line, isFirstOrLast, { bColor, bIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder }) {
  return printDiffLine(line, isFirstOrLast, bColor, bIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder);
}
function printCommonLine(line, isFirstOrLast, { commonColor, commonIndicator, commonLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder }) {
  return printDiffLine(line, isFirstOrLast, commonColor, commonIndicator, commonLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder);
}
function createPatchMark(aStart, aEnd, bStart, bEnd, { patchColor }) {
  return patchColor(`@@ -${aStart + 1},${aEnd - aStart} +${bStart + 1},${bEnd - bStart} @@`);
}
function joinAlignedDiffsNoExpand(diffs, options) {
  let iLength = diffs.length, nContextLines = options.contextLines, nContextLines2 = nContextLines + nContextLines, jLength = iLength, hasExcessAtStartOrEnd = !1, nExcessesBetweenChanges = 0, i = 0;
  for (; i !== iLength; ) {
    let iStart = i;
    for (; i !== iLength && diffs[i][0] === DIFF_EQUAL; )
      i += 1;
    if (iStart !== i)
      if (iStart === 0)
        i > nContextLines && (jLength -= i - nContextLines, hasExcessAtStartOrEnd = !0);
      else if (i === iLength) {
        let n = i - iStart;
        n > nContextLines && (jLength -= n - nContextLines, hasExcessAtStartOrEnd = !0);
      } else {
        let n = i - iStart;
        n > nContextLines2 && (jLength -= n - nContextLines2, nExcessesBetweenChanges += 1);
      }
    for (; i !== iLength && diffs[i][0] !== DIFF_EQUAL; )
      i += 1;
  }
  let hasPatch = nExcessesBetweenChanges !== 0 || hasExcessAtStartOrEnd;
  nExcessesBetweenChanges !== 0 ? jLength += nExcessesBetweenChanges + 1 : hasExcessAtStartOrEnd && (jLength += 1);
  let jLast = jLength - 1, lines = [], jPatchMark = 0;
  hasPatch && lines.push("");
  let aStart = 0, bStart = 0, aEnd = 0, bEnd = 0, pushCommonLine = (line) => {
    let j = lines.length;
    lines.push(printCommonLine(line, j === 0 || j === jLast, options)), aEnd += 1, bEnd += 1;
  }, pushDeleteLine = (line) => {
    let j = lines.length;
    lines.push(printDeleteLine(line, j === 0 || j === jLast, options)), aEnd += 1;
  }, pushInsertLine = (line) => {
    let j = lines.length;
    lines.push(printInsertLine(line, j === 0 || j === jLast, options)), bEnd += 1;
  };
  for (i = 0; i !== iLength; ) {
    let iStart = i;
    for (; i !== iLength && diffs[i][0] === DIFF_EQUAL; )
      i += 1;
    if (iStart !== i)
      if (iStart === 0) {
        i > nContextLines && (iStart = i - nContextLines, aStart = iStart, bStart = iStart, aEnd = aStart, bEnd = bStart);
        for (let iCommon = iStart; iCommon !== i; iCommon += 1)
          pushCommonLine(diffs[iCommon][1]);
      } else if (i === iLength) {
        let iEnd = i - iStart > nContextLines ? iStart + nContextLines : i;
        for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1)
          pushCommonLine(diffs[iCommon][1]);
      } else {
        let nCommon = i - iStart;
        if (nCommon > nContextLines2) {
          let iEnd = iStart + nContextLines;
          for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1)
            pushCommonLine(diffs[iCommon][1]);
          lines[jPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd, options), jPatchMark = lines.length, lines.push("");
          let nOmit = nCommon - nContextLines2;
          aStart = aEnd + nOmit, bStart = bEnd + nOmit, aEnd = aStart, bEnd = bStart;
          for (let iCommon = i - nContextLines; iCommon !== i; iCommon += 1)
            pushCommonLine(diffs[iCommon][1]);
        } else
          for (let iCommon = iStart; iCommon !== i; iCommon += 1)
            pushCommonLine(diffs[iCommon][1]);
      }
    for (; i !== iLength && diffs[i][0] === DIFF_DELETE; )
      pushDeleteLine(diffs[i][1]), i += 1;
    for (; i !== iLength && diffs[i][0] === DIFF_INSERT; )
      pushInsertLine(diffs[i][1]), i += 1;
  }
  return hasPatch && (lines[jPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd, options)), lines.join(`
`);
}
function joinAlignedDiffsExpand(diffs, options) {
  return diffs.map((diff2, i, diffs2) => {
    let line = diff2[1], isFirstOrLast = i === 0 || i === diffs2.length - 1;
    switch (diff2[0]) {
      case DIFF_DELETE:
        return printDeleteLine(line, isFirstOrLast, options);
      case DIFF_INSERT:
        return printInsertLine(line, isFirstOrLast, options);
      default:
        return printCommonLine(line, isFirstOrLast, options);
    }
  }).join(`
`);
}
var noColor = (string) => string, DIFF_CONTEXT_DEFAULT = 5, DIFF_TRUNCATE_THRESHOLD_DEFAULT = 0;
function getDefaultOptions() {
  return {
    aAnnotation: "Expected",
    aColor: s.green,
    aIndicator: "-",
    bAnnotation: "Received",
    bColor: s.red,
    bIndicator: "+",
    changeColor: s.inverse,
    changeLineTrailingSpaceColor: noColor,
    commonColor: s.dim,
    commonIndicator: " ",
    commonLineTrailingSpaceColor: noColor,
    compareKeys: void 0,
    contextLines: DIFF_CONTEXT_DEFAULT,
    emptyFirstOrLastLinePlaceholder: "",
    expand: !1,
    includeChangeCounts: !1,
    omitAnnotationLines: !1,
    patchColor: s.yellow,
    printBasicPrototype: !1,
    truncateThreshold: DIFF_TRUNCATE_THRESHOLD_DEFAULT,
    truncateAnnotation: "... Diff result is truncated",
    truncateAnnotationColor: noColor
  };
}
function getCompareKeys(compareKeys) {
  return compareKeys && typeof compareKeys == "function" ? compareKeys : void 0;
}
function getContextLines(contextLines) {
  return typeof contextLines == "number" && Number.isSafeInteger(contextLines) && contextLines >= 0 ? contextLines : DIFF_CONTEXT_DEFAULT;
}
function normalizeDiffOptions(options = {}) {
  return {
    ...getDefaultOptions(),
    ...options,
    compareKeys: getCompareKeys(options.compareKeys),
    contextLines: getContextLines(options.contextLines)
  };
}
function isEmptyString(lines) {
  return lines.length === 1 && lines[0].length === 0;
}
function countChanges(diffs) {
  let a2 = 0, b = 0;
  return diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        a2 += 1;
        break;
      case DIFF_INSERT:
        b += 1;
        break;
    }
  }), {
    a: a2,
    b
  };
}
function printAnnotation({ aAnnotation, aColor, aIndicator, bAnnotation, bColor, bIndicator, includeChangeCounts, omitAnnotationLines }, changeCounts) {
  if (omitAnnotationLines)
    return "";
  let aRest = "", bRest = "";
  if (includeChangeCounts) {
    let aCount = String(changeCounts.a), bCount = String(changeCounts.b), baAnnotationLengthDiff = bAnnotation.length - aAnnotation.length, aAnnotationPadding = " ".repeat(Math.max(0, baAnnotationLengthDiff)), bAnnotationPadding = " ".repeat(Math.max(0, -baAnnotationLengthDiff)), baCountLengthDiff = bCount.length - aCount.length, aCountPadding = " ".repeat(Math.max(0, baCountLengthDiff)), bCountPadding = " ".repeat(Math.max(0, -baCountLengthDiff));
    aRest = `${aAnnotationPadding}  ${aIndicator} ${aCountPadding}${aCount}`, bRest = `${bAnnotationPadding}  ${bIndicator} ${bCountPadding}${bCount}`;
  }
  let a2 = `${aIndicator} ${aAnnotation}${aRest}`, b = `${bIndicator} ${bAnnotation}${bRest}`;
  return `${aColor(a2)}
${bColor(b)}

`;
}
function printDiffLines(diffs, truncated, options) {
  return printAnnotation(options, countChanges(diffs)) + (options.expand ? joinAlignedDiffsExpand(diffs, options) : joinAlignedDiffsNoExpand(diffs, options)) + (truncated ? options.truncateAnnotationColor(`
${options.truncateAnnotation}`) : "");
}
function diffLinesUnified(aLines, bLines, options) {
  let normalizedOptions = normalizeDiffOptions(options), [diffs, truncated] = diffLinesRaw(isEmptyString(aLines) ? [] : aLines, isEmptyString(bLines) ? [] : bLines, normalizedOptions);
  return printDiffLines(diffs, truncated, normalizedOptions);
}
function diffLinesUnified2(aLinesDisplay, bLinesDisplay, aLinesCompare, bLinesCompare, options) {
  if (isEmptyString(aLinesDisplay) && isEmptyString(aLinesCompare) && (aLinesDisplay = [], aLinesCompare = []), isEmptyString(bLinesDisplay) && isEmptyString(bLinesCompare) && (bLinesDisplay = [], bLinesCompare = []), aLinesDisplay.length !== aLinesCompare.length || bLinesDisplay.length !== bLinesCompare.length)
    return diffLinesUnified(aLinesDisplay, bLinesDisplay, options);
  let [diffs, truncated] = diffLinesRaw(aLinesCompare, bLinesCompare, options), aIndex = 0, bIndex = 0;
  return diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        diff2[1] = aLinesDisplay[aIndex], aIndex += 1;
        break;
      case DIFF_INSERT:
        diff2[1] = bLinesDisplay[bIndex], bIndex += 1;
        break;
      default:
        diff2[1] = bLinesDisplay[bIndex], aIndex += 1, bIndex += 1;
    }
  }), printDiffLines(diffs, truncated, normalizeDiffOptions(options));
}
function diffLinesRaw(aLines, bLines, options) {
  let truncate2 = options?.truncateThreshold ?? !1, truncateThreshold = Math.max(Math.floor(options?.truncateThreshold ?? 0), 0), aLength = truncate2 ? Math.min(aLines.length, truncateThreshold) : aLines.length, bLength = truncate2 ? Math.min(bLines.length, truncateThreshold) : bLines.length, truncated = aLength !== aLines.length || bLength !== bLines.length, isCommon = (aIndex2, bIndex2) => aLines[aIndex2] === bLines[bIndex2], diffs = [], aIndex = 0, bIndex = 0;
  for (diffSequences(aLength, bLength, isCommon, (nCommon, aCommon, bCommon) => {
    for (; aIndex !== aCommon; aIndex += 1)
      diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
    for (; bIndex !== bCommon; bIndex += 1)
      diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1)
      diffs.push(new Diff(DIFF_EQUAL, bLines[bIndex]));
  }); aIndex !== aLength; aIndex += 1)
    diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
  for (; bIndex !== bLength; bIndex += 1)
    diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
  return [diffs, truncated];
}
function getType3(value) {
  if (value === void 0)
    return "undefined";
  if (value === null)
    return "null";
  if (Array.isArray(value))
    return "array";
  if (typeof value == "boolean")
    return "boolean";
  if (typeof value == "function")
    return "function";
  if (typeof value == "number")
    return "number";
  if (typeof value == "string")
    return "string";
  if (typeof value == "bigint")
    return "bigint";
  if (typeof value == "object") {
    if (value != null) {
      if (value.constructor === RegExp)
        return "regexp";
      if (value.constructor === Map)
        return "map";
      if (value.constructor === Set)
        return "set";
      if (value.constructor === Date)
        return "date";
    }
    return "object";
  } else if (typeof value == "symbol")
    return "symbol";
  throw new Error(`value of unknown type: ${value}`);
}
function getNewLineSymbol(string) {
  return string.includes(`\r
`) ? `\r
` : `
`;
}
function diffStrings(a2, b, options) {
  let truncate2 = options?.truncateThreshold ?? !1, truncateThreshold = Math.max(Math.floor(options?.truncateThreshold ?? 0), 0), aLength = a2.length, bLength = b.length;
  if (truncate2) {
    let aMultipleLines = a2.includes(`
`), bMultipleLines = b.includes(`
`), aNewLineSymbol = getNewLineSymbol(a2), bNewLineSymbol = getNewLineSymbol(b), _a = aMultipleLines ? `${a2.split(aNewLineSymbol, truncateThreshold).join(aNewLineSymbol)}
` : a2, _b = bMultipleLines ? `${b.split(bNewLineSymbol, truncateThreshold).join(bNewLineSymbol)}
` : b;
    aLength = _a.length, bLength = _b.length;
  }
  let truncated = aLength !== a2.length || bLength !== b.length, isCommon = (aIndex2, bIndex2) => a2[aIndex2] === b[bIndex2], aIndex = 0, bIndex = 0, diffs = [];
  return diffSequences(aLength, bLength, isCommon, (nCommon, aCommon, bCommon) => {
    aIndex !== aCommon && diffs.push(new Diff(DIFF_DELETE, a2.slice(aIndex, aCommon))), bIndex !== bCommon && diffs.push(new Diff(DIFF_INSERT, b.slice(bIndex, bCommon))), aIndex = aCommon + nCommon, bIndex = bCommon + nCommon, diffs.push(new Diff(DIFF_EQUAL, b.slice(bCommon, bIndex)));
  }), aIndex !== aLength && diffs.push(new Diff(DIFF_DELETE, a2.slice(aIndex))), bIndex !== bLength && diffs.push(new Diff(DIFF_INSERT, b.slice(bIndex))), [diffs, truncated];
}
function concatenateRelevantDiffs(op, diffs, changeColor) {
  return diffs.reduce((reduced, diff2) => reduced + (diff2[0] === DIFF_EQUAL ? diff2[1] : diff2[0] === op && diff2[1].length !== 0 ? changeColor(diff2[1]) : ""), "");
}
var ChangeBuffer = class {
  op;
  line;
  lines;
  changeColor;
  constructor(op, changeColor) {
    this.op = op, this.line = [], this.lines = [], this.changeColor = changeColor;
  }
  pushSubstring(substring) {
    this.pushDiff(new Diff(this.op, substring));
  }
  pushLine() {
    this.lines.push(this.line.length !== 1 ? new Diff(this.op, concatenateRelevantDiffs(this.op, this.line, this.changeColor)) : this.line[0][0] === this.op ? this.line[0] : new Diff(this.op, this.line[0][1])), this.line.length = 0;
  }
  isLineEmpty() {
    return this.line.length === 0;
  }
  // Minor input to buffer.
  pushDiff(diff2) {
    this.line.push(diff2);
  }
  // Main input to buffer.
  align(diff2) {
    let string = diff2[1];
    if (string.includes(`
`)) {
      let substrings = string.split(`
`), iLast = substrings.length - 1;
      substrings.forEach((substring, i) => {
        i < iLast ? (this.pushSubstring(substring), this.pushLine()) : substring.length !== 0 && this.pushSubstring(substring);
      });
    } else
      this.pushDiff(diff2);
  }
  // Output from buffer.
  moveLinesTo(lines) {
    this.isLineEmpty() || this.pushLine(), lines.push(...this.lines), this.lines.length = 0;
  }
}, CommonBuffer = class {
  deleteBuffer;
  insertBuffer;
  lines;
  constructor(deleteBuffer, insertBuffer) {
    this.deleteBuffer = deleteBuffer, this.insertBuffer = insertBuffer, this.lines = [];
  }
  pushDiffCommonLine(diff2) {
    this.lines.push(diff2);
  }
  pushDiffChangeLines(diff2) {
    let isDiffEmpty = diff2[1].length === 0;
    (!isDiffEmpty || this.deleteBuffer.isLineEmpty()) && this.deleteBuffer.pushDiff(diff2), (!isDiffEmpty || this.insertBuffer.isLineEmpty()) && this.insertBuffer.pushDiff(diff2);
  }
  flushChangeLines() {
    this.deleteBuffer.moveLinesTo(this.lines), this.insertBuffer.moveLinesTo(this.lines);
  }
  // Input to buffer.
  align(diff2) {
    let op = diff2[0], string = diff2[1];
    if (string.includes(`
`)) {
      let substrings = string.split(`
`), iLast = substrings.length - 1;
      substrings.forEach((substring, i) => {
        if (i === 0) {
          let subdiff = new Diff(op, substring);
          this.deleteBuffer.isLineEmpty() && this.insertBuffer.isLineEmpty() ? (this.flushChangeLines(), this.pushDiffCommonLine(subdiff)) : (this.pushDiffChangeLines(subdiff), this.flushChangeLines());
        } else i < iLast ? this.pushDiffCommonLine(new Diff(op, substring)) : substring.length !== 0 && this.pushDiffChangeLines(new Diff(op, substring));
      });
    } else
      this.pushDiffChangeLines(diff2);
  }
  // Output from buffer.
  getLines() {
    return this.flushChangeLines(), this.lines;
  }
};
function getAlignedDiffs(diffs, changeColor) {
  let deleteBuffer = new ChangeBuffer(DIFF_DELETE, changeColor), insertBuffer = new ChangeBuffer(DIFF_INSERT, changeColor), commonBuffer = new CommonBuffer(deleteBuffer, insertBuffer);
  return diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        deleteBuffer.align(diff2);
        break;
      case DIFF_INSERT:
        insertBuffer.align(diff2);
        break;
      default:
        commonBuffer.align(diff2);
    }
  }), commonBuffer.getLines();
}
function hasCommonDiff(diffs, isMultiline) {
  if (isMultiline) {
    let iLast = diffs.length - 1;
    return diffs.some((diff2, i) => diff2[0] === DIFF_EQUAL && (i !== iLast || diff2[1] !== `
`));
  }
  return diffs.some((diff2) => diff2[0] === DIFF_EQUAL);
}
function diffStringsUnified(a2, b, options) {
  if (a2 !== b && a2.length !== 0 && b.length !== 0) {
    let isMultiline = a2.includes(`
`) || b.includes(`
`), [diffs, truncated] = diffStringsRaw(isMultiline ? `${a2}
` : a2, isMultiline ? `${b}
` : b, !0, options);
    if (hasCommonDiff(diffs, isMultiline)) {
      let optionsNormalized = normalizeDiffOptions(options), lines = getAlignedDiffs(diffs, optionsNormalized.changeColor);
      return printDiffLines(lines, truncated, optionsNormalized);
    }
  }
  return diffLinesUnified(a2.split(`
`), b.split(`
`), options);
}
function diffStringsRaw(a2, b, cleanup, options) {
  let [diffs, truncated] = diffStrings(a2, b, options);
  return cleanup && diff_cleanupSemantic(diffs), [diffs, truncated];
}
function getCommonMessage(message, options) {
  let { commonColor } = normalizeDiffOptions(options);
  return commonColor(message);
}
var { AsymmetricMatcher: AsymmetricMatcher2, DOMCollection: DOMCollection2, DOMElement: DOMElement2, Immutable: Immutable2, ReactElement: ReactElement2, ReactTestComponent: ReactTestComponent2 } = plugins, PLUGINS2 = [
  ReactTestComponent2,
  ReactElement2,
  DOMElement2,
  DOMCollection2,
  Immutable2,
  AsymmetricMatcher2,
  plugins.Error
], FORMAT_OPTIONS = {
  maxDepth: 20,
  plugins: PLUGINS2
}, FALLBACK_FORMAT_OPTIONS = {
  callToJSON: !1,
  maxDepth: 8,
  plugins: PLUGINS2
};
function diff(a2, b, options) {
  if (Object.is(a2, b))
    return "";
  let aType = getType3(a2), expectedType = aType, omitDifference = !1;
  if (aType === "object" && typeof a2.asymmetricMatch == "function") {
    if (a2.$$typeof !== Symbol.for("jest.asymmetricMatcher") || typeof a2.getExpectedType != "function")
      return;
    expectedType = a2.getExpectedType(), omitDifference = expectedType === "string";
  }
  if (expectedType !== getType3(b)) {
    let truncate2 = function(s2) {
      return s2.length <= MAX_LENGTH ? s2 : `${s2.slice(0, MAX_LENGTH)}...`;
    }, { aAnnotation, aColor, aIndicator, bAnnotation, bColor, bIndicator } = normalizeDiffOptions(options), formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options), aDisplay = format(a2, formatOptions), bDisplay = format(b, formatOptions), MAX_LENGTH = 1e5;
    aDisplay = truncate2(aDisplay), bDisplay = truncate2(bDisplay);
    let aDiff = `${aColor(`${aIndicator} ${aAnnotation}:`)} 
${aDisplay}`, bDiff = `${bColor(`${bIndicator} ${bAnnotation}:`)} 
${bDisplay}`;
    return `${aDiff}

${bDiff}`;
  }
  if (!omitDifference)
    switch (aType) {
      case "string":
        return diffLinesUnified(a2.split(`
`), b.split(`
`), options);
      case "boolean":
      case "number":
        return comparePrimitive(a2, b, options);
      case "map":
        return compareObjects(sortMap(a2), sortMap(b), options);
      case "set":
        return compareObjects(sortSet(a2), sortSet(b), options);
      default:
        return compareObjects(a2, b, options);
    }
}
function comparePrimitive(a2, b, options) {
  let aFormat = format(a2, FORMAT_OPTIONS), bFormat = format(b, FORMAT_OPTIONS);
  return aFormat === bFormat ? "" : diffLinesUnified(aFormat.split(`
`), bFormat.split(`
`), options);
}
function sortMap(map) {
  return new Map(Array.from(map.entries()).sort());
}
function sortSet(set) {
  return new Set(Array.from(set.values()).sort());
}
function compareObjects(a2, b, options) {
  let difference, hasThrown = !1;
  try {
    let formatOptions = getFormatOptions(FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a2, b, formatOptions, options);
  } catch {
    hasThrown = !0;
  }
  let noDiffMessage = getCommonMessage(NO_DIFF_MESSAGE, options);
  if (difference === void 0 || difference === noDiffMessage) {
    let formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a2, b, formatOptions, options), difference !== noDiffMessage && !hasThrown && (difference = `${getCommonMessage(SIMILAR_MESSAGE, options)}

${difference}`);
  }
  return difference;
}
function getFormatOptions(formatOptions, options) {
  let { compareKeys, printBasicPrototype, maxDepth } = normalizeDiffOptions(options);
  return {
    ...formatOptions,
    compareKeys,
    printBasicPrototype,
    maxDepth: maxDepth ?? formatOptions.maxDepth
  };
}
function getObjectsDifference(a2, b, formatOptions, options) {
  let formatOptionsZeroIndent = {
    ...formatOptions,
    indent: 0
  }, aCompare = format(a2, formatOptionsZeroIndent), bCompare = format(b, formatOptionsZeroIndent);
  if (aCompare === bCompare)
    return getCommonMessage(NO_DIFF_MESSAGE, options);
  {
    let aDisplay = format(a2, formatOptions), bDisplay = format(b, formatOptions);
    return diffLinesUnified2(aDisplay.split(`
`), bDisplay.split(`
`), aCompare.split(`
`), bCompare.split(`
`), options);
  }
}
var MAX_DIFF_STRING_LENGTH = 2e4;
function isAsymmetricMatcher(data) {
  return getType2(data) === "Object" && typeof data.asymmetricMatch == "function";
}
function isReplaceable(obj1, obj2) {
  let obj1Type = getType2(obj1), obj2Type = getType2(obj2);
  return obj1Type === obj2Type && (obj1Type === "Object" || obj1Type === "Array");
}
function printDiffOrStringify(received, expected, options) {
  let { aAnnotation, bAnnotation } = normalizeDiffOptions(options);
  if (typeof expected == "string" && typeof received == "string" && expected.length > 0 && received.length > 0 && expected.length <= MAX_DIFF_STRING_LENGTH && received.length <= MAX_DIFF_STRING_LENGTH && expected !== received) {
    if (expected.includes(`
`) || received.includes(`
`))
      return diffStringsUnified(expected, received, options);
    let [diffs] = diffStringsRaw(expected, received, !0), hasCommonDiff2 = diffs.some((diff2) => diff2[0] === DIFF_EQUAL), printLabel = getLabelPrinter(aAnnotation, bAnnotation), expectedLine = printLabel(aAnnotation) + printExpected(getCommonAndChangedSubstrings(diffs, DIFF_DELETE, hasCommonDiff2)), receivedLine = printLabel(bAnnotation) + printReceived(getCommonAndChangedSubstrings(diffs, DIFF_INSERT, hasCommonDiff2));
    return `${expectedLine}
${receivedLine}`;
  }
  let clonedExpected = deepClone(expected, { forceWritable: !0 }), clonedReceived = deepClone(received, { forceWritable: !0 }), { replacedExpected, replacedActual } = replaceAsymmetricMatcher(clonedReceived, clonedExpected);
  return diff(replacedExpected, replacedActual, options);
}
function replaceAsymmetricMatcher(actual, expected, actualReplaced = /* @__PURE__ */ new WeakSet(), expectedReplaced = /* @__PURE__ */ new WeakSet()) {
  return actual instanceof Error && expected instanceof Error && typeof actual.cause < "u" && typeof expected.cause > "u" ? (delete actual.cause, {
    replacedActual: actual,
    replacedExpected: expected
  }) : isReplaceable(actual, expected) ? actualReplaced.has(actual) || expectedReplaced.has(expected) ? {
    replacedActual: actual,
    replacedExpected: expected
  } : (actualReplaced.add(actual), expectedReplaced.add(expected), getOwnProperties(expected).forEach((key) => {
    let expectedValue = expected[key], actualValue = actual[key];
    if (isAsymmetricMatcher(expectedValue))
      expectedValue.asymmetricMatch(actualValue) && (actual[key] = expectedValue);
    else if (isAsymmetricMatcher(actualValue))
      actualValue.asymmetricMatch(expectedValue) && (expected[key] = actualValue);
    else if (isReplaceable(actualValue, expectedValue)) {
      let replaced = replaceAsymmetricMatcher(actualValue, expectedValue, actualReplaced, expectedReplaced);
      actual[key] = replaced.replacedActual, expected[key] = replaced.replacedExpected;
    }
  }), {
    replacedActual: actual,
    replacedExpected: expected
  }) : {
    replacedActual: actual,
    replacedExpected: expected
  };
}
function getLabelPrinter(...strings) {
  let maxLength = strings.reduce((max, string) => string.length > max ? string.length : max, 0);
  return (string) => `${string}: ${" ".repeat(maxLength - string.length)}`;
}
var SPACE_SYMBOL = "\xB7";
function replaceTrailingSpaces(text) {
  return text.replace(/\s+$/gm, (spaces) => SPACE_SYMBOL.repeat(spaces.length));
}
function printReceived(object) {
  return s.red(replaceTrailingSpaces(stringify(object)));
}
function printExpected(value) {
  return s.green(replaceTrailingSpaces(stringify(value)));
}
function getCommonAndChangedSubstrings(diffs, op, hasCommonDiff2) {
  return diffs.reduce((reduced, diff2) => reduced + (diff2[0] === DIFF_EQUAL ? diff2[1] : diff2[0] === op ? hasCommonDiff2 ? s.inverse(diff2[1]) : diff2[1] : ""), "");
}

// ../node_modules/@vitest/utils/dist/error.js
var IS_RECORD_SYMBOL = "@@__IMMUTABLE_RECORD__@@", IS_COLLECTION_SYMBOL = "@@__IMMUTABLE_ITERABLE__@@";
function isImmutable(v) {
  return v && (v[IS_COLLECTION_SYMBOL] || v[IS_RECORD_SYMBOL]);
}
var OBJECT_PROTO = Object.getPrototypeOf({});
function getUnserializableMessage(err) {
  return err instanceof Error ? `<unserializable>: ${err.message}` : typeof err == "string" ? `<unserializable>: ${err}` : "<unserializable>";
}
function serializeValue(val, seen = /* @__PURE__ */ new WeakMap()) {
  if (!val || typeof val == "string")
    return val;
  if (val instanceof Error && "toJSON" in val && typeof val.toJSON == "function") {
    let jsonValue = val.toJSON();
    return jsonValue && jsonValue !== val && typeof jsonValue == "object" && (typeof val.message == "string" && safe(() => jsonValue.message ?? (jsonValue.message = val.message)), typeof val.stack == "string" && safe(() => jsonValue.stack ?? (jsonValue.stack = val.stack)), typeof val.name == "string" && safe(() => jsonValue.name ?? (jsonValue.name = val.name)), val.cause != null && safe(() => jsonValue.cause ?? (jsonValue.cause = serializeValue(val.cause, seen)))), serializeValue(jsonValue, seen);
  }
  if (typeof val == "function")
    return `Function<${val.name || "anonymous"}>`;
  if (typeof val == "symbol")
    return val.toString();
  if (typeof val != "object")
    return val;
  if (typeof Buffer < "u" && val instanceof Buffer)
    return `<Buffer(${val.length}) ...>`;
  if (typeof Uint8Array < "u" && val instanceof Uint8Array)
    return `<Uint8Array(${val.length}) ...>`;
  if (isImmutable(val))
    return serializeValue(val.toJSON(), seen);
  if (val instanceof Promise || val.constructor && val.constructor.prototype === "AsyncFunction")
    return "Promise";
  if (typeof Element < "u" && val instanceof Element)
    return val.tagName;
  if (typeof val.asymmetricMatch == "function")
    return `${val.toString()} ${format2(val.sample)}`;
  if (typeof val.toJSON == "function")
    return serializeValue(val.toJSON(), seen);
  if (seen.has(val))
    return seen.get(val);
  if (Array.isArray(val)) {
    let clone2 = new Array(val.length);
    return seen.set(val, clone2), val.forEach((e, i) => {
      try {
        clone2[i] = serializeValue(e, seen);
      } catch (err) {
        clone2[i] = getUnserializableMessage(err);
      }
    }), clone2;
  } else {
    let clone2 = /* @__PURE__ */ Object.create(null);
    seen.set(val, clone2);
    let obj = val;
    for (; obj && obj !== OBJECT_PROTO; )
      Object.getOwnPropertyNames(obj).forEach((key) => {
        if (!(key in clone2))
          try {
            clone2[key] = serializeValue(val[key], seen);
          } catch (err) {
            delete clone2[key], clone2[key] = getUnserializableMessage(err);
          }
      }), obj = Object.getPrototypeOf(obj);
    return clone2;
  }
}
function safe(fn) {
  try {
    return fn();
  } catch {
  }
}
function normalizeErrorMessage(message) {
  return message.replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "");
}
function processError(_err, diffOptions, seen = /* @__PURE__ */ new WeakSet()) {
  if (!_err || typeof _err != "object")
    return { message: String(_err) };
  let err = _err;
  (err.showDiff || err.showDiff === void 0 && err.expected !== void 0 && err.actual !== void 0) && (err.diff = printDiffOrStringify(err.actual, err.expected, {
    ...diffOptions,
    ...err.diffOptions
  })), "expected" in err && typeof err.expected != "string" && (err.expected = stringify(err.expected, 10)), "actual" in err && typeof err.actual != "string" && (err.actual = stringify(err.actual, 10));
  try {
    typeof err.message == "string" && (err.message = normalizeErrorMessage(err.message));
  } catch {
  }
  try {
    !seen.has(err) && typeof err.cause == "object" && (seen.add(err), err.cause = processError(err.cause, diffOptions, seen));
  } catch {
  }
  try {
    return serializeValue(err);
  } catch (e) {
    return serializeValue(new Error(`Failed to fully serialize error: ${e?.message}
Inner error message: ${err?.message}`));
  }
}

export {
  s,
  stringify,
  getDefaultExportFromCjs2 as getDefaultExportFromCjs,
  assertTypes,
  isObject,
  getType2 as getType,
  noop,
  diff,
  printDiffOrStringify,
  processError
};
