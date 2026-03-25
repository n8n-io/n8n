import {
  background,
  color,
  create,
  darkenColor,
  getPreferredColorScheme,
  light_default,
  lightenColor,
  mkColor,
  themes,
  tokens,
  typography
} from "../_browser-chunks/chunk-BRX2HXH7.js";
import {
  curriedOpacify$1
} from "../_browser-chunks/chunk-AXG2BOBL.js";
import {
  _extends
} from "../_browser-chunks/chunk-CHUV5WSW.js";
import {
  require_memoizerific
} from "../_browser-chunks/chunk-WJYERY3R.js";
import {
  dedent
} from "../_browser-chunks/chunk-JP7NCOJX.js";
import {
  __commonJS,
  __toESM
} from "../_browser-chunks/chunk-A242L54C.js";

// ../node_modules/react-is/cjs/react-is.production.min.js
var require_react_is_production_min = __commonJS({
  "../node_modules/react-is/cjs/react-is.production.min.js"(exports) {
    "use strict";
    var b = typeof Symbol == "function" && Symbol.for, c = b ? Symbol.for("react.element") : 60103, d = b ? Symbol.for("react.portal") : 60106, e = b ? Symbol.for("react.fragment") : 60107, f = b ? Symbol.for("react.strict_mode") : 60108, g = b ? Symbol.for("react.profiler") : 60114, h = b ? Symbol.for("react.provider") : 60109, k = b ? Symbol.for("react.context") : 60110, l = b ? Symbol.for("react.async_mode") : 60111, m = b ? Symbol.for("react.concurrent_mode") : 60111, n = b ? Symbol.for("react.forward_ref") : 60112, p = b ? Symbol.for("react.suspense") : 60113, q = b ? Symbol.for("react.suspense_list") : 60120, r = b ? Symbol.for("react.memo") : 60115, t = b ? Symbol.for("react.lazy") : 60116, v = b ? Symbol.for("react.block") : 60121, w = b ? Symbol.for("react.fundamental") : 60117, x = b ? Symbol.for("react.responder") : 60118, y = b ? Symbol.for("react.scope") : 60119;
    function z(a) {
      if (typeof a == "object" && a !== null) {
        var u = a.$$typeof;
        switch (u) {
          case c:
            switch (a = a.type, a) {
              case l:
              case m:
              case e:
              case g:
              case f:
              case p:
                return a;
              default:
                switch (a = a && a.$$typeof, a) {
                  case k:
                  case n:
                  case t:
                  case r:
                  case h:
                    return a;
                  default:
                    return u;
                }
            }
          case d:
            return u;
        }
      }
    }
    function A(a) {
      return z(a) === m;
    }
    exports.AsyncMode = l;
    exports.ConcurrentMode = m;
    exports.ContextConsumer = k;
    exports.ContextProvider = h;
    exports.Element = c;
    exports.ForwardRef = n;
    exports.Fragment = e;
    exports.Lazy = t;
    exports.Memo = r;
    exports.Portal = d;
    exports.Profiler = g;
    exports.StrictMode = f;
    exports.Suspense = p;
    exports.isAsyncMode = function(a) {
      return A(a) || z(a) === l;
    };
    exports.isConcurrentMode = A;
    exports.isContextConsumer = function(a) {
      return z(a) === k;
    };
    exports.isContextProvider = function(a) {
      return z(a) === h;
    };
    exports.isElement = function(a) {
      return typeof a == "object" && a !== null && a.$$typeof === c;
    };
    exports.isForwardRef = function(a) {
      return z(a) === n;
    };
    exports.isFragment = function(a) {
      return z(a) === e;
    };
    exports.isLazy = function(a) {
      return z(a) === t;
    };
    exports.isMemo = function(a) {
      return z(a) === r;
    };
    exports.isPortal = function(a) {
      return z(a) === d;
    };
    exports.isProfiler = function(a) {
      return z(a) === g;
    };
    exports.isStrictMode = function(a) {
      return z(a) === f;
    };
    exports.isSuspense = function(a) {
      return z(a) === p;
    };
    exports.isValidElementType = function(a) {
      return typeof a == "string" || typeof a == "function" || a === e || a === m || a === g || a === f || a === p || a === q || typeof a == "object" && a !== null && (a.$$typeof === t || a.$$typeof === r || a.$$typeof === h || a.$$typeof === k || a.$$typeof === n || a.$$typeof === w || a.$$typeof === x || a.$$typeof === y || a.$$typeof === v);
    };
    exports.typeOf = z;
  }
});

// ../node_modules/react-is/cjs/react-is.development.js
var require_react_is_development = __commonJS({
  "../node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    process.env.NODE_ENV !== "production" && (function() {
      "use strict";
      var hasSymbol = typeof Symbol == "function" && Symbol.for, REACT_ELEMENT_TYPE = hasSymbol ? Symbol.for("react.element") : 60103, REACT_PORTAL_TYPE = hasSymbol ? Symbol.for("react.portal") : 60106, REACT_FRAGMENT_TYPE = hasSymbol ? Symbol.for("react.fragment") : 60107, REACT_STRICT_MODE_TYPE = hasSymbol ? Symbol.for("react.strict_mode") : 60108, REACT_PROFILER_TYPE = hasSymbol ? Symbol.for("react.profiler") : 60114, REACT_PROVIDER_TYPE = hasSymbol ? Symbol.for("react.provider") : 60109, REACT_CONTEXT_TYPE = hasSymbol ? Symbol.for("react.context") : 60110, REACT_ASYNC_MODE_TYPE = hasSymbol ? Symbol.for("react.async_mode") : 60111, REACT_CONCURRENT_MODE_TYPE = hasSymbol ? Symbol.for("react.concurrent_mode") : 60111, REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for("react.forward_ref") : 60112, REACT_SUSPENSE_TYPE = hasSymbol ? Symbol.for("react.suspense") : 60113, REACT_SUSPENSE_LIST_TYPE = hasSymbol ? Symbol.for("react.suspense_list") : 60120, REACT_MEMO_TYPE = hasSymbol ? Symbol.for("react.memo") : 60115, REACT_LAZY_TYPE = hasSymbol ? Symbol.for("react.lazy") : 60116, REACT_BLOCK_TYPE = hasSymbol ? Symbol.for("react.block") : 60121, REACT_FUNDAMENTAL_TYPE = hasSymbol ? Symbol.for("react.fundamental") : 60117, REACT_RESPONDER_TYPE = hasSymbol ? Symbol.for("react.responder") : 60118, REACT_SCOPE_TYPE = hasSymbol ? Symbol.for("react.scope") : 60119;
      function isValidElementType(type) {
        return typeof type == "string" || typeof type == "function" || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
        type === REACT_FRAGMENT_TYPE || type === REACT_CONCURRENT_MODE_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type == "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_RESPONDER_TYPE || type.$$typeof === REACT_SCOPE_TYPE || type.$$typeof === REACT_BLOCK_TYPE);
      }
      function typeOf(object) {
        if (typeof object == "object" && object !== null) {
          var $$typeof = object.$$typeof;
          switch ($$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = object.type;
              switch (type) {
                case REACT_ASYNC_MODE_TYPE:
                case REACT_CONCURRENT_MODE_TYPE:
                case REACT_FRAGMENT_TYPE:
                case REACT_PROFILER_TYPE:
                case REACT_STRICT_MODE_TYPE:
                case REACT_SUSPENSE_TYPE:
                  return type;
                default:
                  var $$typeofType = type && type.$$typeof;
                  switch ($$typeofType) {
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
      var AsyncMode = REACT_ASYNC_MODE_TYPE, ConcurrentMode = REACT_CONCURRENT_MODE_TYPE, ContextConsumer = REACT_CONTEXT_TYPE, ContextProvider = REACT_PROVIDER_TYPE, Element = REACT_ELEMENT_TYPE, ForwardRef = REACT_FORWARD_REF_TYPE, Fragment4 = REACT_FRAGMENT_TYPE, Lazy = REACT_LAZY_TYPE, Memo = REACT_MEMO_TYPE, Portal = REACT_PORTAL_TYPE, Profiler = REACT_PROFILER_TYPE, StrictMode = REACT_STRICT_MODE_TYPE, Suspense = REACT_SUSPENSE_TYPE, hasWarnedAboutDeprecatedIsAsyncMode = !1;
      function isAsyncMode(object) {
        return hasWarnedAboutDeprecatedIsAsyncMode || (hasWarnedAboutDeprecatedIsAsyncMode = !0, console.warn("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update your code to use ReactIs.isConcurrentMode() instead. It has the exact same API.")), isConcurrentMode(object) || typeOf(object) === REACT_ASYNC_MODE_TYPE;
      }
      function isConcurrentMode(object) {
        return typeOf(object) === REACT_CONCURRENT_MODE_TYPE;
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
      exports.AsyncMode = AsyncMode, exports.ConcurrentMode = ConcurrentMode, exports.ContextConsumer = ContextConsumer, exports.ContextProvider = ContextProvider, exports.Element = Element, exports.ForwardRef = ForwardRef, exports.Fragment = Fragment4, exports.Lazy = Lazy, exports.Memo = Memo, exports.Portal = Portal, exports.Profiler = Profiler, exports.StrictMode = StrictMode, exports.Suspense = Suspense, exports.isAsyncMode = isAsyncMode, exports.isConcurrentMode = isConcurrentMode, exports.isContextConsumer = isContextConsumer, exports.isContextProvider = isContextProvider, exports.isElement = isElement, exports.isForwardRef = isForwardRef, exports.isFragment = isFragment, exports.isLazy = isLazy, exports.isMemo = isMemo, exports.isPortal = isPortal, exports.isProfiler = isProfiler, exports.isStrictMode = isStrictMode, exports.isSuspense = isSuspense, exports.isValidElementType = isValidElementType, exports.typeOf = typeOf;
    })();
  }
});

// ../node_modules/react-is/index.js
var require_react_is = __commonJS({
  "../node_modules/react-is/index.js"(exports, module) {
    "use strict";
    process.env.NODE_ENV === "production" ? module.exports = require_react_is_production_min() : module.exports = require_react_is_development();
  }
});

// ../node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js
var require_hoist_non_react_statics_cjs = __commonJS({
  "../node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js"(exports, module) {
    "use strict";
    var reactIs = require_react_is(), REACT_STATICS = {
      childContextTypes: !0,
      contextType: !0,
      contextTypes: !0,
      defaultProps: !0,
      displayName: !0,
      getDefaultProps: !0,
      getDerivedStateFromError: !0,
      getDerivedStateFromProps: !0,
      mixins: !0,
      propTypes: !0,
      type: !0
    }, KNOWN_STATICS = {
      name: !0,
      length: !0,
      prototype: !0,
      caller: !0,
      callee: !0,
      arguments: !0,
      arity: !0
    }, FORWARD_REF_STATICS = {
      $$typeof: !0,
      render: !0,
      defaultProps: !0,
      displayName: !0,
      propTypes: !0
    }, MEMO_STATICS = {
      $$typeof: !0,
      compare: !0,
      defaultProps: !0,
      displayName: !0,
      propTypes: !0,
      type: !0
    }, TYPE_STATICS = {};
    TYPE_STATICS[reactIs.ForwardRef] = FORWARD_REF_STATICS;
    TYPE_STATICS[reactIs.Memo] = MEMO_STATICS;
    function getStatics(component) {
      return reactIs.isMemo(component) ? MEMO_STATICS : TYPE_STATICS[component.$$typeof] || REACT_STATICS;
    }
    var defineProperty = Object.defineProperty, getOwnPropertyNames = Object.getOwnPropertyNames, getOwnPropertySymbols = Object.getOwnPropertySymbols, getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor, getPrototypeOf = Object.getPrototypeOf, objectPrototype = Object.prototype;
    function hoistNonReactStatics2(targetComponent, sourceComponent, blacklist) {
      if (typeof sourceComponent != "string") {
        if (objectPrototype) {
          var inheritedComponent = getPrototypeOf(sourceComponent);
          inheritedComponent && inheritedComponent !== objectPrototype && hoistNonReactStatics2(targetComponent, inheritedComponent, blacklist);
        }
        var keys = getOwnPropertyNames(sourceComponent);
        getOwnPropertySymbols && (keys = keys.concat(getOwnPropertySymbols(sourceComponent)));
        for (var targetStatics = getStatics(targetComponent), sourceStatics = getStatics(sourceComponent), i = 0; i < keys.length; ++i) {
          var key = keys[i];
          if (!KNOWN_STATICS[key] && !(blacklist && blacklist[key]) && !(sourceStatics && sourceStatics[key]) && !(targetStatics && targetStatics[key])) {
            var descriptor = getOwnPropertyDescriptor(sourceComponent, key);
            try {
              defineProperty(targetComponent, key, descriptor);
            } catch {
            }
          }
        }
      }
      return targetComponent;
    }
    module.exports = hoistNonReactStatics2;
  }
});

// ../node_modules/@emotion/react/dist/emotion-element-f0de968e.browser.esm.js
import * as React2 from "react";
import { useContext as useContext2, forwardRef as forwardRef2 } from "react";

// ../node_modules/@emotion/sheet/dist/emotion-sheet.esm.js
var isDevelopment = !1;
function sheetForTag(tag) {
  if (tag.sheet)
    return tag.sheet;
  for (var i = 0; i < document.styleSheets.length; i++)
    if (document.styleSheets[i].ownerNode === tag)
      return document.styleSheets[i];
}
function createStyleElement(options) {
  var tag = document.createElement("style");
  return tag.setAttribute("data-emotion", options.key), options.nonce !== void 0 && tag.setAttribute("nonce", options.nonce), tag.appendChild(document.createTextNode("")), tag.setAttribute("data-s", ""), tag;
}
var StyleSheet = (function() {
  function StyleSheet2(options) {
    var _this = this;
    this._insertTag = function(tag) {
      var before;
      _this.tags.length === 0 ? _this.insertionPoint ? before = _this.insertionPoint.nextSibling : _this.prepend ? before = _this.container.firstChild : before = _this.before : before = _this.tags[_this.tags.length - 1].nextSibling, _this.container.insertBefore(tag, before), _this.tags.push(tag);
    }, this.isSpeedy = options.speedy === void 0 ? !isDevelopment : options.speedy, this.tags = [], this.ctr = 0, this.nonce = options.nonce, this.key = options.key, this.container = options.container, this.prepend = options.prepend, this.insertionPoint = options.insertionPoint, this.before = null;
  }
  var _proto = StyleSheet2.prototype;
  return _proto.hydrate = function(nodes) {
    nodes.forEach(this._insertTag);
  }, _proto.insert = function(rule) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(createStyleElement(this));
    var tag = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var sheet = sheetForTag(tag);
      try {
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch {
      }
    } else
      tag.appendChild(document.createTextNode(rule));
    this.ctr++;
  }, _proto.flush = function() {
    this.tags.forEach(function(tag) {
      var _tag$parentNode;
      return (_tag$parentNode = tag.parentNode) == null ? void 0 : _tag$parentNode.removeChild(tag);
    }), this.tags = [], this.ctr = 0;
  }, StyleSheet2;
})();

// ../node_modules/stylis/src/Enum.js
var MS = "-ms-", MOZ = "-moz-", WEBKIT = "-webkit-", COMMENT = "comm", RULESET = "rule", DECLARATION = "decl";
var IMPORT = "@import";
var KEYFRAMES = "@keyframes";
var LAYER = "@layer";

// ../node_modules/stylis/src/Utility.js
var abs = Math.abs, from = String.fromCharCode, assign = Object.assign;
function hash(value, length2) {
  return charat(value, 0) ^ 45 ? (((length2 << 2 ^ charat(value, 0)) << 2 ^ charat(value, 1)) << 2 ^ charat(value, 2)) << 2 ^ charat(value, 3) : 0;
}
function trim(value) {
  return value.trim();
}
function match(value, pattern) {
  return (value = pattern.exec(value)) ? value[0] : value;
}
function replace(value, pattern, replacement) {
  return value.replace(pattern, replacement);
}
function indexof(value, search) {
  return value.indexOf(search);
}
function charat(value, index) {
  return value.charCodeAt(index) | 0;
}
function substr(value, begin, end) {
  return value.slice(begin, end);
}
function strlen(value) {
  return value.length;
}
function sizeof(value) {
  return value.length;
}
function append(value, array) {
  return array.push(value), value;
}
function combine(array, callback) {
  return array.map(callback).join("");
}

// ../node_modules/stylis/src/Tokenizer.js
var line = 1, column = 1, length = 0, position = 0, character = 0, characters = "";
function node(value, root, parent, type, props, children, length2) {
  return { value, root, parent, type, props, children, line, column, length: length2, return: "" };
}
function copy(root, props) {
  return assign(node("", null, null, "", null, null, 0), root, { length: -root.length }, props);
}
function char() {
  return character;
}
function prev() {
  return character = position > 0 ? charat(characters, --position) : 0, column--, character === 10 && (column = 1, line--), character;
}
function next() {
  return character = position < length ? charat(characters, position++) : 0, column++, character === 10 && (column = 1, line++), character;
}
function peek() {
  return charat(characters, position);
}
function caret() {
  return position;
}
function slice(begin, end) {
  return substr(characters, begin, end);
}
function token(type) {
  switch (type) {
    // \0 \t \n \r \s whitespace token
    case 0:
    case 9:
    case 10:
    case 13:
    case 32:
      return 5;
    // ! + , / > @ ~ isolate token
    case 33:
    case 43:
    case 44:
    case 47:
    case 62:
    case 64:
    case 126:
    // ; { } breakpoint token
    case 59:
    case 123:
    case 125:
      return 4;
    // : accompanied token
    case 58:
      return 3;
    // " ' ( [ opening delimit token
    case 34:
    case 39:
    case 40:
    case 91:
      return 2;
    // ) ] closing delimit token
    case 41:
    case 93:
      return 1;
  }
  return 0;
}
function alloc(value) {
  return line = column = 1, length = strlen(characters = value), position = 0, [];
}
function dealloc(value) {
  return characters = "", value;
}
function delimit(type) {
  return trim(slice(position - 1, delimiter(type === 91 ? type + 2 : type === 40 ? type + 1 : type)));
}
function whitespace(type) {
  for (; (character = peek()) && character < 33; )
    next();
  return token(type) > 2 || token(character) > 3 ? "" : " ";
}
function escaping(index, count) {
  for (; --count && next() && !(character < 48 || character > 102 || character > 57 && character < 65 || character > 70 && character < 97); )
    ;
  return slice(index, caret() + (count < 6 && peek() == 32 && next() == 32));
}
function delimiter(type) {
  for (; next(); )
    switch (character) {
      // ] ) " '
      case type:
        return position;
      // " '
      case 34:
      case 39:
        type !== 34 && type !== 39 && delimiter(character);
        break;
      // (
      case 40:
        type === 41 && delimiter(type);
        break;
      // \
      case 92:
        next();
        break;
    }
  return position;
}
function commenter(type, index) {
  for (; next() && type + character !== 57; )
    if (type + character === 84 && peek() === 47)
      break;
  return "/*" + slice(index, position - 1) + "*" + from(type === 47 ? type : next());
}
function identifier(index) {
  for (; !token(peek()); )
    next();
  return slice(index, position);
}

// ../node_modules/stylis/src/Parser.js
function compile(value) {
  return dealloc(parse("", null, null, null, [""], value = alloc(value), 0, [0], value));
}
function parse(value, root, parent, rule, rules, rulesets, pseudo, points, declarations) {
  for (var index = 0, offset = 0, length2 = pseudo, atrule = 0, property = 0, previous = 0, variable = 1, scanning = 1, ampersand = 1, character2 = 0, type = "", props = rules, children = rulesets, reference = rule, characters2 = type; scanning; )
    switch (previous = character2, character2 = next()) {
      // (
      case 40:
        if (previous != 108 && charat(characters2, length2 - 1) == 58) {
          indexof(characters2 += replace(delimit(character2), "&", "&\f"), "&\f") != -1 && (ampersand = -1);
          break;
        }
      // " ' [
      case 34:
      case 39:
      case 91:
        characters2 += delimit(character2);
        break;
      // \t \n \r \s
      case 9:
      case 10:
      case 13:
      case 32:
        characters2 += whitespace(previous);
        break;
      // \
      case 92:
        characters2 += escaping(caret() - 1, 7);
        continue;
      // /
      case 47:
        switch (peek()) {
          case 42:
          case 47:
            append(comment(commenter(next(), caret()), root, parent), declarations);
            break;
          default:
            characters2 += "/";
        }
        break;
      // {
      case 123 * variable:
        points[index++] = strlen(characters2) * ampersand;
      // } ; \0
      case 125 * variable:
      case 59:
      case 0:
        switch (character2) {
          // \0 }
          case 0:
          case 125:
            scanning = 0;
          // ;
          case 59 + offset:
            ampersand == -1 && (characters2 = replace(characters2, /\f/g, "")), property > 0 && strlen(characters2) - length2 && append(property > 32 ? declaration(characters2 + ";", rule, parent, length2 - 1) : declaration(replace(characters2, " ", "") + ";", rule, parent, length2 - 2), declarations);
            break;
          // @ ;
          case 59:
            characters2 += ";";
          // { rule/at-rule
          default:
            if (append(reference = ruleset(characters2, root, parent, index, offset, rules, points, type, props = [], children = [], length2), rulesets), character2 === 123)
              if (offset === 0)
                parse(characters2, root, reference, reference, props, rulesets, length2, points, children);
              else
                switch (atrule === 99 && charat(characters2, 3) === 110 ? 100 : atrule) {
                  // d l m s
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    parse(value, reference, reference, rule && append(ruleset(value, reference, reference, 0, 0, rules, points, type, rules, props = [], length2), children), rules, children, length2, points, rule ? props : children);
                    break;
                  default:
                    parse(characters2, reference, reference, reference, [""], children, 0, points, children);
                }
        }
        index = offset = property = 0, variable = ampersand = 1, type = characters2 = "", length2 = pseudo;
        break;
      // :
      case 58:
        length2 = 1 + strlen(characters2), property = previous;
      default:
        if (variable < 1) {
          if (character2 == 123)
            --variable;
          else if (character2 == 125 && variable++ == 0 && prev() == 125)
            continue;
        }
        switch (characters2 += from(character2), character2 * variable) {
          // &
          case 38:
            ampersand = offset > 0 ? 1 : (characters2 += "\f", -1);
            break;
          // ,
          case 44:
            points[index++] = (strlen(characters2) - 1) * ampersand, ampersand = 1;
            break;
          // @
          case 64:
            peek() === 45 && (characters2 += delimit(next())), atrule = peek(), offset = length2 = strlen(type = characters2 += identifier(caret())), character2++;
            break;
          // -
          case 45:
            previous === 45 && strlen(characters2) == 2 && (variable = 0);
        }
    }
  return rulesets;
}
function ruleset(value, root, parent, index, offset, rules, points, type, props, children, length2) {
  for (var post = offset - 1, rule = offset === 0 ? rules : [""], size = sizeof(rule), i = 0, j = 0, k = 0; i < index; ++i)
    for (var x = 0, y = substr(value, post + 1, post = abs(j = points[i])), z = value; x < size; ++x)
      (z = trim(j > 0 ? rule[x] + " " + y : replace(y, /&\f/g, rule[x]))) && (props[k++] = z);
  return node(value, root, parent, offset === 0 ? RULESET : type, props, children, length2);
}
function comment(value, root, parent) {
  return node(value, root, parent, COMMENT, from(char()), substr(value, 2, -2), 0);
}
function declaration(value, root, parent, length2) {
  return node(value, root, parent, DECLARATION, substr(value, 0, length2), substr(value, length2 + 1, -1), length2);
}

// ../node_modules/stylis/src/Serializer.js
function serialize(children, callback) {
  for (var output = "", length2 = sizeof(children), i = 0; i < length2; i++)
    output += callback(children[i], i, children, callback) || "";
  return output;
}
function stringify(element, index, children, callback) {
  switch (element.type) {
    case LAYER:
      if (element.children.length) break;
    case IMPORT:
    case DECLARATION:
      return element.return = element.return || element.value;
    case COMMENT:
      return "";
    case KEYFRAMES:
      return element.return = element.value + "{" + serialize(element.children, callback) + "}";
    case RULESET:
      element.value = element.props.join(",");
  }
  return strlen(children = serialize(element.children, callback)) ? element.return = element.value + "{" + children + "}" : "";
}

// ../node_modules/stylis/src/Middleware.js
function middleware(collection) {
  var length2 = sizeof(collection);
  return function(element, index, children, callback) {
    for (var output = "", i = 0; i < length2; i++)
      output += collection[i](element, index, children, callback) || "";
    return output;
  };
}
function rulesheet(callback) {
  return function(element) {
    element.root || (element = element.return) && callback(element);
  };
}

// ../node_modules/@emotion/weak-memoize/dist/emotion-weak-memoize.esm.js
var weakMemoize = function(func) {
  var cache = /* @__PURE__ */ new WeakMap();
  return function(arg) {
    if (cache.has(arg))
      return cache.get(arg);
    var ret = func(arg);
    return cache.set(arg, ret), ret;
  };
};

// ../node_modules/@emotion/memoize/dist/emotion-memoize.esm.js
function memoize(fn) {
  var cache = /* @__PURE__ */ Object.create(null);
  return function(arg) {
    return cache[arg] === void 0 && (cache[arg] = fn(arg)), cache[arg];
  };
}

// ../node_modules/@emotion/cache/dist/emotion-cache.browser.esm.js
var identifierWithPointTracking = function(begin, points, index) {
  for (var previous = 0, character2 = 0; previous = character2, character2 = peek(), previous === 38 && character2 === 12 && (points[index] = 1), !token(character2); )
    next();
  return slice(begin, position);
}, toRules = function(parsed, points) {
  var index = -1, character2 = 44;
  do
    switch (token(character2)) {
      case 0:
        character2 === 38 && peek() === 12 && (points[index] = 1), parsed[index] += identifierWithPointTracking(position - 1, points, index);
        break;
      case 2:
        parsed[index] += delimit(character2);
        break;
      case 4:
        if (character2 === 44) {
          parsed[++index] = peek() === 58 ? "&\f" : "", points[index] = parsed[index].length;
          break;
        }
      // fallthrough
      default:
        parsed[index] += from(character2);
    }
  while (character2 = next());
  return parsed;
}, getRules = function(value, points) {
  return dealloc(toRules(alloc(value), points));
}, fixedElements = /* @__PURE__ */ new WeakMap(), compat = function(element) {
  if (!(element.type !== "rule" || !element.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  element.length < 1)) {
    for (var value = element.value, parent = element.parent, isImplicitRule = element.column === parent.column && element.line === parent.line; parent.type !== "rule"; )
      if (parent = parent.parent, !parent) return;
    if (!(element.props.length === 1 && value.charCodeAt(0) !== 58 && !fixedElements.get(parent)) && !isImplicitRule) {
      fixedElements.set(element, !0);
      for (var points = [], rules = getRules(value, points), parentRules = parent.props, i = 0, k = 0; i < rules.length; i++)
        for (var j = 0; j < parentRules.length; j++, k++)
          element.props[k] = points[i] ? rules[i].replace(/&\f/g, parentRules[j]) : parentRules[j] + " " + rules[i];
    }
  }
}, removeLabel = function(element) {
  if (element.type === "decl") {
    var value = element.value;
    // charcode for l
    value.charCodeAt(0) === 108 && // charcode for b
    value.charCodeAt(2) === 98 && (element.return = "", element.value = "");
  }
};
function prefix2(value, length2) {
  switch (hash(value, length2)) {
    // color-adjust
    case 5103:
      return WEBKIT + "print-" + value + value;
    // animation, animation-(delay|direction|duration|fill-mode|iteration-count|name|play-state|timing-function)
    case 5737:
    case 4201:
    case 3177:
    case 3433:
    case 1641:
    case 4457:
    case 2921:
    // text-decoration, filter, clip-path, backface-visibility, column, box-decoration-break
    case 5572:
    case 6356:
    case 5844:
    case 3191:
    case 6645:
    case 3005:
    // mask, mask-image, mask-(mode|clip|size), mask-(repeat|origin), mask-position, mask-composite,
    case 6391:
    case 5879:
    case 5623:
    case 6135:
    case 4599:
    case 4855:
    // background-clip, columns, column-(count|fill|gap|rule|rule-color|rule-style|rule-width|span|width)
    case 4215:
    case 6389:
    case 5109:
    case 5365:
    case 5621:
    case 3829:
      return WEBKIT + value + value;
    // appearance, user-select, transform, hyphens, text-size-adjust
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return WEBKIT + value + MOZ + value + MS + value + value;
    // flex, flex-direction
    case 6828:
    case 4268:
      return WEBKIT + value + MS + value + value;
    // order
    case 6165:
      return WEBKIT + value + MS + "flex-" + value + value;
    // align-items
    case 5187:
      return WEBKIT + value + replace(value, /(\w+).+(:[^]+)/, WEBKIT + "box-$1$2" + MS + "flex-$1$2") + value;
    // align-self
    case 5443:
      return WEBKIT + value + MS + "flex-item-" + replace(value, /flex-|-self/, "") + value;
    // align-content
    case 4675:
      return WEBKIT + value + MS + "flex-line-pack" + replace(value, /align-content|flex-|-self/, "") + value;
    // flex-shrink
    case 5548:
      return WEBKIT + value + MS + replace(value, "shrink", "negative") + value;
    // flex-basis
    case 5292:
      return WEBKIT + value + MS + replace(value, "basis", "preferred-size") + value;
    // flex-grow
    case 6060:
      return WEBKIT + "box-" + replace(value, "-grow", "") + WEBKIT + value + MS + replace(value, "grow", "positive") + value;
    // transition
    case 4554:
      return WEBKIT + replace(value, /([^-])(transform)/g, "$1" + WEBKIT + "$2") + value;
    // cursor
    case 6187:
      return replace(replace(replace(value, /(zoom-|grab)/, WEBKIT + "$1"), /(image-set)/, WEBKIT + "$1"), value, "") + value;
    // background, background-image
    case 5495:
    case 3959:
      return replace(value, /(image-set\([^]*)/, WEBKIT + "$1$`$1");
    // justify-content
    case 4968:
      return replace(replace(value, /(.+:)(flex-)?(.*)/, WEBKIT + "box-pack:$3" + MS + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + WEBKIT + value + value;
    // (margin|padding)-inline-(start|end)
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return replace(value, /(.+)-inline(.+)/, WEBKIT + "$1$2") + value;
    // (min|max)?(width|height|inline-size|block-size)
    case 8116:
    case 7059:
    case 5753:
    case 5535:
    case 5445:
    case 5701:
    case 4933:
    case 4677:
    case 5533:
    case 5789:
    case 5021:
    case 4765:
      if (strlen(value) - 1 - length2 > 6) switch (charat(value, length2 + 1)) {
        // (m)ax-content, (m)in-content
        case 109:
          if (charat(value, length2 + 4) !== 45) break;
        // (f)ill-available, (f)it-content
        case 102:
          return replace(value, /(.+:)(.+)-([^]+)/, "$1" + WEBKIT + "$2-$3$1" + MOZ + (charat(value, length2 + 3) == 108 ? "$3" : "$2-$3")) + value;
        // (s)tretch
        case 115:
          return ~indexof(value, "stretch") ? prefix2(replace(value, "stretch", "fill-available"), length2) + value : value;
      }
      break;
    // position: sticky
    case 4949:
      if (charat(value, length2 + 1) !== 115) break;
    // display: (flex|inline-flex)
    case 6444:
      switch (charat(value, strlen(value) - 3 - (~indexof(value, "!important") && 10))) {
        // stic(k)y
        case 107:
          return replace(value, ":", ":" + WEBKIT) + value;
        // (inline-)?fl(e)x
        case 101:
          return replace(value, /(.+:)([^;!]+)(;|!.+)?/, "$1" + WEBKIT + (charat(value, 14) === 45 ? "inline-" : "") + "box$3$1" + WEBKIT + "$2$3$1" + MS + "$2box$3") + value;
      }
      break;
    // writing-mode
    case 5936:
      switch (charat(value, length2 + 11)) {
        // vertical-l(r)
        case 114:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, "tb") + value;
        // vertical-r(l)
        case 108:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, "tb-rl") + value;
        // horizontal(-)tb
        case 45:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, "lr") + value;
      }
      return WEBKIT + value + MS + value + value;
  }
  return value;
}
var prefixer = function(element, index, children, callback) {
  if (element.length > -1 && !element.return) switch (element.type) {
    case DECLARATION:
      element.return = prefix2(element.value, element.length);
      break;
    case KEYFRAMES:
      return serialize([copy(element, {
        value: replace(element.value, "@", "@" + WEBKIT)
      })], callback);
    case RULESET:
      if (element.length) return combine(element.props, function(value) {
        switch (match(value, /(::plac\w+|:read-\w+)/)) {
          // :read-(only|write)
          case ":read-only":
          case ":read-write":
            return serialize([copy(element, {
              props: [replace(value, /:(read-\w+)/, ":" + MOZ + "$1")]
            })], callback);
          // :placeholder
          case "::placeholder":
            return serialize([copy(element, {
              props: [replace(value, /:(plac\w+)/, ":" + WEBKIT + "input-$1")]
            }), copy(element, {
              props: [replace(value, /:(plac\w+)/, ":" + MOZ + "$1")]
            }), copy(element, {
              props: [replace(value, /:(plac\w+)/, MS + "input-$1")]
            })], callback);
        }
        return "";
      });
  }
}, defaultStylisPlugins = [prefixer], createCache = function(options) {
  var key = options.key;
  if (key === "css") {
    var ssrStyles = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(ssrStyles, function(node2) {
      var dataEmotionAttribute = node2.getAttribute("data-emotion");
      dataEmotionAttribute.indexOf(" ") !== -1 && (document.head.appendChild(node2), node2.setAttribute("data-s", ""));
    });
  }
  var stylisPlugins = options.stylisPlugins || defaultStylisPlugins, inserted = {}, container, nodesToHydrate = [];
  container = options.container || document.head, Array.prototype.forEach.call(
    // this means we will ignore elements which don't have a space in them which
    // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
    document.querySelectorAll('style[data-emotion^="' + key + ' "]'),
    function(node2) {
      for (var attrib = node2.getAttribute("data-emotion").split(" "), i = 1; i < attrib.length; i++)
        inserted[attrib[i]] = !0;
      nodesToHydrate.push(node2);
    }
  );
  var _insert, omnipresentPlugins = [compat, removeLabel];
  {
    var currentSheet, finalizingPlugins = [stringify, rulesheet(function(rule) {
      currentSheet.insert(rule);
    })], serializer = middleware(omnipresentPlugins.concat(stylisPlugins, finalizingPlugins)), stylis = function(styles) {
      return serialize(compile(styles), serializer);
    };
    _insert = function(selector, serialized, sheet, shouldCache) {
      currentSheet = sheet, stylis(selector ? selector + "{" + serialized.styles + "}" : serialized.styles), shouldCache && (cache.inserted[serialized.name] = !0);
    };
  }
  var cache = {
    key,
    sheet: new StyleSheet({
      key,
      container,
      nonce: options.nonce,
      speedy: options.speedy,
      prepend: options.prepend,
      insertionPoint: options.insertionPoint
    }),
    nonce: options.nonce,
    inserted,
    registered: {},
    insert: _insert
  };
  return cache.sheet.hydrate(nodesToHydrate), cache;
};

// ../node_modules/@emotion/react/_isolated-hnrs/dist/emotion-react-_isolated-hnrs.browser.esm.js
var import_hoist_non_react_statics = __toESM(require_hoist_non_react_statics_cjs()), hoistNonReactStatics = (function(targetComponent, sourceComponent) {
  return (0, import_hoist_non_react_statics.default)(targetComponent, sourceComponent);
});

// ../node_modules/@emotion/utils/dist/emotion-utils.browser.esm.js
var isBrowser = !0;
function getRegisteredStyles(registered, registeredStyles, classNames) {
  var rawClassName = "";
  return classNames.split(" ").forEach(function(className) {
    registered[className] !== void 0 ? registeredStyles.push(registered[className] + ";") : className && (rawClassName += className + " ");
  }), rawClassName;
}
var registerStyles = function(cache, serialized, isStringTag) {
  var className = cache.key + "-" + serialized.name;
  // we only need to add the styles to the registered cache if the
  // class name could be used further down
  // the tree but if it's a string tag, we know it won't
  // so we don't have to add it to registered cache.
  // this improves memory usage since we can avoid storing the whole style string
  (isStringTag === !1 || // we need to always store it if we're in compat mode and
  // in node since emotion-server relies on whether a style is in
  // the registered cache to know whether a style is global or not
  // also, note that this check will be dead code eliminated in the browser
  isBrowser === !1) && cache.registered[className] === void 0 && (cache.registered[className] = serialized.styles);
}, insertStyles = function(cache, serialized, isStringTag) {
  registerStyles(cache, serialized, isStringTag);
  var className = cache.key + "-" + serialized.name;
  if (cache.inserted[serialized.name] === void 0) {
    var current = serialized;
    do
      cache.insert(serialized === current ? "." + className : "", current, cache.sheet, !0), current = current.next;
    while (current !== void 0);
  }
};

// ../node_modules/@emotion/hash/dist/emotion-hash.esm.js
function murmur2(str) {
  for (var h = 0, k, i = 0, len = str.length; len >= 4; ++i, len -= 4)
    k = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24, k = /* Math.imul(k, m): */
    (k & 65535) * 1540483477 + ((k >>> 16) * 59797 << 16), k ^= /* k >>> r: */
    k >>> 24, h = /* Math.imul(k, m): */
    (k & 65535) * 1540483477 + ((k >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (h & 65535) * 1540483477 + ((h >>> 16) * 59797 << 16);
  switch (len) {
    case 3:
      h ^= (str.charCodeAt(i + 2) & 255) << 16;
    case 2:
      h ^= (str.charCodeAt(i + 1) & 255) << 8;
    case 1:
      h ^= str.charCodeAt(i) & 255, h = /* Math.imul(h, m): */
      (h & 65535) * 1540483477 + ((h >>> 16) * 59797 << 16);
  }
  return h ^= h >>> 13, h = /* Math.imul(h, m): */
  (h & 65535) * 1540483477 + ((h >>> 16) * 59797 << 16), ((h ^ h >>> 15) >>> 0).toString(36);
}

// ../node_modules/@emotion/unitless/dist/emotion-unitless.esm.js
var unitlessKeys = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
};

// ../node_modules/@emotion/serialize/dist/emotion-serialize.esm.js
var isDevelopment2 = !1, hyphenateRegex = /[A-Z]|^ms/g, animationRegex = /_EMO_([^_]+?)_([^]*?)_EMO_/g, isCustomProperty = function(property) {
  return property.charCodeAt(1) === 45;
}, isProcessableValue = function(value) {
  return value != null && typeof value != "boolean";
}, processStyleName = memoize(function(styleName) {
  return isCustomProperty(styleName) ? styleName : styleName.replace(hyphenateRegex, "-$&").toLowerCase();
}), processStyleValue = function(key, value) {
  switch (key) {
    case "animation":
    case "animationName":
      if (typeof value == "string")
        return value.replace(animationRegex, function(match2, p1, p2) {
          return cursor = {
            name: p1,
            styles: p2,
            next: cursor
          }, p1;
        });
  }
  return unitlessKeys[key] !== 1 && !isCustomProperty(key) && typeof value == "number" && value !== 0 ? value + "px" : value;
}, noComponentSelectorMessage = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
function handleInterpolation(mergedProps, registered, interpolation) {
  if (interpolation == null)
    return "";
  var componentSelector = interpolation;
  if (componentSelector.__emotion_styles !== void 0)
    return componentSelector;
  switch (typeof interpolation) {
    case "boolean":
      return "";
    case "object": {
      var keyframes2 = interpolation;
      if (keyframes2.anim === 1)
        return cursor = {
          name: keyframes2.name,
          styles: keyframes2.styles,
          next: cursor
        }, keyframes2.name;
      var serializedStyles = interpolation;
      if (serializedStyles.styles !== void 0) {
        var next2 = serializedStyles.next;
        if (next2 !== void 0)
          for (; next2 !== void 0; )
            cursor = {
              name: next2.name,
              styles: next2.styles,
              next: cursor
            }, next2 = next2.next;
        var styles = serializedStyles.styles + ";";
        return styles;
      }
      return createStringFromObject(mergedProps, registered, interpolation);
    }
    case "function": {
      if (mergedProps !== void 0) {
        var previousCursor = cursor, result = interpolation(mergedProps);
        return cursor = previousCursor, handleInterpolation(mergedProps, registered, result);
      }
      break;
    }
  }
  var asString = interpolation;
  if (registered == null)
    return asString;
  var cached = registered[asString];
  return cached !== void 0 ? cached : asString;
}
function createStringFromObject(mergedProps, registered, obj) {
  var string = "";
  if (Array.isArray(obj))
    for (var i = 0; i < obj.length; i++)
      string += handleInterpolation(mergedProps, registered, obj[i]) + ";";
  else
    for (var key in obj) {
      var value = obj[key];
      if (typeof value != "object") {
        var asString = value;
        registered != null && registered[asString] !== void 0 ? string += key + "{" + registered[asString] + "}" : isProcessableValue(asString) && (string += processStyleName(key) + ":" + processStyleValue(key, asString) + ";");
      } else {
        if (key === "NO_COMPONENT_SELECTOR" && isDevelopment2)
          throw new Error(noComponentSelectorMessage);
        if (Array.isArray(value) && typeof value[0] == "string" && (registered == null || registered[value[0]] === void 0))
          for (var _i = 0; _i < value.length; _i++)
            isProcessableValue(value[_i]) && (string += processStyleName(key) + ":" + processStyleValue(key, value[_i]) + ";");
        else {
          var interpolated = handleInterpolation(mergedProps, registered, value);
          switch (key) {
            case "animation":
            case "animationName": {
              string += processStyleName(key) + ":" + interpolated + ";";
              break;
            }
            default:
              string += key + "{" + interpolated + "}";
          }
        }
      }
    }
  return string;
}
var labelPattern = /label:\s*([^\s;{]+)\s*(;|$)/g, cursor;
function serializeStyles(args, registered, mergedProps) {
  if (args.length === 1 && typeof args[0] == "object" && args[0] !== null && args[0].styles !== void 0)
    return args[0];
  var stringMode = !0, styles = "";
  cursor = void 0;
  var strings = args[0];
  if (strings == null || strings.raw === void 0)
    stringMode = !1, styles += handleInterpolation(mergedProps, registered, strings);
  else {
    var asTemplateStringsArr = strings;
    styles += asTemplateStringsArr[0];
  }
  for (var i = 1; i < args.length; i++)
    if (styles += handleInterpolation(mergedProps, registered, args[i]), stringMode) {
      var templateStringsArr = strings;
      styles += templateStringsArr[i];
    }
  labelPattern.lastIndex = 0;
  for (var identifierName = "", match2; (match2 = labelPattern.exec(styles)) !== null; )
    identifierName += "-" + match2[1];
  var name = murmur2(styles) + identifierName;
  return {
    name,
    styles,
    next: cursor
  };
}

// ../node_modules/@emotion/use-insertion-effect-with-fallbacks/dist/emotion-use-insertion-effect-with-fallbacks.browser.esm.js
import * as React from "react";
var syncFallback = function(create3) {
  return create3();
}, useInsertionEffect2 = React.useInsertionEffect ? React.useInsertionEffect : !1, useInsertionEffectAlwaysWithSyncFallback = useInsertionEffect2 || syncFallback, useInsertionEffectWithLayoutFallback = useInsertionEffect2 || React.useLayoutEffect;

// ../node_modules/@emotion/react/dist/emotion-element-f0de968e.browser.esm.js
var isDevelopment3 = !1, EmotionCacheContext = React2.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? createCache({
    key: "css"
  }) : null
), CacheProvider = EmotionCacheContext.Provider;
var withEmotionCache = function(func) {
  return forwardRef2(function(props, ref) {
    var cache = useContext2(EmotionCacheContext);
    return func(props, cache, ref);
  });
}, ThemeContext = React2.createContext({}), useTheme = function() {
  return React2.useContext(ThemeContext);
}, getTheme = function(outerTheme, theme) {
  if (typeof theme == "function") {
    var mergedTheme = theme(outerTheme);
    return mergedTheme;
  }
  return _extends({}, outerTheme, theme);
}, createCacheWithTheme = weakMemoize(function(outerTheme) {
  return weakMemoize(function(theme) {
    return getTheme(outerTheme, theme);
  });
}), ThemeProvider = function(props) {
  var theme = React2.useContext(ThemeContext);
  return props.theme !== theme && (theme = createCacheWithTheme(theme)(props.theme)), React2.createElement(ThemeContext.Provider, {
    value: theme
  }, props.children);
};
function withTheme(Component) {
  var componentName = Component.displayName || Component.name || "Component", WithTheme = React2.forwardRef(function(props, ref) {
    var theme = React2.useContext(ThemeContext);
    return React2.createElement(Component, _extends({
      theme,
      ref
    }, props));
  });
  return WithTheme.displayName = "WithTheme(" + componentName + ")", hoistNonReactStatics(WithTheme, Component);
}
var hasOwn = {}.hasOwnProperty, typePropName = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", createEmotionProps = function(type, props) {
  var newProps = {};
  for (var _key in props)
    hasOwn.call(props, _key) && (newProps[_key] = props[_key]);
  return newProps[typePropName] = type, newProps;
}, Insertion = function(_ref) {
  var cache = _ref.cache, serialized = _ref.serialized, isStringTag = _ref.isStringTag;
  return registerStyles(cache, serialized, isStringTag), useInsertionEffectAlwaysWithSyncFallback(function() {
    return insertStyles(cache, serialized, isStringTag);
  }), null;
}, Emotion = withEmotionCache(function(props, cache, ref) {
  var cssProp = props.css;
  typeof cssProp == "string" && cache.registered[cssProp] !== void 0 && (cssProp = cache.registered[cssProp]);
  var WrappedComponent = props[typePropName], registeredStyles = [cssProp], className = "";
  typeof props.className == "string" ? className = getRegisteredStyles(cache.registered, registeredStyles, props.className) : props.className != null && (className = props.className + " ");
  var serialized = serializeStyles(registeredStyles, void 0, React2.useContext(ThemeContext));
  className += cache.key + "-" + serialized.name;
  var newProps = {};
  for (var _key2 in props)
    hasOwn.call(props, _key2) && _key2 !== "css" && _key2 !== typePropName && !isDevelopment3 && (newProps[_key2] = props[_key2]);
  return newProps.className = className, ref && (newProps.ref = ref), React2.createElement(React2.Fragment, null, React2.createElement(Insertion, {
    cache,
    serialized,
    isStringTag: typeof WrappedComponent == "string"
  }), React2.createElement(WrappedComponent, newProps));
}), Emotion$1 = Emotion;

// ../node_modules/@emotion/react/dist/emotion-react.browser.esm.js
import * as React3 from "react";
var import_hoist_non_react_statics2 = __toESM(require_hoist_non_react_statics_cjs()), jsx = function(type, props) {
  var args = arguments;
  if (props == null || !hasOwn.call(props, "css"))
    return React3.createElement.apply(void 0, args);
  var argsLength = args.length, createElementArgArray = new Array(argsLength);
  createElementArgArray[0] = Emotion$1, createElementArgArray[1] = createEmotionProps(type, props);
  for (var i = 2; i < argsLength; i++)
    createElementArgArray[i] = args[i];
  return React3.createElement.apply(null, createElementArgArray);
};
(function(_jsx) {
  var JSX;
  JSX || (JSX = _jsx.JSX || (_jsx.JSX = {}));
})(jsx || (jsx = {}));
var Global = withEmotionCache(function(props, cache) {
  var styles = props.styles, serialized = serializeStyles([styles], void 0, React3.useContext(ThemeContext)), sheetRef = React3.useRef();
  return useInsertionEffectWithLayoutFallback(function() {
    var key = cache.key + "-global", sheet = new cache.sheet.constructor({
      key,
      nonce: cache.sheet.nonce,
      container: cache.sheet.container,
      speedy: cache.sheet.isSpeedy
    }), rehydrating = !1, node2 = document.querySelector('style[data-emotion="' + key + " " + serialized.name + '"]');
    return cache.sheet.tags.length && (sheet.before = cache.sheet.tags[0]), node2 !== null && (rehydrating = !0, node2.setAttribute("data-emotion", key), sheet.hydrate([node2])), sheetRef.current = [sheet, rehydrating], function() {
      sheet.flush();
    };
  }, [cache]), useInsertionEffectWithLayoutFallback(function() {
    var sheetRefCurrent = sheetRef.current, sheet = sheetRefCurrent[0], rehydrating = sheetRefCurrent[1];
    if (rehydrating) {
      sheetRefCurrent[1] = !1;
      return;
    }
    if (serialized.next !== void 0 && insertStyles(cache, serialized.next, !0), sheet.tags.length) {
      var element = sheet.tags[sheet.tags.length - 1].nextElementSibling;
      sheet.before = element, sheet.flush();
    }
    cache.insert("", serialized, sheet, !1);
  }, [cache, serialized.name]), null;
});
function css() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++)
    args[_key] = arguments[_key];
  return serializeStyles(args);
}
function keyframes() {
  var insertable = css.apply(void 0, arguments), name = "animation-" + insertable.name;
  return {
    name,
    styles: "@keyframes " + name + "{" + insertable.styles + "}",
    anim: 1,
    toString: function() {
      return "_EMO_" + this.name + "_" + this.styles + "_EMO_";
    }
  };
}
var classnames = function classnames2(args) {
  for (var len = args.length, i = 0, cls = ""; i < len; i++) {
    var arg = args[i];
    if (arg != null) {
      var toAdd = void 0;
      switch (typeof arg) {
        case "boolean":
          break;
        case "object": {
          if (Array.isArray(arg))
            toAdd = classnames2(arg);
          else {
            toAdd = "";
            for (var k in arg)
              arg[k] && k && (toAdd && (toAdd += " "), toAdd += k);
          }
          break;
        }
        default:
          toAdd = arg;
      }
      toAdd && (cls && (cls += " "), cls += toAdd);
    }
  }
  return cls;
};
function merge(registered, css2, className) {
  var registeredStyles = [], rawClassName = getRegisteredStyles(registered, registeredStyles, className);
  return registeredStyles.length < 2 ? className : rawClassName + css2(registeredStyles);
}
var Insertion3 = function(_ref) {
  var cache = _ref.cache, serializedArr = _ref.serializedArr;
  return useInsertionEffectAlwaysWithSyncFallback(function() {
    for (var i = 0; i < serializedArr.length; i++)
      insertStyles(cache, serializedArr[i], !1);
  }), null;
}, ClassNames = withEmotionCache(function(props, cache) {
  var hasRendered = !1, serializedArr = [], css2 = function() {
    if (hasRendered && isDevelopment3)
      throw new Error("css can only be used during render");
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++)
      args[_key] = arguments[_key];
    var serialized = serializeStyles(args, cache.registered);
    return serializedArr.push(serialized), registerStyles(cache, serialized, !1), cache.key + "-" + serialized.name;
  }, cx = function() {
    if (hasRendered && isDevelopment3)
      throw new Error("cx can only be used during render");
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++)
      args[_key2] = arguments[_key2];
    return merge(cache.registered, css2, classnames(args));
  }, content = {
    css: css2,
    cx,
    theme: React3.useContext(ThemeContext)
  }, ele = props.children(content);
  return hasRendered = !0, React3.createElement(React3.Fragment, null, React3.createElement(Insertion3, {
    cache,
    serializedArr
  }), ele);
});

// ../node_modules/@emotion/styled/base/dist/emotion-styled-base.browser.esm.js
import * as React4 from "react";

// ../node_modules/@emotion/is-prop-valid/dist/emotion-is-prop-valid.esm.js
var reactPropsRegex = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|popover|popoverTarget|popoverTargetAction|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, isPropValid = memoize(
  function(prop) {
    return reactPropsRegex.test(prop) || prop.charCodeAt(0) === 111 && prop.charCodeAt(1) === 110 && prop.charCodeAt(2) < 91;
  }
  /* Z+1 */
);

// ../node_modules/@emotion/styled/base/dist/emotion-styled-base.browser.esm.js
var isDevelopment4 = !1, testOmitPropsOnStringTag = isPropValid, testOmitPropsOnComponent = function(key) {
  return key !== "theme";
}, getDefaultShouldForwardProp = function(tag) {
  return typeof tag == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  tag.charCodeAt(0) > 96 ? testOmitPropsOnStringTag : testOmitPropsOnComponent;
}, composeShouldForwardProps = function(tag, options, isReal) {
  var shouldForwardProp;
  if (options) {
    var optionsShouldForwardProp = options.shouldForwardProp;
    shouldForwardProp = tag.__emotion_forwardProp && optionsShouldForwardProp ? function(propName) {
      return tag.__emotion_forwardProp(propName) && optionsShouldForwardProp(propName);
    } : optionsShouldForwardProp;
  }
  return typeof shouldForwardProp != "function" && isReal && (shouldForwardProp = tag.__emotion_forwardProp), shouldForwardProp;
}, Insertion5 = function(_ref) {
  var cache = _ref.cache, serialized = _ref.serialized, isStringTag = _ref.isStringTag;
  return registerStyles(cache, serialized, isStringTag), useInsertionEffectAlwaysWithSyncFallback(function() {
    return insertStyles(cache, serialized, isStringTag);
  }), null;
}, createStyled = function createStyled2(tag, options) {
  var isReal = tag.__emotion_real === tag, baseTag = isReal && tag.__emotion_base || tag, identifierName, targetClassName;
  options !== void 0 && (identifierName = options.label, targetClassName = options.target);
  var shouldForwardProp = composeShouldForwardProps(tag, options, isReal), defaultShouldForwardProp = shouldForwardProp || getDefaultShouldForwardProp(baseTag), shouldUseAs = !defaultShouldForwardProp("as");
  return function() {
    var args = arguments, styles = isReal && tag.__emotion_styles !== void 0 ? tag.__emotion_styles.slice(0) : [];
    if (identifierName !== void 0 && styles.push("label:" + identifierName + ";"), args[0] == null || args[0].raw === void 0)
      styles.push.apply(styles, args);
    else {
      var templateStringsArr = args[0];
      styles.push(templateStringsArr[0]);
      for (var len = args.length, i = 1; i < len; i++)
        styles.push(args[i], templateStringsArr[i]);
    }
    var Styled = withEmotionCache(function(props, cache, ref) {
      var FinalTag = shouldUseAs && props.as || baseTag, className = "", classInterpolations = [], mergedProps = props;
      if (props.theme == null) {
        mergedProps = {};
        for (var key in props)
          mergedProps[key] = props[key];
        mergedProps.theme = React4.useContext(ThemeContext);
      }
      typeof props.className == "string" ? className = getRegisteredStyles(cache.registered, classInterpolations, props.className) : props.className != null && (className = props.className + " ");
      var serialized = serializeStyles(styles.concat(classInterpolations), cache.registered, mergedProps);
      className += cache.key + "-" + serialized.name, targetClassName !== void 0 && (className += " " + targetClassName);
      var finalShouldForwardProp = shouldUseAs && shouldForwardProp === void 0 ? getDefaultShouldForwardProp(FinalTag) : defaultShouldForwardProp, newProps = {};
      for (var _key in props)
        shouldUseAs && _key === "as" || finalShouldForwardProp(_key) && (newProps[_key] = props[_key]);
      return newProps.className = className, ref && (newProps.ref = ref), React4.createElement(React4.Fragment, null, React4.createElement(Insertion5, {
        cache,
        serialized,
        isStringTag: typeof FinalTag == "string"
      }), React4.createElement(FinalTag, newProps));
    });
    return Styled.displayName = identifierName !== void 0 ? identifierName : "Styled(" + (typeof baseTag == "string" ? baseTag : baseTag.displayName || baseTag.name || "Component") + ")", Styled.defaultProps = tag.defaultProps, Styled.__emotion_real = Styled, Styled.__emotion_base = baseTag, Styled.__emotion_styles = styles, Styled.__emotion_forwardProp = shouldForwardProp, Object.defineProperty(Styled, "toString", {
      value: function() {
        return targetClassName === void 0 && isDevelopment4 ? "NO_COMPONENT_SELECTOR" : "." + targetClassName;
      }
    }), Styled.withComponent = function(nextTag, nextOptions) {
      var newStyled = createStyled2(nextTag, _extends({}, options, nextOptions, {
        shouldForwardProp: composeShouldForwardProps(Styled, nextOptions, !0)
      }));
      return newStyled.apply(void 0, styles);
    }, Styled;
  };
};

// ../node_modules/@emotion/styled/dist/emotion-styled.browser.esm.js
import "react";
var tags = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // SVG
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "text",
  "tspan"
], styled = createStyled.bind(null);
tags.forEach(function(tagName) {
  styled[tagName] = styled(tagName);
});

// src/theming/global.ts
var import_memoizerific = __toESM(require_memoizerific(), 1), createReset = (0, import_memoizerific.default)(1)(
  ({ typography: typography2 }) => ({
    body: {
      fontFamily: typography2.fonts.base,
      fontSize: typography2.size.s3,
      margin: 0,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
      WebkitOverflowScrolling: "touch"
    },
    "*": {
      boxSizing: "border-box"
    },
    "h1, h2, h3, h4, h5, h6": {
      fontWeight: typography2.weight.regular,
      margin: 0,
      padding: 0
    },
    "button, input, textarea, select": {
      fontFamily: "inherit",
      fontSize: "inherit",
      boxSizing: "border-box"
    },
    sub: {
      fontSize: "0.8em",
      bottom: "-0.2em"
    },
    sup: {
      fontSize: "0.8em",
      top: "-0.2em"
    },
    "b, strong": {
      fontWeight: typography2.weight.bold
    },
    hr: {
      border: "none",
      borderTop: "1px solid silver",
      clear: "both",
      marginBottom: "1.25rem"
    },
    code: {
      fontFamily: typography2.fonts.mono,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      display: "inline-block",
      paddingLeft: 2,
      paddingRight: 2,
      verticalAlign: "baseline",
      color: "inherit"
    },
    pre: {
      fontFamily: typography2.fonts.mono,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      lineHeight: "18px",
      padding: "11px 1rem",
      whiteSpace: "pre-wrap",
      color: "inherit",
      borderRadius: 3,
      margin: "1rem 0"
    }
  })
), createGlobal = (0, import_memoizerific.default)(1)(({
  color: color2,
  background: background2,
  typography: typography2
}) => {
  let resetStyles = createReset({ typography: typography2 });
  return {
    ...resetStyles,
    body: {
      ...resetStyles.body,
      color: color2.defaultText,
      background: background2.app,
      overflow: "hidden"
    },
    hr: {
      ...resetStyles.hr,
      borderTop: `1px solid ${color2.border}`
    },
    ".sb-sr-only, .sb-hidden-until-focus:not(:focus)": {
      position: "absolute",
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: "hidden",
      whiteSpace: "nowrap",
      clip: "rect(0, 0, 0, 0)",
      clipPath: "inset(50%)",
      border: 0
    },
    ".sb-hidden-until-focus": {
      opacity: 0,
      transition: "opacity 150ms ease-out"
    },
    ".sb-hidden-until-focus:focus": {
      opacity: 1
    },
    ".react-aria-Popover:focus-visible": {
      outline: "none"
    }
  };
});

// src/theming/animation.ts
var easing = {
  rubber: "cubic-bezier(0.175, 0.885, 0.335, 1.05)"
}, rotate360 = keyframes`
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
`, glow = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
`, float = keyframes`
  0% { transform: translateY(1px); }
  25% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(1px); }
`, jiggle = keyframes`
  0%, 100% { transform:translate3d(0,0,0); }
  12.5%, 62.5% { transform:translate3d(-4px,0,0); }
  37.5%, 87.5% {  transform: translate3d(4px,0,0);  }
`, inlineGlow = css`
  animation: ${glow} 1.5s ease-in-out infinite;
  color: transparent;
  cursor: progress;
`, hoverable = css`
  transition: all 150ms ease-out;
  transform: translate3d(0, 0, 0);

  &:hover {
    transform: translate3d(0, -2px, 0);
  }

  &:active {
    transform: translate3d(0, 0, 0);
  }
`, animation = {
  rotate360,
  glow,
  float,
  jiggle,
  inlineGlow,
  hoverable
};

// src/theming/modules/syntax.ts
var chromeDark = {
  BASE_FONT_FAMILY: "Menlo, monospace",
  BASE_FONT_SIZE: "11px",
  BASE_LINE_HEIGHT: 1.2,
  BASE_BACKGROUND_COLOR: "rgb(36, 36, 36)",
  BASE_COLOR: "rgb(213, 213, 213)",
  OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
  OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
  OBJECT_NAME_COLOR: "rgb(227, 110, 236)",
  OBJECT_VALUE_NULL_COLOR: "rgb(127, 127, 127)",
  OBJECT_VALUE_UNDEFINED_COLOR: "rgb(127, 127, 127)",
  OBJECT_VALUE_REGEXP_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_STRING_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_SYMBOL_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_NUMBER_COLOR: "hsl(252, 100%, 75%)",
  OBJECT_VALUE_BOOLEAN_COLOR: "hsl(252, 100%, 75%)",
  OBJECT_VALUE_FUNCTION_PREFIX_COLOR: "rgb(85, 106, 242)",
  HTML_TAG_COLOR: "rgb(93, 176, 215)",
  HTML_TAGNAME_COLOR: "rgb(93, 176, 215)",
  HTML_TAGNAME_TEXT_TRANSFORM: "lowercase",
  HTML_ATTRIBUTE_NAME_COLOR: "rgb(155, 187, 220)",
  HTML_ATTRIBUTE_VALUE_COLOR: "rgb(242, 151, 102)",
  HTML_COMMENT_COLOR: "rgb(137, 137, 137)",
  HTML_DOCTYPE_COLOR: "rgb(192, 192, 192)",
  ARROW_COLOR: "rgb(145, 145, 145)",
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,
  ARROW_ANIMATION_DURATION: "0",
  TREENODE_FONT_FAMILY: "Menlo, monospace",
  TREENODE_FONT_SIZE: "11px",
  TREENODE_LINE_HEIGHT: 1.2,
  TREENODE_PADDING_LEFT: 12,
  TABLE_BORDER_COLOR: "rgb(85, 85, 85)",
  TABLE_TH_BACKGROUND_COLOR: "rgb(44, 44, 44)",
  TABLE_TH_HOVER_COLOR: "rgb(48, 48, 48)",
  TABLE_SORT_ICON_COLOR: "black",
  // 'rgb(48, 57, 66)',
  TABLE_DATA_BACKGROUND_IMAGE: "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0) 50%, rgba(51, 139, 255, 0.0980392) 50%, rgba(51, 139, 255, 0.0980392))",
  TABLE_DATA_BACKGROUND_SIZE: "128px 32px"
}, chromeLight = {
  BASE_FONT_FAMILY: "Menlo, monospace",
  BASE_FONT_SIZE: "11px",
  BASE_LINE_HEIGHT: 1.2,
  BASE_BACKGROUND_COLOR: "white",
  BASE_COLOR: "black",
  OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
  OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
  OBJECT_NAME_COLOR: "rgb(136, 19, 145)",
  OBJECT_VALUE_NULL_COLOR: "rgb(128, 128, 128)",
  OBJECT_VALUE_UNDEFINED_COLOR: "rgb(128, 128, 128)",
  OBJECT_VALUE_REGEXP_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_STRING_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_SYMBOL_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_NUMBER_COLOR: "rgb(28, 0, 207)",
  OBJECT_VALUE_BOOLEAN_COLOR: "rgb(28, 0, 207)",
  OBJECT_VALUE_FUNCTION_PREFIX_COLOR: "rgb(13, 34, 170)",
  HTML_TAG_COLOR: "rgb(168, 148, 166)",
  HTML_TAGNAME_COLOR: "rgb(136, 18, 128)",
  HTML_TAGNAME_TEXT_TRANSFORM: "lowercase",
  HTML_ATTRIBUTE_NAME_COLOR: "rgb(153, 69, 0)",
  HTML_ATTRIBUTE_VALUE_COLOR: "rgb(26, 26, 166)",
  HTML_COMMENT_COLOR: "rgb(35, 110, 37)",
  HTML_DOCTYPE_COLOR: "rgb(192, 192, 192)",
  ARROW_COLOR: "#6e6e6e",
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,
  ARROW_ANIMATION_DURATION: "0",
  TREENODE_FONT_FAMILY: "Menlo, monospace",
  TREENODE_FONT_SIZE: "11px",
  TREENODE_LINE_HEIGHT: 1.2,
  TREENODE_PADDING_LEFT: 12,
  TABLE_BORDER_COLOR: "#aaa",
  TABLE_TH_BACKGROUND_COLOR: "#eee",
  TABLE_TH_HOVER_COLOR: "hsla(0, 0%, 90%, 1)",
  TABLE_SORT_ICON_COLOR: "#6e6e6e",
  TABLE_DATA_BACKGROUND_IMAGE: "linear-gradient(to bottom, white, white 50%, rgb(234, 243, 255) 50%, rgb(234, 243, 255))",
  TABLE_DATA_BACKGROUND_SIZE: "128px 32px"
}, convertColors = (colors) => Object.entries(colors).reduce((acc, [k, v]) => ({ ...acc, [k]: mkColor(v) }), {}), create2 = ({ colors, mono }) => {
  let colorsObjs = convertColors(colors);
  return {
    token: {
      fontFamily: mono,
      WebkitFontSmoothing: "antialiased",
      "&.tag": colorsObjs.red3,
      "&.comment": { ...colorsObjs.green1, fontStyle: "italic" },
      "&.prolog": { ...colorsObjs.green1, fontStyle: "italic" },
      "&.doctype": { ...colorsObjs.green1, fontStyle: "italic" },
      "&.cdata": { ...colorsObjs.green1, fontStyle: "italic" },
      "&.string": colorsObjs.red1,
      "&.url": colorsObjs.cyan1,
      "&.symbol": colorsObjs.cyan1,
      "&.number": colorsObjs.cyan1,
      "&.boolean": colorsObjs.cyan1,
      "&.variable": colorsObjs.cyan1,
      "&.constant": colorsObjs.cyan1,
      "&.inserted": colorsObjs.cyan1,
      "&.atrule": colorsObjs.blue1,
      "&.keyword": colorsObjs.blue1,
      "&.attr-value": colorsObjs.blue1,
      "&.punctuation": colorsObjs.gray1,
      "&.operator": colorsObjs.gray1,
      "&.function": colorsObjs.gray1,
      "&.deleted": colorsObjs.red2,
      "&.important": {
        fontWeight: "bold"
      },
      "&.bold": {
        fontWeight: "bold"
      },
      "&.italic": {
        fontStyle: "italic"
      },
      "&.class-name": colorsObjs.cyan2,
      "&.selector": colorsObjs.red3,
      "&.attr-name": colorsObjs.red4,
      "&.property": colorsObjs.red4,
      "&.regex": colorsObjs.red4,
      "&.entity": colorsObjs.red4,
      "&.directive.tag .tag": {
        background: "#ffff00",
        ...colorsObjs.gray1
      }
    },
    "language-json .token.boolean": colorsObjs.blue1,
    "language-json .token.number": colorsObjs.blue1,
    "language-json .token.property": colorsObjs.cyan2,
    namespace: {
      opacity: 0.7
    }
  };
};

// src/theming/convert.ts
var lightSyntaxColors = {
  green1: "#008000",
  red1: "#A31515",
  red2: "#9a050f",
  red3: "#800000",
  red4: "#eb0000",
  gray1: "#393A34",
  cyan1: "#008380",
  cyan2: "#007ca0",
  blue1: "#0000ff",
  blue2: "#00009f"
}, darkSyntaxColors = {
  green1: "#95999D",
  red1: "#92C379",
  red2: "#9a050f",
  red3: "#A8FF60",
  red4: "#96CBFE",
  gray1: "#EDEDED",
  cyan1: "#C6C5FE",
  cyan2: "#FFFFB6",
  blue1: "#B474DD",
  blue2: "#00009f"
}, createColors = (vars) => ({
  // Changeable colors
  primary: vars.colorPrimary,
  secondary: vars.colorSecondary,
  tertiary: color.tertiary,
  ancillary: color.ancillary,
  // Complimentary
  orange: color.orange,
  gold: color.gold,
  green: color.green,
  seafoam: color.seafoam,
  purple: color.purple,
  ultraviolet: color.ultraviolet,
  // Monochrome
  lightest: color.lightest,
  lighter: color.lighter,
  light: color.light,
  mediumlight: color.mediumlight,
  medium: color.medium,
  mediumdark: color.mediumdark,
  dark: color.dark,
  darker: color.darker,
  darkest: color.darkest,
  // For borders
  border: color.border,
  // Status
  positive: color.positive,
  negative: color.negative,
  warning: color.warning,
  critical: color.critical,
  defaultText: vars.textColor || color.darkest,
  inverseText: vars.textInverseColor || color.lightest,
  positiveText: color.positiveText,
  negativeText: color.negativeText,
  warningText: color.warningText
}), convert = (inherit = themes[getPreferredColorScheme()]) => {
  let {
    base,
    colorPrimary,
    colorSecondary,
    appBg,
    appContentBg,
    appHoverBg,
    appPreviewBg,
    appBorderColor,
    appBorderRadius,
    fontBase,
    fontCode,
    textColor,
    textInverseColor,
    barTextColor,
    barHoverColor,
    barSelectedColor,
    barBg,
    buttonBg,
    buttonBorder,
    booleanBg,
    booleanSelectedBg,
    inputBg,
    inputBorder,
    inputTextColor,
    inputBorderRadius,
    brandTitle,
    brandUrl,
    brandImage,
    brandTarget,
    gridCellSize,
    ...rest
  } = inherit;
  return {
    ...rest,
    base,
    ...base === "dark" ? tokens.dark : tokens.light,
    color: createColors(inherit),
    background: {
      app: appBg,
      bar: barBg,
      content: appContentBg,
      preview: appPreviewBg,
      gridCellSize: gridCellSize || background.gridCellSize,
      hoverable: appHoverBg,
      positive: background.positive,
      negative: background.negative,
      warning: background.warning,
      critical: background.critical
    },
    typography: {
      fonts: {
        base: fontBase,
        mono: fontCode
      },
      weight: typography.weight,
      size: typography.size
    },
    animation,
    easing,
    input: {
      background: inputBg,
      border: inputBorder,
      borderRadius: inputBorderRadius,
      color: inputTextColor
    },
    button: {
      background: buttonBg || inputBg,
      border: buttonBorder || inputBorder
    },
    boolean: {
      background: booleanBg || inputBorder,
      selectedBackground: booleanSelectedBg || inputBg
    },
    // UI
    layoutMargin: 10,
    appBorderColor,
    appBorderRadius,
    // Toolbar default/active colors
    barTextColor,
    barHoverColor: barHoverColor || colorSecondary,
    barSelectedColor: barSelectedColor || colorSecondary,
    barBg,
    // Brand logo/text
    brand: {
      title: brandTitle,
      url: brandUrl,
      image: brandImage || (brandTitle ? null : void 0),
      target: brandTarget
    },
    code: create2({
      colors: base === "dark" ? darkSyntaxColors : lightSyntaxColors,
      mono: fontCode
    }),
    // Addon actions theme
    // API example https://github.com/storybookjs/react-inspector/blob/master/src/styles/themes/chromeLight.tsx
    addonActionsTheme: {
      ...base === "dark" ? chromeDark : chromeLight,
      BASE_FONT_FAMILY: fontCode,
      BASE_FONT_SIZE: typography.size.s2 - 1,
      BASE_LINE_HEIGHT: "18px",
      BASE_BACKGROUND_COLOR: "transparent",
      BASE_COLOR: textColor,
      ARROW_COLOR: curriedOpacify$1(0.2, appBorderColor),
      ARROW_MARGIN_RIGHT: 4,
      ARROW_FONT_SIZE: 8,
      TREENODE_FONT_FAMILY: fontCode,
      TREENODE_FONT_SIZE: typography.size.s2 - 1,
      TREENODE_LINE_HEIGHT: "18px",
      TREENODE_PADDING_LEFT: 12
    }
  };
};

// src/theming/ensure.ts
import { logger } from "storybook/internal/client-logger";

// ../node_modules/deep-object-diff/mjs/utils.js
var isEmpty = (o) => Object.keys(o).length === 0, isObject = (o) => o != null && typeof o == "object", hasOwnProperty = (o, ...args) => Object.prototype.hasOwnProperty.call(o, ...args);
var makeObjectWithoutPrototype = () => /* @__PURE__ */ Object.create(null);

// ../node_modules/deep-object-diff/mjs/deleted.js
var deletedDiff = (lhs, rhs) => lhs === rhs || !isObject(lhs) || !isObject(rhs) ? {} : Object.keys(lhs).reduce((acc, key) => {
  if (hasOwnProperty(rhs, key)) {
    let difference = deletedDiff(lhs[key], rhs[key]);
    return isObject(difference) && isEmpty(difference) || (acc[key] = difference), acc;
  }
  return acc[key] = void 0, acc;
}, makeObjectWithoutPrototype()), deleted_default = deletedDiff;

// src/theming/ensure.ts
var ensure = (input) => {
  if (!input)
    return convert(light_default);
  let missing = deleted_default(light_default, input);
  return Object.keys(missing).length && logger.warn(
    dedent`
          Your theme is missing properties, you should update your theme!

          theme-data missing:
        `,
    missing
  ), convert(input);
};

// src/theming/index.ts
var ignoreSsrWarning = "/* emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason */";
export {
  CacheProvider,
  ClassNames,
  Global,
  ThemeProvider,
  background,
  color,
  convert,
  create,
  createCache,
  createGlobal,
  createReset,
  css,
  darkenColor as darken,
  ensure,
  getPreferredColorScheme,
  ignoreSsrWarning,
  isPropValid,
  jsx,
  keyframes,
  lightenColor as lighten,
  styled,
  themes,
  tokens,
  typography,
  useTheme,
  withTheme
};
