import {
  require_picocolors_browser
} from "../_browser-chunks/chunk-EZSQOHRI.js";
import {
  assertTypes,
  diff,
  getDefaultExportFromCjs,
  getType,
  isObject,
  noop,
  printDiffOrStringify,
  processError,
  s,
  stringify
} from "../_browser-chunks/chunk-RP5RXKFU.js";
import {
  dedent
} from "../_browser-chunks/chunk-JP7NCOJX.js";
import {
  __commonJS,
  __export,
  __toESM
} from "../_browser-chunks/chunk-A242L54C.js";

// ../node_modules/min-indent/index.js
var require_min_indent = __commonJS({
  "../node_modules/min-indent/index.js"(exports, module2) {
    "use strict";
    module2.exports = (string) => {
      let match = string.match(/^[ \t]*(?=\S)/gm);
      return match ? match.reduce((r2, a) => Math.min(r2, a.length), 1 / 0) : 0;
    };
  }
});

// ../node_modules/strip-indent/index.js
var require_strip_indent = __commonJS({
  "../node_modules/strip-indent/index.js"(exports, module2) {
    "use strict";
    var minIndent = require_min_indent();
    module2.exports = (string) => {
      let indent = minIndent(string);
      if (indent === 0)
        return string;
      let regex = new RegExp(`^[ \\t]{${indent}}`, "gm");
      return string.replace(regex, "");
    };
  }
});

// ../node_modules/indent-string/index.js
var require_indent_string = __commonJS({
  "../node_modules/indent-string/index.js"(exports, module2) {
    "use strict";
    module2.exports = (string, count = 1, options) => {
      if (options = {
        indent: " ",
        includeEmptyLines: !1,
        ...options
      }, typeof string != "string")
        throw new TypeError(
          `Expected \`input\` to be a \`string\`, got \`${typeof string}\``
        );
      if (typeof count != "number")
        throw new TypeError(
          `Expected \`count\` to be a \`number\`, got \`${typeof count}\``
        );
      if (typeof options.indent != "string")
        throw new TypeError(
          `Expected \`options.indent\` to be a \`string\`, got \`${typeof options.indent}\``
        );
      if (count === 0)
        return string;
      let regex = options.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
      return string.replace(regex, options.indent.repeat(count));
    };
  }
});

// ../node_modules/redent/index.js
var require_redent = __commonJS({
  "../node_modules/redent/index.js"(exports, module2) {
    "use strict";
    var stripIndent = require_strip_indent(), indentString = require_indent_string();
    module2.exports = (string, count = 0, options) => indentString(stripIndent(string), count, options);
  }
});

// ../node_modules/aria-query/lib/util/iteratorProxy.js
var require_iteratorProxy = __commonJS({
  "../node_modules/aria-query/lib/util/iteratorProxy.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    function iteratorProxy() {
      var values = this, index = 0, iter = {
        "@@iterator": function() {
          return iter;
        },
        next: function() {
          if (index < values.length) {
            var value = values[index];
            return index = index + 1, {
              done: !1,
              value
            };
          } else
            return {
              done: !0
            };
        }
      };
      return iter;
    }
    var _default = exports.default = iteratorProxy;
  }
});

// ../node_modules/aria-query/lib/util/iterationDecorator.js
var require_iterationDecorator = __commonJS({
  "../node_modules/aria-query/lib/util/iterationDecorator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = iterationDecorator;
    var _iteratorProxy = _interopRequireDefault(require_iteratorProxy());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    function _typeof5(o2) {
      "@babel/helpers - typeof";
      return _typeof5 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o3) {
        return typeof o3;
      } : function(o3) {
        return o3 && typeof Symbol == "function" && o3.constructor === Symbol && o3 !== Symbol.prototype ? "symbol" : typeof o3;
      }, _typeof5(o2);
    }
    function iterationDecorator(collection, entries) {
      return typeof Symbol == "function" && _typeof5(Symbol.iterator) === "symbol" && Object.defineProperty(collection, Symbol.iterator, {
        value: _iteratorProxy.default.bind(entries)
      }), collection;
    }
  }
});

// ../node_modules/aria-query/lib/ariaPropsMap.js
var require_ariaPropsMap = __commonJS({
  "../node_modules/aria-query/lib/ariaPropsMap.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _iterationDecorator = _interopRequireDefault(require_iterationDecorator());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    function _slicedToArray(r2, e2) {
      return _arrayWithHoles(r2) || _iterableToArrayLimit(r2, e2) || _unsupportedIterableToArray(r2, e2) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function _unsupportedIterableToArray(r2, a) {
      if (r2) {
        if (typeof r2 == "string") return _arrayLikeToArray(r2, a);
        var t2 = {}.toString.call(r2).slice(8, -1);
        return t2 === "Object" && r2.constructor && (t2 = r2.constructor.name), t2 === "Map" || t2 === "Set" ? Array.from(r2) : t2 === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t2) ? _arrayLikeToArray(r2, a) : void 0;
      }
    }
    function _arrayLikeToArray(r2, a) {
      (a == null || a > r2.length) && (a = r2.length);
      for (var e2 = 0, n2 = Array(a); e2 < a; e2++) n2[e2] = r2[e2];
      return n2;
    }
    function _iterableToArrayLimit(r2, l2) {
      var t2 = r2 == null ? null : typeof Symbol < "u" && r2[Symbol.iterator] || r2["@@iterator"];
      if (t2 != null) {
        var e2, n2, i2, u3, a = [], f3 = !0, o2 = !1;
        try {
          if (i2 = (t2 = t2.call(r2)).next, l2 === 0) {
            if (Object(t2) !== t2) return;
            f3 = !1;
          } else for (; !(f3 = (e2 = i2.call(t2)).done) && (a.push(e2.value), a.length !== l2); f3 = !0) ;
        } catch (r3) {
          o2 = !0, n2 = r3;
        } finally {
          try {
            if (!f3 && t2.return != null && (u3 = t2.return(), Object(u3) !== u3)) return;
          } finally {
            if (o2) throw n2;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r2) {
      if (Array.isArray(r2)) return r2;
    }
    var properties = [["aria-activedescendant", {
      type: "id"
    }], ["aria-atomic", {
      type: "boolean"
    }], ["aria-autocomplete", {
      type: "token",
      values: ["inline", "list", "both", "none"]
    }], ["aria-braillelabel", {
      type: "string"
    }], ["aria-brailleroledescription", {
      type: "string"
    }], ["aria-busy", {
      type: "boolean"
    }], ["aria-checked", {
      type: "tristate"
    }], ["aria-colcount", {
      type: "integer"
    }], ["aria-colindex", {
      type: "integer"
    }], ["aria-colspan", {
      type: "integer"
    }], ["aria-controls", {
      type: "idlist"
    }], ["aria-current", {
      type: "token",
      values: ["page", "step", "location", "date", "time", !0, !1]
    }], ["aria-describedby", {
      type: "idlist"
    }], ["aria-description", {
      type: "string"
    }], ["aria-details", {
      type: "id"
    }], ["aria-disabled", {
      type: "boolean"
    }], ["aria-dropeffect", {
      type: "tokenlist",
      values: ["copy", "execute", "link", "move", "none", "popup"]
    }], ["aria-errormessage", {
      type: "id"
    }], ["aria-expanded", {
      type: "boolean",
      allowundefined: !0
    }], ["aria-flowto", {
      type: "idlist"
    }], ["aria-grabbed", {
      type: "boolean",
      allowundefined: !0
    }], ["aria-haspopup", {
      type: "token",
      values: [!1, !0, "menu", "listbox", "tree", "grid", "dialog"]
    }], ["aria-hidden", {
      type: "boolean",
      allowundefined: !0
    }], ["aria-invalid", {
      type: "token",
      values: ["grammar", !1, "spelling", !0]
    }], ["aria-keyshortcuts", {
      type: "string"
    }], ["aria-label", {
      type: "string"
    }], ["aria-labelledby", {
      type: "idlist"
    }], ["aria-level", {
      type: "integer"
    }], ["aria-live", {
      type: "token",
      values: ["assertive", "off", "polite"]
    }], ["aria-modal", {
      type: "boolean"
    }], ["aria-multiline", {
      type: "boolean"
    }], ["aria-multiselectable", {
      type: "boolean"
    }], ["aria-orientation", {
      type: "token",
      values: ["vertical", "undefined", "horizontal"]
    }], ["aria-owns", {
      type: "idlist"
    }], ["aria-placeholder", {
      type: "string"
    }], ["aria-posinset", {
      type: "integer"
    }], ["aria-pressed", {
      type: "tristate"
    }], ["aria-readonly", {
      type: "boolean"
    }], ["aria-relevant", {
      type: "tokenlist",
      values: ["additions", "all", "removals", "text"]
    }], ["aria-required", {
      type: "boolean"
    }], ["aria-roledescription", {
      type: "string"
    }], ["aria-rowcount", {
      type: "integer"
    }], ["aria-rowindex", {
      type: "integer"
    }], ["aria-rowspan", {
      type: "integer"
    }], ["aria-selected", {
      type: "boolean",
      allowundefined: !0
    }], ["aria-setsize", {
      type: "integer"
    }], ["aria-sort", {
      type: "token",
      values: ["ascending", "descending", "none", "other"]
    }], ["aria-valuemax", {
      type: "number"
    }], ["aria-valuemin", {
      type: "number"
    }], ["aria-valuenow", {
      type: "number"
    }], ["aria-valuetext", {
      type: "string"
    }]], ariaPropsMap = {
      entries: function() {
        return properties;
      },
      forEach: function(fn3) {
        for (var thisArg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null, _i = 0, _properties = properties; _i < _properties.length; _i++) {
          var _properties$_i = _slicedToArray(_properties[_i], 2), key = _properties$_i[0], values = _properties$_i[1];
          fn3.call(thisArg, values, key, properties);
        }
      },
      get: function(key) {
        var item = properties.filter(function(tuple) {
          return tuple[0] === key;
        })[0];
        return item && item[1];
      },
      has: function(key) {
        return !!ariaPropsMap.get(key);
      },
      keys: function() {
        return properties.map(function(_ref) {
          var _ref2 = _slicedToArray(_ref, 1), key = _ref2[0];
          return key;
        });
      },
      values: function() {
        return properties.map(function(_ref3) {
          var _ref4 = _slicedToArray(_ref3, 2), values2 = _ref4[1];
          return values2;
        });
      }
    }, _default = exports.default = (0, _iterationDecorator.default)(ariaPropsMap, ariaPropsMap.entries());
  }
});

// ../node_modules/aria-query/lib/domMap.js
var require_domMap = __commonJS({
  "../node_modules/aria-query/lib/domMap.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _iterationDecorator = _interopRequireDefault(require_iterationDecorator());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    function _slicedToArray(r2, e2) {
      return _arrayWithHoles(r2) || _iterableToArrayLimit(r2, e2) || _unsupportedIterableToArray(r2, e2) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function _unsupportedIterableToArray(r2, a) {
      if (r2) {
        if (typeof r2 == "string") return _arrayLikeToArray(r2, a);
        var t2 = {}.toString.call(r2).slice(8, -1);
        return t2 === "Object" && r2.constructor && (t2 = r2.constructor.name), t2 === "Map" || t2 === "Set" ? Array.from(r2) : t2 === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t2) ? _arrayLikeToArray(r2, a) : void 0;
      }
    }
    function _arrayLikeToArray(r2, a) {
      (a == null || a > r2.length) && (a = r2.length);
      for (var e2 = 0, n2 = Array(a); e2 < a; e2++) n2[e2] = r2[e2];
      return n2;
    }
    function _iterableToArrayLimit(r2, l2) {
      var t2 = r2 == null ? null : typeof Symbol < "u" && r2[Symbol.iterator] || r2["@@iterator"];
      if (t2 != null) {
        var e2, n2, i2, u3, a = [], f3 = !0, o2 = !1;
        try {
          if (i2 = (t2 = t2.call(r2)).next, l2 === 0) {
            if (Object(t2) !== t2) return;
            f3 = !1;
          } else for (; !(f3 = (e2 = i2.call(t2)).done) && (a.push(e2.value), a.length !== l2); f3 = !0) ;
        } catch (r3) {
          o2 = !0, n2 = r3;
        } finally {
          try {
            if (!f3 && t2.return != null && (u3 = t2.return(), Object(u3) !== u3)) return;
          } finally {
            if (o2) throw n2;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r2) {
      if (Array.isArray(r2)) return r2;
    }
    var dom = [["a", {
      reserved: !1
    }], ["abbr", {
      reserved: !1
    }], ["acronym", {
      reserved: !1
    }], ["address", {
      reserved: !1
    }], ["applet", {
      reserved: !1
    }], ["area", {
      reserved: !1
    }], ["article", {
      reserved: !1
    }], ["aside", {
      reserved: !1
    }], ["audio", {
      reserved: !1
    }], ["b", {
      reserved: !1
    }], ["base", {
      reserved: !0
    }], ["bdi", {
      reserved: !1
    }], ["bdo", {
      reserved: !1
    }], ["big", {
      reserved: !1
    }], ["blink", {
      reserved: !1
    }], ["blockquote", {
      reserved: !1
    }], ["body", {
      reserved: !1
    }], ["br", {
      reserved: !1
    }], ["button", {
      reserved: !1
    }], ["canvas", {
      reserved: !1
    }], ["caption", {
      reserved: !1
    }], ["center", {
      reserved: !1
    }], ["cite", {
      reserved: !1
    }], ["code", {
      reserved: !1
    }], ["col", {
      reserved: !0
    }], ["colgroup", {
      reserved: !0
    }], ["content", {
      reserved: !1
    }], ["data", {
      reserved: !1
    }], ["datalist", {
      reserved: !1
    }], ["dd", {
      reserved: !1
    }], ["del", {
      reserved: !1
    }], ["details", {
      reserved: !1
    }], ["dfn", {
      reserved: !1
    }], ["dialog", {
      reserved: !1
    }], ["dir", {
      reserved: !1
    }], ["div", {
      reserved: !1
    }], ["dl", {
      reserved: !1
    }], ["dt", {
      reserved: !1
    }], ["em", {
      reserved: !1
    }], ["embed", {
      reserved: !1
    }], ["fieldset", {
      reserved: !1
    }], ["figcaption", {
      reserved: !1
    }], ["figure", {
      reserved: !1
    }], ["font", {
      reserved: !1
    }], ["footer", {
      reserved: !1
    }], ["form", {
      reserved: !1
    }], ["frame", {
      reserved: !1
    }], ["frameset", {
      reserved: !1
    }], ["h1", {
      reserved: !1
    }], ["h2", {
      reserved: !1
    }], ["h3", {
      reserved: !1
    }], ["h4", {
      reserved: !1
    }], ["h5", {
      reserved: !1
    }], ["h6", {
      reserved: !1
    }], ["head", {
      reserved: !0
    }], ["header", {
      reserved: !1
    }], ["hgroup", {
      reserved: !1
    }], ["hr", {
      reserved: !1
    }], ["html", {
      reserved: !0
    }], ["i", {
      reserved: !1
    }], ["iframe", {
      reserved: !1
    }], ["img", {
      reserved: !1
    }], ["input", {
      reserved: !1
    }], ["ins", {
      reserved: !1
    }], ["kbd", {
      reserved: !1
    }], ["keygen", {
      reserved: !1
    }], ["label", {
      reserved: !1
    }], ["legend", {
      reserved: !1
    }], ["li", {
      reserved: !1
    }], ["link", {
      reserved: !0
    }], ["main", {
      reserved: !1
    }], ["map", {
      reserved: !1
    }], ["mark", {
      reserved: !1
    }], ["marquee", {
      reserved: !1
    }], ["menu", {
      reserved: !1
    }], ["menuitem", {
      reserved: !1
    }], ["meta", {
      reserved: !0
    }], ["meter", {
      reserved: !1
    }], ["nav", {
      reserved: !1
    }], ["noembed", {
      reserved: !0
    }], ["noscript", {
      reserved: !0
    }], ["object", {
      reserved: !1
    }], ["ol", {
      reserved: !1
    }], ["optgroup", {
      reserved: !1
    }], ["option", {
      reserved: !1
    }], ["output", {
      reserved: !1
    }], ["p", {
      reserved: !1
    }], ["param", {
      reserved: !0
    }], ["picture", {
      reserved: !0
    }], ["pre", {
      reserved: !1
    }], ["progress", {
      reserved: !1
    }], ["q", {
      reserved: !1
    }], ["rp", {
      reserved: !1
    }], ["rt", {
      reserved: !1
    }], ["rtc", {
      reserved: !1
    }], ["ruby", {
      reserved: !1
    }], ["s", {
      reserved: !1
    }], ["samp", {
      reserved: !1
    }], ["script", {
      reserved: !0
    }], ["section", {
      reserved: !1
    }], ["select", {
      reserved: !1
    }], ["small", {
      reserved: !1
    }], ["source", {
      reserved: !0
    }], ["spacer", {
      reserved: !1
    }], ["span", {
      reserved: !1
    }], ["strike", {
      reserved: !1
    }], ["strong", {
      reserved: !1
    }], ["style", {
      reserved: !0
    }], ["sub", {
      reserved: !1
    }], ["summary", {
      reserved: !1
    }], ["sup", {
      reserved: !1
    }], ["table", {
      reserved: !1
    }], ["tbody", {
      reserved: !1
    }], ["td", {
      reserved: !1
    }], ["textarea", {
      reserved: !1
    }], ["tfoot", {
      reserved: !1
    }], ["th", {
      reserved: !1
    }], ["thead", {
      reserved: !1
    }], ["time", {
      reserved: !1
    }], ["title", {
      reserved: !0
    }], ["tr", {
      reserved: !1
    }], ["track", {
      reserved: !0
    }], ["tt", {
      reserved: !1
    }], ["u", {
      reserved: !1
    }], ["ul", {
      reserved: !1
    }], ["var", {
      reserved: !1
    }], ["video", {
      reserved: !1
    }], ["wbr", {
      reserved: !1
    }], ["xmp", {
      reserved: !1
    }]], domMap = {
      entries: function() {
        return dom;
      },
      forEach: function(fn3) {
        for (var thisArg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null, _i = 0, _dom = dom; _i < _dom.length; _i++) {
          var _dom$_i = _slicedToArray(_dom[_i], 2), key = _dom$_i[0], values = _dom$_i[1];
          fn3.call(thisArg, values, key, dom);
        }
      },
      get: function(key) {
        var item = dom.filter(function(tuple) {
          return tuple[0] === key;
        })[0];
        return item && item[1];
      },
      has: function(key) {
        return !!domMap.get(key);
      },
      keys: function() {
        return dom.map(function(_ref) {
          var _ref2 = _slicedToArray(_ref, 1), key = _ref2[0];
          return key;
        });
      },
      values: function() {
        return dom.map(function(_ref3) {
          var _ref4 = _slicedToArray(_ref3, 2), values2 = _ref4[1];
          return values2;
        });
      }
    }, _default = exports.default = (0, _iterationDecorator.default)(domMap, domMap.entries());
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/commandRole.js
var require_commandRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/commandRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var commandRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget"]]
    }, _default = exports.default = commandRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/compositeRole.js
var require_compositeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/compositeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var compositeRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-activedescendant": null,
        "aria-disabled": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget"]]
    }, _default = exports.default = compositeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/inputRole.js
var require_inputRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/inputRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var inputRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null
      },
      relatedConcepts: [{
        concept: {
          name: "input"
        },
        module: "XForms"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget"]]
    }, _default = exports.default = inputRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/landmarkRole.js
var require_landmarkRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/landmarkRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var landmarkRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = landmarkRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/rangeRole.js
var require_rangeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/rangeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var rangeRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-valuemax": null,
        "aria-valuemin": null,
        "aria-valuenow": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = rangeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/roletypeRole.js
var require_roletypeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/roletypeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var roletypeRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: [],
      prohibitedProps: [],
      props: {
        "aria-atomic": null,
        "aria-busy": null,
        "aria-controls": null,
        "aria-current": null,
        "aria-describedby": null,
        "aria-details": null,
        "aria-dropeffect": null,
        "aria-flowto": null,
        "aria-grabbed": null,
        "aria-hidden": null,
        "aria-keyshortcuts": null,
        "aria-label": null,
        "aria-labelledby": null,
        "aria-live": null,
        "aria-owns": null,
        "aria-relevant": null,
        "aria-roledescription": null
      },
      relatedConcepts: [{
        concept: {
          name: "role"
        },
        module: "XHTML"
      }, {
        concept: {
          name: "type"
        },
        module: "Dublin Core"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: []
    }, _default = exports.default = roletypeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/sectionRole.js
var require_sectionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/sectionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var sectionRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: [],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "frontmatter"
        },
        module: "DTB"
      }, {
        concept: {
          name: "level"
        },
        module: "DTB"
      }, {
        concept: {
          name: "level"
        },
        module: "SMIL"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = sectionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/sectionheadRole.js
var require_sectionheadRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/sectionheadRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var sectionheadRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = sectionheadRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/selectRole.js
var require_selectRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/selectRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var selectRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-orientation": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite"], ["roletype", "structure", "section", "group"]]
    }, _default = exports.default = selectRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/structureRole.js
var require_structureRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/structureRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var structureRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: [],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype"]]
    }, _default = exports.default = structureRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/widgetRole.js
var require_widgetRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/widgetRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var widgetRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: [],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype"]]
    }, _default = exports.default = widgetRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/abstract/windowRole.js
var require_windowRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/abstract/windowRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var windowRole = {
      abstract: !0,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-modal": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype"]]
    }, _default = exports.default = windowRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/ariaAbstractRoles.js
var require_ariaAbstractRoles = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/ariaAbstractRoles.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _commandRole = _interopRequireDefault(require_commandRole()), _compositeRole = _interopRequireDefault(require_compositeRole()), _inputRole = _interopRequireDefault(require_inputRole()), _landmarkRole = _interopRequireDefault(require_landmarkRole()), _rangeRole = _interopRequireDefault(require_rangeRole()), _roletypeRole = _interopRequireDefault(require_roletypeRole()), _sectionRole = _interopRequireDefault(require_sectionRole()), _sectionheadRole = _interopRequireDefault(require_sectionheadRole()), _selectRole = _interopRequireDefault(require_selectRole()), _structureRole = _interopRequireDefault(require_structureRole()), _widgetRole = _interopRequireDefault(require_widgetRole()), _windowRole = _interopRequireDefault(require_windowRole());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    var ariaAbstractRoles = [["command", _commandRole.default], ["composite", _compositeRole.default], ["input", _inputRole.default], ["landmark", _landmarkRole.default], ["range", _rangeRole.default], ["roletype", _roletypeRole.default], ["section", _sectionRole.default], ["sectionhead", _sectionheadRole.default], ["select", _selectRole.default], ["structure", _structureRole.default], ["widget", _widgetRole.default], ["window", _windowRole.default]], _default = exports.default = ariaAbstractRoles;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/alertRole.js
var require_alertRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/alertRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var alertRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-atomic": "true",
        "aria-live": "assertive"
      },
      relatedConcepts: [{
        concept: {
          name: "alert"
        },
        module: "XForms"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = alertRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/alertdialogRole.js
var require_alertdialogRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/alertdialogRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var alertdialogRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "alert"
        },
        module: "XForms"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "alert"], ["roletype", "window", "dialog"]]
    }, _default = exports.default = alertdialogRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/applicationRole.js
var require_applicationRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/applicationRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var applicationRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-activedescendant": null,
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "Device Independence Delivery Unit"
        }
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = applicationRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/articleRole.js
var require_articleRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/articleRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var articleRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-posinset": null,
        "aria-setsize": null
      },
      relatedConcepts: [{
        concept: {
          name: "article"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "document"]]
    }, _default = exports.default = articleRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/bannerRole.js
var require_bannerRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/bannerRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var bannerRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          constraints: ["scoped to the body element"],
          name: "header"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = bannerRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/blockquoteRole.js
var require_blockquoteRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/blockquoteRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var blockquoteRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "blockquote"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = blockquoteRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/buttonRole.js
var require_buttonRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/buttonRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var buttonRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-pressed": null
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "type",
            value: "button"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "type",
            value: "image"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "type",
            value: "reset"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "type",
            value: "submit"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          name: "button"
        },
        module: "HTML"
      }, {
        concept: {
          name: "trigger"
        },
        module: "XForms"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command"]]
    }, _default = exports.default = buttonRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/captionRole.js
var require_captionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/captionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var captionRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "caption"
        },
        module: "HTML"
      }],
      requireContextRole: ["figure", "grid", "table"],
      requiredContextRole: ["figure", "grid", "table"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = captionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/cellRole.js
var require_cellRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/cellRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var cellRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-colindex": null,
        "aria-colspan": null,
        "aria-rowindex": null,
        "aria-rowspan": null
      },
      relatedConcepts: [{
        concept: {
          constraints: ["ancestor table element has table role"],
          name: "td"
        },
        module: "HTML"
      }],
      requireContextRole: ["row"],
      requiredContextRole: ["row"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = cellRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/checkboxRole.js
var require_checkboxRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/checkboxRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var checkboxRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-checked": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-invalid": null,
        "aria-readonly": null,
        "aria-required": null
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "type",
            value: "checkbox"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          name: "option"
        },
        module: "ARIA"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-checked": null
      },
      superClass: [["roletype", "widget", "input"]]
    }, _default = exports.default = checkboxRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/codeRole.js
var require_codeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/codeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var codeRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "code"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = codeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/columnheaderRole.js
var require_columnheaderRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/columnheaderRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var columnheaderRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-sort": null
      },
      relatedConcepts: [{
        concept: {
          name: "th"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "scope",
            value: "col"
          }],
          name: "th"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "scope",
            value: "colgroup"
          }],
          name: "th"
        },
        module: "HTML"
      }],
      requireContextRole: ["row"],
      requiredContextRole: ["row"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "cell"], ["roletype", "structure", "section", "cell", "gridcell"], ["roletype", "widget", "gridcell"], ["roletype", "structure", "sectionhead"]]
    }, _default = exports.default = columnheaderRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/comboboxRole.js
var require_comboboxRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/comboboxRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var comboboxRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-activedescendant": null,
        "aria-autocomplete": null,
        "aria-errormessage": null,
        "aria-invalid": null,
        "aria-readonly": null,
        "aria-required": null,
        "aria-expanded": "false",
        "aria-haspopup": "listbox"
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "list"
          }, {
            name: "type",
            value: "email"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "list"
          }, {
            name: "type",
            value: "search"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "list"
          }, {
            name: "type",
            value: "tel"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "list"
          }, {
            name: "type",
            value: "text"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "list"
          }, {
            name: "type",
            value: "url"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "list"
          }, {
            name: "type",
            value: "url"
          }],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "multiple"
          }, {
            constraints: ["undefined"],
            name: "size"
          }],
          constraints: ["the multiple attribute is not set and the size attribute does not have a value greater than 1"],
          name: "select"
        },
        module: "HTML"
      }, {
        concept: {
          name: "select"
        },
        module: "XForms"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-controls": null,
        "aria-expanded": "false"
      },
      superClass: [["roletype", "widget", "input"]]
    }, _default = exports.default = comboboxRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/complementaryRole.js
var require_complementaryRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/complementaryRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var complementaryRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          constraints: ["scoped to the body element", "scoped to the main element"],
          name: "aside"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "aria-label"
          }],
          constraints: ["scoped to a sectioning content element", "scoped to a sectioning root element other than body"],
          name: "aside"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "aria-labelledby"
          }],
          constraints: ["scoped to a sectioning content element", "scoped to a sectioning root element other than body"],
          name: "aside"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = complementaryRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/contentinfoRole.js
var require_contentinfoRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/contentinfoRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var contentinfoRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          constraints: ["scoped to the body element"],
          name: "footer"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = contentinfoRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/definitionRole.js
var require_definitionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/definitionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var definitionRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "dd"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = definitionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/deletionRole.js
var require_deletionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/deletionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var deletionRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "del"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = deletionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/dialogRole.js
var require_dialogRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/dialogRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var dialogRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "dialog"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "window"]]
    }, _default = exports.default = dialogRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/directoryRole.js
var require_directoryRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/directoryRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var directoryRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        module: "DAISY Guide"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "list"]]
    }, _default = exports.default = directoryRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/documentRole.js
var require_documentRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/documentRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var documentRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "Device Independence Delivery Unit"
        }
      }, {
        concept: {
          name: "html"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = documentRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/emphasisRole.js
var require_emphasisRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/emphasisRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var emphasisRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "em"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = emphasisRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/feedRole.js
var require_feedRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/feedRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var feedRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["article"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "list"]]
    }, _default = exports.default = feedRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/figureRole.js
var require_figureRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/figureRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var figureRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "figure"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = figureRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/formRole.js
var require_formRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/formRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var formRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "aria-label"
          }],
          name: "form"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "aria-labelledby"
          }],
          name: "form"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "name"
          }],
          name: "form"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = formRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/genericRole.js
var require_genericRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/genericRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var genericRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "a"
        },
        module: "HTML"
      }, {
        concept: {
          name: "area"
        },
        module: "HTML"
      }, {
        concept: {
          name: "aside"
        },
        module: "HTML"
      }, {
        concept: {
          name: "b"
        },
        module: "HTML"
      }, {
        concept: {
          name: "bdo"
        },
        module: "HTML"
      }, {
        concept: {
          name: "body"
        },
        module: "HTML"
      }, {
        concept: {
          name: "data"
        },
        module: "HTML"
      }, {
        concept: {
          name: "div"
        },
        module: "HTML"
      }, {
        concept: {
          constraints: ["scoped to the main element", "scoped to a sectioning content element", "scoped to a sectioning root element other than body"],
          name: "footer"
        },
        module: "HTML"
      }, {
        concept: {
          constraints: ["scoped to the main element", "scoped to a sectioning content element", "scoped to a sectioning root element other than body"],
          name: "header"
        },
        module: "HTML"
      }, {
        concept: {
          name: "hgroup"
        },
        module: "HTML"
      }, {
        concept: {
          name: "i"
        },
        module: "HTML"
      }, {
        concept: {
          name: "pre"
        },
        module: "HTML"
      }, {
        concept: {
          name: "q"
        },
        module: "HTML"
      }, {
        concept: {
          name: "samp"
        },
        module: "HTML"
      }, {
        concept: {
          name: "section"
        },
        module: "HTML"
      }, {
        concept: {
          name: "small"
        },
        module: "HTML"
      }, {
        concept: {
          name: "span"
        },
        module: "HTML"
      }, {
        concept: {
          name: "u"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = genericRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/gridRole.js
var require_gridRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/gridRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var gridRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-multiselectable": null,
        "aria-readonly": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["row"], ["row", "rowgroup"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite"], ["roletype", "structure", "section", "table"]]
    }, _default = exports.default = gridRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/gridcellRole.js
var require_gridcellRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/gridcellRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var gridcellRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null,
        "aria-readonly": null,
        "aria-required": null,
        "aria-selected": null
      },
      relatedConcepts: [{
        concept: {
          constraints: ["ancestor table element has grid role", "ancestor table element has treegrid role"],
          name: "td"
        },
        module: "HTML"
      }],
      requireContextRole: ["row"],
      requiredContextRole: ["row"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "cell"], ["roletype", "widget"]]
    }, _default = exports.default = gridcellRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/groupRole.js
var require_groupRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/groupRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var groupRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-activedescendant": null,
        "aria-disabled": null
      },
      relatedConcepts: [{
        concept: {
          name: "details"
        },
        module: "HTML"
      }, {
        concept: {
          name: "fieldset"
        },
        module: "HTML"
      }, {
        concept: {
          name: "optgroup"
        },
        module: "HTML"
      }, {
        concept: {
          name: "address"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = groupRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/headingRole.js
var require_headingRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/headingRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var headingRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-level": "2"
      },
      relatedConcepts: [{
        concept: {
          name: "h1"
        },
        module: "HTML"
      }, {
        concept: {
          name: "h2"
        },
        module: "HTML"
      }, {
        concept: {
          name: "h3"
        },
        module: "HTML"
      }, {
        concept: {
          name: "h4"
        },
        module: "HTML"
      }, {
        concept: {
          name: "h5"
        },
        module: "HTML"
      }, {
        concept: {
          name: "h6"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-level": "2"
      },
      superClass: [["roletype", "structure", "sectionhead"]]
    }, _default = exports.default = headingRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/imgRole.js
var require_imgRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/imgRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var imgRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "alt"
          }],
          name: "img"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "alt"
          }],
          name: "img"
        },
        module: "HTML"
      }, {
        concept: {
          name: "imggroup"
        },
        module: "DTB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = imgRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/insertionRole.js
var require_insertionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/insertionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var insertionRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "ins"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = insertionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/linkRole.js
var require_linkRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/linkRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var linkRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-expanded": null,
        "aria-haspopup": null
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "href"
          }],
          name: "a"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "href"
          }],
          name: "area"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command"]]
    }, _default = exports.default = linkRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/listRole.js
var require_listRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/listRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var listRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "menu"
        },
        module: "HTML"
      }, {
        concept: {
          name: "ol"
        },
        module: "HTML"
      }, {
        concept: {
          name: "ul"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["listitem"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = listRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/listboxRole.js
var require_listboxRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/listboxRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var listboxRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-invalid": null,
        "aria-multiselectable": null,
        "aria-readonly": null,
        "aria-required": null,
        "aria-orientation": "vertical"
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: [">1"],
            name: "size"
          }],
          constraints: ["the size attribute value is greater than 1"],
          name: "select"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "multiple"
          }],
          name: "select"
        },
        module: "HTML"
      }, {
        concept: {
          name: "datalist"
        },
        module: "HTML"
      }, {
        concept: {
          name: "list"
        },
        module: "ARIA"
      }, {
        concept: {
          name: "select"
        },
        module: "XForms"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["option", "group"], ["option"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite", "select"], ["roletype", "structure", "section", "group", "select"]]
    }, _default = exports.default = listboxRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/listitemRole.js
var require_listitemRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/listitemRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var listitemRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-level": null,
        "aria-posinset": null,
        "aria-setsize": null
      },
      relatedConcepts: [{
        concept: {
          constraints: ["direct descendant of ol", "direct descendant of ul", "direct descendant of menu"],
          name: "li"
        },
        module: "HTML"
      }, {
        concept: {
          name: "item"
        },
        module: "XForms"
      }],
      requireContextRole: ["directory", "list"],
      requiredContextRole: ["directory", "list"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = listitemRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/logRole.js
var require_logRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/logRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var logRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-live": "polite"
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = logRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/mainRole.js
var require_mainRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/mainRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var mainRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "main"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = mainRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/markRole.js
var require_markRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/markRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var markRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: [],
      props: {
        "aria-braillelabel": null,
        "aria-brailleroledescription": null,
        "aria-description": null
      },
      relatedConcepts: [{
        concept: {
          name: "mark"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = markRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/marqueeRole.js
var require_marqueeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/marqueeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var marqueeRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = marqueeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/mathRole.js
var require_mathRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/mathRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var mathRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "math"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = mathRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/menuRole.js
var require_menuRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/menuRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var menuRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-orientation": "vertical"
      },
      relatedConcepts: [{
        concept: {
          name: "MENU"
        },
        module: "JAPI"
      }, {
        concept: {
          name: "list"
        },
        module: "ARIA"
      }, {
        concept: {
          name: "select"
        },
        module: "XForms"
      }, {
        concept: {
          name: "sidebar"
        },
        module: "DTB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["menuitem", "group"], ["menuitemradio", "group"], ["menuitemcheckbox", "group"], ["menuitem"], ["menuitemcheckbox"], ["menuitemradio"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite", "select"], ["roletype", "structure", "section", "group", "select"]]
    }, _default = exports.default = menuRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/menubarRole.js
var require_menubarRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/menubarRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var menubarRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-orientation": "horizontal"
      },
      relatedConcepts: [{
        concept: {
          name: "toolbar"
        },
        module: "ARIA"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["menuitem", "group"], ["menuitemradio", "group"], ["menuitemcheckbox", "group"], ["menuitem"], ["menuitemcheckbox"], ["menuitemradio"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite", "select", "menu"], ["roletype", "structure", "section", "group", "select", "menu"]]
    }, _default = exports.default = menubarRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/menuitemRole.js
var require_menuitemRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/menuitemRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var menuitemRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-posinset": null,
        "aria-setsize": null
      },
      relatedConcepts: [{
        concept: {
          name: "MENU_ITEM"
        },
        module: "JAPI"
      }, {
        concept: {
          name: "listitem"
        },
        module: "ARIA"
      }, {
        concept: {
          name: "option"
        },
        module: "ARIA"
      }],
      requireContextRole: ["group", "menu", "menubar"],
      requiredContextRole: ["group", "menu", "menubar"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command"]]
    }, _default = exports.default = menuitemRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/menuitemcheckboxRole.js
var require_menuitemcheckboxRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/menuitemcheckboxRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var menuitemcheckboxRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "menuitem"
        },
        module: "ARIA"
      }],
      requireContextRole: ["group", "menu", "menubar"],
      requiredContextRole: ["group", "menu", "menubar"],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-checked": null
      },
      superClass: [["roletype", "widget", "input", "checkbox"], ["roletype", "widget", "command", "menuitem"]]
    }, _default = exports.default = menuitemcheckboxRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/menuitemradioRole.js
var require_menuitemradioRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/menuitemradioRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var menuitemradioRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "menuitem"
        },
        module: "ARIA"
      }],
      requireContextRole: ["group", "menu", "menubar"],
      requiredContextRole: ["group", "menu", "menubar"],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-checked": null
      },
      superClass: [["roletype", "widget", "input", "checkbox", "menuitemcheckbox"], ["roletype", "widget", "command", "menuitem", "menuitemcheckbox"], ["roletype", "widget", "input", "radio"]]
    }, _default = exports.default = menuitemradioRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/meterRole.js
var require_meterRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/meterRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var meterRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-valuetext": null,
        "aria-valuemax": "100",
        "aria-valuemin": "0"
      },
      relatedConcepts: [{
        concept: {
          name: "meter"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-valuenow": null
      },
      superClass: [["roletype", "structure", "range"]]
    }, _default = exports.default = meterRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/navigationRole.js
var require_navigationRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/navigationRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var navigationRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "nav"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = navigationRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/noneRole.js
var require_noneRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/noneRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var noneRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: [],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: []
    }, _default = exports.default = noneRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/noteRole.js
var require_noteRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/noteRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var noteRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = noteRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/optionRole.js
var require_optionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/optionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var optionRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-checked": null,
        "aria-posinset": null,
        "aria-setsize": null,
        "aria-selected": "false"
      },
      relatedConcepts: [{
        concept: {
          name: "item"
        },
        module: "XForms"
      }, {
        concept: {
          name: "listitem"
        },
        module: "ARIA"
      }, {
        concept: {
          name: "option"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-selected": "false"
      },
      superClass: [["roletype", "widget", "input"]]
    }, _default = exports.default = optionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/paragraphRole.js
var require_paragraphRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/paragraphRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var paragraphRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "p"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = paragraphRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/presentationRole.js
var require_presentationRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/presentationRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var presentationRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "alt",
            value: ""
          }],
          name: "img"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = presentationRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/progressbarRole.js
var require_progressbarRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/progressbarRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var progressbarRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-valuetext": null
      },
      relatedConcepts: [{
        concept: {
          name: "progress"
        },
        module: "HTML"
      }, {
        concept: {
          name: "status"
        },
        module: "ARIA"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "range"], ["roletype", "widget"]]
    }, _default = exports.default = progressbarRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/radioRole.js
var require_radioRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/radioRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var radioRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-checked": null,
        "aria-posinset": null,
        "aria-setsize": null
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "type",
            value: "radio"
          }],
          name: "input"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-checked": null
      },
      superClass: [["roletype", "widget", "input"]]
    }, _default = exports.default = radioRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/radiogroupRole.js
var require_radiogroupRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/radiogroupRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var radiogroupRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null,
        "aria-readonly": null,
        "aria-required": null
      },
      relatedConcepts: [{
        concept: {
          name: "list"
        },
        module: "ARIA"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["radio"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite", "select"], ["roletype", "structure", "section", "group", "select"]]
    }, _default = exports.default = radiogroupRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/regionRole.js
var require_regionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/regionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var regionRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "aria-label"
          }],
          name: "section"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["set"],
            name: "aria-labelledby"
          }],
          name: "section"
        },
        module: "HTML"
      }, {
        concept: {
          name: "Device Independence Glossart perceivable unit"
        }
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = regionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/rowRole.js
var require_rowRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/rowRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var rowRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-colindex": null,
        "aria-expanded": null,
        "aria-level": null,
        "aria-posinset": null,
        "aria-rowindex": null,
        "aria-selected": null,
        "aria-setsize": null
      },
      relatedConcepts: [{
        concept: {
          name: "tr"
        },
        module: "HTML"
      }],
      requireContextRole: ["grid", "rowgroup", "table", "treegrid"],
      requiredContextRole: ["grid", "rowgroup", "table", "treegrid"],
      requiredOwnedElements: [["cell"], ["columnheader"], ["gridcell"], ["rowheader"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "group"], ["roletype", "widget"]]
    }, _default = exports.default = rowRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/rowgroupRole.js
var require_rowgroupRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/rowgroupRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var rowgroupRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "tbody"
        },
        module: "HTML"
      }, {
        concept: {
          name: "tfoot"
        },
        module: "HTML"
      }, {
        concept: {
          name: "thead"
        },
        module: "HTML"
      }],
      requireContextRole: ["grid", "table", "treegrid"],
      requiredContextRole: ["grid", "table", "treegrid"],
      requiredOwnedElements: [["row"]],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = rowgroupRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/rowheaderRole.js
var require_rowheaderRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/rowheaderRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var rowheaderRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-sort": null
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "scope",
            value: "row"
          }],
          name: "th"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            name: "scope",
            value: "rowgroup"
          }],
          name: "th"
        },
        module: "HTML"
      }],
      requireContextRole: ["row", "rowgroup"],
      requiredContextRole: ["row", "rowgroup"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "cell"], ["roletype", "structure", "section", "cell", "gridcell"], ["roletype", "widget", "gridcell"], ["roletype", "structure", "sectionhead"]]
    }, _default = exports.default = rowheaderRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/scrollbarRole.js
var require_scrollbarRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/scrollbarRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var scrollbarRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-valuetext": null,
        "aria-orientation": "vertical",
        "aria-valuemax": "100",
        "aria-valuemin": "0"
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-controls": null,
        "aria-valuenow": null
      },
      superClass: [["roletype", "structure", "range"], ["roletype", "widget"]]
    }, _default = exports.default = scrollbarRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/searchRole.js
var require_searchRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/searchRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var searchRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = searchRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/searchboxRole.js
var require_searchboxRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/searchboxRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var searchboxRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "list"
          }, {
            name: "type",
            value: "search"
          }],
          constraints: ["the list attribute is not set"],
          name: "input"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "input", "textbox"]]
    }, _default = exports.default = searchboxRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/separatorRole.js
var require_separatorRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/separatorRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var separatorRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-orientation": "horizontal",
        "aria-valuemax": "100",
        "aria-valuemin": "0",
        "aria-valuenow": null,
        "aria-valuetext": null
      },
      relatedConcepts: [{
        concept: {
          name: "hr"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure"]]
    }, _default = exports.default = separatorRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/sliderRole.js
var require_sliderRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/sliderRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var sliderRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-haspopup": null,
        "aria-invalid": null,
        "aria-readonly": null,
        "aria-valuetext": null,
        "aria-orientation": "horizontal",
        "aria-valuemax": "100",
        "aria-valuemin": "0"
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "type",
            value: "range"
          }],
          name: "input"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-valuenow": null
      },
      superClass: [["roletype", "widget", "input"], ["roletype", "structure", "range"]]
    }, _default = exports.default = sliderRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/spinbuttonRole.js
var require_spinbuttonRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/spinbuttonRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var spinbuttonRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null,
        "aria-readonly": null,
        "aria-required": null,
        "aria-valuetext": null,
        "aria-valuenow": "0"
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            name: "type",
            value: "number"
          }],
          name: "input"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite"], ["roletype", "widget", "input"], ["roletype", "structure", "range"]]
    }, _default = exports.default = spinbuttonRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/statusRole.js
var require_statusRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/statusRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var statusRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-atomic": "true",
        "aria-live": "polite"
      },
      relatedConcepts: [{
        concept: {
          name: "output"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = statusRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/strongRole.js
var require_strongRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/strongRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var strongRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "strong"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = strongRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/subscriptRole.js
var require_subscriptRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/subscriptRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var subscriptRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "sub"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = subscriptRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/superscriptRole.js
var require_superscriptRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/superscriptRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var superscriptRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: ["aria-label", "aria-labelledby"],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "sup"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = superscriptRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/switchRole.js
var require_switchRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/switchRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var switchRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "button"
        },
        module: "ARIA"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-checked": null
      },
      superClass: [["roletype", "widget", "input", "checkbox"]]
    }, _default = exports.default = switchRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/tabRole.js
var require_tabRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/tabRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var tabRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-posinset": null,
        "aria-setsize": null,
        "aria-selected": "false"
      },
      relatedConcepts: [],
      requireContextRole: ["tablist"],
      requiredContextRole: ["tablist"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "sectionhead"], ["roletype", "widget"]]
    }, _default = exports.default = tabRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/tableRole.js
var require_tableRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/tableRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var tableRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-colcount": null,
        "aria-rowcount": null
      },
      relatedConcepts: [{
        concept: {
          name: "table"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["row"], ["row", "rowgroup"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = tableRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/tablistRole.js
var require_tablistRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/tablistRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var tablistRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-level": null,
        "aria-multiselectable": null,
        "aria-orientation": "horizontal"
      },
      relatedConcepts: [{
        module: "DAISY",
        concept: {
          name: "guide"
        }
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["tab"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite"]]
    }, _default = exports.default = tablistRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/tabpanelRole.js
var require_tabpanelRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/tabpanelRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var tabpanelRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = tabpanelRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/termRole.js
var require_termRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/termRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var termRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "dfn"
        },
        module: "HTML"
      }, {
        concept: {
          name: "dt"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = termRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/textboxRole.js
var require_textboxRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/textboxRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var textboxRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-activedescendant": null,
        "aria-autocomplete": null,
        "aria-errormessage": null,
        "aria-haspopup": null,
        "aria-invalid": null,
        "aria-multiline": null,
        "aria-placeholder": null,
        "aria-readonly": null,
        "aria-required": null
      },
      relatedConcepts: [{
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "type"
          }, {
            constraints: ["undefined"],
            name: "list"
          }],
          constraints: ["the list attribute is not set"],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "list"
          }, {
            name: "type",
            value: "email"
          }],
          constraints: ["the list attribute is not set"],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "list"
          }, {
            name: "type",
            value: "tel"
          }],
          constraints: ["the list attribute is not set"],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "list"
          }, {
            name: "type",
            value: "text"
          }],
          constraints: ["the list attribute is not set"],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          attributes: [{
            constraints: ["undefined"],
            name: "list"
          }, {
            name: "type",
            value: "url"
          }],
          constraints: ["the list attribute is not set"],
          name: "input"
        },
        module: "HTML"
      }, {
        concept: {
          name: "input"
        },
        module: "XForms"
      }, {
        concept: {
          name: "textarea"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "input"]]
    }, _default = exports.default = textboxRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/timeRole.js
var require_timeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/timeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var timeRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "time"
        },
        module: "HTML"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = timeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/timerRole.js
var require_timerRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/timerRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var timerRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "status"]]
    }, _default = exports.default = timerRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/toolbarRole.js
var require_toolbarRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/toolbarRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var toolbarRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-orientation": "horizontal"
      },
      relatedConcepts: [{
        concept: {
          name: "menubar"
        },
        module: "ARIA"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "group"]]
    }, _default = exports.default = toolbarRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/tooltipRole.js
var require_tooltipRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/tooltipRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var tooltipRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = tooltipRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/treeRole.js
var require_treeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/treeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var treeRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null,
        "aria-multiselectable": null,
        "aria-required": null,
        "aria-orientation": "vertical"
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["treeitem", "group"], ["treeitem"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite", "select"], ["roletype", "structure", "section", "group", "select"]]
    }, _default = exports.default = treeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/treegridRole.js
var require_treegridRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/treegridRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var treegridRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["row"], ["row", "rowgroup"]],
      requiredProps: {},
      superClass: [["roletype", "widget", "composite", "grid"], ["roletype", "structure", "section", "table", "grid"], ["roletype", "widget", "composite", "select", "tree"], ["roletype", "structure", "section", "group", "select", "tree"]]
    }, _default = exports.default = treegridRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/literal/treeitemRole.js
var require_treeitemRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/literal/treeitemRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var treeitemRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-expanded": null,
        "aria-haspopup": null
      },
      relatedConcepts: [],
      requireContextRole: ["group", "tree"],
      requiredContextRole: ["group", "tree"],
      requiredOwnedElements: [],
      requiredProps: {
        "aria-selected": null
      },
      superClass: [["roletype", "structure", "section", "listitem"], ["roletype", "widget", "input", "option"]]
    }, _default = exports.default = treeitemRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/ariaLiteralRoles.js
var require_ariaLiteralRoles = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/ariaLiteralRoles.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _alertRole = _interopRequireDefault(require_alertRole()), _alertdialogRole = _interopRequireDefault(require_alertdialogRole()), _applicationRole = _interopRequireDefault(require_applicationRole()), _articleRole = _interopRequireDefault(require_articleRole()), _bannerRole = _interopRequireDefault(require_bannerRole()), _blockquoteRole = _interopRequireDefault(require_blockquoteRole()), _buttonRole = _interopRequireDefault(require_buttonRole()), _captionRole = _interopRequireDefault(require_captionRole()), _cellRole = _interopRequireDefault(require_cellRole()), _checkboxRole = _interopRequireDefault(require_checkboxRole()), _codeRole = _interopRequireDefault(require_codeRole()), _columnheaderRole = _interopRequireDefault(require_columnheaderRole()), _comboboxRole = _interopRequireDefault(require_comboboxRole()), _complementaryRole = _interopRequireDefault(require_complementaryRole()), _contentinfoRole = _interopRequireDefault(require_contentinfoRole()), _definitionRole = _interopRequireDefault(require_definitionRole()), _deletionRole = _interopRequireDefault(require_deletionRole()), _dialogRole = _interopRequireDefault(require_dialogRole()), _directoryRole = _interopRequireDefault(require_directoryRole()), _documentRole = _interopRequireDefault(require_documentRole()), _emphasisRole = _interopRequireDefault(require_emphasisRole()), _feedRole = _interopRequireDefault(require_feedRole()), _figureRole = _interopRequireDefault(require_figureRole()), _formRole = _interopRequireDefault(require_formRole()), _genericRole = _interopRequireDefault(require_genericRole()), _gridRole = _interopRequireDefault(require_gridRole()), _gridcellRole = _interopRequireDefault(require_gridcellRole()), _groupRole = _interopRequireDefault(require_groupRole()), _headingRole = _interopRequireDefault(require_headingRole()), _imgRole = _interopRequireDefault(require_imgRole()), _insertionRole = _interopRequireDefault(require_insertionRole()), _linkRole = _interopRequireDefault(require_linkRole()), _listRole = _interopRequireDefault(require_listRole()), _listboxRole = _interopRequireDefault(require_listboxRole()), _listitemRole = _interopRequireDefault(require_listitemRole()), _logRole = _interopRequireDefault(require_logRole()), _mainRole = _interopRequireDefault(require_mainRole()), _markRole = _interopRequireDefault(require_markRole()), _marqueeRole = _interopRequireDefault(require_marqueeRole()), _mathRole = _interopRequireDefault(require_mathRole()), _menuRole = _interopRequireDefault(require_menuRole()), _menubarRole = _interopRequireDefault(require_menubarRole()), _menuitemRole = _interopRequireDefault(require_menuitemRole()), _menuitemcheckboxRole = _interopRequireDefault(require_menuitemcheckboxRole()), _menuitemradioRole = _interopRequireDefault(require_menuitemradioRole()), _meterRole = _interopRequireDefault(require_meterRole()), _navigationRole = _interopRequireDefault(require_navigationRole()), _noneRole = _interopRequireDefault(require_noneRole()), _noteRole = _interopRequireDefault(require_noteRole()), _optionRole = _interopRequireDefault(require_optionRole()), _paragraphRole = _interopRequireDefault(require_paragraphRole()), _presentationRole = _interopRequireDefault(require_presentationRole()), _progressbarRole = _interopRequireDefault(require_progressbarRole()), _radioRole = _interopRequireDefault(require_radioRole()), _radiogroupRole = _interopRequireDefault(require_radiogroupRole()), _regionRole = _interopRequireDefault(require_regionRole()), _rowRole = _interopRequireDefault(require_rowRole()), _rowgroupRole = _interopRequireDefault(require_rowgroupRole()), _rowheaderRole = _interopRequireDefault(require_rowheaderRole()), _scrollbarRole = _interopRequireDefault(require_scrollbarRole()), _searchRole = _interopRequireDefault(require_searchRole()), _searchboxRole = _interopRequireDefault(require_searchboxRole()), _separatorRole = _interopRequireDefault(require_separatorRole()), _sliderRole = _interopRequireDefault(require_sliderRole()), _spinbuttonRole = _interopRequireDefault(require_spinbuttonRole()), _statusRole = _interopRequireDefault(require_statusRole()), _strongRole = _interopRequireDefault(require_strongRole()), _subscriptRole = _interopRequireDefault(require_subscriptRole()), _superscriptRole = _interopRequireDefault(require_superscriptRole()), _switchRole = _interopRequireDefault(require_switchRole()), _tabRole = _interopRequireDefault(require_tabRole()), _tableRole = _interopRequireDefault(require_tableRole()), _tablistRole = _interopRequireDefault(require_tablistRole()), _tabpanelRole = _interopRequireDefault(require_tabpanelRole()), _termRole = _interopRequireDefault(require_termRole()), _textboxRole = _interopRequireDefault(require_textboxRole()), _timeRole = _interopRequireDefault(require_timeRole()), _timerRole = _interopRequireDefault(require_timerRole()), _toolbarRole = _interopRequireDefault(require_toolbarRole()), _tooltipRole = _interopRequireDefault(require_tooltipRole()), _treeRole = _interopRequireDefault(require_treeRole()), _treegridRole = _interopRequireDefault(require_treegridRole()), _treeitemRole = _interopRequireDefault(require_treeitemRole());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    var ariaLiteralRoles = [["alert", _alertRole.default], ["alertdialog", _alertdialogRole.default], ["application", _applicationRole.default], ["article", _articleRole.default], ["banner", _bannerRole.default], ["blockquote", _blockquoteRole.default], ["button", _buttonRole.default], ["caption", _captionRole.default], ["cell", _cellRole.default], ["checkbox", _checkboxRole.default], ["code", _codeRole.default], ["columnheader", _columnheaderRole.default], ["combobox", _comboboxRole.default], ["complementary", _complementaryRole.default], ["contentinfo", _contentinfoRole.default], ["definition", _definitionRole.default], ["deletion", _deletionRole.default], ["dialog", _dialogRole.default], ["directory", _directoryRole.default], ["document", _documentRole.default], ["emphasis", _emphasisRole.default], ["feed", _feedRole.default], ["figure", _figureRole.default], ["form", _formRole.default], ["generic", _genericRole.default], ["grid", _gridRole.default], ["gridcell", _gridcellRole.default], ["group", _groupRole.default], ["heading", _headingRole.default], ["img", _imgRole.default], ["insertion", _insertionRole.default], ["link", _linkRole.default], ["list", _listRole.default], ["listbox", _listboxRole.default], ["listitem", _listitemRole.default], ["log", _logRole.default], ["main", _mainRole.default], ["mark", _markRole.default], ["marquee", _marqueeRole.default], ["math", _mathRole.default], ["menu", _menuRole.default], ["menubar", _menubarRole.default], ["menuitem", _menuitemRole.default], ["menuitemcheckbox", _menuitemcheckboxRole.default], ["menuitemradio", _menuitemradioRole.default], ["meter", _meterRole.default], ["navigation", _navigationRole.default], ["none", _noneRole.default], ["note", _noteRole.default], ["option", _optionRole.default], ["paragraph", _paragraphRole.default], ["presentation", _presentationRole.default], ["progressbar", _progressbarRole.default], ["radio", _radioRole.default], ["radiogroup", _radiogroupRole.default], ["region", _regionRole.default], ["row", _rowRole.default], ["rowgroup", _rowgroupRole.default], ["rowheader", _rowheaderRole.default], ["scrollbar", _scrollbarRole.default], ["search", _searchRole.default], ["searchbox", _searchboxRole.default], ["separator", _separatorRole.default], ["slider", _sliderRole.default], ["spinbutton", _spinbuttonRole.default], ["status", _statusRole.default], ["strong", _strongRole.default], ["subscript", _subscriptRole.default], ["superscript", _superscriptRole.default], ["switch", _switchRole.default], ["tab", _tabRole.default], ["table", _tableRole.default], ["tablist", _tablistRole.default], ["tabpanel", _tabpanelRole.default], ["term", _termRole.default], ["textbox", _textboxRole.default], ["time", _timeRole.default], ["timer", _timerRole.default], ["toolbar", _toolbarRole.default], ["tooltip", _tooltipRole.default], ["tree", _treeRole.default], ["treegrid", _treegridRole.default], ["treeitem", _treeitemRole.default]], _default = exports.default = ariaLiteralRoles;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docAbstractRole.js
var require_docAbstractRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docAbstractRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docAbstractRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "abstract [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docAbstractRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docAcknowledgmentsRole.js
var require_docAcknowledgmentsRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docAcknowledgmentsRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docAcknowledgmentsRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "acknowledgments [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docAcknowledgmentsRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docAfterwordRole.js
var require_docAfterwordRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docAfterwordRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docAfterwordRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "afterword [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docAfterwordRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docAppendixRole.js
var require_docAppendixRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docAppendixRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docAppendixRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "appendix [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docAppendixRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docBacklinkRole.js
var require_docBacklinkRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docBacklinkRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docBacklinkRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "referrer [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command", "link"]]
    }, _default = exports.default = docBacklinkRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docBiblioentryRole.js
var require_docBiblioentryRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docBiblioentryRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docBiblioentryRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "EPUB biblioentry [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: ["doc-bibliography"],
      requiredContextRole: ["doc-bibliography"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "listitem"]]
    }, _default = exports.default = docBiblioentryRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docBibliographyRole.js
var require_docBibliographyRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docBibliographyRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docBibliographyRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "bibliography [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["doc-biblioentry"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docBibliographyRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docBibliorefRole.js
var require_docBibliorefRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docBibliorefRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docBibliorefRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "biblioref [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command", "link"]]
    }, _default = exports.default = docBibliorefRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docChapterRole.js
var require_docChapterRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docChapterRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docChapterRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "chapter [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docChapterRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docColophonRole.js
var require_docColophonRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docColophonRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docColophonRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "colophon [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docColophonRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docConclusionRole.js
var require_docConclusionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docConclusionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docConclusionRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "conclusion [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docConclusionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docCoverRole.js
var require_docCoverRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docCoverRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docCoverRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "cover [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "img"]]
    }, _default = exports.default = docCoverRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docCreditRole.js
var require_docCreditRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docCreditRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docCreditRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "credit [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docCreditRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docCreditsRole.js
var require_docCreditsRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docCreditsRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docCreditsRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "credits [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docCreditsRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docDedicationRole.js
var require_docDedicationRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docDedicationRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docDedicationRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "dedication [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docDedicationRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docEndnoteRole.js
var require_docEndnoteRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docEndnoteRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docEndnoteRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "rearnote [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: ["doc-endnotes"],
      requiredContextRole: ["doc-endnotes"],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "listitem"]]
    }, _default = exports.default = docEndnoteRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docEndnotesRole.js
var require_docEndnotesRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docEndnotesRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docEndnotesRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "rearnotes [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["doc-endnote"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docEndnotesRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docEpigraphRole.js
var require_docEpigraphRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docEpigraphRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docEpigraphRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "epigraph [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docEpigraphRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docEpilogueRole.js
var require_docEpilogueRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docEpilogueRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docEpilogueRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "epilogue [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docEpilogueRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docErrataRole.js
var require_docErrataRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docErrataRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docErrataRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "errata [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docErrataRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docExampleRole.js
var require_docExampleRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docExampleRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docExampleRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docExampleRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docFootnoteRole.js
var require_docFootnoteRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docFootnoteRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docFootnoteRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "footnote [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docFootnoteRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docForewordRole.js
var require_docForewordRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docForewordRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docForewordRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "foreword [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docForewordRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docGlossaryRole.js
var require_docGlossaryRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docGlossaryRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docGlossaryRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "glossary [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [["definition"], ["term"]],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docGlossaryRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docGlossrefRole.js
var require_docGlossrefRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docGlossrefRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docGlossrefRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "glossref [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command", "link"]]
    }, _default = exports.default = docGlossrefRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docIndexRole.js
var require_docIndexRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docIndexRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docIndexRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "index [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark", "navigation"]]
    }, _default = exports.default = docIndexRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docIntroductionRole.js
var require_docIntroductionRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docIntroductionRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docIntroductionRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "introduction [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docIntroductionRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docNoterefRole.js
var require_docNoterefRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docNoterefRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docNoterefRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "noteref [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "widget", "command", "link"]]
    }, _default = exports.default = docNoterefRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docNoticeRole.js
var require_docNoticeRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docNoticeRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docNoticeRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "notice [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "note"]]
    }, _default = exports.default = docNoticeRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPagebreakRole.js
var require_docPagebreakRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPagebreakRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPagebreakRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "pagebreak [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "separator"]]
    }, _default = exports.default = docPagebreakRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPagefooterRole.js
var require_docPagefooterRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPagefooterRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPagefooterRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: [],
      props: {
        "aria-braillelabel": null,
        "aria-brailleroledescription": null,
        "aria-description": null,
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docPagefooterRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPageheaderRole.js
var require_docPageheaderRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPageheaderRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPageheaderRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["prohibited"],
      prohibitedProps: [],
      props: {
        "aria-braillelabel": null,
        "aria-brailleroledescription": null,
        "aria-description": null,
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docPageheaderRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPagelistRole.js
var require_docPagelistRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPagelistRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPagelistRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "page-list [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark", "navigation"]]
    }, _default = exports.default = docPagelistRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPartRole.js
var require_docPartRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPartRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPartRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "part [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docPartRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPrefaceRole.js
var require_docPrefaceRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPrefaceRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPrefaceRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "preface [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docPrefaceRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPrologueRole.js
var require_docPrologueRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPrologueRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPrologueRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "prologue [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark"]]
    }, _default = exports.default = docPrologueRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docPullquoteRole.js
var require_docPullquoteRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docPullquoteRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docPullquoteRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {},
      relatedConcepts: [{
        concept: {
          name: "pullquote [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["none"]]
    }, _default = exports.default = docPullquoteRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docQnaRole.js
var require_docQnaRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docQnaRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docQnaRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "qna [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section"]]
    }, _default = exports.default = docQnaRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docSubtitleRole.js
var require_docSubtitleRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docSubtitleRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docSubtitleRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "subtitle [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "sectionhead"]]
    }, _default = exports.default = docSubtitleRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docTipRole.js
var require_docTipRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docTipRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docTipRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "help [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "note"]]
    }, _default = exports.default = docTipRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/dpub/docTocRole.js
var require_docTocRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/dpub/docTocRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var docTocRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        concept: {
          name: "toc [EPUB-SSV]"
        },
        module: "EPUB"
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "landmark", "navigation"]]
    }, _default = exports.default = docTocRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/ariaDpubRoles.js
var require_ariaDpubRoles = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/ariaDpubRoles.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _docAbstractRole = _interopRequireDefault(require_docAbstractRole()), _docAcknowledgmentsRole = _interopRequireDefault(require_docAcknowledgmentsRole()), _docAfterwordRole = _interopRequireDefault(require_docAfterwordRole()), _docAppendixRole = _interopRequireDefault(require_docAppendixRole()), _docBacklinkRole = _interopRequireDefault(require_docBacklinkRole()), _docBiblioentryRole = _interopRequireDefault(require_docBiblioentryRole()), _docBibliographyRole = _interopRequireDefault(require_docBibliographyRole()), _docBibliorefRole = _interopRequireDefault(require_docBibliorefRole()), _docChapterRole = _interopRequireDefault(require_docChapterRole()), _docColophonRole = _interopRequireDefault(require_docColophonRole()), _docConclusionRole = _interopRequireDefault(require_docConclusionRole()), _docCoverRole = _interopRequireDefault(require_docCoverRole()), _docCreditRole = _interopRequireDefault(require_docCreditRole()), _docCreditsRole = _interopRequireDefault(require_docCreditsRole()), _docDedicationRole = _interopRequireDefault(require_docDedicationRole()), _docEndnoteRole = _interopRequireDefault(require_docEndnoteRole()), _docEndnotesRole = _interopRequireDefault(require_docEndnotesRole()), _docEpigraphRole = _interopRequireDefault(require_docEpigraphRole()), _docEpilogueRole = _interopRequireDefault(require_docEpilogueRole()), _docErrataRole = _interopRequireDefault(require_docErrataRole()), _docExampleRole = _interopRequireDefault(require_docExampleRole()), _docFootnoteRole = _interopRequireDefault(require_docFootnoteRole()), _docForewordRole = _interopRequireDefault(require_docForewordRole()), _docGlossaryRole = _interopRequireDefault(require_docGlossaryRole()), _docGlossrefRole = _interopRequireDefault(require_docGlossrefRole()), _docIndexRole = _interopRequireDefault(require_docIndexRole()), _docIntroductionRole = _interopRequireDefault(require_docIntroductionRole()), _docNoterefRole = _interopRequireDefault(require_docNoterefRole()), _docNoticeRole = _interopRequireDefault(require_docNoticeRole()), _docPagebreakRole = _interopRequireDefault(require_docPagebreakRole()), _docPagefooterRole = _interopRequireDefault(require_docPagefooterRole()), _docPageheaderRole = _interopRequireDefault(require_docPageheaderRole()), _docPagelistRole = _interopRequireDefault(require_docPagelistRole()), _docPartRole = _interopRequireDefault(require_docPartRole()), _docPrefaceRole = _interopRequireDefault(require_docPrefaceRole()), _docPrologueRole = _interopRequireDefault(require_docPrologueRole()), _docPullquoteRole = _interopRequireDefault(require_docPullquoteRole()), _docQnaRole = _interopRequireDefault(require_docQnaRole()), _docSubtitleRole = _interopRequireDefault(require_docSubtitleRole()), _docTipRole = _interopRequireDefault(require_docTipRole()), _docTocRole = _interopRequireDefault(require_docTocRole());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    var ariaDpubRoles = [["doc-abstract", _docAbstractRole.default], ["doc-acknowledgments", _docAcknowledgmentsRole.default], ["doc-afterword", _docAfterwordRole.default], ["doc-appendix", _docAppendixRole.default], ["doc-backlink", _docBacklinkRole.default], ["doc-biblioentry", _docBiblioentryRole.default], ["doc-bibliography", _docBibliographyRole.default], ["doc-biblioref", _docBibliorefRole.default], ["doc-chapter", _docChapterRole.default], ["doc-colophon", _docColophonRole.default], ["doc-conclusion", _docConclusionRole.default], ["doc-cover", _docCoverRole.default], ["doc-credit", _docCreditRole.default], ["doc-credits", _docCreditsRole.default], ["doc-dedication", _docDedicationRole.default], ["doc-endnote", _docEndnoteRole.default], ["doc-endnotes", _docEndnotesRole.default], ["doc-epigraph", _docEpigraphRole.default], ["doc-epilogue", _docEpilogueRole.default], ["doc-errata", _docErrataRole.default], ["doc-example", _docExampleRole.default], ["doc-footnote", _docFootnoteRole.default], ["doc-foreword", _docForewordRole.default], ["doc-glossary", _docGlossaryRole.default], ["doc-glossref", _docGlossrefRole.default], ["doc-index", _docIndexRole.default], ["doc-introduction", _docIntroductionRole.default], ["doc-noteref", _docNoterefRole.default], ["doc-notice", _docNoticeRole.default], ["doc-pagebreak", _docPagebreakRole.default], ["doc-pagefooter", _docPagefooterRole.default], ["doc-pageheader", _docPageheaderRole.default], ["doc-pagelist", _docPagelistRole.default], ["doc-part", _docPartRole.default], ["doc-preface", _docPrefaceRole.default], ["doc-prologue", _docPrologueRole.default], ["doc-pullquote", _docPullquoteRole.default], ["doc-qna", _docQnaRole.default], ["doc-subtitle", _docSubtitleRole.default], ["doc-tip", _docTipRole.default], ["doc-toc", _docTocRole.default]], _default = exports.default = ariaDpubRoles;
  }
});

// ../node_modules/aria-query/lib/etc/roles/graphics/graphicsDocumentRole.js
var require_graphicsDocumentRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/graphics/graphicsDocumentRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var graphicsDocumentRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        module: "GRAPHICS",
        concept: {
          name: "graphics-object"
        }
      }, {
        module: "ARIA",
        concept: {
          name: "img"
        }
      }, {
        module: "ARIA",
        concept: {
          name: "article"
        }
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "document"]]
    }, _default = exports.default = graphicsDocumentRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/graphics/graphicsObjectRole.js
var require_graphicsObjectRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/graphics/graphicsObjectRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var graphicsObjectRole = {
      abstract: !1,
      accessibleNameRequired: !1,
      baseConcepts: [],
      childrenPresentational: !1,
      nameFrom: ["author", "contents"],
      prohibitedProps: [],
      props: {
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [{
        module: "GRAPHICS",
        concept: {
          name: "graphics-document"
        }
      }, {
        module: "ARIA",
        concept: {
          name: "group"
        }
      }, {
        module: "ARIA",
        concept: {
          name: "img"
        }
      }, {
        module: "GRAPHICS",
        concept: {
          name: "graphics-symbol"
        }
      }],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "group"]]
    }, _default = exports.default = graphicsObjectRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/graphics/graphicsSymbolRole.js
var require_graphicsSymbolRole = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/graphics/graphicsSymbolRole.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var graphicsSymbolRole = {
      abstract: !1,
      accessibleNameRequired: !0,
      baseConcepts: [],
      childrenPresentational: !0,
      nameFrom: ["author"],
      prohibitedProps: [],
      props: {
        "aria-disabled": null,
        "aria-errormessage": null,
        "aria-expanded": null,
        "aria-haspopup": null,
        "aria-invalid": null
      },
      relatedConcepts: [],
      requireContextRole: [],
      requiredContextRole: [],
      requiredOwnedElements: [],
      requiredProps: {},
      superClass: [["roletype", "structure", "section", "img"]]
    }, _default = exports.default = graphicsSymbolRole;
  }
});

// ../node_modules/aria-query/lib/etc/roles/ariaGraphicsRoles.js
var require_ariaGraphicsRoles = __commonJS({
  "../node_modules/aria-query/lib/etc/roles/ariaGraphicsRoles.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _graphicsDocumentRole = _interopRequireDefault(require_graphicsDocumentRole()), _graphicsObjectRole = _interopRequireDefault(require_graphicsObjectRole()), _graphicsSymbolRole = _interopRequireDefault(require_graphicsSymbolRole());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    var ariaGraphicsRoles = [["graphics-document", _graphicsDocumentRole.default], ["graphics-object", _graphicsObjectRole.default], ["graphics-symbol", _graphicsSymbolRole.default]], _default = exports.default = ariaGraphicsRoles;
  }
});

// ../node_modules/aria-query/lib/rolesMap.js
var require_rolesMap = __commonJS({
  "../node_modules/aria-query/lib/rolesMap.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _ariaAbstractRoles = _interopRequireDefault(require_ariaAbstractRoles()), _ariaLiteralRoles = _interopRequireDefault(require_ariaLiteralRoles()), _ariaDpubRoles = _interopRequireDefault(require_ariaDpubRoles()), _ariaGraphicsRoles = _interopRequireDefault(require_ariaGraphicsRoles()), _iterationDecorator = _interopRequireDefault(require_iterationDecorator());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    function _createForOfIteratorHelper(r2, e2) {
      var t2 = typeof Symbol < "u" && r2[Symbol.iterator] || r2["@@iterator"];
      if (!t2) {
        if (Array.isArray(r2) || (t2 = _unsupportedIterableToArray(r2)) || e2 && r2 && typeof r2.length == "number") {
          t2 && (r2 = t2);
          var _n = 0, F = function() {
          };
          return { s: F, n: function() {
            return _n >= r2.length ? { done: !0 } : { done: !1, value: r2[_n++] };
          }, e: function(r3) {
            throw r3;
          }, f: F };
        }
        throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
      }
      var o2, a = !0, u3 = !1;
      return { s: function() {
        t2 = t2.call(r2);
      }, n: function() {
        var r3 = t2.next();
        return a = r3.done, r3;
      }, e: function(r3) {
        u3 = !0, o2 = r3;
      }, f: function() {
        try {
          a || t2.return == null || t2.return();
        } finally {
          if (u3) throw o2;
        }
      } };
    }
    function _slicedToArray(r2, e2) {
      return _arrayWithHoles(r2) || _iterableToArrayLimit(r2, e2) || _unsupportedIterableToArray(r2, e2) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function _unsupportedIterableToArray(r2, a) {
      if (r2) {
        if (typeof r2 == "string") return _arrayLikeToArray(r2, a);
        var t2 = {}.toString.call(r2).slice(8, -1);
        return t2 === "Object" && r2.constructor && (t2 = r2.constructor.name), t2 === "Map" || t2 === "Set" ? Array.from(r2) : t2 === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t2) ? _arrayLikeToArray(r2, a) : void 0;
      }
    }
    function _arrayLikeToArray(r2, a) {
      (a == null || a > r2.length) && (a = r2.length);
      for (var e2 = 0, n2 = Array(a); e2 < a; e2++) n2[e2] = r2[e2];
      return n2;
    }
    function _iterableToArrayLimit(r2, l2) {
      var t2 = r2 == null ? null : typeof Symbol < "u" && r2[Symbol.iterator] || r2["@@iterator"];
      if (t2 != null) {
        var e2, n2, i2, u3, a = [], f3 = !0, o2 = !1;
        try {
          if (i2 = (t2 = t2.call(r2)).next, l2 === 0) {
            if (Object(t2) !== t2) return;
            f3 = !1;
          } else for (; !(f3 = (e2 = i2.call(t2)).done) && (a.push(e2.value), a.length !== l2); f3 = !0) ;
        } catch (r3) {
          o2 = !0, n2 = r3;
        } finally {
          try {
            if (!f3 && t2.return != null && (u3 = t2.return(), Object(u3) !== u3)) return;
          } finally {
            if (o2) throw n2;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r2) {
      if (Array.isArray(r2)) return r2;
    }
    var roles3 = [].concat(_ariaAbstractRoles.default, _ariaLiteralRoles.default, _ariaDpubRoles.default, _ariaGraphicsRoles.default);
    roles3.forEach(function(_ref) {
      var _ref2 = _slicedToArray(_ref, 2), roleDefinition = _ref2[1], _iterator = _createForOfIteratorHelper(roleDefinition.superClass), _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done; ) {
          var superClassIter = _step.value, _iterator2 = _createForOfIteratorHelper(superClassIter), _step2;
          try {
            var _loop = function() {
              var superClassName = _step2.value, superClassRoleTuple = roles3.filter(function(_ref3) {
                var _ref4 = _slicedToArray(_ref3, 1), name = _ref4[0];
                return name === superClassName;
              })[0];
              if (superClassRoleTuple)
                for (var superClassDefinition = superClassRoleTuple[1], _i = 0, _Object$keys = Object.keys(superClassDefinition.props); _i < _Object$keys.length; _i++) {
                  var prop = _Object$keys[_i];
                  Object.prototype.hasOwnProperty.call(roleDefinition.props, prop) || (roleDefinition.props[prop] = superClassDefinition.props[prop]);
                }
            };
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done; )
              _loop();
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    });
    var rolesMap = {
      entries: function() {
        return roles3;
      },
      forEach: function(fn3) {
        var thisArg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null, _iterator3 = _createForOfIteratorHelper(roles3), _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done; ) {
            var _step3$value = _slicedToArray(_step3.value, 2), key = _step3$value[0], values = _step3$value[1];
            fn3.call(thisArg, values, key, roles3);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      },
      get: function(key) {
        var item = roles3.filter(function(tuple) {
          return tuple[0] === key;
        })[0];
        return item && item[1];
      },
      has: function(key) {
        return !!rolesMap.get(key);
      },
      keys: function() {
        return roles3.map(function(_ref5) {
          var _ref6 = _slicedToArray(_ref5, 1), key = _ref6[0];
          return key;
        });
      },
      values: function() {
        return roles3.map(function(_ref7) {
          var _ref8 = _slicedToArray(_ref7, 2), values2 = _ref8[1];
          return values2;
        });
      }
    }, _default = exports.default = (0, _iterationDecorator.default)(rolesMap, rolesMap.entries());
  }
});

// ../node_modules/aria-query/lib/elementRoleMap.js
var require_elementRoleMap = __commonJS({
  "../node_modules/aria-query/lib/elementRoleMap.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _iterationDecorator = _interopRequireDefault(require_iterationDecorator()), _rolesMap = _interopRequireDefault(require_rolesMap());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    function _slicedToArray(r2, e2) {
      return _arrayWithHoles(r2) || _iterableToArrayLimit(r2, e2) || _unsupportedIterableToArray(r2, e2) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function _unsupportedIterableToArray(r2, a) {
      if (r2) {
        if (typeof r2 == "string") return _arrayLikeToArray(r2, a);
        var t2 = {}.toString.call(r2).slice(8, -1);
        return t2 === "Object" && r2.constructor && (t2 = r2.constructor.name), t2 === "Map" || t2 === "Set" ? Array.from(r2) : t2 === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t2) ? _arrayLikeToArray(r2, a) : void 0;
      }
    }
    function _arrayLikeToArray(r2, a) {
      (a == null || a > r2.length) && (a = r2.length);
      for (var e2 = 0, n2 = Array(a); e2 < a; e2++) n2[e2] = r2[e2];
      return n2;
    }
    function _iterableToArrayLimit(r2, l2) {
      var t2 = r2 == null ? null : typeof Symbol < "u" && r2[Symbol.iterator] || r2["@@iterator"];
      if (t2 != null) {
        var e2, n2, i3, u3, a = [], f3 = !0, o2 = !1;
        try {
          if (i3 = (t2 = t2.call(r2)).next, l2 === 0) {
            if (Object(t2) !== t2) return;
            f3 = !1;
          } else for (; !(f3 = (e2 = i3.call(t2)).done) && (a.push(e2.value), a.length !== l2); f3 = !0) ;
        } catch (r3) {
          o2 = !0, n2 = r3;
        } finally {
          try {
            if (!f3 && t2.return != null && (u3 = t2.return(), Object(u3) !== u3)) return;
          } finally {
            if (o2) throw n2;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r2) {
      if (Array.isArray(r2)) return r2;
    }
    var elementRoles3 = [], keys2 = _rolesMap.default.keys();
    for (i2 = 0; i2 < keys2.length; i2++)
      if (key = keys2[i2], role = _rolesMap.default.get(key), role)
        for (concepts = [].concat(role.baseConcepts, role.relatedConcepts), _loop = function() {
          var relation = concepts[k2];
          if (relation.module === "HTML") {
            var concept = relation.concept;
            if (concept) {
              var elementRoleRelation = elementRoles3.filter(function(relation2) {
                return ariaRoleRelationConceptEquals(relation2[0], concept);
              })[0], roles3;
              elementRoleRelation ? roles3 = elementRoleRelation[1] : roles3 = [];
              for (var isUnique = !0, _i = 0; _i < roles3.length; _i++)
                if (roles3[_i] === key) {
                  isUnique = !1;
                  break;
                }
              isUnique && roles3.push(key), elementRoleRelation || elementRoles3.push([concept, roles3]);
            }
          }
        }, k2 = 0; k2 < concepts.length; k2++)
          _loop();
    var key, role, concepts, _loop, k2, i2, elementRoleMap = {
      entries: function() {
        return elementRoles3;
      },
      forEach: function(fn3) {
        for (var thisArg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null, _i2 = 0, _elementRoles = elementRoles3; _i2 < _elementRoles.length; _i2++) {
          var _elementRoles$_i = _slicedToArray(_elementRoles[_i2], 2), _key = _elementRoles$_i[0], values = _elementRoles$_i[1];
          fn3.call(thisArg, values, _key, elementRoles3);
        }
      },
      get: function(key2) {
        var item = elementRoles3.filter(function(tuple) {
          return key2.name === tuple[0].name && ariaRoleRelationConceptAttributeEquals(key2.attributes, tuple[0].attributes);
        })[0];
        return item && item[1];
      },
      has: function(key2) {
        return !!elementRoleMap.get(key2);
      },
      keys: function() {
        return elementRoles3.map(function(_ref) {
          var _ref2 = _slicedToArray(_ref, 1), key2 = _ref2[0];
          return key2;
        });
      },
      values: function() {
        return elementRoles3.map(function(_ref3) {
          var _ref4 = _slicedToArray(_ref3, 2), values2 = _ref4[1];
          return values2;
        });
      }
    };
    function ariaRoleRelationConceptEquals(a, b2) {
      return a.name === b2.name && ariaRoleRelationConstraintsEquals(a.constraints, b2.constraints) && ariaRoleRelationConceptAttributeEquals(a.attributes, b2.attributes);
    }
    function ariaRoleRelationConstraintsEquals(a, b2) {
      if (a === void 0 && b2 !== void 0 || a !== void 0 && b2 === void 0)
        return !1;
      if (a !== void 0 && b2 !== void 0) {
        if (a.length !== b2.length)
          return !1;
        for (var _i3 = 0; _i3 < a.length; _i3++)
          if (a[_i3] !== b2[_i3])
            return !1;
      }
      return !0;
    }
    function ariaRoleRelationConceptAttributeEquals(a, b2) {
      if (a === void 0 && b2 !== void 0 || a !== void 0 && b2 === void 0)
        return !1;
      if (a !== void 0 && b2 !== void 0) {
        if (a.length !== b2.length)
          return !1;
        for (var _i4 = 0; _i4 < a.length; _i4++) {
          if (a[_i4].name !== b2[_i4].name || a[_i4].value !== b2[_i4].value || a[_i4].constraints === void 0 && b2[_i4].constraints !== void 0 || a[_i4].constraints !== void 0 && b2[_i4].constraints === void 0)
            return !1;
          if (a[_i4].constraints !== void 0 && b2[_i4].constraints !== void 0) {
            if (a[_i4].constraints.length !== b2[_i4].constraints.length)
              return !1;
            for (var j2 = 0; j2 < a[_i4].constraints.length; j2++)
              if (a[_i4].constraints[j2] !== b2[_i4].constraints[j2])
                return !1;
          }
        }
      }
      return !0;
    }
    var _default = exports.default = (0, _iterationDecorator.default)(elementRoleMap, elementRoleMap.entries());
  }
});

// ../node_modules/aria-query/lib/roleElementMap.js
var require_roleElementMap = __commonJS({
  "../node_modules/aria-query/lib/roleElementMap.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = void 0;
    var _iterationDecorator = _interopRequireDefault(require_iterationDecorator()), _rolesMap = _interopRequireDefault(require_rolesMap());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    function _slicedToArray(r2, e2) {
      return _arrayWithHoles(r2) || _iterableToArrayLimit(r2, e2) || _unsupportedIterableToArray(r2, e2) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function _unsupportedIterableToArray(r2, a) {
      if (r2) {
        if (typeof r2 == "string") return _arrayLikeToArray(r2, a);
        var t2 = {}.toString.call(r2).slice(8, -1);
        return t2 === "Object" && r2.constructor && (t2 = r2.constructor.name), t2 === "Map" || t2 === "Set" ? Array.from(r2) : t2 === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t2) ? _arrayLikeToArray(r2, a) : void 0;
      }
    }
    function _arrayLikeToArray(r2, a) {
      (a == null || a > r2.length) && (a = r2.length);
      for (var e2 = 0, n2 = Array(a); e2 < a; e2++) n2[e2] = r2[e2];
      return n2;
    }
    function _iterableToArrayLimit(r2, l2) {
      var t2 = r2 == null ? null : typeof Symbol < "u" && r2[Symbol.iterator] || r2["@@iterator"];
      if (t2 != null) {
        var e2, n2, i3, u3, a = [], f3 = !0, o2 = !1;
        try {
          if (i3 = (t2 = t2.call(r2)).next, l2 === 0) {
            if (Object(t2) !== t2) return;
            f3 = !1;
          } else for (; !(f3 = (e2 = i3.call(t2)).done) && (a.push(e2.value), a.length !== l2); f3 = !0) ;
        } catch (r3) {
          o2 = !0, n2 = r3;
        } finally {
          try {
            if (!f3 && t2.return != null && (u3 = t2.return(), Object(u3) !== u3)) return;
          } finally {
            if (o2) throw n2;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r2) {
      if (Array.isArray(r2)) return r2;
    }
    var roleElement = [], keys2 = _rolesMap.default.keys();
    for (i2 = 0; i2 < keys2.length; i2++)
      if (key = keys2[i2], role = _rolesMap.default.get(key), relationConcepts = [], role) {
        for (concepts = [].concat(role.baseConcepts, role.relatedConcepts), k2 = 0; k2 < concepts.length; k2++)
          relation = concepts[k2], relation.module === "HTML" && (concept = relation.concept, concept != null && relationConcepts.push(concept));
        relationConcepts.length > 0 && roleElement.push([key, relationConcepts]);
      }
    var key, role, relationConcepts, concepts, relation, concept, k2, i2, roleElementMap = {
      entries: function() {
        return roleElement;
      },
      forEach: function(fn3) {
        for (var thisArg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null, _i = 0, _roleElement = roleElement; _i < _roleElement.length; _i++) {
          var _roleElement$_i = _slicedToArray(_roleElement[_i], 2), _key = _roleElement$_i[0], values = _roleElement$_i[1];
          fn3.call(thisArg, values, _key, roleElement);
        }
      },
      get: function(key2) {
        var item = roleElement.filter(function(tuple) {
          return tuple[0] === key2;
        })[0];
        return item && item[1];
      },
      has: function(key2) {
        return !!roleElementMap.get(key2);
      },
      keys: function() {
        return roleElement.map(function(_ref) {
          var _ref2 = _slicedToArray(_ref, 1), key2 = _ref2[0];
          return key2;
        });
      },
      values: function() {
        return roleElement.map(function(_ref3) {
          var _ref4 = _slicedToArray(_ref3, 2), values2 = _ref4[1];
          return values2;
        });
      }
    }, _default = exports.default = (0, _iterationDecorator.default)(roleElementMap, roleElementMap.entries());
  }
});

// ../node_modules/aria-query/lib/index.js
var require_lib = __commonJS({
  "../node_modules/aria-query/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.roles = exports.roleElements = exports.elementRoles = exports.dom = exports.aria = void 0;
    var _ariaPropsMap = _interopRequireDefault(require_ariaPropsMap()), _domMap = _interopRequireDefault(require_domMap()), _rolesMap = _interopRequireDefault(require_rolesMap()), _elementRoleMap = _interopRequireDefault(require_elementRoleMap()), _roleElementMap = _interopRequireDefault(require_roleElementMap());
    function _interopRequireDefault(e2) {
      return e2 && e2.__esModule ? e2 : { default: e2 };
    }
    var aria = exports.aria = _ariaPropsMap.default, dom = exports.dom = _domMap.default, roles3 = exports.roles = _rolesMap.default, elementRoles3 = exports.elementRoles = _elementRoleMap.default, roleElements2 = exports.roleElements = _roleElementMap.default;
  }
});

// ../node_modules/css.escape/css.escape.js
var require_css_escape = __commonJS({
  "../node_modules/css.escape/css.escape.js"(exports, module2) {
    (function(root, factory) {
      typeof exports == "object" ? module2.exports = factory(root) : typeof define == "function" && define.amd ? define([], factory.bind(root, root)) : factory(root);
    })(typeof global < "u" ? global : exports, function(root) {
      if (root.CSS && root.CSS.escape)
        return root.CSS.escape;
      var cssEscape = function(value) {
        if (arguments.length == 0)
          throw new TypeError("`CSS.escape` requires an argument.");
        for (var string = String(value), length = string.length, index = -1, codeUnit, result = "", firstCodeUnit = string.charCodeAt(0); ++index < length; ) {
          if (codeUnit = string.charCodeAt(index), codeUnit == 0) {
            result += "\uFFFD";
            continue;
          }
          if (
            // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
            // U+007F, […]
            codeUnit >= 1 && codeUnit <= 31 || codeUnit == 127 || // If the character is the first character and is in the range [0-9]
            // (U+0030 to U+0039), […]
            index == 0 && codeUnit >= 48 && codeUnit <= 57 || // If the character is the second character and is in the range [0-9]
            // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
            index == 1 && codeUnit >= 48 && codeUnit <= 57 && firstCodeUnit == 45
          ) {
            result += "\\" + codeUnit.toString(16) + " ";
            continue;
          }
          if (
            // If the character is the first character and is a `-` (U+002D), and
            // there is no second character, […]
            index == 0 && length == 1 && codeUnit == 45
          ) {
            result += "\\" + string.charAt(index);
            continue;
          }
          if (codeUnit >= 128 || codeUnit == 45 || codeUnit == 95 || codeUnit >= 48 && codeUnit <= 57 || codeUnit >= 65 && codeUnit <= 90 || codeUnit >= 97 && codeUnit <= 122) {
            result += string.charAt(index);
            continue;
          }
          result += "\\" + string.charAt(index);
        }
        return result;
      };
      return root.CSS || (root.CSS = {}), root.CSS.escape = cssEscape, cssEscape;
    });
  }
});

// ../node_modules/pretty-format/node_modules/ansi-styles/index.js
var require_ansi_styles = __commonJS({
  "../node_modules/pretty-format/node_modules/ansi-styles/index.js"(exports, module2) {
    "use strict";
    var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`, wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
    function assembleStyles() {
      let codes = /* @__PURE__ */ new Map(), styles2 = {
        modifier: {
          reset: [0, 0],
          // 21 isn't widely supported and 22 does the same thing
          bold: [1, 22],
          dim: [2, 22],
          italic: [3, 23],
          underline: [4, 24],
          overline: [53, 55],
          inverse: [7, 27],
          hidden: [8, 28],
          strikethrough: [9, 29]
        },
        color: {
          black: [30, 39],
          red: [31, 39],
          green: [32, 39],
          yellow: [33, 39],
          blue: [34, 39],
          magenta: [35, 39],
          cyan: [36, 39],
          white: [37, 39],
          // Bright color
          blackBright: [90, 39],
          redBright: [91, 39],
          greenBright: [92, 39],
          yellowBright: [93, 39],
          blueBright: [94, 39],
          magentaBright: [95, 39],
          cyanBright: [96, 39],
          whiteBright: [97, 39]
        },
        bgColor: {
          bgBlack: [40, 49],
          bgRed: [41, 49],
          bgGreen: [42, 49],
          bgYellow: [43, 49],
          bgBlue: [44, 49],
          bgMagenta: [45, 49],
          bgCyan: [46, 49],
          bgWhite: [47, 49],
          // Bright color
          bgBlackBright: [100, 49],
          bgRedBright: [101, 49],
          bgGreenBright: [102, 49],
          bgYellowBright: [103, 49],
          bgBlueBright: [104, 49],
          bgMagentaBright: [105, 49],
          bgCyanBright: [106, 49],
          bgWhiteBright: [107, 49]
        }
      };
      styles2.color.gray = styles2.color.blackBright, styles2.bgColor.bgGray = styles2.bgColor.bgBlackBright, styles2.color.grey = styles2.color.blackBright, styles2.bgColor.bgGrey = styles2.bgColor.bgBlackBright;
      for (let [groupName, group] of Object.entries(styles2)) {
        for (let [styleName, style] of Object.entries(group))
          styles2[styleName] = {
            open: `\x1B[${style[0]}m`,
            close: `\x1B[${style[1]}m`
          }, group[styleName] = styles2[styleName], codes.set(style[0], style[1]);
        Object.defineProperty(styles2, groupName, {
          value: group,
          enumerable: !1
        });
      }
      return Object.defineProperty(styles2, "codes", {
        value: codes,
        enumerable: !1
      }), styles2.color.close = "\x1B[39m", styles2.bgColor.close = "\x1B[49m", styles2.color.ansi256 = wrapAnsi256(), styles2.color.ansi16m = wrapAnsi16m(), styles2.bgColor.ansi256 = wrapAnsi256(10), styles2.bgColor.ansi16m = wrapAnsi16m(10), Object.defineProperties(styles2, {
        rgbToAnsi256: {
          value: (red, green, blue) => red === green && green === blue ? red < 8 ? 16 : red > 248 ? 231 : Math.round((red - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5),
          enumerable: !1
        },
        hexToRgb: {
          value: (hex2) => {
            let matches3 = /(?<colorString>[a-f\d]{6}|[a-f\d]{3})/i.exec(hex2.toString(16));
            if (!matches3)
              return [0, 0, 0];
            let { colorString } = matches3.groups;
            colorString.length === 3 && (colorString = colorString.split("").map((character) => character + character).join(""));
            let integer = Number.parseInt(colorString, 16);
            return [
              integer >> 16 & 255,
              integer >> 8 & 255,
              integer & 255
            ];
          },
          enumerable: !1
        },
        hexToAnsi256: {
          value: (hex2) => styles2.rgbToAnsi256(...styles2.hexToRgb(hex2)),
          enumerable: !1
        }
      }), styles2;
    }
    Object.defineProperty(module2, "exports", {
      enumerable: !0,
      get: assembleStyles
    });
  }
});

// ../node_modules/pretty-format/build/collections.js
var require_collections = __commonJS({
  "../node_modules/pretty-format/build/collections.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.printIteratorEntries = printIteratorEntries;
    exports.printIteratorValues = printIteratorValues;
    exports.printListItems = printListItems;
    exports.printObjectProperties = printObjectProperties;
    var getKeysOfEnumerableProperties = (object, compareKeys) => {
      let keys2 = Object.keys(object).sort(compareKeys);
      return Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(object).forEach((symbol) => {
        Object.getOwnPropertyDescriptor(object, symbol).enumerable && keys2.push(symbol);
      }), keys2;
    };
    function printIteratorEntries(iterator, config3, indentation, depth, refs, printer, separator = ": ") {
      let result = "", current = iterator.next();
      if (!current.done) {
        result += config3.spacingOuter;
        let indentationNext = indentation + config3.indent;
        for (; !current.done; ) {
          let name = printer(
            current.value[0],
            config3,
            indentationNext,
            depth,
            refs
          ), value = printer(
            current.value[1],
            config3,
            indentationNext,
            depth,
            refs
          );
          result += indentationNext + name + separator + value, current = iterator.next(), current.done ? config3.min || (result += ",") : result += "," + config3.spacingInner;
        }
        result += config3.spacingOuter + indentation;
      }
      return result;
    }
    function printIteratorValues(iterator, config3, indentation, depth, refs, printer) {
      let result = "", current = iterator.next();
      if (!current.done) {
        result += config3.spacingOuter;
        let indentationNext = indentation + config3.indent;
        for (; !current.done; )
          result += indentationNext + printer(current.value, config3, indentationNext, depth, refs), current = iterator.next(), current.done ? config3.min || (result += ",") : result += "," + config3.spacingInner;
        result += config3.spacingOuter + indentation;
      }
      return result;
    }
    function printListItems(list, config3, indentation, depth, refs, printer) {
      let result = "";
      if (list.length) {
        result += config3.spacingOuter;
        let indentationNext = indentation + config3.indent;
        for (let i2 = 0; i2 < list.length; i2++)
          result += indentationNext, i2 in list && (result += printer(list[i2], config3, indentationNext, depth, refs)), i2 < list.length - 1 ? result += "," + config3.spacingInner : config3.min || (result += ",");
        result += config3.spacingOuter + indentation;
      }
      return result;
    }
    function printObjectProperties(val, config3, indentation, depth, refs, printer) {
      let result = "", keys2 = getKeysOfEnumerableProperties(val, config3.compareKeys);
      if (keys2.length) {
        result += config3.spacingOuter;
        let indentationNext = indentation + config3.indent;
        for (let i2 = 0; i2 < keys2.length; i2++) {
          let key = keys2[i2], name = printer(key, config3, indentationNext, depth, refs), value = printer(val[key], config3, indentationNext, depth, refs);
          result += indentationNext + name + ": " + value, i2 < keys2.length - 1 ? result += "," + config3.spacingInner : config3.min || (result += ",");
        }
        result += config3.spacingOuter + indentation;
      }
      return result;
    }
  }
});

// ../node_modules/pretty-format/build/plugins/AsymmetricMatcher.js
var require_AsymmetricMatcher = __commonJS({
  "../node_modules/pretty-format/build/plugins/AsymmetricMatcher.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var _collections = require_collections(), global2 = (function() {
      return typeof globalThis < "u" ? globalThis : typeof global2 < "u" ? global2 : typeof self < "u" ? self : typeof window < "u" ? window : Function("return this")();
    })(), Symbol2 = global2["jest-symbol-do-not-touch"] || global2.Symbol, asymmetricMatcher = typeof Symbol2 == "function" && Symbol2.for ? Symbol2.for("jest.asymmetricMatcher") : 1267621, SPACE = " ", serialize = (val, config3, indentation, depth, refs, printer) => {
      let stringedValue = val.toString();
      return stringedValue === "ArrayContaining" || stringedValue === "ArrayNotContaining" ? ++depth > config3.maxDepth ? "[" + stringedValue + "]" : stringedValue + SPACE + "[" + (0, _collections.printListItems)(
        val.sample,
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "]" : stringedValue === "ObjectContaining" || stringedValue === "ObjectNotContaining" ? ++depth > config3.maxDepth ? "[" + stringedValue + "]" : stringedValue + SPACE + "{" + (0, _collections.printObjectProperties)(
        val.sample,
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "}" : stringedValue === "StringMatching" || stringedValue === "StringNotMatching" || stringedValue === "StringContaining" || stringedValue === "StringNotContaining" ? stringedValue + SPACE + printer(val.sample, config3, indentation, depth, refs) : val.toAsymmetricMatcher();
    };
    exports.serialize = serialize;
    var test2 = (val) => val && val.$$typeof === asymmetricMatcher;
    exports.test = test2;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/node_modules/ansi-regex/index.js
var require_ansi_regex = __commonJS({
  "../node_modules/pretty-format/node_modules/ansi-regex/index.js"(exports, module2) {
    "use strict";
    module2.exports = ({ onlyFirst = !1 } = {}) => {
      let pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|");
      return new RegExp(pattern, onlyFirst ? void 0 : "g");
    };
  }
});

// ../node_modules/pretty-format/build/plugins/ConvertAnsi.js
var require_ConvertAnsi = __commonJS({
  "../node_modules/pretty-format/build/plugins/ConvertAnsi.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var _ansiRegex = _interopRequireDefault(require_ansi_regex()), _ansiStyles = _interopRequireDefault(require_ansi_styles());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var toHumanReadableAnsi = (text) => text.replace((0, _ansiRegex.default)(), (match) => {
      switch (match) {
        case _ansiStyles.default.red.close:
        case _ansiStyles.default.green.close:
        case _ansiStyles.default.cyan.close:
        case _ansiStyles.default.gray.close:
        case _ansiStyles.default.white.close:
        case _ansiStyles.default.yellow.close:
        case _ansiStyles.default.bgRed.close:
        case _ansiStyles.default.bgGreen.close:
        case _ansiStyles.default.bgYellow.close:
        case _ansiStyles.default.inverse.close:
        case _ansiStyles.default.dim.close:
        case _ansiStyles.default.bold.close:
        case _ansiStyles.default.reset.open:
        case _ansiStyles.default.reset.close:
          return "</>";
        case _ansiStyles.default.red.open:
          return "<red>";
        case _ansiStyles.default.green.open:
          return "<green>";
        case _ansiStyles.default.cyan.open:
          return "<cyan>";
        case _ansiStyles.default.gray.open:
          return "<gray>";
        case _ansiStyles.default.white.open:
          return "<white>";
        case _ansiStyles.default.yellow.open:
          return "<yellow>";
        case _ansiStyles.default.bgRed.open:
          return "<bgRed>";
        case _ansiStyles.default.bgGreen.open:
          return "<bgGreen>";
        case _ansiStyles.default.bgYellow.open:
          return "<bgYellow>";
        case _ansiStyles.default.inverse.open:
          return "<inverse>";
        case _ansiStyles.default.dim.open:
          return "<dim>";
        case _ansiStyles.default.bold.open:
          return "<bold>";
        default:
          return "";
      }
    }), test2 = (val) => typeof val == "string" && !!val.match((0, _ansiRegex.default)());
    exports.test = test2;
    var serialize = (val, config3, indentation, depth, refs, printer) => printer(toHumanReadableAnsi(val), config3, indentation, depth, refs);
    exports.serialize = serialize;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/build/plugins/DOMCollection.js
var require_DOMCollection = __commonJS({
  "../node_modules/pretty-format/build/plugins/DOMCollection.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var _collections = require_collections(), SPACE = " ", OBJECT_NAMES = ["DOMStringMap", "NamedNodeMap"], ARRAY_REGEXP = /^(HTML\w*Collection|NodeList)$/, testName = (name) => OBJECT_NAMES.indexOf(name) !== -1 || ARRAY_REGEXP.test(name), test2 = (val) => val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
    exports.test = test2;
    var isNamedNodeMap = (collection) => collection.constructor.name === "NamedNodeMap", serialize = (collection, config3, indentation, depth, refs, printer) => {
      let name = collection.constructor.name;
      return ++depth > config3.maxDepth ? "[" + name + "]" : (config3.min ? "" : name + SPACE) + (OBJECT_NAMES.indexOf(name) !== -1 ? "{" + (0, _collections.printObjectProperties)(
        isNamedNodeMap(collection) ? Array.from(collection).reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}) : { ...collection },
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "}" : "[" + (0, _collections.printListItems)(
        Array.from(collection),
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "]");
    };
    exports.serialize = serialize;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/build/plugins/lib/escapeHTML.js
var require_escapeHTML = __commonJS({
  "../node_modules/pretty-format/build/plugins/lib/escapeHTML.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = escapeHTML2;
    function escapeHTML2(str) {
      return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }
});

// ../node_modules/pretty-format/build/plugins/lib/markup.js
var require_markup = __commonJS({
  "../node_modules/pretty-format/build/plugins/lib/markup.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.printText = exports.printProps = exports.printElementAsLeaf = exports.printElement = exports.printComment = exports.printChildren = void 0;
    var _escapeHTML = _interopRequireDefault(require_escapeHTML());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var printProps2 = (keys2, props, config3, indentation, depth, refs, printer) => {
      let indentationNext = indentation + config3.indent, colors = config3.colors;
      return keys2.map((key) => {
        let value = props[key], printed = printer(value, config3, indentationNext, depth, refs);
        return typeof value != "string" && (printed.indexOf(`
`) !== -1 && (printed = config3.spacingOuter + indentationNext + printed + config3.spacingOuter + indentation), printed = "{" + printed + "}"), config3.spacingInner + indentation + colors.prop.open + key + colors.prop.close + "=" + colors.value.open + printed + colors.value.close;
      }).join("");
    };
    exports.printProps = printProps2;
    var printChildren2 = (children, config3, indentation, depth, refs, printer) => children.map(
      (child) => config3.spacingOuter + indentation + (typeof child == "string" ? printText2(child, config3) : printer(child, config3, indentation, depth, refs))
    ).join("");
    exports.printChildren = printChildren2;
    var printText2 = (text, config3) => {
      let contentColor = config3.colors.content;
      return contentColor.open + (0, _escapeHTML.default)(text) + contentColor.close;
    };
    exports.printText = printText2;
    var printComment2 = (comment, config3) => {
      let commentColor = config3.colors.comment;
      return commentColor.open + "<!--" + (0, _escapeHTML.default)(comment) + "-->" + commentColor.close;
    };
    exports.printComment = printComment2;
    var printElement2 = (type5, printedProps, printedChildren, config3, indentation) => {
      let tagColor = config3.colors.tag;
      return tagColor.open + "<" + type5 + (printedProps && tagColor.close + printedProps + config3.spacingOuter + indentation + tagColor.open) + (printedChildren ? ">" + tagColor.close + printedChildren + config3.spacingOuter + indentation + tagColor.open + "</" + type5 : (printedProps && !config3.min ? "" : " ") + "/") + ">" + tagColor.close;
    };
    exports.printElement = printElement2;
    var printElementAsLeaf2 = (type5, config3) => {
      let tagColor = config3.colors.tag;
      return tagColor.open + "<" + type5 + tagColor.close + " \u2026" + tagColor.open + " />" + tagColor.close;
    };
    exports.printElementAsLeaf = printElementAsLeaf2;
  }
});

// ../node_modules/pretty-format/build/plugins/DOMElement.js
var require_DOMElement = __commonJS({
  "../node_modules/pretty-format/build/plugins/DOMElement.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var _markup = require_markup(), ELEMENT_NODE2 = 1, TEXT_NODE2 = 3, COMMENT_NODE2 = 8, FRAGMENT_NODE2 = 11, ELEMENT_REGEXP2 = /^((HTML|SVG)\w*)?Element$/, testHasAttribute = (val) => {
      try {
        return typeof val.hasAttribute == "function" && val.hasAttribute("is");
      } catch {
        return !1;
      }
    }, testNode2 = (val) => {
      let constructorName = val.constructor.name, { nodeType, tagName } = val, isCustomElement3 = typeof tagName == "string" && tagName.includes("-") || testHasAttribute(val);
      return nodeType === ELEMENT_NODE2 && (ELEMENT_REGEXP2.test(constructorName) || isCustomElement3) || nodeType === TEXT_NODE2 && constructorName === "Text" || nodeType === COMMENT_NODE2 && constructorName === "Comment" || nodeType === FRAGMENT_NODE2 && constructorName === "DocumentFragment";
    }, test2 = (val) => {
      var _val$constructor;
      return (val == null || (_val$constructor = val.constructor) === null || _val$constructor === void 0 ? void 0 : _val$constructor.name) && testNode2(val);
    };
    exports.test = test2;
    function nodeIsText2(node) {
      return node.nodeType === TEXT_NODE2;
    }
    function nodeIsComment2(node) {
      return node.nodeType === COMMENT_NODE2;
    }
    function nodeIsFragment2(node) {
      return node.nodeType === FRAGMENT_NODE2;
    }
    var serialize = (node, config3, indentation, depth, refs, printer) => {
      if (nodeIsText2(node))
        return (0, _markup.printText)(node.data, config3);
      if (nodeIsComment2(node))
        return (0, _markup.printComment)(node.data, config3);
      let type5 = nodeIsFragment2(node) ? "DocumentFragment" : node.tagName.toLowerCase();
      return ++depth > config3.maxDepth ? (0, _markup.printElementAsLeaf)(type5, config3) : (0, _markup.printElement)(
        type5,
        (0, _markup.printProps)(
          nodeIsFragment2(node) ? [] : Array.from(node.attributes).map((attr) => attr.name).sort(),
          nodeIsFragment2(node) ? {} : Array.from(node.attributes).reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}),
          config3,
          indentation + config3.indent,
          depth,
          refs,
          printer
        ),
        (0, _markup.printChildren)(
          Array.prototype.slice.call(node.childNodes || node.children),
          config3,
          indentation + config3.indent,
          depth,
          refs,
          printer
        ),
        config3,
        indentation
      );
    };
    exports.serialize = serialize;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/build/plugins/Immutable.js
var require_Immutable = __commonJS({
  "../node_modules/pretty-format/build/plugins/Immutable.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var _collections = require_collections(), IS_ITERABLE_SENTINEL = "@@__IMMUTABLE_ITERABLE__@@", IS_LIST_SENTINEL2 = "@@__IMMUTABLE_LIST__@@", IS_KEYED_SENTINEL2 = "@@__IMMUTABLE_KEYED__@@", IS_MAP_SENTINEL = "@@__IMMUTABLE_MAP__@@", IS_ORDERED_SENTINEL2 = "@@__IMMUTABLE_ORDERED__@@", IS_RECORD_SENTINEL = "@@__IMMUTABLE_RECORD__@@", IS_SEQ_SENTINEL = "@@__IMMUTABLE_SEQ__@@", IS_SET_SENTINEL2 = "@@__IMMUTABLE_SET__@@", IS_STACK_SENTINEL = "@@__IMMUTABLE_STACK__@@", getImmutableName = (name) => "Immutable." + name, printAsLeaf = (name) => "[" + name + "]", SPACE = " ", LAZY = "\u2026", printImmutableEntries = (val, config3, indentation, depth, refs, printer, type5) => ++depth > config3.maxDepth ? printAsLeaf(getImmutableName(type5)) : getImmutableName(type5) + SPACE + "{" + (0, _collections.printIteratorEntries)(
      val.entries(),
      config3,
      indentation,
      depth,
      refs,
      printer
    ) + "}";
    function getRecordEntries(val) {
      let i2 = 0;
      return {
        next() {
          if (i2 < val._keys.length) {
            let key = val._keys[i2++];
            return {
              done: !1,
              value: [key, val.get(key)]
            };
          }
          return {
            done: !0,
            value: void 0
          };
        }
      };
    }
    var printImmutableRecord = (val, config3, indentation, depth, refs, printer) => {
      let name = getImmutableName(val._name || "Record");
      return ++depth > config3.maxDepth ? printAsLeaf(name) : name + SPACE + "{" + (0, _collections.printIteratorEntries)(
        getRecordEntries(val),
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "}";
    }, printImmutableSeq = (val, config3, indentation, depth, refs, printer) => {
      let name = getImmutableName("Seq");
      return ++depth > config3.maxDepth ? printAsLeaf(name) : val[IS_KEYED_SENTINEL2] ? name + SPACE + "{" + // from Immutable collection of entries or from ECMAScript object
      (val._iter || val._object ? (0, _collections.printIteratorEntries)(
        val.entries(),
        config3,
        indentation,
        depth,
        refs,
        printer
      ) : LAZY) + "}" : name + SPACE + "[" + (val._iter || // from Immutable collection of values
      val._array || // from ECMAScript array
      val._collection || // from ECMAScript collection in immutable v4
      val._iterable ? (0, _collections.printIteratorValues)(
        val.values(),
        config3,
        indentation,
        depth,
        refs,
        printer
      ) : LAZY) + "]";
    }, printImmutableValues = (val, config3, indentation, depth, refs, printer, type5) => ++depth > config3.maxDepth ? printAsLeaf(getImmutableName(type5)) : getImmutableName(type5) + SPACE + "[" + (0, _collections.printIteratorValues)(
      val.values(),
      config3,
      indentation,
      depth,
      refs,
      printer
    ) + "]", serialize = (val, config3, indentation, depth, refs, printer) => val[IS_MAP_SENTINEL] ? printImmutableEntries(
      val,
      config3,
      indentation,
      depth,
      refs,
      printer,
      val[IS_ORDERED_SENTINEL2] ? "OrderedMap" : "Map"
    ) : val[IS_LIST_SENTINEL2] ? printImmutableValues(
      val,
      config3,
      indentation,
      depth,
      refs,
      printer,
      "List"
    ) : val[IS_SET_SENTINEL2] ? printImmutableValues(
      val,
      config3,
      indentation,
      depth,
      refs,
      printer,
      val[IS_ORDERED_SENTINEL2] ? "OrderedSet" : "Set"
    ) : val[IS_STACK_SENTINEL] ? printImmutableValues(
      val,
      config3,
      indentation,
      depth,
      refs,
      printer,
      "Stack"
    ) : val[IS_SEQ_SENTINEL] ? printImmutableSeq(val, config3, indentation, depth, refs, printer) : printImmutableRecord(val, config3, indentation, depth, refs, printer);
    exports.serialize = serialize;
    var test2 = (val) => val && (val[IS_ITERABLE_SENTINEL] === !0 || val[IS_RECORD_SENTINEL] === !0);
    exports.test = test2;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/node_modules/react-is/cjs/react-is.production.min.js
var require_react_is_production_min = __commonJS({
  "../node_modules/pretty-format/node_modules/react-is/cjs/react-is.production.min.js"(exports) {
    "use strict";
    var b2 = 60103, c2 = 60106, d = 60107, e2 = 60108, f3 = 60114, g2 = 60109, h2 = 60110, k2 = 60112, l2 = 60113, m2 = 60120, n2 = 60115, p = 60116, q = 60121, r2 = 60122, u3 = 60117, v2 = 60129, w2 = 60131;
    typeof Symbol == "function" && Symbol.for && (x2 = Symbol.for, b2 = x2("react.element"), c2 = x2("react.portal"), d = x2("react.fragment"), e2 = x2("react.strict_mode"), f3 = x2("react.profiler"), g2 = x2("react.provider"), h2 = x2("react.context"), k2 = x2("react.forward_ref"), l2 = x2("react.suspense"), m2 = x2("react.suspense_list"), n2 = x2("react.memo"), p = x2("react.lazy"), q = x2("react.block"), r2 = x2("react.server.block"), u3 = x2("react.fundamental"), v2 = x2("react.debug_trace_mode"), w2 = x2("react.legacy_hidden"));
    var x2;
    function y2(a) {
      if (typeof a == "object" && a !== null) {
        var t2 = a.$$typeof;
        switch (t2) {
          case b2:
            switch (a = a.type, a) {
              case d:
              case f3:
              case e2:
              case l2:
              case m2:
                return a;
              default:
                switch (a = a && a.$$typeof, a) {
                  case h2:
                  case k2:
                  case p:
                  case n2:
                  case g2:
                    return a;
                  default:
                    return t2;
                }
            }
          case c2:
            return t2;
        }
      }
    }
    var z = g2, A = b2, B = k2, C = d, D2 = p, E2 = n2, F = c2, G = f3, H = e2, I = l2;
    exports.ContextConsumer = h2;
    exports.ContextProvider = z;
    exports.Element = A;
    exports.ForwardRef = B;
    exports.Fragment = C;
    exports.Lazy = D2;
    exports.Memo = E2;
    exports.Portal = F;
    exports.Profiler = G;
    exports.StrictMode = H;
    exports.Suspense = I;
    exports.isAsyncMode = function() {
      return !1;
    };
    exports.isConcurrentMode = function() {
      return !1;
    };
    exports.isContextConsumer = function(a) {
      return y2(a) === h2;
    };
    exports.isContextProvider = function(a) {
      return y2(a) === g2;
    };
    exports.isElement = function(a) {
      return typeof a == "object" && a !== null && a.$$typeof === b2;
    };
    exports.isForwardRef = function(a) {
      return y2(a) === k2;
    };
    exports.isFragment = function(a) {
      return y2(a) === d;
    };
    exports.isLazy = function(a) {
      return y2(a) === p;
    };
    exports.isMemo = function(a) {
      return y2(a) === n2;
    };
    exports.isPortal = function(a) {
      return y2(a) === c2;
    };
    exports.isProfiler = function(a) {
      return y2(a) === f3;
    };
    exports.isStrictMode = function(a) {
      return y2(a) === e2;
    };
    exports.isSuspense = function(a) {
      return y2(a) === l2;
    };
    exports.isValidElementType = function(a) {
      return typeof a == "string" || typeof a == "function" || a === d || a === f3 || a === v2 || a === e2 || a === l2 || a === m2 || a === w2 || typeof a == "object" && a !== null && (a.$$typeof === p || a.$$typeof === n2 || a.$$typeof === g2 || a.$$typeof === h2 || a.$$typeof === k2 || a.$$typeof === u3 || a.$$typeof === q || a[0] === r2);
    };
    exports.typeOf = y2;
  }
});

// ../node_modules/pretty-format/node_modules/react-is/cjs/react-is.development.js
var require_react_is_development = __commonJS({
  "../node_modules/pretty-format/node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    process.env.NODE_ENV !== "production" && (function() {
      "use strict";
      var REACT_ELEMENT_TYPE = 60103, REACT_PORTAL_TYPE = 60106, REACT_FRAGMENT_TYPE = 60107, REACT_STRICT_MODE_TYPE = 60108, REACT_PROFILER_TYPE = 60114, REACT_PROVIDER_TYPE = 60109, REACT_CONTEXT_TYPE = 60110, REACT_FORWARD_REF_TYPE = 60112, REACT_SUSPENSE_TYPE = 60113, REACT_SUSPENSE_LIST_TYPE = 60120, REACT_MEMO_TYPE = 60115, REACT_LAZY_TYPE = 60116, REACT_BLOCK_TYPE = 60121, REACT_SERVER_BLOCK_TYPE = 60122, REACT_FUNDAMENTAL_TYPE = 60117, REACT_SCOPE_TYPE = 60119, REACT_OPAQUE_ID_TYPE = 60128, REACT_DEBUG_TRACING_MODE_TYPE = 60129, REACT_OFFSCREEN_TYPE = 60130, REACT_LEGACY_HIDDEN_TYPE = 60131;
      if (typeof Symbol == "function" && Symbol.for) {
        var symbolFor = Symbol.for;
        REACT_ELEMENT_TYPE = symbolFor("react.element"), REACT_PORTAL_TYPE = symbolFor("react.portal"), REACT_FRAGMENT_TYPE = symbolFor("react.fragment"), REACT_STRICT_MODE_TYPE = symbolFor("react.strict_mode"), REACT_PROFILER_TYPE = symbolFor("react.profiler"), REACT_PROVIDER_TYPE = symbolFor("react.provider"), REACT_CONTEXT_TYPE = symbolFor("react.context"), REACT_FORWARD_REF_TYPE = symbolFor("react.forward_ref"), REACT_SUSPENSE_TYPE = symbolFor("react.suspense"), REACT_SUSPENSE_LIST_TYPE = symbolFor("react.suspense_list"), REACT_MEMO_TYPE = symbolFor("react.memo"), REACT_LAZY_TYPE = symbolFor("react.lazy"), REACT_BLOCK_TYPE = symbolFor("react.block"), REACT_SERVER_BLOCK_TYPE = symbolFor("react.server.block"), REACT_FUNDAMENTAL_TYPE = symbolFor("react.fundamental"), REACT_SCOPE_TYPE = symbolFor("react.scope"), REACT_OPAQUE_ID_TYPE = symbolFor("react.opaque.id"), REACT_DEBUG_TRACING_MODE_TYPE = symbolFor("react.debug_trace_mode"), REACT_OFFSCREEN_TYPE = symbolFor("react.offscreen"), REACT_LEGACY_HIDDEN_TYPE = symbolFor("react.legacy_hidden");
      }
      var enableScopeAPI = !1;
      function isValidElementType(type5) {
        return !!(typeof type5 == "string" || typeof type5 == "function" || type5 === REACT_FRAGMENT_TYPE || type5 === REACT_PROFILER_TYPE || type5 === REACT_DEBUG_TRACING_MODE_TYPE || type5 === REACT_STRICT_MODE_TYPE || type5 === REACT_SUSPENSE_TYPE || type5 === REACT_SUSPENSE_LIST_TYPE || type5 === REACT_LEGACY_HIDDEN_TYPE || enableScopeAPI || typeof type5 == "object" && type5 !== null && (type5.$$typeof === REACT_LAZY_TYPE || type5.$$typeof === REACT_MEMO_TYPE || type5.$$typeof === REACT_PROVIDER_TYPE || type5.$$typeof === REACT_CONTEXT_TYPE || type5.$$typeof === REACT_FORWARD_REF_TYPE || type5.$$typeof === REACT_FUNDAMENTAL_TYPE || type5.$$typeof === REACT_BLOCK_TYPE || type5[0] === REACT_SERVER_BLOCK_TYPE));
      }
      function typeOf(object) {
        if (typeof object == "object" && object !== null) {
          var $$typeof = object.$$typeof;
          switch ($$typeof) {
            case REACT_ELEMENT_TYPE:
              var type5 = object.type;
              switch (type5) {
                case REACT_FRAGMENT_TYPE:
                case REACT_PROFILER_TYPE:
                case REACT_STRICT_MODE_TYPE:
                case REACT_SUSPENSE_TYPE:
                case REACT_SUSPENSE_LIST_TYPE:
                  return type5;
                default:
                  var $$typeofType = type5 && type5.$$typeof;
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
      var ContextConsumer = REACT_CONTEXT_TYPE, ContextProvider = REACT_PROVIDER_TYPE, Element = REACT_ELEMENT_TYPE, ForwardRef = REACT_FORWARD_REF_TYPE, Fragment = REACT_FRAGMENT_TYPE, Lazy = REACT_LAZY_TYPE, Memo = REACT_MEMO_TYPE, Portal = REACT_PORTAL_TYPE, Profiler = REACT_PROFILER_TYPE, StrictMode = REACT_STRICT_MODE_TYPE, Suspense = REACT_SUSPENSE_TYPE, hasWarnedAboutDeprecatedIsAsyncMode = !1, hasWarnedAboutDeprecatedIsConcurrentMode = !1;
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
      function isElement5(object) {
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
      exports.ContextConsumer = ContextConsumer, exports.ContextProvider = ContextProvider, exports.Element = Element, exports.ForwardRef = ForwardRef, exports.Fragment = Fragment, exports.Lazy = Lazy, exports.Memo = Memo, exports.Portal = Portal, exports.Profiler = Profiler, exports.StrictMode = StrictMode, exports.Suspense = Suspense, exports.isAsyncMode = isAsyncMode, exports.isConcurrentMode = isConcurrentMode, exports.isContextConsumer = isContextConsumer, exports.isContextProvider = isContextProvider, exports.isElement = isElement5, exports.isForwardRef = isForwardRef, exports.isFragment = isFragment, exports.isLazy = isLazy, exports.isMemo = isMemo, exports.isPortal = isPortal, exports.isProfiler = isProfiler, exports.isStrictMode = isStrictMode, exports.isSuspense = isSuspense, exports.isValidElementType = isValidElementType, exports.typeOf = typeOf;
    })();
  }
});

// ../node_modules/pretty-format/node_modules/react-is/index.js
var require_react_is = __commonJS({
  "../node_modules/pretty-format/node_modules/react-is/index.js"(exports, module2) {
    "use strict";
    process.env.NODE_ENV === "production" ? module2.exports = require_react_is_production_min() : module2.exports = require_react_is_development();
  }
});

// ../node_modules/pretty-format/build/plugins/ReactElement.js
var require_ReactElement = __commonJS({
  "../node_modules/pretty-format/build/plugins/ReactElement.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var ReactIs = _interopRequireWildcard(require_react_is()), _markup = require_markup();
    function _getRequireWildcardCache(nodeInterop) {
      if (typeof WeakMap != "function") return null;
      var cacheBabelInterop = /* @__PURE__ */ new WeakMap(), cacheNodeInterop = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(nodeInterop2) {
        return nodeInterop2 ? cacheNodeInterop : cacheBabelInterop;
      })(nodeInterop);
    }
    function _interopRequireWildcard(obj, nodeInterop) {
      if (!nodeInterop && obj && obj.__esModule)
        return obj;
      if (obj === null || typeof obj != "object" && typeof obj != "function")
        return { default: obj };
      var cache = _getRequireWildcardCache(nodeInterop);
      if (cache && cache.has(obj))
        return cache.get(obj);
      var newObj = {}, hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var key in obj)
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
          desc && (desc.get || desc.set) ? Object.defineProperty(newObj, key, desc) : newObj[key] = obj[key];
        }
      return newObj.default = obj, cache && cache.set(obj, newObj), newObj;
    }
    var getChildren = (arg, children = []) => (Array.isArray(arg) ? arg.forEach((item) => {
      getChildren(item, children);
    }) : arg != null && arg !== !1 && children.push(arg), children), getType2 = (element) => {
      let type5 = element.type;
      if (typeof type5 == "string")
        return type5;
      if (typeof type5 == "function")
        return type5.displayName || type5.name || "Unknown";
      if (ReactIs.isFragment(element))
        return "React.Fragment";
      if (ReactIs.isSuspense(element))
        return "React.Suspense";
      if (typeof type5 == "object" && type5 !== null) {
        if (ReactIs.isContextProvider(element))
          return "Context.Provider";
        if (ReactIs.isContextConsumer(element))
          return "Context.Consumer";
        if (ReactIs.isForwardRef(element)) {
          if (type5.displayName)
            return type5.displayName;
          let functionName = type5.render.displayName || type5.render.name || "";
          return functionName !== "" ? "ForwardRef(" + functionName + ")" : "ForwardRef";
        }
        if (ReactIs.isMemo(element)) {
          let functionName = type5.displayName || type5.type.displayName || type5.type.name || "";
          return functionName !== "" ? "Memo(" + functionName + ")" : "Memo";
        }
      }
      return "UNDEFINED";
    }, getPropKeys = (element) => {
      let { props } = element;
      return Object.keys(props).filter((key) => key !== "children" && props[key] !== void 0).sort();
    }, serialize = (element, config3, indentation, depth, refs, printer) => ++depth > config3.maxDepth ? (0, _markup.printElementAsLeaf)(getType2(element), config3) : (0, _markup.printElement)(
      getType2(element),
      (0, _markup.printProps)(
        getPropKeys(element),
        element.props,
        config3,
        indentation + config3.indent,
        depth,
        refs,
        printer
      ),
      (0, _markup.printChildren)(
        getChildren(element.props.children),
        config3,
        indentation + config3.indent,
        depth,
        refs,
        printer
      ),
      config3,
      indentation
    );
    exports.serialize = serialize;
    var test2 = (val) => val != null && ReactIs.isElement(val);
    exports.test = test2;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/build/plugins/ReactTestComponent.js
var require_ReactTestComponent = __commonJS({
  "../node_modules/pretty-format/build/plugins/ReactTestComponent.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.test = exports.serialize = exports.default = void 0;
    var _markup = require_markup(), global2 = (function() {
      return typeof globalThis < "u" ? globalThis : typeof global2 < "u" ? global2 : typeof self < "u" ? self : typeof window < "u" ? window : Function("return this")();
    })(), Symbol2 = global2["jest-symbol-do-not-touch"] || global2.Symbol, testSymbol = typeof Symbol2 == "function" && Symbol2.for ? Symbol2.for("react.test.json") : 245830487, getPropKeys = (object) => {
      let { props } = object;
      return props ? Object.keys(props).filter((key) => props[key] !== void 0).sort() : [];
    }, serialize = (object, config3, indentation, depth, refs, printer) => ++depth > config3.maxDepth ? (0, _markup.printElementAsLeaf)(object.type, config3) : (0, _markup.printElement)(
      object.type,
      object.props ? (0, _markup.printProps)(
        getPropKeys(object),
        object.props,
        config3,
        indentation + config3.indent,
        depth,
        refs,
        printer
      ) : "",
      object.children ? (0, _markup.printChildren)(
        object.children,
        config3,
        indentation + config3.indent,
        depth,
        refs,
        printer
      ) : "",
      config3,
      indentation
    );
    exports.serialize = serialize;
    var test2 = (val) => val && val.$$typeof === testSymbol;
    exports.test = test2;
    var plugin = {
      serialize,
      test: test2
    }, _default = plugin;
    exports.default = _default;
  }
});

// ../node_modules/pretty-format/build/index.js
var require_build = __commonJS({
  "../node_modules/pretty-format/build/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    });
    exports.default = exports.DEFAULT_OPTIONS = void 0;
    exports.format = format3;
    exports.plugins = void 0;
    var _ansiStyles = _interopRequireDefault(require_ansi_styles()), _collections = require_collections(), _AsymmetricMatcher = _interopRequireDefault(
      require_AsymmetricMatcher()
    ), _ConvertAnsi = _interopRequireDefault(require_ConvertAnsi()), _DOMCollection = _interopRequireDefault(require_DOMCollection()), _DOMElement = _interopRequireDefault(require_DOMElement()), _Immutable = _interopRequireDefault(require_Immutable()), _ReactElement = _interopRequireDefault(require_ReactElement()), _ReactTestComponent = _interopRequireDefault(
      require_ReactTestComponent()
    );
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var toString2 = Object.prototype.toString, toISOString = Date.prototype.toISOString, errorToString = Error.prototype.toString, regExpToString = RegExp.prototype.toString, getConstructorName2 = (val) => typeof val.constructor == "function" && val.constructor.name || "Object", isWindow = (val) => typeof window < "u" && val === window, SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/, NEWLINE_REGEXP = /\n/gi, PrettyFormatPluginError = class extends Error {
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
      return printFunctionName ? "[Function " + (val.name || "anonymous") + "]" : "[Function]";
    }
    function printSymbol(val) {
      return String(val).replace(SYMBOL_REGEXP, "Symbol($1)");
    }
    function printError(val) {
      return "[" + errorToString.call(val) + "]";
    }
    function printBasicValue(val, printFunctionName, escapeRegex, escapeString) {
      if (val === !0 || val === !1)
        return "" + val;
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
        return escapeString ? '"' + val.replace(/"|\\/g, "\\$&") + '"' : '"' + val + '"';
      if (typeOf === "function")
        return printFunction(val, printFunctionName);
      if (typeOf === "symbol")
        return printSymbol(val);
      let toStringed = toString2.call(val);
      return toStringed === "[object WeakMap]" ? "WeakMap {}" : toStringed === "[object WeakSet]" ? "WeakSet {}" : toStringed === "[object Function]" || toStringed === "[object GeneratorFunction]" ? printFunction(val, printFunctionName) : toStringed === "[object Symbol]" ? printSymbol(val) : toStringed === "[object Date]" ? isNaN(+val) ? "Date { NaN }" : toISOString.call(val) : toStringed === "[object Error]" ? printError(val) : toStringed === "[object RegExp]" ? escapeRegex ? regExpToString.call(val).replace(/[\\^$*+?.()|[\]{}]/g, "\\$&") : regExpToString.call(val) : val instanceof Error ? printError(val) : null;
    }
    function printComplexValue(val, config3, indentation, depth, refs, hasCalledToJSON) {
      if (refs.indexOf(val) !== -1)
        return "[Circular]";
      refs = refs.slice(), refs.push(val);
      let hitMaxDepth = ++depth > config3.maxDepth, min = config3.min;
      if (config3.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON == "function" && !hasCalledToJSON)
        return printer(val.toJSON(), config3, indentation, depth, refs, !0);
      let toStringed = toString2.call(val);
      return toStringed === "[object Arguments]" ? hitMaxDepth ? "[Arguments]" : (min ? "" : "Arguments ") + "[" + (0, _collections.printListItems)(
        val,
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "]" : isToStringedArrayType(toStringed) ? hitMaxDepth ? "[" + val.constructor.name + "]" : (min || !config3.printBasicPrototype && val.constructor.name === "Array" ? "" : val.constructor.name + " ") + "[" + (0, _collections.printListItems)(
        val,
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "]" : toStringed === "[object Map]" ? hitMaxDepth ? "[Map]" : "Map {" + (0, _collections.printIteratorEntries)(
        val.entries(),
        config3,
        indentation,
        depth,
        refs,
        printer,
        " => "
      ) + "}" : toStringed === "[object Set]" ? hitMaxDepth ? "[Set]" : "Set {" + (0, _collections.printIteratorValues)(
        val.values(),
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "}" : hitMaxDepth || isWindow(val) ? "[" + getConstructorName2(val) + "]" : (min || !config3.printBasicPrototype && getConstructorName2(val) === "Object" ? "" : getConstructorName2(val) + " ") + "{" + (0, _collections.printObjectProperties)(
        val,
        config3,
        indentation,
        depth,
        refs,
        printer
      ) + "}";
    }
    function isNewPlugin(plugin) {
      return plugin.serialize != null;
    }
    function printPlugin(plugin, val, config3, indentation, depth, refs) {
      let printed;
      try {
        printed = isNewPlugin(plugin) ? plugin.serialize(val, config3, indentation, depth, refs, printer) : plugin.print(
          val,
          (valChild) => printer(valChild, config3, indentation, depth, refs),
          (str) => {
            let indentationNext = indentation + config3.indent;
            return indentationNext + str.replace(NEWLINE_REGEXP, `
` + indentationNext);
          },
          {
            edgeSpacing: config3.spacingOuter,
            min: config3.min,
            spacing: config3.spacingInner
          },
          config3.colors
        );
      } catch (error) {
        throw new PrettyFormatPluginError(error.message, error.stack);
      }
      if (typeof printed != "string")
        throw new Error(
          `pretty-format: Plugin must return type "string" but instead returned "${typeof printed}".`
        );
      return printed;
    }
    function findPlugin(plugins3, val) {
      for (let p = 0; p < plugins3.length; p++)
        try {
          if (plugins3[p].test(val))
            return plugins3[p];
        } catch (error) {
          throw new PrettyFormatPluginError(error.message, error.stack);
        }
      return null;
    }
    function printer(val, config3, indentation, depth, refs, hasCalledToJSON) {
      let plugin = findPlugin(config3.plugins, val);
      if (plugin !== null)
        return printPlugin(plugin, val, config3, indentation, depth, refs);
      let basicResult = printBasicValue(
        val,
        config3.printFunctionName,
        config3.escapeRegex,
        config3.escapeString
      );
      return basicResult !== null ? basicResult : printComplexValue(
        val,
        config3,
        indentation,
        depth,
        refs,
        hasCalledToJSON
      );
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
      maxDepth: 1 / 0,
      min: !1,
      plugins: [],
      printBasicPrototype: !0,
      printFunctionName: !0,
      theme: DEFAULT_THEME
    };
    exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
    function validateOptions(options) {
      if (Object.keys(options).forEach((key) => {
        if (!DEFAULT_OPTIONS.hasOwnProperty(key))
          throw new Error(`pretty-format: Unknown option "${key}".`);
      }), options.min && options.indent !== void 0 && options.indent !== 0)
        throw new Error(
          'pretty-format: Options "min" and "indent" cannot be used together.'
        );
      if (options.theme !== void 0) {
        if (options.theme === null)
          throw new Error('pretty-format: Option "theme" must not be null.');
        if (typeof options.theme != "object")
          throw new Error(
            `pretty-format: Option "theme" must be of type "object" but instead received "${typeof options.theme}".`
          );
      }
    }
    var getColorsHighlight = (options) => DEFAULT_THEME_KEYS.reduce((colors, key) => {
      let value = options.theme && options.theme[key] !== void 0 ? options.theme[key] : DEFAULT_THEME[key], color = value && _ansiStyles.default[value];
      if (color && typeof color.close == "string" && typeof color.open == "string")
        colors[key] = color;
      else
        throw new Error(
          `pretty-format: Option "theme" has a key "${key}" whose value "${value}" is undefined in ansi-styles.`
        );
      return colors;
    }, /* @__PURE__ */ Object.create(null)), getColorsEmpty = () => DEFAULT_THEME_KEYS.reduce((colors, key) => (colors[key] = {
      close: "",
      open: ""
    }, colors), /* @__PURE__ */ Object.create(null)), getPrintFunctionName = (options) => options && options.printFunctionName !== void 0 ? options.printFunctionName : DEFAULT_OPTIONS.printFunctionName, getEscapeRegex = (options) => options && options.escapeRegex !== void 0 ? options.escapeRegex : DEFAULT_OPTIONS.escapeRegex, getEscapeString = (options) => options && options.escapeString !== void 0 ? options.escapeString : DEFAULT_OPTIONS.escapeString, getConfig3 = (options) => {
      var _options$printBasicPr;
      return {
        callToJSON: options && options.callToJSON !== void 0 ? options.callToJSON : DEFAULT_OPTIONS.callToJSON,
        colors: options && options.highlight ? getColorsHighlight(options) : getColorsEmpty(),
        compareKeys: options && typeof options.compareKeys == "function" ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
        escapeRegex: getEscapeRegex(options),
        escapeString: getEscapeString(options),
        indent: options && options.min ? "" : createIndent(
          options && options.indent !== void 0 ? options.indent : DEFAULT_OPTIONS.indent
        ),
        maxDepth: options && options.maxDepth !== void 0 ? options.maxDepth : DEFAULT_OPTIONS.maxDepth,
        min: options && options.min !== void 0 ? options.min : DEFAULT_OPTIONS.min,
        plugins: options && options.plugins !== void 0 ? options.plugins : DEFAULT_OPTIONS.plugins,
        printBasicPrototype: (_options$printBasicPr = options?.printBasicPrototype) !== null && _options$printBasicPr !== void 0 ? _options$printBasicPr : !0,
        printFunctionName: getPrintFunctionName(options),
        spacingInner: options && options.min ? " " : `
`,
        spacingOuter: options && options.min ? "" : `
`
      };
    };
    function createIndent(indent) {
      return new Array(indent + 1).join(" ");
    }
    function format3(val, options) {
      if (options && (validateOptions(options), options.plugins)) {
        let plugin = findPlugin(options.plugins, val);
        if (plugin !== null)
          return printPlugin(plugin, val, getConfig3(options), "", 0, []);
      }
      let basicResult = printBasicValue(
        val,
        getPrintFunctionName(options),
        getEscapeRegex(options),
        getEscapeString(options)
      );
      return basicResult !== null ? basicResult : printComplexValue(val, getConfig3(options), "", 0, []);
    }
    var plugins2 = {
      AsymmetricMatcher: _AsymmetricMatcher.default,
      ConvertAnsi: _ConvertAnsi.default,
      DOMCollection: _DOMCollection.default,
      DOMElement: _DOMElement.default,
      Immutable: _Immutable.default,
      ReactElement: _ReactElement.default,
      ReactTestComponent: _ReactTestComponent.default
    };
    exports.plugins = plugins2;
    var _default = format3;
    exports.default = _default;
  }
});

// ../node_modules/lz-string/libs/lz-string.js
var require_lz_string = __commonJS({
  "../node_modules/lz-string/libs/lz-string.js"(exports, module2) {
    var LZString = (function() {
      var f3 = String.fromCharCode, keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$", baseReverseDic = {};
      function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
          baseReverseDic[alphabet] = {};
          for (var i2 = 0; i2 < alphabet.length; i2++)
            baseReverseDic[alphabet][alphabet.charAt(i2)] = i2;
        }
        return baseReverseDic[alphabet][character];
      }
      var LZString2 = {
        compressToBase64: function(input2) {
          if (input2 == null) return "";
          var res = LZString2._compress(input2, 6, function(a) {
            return keyStrBase64.charAt(a);
          });
          switch (res.length % 4) {
            // To produce valid Base64
            default:
            // When could this happen ?
            case 0:
              return res;
            case 1:
              return res + "===";
            case 2:
              return res + "==";
            case 3:
              return res + "=";
          }
        },
        decompressFromBase64: function(input2) {
          return input2 == null ? "" : input2 == "" ? null : LZString2._decompress(input2.length, 32, function(index) {
            return getBaseValue(keyStrBase64, input2.charAt(index));
          });
        },
        compressToUTF16: function(input2) {
          return input2 == null ? "" : LZString2._compress(input2, 15, function(a) {
            return f3(a + 32);
          }) + " ";
        },
        decompressFromUTF16: function(compressed) {
          return compressed == null ? "" : compressed == "" ? null : LZString2._decompress(compressed.length, 16384, function(index) {
            return compressed.charCodeAt(index) - 32;
          });
        },
        //compress into uint8array (UCS-2 big endian format)
        compressToUint8Array: function(uncompressed) {
          for (var compressed = LZString2.compress(uncompressed), buf = new Uint8Array(compressed.length * 2), i2 = 0, TotalLen = compressed.length; i2 < TotalLen; i2++) {
            var current_value = compressed.charCodeAt(i2);
            buf[i2 * 2] = current_value >>> 8, buf[i2 * 2 + 1] = current_value % 256;
          }
          return buf;
        },
        //decompress from uint8array (UCS-2 big endian format)
        decompressFromUint8Array: function(compressed) {
          if (compressed == null)
            return LZString2.decompress(compressed);
          for (var buf = new Array(compressed.length / 2), i2 = 0, TotalLen = buf.length; i2 < TotalLen; i2++)
            buf[i2] = compressed[i2 * 2] * 256 + compressed[i2 * 2 + 1];
          var result = [];
          return buf.forEach(function(c2) {
            result.push(f3(c2));
          }), LZString2.decompress(result.join(""));
        },
        //compress into a string that is already URI encoded
        compressToEncodedURIComponent: function(input2) {
          return input2 == null ? "" : LZString2._compress(input2, 6, function(a) {
            return keyStrUriSafe.charAt(a);
          });
        },
        //decompress from an output of compressToEncodedURIComponent
        decompressFromEncodedURIComponent: function(input2) {
          return input2 == null ? "" : input2 == "" ? null : (input2 = input2.replace(/ /g, "+"), LZString2._decompress(input2.length, 32, function(index) {
            return getBaseValue(keyStrUriSafe, input2.charAt(index));
          }));
        },
        compress: function(uncompressed) {
          return LZString2._compress(uncompressed, 16, function(a) {
            return f3(a);
          });
        },
        _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
          if (uncompressed == null) return "";
          var i2, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
          for (ii = 0; ii < uncompressed.length; ii += 1)
            if (context_c = uncompressed.charAt(ii), Object.prototype.hasOwnProperty.call(context_dictionary, context_c) || (context_dictionary[context_c] = context_dictSize++, context_dictionaryToCreate[context_c] = !0), context_wc = context_w + context_c, Object.prototype.hasOwnProperty.call(context_dictionary, context_wc))
              context_w = context_wc;
            else {
              if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                  for (i2 = 0; i2 < context_numBits; i2++)
                    context_data_val = context_data_val << 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++;
                  for (value = context_w.charCodeAt(0), i2 = 0; i2 < 8; i2++)
                    context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
                } else {
                  for (value = 1, i2 = 0; i2 < context_numBits; i2++)
                    context_data_val = context_data_val << 1 | value, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = 0;
                  for (value = context_w.charCodeAt(0), i2 = 0; i2 < 16; i2++)
                    context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
                }
                context_enlargeIn--, context_enlargeIn == 0 && (context_enlargeIn = Math.pow(2, context_numBits), context_numBits++), delete context_dictionaryToCreate[context_w];
              } else
                for (value = context_dictionary[context_w], i2 = 0; i2 < context_numBits; i2++)
                  context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
              context_enlargeIn--, context_enlargeIn == 0 && (context_enlargeIn = Math.pow(2, context_numBits), context_numBits++), context_dictionary[context_wc] = context_dictSize++, context_w = String(context_c);
            }
          if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
              if (context_w.charCodeAt(0) < 256) {
                for (i2 = 0; i2 < context_numBits; i2++)
                  context_data_val = context_data_val << 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++;
                for (value = context_w.charCodeAt(0), i2 = 0; i2 < 8; i2++)
                  context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
              } else {
                for (value = 1, i2 = 0; i2 < context_numBits; i2++)
                  context_data_val = context_data_val << 1 | value, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = 0;
                for (value = context_w.charCodeAt(0), i2 = 0; i2 < 16; i2++)
                  context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
              }
              context_enlargeIn--, context_enlargeIn == 0 && (context_enlargeIn = Math.pow(2, context_numBits), context_numBits++), delete context_dictionaryToCreate[context_w];
            } else
              for (value = context_dictionary[context_w], i2 = 0; i2 < context_numBits; i2++)
                context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
            context_enlargeIn--, context_enlargeIn == 0 && (context_enlargeIn = Math.pow(2, context_numBits), context_numBits++);
          }
          for (value = 2, i2 = 0; i2 < context_numBits; i2++)
            context_data_val = context_data_val << 1 | value & 1, context_data_position == bitsPerChar - 1 ? (context_data_position = 0, context_data.push(getCharFromInt(context_data_val)), context_data_val = 0) : context_data_position++, value = value >> 1;
          for (; ; )
            if (context_data_val = context_data_val << 1, context_data_position == bitsPerChar - 1) {
              context_data.push(getCharFromInt(context_data_val));
              break;
            } else context_data_position++;
          return context_data.join("");
        },
        decompress: function(compressed) {
          return compressed == null ? "" : compressed == "" ? null : LZString2._decompress(compressed.length, 32768, function(index) {
            return compressed.charCodeAt(index);
          });
        },
        _decompress: function(length, resetValue, getNextValue) {
          var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i2, w2, bits, resb, maxpower, power, c2, data = { val: getNextValue(0), position: resetValue, index: 1 };
          for (i2 = 0; i2 < 3; i2 += 1)
            dictionary[i2] = i2;
          for (bits = 0, maxpower = Math.pow(2, 2), power = 1; power != maxpower; )
            resb = data.val & data.position, data.position >>= 1, data.position == 0 && (data.position = resetValue, data.val = getNextValue(data.index++)), bits |= (resb > 0 ? 1 : 0) * power, power <<= 1;
          switch (next = bits) {
            case 0:
              for (bits = 0, maxpower = Math.pow(2, 8), power = 1; power != maxpower; )
                resb = data.val & data.position, data.position >>= 1, data.position == 0 && (data.position = resetValue, data.val = getNextValue(data.index++)), bits |= (resb > 0 ? 1 : 0) * power, power <<= 1;
              c2 = f3(bits);
              break;
            case 1:
              for (bits = 0, maxpower = Math.pow(2, 16), power = 1; power != maxpower; )
                resb = data.val & data.position, data.position >>= 1, data.position == 0 && (data.position = resetValue, data.val = getNextValue(data.index++)), bits |= (resb > 0 ? 1 : 0) * power, power <<= 1;
              c2 = f3(bits);
              break;
            case 2:
              return "";
          }
          for (dictionary[3] = c2, w2 = c2, result.push(c2); ; ) {
            if (data.index > length)
              return "";
            for (bits = 0, maxpower = Math.pow(2, numBits), power = 1; power != maxpower; )
              resb = data.val & data.position, data.position >>= 1, data.position == 0 && (data.position = resetValue, data.val = getNextValue(data.index++)), bits |= (resb > 0 ? 1 : 0) * power, power <<= 1;
            switch (c2 = bits) {
              case 0:
                for (bits = 0, maxpower = Math.pow(2, 8), power = 1; power != maxpower; )
                  resb = data.val & data.position, data.position >>= 1, data.position == 0 && (data.position = resetValue, data.val = getNextValue(data.index++)), bits |= (resb > 0 ? 1 : 0) * power, power <<= 1;
                dictionary[dictSize++] = f3(bits), c2 = dictSize - 1, enlargeIn--;
                break;
              case 1:
                for (bits = 0, maxpower = Math.pow(2, 16), power = 1; power != maxpower; )
                  resb = data.val & data.position, data.position >>= 1, data.position == 0 && (data.position = resetValue, data.val = getNextValue(data.index++)), bits |= (resb > 0 ? 1 : 0) * power, power <<= 1;
                dictionary[dictSize++] = f3(bits), c2 = dictSize - 1, enlargeIn--;
                break;
              case 2:
                return result.join("");
            }
            if (enlargeIn == 0 && (enlargeIn = Math.pow(2, numBits), numBits++), dictionary[c2])
              entry = dictionary[c2];
            else if (c2 === dictSize)
              entry = w2 + w2.charAt(0);
            else
              return null;
            result.push(entry), dictionary[dictSize++] = w2 + entry.charAt(0), enlargeIn--, w2 = entry, enlargeIn == 0 && (enlargeIn = Math.pow(2, numBits), numBits++);
          }
        }
      };
      return LZString2;
    })();
    typeof define == "function" && define.amd ? define(function() {
      return LZString;
    }) : typeof module2 < "u" && module2 != null ? module2.exports = LZString : typeof angular < "u" && angular != null && angular.module("LZString", []).factory("LZString", function() {
      return LZString;
    });
  }
});

// src/test/index.ts
import { instrument as instrument2 } from "storybook/internal/instrumenter";

// ../node_modules/chai/index.js
var __defProp = Object.defineProperty, __name = (target, value) => __defProp(target, "name", { value, configurable: !0 }), __export2 = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
}, utils_exports = {};
__export2(utils_exports, {
  addChainableMethod: () => addChainableMethod,
  addLengthGuard: () => addLengthGuard,
  addMethod: () => addMethod,
  addProperty: () => addProperty,
  checkError: () => check_error_exports,
  compareByInspect: () => compareByInspect,
  eql: () => deep_eql_default,
  expectTypes: () => expectTypes,
  flag: () => flag,
  getActual: () => getActual,
  getMessage: () => getMessage2,
  getName: () => getName,
  getOperator: () => getOperator,
  getOwnEnumerableProperties: () => getOwnEnumerableProperties,
  getOwnEnumerablePropertySymbols: () => getOwnEnumerablePropertySymbols,
  getPathInfo: () => getPathInfo,
  hasProperty: () => hasProperty,
  inspect: () => inspect2,
  isNaN: () => isNaN22,
  isNumeric: () => isNumeric,
  isProxyEnabled: () => isProxyEnabled,
  isRegExp: () => isRegExp2,
  objDisplay: () => objDisplay,
  overwriteChainableMethod: () => overwriteChainableMethod,
  overwriteMethod: () => overwriteMethod,
  overwriteProperty: () => overwriteProperty,
  proxify: () => proxify,
  test: () => test,
  transferFlags: () => transferFlags,
  type: () => type
});
var check_error_exports = {};
__export2(check_error_exports, {
  compatibleConstructor: () => compatibleConstructor,
  compatibleInstance: () => compatibleInstance,
  compatibleMessage: () => compatibleMessage,
  getConstructorName: () => getConstructorName,
  getMessage: () => getMessage
});
function isErrorInstance(obj) {
  return obj instanceof Error || Object.prototype.toString.call(obj) === "[object Error]";
}
__name(isErrorInstance, "isErrorInstance");
function isRegExp(obj) {
  return Object.prototype.toString.call(obj) === "[object RegExp]";
}
__name(isRegExp, "isRegExp");
function compatibleInstance(thrown, errorLike) {
  return isErrorInstance(errorLike) && thrown === errorLike;
}
__name(compatibleInstance, "compatibleInstance");
function compatibleConstructor(thrown, errorLike) {
  return isErrorInstance(errorLike) ? thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor : (typeof errorLike == "object" || typeof errorLike == "function") && errorLike.prototype ? thrown.constructor === errorLike || thrown instanceof errorLike : !1;
}
__name(compatibleConstructor, "compatibleConstructor");
function compatibleMessage(thrown, errMatcher) {
  let comparisonString = typeof thrown == "string" ? thrown : thrown.message;
  return isRegExp(errMatcher) ? errMatcher.test(comparisonString) : typeof errMatcher == "string" ? comparisonString.indexOf(errMatcher) !== -1 : !1;
}
__name(compatibleMessage, "compatibleMessage");
function getConstructorName(errorLike) {
  let constructorName = errorLike;
  return isErrorInstance(errorLike) ? constructorName = errorLike.constructor.name : typeof errorLike == "function" && (constructorName = errorLike.name, constructorName === "" && (constructorName = new errorLike().name || constructorName)), constructorName;
}
__name(getConstructorName, "getConstructorName");
function getMessage(errorLike) {
  let msg = "";
  return errorLike && errorLike.message ? msg = errorLike.message : typeof errorLike == "string" && (msg = errorLike), msg;
}
__name(getMessage, "getMessage");
function flag(obj, key, value) {
  let flags = obj.__flags || (obj.__flags = /* @__PURE__ */ Object.create(null));
  if (arguments.length === 3)
    flags[key] = value;
  else
    return flags[key];
}
__name(flag, "flag");
function test(obj, args) {
  let negate = flag(obj, "negate"), expr = args[0];
  return negate ? !expr : expr;
}
__name(test, "test");
function type(obj) {
  if (typeof obj > "u")
    return "undefined";
  if (obj === null)
    return "null";
  let stringTag = obj[Symbol.toStringTag];
  return typeof stringTag == "string" ? stringTag : Object.prototype.toString.call(obj).slice(8, -1);
}
__name(type, "type");
var canElideFrames = "captureStackTrace" in Error, _a, AssertionError = (_a = class extends Error {
  message;
  get name() {
    return "AssertionError";
  }
  get ok() {
    return !1;
  }
  constructor(message = "Unspecified AssertionError", props, ssf) {
    super(message), this.message = message, canElideFrames && Error.captureStackTrace(this, ssf || _a);
    for (let key in props)
      key in this || (this[key] = props[key]);
  }
  toJSON(stack) {
    return {
      ...this,
      name: this.name,
      message: this.message,
      ok: !1,
      stack: stack !== !1 ? this.stack : void 0
    };
  }
}, __name(_a, "AssertionError"), _a);
function expectTypes(obj, types) {
  let flagMsg = flag(obj, "message"), ssfi = flag(obj, "ssfi");
  flagMsg = flagMsg ? flagMsg + ": " : "", obj = flag(obj, "object"), types = types.map(function(t2) {
    return t2.toLowerCase();
  }), types.sort();
  let str = types.map(function(t2, index) {
    let art = ~["a", "e", "i", "o", "u"].indexOf(t2.charAt(0)) ? "an" : "a";
    return (types.length > 1 && index === types.length - 1 ? "or " : "") + art + " " + t2;
  }).join(", "), objType = type(obj).toLowerCase();
  if (!types.some(function(expected) {
    return objType === expected;
  }))
    throw new AssertionError(
      flagMsg + "object tested must be " + str + ", but " + objType + " given",
      void 0,
      ssfi
    );
}
__name(expectTypes, "expectTypes");
function getActual(obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
}
__name(getActual, "getActual");
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
__name(colorise, "colorise");
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
} = {}, inspect32) {
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
    inspect: inspect32,
    stylize
  };
  return options.colors && (options.stylize = colorise), options;
}
__name(normaliseOptions, "normaliseOptions");
function isHighSurrogate(char) {
  return char >= "\uD800" && char <= "\uDBFF";
}
__name(isHighSurrogate, "isHighSurrogate");
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
__name(truncate, "truncate");
function inspectList(list, options, inspectItem, separator = ", ") {
  inspectItem = inspectItem || options.inspect;
  let size = list.length;
  if (size === 0)
    return "";
  let originalLength = options.truncate, output = "", peek = "", truncated = "";
  for (let i2 = 0; i2 < size; i2 += 1) {
    let last = i2 + 1 === list.length, secondToLast = i2 + 2 === list.length;
    truncated = `${truncator}(${list.length - i2})`;
    let value = list[i2];
    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
    let string = peek || inspectItem(value, options) + (last ? "" : separator), nextLength = output.length + string.length, truncatedLength = nextLength + truncated.length;
    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength || !last && !secondToLast && truncatedLength > originalLength || (peek = last ? "" : inspectItem(list[i2 + 1], options) + (secondToLast ? "" : separator), !last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength))
      break;
    if (output += string, !last && !secondToLast && nextLength + peek.length >= originalLength) {
      truncated = `${truncator}(${list.length - i2 - 1})`;
      break;
    }
    truncated = "";
  }
  return `${output}${truncated}`;
}
__name(inspectList, "inspectList");
function quoteComplexKey(key) {
  return key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/) ? key : JSON.stringify(key).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
__name(quoteComplexKey, "quoteComplexKey");
function inspectProperty([key, value], options) {
  return options.truncate -= 2, typeof key == "string" ? key = quoteComplexKey(key) : typeof key != "number" && (key = `[${options.inspect(key, options)}]`), options.truncate -= key.length, value = options.inspect(value, options), `${key}: ${value}`;
}
__name(inspectProperty, "inspectProperty");
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
__name(inspectArray, "inspectArray");
var getArrayName = __name((array) => typeof Buffer == "function" && array instanceof Buffer ? "Buffer" : array[Symbol.toStringTag] ? array[Symbol.toStringTag] : array.constructor.name, "getArrayName");
function inspectTypedArray(array, options) {
  let name = getArrayName(array);
  options.truncate -= name.length + 4;
  let nonIndexProperties = Object.keys(array).slice(array.length);
  if (!array.length && !nonIndexProperties.length)
    return `${name}[]`;
  let output = "";
  for (let i2 = 0; i2 < array.length; i2++) {
    let string = `${options.stylize(truncate(array[i2], options.truncate), "number")}${i2 === array.length - 1 ? "" : ", "}`;
    if (options.truncate -= string.length, array[i2] !== array.length && options.truncate <= 3) {
      output += `${truncator}(${array.length - array[i2] + 1})`;
      break;
    }
    output += string;
  }
  let propertyContents = "";
  return nonIndexProperties.length && (propertyContents = inspectList(nonIndexProperties.map((key) => [key, array[key]]), options, inspectProperty)), `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
__name(inspectTypedArray, "inspectTypedArray");
function inspectDate(dateObject, options) {
  let stringRepresentation = dateObject.toJSON();
  if (stringRepresentation === null)
    return "Invalid Date";
  let split = stringRepresentation.split("T"), date = split[0];
  return options.stylize(`${date}T${truncate(split[1], options.truncate - date.length - 1)}`, "date");
}
__name(inspectDate, "inspectDate");
function inspectFunction(func, options) {
  let functionType = func[Symbol.toStringTag] || "Function", name = func.name;
  return name ? options.stylize(`[${functionType} ${truncate(name, options.truncate - 11)}]`, "special") : options.stylize(`[${functionType}]`, "special");
}
__name(inspectFunction, "inspectFunction");
function inspectMapEntry([key, value], options) {
  return options.truncate -= 4, key = options.inspect(key, options), options.truncate -= key.length, value = options.inspect(value, options), `${key} => ${value}`;
}
__name(inspectMapEntry, "inspectMapEntry");
function mapToEntries(map) {
  let entries = [];
  return map.forEach((value, key) => {
    entries.push([key, value]);
  }), entries;
}
__name(mapToEntries, "mapToEntries");
function inspectMap(map, options) {
  return map.size === 0 ? "Map{}" : (options.truncate -= 7, `Map{ ${inspectList(mapToEntries(map), options, inspectMapEntry)} }`);
}
__name(inspectMap, "inspectMap");
var isNaN2 = Number.isNaN || ((i2) => i2 !== i2);
function inspectNumber(number, options) {
  return isNaN2(number) ? options.stylize("NaN", "number") : number === 1 / 0 ? options.stylize("Infinity", "number") : number === -1 / 0 ? options.stylize("-Infinity", "number") : number === 0 ? options.stylize(1 / number === 1 / 0 ? "+0" : "-0", "number") : options.stylize(truncate(String(number), options.truncate), "number");
}
__name(inspectNumber, "inspectNumber");
function inspectBigInt(number, options) {
  let nums = truncate(number.toString(), options.truncate - 1);
  return nums !== truncator && (nums += "n"), options.stylize(nums, "bigint");
}
__name(inspectBigInt, "inspectBigInt");
function inspectRegExp(value, options) {
  let flags = value.toString().split("/")[2], sourceLength = options.truncate - (2 + flags.length), source = value.source;
  return options.stylize(`/${truncate(source, sourceLength)}/${flags}`, "regexp");
}
__name(inspectRegExp, "inspectRegExp");
function arrayFromSet(set2) {
  let values = [];
  return set2.forEach((value) => {
    values.push(value);
  }), values;
}
__name(arrayFromSet, "arrayFromSet");
function inspectSet(set2, options) {
  return set2.size === 0 ? "Set{}" : (options.truncate -= 7, `Set{ ${inspectList(arrayFromSet(set2), options)} }`);
}
__name(inspectSet, "inspectSet");
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
__name(escape, "escape");
function inspectString(string, options) {
  return stringEscapeChars.test(string) && (string = string.replace(stringEscapeChars, escape)), options.stylize(`'${truncate(string, options.truncate - 2)}'`, "string");
}
__name(inspectString, "inspectString");
function inspectSymbol(value) {
  return "description" in Symbol.prototype ? value.description ? `Symbol(${value.description})` : "Symbol()" : value.toString();
}
__name(inspectSymbol, "inspectSymbol");
var getPromiseValue = __name(() => "Promise{\u2026}", "getPromiseValue"), promise_default = getPromiseValue;
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
__name(inspectObject, "inspectObject");
var toStringTag = typeof Symbol < "u" && Symbol.toStringTag ? Symbol.toStringTag : !1;
function inspectClass(value, options) {
  let name = "";
  return toStringTag && toStringTag in value && (name = value[toStringTag]), name = name || value.constructor.name, (!name || name === "_class") && (name = "<Anonymous Class>"), options.truncate -= name.length, `${name}${inspectObject(value, options)}`;
}
__name(inspectClass, "inspectClass");
function inspectArguments(args, options) {
  return args.length === 0 ? "Arguments[]" : (options.truncate -= 13, `Arguments[ ${inspectList(args, options)} ]`);
}
__name(inspectArguments, "inspectArguments");
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
__name(inspectObject2, "inspectObject");
function inspectAttribute([key, value], options) {
  return options.truncate -= 3, value ? `${options.stylize(String(key), "yellow")}=${options.stylize(`"${value}"`, "string")}` : `${options.stylize(String(key), "yellow")}`;
}
__name(inspectAttribute, "inspectAttribute");
function inspectNodeCollection(collection, options) {
  return inspectList(collection, options, inspectNode, `
`);
}
__name(inspectNodeCollection, "inspectNodeCollection");
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
__name(inspectNode, "inspectNode");
function inspectHTML(element, options) {
  let properties = element.getAttributeNames(), name = element.tagName.toLowerCase(), head = options.stylize(`<${name}`, "special"), headClose = options.stylize(">", "special"), tail = options.stylize(`</${name}>`, "special");
  options.truncate -= name.length * 2 + 5;
  let propertyContents = "";
  properties.length > 0 && (propertyContents += " ", propertyContents += inspectList(properties.map((key) => [key, element.getAttribute(key)]), options, inspectAttribute, " ")), options.truncate -= propertyContents.length;
  let truncate2 = options.truncate, children = inspectNodeCollection(element.children, options);
  return children && children.length > truncate2 && (children = `${truncator}(${element.children.length})`), `${head}${propertyContents}${headClose}${children}${tail}`;
}
__name(inspectHTML, "inspectHTML");
var symbolsSupported = typeof Symbol == "function" && typeof Symbol.for == "function", chaiInspect = symbolsSupported ? Symbol.for("chai/inspect") : "@@chai/inspect", nodeInspect = Symbol.for("nodejs.util.inspect.custom"), constructorMap = /* @__PURE__ */ new WeakMap(), stringTagMap = {}, baseTypesMap = {
  undefined: __name((value, options) => options.stylize("undefined", "undefined"), "undefined"),
  null: __name((value, options) => options.stylize("null", "null"), "null"),
  boolean: __name((value, options) => options.stylize(String(value), "boolean"), "boolean"),
  Boolean: __name((value, options) => options.stylize(String(value), "boolean"), "Boolean"),
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
  WeakSet: __name((value, options) => options.stylize("WeakSet{\u2026}", "special"), "WeakSet"),
  WeakMap: __name((value, options) => options.stylize("WeakMap{\u2026}", "special"), "WeakMap"),
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
  Generator: __name(() => "", "Generator"),
  DataView: __name(() => "", "DataView"),
  ArrayBuffer: __name(() => "", "ArrayBuffer"),
  Error: inspectObject2,
  HTMLCollection: inspectNodeCollection,
  NodeList: inspectNodeCollection
}, inspectCustom = __name((value, options, type32) => chaiInspect in value && typeof value[chaiInspect] == "function" ? value[chaiInspect](options) : nodeInspect in value && typeof value[nodeInspect] == "function" ? value[nodeInspect](options.depth, options) : "inspect" in value && typeof value.inspect == "function" ? value.inspect(options.depth, options) : "constructor" in value && constructorMap.has(value.constructor) ? constructorMap.get(value.constructor)(value, options) : stringTagMap[type32] ? stringTagMap[type32](value, options) : "", "inspectCustom"), toString = Object.prototype.toString;
function inspect(value, opts = {}) {
  let options = normaliseOptions(opts, inspect), { customInspect } = options, type32 = value === null ? "null" : typeof value;
  if (type32 === "object" && (type32 = toString.call(value).slice(8, -1)), type32 in baseTypesMap)
    return baseTypesMap[type32](value, options);
  if (customInspect && value) {
    let output = inspectCustom(value, options, type32);
    if (output)
      return typeof output == "string" ? output : inspect(output, options);
  }
  let proto = value ? Object.getPrototypeOf(value) : !1;
  return proto === Object.prototype || proto === null ? inspectObject(value, options) : value && typeof HTMLElement == "function" && value instanceof HTMLElement ? inspectHTML(value, options) : "constructor" in value ? value.constructor !== Object ? inspectClass(value, options) : inspectObject(value, options) : value === Object(value) ? inspectObject(value, options) : options.stylize(String(value), type32);
}
__name(inspect, "inspect");
var config = {
  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {boolean}
   * @public
   */
  includeStack: !1,
  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {boolean}
   * @public
   */
  showDiff: !0,
  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded, for
   * example for large data structures, the value is replaced with something
   * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   * This is especially userful when doing assertions on arrays: having this
   * set to a reasonable large value makes the failure messages readily
   * inspectable.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {number}
   * @public
   */
  truncateThreshold: 40,
  /**
   * ### config.useProxy
   *
   * User configurable property, defines if chai will use a Proxy to throw
   * an error when a non-existent property is read, which protects users
   * from typos when using property-based assertions.
   *
   * Set it to false if you want to disable this feature.
   *
   *     chai.config.useProxy = false;  // disable use of Proxy
   *
   * This feature is automatically disabled regardless of this config value
   * in environments that don't support proxies.
   *
   * @param {boolean}
   * @public
   */
  useProxy: !0,
  /**
   * ### config.proxyExcludedKeys
   *
   * User configurable property, defines which properties should be ignored
   * instead of throwing an error if they do not exist on the assertion.
   * This is only applied if the environment Chai is running in supports proxies and
   * if the `useProxy` configuration setting is enabled.
   * By default, `then` and `inspect` will not throw an error if they do not exist on the
   * assertion object because the `.inspect` property is read by `util.inspect` (for example, when
   * using `console.log` on the assertion object) and `.then` is necessary for promise type-checking.
   *
   *     // By default these keys will not throw an error if they do not exist on the assertion object
   *     chai.config.proxyExcludedKeys = ['then', 'inspect'];
   *
   * @param {Array}
   * @public
   */
  proxyExcludedKeys: ["then", "catch", "inspect", "toJSON"],
  /**
   * ### config.deepEqual
   *
   * User configurable property, defines which a custom function to use for deepEqual
   * comparisons.
   * By default, the function used is the one from the `deep-eql` package without custom comparator.
   *
   *     // use a custom comparator
   *     chai.config.deepEqual = (expected, actual) => {
   *         return chai.util.eql(expected, actual, {
   *             comparator: (expected, actual) => {
   *                 // for non number comparison, use the default behavior
   *                 if(typeof expected !== 'number') return null;
   *                 // allow a difference of 10 between compared numbers
   *                 return typeof actual === 'number' && Math.abs(actual - expected) < 10
   *             }
   *         })
   *     };
   *
   * @param {Function}
   * @public
   */
  deepEqual: null
};
function inspect2(obj, showHidden, depth, colors) {
  let options = {
    colors,
    depth: typeof depth > "u" ? 2 : depth,
    showHidden,
    truncate: config.truncateThreshold ? config.truncateThreshold : 1 / 0
  };
  return inspect(obj, options);
}
__name(inspect2, "inspect");
function objDisplay(obj) {
  let str = inspect2(obj), type32 = Object.prototype.toString.call(obj);
  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type32 === "[object Function]")
      return !obj.name || obj.name === "" ? "[Function]" : "[Function: " + obj.name + "]";
    if (type32 === "[object Array]")
      return "[ Array(" + obj.length + ") ]";
    if (type32 === "[object Object]") {
      let keys2 = Object.keys(obj);
      return "{ Object (" + (keys2.length > 2 ? keys2.splice(0, 2).join(", ") + ", ..." : keys2.join(", ")) + ") }";
    } else
      return str;
  } else
    return str;
}
__name(objDisplay, "objDisplay");
function getMessage2(obj, args) {
  let negate = flag(obj, "negate"), val = flag(obj, "object"), expected = args[3], actual = getActual(obj, args), msg = negate ? args[2] : args[1], flagMsg = flag(obj, "message");
  return typeof msg == "function" && (msg = msg()), msg = msg || "", msg = msg.replace(/#\{this\}/g, function() {
    return objDisplay(val);
  }).replace(/#\{act\}/g, function() {
    return objDisplay(actual);
  }).replace(/#\{exp\}/g, function() {
    return objDisplay(expected);
  }), flagMsg ? flagMsg + ": " + msg : msg;
}
__name(getMessage2, "getMessage");
function transferFlags(assertion, object, includeAll) {
  let flags = assertion.__flags || (assertion.__flags = /* @__PURE__ */ Object.create(null));
  object.__flags || (object.__flags = /* @__PURE__ */ Object.create(null)), includeAll = arguments.length === 3 ? includeAll : !0;
  for (let flag3 in flags)
    (includeAll || flag3 !== "object" && flag3 !== "ssfi" && flag3 !== "lockSsfi" && flag3 != "message") && (object.__flags[flag3] = flags[flag3]);
}
__name(transferFlags, "transferFlags");
function type2(obj) {
  if (typeof obj > "u")
    return "undefined";
  if (obj === null)
    return "null";
  let stringTag = obj[Symbol.toStringTag];
  return typeof stringTag == "string" ? stringTag : Object.prototype.toString.call(obj).slice(8, -1);
}
__name(type2, "type");
function FakeMap() {
  this._key = "chai/deep-eql__" + Math.random() + Date.now();
}
__name(FakeMap, "FakeMap");
FakeMap.prototype = {
  get: __name(function(key) {
    return key[this._key];
  }, "get"),
  set: __name(function(key, value) {
    Object.isExtensible(key) && Object.defineProperty(key, this._key, {
      value,
      configurable: !0
    });
  }, "set")
};
var MemoizeMap = typeof WeakMap == "function" ? WeakMap : FakeMap;
function memoizeCompare(leftHandOperand, rightHandOperand, memoizeMap) {
  if (!memoizeMap || isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand))
    return null;
  var leftHandMap = memoizeMap.get(leftHandOperand);
  if (leftHandMap) {
    var result = leftHandMap.get(rightHandOperand);
    if (typeof result == "boolean")
      return result;
  }
  return null;
}
__name(memoizeCompare, "memoizeCompare");
function memoizeSet(leftHandOperand, rightHandOperand, memoizeMap, result) {
  if (!(!memoizeMap || isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand))) {
    var leftHandMap = memoizeMap.get(leftHandOperand);
    leftHandMap ? leftHandMap.set(rightHandOperand, result) : (leftHandMap = new MemoizeMap(), leftHandMap.set(rightHandOperand, result), memoizeMap.set(leftHandOperand, leftHandMap));
  }
}
__name(memoizeSet, "memoizeSet");
var deep_eql_default = deepEqual;
function deepEqual(leftHandOperand, rightHandOperand, options) {
  if (options && options.comparator)
    return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
  var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
  return simpleResult !== null ? simpleResult : extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
}
__name(deepEqual, "deepEqual");
function simpleEqual(leftHandOperand, rightHandOperand) {
  return leftHandOperand === rightHandOperand ? leftHandOperand !== 0 || 1 / leftHandOperand === 1 / rightHandOperand : leftHandOperand !== leftHandOperand && // eslint-disable-line no-self-compare
  rightHandOperand !== rightHandOperand ? !0 : isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand) ? !1 : null;
}
__name(simpleEqual, "simpleEqual");
function extensiveDeepEqual(leftHandOperand, rightHandOperand, options) {
  options = options || {}, options.memoize = options.memoize === !1 ? !1 : options.memoize || new MemoizeMap();
  var comparator = options && options.comparator, memoizeResultLeft = memoizeCompare(leftHandOperand, rightHandOperand, options.memoize);
  if (memoizeResultLeft !== null)
    return memoizeResultLeft;
  var memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);
  if (memoizeResultRight !== null)
    return memoizeResultRight;
  if (comparator) {
    var comparatorResult = comparator(leftHandOperand, rightHandOperand);
    if (comparatorResult === !1 || comparatorResult === !0)
      return memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult), comparatorResult;
    var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
    if (simpleResult !== null)
      return simpleResult;
  }
  var leftHandType = type2(leftHandOperand);
  if (leftHandType !== type2(rightHandOperand))
    return memoizeSet(leftHandOperand, rightHandOperand, options.memoize, !1), !1;
  memoizeSet(leftHandOperand, rightHandOperand, options.memoize, !0);
  var result = extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options);
  return memoizeSet(leftHandOperand, rightHandOperand, options.memoize, result), result;
}
__name(extensiveDeepEqual, "extensiveDeepEqual");
function extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options) {
  switch (leftHandType) {
    case "String":
    case "Number":
    case "Boolean":
    case "Date":
      return deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());
    case "Promise":
    case "Symbol":
    case "function":
    case "WeakMap":
    case "WeakSet":
      return leftHandOperand === rightHandOperand;
    case "Error":
      return keysEqual(leftHandOperand, rightHandOperand, ["name", "message", "code"], options);
    case "Arguments":
    case "Int8Array":
    case "Uint8Array":
    case "Uint8ClampedArray":
    case "Int16Array":
    case "Uint16Array":
    case "Int32Array":
    case "Uint32Array":
    case "Float32Array":
    case "Float64Array":
    case "Array":
      return iterableEqual(leftHandOperand, rightHandOperand, options);
    case "RegExp":
      return regexpEqual(leftHandOperand, rightHandOperand);
    case "Generator":
      return generatorEqual(leftHandOperand, rightHandOperand, options);
    case "DataView":
      return iterableEqual(new Uint8Array(leftHandOperand.buffer), new Uint8Array(rightHandOperand.buffer), options);
    case "ArrayBuffer":
      return iterableEqual(new Uint8Array(leftHandOperand), new Uint8Array(rightHandOperand), options);
    case "Set":
      return entriesEqual(leftHandOperand, rightHandOperand, options);
    case "Map":
      return entriesEqual(leftHandOperand, rightHandOperand, options);
    case "Temporal.PlainDate":
    case "Temporal.PlainTime":
    case "Temporal.PlainDateTime":
    case "Temporal.Instant":
    case "Temporal.ZonedDateTime":
    case "Temporal.PlainYearMonth":
    case "Temporal.PlainMonthDay":
      return leftHandOperand.equals(rightHandOperand);
    case "Temporal.Duration":
      return leftHandOperand.total("nanoseconds") === rightHandOperand.total("nanoseconds");
    case "Temporal.TimeZone":
    case "Temporal.Calendar":
      return leftHandOperand.toString() === rightHandOperand.toString();
    default:
      return objectEqual(leftHandOperand, rightHandOperand, options);
  }
}
__name(extensiveDeepEqualByType, "extensiveDeepEqualByType");
function regexpEqual(leftHandOperand, rightHandOperand) {
  return leftHandOperand.toString() === rightHandOperand.toString();
}
__name(regexpEqual, "regexpEqual");
function entriesEqual(leftHandOperand, rightHandOperand, options) {
  try {
    if (leftHandOperand.size !== rightHandOperand.size)
      return !1;
    if (leftHandOperand.size === 0)
      return !0;
  } catch {
    return !1;
  }
  var leftHandItems = [], rightHandItems = [];
  return leftHandOperand.forEach(__name(function(key, value) {
    leftHandItems.push([key, value]);
  }, "gatherEntries")), rightHandOperand.forEach(__name(function(key, value) {
    rightHandItems.push([key, value]);
  }, "gatherEntries")), iterableEqual(leftHandItems.sort(), rightHandItems.sort(), options);
}
__name(entriesEqual, "entriesEqual");
function iterableEqual(leftHandOperand, rightHandOperand, options) {
  var length = leftHandOperand.length;
  if (length !== rightHandOperand.length)
    return !1;
  if (length === 0)
    return !0;
  for (var index = -1; ++index < length; )
    if (deepEqual(leftHandOperand[index], rightHandOperand[index], options) === !1)
      return !1;
  return !0;
}
__name(iterableEqual, "iterableEqual");
function generatorEqual(leftHandOperand, rightHandOperand, options) {
  return iterableEqual(getGeneratorEntries(leftHandOperand), getGeneratorEntries(rightHandOperand), options);
}
__name(generatorEqual, "generatorEqual");
function hasIteratorFunction(target) {
  return typeof Symbol < "u" && typeof target == "object" && typeof Symbol.iterator < "u" && typeof target[Symbol.iterator] == "function";
}
__name(hasIteratorFunction, "hasIteratorFunction");
function getIteratorEntries(target) {
  if (hasIteratorFunction(target))
    try {
      return getGeneratorEntries(target[Symbol.iterator]());
    } catch {
      return [];
    }
  return [];
}
__name(getIteratorEntries, "getIteratorEntries");
function getGeneratorEntries(generator) {
  for (var generatorResult = generator.next(), accumulator = [generatorResult.value]; generatorResult.done === !1; )
    generatorResult = generator.next(), accumulator.push(generatorResult.value);
  return accumulator;
}
__name(getGeneratorEntries, "getGeneratorEntries");
function getEnumerableKeys(target) {
  var keys2 = [];
  for (var key in target)
    keys2.push(key);
  return keys2;
}
__name(getEnumerableKeys, "getEnumerableKeys");
function getEnumerableSymbols(target) {
  for (var keys2 = [], allKeys = Object.getOwnPropertySymbols(target), i2 = 0; i2 < allKeys.length; i2 += 1) {
    var key = allKeys[i2];
    Object.getOwnPropertyDescriptor(target, key).enumerable && keys2.push(key);
  }
  return keys2;
}
__name(getEnumerableSymbols, "getEnumerableSymbols");
function keysEqual(leftHandOperand, rightHandOperand, keys2, options) {
  var length = keys2.length;
  if (length === 0)
    return !0;
  for (var i2 = 0; i2 < length; i2 += 1)
    if (deepEqual(leftHandOperand[keys2[i2]], rightHandOperand[keys2[i2]], options) === !1)
      return !1;
  return !0;
}
__name(keysEqual, "keysEqual");
function objectEqual(leftHandOperand, rightHandOperand, options) {
  var leftHandKeys = getEnumerableKeys(leftHandOperand), rightHandKeys = getEnumerableKeys(rightHandOperand), leftHandSymbols = getEnumerableSymbols(leftHandOperand), rightHandSymbols = getEnumerableSymbols(rightHandOperand);
  if (leftHandKeys = leftHandKeys.concat(leftHandSymbols), rightHandKeys = rightHandKeys.concat(rightHandSymbols), leftHandKeys.length && leftHandKeys.length === rightHandKeys.length)
    return iterableEqual(mapSymbols(leftHandKeys).sort(), mapSymbols(rightHandKeys).sort()) === !1 ? !1 : keysEqual(leftHandOperand, rightHandOperand, leftHandKeys, options);
  var leftHandEntries = getIteratorEntries(leftHandOperand), rightHandEntries = getIteratorEntries(rightHandOperand);
  return leftHandEntries.length && leftHandEntries.length === rightHandEntries.length ? (leftHandEntries.sort(), rightHandEntries.sort(), iterableEqual(leftHandEntries, rightHandEntries, options)) : leftHandKeys.length === 0 && leftHandEntries.length === 0 && rightHandKeys.length === 0 && rightHandEntries.length === 0;
}
__name(objectEqual, "objectEqual");
function isPrimitive(value) {
  return value === null || typeof value != "object";
}
__name(isPrimitive, "isPrimitive");
function mapSymbols(arr) {
  return arr.map(__name(function(entry) {
    return typeof entry == "symbol" ? entry.toString() : entry;
  }, "mapSymbol"));
}
__name(mapSymbols, "mapSymbols");
function hasProperty(obj, name) {
  return typeof obj > "u" || obj === null ? !1 : name in Object(obj);
}
__name(hasProperty, "hasProperty");
function parsePath(path) {
  return path.replace(/([^\\])\[/g, "$1.[").match(/(\\\.|[^.]+?)+/g).map((value) => {
    if (value === "constructor" || value === "__proto__" || value === "prototype")
      return {};
    let mArr = /^\[(\d+)\]$/.exec(value), parsed = null;
    return mArr ? parsed = { i: parseFloat(mArr[1]) } : parsed = { p: value.replace(/\\([.[\]])/g, "$1") }, parsed;
  });
}
__name(parsePath, "parsePath");
function internalGetPathValue(obj, parsed, pathDepth) {
  let temporaryValue = obj, res = null;
  pathDepth = typeof pathDepth > "u" ? parsed.length : pathDepth;
  for (let i2 = 0; i2 < pathDepth; i2++) {
    let part = parsed[i2];
    temporaryValue && (typeof part.p > "u" ? temporaryValue = temporaryValue[part.i] : temporaryValue = temporaryValue[part.p], i2 === pathDepth - 1 && (res = temporaryValue));
  }
  return res;
}
__name(internalGetPathValue, "internalGetPathValue");
function getPathInfo(obj, path) {
  let parsed = parsePath(path), last = parsed[parsed.length - 1], info = {
    parent: parsed.length > 1 ? internalGetPathValue(obj, parsed, parsed.length - 1) : obj,
    name: last.p || last.i,
    value: internalGetPathValue(obj, parsed)
  };
  return info.exists = hasProperty(info.parent, info.name), info;
}
__name(getPathInfo, "getPathInfo");
var _a2, Assertion = (_a2 = class {
  /** @type {{}} */
  __flags = {};
  /**
   * Creates object for chaining.
   * `Assertion` objects contain metadata in the form of flags. Three flags can
   * be assigned during instantiation by passing arguments to this constructor:
   *
   * - `object`: This flag contains the target of the assertion. For example, in
   * the assertion `expect(numKittens).to.equal(7);`, the `object` flag will
   * contain `numKittens` so that the `equal` assertion can reference it when
   * needed.
   *
   * - `message`: This flag contains an optional custom error message to be
   * prepended to the error message that's generated by the assertion when it
   * fails.
   *
   * - `ssfi`: This flag stands for "start stack function indicator". It
   * contains a function reference that serves as the starting point for
   * removing frames from the stack trace of the error that's created by the
   * assertion when it fails. The goal is to provide a cleaner stack trace to
   * end users by removing Chai's internal functions. Note that it only works
   * in environments that support `Error.captureStackTrace`, and only when
   * `Chai.config.includeStack` hasn't been set to `false`.
   *
   * - `lockSsfi`: This flag controls whether or not the given `ssfi` flag
   * should retain its current value, even as assertions are chained off of
   * this object. This is usually set to `true` when creating a new assertion
   * from within another assertion. It's also temporarily set to `true` before
   * an overwritten assertion gets called by the overwriting assertion.
   *
   * - `eql`: This flag contains the deepEqual function to be used by the assertion.
   *
   * @param {unknown} obj target of the assertion
   * @param {string} [msg] (optional) custom error message
   * @param {Function} [ssfi] (optional) starting point for removing stack frames
   * @param {boolean} [lockSsfi] (optional) whether or not the ssfi flag is locked
   */
  constructor(obj, msg, ssfi, lockSsfi) {
    return flag(this, "ssfi", ssfi || _a2), flag(this, "lockSsfi", lockSsfi), flag(this, "object", obj), flag(this, "message", msg), flag(this, "eql", config.deepEqual || deep_eql_default), proxify(this);
  }
  /** @returns {boolean} */
  static get includeStack() {
    return console.warn(
      "Assertion.includeStack is deprecated, use chai.config.includeStack instead."
    ), config.includeStack;
  }
  /** @param {boolean} value */
  static set includeStack(value) {
    console.warn(
      "Assertion.includeStack is deprecated, use chai.config.includeStack instead."
    ), config.includeStack = value;
  }
  /** @returns {boolean} */
  static get showDiff() {
    return console.warn(
      "Assertion.showDiff is deprecated, use chai.config.showDiff instead."
    ), config.showDiff;
  }
  /** @param {boolean} value */
  static set showDiff(value) {
    console.warn(
      "Assertion.showDiff is deprecated, use chai.config.showDiff instead."
    ), config.showDiff = value;
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static addProperty(name, fn3) {
    addProperty(this.prototype, name, fn3);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static addMethod(name, fn3) {
    addMethod(this.prototype, name, fn3);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   * @param {Function} chainingBehavior
   */
  static addChainableMethod(name, fn3, chainingBehavior) {
    addChainableMethod(this.prototype, name, fn3, chainingBehavior);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static overwriteProperty(name, fn3) {
    overwriteProperty(this.prototype, name, fn3);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static overwriteMethod(name, fn3) {
    overwriteMethod(this.prototype, name, fn3);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   * @param {Function} chainingBehavior
   */
  static overwriteChainableMethod(name, fn3, chainingBehavior) {
    overwriteChainableMethod(this.prototype, name, fn3, chainingBehavior);
  }
  /**
   * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {unknown} _expr to be tested
   * @param {string | Function} msg or function that returns message to display if expression fails
   * @param {string | Function} _negateMsg or function that returns negatedMessage to display if negated expression fails
   * @param {unknown} expected value (remember to check for negation)
   * @param {unknown} _actual (optional) will default to `this.obj`
   * @param {boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
   * @returns {void}
   */
  assert(_expr, msg, _negateMsg, expected, _actual, showDiff) {
    let ok = test(this, arguments);
    if (showDiff !== !1 && (showDiff = !0), expected === void 0 && _actual === void 0 && (showDiff = !1), config.showDiff !== !0 && (showDiff = !1), !ok) {
      msg = getMessage2(this, arguments);
      let assertionErrorObjectProperties = {
        actual: getActual(this, arguments),
        expected,
        showDiff
      }, operator = getOperator(this, arguments);
      throw operator && (assertionErrorObjectProperties.operator = operator), new AssertionError(
        msg,
        assertionErrorObjectProperties,
        // @ts-expect-error Not sure what to do about these types yet
        config.includeStack ? this.assert : flag(this, "ssfi")
      );
    }
  }
  /**
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @returns {unknown}
   */
  get _obj() {
    return flag(this, "object");
  }
  /**
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @param {unknown} val
   */
  set _obj(val) {
    flag(this, "object", val);
  }
}, __name(_a2, "Assertion"), _a2);
function isProxyEnabled() {
  return config.useProxy && typeof Proxy < "u" && typeof Reflect < "u";
}
__name(isProxyEnabled, "isProxyEnabled");
function addProperty(ctx, name, getter) {
  getter = getter === void 0 ? function() {
  } : getter, Object.defineProperty(ctx, name, {
    get: __name(function propertyGetter() {
      !isProxyEnabled() && !flag(this, "lockSsfi") && flag(this, "ssfi", propertyGetter);
      let result = getter.call(this);
      if (result !== void 0) return result;
      let newAssertion = new Assertion();
      return transferFlags(this, newAssertion), newAssertion;
    }, "propertyGetter"),
    configurable: !0
  });
}
__name(addProperty, "addProperty");
var fnLengthDesc = Object.getOwnPropertyDescriptor(function() {
}, "length");
function addLengthGuard(fn3, assertionName, isChainable) {
  return fnLengthDesc.configurable && Object.defineProperty(fn3, "length", {
    get: __name(function() {
      throw Error(
        isChainable ? "Invalid Chai property: " + assertionName + '.length. Due to a compatibility issue, "length" cannot directly follow "' + assertionName + '". Use "' + assertionName + '.lengthOf" instead.' : "Invalid Chai property: " + assertionName + '.length. See docs for proper usage of "' + assertionName + '".'
      );
    }, "get")
  }), fn3;
}
__name(addLengthGuard, "addLengthGuard");
function getProperties(object) {
  let result = Object.getOwnPropertyNames(object);
  function addProperty2(property) {
    result.indexOf(property) === -1 && result.push(property);
  }
  __name(addProperty2, "addProperty");
  let proto = Object.getPrototypeOf(object);
  for (; proto !== null; )
    Object.getOwnPropertyNames(proto).forEach(addProperty2), proto = Object.getPrototypeOf(proto);
  return result;
}
__name(getProperties, "getProperties");
var builtins = ["__flags", "__methods", "_obj", "assert"];
function proxify(obj, nonChainableMethodName) {
  return isProxyEnabled() ? new Proxy(obj, {
    get: __name(function proxyGetter(target, property) {
      if (typeof property == "string" && config.proxyExcludedKeys.indexOf(property) === -1 && !Reflect.has(target, property)) {
        if (nonChainableMethodName)
          throw Error(
            "Invalid Chai property: " + nonChainableMethodName + "." + property + '. See docs for proper usage of "' + nonChainableMethodName + '".'
          );
        let suggestion = null, suggestionDistance = 4;
        throw getProperties(target).forEach(function(prop) {
          if (
            // we actually mean to check `Object.prototype` here
            // eslint-disable-next-line no-prototype-builtins
            !Object.prototype.hasOwnProperty(prop) && builtins.indexOf(prop) === -1
          ) {
            let dist = stringDistanceCapped(property, prop, suggestionDistance);
            dist < suggestionDistance && (suggestion = prop, suggestionDistance = dist);
          }
        }), Error(
          suggestion !== null ? "Invalid Chai property: " + property + '. Did you mean "' + suggestion + '"?' : "Invalid Chai property: " + property
        );
      }
      return builtins.indexOf(property) === -1 && !flag(target, "lockSsfi") && flag(target, "ssfi", proxyGetter), Reflect.get(target, property);
    }, "proxyGetter")
  }) : obj;
}
__name(proxify, "proxify");
function stringDistanceCapped(strA, strB, cap) {
  if (Math.abs(strA.length - strB.length) >= cap)
    return cap;
  let memo = [];
  for (let i2 = 0; i2 <= strA.length; i2++)
    memo[i2] = Array(strB.length + 1).fill(0), memo[i2][0] = i2;
  for (let j2 = 0; j2 < strB.length; j2++)
    memo[0][j2] = j2;
  for (let i2 = 1; i2 <= strA.length; i2++) {
    let ch = strA.charCodeAt(i2 - 1);
    for (let j2 = 1; j2 <= strB.length; j2++) {
      if (Math.abs(i2 - j2) >= cap) {
        memo[i2][j2] = cap;
        continue;
      }
      memo[i2][j2] = Math.min(
        memo[i2 - 1][j2] + 1,
        memo[i2][j2 - 1] + 1,
        memo[i2 - 1][j2 - 1] + (ch === strB.charCodeAt(j2 - 1) ? 0 : 1)
      );
    }
  }
  return memo[strA.length][strB.length];
}
__name(stringDistanceCapped, "stringDistanceCapped");
function addMethod(ctx, name, method) {
  let methodWrapper = __name(function() {
    flag(this, "lockSsfi") || flag(this, "ssfi", methodWrapper);
    let result = method.apply(this, arguments);
    if (result !== void 0) return result;
    let newAssertion = new Assertion();
    return transferFlags(this, newAssertion), newAssertion;
  }, "methodWrapper");
  addLengthGuard(methodWrapper, name, !1), ctx[name] = proxify(methodWrapper, name);
}
__name(addMethod, "addMethod");
function overwriteProperty(ctx, name, getter) {
  let _get = Object.getOwnPropertyDescriptor(ctx, name), _super = __name(function() {
  }, "_super");
  _get && typeof _get.get == "function" && (_super = _get.get), Object.defineProperty(ctx, name, {
    get: __name(function overwritingPropertyGetter() {
      !isProxyEnabled() && !flag(this, "lockSsfi") && flag(this, "ssfi", overwritingPropertyGetter);
      let origLockSsfi = flag(this, "lockSsfi");
      flag(this, "lockSsfi", !0);
      let result = getter(_super).call(this);
      if (flag(this, "lockSsfi", origLockSsfi), result !== void 0)
        return result;
      let newAssertion = new Assertion();
      return transferFlags(this, newAssertion), newAssertion;
    }, "overwritingPropertyGetter"),
    configurable: !0
  });
}
__name(overwriteProperty, "overwriteProperty");
function overwriteMethod(ctx, name, method) {
  let _method = ctx[name], _super = __name(function() {
    throw new Error(name + " is not a function");
  }, "_super");
  _method && typeof _method == "function" && (_super = _method);
  let overwritingMethodWrapper = __name(function() {
    flag(this, "lockSsfi") || flag(this, "ssfi", overwritingMethodWrapper);
    let origLockSsfi = flag(this, "lockSsfi");
    flag(this, "lockSsfi", !0);
    let result = method(_super).apply(this, arguments);
    if (flag(this, "lockSsfi", origLockSsfi), result !== void 0)
      return result;
    let newAssertion = new Assertion();
    return transferFlags(this, newAssertion), newAssertion;
  }, "overwritingMethodWrapper");
  addLengthGuard(overwritingMethodWrapper, name, !1), ctx[name] = proxify(overwritingMethodWrapper, name);
}
__name(overwriteMethod, "overwriteMethod");
var canSetPrototype = typeof Object.setPrototypeOf == "function", testFn = __name(function() {
}, "testFn"), excludeNames = Object.getOwnPropertyNames(testFn).filter(function(name) {
  let propDesc = Object.getOwnPropertyDescriptor(testFn, name);
  return typeof propDesc != "object" ? !0 : !propDesc.configurable;
}), call = Function.prototype.call, apply = Function.prototype.apply;
function addChainableMethod(ctx, name, method, chainingBehavior) {
  typeof chainingBehavior != "function" && (chainingBehavior = __name(function() {
  }, "chainingBehavior"));
  let chainableBehavior = {
    method,
    chainingBehavior
  };
  ctx.__methods || (ctx.__methods = {}), ctx.__methods[name] = chainableBehavior, Object.defineProperty(ctx, name, {
    get: __name(function() {
      chainableBehavior.chainingBehavior.call(this);
      let chainableMethodWrapper = __name(function() {
        flag(this, "lockSsfi") || flag(this, "ssfi", chainableMethodWrapper);
        let result = chainableBehavior.method.apply(this, arguments);
        if (result !== void 0)
          return result;
        let newAssertion = new Assertion();
        return transferFlags(this, newAssertion), newAssertion;
      }, "chainableMethodWrapper");
      if (addLengthGuard(chainableMethodWrapper, name, !0), canSetPrototype) {
        let prototype = Object.create(this);
        prototype.call = call, prototype.apply = apply, Object.setPrototypeOf(chainableMethodWrapper, prototype);
      } else
        Object.getOwnPropertyNames(ctx).forEach(function(asserterName) {
          if (excludeNames.indexOf(asserterName) !== -1)
            return;
          let pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
          Object.defineProperty(chainableMethodWrapper, asserterName, pd);
        });
      return transferFlags(this, chainableMethodWrapper), proxify(chainableMethodWrapper);
    }, "chainableMethodGetter"),
    configurable: !0
  });
}
__name(addChainableMethod, "addChainableMethod");
function overwriteChainableMethod(ctx, name, method, chainingBehavior) {
  let chainableBehavior = ctx.__methods[name], _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = __name(function() {
    let result = chainingBehavior(_chainingBehavior).call(this);
    if (result !== void 0)
      return result;
    let newAssertion = new Assertion();
    return transferFlags(this, newAssertion), newAssertion;
  }, "overwritingChainableMethodGetter");
  let _method = chainableBehavior.method;
  chainableBehavior.method = __name(function() {
    let result = method(_method).apply(this, arguments);
    if (result !== void 0)
      return result;
    let newAssertion = new Assertion();
    return transferFlags(this, newAssertion), newAssertion;
  }, "overwritingChainableMethodWrapper");
}
__name(overwriteChainableMethod, "overwriteChainableMethod");
function compareByInspect(a, b2) {
  return inspect2(a) < inspect2(b2) ? -1 : 1;
}
__name(compareByInspect, "compareByInspect");
function getOwnEnumerablePropertySymbols(obj) {
  return typeof Object.getOwnPropertySymbols != "function" ? [] : Object.getOwnPropertySymbols(obj).filter(function(sym) {
    return Object.getOwnPropertyDescriptor(obj, sym).enumerable;
  });
}
__name(getOwnEnumerablePropertySymbols, "getOwnEnumerablePropertySymbols");
function getOwnEnumerableProperties(obj) {
  return Object.keys(obj).concat(getOwnEnumerablePropertySymbols(obj));
}
__name(getOwnEnumerableProperties, "getOwnEnumerableProperties");
var isNaN22 = Number.isNaN;
function isObjectType(obj) {
  let objectType = type(obj);
  return ["Array", "Object", "Function"].indexOf(objectType) !== -1;
}
__name(isObjectType, "isObjectType");
function getOperator(obj, args) {
  let operator = flag(obj, "operator"), negate = flag(obj, "negate"), expected = args[3], msg = negate ? args[2] : args[1];
  if (operator)
    return operator;
  if (typeof msg == "function" && (msg = msg()), msg = msg || "", !msg || /\shave\s/.test(msg))
    return;
  let isObject2 = isObjectType(expected);
  return /\snot\s/.test(msg) ? isObject2 ? "notDeepStrictEqual" : "notStrictEqual" : isObject2 ? "deepStrictEqual" : "strictEqual";
}
__name(getOperator, "getOperator");
function getName(fn3) {
  return fn3.name;
}
__name(getName, "getName");
function isRegExp2(obj) {
  return Object.prototype.toString.call(obj) === "[object RegExp]";
}
__name(isRegExp2, "isRegExp");
function isNumeric(obj) {
  return ["Number", "BigInt"].includes(type(obj));
}
__name(isNumeric, "isNumeric");
var { flag: flag2 } = utils_exports;
[
  "to",
  "be",
  "been",
  "is",
  "and",
  "has",
  "have",
  "with",
  "that",
  "which",
  "at",
  "of",
  "same",
  "but",
  "does",
  "still",
  "also"
].forEach(function(chain) {
  Assertion.addProperty(chain);
});
Assertion.addProperty("not", function() {
  flag2(this, "negate", !0);
});
Assertion.addProperty("deep", function() {
  flag2(this, "deep", !0);
});
Assertion.addProperty("nested", function() {
  flag2(this, "nested", !0);
});
Assertion.addProperty("own", function() {
  flag2(this, "own", !0);
});
Assertion.addProperty("ordered", function() {
  flag2(this, "ordered", !0);
});
Assertion.addProperty("any", function() {
  flag2(this, "any", !0), flag2(this, "all", !1);
});
Assertion.addProperty("all", function() {
  flag2(this, "all", !0), flag2(this, "any", !1);
});
var functionTypes = {
  function: [
    "function",
    "asyncfunction",
    "generatorfunction",
    "asyncgeneratorfunction"
  ],
  asyncfunction: ["asyncfunction", "asyncgeneratorfunction"],
  generatorfunction: ["generatorfunction", "asyncgeneratorfunction"],
  asyncgeneratorfunction: ["asyncgeneratorfunction"]
};
function an(type32, msg) {
  msg && flag2(this, "message", msg), type32 = type32.toLowerCase();
  let obj = flag2(this, "object"), article = ~["a", "e", "i", "o", "u"].indexOf(type32.charAt(0)) ? "an " : "a ", detectedType = type(obj).toLowerCase();
  functionTypes.function.includes(type32) ? this.assert(
    functionTypes[type32].includes(detectedType),
    "expected #{this} to be " + article + type32,
    "expected #{this} not to be " + article + type32
  ) : this.assert(
    type32 === detectedType,
    "expected #{this} to be " + article + type32,
    "expected #{this} not to be " + article + type32
  );
}
__name(an, "an");
Assertion.addChainableMethod("an", an);
Assertion.addChainableMethod("a", an);
function SameValueZero(a, b2) {
  return isNaN22(a) && isNaN22(b2) || a === b2;
}
__name(SameValueZero, "SameValueZero");
function includeChainingBehavior() {
  flag2(this, "contains", !0);
}
__name(includeChainingBehavior, "includeChainingBehavior");
function include(val, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), objType = type(obj).toLowerCase(), flagMsg = flag2(this, "message"), negate = flag2(this, "negate"), ssfi = flag2(this, "ssfi"), isDeep = flag2(this, "deep"), descriptor = isDeep ? "deep " : "", isEql = isDeep ? flag2(this, "eql") : SameValueZero;
  flagMsg = flagMsg ? flagMsg + ": " : "";
  let included = !1;
  switch (objType) {
    case "string":
      included = obj.indexOf(val) !== -1;
      break;
    case "weakset":
      if (isDeep)
        throw new AssertionError(
          flagMsg + "unable to use .deep.include with WeakSet",
          void 0,
          ssfi
        );
      included = obj.has(val);
      break;
    case "map":
      obj.forEach(function(item) {
        included = included || isEql(item, val);
      });
      break;
    case "set":
      isDeep ? obj.forEach(function(item) {
        included = included || isEql(item, val);
      }) : included = obj.has(val);
      break;
    case "array":
      isDeep ? included = obj.some(function(item) {
        return isEql(item, val);
      }) : included = obj.indexOf(val) !== -1;
      break;
    default: {
      if (val !== Object(val))
        throw new AssertionError(
          flagMsg + "the given combination of arguments (" + objType + " and " + type(val).toLowerCase() + ") is invalid for this assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a " + type(val).toLowerCase(),
          void 0,
          ssfi
        );
      let props = Object.keys(val), firstErr = null, numErrs = 0;
      if (props.forEach(function(prop) {
        let propAssertion = new Assertion(obj);
        if (transferFlags(this, propAssertion, !0), flag2(propAssertion, "lockSsfi", !0), !negate || props.length === 1) {
          propAssertion.property(prop, val[prop]);
          return;
        }
        try {
          propAssertion.property(prop, val[prop]);
        } catch (err) {
          if (!check_error_exports.compatibleConstructor(err, AssertionError))
            throw err;
          firstErr === null && (firstErr = err), numErrs++;
        }
      }, this), negate && props.length > 1 && numErrs === props.length)
        throw firstErr;
      return;
    }
  }
  this.assert(
    included,
    "expected #{this} to " + descriptor + "include " + inspect2(val),
    "expected #{this} to not " + descriptor + "include " + inspect2(val)
  );
}
__name(include, "include");
Assertion.addChainableMethod("include", include, includeChainingBehavior);
Assertion.addChainableMethod("contain", include, includeChainingBehavior);
Assertion.addChainableMethod("contains", include, includeChainingBehavior);
Assertion.addChainableMethod("includes", include, includeChainingBehavior);
Assertion.addProperty("ok", function() {
  this.assert(
    flag2(this, "object"),
    "expected #{this} to be truthy",
    "expected #{this} to be falsy"
  );
});
Assertion.addProperty("true", function() {
  this.assert(
    flag2(this, "object") === !0,
    "expected #{this} to be true",
    "expected #{this} to be false",
    !flag2(this, "negate")
  );
});
Assertion.addProperty("numeric", function() {
  let object = flag2(this, "object");
  this.assert(
    ["Number", "BigInt"].includes(type(object)),
    "expected #{this} to be numeric",
    "expected #{this} to not be numeric",
    !flag2(this, "negate")
  );
});
Assertion.addProperty("callable", function() {
  let val = flag2(this, "object"), ssfi = flag2(this, "ssfi"), message = flag2(this, "message"), msg = message ? `${message}: ` : "", negate = flag2(this, "negate"), assertionMessage = negate ? `${msg}expected ${inspect2(val)} not to be a callable function` : `${msg}expected ${inspect2(val)} to be a callable function`, isCallable3 = [
    "Function",
    "AsyncFunction",
    "GeneratorFunction",
    "AsyncGeneratorFunction"
  ].includes(type(val));
  if (isCallable3 && negate || !isCallable3 && !negate)
    throw new AssertionError(assertionMessage, void 0, ssfi);
});
Assertion.addProperty("false", function() {
  this.assert(
    flag2(this, "object") === !1,
    "expected #{this} to be false",
    "expected #{this} to be true",
    !!flag2(this, "negate")
  );
});
Assertion.addProperty("null", function() {
  this.assert(
    flag2(this, "object") === null,
    "expected #{this} to be null",
    "expected #{this} not to be null"
  );
});
Assertion.addProperty("undefined", function() {
  this.assert(
    flag2(this, "object") === void 0,
    "expected #{this} to be undefined",
    "expected #{this} not to be undefined"
  );
});
Assertion.addProperty("NaN", function() {
  this.assert(
    isNaN22(flag2(this, "object")),
    "expected #{this} to be NaN",
    "expected #{this} not to be NaN"
  );
});
function assertExist() {
  let val = flag2(this, "object");
  this.assert(
    val != null,
    "expected #{this} to exist",
    "expected #{this} to not exist"
  );
}
__name(assertExist, "assertExist");
Assertion.addProperty("exist", assertExist);
Assertion.addProperty("exists", assertExist);
Assertion.addProperty("empty", function() {
  let val = flag2(this, "object"), ssfi = flag2(this, "ssfi"), flagMsg = flag2(this, "message"), itemsCount;
  switch (flagMsg = flagMsg ? flagMsg + ": " : "", type(val).toLowerCase()) {
    case "array":
    case "string":
      itemsCount = val.length;
      break;
    case "map":
    case "set":
      itemsCount = val.size;
      break;
    case "weakmap":
    case "weakset":
      throw new AssertionError(
        flagMsg + ".empty was passed a weak collection",
        void 0,
        ssfi
      );
    case "function": {
      let msg = flagMsg + ".empty was passed a function " + getName(val);
      throw new AssertionError(msg.trim(), void 0, ssfi);
    }
    default:
      if (val !== Object(val))
        throw new AssertionError(
          flagMsg + ".empty was passed non-string primitive " + inspect2(val),
          void 0,
          ssfi
        );
      itemsCount = Object.keys(val).length;
  }
  this.assert(
    itemsCount === 0,
    "expected #{this} to be empty",
    "expected #{this} not to be empty"
  );
});
function checkArguments() {
  let obj = flag2(this, "object"), type32 = type(obj);
  this.assert(
    type32 === "Arguments",
    "expected #{this} to be arguments but got " + type32,
    "expected #{this} to not be arguments"
  );
}
__name(checkArguments, "checkArguments");
Assertion.addProperty("arguments", checkArguments);
Assertion.addProperty("Arguments", checkArguments);
function assertEqual(val, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object");
  if (flag2(this, "deep")) {
    let prevLockSsfi = flag2(this, "lockSsfi");
    flag2(this, "lockSsfi", !0), this.eql(val), flag2(this, "lockSsfi", prevLockSsfi);
  } else
    this.assert(
      val === obj,
      "expected #{this} to equal #{exp}",
      "expected #{this} to not equal #{exp}",
      val,
      this._obj,
      !0
    );
}
__name(assertEqual, "assertEqual");
Assertion.addMethod("equal", assertEqual);
Assertion.addMethod("equals", assertEqual);
Assertion.addMethod("eq", assertEqual);
function assertEql(obj, msg) {
  msg && flag2(this, "message", msg);
  let eql = flag2(this, "eql");
  this.assert(
    eql(obj, flag2(this, "object")),
    "expected #{this} to deeply equal #{exp}",
    "expected #{this} to not deeply equal #{exp}",
    obj,
    this._obj,
    !0
  );
}
__name(assertEql, "assertEql");
Assertion.addMethod("eql", assertEql);
Assertion.addMethod("eqls", assertEql);
function assertAbove(n2, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase();
  if (doLength && objType !== "map" && objType !== "set" && new Assertion(obj, flagMsg, ssfi, !0).to.have.property("length"), !doLength && objType === "date" && nType !== "date")
    throw new AssertionError(
      msgPrefix + "the argument to above must be a date",
      void 0,
      ssfi
    );
  if (!isNumeric(n2) && (doLength || isNumeric(obj)))
    throw new AssertionError(
      msgPrefix + "the argument to above must be a number",
      void 0,
      ssfi
    );
  if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    throw new AssertionError(
      msgPrefix + "expected " + printObj + " to be a number or a date",
      void 0,
      ssfi
    );
  }
  if (doLength) {
    let descriptor = "length", itemsCount;
    objType === "map" || objType === "set" ? (descriptor = "size", itemsCount = obj.size) : itemsCount = obj.length, this.assert(
      itemsCount > n2,
      "expected #{this} to have a " + descriptor + " above #{exp} but got #{act}",
      "expected #{this} to not have a " + descriptor + " above #{exp}",
      n2,
      itemsCount
    );
  } else
    this.assert(
      obj > n2,
      "expected #{this} to be above #{exp}",
      "expected #{this} to be at most #{exp}",
      n2
    );
}
__name(assertAbove, "assertAbove");
Assertion.addMethod("above", assertAbove);
Assertion.addMethod("gt", assertAbove);
Assertion.addMethod("greaterThan", assertAbove);
function assertLeast(n2, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase(), errorMessage, shouldThrow = !0;
  if (doLength && objType !== "map" && objType !== "set" && new Assertion(obj, flagMsg, ssfi, !0).to.have.property("length"), !doLength && objType === "date" && nType !== "date")
    errorMessage = msgPrefix + "the argument to least must be a date";
  else if (!isNumeric(n2) && (doLength || isNumeric(obj)))
    errorMessage = msgPrefix + "the argument to least must be a number";
  else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else
    shouldThrow = !1;
  if (shouldThrow)
    throw new AssertionError(errorMessage, void 0, ssfi);
  if (doLength) {
    let descriptor = "length", itemsCount;
    objType === "map" || objType === "set" ? (descriptor = "size", itemsCount = obj.size) : itemsCount = obj.length, this.assert(
      itemsCount >= n2,
      "expected #{this} to have a " + descriptor + " at least #{exp} but got #{act}",
      "expected #{this} to have a " + descriptor + " below #{exp}",
      n2,
      itemsCount
    );
  } else
    this.assert(
      obj >= n2,
      "expected #{this} to be at least #{exp}",
      "expected #{this} to be below #{exp}",
      n2
    );
}
__name(assertLeast, "assertLeast");
Assertion.addMethod("least", assertLeast);
Assertion.addMethod("gte", assertLeast);
Assertion.addMethod("greaterThanOrEqual", assertLeast);
function assertBelow(n2, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase(), errorMessage, shouldThrow = !0;
  if (doLength && objType !== "map" && objType !== "set" && new Assertion(obj, flagMsg, ssfi, !0).to.have.property("length"), !doLength && objType === "date" && nType !== "date")
    errorMessage = msgPrefix + "the argument to below must be a date";
  else if (!isNumeric(n2) && (doLength || isNumeric(obj)))
    errorMessage = msgPrefix + "the argument to below must be a number";
  else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else
    shouldThrow = !1;
  if (shouldThrow)
    throw new AssertionError(errorMessage, void 0, ssfi);
  if (doLength) {
    let descriptor = "length", itemsCount;
    objType === "map" || objType === "set" ? (descriptor = "size", itemsCount = obj.size) : itemsCount = obj.length, this.assert(
      itemsCount < n2,
      "expected #{this} to have a " + descriptor + " below #{exp} but got #{act}",
      "expected #{this} to not have a " + descriptor + " below #{exp}",
      n2,
      itemsCount
    );
  } else
    this.assert(
      obj < n2,
      "expected #{this} to be below #{exp}",
      "expected #{this} to be at least #{exp}",
      n2
    );
}
__name(assertBelow, "assertBelow");
Assertion.addMethod("below", assertBelow);
Assertion.addMethod("lt", assertBelow);
Assertion.addMethod("lessThan", assertBelow);
function assertMost(n2, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase(), errorMessage, shouldThrow = !0;
  if (doLength && objType !== "map" && objType !== "set" && new Assertion(obj, flagMsg, ssfi, !0).to.have.property("length"), !doLength && objType === "date" && nType !== "date")
    errorMessage = msgPrefix + "the argument to most must be a date";
  else if (!isNumeric(n2) && (doLength || isNumeric(obj)))
    errorMessage = msgPrefix + "the argument to most must be a number";
  else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else
    shouldThrow = !1;
  if (shouldThrow)
    throw new AssertionError(errorMessage, void 0, ssfi);
  if (doLength) {
    let descriptor = "length", itemsCount;
    objType === "map" || objType === "set" ? (descriptor = "size", itemsCount = obj.size) : itemsCount = obj.length, this.assert(
      itemsCount <= n2,
      "expected #{this} to have a " + descriptor + " at most #{exp} but got #{act}",
      "expected #{this} to have a " + descriptor + " above #{exp}",
      n2,
      itemsCount
    );
  } else
    this.assert(
      obj <= n2,
      "expected #{this} to be at most #{exp}",
      "expected #{this} to be above #{exp}",
      n2
    );
}
__name(assertMost, "assertMost");
Assertion.addMethod("most", assertMost);
Assertion.addMethod("lte", assertMost);
Assertion.addMethod("lessThanOrEqual", assertMost);
Assertion.addMethod("within", function(start, finish, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), startType = type(start).toLowerCase(), finishType = type(finish).toLowerCase(), errorMessage, shouldThrow = !0, range = startType === "date" && finishType === "date" ? start.toISOString() + ".." + finish.toISOString() : start + ".." + finish;
  if (doLength && objType !== "map" && objType !== "set" && new Assertion(obj, flagMsg, ssfi, !0).to.have.property("length"), !doLength && objType === "date" && (startType !== "date" || finishType !== "date"))
    errorMessage = msgPrefix + "the arguments to within must be dates";
  else if ((!isNumeric(start) || !isNumeric(finish)) && (doLength || isNumeric(obj)))
    errorMessage = msgPrefix + "the arguments to within must be numbers";
  else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else
    shouldThrow = !1;
  if (shouldThrow)
    throw new AssertionError(errorMessage, void 0, ssfi);
  if (doLength) {
    let descriptor = "length", itemsCount;
    objType === "map" || objType === "set" ? (descriptor = "size", itemsCount = obj.size) : itemsCount = obj.length, this.assert(
      itemsCount >= start && itemsCount <= finish,
      "expected #{this} to have a " + descriptor + " within " + range,
      "expected #{this} to not have a " + descriptor + " within " + range
    );
  } else
    this.assert(
      obj >= start && obj <= finish,
      "expected #{this} to be within " + range,
      "expected #{this} to not be within " + range
    );
});
function assertInstanceOf(constructor, msg) {
  msg && flag2(this, "message", msg);
  let target = flag2(this, "object"), ssfi = flag2(this, "ssfi"), flagMsg = flag2(this, "message"), isInstanceOf;
  try {
    isInstanceOf = target instanceof constructor;
  } catch (err) {
    throw err instanceof TypeError ? (flagMsg = flagMsg ? flagMsg + ": " : "", new AssertionError(
      flagMsg + "The instanceof assertion needs a constructor but " + type(constructor) + " was given.",
      void 0,
      ssfi
    )) : err;
  }
  let name = getName(constructor);
  name == null && (name = "an unnamed constructor"), this.assert(
    isInstanceOf,
    "expected #{this} to be an instance of " + name,
    "expected #{this} to not be an instance of " + name
  );
}
__name(assertInstanceOf, "assertInstanceOf");
Assertion.addMethod("instanceof", assertInstanceOf);
Assertion.addMethod("instanceOf", assertInstanceOf);
function assertProperty(name, val, msg) {
  msg && flag2(this, "message", msg);
  let isNested = flag2(this, "nested"), isOwn = flag2(this, "own"), flagMsg = flag2(this, "message"), obj = flag2(this, "object"), ssfi = flag2(this, "ssfi"), nameType = typeof name;
  if (flagMsg = flagMsg ? flagMsg + ": " : "", isNested) {
    if (nameType !== "string")
      throw new AssertionError(
        flagMsg + "the argument to property must be a string when using nested syntax",
        void 0,
        ssfi
      );
  } else if (nameType !== "string" && nameType !== "number" && nameType !== "symbol")
    throw new AssertionError(
      flagMsg + "the argument to property must be a string, number, or symbol",
      void 0,
      ssfi
    );
  if (isNested && isOwn)
    throw new AssertionError(
      flagMsg + 'The "nested" and "own" flags cannot be combined.',
      void 0,
      ssfi
    );
  if (obj == null)
    throw new AssertionError(
      flagMsg + "Target cannot be null or undefined.",
      void 0,
      ssfi
    );
  let isDeep = flag2(this, "deep"), negate = flag2(this, "negate"), pathInfo = isNested ? getPathInfo(obj, name) : null, value = isNested ? pathInfo.value : obj[name], isEql = isDeep ? flag2(this, "eql") : (val1, val2) => val1 === val2, descriptor = "";
  isDeep && (descriptor += "deep "), isOwn && (descriptor += "own "), isNested && (descriptor += "nested "), descriptor += "property ";
  let hasProperty2;
  isOwn ? hasProperty2 = Object.prototype.hasOwnProperty.call(obj, name) : isNested ? hasProperty2 = pathInfo.exists : hasProperty2 = hasProperty(obj, name), (!negate || arguments.length === 1) && this.assert(
    hasProperty2,
    "expected #{this} to have " + descriptor + inspect2(name),
    "expected #{this} to not have " + descriptor + inspect2(name)
  ), arguments.length > 1 && this.assert(
    hasProperty2 && isEql(val, value),
    "expected #{this} to have " + descriptor + inspect2(name) + " of #{exp}, but got #{act}",
    "expected #{this} to not have " + descriptor + inspect2(name) + " of #{act}",
    val,
    value
  ), flag2(this, "object", value);
}
__name(assertProperty, "assertProperty");
Assertion.addMethod("property", assertProperty);
function assertOwnProperty(_name, _value, _msg) {
  flag2(this, "own", !0), assertProperty.apply(this, arguments);
}
__name(assertOwnProperty, "assertOwnProperty");
Assertion.addMethod("ownProperty", assertOwnProperty);
Assertion.addMethod("haveOwnProperty", assertOwnProperty);
function assertOwnPropertyDescriptor(name, descriptor, msg) {
  typeof descriptor == "string" && (msg = descriptor, descriptor = null), msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name), eql = flag2(this, "eql");
  actualDescriptor && descriptor ? this.assert(
    eql(descriptor, actualDescriptor),
    "expected the own property descriptor for " + inspect2(name) + " on #{this} to match " + inspect2(descriptor) + ", got " + inspect2(actualDescriptor),
    "expected the own property descriptor for " + inspect2(name) + " on #{this} to not match " + inspect2(descriptor),
    descriptor,
    actualDescriptor,
    !0
  ) : this.assert(
    actualDescriptor,
    "expected #{this} to have an own property descriptor for " + inspect2(name),
    "expected #{this} to not have an own property descriptor for " + inspect2(name)
  ), flag2(this, "object", actualDescriptor);
}
__name(assertOwnPropertyDescriptor, "assertOwnPropertyDescriptor");
Assertion.addMethod("ownPropertyDescriptor", assertOwnPropertyDescriptor);
Assertion.addMethod("haveOwnPropertyDescriptor", assertOwnPropertyDescriptor);
function assertLengthChain() {
  flag2(this, "doLength", !0);
}
__name(assertLengthChain, "assertLengthChain");
function assertLength(n2, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), objType = type(obj).toLowerCase(), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi"), descriptor = "length", itemsCount;
  switch (objType) {
    case "map":
    case "set":
      descriptor = "size", itemsCount = obj.size;
      break;
    default:
      new Assertion(obj, flagMsg, ssfi, !0).to.have.property("length"), itemsCount = obj.length;
  }
  this.assert(
    itemsCount == n2,
    "expected #{this} to have a " + descriptor + " of #{exp} but got #{act}",
    "expected #{this} to not have a " + descriptor + " of #{act}",
    n2,
    itemsCount
  );
}
__name(assertLength, "assertLength");
Assertion.addChainableMethod("length", assertLength, assertLengthChain);
Assertion.addChainableMethod("lengthOf", assertLength, assertLengthChain);
function assertMatch(re, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object");
  this.assert(
    re.exec(obj),
    "expected #{this} to match " + re,
    "expected #{this} not to match " + re
  );
}
__name(assertMatch, "assertMatch");
Assertion.addMethod("match", assertMatch);
Assertion.addMethod("matches", assertMatch);
Assertion.addMethod("string", function(str, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(obj, flagMsg, ssfi, !0).is.a("string"), this.assert(
    ~obj.indexOf(str),
    "expected #{this} to contain " + inspect2(str),
    "expected #{this} to not contain " + inspect2(str)
  );
});
function assertKeys(keys2) {
  let obj = flag2(this, "object"), objType = type(obj), keysType = type(keys2), ssfi = flag2(this, "ssfi"), isDeep = flag2(this, "deep"), str, deepStr = "", actual, ok = !0, flagMsg = flag2(this, "message");
  flagMsg = flagMsg ? flagMsg + ": " : "";
  let mixedArgsMsg = flagMsg + "when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments";
  if (objType === "Map" || objType === "Set")
    deepStr = isDeep ? "deeply " : "", actual = [], obj.forEach(function(val, key) {
      actual.push(key);
    }), keysType !== "Array" && (keys2 = Array.prototype.slice.call(arguments));
  else {
    switch (actual = getOwnEnumerableProperties(obj), keysType) {
      case "Array":
        if (arguments.length > 1)
          throw new AssertionError(mixedArgsMsg, void 0, ssfi);
        break;
      case "Object":
        if (arguments.length > 1)
          throw new AssertionError(mixedArgsMsg, void 0, ssfi);
        keys2 = Object.keys(keys2);
        break;
      default:
        keys2 = Array.prototype.slice.call(arguments);
    }
    keys2 = keys2.map(function(val) {
      return typeof val == "symbol" ? val : String(val);
    });
  }
  if (!keys2.length)
    throw new AssertionError(flagMsg + "keys required", void 0, ssfi);
  let len = keys2.length, any = flag2(this, "any"), all = flag2(this, "all"), expected = keys2, isEql = isDeep ? flag2(this, "eql") : (val1, val2) => val1 === val2;
  if (!any && !all && (all = !0), any && (ok = expected.some(function(expectedKey) {
    return actual.some(function(actualKey) {
      return isEql(expectedKey, actualKey);
    });
  })), all && (ok = expected.every(function(expectedKey) {
    return actual.some(function(actualKey) {
      return isEql(expectedKey, actualKey);
    });
  }), flag2(this, "contains") || (ok = ok && keys2.length == actual.length)), len > 1) {
    keys2 = keys2.map(function(key) {
      return inspect2(key);
    });
    let last = keys2.pop();
    all && (str = keys2.join(", ") + ", and " + last), any && (str = keys2.join(", ") + ", or " + last);
  } else
    str = inspect2(keys2[0]);
  str = (len > 1 ? "keys " : "key ") + str, str = (flag2(this, "contains") ? "contain " : "have ") + str, this.assert(
    ok,
    "expected #{this} to " + deepStr + str,
    "expected #{this} to not " + deepStr + str,
    expected.slice(0).sort(compareByInspect),
    actual.sort(compareByInspect),
    !0
  );
}
__name(assertKeys, "assertKeys");
Assertion.addMethod("keys", assertKeys);
Assertion.addMethod("key", assertKeys);
function assertThrows(errorLike, errMsgMatcher, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), ssfi = flag2(this, "ssfi"), flagMsg = flag2(this, "message"), negate = flag2(this, "negate") || !1;
  new Assertion(obj, flagMsg, ssfi, !0).is.a("function"), (isRegExp2(errorLike) || typeof errorLike == "string") && (errMsgMatcher = errorLike, errorLike = null);
  let caughtErr, errorWasThrown = !1;
  try {
    obj();
  } catch (err) {
    errorWasThrown = !0, caughtErr = err;
  }
  let everyArgIsUndefined = errorLike === void 0 && errMsgMatcher === void 0, everyArgIsDefined = !!(errorLike && errMsgMatcher), errorLikeFail = !1, errMsgMatcherFail = !1;
  if (everyArgIsUndefined || !everyArgIsUndefined && !negate) {
    let errorLikeString = "an error";
    errorLike instanceof Error ? errorLikeString = "#{exp}" : errorLike && (errorLikeString = check_error_exports.getConstructorName(errorLike));
    let actual = caughtErr;
    if (caughtErr instanceof Error)
      actual = caughtErr.toString();
    else if (typeof caughtErr == "string")
      actual = caughtErr;
    else if (caughtErr && (typeof caughtErr == "object" || typeof caughtErr == "function"))
      try {
        actual = check_error_exports.getConstructorName(caughtErr);
      } catch {
      }
    this.assert(
      errorWasThrown,
      "expected #{this} to throw " + errorLikeString,
      "expected #{this} to not throw an error but #{act} was thrown",
      errorLike && errorLike.toString(),
      actual
    );
  }
  if (errorLike && caughtErr && (errorLike instanceof Error && check_error_exports.compatibleInstance(
    caughtErr,
    errorLike
  ) === negate && (everyArgIsDefined && negate ? errorLikeFail = !0 : this.assert(
    negate,
    "expected #{this} to throw #{exp} but #{act} was thrown",
    "expected #{this} to not throw #{exp}" + (caughtErr && !negate ? " but #{act} was thrown" : ""),
    errorLike.toString(),
    caughtErr.toString()
  )), check_error_exports.compatibleConstructor(
    caughtErr,
    errorLike
  ) === negate && (everyArgIsDefined && negate ? errorLikeFail = !0 : this.assert(
    negate,
    "expected #{this} to throw #{exp} but #{act} was thrown",
    "expected #{this} to not throw #{exp}" + (caughtErr ? " but #{act} was thrown" : ""),
    errorLike instanceof Error ? errorLike.toString() : errorLike && check_error_exports.getConstructorName(errorLike),
    caughtErr instanceof Error ? caughtErr.toString() : caughtErr && check_error_exports.getConstructorName(caughtErr)
  ))), caughtErr && errMsgMatcher !== void 0 && errMsgMatcher !== null) {
    let placeholder = "including";
    isRegExp2(errMsgMatcher) && (placeholder = "matching"), check_error_exports.compatibleMessage(
      caughtErr,
      errMsgMatcher
    ) === negate && (everyArgIsDefined && negate ? errMsgMatcherFail = !0 : this.assert(
      negate,
      "expected #{this} to throw error " + placeholder + " #{exp} but got #{act}",
      "expected #{this} to throw error not " + placeholder + " #{exp}",
      errMsgMatcher,
      check_error_exports.getMessage(caughtErr)
    ));
  }
  errorLikeFail && errMsgMatcherFail && this.assert(
    negate,
    "expected #{this} to throw #{exp} but #{act} was thrown",
    "expected #{this} to not throw #{exp}" + (caughtErr ? " but #{act} was thrown" : ""),
    errorLike instanceof Error ? errorLike.toString() : errorLike && check_error_exports.getConstructorName(errorLike),
    caughtErr instanceof Error ? caughtErr.toString() : caughtErr && check_error_exports.getConstructorName(caughtErr)
  ), flag2(this, "object", caughtErr);
}
__name(assertThrows, "assertThrows");
Assertion.addMethod("throw", assertThrows);
Assertion.addMethod("throws", assertThrows);
Assertion.addMethod("Throw", assertThrows);
function respondTo(method, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), itself = flag2(this, "itself"), context = typeof obj == "function" && !itself ? obj.prototype[method] : obj[method];
  this.assert(
    typeof context == "function",
    "expected #{this} to respond to " + inspect2(method),
    "expected #{this} to not respond to " + inspect2(method)
  );
}
__name(respondTo, "respondTo");
Assertion.addMethod("respondTo", respondTo);
Assertion.addMethod("respondsTo", respondTo);
Assertion.addProperty("itself", function() {
  flag2(this, "itself", !0);
});
function satisfy(matcher, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), result = matcher(obj);
  this.assert(
    result,
    "expected #{this} to satisfy " + objDisplay(matcher),
    "expected #{this} to not satisfy" + objDisplay(matcher),
    !flag2(this, "negate"),
    result
  );
}
__name(satisfy, "satisfy");
Assertion.addMethod("satisfy", satisfy);
Assertion.addMethod("satisfies", satisfy);
function closeTo(expected, delta, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(obj, flagMsg, ssfi, !0).is.numeric;
  let message = "A `delta` value is required for `closeTo`";
  if (delta == null)
    throw new AssertionError(
      flagMsg ? `${flagMsg}: ${message}` : message,
      void 0,
      ssfi
    );
  if (new Assertion(delta, flagMsg, ssfi, !0).is.numeric, message = "A `expected` value is required for `closeTo`", expected == null)
    throw new AssertionError(
      flagMsg ? `${flagMsg}: ${message}` : message,
      void 0,
      ssfi
    );
  new Assertion(expected, flagMsg, ssfi, !0).is.numeric;
  let abs = __name((x2) => x2 < 0n ? -x2 : x2, "abs"), strip = __name((number) => parseFloat(parseFloat(number).toPrecision(12)), "strip");
  this.assert(
    strip(abs(obj - expected)) <= delta,
    "expected #{this} to be close to " + expected + " +/- " + delta,
    "expected #{this} not to be close to " + expected + " +/- " + delta
  );
}
__name(closeTo, "closeTo");
Assertion.addMethod("closeTo", closeTo);
Assertion.addMethod("approximately", closeTo);
function isSubsetOf(_subset, _superset, cmp, contains, ordered) {
  let superset = Array.from(_superset), subset = Array.from(_subset);
  if (!contains) {
    if (subset.length !== superset.length) return !1;
    superset = superset.slice();
  }
  return subset.every(function(elem, idx) {
    if (ordered) return cmp ? cmp(elem, superset[idx]) : elem === superset[idx];
    if (!cmp) {
      let matchIdx = superset.indexOf(elem);
      return matchIdx === -1 ? !1 : (contains || superset.splice(matchIdx, 1), !0);
    }
    return superset.some(function(elem2, matchIdx) {
      return cmp(elem, elem2) ? (contains || superset.splice(matchIdx, 1), !0) : !1;
    });
  });
}
__name(isSubsetOf, "isSubsetOf");
Assertion.addMethod("members", function(subset, msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(obj, flagMsg, ssfi, !0).to.be.iterable, new Assertion(subset, flagMsg, ssfi, !0).to.be.iterable;
  let contains = flag2(this, "contains"), ordered = flag2(this, "ordered"), subject, failMsg, failNegateMsg;
  contains ? (subject = ordered ? "an ordered superset" : "a superset", failMsg = "expected #{this} to be " + subject + " of #{exp}", failNegateMsg = "expected #{this} to not be " + subject + " of #{exp}") : (subject = ordered ? "ordered members" : "members", failMsg = "expected #{this} to have the same " + subject + " as #{exp}", failNegateMsg = "expected #{this} to not have the same " + subject + " as #{exp}");
  let cmp = flag2(this, "deep") ? flag2(this, "eql") : void 0;
  this.assert(
    isSubsetOf(subset, obj, cmp, contains, ordered),
    failMsg,
    failNegateMsg,
    subset,
    obj,
    !0
  );
});
Assertion.addProperty("iterable", function(msg) {
  msg && flag2(this, "message", msg);
  let obj = flag2(this, "object");
  this.assert(
    obj != null && obj[Symbol.iterator],
    "expected #{this} to be an iterable",
    "expected #{this} to not be an iterable",
    obj
  );
});
function oneOf(list, msg) {
  msg && flag2(this, "message", msg);
  let expected = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi"), contains = flag2(this, "contains"), isDeep = flag2(this, "deep"), eql = flag2(this, "eql");
  new Assertion(list, flagMsg, ssfi, !0).to.be.an("array"), contains ? this.assert(
    list.some(function(possibility) {
      return expected.indexOf(possibility) > -1;
    }),
    "expected #{this} to contain one of #{exp}",
    "expected #{this} to not contain one of #{exp}",
    list,
    expected
  ) : isDeep ? this.assert(
    list.some(function(possibility) {
      return eql(expected, possibility);
    }),
    "expected #{this} to deeply equal one of #{exp}",
    "expected #{this} to deeply equal one of #{exp}",
    list,
    expected
  ) : this.assert(
    list.indexOf(expected) > -1,
    "expected #{this} to be one of #{exp}",
    "expected #{this} to not be one of #{exp}",
    list,
    expected
  );
}
__name(oneOf, "oneOf");
Assertion.addMethod("oneOf", oneOf);
function assertChanges(subject, prop, msg) {
  msg && flag2(this, "message", msg);
  let fn3 = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(fn3, flagMsg, ssfi, !0).is.a("function");
  let initial;
  prop ? (new Assertion(subject, flagMsg, ssfi, !0).to.have.property(prop), initial = subject[prop]) : (new Assertion(subject, flagMsg, ssfi, !0).is.a("function"), initial = subject()), fn3();
  let final = prop == null ? subject() : subject[prop], msgObj = prop == null ? initial : "." + prop;
  flag2(this, "deltaMsgObj", msgObj), flag2(this, "initialDeltaValue", initial), flag2(this, "finalDeltaValue", final), flag2(this, "deltaBehavior", "change"), flag2(this, "realDelta", final !== initial), this.assert(
    initial !== final,
    "expected " + msgObj + " to change",
    "expected " + msgObj + " to not change"
  );
}
__name(assertChanges, "assertChanges");
Assertion.addMethod("change", assertChanges);
Assertion.addMethod("changes", assertChanges);
function assertIncreases(subject, prop, msg) {
  msg && flag2(this, "message", msg);
  let fn3 = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(fn3, flagMsg, ssfi, !0).is.a("function");
  let initial;
  prop ? (new Assertion(subject, flagMsg, ssfi, !0).to.have.property(prop), initial = subject[prop]) : (new Assertion(subject, flagMsg, ssfi, !0).is.a("function"), initial = subject()), new Assertion(initial, flagMsg, ssfi, !0).is.a("number"), fn3();
  let final = prop == null ? subject() : subject[prop], msgObj = prop == null ? initial : "." + prop;
  flag2(this, "deltaMsgObj", msgObj), flag2(this, "initialDeltaValue", initial), flag2(this, "finalDeltaValue", final), flag2(this, "deltaBehavior", "increase"), flag2(this, "realDelta", final - initial), this.assert(
    final - initial > 0,
    "expected " + msgObj + " to increase",
    "expected " + msgObj + " to not increase"
  );
}
__name(assertIncreases, "assertIncreases");
Assertion.addMethod("increase", assertIncreases);
Assertion.addMethod("increases", assertIncreases);
function assertDecreases(subject, prop, msg) {
  msg && flag2(this, "message", msg);
  let fn3 = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(fn3, flagMsg, ssfi, !0).is.a("function");
  let initial;
  prop ? (new Assertion(subject, flagMsg, ssfi, !0).to.have.property(prop), initial = subject[prop]) : (new Assertion(subject, flagMsg, ssfi, !0).is.a("function"), initial = subject()), new Assertion(initial, flagMsg, ssfi, !0).is.a("number"), fn3();
  let final = prop == null ? subject() : subject[prop], msgObj = prop == null ? initial : "." + prop;
  flag2(this, "deltaMsgObj", msgObj), flag2(this, "initialDeltaValue", initial), flag2(this, "finalDeltaValue", final), flag2(this, "deltaBehavior", "decrease"), flag2(this, "realDelta", initial - final), this.assert(
    final - initial < 0,
    "expected " + msgObj + " to decrease",
    "expected " + msgObj + " to not decrease"
  );
}
__name(assertDecreases, "assertDecreases");
Assertion.addMethod("decrease", assertDecreases);
Assertion.addMethod("decreases", assertDecreases);
function assertDelta(delta, msg) {
  msg && flag2(this, "message", msg);
  let msgObj = flag2(this, "deltaMsgObj"), initial = flag2(this, "initialDeltaValue"), final = flag2(this, "finalDeltaValue"), behavior2 = flag2(this, "deltaBehavior"), realDelta = flag2(this, "realDelta"), expression;
  behavior2 === "change" ? expression = Math.abs(final - initial) === Math.abs(delta) : expression = realDelta === Math.abs(delta), this.assert(
    expression,
    "expected " + msgObj + " to " + behavior2 + " by " + delta,
    "expected " + msgObj + " to not " + behavior2 + " by " + delta
  );
}
__name(assertDelta, "assertDelta");
Assertion.addMethod("by", assertDelta);
Assertion.addProperty("extensible", function() {
  let obj = flag2(this, "object"), isExtensible = obj === Object(obj) && Object.isExtensible(obj);
  this.assert(
    isExtensible,
    "expected #{this} to be extensible",
    "expected #{this} to not be extensible"
  );
});
Assertion.addProperty("sealed", function() {
  let obj = flag2(this, "object"), isSealed = obj === Object(obj) ? Object.isSealed(obj) : !0;
  this.assert(
    isSealed,
    "expected #{this} to be sealed",
    "expected #{this} to not be sealed"
  );
});
Assertion.addProperty("frozen", function() {
  let obj = flag2(this, "object"), isFrozen = obj === Object(obj) ? Object.isFrozen(obj) : !0;
  this.assert(
    isFrozen,
    "expected #{this} to be frozen",
    "expected #{this} to not be frozen"
  );
});
Assertion.addProperty("finite", function(_msg) {
  let obj = flag2(this, "object");
  this.assert(
    typeof obj == "number" && isFinite(obj),
    "expected #{this} to be a finite number",
    "expected #{this} to not be a finite number"
  );
});
function compareSubset(expected, actual) {
  return expected === actual ? !0 : typeof actual != typeof expected ? !1 : typeof expected != "object" || expected === null ? expected === actual : actual ? Array.isArray(expected) ? Array.isArray(actual) ? expected.every(function(exp) {
    return actual.some(function(act) {
      return compareSubset(exp, act);
    });
  }) : !1 : expected instanceof Date ? actual instanceof Date ? expected.getTime() === actual.getTime() : !1 : Object.keys(expected).every(function(key) {
    let expectedValue = expected[key], actualValue = actual[key];
    return typeof expectedValue == "object" && expectedValue !== null && actualValue !== null ? compareSubset(expectedValue, actualValue) : typeof expectedValue == "function" ? expectedValue(actualValue) : actualValue === expectedValue;
  }) : !1;
}
__name(compareSubset, "compareSubset");
Assertion.addMethod("containSubset", function(expected) {
  let actual = flag(this, "object"), showDiff = config.showDiff;
  this.assert(
    compareSubset(expected, actual),
    "expected #{act} to contain subset #{exp}",
    "expected #{act} to not contain subset #{exp}",
    expected,
    actual,
    showDiff
  );
});
function expect(val, message) {
  return new Assertion(val, message);
}
__name(expect, "expect");
expect.fail = function(actual, expected, message, operator) {
  throw arguments.length < 2 && (message = actual, actual = void 0), message = message || "expect.fail()", new AssertionError(
    message,
    {
      actual,
      expected,
      operator
    },
    expect.fail
  );
};
var should_exports = {};
__export2(should_exports, {
  Should: () => Should,
  should: () => should
});
function loadShould() {
  function shouldGetter() {
    return this instanceof String || this instanceof Number || this instanceof Boolean || typeof Symbol == "function" && this instanceof Symbol || typeof BigInt == "function" && this instanceof BigInt ? new Assertion(this.valueOf(), null, shouldGetter) : new Assertion(this, null, shouldGetter);
  }
  __name(shouldGetter, "shouldGetter");
  function shouldSetter(value) {
    Object.defineProperty(this, "should", {
      value,
      enumerable: !0,
      configurable: !0,
      writable: !0
    });
  }
  __name(shouldSetter, "shouldSetter"), Object.defineProperty(Object.prototype, "should", {
    set: shouldSetter,
    get: shouldGetter,
    configurable: !0
  });
  let should2 = {};
  return should2.fail = function(actual, expected, message, operator) {
    throw arguments.length < 2 && (message = actual, actual = void 0), message = message || "should.fail()", new AssertionError(
      message,
      {
        actual,
        expected,
        operator
      },
      should2.fail
    );
  }, should2.equal = function(actual, expected, message) {
    new Assertion(actual, message).to.equal(expected);
  }, should2.Throw = function(fn3, errt, errs, msg) {
    new Assertion(fn3, msg).to.Throw(errt, errs);
  }, should2.exist = function(val, msg) {
    new Assertion(val, msg).to.exist;
  }, should2.not = {}, should2.not.equal = function(actual, expected, msg) {
    new Assertion(actual, msg).to.not.equal(expected);
  }, should2.not.Throw = function(fn3, errt, errs, msg) {
    new Assertion(fn3, msg).to.not.Throw(errt, errs);
  }, should2.not.exist = function(val, msg) {
    new Assertion(val, msg).to.not.exist;
  }, should2.throw = should2.Throw, should2.not.throw = should2.not.Throw, should2;
}
__name(loadShould, "loadShould");
var should = loadShould, Should = loadShould;
function assert(express, errmsg) {
  new Assertion(null, null, assert, !0).assert(express, errmsg, "[ negation message unavailable ]");
}
__name(assert, "assert");
assert.fail = function(actual, expected, message, operator) {
  throw arguments.length < 2 && (message = actual, actual = void 0), message = message || "assert.fail()", new AssertionError(
    message,
    {
      actual,
      expected,
      operator
    },
    assert.fail
  );
};
assert.isOk = function(val, msg) {
  new Assertion(val, msg, assert.isOk, !0).is.ok;
};
assert.isNotOk = function(val, msg) {
  new Assertion(val, msg, assert.isNotOk, !0).is.not.ok;
};
assert.equal = function(act, exp, msg) {
  let test2 = new Assertion(act, msg, assert.equal, !0);
  test2.assert(
    exp == flag(test2, "object"),
    "expected #{this} to equal #{exp}",
    "expected #{this} to not equal #{act}",
    exp,
    act,
    !0
  );
};
assert.notEqual = function(act, exp, msg) {
  let test2 = new Assertion(act, msg, assert.notEqual, !0);
  test2.assert(
    exp != flag(test2, "object"),
    "expected #{this} to not equal #{exp}",
    "expected #{this} to equal #{act}",
    exp,
    act,
    !0
  );
};
assert.strictEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert.strictEqual, !0).to.equal(exp);
};
assert.notStrictEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert.notStrictEqual, !0).to.not.equal(exp);
};
assert.deepEqual = assert.deepStrictEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert.deepEqual, !0).to.eql(exp);
};
assert.notDeepEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert.notDeepEqual, !0).to.not.eql(exp);
};
assert.isAbove = function(val, abv, msg) {
  new Assertion(val, msg, assert.isAbove, !0).to.be.above(abv);
};
assert.isAtLeast = function(val, atlst, msg) {
  new Assertion(val, msg, assert.isAtLeast, !0).to.be.least(atlst);
};
assert.isBelow = function(val, blw, msg) {
  new Assertion(val, msg, assert.isBelow, !0).to.be.below(blw);
};
assert.isAtMost = function(val, atmst, msg) {
  new Assertion(val, msg, assert.isAtMost, !0).to.be.most(atmst);
};
assert.isTrue = function(val, msg) {
  new Assertion(val, msg, assert.isTrue, !0).is.true;
};
assert.isNotTrue = function(val, msg) {
  new Assertion(val, msg, assert.isNotTrue, !0).to.not.equal(!0);
};
assert.isFalse = function(val, msg) {
  new Assertion(val, msg, assert.isFalse, !0).is.false;
};
assert.isNotFalse = function(val, msg) {
  new Assertion(val, msg, assert.isNotFalse, !0).to.not.equal(!1);
};
assert.isNull = function(val, msg) {
  new Assertion(val, msg, assert.isNull, !0).to.equal(null);
};
assert.isNotNull = function(val, msg) {
  new Assertion(val, msg, assert.isNotNull, !0).to.not.equal(null);
};
assert.isNaN = function(val, msg) {
  new Assertion(val, msg, assert.isNaN, !0).to.be.NaN;
};
assert.isNotNaN = function(value, message) {
  new Assertion(value, message, assert.isNotNaN, !0).not.to.be.NaN;
};
assert.exists = function(val, msg) {
  new Assertion(val, msg, assert.exists, !0).to.exist;
};
assert.notExists = function(val, msg) {
  new Assertion(val, msg, assert.notExists, !0).to.not.exist;
};
assert.isUndefined = function(val, msg) {
  new Assertion(val, msg, assert.isUndefined, !0).to.equal(void 0);
};
assert.isDefined = function(val, msg) {
  new Assertion(val, msg, assert.isDefined, !0).to.not.equal(void 0);
};
assert.isCallable = function(value, message) {
  new Assertion(value, message, assert.isCallable, !0).is.callable;
};
assert.isNotCallable = function(value, message) {
  new Assertion(value, message, assert.isNotCallable, !0).is.not.callable;
};
assert.isObject = function(val, msg) {
  new Assertion(val, msg, assert.isObject, !0).to.be.a("object");
};
assert.isNotObject = function(val, msg) {
  new Assertion(val, msg, assert.isNotObject, !0).to.not.be.a("object");
};
assert.isArray = function(val, msg) {
  new Assertion(val, msg, assert.isArray, !0).to.be.an("array");
};
assert.isNotArray = function(val, msg) {
  new Assertion(val, msg, assert.isNotArray, !0).to.not.be.an("array");
};
assert.isString = function(val, msg) {
  new Assertion(val, msg, assert.isString, !0).to.be.a("string");
};
assert.isNotString = function(val, msg) {
  new Assertion(val, msg, assert.isNotString, !0).to.not.be.a("string");
};
assert.isNumber = function(val, msg) {
  new Assertion(val, msg, assert.isNumber, !0).to.be.a("number");
};
assert.isNotNumber = function(val, msg) {
  new Assertion(val, msg, assert.isNotNumber, !0).to.not.be.a("number");
};
assert.isNumeric = function(val, msg) {
  new Assertion(val, msg, assert.isNumeric, !0).is.numeric;
};
assert.isNotNumeric = function(val, msg) {
  new Assertion(val, msg, assert.isNotNumeric, !0).is.not.numeric;
};
assert.isFinite = function(val, msg) {
  new Assertion(val, msg, assert.isFinite, !0).to.be.finite;
};
assert.isBoolean = function(val, msg) {
  new Assertion(val, msg, assert.isBoolean, !0).to.be.a("boolean");
};
assert.isNotBoolean = function(val, msg) {
  new Assertion(val, msg, assert.isNotBoolean, !0).to.not.be.a("boolean");
};
assert.typeOf = function(val, type32, msg) {
  new Assertion(val, msg, assert.typeOf, !0).to.be.a(type32);
};
assert.notTypeOf = function(value, type32, message) {
  new Assertion(value, message, assert.notTypeOf, !0).to.not.be.a(type32);
};
assert.instanceOf = function(val, type32, msg) {
  new Assertion(val, msg, assert.instanceOf, !0).to.be.instanceOf(type32);
};
assert.notInstanceOf = function(val, type32, msg) {
  new Assertion(val, msg, assert.notInstanceOf, !0).to.not.be.instanceOf(
    type32
  );
};
assert.include = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.include, !0).include(inc);
};
assert.notInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.notInclude, !0).not.include(inc);
};
assert.deepInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.deepInclude, !0).deep.include(inc);
};
assert.notDeepInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.notDeepInclude, !0).not.deep.include(inc);
};
assert.nestedInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.nestedInclude, !0).nested.include(inc);
};
assert.notNestedInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.notNestedInclude, !0).not.nested.include(
    inc
  );
};
assert.deepNestedInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.deepNestedInclude, !0).deep.nested.include(
    inc
  );
};
assert.notDeepNestedInclude = function(exp, inc, msg) {
  new Assertion(
    exp,
    msg,
    assert.notDeepNestedInclude,
    !0
  ).not.deep.nested.include(inc);
};
assert.ownInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.ownInclude, !0).own.include(inc);
};
assert.notOwnInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.notOwnInclude, !0).not.own.include(inc);
};
assert.deepOwnInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.deepOwnInclude, !0).deep.own.include(inc);
};
assert.notDeepOwnInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert.notDeepOwnInclude, !0).not.deep.own.include(
    inc
  );
};
assert.match = function(exp, re, msg) {
  new Assertion(exp, msg, assert.match, !0).to.match(re);
};
assert.notMatch = function(exp, re, msg) {
  new Assertion(exp, msg, assert.notMatch, !0).to.not.match(re);
};
assert.property = function(obj, prop, msg) {
  new Assertion(obj, msg, assert.property, !0).to.have.property(prop);
};
assert.notProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert.notProperty, !0).to.not.have.property(prop);
};
assert.propertyVal = function(obj, prop, val, msg) {
  new Assertion(obj, msg, assert.propertyVal, !0).to.have.property(prop, val);
};
assert.notPropertyVal = function(obj, prop, val, msg) {
  new Assertion(obj, msg, assert.notPropertyVal, !0).to.not.have.property(
    prop,
    val
  );
};
assert.deepPropertyVal = function(obj, prop, val, msg) {
  new Assertion(obj, msg, assert.deepPropertyVal, !0).to.have.deep.property(
    prop,
    val
  );
};
assert.notDeepPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert.notDeepPropertyVal,
    !0
  ).to.not.have.deep.property(prop, val);
};
assert.ownProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert.ownProperty, !0).to.have.own.property(prop);
};
assert.notOwnProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert.notOwnProperty, !0).to.not.have.own.property(
    prop
  );
};
assert.ownPropertyVal = function(obj, prop, value, msg) {
  new Assertion(obj, msg, assert.ownPropertyVal, !0).to.have.own.property(
    prop,
    value
  );
};
assert.notOwnPropertyVal = function(obj, prop, value, msg) {
  new Assertion(
    obj,
    msg,
    assert.notOwnPropertyVal,
    !0
  ).to.not.have.own.property(prop, value);
};
assert.deepOwnPropertyVal = function(obj, prop, value, msg) {
  new Assertion(
    obj,
    msg,
    assert.deepOwnPropertyVal,
    !0
  ).to.have.deep.own.property(prop, value);
};
assert.notDeepOwnPropertyVal = function(obj, prop, value, msg) {
  new Assertion(
    obj,
    msg,
    assert.notDeepOwnPropertyVal,
    !0
  ).to.not.have.deep.own.property(prop, value);
};
assert.nestedProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert.nestedProperty, !0).to.have.nested.property(
    prop
  );
};
assert.notNestedProperty = function(obj, prop, msg) {
  new Assertion(
    obj,
    msg,
    assert.notNestedProperty,
    !0
  ).to.not.have.nested.property(prop);
};
assert.nestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert.nestedPropertyVal,
    !0
  ).to.have.nested.property(prop, val);
};
assert.notNestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert.notNestedPropertyVal,
    !0
  ).to.not.have.nested.property(prop, val);
};
assert.deepNestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert.deepNestedPropertyVal,
    !0
  ).to.have.deep.nested.property(prop, val);
};
assert.notDeepNestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert.notDeepNestedPropertyVal,
    !0
  ).to.not.have.deep.nested.property(prop, val);
};
assert.lengthOf = function(exp, len, msg) {
  new Assertion(exp, msg, assert.lengthOf, !0).to.have.lengthOf(len);
};
assert.hasAnyKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.hasAnyKeys, !0).to.have.any.keys(keys2);
};
assert.hasAllKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.hasAllKeys, !0).to.have.all.keys(keys2);
};
assert.containsAllKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.containsAllKeys, !0).to.contain.all.keys(
    keys2
  );
};
assert.doesNotHaveAnyKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.doesNotHaveAnyKeys, !0).to.not.have.any.keys(
    keys2
  );
};
assert.doesNotHaveAllKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.doesNotHaveAllKeys, !0).to.not.have.all.keys(
    keys2
  );
};
assert.hasAnyDeepKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.hasAnyDeepKeys, !0).to.have.any.deep.keys(
    keys2
  );
};
assert.hasAllDeepKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert.hasAllDeepKeys, !0).to.have.all.deep.keys(
    keys2
  );
};
assert.containsAllDeepKeys = function(obj, keys2, msg) {
  new Assertion(
    obj,
    msg,
    assert.containsAllDeepKeys,
    !0
  ).to.contain.all.deep.keys(keys2);
};
assert.doesNotHaveAnyDeepKeys = function(obj, keys2, msg) {
  new Assertion(
    obj,
    msg,
    assert.doesNotHaveAnyDeepKeys,
    !0
  ).to.not.have.any.deep.keys(keys2);
};
assert.doesNotHaveAllDeepKeys = function(obj, keys2, msg) {
  new Assertion(
    obj,
    msg,
    assert.doesNotHaveAllDeepKeys,
    !0
  ).to.not.have.all.deep.keys(keys2);
};
assert.throws = function(fn3, errorLike, errMsgMatcher, msg) {
  (typeof errorLike == "string" || errorLike instanceof RegExp) && (errMsgMatcher = errorLike, errorLike = null);
  let assertErr = new Assertion(fn3, msg, assert.throws, !0).to.throw(
    errorLike,
    errMsgMatcher
  );
  return flag(assertErr, "object");
};
assert.doesNotThrow = function(fn3, errorLike, errMsgMatcher, message) {
  (typeof errorLike == "string" || errorLike instanceof RegExp) && (errMsgMatcher = errorLike, errorLike = null), new Assertion(fn3, message, assert.doesNotThrow, !0).to.not.throw(
    errorLike,
    errMsgMatcher
  );
};
assert.operator = function(val, operator, val2, msg) {
  let ok;
  switch (operator) {
    case "==":
      ok = val == val2;
      break;
    case "===":
      ok = val === val2;
      break;
    case ">":
      ok = val > val2;
      break;
    case ">=":
      ok = val >= val2;
      break;
    case "<":
      ok = val < val2;
      break;
    case "<=":
      ok = val <= val2;
      break;
    case "!=":
      ok = val != val2;
      break;
    case "!==":
      ok = val !== val2;
      break;
    default:
      throw msg = msg && msg + ": ", new AssertionError(
        msg + 'Invalid operator "' + operator + '"',
        void 0,
        assert.operator
      );
  }
  let test2 = new Assertion(ok, msg, assert.operator, !0);
  test2.assert(
    flag(test2, "object") === !0,
    "expected " + inspect2(val) + " to be " + operator + " " + inspect2(val2),
    "expected " + inspect2(val) + " to not be " + operator + " " + inspect2(val2)
  );
};
assert.closeTo = function(act, exp, delta, msg) {
  new Assertion(act, msg, assert.closeTo, !0).to.be.closeTo(exp, delta);
};
assert.approximately = function(act, exp, delta, msg) {
  new Assertion(act, msg, assert.approximately, !0).to.be.approximately(
    exp,
    delta
  );
};
assert.sameMembers = function(set1, set2, msg) {
  new Assertion(set1, msg, assert.sameMembers, !0).to.have.same.members(set2);
};
assert.notSameMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.notSameMembers,
    !0
  ).to.not.have.same.members(set2);
};
assert.sameDeepMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.sameDeepMembers,
    !0
  ).to.have.same.deep.members(set2);
};
assert.notSameDeepMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.notSameDeepMembers,
    !0
  ).to.not.have.same.deep.members(set2);
};
assert.sameOrderedMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.sameOrderedMembers,
    !0
  ).to.have.same.ordered.members(set2);
};
assert.notSameOrderedMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.notSameOrderedMembers,
    !0
  ).to.not.have.same.ordered.members(set2);
};
assert.sameDeepOrderedMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.sameDeepOrderedMembers,
    !0
  ).to.have.same.deep.ordered.members(set2);
};
assert.notSameDeepOrderedMembers = function(set1, set2, msg) {
  new Assertion(
    set1,
    msg,
    assert.notSameDeepOrderedMembers,
    !0
  ).to.not.have.same.deep.ordered.members(set2);
};
assert.includeMembers = function(superset, subset, msg) {
  new Assertion(superset, msg, assert.includeMembers, !0).to.include.members(
    subset
  );
};
assert.notIncludeMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.notIncludeMembers,
    !0
  ).to.not.include.members(subset);
};
assert.includeDeepMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.includeDeepMembers,
    !0
  ).to.include.deep.members(subset);
};
assert.notIncludeDeepMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.notIncludeDeepMembers,
    !0
  ).to.not.include.deep.members(subset);
};
assert.includeOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.includeOrderedMembers,
    !0
  ).to.include.ordered.members(subset);
};
assert.notIncludeOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.notIncludeOrderedMembers,
    !0
  ).to.not.include.ordered.members(subset);
};
assert.includeDeepOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.includeDeepOrderedMembers,
    !0
  ).to.include.deep.ordered.members(subset);
};
assert.notIncludeDeepOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert.notIncludeDeepOrderedMembers,
    !0
  ).to.not.include.deep.ordered.members(subset);
};
assert.oneOf = function(inList, list, msg) {
  new Assertion(inList, msg, assert.oneOf, !0).to.be.oneOf(list);
};
assert.isIterable = function(obj, msg) {
  if (obj == null || !obj[Symbol.iterator])
    throw msg = msg ? `${msg} expected ${inspect2(obj)} to be an iterable` : `expected ${inspect2(obj)} to be an iterable`, new AssertionError(msg, void 0, assert.isIterable);
};
assert.changes = function(fn3, obj, prop, msg) {
  arguments.length === 3 && typeof obj == "function" && (msg = prop, prop = null), new Assertion(fn3, msg, assert.changes, !0).to.change(obj, prop);
};
assert.changesBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  new Assertion(fn3, msg, assert.changesBy, !0).to.change(obj, prop).by(delta);
};
assert.doesNotChange = function(fn3, obj, prop, msg) {
  return arguments.length === 3 && typeof obj == "function" && (msg = prop, prop = null), new Assertion(fn3, msg, assert.doesNotChange, !0).to.not.change(
    obj,
    prop
  );
};
assert.changesButNotBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  new Assertion(fn3, msg, assert.changesButNotBy, !0).to.change(obj, prop).but.not.by(delta);
};
assert.increases = function(fn3, obj, prop, msg) {
  return arguments.length === 3 && typeof obj == "function" && (msg = prop, prop = null), new Assertion(fn3, msg, assert.increases, !0).to.increase(obj, prop);
};
assert.increasesBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  new Assertion(fn3, msg, assert.increasesBy, !0).to.increase(obj, prop).by(delta);
};
assert.doesNotIncrease = function(fn3, obj, prop, msg) {
  return arguments.length === 3 && typeof obj == "function" && (msg = prop, prop = null), new Assertion(fn3, msg, assert.doesNotIncrease, !0).to.not.increase(
    obj,
    prop
  );
};
assert.increasesButNotBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  new Assertion(fn3, msg, assert.increasesButNotBy, !0).to.increase(obj, prop).but.not.by(delta);
};
assert.decreases = function(fn3, obj, prop, msg) {
  return arguments.length === 3 && typeof obj == "function" && (msg = prop, prop = null), new Assertion(fn3, msg, assert.decreases, !0).to.decrease(obj, prop);
};
assert.decreasesBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  new Assertion(fn3, msg, assert.decreasesBy, !0).to.decrease(obj, prop).by(delta);
};
assert.doesNotDecrease = function(fn3, obj, prop, msg) {
  return arguments.length === 3 && typeof obj == "function" && (msg = prop, prop = null), new Assertion(fn3, msg, assert.doesNotDecrease, !0).to.not.decrease(
    obj,
    prop
  );
};
assert.doesNotDecreaseBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  return new Assertion(fn3, msg, assert.doesNotDecreaseBy, !0).to.not.decrease(obj, prop).by(delta);
};
assert.decreasesButNotBy = function(fn3, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj == "function") {
    let tmpMsg = delta;
    delta = prop, msg = tmpMsg;
  } else arguments.length === 3 && (delta = prop, prop = null);
  new Assertion(fn3, msg, assert.decreasesButNotBy, !0).to.decrease(obj, prop).but.not.by(delta);
};
assert.ifError = function(val) {
  if (val)
    throw val;
};
assert.isExtensible = function(obj, msg) {
  new Assertion(obj, msg, assert.isExtensible, !0).to.be.extensible;
};
assert.isNotExtensible = function(obj, msg) {
  new Assertion(obj, msg, assert.isNotExtensible, !0).to.not.be.extensible;
};
assert.isSealed = function(obj, msg) {
  new Assertion(obj, msg, assert.isSealed, !0).to.be.sealed;
};
assert.isNotSealed = function(obj, msg) {
  new Assertion(obj, msg, assert.isNotSealed, !0).to.not.be.sealed;
};
assert.isFrozen = function(obj, msg) {
  new Assertion(obj, msg, assert.isFrozen, !0).to.be.frozen;
};
assert.isNotFrozen = function(obj, msg) {
  new Assertion(obj, msg, assert.isNotFrozen, !0).to.not.be.frozen;
};
assert.isEmpty = function(val, msg) {
  new Assertion(val, msg, assert.isEmpty, !0).to.be.empty;
};
assert.isNotEmpty = function(val, msg) {
  new Assertion(val, msg, assert.isNotEmpty, !0).to.not.be.empty;
};
assert.containsSubset = function(val, exp, msg) {
  new Assertion(val, msg).to.containSubset(exp);
};
assert.doesNotContainSubset = function(val, exp, msg) {
  new Assertion(val, msg).to.not.containSubset(exp);
};
var aliases = [
  ["isOk", "ok"],
  ["isNotOk", "notOk"],
  ["throws", "throw"],
  ["throws", "Throw"],
  ["isExtensible", "extensible"],
  ["isNotExtensible", "notExtensible"],
  ["isSealed", "sealed"],
  ["isNotSealed", "notSealed"],
  ["isFrozen", "frozen"],
  ["isNotFrozen", "notFrozen"],
  ["isEmpty", "empty"],
  ["isNotEmpty", "notEmpty"],
  ["isCallable", "isFunction"],
  ["isNotCallable", "isNotFunction"],
  ["containsSubset", "containSubset"]
];
for (let [name, as] of aliases)
  assert[as] = assert[name];
var used = [];
function use(fn3) {
  let exports = {
    use,
    AssertionError,
    util: utils_exports,
    config,
    expect,
    assert,
    Assertion,
    ...should_exports
  };
  return ~used.indexOf(fn3) || (fn3(exports, utils_exports), used.push(fn3)), exports;
}
__name(use, "use");

// ../node_modules/@testing-library/jest-dom/dist/matchers.mjs
var matchers_exports = {};
__export(matchers_exports, {
  toAppearAfter: () => toAppearAfter,
  toAppearBefore: () => toAppearBefore,
  toBeChecked: () => toBeChecked,
  toBeDisabled: () => toBeDisabled,
  toBeEmpty: () => toBeEmpty,
  toBeEmptyDOMElement: () => toBeEmptyDOMElement,
  toBeEnabled: () => toBeEnabled,
  toBeInTheDOM: () => toBeInTheDOM,
  toBeInTheDocument: () => toBeInTheDocument,
  toBeInvalid: () => toBeInvalid,
  toBePartiallyChecked: () => toBePartiallyChecked,
  toBePartiallyPressed: () => toBePartiallyPressed,
  toBePressed: () => toBePressed,
  toBeRequired: () => toBeRequired,
  toBeValid: () => toBeValid,
  toBeVisible: () => toBeVisible,
  toContainElement: () => toContainElement,
  toContainHTML: () => toContainHTML,
  toHaveAccessibleDescription: () => toHaveAccessibleDescription,
  toHaveAccessibleErrorMessage: () => toHaveAccessibleErrorMessage,
  toHaveAccessibleName: () => toHaveAccessibleName,
  toHaveAttribute: () => toHaveAttribute,
  toHaveClass: () => toHaveClass,
  toHaveDescription: () => toHaveDescription,
  toHaveDisplayValue: () => toHaveDisplayValue,
  toHaveErrorMessage: () => toHaveErrorMessage,
  toHaveFocus: () => toHaveFocus,
  toHaveFormValues: () => toHaveFormValues,
  toHaveRole: () => toHaveRole,
  toHaveSelection: () => toHaveSelection,
  toHaveStyle: () => toHaveStyle,
  toHaveTextContent: () => toHaveTextContent,
  toHaveValue: () => toHaveValue
});

// ../node_modules/@testing-library/jest-dom/dist/matchers-35e4d3bd.mjs
var import_redent = __toESM(require_redent(), 1);

// ../node_modules/@adobe/css-tools/dist/esm/adobe-css-tools.mjs
var t = class extends Error {
  reason;
  filename;
  line;
  column;
  source;
  constructor(t2, e2, i2, s3, n2) {
    super(`${t2}:${i2}:${s3}: ${e2}`), this.reason = e2, this.filename = t2, this.line = i2, this.column = s3, this.source = n2;
  }
}, e = class {
  start;
  end;
  source;
  constructor(t2, e2, i2) {
    this.start = t2, this.end = e2, this.source = i2;
  }
}, i;
(function(t2) {
  t2.stylesheet = "stylesheet", t2.rule = "rule", t2.declaration = "declaration", t2.comment = "comment", t2.container = "container", t2.charset = "charset", t2.document = "document", t2.customMedia = "custom-media", t2.fontFace = "font-face", t2.host = "host", t2.import = "import", t2.keyframes = "keyframes", t2.keyframe = "keyframe", t2.layer = "layer", t2.media = "media", t2.namespace = "namespace", t2.page = "page", t2.startingStyle = "starting-style", t2.supports = "supports";
})(i || (i = {}));
var s2 = (t2, e2, i2) => {
  let s3 = i2, n2 = 1e4;
  do {
    let i3 = e2.map((e3) => t2.indexOf(e3, s3));
    i3.push(t2.indexOf("\\", s3));
    let r2 = i3.filter((t3) => t3 !== -1);
    if (r2.length === 0) return -1;
    let o2 = Math.min(...r2);
    if (t2[o2] !== "\\") return o2;
    s3 = o2 + 2, n2--;
  } while (n2 > 0);
  throw new Error("Too many escaping");
}, n = (t2, e2, i2) => {
  let r2 = i2, o2 = 1e4;
  do {
    let i3 = e2.map((e3) => t2.indexOf(e3, r2));
    i3.push(t2.indexOf("(", r2)), i3.push(t2.indexOf('"', r2)), i3.push(t2.indexOf("'", r2)), i3.push(t2.indexOf("\\", r2));
    let c2 = i3.filter((t3) => t3 !== -1);
    if (c2.length === 0) return -1;
    let a = Math.min(...c2);
    switch (t2[a]) {
      case "\\":
        r2 = a + 2;
        break;
      case "(":
        {
          let e3 = n(t2, [")"], a + 1);
          if (e3 === -1) return -1;
          r2 = e3 + 1;
        }
        break;
      case '"':
        {
          let e3 = s2(t2, ['"'], a + 1);
          if (e3 === -1) return -1;
          r2 = e3 + 1;
        }
        break;
      case "'":
        {
          let e3 = s2(t2, ["'"], a + 1);
          if (e3 === -1) return -1;
          r2 = e3 + 1;
        }
        break;
      default:
        return a;
    }
    o2--;
  } while (o2 > 0);
  throw new Error("Too many escaping");
}, r = /\/\*[^]*?(?:\*\/|$)/g;
function o(t2) {
  return t2 ? t2.trim() : "";
}
function c(t2, e2) {
  let i2 = t2 && typeof t2.type == "string", s3 = i2 ? t2 : e2;
  for (let e3 in t2) {
    let i3 = t2[e3];
    Array.isArray(i3) ? i3.forEach((t3) => {
      c(t3, s3);
    }) : i3 && typeof i3 == "object" && c(i3, s3);
  }
  return i2 && Object.defineProperty(t2, "parent", { configurable: !0, writable: !0, enumerable: !1, value: e2 || null }), t2;
}
var m = (s3, a) => {
  a = a || {};
  let m2 = 1, h2 = 1;
  function u3() {
    let t2 = { line: m2, column: h2 };
    return (i2) => (i2.position = new e(t2, { line: m2, column: h2 }, a?.source || ""), $(), i2);
  }
  let p = [];
  function l2(e2) {
    let i2 = new t(a?.source || "", e2, m2, h2, s3);
    if (!a?.silent) throw i2;
    p.push(i2);
  }
  function f3() {
    let t2 = /^{\s*/.exec(s3);
    return !!t2 && (g2(t2), !0);
  }
  function d() {
    let t2 = /^}/.exec(s3);
    return !!t2 && (g2(t2), !0);
  }
  function y2() {
    let t2, e2 = [];
    for ($(), x2(e2); s3.length && s3.charAt(0) !== "}" && (t2 = A() || S2(), t2); ) e2.push(t2), x2(e2);
    return e2;
  }
  function g2(t2) {
    let e2 = t2[0];
    return (function(t3) {
      let e3 = t3.match(/\n/g);
      e3 && (m2 += e3.length);
      let i2 = t3.lastIndexOf(`
`);
      h2 = ~i2 ? t3.length - i2 : h2 + t3.length;
    })(e2), s3 = s3.slice(e2.length), t2;
  }
  function $() {
    let t2 = /^\s*/.exec(s3);
    t2 && g2(t2);
  }
  function x2(t2) {
    t2 = t2 || [];
    let e2 = V();
    for (; e2; ) t2.push(e2), e2 = V();
    return t2;
  }
  function V() {
    let t2 = u3();
    if (s3.charAt(0) !== "/" || s3.charAt(1) !== "*") return;
    let e2 = /^\/\*[^]*?\*\//.exec(s3);
    return e2 ? (g2(e2), t2({ type: i.comment, comment: e2[0].slice(2, -2) })) : l2("End of comment missing");
  }
  function k2() {
    let t2 = /^([^{]+)/.exec(s3);
    if (t2)
      return g2(t2), ((t3, e2) => {
        let i2 = [], s4 = 0;
        for (; s4 < t3.length; ) {
          let r2 = n(t3, e2, s4);
          if (r2 === -1) return i2.push(t3.substring(s4)), i2;
          i2.push(t3.substring(s4, r2)), s4 = r2 + 1;
        }
        return i2;
      })(o(t2[0]).replace(r, ""), [","]).map((t3) => o(t3));
  }
  function v2() {
    let t2 = u3(), e2 = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/.exec(s3);
    if (!e2) return;
    g2(e2);
    let c2 = o(e2[0]), a2 = /^:\s*/.exec(s3);
    if (!a2) return l2("property missing ':'");
    g2(a2);
    let m3 = "", h3 = n(s3, [";", "}"]);
    h3 !== -1 && (m3 = s3.substring(0, h3), g2([m3]), m3 = o(m3).replace(r, ""));
    let p2 = t2({ type: i.declaration, property: c2.replace(r, ""), value: m3 }), f4 = /^[;\s]*/.exec(s3);
    return f4 && g2(f4), p2;
  }
  function w2() {
    let t2 = [];
    if (!f3()) return l2("missing '{'");
    x2(t2);
    let e2 = v2();
    for (; e2; ) t2.push(e2), x2(t2), e2 = v2();
    return d() ? t2 : l2("missing '}'");
  }
  function b2() {
    let t2 = [], e2 = u3(), n2 = /^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/.exec(s3);
    for (; n2; ) {
      let e3 = g2(n2);
      t2.push(e3[1]);
      let i2 = /^,\s*/.exec(s3);
      i2 && g2(i2), n2 = /^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/.exec(s3);
    }
    if (t2.length) return e2({ type: i.keyframe, values: t2, declarations: w2() || [] });
  }
  let j2 = M2("import"), O = M2("charset"), E2 = M2("namespace");
  function M2(t2) {
    let e2 = new RegExp("^@" + t2 + `\\s*((?::?[^;'"]|"(?:\\\\"|[^"])*?"|'(?:\\\\'|[^'])*?')+)(?:;|$)`);
    return () => {
      let i2 = u3(), n2 = e2.exec(s3);
      if (!n2) return;
      let r2 = g2(n2), o2 = { type: t2 };
      return o2[t2] = r2[1].trim(), i2(o2);
    };
  }
  function A() {
    if (s3[0] === "@") return (function() {
      let t2 = u3(), e2 = /^@([-\w]+)?keyframes\s*/.exec(s3);
      if (!e2) return;
      let n2 = g2(e2)[1], r2 = /^([-\w]+)\s*/.exec(s3);
      if (!r2) return l2("@keyframes missing name");
      let o2 = g2(r2)[1];
      if (!f3()) return l2("@keyframes missing '{'");
      let c2 = x2(), a2 = b2();
      for (; a2; ) c2.push(a2), c2 = c2.concat(x2()), a2 = b2();
      return d() ? t2({ type: i.keyframes, name: o2, vendor: n2, keyframes: c2 }) : l2("@keyframes missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@media *([^{]+)/.exec(s3);
      if (!e2) return;
      let n2 = o(g2(e2)[1]);
      if (!f3()) return l2("@media missing '{'");
      let r2 = x2().concat(y2());
      return d() ? t2({ type: i.media, media: n2, rules: r2 }) : l2("@media missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@custom-media\s+(--\S+)\s+([^{;\s][^{;]*);/.exec(s3);
      if (!e2) return;
      let n2 = g2(e2);
      return t2({ type: i.customMedia, name: o(n2[1]), media: o(n2[2]) });
    })() || (function() {
      let t2 = u3(), e2 = /^@supports *([^{]+)/.exec(s3);
      if (!e2) return;
      let n2 = o(g2(e2)[1]);
      if (!f3()) return l2("@supports missing '{'");
      let r2 = x2().concat(y2());
      return d() ? t2({ type: i.supports, supports: n2, rules: r2 }) : l2("@supports missing '}'");
    })() || j2() || O() || E2() || (function() {
      let t2 = u3(), e2 = /^@([-\w]+)?document *([^{]+)/.exec(s3);
      if (!e2) return;
      let n2 = g2(e2), r2 = o(n2[1]), c2 = o(n2[2]);
      if (!f3()) return l2("@document missing '{'");
      let a2 = x2().concat(y2());
      return d() ? t2({ type: i.document, document: c2, vendor: r2, rules: a2 }) : l2("@document missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@page */.exec(s3);
      if (!e2) return;
      g2(e2);
      let n2 = k2() || [];
      if (!f3()) return l2("@page missing '{'");
      let r2 = x2(), o2 = v2();
      for (; o2; ) r2.push(o2), r2 = r2.concat(x2()), o2 = v2();
      return d() ? t2({ type: i.page, selectors: n2, declarations: r2 }) : l2("@page missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@host\s*/.exec(s3);
      if (!e2) return;
      if (g2(e2), !f3()) return l2("@host missing '{'");
      let n2 = x2().concat(y2());
      return d() ? t2({ type: i.host, rules: n2 }) : l2("@host missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@font-face\s*/.exec(s3);
      if (!e2) return;
      if (g2(e2), !f3()) return l2("@font-face missing '{'");
      let n2 = x2(), r2 = v2();
      for (; r2; ) n2.push(r2), n2 = n2.concat(x2()), r2 = v2();
      return d() ? t2({ type: i.fontFace, declarations: n2 }) : l2("@font-face missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@container *([^{]+)/.exec(s3);
      if (!e2) return;
      let n2 = o(g2(e2)[1]);
      if (!f3()) return l2("@container missing '{'");
      let r2 = x2().concat(y2());
      return d() ? t2({ type: i.container, container: n2, rules: r2 }) : l2("@container missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@starting-style\s*/.exec(s3);
      if (!e2) return;
      if (g2(e2), !f3()) return l2("@starting-style missing '{'");
      let n2 = x2().concat(y2());
      return d() ? t2({ type: i.startingStyle, rules: n2 }) : l2("@starting-style missing '}'");
    })() || (function() {
      let t2 = u3(), e2 = /^@layer *([^{;@]+)/.exec(s3);
      if (!e2) return;
      let n2 = o(g2(e2)[1]);
      if (!f3()) {
        let e3 = /^[;\s]*/.exec(s3);
        return e3 && g2(e3), t2({ type: i.layer, layer: n2 });
      }
      let r2 = x2().concat(y2());
      return d() ? t2({ type: i.layer, layer: n2, rules: r2 }) : l2("@layer missing '}'");
    })();
  }
  function S2() {
    let t2 = u3(), e2 = k2();
    return e2 ? (x2(), t2({ type: i.rule, selectors: e2, declarations: w2() || [] })) : l2("selector missing");
  }
  return c((function() {
    let t2 = y2();
    return { type: i.stylesheet, stylesheet: { source: a?.source, rules: t2, parsingErrors: p } };
  })());
};

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/polyfills/array.from.mjs
var toStr = Object.prototype.toString;
function isCallable(fn3) {
  return typeof fn3 == "function" || toStr.call(fn3) === "[object Function]";
}
function toInteger(value) {
  var number = Number(value);
  return isNaN(number) ? 0 : number === 0 || !isFinite(number) ? number : (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
}
var maxSafeInteger = Math.pow(2, 53) - 1;
function toLength(value) {
  var len = toInteger(value);
  return Math.min(Math.max(len, 0), maxSafeInteger);
}
function arrayFrom(arrayLike, mapFn) {
  var C = Array, items = Object(arrayLike);
  if (arrayLike == null)
    throw new TypeError("Array.from requires an array-like object - not null or undefined");
  if (typeof mapFn < "u" && !isCallable(mapFn))
    throw new TypeError("Array.from: when provided, the second argument must be a function");
  for (var len = toLength(items.length), A = isCallable(C) ? Object(new C(len)) : new Array(len), k2 = 0, kValue; k2 < len; )
    kValue = items[k2], mapFn ? A[k2] = mapFn(kValue, k2) : A[k2] = kValue, k2 += 1;
  return A.length = len, A;
}

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/polyfills/SetLike.mjs
function _typeof(o2) {
  "@babel/helpers - typeof";
  return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o3) {
    return typeof o3;
  } : function(o3) {
    return o3 && typeof Symbol == "function" && o3.constructor === Symbol && o3 !== Symbol.prototype ? "symbol" : typeof o3;
  }, _typeof(o2);
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor))
    throw new TypeError("Cannot call a class as a function");
}
function _defineProperties(target, props) {
  for (var i2 = 0; i2 < props.length; i2++) {
    var descriptor = props[i2];
    descriptor.enumerable = descriptor.enumerable || !1, descriptor.configurable = !0, "value" in descriptor && (descriptor.writable = !0), Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  return protoProps && _defineProperties(Constructor.prototype, protoProps), staticProps && _defineProperties(Constructor, staticProps), Object.defineProperty(Constructor, "prototype", { writable: !1 }), Constructor;
}
function _defineProperty(obj, key, value) {
  return key = _toPropertyKey(key), key in obj ? Object.defineProperty(obj, key, { value, enumerable: !0, configurable: !0, writable: !0 }) : obj[key] = value, obj;
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return _typeof(key) === "symbol" ? key : String(key);
}
function _toPrimitive(input2, hint) {
  if (_typeof(input2) !== "object" || input2 === null) return input2;
  var prim = input2[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input2, hint || "default");
    if (_typeof(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input2);
}
var SetLike = (function() {
  function SetLike3() {
    var items = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    _classCallCheck(this, SetLike3), _defineProperty(this, "items", void 0), this.items = items;
  }
  return _createClass(SetLike3, [{
    key: "add",
    value: function(value) {
      return this.has(value) === !1 && this.items.push(value), this;
    }
  }, {
    key: "clear",
    value: function() {
      this.items = [];
    }
  }, {
    key: "delete",
    value: function(value) {
      var previousLength = this.items.length;
      return this.items = this.items.filter(function(item) {
        return item !== value;
      }), previousLength !== this.items.length;
    }
  }, {
    key: "forEach",
    value: function(callbackfn) {
      var _this = this;
      this.items.forEach(function(item) {
        callbackfn(item, item, _this);
      });
    }
  }, {
    key: "has",
    value: function(value) {
      return this.items.indexOf(value) !== -1;
    }
  }, {
    key: "size",
    get: function() {
      return this.items.length;
    }
  }]), SetLike3;
})(), SetLike_default = typeof Set > "u" ? Set : SetLike;

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/getRole.mjs
function getLocalName(element) {
  var _element$localName;
  return (
    // eslint-disable-next-line no-restricted-properties -- actual guard for environments without localName
    (_element$localName = element.localName) !== null && _element$localName !== void 0 ? _element$localName : (
      // eslint-disable-next-line no-restricted-properties -- required for the fallback
      element.tagName.toLowerCase()
    )
  );
}
var localNameToRoleMappings = {
  article: "article",
  aside: "complementary",
  button: "button",
  datalist: "listbox",
  dd: "definition",
  details: "group",
  dialog: "dialog",
  dt: "term",
  fieldset: "group",
  figure: "figure",
  // WARNING: Only with an accessible name
  form: "form",
  footer: "contentinfo",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  header: "banner",
  hr: "separator",
  html: "document",
  legend: "legend",
  li: "listitem",
  math: "math",
  main: "main",
  menu: "list",
  nav: "navigation",
  ol: "list",
  optgroup: "group",
  // WARNING: Only in certain context
  option: "option",
  output: "status",
  progress: "progressbar",
  // WARNING: Only with an accessible name
  section: "region",
  summary: "button",
  table: "table",
  tbody: "rowgroup",
  textarea: "textbox",
  tfoot: "rowgroup",
  // WARNING: Only in certain context
  td: "cell",
  th: "columnheader",
  thead: "rowgroup",
  tr: "row",
  ul: "list"
}, prohibitedAttributes = {
  caption: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  code: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  deletion: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  emphasis: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  generic: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby", "aria-roledescription"]),
  insertion: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  none: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  paragraph: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  presentation: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  strong: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  subscript: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  superscript: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"])
};
function hasGlobalAriaAttributes(element, role) {
  return [
    "aria-atomic",
    "aria-busy",
    "aria-controls",
    "aria-current",
    "aria-description",
    "aria-describedby",
    "aria-details",
    // "disabled",
    "aria-dropeffect",
    // "errormessage",
    "aria-flowto",
    "aria-grabbed",
    // "haspopup",
    "aria-hidden",
    // "invalid",
    "aria-keyshortcuts",
    "aria-label",
    "aria-labelledby",
    "aria-live",
    "aria-owns",
    "aria-relevant",
    "aria-roledescription"
  ].some(function(attributeName) {
    var _prohibitedAttributes;
    return element.hasAttribute(attributeName) && !((_prohibitedAttributes = prohibitedAttributes[role]) !== null && _prohibitedAttributes !== void 0 && _prohibitedAttributes.has(attributeName));
  });
}
function ignorePresentationalRole(element, implicitRole) {
  return hasGlobalAriaAttributes(element, implicitRole);
}
function getRole(element) {
  var explicitRole = getExplicitRole(element);
  if (explicitRole === null || presentationRoles.indexOf(explicitRole) !== -1) {
    var implicitRole = getImplicitRole(element);
    if (presentationRoles.indexOf(explicitRole || "") === -1 || ignorePresentationalRole(element, implicitRole || ""))
      return implicitRole;
  }
  return explicitRole;
}
function getImplicitRole(element) {
  var mappedByTag = localNameToRoleMappings[getLocalName(element)];
  if (mappedByTag !== void 0)
    return mappedByTag;
  switch (getLocalName(element)) {
    case "a":
    case "area":
    case "link":
      if (element.hasAttribute("href"))
        return "link";
      break;
    case "img":
      return element.getAttribute("alt") === "" && !ignorePresentationalRole(element, "img") ? "presentation" : "img";
    case "input": {
      var _ref = element, type5 = _ref.type;
      switch (type5) {
        case "button":
        case "image":
        case "reset":
        case "submit":
          return "button";
        case "checkbox":
        case "radio":
          return type5;
        case "range":
          return "slider";
        case "email":
        case "tel":
        case "text":
        case "url":
          return element.hasAttribute("list") ? "combobox" : "textbox";
        case "search":
          return element.hasAttribute("list") ? "combobox" : "searchbox";
        case "number":
          return "spinbutton";
        default:
          return null;
      }
    }
    case "select":
      return element.hasAttribute("multiple") || element.size > 1 ? "listbox" : "combobox";
  }
  return null;
}
function getExplicitRole(element) {
  var role = element.getAttribute("role");
  if (role !== null) {
    var explicitRole = role.trim().split(" ")[0];
    if (explicitRole.length > 0)
      return explicitRole;
  }
  return null;
}

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/util.mjs
var presentationRoles = ["presentation", "none"];
function isElement(node) {
  return node !== null && node.nodeType === node.ELEMENT_NODE;
}
function isHTMLTableCaptionElement(node) {
  return isElement(node) && getLocalName(node) === "caption";
}
function isHTMLInputElement(node) {
  return isElement(node) && getLocalName(node) === "input";
}
function isHTMLOptGroupElement(node) {
  return isElement(node) && getLocalName(node) === "optgroup";
}
function isHTMLSelectElement(node) {
  return isElement(node) && getLocalName(node) === "select";
}
function isHTMLTableElement(node) {
  return isElement(node) && getLocalName(node) === "table";
}
function isHTMLTextAreaElement(node) {
  return isElement(node) && getLocalName(node) === "textarea";
}
function safeWindow(node) {
  var _ref = node.ownerDocument === null ? node : node.ownerDocument, defaultView = _ref.defaultView;
  if (defaultView === null)
    throw new TypeError("no window available");
  return defaultView;
}
function isHTMLFieldSetElement(node) {
  return isElement(node) && getLocalName(node) === "fieldset";
}
function isHTMLLegendElement(node) {
  return isElement(node) && getLocalName(node) === "legend";
}
function isHTMLSlotElement(node) {
  return isElement(node) && getLocalName(node) === "slot";
}
function isSVGElement(node) {
  return isElement(node) && node.ownerSVGElement !== void 0;
}
function isSVGSVGElement(node) {
  return isElement(node) && getLocalName(node) === "svg";
}
function isSVGTitleElement(node) {
  return isSVGElement(node) && getLocalName(node) === "title";
}
function queryIdRefs(node, attributeName) {
  if (isElement(node) && node.hasAttribute(attributeName)) {
    var ids = node.getAttribute(attributeName).split(" "), root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    return ids.map(function(id) {
      return root.getElementById(id);
    }).filter(
      function(element) {
        return element !== null;
      }
      // TODO: why does this not narrow?
    );
  }
  return [];
}
function hasAnyConcreteRoles(node, roles3) {
  return isElement(node) ? roles3.indexOf(getRole(node)) !== -1 : !1;
}

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/accessible-name-and-description.mjs
function asFlatString(s3) {
  return s3.trim().replace(/\s\s+/g, " ");
}
function isHidden(node, getComputedStyleImplementation) {
  if (!isElement(node))
    return !1;
  if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true")
    return !0;
  var style = getComputedStyleImplementation(node);
  return style.getPropertyValue("display") === "none" || style.getPropertyValue("visibility") === "hidden";
}
function isControl(node) {
  return hasAnyConcreteRoles(node, ["button", "combobox", "listbox", "textbox"]) || hasAbstractRole(node, "range");
}
function hasAbstractRole(node, role) {
  if (!isElement(node))
    return !1;
  switch (role) {
    case "range":
      return hasAnyConcreteRoles(node, ["meter", "progressbar", "scrollbar", "slider", "spinbutton"]);
    default:
      throw new TypeError("No knowledge about abstract role '".concat(role, "'. This is likely a bug :("));
  }
}
function querySelectorAllSubtree(element, selectors) {
  var elements = arrayFrom(element.querySelectorAll(selectors));
  return queryIdRefs(element, "aria-owns").forEach(function(root) {
    elements.push.apply(elements, arrayFrom(root.querySelectorAll(selectors)));
  }), elements;
}
function querySelectedOptions(listbox) {
  return isHTMLSelectElement(listbox) ? listbox.selectedOptions || querySelectorAllSubtree(listbox, "[selected]") : querySelectorAllSubtree(listbox, '[aria-selected="true"]');
}
function isMarkedPresentational(node) {
  return hasAnyConcreteRoles(node, presentationRoles);
}
function isNativeHostLanguageTextAlternativeElement(node) {
  return isHTMLTableCaptionElement(node);
}
function allowsNameFromContent(node) {
  return hasAnyConcreteRoles(node, ["button", "cell", "checkbox", "columnheader", "gridcell", "heading", "label", "legend", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "row", "rowheader", "switch", "tab", "tooltip", "treeitem"]);
}
function isDescendantOfNativeHostLanguageTextAlternativeElement(node) {
  return !1;
}
function getValueOfTextbox(element) {
  return isHTMLInputElement(element) || isHTMLTextAreaElement(element) ? element.value : element.textContent || "";
}
function getTextualContent(declaration) {
  var content = declaration.getPropertyValue("content");
  return /^["'].*["']$/.test(content) ? content.slice(1, -1) : "";
}
function isLabelableElement(element) {
  var localName = getLocalName(element);
  return localName === "button" || localName === "input" && element.getAttribute("type") !== "hidden" || localName === "meter" || localName === "output" || localName === "progress" || localName === "select" || localName === "textarea";
}
function findLabelableElement(element) {
  if (isLabelableElement(element))
    return element;
  var labelableElement = null;
  return element.childNodes.forEach(function(childNode) {
    if (labelableElement === null && isElement(childNode)) {
      var descendantLabelableElement = findLabelableElement(childNode);
      descendantLabelableElement !== null && (labelableElement = descendantLabelableElement);
    }
  }), labelableElement;
}
function getControlOfLabel(label) {
  if (label.control !== void 0)
    return label.control;
  var htmlFor = label.getAttribute("for");
  return htmlFor !== null ? label.ownerDocument.getElementById(htmlFor) : findLabelableElement(label);
}
function getLabels(element) {
  var labelsProperty = element.labels;
  if (labelsProperty === null)
    return labelsProperty;
  if (labelsProperty !== void 0)
    return arrayFrom(labelsProperty);
  if (!isLabelableElement(element))
    return null;
  var document2 = element.ownerDocument;
  return arrayFrom(document2.querySelectorAll("label")).filter(function(label) {
    return getControlOfLabel(label) === element;
  });
}
function getSlotContents(slot) {
  var assignedNodes = slot.assignedNodes();
  return assignedNodes.length === 0 ? arrayFrom(slot.childNodes) : assignedNodes;
}
function computeTextAlternative(root) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, consultedNodes = new SetLike_default(), window2 = safeWindow(root), _options$compute = options.compute, compute = _options$compute === void 0 ? "name" : _options$compute, _options$computedStyl = options.computedStyleSupportsPseudoElements, computedStyleSupportsPseudoElements = _options$computedStyl === void 0 ? options.getComputedStyle !== void 0 : _options$computedStyl, _options$getComputedS = options.getComputedStyle, getComputedStyle = _options$getComputedS === void 0 ? window2.getComputedStyle.bind(window2) : _options$getComputedS, _options$hidden = options.hidden, hidden = _options$hidden === void 0 ? !1 : _options$hidden;
  function computeMiscTextAlternative(node, context) {
    var accumulatedText = "";
    if (isElement(node) && computedStyleSupportsPseudoElements) {
      var pseudoBefore = getComputedStyle(node, "::before"), beforeContent = getTextualContent(pseudoBefore);
      accumulatedText = "".concat(beforeContent, " ").concat(accumulatedText);
    }
    var childNodes = isHTMLSlotElement(node) ? getSlotContents(node) : arrayFrom(node.childNodes).concat(queryIdRefs(node, "aria-owns"));
    if (childNodes.forEach(function(child) {
      var result = computeTextAlternative3(child, {
        isEmbeddedInLabel: context.isEmbeddedInLabel,
        isReferenced: !1,
        recursion: !0
      }), display2 = isElement(child) ? getComputedStyle(child).getPropertyValue("display") : "inline", separator = display2 !== "inline" ? " " : "";
      accumulatedText += "".concat(separator).concat(result).concat(separator);
    }), isElement(node) && computedStyleSupportsPseudoElements) {
      var pseudoAfter = getComputedStyle(node, "::after"), afterContent = getTextualContent(pseudoAfter);
      accumulatedText = "".concat(accumulatedText, " ").concat(afterContent);
    }
    return accumulatedText.trim();
  }
  function useAttribute(element, attributeName) {
    var attribute = element.getAttributeNode(attributeName);
    return attribute !== null && !consultedNodes.has(attribute) && attribute.value.trim() !== "" ? (consultedNodes.add(attribute), attribute.value) : null;
  }
  function computeTooltipAttributeValue(node) {
    return isElement(node) ? useAttribute(node, "title") : null;
  }
  function computeElementTextAlternative(node) {
    if (!isElement(node))
      return null;
    if (isHTMLFieldSetElement(node)) {
      consultedNodes.add(node);
      for (var children = arrayFrom(node.childNodes), i2 = 0; i2 < children.length; i2 += 1) {
        var child = children[i2];
        if (isHTMLLegendElement(child))
          return computeTextAlternative3(child, {
            isEmbeddedInLabel: !1,
            isReferenced: !1,
            recursion: !1
          });
      }
    } else if (isHTMLTableElement(node)) {
      consultedNodes.add(node);
      for (var _children = arrayFrom(node.childNodes), _i = 0; _i < _children.length; _i += 1) {
        var _child = _children[_i];
        if (isHTMLTableCaptionElement(_child))
          return computeTextAlternative3(_child, {
            isEmbeddedInLabel: !1,
            isReferenced: !1,
            recursion: !1
          });
      }
    } else if (isSVGSVGElement(node)) {
      consultedNodes.add(node);
      for (var _children2 = arrayFrom(node.childNodes), _i2 = 0; _i2 < _children2.length; _i2 += 1) {
        var _child2 = _children2[_i2];
        if (isSVGTitleElement(_child2))
          return _child2.textContent;
      }
      return null;
    } else if (getLocalName(node) === "img" || getLocalName(node) === "area") {
      var nameFromAlt = useAttribute(node, "alt");
      if (nameFromAlt !== null)
        return nameFromAlt;
    } else if (isHTMLOptGroupElement(node)) {
      var nameFromLabel = useAttribute(node, "label");
      if (nameFromLabel !== null)
        return nameFromLabel;
    }
    if (isHTMLInputElement(node) && (node.type === "button" || node.type === "submit" || node.type === "reset")) {
      var nameFromValue = useAttribute(node, "value");
      if (nameFromValue !== null)
        return nameFromValue;
      if (node.type === "submit")
        return "Submit";
      if (node.type === "reset")
        return "Reset";
    }
    var labels = getLabels(node);
    if (labels !== null && labels.length !== 0)
      return consultedNodes.add(node), arrayFrom(labels).map(function(element) {
        return computeTextAlternative3(element, {
          isEmbeddedInLabel: !0,
          isReferenced: !1,
          recursion: !0
        });
      }).filter(function(label) {
        return label.length > 0;
      }).join(" ");
    if (isHTMLInputElement(node) && node.type === "image") {
      var _nameFromAlt = useAttribute(node, "alt");
      if (_nameFromAlt !== null)
        return _nameFromAlt;
      var nameFromTitle = useAttribute(node, "title");
      return nameFromTitle !== null ? nameFromTitle : "Submit Query";
    }
    if (hasAnyConcreteRoles(node, ["button"])) {
      var nameFromSubTree = computeMiscTextAlternative(node, {
        isEmbeddedInLabel: !1,
        isReferenced: !1
      });
      if (nameFromSubTree !== "")
        return nameFromSubTree;
    }
    return null;
  }
  function computeTextAlternative3(current, context) {
    if (consultedNodes.has(current))
      return "";
    if (!hidden && isHidden(current, getComputedStyle) && !context.isReferenced)
      return consultedNodes.add(current), "";
    var labelAttributeNode = isElement(current) ? current.getAttributeNode("aria-labelledby") : null, labelElements = labelAttributeNode !== null && !consultedNodes.has(labelAttributeNode) ? queryIdRefs(current, "aria-labelledby") : [];
    if (compute === "name" && !context.isReferenced && labelElements.length > 0)
      return consultedNodes.add(labelAttributeNode), labelElements.map(function(element) {
        return computeTextAlternative3(element, {
          isEmbeddedInLabel: context.isEmbeddedInLabel,
          isReferenced: !0,
          // this isn't recursion as specified, otherwise we would skip
          // `aria-label` in
          // <input id="myself" aria-label="foo" aria-labelledby="myself"
          recursion: !1
        });
      }).join(" ");
    var skipToStep2E = context.recursion && isControl(current) && compute === "name";
    if (!skipToStep2E) {
      var ariaLabel = (isElement(current) && current.getAttribute("aria-label") || "").trim();
      if (ariaLabel !== "" && compute === "name")
        return consultedNodes.add(current), ariaLabel;
      if (!isMarkedPresentational(current)) {
        var elementTextAlternative = computeElementTextAlternative(current);
        if (elementTextAlternative !== null)
          return consultedNodes.add(current), elementTextAlternative;
      }
    }
    if (hasAnyConcreteRoles(current, ["menu"]))
      return consultedNodes.add(current), "";
    if (skipToStep2E || context.isEmbeddedInLabel || context.isReferenced) {
      if (hasAnyConcreteRoles(current, ["combobox", "listbox"])) {
        consultedNodes.add(current);
        var selectedOptions = querySelectedOptions(current);
        return selectedOptions.length === 0 ? isHTMLInputElement(current) ? current.value : "" : arrayFrom(selectedOptions).map(function(selectedOption) {
          return computeTextAlternative3(selectedOption, {
            isEmbeddedInLabel: context.isEmbeddedInLabel,
            isReferenced: !1,
            recursion: !0
          });
        }).join(" ");
      }
      if (hasAbstractRole(current, "range"))
        return consultedNodes.add(current), current.hasAttribute("aria-valuetext") ? current.getAttribute("aria-valuetext") : current.hasAttribute("aria-valuenow") ? current.getAttribute("aria-valuenow") : current.getAttribute("value") || "";
      if (hasAnyConcreteRoles(current, ["textbox"]))
        return consultedNodes.add(current), getValueOfTextbox(current);
    }
    if (allowsNameFromContent(current) || isElement(current) && context.isReferenced || isNativeHostLanguageTextAlternativeElement(current) || isDescendantOfNativeHostLanguageTextAlternativeElement(current)) {
      var accumulatedText2F = computeMiscTextAlternative(current, {
        isEmbeddedInLabel: context.isEmbeddedInLabel,
        isReferenced: !1
      });
      if (accumulatedText2F !== "")
        return consultedNodes.add(current), accumulatedText2F;
    }
    if (current.nodeType === current.TEXT_NODE)
      return consultedNodes.add(current), current.textContent || "";
    if (context.recursion)
      return consultedNodes.add(current), computeMiscTextAlternative(current, {
        isEmbeddedInLabel: context.isEmbeddedInLabel,
        isReferenced: !1
      });
    var tooltipAttributeValue = computeTooltipAttributeValue(current);
    return tooltipAttributeValue !== null ? (consultedNodes.add(current), tooltipAttributeValue) : (consultedNodes.add(current), "");
  }
  return asFlatString(computeTextAlternative3(root, {
    isEmbeddedInLabel: !1,
    // by spec computeAccessibleDescription starts with the referenced elements as roots
    isReferenced: compute === "description",
    recursion: !1
  }));
}

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/accessible-description.mjs
function _typeof2(o2) {
  "@babel/helpers - typeof";
  return _typeof2 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o3) {
    return typeof o3;
  } : function(o3) {
    return o3 && typeof Symbol == "function" && o3.constructor === Symbol && o3 !== Symbol.prototype ? "symbol" : typeof o3;
  }, _typeof2(o2);
}
function ownKeys(e2, r2) {
  var t2 = Object.keys(e2);
  if (Object.getOwnPropertySymbols) {
    var o2 = Object.getOwnPropertySymbols(e2);
    r2 && (o2 = o2.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e2, r3).enumerable;
    })), t2.push.apply(t2, o2);
  }
  return t2;
}
function _objectSpread(e2) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = arguments[r2] != null ? arguments[r2] : {};
    r2 % 2 ? ownKeys(Object(t2), !0).forEach(function(r3) {
      _defineProperty2(e2, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(t2)) : ownKeys(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e2, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e2;
}
function _defineProperty2(obj, key, value) {
  return key = _toPropertyKey2(key), key in obj ? Object.defineProperty(obj, key, { value, enumerable: !0, configurable: !0, writable: !0 }) : obj[key] = value, obj;
}
function _toPropertyKey2(arg) {
  var key = _toPrimitive2(arg, "string");
  return _typeof2(key) === "symbol" ? key : String(key);
}
function _toPrimitive2(input2, hint) {
  if (_typeof2(input2) !== "object" || input2 === null) return input2;
  var prim = input2[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input2, hint || "default");
    if (_typeof2(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input2);
}
function computeAccessibleDescription(root) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, description = queryIdRefs(root, "aria-describedby").map(function(element) {
    return computeTextAlternative(element, _objectSpread(_objectSpread({}, options), {}, {
      compute: "description"
    }));
  }).join(" ");
  if (description === "") {
    var ariaDescription = root.getAttribute("aria-description");
    description = ariaDescription === null ? "" : ariaDescription;
  }
  if (description === "") {
    var title = root.getAttribute("title");
    description = title === null ? "" : title;
  }
  return description;
}

// ../node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/accessible-name.mjs
function prohibitsNaming(node) {
  return hasAnyConcreteRoles(node, ["caption", "code", "deletion", "emphasis", "generic", "insertion", "none", "paragraph", "presentation", "strong", "subscript", "superscript"]);
}
function computeAccessibleName(root) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return prohibitsNaming(root) ? "" : computeTextAlternative(root, options);
}

// ../node_modules/@testing-library/jest-dom/dist/matchers-35e4d3bd.mjs
var import_aria_query = __toESM(require_lib(), 1), import_picocolors = __toESM(require_picocolors_browser(), 1), import_css = __toESM(require_css_escape(), 1), GenericTypeError = class extends Error {
  constructor(expectedString, received, matcherFn, context) {
    super(), Error.captureStackTrace && Error.captureStackTrace(this, matcherFn);
    let withType = "";
    try {
      withType = context.utils.printWithType(
        "Received",
        received,
        context.utils.printReceived
      );
    } catch {
    }
    this.message = [
      context.utils.matcherHint(
        `${context.isNot ? ".not" : ""}.${matcherFn.name}`,
        "received",
        ""
      ),
      "",
      // eslint-disable-next-line new-cap
      `${context.utils.RECEIVED_COLOR(
        "received"
      )} value must ${expectedString}.`,
      withType
    ].join(`
`);
  }
}, HtmlElementTypeError = class extends GenericTypeError {
  constructor(...args) {
    super("be an HTMLElement or an SVGElement", ...args);
  }
}, NodeTypeError = class extends GenericTypeError {
  constructor(...args) {
    super("be a Node", ...args);
  }
};
function checkHasWindow(htmlElement, ErrorClass, ...args) {
  if (!htmlElement || !htmlElement.ownerDocument || !htmlElement.ownerDocument.defaultView)
    throw new ErrorClass(htmlElement, ...args);
}
function checkNode(node, ...args) {
  checkHasWindow(node, NodeTypeError, ...args);
  let window2 = node.ownerDocument.defaultView;
  if (!(node instanceof window2.Node))
    throw new NodeTypeError(node, ...args);
}
function checkHtmlElement(htmlElement, ...args) {
  checkHasWindow(htmlElement, HtmlElementTypeError, ...args);
  let window2 = htmlElement.ownerDocument.defaultView;
  if (!(htmlElement instanceof window2.HTMLElement) && !(htmlElement instanceof window2.SVGElement))
    throw new HtmlElementTypeError(htmlElement, ...args);
}
var InvalidCSSError = class extends Error {
  constructor(received, matcherFn, context) {
    super(), Error.captureStackTrace && Error.captureStackTrace(this, matcherFn), this.message = [
      received.message,
      "",
      // eslint-disable-next-line new-cap
      context.utils.RECEIVED_COLOR("Failing css:"),
      // eslint-disable-next-line new-cap
      context.utils.RECEIVED_COLOR(`${received.css}`)
    ].join(`
`);
  }
};
function parseCSS(css, ...args) {
  let ast = m(`selector { ${css} }`, { silent: !0 }).stylesheet;
  if (ast.parsingErrors && ast.parsingErrors.length > 0) {
    let { reason, line } = ast.parsingErrors[0];
    throw new InvalidCSSError(
      {
        css,
        message: `Syntax error parsing expected css: ${reason} on line: ${line}`
      },
      ...args
    );
  }
  return ast.rules[0].declarations.filter((d) => d.type === "declaration").reduce(
    (obj, { property, value }) => Object.assign(obj, { [property]: value }),
    {}
  );
}
function display(context, value) {
  return typeof value == "string" ? value : context.utils.stringify(value);
}
function getMessage3(context, matcher, expectedLabel, expectedValue, receivedLabel, receivedValue) {
  return [
    `${matcher}
`,
    // eslint-disable-next-line new-cap
    `${expectedLabel}:
${context.utils.EXPECTED_COLOR(
      (0, import_redent.default)(display(context, expectedValue), 2)
    )}`,
    // eslint-disable-next-line new-cap
    `${receivedLabel}:
${context.utils.RECEIVED_COLOR(
      (0, import_redent.default)(display(context, receivedValue), 2)
    )}`
  ].join(`
`);
}
function matches(textToMatch, matcher) {
  return matcher instanceof RegExp ? matcher.test(textToMatch) : textToMatch.includes(String(matcher));
}
function deprecate(name, replacementText) {
  console.warn(
    `Warning: ${name} has been deprecated and will be removed in future updates.`,
    replacementText
  );
}
function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}
function getTag(element) {
  return element.tagName && element.tagName.toLowerCase();
}
function getSelectValue({ multiple, options }) {
  let selectedOptions = [...options].filter((option) => option.selected);
  if (multiple)
    return [...selectedOptions].map((opt) => opt.value);
  if (selectedOptions.length !== 0)
    return selectedOptions[0].value;
}
function getInputValue(inputElement) {
  switch (inputElement.type) {
    case "number":
      return inputElement.value === "" ? null : Number(inputElement.value);
    case "checkbox":
      return inputElement.checked;
    default:
      return inputElement.value;
  }
}
var rolesSupportingValues = ["meter", "progressbar", "slider", "spinbutton"];
function getAccessibleValue(element) {
  if (rolesSupportingValues.includes(element.getAttribute("role")))
    return Number(element.getAttribute("aria-valuenow"));
}
function getSingleElementValue(element) {
  if (element)
    switch (element.tagName.toLowerCase()) {
      case "input":
        return getInputValue(element);
      case "select":
        return getSelectValue(element);
      default:
        return element.value ?? getAccessibleValue(element);
    }
}
function toSentence(array, { wordConnector = ", ", lastWordConnector = " and " } = {}) {
  return [array.slice(0, -1).join(wordConnector), array[array.length - 1]].join(
    array.length > 1 ? lastWordConnector : ""
  );
}
function compareAsSet(val1, val2) {
  return Array.isArray(val1) && Array.isArray(val2) ? [...new Set(val1)].every((v2) => new Set(val2).has(v2)) : val1 === val2;
}
function toBeInTheDOM(element, container) {
  return deprecate(
    "toBeInTheDOM",
    "Please use toBeInTheDocument for searching the entire document and toContainElement for searching a specific container."
  ), element && checkHtmlElement(element, toBeInTheDOM, this), container && checkHtmlElement(container, toBeInTheDOM, this), {
    pass: container ? container.contains(element) : !!element,
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toBeInTheDOM`,
        "element",
        ""
      ),
      "",
      "Received:",
      `  ${this.utils.printReceived(
        element && element.cloneNode(!1)
      )}`
    ].join(`
`)
  };
}
function toBeInTheDocument(element) {
  (element !== null || !this.isNot) && checkHtmlElement(element, toBeInTheDocument, this);
  let pass = element === null ? !1 : element.ownerDocument === element.getRootNode({ composed: !0 }), errorFound = () => `expected document not to contain element, found ${this.utils.stringify(
    element.cloneNode(!0)
  )} instead`, errorNotFound = () => "element could not be found in the document";
  return {
    pass,
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toBeInTheDocument`,
        "element",
        ""
      ),
      "",
      // eslint-disable-next-line new-cap
      this.utils.RECEIVED_COLOR(this.isNot ? errorFound() : errorNotFound())
    ].join(`
`)
  };
}
function toBeEmpty(element) {
  return deprecate(
    "toBeEmpty",
    "Please use instead toBeEmptyDOMElement for finding empty nodes in the DOM."
  ), checkHtmlElement(element, toBeEmpty, this), {
    pass: element.innerHTML === "",
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toBeEmpty`,
        "element",
        ""
      ),
      "",
      "Received:",
      `  ${this.utils.printReceived(element.innerHTML)}`
    ].join(`
`)
  };
}
function toBeEmptyDOMElement(element) {
  return checkHtmlElement(element, toBeEmptyDOMElement, this), {
    pass: isEmptyElement(element),
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toBeEmptyDOMElement`,
        "element",
        ""
      ),
      "",
      "Received:",
      `  ${this.utils.printReceived(element.innerHTML)}`
    ].join(`
`)
  };
}
function isEmptyElement(element) {
  return [...element.childNodes].filter((node) => node.nodeType !== 8).length === 0;
}
function toContainElement(container, element) {
  return checkHtmlElement(container, toContainElement, this), element !== null && checkHtmlElement(element, toContainElement, this), {
    pass: container.contains(element),
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toContainElement`,
        "element",
        "element"
      ),
      "",
      // eslint-disable-next-line new-cap
      this.utils.RECEIVED_COLOR(`${this.utils.stringify(
        container.cloneNode(!1)
      )} ${this.isNot ? "contains:" : "does not contain:"} ${this.utils.stringify(element && element.cloneNode(!1))}
        `)
    ].join(`
`)
  };
}
function getNormalizedHtml(container, htmlText) {
  let div = container.ownerDocument.createElement("div");
  return div.innerHTML = htmlText, div.innerHTML;
}
function toContainHTML(container, htmlText) {
  if (checkHtmlElement(container, toContainHTML, this), typeof htmlText != "string")
    throw new Error(`.toContainHTML() expects a string value, got ${htmlText}`);
  return {
    pass: container.outerHTML.includes(getNormalizedHtml(container, htmlText)),
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toContainHTML`,
        "element",
        ""
      ),
      "Expected:",
      // eslint-disable-next-line new-cap
      `  ${this.utils.EXPECTED_COLOR(htmlText)}`,
      "Received:",
      `  ${this.utils.printReceived(container.cloneNode(!0))}`
    ].join(`
`)
  };
}
function toHaveTextContent(node, checkWith, options = { normalizeWhitespace: !0 }) {
  checkNode(node, toHaveTextContent, this);
  let textContent = options.normalizeWhitespace ? normalize(node.textContent) : node.textContent.replace(/\u00a0/g, " "), checkingWithEmptyString = textContent !== "" && checkWith === "";
  return {
    pass: !checkingWithEmptyString && matches(textContent, checkWith),
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toHaveTextContent`,
          "element",
          ""
        ),
        checkingWithEmptyString ? "Checking with empty string will always match, use .toBeEmptyDOMElement() instead" : `Expected element ${to} have text content`,
        checkWith,
        "Received",
        textContent
      );
    }
  };
}
function toHaveAccessibleDescription(htmlElement, expectedAccessibleDescription) {
  checkHtmlElement(htmlElement, toHaveAccessibleDescription, this);
  let actualAccessibleDescription = computeAccessibleDescription(htmlElement), missingExpectedValue = arguments.length === 1, pass = !1;
  return missingExpectedValue ? pass = actualAccessibleDescription !== "" : pass = expectedAccessibleDescription instanceof RegExp ? expectedAccessibleDescription.test(actualAccessibleDescription) : this.equals(
    actualAccessibleDescription,
    expectedAccessibleDescription
  ), {
    pass,
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.${toHaveAccessibleDescription.name}`,
          "element",
          ""
        ),
        `Expected element ${to} have accessible description`,
        expectedAccessibleDescription,
        "Received",
        actualAccessibleDescription
      );
    }
  };
}
var ariaInvalidName = "aria-invalid", validStates = ["false"];
function toHaveAccessibleErrorMessage(htmlElement, expectedAccessibleErrorMessage) {
  checkHtmlElement(htmlElement, toHaveAccessibleErrorMessage, this);
  let to = this.isNot ? "not to" : "to", method = this.isNot ? ".not.toHaveAccessibleErrorMessage" : ".toHaveAccessibleErrorMessage", errormessageId = htmlElement.getAttribute("aria-errormessage");
  if (!!errormessageId && /\s+/.test(errormessageId))
    return {
      pass: !1,
      message: () => getMessage3(
        this,
        this.utils.matcherHint(method, "element"),
        "Expected element's `aria-errormessage` attribute to be empty or a single, valid ID",
        "",
        "Received",
        `aria-errormessage="${errormessageId}"`
      )
    };
  let ariaInvalidVal = htmlElement.getAttribute(ariaInvalidName);
  if (!htmlElement.hasAttribute(ariaInvalidName) || validStates.includes(ariaInvalidVal))
    return {
      pass: !1,
      message: () => getMessage3(
        this,
        this.utils.matcherHint(method, "element"),
        "Expected element to be marked as invalid with attribute",
        `${ariaInvalidName}="${String(!0)}"`,
        "Received",
        htmlElement.hasAttribute("aria-invalid") ? `${ariaInvalidName}="${htmlElement.getAttribute(ariaInvalidName)}` : null
      )
    };
  let error = normalize(
    htmlElement.ownerDocument.getElementById(errormessageId)?.textContent ?? ""
  );
  return {
    pass: expectedAccessibleErrorMessage === void 0 ? !!error : expectedAccessibleErrorMessage instanceof RegExp ? expectedAccessibleErrorMessage.test(error) : this.equals(error, expectedAccessibleErrorMessage),
    message: () => getMessage3(
      this,
      this.utils.matcherHint(method, "element"),
      `Expected element ${to} have accessible error message`,
      expectedAccessibleErrorMessage ?? "",
      "Received",
      error
    )
  };
}
var elementRoleList = buildElementRoleList(import_aria_query.elementRoles);
function toHaveRole(htmlElement, expectedRole) {
  checkHtmlElement(htmlElement, toHaveRole, this);
  let actualRoles = getExplicitOrImplicitRoles(htmlElement);
  return {
    pass: actualRoles.some((el) => el === expectedRole),
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.${toHaveRole.name}`,
          "element",
          ""
        ),
        `Expected element ${to} have role`,
        expectedRole,
        "Received",
        actualRoles.join(", ")
      );
    }
  };
}
function getExplicitOrImplicitRoles(htmlElement) {
  return htmlElement.hasAttribute("role") ? htmlElement.getAttribute("role").split(" ").filter(Boolean) : getImplicitAriaRoles(htmlElement);
}
function getImplicitAriaRoles(currentNode) {
  for (let { match, roles: roles3 } of elementRoleList)
    if (match(currentNode))
      return [...roles3];
  return [];
}
function buildElementRoleList(elementRolesMap) {
  function makeElementSelector({ name, attributes }) {
    return `${name}${attributes.map(({ name: attributeName, value, constraints = [] }) => constraints.indexOf("undefined") !== -1 ? `:not([${attributeName}])` : value ? `[${attributeName}="${value}"]` : `[${attributeName}]`).join("")}`;
  }
  function getSelectorSpecificity({ attributes = [] }) {
    return attributes.length;
  }
  function bySelectorSpecificity({ specificity: leftSpecificity }, { specificity: rightSpecificity }) {
    return rightSpecificity - leftSpecificity;
  }
  function match(element) {
    let { attributes = [] } = element, typeTextIndex = attributes.findIndex(
      (attribute) => attribute.value && attribute.name === "type" && attribute.value === "text"
    );
    typeTextIndex >= 0 && (attributes = [
      ...attributes.slice(0, typeTextIndex),
      ...attributes.slice(typeTextIndex + 1)
    ]);
    let selector = makeElementSelector({ ...element, attributes });
    return (node) => typeTextIndex >= 0 && node.type !== "text" ? !1 : node.matches(selector);
  }
  let result = [];
  for (let [element, roles3] of elementRolesMap.entries())
    result = [
      ...result,
      {
        match: match(element),
        roles: Array.from(roles3),
        specificity: getSelectorSpecificity(element)
      }
    ];
  return result.sort(bySelectorSpecificity);
}
function toHaveAccessibleName(htmlElement, expectedAccessibleName) {
  checkHtmlElement(htmlElement, toHaveAccessibleName, this);
  let actualAccessibleName = computeAccessibleName(htmlElement), missingExpectedValue = arguments.length === 1, pass = !1;
  return missingExpectedValue ? pass = actualAccessibleName !== "" : pass = expectedAccessibleName instanceof RegExp ? expectedAccessibleName.test(actualAccessibleName) : this.equals(actualAccessibleName, expectedAccessibleName), {
    pass,
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.${toHaveAccessibleName.name}`,
          "element",
          ""
        ),
        `Expected element ${to} have accessible name`,
        expectedAccessibleName,
        "Received",
        actualAccessibleName
      );
    }
  };
}
function printAttribute(stringify2, name, value) {
  return value === void 0 ? name : `${name}=${stringify2(value)}`;
}
function getAttributeComment(stringify2, name, value) {
  return value === void 0 ? `element.hasAttribute(${stringify2(name)})` : `element.getAttribute(${stringify2(name)}) === ${stringify2(value)}`;
}
function toHaveAttribute(htmlElement, name, expectedValue) {
  checkHtmlElement(htmlElement, toHaveAttribute, this);
  let isExpectedValuePresent = expectedValue !== void 0, hasAttribute = htmlElement.hasAttribute(name), receivedValue = htmlElement.getAttribute(name);
  return {
    pass: isExpectedValuePresent ? hasAttribute && this.equals(receivedValue, expectedValue) : hasAttribute,
    message: () => {
      let to = this.isNot ? "not to" : "to", receivedAttribute = hasAttribute ? printAttribute(this.utils.stringify, name, receivedValue) : null, matcher = this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toHaveAttribute`,
        "element",
        this.utils.printExpected(name),
        {
          secondArgument: isExpectedValuePresent ? this.utils.printExpected(expectedValue) : void 0,
          comment: getAttributeComment(
            this.utils.stringify,
            name,
            expectedValue
          )
        }
      );
      return getMessage3(
        this,
        matcher,
        `Expected the element ${to} have attribute`,
        printAttribute(this.utils.stringify, name, expectedValue),
        "Received",
        receivedAttribute
      );
    }
  };
}
function getExpectedClassNamesAndOptions(params) {
  let lastParam = params.pop(), expectedClassNames, options;
  return typeof lastParam == "object" && !(lastParam instanceof RegExp) ? (expectedClassNames = params, options = lastParam) : (expectedClassNames = params.concat(lastParam), options = { exact: !1 }), { expectedClassNames, options };
}
function splitClassNames(str) {
  return str ? str.split(/\s+/).filter((s3) => s3.length > 0) : [];
}
function isSubset$1(subset, superset) {
  return subset.every(
    (strOrRegexp) => typeof strOrRegexp == "string" ? superset.includes(strOrRegexp) : superset.some((className) => strOrRegexp.test(className))
  );
}
function toHaveClass(htmlElement, ...params) {
  checkHtmlElement(htmlElement, toHaveClass, this);
  let { expectedClassNames, options } = getExpectedClassNamesAndOptions(params), received = splitClassNames(htmlElement.getAttribute("class")), expected = expectedClassNames.reduce(
    (acc, className) => acc.concat(
      typeof className == "string" || !className ? splitClassNames(className) : className
    ),
    []
  ), hasRegExp = expected.some((className) => className instanceof RegExp);
  if (options.exact && hasRegExp)
    throw new Error("Exact option does not support RegExp expected class names");
  return options.exact ? {
    pass: isSubset$1(expected, received) && expected.length === received.length,
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toHaveClass`,
          "element",
          this.utils.printExpected(expected.join(" "))
        ),
        `Expected the element ${to} have EXACTLY defined classes`,
        expected.join(" "),
        "Received",
        received.join(" ")
      );
    }
  } : expected.length > 0 ? {
    pass: isSubset$1(expected, received),
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toHaveClass`,
          "element",
          this.utils.printExpected(expected.join(" "))
        ),
        `Expected the element ${to} have class`,
        expected.join(" "),
        "Received",
        received.join(" ")
      );
    }
  } : {
    pass: this.isNot ? received.length > 0 : !1,
    message: () => this.isNot ? getMessage3(
      this,
      this.utils.matcherHint(".not.toHaveClass", "element", ""),
      "Expected the element to have classes",
      "(none)",
      "Received",
      received.join(" ")
    ) : [
      this.utils.matcherHint(".toHaveClass", "element"),
      "At least one expected class must be provided."
    ].join(`
`)
  };
}
function getStyleDeclaration(document2, css) {
  let styles2 = {}, copy3 = document2.createElement("div");
  return Object.keys(css).forEach((property) => {
    copy3.style[property] = css[property], styles2[property] = copy3.style[property];
  }), styles2;
}
function isSubset(styles2, computedStyle) {
  return !!Object.keys(styles2).length && Object.entries(styles2).every(([prop, value]) => {
    let isCustomProperty = prop.startsWith("--"), spellingVariants = [prop];
    return isCustomProperty || spellingVariants.push(prop.toLowerCase()), spellingVariants.some(
      (name) => computedStyle[name] === value || computedStyle.getPropertyValue(name) === value
    );
  });
}
function printoutStyles(styles2) {
  return Object.keys(styles2).sort().map((prop) => `${prop}: ${styles2[prop]};`).join(`
`);
}
function expectedDiff(diffFn, expected, computedStyles) {
  let received = Array.from(computedStyles).filter((prop) => expected[prop] !== void 0).reduce(
    (obj, prop) => Object.assign(obj, { [prop]: computedStyles.getPropertyValue(prop) }),
    {}
  );
  return diffFn(printoutStyles(expected), printoutStyles(received)).replace(`${import_picocolors.default.red("+ Received")}
`, "");
}
function toHaveStyle(htmlElement, css) {
  checkHtmlElement(htmlElement, toHaveStyle, this);
  let parsedCSS = typeof css == "object" ? css : parseCSS(css, toHaveStyle, this), { getComputedStyle } = htmlElement.ownerDocument.defaultView, expected = getStyleDeclaration(htmlElement.ownerDocument, parsedCSS), received = getComputedStyle(htmlElement);
  return {
    pass: isSubset(expected, received),
    message: () => {
      let matcher = `${this.isNot ? ".not" : ""}.toHaveStyle`;
      return [
        this.utils.matcherHint(matcher, "element", ""),
        expectedDiff(this.utils.diff, expected, received)
      ].join(`

`);
    }
  };
}
function toHaveFocus(element) {
  return checkHtmlElement(element, toHaveFocus, this), {
    pass: element.ownerDocument.activeElement === element,
    message: () => [
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toHaveFocus`,
        "element",
        ""
      ),
      "",
      ...this.isNot ? [
        "Received element is focused:",
        `  ${this.utils.printReceived(element)}`
      ] : [
        "Expected element with focus:",
        `  ${this.utils.printExpected(element)}`,
        "Received element with focus:",
        `  ${this.utils.printReceived(
          element.ownerDocument.activeElement
        )}`
      ]
    ].join(`
`)
  };
}
function getMultiElementValue(elements) {
  let types = [...new Set(elements.map((element) => element.type))];
  if (types.length !== 1)
    throw new Error(
      "Multiple form elements with the same name must be of the same type"
    );
  switch (types[0]) {
    case "radio": {
      let theChosenOne = elements.find((radio) => radio.checked);
      return theChosenOne ? theChosenOne.value : void 0;
    }
    case "checkbox":
      return elements.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    default:
      return elements.map((element) => element.value);
  }
}
function getFormValue(container, name) {
  let elements = [...container.querySelectorAll(`[name="${(0, import_css.default)(name)}"]`)];
  if (elements.length !== 0)
    switch (elements.length) {
      case 1:
        return getSingleElementValue(elements[0]);
      default:
        return getMultiElementValue(elements);
    }
}
function getPureName(name) {
  return /\[\]$/.test(name) ? name.slice(0, -2) : name;
}
function getAllFormValues(container) {
  return Array.from(container.elements).map((element) => element.name).reduce(
    (obj, name) => ({
      ...obj,
      [getPureName(name)]: getFormValue(container, name)
    }),
    {}
  );
}
function toHaveFormValues(formElement, expectedValues) {
  if (checkHtmlElement(formElement, toHaveFormValues, this), !formElement.elements)
    throw new Error("toHaveFormValues must be called on a form or a fieldset");
  let formValues = getAllFormValues(formElement);
  return {
    pass: Object.entries(expectedValues).every(
      ([name, expectedValue]) => compareAsSet(formValues[name], expectedValue)
    ),
    message: () => {
      let to = this.isNot ? "not to" : "to", matcher = `${this.isNot ? ".not" : ""}.toHaveFormValues`, commonKeyValues = Object.keys(formValues).filter((key) => expectedValues.hasOwnProperty(key)).reduce((obj, key) => ({ ...obj, [key]: formValues[key] }), {});
      return [
        this.utils.matcherHint(matcher, "element", ""),
        `Expected the element ${to} have form values`,
        this.utils.diff(expectedValues, commonKeyValues)
      ].join(`

`);
    }
  };
}
function isStyleVisible(element) {
  let { getComputedStyle } = element.ownerDocument.defaultView, { display: display2, visibility, opacity } = getComputedStyle(element);
  return display2 !== "none" && visibility !== "hidden" && visibility !== "collapse" && opacity !== "0" && opacity !== 0;
}
function isAttributeVisible(element, previousElement) {
  let detailsVisibility;
  return previousElement ? detailsVisibility = element.nodeName === "DETAILS" && previousElement.nodeName !== "SUMMARY" ? element.hasAttribute("open") : !0 : detailsVisibility = element.nodeName === "DETAILS" ? element.hasAttribute("open") : !0, !element.hasAttribute("hidden") && detailsVisibility;
}
function isElementVisible(element, previousElement) {
  return isStyleVisible(element) && isAttributeVisible(element, previousElement) && (!element.parentElement || isElementVisible(element.parentElement, element));
}
function toBeVisible(element) {
  checkHtmlElement(element, toBeVisible, this);
  let isInDocument = element.ownerDocument === element.getRootNode({ composed: !0 }), isVisible2 = isInDocument && isElementVisible(element);
  return {
    pass: isVisible2,
    message: () => {
      let is = isVisible2 ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeVisible`,
          "element",
          ""
        ),
        "",
        `Received element ${is} visible${isInDocument ? "" : " (element is not in the document)"}:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
var FORM_TAGS$2 = [
  "fieldset",
  "input",
  "select",
  "optgroup",
  "option",
  "button",
  "textarea"
];
function isFirstLegendChildOfFieldset(element, parent) {
  return getTag(element) === "legend" && getTag(parent) === "fieldset" && element.isSameNode(
    Array.from(parent.children).find((child) => getTag(child) === "legend")
  );
}
function isElementDisabledByParent(element, parent) {
  return isElementDisabled(parent) && !isFirstLegendChildOfFieldset(element, parent);
}
function isCustomElement(tag) {
  return tag.includes("-");
}
function canElementBeDisabled(element) {
  let tag = getTag(element);
  return FORM_TAGS$2.includes(tag) || isCustomElement(tag);
}
function isElementDisabled(element) {
  return canElementBeDisabled(element) && element.hasAttribute("disabled");
}
function isAncestorDisabled(element) {
  let parent = element.parentElement;
  return !!parent && (isElementDisabledByParent(element, parent) || isAncestorDisabled(parent));
}
function isElementOrAncestorDisabled(element) {
  return canElementBeDisabled(element) && (isElementDisabled(element) || isAncestorDisabled(element));
}
function toBeDisabled(element) {
  checkHtmlElement(element, toBeDisabled, this);
  let isDisabled3 = isElementOrAncestorDisabled(element);
  return {
    pass: isDisabled3,
    message: () => {
      let is = isDisabled3 ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeDisabled`,
          "element",
          ""
        ),
        "",
        `Received element ${is} disabled:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
function toBeEnabled(element) {
  checkHtmlElement(element, toBeEnabled, this);
  let isEnabled = !isElementOrAncestorDisabled(element);
  return {
    pass: isEnabled,
    message: () => {
      let is = isEnabled ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeEnabled`,
          "element",
          ""
        ),
        "",
        `Received element ${is} enabled:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
var FORM_TAGS$1 = ["select", "textarea"], ARIA_FORM_TAGS = ["input", "select", "textarea"], UNSUPPORTED_INPUT_TYPES = [
  "color",
  "hidden",
  "range",
  "submit",
  "image",
  "reset"
], SUPPORTED_ARIA_ROLES = [
  "checkbox",
  "combobox",
  "gridcell",
  "listbox",
  "radiogroup",
  "spinbutton",
  "textbox",
  "tree"
];
function isRequiredOnFormTagsExceptInput(element) {
  return FORM_TAGS$1.includes(getTag(element)) && element.hasAttribute("required");
}
function isRequiredOnSupportedInput(element) {
  return getTag(element) === "input" && element.hasAttribute("required") && (element.hasAttribute("type") && !UNSUPPORTED_INPUT_TYPES.includes(element.getAttribute("type")) || !element.hasAttribute("type"));
}
function isElementRequiredByARIA(element) {
  return element.hasAttribute("aria-required") && element.getAttribute("aria-required") === "true" && (ARIA_FORM_TAGS.includes(getTag(element)) || element.hasAttribute("role") && SUPPORTED_ARIA_ROLES.includes(element.getAttribute("role")));
}
function toBeRequired(element) {
  checkHtmlElement(element, toBeRequired, this);
  let isRequired = isRequiredOnFormTagsExceptInput(element) || isRequiredOnSupportedInput(element) || isElementRequiredByARIA(element);
  return {
    pass: isRequired,
    message: () => {
      let is = isRequired ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeRequired`,
          "element",
          ""
        ),
        "",
        `Received element ${is} required:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
var FORM_TAGS = ["form", "input", "select", "textarea"];
function isElementHavingAriaInvalid(element) {
  return element.hasAttribute("aria-invalid") && element.getAttribute("aria-invalid") !== "false";
}
function isSupportsValidityMethod(element) {
  return FORM_TAGS.includes(getTag(element));
}
function isElementInvalid(element) {
  let isHaveAriaInvalid = isElementHavingAriaInvalid(element);
  return isSupportsValidityMethod(element) ? isHaveAriaInvalid || !element.checkValidity() : isHaveAriaInvalid;
}
function toBeInvalid(element) {
  checkHtmlElement(element, toBeInvalid, this);
  let isInvalid = isElementInvalid(element);
  return {
    pass: isInvalid,
    message: () => {
      let is = isInvalid ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeInvalid`,
          "element",
          ""
        ),
        "",
        `Received element ${is} currently invalid:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
function toBeValid(element) {
  checkHtmlElement(element, toBeValid, this);
  let isValid = !isElementInvalid(element);
  return {
    pass: isValid,
    message: () => {
      let is = isValid ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeValid`,
          "element",
          ""
        ),
        "",
        `Received element ${is} currently valid:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
function toHaveValue(htmlElement, expectedValue) {
  if (checkHtmlElement(htmlElement, toHaveValue, this), htmlElement.tagName.toLowerCase() === "input" && ["checkbox", "radio"].includes(htmlElement.type))
    throw new Error(
      "input with type=checkbox or type=radio cannot be used with .toHaveValue(). Use .toBeChecked() for type=checkbox or .toHaveFormValues() instead"
    );
  let receivedValue = getSingleElementValue(htmlElement), expectsValue = expectedValue !== void 0, expectedTypedValue = expectedValue, receivedTypedValue = receivedValue;
  return expectedValue == receivedValue && expectedValue !== receivedValue && (expectedTypedValue = `${expectedValue} (${typeof expectedValue})`, receivedTypedValue = `${receivedValue} (${typeof receivedValue})`), {
    pass: expectsValue ? compareAsSet(receivedValue, expectedValue) : !!receivedValue,
    message: () => {
      let to = this.isNot ? "not to" : "to", matcher = this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toHaveValue`,
        "element",
        expectedValue
      );
      return getMessage3(
        this,
        matcher,
        `Expected the element ${to} have value`,
        expectsValue ? expectedTypedValue : "(any)",
        "Received",
        receivedTypedValue
      );
    }
  };
}
function toHaveDisplayValue(htmlElement, expectedValue) {
  checkHtmlElement(htmlElement, toHaveDisplayValue, this);
  let tagName = htmlElement.tagName.toLowerCase();
  if (!["select", "input", "textarea"].includes(tagName))
    throw new Error(
      ".toHaveDisplayValue() currently supports only input, textarea or select elements, try with another matcher instead."
    );
  if (tagName === "input" && ["radio", "checkbox"].includes(htmlElement.type))
    throw new Error(
      `.toHaveDisplayValue() currently does not support input[type="${htmlElement.type}"], try with another matcher instead.`
    );
  let values = getValues(tagName, htmlElement), expectedValues = getExpectedValues(expectedValue), numberOfMatchesWithValues = expectedValues.filter(
    (expected) => values.some(
      (value) => expected instanceof RegExp ? expected.test(value) : this.equals(value, String(expected))
    )
  ).length, matchedWithAllValues = numberOfMatchesWithValues === values.length, matchedWithAllExpectedValues = numberOfMatchesWithValues === expectedValues.length;
  return {
    pass: matchedWithAllValues && matchedWithAllExpectedValues,
    message: () => getMessage3(
      this,
      this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toHaveDisplayValue`,
        "element",
        ""
      ),
      `Expected element ${this.isNot ? "not " : ""}to have display value`,
      expectedValue,
      "Received",
      values
    )
  };
}
function getValues(tagName, htmlElement) {
  return tagName === "select" ? Array.from(htmlElement).filter((option) => option.selected).map((option) => option.textContent) : [htmlElement.value];
}
function getExpectedValues(expectedValue) {
  return expectedValue instanceof Array ? expectedValue : [expectedValue];
}
function toBeChecked(element) {
  checkHtmlElement(element, toBeChecked, this);
  let isValidInput = () => element.tagName.toLowerCase() === "input" && ["checkbox", "radio"].includes(element.type), isValidAriaElement = () => roleSupportsChecked(element.getAttribute("role")) && ["true", "false"].includes(element.getAttribute("aria-checked"));
  if (!isValidInput() && !isValidAriaElement())
    return {
      pass: !1,
      message: () => `only inputs with type="checkbox" or type="radio" or elements with ${supportedRolesSentence()} and a valid aria-checked attribute can be used with .toBeChecked(). Use .toHaveValue() instead`
    };
  let isChecked = () => isValidInput() ? element.checked : element.getAttribute("aria-checked") === "true";
  return {
    pass: isChecked(),
    message: () => {
      let is = isChecked() ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBeChecked`,
          "element",
          ""
        ),
        "",
        `Received element ${is} checked:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
function supportedRolesSentence() {
  return toSentence(
    supportedRoles().map((role) => `role="${role}"`),
    { lastWordConnector: " or " }
  );
}
function supportedRoles() {
  return import_aria_query.roles.keys().filter(roleSupportsChecked);
}
function roleSupportsChecked(role) {
  return import_aria_query.roles.get(role)?.props["aria-checked"] !== void 0;
}
function toBePartiallyChecked(element) {
  checkHtmlElement(element, toBePartiallyChecked, this);
  let isValidInput = () => element.tagName.toLowerCase() === "input" && element.type === "checkbox", isValidAriaElement = () => element.getAttribute("role") === "checkbox";
  if (!isValidInput() && !isValidAriaElement())
    return {
      pass: !1,
      message: () => 'only inputs with type="checkbox" or elements with role="checkbox" and a valid aria-checked attribute can be used with .toBePartiallyChecked(). Use .toHaveValue() instead'
    };
  let isPartiallyChecked = () => {
    let isAriaMixed = element.getAttribute("aria-checked") === "mixed";
    return isValidInput() && element.indeterminate || isAriaMixed;
  };
  return {
    pass: isPartiallyChecked(),
    message: () => {
      let is = isPartiallyChecked() ? "is" : "is not";
      return [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toBePartiallyChecked`,
          "element",
          ""
        ),
        "",
        `Received element ${is} partially checked:`,
        `  ${this.utils.printReceived(element.cloneNode(!1))}`
      ].join(`
`);
    }
  };
}
function toHaveDescription(htmlElement, checkWith) {
  deprecate(
    "toHaveDescription",
    "Please use toHaveAccessibleDescription."
  ), checkHtmlElement(htmlElement, toHaveDescription, this);
  let expectsDescription = checkWith !== void 0, descriptionIDs = (htmlElement.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean), description = "";
  if (descriptionIDs.length > 0) {
    let document2 = htmlElement.ownerDocument, descriptionEls = descriptionIDs.map((descriptionID) => document2.getElementById(descriptionID)).filter(Boolean);
    description = normalize(descriptionEls.map((el) => el.textContent).join(" "));
  }
  return {
    pass: expectsDescription ? checkWith instanceof RegExp ? checkWith.test(description) : this.equals(description, checkWith) : !!description,
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toHaveDescription`,
          "element",
          ""
        ),
        `Expected the element ${to} have description`,
        this.utils.printExpected(checkWith),
        "Received",
        this.utils.printReceived(description)
      );
    }
  };
}
function toHaveErrorMessage(htmlElement, checkWith) {
  if (deprecate("toHaveErrorMessage", "Please use toHaveAccessibleErrorMessage."), checkHtmlElement(htmlElement, toHaveErrorMessage, this), !htmlElement.hasAttribute("aria-invalid") || htmlElement.getAttribute("aria-invalid") === "false") {
    let not = this.isNot ? ".not" : "";
    return {
      pass: !1,
      message: () => getMessage3(
        this,
        this.utils.matcherHint(`${not}.toHaveErrorMessage`, "element", ""),
        "Expected the element to have invalid state indicated by",
        'aria-invalid="true"',
        "Received",
        htmlElement.hasAttribute("aria-invalid") ? `aria-invalid="${htmlElement.getAttribute("aria-invalid")}"` : this.utils.printReceived("")
      )
    };
  }
  let expectsErrorMessage = checkWith !== void 0, errormessageIDs = (htmlElement.getAttribute("aria-errormessage") || "").split(/\s+/).filter(Boolean), errormessage = "";
  if (errormessageIDs.length > 0) {
    let document2 = htmlElement.ownerDocument, errormessageEls = errormessageIDs.map((errormessageID) => document2.getElementById(errormessageID)).filter(Boolean);
    errormessage = normalize(
      errormessageEls.map((el) => el.textContent).join(" ")
    );
  }
  return {
    pass: expectsErrorMessage ? checkWith instanceof RegExp ? checkWith.test(errormessage) : this.equals(errormessage, checkWith) : !!errormessage,
    message: () => {
      let to = this.isNot ? "not to" : "to";
      return getMessage3(
        this,
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.toHaveErrorMessage`,
          "element",
          ""
        ),
        `Expected the element ${to} have error message`,
        this.utils.printExpected(checkWith),
        "Received",
        this.utils.printReceived(errormessage)
      );
    }
  };
}
function getSelection(element) {
  let selection = element.ownerDocument.getSelection();
  if (["input", "textarea"].includes(element.tagName.toLowerCase()))
    return ["radio", "checkbox"].includes(element.type) ? "" : element.value.toString().substring(element.selectionStart, element.selectionEnd);
  if (selection.anchorNode === null || selection.focusNode === null)
    return "";
  let originalRange = selection.getRangeAt(0), temporaryRange = element.ownerDocument.createRange();
  if (selection.containsNode(element, !1))
    temporaryRange.selectNodeContents(element), selection.removeAllRanges(), selection.addRange(temporaryRange);
  else if (!(element.contains(selection.anchorNode) && element.contains(selection.focusNode))) {
    let selectionStartsWithinElement = element === originalRange.startContainer || element.contains(originalRange.startContainer), selectionEndsWithinElement = element === originalRange.endContainer || element.contains(originalRange.endContainer);
    selection.removeAllRanges(), (selectionStartsWithinElement || selectionEndsWithinElement) && (temporaryRange.selectNodeContents(element), selectionStartsWithinElement && temporaryRange.setStart(
      originalRange.startContainer,
      originalRange.startOffset
    ), selectionEndsWithinElement && temporaryRange.setEnd(
      originalRange.endContainer,
      originalRange.endOffset
    ), selection.addRange(temporaryRange));
  }
  let result = selection.toString();
  return selection.removeAllRanges(), selection.addRange(originalRange), result;
}
function toHaveSelection(htmlElement, expectedSelection) {
  checkHtmlElement(htmlElement, toHaveSelection, this);
  let expectsSelection = expectedSelection !== void 0;
  if (expectsSelection && typeof expectedSelection != "string")
    throw new Error("expected selection must be a string or undefined");
  let receivedSelection = getSelection(htmlElement);
  return {
    pass: expectsSelection ? compareAsSet(receivedSelection, expectedSelection) : !!receivedSelection,
    message: () => {
      let to = this.isNot ? "not to" : "to", matcher = this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toHaveSelection`,
        "element",
        expectedSelection
      );
      return getMessage3(
        this,
        matcher,
        `Expected the element ${to} have selection`,
        expectsSelection ? expectedSelection : "(any)",
        "Received",
        receivedSelection
      );
    }
  };
}
function toBePressed(element) {
  checkHtmlElement(element, toBePressed, this);
  let roles3 = (element.getAttribute("role") || "").split(" ").map((role) => role.trim()), isButton = element.tagName.toLowerCase() === "button" || element.tagName.toLowerCase() === "input" && element.type === "button" || roles3.includes("button"), pressedAttribute = element.getAttribute("aria-pressed");
  return !isButton || !(pressedAttribute === "true" || pressedAttribute === "false") ? {
    pass: !1,
    message: () => 'Only button or input with type="button" or element with role="button" and a valid aria-pressed attribute can be used with .toBePressed()'
  } : {
    pass: isButton && pressedAttribute === "true",
    message: () => {
      let matcher = this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toBePressed`,
        "element",
        ""
      );
      return getMessage3(
        this,
        matcher,
        "Expected element to have",
        `aria-pressed="${this.isNot ? "false" : "true"}"`,
        "Received",
        `aria-pressed="${pressedAttribute}"`
      );
    }
  };
}
function toBePartiallyPressed(element) {
  checkHtmlElement(element, toBePartiallyPressed, this);
  let roles3 = (element.getAttribute("role") || "").split(" ").map((role) => role.trim()), isButton = element.tagName.toLowerCase() === "button" || element.tagName.toLowerCase() === "input" && element.type === "button" || roles3.includes("button"), pressedAttribute = element.getAttribute("aria-pressed");
  return !isButton || !(pressedAttribute === "true" || pressedAttribute === "false" || pressedAttribute === "mixed") ? {
    pass: !1,
    message: () => 'Only button or input with type="button" or element with role="button" and a valid aria-pressed attribute can be used with .toBePartiallyPressed()'
  } : {
    pass: isButton && pressedAttribute === "mixed",
    message: () => {
      let to = this.isNot ? "not to" : "to", matcher = this.utils.matcherHint(
        `${this.isNot ? ".not" : ""}.toBePartiallyPressed`,
        "element",
        ""
      );
      return getMessage3(
        this,
        matcher,
        `Expected element ${to} have`,
        'aria-pressed="mixed"',
        "Received",
        `aria-pressed="${pressedAttribute}"`
      );
    }
  };
}
var DOCUMENT_POSITION_DISCONNECTED = 1, DOCUMENT_POSITION_PRECEDING = 2, DOCUMENT_POSITION_FOLLOWING = 4, DOCUMENT_POSITION_CONTAINS = 8, DOCUMENT_POSITION_CONTAINED_BY = 16, DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32, DOCUMENT_POSITIONS_STRINGS = {
  [DOCUMENT_POSITION_DISCONNECTED]: "Node.DOCUMENT_POSITION_DISCONNECTED",
  [DOCUMENT_POSITION_PRECEDING]: "Node.DOCUMENT_POSITION_PRECEDING",
  [DOCUMENT_POSITION_FOLLOWING]: "Node.DOCUMENT_POSITION_FOLLOWING",
  [DOCUMENT_POSITION_CONTAINS]: "Node.DOCUMENT_POSITION_CONTAINS",
  [DOCUMENT_POSITION_CONTAINED_BY]: "Node.DOCUMENT_POSITION_CONTAINED_BY",
  [DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC]: "Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC"
};
function makeDocumentPositionErrorString(documentPosition) {
  return documentPosition in DOCUMENT_POSITIONS_STRINGS ? `${DOCUMENT_POSITIONS_STRINGS[documentPosition]} (${documentPosition})` : `Unknown document position (${documentPosition})`;
}
function checkToAppear(methodName, targetDocumentPosition) {
  return function(element, secondElement) {
    checkHtmlElement(element, toAppearBefore, this), checkHtmlElement(secondElement, toAppearBefore, this);
    let documentPosition = element.compareDocumentPosition(secondElement);
    return {
      pass: documentPosition === targetDocumentPosition,
      message: () => [
        this.utils.matcherHint(
          `${this.isNot ? ".not" : ""}.${methodName}`,
          "element",
          "secondElement"
        ),
        "",
        `Received: ${makeDocumentPositionErrorString(documentPosition)}`
      ].join(`
`)
    };
  };
}
function toAppearBefore(element, secondElement) {
  return checkToAppear("toAppearBefore", DOCUMENT_POSITION_FOLLOWING).apply(
    this,
    [element, secondElement]
  );
}
function toAppearAfter(element, secondElement) {
  return checkToAppear("toAppearAfter", DOCUMENT_POSITION_PRECEDING).apply(
    this,
    [element, secondElement]
  );
}
var extensions = Object.freeze({
  __proto__: null,
  toAppearAfter,
  toAppearBefore,
  toBeChecked,
  toBeDisabled,
  toBeEmpty,
  toBeEmptyDOMElement,
  toBeEnabled,
  toBeInTheDOM,
  toBeInTheDocument,
  toBeInvalid,
  toBePartiallyChecked,
  toBePartiallyPressed,
  toBePressed,
  toBeRequired,
  toBeValid,
  toBeVisible,
  toContainElement,
  toContainHTML,
  toHaveAccessibleDescription,
  toHaveAccessibleErrorMessage,
  toHaveAccessibleName,
  toHaveAttribute,
  toHaveClass,
  toHaveDescription,
  toHaveDisplayValue,
  toHaveErrorMessage,
  toHaveFocus,
  toHaveFormValues,
  toHaveRole,
  toHaveSelection,
  toHaveStyle,
  toHaveTextContent,
  toHaveValue
});

// ../node_modules/@testing-library/jest-dom/dist/matchers.mjs
var import_redent2 = __toESM(require_redent(), 1);
var import_aria_query2 = __toESM(require_lib(), 1), import_picocolors2 = __toESM(require_picocolors_browser(), 1), import_css2 = __toESM(require_css_escape(), 1);

// ../node_modules/@vitest/utils/dist/index.js
var jsTokens_1, hasRequiredJsTokens;
function requireJsTokens() {
  if (hasRequiredJsTokens) return jsTokens_1;
  hasRequiredJsTokens = 1;
  var Identifier, JSXIdentifier, JSXPunctuator, JSXString, JSXText, KeywordsWithExpressionAfter, KeywordsWithNoLineTerminatorAfter, LineTerminatorSequence, MultiLineComment, Newline, NumericLiteral, Punctuator, RegularExpressionLiteral, SingleLineComment, StringLiteral, Template, TokensNotPrecedingObjectLiteral, TokensPrecedingExpression, WhiteSpace;
  return RegularExpressionLiteral = /\/(?![*\/])(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\\]).|\\.)*(\/[$_\u200C\u200D\p{ID_Continue}]*|\\)?/yu, Punctuator = /--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[+\-%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![\/*]))=?|[?~,:;[\](){}]/y, Identifier = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$_\u200C\u200D\p{ID_Continue}]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/yu, StringLiteral = /(['"])(?:(?!\1)[^\\\n\r]|\\(?:\r\n|[^]))*(\1)?/y, NumericLiteral = /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y, Template = /[`}](?:[^`\\$]|\\[^]|\$(?!\{))*(`|\$\{)?/y, WhiteSpace = /[\t\v\f\ufeff\p{Zs}]+/yu, LineTerminatorSequence = /\r?\n|[\r\u2028\u2029]/y, MultiLineComment = /\/\*(?:[^*]|\*(?!\/))*(\*\/)?/y, SingleLineComment = /\/\/.*/y, JSXPunctuator = /[<>.:={}]|\/(?![\/*])/y, JSXIdentifier = /[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}-]*/yu, JSXString = /(['"])(?:(?!\1)[^])*(\1)?/y, JSXText = /[^<>{}]+/y, TokensPrecedingExpression = /^(?:[\/+-]|\.{3}|\?(?:InterpolationIn(?:JSX|Template)|NoLineTerminatorHere|NonExpressionParenEnd|UnaryIncDec))?$|[{}([,;<>=*%&|^!~?:]$/, TokensNotPrecedingObjectLiteral = /^(?:=>|[;\]){}]|else|\?(?:NoLineTerminatorHere|NonExpressionParenEnd))?$/, KeywordsWithExpressionAfter = /^(?:await|case|default|delete|do|else|instanceof|new|return|throw|typeof|void|yield)$/, KeywordsWithNoLineTerminatorAfter = /^(?:return|throw|yield)$/, Newline = RegExp(LineTerminatorSequence.source), jsTokens_1 = function* (input2, { jsx = !1 } = {}) {
    var braces, firstCodePoint, isExpression, lastIndex, lastSignificantToken, length, match, mode, nextLastIndex, nextLastSignificantToken, parenNesting, postfixIncDec, punctuator, stack;
    for ({ length } = input2, lastIndex = 0, lastSignificantToken = "", stack = [
      { tag: "JS" }
    ], braces = [], parenNesting = 0, postfixIncDec = !1; lastIndex < length; ) {
      switch (mode = stack[stack.length - 1], mode.tag) {
        case "JS":
        case "JSNonExpressionParen":
        case "InterpolationInTemplate":
        case "InterpolationInJSX":
          if (input2[lastIndex] === "/" && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken)) && (RegularExpressionLiteral.lastIndex = lastIndex, match = RegularExpressionLiteral.exec(input2))) {
            lastIndex = RegularExpressionLiteral.lastIndex, lastSignificantToken = match[0], postfixIncDec = !0, yield {
              type: "RegularExpressionLiteral",
              value: match[0],
              closed: match[1] !== void 0 && match[1] !== "\\"
            };
            continue;
          }
          if (Punctuator.lastIndex = lastIndex, match = Punctuator.exec(input2)) {
            switch (punctuator = match[0], nextLastIndex = Punctuator.lastIndex, nextLastSignificantToken = punctuator, punctuator) {
              case "(":
                lastSignificantToken === "?NonExpressionParenKeyword" && stack.push({
                  tag: "JSNonExpressionParen",
                  nesting: parenNesting
                }), parenNesting++, postfixIncDec = !1;
                break;
              case ")":
                parenNesting--, postfixIncDec = !0, mode.tag === "JSNonExpressionParen" && parenNesting === mode.nesting && (stack.pop(), nextLastSignificantToken = "?NonExpressionParenEnd", postfixIncDec = !1);
                break;
              case "{":
                Punctuator.lastIndex = 0, isExpression = !TokensNotPrecedingObjectLiteral.test(lastSignificantToken) && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken)), braces.push(isExpression), postfixIncDec = !1;
                break;
              case "}":
                switch (mode.tag) {
                  case "InterpolationInTemplate":
                    if (braces.length === mode.nesting) {
                      Template.lastIndex = lastIndex, match = Template.exec(input2), lastIndex = Template.lastIndex, lastSignificantToken = match[0], match[1] === "${" ? (lastSignificantToken = "?InterpolationInTemplate", postfixIncDec = !1, yield {
                        type: "TemplateMiddle",
                        value: match[0]
                      }) : (stack.pop(), postfixIncDec = !0, yield {
                        type: "TemplateTail",
                        value: match[0],
                        closed: match[1] === "`"
                      });
                      continue;
                    }
                    break;
                  case "InterpolationInJSX":
                    if (braces.length === mode.nesting) {
                      stack.pop(), lastIndex += 1, lastSignificantToken = "}", yield {
                        type: "JSXPunctuator",
                        value: "}"
                      };
                      continue;
                    }
                }
                postfixIncDec = braces.pop(), nextLastSignificantToken = postfixIncDec ? "?ExpressionBraceEnd" : "}";
                break;
              case "]":
                postfixIncDec = !0;
                break;
              case "++":
              case "--":
                nextLastSignificantToken = postfixIncDec ? "?PostfixIncDec" : "?UnaryIncDec";
                break;
              case "<":
                if (jsx && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken))) {
                  stack.push({ tag: "JSXTag" }), lastIndex += 1, lastSignificantToken = "<", yield {
                    type: "JSXPunctuator",
                    value: punctuator
                  };
                  continue;
                }
                postfixIncDec = !1;
                break;
              default:
                postfixIncDec = !1;
            }
            lastIndex = nextLastIndex, lastSignificantToken = nextLastSignificantToken, yield {
              type: "Punctuator",
              value: punctuator
            };
            continue;
          }
          if (Identifier.lastIndex = lastIndex, match = Identifier.exec(input2)) {
            switch (lastIndex = Identifier.lastIndex, nextLastSignificantToken = match[0], match[0]) {
              case "for":
              case "if":
              case "while":
              case "with":
                lastSignificantToken !== "." && lastSignificantToken !== "?." && (nextLastSignificantToken = "?NonExpressionParenKeyword");
            }
            lastSignificantToken = nextLastSignificantToken, postfixIncDec = !KeywordsWithExpressionAfter.test(match[0]), yield {
              type: match[1] === "#" ? "PrivateIdentifier" : "IdentifierName",
              value: match[0]
            };
            continue;
          }
          if (StringLiteral.lastIndex = lastIndex, match = StringLiteral.exec(input2)) {
            lastIndex = StringLiteral.lastIndex, lastSignificantToken = match[0], postfixIncDec = !0, yield {
              type: "StringLiteral",
              value: match[0],
              closed: match[2] !== void 0
            };
            continue;
          }
          if (NumericLiteral.lastIndex = lastIndex, match = NumericLiteral.exec(input2)) {
            lastIndex = NumericLiteral.lastIndex, lastSignificantToken = match[0], postfixIncDec = !0, yield {
              type: "NumericLiteral",
              value: match[0]
            };
            continue;
          }
          if (Template.lastIndex = lastIndex, match = Template.exec(input2)) {
            lastIndex = Template.lastIndex, lastSignificantToken = match[0], match[1] === "${" ? (lastSignificantToken = "?InterpolationInTemplate", stack.push({
              tag: "InterpolationInTemplate",
              nesting: braces.length
            }), postfixIncDec = !1, yield {
              type: "TemplateHead",
              value: match[0]
            }) : (postfixIncDec = !0, yield {
              type: "NoSubstitutionTemplate",
              value: match[0],
              closed: match[1] === "`"
            });
            continue;
          }
          break;
        case "JSXTag":
        case "JSXTagEnd":
          if (JSXPunctuator.lastIndex = lastIndex, match = JSXPunctuator.exec(input2)) {
            switch (lastIndex = JSXPunctuator.lastIndex, nextLastSignificantToken = match[0], match[0]) {
              case "<":
                stack.push({ tag: "JSXTag" });
                break;
              case ">":
                stack.pop(), lastSignificantToken === "/" || mode.tag === "JSXTagEnd" ? (nextLastSignificantToken = "?JSX", postfixIncDec = !0) : stack.push({ tag: "JSXChildren" });
                break;
              case "{":
                stack.push({
                  tag: "InterpolationInJSX",
                  nesting: braces.length
                }), nextLastSignificantToken = "?InterpolationInJSX", postfixIncDec = !1;
                break;
              case "/":
                lastSignificantToken === "<" && (stack.pop(), stack[stack.length - 1].tag === "JSXChildren" && stack.pop(), stack.push({ tag: "JSXTagEnd" }));
            }
            lastSignificantToken = nextLastSignificantToken, yield {
              type: "JSXPunctuator",
              value: match[0]
            };
            continue;
          }
          if (JSXIdentifier.lastIndex = lastIndex, match = JSXIdentifier.exec(input2)) {
            lastIndex = JSXIdentifier.lastIndex, lastSignificantToken = match[0], yield {
              type: "JSXIdentifier",
              value: match[0]
            };
            continue;
          }
          if (JSXString.lastIndex = lastIndex, match = JSXString.exec(input2)) {
            lastIndex = JSXString.lastIndex, lastSignificantToken = match[0], yield {
              type: "JSXString",
              value: match[0],
              closed: match[2] !== void 0
            };
            continue;
          }
          break;
        case "JSXChildren":
          if (JSXText.lastIndex = lastIndex, match = JSXText.exec(input2)) {
            lastIndex = JSXText.lastIndex, lastSignificantToken = match[0], yield {
              type: "JSXText",
              value: match[0]
            };
            continue;
          }
          switch (input2[lastIndex]) {
            case "<":
              stack.push({ tag: "JSXTag" }), lastIndex++, lastSignificantToken = "<", yield {
                type: "JSXPunctuator",
                value: "<"
              };
              continue;
            case "{":
              stack.push({
                tag: "InterpolationInJSX",
                nesting: braces.length
              }), lastIndex++, lastSignificantToken = "?InterpolationInJSX", postfixIncDec = !1, yield {
                type: "JSXPunctuator",
                value: "{"
              };
              continue;
          }
      }
      if (WhiteSpace.lastIndex = lastIndex, match = WhiteSpace.exec(input2)) {
        lastIndex = WhiteSpace.lastIndex, yield {
          type: "WhiteSpace",
          value: match[0]
        };
        continue;
      }
      if (LineTerminatorSequence.lastIndex = lastIndex, match = LineTerminatorSequence.exec(input2)) {
        lastIndex = LineTerminatorSequence.lastIndex, postfixIncDec = !1, KeywordsWithNoLineTerminatorAfter.test(lastSignificantToken) && (lastSignificantToken = "?NoLineTerminatorHere"), yield {
          type: "LineTerminatorSequence",
          value: match[0]
        };
        continue;
      }
      if (MultiLineComment.lastIndex = lastIndex, match = MultiLineComment.exec(input2)) {
        lastIndex = MultiLineComment.lastIndex, Newline.test(match[0]) && (postfixIncDec = !1, KeywordsWithNoLineTerminatorAfter.test(lastSignificantToken) && (lastSignificantToken = "?NoLineTerminatorHere")), yield {
          type: "MultiLineComment",
          value: match[0],
          closed: match[1] !== void 0
        };
        continue;
      }
      if (SingleLineComment.lastIndex = lastIndex, match = SingleLineComment.exec(input2)) {
        lastIndex = SingleLineComment.lastIndex, postfixIncDec = !1, yield {
          type: "SingleLineComment",
          value: match[0]
        };
        continue;
      }
      firstCodePoint = String.fromCodePoint(input2.codePointAt(lastIndex)), lastIndex += firstCodePoint.length, lastSignificantToken = firstCodePoint, postfixIncDec = !1, yield {
        type: mode.tag.startsWith("JSX") ? "JSXInvalid" : "Invalid",
        value: firstCodePoint
      };
    }
  }, jsTokens_1;
}
var jsTokensExports = requireJsTokens(), jsTokens = getDefaultExportFromCjs(jsTokensExports), reservedWords = {
  keyword: [
    "break",
    "case",
    "catch",
    "continue",
    "debugger",
    "default",
    "do",
    "else",
    "finally",
    "for",
    "function",
    "if",
    "return",
    "switch",
    "throw",
    "try",
    "var",
    "const",
    "while",
    "with",
    "new",
    "this",
    "super",
    "class",
    "extends",
    "export",
    "import",
    "null",
    "true",
    "false",
    "in",
    "instanceof",
    "typeof",
    "void",
    "delete"
  ],
  strict: [
    "implements",
    "interface",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "yield"
  ]
}, keywords = new Set(reservedWords.keyword), reservedWordsStrictSet = new Set(reservedWords.strict);
var SAFE_TIMERS_SYMBOL = Symbol("vitest:SAFE_TIMERS");

// ../node_modules/@vitest/spy/node_modules/tinyspy/dist/index.js
function S(e2, t2) {
  if (!e2)
    throw new Error(t2);
}
function f(e2, t2) {
  return typeof t2 === e2;
}
function w(e2) {
  return e2 instanceof Promise;
}
function u(e2, t2, r2) {
  Object.defineProperty(e2, t2, r2);
}
function l(e2, t2, r2) {
  u(e2, t2, { value: r2, configurable: !0, writable: !0 });
}
var y = Symbol.for("tinyspy:spy"), x = /* @__PURE__ */ new Set(), h = (e2) => {
  e2.called = !1, e2.callCount = 0, e2.calls = [], e2.results = [], e2.resolves = [], e2.next = [];
}, k = (e2) => (u(e2, y, {
  value: { reset: () => h(e2[y]) }
}), e2[y]), T = (e2) => e2[y] || k(e2);
function R(e2) {
  S(
    f("function", e2) || f("undefined", e2),
    "cannot spy on a non-function value"
  );
  let t2 = function(...s3) {
    let n2 = T(t2);
    n2.called = !0, n2.callCount++, n2.calls.push(s3);
    let d = n2.next.shift();
    if (d) {
      n2.results.push(d);
      let [a, i2] = d;
      if (a === "ok")
        return i2;
      throw i2;
    }
    let o2, c2 = "ok", p = n2.results.length;
    if (n2.impl)
      try {
        new.target ? o2 = Reflect.construct(n2.impl, s3, new.target) : o2 = n2.impl.apply(this, s3), c2 = "ok";
      } catch (a) {
        throw o2 = a, c2 = "error", n2.results.push([c2, a]), a;
      }
    let g2 = [c2, o2];
    return w(o2) && o2.then(
      (a) => n2.resolves[p] = ["ok", a],
      (a) => n2.resolves[p] = ["error", a]
    ), n2.results.push(g2), o2;
  };
  l(t2, "_isMockFunction", !0), l(t2, "length", e2 ? e2.length : 0), l(t2, "name", e2 && e2.name || "spy");
  let r2 = T(t2);
  return r2.reset(), r2.impl = e2, t2;
}
function v(e2) {
  return !!e2 && e2._isMockFunction === !0;
}
var b = (e2, t2) => {
  let r2 = Object.getOwnPropertyDescriptor(e2, t2);
  if (r2)
    return [e2, r2];
  let s3 = Object.getPrototypeOf(e2);
  for (; s3 !== null; ) {
    let n2 = Object.getOwnPropertyDescriptor(s3, t2);
    if (n2)
      return [s3, n2];
    s3 = Object.getPrototypeOf(s3);
  }
}, P = (e2, t2) => {
  t2 != null && typeof t2 == "function" && t2.prototype != null && Object.setPrototypeOf(e2.prototype, t2.prototype);
};
function M(e2, t2, r2) {
  S(
    !f("undefined", e2),
    "spyOn could not find an object to spy upon"
  ), S(
    f("object", e2) || f("function", e2),
    "cannot spyOn on a primitive value"
  );
  let [s3, n2] = (() => {
    if (!f("object", t2))
      return [t2, "value"];
    if ("getter" in t2 && "setter" in t2)
      throw new Error("cannot spy on both getter and setter");
    if ("getter" in t2)
      return [t2.getter, "get"];
    if ("setter" in t2)
      return [t2.setter, "set"];
    throw new Error("specify getter or setter to spy on");
  })(), [d, o2] = b(e2, s3) || [];
  S(
    o2 || s3 in e2,
    `${String(s3)} does not exist`
  );
  let c2 = !1;
  n2 === "value" && o2 && !o2.value && o2.get && (n2 = "get", c2 = !0, r2 = o2.get());
  let p;
  o2 ? p = o2[n2] : n2 !== "value" ? p = () => e2[s3] : p = e2[s3], p && j(p) && (p = p[y].getOriginal());
  let g2 = (I) => {
    let { value: F, ...O } = o2 || {
      configurable: !0,
      writable: !0
    };
    n2 !== "value" && delete O.writable, O[n2] = I, u(e2, s3, O);
  }, a = () => {
    d !== e2 ? Reflect.deleteProperty(e2, s3) : o2 && !p ? u(e2, s3, o2) : g2(p);
  };
  r2 || (r2 = p);
  let i2 = E(R(r2), r2);
  n2 === "value" && P(i2, p);
  let m2 = i2[y];
  return l(m2, "restore", a), l(m2, "getOriginal", () => c2 ? p() : p), l(m2, "willCall", (I) => (m2.impl = I, i2)), g2(
    c2 ? () => (P(i2, r2), i2) : i2
  ), x.add(i2), i2;
}
var K = /* @__PURE__ */ new Set([
  "length",
  "name",
  "prototype"
]);
function D(e2) {
  let t2 = /* @__PURE__ */ new Set(), r2 = {};
  for (; e2 && e2 !== Object.prototype && e2 !== Function.prototype; ) {
    let s3 = [
      ...Object.getOwnPropertyNames(e2),
      ...Object.getOwnPropertySymbols(e2)
    ];
    for (let n2 of s3)
      r2[n2] || K.has(n2) || (t2.add(n2), r2[n2] = Object.getOwnPropertyDescriptor(e2, n2));
    e2 = Object.getPrototypeOf(e2);
  }
  return {
    properties: t2,
    descriptors: r2
  };
}
function E(e2, t2) {
  if (!t2 || // the original is already a spy, so it has all the properties
  y in t2)
    return e2;
  let { properties: r2, descriptors: s3 } = D(t2);
  for (let n2 of r2) {
    let d = s3[n2];
    b(e2, n2) || u(e2, n2, d);
  }
  return e2;
}
function j(e2) {
  return v(e2) && "getOriginal" in e2[y];
}

// ../node_modules/@vitest/spy/dist/index.js
var mocks = /* @__PURE__ */ new Set();
function isMockFunction(fn3) {
  return typeof fn3 == "function" && "_isMockFunction" in fn3 && fn3._isMockFunction;
}
function spyOn(obj, method, accessType) {
  let objMethod = accessType ? { [{
    get: "getter",
    set: "setter"
  }[accessType]]: method } : method, state, descriptor = getDescriptor(obj, method), fn3 = descriptor && descriptor[accessType || "value"];
  isMockFunction(fn3) && (state = fn3.mock._state());
  try {
    let stub = M(obj, objMethod), spy = enhanceSpy(stub);
    return state && spy.mock._state(state), spy;
  } catch (error) {
    throw error instanceof TypeError && Symbol.toStringTag && obj[Symbol.toStringTag] === "Module" && (error.message.includes("Cannot redefine property") || error.message.includes("Cannot replace module namespace") || error.message.includes("can't redefine non-configurable property")) ? new TypeError(`Cannot spy on export "${String(objMethod)}". Module namespace is not configurable in ESM. See: https://vitest.dev/guide/browser/#limitations`, { cause: error }) : error;
  }
}
var callOrder = 0;
function enhanceSpy(spy) {
  let stub = spy, implementation, onceImplementations = [], implementationChangedTemporarily = !1, instances = [], contexts = [], invocations = [], state = T(spy), mockContext = {
    get calls() {
      return state.calls;
    },
    get contexts() {
      return contexts;
    },
    get instances() {
      return instances;
    },
    get invocationCallOrder() {
      return invocations;
    },
    get results() {
      return state.results.map(([callType, value]) => ({
        type: callType === "error" ? "throw" : "return",
        value
      }));
    },
    get settledResults() {
      return state.resolves.map(([callType, value]) => ({
        type: callType === "error" ? "rejected" : "fulfilled",
        value
      }));
    },
    get lastCall() {
      return state.calls[state.calls.length - 1];
    },
    _state(state2) {
      return state2 && (implementation = state2.implementation, onceImplementations = state2.onceImplementations, implementationChangedTemporarily = state2.implementationChangedTemporarily), {
        implementation,
        onceImplementations,
        implementationChangedTemporarily
      };
    }
  };
  function mockCall(...args) {
    return instances.push(this), contexts.push(this), invocations.push(++callOrder), (implementationChangedTemporarily ? implementation : onceImplementations.shift() || implementation || state.getOriginal() || (() => {
    })).apply(this, args);
  }
  let name = stub.name;
  stub.getMockName = () => name || "vi.fn()", stub.mockName = (n2) => (name = n2, stub), stub.mockClear = () => (state.reset(), instances = [], contexts = [], invocations = [], stub), stub.mockReset = () => (stub.mockClear(), implementation = void 0, onceImplementations = [], stub), stub.mockRestore = () => (stub.mockReset(), state.restore(), stub), Symbol.dispose && (stub[Symbol.dispose] = () => stub.mockRestore()), stub.getMockImplementation = () => implementationChangedTemporarily ? implementation : onceImplementations.at(0) || implementation, stub.mockImplementation = (fn3) => (implementation = fn3, state.willCall(mockCall), stub), stub.mockImplementationOnce = (fn3) => (onceImplementations.push(fn3), stub);
  function withImplementation(fn3, cb) {
    let originalImplementation = implementation;
    implementation = fn3, state.willCall(mockCall), implementationChangedTemporarily = !0;
    let reset = () => {
      implementation = originalImplementation, implementationChangedTemporarily = !1;
    }, result = cb();
    return typeof result == "object" && result && typeof result.then == "function" ? result.then(() => (reset(), stub)) : (reset(), stub);
  }
  return stub.withImplementation = withImplementation, stub.mockReturnThis = () => stub.mockImplementation(function() {
    return this;
  }), stub.mockReturnValue = (val) => stub.mockImplementation(() => val), stub.mockReturnValueOnce = (val) => stub.mockImplementationOnce(() => val), stub.mockResolvedValue = (val) => stub.mockImplementation(() => Promise.resolve(val)), stub.mockResolvedValueOnce = (val) => stub.mockImplementationOnce(() => Promise.resolve(val)), stub.mockRejectedValue = (val) => stub.mockImplementation(() => Promise.reject(val)), stub.mockRejectedValueOnce = (val) => stub.mockImplementationOnce(() => Promise.reject(val)), Object.defineProperty(stub, "mock", { get: () => mockContext }), state.willCall(mockCall), mocks.add(stub), stub;
}
function fn(implementation) {
  let enhancedSpy = enhanceSpy(M({ spy: implementation || function() {
  } }, "spy"));
  return implementation && enhancedSpy.mockImplementation(implementation), enhancedSpy;
}
function getDescriptor(obj, method) {
  let objDescriptor = Object.getOwnPropertyDescriptor(obj, method);
  if (objDescriptor)
    return objDescriptor;
  let currentProto = Object.getPrototypeOf(obj);
  for (; currentProto !== null; ) {
    let descriptor = Object.getOwnPropertyDescriptor(currentProto, method);
    if (descriptor)
      return descriptor;
    currentProto = Object.getPrototypeOf(currentProto);
  }
}

// ../node_modules/@vitest/expect/dist/index.js
var MATCHERS_OBJECT = Symbol.for("matchers-object"), JEST_MATCHERS_OBJECT = Symbol.for("$$jest-matchers-object-storybook"), GLOBAL_EXPECT = Symbol.for("expect-global"), ASYMMETRIC_MATCHERS_OBJECT = Symbol.for("asymmetric-matchers-object"), customMatchers = {
  toSatisfy(actual, expected, message) {
    let { printReceived: printReceived2, printExpected: printExpected2, matcherHint: matcherHint2 } = this.utils, pass = expected(actual);
    return {
      pass,
      message: () => pass ? `${matcherHint2(".not.toSatisfy", "received", "")}

Expected value to not satisfy:
${message || printExpected2(expected)}
Received:
${printReceived2(actual)}` : `${matcherHint2(".toSatisfy", "received", "")}

Expected value to satisfy:
${message || printExpected2(expected)}

Received:
${printReceived2(actual)}`
    };
  },
  toBeOneOf(actual, expected) {
    let { equals: equals2, customTesters } = this, { printReceived: printReceived2, printExpected: printExpected2, matcherHint: matcherHint2 } = this.utils;
    if (!Array.isArray(expected))
      throw new TypeError(`You must provide an array to ${matcherHint2(".toBeOneOf")}, not '${typeof expected}'.`);
    let pass = expected.length === 0 || expected.some((item) => equals2(item, actual, customTesters));
    return {
      pass,
      message: () => pass ? `${matcherHint2(".not.toBeOneOf", "received", "")}

Expected value to not be one of:
${printExpected2(expected)}
Received:
${printReceived2(actual)}` : `${matcherHint2(".toBeOneOf", "received", "")}

Expected value to be one of:
${printExpected2(expected)}

Received:
${printReceived2(actual)}`
    };
  }
}, EXPECTED_COLOR = s.green, RECEIVED_COLOR = s.red, INVERTED_COLOR = s.inverse, BOLD_WEIGHT = s.bold, DIM_COLOR = s.dim;
function matcherHint(matcherName, received = "received", expected = "expected", options = {}) {
  let { comment = "", isDirectExpectCall = !1, isNot = !1, promise = "", secondArgument = "", expectedColor = EXPECTED_COLOR, receivedColor = RECEIVED_COLOR, secondArgumentColor = EXPECTED_COLOR } = options, hint = "", dimString = "expect";
  return !isDirectExpectCall && received !== "" && (hint += DIM_COLOR(`${dimString}(`) + receivedColor(received), dimString = ")"), promise !== "" && (hint += DIM_COLOR(`${dimString}.`) + promise, dimString = ""), isNot && (hint += `${DIM_COLOR(`${dimString}.`)}not`, dimString = ""), matcherName.includes(".") ? dimString += matcherName : (hint += DIM_COLOR(`${dimString}.`) + matcherName, dimString = ""), expected === "" ? dimString += "()" : (hint += DIM_COLOR(`${dimString}(`) + expectedColor(expected), secondArgument && (hint += DIM_COLOR(", ") + secondArgumentColor(secondArgument)), dimString = ")"), comment !== "" && (dimString += ` // ${comment}`), dimString !== "" && (hint += DIM_COLOR(dimString)), hint;
}
var SPACE_SYMBOL = "\xB7";
function replaceTrailingSpaces(text) {
  return text.replace(/\s+$/gm, (spaces) => SPACE_SYMBOL.repeat(spaces.length));
}
function printReceived(object) {
  return RECEIVED_COLOR(replaceTrailingSpaces(stringify(object)));
}
function printExpected(value) {
  return EXPECTED_COLOR(replaceTrailingSpaces(stringify(value)));
}
function getMatcherUtils() {
  return {
    EXPECTED_COLOR,
    RECEIVED_COLOR,
    INVERTED_COLOR,
    BOLD_WEIGHT,
    DIM_COLOR,
    diff,
    matcherHint,
    printReceived,
    printExpected,
    printDiffOrStringify,
    printWithType
  };
}
function printWithType(name, value, print) {
  let type5 = getType(value), hasType = type5 !== "null" && type5 !== "undefined" ? `${name} has type:  ${type5}
` : "", hasValue = `${name} has value: ${print(value)}`;
  return hasType + hasValue;
}
function getCustomEqualityTesters() {
  return globalThis[JEST_MATCHERS_OBJECT].customEqualityTesters;
}
function equals(a, b2, customTesters, strictCheck) {
  return customTesters = customTesters || [], eq(a, b2, [], [], customTesters, strictCheck ? hasKey : hasDefinedKey);
}
var functionToString = Function.prototype.toString;
function isAsymmetric(obj) {
  return !!obj && typeof obj == "object" && "asymmetricMatch" in obj && isA("Function", obj.asymmetricMatch);
}
function asymmetricMatch(a, b2) {
  let asymmetricA = isAsymmetric(a), asymmetricB = isAsymmetric(b2);
  if (!(asymmetricA && asymmetricB)) {
    if (asymmetricA)
      return a.asymmetricMatch(b2);
    if (asymmetricB)
      return b2.asymmetricMatch(a);
  }
}
function eq(a, b2, aStack, bStack, customTesters, hasKey2) {
  let result = !0, asymmetricResult = asymmetricMatch(a, b2);
  if (asymmetricResult !== void 0)
    return asymmetricResult;
  let testerContext = { equals };
  for (let i2 = 0; i2 < customTesters.length; i2++) {
    let customTesterResult = customTesters[i2].call(testerContext, a, b2, customTesters);
    if (customTesterResult !== void 0)
      return customTesterResult;
  }
  if (typeof URL == "function" && a instanceof URL && b2 instanceof URL)
    return a.href === b2.href;
  if (Object.is(a, b2))
    return !0;
  if (a === null || b2 === null)
    return a === b2;
  let className = Object.prototype.toString.call(a);
  if (className !== Object.prototype.toString.call(b2))
    return !1;
  switch (className) {
    case "[object Boolean]":
    case "[object String]":
    case "[object Number]":
      return typeof a != typeof b2 ? !1 : typeof a != "object" && typeof b2 != "object" ? Object.is(a, b2) : Object.is(a.valueOf(), b2.valueOf());
    case "[object Date]": {
      let numA = +a, numB = +b2;
      return numA === numB || Number.isNaN(numA) && Number.isNaN(numB);
    }
    case "[object RegExp]":
      return a.source === b2.source && a.flags === b2.flags;
    case "[object Temporal.Instant]":
    case "[object Temporal.ZonedDateTime]":
    case "[object Temporal.PlainDateTime]":
    case "[object Temporal.PlainDate]":
    case "[object Temporal.PlainTime]":
    case "[object Temporal.PlainYearMonth]":
    case "[object Temporal.PlainMonthDay]":
      return a.equals(b2);
    case "[object Temporal.Duration]":
      return a.toString() === b2.toString();
  }
  if (typeof a != "object" || typeof b2 != "object")
    return !1;
  if (isDomNode(a) && isDomNode(b2))
    return a.isEqualNode(b2);
  let length = aStack.length;
  for (; length--; ) {
    if (aStack[length] === a)
      return bStack[length] === b2;
    if (bStack[length] === b2)
      return !1;
  }
  if (aStack.push(a), bStack.push(b2), className === "[object Array]" && a.length !== b2.length)
    return !1;
  if (a instanceof Error && b2 instanceof Error)
    try {
      return isErrorEqual(a, b2, aStack, bStack, customTesters, hasKey2);
    } finally {
      aStack.pop(), bStack.pop();
    }
  let aKeys = keys(a, hasKey2), key, size = aKeys.length;
  if (keys(b2, hasKey2).length !== size)
    return !1;
  for (; size--; )
    if (key = aKeys[size], result = hasKey2(b2, key) && eq(a[key], b2[key], aStack, bStack, customTesters, hasKey2), !result)
      return !1;
  return aStack.pop(), bStack.pop(), result;
}
function isErrorEqual(a, b2, aStack, bStack, customTesters, hasKey2) {
  let result = Object.getPrototypeOf(a) === Object.getPrototypeOf(b2) && a.name === b2.name && a.message === b2.message;
  return typeof b2.cause < "u" && result && (result = eq(a.cause, b2.cause, aStack, bStack, customTesters, hasKey2)), a instanceof AggregateError && b2 instanceof AggregateError && result && (result = eq(a.errors, b2.errors, aStack, bStack, customTesters, hasKey2)), result && (result = eq({ ...a }, { ...b2 }, aStack, bStack, customTesters, hasKey2)), result;
}
function keys(obj, hasKey2) {
  let keys2 = [];
  for (let key in obj)
    hasKey2(obj, key) && keys2.push(key);
  return keys2.concat(Object.getOwnPropertySymbols(obj).filter((symbol) => Object.getOwnPropertyDescriptor(obj, symbol).enumerable));
}
function hasDefinedKey(obj, key) {
  return hasKey(obj, key) && obj[key] !== void 0;
}
function hasKey(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function isA(typeName, value) {
  return Object.prototype.toString.apply(value) === `[object ${typeName}]`;
}
function isDomNode(obj) {
  return obj !== null && typeof obj == "object" && "nodeType" in obj && typeof obj.nodeType == "number" && "nodeName" in obj && typeof obj.nodeName == "string" && "isEqualNode" in obj && typeof obj.isEqualNode == "function";
}
var IS_KEYED_SENTINEL = "@@__IMMUTABLE_KEYED__@@", IS_SET_SENTINEL = "@@__IMMUTABLE_SET__@@", IS_LIST_SENTINEL = "@@__IMMUTABLE_LIST__@@", IS_ORDERED_SENTINEL = "@@__IMMUTABLE_ORDERED__@@", IS_RECORD_SYMBOL = "@@__IMMUTABLE_RECORD__@@";
function isImmutableUnorderedKeyed(maybeKeyed) {
  return !!(maybeKeyed && maybeKeyed[IS_KEYED_SENTINEL] && !maybeKeyed[IS_ORDERED_SENTINEL]);
}
function isImmutableUnorderedSet(maybeSet) {
  return !!(maybeSet && maybeSet[IS_SET_SENTINEL] && !maybeSet[IS_ORDERED_SENTINEL]);
}
function isObjectLiteral(source) {
  return source != null && typeof source == "object" && !Array.isArray(source);
}
function isImmutableList(source) {
  return !!(source && isObjectLiteral(source) && source[IS_LIST_SENTINEL]);
}
function isImmutableOrderedKeyed(source) {
  return !!(source && isObjectLiteral(source) && source[IS_KEYED_SENTINEL] && source[IS_ORDERED_SENTINEL]);
}
function isImmutableOrderedSet(source) {
  return !!(source && isObjectLiteral(source) && source[IS_SET_SENTINEL] && source[IS_ORDERED_SENTINEL]);
}
function isImmutableRecord(source) {
  return !!(source && isObjectLiteral(source) && source[IS_RECORD_SYMBOL]);
}
var IteratorSymbol = Symbol.iterator;
function hasIterator(object) {
  return !!(object != null && object[IteratorSymbol]);
}
function iterableEquality(a, b2, customTesters = [], aStack = [], bStack = []) {
  if (typeof a != "object" || typeof b2 != "object" || Array.isArray(a) || Array.isArray(b2) || !hasIterator(a) || !hasIterator(b2))
    return;
  if (a.constructor !== b2.constructor)
    return !1;
  let length = aStack.length;
  for (; length--; )
    if (aStack[length] === a)
      return bStack[length] === b2;
  aStack.push(a), bStack.push(b2);
  let filteredCustomTesters = [...customTesters.filter((t2) => t2 !== iterableEquality), iterableEqualityWithStack];
  function iterableEqualityWithStack(a2, b3) {
    return iterableEquality(a2, b3, [...customTesters], [...aStack], [...bStack]);
  }
  if (a.size !== void 0) {
    if (a.size !== b2.size)
      return !1;
    if (isA("Set", a) || isImmutableUnorderedSet(a)) {
      let allFound = !0;
      for (let aValue of a)
        if (!b2.has(aValue)) {
          let has = !1;
          for (let bValue of b2)
            equals(aValue, bValue, filteredCustomTesters) === !0 && (has = !0);
          if (has === !1) {
            allFound = !1;
            break;
          }
        }
      return aStack.pop(), bStack.pop(), allFound;
    } else if (isA("Map", a) || isImmutableUnorderedKeyed(a)) {
      let allFound = !0;
      for (let aEntry of a)
        if (!b2.has(aEntry[0]) || !equals(aEntry[1], b2.get(aEntry[0]), filteredCustomTesters)) {
          let has = !1;
          for (let bEntry of b2) {
            let matchedKey = equals(aEntry[0], bEntry[0], filteredCustomTesters), matchedValue = !1;
            matchedKey === !0 && (matchedValue = equals(aEntry[1], bEntry[1], filteredCustomTesters)), matchedValue === !0 && (has = !0);
          }
          if (has === !1) {
            allFound = !1;
            break;
          }
        }
      return aStack.pop(), bStack.pop(), allFound;
    }
  }
  let bIterator = b2[IteratorSymbol]();
  for (let aValue of a) {
    let nextB = bIterator.next();
    if (nextB.done || !equals(aValue, nextB.value, filteredCustomTesters))
      return !1;
  }
  if (!bIterator.next().done)
    return !1;
  if (!isImmutableList(a) && !isImmutableOrderedKeyed(a) && !isImmutableOrderedSet(a) && !isImmutableRecord(a)) {
    let aEntries = Object.entries(a), bEntries = Object.entries(b2);
    if (!equals(aEntries, bEntries, filteredCustomTesters))
      return !1;
  }
  return aStack.pop(), bStack.pop(), !0;
}
function hasPropertyInObject(object, key) {
  return !object || typeof object != "object" || object === Object.prototype ? !1 : Object.prototype.hasOwnProperty.call(object, key) || hasPropertyInObject(Object.getPrototypeOf(object), key);
}
function isObjectWithKeys(a) {
  return isObject(a) && !(a instanceof Error) && !Array.isArray(a) && !(a instanceof Date);
}
function subsetEquality(object, subset, customTesters = []) {
  let filteredCustomTesters = customTesters.filter((t2) => t2 !== subsetEquality), subsetEqualityWithContext = (seenReferences = /* @__PURE__ */ new WeakMap()) => (object2, subset2) => {
    if (isObjectWithKeys(subset2))
      return Object.keys(subset2).every((key) => {
        if (subset2[key] != null && typeof subset2[key] == "object") {
          if (seenReferences.has(subset2[key]))
            return equals(object2[key], subset2[key], filteredCustomTesters);
          seenReferences.set(subset2[key], !0);
        }
        let result = object2 != null && hasPropertyInObject(object2, key) && equals(object2[key], subset2[key], [...filteredCustomTesters, subsetEqualityWithContext(seenReferences)]);
        return seenReferences.delete(subset2[key]), result;
      });
  };
  return subsetEqualityWithContext()(object, subset);
}
function typeEquality(a, b2) {
  if (!(a == null || b2 == null || a.constructor === b2.constructor))
    return !1;
}
function arrayBufferEquality(a, b2) {
  let dataViewA = a, dataViewB = b2;
  if (!(a instanceof DataView && b2 instanceof DataView)) {
    if (!(a instanceof ArrayBuffer) || !(b2 instanceof ArrayBuffer))
      return;
    try {
      dataViewA = new DataView(a), dataViewB = new DataView(b2);
    } catch {
      return;
    }
  }
  if (dataViewA.byteLength !== dataViewB.byteLength)
    return !1;
  for (let i2 = 0; i2 < dataViewA.byteLength; i2++)
    if (dataViewA.getUint8(i2) !== dataViewB.getUint8(i2))
      return !1;
  return !0;
}
function sparseArrayEquality(a, b2, customTesters = []) {
  if (!Array.isArray(a) || !Array.isArray(b2))
    return;
  let aKeys = Object.keys(a), bKeys = Object.keys(b2), filteredCustomTesters = customTesters.filter((t2) => t2 !== sparseArrayEquality);
  return equals(a, b2, filteredCustomTesters, !0) && equals(aKeys, bKeys);
}
function generateToBeMessage(deepEqualityName, expected = "#{this}", actual = "#{exp}") {
  let toBeMessage = `expected ${expected} to be ${actual} // Object.is equality`;
  return ["toStrictEqual", "toEqual"].includes(deepEqualityName) ? `${toBeMessage}

If it should pass with deep equality, replace "toBe" with "${deepEqualityName}"

Expected: ${expected}
Received: serializes to the same string
` : toBeMessage;
}
function pluralize(word, count) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
function getObjectKeys(object) {
  return [...Object.keys(object), ...Object.getOwnPropertySymbols(object).filter((s3) => {
    var _Object$getOwnPropert;
    return (_Object$getOwnPropert = Object.getOwnPropertyDescriptor(object, s3)) === null || _Object$getOwnPropert === void 0 ? void 0 : _Object$getOwnPropert.enumerable;
  })];
}
function getObjectSubset(object, subset, customTesters) {
  let stripped = 0, getObjectSubsetWithContext = (seenReferences = /* @__PURE__ */ new WeakMap()) => (object2, subset2) => {
    if (Array.isArray(object2)) {
      if (Array.isArray(subset2) && subset2.length === object2.length)
        return subset2.map((sub, i2) => getObjectSubsetWithContext(seenReferences)(object2[i2], sub));
    } else {
      if (object2 instanceof Date)
        return object2;
      if (isObject(object2) && isObject(subset2)) {
        if (equals(object2, subset2, [
          ...customTesters,
          iterableEquality,
          subsetEquality
        ]))
          return subset2;
        let trimmed = {};
        seenReferences.set(object2, trimmed), typeof object2.constructor == "function" && typeof object2.constructor.name == "string" && Object.defineProperty(trimmed, "constructor", {
          enumerable: !1,
          value: object2.constructor
        });
        for (let key of getObjectKeys(object2))
          hasPropertyInObject(subset2, key) ? trimmed[key] = seenReferences.has(object2[key]) ? seenReferences.get(object2[key]) : getObjectSubsetWithContext(seenReferences)(object2[key], subset2[key]) : seenReferences.has(object2[key]) || (stripped += 1, isObject(object2[key]) && (stripped += getObjectKeys(object2[key]).length), getObjectSubsetWithContext(seenReferences)(object2[key], subset2[key]));
        if (getObjectKeys(trimmed).length > 0)
          return trimmed;
      }
    }
    return object2;
  };
  return {
    subset: getObjectSubsetWithContext()(object, subset),
    stripped
  };
}
if (!Object.prototype.hasOwnProperty.call(globalThis, MATCHERS_OBJECT)) {
  let globalState = /* @__PURE__ */ new WeakMap();
  Object.defineProperty(globalThis, MATCHERS_OBJECT, { get: () => globalState });
}
if (!Object.prototype.hasOwnProperty.call(globalThis, JEST_MATCHERS_OBJECT)) {
  let matchers = /* @__PURE__ */ Object.create(null), customEqualityTesters = [];
  Object.defineProperty(globalThis, JEST_MATCHERS_OBJECT, {
    configurable: !0,
    get: () => ({
      state: globalThis[MATCHERS_OBJECT].get(globalThis[GLOBAL_EXPECT]),
      matchers,
      customEqualityTesters
    })
  });
}
if (!Object.prototype.hasOwnProperty.call(globalThis, ASYMMETRIC_MATCHERS_OBJECT)) {
  let asymmetricMatchers = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(globalThis, ASYMMETRIC_MATCHERS_OBJECT, { get: () => asymmetricMatchers });
}
function getState(expect4) {
  return globalThis[MATCHERS_OBJECT].get(expect4);
}
function setState(state, expect4) {
  let map = globalThis[MATCHERS_OBJECT], current = map.get(expect4) || {}, results = Object.defineProperties(current, {
    ...Object.getOwnPropertyDescriptors(current),
    ...Object.getOwnPropertyDescriptors(state)
  });
  map.set(expect4, results);
}
var AsymmetricMatcher = class {
  // should have "jest" to be compatible with its ecosystem
  $$typeof = Symbol.for("jest.asymmetricMatcher");
  constructor(sample, inverse = !1) {
    this.sample = sample, this.inverse = inverse;
  }
  getMatcherContext(expect4) {
    return {
      ...getState(expect4 || globalThis[GLOBAL_EXPECT]),
      equals,
      isNot: this.inverse,
      customTesters: getCustomEqualityTesters(),
      utils: {
        ...getMatcherUtils(),
        diff,
        stringify,
        iterableEquality,
        subsetEquality
      }
    };
  }
};
AsymmetricMatcher.prototype[Symbol.for("chai/inspect")] = function(options) {
  let result = stringify(this, options.depth, { min: !0 });
  return result.length <= options.truncate ? result : `${this.toString()}{\u2026}`;
};
var StringContaining = class extends AsymmetricMatcher {
  constructor(sample, inverse = !1) {
    if (!isA("String", sample))
      throw new Error("Expected is not a string");
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    let result = isA("String", other) && other.includes(this.sample);
    return this.inverse ? !result : result;
  }
  toString() {
    return `String${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "string";
  }
}, Anything = class extends AsymmetricMatcher {
  asymmetricMatch(other) {
    return other != null;
  }
  toString() {
    return "Anything";
  }
  toAsymmetricMatcher() {
    return "Anything";
  }
}, ObjectContaining = class extends AsymmetricMatcher {
  constructor(sample, inverse = !1) {
    super(sample, inverse);
  }
  getPrototype(obj) {
    return Object.getPrototypeOf ? Object.getPrototypeOf(obj) : obj.constructor.prototype === obj ? null : obj.constructor.prototype;
  }
  hasProperty(obj, property) {
    return obj ? Object.prototype.hasOwnProperty.call(obj, property) ? !0 : this.hasProperty(this.getPrototype(obj), property) : !1;
  }
  asymmetricMatch(other) {
    if (typeof this.sample != "object")
      throw new TypeError(`You must provide an object to ${this.toString()}, not '${typeof this.sample}'.`);
    let result = !0, matcherContext = this.getMatcherContext();
    for (let property in this.sample)
      if (!this.hasProperty(other, property) || !equals(this.sample[property], other[property], matcherContext.customTesters)) {
        result = !1;
        break;
      }
    return this.inverse ? !result : result;
  }
  toString() {
    return `Object${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "object";
  }
}, ArrayContaining = class extends AsymmetricMatcher {
  constructor(sample, inverse = !1) {
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    if (!Array.isArray(this.sample))
      throw new TypeError(`You must provide an array to ${this.toString()}, not '${typeof this.sample}'.`);
    let matcherContext = this.getMatcherContext(), result = this.sample.length === 0 || Array.isArray(other) && this.sample.every((item) => other.some((another) => equals(item, another, matcherContext.customTesters)));
    return this.inverse ? !result : result;
  }
  toString() {
    return `Array${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "array";
  }
}, Any = class extends AsymmetricMatcher {
  constructor(sample) {
    if (typeof sample > "u")
      throw new TypeError("any() expects to be passed a constructor function. Please pass one or use anything() to match any object.");
    super(sample);
  }
  fnNameFor(func) {
    if (func.name)
      return func.name;
    let matches3 = Function.prototype.toString.call(func).match(/^(?:async)?\s*function\s*(?:\*\s*)?([\w$]+)\s*\(/);
    return matches3 ? matches3[1] : "<anonymous>";
  }
  asymmetricMatch(other) {
    return this.sample === String ? typeof other == "string" || other instanceof String : this.sample === Number ? typeof other == "number" || other instanceof Number : this.sample === Function ? typeof other == "function" || typeof other == "function" : this.sample === Boolean ? typeof other == "boolean" || other instanceof Boolean : this.sample === BigInt ? typeof other == "bigint" || other instanceof BigInt : this.sample === Symbol ? typeof other == "symbol" || other instanceof Symbol : this.sample === Object ? typeof other == "object" : other instanceof this.sample;
  }
  toString() {
    return "Any";
  }
  getExpectedType() {
    return this.sample === String ? "string" : this.sample === Number ? "number" : this.sample === Function ? "function" : this.sample === Object ? "object" : this.sample === Boolean ? "boolean" : this.fnNameFor(this.sample);
  }
  toAsymmetricMatcher() {
    return `Any<${this.fnNameFor(this.sample)}>`;
  }
}, StringMatching = class extends AsymmetricMatcher {
  constructor(sample, inverse = !1) {
    if (!isA("String", sample) && !isA("RegExp", sample))
      throw new Error("Expected is not a String or a RegExp");
    super(new RegExp(sample), inverse);
  }
  asymmetricMatch(other) {
    let result = isA("String", other) && this.sample.test(other);
    return this.inverse ? !result : result;
  }
  toString() {
    return `String${this.inverse ? "Not" : ""}Matching`;
  }
  getExpectedType() {
    return "string";
  }
}, CloseTo = class extends AsymmetricMatcher {
  precision;
  constructor(sample, precision = 2, inverse = !1) {
    if (!isA("Number", sample))
      throw new Error("Expected is not a Number");
    if (!isA("Number", precision))
      throw new Error("Precision is not a Number");
    super(sample), this.inverse = inverse, this.precision = precision;
  }
  asymmetricMatch(other) {
    if (!isA("Number", other))
      return !1;
    let result = !1;
    return other === Number.POSITIVE_INFINITY && this.sample === Number.POSITIVE_INFINITY || other === Number.NEGATIVE_INFINITY && this.sample === Number.NEGATIVE_INFINITY ? result = !0 : result = Math.abs(this.sample - other) < 10 ** -this.precision / 2, this.inverse ? !result : result;
  }
  toString() {
    return `Number${this.inverse ? "Not" : ""}CloseTo`;
  }
  getExpectedType() {
    return "number";
  }
  toAsymmetricMatcher() {
    return [
      this.toString(),
      this.sample,
      `(${pluralize("digit", this.precision)})`
    ].join(" ");
  }
}, JestAsymmetricMatchers = (chai, utils) => {
  utils.addMethod(chai.expect, "anything", () => new Anything()), utils.addMethod(chai.expect, "any", (expected) => new Any(expected)), utils.addMethod(chai.expect, "stringContaining", (expected) => new StringContaining(expected)), utils.addMethod(chai.expect, "objectContaining", (expected) => new ObjectContaining(expected)), utils.addMethod(chai.expect, "arrayContaining", (expected) => new ArrayContaining(expected)), utils.addMethod(chai.expect, "stringMatching", (expected) => new StringMatching(expected)), utils.addMethod(chai.expect, "closeTo", (expected, precision) => new CloseTo(expected, precision)), chai.expect.not = {
    stringContaining: (expected) => new StringContaining(expected, !0),
    objectContaining: (expected) => new ObjectContaining(expected, !0),
    arrayContaining: (expected) => new ArrayContaining(expected, !0),
    stringMatching: (expected) => new StringMatching(expected, !0),
    closeTo: (expected, precision) => new CloseTo(expected, precision, !0)
  };
};
function createAssertionMessage(util, assertion, hasArgs) {
  let not = util.flag(assertion, "negate") ? "not." : "", name = `${util.flag(assertion, "_name")}(${hasArgs ? "expected" : ""})`, promiseName = util.flag(assertion, "promise");
  return `expect(actual)${promiseName ? `.${promiseName}` : ""}.${not}${name}`;
}
function recordAsyncExpect(_test, promise, assertion, error) {
  let test2 = _test;
  if (test2 && promise instanceof Promise) {
    promise = promise.finally(() => {
      if (!test2.promises)
        return;
      let index = test2.promises.indexOf(promise);
      index !== -1 && test2.promises.splice(index, 1);
    }), test2.promises || (test2.promises = []), test2.promises.push(promise);
    let resolved = !1;
    return test2.onFinished ?? (test2.onFinished = []), test2.onFinished.push(() => {
      if (!resolved) {
        var _vitest_worker__;
        let stack = (((_vitest_worker__ = globalThis.__vitest_worker__) === null || _vitest_worker__ === void 0 ? void 0 : _vitest_worker__.onFilterStackTrace) || ((s3) => s3 || ""))(error.stack);
        console.warn([
          `Promise returned by \`${assertion}\` was not awaited. `,
          "Vitest currently auto-awaits hanging assertions at the end of the test, but this will cause the test to fail in Vitest 3. ",
          `Please remember to await the assertion.
`,
          stack
        ].join(""));
      }
    }), {
      then(onFulfilled, onRejected) {
        return resolved = !0, promise.then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        return promise.catch(onRejected);
      },
      finally(onFinally) {
        return promise.finally(onFinally);
      },
      [Symbol.toStringTag]: "Promise"
    };
  }
  return promise;
}
function handleTestError(test2, err) {
  var _test$result;
  test2.result || (test2.result = { state: "fail" }), test2.result.state = "fail", (_test$result = test2.result).errors || (_test$result.errors = []), test2.result.errors.push(processError(err));
}
function wrapAssertion(utils, name, fn3) {
  return function(...args) {
    if (name !== "withTest" && utils.flag(this, "_name", name), !utils.flag(this, "soft"))
      return fn3.apply(this, args);
    let test2 = utils.flag(this, "vitest-test");
    if (!test2)
      throw new Error("expect.soft() can only be used inside a test");
    try {
      let result = fn3.apply(this, args);
      return result && typeof result == "object" && typeof result.then == "function" ? result.then(noop, (err) => {
        handleTestError(test2, err);
      }) : result;
    } catch (err) {
      handleTestError(test2, err);
    }
  };
}
var JestChaiExpect = (chai, utils) => {
  let { AssertionError: AssertionError2 } = chai, customTesters = getCustomEqualityTesters();
  function def(name, fn3) {
    let addMethod2 = (n2) => {
      let softWrapper = wrapAssertion(utils, n2, fn3);
      utils.addMethod(chai.Assertion.prototype, n2, softWrapper), utils.addMethod(globalThis[JEST_MATCHERS_OBJECT].matchers, n2, softWrapper);
    };
    Array.isArray(name) ? name.forEach((n2) => addMethod2(n2)) : addMethod2(name);
  }
  [
    "throw",
    "throws",
    "Throw"
  ].forEach((m2) => {
    utils.overwriteMethod(chai.Assertion.prototype, m2, (_super) => function(...args) {
      let promise = utils.flag(this, "promise"), object = utils.flag(this, "object"), isNot = utils.flag(this, "negate");
      if (promise === "rejects")
        utils.flag(this, "object", () => {
          throw object;
        });
      else if (promise === "resolves" && typeof object != "function") {
        if (isNot)
          return;
        {
          let message = utils.flag(this, "message") || "expected promise to throw an error, but it didn't", error = { showDiff: !1 };
          throw new AssertionError2(message, error, utils.flag(this, "ssfi"));
        }
      }
      _super.apply(this, args);
    });
  }), def("withTest", function(test2) {
    return utils.flag(this, "vitest-test", test2), this;
  }), def("toEqual", function(expected) {
    let actual = utils.flag(this, "object"), equal = equals(actual, expected, [...customTesters, iterableEquality]);
    return this.assert(equal, "expected #{this} to deeply equal #{exp}", "expected #{this} to not deeply equal #{exp}", expected, actual);
  }), def("toStrictEqual", function(expected) {
    let obj = utils.flag(this, "object"), equal = equals(obj, expected, [
      ...customTesters,
      iterableEquality,
      typeEquality,
      sparseArrayEquality,
      arrayBufferEquality
    ], !0);
    return this.assert(equal, "expected #{this} to strictly equal #{exp}", "expected #{this} to not strictly equal #{exp}", expected, obj);
  }), def("toBe", function(expected) {
    let actual = this._obj, pass = Object.is(actual, expected), deepEqualityName = "";
    return pass || (equals(actual, expected, [
      ...customTesters,
      iterableEquality,
      typeEquality,
      sparseArrayEquality,
      arrayBufferEquality
    ], !0) ? deepEqualityName = "toStrictEqual" : equals(actual, expected, [...customTesters, iterableEquality]) && (deepEqualityName = "toEqual")), this.assert(pass, generateToBeMessage(deepEqualityName), "expected #{this} not to be #{exp} // Object.is equality", expected, actual);
  }), def("toMatchObject", function(expected) {
    let actual = this._obj, pass = equals(actual, expected, [
      ...customTesters,
      iterableEquality,
      subsetEquality
    ]), isNot = utils.flag(this, "negate"), { subset: actualSubset, stripped } = getObjectSubset(actual, expected, customTesters);
    if (pass && isNot || !pass && !isNot) {
      let msg = utils.getMessage(this, [
        pass,
        "expected #{this} to match object #{exp}",
        "expected #{this} to not match object #{exp}",
        expected,
        actualSubset,
        !1
      ]), message = stripped === 0 ? msg : `${msg}
(${stripped} matching ${stripped === 1 ? "property" : "properties"} omitted from actual)`;
      throw new AssertionError2(message, {
        showDiff: !0,
        expected,
        actual: actualSubset
      });
    }
  }), def("toMatch", function(expected) {
    let actual = this._obj;
    if (typeof actual != "string")
      throw new TypeError(`.toMatch() expects to receive a string, but got ${typeof actual}`);
    return this.assert(typeof expected == "string" ? actual.includes(expected) : actual.match(expected), "expected #{this} to match #{exp}", "expected #{this} not to match #{exp}", expected, actual);
  }), def("toContain", function(item) {
    let actual = this._obj;
    if (typeof Node < "u" && actual instanceof Node) {
      if (!(item instanceof Node))
        throw new TypeError(`toContain() expected a DOM node as the argument, but got ${typeof item}`);
      return this.assert(actual.contains(item), "expected #{this} to contain element #{exp}", "expected #{this} not to contain element #{exp}", item, actual);
    }
    if (typeof DOMTokenList < "u" && actual instanceof DOMTokenList) {
      assertTypes(item, "class name", ["string"]);
      let expectedClassList = utils.flag(this, "negate") ? actual.value.replace(item, "").trim() : `${actual.value} ${item}`;
      return this.assert(actual.contains(item), `expected "${actual.value}" to contain "${item}"`, `expected "${actual.value}" not to contain "${item}"`, expectedClassList, actual.value);
    }
    return typeof actual == "string" && typeof item == "string" ? this.assert(actual.includes(item), "expected #{this} to contain #{exp}", "expected #{this} not to contain #{exp}", item, actual) : (actual != null && typeof actual != "string" && utils.flag(this, "object", Array.from(actual)), this.contain(item));
  }), def("toContainEqual", function(expected) {
    let obj = utils.flag(this, "object"), index = Array.from(obj).findIndex((item) => equals(item, expected, customTesters));
    this.assert(index !== -1, "expected #{this} to deep equally contain #{exp}", "expected #{this} to not deep equally contain #{exp}", expected);
  }), def("toBeTruthy", function() {
    let obj = utils.flag(this, "object");
    this.assert(!!obj, "expected #{this} to be truthy", "expected #{this} to not be truthy", !0, obj);
  }), def("toBeFalsy", function() {
    let obj = utils.flag(this, "object");
    this.assert(!obj, "expected #{this} to be falsy", "expected #{this} to not be falsy", !1, obj);
  }), def("toBeGreaterThan", function(expected) {
    let actual = this._obj;
    return assertTypes(actual, "actual", ["number", "bigint"]), assertTypes(expected, "expected", ["number", "bigint"]), this.assert(actual > expected, `expected ${actual} to be greater than ${expected}`, `expected ${actual} to be not greater than ${expected}`, expected, actual, !1);
  }), def("toBeGreaterThanOrEqual", function(expected) {
    let actual = this._obj;
    return assertTypes(actual, "actual", ["number", "bigint"]), assertTypes(expected, "expected", ["number", "bigint"]), this.assert(actual >= expected, `expected ${actual} to be greater than or equal to ${expected}`, `expected ${actual} to be not greater than or equal to ${expected}`, expected, actual, !1);
  }), def("toBeLessThan", function(expected) {
    let actual = this._obj;
    return assertTypes(actual, "actual", ["number", "bigint"]), assertTypes(expected, "expected", ["number", "bigint"]), this.assert(actual < expected, `expected ${actual} to be less than ${expected}`, `expected ${actual} to be not less than ${expected}`, expected, actual, !1);
  }), def("toBeLessThanOrEqual", function(expected) {
    let actual = this._obj;
    return assertTypes(actual, "actual", ["number", "bigint"]), assertTypes(expected, "expected", ["number", "bigint"]), this.assert(actual <= expected, `expected ${actual} to be less than or equal to ${expected}`, `expected ${actual} to be not less than or equal to ${expected}`, expected, actual, !1);
  }), def("toBeNaN", function() {
    let obj = utils.flag(this, "object");
    this.assert(Number.isNaN(obj), "expected #{this} to be NaN", "expected #{this} not to be NaN", Number.NaN, obj);
  }), def("toBeUndefined", function() {
    let obj = utils.flag(this, "object");
    this.assert(obj === void 0, "expected #{this} to be undefined", "expected #{this} not to be undefined", void 0, obj);
  }), def("toBeNull", function() {
    let obj = utils.flag(this, "object");
    this.assert(obj === null, "expected #{this} to be null", "expected #{this} not to be null", null, obj);
  }), def("toBeDefined", function() {
    let obj = utils.flag(this, "object");
    this.assert(typeof obj < "u", "expected #{this} to be defined", "expected #{this} to be undefined", obj);
  }), def("toBeTypeOf", function(expected) {
    let actual = typeof this._obj, equal = expected === actual;
    return this.assert(equal, "expected #{this} to be type of #{exp}", "expected #{this} not to be type of #{exp}", expected, actual);
  }), def("toBeInstanceOf", function(obj) {
    return this.instanceOf(obj);
  }), def("toHaveLength", function(length) {
    return this.have.length(length);
  }), def("toHaveProperty", function(...args) {
    Array.isArray(args[0]) && (args[0] = args[0].map((key) => String(key).replace(/([.[\]])/g, "\\$1")).join("."));
    let actual = this._obj, [propertyName, expected] = args, getValue = () => Object.prototype.hasOwnProperty.call(actual, propertyName) ? {
      value: actual[propertyName],
      exists: !0
    } : utils.getPathInfo(actual, propertyName), { value, exists } = getValue(), pass = exists && (args.length === 1 || equals(expected, value, customTesters)), valueString = args.length === 1 ? "" : ` with value ${utils.objDisplay(expected)}`;
    return this.assert(pass, `expected #{this} to have property "${propertyName}"${valueString}`, `expected #{this} to not have property "${propertyName}"${valueString}`, expected, exists ? value : void 0);
  }), def("toBeCloseTo", function(received, precision = 2) {
    let expected = this._obj, pass = !1, expectedDiff2 = 0, receivedDiff = 0;
    return received === Number.POSITIVE_INFINITY && expected === Number.POSITIVE_INFINITY || received === Number.NEGATIVE_INFINITY && expected === Number.NEGATIVE_INFINITY ? pass = !0 : (expectedDiff2 = 10 ** -precision / 2, receivedDiff = Math.abs(expected - received), pass = receivedDiff < expectedDiff2), this.assert(pass, `expected #{this} to be close to #{exp}, received difference is ${receivedDiff}, but expected ${expectedDiff2}`, `expected #{this} to not be close to #{exp}, received difference is ${receivedDiff}, but expected ${expectedDiff2}`, received, expected, !1);
  });
  function assertIsMock(assertion) {
    if (!isMockFunction(assertion._obj))
      throw new TypeError(`${utils.inspect(assertion._obj)} is not a spy or a call to a spy!`);
  }
  function getSpy(assertion) {
    return assertIsMock(assertion), assertion._obj;
  }
  def(["toHaveBeenCalledTimes", "toBeCalledTimes"], function(number) {
    let spy = getSpy(this), spyName = spy.getMockName(), callCount = spy.mock.calls.length;
    return this.assert(callCount === number, `expected "${spyName}" to be called #{exp} times, but got ${callCount} times`, `expected "${spyName}" to not be called #{exp} times`, number, callCount, !1);
  }), def("toHaveBeenCalledOnce", function() {
    let spy = getSpy(this), spyName = spy.getMockName(), callCount = spy.mock.calls.length;
    return this.assert(callCount === 1, `expected "${spyName}" to be called once, but got ${callCount} times`, `expected "${spyName}" to not be called once`, 1, callCount, !1);
  }), def(["toHaveBeenCalled", "toBeCalled"], function() {
    let spy = getSpy(this), spyName = spy.getMockName(), callCount = spy.mock.calls.length, called = callCount > 0, isNot = utils.flag(this, "negate"), msg = utils.getMessage(this, [
      called,
      `expected "${spyName}" to be called at least once`,
      `expected "${spyName}" to not be called at all, but actually been called ${callCount} times`,
      !0,
      called
    ]);
    if (called && isNot && (msg = formatCalls(spy, msg)), called && isNot || !called && !isNot)
      throw new AssertionError2(msg);
  });
  function equalsArgumentArray(a, b2) {
    return a.length === b2.length && a.every((aItem, i2) => equals(aItem, b2[i2], [...customTesters, iterableEquality]));
  }
  def(["toHaveBeenCalledWith", "toBeCalledWith"], function(...args) {
    let spy = getSpy(this), spyName = spy.getMockName(), pass = spy.mock.calls.some((callArg) => equalsArgumentArray(callArg, args)), isNot = utils.flag(this, "negate"), msg = utils.getMessage(this, [
      pass,
      `expected "${spyName}" to be called with arguments: #{exp}`,
      `expected "${spyName}" to not be called with arguments: #{exp}`,
      args
    ]);
    if (pass && isNot || !pass && !isNot)
      throw new AssertionError2(formatCalls(spy, msg, args));
  }), def("toHaveBeenCalledExactlyOnceWith", function(...args) {
    let spy = getSpy(this), spyName = spy.getMockName(), callCount = spy.mock.calls.length, pass = spy.mock.calls.some((callArg) => equalsArgumentArray(callArg, args)) && callCount === 1, isNot = utils.flag(this, "negate"), msg = utils.getMessage(this, [
      pass,
      `expected "${spyName}" to be called once with arguments: #{exp}`,
      `expected "${spyName}" to not be called once with arguments: #{exp}`,
      args
    ]);
    if (pass && isNot || !pass && !isNot)
      throw new AssertionError2(formatCalls(spy, msg, args));
  }), def(["toHaveBeenNthCalledWith", "nthCalledWith"], function(times, ...args) {
    let spy = getSpy(this), spyName = spy.getMockName(), nthCall = spy.mock.calls[times - 1], callCount = spy.mock.calls.length, isCalled = times <= callCount;
    this.assert(nthCall && equalsArgumentArray(nthCall, args), `expected ${ordinalOf(times)} "${spyName}" call to have been called with #{exp}${isCalled ? "" : `, but called only ${callCount} times`}`, `expected ${ordinalOf(times)} "${spyName}" call to not have been called with #{exp}`, args, nthCall, isCalled);
  }), def(["toHaveBeenLastCalledWith", "lastCalledWith"], function(...args) {
    let spy = getSpy(this), spyName = spy.getMockName(), lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    this.assert(lastCall && equalsArgumentArray(lastCall, args), `expected last "${spyName}" call to have been called with #{exp}`, `expected last "${spyName}" call to not have been called with #{exp}`, args, lastCall);
  });
  function isSpyCalledBeforeAnotherSpy(beforeSpy, afterSpy, failIfNoFirstInvocation) {
    let beforeInvocationCallOrder = beforeSpy.mock.invocationCallOrder, afterInvocationCallOrder = afterSpy.mock.invocationCallOrder;
    return beforeInvocationCallOrder.length === 0 ? !failIfNoFirstInvocation : afterInvocationCallOrder.length === 0 ? !1 : beforeInvocationCallOrder[0] < afterInvocationCallOrder[0];
  }
  def(["toHaveBeenCalledBefore"], function(resultSpy, failIfNoFirstInvocation = !0) {
    let expectSpy = getSpy(this);
    if (!isMockFunction(resultSpy))
      throw new TypeError(`${utils.inspect(resultSpy)} is not a spy or a call to a spy`);
    this.assert(isSpyCalledBeforeAnotherSpy(expectSpy, resultSpy, failIfNoFirstInvocation), `expected "${expectSpy.getMockName()}" to have been called before "${resultSpy.getMockName()}"`, `expected "${expectSpy.getMockName()}" to not have been called before "${resultSpy.getMockName()}"`, resultSpy, expectSpy);
  }), def(["toHaveBeenCalledAfter"], function(resultSpy, failIfNoFirstInvocation = !0) {
    let expectSpy = getSpy(this);
    if (!isMockFunction(resultSpy))
      throw new TypeError(`${utils.inspect(resultSpy)} is not a spy or a call to a spy`);
    this.assert(isSpyCalledBeforeAnotherSpy(resultSpy, expectSpy, failIfNoFirstInvocation), `expected "${expectSpy.getMockName()}" to have been called after "${resultSpy.getMockName()}"`, `expected "${expectSpy.getMockName()}" to not have been called after "${resultSpy.getMockName()}"`, resultSpy, expectSpy);
  }), def(["toThrow", "toThrowError"], function(expected) {
    if (typeof expected == "string" || typeof expected > "u" || expected instanceof RegExp)
      return this.throws(expected === "" ? /^$/ : expected);
    let obj = this._obj, promise = utils.flag(this, "promise"), isNot = utils.flag(this, "negate"), thrown = null;
    if (promise === "rejects")
      thrown = obj;
    else if (promise === "resolves" && typeof obj != "function") {
      if (isNot)
        return;
      {
        let message = utils.flag(this, "message") || "expected promise to throw an error, but it didn't", error = { showDiff: !1 };
        throw new AssertionError2(message, error, utils.flag(this, "ssfi"));
      }
    } else {
      let isThrow = !1;
      try {
        obj();
      } catch (err) {
        isThrow = !0, thrown = err;
      }
      if (!isThrow && !isNot) {
        let message = utils.flag(this, "message") || "expected function to throw an error, but it didn't", error = { showDiff: !1 };
        throw new AssertionError2(message, error, utils.flag(this, "ssfi"));
      }
    }
    if (typeof expected == "function") {
      let name = expected.name || expected.prototype.constructor.name;
      return this.assert(thrown && thrown instanceof expected, `expected error to be instance of ${name}`, `expected error not to be instance of ${name}`, expected, thrown);
    }
    if (expected instanceof Error) {
      let equal = equals(thrown, expected, [...customTesters, iterableEquality]);
      return this.assert(equal, "expected a thrown error to be #{exp}", "expected a thrown error not to be #{exp}", expected, thrown);
    }
    if (typeof expected == "object" && "asymmetricMatch" in expected && typeof expected.asymmetricMatch == "function") {
      let matcher = expected;
      return this.assert(thrown && matcher.asymmetricMatch(thrown), "expected error to match asymmetric matcher", "expected error not to match asymmetric matcher", matcher, thrown);
    }
    throw new Error(`"toThrow" expects string, RegExp, function, Error instance or asymmetric matcher, got "${typeof expected}"`);
  }), [{
    name: "toHaveResolved",
    condition: (spy) => spy.mock.settledResults.length > 0 && spy.mock.settledResults.some(({ type: type5 }) => type5 === "fulfilled"),
    action: "resolved"
  }, {
    name: ["toHaveReturned", "toReturn"],
    condition: (spy) => spy.mock.calls.length > 0 && spy.mock.results.some(({ type: type5 }) => type5 !== "throw"),
    action: "called"
  }].forEach(({ name, condition, action }) => {
    def(name, function() {
      let spy = getSpy(this), spyName = spy.getMockName(), pass = condition(spy);
      this.assert(pass, `expected "${spyName}" to be successfully ${action} at least once`, `expected "${spyName}" to not be successfully ${action}`, pass, !pass, !1);
    });
  }), [{
    name: "toHaveResolvedTimes",
    condition: (spy, times) => spy.mock.settledResults.reduce((s3, { type: type5 }) => type5 === "fulfilled" ? ++s3 : s3, 0) === times,
    action: "resolved"
  }, {
    name: ["toHaveReturnedTimes", "toReturnTimes"],
    condition: (spy, times) => spy.mock.results.reduce((s3, { type: type5 }) => type5 === "throw" ? s3 : ++s3, 0) === times,
    action: "called"
  }].forEach(({ name, condition, action }) => {
    def(name, function(times) {
      let spy = getSpy(this), spyName = spy.getMockName(), pass = condition(spy, times);
      this.assert(pass, `expected "${spyName}" to be successfully ${action} ${times} times`, `expected "${spyName}" to not be successfully ${action} ${times} times`, `expected resolved times: ${times}`, `received resolved times: ${pass}`, !1);
    });
  }), [{
    name: "toHaveResolvedWith",
    condition: (spy, value) => spy.mock.settledResults.some(({ type: type5, value: result }) => type5 === "fulfilled" && equals(value, result)),
    action: "resolve"
  }, {
    name: ["toHaveReturnedWith", "toReturnWith"],
    condition: (spy, value) => spy.mock.results.some(({ type: type5, value: result }) => type5 === "return" && equals(value, result)),
    action: "return"
  }].forEach(({ name, condition, action }) => {
    def(name, function(value) {
      let spy = getSpy(this), pass = condition(spy, value), isNot = utils.flag(this, "negate");
      if (pass && isNot || !pass && !isNot) {
        let spyName = spy.getMockName(), msg = utils.getMessage(this, [
          pass,
          `expected "${spyName}" to ${action} with: #{exp} at least once`,
          `expected "${spyName}" to not ${action} with: #{exp}`,
          value
        ]), results = action === "return" ? spy.mock.results : spy.mock.settledResults;
        throw new AssertionError2(formatReturns(spy, results, msg, value));
      }
    });
  }), [{
    name: "toHaveLastResolvedWith",
    condition: (spy, value) => {
      let result = spy.mock.settledResults[spy.mock.settledResults.length - 1];
      return result && result.type === "fulfilled" && equals(result.value, value);
    },
    action: "resolve"
  }, {
    name: ["toHaveLastReturnedWith", "lastReturnedWith"],
    condition: (spy, value) => {
      let result = spy.mock.results[spy.mock.results.length - 1];
      return result && result.type === "return" && equals(result.value, value);
    },
    action: "return"
  }].forEach(({ name, condition, action }) => {
    def(name, function(value) {
      let spy = getSpy(this), results = action === "return" ? spy.mock.results : spy.mock.settledResults, result = results[results.length - 1], spyName = spy.getMockName();
      this.assert(condition(spy, value), `expected last "${spyName}" call to ${action} #{exp}`, `expected last "${spyName}" call to not ${action} #{exp}`, value, result?.value);
    });
  }), [{
    name: "toHaveNthResolvedWith",
    condition: (spy, index, value) => {
      let result = spy.mock.settledResults[index - 1];
      return result && result.type === "fulfilled" && equals(result.value, value);
    },
    action: "resolve"
  }, {
    name: ["toHaveNthReturnedWith", "nthReturnedWith"],
    condition: (spy, index, value) => {
      let result = spy.mock.results[index - 1];
      return result && result.type === "return" && equals(result.value, value);
    },
    action: "return"
  }].forEach(({ name, condition, action }) => {
    def(name, function(nthCall, value) {
      let spy = getSpy(this), spyName = spy.getMockName(), result = (action === "return" ? spy.mock.results : spy.mock.settledResults)[nthCall - 1], ordinalCall = `${ordinalOf(nthCall)} call`;
      this.assert(condition(spy, nthCall, value), `expected ${ordinalCall} "${spyName}" call to ${action} #{exp}`, `expected ${ordinalCall} "${spyName}" call to not ${action} #{exp}`, value, result?.value);
    });
  }), def("withContext", function(context) {
    for (let key in context)
      utils.flag(this, key, context[key]);
    return this;
  }), utils.addProperty(chai.Assertion.prototype, "resolves", function() {
    let error = new Error("resolves");
    utils.flag(this, "promise", "resolves"), utils.flag(this, "error", error);
    let test2 = utils.flag(this, "vitest-test"), obj = utils.flag(this, "object");
    if (utils.flag(this, "poll"))
      throw new SyntaxError("expect.poll() is not supported in combination with .resolves");
    if (typeof obj?.then != "function")
      throw new TypeError(`You must provide a Promise to expect() when using .resolves, not '${typeof obj}'.`);
    let proxy = new Proxy(this, { get: (target, key, receiver) => {
      let result = Reflect.get(target, key, receiver);
      return typeof result != "function" ? result instanceof chai.Assertion ? proxy : result : (...args) => {
        utils.flag(this, "_name", key);
        let promise = obj.then((value) => (utils.flag(this, "object", value), result.call(this, ...args)), (err) => {
          let _error = new AssertionError2(`promise rejected "${utils.inspect(err)}" instead of resolving`, { showDiff: !1 });
          throw _error.cause = err, _error.stack = error.stack.replace(error.message, _error.message), _error;
        });
        return recordAsyncExpect(test2, promise, createAssertionMessage(utils, this, !!args.length), error);
      };
    } });
    return proxy;
  }), utils.addProperty(chai.Assertion.prototype, "rejects", function() {
    let error = new Error("rejects");
    utils.flag(this, "promise", "rejects"), utils.flag(this, "error", error);
    let test2 = utils.flag(this, "vitest-test"), obj = utils.flag(this, "object"), wrapper = typeof obj == "function" ? obj() : obj;
    if (utils.flag(this, "poll"))
      throw new SyntaxError("expect.poll() is not supported in combination with .rejects");
    if (typeof wrapper?.then != "function")
      throw new TypeError(`You must provide a Promise to expect() when using .rejects, not '${typeof wrapper}'.`);
    let proxy = new Proxy(this, { get: (target, key, receiver) => {
      let result = Reflect.get(target, key, receiver);
      return typeof result != "function" ? result instanceof chai.Assertion ? proxy : result : (...args) => {
        utils.flag(this, "_name", key);
        let promise = wrapper.then((value) => {
          let _error = new AssertionError2(`promise resolved "${utils.inspect(value)}" instead of rejecting`, {
            showDiff: !0,
            expected: new Error("rejected promise"),
            actual: value
          });
          throw _error.stack = error.stack.replace(error.message, _error.message), _error;
        }, (err) => (utils.flag(this, "object", err), result.call(this, ...args)));
        return recordAsyncExpect(test2, promise, createAssertionMessage(utils, this, !!args.length), error);
      };
    } });
    return proxy;
  });
};
function ordinalOf(i2) {
  let j2 = i2 % 10, k2 = i2 % 100;
  return j2 === 1 && k2 !== 11 ? `${i2}st` : j2 === 2 && k2 !== 12 ? `${i2}nd` : j2 === 3 && k2 !== 13 ? `${i2}rd` : `${i2}th`;
}
function formatCalls(spy, msg, showActualCall) {
  return spy.mock.calls.length && (msg += s.gray(`

Received: 

${spy.mock.calls.map((callArg, i2) => {
    let methodCall = s.bold(`  ${ordinalOf(i2 + 1)} ${spy.getMockName()} call:

`);
    return showActualCall ? methodCall += diff(showActualCall, callArg, { omitAnnotationLines: !0 }) : methodCall += stringify(callArg).split(`
`).map((line) => `    ${line}`).join(`
`), methodCall += `
`, methodCall;
  }).join(`
`)}`)), msg += s.gray(`

Number of calls: ${s.bold(spy.mock.calls.length)}
`), msg;
}
function formatReturns(spy, results, msg, showActualReturn) {
  return results.length && (msg += s.gray(`

Received: 

${results.map((callReturn, i2) => {
    let methodCall = s.bold(`  ${ordinalOf(i2 + 1)} ${spy.getMockName()} call return:

`);
    return showActualReturn ? methodCall += diff(showActualReturn, callReturn.value, { omitAnnotationLines: !0 }) : methodCall += stringify(callReturn).split(`
`).map((line) => `    ${line}`).join(`
`), methodCall += `
`, methodCall;
  }).join(`
`)}`)), msg += s.gray(`

Number of calls: ${s.bold(spy.mock.calls.length)}
`), msg;
}
function getMatcherState(assertion, expect4) {
  let obj = assertion._obj, isNot = utils_exports.flag(assertion, "negate"), promise = utils_exports.flag(assertion, "promise") || "", jestUtils = {
    ...getMatcherUtils(),
    diff,
    stringify,
    iterableEquality,
    subsetEquality
  };
  return {
    state: {
      ...getState(expect4),
      customTesters: getCustomEqualityTesters(),
      isNot,
      utils: jestUtils,
      promise,
      equals,
      suppressedErrors: [],
      soft: utils_exports.flag(assertion, "soft"),
      poll: utils_exports.flag(assertion, "poll")
    },
    isNot,
    obj
  };
}
var JestExtendError = class extends Error {
  constructor(message, actual, expected) {
    super(message), this.actual = actual, this.expected = expected;
  }
};
function JestExtendPlugin(c2, expect4, matchers) {
  return (_, utils) => {
    Object.entries(matchers).forEach(([expectAssertionName, expectAssertion]) => {
      function expectWrapper(...args) {
        let { state, isNot, obj } = getMatcherState(this, expect4), result = expectAssertion.call(state, obj, ...args);
        if (result && typeof result == "object" && typeof result.then == "function")
          return result.then(({ pass: pass2, message: message2, actual: actual2, expected: expected2 }) => {
            if (pass2 && isNot || !pass2 && !isNot)
              throw new JestExtendError(message2(), actual2, expected2);
          });
        let { pass, message, actual, expected } = result;
        if (pass && isNot || !pass && !isNot)
          throw new JestExtendError(message(), actual, expected);
      }
      let softWrapper = wrapAssertion(utils, expectAssertionName, expectWrapper);
      utils.addMethod(globalThis[JEST_MATCHERS_OBJECT].matchers, expectAssertionName, softWrapper), utils.addMethod(c2.Assertion.prototype, expectAssertionName, softWrapper);
      class CustomMatcher extends AsymmetricMatcher {
        constructor(inverse = !1, ...sample) {
          super(sample, inverse);
        }
        asymmetricMatch(other) {
          let { pass } = expectAssertion.call(this.getMatcherContext(expect4), other, ...this.sample);
          return this.inverse ? !pass : pass;
        }
        toString() {
          return `${this.inverse ? "not." : ""}${expectAssertionName}`;
        }
        getExpectedType() {
          return "any";
        }
        toAsymmetricMatcher() {
          return `${this.toString()}<${this.sample.map((item) => stringify(item)).join(", ")}>`;
        }
      }
      let customMatcher = (...sample) => new CustomMatcher(!1, ...sample);
      Object.defineProperty(expect4, expectAssertionName, {
        configurable: !0,
        enumerable: !0,
        value: customMatcher,
        writable: !0
      }), Object.defineProperty(expect4.not, expectAssertionName, {
        configurable: !0,
        enumerable: !0,
        value: (...sample) => new CustomMatcher(!0, ...sample),
        writable: !0
      }), Object.defineProperty(globalThis[ASYMMETRIC_MATCHERS_OBJECT], expectAssertionName, {
        configurable: !0,
        enumerable: !0,
        value: customMatcher,
        writable: !0
      });
    });
  };
}
var JestExtend = (chai, utils) => {
  utils.addMethod(chai.expect, "extend", (expect4, expects) => {
    use(JestExtendPlugin(chai, expect4, expects));
  });
};

// src/test/expect.ts
function createExpect() {
  use(JestExtend), use(JestChaiExpect), use(JestAsymmetricMatchers);
  let expect4 = ((value, message) => {
    let { assertionCalls } = getState(expect4);
    return setState({ assertionCalls: assertionCalls + 1, soft: !1 }, expect4), expect(value, message);
  });
  Object.assign(expect4, expect), expect4.getState = () => getState(expect4), expect4.setState = (state) => setState(state, expect4), expect4.extend = (expects) => expect.extend(expect4, expects), expect4.soft = (...args) => {
    let assert2 = expect4(...args);
    return expect4.setState({
      soft: !0
    }), assert2;
  }, expect4.extend(customMatchers), expect4.unreachable = (message) => {
    assert.fail(`expected${message ? ` "${message}" ` : " "}not to be reached`);
  };
  function assertions(expected) {
    let errorGen = () => new Error(
      `expected number of assertions to be ${expected}, but got ${expect4.getState().assertionCalls}`
    );
    "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(errorGen(), assertions), expect4.setState({
      expectedAssertionsNumber: expected,
      expectedAssertionsNumberErrorGen: errorGen
    });
  }
  function hasAssertions() {
    let error = new Error("expected any number of assertion, but got none");
    "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(error, hasAssertions), expect4.setState({
      isExpectingAssertions: !0,
      isExpectingAssertionsError: error
    });
  }
  return setState(
    {
      // this should also add "snapshotState" that is added conditionally
      assertionCalls: 0,
      isExpectingAssertions: !1,
      isExpectingAssertionsError: null,
      expectedAssertionsNumber: null,
      expectedAssertionsNumberErrorGen: null
    },
    expect4
  ), utils_exports.addMethod(expect4, "assertions", assertions), utils_exports.addMethod(expect4, "hasAssertions", hasAssertions), expect4.extend(matchers_exports), expect4;
}
var expect2 = createExpect();
Object.defineProperty(globalThis, GLOBAL_EXPECT, {
  value: expect2,
  writable: !0,
  configurable: !0
});

// ../node_modules/tinyspy/dist/index.js
function f2(e2, t2, n2) {
  Object.defineProperty(e2, t2, n2);
}
var u2 = Symbol.for("tinyspy:spy");
var P2 = (e2) => {
  e2.called = !1, e2.callCount = 0, e2.calls = [], e2.results = [], e2.resolves = [], e2.next = [];
}, K2 = (e2) => (f2(e2, u2, { value: { reset: () => P2(e2[u2]) } }), e2[u2]), T2 = (e2) => e2[u2] || K2(e2);

// src/test/spy.ts
var listeners = /* @__PURE__ */ new Set();
function onMockCall(callback) {
  return listeners.add(callback), () => void listeners.delete(callback);
}
var spyOn2 = (...args) => {
  let mock = spyOn(...args);
  return reactiveMock(mock);
};
function fn2(implementation) {
  let mock = implementation ? fn(implementation) : fn();
  return reactiveMock(mock);
}
function reactiveMock(mock) {
  let reactive = listenWhenCalled(mock), originalMockImplementation = reactive.mockImplementation.bind(null);
  return reactive.mockImplementation = (fn3) => listenWhenCalled(originalMockImplementation(fn3)), reactive;
}
function listenWhenCalled(mock) {
  let state = T2(mock), impl = state.impl;
  return state.willCall(function(...args) {
    return listeners.forEach((listener) => listener(mock, args)), impl?.apply(this, args);
  }), mock;
}
function clearAllMocks() {
  mocks.forEach((spy) => spy.mockClear());
}
function resetAllMocks() {
  mocks.forEach((spy) => spy.mockReset());
}
function restoreAllMocks() {
  mocks.forEach((spy) => spy.mockRestore());
}
function mocked(item, _options = {}) {
  return item;
}

// ../node_modules/@testing-library/dom/dist/@testing-library/dom.esm.js
var dom_esm_exports = {};
__export(dom_esm_exports, {
  buildQueries: () => buildQueries,
  configure: () => configure,
  createEvent: () => createEvent,
  findAllByAltText: () => findAllByAltText,
  findAllByDisplayValue: () => findAllByDisplayValue,
  findAllByLabelText: () => findAllByLabelText,
  findAllByPlaceholderText: () => findAllByPlaceholderText,
  findAllByRole: () => findAllByRole,
  findAllByTestId: () => findAllByTestId,
  findAllByText: () => findAllByText,
  findAllByTitle: () => findAllByTitle,
  findByAltText: () => findByAltText,
  findByDisplayValue: () => findByDisplayValue,
  findByLabelText: () => findByLabelText,
  findByPlaceholderText: () => findByPlaceholderText,
  findByRole: () => findByRole,
  findByTestId: () => findByTestId,
  findByText: () => findByText,
  findByTitle: () => findByTitle,
  fireEvent: () => fireEvent,
  getAllByAltText: () => getAllByAltText,
  getAllByDisplayValue: () => getAllByDisplayValue,
  getAllByLabelText: () => getAllByLabelTextWithSuggestions,
  getAllByPlaceholderText: () => getAllByPlaceholderText,
  getAllByRole: () => getAllByRole,
  getAllByTestId: () => getAllByTestId,
  getAllByText: () => getAllByText,
  getAllByTitle: () => getAllByTitle,
  getByAltText: () => getByAltText,
  getByDisplayValue: () => getByDisplayValue,
  getByLabelText: () => getByLabelTextWithSuggestions,
  getByPlaceholderText: () => getByPlaceholderText,
  getByRole: () => getByRole,
  getByTestId: () => getByTestId,
  getByText: () => getByText,
  getByTitle: () => getByTitle,
  getConfig: () => getConfig,
  getDefaultNormalizer: () => getDefaultNormalizer,
  getElementError: () => getElementError,
  getMultipleElementsFoundError: () => getMultipleElementsFoundError,
  getNodeText: () => getNodeText,
  getQueriesForElement: () => getQueriesForElement,
  getRoles: () => getRoles,
  getSuggestedQuery: () => getSuggestedQuery,
  isInaccessible: () => isInaccessible,
  logDOM: () => logDOM,
  logRoles: () => logRoles,
  makeFindQuery: () => makeFindQuery,
  makeGetAllQuery: () => makeGetAllQuery,
  makeSingleQuery: () => makeSingleQuery,
  prettyDOM: () => prettyDOM,
  prettyFormat: () => prettyFormat,
  queries: () => queries,
  queryAllByAltText: () => queryAllByAltTextWithSuggestions,
  queryAllByAttribute: () => queryAllByAttribute,
  queryAllByDisplayValue: () => queryAllByDisplayValueWithSuggestions,
  queryAllByLabelText: () => queryAllByLabelTextWithSuggestions,
  queryAllByPlaceholderText: () => queryAllByPlaceholderTextWithSuggestions,
  queryAllByRole: () => queryAllByRoleWithSuggestions,
  queryAllByTestId: () => queryAllByTestIdWithSuggestions,
  queryAllByText: () => queryAllByTextWithSuggestions,
  queryAllByTitle: () => queryAllByTitleWithSuggestions,
  queryByAltText: () => queryByAltText,
  queryByAttribute: () => queryByAttribute,
  queryByDisplayValue: () => queryByDisplayValue,
  queryByLabelText: () => queryByLabelText,
  queryByPlaceholderText: () => queryByPlaceholderText,
  queryByRole: () => queryByRole,
  queryByTestId: () => queryByTestId,
  queryByText: () => queryByText,
  queryByTitle: () => queryByTitle,
  queryHelpers: () => queryHelpers,
  screen: () => screen,
  waitFor: () => waitForWrapper,
  waitForElementToBeRemoved: () => waitForElementToBeRemoved,
  within: () => getQueriesForElement,
  wrapAllByQueryWithSuggestion: () => wrapAllByQueryWithSuggestion,
  wrapSingleQueryWithSuggestion: () => wrapSingleQueryWithSuggestion
});
var prettyFormat = __toESM(require_build());

// ../node_modules/dom-accessibility-api/dist/polyfills/array.from.mjs
var toStr2 = Object.prototype.toString;
function isCallable2(fn3) {
  return typeof fn3 == "function" || toStr2.call(fn3) === "[object Function]";
}
function toInteger2(value) {
  var number = Number(value);
  return isNaN(number) ? 0 : number === 0 || !isFinite(number) ? number : (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
}
var maxSafeInteger2 = Math.pow(2, 53) - 1;
function toLength2(value) {
  var len = toInteger2(value);
  return Math.min(Math.max(len, 0), maxSafeInteger2);
}
function arrayFrom2(arrayLike, mapFn) {
  var C = Array, items = Object(arrayLike);
  if (arrayLike == null)
    throw new TypeError("Array.from requires an array-like object - not null or undefined");
  if (typeof mapFn < "u" && !isCallable2(mapFn))
    throw new TypeError("Array.from: when provided, the second argument must be a function");
  for (var len = toLength2(items.length), A = isCallable2(C) ? Object(new C(len)) : new Array(len), k2 = 0, kValue; k2 < len; )
    kValue = items[k2], mapFn ? A[k2] = mapFn(kValue, k2) : A[k2] = kValue, k2 += 1;
  return A.length = len, A;
}

// ../node_modules/dom-accessibility-api/dist/polyfills/SetLike.mjs
function _typeof3(obj) {
  "@babel/helpers - typeof";
  return _typeof3 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(obj2) {
    return typeof obj2;
  } : function(obj2) {
    return obj2 && typeof Symbol == "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
  }, _typeof3(obj);
}
function _classCallCheck2(instance, Constructor) {
  if (!(instance instanceof Constructor))
    throw new TypeError("Cannot call a class as a function");
}
function _defineProperties2(target, props) {
  for (var i2 = 0; i2 < props.length; i2++) {
    var descriptor = props[i2];
    descriptor.enumerable = descriptor.enumerable || !1, descriptor.configurable = !0, "value" in descriptor && (descriptor.writable = !0), Object.defineProperty(target, _toPropertyKey3(descriptor.key), descriptor);
  }
}
function _createClass2(Constructor, protoProps, staticProps) {
  return protoProps && _defineProperties2(Constructor.prototype, protoProps), staticProps && _defineProperties2(Constructor, staticProps), Object.defineProperty(Constructor, "prototype", { writable: !1 }), Constructor;
}
function _defineProperty3(obj, key, value) {
  return key = _toPropertyKey3(key), key in obj ? Object.defineProperty(obj, key, { value, enumerable: !0, configurable: !0, writable: !0 }) : obj[key] = value, obj;
}
function _toPropertyKey3(arg) {
  var key = _toPrimitive3(arg, "string");
  return _typeof3(key) === "symbol" ? key : String(key);
}
function _toPrimitive3(input2, hint) {
  if (_typeof3(input2) !== "object" || input2 === null) return input2;
  var prim = input2[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input2, hint || "default");
    if (_typeof3(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input2);
}
var SetLike2 = (function() {
  function SetLike3() {
    var items = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    _classCallCheck2(this, SetLike3), _defineProperty3(this, "items", void 0), this.items = items;
  }
  return _createClass2(SetLike3, [{
    key: "add",
    value: function(value) {
      return this.has(value) === !1 && this.items.push(value), this;
    }
  }, {
    key: "clear",
    value: function() {
      this.items = [];
    }
  }, {
    key: "delete",
    value: function(value) {
      var previousLength = this.items.length;
      return this.items = this.items.filter(function(item) {
        return item !== value;
      }), previousLength !== this.items.length;
    }
  }, {
    key: "forEach",
    value: function(callbackfn) {
      var _this = this;
      this.items.forEach(function(item) {
        callbackfn(item, item, _this);
      });
    }
  }, {
    key: "has",
    value: function(value) {
      return this.items.indexOf(value) !== -1;
    }
  }, {
    key: "size",
    get: function() {
      return this.items.length;
    }
  }]), SetLike3;
})(), SetLike_default2 = typeof Set > "u" ? Set : SetLike2;

// ../node_modules/dom-accessibility-api/dist/getRole.mjs
function getLocalName2(element) {
  var _element$localName;
  return (
    // eslint-disable-next-line no-restricted-properties -- actual guard for environments without localName
    (_element$localName = element.localName) !== null && _element$localName !== void 0 ? _element$localName : (
      // eslint-disable-next-line no-restricted-properties -- required for the fallback
      element.tagName.toLowerCase()
    )
  );
}
var localNameToRoleMappings2 = {
  article: "article",
  aside: "complementary",
  button: "button",
  datalist: "listbox",
  dd: "definition",
  details: "group",
  dialog: "dialog",
  dt: "term",
  fieldset: "group",
  figure: "figure",
  // WARNING: Only with an accessible name
  form: "form",
  footer: "contentinfo",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  header: "banner",
  hr: "separator",
  html: "document",
  legend: "legend",
  li: "listitem",
  math: "math",
  main: "main",
  menu: "list",
  nav: "navigation",
  ol: "list",
  optgroup: "group",
  // WARNING: Only in certain context
  option: "option",
  output: "status",
  progress: "progressbar",
  // WARNING: Only with an accessible name
  section: "region",
  summary: "button",
  table: "table",
  tbody: "rowgroup",
  textarea: "textbox",
  tfoot: "rowgroup",
  // WARNING: Only in certain context
  td: "cell",
  th: "columnheader",
  thead: "rowgroup",
  tr: "row",
  ul: "list"
}, prohibitedAttributes2 = {
  caption: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  code: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  deletion: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  emphasis: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  generic: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby", "aria-roledescription"]),
  insertion: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  paragraph: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  presentation: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  strong: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  subscript: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"]),
  superscript: /* @__PURE__ */ new Set(["aria-label", "aria-labelledby"])
};
function hasGlobalAriaAttributes2(element, role) {
  return [
    "aria-atomic",
    "aria-busy",
    "aria-controls",
    "aria-current",
    "aria-describedby",
    "aria-details",
    // "disabled",
    "aria-dropeffect",
    // "errormessage",
    "aria-flowto",
    "aria-grabbed",
    // "haspopup",
    "aria-hidden",
    // "invalid",
    "aria-keyshortcuts",
    "aria-label",
    "aria-labelledby",
    "aria-live",
    "aria-owns",
    "aria-relevant",
    "aria-roledescription"
  ].some(function(attributeName) {
    var _prohibitedAttributes;
    return element.hasAttribute(attributeName) && !((_prohibitedAttributes = prohibitedAttributes2[role]) !== null && _prohibitedAttributes !== void 0 && _prohibitedAttributes.has(attributeName));
  });
}
function ignorePresentationalRole2(element, implicitRole) {
  return hasGlobalAriaAttributes2(element, implicitRole);
}
function getRole2(element) {
  var explicitRole = getExplicitRole2(element);
  if (explicitRole === null || explicitRole === "presentation") {
    var implicitRole = getImplicitRole2(element);
    if (explicitRole !== "presentation" || ignorePresentationalRole2(element, implicitRole || ""))
      return implicitRole;
  }
  return explicitRole;
}
function getImplicitRole2(element) {
  var mappedByTag = localNameToRoleMappings2[getLocalName2(element)];
  if (mappedByTag !== void 0)
    return mappedByTag;
  switch (getLocalName2(element)) {
    case "a":
    case "area":
    case "link":
      if (element.hasAttribute("href"))
        return "link";
      break;
    case "img":
      return element.getAttribute("alt") === "" && !ignorePresentationalRole2(element, "img") ? "presentation" : "img";
    case "input": {
      var _ref = element, type5 = _ref.type;
      switch (type5) {
        case "button":
        case "image":
        case "reset":
        case "submit":
          return "button";
        case "checkbox":
        case "radio":
          return type5;
        case "range":
          return "slider";
        case "email":
        case "tel":
        case "text":
        case "url":
          return element.hasAttribute("list") ? "combobox" : "textbox";
        case "search":
          return element.hasAttribute("list") ? "combobox" : "searchbox";
        case "number":
          return "spinbutton";
        default:
          return null;
      }
    }
    case "select":
      return element.hasAttribute("multiple") || element.size > 1 ? "listbox" : "combobox";
  }
  return null;
}
function getExplicitRole2(element) {
  var role = element.getAttribute("role");
  if (role !== null) {
    var explicitRole = role.trim().split(" ")[0];
    if (explicitRole.length > 0)
      return explicitRole;
  }
  return null;
}

// ../node_modules/dom-accessibility-api/dist/util.mjs
function isElement2(node) {
  return node !== null && node.nodeType === node.ELEMENT_NODE;
}
function isHTMLTableCaptionElement2(node) {
  return isElement2(node) && getLocalName2(node) === "caption";
}
function isHTMLInputElement2(node) {
  return isElement2(node) && getLocalName2(node) === "input";
}
function isHTMLOptGroupElement2(node) {
  return isElement2(node) && getLocalName2(node) === "optgroup";
}
function isHTMLSelectElement2(node) {
  return isElement2(node) && getLocalName2(node) === "select";
}
function isHTMLTableElement2(node) {
  return isElement2(node) && getLocalName2(node) === "table";
}
function isHTMLTextAreaElement2(node) {
  return isElement2(node) && getLocalName2(node) === "textarea";
}
function safeWindow2(node) {
  var _ref = node.ownerDocument === null ? node : node.ownerDocument, defaultView = _ref.defaultView;
  if (defaultView === null)
    throw new TypeError("no window available");
  return defaultView;
}
function isHTMLFieldSetElement2(node) {
  return isElement2(node) && getLocalName2(node) === "fieldset";
}
function isHTMLLegendElement2(node) {
  return isElement2(node) && getLocalName2(node) === "legend";
}
function isHTMLSlotElement2(node) {
  return isElement2(node) && getLocalName2(node) === "slot";
}
function isSVGElement2(node) {
  return isElement2(node) && node.ownerSVGElement !== void 0;
}
function isSVGSVGElement2(node) {
  return isElement2(node) && getLocalName2(node) === "svg";
}
function isSVGTitleElement2(node) {
  return isSVGElement2(node) && getLocalName2(node) === "title";
}
function queryIdRefs2(node, attributeName) {
  if (isElement2(node) && node.hasAttribute(attributeName)) {
    var ids = node.getAttribute(attributeName).split(" "), root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    return ids.map(function(id) {
      return root.getElementById(id);
    }).filter(
      function(element) {
        return element !== null;
      }
      // TODO: why does this not narrow?
    );
  }
  return [];
}
function hasAnyConcreteRoles2(node, roles3) {
  return isElement2(node) ? roles3.indexOf(getRole2(node)) !== -1 : !1;
}

// ../node_modules/dom-accessibility-api/dist/accessible-name-and-description.mjs
function asFlatString2(s3) {
  return s3.trim().replace(/\s\s+/g, " ");
}
function isHidden2(node, getComputedStyleImplementation) {
  if (!isElement2(node))
    return !1;
  if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true")
    return !0;
  var style = getComputedStyleImplementation(node);
  return style.getPropertyValue("display") === "none" || style.getPropertyValue("visibility") === "hidden";
}
function isControl2(node) {
  return hasAnyConcreteRoles2(node, ["button", "combobox", "listbox", "textbox"]) || hasAbstractRole2(node, "range");
}
function hasAbstractRole2(node, role) {
  if (!isElement2(node))
    return !1;
  switch (role) {
    case "range":
      return hasAnyConcreteRoles2(node, ["meter", "progressbar", "scrollbar", "slider", "spinbutton"]);
    default:
      throw new TypeError("No knowledge about abstract role '".concat(role, "'. This is likely a bug :("));
  }
}
function querySelectorAllSubtree2(element, selectors) {
  var elements = arrayFrom2(element.querySelectorAll(selectors));
  return queryIdRefs2(element, "aria-owns").forEach(function(root) {
    elements.push.apply(elements, arrayFrom2(root.querySelectorAll(selectors)));
  }), elements;
}
function querySelectedOptions2(listbox) {
  return isHTMLSelectElement2(listbox) ? listbox.selectedOptions || querySelectorAllSubtree2(listbox, "[selected]") : querySelectorAllSubtree2(listbox, '[aria-selected="true"]');
}
function isMarkedPresentational2(node) {
  return hasAnyConcreteRoles2(node, ["none", "presentation"]);
}
function isNativeHostLanguageTextAlternativeElement2(node) {
  return isHTMLTableCaptionElement2(node);
}
function allowsNameFromContent2(node) {
  return hasAnyConcreteRoles2(node, ["button", "cell", "checkbox", "columnheader", "gridcell", "heading", "label", "legend", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "row", "rowheader", "switch", "tab", "tooltip", "treeitem"]);
}
function isDescendantOfNativeHostLanguageTextAlternativeElement2(node) {
  return !1;
}
function getValueOfTextbox2(element) {
  return isHTMLInputElement2(element) || isHTMLTextAreaElement2(element) ? element.value : element.textContent || "";
}
function getTextualContent2(declaration) {
  var content = declaration.getPropertyValue("content");
  return /^["'].*["']$/.test(content) ? content.slice(1, -1) : "";
}
function isLabelableElement2(element) {
  var localName = getLocalName2(element);
  return localName === "button" || localName === "input" && element.getAttribute("type") !== "hidden" || localName === "meter" || localName === "output" || localName === "progress" || localName === "select" || localName === "textarea";
}
function findLabelableElement2(element) {
  if (isLabelableElement2(element))
    return element;
  var labelableElement = null;
  return element.childNodes.forEach(function(childNode) {
    if (labelableElement === null && isElement2(childNode)) {
      var descendantLabelableElement = findLabelableElement2(childNode);
      descendantLabelableElement !== null && (labelableElement = descendantLabelableElement);
    }
  }), labelableElement;
}
function getControlOfLabel2(label) {
  if (label.control !== void 0)
    return label.control;
  var htmlFor = label.getAttribute("for");
  return htmlFor !== null ? label.ownerDocument.getElementById(htmlFor) : findLabelableElement2(label);
}
function getLabels2(element) {
  var labelsProperty = element.labels;
  if (labelsProperty === null)
    return labelsProperty;
  if (labelsProperty !== void 0)
    return arrayFrom2(labelsProperty);
  if (!isLabelableElement2(element))
    return null;
  var document2 = element.ownerDocument;
  return arrayFrom2(document2.querySelectorAll("label")).filter(function(label) {
    return getControlOfLabel2(label) === element;
  });
}
function getSlotContents2(slot) {
  var assignedNodes = slot.assignedNodes();
  return assignedNodes.length === 0 ? arrayFrom2(slot.childNodes) : assignedNodes;
}
function computeTextAlternative2(root) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, consultedNodes = new SetLike_default2(), window2 = safeWindow2(root), _options$compute = options.compute, compute = _options$compute === void 0 ? "name" : _options$compute, _options$computedStyl = options.computedStyleSupportsPseudoElements, computedStyleSupportsPseudoElements = _options$computedStyl === void 0 ? options.getComputedStyle !== void 0 : _options$computedStyl, _options$getComputedS = options.getComputedStyle, getComputedStyle = _options$getComputedS === void 0 ? window2.getComputedStyle.bind(window2) : _options$getComputedS, _options$hidden = options.hidden, hidden = _options$hidden === void 0 ? !1 : _options$hidden;
  function computeMiscTextAlternative(node, context) {
    var accumulatedText = "";
    if (isElement2(node) && computedStyleSupportsPseudoElements) {
      var pseudoBefore = getComputedStyle(node, "::before"), beforeContent = getTextualContent2(pseudoBefore);
      accumulatedText = "".concat(beforeContent, " ").concat(accumulatedText);
    }
    var childNodes = isHTMLSlotElement2(node) ? getSlotContents2(node) : arrayFrom2(node.childNodes).concat(queryIdRefs2(node, "aria-owns"));
    if (childNodes.forEach(function(child) {
      var result = computeTextAlternative3(child, {
        isEmbeddedInLabel: context.isEmbeddedInLabel,
        isReferenced: !1,
        recursion: !0
      }), display2 = isElement2(child) ? getComputedStyle(child).getPropertyValue("display") : "inline", separator = display2 !== "inline" ? " " : "";
      accumulatedText += "".concat(separator).concat(result).concat(separator);
    }), isElement2(node) && computedStyleSupportsPseudoElements) {
      var pseudoAfter = getComputedStyle(node, "::after"), afterContent = getTextualContent2(pseudoAfter);
      accumulatedText = "".concat(accumulatedText, " ").concat(afterContent);
    }
    return accumulatedText.trim();
  }
  function useAttribute(element, attributeName) {
    var attribute = element.getAttributeNode(attributeName);
    return attribute !== null && !consultedNodes.has(attribute) && attribute.value.trim() !== "" ? (consultedNodes.add(attribute), attribute.value) : null;
  }
  function computeTooltipAttributeValue(node) {
    return isElement2(node) ? useAttribute(node, "title") : null;
  }
  function computeElementTextAlternative(node) {
    if (!isElement2(node))
      return null;
    if (isHTMLFieldSetElement2(node)) {
      consultedNodes.add(node);
      for (var children = arrayFrom2(node.childNodes), i2 = 0; i2 < children.length; i2 += 1) {
        var child = children[i2];
        if (isHTMLLegendElement2(child))
          return computeTextAlternative3(child, {
            isEmbeddedInLabel: !1,
            isReferenced: !1,
            recursion: !1
          });
      }
    } else if (isHTMLTableElement2(node)) {
      consultedNodes.add(node);
      for (var _children = arrayFrom2(node.childNodes), _i = 0; _i < _children.length; _i += 1) {
        var _child = _children[_i];
        if (isHTMLTableCaptionElement2(_child))
          return computeTextAlternative3(_child, {
            isEmbeddedInLabel: !1,
            isReferenced: !1,
            recursion: !1
          });
      }
    } else if (isSVGSVGElement2(node)) {
      consultedNodes.add(node);
      for (var _children2 = arrayFrom2(node.childNodes), _i2 = 0; _i2 < _children2.length; _i2 += 1) {
        var _child2 = _children2[_i2];
        if (isSVGTitleElement2(_child2))
          return _child2.textContent;
      }
      return null;
    } else if (getLocalName2(node) === "img" || getLocalName2(node) === "area") {
      var nameFromAlt = useAttribute(node, "alt");
      if (nameFromAlt !== null)
        return nameFromAlt;
    } else if (isHTMLOptGroupElement2(node)) {
      var nameFromLabel = useAttribute(node, "label");
      if (nameFromLabel !== null)
        return nameFromLabel;
    }
    if (isHTMLInputElement2(node) && (node.type === "button" || node.type === "submit" || node.type === "reset")) {
      var nameFromValue = useAttribute(node, "value");
      if (nameFromValue !== null)
        return nameFromValue;
      if (node.type === "submit")
        return "Submit";
      if (node.type === "reset")
        return "Reset";
    }
    var labels = getLabels2(node);
    if (labels !== null && labels.length !== 0)
      return consultedNodes.add(node), arrayFrom2(labels).map(function(element) {
        return computeTextAlternative3(element, {
          isEmbeddedInLabel: !0,
          isReferenced: !1,
          recursion: !0
        });
      }).filter(function(label) {
        return label.length > 0;
      }).join(" ");
    if (isHTMLInputElement2(node) && node.type === "image") {
      var _nameFromAlt = useAttribute(node, "alt");
      if (_nameFromAlt !== null)
        return _nameFromAlt;
      var nameFromTitle = useAttribute(node, "title");
      return nameFromTitle !== null ? nameFromTitle : "Submit Query";
    }
    if (hasAnyConcreteRoles2(node, ["button"])) {
      var nameFromSubTree = computeMiscTextAlternative(node, {
        isEmbeddedInLabel: !1,
        isReferenced: !1
      });
      if (nameFromSubTree !== "")
        return nameFromSubTree;
    }
    return null;
  }
  function computeTextAlternative3(current, context) {
    if (consultedNodes.has(current))
      return "";
    if (!hidden && isHidden2(current, getComputedStyle) && !context.isReferenced)
      return consultedNodes.add(current), "";
    var labelAttributeNode = isElement2(current) ? current.getAttributeNode("aria-labelledby") : null, labelElements = labelAttributeNode !== null && !consultedNodes.has(labelAttributeNode) ? queryIdRefs2(current, "aria-labelledby") : [];
    if (compute === "name" && !context.isReferenced && labelElements.length > 0)
      return consultedNodes.add(labelAttributeNode), labelElements.map(function(element) {
        return computeTextAlternative3(element, {
          isEmbeddedInLabel: context.isEmbeddedInLabel,
          isReferenced: !0,
          // this isn't recursion as specified, otherwise we would skip
          // `aria-label` in
          // <input id="myself" aria-label="foo" aria-labelledby="myself"
          recursion: !1
        });
      }).join(" ");
    var skipToStep2E = context.recursion && isControl2(current) && compute === "name";
    if (!skipToStep2E) {
      var ariaLabel = (isElement2(current) && current.getAttribute("aria-label") || "").trim();
      if (ariaLabel !== "" && compute === "name")
        return consultedNodes.add(current), ariaLabel;
      if (!isMarkedPresentational2(current)) {
        var elementTextAlternative = computeElementTextAlternative(current);
        if (elementTextAlternative !== null)
          return consultedNodes.add(current), elementTextAlternative;
      }
    }
    if (hasAnyConcreteRoles2(current, ["menu"]))
      return consultedNodes.add(current), "";
    if (skipToStep2E || context.isEmbeddedInLabel || context.isReferenced) {
      if (hasAnyConcreteRoles2(current, ["combobox", "listbox"])) {
        consultedNodes.add(current);
        var selectedOptions = querySelectedOptions2(current);
        return selectedOptions.length === 0 ? isHTMLInputElement2(current) ? current.value : "" : arrayFrom2(selectedOptions).map(function(selectedOption) {
          return computeTextAlternative3(selectedOption, {
            isEmbeddedInLabel: context.isEmbeddedInLabel,
            isReferenced: !1,
            recursion: !0
          });
        }).join(" ");
      }
      if (hasAbstractRole2(current, "range"))
        return consultedNodes.add(current), current.hasAttribute("aria-valuetext") ? current.getAttribute("aria-valuetext") : current.hasAttribute("aria-valuenow") ? current.getAttribute("aria-valuenow") : current.getAttribute("value") || "";
      if (hasAnyConcreteRoles2(current, ["textbox"]))
        return consultedNodes.add(current), getValueOfTextbox2(current);
    }
    if (allowsNameFromContent2(current) || isElement2(current) && context.isReferenced || isNativeHostLanguageTextAlternativeElement2(current) || isDescendantOfNativeHostLanguageTextAlternativeElement2(current)) {
      var accumulatedText2F = computeMiscTextAlternative(current, {
        isEmbeddedInLabel: context.isEmbeddedInLabel,
        isReferenced: !1
      });
      if (accumulatedText2F !== "")
        return consultedNodes.add(current), accumulatedText2F;
    }
    if (current.nodeType === current.TEXT_NODE)
      return consultedNodes.add(current), current.textContent || "";
    if (context.recursion)
      return consultedNodes.add(current), computeMiscTextAlternative(current, {
        isEmbeddedInLabel: context.isEmbeddedInLabel,
        isReferenced: !1
      });
    var tooltipAttributeValue = computeTooltipAttributeValue(current);
    return tooltipAttributeValue !== null ? (consultedNodes.add(current), tooltipAttributeValue) : (consultedNodes.add(current), "");
  }
  return asFlatString2(computeTextAlternative3(root, {
    isEmbeddedInLabel: !1,
    // by spec computeAccessibleDescription starts with the referenced elements as roots
    isReferenced: compute === "description",
    recursion: !1
  }));
}

// ../node_modules/dom-accessibility-api/dist/accessible-description.mjs
function _typeof4(obj) {
  "@babel/helpers - typeof";
  return _typeof4 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(obj2) {
    return typeof obj2;
  } : function(obj2) {
    return obj2 && typeof Symbol == "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
  }, _typeof4(obj);
}
function ownKeys2(object, enumerableOnly) {
  var keys2 = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function(sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys2.push.apply(keys2, symbols);
  }
  return keys2;
}
function _objectSpread2(target) {
  for (var i2 = 1; i2 < arguments.length; i2++) {
    var source = arguments[i2] != null ? arguments[i2] : {};
    i2 % 2 ? ownKeys2(Object(source), !0).forEach(function(key) {
      _defineProperty4(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys2(Object(source)).forEach(function(key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _defineProperty4(obj, key, value) {
  return key = _toPropertyKey4(key), key in obj ? Object.defineProperty(obj, key, { value, enumerable: !0, configurable: !0, writable: !0 }) : obj[key] = value, obj;
}
function _toPropertyKey4(arg) {
  var key = _toPrimitive4(arg, "string");
  return _typeof4(key) === "symbol" ? key : String(key);
}
function _toPrimitive4(input2, hint) {
  if (_typeof4(input2) !== "object" || input2 === null) return input2;
  var prim = input2[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input2, hint || "default");
    if (_typeof4(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input2);
}
function computeAccessibleDescription2(root) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, description = queryIdRefs2(root, "aria-describedby").map(function(element) {
    return computeTextAlternative2(element, _objectSpread2(_objectSpread2({}, options), {}, {
      compute: "description"
    }));
  }).join(" ");
  if (description === "") {
    var title = root.getAttribute("title");
    description = title === null ? "" : title;
  }
  return description;
}

// ../node_modules/dom-accessibility-api/dist/accessible-name.mjs
function prohibitsNaming2(node) {
  return hasAnyConcreteRoles2(node, ["caption", "code", "deletion", "emphasis", "generic", "insertion", "paragraph", "presentation", "strong", "subscript", "superscript"]);
}
function computeAccessibleName2(root) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return prohibitsNaming2(root) ? "" : computeTextAlternative2(root, options);
}

// ../node_modules/@testing-library/dom/dist/@testing-library/dom.esm.js
var import_aria_query3 = __toESM(require_lib()), import_lz_string = __toESM(require_lz_string());
function escapeHTML(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var printProps = (keys2, props, config3, indentation, depth, refs, printer) => {
  let indentationNext = indentation + config3.indent, colors = config3.colors;
  return keys2.map((key) => {
    let value = props[key], printed = printer(value, config3, indentationNext, depth, refs);
    return typeof value != "string" && (printed.indexOf(`
`) !== -1 && (printed = config3.spacingOuter + indentationNext + printed + config3.spacingOuter + indentation), printed = "{" + printed + "}"), config3.spacingInner + indentation + colors.prop.open + key + colors.prop.close + "=" + colors.value.open + printed + colors.value.close;
  }).join("");
}, NodeTypeTextNode = 3, printChildren = (children, config3, indentation, depth, refs, printer) => children.map((child) => {
  let printedChild = typeof child == "string" ? printText(child, config3) : printer(child, config3, indentation, depth, refs);
  return printedChild === "" && typeof child == "object" && child !== null && child.nodeType !== NodeTypeTextNode ? "" : config3.spacingOuter + indentation + printedChild;
}).join(""), printText = (text, config3) => {
  let contentColor = config3.colors.content;
  return contentColor.open + escapeHTML(text) + contentColor.close;
}, printComment = (comment, config3) => {
  let commentColor = config3.colors.comment;
  return commentColor.open + "<!--" + escapeHTML(comment) + "-->" + commentColor.close;
}, printElement = (type5, printedProps, printedChildren, config3, indentation) => {
  let tagColor = config3.colors.tag;
  return tagColor.open + "<" + type5 + (printedProps && tagColor.close + printedProps + config3.spacingOuter + indentation + tagColor.open) + (printedChildren ? ">" + tagColor.close + printedChildren + config3.spacingOuter + indentation + tagColor.open + "</" + type5 : (printedProps && !config3.min ? "" : " ") + "/") + ">" + tagColor.close;
}, printElementAsLeaf = (type5, config3) => {
  let tagColor = config3.colors.tag;
  return tagColor.open + "<" + type5 + tagColor.close + " \u2026" + tagColor.open + " />" + tagColor.close;
}, ELEMENT_NODE$1 = 1, TEXT_NODE$1 = 3, COMMENT_NODE$1 = 8, FRAGMENT_NODE = 11, ELEMENT_REGEXP = /^((HTML|SVG)\w*)?Element$/, isCustomElement2 = (val) => {
  let {
    tagName
  } = val;
  return !!(typeof tagName == "string" && tagName.includes("-") || typeof val.hasAttribute == "function" && val.hasAttribute("is"));
}, testNode = (val) => {
  let constructorName = val.constructor.name, {
    nodeType
  } = val;
  return nodeType === ELEMENT_NODE$1 && (ELEMENT_REGEXP.test(constructorName) || isCustomElement2(val)) || nodeType === TEXT_NODE$1 && constructorName === "Text" || nodeType === COMMENT_NODE$1 && constructorName === "Comment" || nodeType === FRAGMENT_NODE && constructorName === "DocumentFragment";
};
function nodeIsText(node) {
  return node.nodeType === TEXT_NODE$1;
}
function nodeIsComment(node) {
  return node.nodeType === COMMENT_NODE$1;
}
function nodeIsFragment(node) {
  return node.nodeType === FRAGMENT_NODE;
}
function createDOMElementFilter(filterNode) {
  return {
    test: (val) => {
      var _val$constructor2;
      return ((val == null || (_val$constructor2 = val.constructor) == null ? void 0 : _val$constructor2.name) || isCustomElement2(val)) && testNode(val);
    },
    serialize: (node, config3, indentation, depth, refs, printer) => {
      if (nodeIsText(node))
        return printText(node.data, config3);
      if (nodeIsComment(node))
        return printComment(node.data, config3);
      let type5 = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();
      return ++depth > config3.maxDepth ? printElementAsLeaf(type5, config3) : printElement(type5, printProps(nodeIsFragment(node) ? [] : Array.from(node.attributes).map((attr) => attr.name).sort(), nodeIsFragment(node) ? {} : Array.from(node.attributes).reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}), config3, indentation + config3.indent, depth, refs, printer), printChildren(Array.prototype.slice.call(node.childNodes || node.children).filter(filterNode), config3, indentation + config3.indent, depth, refs, printer), config3, indentation);
    }
  };
}
var picocolors = null, readFileSync = null, codeFrameColumns = null;
try {
  let nodeRequire = module && module.require;
  readFileSync = nodeRequire.call(module, "fs").readFileSync, codeFrameColumns = nodeRequire.call(module, "@babel/code-frame").codeFrameColumns, picocolors = nodeRequire.call(module, "picocolors");
} catch {
}
function getCodeFrame(frame) {
  let locationStart = frame.indexOf("(") + 1, locationEnd = frame.indexOf(")"), frameLocation = frame.slice(locationStart, locationEnd), frameLocationElements = frameLocation.split(":"), [filename, line, column] = [frameLocationElements[0], parseInt(frameLocationElements[1], 10), parseInt(frameLocationElements[2], 10)], rawFileContents = "";
  try {
    rawFileContents = readFileSync(filename, "utf-8");
  } catch {
    return "";
  }
  let codeFrame = codeFrameColumns(rawFileContents, {
    start: {
      line,
      column
    }
  }, {
    highlightCode: !0,
    linesBelow: 0
  });
  return picocolors.dim(frameLocation) + `
` + codeFrame + `
`;
}
function getUserCodeFrame() {
  if (!readFileSync || !codeFrameColumns)
    return "";
  let firstClientCodeFrame = new Error().stack.split(`
`).slice(1).find((frame) => !frame.includes("node_modules/"));
  return getCodeFrame(firstClientCodeFrame);
}
var TEXT_NODE = 3;
function jestFakeTimersAreEnabled() {
  return typeof jest < "u" && jest !== null ? (
    // legacy timers
    setTimeout._isMockFunction === !0 || // modern timers
    // eslint-disable-next-line prefer-object-has-own -- not supported by our support matrix
    Object.prototype.hasOwnProperty.call(setTimeout, "clock")
  ) : !1;
}
function getDocument() {
  if (typeof window > "u")
    throw new Error("Could not find default container");
  return window.document;
}
function getWindowFromNode(node) {
  if (node.defaultView)
    return node.defaultView;
  if (node.ownerDocument && node.ownerDocument.defaultView)
    return node.ownerDocument.defaultView;
  if (node.window)
    return node.window;
  throw node.ownerDocument && node.ownerDocument.defaultView === null ? new Error("It looks like the window object is not available for the provided node.") : node.then instanceof Function ? new Error("It looks like you passed a Promise object instead of a DOM node. Did you do something like `fireEvent.click(screen.findBy...` when you meant to use a `getBy` query `fireEvent.click(screen.getBy...`, or await the findBy query `fireEvent.click(await screen.findBy...`?") : Array.isArray(node) ? new Error("It looks like you passed an Array instead of a DOM node. Did you do something like `fireEvent.click(screen.getAllBy...` when you meant to use a `getBy` query `fireEvent.click(screen.getBy...`?") : typeof node.debug == "function" && typeof node.logTestingPlaygroundURL == "function" ? new Error("It looks like you passed a `screen` object. Did you do something like `fireEvent.click(screen, ...` when you meant to use a query, e.g. `fireEvent.click(screen.getBy..., `?") : new Error("The given node is not an Element, the node type is: " + typeof node + ".");
}
function checkContainerType(container) {
  if (!container || typeof container.querySelector != "function" || typeof container.querySelectorAll != "function")
    throw new TypeError("Expected container to be an Element, a Document or a DocumentFragment but got " + getTypeName(container) + ".");
  function getTypeName(object) {
    return typeof object == "object" ? object === null ? "null" : object.constructor.name : typeof object;
  }
}
var shouldHighlight = () => {
  if (typeof process > "u")
    return !1;
  let colors;
  try {
    var _process$env;
    let colorsJSON = (_process$env = process.env) == null ? void 0 : _process$env.COLORS;
    colorsJSON && (colors = JSON.parse(colorsJSON));
  } catch {
  }
  return typeof colors == "boolean" ? colors : process.versions !== void 0 && process.versions.node !== void 0;
}, {
  DOMCollection
} = prettyFormat.plugins, ELEMENT_NODE = 1, COMMENT_NODE = 8;
function filterCommentsAndDefaultIgnoreTagsTags(value) {
  return value.nodeType !== COMMENT_NODE && (value.nodeType !== ELEMENT_NODE || !value.matches(getConfig().defaultIgnore));
}
function prettyDOM(dom, maxLength, options) {
  if (options === void 0 && (options = {}), dom || (dom = getDocument().body), typeof maxLength != "number" && (maxLength = typeof process < "u" && typeof process.env < "u" && process.env.DEBUG_PRINT_LIMIT || 7e3), maxLength === 0)
    return "";
  dom.documentElement && (dom = dom.documentElement);
  let domTypeName = typeof dom;
  if (domTypeName === "object" ? domTypeName = dom.constructor.name : dom = {}, !("outerHTML" in dom))
    throw new TypeError("Expected an element or document but got " + domTypeName);
  let {
    filterNode = filterCommentsAndDefaultIgnoreTagsTags,
    ...prettyFormatOptions
  } = options, debugContent = prettyFormat.format(dom, {
    plugins: [createDOMElementFilter(filterNode), DOMCollection],
    printFunctionName: !1,
    highlight: shouldHighlight(),
    ...prettyFormatOptions
  });
  return maxLength !== void 0 && dom.outerHTML.length > maxLength ? debugContent.slice(0, maxLength) + "..." : debugContent;
}
var logDOM = function() {
  let userCodeFrame = getUserCodeFrame();
  console.log(userCodeFrame ? prettyDOM(...arguments) + `

` + userCodeFrame : prettyDOM(...arguments));
}, config2 = {
  testIdAttribute: "data-testid",
  asyncUtilTimeout: 1e3,
  // asyncWrapper and advanceTimersWrapper is to support React's async `act` function.
  // forcing react-testing-library to wrap all async functions would've been
  // a total nightmare (consider wrapping every findBy* query and then also
  // updating `within` so those would be wrapped too. Total nightmare).
  // so we have this config option that's really only intended for
  // react-testing-library to use. For that reason, this feature will remain
  // undocumented.
  asyncWrapper: (cb) => cb(),
  unstable_advanceTimersWrapper: (cb) => cb(),
  eventWrapper: (cb) => cb(),
  // default value for the `hidden` option in `ByRole` queries
  defaultHidden: !1,
  // default value for the `ignore` option in `ByText` queries
  defaultIgnore: "script, style",
  // showOriginalStackTrace flag to show the full error stack traces for async errors
  showOriginalStackTrace: !1,
  // throw errors w/ suggestions for better queries. Opt in so off by default.
  throwSuggestions: !1,
  // called when getBy* queries fail. (message, container) => Error
  getElementError(message, container) {
    let prettifiedDOM = prettyDOM(container), error = new Error([message, "Ignored nodes: comments, " + config2.defaultIgnore + `
` + prettifiedDOM].filter(Boolean).join(`

`));
    return error.name = "TestingLibraryElementError", error;
  },
  _disableExpensiveErrorDiagnostics: !1,
  computedStyleSupportsPseudoElements: !1
};
function runWithExpensiveErrorDiagnosticsDisabled(callback) {
  try {
    return config2._disableExpensiveErrorDiagnostics = !0, callback();
  } finally {
    config2._disableExpensiveErrorDiagnostics = !1;
  }
}
function configure(newConfig) {
  typeof newConfig == "function" && (newConfig = newConfig(config2)), config2 = {
    ...config2,
    ...newConfig
  };
}
function getConfig() {
  return config2;
}
var labelledNodeNames = ["button", "meter", "output", "progress", "select", "textarea", "input"];
function getTextContent(node) {
  return labelledNodeNames.includes(node.nodeName.toLowerCase()) ? "" : node.nodeType === TEXT_NODE ? node.textContent : Array.from(node.childNodes).map((childNode) => getTextContent(childNode)).join("");
}
function getLabelContent(element) {
  let textContent;
  return element.tagName.toLowerCase() === "label" ? textContent = getTextContent(element) : textContent = element.value || element.textContent, textContent;
}
function getRealLabels(element) {
  if (element.labels !== void 0) {
    var _labels;
    return (_labels = element.labels) != null ? _labels : [];
  }
  if (!isLabelable(element)) return [];
  let labels = element.ownerDocument.querySelectorAll("label");
  return Array.from(labels).filter((label) => label.control === element);
}
function isLabelable(element) {
  return /BUTTON|METER|OUTPUT|PROGRESS|SELECT|TEXTAREA/.test(element.tagName) || element.tagName === "INPUT" && element.getAttribute("type") !== "hidden";
}
function getLabels3(container, element, _temp) {
  let {
    selector = "*"
  } = _temp === void 0 ? {} : _temp, ariaLabelledBy = element.getAttribute("aria-labelledby"), labelsId = ariaLabelledBy ? ariaLabelledBy.split(" ") : [];
  return labelsId.length ? labelsId.map((labelId) => {
    let labellingElement = container.querySelector('[id="' + labelId + '"]');
    return labellingElement ? {
      content: getLabelContent(labellingElement),
      formControl: null
    } : {
      content: "",
      formControl: null
    };
  }) : Array.from(getRealLabels(element)).map((label) => {
    let textToMatch = getLabelContent(label), labelledFormControl = Array.from(label.querySelectorAll("button, input, meter, output, progress, select, textarea")).filter((formControlElement) => formControlElement.matches(selector))[0];
    return {
      content: textToMatch,
      formControl: labelledFormControl
    };
  });
}
function assertNotNullOrUndefined(matcher) {
  if (matcher == null)
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- implicitly converting `T` to `string`
      "It looks like " + matcher + " was passed instead of a matcher. Did you do something like getByText(" + matcher + ")?"
    );
}
function fuzzyMatches(textToMatch, node, matcher, normalizer) {
  if (typeof textToMatch != "string")
    return !1;
  assertNotNullOrUndefined(matcher);
  let normalizedText = normalizer(textToMatch);
  return typeof matcher == "string" || typeof matcher == "number" ? normalizedText.toLowerCase().includes(matcher.toString().toLowerCase()) : typeof matcher == "function" ? matcher(normalizedText, node) : matchRegExp(matcher, normalizedText);
}
function matches2(textToMatch, node, matcher, normalizer) {
  if (typeof textToMatch != "string")
    return !1;
  assertNotNullOrUndefined(matcher);
  let normalizedText = normalizer(textToMatch);
  return matcher instanceof Function ? matcher(normalizedText, node) : matcher instanceof RegExp ? matchRegExp(matcher, normalizedText) : normalizedText === String(matcher);
}
function getDefaultNormalizer(_temp) {
  let {
    trim = !0,
    collapseWhitespace = !0
  } = _temp === void 0 ? {} : _temp;
  return (text) => {
    let normalizedText = text;
    return normalizedText = trim ? normalizedText.trim() : normalizedText, normalizedText = collapseWhitespace ? normalizedText.replace(/\s+/g, " ") : normalizedText, normalizedText;
  };
}
function makeNormalizer(_ref) {
  let {
    trim,
    collapseWhitespace,
    normalizer
  } = _ref;
  if (!normalizer)
    return getDefaultNormalizer({
      trim,
      collapseWhitespace
    });
  if (typeof trim < "u" || typeof collapseWhitespace < "u")
    throw new Error('trim and collapseWhitespace are not supported with a normalizer. If you want to use the default trim and collapseWhitespace logic in your normalizer, use "getDefaultNormalizer({trim, collapseWhitespace})" and compose that into your normalizer');
  return normalizer;
}
function matchRegExp(matcher, text) {
  let match = matcher.test(text);
  return matcher.global && matcher.lastIndex !== 0 && (console.warn("To match all elements we had to reset the lastIndex of the RegExp because the global flag is enabled. We encourage to remove the global flag from the RegExp."), matcher.lastIndex = 0), match;
}
function getNodeText(node) {
  return node.matches("input[type=submit], input[type=button], input[type=reset]") ? node.value : Array.from(node.childNodes).filter((child) => child.nodeType === TEXT_NODE && !!child.textContent).map((c2) => c2.textContent).join("");
}
var elementRoleList2 = buildElementRoleList2(import_aria_query3.elementRoles);
function isSubtreeInaccessible(element) {
  return element.hidden === !0 || element.getAttribute("aria-hidden") === "true" || element.ownerDocument.defaultView.getComputedStyle(element).display === "none";
}
function isInaccessible(element, options) {
  options === void 0 && (options = {});
  let {
    isSubtreeInaccessible: isSubtreeInaccessibleImpl = isSubtreeInaccessible
  } = options;
  if (element.ownerDocument.defaultView.getComputedStyle(element).visibility === "hidden")
    return !0;
  let currentElement = element;
  for (; currentElement; ) {
    if (isSubtreeInaccessibleImpl(currentElement))
      return !0;
    currentElement = currentElement.parentElement;
  }
  return !1;
}
function getImplicitAriaRoles2(currentNode) {
  for (let {
    match,
    roles: roles3
  } of elementRoleList2)
    if (match(currentNode))
      return [...roles3];
  return [];
}
function buildElementRoleList2(elementRolesMap) {
  function makeElementSelector(_ref) {
    let {
      name,
      attributes
    } = _ref;
    return "" + name + attributes.map((_ref2) => {
      let {
        name: attributeName,
        value,
        constraints = []
      } = _ref2, shouldNotExist = constraints.indexOf("undefined") !== -1, shouldBeNonEmpty = constraints.indexOf("set") !== -1;
      return typeof value < "u" ? "[" + attributeName + '="' + value + '"]' : shouldNotExist ? ":not([" + attributeName + "])" : shouldBeNonEmpty ? "[" + attributeName + "]:not([" + attributeName + '=""])' : "[" + attributeName + "]";
    }).join("");
  }
  function getSelectorSpecificity(_ref3) {
    let {
      attributes = []
    } = _ref3;
    return attributes.length;
  }
  function bySelectorSpecificity(_ref4, _ref5) {
    let {
      specificity: leftSpecificity
    } = _ref4, {
      specificity: rightSpecificity
    } = _ref5;
    return rightSpecificity - leftSpecificity;
  }
  function match(element) {
    let {
      attributes = []
    } = element, typeTextIndex = attributes.findIndex((attribute) => attribute.value && attribute.name === "type" && attribute.value === "text");
    typeTextIndex >= 0 && (attributes = [...attributes.slice(0, typeTextIndex), ...attributes.slice(typeTextIndex + 1)]);
    let selector = makeElementSelector({
      ...element,
      attributes
    });
    return (node) => typeTextIndex >= 0 && node.type !== "text" ? !1 : node.matches(selector);
  }
  let result = [];
  for (let [element, roles3] of elementRolesMap.entries())
    result = [...result, {
      match: match(element),
      roles: Array.from(roles3),
      specificity: getSelectorSpecificity(element)
    }];
  return result.sort(bySelectorSpecificity);
}
function getRoles(container, _temp) {
  let {
    hidden = !1
  } = _temp === void 0 ? {} : _temp;
  function flattenDOM(node) {
    return [node, ...Array.from(node.children).reduce((acc, child) => [...acc, ...flattenDOM(child)], [])];
  }
  return flattenDOM(container).filter((element) => hidden === !1 ? isInaccessible(element) === !1 : !0).reduce((acc, node) => {
    let roles3 = [];
    return node.hasAttribute("role") ? roles3 = node.getAttribute("role").split(" ").slice(0, 1) : roles3 = getImplicitAriaRoles2(node), roles3.reduce((rolesAcc, role) => Array.isArray(rolesAcc[role]) ? {
      ...rolesAcc,
      [role]: [...rolesAcc[role], node]
    } : {
      ...rolesAcc,
      [role]: [node]
    }, acc);
  }, {});
}
function prettyRoles(dom, _ref6) {
  let {
    hidden,
    includeDescription
  } = _ref6, roles3 = getRoles(dom, {
    hidden
  });
  return Object.entries(roles3).filter((_ref7) => {
    let [role] = _ref7;
    return role !== "generic";
  }).map((_ref8) => {
    let [role, elements] = _ref8, delimiterBar = "-".repeat(50), elementsString = elements.map((el) => {
      let nameString = 'Name "' + computeAccessibleName2(el, {
        computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
      }) + `":
`, domString = prettyDOM(el.cloneNode(!1));
      if (includeDescription) {
        let descriptionString = 'Description "' + computeAccessibleDescription2(el, {
          computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
        }) + `":
`;
        return "" + nameString + descriptionString + domString;
      }
      return "" + nameString + domString;
    }).join(`

`);
    return role + `:

` + elementsString + `

` + delimiterBar;
  }).join(`
`);
}
var logRoles = function(dom, _temp2) {
  let {
    hidden = !1
  } = _temp2 === void 0 ? {} : _temp2;
  return console.log(prettyRoles(dom, {
    hidden
  }));
};
function computeAriaSelected(element) {
  return element.tagName === "OPTION" ? element.selected : checkBooleanAttribute(element, "aria-selected");
}
function computeAriaBusy(element) {
  return element.getAttribute("aria-busy") === "true";
}
function computeAriaChecked(element) {
  if (!("indeterminate" in element && element.indeterminate))
    return "checked" in element ? element.checked : checkBooleanAttribute(element, "aria-checked");
}
function computeAriaPressed(element) {
  return checkBooleanAttribute(element, "aria-pressed");
}
function computeAriaCurrent(element) {
  var _ref9, _checkBooleanAttribut;
  return (_ref9 = (_checkBooleanAttribut = checkBooleanAttribute(element, "aria-current")) != null ? _checkBooleanAttribut : element.getAttribute("aria-current")) != null ? _ref9 : !1;
}
function computeAriaExpanded(element) {
  return checkBooleanAttribute(element, "aria-expanded");
}
function checkBooleanAttribute(element, attribute) {
  let attributeValue = element.getAttribute(attribute);
  if (attributeValue === "true")
    return !0;
  if (attributeValue === "false")
    return !1;
}
function computeHeadingLevel(element) {
  let implicitHeadingLevels = {
    H1: 1,
    H2: 2,
    H3: 3,
    H4: 4,
    H5: 5,
    H6: 6
  };
  return element.getAttribute("aria-level") && Number(element.getAttribute("aria-level")) || implicitHeadingLevels[element.tagName];
}
function computeAriaValueNow(element) {
  let valueNow = element.getAttribute("aria-valuenow");
  return valueNow === null ? void 0 : +valueNow;
}
function computeAriaValueMax(element) {
  let valueMax = element.getAttribute("aria-valuemax");
  return valueMax === null ? void 0 : +valueMax;
}
function computeAriaValueMin(element) {
  let valueMin = element.getAttribute("aria-valuemin");
  return valueMin === null ? void 0 : +valueMin;
}
function computeAriaValueText(element) {
  let valueText = element.getAttribute("aria-valuetext");
  return valueText === null ? void 0 : valueText;
}
var normalize2 = getDefaultNormalizer();
function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}
function getRegExpMatcher(string) {
  return new RegExp(escapeRegExp(string.toLowerCase()), "i");
}
function makeSuggestion(queryName, element, content, _ref) {
  let {
    variant,
    name
  } = _ref, warning = "", queryOptions = {}, queryArgs = [["Role", "TestId"].includes(queryName) ? content : getRegExpMatcher(content)];
  name && (queryOptions.name = getRegExpMatcher(name)), queryName === "Role" && isInaccessible(element) && (queryOptions.hidden = !0, warning = `Element is inaccessible. This means that the element and all its children are invisible to screen readers.
    If you are using the aria-hidden prop, make sure this is the right choice for your case.
    `), Object.keys(queryOptions).length > 0 && queryArgs.push(queryOptions);
  let queryMethod = variant + "By" + queryName;
  return {
    queryName,
    queryMethod,
    queryArgs,
    variant,
    warning,
    toString() {
      warning && console.warn(warning);
      let [text, options] = queryArgs;
      return text = typeof text == "string" ? "'" + text + "'" : text, options = options ? ", { " + Object.entries(options).map((_ref2) => {
        let [k2, v2] = _ref2;
        return k2 + ": " + v2;
      }).join(", ") + " }" : "", queryMethod + "(" + text + options + ")";
    }
  };
}
function canSuggest(currentMethod, requestedMethod, data) {
  return data && (!requestedMethod || requestedMethod.toLowerCase() === currentMethod.toLowerCase());
}
function getSuggestedQuery(element, variant, method) {
  var _element$getAttribute, _getImplicitAriaRoles;
  if (variant === void 0 && (variant = "get"), element.matches(getConfig().defaultIgnore))
    return;
  let role = (_element$getAttribute = element.getAttribute("role")) != null ? _element$getAttribute : (_getImplicitAriaRoles = getImplicitAriaRoles2(element)) == null ? void 0 : _getImplicitAriaRoles[0];
  if (role !== "generic" && canSuggest("Role", method, role))
    return makeSuggestion("Role", element, role, {
      variant,
      name: computeAccessibleName2(element, {
        computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
      })
    });
  let labelText = getLabels3(document, element).map((label) => label.content).join(" ");
  if (canSuggest("LabelText", method, labelText))
    return makeSuggestion("LabelText", element, labelText, {
      variant
    });
  let placeholderText = element.getAttribute("placeholder");
  if (canSuggest("PlaceholderText", method, placeholderText))
    return makeSuggestion("PlaceholderText", element, placeholderText, {
      variant
    });
  let textContent = normalize2(getNodeText(element));
  if (canSuggest("Text", method, textContent))
    return makeSuggestion("Text", element, textContent, {
      variant
    });
  if (canSuggest("DisplayValue", method, element.value))
    return makeSuggestion("DisplayValue", element, normalize2(element.value), {
      variant
    });
  let alt = element.getAttribute("alt");
  if (canSuggest("AltText", method, alt))
    return makeSuggestion("AltText", element, alt, {
      variant
    });
  let title = element.getAttribute("title");
  if (canSuggest("Title", method, title))
    return makeSuggestion("Title", element, title, {
      variant
    });
  let testId = element.getAttribute(getConfig().testIdAttribute);
  if (canSuggest("TestId", method, testId))
    return makeSuggestion("TestId", element, testId, {
      variant
    });
}
function copyStackTrace(target, source) {
  target.stack = source.stack.replace(source.message, target.message);
}
function waitFor(callback, _ref) {
  let {
    container = getDocument(),
    timeout = getConfig().asyncUtilTimeout,
    showOriginalStackTrace = getConfig().showOriginalStackTrace,
    stackTraceError,
    interval = 50,
    onTimeout = (error) => (Object.defineProperty(error, "message", {
      value: getConfig().getElementError(error.message, container).message
    }), error),
    mutationObserverOptions = {
      subtree: !0,
      childList: !0,
      attributes: !0,
      characterData: !0
    }
  } = _ref;
  if (typeof callback != "function")
    throw new TypeError("Received `callback` arg must be a function");
  return new Promise(async (resolve, reject) => {
    let lastError, intervalId, observer, finished = !1, promiseStatus = "idle", overallTimeoutTimer = setTimeout(handleTimeout, timeout), usingJestFakeTimers = jestFakeTimersAreEnabled();
    if (usingJestFakeTimers) {
      let {
        unstable_advanceTimersWrapper: advanceTimersWrapper
      } = getConfig();
      for (checkCallback(); !finished; ) {
        if (!jestFakeTimersAreEnabled()) {
          let error = new Error("Changed from using fake timers to real timers while using waitFor. This is not allowed and will result in very strange behavior. Please ensure you're awaiting all async things your test is doing before changing to real timers. For more info, please go to https://github.com/testing-library/dom-testing-library/issues/830");
          showOriginalStackTrace || copyStackTrace(error, stackTraceError), reject(error);
          return;
        }
        if (await advanceTimersWrapper(async () => {
          jest.advanceTimersByTime(interval);
        }), finished)
          break;
        checkCallback();
      }
    } else {
      try {
        checkContainerType(container);
      } catch (e2) {
        reject(e2);
        return;
      }
      intervalId = setInterval(checkRealTimersCallback, interval);
      let {
        MutationObserver
      } = getWindowFromNode(container);
      observer = new MutationObserver(checkRealTimersCallback), observer.observe(container, mutationObserverOptions), checkCallback();
    }
    function onDone(error, result) {
      finished = !0, clearTimeout(overallTimeoutTimer), usingJestFakeTimers || (clearInterval(intervalId), observer.disconnect()), error ? reject(error) : resolve(result);
    }
    function checkRealTimersCallback() {
      if (jestFakeTimersAreEnabled()) {
        let error = new Error("Changed from using real timers to fake timers while using waitFor. This is not allowed and will result in very strange behavior. Please ensure you're awaiting all async things your test is doing before changing to fake timers. For more info, please go to https://github.com/testing-library/dom-testing-library/issues/830");
        return showOriginalStackTrace || copyStackTrace(error, stackTraceError), reject(error);
      } else
        return checkCallback();
    }
    function checkCallback() {
      if (promiseStatus !== "pending")
        try {
          let result = runWithExpensiveErrorDiagnosticsDisabled(callback);
          typeof result?.then == "function" ? (promiseStatus = "pending", result.then((resolvedValue) => {
            promiseStatus = "resolved", onDone(null, resolvedValue);
          }, (rejectedValue) => {
            promiseStatus = "rejected", lastError = rejectedValue;
          })) : onDone(null, result);
        } catch (error) {
          lastError = error;
        }
    }
    function handleTimeout() {
      let error;
      lastError ? (error = lastError, !showOriginalStackTrace && error.name === "TestingLibraryElementError" && copyStackTrace(error, stackTraceError)) : (error = new Error("Timed out in waitFor."), showOriginalStackTrace || copyStackTrace(error, stackTraceError)), onDone(onTimeout(error), null);
    }
  });
}
function waitForWrapper(callback, options) {
  let stackTraceError = new Error("STACK_TRACE_MESSAGE");
  return getConfig().asyncWrapper(() => waitFor(callback, {
    stackTraceError,
    ...options
  }));
}
function getElementError(message, container) {
  return getConfig().getElementError(message, container);
}
function getMultipleElementsFoundError(message, container) {
  return getElementError(message + "\n\n(If this is intentional, then use the `*AllBy*` variant of the query (like `queryAllByText`, `getAllByText`, or `findAllByText`)).", container);
}
function queryAllByAttribute(attribute, container, text, _temp) {
  let {
    exact = !0,
    collapseWhitespace,
    trim,
    normalizer
  } = _temp === void 0 ? {} : _temp, matcher = exact ? matches2 : fuzzyMatches, matchNormalizer = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  });
  return Array.from(container.querySelectorAll("[" + attribute + "]")).filter((node) => matcher(node.getAttribute(attribute), node, text, matchNormalizer));
}
function queryByAttribute(attribute, container, text, options) {
  let els = queryAllByAttribute(attribute, container, text, options);
  if (els.length > 1)
    throw getMultipleElementsFoundError("Found multiple elements by [" + attribute + "=" + text + "]", container);
  return els[0] || null;
}
function makeSingleQuery(allQuery, getMultipleError2) {
  return function(container) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++)
      args[_key - 1] = arguments[_key];
    let els = allQuery(container, ...args);
    if (els.length > 1) {
      let elementStrings = els.map((element) => getElementError(null, element).message).join(`

`);
      throw getMultipleElementsFoundError(getMultipleError2(container, ...args) + `

Here are the matching elements:

` + elementStrings, container);
    }
    return els[0] || null;
  };
}
function getSuggestionError(suggestion, container) {
  return getConfig().getElementError(`A better query is available, try this:
` + suggestion.toString() + `
`, container);
}
function makeGetAllQuery(allQuery, getMissingError2) {
  return function(container) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++)
      args[_key2 - 1] = arguments[_key2];
    let els = allQuery(container, ...args);
    if (!els.length)
      throw getConfig().getElementError(getMissingError2(container, ...args), container);
    return els;
  };
}
function makeFindQuery(getter) {
  return (container, text, options, waitForOptions) => waitForWrapper(() => getter(container, text, options), {
    container,
    ...waitForOptions
  });
}
var wrapSingleQueryWithSuggestion = (query, queryAllByName, variant) => function(container) {
  for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++)
    args[_key3 - 1] = arguments[_key3];
  let element = query(container, ...args), [{
    suggest = getConfig().throwSuggestions
  } = {}] = args.slice(-1);
  if (element && suggest) {
    let suggestion = getSuggestedQuery(element, variant);
    if (suggestion && !queryAllByName.endsWith(suggestion.queryName))
      throw getSuggestionError(suggestion.toString(), container);
  }
  return element;
}, wrapAllByQueryWithSuggestion = (query, queryAllByName, variant) => function(container) {
  for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++)
    args[_key4 - 1] = arguments[_key4];
  let els = query(container, ...args), [{
    suggest = getConfig().throwSuggestions
  } = {}] = args.slice(-1);
  if (els.length && suggest) {
    let uniqueSuggestionMessages = [...new Set(els.map((element) => {
      var _getSuggestedQuery;
      return (_getSuggestedQuery = getSuggestedQuery(element, variant)) == null ? void 0 : _getSuggestedQuery.toString();
    }))];
    if (
      // only want to suggest if all the els have the same suggestion.
      uniqueSuggestionMessages.length === 1 && !queryAllByName.endsWith(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: Can this be null at runtime?
        getSuggestedQuery(els[0], variant).queryName
      )
    )
      throw getSuggestionError(uniqueSuggestionMessages[0], container);
  }
  return els;
};
function buildQueries(queryAllBy, getMultipleError2, getMissingError2) {
  let queryBy = wrapSingleQueryWithSuggestion(makeSingleQuery(queryAllBy, getMultipleError2), queryAllBy.name, "query"), getAllBy = makeGetAllQuery(queryAllBy, getMissingError2), getBy = makeSingleQuery(getAllBy, getMultipleError2), getByWithSuggestions = wrapSingleQueryWithSuggestion(getBy, queryAllBy.name, "get"), getAllWithSuggestions = wrapAllByQueryWithSuggestion(getAllBy, queryAllBy.name.replace("query", "get"), "getAll"), findAllBy = makeFindQuery(wrapAllByQueryWithSuggestion(getAllBy, queryAllBy.name, "findAll")), findBy = makeFindQuery(wrapSingleQueryWithSuggestion(getBy, queryAllBy.name, "find"));
  return [queryBy, getAllWithSuggestions, getByWithSuggestions, findAllBy, findBy];
}
var queryHelpers = Object.freeze({
  __proto__: null,
  getElementError,
  wrapAllByQueryWithSuggestion,
  wrapSingleQueryWithSuggestion,
  getMultipleElementsFoundError,
  queryAllByAttribute,
  queryByAttribute,
  makeSingleQuery,
  makeGetAllQuery,
  makeFindQuery,
  buildQueries
});
function queryAllLabels(container) {
  return Array.from(container.querySelectorAll("label,input")).map((node) => ({
    node,
    textToMatch: getLabelContent(node)
  })).filter((_ref) => {
    let {
      textToMatch
    } = _ref;
    return textToMatch !== null;
  });
}
var queryAllLabelsByText = function(container, text, _temp) {
  let {
    exact = !0,
    trim,
    collapseWhitespace,
    normalizer
  } = _temp === void 0 ? {} : _temp, matcher = exact ? matches2 : fuzzyMatches, matchNormalizer = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  });
  return queryAllLabels(container).filter((_ref2) => {
    let {
      node,
      textToMatch
    } = _ref2;
    return matcher(textToMatch, node, text, matchNormalizer);
  }).map((_ref3) => {
    let {
      node
    } = _ref3;
    return node;
  });
}, queryAllByLabelText = function(container, text, _temp2) {
  let {
    selector = "*",
    exact = !0,
    collapseWhitespace,
    trim,
    normalizer
  } = _temp2 === void 0 ? {} : _temp2;
  checkContainerType(container);
  let matcher = exact ? matches2 : fuzzyMatches, matchNormalizer = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  }), matchingLabelledElements = Array.from(container.querySelectorAll("*")).filter((element) => getRealLabels(element).length || element.hasAttribute("aria-labelledby")).reduce((labelledElements, labelledElement) => {
    let labelList = getLabels3(container, labelledElement, {
      selector
    });
    labelList.filter((label) => !!label.formControl).forEach((label) => {
      matcher(label.content, label.formControl, text, matchNormalizer) && label.formControl && labelledElements.push(label.formControl);
    });
    let labelsValue = labelList.filter((label) => !!label.content).map((label) => label.content);
    return matcher(labelsValue.join(" "), labelledElement, text, matchNormalizer) && labelledElements.push(labelledElement), labelsValue.length > 1 && labelsValue.forEach((labelValue, index) => {
      matcher(labelValue, labelledElement, text, matchNormalizer) && labelledElements.push(labelledElement);
      let labelsFiltered = [...labelsValue];
      labelsFiltered.splice(index, 1), labelsFiltered.length > 1 && matcher(labelsFiltered.join(" "), labelledElement, text, matchNormalizer) && labelledElements.push(labelledElement);
    }), labelledElements;
  }, []).concat(queryAllByAttribute("aria-label", container, text, {
    exact,
    normalizer: matchNormalizer
  }));
  return Array.from(new Set(matchingLabelledElements)).filter((element) => element.matches(selector));
}, getAllByLabelText = function(container, text) {
  for (var _len = arguments.length, rest = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++)
    rest[_key - 2] = arguments[_key];
  let els = queryAllByLabelText(container, text, ...rest);
  if (!els.length) {
    let labels = queryAllLabelsByText(container, text, ...rest);
    if (labels.length) {
      let tagNames = labels.map((label) => getTagNameOfElementAssociatedWithLabelViaFor(container, label)).filter((tagName) => !!tagName);
      throw tagNames.length ? getConfig().getElementError(tagNames.map((tagName) => "Found a label with the text of: " + text + ", however the element associated with this label (<" + tagName + " />) is non-labellable [https://html.spec.whatwg.org/multipage/forms.html#category-label]. If you really need to label a <" + tagName + " />, you can use aria-label or aria-labelledby instead.").join(`

`), container) : getConfig().getElementError("Found a label with the text of: " + text + `, however no form control was found associated to that label. Make sure you're using the "for" attribute or "aria-labelledby" attribute correctly.`, container);
    } else
      throw getConfig().getElementError("Unable to find a label with the text of: " + text, container);
  }
  return els;
};
function getTagNameOfElementAssociatedWithLabelViaFor(container, label) {
  let htmlFor = label.getAttribute("for");
  if (!htmlFor)
    return null;
  let element = container.querySelector('[id="' + htmlFor + '"]');
  return element ? element.tagName.toLowerCase() : null;
}
var getMultipleError$7 = (c2, text) => "Found multiple elements with the text of: " + text, queryByLabelText = wrapSingleQueryWithSuggestion(makeSingleQuery(queryAllByLabelText, getMultipleError$7), queryAllByLabelText.name, "query"), getByLabelText = makeSingleQuery(getAllByLabelText, getMultipleError$7), findAllByLabelText = makeFindQuery(wrapAllByQueryWithSuggestion(getAllByLabelText, getAllByLabelText.name, "findAll")), findByLabelText = makeFindQuery(wrapSingleQueryWithSuggestion(getByLabelText, getAllByLabelText.name, "find")), getAllByLabelTextWithSuggestions = wrapAllByQueryWithSuggestion(getAllByLabelText, getAllByLabelText.name, "getAll"), getByLabelTextWithSuggestions = wrapSingleQueryWithSuggestion(getByLabelText, getAllByLabelText.name, "get"), queryAllByLabelTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByLabelText, queryAllByLabelText.name, "queryAll"), queryAllByPlaceholderText = function() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++)
    args[_key] = arguments[_key];
  return checkContainerType(args[0]), queryAllByAttribute("placeholder", ...args);
}, getMultipleError$6 = (c2, text) => "Found multiple elements with the placeholder text of: " + text, getMissingError$6 = (c2, text) => "Unable to find an element with the placeholder text of: " + text, queryAllByPlaceholderTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByPlaceholderText, queryAllByPlaceholderText.name, "queryAll"), [queryByPlaceholderText, getAllByPlaceholderText, getByPlaceholderText, findAllByPlaceholderText, findByPlaceholderText] = buildQueries(queryAllByPlaceholderText, getMultipleError$6, getMissingError$6), queryAllByText = function(container, text, _temp) {
  let {
    selector = "*",
    exact = !0,
    collapseWhitespace,
    trim,
    ignore = getConfig().defaultIgnore,
    normalizer
  } = _temp === void 0 ? {} : _temp;
  checkContainerType(container);
  let matcher = exact ? matches2 : fuzzyMatches, matchNormalizer = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  }), baseArray = [];
  return typeof container.matches == "function" && container.matches(selector) && (baseArray = [container]), [...baseArray, ...Array.from(container.querySelectorAll(selector))].filter((node) => !ignore || !node.matches(ignore)).filter((node) => matcher(getNodeText(node), node, text, matchNormalizer));
}, getMultipleError$5 = (c2, text) => "Found multiple elements with the text: " + text, getMissingError$5 = function(c2, text, options) {
  options === void 0 && (options = {});
  let {
    collapseWhitespace,
    trim,
    normalizer,
    selector
  } = options, normalizedText = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  })(text.toString()), isNormalizedDifferent = normalizedText !== text.toString(), isCustomSelector = (selector ?? "*") !== "*";
  return "Unable to find an element with the text: " + (isNormalizedDifferent ? normalizedText + " (normalized from '" + text + "')" : text) + (isCustomSelector ? ", which matches selector '" + selector + "'" : "") + ". This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.";
}, queryAllByTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByText, queryAllByText.name, "queryAll"), [queryByText, getAllByText, getByText, findAllByText, findByText] = buildQueries(queryAllByText, getMultipleError$5, getMissingError$5), queryAllByDisplayValue = function(container, value, _temp) {
  let {
    exact = !0,
    collapseWhitespace,
    trim,
    normalizer
  } = _temp === void 0 ? {} : _temp;
  checkContainerType(container);
  let matcher = exact ? matches2 : fuzzyMatches, matchNormalizer = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  });
  return Array.from(container.querySelectorAll("input,textarea,select")).filter((node) => node.tagName === "SELECT" ? Array.from(node.options).filter((option) => option.selected).some((optionNode) => matcher(getNodeText(optionNode), optionNode, value, matchNormalizer)) : matcher(node.value, node, value, matchNormalizer));
}, getMultipleError$4 = (c2, value) => "Found multiple elements with the display value: " + value + ".", getMissingError$4 = (c2, value) => "Unable to find an element with the display value: " + value + ".", queryAllByDisplayValueWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByDisplayValue, queryAllByDisplayValue.name, "queryAll"), [queryByDisplayValue, getAllByDisplayValue, getByDisplayValue, findAllByDisplayValue, findByDisplayValue] = buildQueries(queryAllByDisplayValue, getMultipleError$4, getMissingError$4), VALID_TAG_REGEXP = /^(img|input|area|.+-.+)$/i, queryAllByAltText = function(container, alt, options) {
  return options === void 0 && (options = {}), checkContainerType(container), queryAllByAttribute("alt", container, alt, options).filter((node) => VALID_TAG_REGEXP.test(node.tagName));
}, getMultipleError$3 = (c2, alt) => "Found multiple elements with the alt text: " + alt, getMissingError$3 = (c2, alt) => "Unable to find an element with the alt text: " + alt, queryAllByAltTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByAltText, queryAllByAltText.name, "queryAll"), [queryByAltText, getAllByAltText, getByAltText, findAllByAltText, findByAltText] = buildQueries(queryAllByAltText, getMultipleError$3, getMissingError$3), isSvgTitle = (node) => {
  var _node$parentElement;
  return node.tagName.toLowerCase() === "title" && ((_node$parentElement = node.parentElement) == null ? void 0 : _node$parentElement.tagName.toLowerCase()) === "svg";
}, queryAllByTitle = function(container, text, _temp) {
  let {
    exact = !0,
    collapseWhitespace,
    trim,
    normalizer
  } = _temp === void 0 ? {} : _temp;
  checkContainerType(container);
  let matcher = exact ? matches2 : fuzzyMatches, matchNormalizer = makeNormalizer({
    collapseWhitespace,
    trim,
    normalizer
  });
  return Array.from(container.querySelectorAll("[title], svg > title")).filter((node) => matcher(node.getAttribute("title"), node, text, matchNormalizer) || isSvgTitle(node) && matcher(getNodeText(node), node, text, matchNormalizer));
}, getMultipleError$2 = (c2, title) => "Found multiple elements with the title: " + title + ".", getMissingError$2 = (c2, title) => "Unable to find an element with the title: " + title + ".", queryAllByTitleWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByTitle, queryAllByTitle.name, "queryAll"), [queryByTitle, getAllByTitle, getByTitle, findAllByTitle, findByTitle] = buildQueries(queryAllByTitle, getMultipleError$2, getMissingError$2), queryAllByRole = function(container, role, _temp) {
  let {
    hidden = getConfig().defaultHidden,
    name,
    description,
    queryFallbacks = !1,
    selected,
    busy,
    checked,
    pressed,
    current,
    level,
    expanded,
    value: {
      now: valueNow,
      min: valueMin,
      max: valueMax,
      text: valueText
    } = {}
  } = _temp === void 0 ? {} : _temp;
  if (checkContainerType(container), selected !== void 0) {
    var _allRoles$get;
    if (((_allRoles$get = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get.props["aria-selected"]) === void 0)
      throw new Error('"aria-selected" is not supported on role "' + role + '".');
  }
  if (busy !== void 0) {
    var _allRoles$get2;
    if (((_allRoles$get2 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get2.props["aria-busy"]) === void 0)
      throw new Error('"aria-busy" is not supported on role "' + role + '".');
  }
  if (checked !== void 0) {
    var _allRoles$get3;
    if (((_allRoles$get3 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get3.props["aria-checked"]) === void 0)
      throw new Error('"aria-checked" is not supported on role "' + role + '".');
  }
  if (pressed !== void 0) {
    var _allRoles$get4;
    if (((_allRoles$get4 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get4.props["aria-pressed"]) === void 0)
      throw new Error('"aria-pressed" is not supported on role "' + role + '".');
  }
  if (current !== void 0) {
    var _allRoles$get5;
    if (((_allRoles$get5 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get5.props["aria-current"]) === void 0)
      throw new Error('"aria-current" is not supported on role "' + role + '".');
  }
  if (level !== void 0 && role !== "heading")
    throw new Error('Role "' + role + '" cannot have "level" property.');
  if (valueNow !== void 0) {
    var _allRoles$get6;
    if (((_allRoles$get6 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get6.props["aria-valuenow"]) === void 0)
      throw new Error('"aria-valuenow" is not supported on role "' + role + '".');
  }
  if (valueMax !== void 0) {
    var _allRoles$get7;
    if (((_allRoles$get7 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get7.props["aria-valuemax"]) === void 0)
      throw new Error('"aria-valuemax" is not supported on role "' + role + '".');
  }
  if (valueMin !== void 0) {
    var _allRoles$get8;
    if (((_allRoles$get8 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get8.props["aria-valuemin"]) === void 0)
      throw new Error('"aria-valuemin" is not supported on role "' + role + '".');
  }
  if (valueText !== void 0) {
    var _allRoles$get9;
    if (((_allRoles$get9 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get9.props["aria-valuetext"]) === void 0)
      throw new Error('"aria-valuetext" is not supported on role "' + role + '".');
  }
  if (expanded !== void 0) {
    var _allRoles$get0;
    if (((_allRoles$get0 = import_aria_query3.roles.get(role)) == null ? void 0 : _allRoles$get0.props["aria-expanded"]) === void 0)
      throw new Error('"aria-expanded" is not supported on role "' + role + '".');
  }
  let subtreeIsInaccessibleCache = /* @__PURE__ */ new WeakMap();
  function cachedIsSubtreeInaccessible(element) {
    return subtreeIsInaccessibleCache.has(element) || subtreeIsInaccessibleCache.set(element, isSubtreeInaccessible(element)), subtreeIsInaccessibleCache.get(element);
  }
  return Array.from(container.querySelectorAll(
    // Only query elements that can be matched by the following filters
    makeRoleSelector(role)
  )).filter((node) => {
    if (node.hasAttribute("role")) {
      let roleValue = node.getAttribute("role");
      if (queryFallbacks)
        return roleValue.split(" ").filter(Boolean).some((roleAttributeToken) => roleAttributeToken === role);
      let [firstRoleAttributeToken] = roleValue.split(" ");
      return firstRoleAttributeToken === role;
    }
    return getImplicitAriaRoles2(node).some((implicitRole) => implicitRole === role);
  }).filter((element) => {
    if (selected !== void 0)
      return selected === computeAriaSelected(element);
    if (busy !== void 0)
      return busy === computeAriaBusy(element);
    if (checked !== void 0)
      return checked === computeAriaChecked(element);
    if (pressed !== void 0)
      return pressed === computeAriaPressed(element);
    if (current !== void 0)
      return current === computeAriaCurrent(element);
    if (expanded !== void 0)
      return expanded === computeAriaExpanded(element);
    if (level !== void 0)
      return level === computeHeadingLevel(element);
    if (valueNow !== void 0 || valueMax !== void 0 || valueMin !== void 0 || valueText !== void 0) {
      let valueMatches = !0;
      if (valueNow !== void 0 && valueMatches && (valueMatches = valueNow === computeAriaValueNow(element)), valueMax !== void 0 && valueMatches && (valueMatches = valueMax === computeAriaValueMax(element)), valueMin !== void 0 && valueMatches && (valueMatches = valueMin === computeAriaValueMin(element)), valueText !== void 0) {
        var _computeAriaValueText;
        valueMatches && (valueMatches = matches2((_computeAriaValueText = computeAriaValueText(element)) != null ? _computeAriaValueText : null, element, valueText, (text) => text));
      }
      return valueMatches;
    }
    return !0;
  }).filter((element) => name === void 0 ? !0 : matches2(computeAccessibleName2(element, {
    computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
  }), element, name, (text) => text)).filter((element) => description === void 0 ? !0 : matches2(computeAccessibleDescription2(element, {
    computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
  }), element, description, (text) => text)).filter((element) => hidden === !1 ? isInaccessible(element, {
    isSubtreeInaccessible: cachedIsSubtreeInaccessible
  }) === !1 : !0);
};
function makeRoleSelector(role) {
  var _roleElements$get;
  let explicitRoleSelector = '*[role~="' + role + '"]', roleRelations = (_roleElements$get = import_aria_query3.roleElements.get(role)) != null ? _roleElements$get : /* @__PURE__ */ new Set(), implicitRoleSelectors = new Set(Array.from(roleRelations).map((_ref) => {
    let {
      name
    } = _ref;
    return name;
  }));
  return [explicitRoleSelector].concat(Array.from(implicitRoleSelectors)).join(",");
}
var getNameHint = (name) => {
  let nameHint = "";
  return name === void 0 ? nameHint = "" : typeof name == "string" ? nameHint = ' and name "' + name + '"' : nameHint = " and name `" + name + "`", nameHint;
}, getMultipleError$1 = function(c2, role, _temp2) {
  let {
    name
  } = _temp2 === void 0 ? {} : _temp2;
  return 'Found multiple elements with the role "' + role + '"' + getNameHint(name);
}, getMissingError$1 = function(container, role, _temp3) {
  let {
    hidden = getConfig().defaultHidden,
    name,
    description
  } = _temp3 === void 0 ? {} : _temp3;
  if (getConfig()._disableExpensiveErrorDiagnostics)
    return 'Unable to find role="' + role + '"' + getNameHint(name);
  let roles3 = "";
  Array.from(container.children).forEach((childElement) => {
    roles3 += prettyRoles(childElement, {
      hidden,
      includeDescription: description !== void 0
    });
  });
  let roleMessage;
  roles3.length === 0 ? hidden === !1 ? roleMessage = "There are no accessible roles. But there might be some inaccessible roles. If you wish to access them, then set the `hidden` option to `true`. Learn more about this here: https://testing-library.com/docs/dom-testing-library/api-queries#byrole" : roleMessage = "There are no available roles." : roleMessage = (`
Here are the ` + (hidden === !1 ? "accessible" : "available") + ` roles:

  ` + roles3.replace(/\n/g, `
  `).replace(/\n\s\s\n/g, `

`) + `
`).trim();
  let nameHint = "";
  name === void 0 ? nameHint = "" : typeof name == "string" ? nameHint = ' and name "' + name + '"' : nameHint = " and name `" + name + "`";
  let descriptionHint = "";
  return description === void 0 ? descriptionHint = "" : typeof description == "string" ? descriptionHint = ' and description "' + description + '"' : descriptionHint = " and description `" + description + "`", (`
Unable to find an ` + (hidden === !1 ? "accessible " : "") + 'element with the role "' + role + '"' + nameHint + descriptionHint + `

` + roleMessage).trim();
}, queryAllByRoleWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByRole, queryAllByRole.name, "queryAll"), [queryByRole, getAllByRole, getByRole, findAllByRole, findByRole] = buildQueries(queryAllByRole, getMultipleError$1, getMissingError$1), getTestIdAttribute = () => getConfig().testIdAttribute, queryAllByTestId = function() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++)
    args[_key] = arguments[_key];
  return checkContainerType(args[0]), queryAllByAttribute(getTestIdAttribute(), ...args);
}, getMultipleError = (c2, id) => "Found multiple elements by: [" + getTestIdAttribute() + '="' + id + '"]', getMissingError = (c2, id) => "Unable to find an element by: [" + getTestIdAttribute() + '="' + id + '"]', queryAllByTestIdWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByTestId, queryAllByTestId.name, "queryAll"), [queryByTestId, getAllByTestId, getByTestId, findAllByTestId, findByTestId] = buildQueries(queryAllByTestId, getMultipleError, getMissingError), queries = Object.freeze({
  __proto__: null,
  queryAllByLabelText: queryAllByLabelTextWithSuggestions,
  queryByLabelText,
  getAllByLabelText: getAllByLabelTextWithSuggestions,
  getByLabelText: getByLabelTextWithSuggestions,
  findAllByLabelText,
  findByLabelText,
  queryByPlaceholderText,
  queryAllByPlaceholderText: queryAllByPlaceholderTextWithSuggestions,
  getByPlaceholderText,
  getAllByPlaceholderText,
  findAllByPlaceholderText,
  findByPlaceholderText,
  queryByText,
  queryAllByText: queryAllByTextWithSuggestions,
  getByText,
  getAllByText,
  findAllByText,
  findByText,
  queryByDisplayValue,
  queryAllByDisplayValue: queryAllByDisplayValueWithSuggestions,
  getByDisplayValue,
  getAllByDisplayValue,
  findAllByDisplayValue,
  findByDisplayValue,
  queryByAltText,
  queryAllByAltText: queryAllByAltTextWithSuggestions,
  getByAltText,
  getAllByAltText,
  findAllByAltText,
  findByAltText,
  queryByTitle,
  queryAllByTitle: queryAllByTitleWithSuggestions,
  getByTitle,
  getAllByTitle,
  findAllByTitle,
  findByTitle,
  queryByRole,
  queryAllByRole: queryAllByRoleWithSuggestions,
  getAllByRole,
  getByRole,
  findAllByRole,
  findByRole,
  queryByTestId,
  queryAllByTestId: queryAllByTestIdWithSuggestions,
  getByTestId,
  getAllByTestId,
  findAllByTestId,
  findByTestId
});
function getQueriesForElement(element, queries$1, initialValue2) {
  return queries$1 === void 0 && (queries$1 = queries), initialValue2 === void 0 && (initialValue2 = {}), Object.keys(queries$1).reduce((helpers, key) => {
    let fn3 = queries$1[key];
    return helpers[key] = fn3.bind(null, element), helpers;
  }, initialValue2);
}
var isRemoved = (result) => !result || Array.isArray(result) && !result.length;
function initialCheck(elements) {
  if (isRemoved(elements))
    throw new Error("The element(s) given to waitForElementToBeRemoved are already removed. waitForElementToBeRemoved requires that the element(s) exist(s) before waiting for removal.");
}
async function waitForElementToBeRemoved(callback, options) {
  let timeoutError = new Error("Timed out in waitForElementToBeRemoved.");
  if (typeof callback != "function") {
    initialCheck(callback);
    let getRemainingElements = (Array.isArray(callback) ? callback : [callback]).map((element) => {
      let parent = element.parentElement;
      if (parent === null) return () => null;
      for (; parent.parentElement; ) parent = parent.parentElement;
      return () => parent.contains(element) ? element : null;
    });
    callback = () => getRemainingElements.map((c2) => c2()).filter(Boolean);
  }
  return initialCheck(callback()), waitForWrapper(() => {
    let result;
    try {
      result = callback();
    } catch (error) {
      if (error.name === "TestingLibraryElementError")
        return;
      throw error;
    }
    if (!isRemoved(result))
      throw timeoutError;
  }, options);
}
var eventMap = {
  // Clipboard Events
  copy: {
    EventType: "ClipboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  cut: {
    EventType: "ClipboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  paste: {
    EventType: "ClipboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  // Composition Events
  compositionEnd: {
    EventType: "CompositionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  compositionStart: {
    EventType: "CompositionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  compositionUpdate: {
    EventType: "CompositionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  // Keyboard Events
  keyDown: {
    EventType: "KeyboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      charCode: 0,
      composed: !0
    }
  },
  keyPress: {
    EventType: "KeyboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      charCode: 0,
      composed: !0
    }
  },
  keyUp: {
    EventType: "KeyboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      charCode: 0,
      composed: !0
    }
  },
  // Focus Events
  focus: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  blur: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  focusIn: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  focusOut: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  // Form Events
  change: {
    EventType: "Event",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  input: {
    EventType: "InputEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  invalid: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !0
    }
  },
  submit: {
    EventType: "Event",
    defaultInit: {
      bubbles: !0,
      cancelable: !0
    }
  },
  reset: {
    EventType: "Event",
    defaultInit: {
      bubbles: !0,
      cancelable: !0
    }
  },
  // Mouse Events
  click: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      button: 0,
      composed: !0
    }
  },
  contextMenu: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  dblClick: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  drag: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  dragEnd: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  dragEnter: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  dragExit: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  dragLeave: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  dragOver: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  dragStart: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  drop: {
    EventType: "DragEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseDown: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseEnter: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  mouseLeave: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  mouseMove: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseOut: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseOver: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseUp: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  // Selection Events
  select: {
    EventType: "Event",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  // Touch Events
  touchCancel: {
    EventType: "TouchEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  touchEnd: {
    EventType: "TouchEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  touchMove: {
    EventType: "TouchEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  touchStart: {
    EventType: "TouchEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  // UI Events
  resize: {
    EventType: "UIEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  scroll: {
    EventType: "UIEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  // Wheel Events
  wheel: {
    EventType: "WheelEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  // Media Events
  abort: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  canPlay: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  canPlayThrough: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  durationChange: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  emptied: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  encrypted: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  ended: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  loadedData: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  loadedMetadata: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  loadStart: {
    EventType: "ProgressEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  pause: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  play: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  playing: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  progress: {
    EventType: "ProgressEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  rateChange: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  seeked: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  seeking: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  stalled: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  suspend: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  timeUpdate: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  volumeChange: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  waiting: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  // Events
  load: {
    // TODO: load events can be UIEvent or Event depending on what generated them
    // This is where this abstraction breaks down.
    // But the common targets are <img />, <script /> and window.
    // Neither of these targets receive a UIEvent
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  error: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  // Animation Events
  animationStart: {
    EventType: "AnimationEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  animationEnd: {
    EventType: "AnimationEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  animationIteration: {
    EventType: "AnimationEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  // Transition Events
  transitionCancel: {
    EventType: "TransitionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  transitionEnd: {
    EventType: "TransitionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0
    }
  },
  transitionRun: {
    EventType: "TransitionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  transitionStart: {
    EventType: "TransitionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  // pointer events
  pointerOver: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerEnter: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  pointerDown: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerMove: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerUp: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerCancel: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  pointerOut: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerLeave: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  gotPointerCapture: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  lostPointerCapture: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  // history events
  popState: {
    EventType: "PopStateEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  // window events
  offline: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  online: {
    EventType: "Event",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  pageHide: {
    EventType: "PageTransitionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0
    }
  },
  pageShow: {
    EventType: "PageTransitionEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0
    }
  }
}, eventAliasMap = {
  doubleClick: "dblClick"
};
function fireEvent(element, event) {
  return getConfig().eventWrapper(() => {
    if (!event)
      throw new Error("Unable to fire an event - please provide an event object.");
    if (!element)
      throw new Error('Unable to fire a "' + event.type + '" event - please provide a DOM element.');
    return element.dispatchEvent(event);
  });
}
function createEvent(eventName, node, init, _temp) {
  let {
    EventType = "Event",
    defaultInit = {}
  } = _temp === void 0 ? {} : _temp;
  if (!node)
    throw new Error('Unable to fire a "' + eventName + '" event - please provide a DOM element.');
  let eventInit = {
    ...defaultInit,
    ...init
  }, {
    target: {
      value,
      files,
      ...targetProperties
    } = {}
  } = eventInit;
  value !== void 0 && setNativeValue(node, value), files !== void 0 && Object.defineProperty(node, "files", {
    configurable: !0,
    enumerable: !0,
    writable: !0,
    value: files
  }), Object.assign(node, targetProperties);
  let window2 = getWindowFromNode(node), EventConstructor = window2[EventType] || window2.Event, event;
  if (typeof EventConstructor == "function")
    event = new EventConstructor(eventName, eventInit);
  else {
    event = window2.document.createEvent(EventType);
    let {
      bubbles,
      cancelable,
      detail,
      ...otherInit
    } = eventInit;
    event.initEvent(eventName, bubbles, cancelable, detail), Object.keys(otherInit).forEach((eventKey) => {
      event[eventKey] = otherInit[eventKey];
    });
  }
  return ["dataTransfer", "clipboardData"].forEach((dataTransferKey) => {
    let dataTransferValue = eventInit[dataTransferKey];
    typeof dataTransferValue == "object" && (typeof window2.DataTransfer == "function" ? Object.defineProperty(event, dataTransferKey, {
      value: Object.getOwnPropertyNames(dataTransferValue).reduce((acc, propName) => (Object.defineProperty(acc, propName, {
        value: dataTransferValue[propName]
      }), acc), new window2.DataTransfer())
    }) : Object.defineProperty(event, dataTransferKey, {
      value: dataTransferValue
    }));
  }), event;
}
Object.keys(eventMap).forEach((key) => {
  let {
    EventType,
    defaultInit
  } = eventMap[key], eventName = key.toLowerCase();
  createEvent[key] = (node, init) => createEvent(eventName, node, init, {
    EventType,
    defaultInit
  }), fireEvent[key] = (node, init) => fireEvent(node, createEvent[key](node, init));
});
function setNativeValue(element, value) {
  let {
    set: valueSetter
  } = Object.getOwnPropertyDescriptor(element, "value") || {}, prototype = Object.getPrototypeOf(element), {
    set: prototypeValueSetter
  } = Object.getOwnPropertyDescriptor(prototype, "value") || {};
  if (prototypeValueSetter && valueSetter !== prototypeValueSetter)
    prototypeValueSetter.call(element, value);
  else if (valueSetter)
    valueSetter.call(element, value);
  else
    throw new Error("The given element does not have a value setter");
}
Object.keys(eventAliasMap).forEach((aliasKey) => {
  let key = eventAliasMap[aliasKey];
  fireEvent[aliasKey] = function() {
    return fireEvent[key](...arguments);
  };
});
function unindent(string) {
  return string.replace(/[ \t]*[\n][ \t]*/g, `
`);
}
function encode(value) {
  return import_lz_string.default.compressToEncodedURIComponent(unindent(value));
}
function getPlaygroundUrl(markup) {
  return "https://testing-playground.com/#markup=" + encode(markup);
}
var debug = (element, maxLength, options) => Array.isArray(element) ? element.forEach((el) => logDOM(el, maxLength, options)) : logDOM(element, maxLength, options), logTestingPlaygroundURL = function(element) {
  if (element === void 0 && (element = getDocument().body), !element || !("innerHTML" in element)) {
    console.log("The element you're providing isn't a valid DOM element.");
    return;
  }
  if (!element.innerHTML) {
    console.log("The provided element doesn't have any children.");
    return;
  }
  let playgroundUrl = getPlaygroundUrl(element.innerHTML);
  return console.log(`Open this URL in your browser

` + playgroundUrl), playgroundUrl;
}, initialValue = {
  debug,
  logTestingPlaygroundURL
}, screen = typeof document < "u" && document.body ? getQueriesForElement(document.body, queries, initialValue) : Object.keys(queries).reduce((helpers, key) => (helpers[key] = () => {
  throw new TypeError("For queries bound to document.body a global document has to be available... Learn more: https://testing-library.com/s/screen-global-error");
}, helpers), initialValue);

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/isElementType.js
function isElementType(element, tag, props) {
  return element.namespaceURI && element.namespaceURI !== "http://www.w3.org/1999/xhtml" || (tag = Array.isArray(tag) ? tag : [
    tag
  ], !tag.includes(element.tagName.toLowerCase())) ? !1 : props ? Object.entries(props).every(([k2, v2]) => element[k2] === v2) : !0;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/getWindow.js
function getWindow(node) {
  var _node_ownerDocument;
  if (isDocument(node) && node.defaultView)
    return node.defaultView;
  if (!((_node_ownerDocument = node.ownerDocument) === null || _node_ownerDocument === void 0) && _node_ownerDocument.defaultView)
    return node.ownerDocument.defaultView;
  throw new Error(`Could not determine window of node. Node was ${describe(node)}`);
}
function isDocument(node) {
  return node.nodeType === 9;
}
function describe(val) {
  return typeof val == "function" ? `function ${val.name}` : val === null ? "null" : String(val);
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/dataTransfer/Blob.js
function readBlobText(blob, FileReader) {
  return new Promise((res, rej) => {
    let fr = new FileReader();
    fr.onerror = rej, fr.onabort = rej, fr.onload = () => {
      res(String(fr.result));
    }, fr.readAsText(blob);
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/dataTransfer/FileList.js
function createFileList(window2, files) {
  let list = {
    ...files,
    length: files.length,
    item: (index) => list[index],
    [Symbol.iterator]: function* () {
      for (let i2 = 0; i2 < list.length; i2++)
        yield list[i2];
    }
  };
  return list.constructor = window2.FileList, window2.FileList && Object.setPrototypeOf(list, window2.FileList.prototype), Object.freeze(list), list;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/dataTransfer/DataTransfer.js
function _define_property(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var DataTransferItemStub = class {
  getAsFile() {
    return this.file;
  }
  getAsString(callback) {
    typeof this.data == "string" && callback(this.data);
  }
  /* istanbul ignore next */
  webkitGetAsEntry() {
    throw new Error("not implemented");
  }
  constructor(dataOrFile, type5) {
    _define_property(this, "kind", void 0), _define_property(this, "type", void 0), _define_property(this, "file", null), _define_property(this, "data", void 0), typeof dataOrFile == "string" ? (this.kind = "string", this.type = String(type5), this.data = dataOrFile) : (this.kind = "file", this.type = dataOrFile.type, this.file = dataOrFile);
  }
}, DataTransferItemListStub = class extends Array {
  add(...args) {
    let item = new DataTransferItemStub(args[0], args[1]);
    return this.push(item), item;
  }
  clear() {
    this.splice(0, this.length);
  }
  remove(index) {
    this.splice(index, 1);
  }
};
function getTypeMatcher(type5, exact) {
  let [group, sub] = type5.split("/"), isGroup = !sub || sub === "*";
  return (item) => exact ? item.type === (isGroup ? group : type5) : isGroup ? item.type.startsWith(`${group}/`) : item.type === group;
}
function createDataTransferStub(window2) {
  return new class {
    getData(format3) {
      var _this_items_find;
      let match = (_this_items_find = this.items.find(getTypeMatcher(format3, !0))) !== null && _this_items_find !== void 0 ? _this_items_find : this.items.find(getTypeMatcher(format3, !1)), text = "";
      return match?.getAsString((t2) => {
        text = t2;
      }), text;
    }
    setData(format3, data) {
      let matchIndex = this.items.findIndex(getTypeMatcher(format3, !0)), item = new DataTransferItemStub(data, format3);
      matchIndex >= 0 ? this.items.splice(matchIndex, 1, item) : this.items.push(item);
    }
    clearData(format3) {
      if (format3) {
        let matchIndex = this.items.findIndex(getTypeMatcher(format3, !0));
        matchIndex >= 0 && this.items.remove(matchIndex);
      } else
        this.items.clear();
    }
    get types() {
      let t2 = [];
      return this.files.length && t2.push("Files"), this.items.forEach((i2) => t2.push(i2.type)), Object.freeze(t2), t2;
    }
    /* istanbul ignore next */
    setDragImage() {
    }
    constructor() {
      _define_property(this, "dropEffect", "none"), _define_property(this, "effectAllowed", "uninitialized"), _define_property(this, "items", new DataTransferItemListStub()), _define_property(this, "files", createFileList(window2, []));
    }
  }();
}
function createDataTransfer(window2, files = []) {
  let dt = typeof window2.DataTransfer > "u" ? createDataTransferStub(window2) : (
    /* istanbul ignore next */
    new window2.DataTransfer()
  );
  return Object.defineProperty(dt, "files", {
    get: () => createFileList(window2, files)
  }), dt;
}
async function getBlobFromDataTransferItem(window2, item) {
  return item.kind === "file" ? item.getAsFile() : new window2.Blob([
    await new Promise((r2) => item.getAsString(r2))
  ], {
    type: item.type
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/dataTransfer/Clipboard.js
function _define_property2(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
function createClipboardItem(window2, ...blobs) {
  let dataMap = Object.fromEntries(blobs.map((b2) => [
    typeof b2 == "string" ? "text/plain" : b2.type,
    Promise.resolve(b2)
  ]));
  return typeof window2.ClipboardItem < "u" ? new window2.ClipboardItem(dataMap) : new class {
    get types() {
      return Array.from(Object.keys(this.data));
    }
    async getType(type5) {
      let value = await this.data[type5];
      if (!value)
        throw new Error(`${type5} is not one of the available MIME types on this item.`);
      return value instanceof window2.Blob ? value : new window2.Blob([
        value
      ], {
        type: type5
      });
    }
    constructor(d) {
      _define_property2(this, "data", void 0), this.data = d;
    }
  }(dataMap);
}
var ClipboardStubControl = Symbol("Manage ClipboardSub");
function createClipboardStub(window2, control) {
  return Object.assign(new class extends window2.EventTarget {
    async read() {
      return Array.from(this.items);
    }
    async readText() {
      let text = "";
      for (let item of this.items) {
        let type5 = item.types.includes("text/plain") ? "text/plain" : item.types.find((t2) => t2.startsWith("text/"));
        type5 && (text += await item.getType(type5).then((b2) => readBlobText(b2, window2.FileReader)));
      }
      return text;
    }
    async write(data) {
      this.items = data;
    }
    async writeText(text) {
      this.items = [
        createClipboardItem(window2, text)
      ];
    }
    constructor(...args) {
      super(...args), _define_property2(this, "items", []);
    }
  }(), {
    [ClipboardStubControl]: control
  });
}
function isClipboardStub(clipboard) {
  return !!clipboard?.[ClipboardStubControl];
}
function attachClipboardStubToView(window2) {
  if (isClipboardStub(window2.navigator.clipboard))
    return window2.navigator.clipboard[ClipboardStubControl];
  let realClipboard = Object.getOwnPropertyDescriptor(window2.navigator, "clipboard"), stub, control = {
    resetClipboardStub: () => {
      stub = createClipboardStub(window2, control);
    },
    detachClipboardStub: () => {
      realClipboard ? Object.defineProperty(window2.navigator, "clipboard", realClipboard) : Object.defineProperty(window2.navigator, "clipboard", {
        value: void 0,
        configurable: !0
      });
    }
  };
  return stub = createClipboardStub(window2, control), Object.defineProperty(window2.navigator, "clipboard", {
    get: () => stub,
    configurable: !0
  }), stub[ClipboardStubControl];
}
function resetClipboardStubOnView(window2) {
  isClipboardStub(window2.navigator.clipboard) && window2.navigator.clipboard[ClipboardStubControl].resetClipboardStub();
}
function detachClipboardStubFromView(window2) {
  isClipboardStub(window2.navigator.clipboard) && window2.navigator.clipboard[ClipboardStubControl].detachClipboardStub();
}
async function readDataTransferFromClipboard(document2) {
  let window2 = document2.defaultView, clipboard = window2?.navigator.clipboard, items = clipboard && await clipboard.read();
  if (!items)
    throw new Error("The Clipboard API is unavailable.");
  let dt = createDataTransfer(window2);
  for (let item of items)
    for (let type5 of item.types)
      dt.setData(type5, await item.getType(type5).then((b2) => readBlobText(b2, window2.FileReader)));
  return dt;
}
async function writeDataTransferToClipboard(document2, clipboardData) {
  let window2 = getWindow(document2), clipboard = window2.navigator.clipboard, items = [];
  for (let i2 = 0; i2 < clipboardData.items.length; i2++) {
    let dtItem = clipboardData.items[i2], blob = await getBlobFromDataTransferItem(window2, dtItem);
    items.push(createClipboardItem(window2, blob));
  }
  if (!(clipboard && await clipboard.write(items).then(
    () => !0,
    // Can happen with other implementations that e.g. require permissions
    /* istanbul ignore next */
    () => !1
  )))
    throw new Error("The Clipboard API is unavailable.");
}
var g = globalThis;
typeof g.afterEach == "function" && g.afterEach(() => {
  typeof globalThis.window < "u" && resetClipboardStubOnView(globalThis.window);
});
typeof g.afterAll == "function" && g.afterAll(() => {
  typeof globalThis.window < "u" && detachClipboardStubFromView(globalThis.window);
});

// ../node_modules/@testing-library/user-event/dist/esm/utils/focus/selector.js
var FOCUSABLE_SELECTOR = [
  "input:not([type=hidden]):not([disabled])",
  "button:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  "a[href]",
  "[tabindex]:not([disabled])"
].join(", ");

// ../node_modules/@testing-library/user-event/dist/esm/utils/focus/isFocusable.js
function isFocusable(element) {
  return element.matches(FOCUSABLE_SELECTOR);
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/cloneEvent.js
function cloneEvent(event) {
  return new event.constructor(event.type, event);
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/isDisabled.js
function isDisabled2(element) {
  for (let el = element; el; el = el.parentElement)
    if (isElementType(el, [
      "button",
      "input",
      "select",
      "textarea",
      "optgroup",
      "option"
    ])) {
      if (el.hasAttribute("disabled"))
        return !0;
    } else if (isElementType(el, "fieldset")) {
      var _el_querySelector;
      if (el.hasAttribute("disabled") && !(!((_el_querySelector = el.querySelector(":scope > legend")) === null || _el_querySelector === void 0) && _el_querySelector.contains(element)))
        return !0;
    } else if (el.tagName.includes("-") && el.constructor.formAssociated && el.hasAttribute("disabled"))
      return !0;
  return !1;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/focus/getActiveElement.js
function getActiveElement(document2) {
  let activeElement = document2.activeElement;
  return activeElement?.shadowRoot ? getActiveElement(activeElement.shadowRoot) : isDisabled2(activeElement) ? document2.ownerDocument ? (
    /* istanbul ignore next */
    document2.ownerDocument.body
  ) : document2.body : activeElement;
}
function getActiveElementOrBody(document2) {
  var _getActiveElement;
  return (_getActiveElement = getActiveElement(document2)) !== null && _getActiveElement !== void 0 ? _getActiveElement : (
    /* istanbul ignore next */
    document2.body
  );
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/findClosest.js
function findClosest(element, callback) {
  let el = element;
  do {
    if (callback(el))
      return el;
    el = el.parentElement;
  } while (el && el !== element.ownerDocument.body);
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/edit/isContentEditable.js
function isContentEditable(element) {
  return element.hasAttribute("contenteditable") && (element.getAttribute("contenteditable") == "true" || element.getAttribute("contenteditable") == "");
}
function getContentEditable(node) {
  let element = getElement(node);
  return element && (element.closest('[contenteditable=""]') || element.closest('[contenteditable="true"]'));
}
function getElement(node) {
  return node.nodeType === 1 ? node : node.parentElement;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/click/isClickableInput.js
var clickableInputTypes = (function(clickableInputTypes2) {
  return clickableInputTypes2.button = "button", clickableInputTypes2.color = "color", clickableInputTypes2.file = "file", clickableInputTypes2.image = "image", clickableInputTypes2.reset = "reset", clickableInputTypes2.submit = "submit", clickableInputTypes2.checkbox = "checkbox", clickableInputTypes2.radio = "radio", clickableInputTypes2;
})(clickableInputTypes || {});
function isClickableInput(element) {
  return isElementType(element, "button") || isElementType(element, "input") && element.type in clickableInputTypes;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/edit/isEditable.js
function isEditable(element) {
  return isEditableInputOrTextArea(element) && !element.readOnly || isContentEditable(element);
}
var editableInputTypes = (function(editableInputTypes2) {
  return editableInputTypes2.text = "text", editableInputTypes2.date = "date", editableInputTypes2["datetime-local"] = "datetime-local", editableInputTypes2.email = "email", editableInputTypes2.month = "month", editableInputTypes2.number = "number", editableInputTypes2.password = "password", editableInputTypes2.search = "search", editableInputTypes2.tel = "tel", editableInputTypes2.time = "time", editableInputTypes2.url = "url", editableInputTypes2.week = "week", editableInputTypes2;
})(editableInputTypes || {});
function isEditableInputOrTextArea(element) {
  return isElementType(element, "textarea") || isElementType(element, "input") && element.type in editableInputTypes;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/focus/selection.js
function hasOwnSelection(node) {
  return isElement3(node) && isEditableInputOrTextArea(node);
}
function hasNoSelection(node) {
  return isElement3(node) && isClickableInput(node);
}
function isElement3(node) {
  return node.nodeType === 1;
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/updateSelectionOnFocus.js
function updateSelectionOnFocus(element) {
  let selection = element.ownerDocument.getSelection();
  if (selection?.focusNode && hasOwnSelection(element)) {
    let contenteditable = getContentEditable(selection.focusNode);
    if (contenteditable) {
      if (!selection.isCollapsed) {
        var _contenteditable_firstChild;
        let focusNode = ((_contenteditable_firstChild = contenteditable.firstChild) === null || _contenteditable_firstChild === void 0 ? void 0 : _contenteditable_firstChild.nodeType) === 3 ? contenteditable.firstChild : contenteditable;
        selection.setBaseAndExtent(focusNode, 0, focusNode, 0);
      }
    } else
      selection.setBaseAndExtent(element, 0, element, 0);
  }
}

// ../node_modules/@testing-library/user-event/dist/esm/event/wrapEvent.js
function wrapEvent(cb, _element) {
  return getConfig().eventWrapper(cb);
}

// ../node_modules/@testing-library/user-event/dist/esm/event/focus.js
function focusElement(element) {
  let target = findClosest(element, isFocusable), activeElement = getActiveElement(element.ownerDocument);
  (target ?? element.ownerDocument.body) !== activeElement && (target ? wrapEvent(() => target.focus()) : wrapEvent(() => activeElement?.blur()), updateSelectionOnFocus(target ?? element.ownerDocument.body));
}
function blurElement(element) {
  !isFocusable(element) || !(getActiveElement(element.ownerDocument) === element) || wrapEvent(() => element.blur());
}

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/registry.js
var behavior = {};

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/click.js
behavior.click = (event, target, instance) => {
  let context = target.closest("button,input,label,select,textarea"), control = context && isElementType(context, "label") && context.control;
  if (control && control !== target)
    return () => {
      isFocusable(control) && (focusElement(control), instance.dispatchEvent(control, cloneEvent(event)));
    };
  if (isElementType(target, "input", {
    type: "file"
  }))
    return () => {
      blurElement(target), target.dispatchEvent(new (getWindow(target)).Event("fileDialog")), focusElement(target);
    };
};

// ../node_modules/@testing-library/user-event/dist/esm/document/UI.js
var UIValue = Symbol("Displayed value in UI"), UISelection = Symbol("Displayed selection in UI"), InitialValue = Symbol("Initial value to compare on blur");
function isUIValue(value) {
  return typeof value == "object" && UIValue in value;
}
function isUISelectionStart(start) {
  return !!start && typeof start == "object" && UISelection in start;
}
function setUIValue(element, value) {
  element[InitialValue] === void 0 && (element[InitialValue] = element.value), element[UIValue] = value, element.value = Object.assign(new String(value), {
    [UIValue]: !0
  });
}
function getUIValue(element) {
  return element[UIValue] === void 0 ? element.value : String(element[UIValue]);
}
function setUIValueClean(element) {
  element[UIValue] = void 0;
}
function clearInitialValue(element) {
  element[InitialValue] = void 0;
}
function getInitialValue(element) {
  return element[InitialValue];
}
function setUISelectionRaw(element, selection) {
  element[UISelection] = selection;
}
function setUISelection(element, { focusOffset: focusOffsetParam, anchorOffset: anchorOffsetParam = focusOffsetParam }, mode = "replace") {
  let valueLength = getUIValue(element).length, sanitizeOffset = (o2) => Math.max(0, Math.min(valueLength, o2)), anchorOffset = mode === "replace" || element[UISelection] === void 0 ? sanitizeOffset(anchorOffsetParam) : element[UISelection].anchorOffset, focusOffset = sanitizeOffset(focusOffsetParam), startOffset = Math.min(anchorOffset, focusOffset), endOffset = Math.max(anchorOffset, focusOffset);
  if (element[UISelection] = {
    anchorOffset,
    focusOffset
  }, element.selectionStart === startOffset && element.selectionEnd === endOffset)
    return;
  let startObj = Object.assign(new Number(startOffset), {
    [UISelection]: !0
  });
  try {
    element.setSelectionRange(startObj, endOffset);
  } catch {
  }
}
function getUISelection(element) {
  var _element_selectionStart, _element_selectionEnd, _element_UISelection;
  let sel = (_element_UISelection = element[UISelection]) !== null && _element_UISelection !== void 0 ? _element_UISelection : {
    anchorOffset: (_element_selectionStart = element.selectionStart) !== null && _element_selectionStart !== void 0 ? _element_selectionStart : 0,
    focusOffset: (_element_selectionEnd = element.selectionEnd) !== null && _element_selectionEnd !== void 0 ? _element_selectionEnd : 0
  };
  return {
    ...sel,
    startOffset: Math.min(sel.anchorOffset, sel.focusOffset),
    endOffset: Math.max(sel.anchorOffset, sel.focusOffset)
  };
}
function hasUISelection(element) {
  return !!element[UISelection];
}
function setUISelectionClean(element) {
  element[UISelection] = void 0;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/edit/timeValue.js
var parseInt2 = globalThis.parseInt;
function buildTimeValue(value) {
  let onlyDigitsValue = value.replace(/\D/g, "");
  if (onlyDigitsValue.length < 2)
    return value;
  let firstDigit = parseInt2(onlyDigitsValue[0], 10), secondDigit = parseInt2(onlyDigitsValue[1], 10);
  if (firstDigit >= 3 || firstDigit === 2 && secondDigit >= 4) {
    let index;
    return firstDigit >= 3 ? index = 1 : index = 2, build(onlyDigitsValue, index);
  }
  return value.length === 2 ? value : build(onlyDigitsValue, 2);
}
function build(onlyDigitsValue, index) {
  let hours = onlyDigitsValue.slice(0, index), validHours = Math.min(parseInt2(hours, 10), 23), minuteCharacters = onlyDigitsValue.slice(index), parsedMinutes = parseInt2(minuteCharacters, 10), validMinutes = Math.min(parsedMinutes, 59);
  return `${validHours.toString().padStart(2, "0")}:${validMinutes.toString().padStart(2, "0")}`;
}
function isValidDateOrTimeValue(element, value) {
  let clone2 = element.cloneNode();
  return clone2.value = value, clone2.value === value;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/edit/maxLength.js
var maxLengthSupportedTypes = (function(maxLengthSupportedTypes2) {
  return maxLengthSupportedTypes2.email = "email", maxLengthSupportedTypes2.password = "password", maxLengthSupportedTypes2.search = "search", maxLengthSupportedTypes2.telephone = "telephone", maxLengthSupportedTypes2.text = "text", maxLengthSupportedTypes2.url = "url", maxLengthSupportedTypes2;
})(maxLengthSupportedTypes || {});
function getMaxLength(element) {
  var _element_getAttribute;
  let attr = (_element_getAttribute = element.getAttribute("maxlength")) !== null && _element_getAttribute !== void 0 ? _element_getAttribute : "";
  return /^\d+$/.test(attr) && Number(attr) >= 0 ? Number(attr) : void 0;
}
function supportsMaxLength(element) {
  return isElementType(element, "textarea") || isElementType(element, "input") && element.type in maxLengthSupportedTypes;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/focus/cursor.js
function getNextCursorPosition(node, offset, direction, inputType) {
  if (isTextNode(node) && offset + direction >= 0 && offset + direction <= node.nodeValue.length)
    return {
      node,
      offset: offset + direction
    };
  let nextNode = getNextCharacterContentNode(node, offset, direction);
  if (nextNode) {
    if (isTextNode(nextNode))
      return {
        node: nextNode,
        offset: direction > 0 ? Math.min(1, nextNode.nodeValue.length) : Math.max(nextNode.nodeValue.length - 1, 0)
      };
    if (isElementType(nextNode, "br")) {
      let nextPlusOne = getNextCharacterContentNode(nextNode, void 0, direction);
      return nextPlusOne ? isTextNode(nextPlusOne) ? {
        node: nextPlusOne,
        offset: direction > 0 ? 0 : nextPlusOne.nodeValue.length
      } : direction < 0 && isElementType(nextPlusOne, "br") ? {
        node: nextNode.parentNode,
        offset: getOffset(nextNode)
      } : {
        node: nextPlusOne.parentNode,
        offset: getOffset(nextPlusOne) + (direction > 0 ? 0 : 1)
      } : direction < 0 && inputType === "deleteContentBackward" ? {
        node: nextNode.parentNode,
        offset: getOffset(nextNode)
      } : void 0;
    } else
      return {
        node: nextNode.parentNode,
        offset: getOffset(nextNode) + (direction > 0 ? 1 : 0)
      };
  }
}
function getNextCharacterContentNode(node, offset, direction) {
  let nextOffset = Number(offset) + (direction < 0 ? -1 : 0);
  return offset !== void 0 && isElement4(node) && nextOffset >= 0 && nextOffset < node.children.length && (node = node.children[nextOffset]), walkNodes(node, direction === 1 ? "next" : "previous", isTreatedAsCharacterContent);
}
function isTreatedAsCharacterContent(node) {
  if (isTextNode(node))
    return !0;
  if (isElement4(node)) {
    if (isElementType(node, [
      "input",
      "textarea"
    ]))
      return node.type !== "hidden";
    if (isElementType(node, "br"))
      return !0;
  }
  return !1;
}
function getOffset(node) {
  let i2 = 0;
  for (; node.previousSibling; )
    i2++, node = node.previousSibling;
  return i2;
}
function isElement4(node) {
  return node.nodeType === 1;
}
function isTextNode(node) {
  return node.nodeType === 3;
}
function walkNodes(node, direction, callback) {
  for (; ; ) {
    var _node_ownerDocument;
    let sibling = node[`${direction}Sibling`];
    if (sibling) {
      if (node = getDescendant(sibling, direction === "next" ? "first" : "last"), callback(node))
        return node;
    } else if (node.parentNode && (!isElement4(node.parentNode) || !isContentEditable(node.parentNode) && node.parentNode !== ((_node_ownerDocument = node.ownerDocument) === null || _node_ownerDocument === void 0 ? void 0 : _node_ownerDocument.body)))
      node = node.parentNode;
    else
      break;
  }
}
function getDescendant(node, direction) {
  for (; node.hasChildNodes(); )
    node = node[`${direction}Child`];
  return node;
}

// ../node_modules/@testing-library/user-event/dist/esm/document/trackValue.js
var TrackChanges = Symbol("Track programmatic changes for React workaround");
function isReact17Element(element) {
  return Object.getOwnPropertyNames(element).some((k2) => k2.startsWith("__react")) && getWindow(element).REACT_VERSION === 17;
}
function startTrackValue(element) {
  isReact17Element(element) && (element[TrackChanges] = {
    previousValue: String(element.value),
    tracked: []
  });
}
function trackOrSetValue(element, v2) {
  var _element_TrackChanges_tracked, _element_TrackChanges;
  (_element_TrackChanges = element[TrackChanges]) === null || _element_TrackChanges === void 0 || (_element_TrackChanges_tracked = _element_TrackChanges.tracked) === null || _element_TrackChanges_tracked === void 0 || _element_TrackChanges_tracked.push(v2), element[TrackChanges] || (setUIValueClean(element), setUISelection(element, {
    focusOffset: v2.length
  }));
}
function commitValueAfterInput(element, cursorOffset) {
  var _changes_tracked;
  let changes = element[TrackChanges];
  if (element[TrackChanges] = void 0, !(!(changes == null || (_changes_tracked = changes.tracked) === null || _changes_tracked === void 0) && _changes_tracked.length))
    return;
  let isJustReactStateUpdate = changes.tracked.length === 2 && changes.tracked[0] === changes.previousValue && changes.tracked[1] === element.value;
  isJustReactStateUpdate || setUIValueClean(element), hasUISelection(element) && setUISelection(element, {
    focusOffset: isJustReactStateUpdate ? cursorOffset : element.value.length
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/getTargetTypeAndSelection.js
function getTargetTypeAndSelection(node) {
  let element = getElement2(node);
  if (element && hasOwnSelection(element))
    return {
      type: "input",
      selection: getUISelection(element)
    };
  let selection = element?.ownerDocument.getSelection();
  return {
    type: getContentEditable(node) && selection?.anchorNode && getContentEditable(selection.anchorNode) ? "contenteditable" : "default",
    selection
  };
}
function getElement2(node) {
  return node.nodeType === 1 ? node : node.parentElement;
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/getInputRange.js
function getInputRange(focusNode) {
  let typeAndSelection = getTargetTypeAndSelection(focusNode);
  if (typeAndSelection.type === "input")
    return typeAndSelection.selection;
  if (typeAndSelection.type === "contenteditable") {
    var _typeAndSelection_selection;
    return (_typeAndSelection_selection = typeAndSelection.selection) === null || _typeAndSelection_selection === void 0 ? void 0 : _typeAndSelection_selection.getRangeAt(0);
  }
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/setSelection.js
function setSelection({ focusNode, focusOffset, anchorNode = focusNode, anchorOffset = focusOffset }) {
  var _anchorNode_ownerDocument_getSelection, _anchorNode_ownerDocument;
  if (getTargetTypeAndSelection(focusNode).type === "input")
    return setUISelection(focusNode, {
      anchorOffset,
      focusOffset
    });
  (_anchorNode_ownerDocument = anchorNode.ownerDocument) === null || _anchorNode_ownerDocument === void 0 || (_anchorNode_ownerDocument_getSelection = _anchorNode_ownerDocument.getSelection()) === null || _anchorNode_ownerDocument_getSelection === void 0 || _anchorNode_ownerDocument_getSelection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
}

// ../node_modules/@testing-library/user-event/dist/esm/event/input.js
function isDateOrTime(element) {
  return isElementType(element, "input") && [
    "date",
    "time"
  ].includes(element.type);
}
function input(instance, element, data, inputType = "insertText") {
  let inputRange = getInputRange(element);
  inputRange && (!isDateOrTime(element) && !instance.dispatchUIEvent(element, "beforeinput", {
    inputType,
    data
  }) || ("startContainer" in inputRange ? editContenteditable(instance, element, inputRange, data, inputType) : editInputElement(instance, element, inputRange, data, inputType)));
}
function editContenteditable(instance, element, inputRange, data, inputType) {
  let del = !1;
  if (!inputRange.collapsed)
    del = !0, inputRange.deleteContents();
  else if ([
    "deleteContentBackward",
    "deleteContentForward"
  ].includes(inputType)) {
    let nextPosition = getNextCursorPosition(inputRange.startContainer, inputRange.startOffset, inputType === "deleteContentBackward" ? -1 : 1, inputType);
    if (nextPosition) {
      del = !0;
      let delRange = inputRange.cloneRange();
      delRange.comparePoint(nextPosition.node, nextPosition.offset) < 0 ? delRange.setStart(nextPosition.node, nextPosition.offset) : delRange.setEnd(nextPosition.node, nextPosition.offset), delRange.deleteContents();
    }
  }
  if (data)
    if (inputRange.endContainer.nodeType === 3) {
      let offset = inputRange.endOffset;
      inputRange.endContainer.insertData(offset, data), inputRange.setStart(inputRange.endContainer, offset + data.length), inputRange.setEnd(inputRange.endContainer, offset + data.length);
    } else {
      let text = element.ownerDocument.createTextNode(data);
      inputRange.insertNode(text), inputRange.setStart(text, data.length), inputRange.setEnd(text, data.length);
    }
  (del || data) && instance.dispatchUIEvent(element, "input", {
    inputType
  });
}
function editInputElement(instance, element, inputRange, data, inputType) {
  let dataToInsert = data;
  if (supportsMaxLength(element)) {
    let maxLength = getMaxLength(element);
    if (maxLength !== void 0 && data.length > 0) {
      let spaceUntilMaxLength = maxLength - element.value.length;
      if (spaceUntilMaxLength > 0)
        dataToInsert = data.substring(0, spaceUntilMaxLength);
      else
        return;
    }
  }
  let { newValue, newOffset, oldValue } = calculateNewValue(dataToInsert, element, inputRange, inputType);
  newValue === oldValue && newOffset === inputRange.startOffset && newOffset === inputRange.endOffset || isElementType(element, "input", {
    type: "number"
  }) && !isValidNumberInput(newValue) || (setUIValue(element, newValue), setSelection({
    focusNode: element,
    anchorOffset: newOffset,
    focusOffset: newOffset
  }), isDateOrTime(element) ? isValidDateOrTimeValue(element, newValue) && (commitInput(instance, element, newOffset, {}), instance.dispatchUIEvent(element, "change"), clearInitialValue(element)) : commitInput(instance, element, newOffset, {
    data,
    inputType
  }));
}
function calculateNewValue(inputData, node, { startOffset, endOffset }, inputType) {
  let value = getUIValue(node), prologEnd = Math.max(0, startOffset === endOffset && inputType === "deleteContentBackward" ? startOffset - 1 : startOffset), prolog = value.substring(0, prologEnd), epilogStart = Math.min(value.length, startOffset === endOffset && inputType === "deleteContentForward" ? startOffset + 1 : endOffset), epilog = value.substring(epilogStart, value.length), newValue = `${prolog}${inputData}${epilog}`, newOffset = prologEnd + inputData.length;
  if (isElementType(node, "input", {
    type: "time"
  })) {
    let builtValue = buildTimeValue(newValue);
    builtValue !== "" && isValidDateOrTimeValue(node, builtValue) && (newValue = builtValue, newOffset = builtValue.length);
  }
  return {
    oldValue: value,
    newValue,
    newOffset
  };
}
function commitInput(instance, element, newOffset, inputInit) {
  instance.dispatchUIEvent(element, "input", inputInit), commitValueAfterInput(element, newOffset);
}
function isValidNumberInput(value) {
  var _value_match, _value_match1;
  let valueParts = value.split("e", 2);
  return !(/[^\d.\-e]/.test(value) || Number((_value_match = value.match(/-/g)) === null || _value_match === void 0 ? void 0 : _value_match.length) > 2 || Number((_value_match1 = value.match(/\./g)) === null || _value_match1 === void 0 ? void 0 : _value_match1.length) > 1 || valueParts[1] && !/^-?\d*$/.test(valueParts[1]));
}

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/cut.js
behavior.cut = (event, target, instance) => () => {
  isEditable(target) && input(instance, target, "", "deleteByCut");
};

// ../node_modules/@testing-library/user-event/dist/esm/document/getValueOrTextContent.js
function getValueOrTextContent(element) {
  return element ? isContentEditable(element) ? element.textContent : getUIValue(element) : null;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/isVisible.js
function isVisible(element) {
  let window2 = getWindow(element);
  for (let el = element; el?.ownerDocument; el = el.parentElement) {
    let { display: display2, visibility } = window2.getComputedStyle(el);
    if (display2 === "none" || visibility === "hidden")
      return !1;
  }
  return !0;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/focus/getTabDestination.js
function getTabDestination(activeElement, shift) {
  let document2 = activeElement.ownerDocument, focusableElements = document2.querySelectorAll(FOCUSABLE_SELECTOR), enabledElements = Array.from(focusableElements).filter((el) => el === activeElement || !(Number(el.getAttribute("tabindex")) < 0 || isDisabled2(el)));
  Number(activeElement.getAttribute("tabindex")) >= 0 && enabledElements.sort((a, b2) => {
    let i2 = Number(a.getAttribute("tabindex")), j2 = Number(b2.getAttribute("tabindex"));
    return i2 === j2 ? 0 : i2 === 0 ? 1 : j2 === 0 ? -1 : i2 - j2;
  });
  let checkedRadio = {}, prunedElements = [
    document2.body
  ], activeRadioGroup = isElementType(activeElement, "input", {
    type: "radio"
  }) ? activeElement.name : void 0;
  enabledElements.forEach((currentElement) => {
    let el = currentElement;
    if (isElementType(el, "input", {
      type: "radio"
    }) && el.name) {
      if (el === activeElement) {
        prunedElements.push(el);
        return;
      } else if (el.name === activeRadioGroup)
        return;
      if (el.checked) {
        prunedElements = prunedElements.filter((e2) => !isElementType(e2, "input", {
          type: "radio",
          name: el.name
        })), prunedElements.push(el), checkedRadio[el.name] = el;
        return;
      }
      if (typeof checkedRadio[el.name] < "u")
        return;
    }
    prunedElements.push(el);
  });
  for (let index = prunedElements.findIndex((el) => el === activeElement); ; )
    if (index += shift ? -1 : 1, index === prunedElements.length ? index = 0 : index === -1 && (index = prunedElements.length - 1), prunedElements[index] === activeElement || prunedElements[index] === document2.body || isVisible(prunedElements[index]))
      return prunedElements[index];
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/moveSelection.js
function moveSelection(node, direction) {
  if (hasOwnSelection(node)) {
    let selection = getUISelection(node);
    setSelection({
      focusNode: node,
      focusOffset: selection.startOffset === selection.endOffset ? selection.focusOffset + direction : direction < 0 ? selection.startOffset : selection.endOffset
    });
  } else {
    let selection = node.ownerDocument.getSelection();
    if (!selection?.focusNode)
      return;
    if (selection.isCollapsed) {
      let nextPosition = getNextCursorPosition(selection.focusNode, selection.focusOffset, direction);
      nextPosition && setSelection({
        focusNode: nextPosition.node,
        focusOffset: nextPosition.offset
      });
    } else
      selection[direction < 0 ? "collapseToStart" : "collapseToEnd"]();
  }
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/selectAll.js
function selectAll(target) {
  if (hasOwnSelection(target))
    return setSelection({
      focusNode: target,
      anchorOffset: 0,
      focusOffset: getUIValue(target).length
    });
  var _getContentEditable;
  let focusNode = (_getContentEditable = getContentEditable(target)) !== null && _getContentEditable !== void 0 ? _getContentEditable : target.ownerDocument.body;
  setSelection({
    focusNode,
    anchorOffset: 0,
    focusOffset: focusNode.childNodes.length
  });
}
function isAllSelected(target) {
  if (hasOwnSelection(target))
    return getUISelection(target).startOffset === 0 && getUISelection(target).endOffset === getUIValue(target).length;
  var _getContentEditable;
  let focusNode = (_getContentEditable = getContentEditable(target)) !== null && _getContentEditable !== void 0 ? _getContentEditable : target.ownerDocument.body, selection = target.ownerDocument.getSelection();
  return selection?.anchorNode === focusNode && selection.focusNode === focusNode && selection.anchorOffset === 0 && selection.focusOffset === focusNode.childNodes.length;
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/setSelectionRange.js
function setSelectionRange(element, anchorOffset, focusOffset) {
  var _element_firstChild;
  if (hasOwnSelection(element))
    return setSelection({
      focusNode: element,
      anchorOffset,
      focusOffset
    });
  if (isContentEditable(element) && ((_element_firstChild = element.firstChild) === null || _element_firstChild === void 0 ? void 0 : _element_firstChild.nodeType) === 3)
    return setSelection({
      focusNode: element.firstChild,
      anchorOffset,
      focusOffset
    });
  throw new Error("Not implemented. The result of this interaction is unreliable.");
}

// ../node_modules/@testing-library/user-event/dist/esm/event/radio.js
function walkRadio(instance, el, direction) {
  let window2 = getWindow(el), group = Array.from(el.ownerDocument.querySelectorAll(el.name ? `input[type="radio"][name="${window2.CSS.escape(el.name)}"]` : 'input[type="radio"][name=""], input[type="radio"]:not([name])'));
  for (let i2 = group.findIndex((e2) => e2 === el) + direction; ; i2 += direction) {
    if (group[i2] || (i2 = direction > 0 ? 0 : group.length - 1), group[i2] === el)
      return;
    if (!isDisabled2(group[i2])) {
      focusElement(group[i2]), instance.dispatchUIEvent(group[i2], "click");
      return;
    }
  }
}

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/keydown.js
behavior.keydown = (event, target, instance) => {
  var _keydownBehavior_event_key, _keydownBehavior_event_key1;
  return (_keydownBehavior_event_key1 = (_keydownBehavior_event_key = keydownBehavior[event.key]) === null || _keydownBehavior_event_key === void 0 ? void 0 : _keydownBehavior_event_key.call(keydownBehavior, event, target, instance)) !== null && _keydownBehavior_event_key1 !== void 0 ? _keydownBehavior_event_key1 : combinationBehavior(event, target, instance);
};
var keydownBehavior = {
  ArrowDown: (event, target, instance) => {
    if (isElementType(target, "input", {
      type: "radio"
    }))
      return () => walkRadio(instance, target, 1);
  },
  ArrowLeft: (event, target, instance) => isElementType(target, "input", {
    type: "radio"
  }) ? () => walkRadio(instance, target, -1) : () => moveSelection(target, -1),
  ArrowRight: (event, target, instance) => isElementType(target, "input", {
    type: "radio"
  }) ? () => walkRadio(instance, target, 1) : () => moveSelection(target, 1),
  ArrowUp: (event, target, instance) => {
    if (isElementType(target, "input", {
      type: "radio"
    }))
      return () => walkRadio(instance, target, -1);
  },
  Backspace: (event, target, instance) => {
    if (isEditable(target))
      return () => {
        input(instance, target, "", "deleteContentBackward");
      };
  },
  Delete: (event, target, instance) => {
    if (isEditable(target))
      return () => {
        input(instance, target, "", "deleteContentForward");
      };
  },
  End: (event, target) => {
    if (isElementType(target, [
      "input",
      "textarea"
    ]) || isContentEditable(target))
      return () => {
        var _getValueOrTextContent, _getValueOrTextContent_length;
        let newPos = (_getValueOrTextContent_length = (_getValueOrTextContent = getValueOrTextContent(target)) === null || _getValueOrTextContent === void 0 ? void 0 : _getValueOrTextContent.length) !== null && _getValueOrTextContent_length !== void 0 ? _getValueOrTextContent_length : (
          /* istanbul ignore next */
          0
        );
        setSelectionRange(target, newPos, newPos);
      };
  },
  Home: (event, target) => {
    if (isElementType(target, [
      "input",
      "textarea"
    ]) || isContentEditable(target))
      return () => {
        setSelectionRange(target, 0, 0);
      };
  },
  PageDown: (event, target) => {
    if (isElementType(target, [
      "input"
    ]))
      return () => {
        let newPos = getUIValue(target).length;
        setSelectionRange(target, newPos, newPos);
      };
  },
  PageUp: (event, target) => {
    if (isElementType(target, [
      "input"
    ]))
      return () => {
        setSelectionRange(target, 0, 0);
      };
  },
  Tab: (event, target, instance) => () => {
    let dest = getTabDestination(target, instance.system.keyboard.modifiers.Shift);
    focusElement(dest), hasOwnSelection(dest) && setUISelection(dest, {
      anchorOffset: 0,
      focusOffset: dest.value.length
    });
  }
}, combinationBehavior = (event, target, instance) => {
  if (event.code === "KeyA" && instance.system.keyboard.modifiers.Control)
    return () => selectAll(target);
};

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/keypress.js
behavior.keypress = (event, target, instance) => {
  if (event.key === "Enter") {
    if (isElementType(target, "button") || isElementType(target, "input") && ClickInputOnEnter.includes(target.type) || isElementType(target, "a") && target.href)
      return () => {
        instance.dispatchUIEvent(target, "click");
      };
    if (isElementType(target, "input")) {
      let form = target.form, submit = form?.querySelector('input[type="submit"], button:not([type]), button[type="submit"]');
      return submit ? () => instance.dispatchUIEvent(submit, "click") : form && SubmitSingleInputOnEnter.includes(target.type) && form.querySelectorAll("input").length === 1 ? () => instance.dispatchUIEvent(form, "submit") : void 0;
    }
  }
  if (isEditable(target)) {
    let inputType = event.key === "Enter" ? isContentEditable(target) && !instance.system.keyboard.modifiers.Shift ? "insertParagraph" : "insertLineBreak" : "insertText", inputData = event.key === "Enter" ? `
` : event.key;
    return () => input(instance, target, inputData, inputType);
  }
};
var ClickInputOnEnter = [
  "button",
  "color",
  "file",
  "image",
  "reset",
  "submit"
], SubmitSingleInputOnEnter = [
  "email",
  "month",
  "password",
  "search",
  "tel",
  "text",
  "url",
  "week"
];

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/keyup.js
behavior.keyup = (event, target, instance) => {
  var _keyupBehavior_event_key;
  return (_keyupBehavior_event_key = keyupBehavior[event.key]) === null || _keyupBehavior_event_key === void 0 ? void 0 : _keyupBehavior_event_key.call(keyupBehavior, event, target, instance);
};
var keyupBehavior = {
  " ": (event, target, instance) => {
    if (isClickableInput(target))
      return () => instance.dispatchUIEvent(target, "click");
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/event/behavior/paste.js
behavior.paste = (event, target, instance) => {
  if (isEditable(target))
    return () => {
      var _event_clipboardData;
      let insertData = (_event_clipboardData = event.clipboardData) === null || _event_clipboardData === void 0 ? void 0 : _event_clipboardData.getData("text");
      insertData && input(instance, target, insertData, "insertFromPaste");
    };
};

// ../node_modules/@testing-library/user-event/dist/esm/event/eventMap.js
var eventMap2 = {
  auxclick: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  beforeinput: {
    EventType: "InputEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  blur: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  click: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  contextmenu: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  copy: {
    EventType: "ClipboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  change: {
    EventType: "Event",
    defaultInit: {
      bubbles: !0,
      cancelable: !1
    }
  },
  cut: {
    EventType: "ClipboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  dblclick: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  focus: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  focusin: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  focusout: {
    EventType: "FocusEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  keydown: {
    EventType: "KeyboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  keypress: {
    EventType: "KeyboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  keyup: {
    EventType: "KeyboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  paste: {
    EventType: "ClipboardEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  input: {
    EventType: "InputEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  mousedown: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseenter: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  mouseleave: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1,
      composed: !0
    }
  },
  mousemove: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseout: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseover: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  mouseup: {
    EventType: "MouseEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerover: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerenter: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  pointerdown: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointermove: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerup: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointercancel: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }
  },
  pointerout: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !0,
      cancelable: !0,
      composed: !0
    }
  },
  pointerleave: {
    EventType: "PointerEvent",
    defaultInit: {
      bubbles: !1,
      cancelable: !1
    }
  },
  submit: {
    EventType: "Event",
    defaultInit: {
      bubbles: !0,
      cancelable: !0
    }
  }
};
function getEventClass(type5) {
  return eventMap2[type5].EventType;
}
var mouseEvents = [
  "MouseEvent",
  "PointerEvent"
];
function isMouseEvent(type5) {
  return mouseEvents.includes(getEventClass(type5));
}
function isKeyboardEvent(type5) {
  return getEventClass(type5) === "KeyboardEvent";
}

// ../node_modules/@testing-library/user-event/dist/esm/event/createEvent.js
var eventInitializer = {
  ClipboardEvent: [
    initClipboardEvent
  ],
  Event: [],
  FocusEvent: [
    initUIEvent,
    initFocusEvent
  ],
  InputEvent: [
    initUIEvent,
    initInputEvent
  ],
  MouseEvent: [
    initUIEvent,
    initUIEventModifiers,
    initMouseEvent
  ],
  PointerEvent: [
    initUIEvent,
    initUIEventModifiers,
    initMouseEvent,
    initPointerEvent
  ],
  KeyboardEvent: [
    initUIEvent,
    initUIEventModifiers,
    initKeyboardEvent
  ]
};
function createEvent2(type5, target, init) {
  let window2 = getWindow(target), { EventType, defaultInit } = eventMap2[type5], event = new (getEventConstructors(window2))[EventType](type5, defaultInit);
  return eventInitializer[EventType].forEach((f3) => f3(event, init ?? {})), event;
}
function getEventConstructors(window2) {
  var _window_Event;
  let Event = (_window_Event = window2.Event) !== null && _window_Event !== void 0 ? _window_Event : class {
  };
  var _window_AnimationEvent;
  let AnimationEvent = (_window_AnimationEvent = window2.AnimationEvent) !== null && _window_AnimationEvent !== void 0 ? _window_AnimationEvent : class extends Event {
  };
  var _window_ClipboardEvent;
  let ClipboardEvent = (_window_ClipboardEvent = window2.ClipboardEvent) !== null && _window_ClipboardEvent !== void 0 ? _window_ClipboardEvent : class extends Event {
  };
  var _window_PopStateEvent;
  let PopStateEvent = (_window_PopStateEvent = window2.PopStateEvent) !== null && _window_PopStateEvent !== void 0 ? _window_PopStateEvent : class extends Event {
  };
  var _window_ProgressEvent;
  let ProgressEvent = (_window_ProgressEvent = window2.ProgressEvent) !== null && _window_ProgressEvent !== void 0 ? _window_ProgressEvent : class extends Event {
  };
  var _window_TransitionEvent;
  let TransitionEvent = (_window_TransitionEvent = window2.TransitionEvent) !== null && _window_TransitionEvent !== void 0 ? _window_TransitionEvent : class extends Event {
  };
  var _window_UIEvent;
  let UIEvent = (_window_UIEvent = window2.UIEvent) !== null && _window_UIEvent !== void 0 ? _window_UIEvent : class extends Event {
  };
  var _window_CompositionEvent;
  let CompositionEvent = (_window_CompositionEvent = window2.CompositionEvent) !== null && _window_CompositionEvent !== void 0 ? _window_CompositionEvent : class extends UIEvent {
  };
  var _window_FocusEvent;
  let FocusEvent = (_window_FocusEvent = window2.FocusEvent) !== null && _window_FocusEvent !== void 0 ? _window_FocusEvent : class extends UIEvent {
  };
  var _window_InputEvent;
  let InputEvent = (_window_InputEvent = window2.InputEvent) !== null && _window_InputEvent !== void 0 ? _window_InputEvent : class extends UIEvent {
  };
  var _window_KeyboardEvent;
  let KeyboardEvent = (_window_KeyboardEvent = window2.KeyboardEvent) !== null && _window_KeyboardEvent !== void 0 ? _window_KeyboardEvent : class extends UIEvent {
  };
  var _window_MouseEvent;
  let MouseEvent = (_window_MouseEvent = window2.MouseEvent) !== null && _window_MouseEvent !== void 0 ? _window_MouseEvent : class extends UIEvent {
  };
  var _window_DragEvent;
  let DragEvent = (_window_DragEvent = window2.DragEvent) !== null && _window_DragEvent !== void 0 ? _window_DragEvent : class extends MouseEvent {
  };
  var _window_PointerEvent;
  let PointerEvent = (_window_PointerEvent = window2.PointerEvent) !== null && _window_PointerEvent !== void 0 ? _window_PointerEvent : class extends MouseEvent {
  };
  var _window_TouchEvent;
  let TouchEvent = (_window_TouchEvent = window2.TouchEvent) !== null && _window_TouchEvent !== void 0 ? _window_TouchEvent : class extends UIEvent {
  };
  return {
    Event,
    AnimationEvent,
    ClipboardEvent,
    PopStateEvent,
    ProgressEvent,
    TransitionEvent,
    UIEvent,
    CompositionEvent,
    FocusEvent,
    InputEvent,
    KeyboardEvent,
    MouseEvent,
    DragEvent,
    PointerEvent,
    TouchEvent
  };
}
function assignProps(obj, props) {
  for (let [key, value] of Object.entries(props))
    Object.defineProperty(obj, key, {
      get: () => value ?? null
    });
}
function sanitizeNumber(n2) {
  return Number(n2 ?? 0);
}
function initClipboardEvent(event, { clipboardData }) {
  assignProps(event, {
    clipboardData
  });
}
function initFocusEvent(event, { relatedTarget }) {
  assignProps(event, {
    relatedTarget
  });
}
function initInputEvent(event, { data, inputType, isComposing }) {
  assignProps(event, {
    data,
    isComposing: !!isComposing,
    inputType: String(inputType)
  });
}
function initUIEvent(event, { view, detail }) {
  assignProps(event, {
    view,
    detail: sanitizeNumber(detail ?? 0)
  });
}
function initUIEventModifiers(event, { altKey, ctrlKey, metaKey, shiftKey, modifierAltGraph, modifierCapsLock, modifierFn, modifierFnLock, modifierNumLock, modifierScrollLock, modifierSymbol, modifierSymbolLock }) {
  assignProps(event, {
    altKey: !!altKey,
    ctrlKey: !!ctrlKey,
    metaKey: !!metaKey,
    shiftKey: !!shiftKey,
    getModifierState(k2) {
      return !!{
        Alt: altKey,
        AltGraph: modifierAltGraph,
        CapsLock: modifierCapsLock,
        Control: ctrlKey,
        Fn: modifierFn,
        FnLock: modifierFnLock,
        Meta: metaKey,
        NumLock: modifierNumLock,
        ScrollLock: modifierScrollLock,
        Shift: shiftKey,
        Symbol: modifierSymbol,
        SymbolLock: modifierSymbolLock
      }[k2];
    }
  });
}
function initKeyboardEvent(event, { key, code, location, repeat, isComposing, charCode }) {
  assignProps(event, {
    key: String(key),
    code: String(code),
    location: sanitizeNumber(location),
    repeat: !!repeat,
    isComposing: !!isComposing,
    charCode
  });
}
function initMouseEvent(event, { x: x2, y: y2, screenX, screenY, clientX = x2, clientY = y2, button, buttons, relatedTarget, offsetX, offsetY, pageX, pageY }) {
  assignProps(event, {
    screenX: sanitizeNumber(screenX),
    screenY: sanitizeNumber(screenY),
    clientX: sanitizeNumber(clientX),
    x: sanitizeNumber(clientX),
    clientY: sanitizeNumber(clientY),
    y: sanitizeNumber(clientY),
    button: sanitizeNumber(button),
    buttons: sanitizeNumber(buttons),
    relatedTarget,
    offsetX: sanitizeNumber(offsetX),
    offsetY: sanitizeNumber(offsetY),
    pageX: sanitizeNumber(pageX),
    pageY: sanitizeNumber(pageY)
  });
}
function initPointerEvent(event, { pointerId, width, height, pressure, tangentialPressure, tiltX, tiltY, twist, pointerType, isPrimary }) {
  assignProps(event, {
    pointerId: sanitizeNumber(pointerId),
    width: sanitizeNumber(width ?? 1),
    height: sanitizeNumber(height ?? 1),
    pressure: sanitizeNumber(pressure),
    tangentialPressure: sanitizeNumber(tangentialPressure),
    tiltX: sanitizeNumber(tiltX),
    tiltY: sanitizeNumber(tiltY),
    twist: sanitizeNumber(twist),
    pointerType: String(pointerType),
    isPrimary: !!isPrimary
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/event/dispatchEvent.js
function dispatchUIEvent(target, type5, init, preventDefault = !1) {
  (isMouseEvent(type5) || isKeyboardEvent(type5)) && (init = {
    ...init,
    ...this.system.getUIEventModifiers()
  });
  let event = createEvent2(type5, target, init);
  return dispatchEvent.call(this, target, event, preventDefault);
}
function dispatchEvent(target, event, preventDefault = !1) {
  var _behavior_type;
  let type5 = event.type, behaviorImplementation = preventDefault ? () => {
  } : (_behavior_type = behavior[type5]) === null || _behavior_type === void 0 ? void 0 : _behavior_type.call(behavior, event, target, this);
  if (behaviorImplementation) {
    event.preventDefault();
    let defaultPrevented = !1;
    return Object.defineProperty(event, "defaultPrevented", {
      get: () => defaultPrevented
    }), Object.defineProperty(event, "preventDefault", {
      value: () => {
        defaultPrevented = event.cancelable;
      }
    }), wrapEvent(() => target.dispatchEvent(event)), defaultPrevented || behaviorImplementation(), !defaultPrevented;
  }
  return wrapEvent(() => target.dispatchEvent(event));
}
function dispatchDOMEvent(target, type5, init) {
  let event = createEvent2(type5, target, init);
  wrapEvent(() => target.dispatchEvent(event));
}

// ../node_modules/@testing-library/user-event/dist/esm/document/patchFocus.js
var patched = Symbol("patched focus/blur methods");
function patchFocus(HTMLElement2) {
  if (HTMLElement2.prototype[patched])
    return;
  let { focus, blur } = HTMLElement2.prototype;
  Object.defineProperties(HTMLElement2.prototype, {
    focus: {
      configurable: !0,
      get: () => patchedFocus
    },
    blur: {
      configurable: !0,
      get: () => patchedBlur
    },
    [patched]: {
      configurable: !0,
      get: () => ({
        focus,
        blur
      })
    }
  });
  let activeCall;
  function patchedFocus(options) {
    if (this.ownerDocument.visibilityState !== "hidden")
      return focus.call(this, options);
    let blurred = getActiveTarget(this.ownerDocument);
    if (blurred === this)
      return;
    let thisCall = Symbol("focus call");
    activeCall = thisCall, blurred && (blur.call(blurred), dispatchDOMEvent(blurred, "blur", {
      relatedTarget: this
    }), dispatchDOMEvent(blurred, "focusout", {
      relatedTarget: activeCall === thisCall ? this : null
    })), activeCall === thisCall && (focus.call(this, options), dispatchDOMEvent(this, "focus", {
      relatedTarget: blurred
    })), activeCall === thisCall && dispatchDOMEvent(this, "focusin", {
      relatedTarget: blurred
    });
  }
  function patchedBlur() {
    if (this.ownerDocument.visibilityState !== "hidden")
      return blur.call(this);
    let blurred = getActiveTarget(this.ownerDocument);
    if (blurred !== this)
      return;
    activeCall = Symbol("blur call"), blur.call(this), dispatchDOMEvent(blurred, "blur", {
      relatedTarget: null
    }), dispatchDOMEvent(blurred, "focusout", {
      relatedTarget: null
    });
  }
}
function getActiveTarget(document2) {
  let active = getActiveElement(document2);
  return active?.tagName === "BODY" ? null : active;
}

// ../node_modules/@testing-library/user-event/dist/esm/document/interceptor.js
var Interceptor = Symbol("Interceptor for programmatical calls");
function prepareInterceptor(element, propName, interceptorImpl) {
  let prototypeDescriptor = Object.getOwnPropertyDescriptor(element.constructor.prototype, propName), objectDescriptor = Object.getOwnPropertyDescriptor(element, propName), target = prototypeDescriptor?.set ? "set" : "value";
  if (typeof prototypeDescriptor?.[target] != "function" || prototypeDescriptor[target][Interceptor])
    throw new Error(`Element ${element.tagName} does not implement "${String(propName)}".`);
  function intercept(...args) {
    let { applyNative = !1, realArgs, then } = interceptorImpl.call(this, ...args), realFunc = (!applyNative && objectDescriptor || prototypeDescriptor)[target];
    target === "set" ? realFunc.call(this, realArgs) : realFunc.call(this, ...realArgs), then?.();
  }
  intercept[Interceptor] = Interceptor, Object.defineProperty(element, propName, {
    ...objectDescriptor ?? prototypeDescriptor,
    [target]: intercept
  });
}
function prepareValueInterceptor(element) {
  prepareInterceptor(element, "value", function(v2) {
    let isUI = isUIValue(v2);
    return isUI && startTrackValue(this), {
      applyNative: !!isUI,
      realArgs: sanitizeValue(this, v2),
      then: isUI ? void 0 : () => trackOrSetValue(this, String(v2))
    };
  });
}
function sanitizeValue(element, v2) {
  return isElementType(element, "input", {
    type: "number"
  }) && String(v2) !== "" && !Number.isNaN(Number(v2)) ? String(Number(v2)) : String(v2);
}
function prepareSelectionInterceptor(element) {
  prepareInterceptor(element, "setSelectionRange", function(start, ...others) {
    let isUI = isUISelectionStart(start);
    return {
      applyNative: !!isUI,
      realArgs: [
        Number(start),
        ...others
      ],
      then: () => isUI ? void 0 : setUISelectionClean(element)
    };
  }), prepareInterceptor(element, "selectionStart", function(v2) {
    return {
      realArgs: v2,
      then: () => setUISelectionClean(element)
    };
  }), prepareInterceptor(element, "selectionEnd", function(v2) {
    return {
      realArgs: v2,
      then: () => setUISelectionClean(element)
    };
  }), prepareInterceptor(element, "select", function() {
    return {
      realArgs: [],
      then: () => setUISelectionRaw(element, {
        anchorOffset: 0,
        focusOffset: getUIValue(element).length
      })
    };
  });
}
function prepareRangeTextInterceptor(element) {
  prepareInterceptor(element, "setRangeText", function(...realArgs) {
    return {
      realArgs,
      then: () => {
        setUIValueClean(element), setUISelectionClean(element);
      }
    };
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/document/prepareDocument.js
var isPrepared = Symbol("Node prepared with document state workarounds");
function prepareDocument(document2) {
  document2[isPrepared] || (document2.addEventListener("focus", (e2) => {
    let el = e2.target;
    prepareElement(el);
  }, {
    capture: !0,
    passive: !0
  }), document2.activeElement && prepareElement(document2.activeElement), document2.addEventListener("blur", (e2) => {
    let el = e2.target, initialValue2 = getInitialValue(el);
    initialValue2 !== void 0 && (el.value !== initialValue2 && dispatchDOMEvent(el, "change"), clearInitialValue(el));
  }, {
    capture: !0,
    passive: !0
  }), document2[isPrepared] = isPrepared);
}
function prepareElement(el) {
  el[isPrepared] || (isElementType(el, [
    "input",
    "textarea"
  ]) && (prepareValueInterceptor(el), prepareSelectionInterceptor(el), prepareRangeTextInterceptor(el)), el[isPrepared] = isPrepared);
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/getDocumentFromNode.js
function getDocumentFromNode(el) {
  return isDocument2(el) ? el : el.ownerDocument;
}
function isDocument2(node) {
  return node.nodeType === 9;
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/level.js
var ApiLevel = (function(ApiLevel2) {
  return ApiLevel2[ApiLevel2.Trigger = 2] = "Trigger", ApiLevel2[ApiLevel2.Call = 1] = "Call", ApiLevel2;
})({});
function setLevelRef(instance, level) {
  instance.levelRefs[level] = {};
}
function getLevelRef(instance, level) {
  return instance.levelRefs[level];
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/wait.js
function wait(config3) {
  let delay = config3.delay;
  if (typeof delay == "number")
    return Promise.all([
      new Promise((resolve) => globalThis.setTimeout(() => resolve(), delay)),
      config3.advanceTimers(delay)
    ]);
}

// ../node_modules/@testing-library/user-event/dist/esm/options.js
var PointerEventsCheckLevel = (function(PointerEventsCheckLevel2) {
  return PointerEventsCheckLevel2[PointerEventsCheckLevel2.EachTrigger = 4] = "EachTrigger", PointerEventsCheckLevel2[PointerEventsCheckLevel2.EachApiCall = 2] = "EachApiCall", PointerEventsCheckLevel2[PointerEventsCheckLevel2.EachTarget = 1] = "EachTarget", PointerEventsCheckLevel2[PointerEventsCheckLevel2.Never = 0] = "Never", PointerEventsCheckLevel2;
})({});

// ../node_modules/@testing-library/user-event/dist/esm/system/keyboard.js
function _define_property3(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var DOM_KEY_LOCATION = (function(DOM_KEY_LOCATION2) {
  return DOM_KEY_LOCATION2[DOM_KEY_LOCATION2.STANDARD = 0] = "STANDARD", DOM_KEY_LOCATION2[DOM_KEY_LOCATION2.LEFT = 1] = "LEFT", DOM_KEY_LOCATION2[DOM_KEY_LOCATION2.RIGHT = 2] = "RIGHT", DOM_KEY_LOCATION2[DOM_KEY_LOCATION2.NUMPAD = 3] = "NUMPAD", DOM_KEY_LOCATION2;
})({}), modifierKeys = [
  "Alt",
  "AltGraph",
  "Control",
  "Fn",
  "Meta",
  "Shift",
  "Symbol"
];
function isModifierKey(key) {
  return modifierKeys.includes(key);
}
var modifierLocks = [
  "CapsLock",
  "FnLock",
  "NumLock",
  "ScrollLock",
  "SymbolLock"
];
function isModifierLock(key) {
  return modifierLocks.includes(key);
}
var KeyboardHost = class {
  isKeyPressed(keyDef) {
    return this.pressed.has(String(keyDef.code));
  }
  getPressedKeys() {
    return this.pressed.values().map((p) => p.keyDef);
  }
  /** Press a key */
  async keydown(instance, keyDef) {
    let key = String(keyDef.key), code = String(keyDef.code), target = getActiveElementOrBody(instance.config.document);
    this.setKeydownTarget(target), this.pressed.add(code, keyDef), isModifierKey(key) && (this.modifiers[key] = !0);
    let unprevented = instance.dispatchUIEvent(target, "keydown", {
      key,
      code
    });
    isModifierLock(key) && !this.modifiers[key] && (this.modifiers[key] = !0, this.modifierLockStart[key] = !0), unprevented && this.pressed.setUnprevented(code), unprevented && this.hasKeyPress(key) && instance.dispatchUIEvent(getActiveElementOrBody(instance.config.document), "keypress", {
      key,
      code,
      charCode: keyDef.key === "Enter" ? 13 : String(keyDef.key).charCodeAt(0)
    });
  }
  /** Release a key */
  async keyup(instance, keyDef) {
    let key = String(keyDef.key), code = String(keyDef.code), unprevented = this.pressed.isUnprevented(code);
    this.pressed.delete(code), isModifierKey(key) && !this.pressed.values().find((p) => p.keyDef.key === key) && (this.modifiers[key] = !1), instance.dispatchUIEvent(getActiveElementOrBody(instance.config.document), "keyup", {
      key,
      code
    }, !unprevented), isModifierLock(key) && this.modifiers[key] && (this.modifierLockStart[key] ? this.modifierLockStart[key] = !1 : this.modifiers[key] = !1);
  }
  setKeydownTarget(target) {
    target !== this.lastKeydownTarget && (this.carryChar = ""), this.lastKeydownTarget = target;
  }
  hasKeyPress(key) {
    return (key.length === 1 || key === "Enter") && !this.modifiers.Control && !this.modifiers.Alt;
  }
  constructor(system) {
    _define_property3(this, "system", void 0), _define_property3(this, "modifiers", {
      Alt: !1,
      AltGraph: !1,
      CapsLock: !1,
      Control: !1,
      Fn: !1,
      FnLock: !1,
      Meta: !1,
      NumLock: !1,
      ScrollLock: !1,
      Shift: !1,
      Symbol: !1,
      SymbolLock: !1
    }), _define_property3(this, "pressed", new class {
      add(code, keyDef) {
        var _this_registry, _code, _;
        (_ = (_this_registry = this.registry)[_code = code]) !== null && _ !== void 0 || (_this_registry[_code] = {
          keyDef,
          unpreventedDefault: !1
        });
      }
      has(code) {
        return !!this.registry[code];
      }
      setUnprevented(code) {
        let o2 = this.registry[code];
        o2 && (o2.unpreventedDefault = !0);
      }
      isUnprevented(code) {
        var _this_registry_code;
        return !!(!((_this_registry_code = this.registry[code]) === null || _this_registry_code === void 0) && _this_registry_code.unpreventedDefault);
      }
      delete(code) {
        delete this.registry[code];
      }
      values() {
        return Object.values(this.registry);
      }
      constructor() {
        _define_property3(this, "registry", {});
      }
    }()), _define_property3(this, "carryChar", ""), _define_property3(this, "lastKeydownTarget", void 0), _define_property3(this, "modifierLockStart", {}), this.system = system;
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/keyboard/keyMap.js
var defaultKeyMap = [
  // alphanumeric block - writing system
  ..."0123456789".split("").map((c2) => ({
    code: `Digit${c2}`,
    key: c2
  })),
  ...")!@#$%^&*(".split("").map((c2, i2) => ({
    code: `Digit${i2}`,
    key: c2,
    shiftKey: !0
  })),
  ..."abcdefghijklmnopqrstuvwxyz".split("").map((c2) => ({
    code: `Key${c2.toUpperCase()}`,
    key: c2
  })),
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c2) => ({
    code: `Key${c2}`,
    key: c2,
    shiftKey: !0
  })),
  {
    code: "BracketLeft",
    key: "["
  },
  {
    code: "BracketLeft",
    key: "{",
    shiftKey: !0
  },
  {
    code: "BracketRight",
    key: "]"
  },
  {
    code: "BracketRight",
    key: "}",
    shiftKey: !0
  },
  // alphanumeric block - functional
  {
    code: "Space",
    key: " "
  },
  {
    code: "AltLeft",
    key: "Alt",
    location: DOM_KEY_LOCATION.LEFT
  },
  {
    code: "AltRight",
    key: "Alt",
    location: DOM_KEY_LOCATION.RIGHT
  },
  {
    code: "ShiftLeft",
    key: "Shift",
    location: DOM_KEY_LOCATION.LEFT
  },
  {
    code: "ShiftRight",
    key: "Shift",
    location: DOM_KEY_LOCATION.RIGHT
  },
  {
    code: "ControlLeft",
    key: "Control",
    location: DOM_KEY_LOCATION.LEFT
  },
  {
    code: "ControlRight",
    key: "Control",
    location: DOM_KEY_LOCATION.RIGHT
  },
  {
    code: "MetaLeft",
    key: "Meta",
    location: DOM_KEY_LOCATION.LEFT
  },
  {
    code: "MetaRight",
    key: "Meta",
    location: DOM_KEY_LOCATION.RIGHT
  },
  {
    code: "OSLeft",
    key: "OS",
    location: DOM_KEY_LOCATION.LEFT
  },
  {
    code: "OSRight",
    key: "OS",
    location: DOM_KEY_LOCATION.RIGHT
  },
  {
    code: "ContextMenu",
    key: "ContextMenu"
  },
  {
    code: "Tab",
    key: "Tab"
  },
  {
    code: "CapsLock",
    key: "CapsLock"
  },
  {
    code: "Backspace",
    key: "Backspace"
  },
  {
    code: "Enter",
    key: "Enter"
  },
  // function
  {
    code: "Escape",
    key: "Escape"
  },
  // arrows
  {
    code: "ArrowUp",
    key: "ArrowUp"
  },
  {
    code: "ArrowDown",
    key: "ArrowDown"
  },
  {
    code: "ArrowLeft",
    key: "ArrowLeft"
  },
  {
    code: "ArrowRight",
    key: "ArrowRight"
  },
  // control pad
  {
    code: "Home",
    key: "Home"
  },
  {
    code: "End",
    key: "End"
  },
  {
    code: "Delete",
    key: "Delete"
  },
  {
    code: "PageUp",
    key: "PageUp"
  },
  {
    code: "PageDown",
    key: "PageDown"
  },
  // Special keys that are not part of a default US-layout but included for specific behavior
  {
    code: "Fn",
    key: "Fn"
  },
  {
    code: "Symbol",
    key: "Symbol"
  },
  {
    code: "AltRight",
    key: "AltGraph"
  }
];

// ../node_modules/@testing-library/user-event/dist/esm/pointer/keyMap.js
var defaultKeyMap2 = [
  {
    name: "MouseLeft",
    pointerType: "mouse",
    button: "primary"
  },
  {
    name: "MouseRight",
    pointerType: "mouse",
    button: "secondary"
  },
  {
    name: "MouseMiddle",
    pointerType: "mouse",
    button: "auxiliary"
  },
  {
    name: "TouchA",
    pointerType: "touch"
  },
  {
    name: "TouchB",
    pointerType: "touch"
  },
  {
    name: "TouchC",
    pointerType: "touch"
  }
];

// ../node_modules/@testing-library/user-event/dist/esm/system/pointer/buttons.js
function _define_property4(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var Buttons = class {
  getButtons() {
    let v2 = 0;
    for (let button of Object.keys(this.pressed))
      v2 |= 2 ** Number(button);
    return v2;
  }
  down(keyDef) {
    let button = getMouseButtonId(keyDef.button);
    if (button in this.pressed) {
      this.pressed[button].push(keyDef);
      return;
    }
    return this.pressed[button] = [
      keyDef
    ], button;
  }
  up(keyDef) {
    let button = getMouseButtonId(keyDef.button);
    if (button in this.pressed && (this.pressed[button] = this.pressed[button].filter((k2) => k2.name !== keyDef.name), this.pressed[button].length === 0))
      return delete this.pressed[button], button;
  }
  constructor() {
    _define_property4(this, "pressed", {});
  }
}, MouseButton = {
  primary: 0,
  secondary: 1,
  auxiliary: 2,
  back: 3,
  X1: 3,
  forward: 4,
  X2: 4
};
function getMouseButtonId(button = 0) {
  return button in MouseButton ? MouseButton[button] : Number(button);
}
var MouseButtonFlip = {
  1: 2,
  2: 1
};
function getMouseEventButton(button) {
  return button = getMouseButtonId(button), button in MouseButtonFlip ? MouseButtonFlip[button] : button;
}

// ../node_modules/@testing-library/user-event/dist/esm/system/pointer/device.js
function _define_property5(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var Device = class {
  get countPressed() {
    return this.pressedKeys.size;
  }
  isPressed(keyDef) {
    return this.pressedKeys.has(keyDef.name);
  }
  addPressed(keyDef) {
    return this.pressedKeys.add(keyDef.name);
  }
  removePressed(keyDef) {
    return this.pressedKeys.delete(keyDef.name);
  }
  constructor() {
    _define_property5(this, "pressedKeys", /* @__PURE__ */ new Set());
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/utils/misc/getTreeDiff.js
function getTreeDiff(a, b2) {
  let treeA = [];
  for (let el = a; el; el = el.parentElement)
    treeA.push(el);
  let treeB = [];
  for (let el = b2; el; el = el.parentElement)
    treeB.push(el);
  let i2 = 0;
  for (; !(i2 >= treeA.length || i2 >= treeB.length || treeA[treeA.length - 1 - i2] !== treeB[treeB.length - 1 - i2]); i2++)
    ;
  return [
    treeA.slice(0, treeA.length - i2),
    treeB.slice(0, treeB.length - i2),
    treeB.slice(treeB.length - i2)
  ];
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/resolveCaretPosition.js
function resolveCaretPosition({ target, node, offset }) {
  return hasOwnSelection(target) ? {
    node: target,
    offset: offset ?? getUIValue(target).length
  } : node ? {
    node,
    offset: offset ?? (node.nodeType === 3 ? node.nodeValue.length : node.childNodes.length)
  } : findNodeAtTextOffset(target, offset);
}
function findNodeAtTextOffset(node, offset, isRoot = !0) {
  let i2 = offset === void 0 ? node.childNodes.length - 1 : 0, step = offset === void 0 ? -1 : 1;
  for (; offset === void 0 ? i2 >= (isRoot ? Math.max(node.childNodes.length - 1, 0) : 0) : i2 <= node.childNodes.length; ) {
    if (offset && i2 === node.childNodes.length)
      throw new Error("The given offset is out of bounds.");
    let c2 = node.childNodes.item(i2), text = String(c2.textContent);
    if (text.length)
      if (offset !== void 0 && text.length < offset)
        offset -= text.length;
      else {
        if (c2.nodeType === 1)
          return findNodeAtTextOffset(c2, offset, !1);
        if (c2.nodeType === 3)
          return {
            node: c2,
            offset: offset ?? c2.nodeValue.length
          };
      }
    i2 += step;
  }
  return {
    node,
    offset: node.childNodes.length
  };
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/setSelectionPerMouse.js
function setSelectionPerMouseDown({ document: document2, target, clickCount, node, offset }) {
  if (hasNoSelection(target))
    return;
  let targetHasOwnSelection = hasOwnSelection(target), text = String(targetHasOwnSelection ? getUIValue(target) : target.textContent), [start, end] = node ? (
    // which elements might be considered in the same line of text.
    // TODO: support expanding initial range on multiple clicks if node is given
    [
      offset,
      offset
    ]
  ) : getTextRange(text, offset, clickCount);
  if (targetHasOwnSelection)
    return setUISelection(target, {
      anchorOffset: start ?? text.length,
      focusOffset: end ?? text.length
    }), {
      node: target,
      start: start ?? 0,
      end: end ?? text.length
    };
  {
    let { node: startNode, offset: startOffset } = resolveCaretPosition({
      target,
      node,
      offset: start
    }), { node: endNode, offset: endOffset } = resolveCaretPosition({
      target,
      node,
      offset: end
    }), range = target.ownerDocument.createRange();
    try {
      range.setStart(startNode, startOffset), range.setEnd(endNode, endOffset);
    } catch {
      throw new Error("The given offset is out of bounds.");
    }
    let selection = document2.getSelection();
    return selection?.removeAllRanges(), selection?.addRange(range.cloneRange()), range;
  }
}
function getTextRange(text, pos, clickCount) {
  if (clickCount % 3 === 1 || text.length === 0)
    return [
      pos,
      pos
    ];
  let textPos = pos ?? text.length;
  return clickCount % 3 === 2 ? [
    textPos - text.substr(0, pos).match(/(\w+|\s+|\W)?$/)[0].length,
    pos === void 0 ? pos : pos + text.substr(pos).match(/^(\w+|\s+|\W)?/)[0].length
  ] : [
    textPos - text.substr(0, pos).match(/[^\r\n]*$/)[0].length,
    pos === void 0 ? pos : pos + text.substr(pos).match(/^[^\r\n]*/)[0].length
  ];
}

// ../node_modules/@testing-library/user-event/dist/esm/event/selection/modifySelectionPerMouse.js
function modifySelectionPerMouseMove(selectionRange, { document: document2, target, node, offset }) {
  let selectionFocus = resolveCaretPosition({
    target,
    node,
    offset
  });
  if ("node" in selectionRange) {
    if (selectionFocus.node === selectionRange.node) {
      let anchorOffset = selectionFocus.offset < selectionRange.start ? selectionRange.end : selectionRange.start, focusOffset = selectionFocus.offset > selectionRange.end || selectionFocus.offset < selectionRange.start ? selectionFocus.offset : selectionRange.end;
      setUISelection(selectionRange.node, {
        anchorOffset,
        focusOffset
      });
    }
  } else {
    let range = selectionRange.cloneRange(), cmp = range.comparePoint(selectionFocus.node, selectionFocus.offset);
    cmp < 0 ? range.setStart(selectionFocus.node, selectionFocus.offset) : cmp > 0 && range.setEnd(selectionFocus.node, selectionFocus.offset);
    let selection = document2.getSelection();
    selection?.removeAllRanges(), selection?.addRange(range.cloneRange());
  }
}

// ../node_modules/@testing-library/user-event/dist/esm/system/pointer/shared.js
function isDifferentPointerPosition(positionA, positionB) {
  var _positionA_coords, _positionB_coords, _positionA_coords1, _positionB_coords1, _positionA_coords2, _positionB_coords2, _positionA_coords3, _positionB_coords3, _positionA_coords4, _positionB_coords4, _positionA_coords5, _positionB_coords5, _positionA_coords6, _positionB_coords6, _positionA_coords7, _positionB_coords7, _positionA_coords8, _positionB_coords8, _positionA_coords9, _positionB_coords9, _positionA_caret, _positionB_caret, _positionA_caret1, _positionB_caret1;
  return positionA.target !== positionB.target || ((_positionA_coords = positionA.coords) === null || _positionA_coords === void 0 ? void 0 : _positionA_coords.x) !== ((_positionB_coords = positionB.coords) === null || _positionB_coords === void 0 ? void 0 : _positionB_coords.x) || ((_positionA_coords1 = positionA.coords) === null || _positionA_coords1 === void 0 ? void 0 : _positionA_coords1.y) !== ((_positionB_coords1 = positionB.coords) === null || _positionB_coords1 === void 0 ? void 0 : _positionB_coords1.y) || ((_positionA_coords2 = positionA.coords) === null || _positionA_coords2 === void 0 ? void 0 : _positionA_coords2.clientX) !== ((_positionB_coords2 = positionB.coords) === null || _positionB_coords2 === void 0 ? void 0 : _positionB_coords2.clientX) || ((_positionA_coords3 = positionA.coords) === null || _positionA_coords3 === void 0 ? void 0 : _positionA_coords3.clientY) !== ((_positionB_coords3 = positionB.coords) === null || _positionB_coords3 === void 0 ? void 0 : _positionB_coords3.clientY) || ((_positionA_coords4 = positionA.coords) === null || _positionA_coords4 === void 0 ? void 0 : _positionA_coords4.offsetX) !== ((_positionB_coords4 = positionB.coords) === null || _positionB_coords4 === void 0 ? void 0 : _positionB_coords4.offsetX) || ((_positionA_coords5 = positionA.coords) === null || _positionA_coords5 === void 0 ? void 0 : _positionA_coords5.offsetY) !== ((_positionB_coords5 = positionB.coords) === null || _positionB_coords5 === void 0 ? void 0 : _positionB_coords5.offsetY) || ((_positionA_coords6 = positionA.coords) === null || _positionA_coords6 === void 0 ? void 0 : _positionA_coords6.pageX) !== ((_positionB_coords6 = positionB.coords) === null || _positionB_coords6 === void 0 ? void 0 : _positionB_coords6.pageX) || ((_positionA_coords7 = positionA.coords) === null || _positionA_coords7 === void 0 ? void 0 : _positionA_coords7.pageY) !== ((_positionB_coords7 = positionB.coords) === null || _positionB_coords7 === void 0 ? void 0 : _positionB_coords7.pageY) || ((_positionA_coords8 = positionA.coords) === null || _positionA_coords8 === void 0 ? void 0 : _positionA_coords8.screenX) !== ((_positionB_coords8 = positionB.coords) === null || _positionB_coords8 === void 0 ? void 0 : _positionB_coords8.screenX) || ((_positionA_coords9 = positionA.coords) === null || _positionA_coords9 === void 0 ? void 0 : _positionA_coords9.screenY) !== ((_positionB_coords9 = positionB.coords) === null || _positionB_coords9 === void 0 ? void 0 : _positionB_coords9.screenY) || ((_positionA_caret = positionA.caret) === null || _positionA_caret === void 0 ? void 0 : _positionA_caret.node) !== ((_positionB_caret = positionB.caret) === null || _positionB_caret === void 0 ? void 0 : _positionB_caret.node) || ((_positionA_caret1 = positionA.caret) === null || _positionA_caret1 === void 0 ? void 0 : _positionA_caret1.offset) !== ((_positionB_caret1 = positionB.caret) === null || _positionB_caret1 === void 0 ? void 0 : _positionB_caret1.offset);
}

// ../node_modules/@testing-library/user-event/dist/esm/system/pointer/mouse.js
function _define_property6(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var Mouse = class {
  move(instance, position, isPrevented) {
    let prevPosition = this.position, prevTarget = this.getTarget(instance);
    if (this.position = position, !isDifferentPointerPosition(prevPosition, position))
      return;
    let nextTarget = this.getTarget(instance), init = this.getEventInit("mousemove"), [leave, enter] = getTreeDiff(prevTarget, nextTarget);
    return {
      leave: () => {
        prevTarget !== nextTarget && (instance.dispatchUIEvent(prevTarget, "mouseout", init), leave.forEach((el) => instance.dispatchUIEvent(el, "mouseleave", init)));
      },
      enter: () => {
        prevTarget !== nextTarget && (instance.dispatchUIEvent(nextTarget, "mouseover", init), enter.forEach((el) => instance.dispatchUIEvent(el, "mouseenter", init)));
      },
      move: () => {
        isPrevented || (instance.dispatchUIEvent(nextTarget, "mousemove", init), this.modifySelecting(instance));
      }
    };
  }
  down(instance, keyDef, isPrevented) {
    let button = this.buttons.down(keyDef);
    if (button === void 0)
      return;
    let target = this.getTarget(instance);
    this.buttonDownTarget[button] = target;
    let init = this.getEventInit("mousedown", keyDef.button), disabled = isDisabled2(target);
    !isPrevented && (disabled || instance.dispatchUIEvent(target, "mousedown", init)) && (this.startSelecting(instance, init.detail), focusElement(target)), !disabled && getMouseEventButton(keyDef.button) === 2 && instance.dispatchUIEvent(target, "contextmenu", this.getEventInit("contextmenu", keyDef.button));
  }
  up(instance, keyDef, isPrevented) {
    let button = this.buttons.up(keyDef);
    if (button === void 0)
      return;
    let target = this.getTarget(instance);
    if (!isDisabled2(target)) {
      if (!isPrevented) {
        let mouseUpInit = this.getEventInit("mouseup", keyDef.button);
        instance.dispatchUIEvent(target, "mouseup", mouseUpInit), this.endSelecting();
      }
      let clickTarget = getTreeDiff(this.buttonDownTarget[button], target)[2][0];
      if (clickTarget) {
        let init = this.getEventInit("click", keyDef.button);
        init.detail && (instance.dispatchUIEvent(clickTarget, init.button === 0 ? "click" : "auxclick", init), init.button === 0 && init.detail === 2 && instance.dispatchUIEvent(clickTarget, "dblclick", {
          ...this.getEventInit("dblclick", keyDef.button),
          detail: init.detail
        }));
      }
    }
  }
  resetClickCount() {
    this.clickCount.reset();
  }
  getEventInit(type5, button) {
    let init = {
      ...this.position.coords
    };
    return init.button = getMouseEventButton(button), init.buttons = this.buttons.getButtons(), type5 === "mousedown" ? init.detail = this.clickCount.getOnDown(init.button) : type5 === "mouseup" ? init.detail = this.clickCount.getOnUp(init.button) : (type5 === "click" || type5 === "auxclick") && (init.detail = this.clickCount.incOnClick(init.button)), init;
  }
  getTarget(instance) {
    var _this_position_target;
    return (_this_position_target = this.position.target) !== null && _this_position_target !== void 0 ? _this_position_target : instance.config.document.body;
  }
  startSelecting(instance, clickCount) {
    var _this_position_caret, _this_position_caret1;
    this.selecting = setSelectionPerMouseDown({
      document: instance.config.document,
      target: this.getTarget(instance),
      node: (_this_position_caret = this.position.caret) === null || _this_position_caret === void 0 ? void 0 : _this_position_caret.node,
      offset: (_this_position_caret1 = this.position.caret) === null || _this_position_caret1 === void 0 ? void 0 : _this_position_caret1.offset,
      clickCount
    });
  }
  modifySelecting(instance) {
    var _this_position_caret, _this_position_caret1;
    this.selecting && modifySelectionPerMouseMove(this.selecting, {
      document: instance.config.document,
      target: this.getTarget(instance),
      node: (_this_position_caret = this.position.caret) === null || _this_position_caret === void 0 ? void 0 : _this_position_caret.node,
      offset: (_this_position_caret1 = this.position.caret) === null || _this_position_caret1 === void 0 ? void 0 : _this_position_caret1.offset
    });
  }
  endSelecting() {
    this.selecting = void 0;
  }
  constructor() {
    _define_property6(this, "position", {}), _define_property6(this, "buttons", new Buttons()), _define_property6(this, "selecting", void 0), _define_property6(this, "buttonDownTarget", {}), _define_property6(this, "clickCount", new class {
      incOnClick(button) {
        let current = this.down[button] === void 0 ? void 0 : Number(this.down[button]) + 1;
        return this.count = this.count[button] === void 0 ? {} : {
          [button]: Number(this.count[button]) + 1
        }, current;
      }
      getOnDown(button) {
        var _this_count_button;
        this.down = {
          [button]: (_this_count_button = this.count[button]) !== null && _this_count_button !== void 0 ? _this_count_button : 0
        };
        var _this_count_button1;
        return this.count = {
          [button]: (_this_count_button1 = this.count[button]) !== null && _this_count_button1 !== void 0 ? _this_count_button1 : 0
        }, Number(this.count[button]) + 1;
      }
      getOnUp(button) {
        return this.down[button] === void 0 ? void 0 : Number(this.down[button]) + 1;
      }
      reset() {
        this.count = {};
      }
      constructor() {
        _define_property6(this, "down", {}), _define_property6(this, "count", {});
      }
    }());
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/utils/pointer/cssPointerEvents.js
function hasPointerEvents(instance, element) {
  var _checkPointerEvents;
  return ((_checkPointerEvents = checkPointerEvents(instance, element)) === null || _checkPointerEvents === void 0 ? void 0 : _checkPointerEvents.pointerEvents) !== "none";
}
function closestPointerEventsDeclaration(element) {
  let window2 = getWindow(element);
  for (let el = element, tree = []; el?.ownerDocument; el = el.parentElement) {
    tree.push(el);
    let pointerEvents = window2.getComputedStyle(el).pointerEvents;
    if (pointerEvents && ![
      "inherit",
      "unset"
    ].includes(pointerEvents))
      return {
        pointerEvents,
        tree
      };
  }
}
var PointerEventsCheck = Symbol("Last check for pointer-events");
function checkPointerEvents(instance, element) {
  let lastCheck = element[PointerEventsCheck];
  if (!(instance.config.pointerEventsCheck !== PointerEventsCheckLevel.Never && (!lastCheck || hasBitFlag(instance.config.pointerEventsCheck, PointerEventsCheckLevel.EachApiCall) && lastCheck[ApiLevel.Call] !== getLevelRef(instance, ApiLevel.Call) || hasBitFlag(instance.config.pointerEventsCheck, PointerEventsCheckLevel.EachTrigger) && lastCheck[ApiLevel.Trigger] !== getLevelRef(instance, ApiLevel.Trigger))))
    return lastCheck?.result;
  let declaration = closestPointerEventsDeclaration(element);
  return element[PointerEventsCheck] = {
    [ApiLevel.Call]: getLevelRef(instance, ApiLevel.Call),
    [ApiLevel.Trigger]: getLevelRef(instance, ApiLevel.Trigger),
    result: declaration
  }, declaration;
}
function assertPointerEvents(instance, element) {
  let declaration = checkPointerEvents(instance, element);
  if (declaration?.pointerEvents === "none")
    throw new Error([
      `Unable to perform pointer interaction as the element ${declaration.tree.length > 1 ? "inherits" : "has"} \`pointer-events: none\`:`,
      "",
      printTree(declaration.tree)
    ].join(`
`));
}
function printTree(tree) {
  return tree.reverse().map((el, i2) => [
    "".padEnd(i2),
    el.tagName,
    el.id && `#${el.id}`,
    el.hasAttribute("data-testid") && `(testId=${el.getAttribute("data-testid")})`,
    getLabelDescr(el),
    tree.length > 1 && i2 === 0 && "  <-- This element declared `pointer-events: none`",
    tree.length > 1 && i2 === tree.length - 1 && "  <-- Asserted pointer events here"
  ].filter(Boolean).join("")).join(`
`);
}
function getLabelDescr(element) {
  var _element_labels;
  let label;
  if (element.hasAttribute("aria-label"))
    label = element.getAttribute("aria-label");
  else if (element.hasAttribute("aria-labelledby")) {
    var _element_ownerDocument_getElementById_textContent, _element_ownerDocument_getElementById;
    label = (_element_ownerDocument_getElementById = element.ownerDocument.getElementById(element.getAttribute("aria-labelledby"))) === null || _element_ownerDocument_getElementById === void 0 || (_element_ownerDocument_getElementById_textContent = _element_ownerDocument_getElementById.textContent) === null || _element_ownerDocument_getElementById_textContent === void 0 ? void 0 : _element_ownerDocument_getElementById_textContent.trim();
  } else if (isElementType(element, [
    "button",
    "input",
    "meter",
    "output",
    "progress",
    "select",
    "textarea"
  ]) && (!((_element_labels = element.labels) === null || _element_labels === void 0) && _element_labels.length))
    label = Array.from(element.labels).map((el) => {
      var _el_textContent;
      return (_el_textContent = el.textContent) === null || _el_textContent === void 0 ? void 0 : _el_textContent.trim();
    }).join("|");
  else if (isElementType(element, "button")) {
    var _element_textContent;
    label = (_element_textContent = element.textContent) === null || _element_textContent === void 0 ? void 0 : _element_textContent.trim();
  }
  return label = label?.replace(/\n/g, "  "), Number(label?.length) > 30 && (label = `${label?.substring(0, 29)}\u2026`), label ? `(label=${label})` : "";
}
function hasBitFlag(conf, flag3) {
  return (conf & flag3) > 0;
}

// ../node_modules/@testing-library/user-event/dist/esm/system/pointer/pointer.js
function _define_property7(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var Pointer = class {
  init(instance) {
    let target = this.getTarget(instance), [, enter] = getTreeDiff(null, target), init = this.getEventInit();
    return assertPointerEvents(instance, target), instance.dispatchUIEvent(target, "pointerover", init), enter.forEach((el) => instance.dispatchUIEvent(el, "pointerenter", init)), this;
  }
  move(instance, position) {
    let prevPosition = this.position, prevTarget = this.getTarget(instance);
    if (this.position = position, !isDifferentPointerPosition(prevPosition, position))
      return;
    let nextTarget = this.getTarget(instance), init = this.getEventInit(-1), [leave, enter] = getTreeDiff(prevTarget, nextTarget);
    return {
      leave: () => {
        hasPointerEvents(instance, prevTarget) && prevTarget !== nextTarget && (instance.dispatchUIEvent(prevTarget, "pointerout", init), leave.forEach((el) => instance.dispatchUIEvent(el, "pointerleave", init)));
      },
      enter: () => {
        assertPointerEvents(instance, nextTarget), prevTarget !== nextTarget && (instance.dispatchUIEvent(nextTarget, "pointerover", init), enter.forEach((el) => instance.dispatchUIEvent(el, "pointerenter", init)));
      },
      move: () => {
        instance.dispatchUIEvent(nextTarget, "pointermove", init);
      }
    };
  }
  down(instance, button = 0) {
    if (this.isDown)
      return;
    let target = this.getTarget(instance);
    assertPointerEvents(instance, target), this.isDown = !0, this.isPrevented = !instance.dispatchUIEvent(target, "pointerdown", this.getEventInit(button));
  }
  up(instance, button = 0) {
    if (!this.isDown)
      return;
    let target = this.getTarget(instance);
    assertPointerEvents(instance, target), this.isPrevented = !1, this.isDown = !1, instance.dispatchUIEvent(target, "pointerup", this.getEventInit(button));
  }
  release(instance) {
    let target = this.getTarget(instance), [leave] = getTreeDiff(target, null), init = this.getEventInit();
    hasPointerEvents(instance, target) && (instance.dispatchUIEvent(target, "pointerout", init), leave.forEach((el) => instance.dispatchUIEvent(el, "pointerleave", init))), this.isCancelled = !0;
  }
  getTarget(instance) {
    var _this_position_target;
    return (_this_position_target = this.position.target) !== null && _this_position_target !== void 0 ? _this_position_target : instance.config.document.body;
  }
  getEventInit(button) {
    return {
      ...this.position.coords,
      pointerId: this.pointerId,
      pointerType: this.pointerType,
      isPrimary: this.isPrimary,
      button: getMouseEventButton(button),
      buttons: this.buttons.getButtons()
    };
  }
  constructor({ pointerId, pointerType, isPrimary }, buttons) {
    _define_property7(this, "pointerId", void 0), _define_property7(this, "pointerType", void 0), _define_property7(this, "isPrimary", void 0), _define_property7(this, "buttons", void 0), _define_property7(this, "isMultitouch", !1), _define_property7(this, "isCancelled", !1), _define_property7(this, "isDown", !1), _define_property7(this, "isPrevented", !1), _define_property7(this, "position", {}), this.pointerId = pointerId, this.pointerType = pointerType, this.isPrimary = isPrimary, this.isMultitouch = !isPrimary, this.buttons = buttons;
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/system/pointer/index.js
function _define_property8(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var PointerHost = class {
  isKeyPressed(keyDef) {
    return this.devices.get(keyDef.pointerType).isPressed(keyDef);
  }
  async press(instance, keyDef, position) {
    this.devices.get(keyDef.pointerType).addPressed(keyDef), this.buttons.down(keyDef);
    let pointerName = this.getPointerName(keyDef), pointer3 = keyDef.pointerType === "touch" ? this.pointers.new(pointerName, keyDef.pointerType, this.buttons) : this.pointers.get(pointerName);
    pointer3.position = position, pointer3.pointerType !== "touch" && (this.mouse.position = position), pointer3.pointerType === "touch" && pointer3.init(instance), pointer3.down(instance, keyDef.button), pointer3.pointerType !== "touch" && this.mouse.down(instance, keyDef, pointer3.isPrevented);
  }
  async move(instance, pointerName, position) {
    let pointer3 = this.pointers.get(pointerName), pointermove = pointer3.move(instance, position), mousemove = pointer3.pointerType === "touch" ? void 0 : this.mouse.move(instance, position, pointer3.isPrevented);
    pointermove?.leave(), mousemove?.leave(), pointermove?.enter(), mousemove?.enter(), pointermove?.move(), mousemove?.move();
  }
  async release(instance, keyDef, position) {
    let device = this.devices.get(keyDef.pointerType);
    device.removePressed(keyDef), this.buttons.up(keyDef);
    let pointer3 = this.pointers.get(this.getPointerName(keyDef)), isPrevented = pointer3.isPrevented;
    if (pointer3.position = position, pointer3.pointerType !== "touch" && (this.mouse.position = position), device.countPressed === 0 && pointer3.up(instance, keyDef.button), pointer3.pointerType === "touch" && pointer3.release(instance), pointer3.pointerType === "touch" && !pointer3.isMultitouch) {
      let mousemove = this.mouse.move(instance, position, isPrevented);
      mousemove?.leave(), mousemove?.enter(), mousemove?.move(), this.mouse.down(instance, keyDef, isPrevented);
    }
    if (!pointer3.isMultitouch) {
      let mousemove = this.mouse.move(instance, position, isPrevented);
      mousemove?.leave(), mousemove?.enter(), mousemove?.move(), this.mouse.up(instance, keyDef, isPrevented);
    }
  }
  getPointerName(keyDef) {
    return keyDef.pointerType === "touch" ? keyDef.name : keyDef.pointerType;
  }
  getPreviousPosition(pointerName) {
    return this.pointers.has(pointerName) ? this.pointers.get(pointerName).position : void 0;
  }
  resetClickCount() {
    this.mouse.resetClickCount();
  }
  getMouseTarget(instance) {
    var _this_mouse_position_target;
    return (_this_mouse_position_target = this.mouse.position.target) !== null && _this_mouse_position_target !== void 0 ? _this_mouse_position_target : instance.config.document.body;
  }
  setMousePosition(position) {
    this.mouse.position = position, this.pointers.get("mouse").position = position;
  }
  constructor(system) {
    _define_property8(this, "system", void 0), _define_property8(this, "mouse", void 0), _define_property8(this, "buttons", void 0), _define_property8(this, "devices", new class {
      get(k2) {
        var _this_registry, _k, _;
        return (_ = (_this_registry = this.registry)[_k = k2]) !== null && _ !== void 0 ? _ : _this_registry[_k] = new Device();
      }
      constructor() {
        _define_property8(this, "registry", {});
      }
    }()), _define_property8(this, "pointers", new class {
      new(pointerName, pointerType, buttons) {
        let isPrimary = pointerType !== "touch" || !Object.values(this.registry).some((p) => p.pointerType === "touch" && !p.isCancelled);
        return isPrimary || Object.values(this.registry).forEach((p) => {
          p.pointerType === pointerType && !p.isCancelled && (p.isMultitouch = !0);
        }), this.registry[pointerName] = new Pointer({
          pointerId: this.nextId++,
          pointerType,
          isPrimary
        }, buttons), this.registry[pointerName];
      }
      get(pointerName) {
        if (!this.has(pointerName))
          throw new Error(`Trying to access pointer "${pointerName}" which does not exist.`);
        return this.registry[pointerName];
      }
      has(pointerName) {
        return pointerName in this.registry;
      }
      constructor() {
        _define_property8(this, "registry", {}), _define_property8(this, "nextId", 1);
      }
    }()), this.system = system, this.buttons = new Buttons(), this.mouse = new Mouse(), this.pointers.new("mouse", "mouse", this.buttons);
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/system/index.js
function _define_property9(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
var System = class {
  getUIEventModifiers() {
    return {
      altKey: this.keyboard.modifiers.Alt,
      ctrlKey: this.keyboard.modifiers.Control,
      metaKey: this.keyboard.modifiers.Meta,
      shiftKey: this.keyboard.modifiers.Shift,
      modifierAltGraph: this.keyboard.modifiers.AltGraph,
      modifierCapsLock: this.keyboard.modifiers.CapsLock,
      modifierFn: this.keyboard.modifiers.Fn,
      modifierFnLock: this.keyboard.modifiers.FnLock,
      modifierNumLock: this.keyboard.modifiers.NumLock,
      modifierScrollLock: this.keyboard.modifiers.ScrollLock,
      modifierSymbol: this.keyboard.modifiers.Symbol,
      modifierSymbolLock: this.keyboard.modifiers.SymbolLock
    };
  }
  constructor() {
    _define_property9(this, "keyboard", new KeyboardHost(this)), _define_property9(this, "pointer", new PointerHost(this));
  }
};

// ../node_modules/@testing-library/user-event/dist/esm/convenience/click.js
async function click(element) {
  let pointerIn = [];
  return this.config.skipHover || pointerIn.push({
    target: element
  }), pointerIn.push({
    keys: "[MouseLeft]",
    target: element
  }), this.pointer(pointerIn);
}
async function dblClick(element) {
  return this.pointer([
    {
      target: element
    },
    "[MouseLeft][MouseLeft]"
  ]);
}
async function tripleClick(element) {
  return this.pointer([
    {
      target: element
    },
    "[MouseLeft][MouseLeft][MouseLeft]"
  ]);
}

// ../node_modules/@testing-library/user-event/dist/esm/convenience/hover.js
async function hover(element) {
  return this.pointer({
    target: element
  });
}
async function unhover(element) {
  return assertPointerEvents(this, this.system.pointer.getMouseTarget(this)), this.pointer({
    target: element.ownerDocument.body
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/convenience/tab.js
async function tab({ shift } = {}) {
  return this.keyboard(shift === !0 ? "{Shift>}{Tab}{/Shift}" : shift === !1 ? "[/ShiftLeft][/ShiftRight]{Tab}" : "{Tab}");
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/keyDef/readNextDescriptor.js
var bracketDict = (function(bracketDict2) {
  return bracketDict2["{"] = "}", bracketDict2["["] = "]", bracketDict2;
})(bracketDict || {});
function readNextDescriptor(text, context) {
  let pos = 0, startBracket = text[pos] in bracketDict ? text[pos] : "";
  pos += startBracket.length;
  let type5 = new RegExp(`^\\${startBracket}{2}`).test(text) ? "" : startBracket;
  return {
    type: type5,
    ...type5 === "" ? readPrintableChar(text, pos, context) : readTag(text, pos, type5, context)
  };
}
function readPrintableChar(text, pos, context) {
  let descriptor = text[pos];
  return assertDescriptor(descriptor, text, pos, context), pos += descriptor.length, {
    consumedLength: pos,
    descriptor,
    releasePrevious: !1,
    releaseSelf: !0,
    repeat: 1
  };
}
function readTag(text, pos, startBracket, context) {
  var _text_slice_match, _text_slice_match1;
  let releasePreviousModifier = text[pos] === "/" ? "/" : "";
  pos += releasePreviousModifier.length;
  let escapedDescriptor = startBracket === "{" && text[pos] === "\\";
  pos += Number(escapedDescriptor);
  let descriptor = escapedDescriptor ? text[pos] : (_text_slice_match = text.slice(pos).match(startBracket === "{" ? /^\w+|^[^}>/]/ : /^\w+/)) === null || _text_slice_match === void 0 ? void 0 : _text_slice_match[0];
  assertDescriptor(descriptor, text, pos, context), pos += descriptor.length;
  var _text_slice_match_;
  let repeatModifier = (_text_slice_match_ = (_text_slice_match1 = text.slice(pos).match(/^>\d+/)) === null || _text_slice_match1 === void 0 ? void 0 : _text_slice_match1[0]) !== null && _text_slice_match_ !== void 0 ? _text_slice_match_ : "";
  pos += repeatModifier.length;
  let releaseSelfModifier = text[pos] === "/" || !repeatModifier && text[pos] === ">" ? text[pos] : "";
  pos += releaseSelfModifier.length;
  let expectedEndBracket = bracketDict[startBracket], endBracket = text[pos] === expectedEndBracket ? expectedEndBracket : "";
  if (!endBracket)
    throw new Error(getErrorMessage([
      !repeatModifier && "repeat modifier",
      !releaseSelfModifier && "release modifier",
      `"${expectedEndBracket}"`
    ].filter(Boolean).join(" or "), text[pos], text, context));
  return pos += endBracket.length, {
    consumedLength: pos,
    descriptor,
    releasePrevious: !!releasePreviousModifier,
    repeat: repeatModifier ? Math.max(Number(repeatModifier.substr(1)), 1) : 1,
    releaseSelf: hasReleaseSelf(releaseSelfModifier, repeatModifier)
  };
}
function assertDescriptor(descriptor, text, pos, context) {
  if (!descriptor)
    throw new Error(getErrorMessage("key descriptor", text[pos], text, context));
}
function hasReleaseSelf(releaseSelfModifier, repeatModifier) {
  if (releaseSelfModifier)
    return releaseSelfModifier === "/";
  if (repeatModifier)
    return !1;
}
function getErrorMessage(expected, found, text, context) {
  return `Expected ${expected} but found "${found ?? ""}" in "${text}"
    See ${context === "pointer" ? "https://testing-library.com/docs/user-event/pointer#pressing-a-button-or-touching-the-screen" : "https://testing-library.com/docs/user-event/keyboard"}
    for more information about how userEvent parses your input.`;
}

// ../node_modules/@testing-library/user-event/dist/esm/keyboard/parseKeyDef.js
function parseKeyDef(keyboardMap, text) {
  let defs = [];
  do {
    let { type: type5, descriptor, consumedLength, releasePrevious, releaseSelf = !0, repeat } = readNextDescriptor(text, "keyboard");
    var _keyboardMap_find;
    let keyDef = (_keyboardMap_find = keyboardMap.find((def) => {
      if (type5 === "[") {
        var _def_code;
        return ((_def_code = def.code) === null || _def_code === void 0 ? void 0 : _def_code.toLowerCase()) === descriptor.toLowerCase();
      } else if (type5 === "{") {
        var _def_key;
        return ((_def_key = def.key) === null || _def_key === void 0 ? void 0 : _def_key.toLowerCase()) === descriptor.toLowerCase();
      }
      return def.key === descriptor;
    })) !== null && _keyboardMap_find !== void 0 ? _keyboardMap_find : {
      key: "Unknown",
      code: "Unknown",
      [type5 === "[" ? "code" : "key"]: descriptor
    };
    defs.push({
      keyDef,
      releasePrevious,
      releaseSelf,
      repeat
    }), text = text.slice(consumedLength);
  } while (text);
  return defs;
}

// ../node_modules/@testing-library/user-event/dist/esm/keyboard/index.js
async function keyboard(text) {
  let actions = parseKeyDef(this.config.keyboardMap, text);
  for (let i2 = 0; i2 < actions.length; i2++)
    await wait(this.config), await keyboardAction(this, actions[i2]);
}
async function keyboardAction(instance, { keyDef, releasePrevious, releaseSelf, repeat }) {
  let { system } = instance;
  if (system.keyboard.isKeyPressed(keyDef) && await system.keyboard.keyup(instance, keyDef), !releasePrevious) {
    for (let i2 = 1; i2 <= repeat; i2++)
      await system.keyboard.keydown(instance, keyDef), i2 < repeat && await wait(instance.config);
    releaseSelf && await system.keyboard.keyup(instance, keyDef);
  }
}
async function releaseAllKeys(instance) {
  for (let k2 of instance.system.keyboard.getPressedKeys())
    await instance.system.keyboard.keyup(instance, k2);
}

// ../node_modules/@testing-library/user-event/dist/esm/document/copySelection.js
function copySelection(target) {
  let data = hasOwnSelection(target) ? {
    "text/plain": readSelectedValueFromInput(target)
  } : {
    "text/plain": String(target.ownerDocument.getSelection())
  }, dt = createDataTransfer(getWindow(target));
  for (let type5 in data)
    data[type5] && dt.setData(type5, data[type5]);
  return dt;
}
function readSelectedValueFromInput(target) {
  let sel = getUISelection(target);
  return getUIValue(target).substring(sel.startOffset, sel.endOffset);
}

// ../node_modules/@testing-library/user-event/dist/esm/clipboard/copy.js
async function copy() {
  let doc = this.config.document;
  var _doc_activeElement;
  let target = (_doc_activeElement = doc.activeElement) !== null && _doc_activeElement !== void 0 ? _doc_activeElement : (
    /* istanbul ignore next */
    doc.body
  ), clipboardData = copySelection(target);
  if (clipboardData.items.length !== 0)
    return this.dispatchUIEvent(target, "copy", {
      clipboardData
    }) && this.config.writeToClipboard && await writeDataTransferToClipboard(doc, clipboardData), clipboardData;
}

// ../node_modules/@testing-library/user-event/dist/esm/clipboard/cut.js
async function cut() {
  let doc = this.config.document;
  var _doc_activeElement;
  let target = (_doc_activeElement = doc.activeElement) !== null && _doc_activeElement !== void 0 ? _doc_activeElement : (
    /* istanbul ignore next */
    doc.body
  ), clipboardData = copySelection(target);
  if (clipboardData.items.length !== 0)
    return this.dispatchUIEvent(target, "cut", {
      clipboardData
    }) && this.config.writeToClipboard && await writeDataTransferToClipboard(target.ownerDocument, clipboardData), clipboardData;
}

// ../node_modules/@testing-library/user-event/dist/esm/clipboard/paste.js
async function paste(clipboardData) {
  let doc = this.config.document;
  var _doc_activeElement;
  let target = (_doc_activeElement = doc.activeElement) !== null && _doc_activeElement !== void 0 ? _doc_activeElement : (
    /* istanbul ignore next */
    doc.body
  );
  var _ref;
  let dataTransfer = (_ref = typeof clipboardData == "string" ? getClipboardDataFromString(doc, clipboardData) : clipboardData) !== null && _ref !== void 0 ? _ref : await readDataTransferFromClipboard(doc).catch(() => {
    throw new Error("`userEvent.paste()` without `clipboardData` requires the `ClipboardAPI` to be available.");
  });
  this.dispatchUIEvent(target, "paste", {
    clipboardData: dataTransfer
  });
}
function getClipboardDataFromString(doc, text) {
  let dt = createDataTransfer(getWindow(doc));
  return dt.setData("text", text), dt;
}

// ../node_modules/@testing-library/user-event/dist/esm/pointer/parseKeyDef.js
function parseKeyDef2(pointerMap, keys2) {
  let defs = [];
  do {
    let { descriptor, consumedLength, releasePrevious, releaseSelf = !0 } = readNextDescriptor(keys2, "pointer"), keyDef = pointerMap.find((p) => p.name === descriptor);
    keyDef && defs.push({
      keyDef,
      releasePrevious,
      releaseSelf
    }), keys2 = keys2.slice(consumedLength);
  } while (keys2);
  return defs;
}

// ../node_modules/@testing-library/user-event/dist/esm/pointer/index.js
async function pointer(input2) {
  let { pointerMap } = this.config, actions = [];
  (Array.isArray(input2) ? input2 : [
    input2
  ]).forEach((actionInput) => {
    typeof actionInput == "string" ? actions.push(...parseKeyDef2(pointerMap, actionInput)) : "keys" in actionInput ? actions.push(...parseKeyDef2(pointerMap, actionInput.keys).map((i2) => ({
      ...actionInput,
      ...i2
    }))) : actions.push(actionInput);
  });
  for (let i2 = 0; i2 < actions.length; i2++)
    await wait(this.config), await pointerAction(this, actions[i2]);
  this.system.pointer.resetClickCount();
}
async function pointerAction(instance, action) {
  var _previousPosition_caret, _previousPosition_caret1;
  let pointerName = "pointerName" in action && action.pointerName ? action.pointerName : "keyDef" in action ? instance.system.pointer.getPointerName(action.keyDef) : "mouse", previousPosition = instance.system.pointer.getPreviousPosition(pointerName);
  var _action_target, _action_coords, _action_node, _action_offset;
  let position = {
    target: (_action_target = action.target) !== null && _action_target !== void 0 ? _action_target : getPrevTarget(instance, previousPosition),
    coords: (_action_coords = action.coords) !== null && _action_coords !== void 0 ? _action_coords : previousPosition?.coords,
    caret: {
      node: (_action_node = action.node) !== null && _action_node !== void 0 ? _action_node : hasCaretPosition(action) || previousPosition == null || (_previousPosition_caret = previousPosition.caret) === null || _previousPosition_caret === void 0 ? void 0 : _previousPosition_caret.node,
      offset: (_action_offset = action.offset) !== null && _action_offset !== void 0 ? _action_offset : hasCaretPosition(action) || previousPosition == null || (_previousPosition_caret1 = previousPosition.caret) === null || _previousPosition_caret1 === void 0 ? void 0 : _previousPosition_caret1.offset
    }
  };
  "keyDef" in action ? (instance.system.pointer.isKeyPressed(action.keyDef) && (setLevelRef(instance, ApiLevel.Trigger), await instance.system.pointer.release(instance, action.keyDef, position)), action.releasePrevious || (setLevelRef(instance, ApiLevel.Trigger), await instance.system.pointer.press(instance, action.keyDef, position), action.releaseSelf && (setLevelRef(instance, ApiLevel.Trigger), await instance.system.pointer.release(instance, action.keyDef, position)))) : (setLevelRef(instance, ApiLevel.Trigger), await instance.system.pointer.move(instance, pointerName, position));
}
function hasCaretPosition(action) {
  var _action_target, _ref;
  return !!((_ref = (_action_target = action.target) !== null && _action_target !== void 0 ? _action_target : action.node) !== null && _ref !== void 0 ? _ref : action.offset !== void 0);
}
function getPrevTarget(instance, position) {
  if (!position)
    throw new Error("This pointer has no previous position. Provide a target property!");
  var _position_target;
  return (_position_target = position.target) !== null && _position_target !== void 0 ? _position_target : instance.config.document.body;
}

// ../node_modules/@testing-library/user-event/dist/esm/utility/clear.js
async function clear(element) {
  if (!isEditable(element) || isDisabled2(element))
    throw new Error("clear()` is only supported on editable elements.");
  if (focusElement(element), element.ownerDocument.activeElement !== element)
    throw new Error("The element to be cleared could not be focused.");
  if (selectAll(element), !isAllSelected(element))
    throw new Error("The element content to be cleared could not be selected.");
  input(this, element, "", "deleteContentBackward");
}

// ../node_modules/@testing-library/user-event/dist/esm/utility/selectOptions.js
async function selectOptions(select, values) {
  return selectOptionsBase.call(this, !0, select, values);
}
async function deselectOptions(select, values) {
  return selectOptionsBase.call(this, !1, select, values);
}
async function selectOptionsBase(newValue, select, values) {
  if (!newValue && !select.multiple)
    throw getConfig().getElementError("Unable to deselect an option in a non-multiple select. Use selectOptions to change the selection instead.", select);
  let valArray = Array.isArray(values) ? values : [
    values
  ], allOptions = Array.from(select.querySelectorAll('option, [role="option"]')), selectedOptions = valArray.map((val) => {
    if (typeof val != "string" && allOptions.includes(val))
      return val;
    {
      let matchingOption = allOptions.find((o2) => o2.value === val || o2.innerHTML === val);
      if (matchingOption)
        return matchingOption;
      throw getConfig().getElementError(`Value "${String(val)}" not found in options`, select);
    }
  }).filter((option) => !isDisabled2(option));
  if (isDisabled2(select) || !selectedOptions.length) return;
  let selectOption = (option) => {
    option.selected = newValue, this.dispatchUIEvent(select, "input", {
      bubbles: !0,
      cancelable: !1,
      composed: !0
    }), this.dispatchUIEvent(select, "change");
  };
  if (isElementType(select, "select"))
    if (select.multiple)
      for (let option of selectedOptions) {
        let withPointerEvents = this.config.pointerEventsCheck === 0 ? !0 : hasPointerEvents(this, option);
        withPointerEvents && (this.dispatchUIEvent(option, "pointerover"), this.dispatchUIEvent(select, "pointerenter"), this.dispatchUIEvent(option, "mouseover"), this.dispatchUIEvent(select, "mouseenter"), this.dispatchUIEvent(option, "pointermove"), this.dispatchUIEvent(option, "mousemove"), this.dispatchUIEvent(option, "pointerdown"), this.dispatchUIEvent(option, "mousedown")), focusElement(select), withPointerEvents && (this.dispatchUIEvent(option, "pointerup"), this.dispatchUIEvent(option, "mouseup")), selectOption(option), withPointerEvents && this.dispatchUIEvent(option, "click"), await wait(this.config);
      }
    else if (selectedOptions.length === 1) {
      let withPointerEvents = this.config.pointerEventsCheck === 0 ? !0 : hasPointerEvents(this, select);
      withPointerEvents ? await this.click(select) : focusElement(select), selectOption(selectedOptions[0]), withPointerEvents && (this.dispatchUIEvent(select, "pointerover"), this.dispatchUIEvent(select, "pointerenter"), this.dispatchUIEvent(select, "mouseover"), this.dispatchUIEvent(select, "mouseenter"), this.dispatchUIEvent(select, "pointerup"), this.dispatchUIEvent(select, "mouseup"), this.dispatchUIEvent(select, "click")), await wait(this.config);
    } else
      throw getConfig().getElementError("Cannot select multiple options on a non-multiple select", select);
  else if (select.getAttribute("role") === "listbox")
    for (let option of selectedOptions)
      await this.click(option), await this.unhover(option);
  else
    throw getConfig().getElementError("Cannot select options on elements that are neither select nor listbox elements", select);
}

// ../node_modules/@testing-library/user-event/dist/esm/utility/type.js
async function type3(element, text, { skipClick = this.config.skipClick, skipAutoClose = this.config.skipAutoClose, initialSelectionStart, initialSelectionEnd } = {}) {
  element.disabled || (skipClick || await this.click(element), initialSelectionStart !== void 0 && setSelectionRange(element, initialSelectionStart, initialSelectionEnd ?? initialSelectionStart), await this.keyboard(text), skipAutoClose || await releaseAllKeys(this));
}

// ../node_modules/@testing-library/user-event/dist/esm/utils/edit/setFiles.js
var fakeFiles = Symbol("files and value properties are mocked");
function restoreProperty(obj, prop, descriptor) {
  descriptor ? Object.defineProperty(obj, prop, descriptor) : delete obj[prop];
}
function setFiles(el, files) {
  var _el_fakeFiles;
  (_el_fakeFiles = el[fakeFiles]) === null || _el_fakeFiles === void 0 || _el_fakeFiles.restore();
  let typeDescr = Object.getOwnPropertyDescriptor(el, "type"), valueDescr = Object.getOwnPropertyDescriptor(el, "value"), filesDescr = Object.getOwnPropertyDescriptor(el, "files");
  function restore() {
    restoreProperty(el, "type", typeDescr), restoreProperty(el, "value", valueDescr), restoreProperty(el, "files", filesDescr);
  }
  el[fakeFiles] = {
    restore
  }, Object.defineProperties(el, {
    files: {
      configurable: !0,
      get: () => files
    },
    value: {
      configurable: !0,
      get: () => files.length ? `C:\\fakepath\\${files[0].name}` : "",
      set(v2) {
        if (v2 === "")
          restore();
        else {
          var _valueDescr_set;
          valueDescr == null || (_valueDescr_set = valueDescr.set) === null || _valueDescr_set === void 0 || _valueDescr_set.call(el, v2);
        }
      }
    },
    type: {
      configurable: !0,
      get: () => "file",
      set(v2) {
        v2 !== "file" && (restore(), el.type = v2);
      }
    }
  });
}

// ../node_modules/@testing-library/user-event/dist/esm/utility/upload.js
async function upload(element, fileOrFiles) {
  let input2 = isElementType(element, "label") ? element.control : element;
  if (!input2 || !isElementType(input2, "input", {
    type: "file"
  }))
    throw new TypeError(`The ${input2 === element ? "given" : "associated"} ${input2?.tagName} element does not accept file uploads`);
  if (isDisabled2(element)) return;
  let files = (Array.isArray(fileOrFiles) ? fileOrFiles : [
    fileOrFiles
  ]).filter((file) => !this.config.applyAccept || isAcceptableFile(file, input2.accept)).slice(0, input2.multiple ? void 0 : 1), fileDialog = () => {
    var _input_files;
    files.length === ((_input_files = input2.files) === null || _input_files === void 0 ? void 0 : _input_files.length) && files.every((f3, i2) => {
      var _input_files2;
      return f3 === ((_input_files2 = input2.files) === null || _input_files2 === void 0 ? void 0 : _input_files2.item(i2));
    }) || (setFiles(input2, createFileList(getWindow(element), files)), this.dispatchUIEvent(input2, "input"), this.dispatchUIEvent(input2, "change"));
  };
  input2.addEventListener("fileDialog", fileDialog), await this.click(element), input2.removeEventListener("fileDialog", fileDialog);
}
function normalize3(nameOrType) {
  return nameOrType.toLowerCase().replace(/(\.|\/)jpg\b/g, "$1jpeg");
}
function isAcceptableFile(file, accept) {
  if (!accept)
    return !0;
  let wildcards = [
    "audio/*",
    "image/*",
    "video/*"
  ];
  return normalize3(accept).trim().split(/\s*,\s*/).some((acceptToken) => acceptToken.startsWith(".") ? normalize3(file.name).endsWith(acceptToken) : wildcards.includes(acceptToken) ? normalize3(file.type).startsWith(acceptToken.replace("*", "")) : normalize3(file.type) === acceptToken);
}

// ../node_modules/@testing-library/user-event/dist/esm/setup/api.js
var userEventApi = {
  click,
  dblClick,
  tripleClick,
  hover,
  unhover,
  tab,
  keyboard,
  copy,
  cut,
  paste,
  pointer,
  clear,
  deselectOptions,
  selectOptions,
  type: type3,
  upload
};

// ../node_modules/@testing-library/user-event/dist/esm/setup/wrapAsync.js
function wrapAsync(implementation) {
  return getConfig().asyncWrapper(implementation);
}

// ../node_modules/@testing-library/user-event/dist/esm/setup/setup.js
var defaultOptionsDirect = {
  applyAccept: !0,
  autoModify: !0,
  delay: 0,
  document: globalThis.document,
  keyboardMap: defaultKeyMap,
  pointerMap: defaultKeyMap2,
  pointerEventsCheck: PointerEventsCheckLevel.EachApiCall,
  skipAutoClose: !1,
  skipClick: !1,
  skipHover: !1,
  writeToClipboard: !1,
  advanceTimers: () => Promise.resolve()
}, defaultOptionsSetup = {
  ...defaultOptionsDirect,
  writeToClipboard: !0
};
function createConfig(options = {}, defaults = defaultOptionsSetup, node) {
  let document2 = getDocument2(options, node, defaults);
  return {
    ...defaults,
    ...options,
    document: document2
  };
}
function setupMain(options = {}) {
  let config3 = createConfig(options);
  prepareDocument(config3.document), patchFocus(getWindow(config3.document).HTMLElement);
  var _config_document_defaultView;
  let view = (_config_document_defaultView = config3.document.defaultView) !== null && _config_document_defaultView !== void 0 ? _config_document_defaultView : (
    /* istanbul ignore next */
    globalThis.window
  );
  return attachClipboardStubToView(view), createInstance(config3).api;
}
function setupDirect({ keyboardState, pointerState, ...options } = {}, node) {
  let config3 = createConfig(options, defaultOptionsDirect, node);
  prepareDocument(config3.document), patchFocus(getWindow(config3.document).HTMLElement);
  var _ref;
  let system = (_ref = pointerState ?? keyboardState) !== null && _ref !== void 0 ? _ref : new System();
  return {
    api: createInstance(config3, system).api,
    system
  };
}
function setupSub(options) {
  return createInstance({
    ...this.config,
    ...options
  }, this.system).api;
}
function wrapAndBindImpl(instance, impl) {
  function method(...args) {
    return setLevelRef(instance, ApiLevel.Call), wrapAsync(() => impl.apply(instance, args).then(async (ret) => (await wait(instance.config), ret)));
  }
  return Object.defineProperty(method, "name", {
    get: () => impl.name
  }), method;
}
function createInstance(config3, system = new System()) {
  let instance = {};
  return Object.assign(instance, {
    config: config3,
    dispatchEvent: dispatchEvent.bind(instance),
    dispatchUIEvent: dispatchUIEvent.bind(instance),
    system,
    levelRefs: {},
    ...userEventApi
  }), {
    instance,
    api: {
      ...Object.fromEntries(Object.entries(userEventApi).map(([name, api]) => [
        name,
        wrapAndBindImpl(instance, api)
      ])),
      setup: setupSub.bind(instance)
    }
  };
}
function getDocument2(options, node, defaults) {
  var _options_document, _ref;
  return (_ref = (_options_document = options.document) !== null && _options_document !== void 0 ? _options_document : node && getDocumentFromNode(node)) !== null && _ref !== void 0 ? _ref : defaults.document;
}

// ../node_modules/@testing-library/user-event/dist/esm/setup/directApi.js
var directApi_exports = {};
__export(directApi_exports, {
  clear: () => clear2,
  click: () => click2,
  copy: () => copy2,
  cut: () => cut2,
  dblClick: () => dblClick2,
  deselectOptions: () => deselectOptions2,
  hover: () => hover2,
  keyboard: () => keyboard2,
  paste: () => paste2,
  pointer: () => pointer2,
  selectOptions: () => selectOptions2,
  tab: () => tab2,
  tripleClick: () => tripleClick2,
  type: () => type4,
  unhover: () => unhover2,
  upload: () => upload2
});
function clear2(element) {
  return setupDirect().api.clear(element);
}
function click2(element, options = {}) {
  return setupDirect(options, element).api.click(element);
}
function copy2(options = {}) {
  return setupDirect(options).api.copy();
}
function cut2(options = {}) {
  return setupDirect(options).api.cut();
}
function dblClick2(element, options = {}) {
  return setupDirect(options).api.dblClick(element);
}
function deselectOptions2(select, values, options = {}) {
  return setupDirect(options).api.deselectOptions(select, values);
}
function hover2(element, options = {}) {
  return setupDirect(options).api.hover(element);
}
async function keyboard2(text, options = {}) {
  let { api, system } = setupDirect(options);
  return api.keyboard(text).then(() => system);
}
async function pointer2(input2, options = {}) {
  let { api, system } = setupDirect(options);
  return api.pointer(input2).then(() => system);
}
function paste2(clipboardData, options) {
  return setupDirect(options).api.paste(clipboardData);
}
function selectOptions2(select, values, options = {}) {
  return setupDirect(options).api.selectOptions(select, values);
}
function tripleClick2(element, options = {}) {
  return setupDirect(options).api.tripleClick(element);
}
function type4(element, text, options = {}) {
  return setupDirect(options, element).api.type(element, text, options);
}
function unhover2(element, options = {}) {
  let { api, system } = setupDirect(options);
  return system.pointer.setMousePosition({
    target: element
  }), api.unhover(element);
}
function upload2(element, fileOrFiles, options = {}) {
  return setupDirect(options).api.upload(element, fileOrFiles);
}
function tab2(options = {}) {
  return setupDirect().api.tab(options);
}

// ../node_modules/@testing-library/user-event/dist/esm/setup/index.js
var userEvent = {
  ...directApi_exports,
  setup: setupMain
};

// src/test/testing-library.ts
import { once } from "storybook/internal/client-logger";
import { instrument } from "storybook/internal/instrumenter";
var testingLibrary = instrument(
  { ...dom_esm_exports },
  {
    getKeys: (obj) => Object.keys(obj).filter((key) => key !== "eventWrapper"),
    intercept: (method, path) => path[0] === "fireEvent" || method.startsWith("find") || method.startsWith("waitFor")
  }
);
testingLibrary.screen = new Proxy(testingLibrary.screen, {
  get(target, prop, receiver) {
    return typeof window < "u" && globalThis.location?.href?.includes("viewMode=docs") && once.warn(dedent`
        You are using Testing Library's \`screen\` object while the story is rendered in docs mode. This will likely lead to issues, as multiple stories are rendered in the same page and therefore screen will potentially find multiple elements. Use the \`canvas\` utility from the story context instead, which will scope the queries to each story's canvas.

        More info: https://storybook.js.org/docs/writing-tests/interaction-testing?ref=error#querying-the-canvas
      `), Reflect.get(target, prop, receiver);
  }
});
var {
  buildQueries: buildQueries2,
  configure: configure2,
  createEvent: createEvent3,
  fireEvent: fireEvent2,
  findAllByAltText: findAllByAltText2,
  findAllByDisplayValue: findAllByDisplayValue2,
  findAllByLabelText: findAllByLabelText2,
  findAllByPlaceholderText: findAllByPlaceholderText2,
  findAllByRole: findAllByRole2,
  findAllByTestId: findAllByTestId2,
  findAllByText: findAllByText2,
  findAllByTitle: findAllByTitle2,
  findByAltText: findByAltText2,
  findByDisplayValue: findByDisplayValue2,
  findByLabelText: findByLabelText2,
  findByPlaceholderText: findByPlaceholderText2,
  findByRole: findByRole2,
  findByTestId: findByTestId2,
  findByText: findByText2,
  findByTitle: findByTitle2,
  getAllByAltText: getAllByAltText2,
  getAllByDisplayValue: getAllByDisplayValue2,
  getAllByLabelText: getAllByLabelText2,
  getAllByPlaceholderText: getAllByPlaceholderText2,
  getAllByRole: getAllByRole2,
  getAllByTestId: getAllByTestId2,
  getAllByText: getAllByText2,
  getAllByTitle: getAllByTitle2,
  getByAltText: getByAltText2,
  getByDisplayValue: getByDisplayValue2,
  getByLabelText: getByLabelText2,
  getByPlaceholderText: getByPlaceholderText2,
  getByRole: getByRole2,
  getByTestId: getByTestId2,
  getByText: getByText2,
  getByTitle: getByTitle2,
  getConfig: getConfig2,
  getDefaultNormalizer: getDefaultNormalizer2,
  getElementError: getElementError2,
  getNodeText: getNodeText2,
  getQueriesForElement: getQueriesForElement2,
  getRoles: getRoles2,
  getSuggestedQuery: getSuggestedQuery2,
  isInaccessible: isInaccessible2,
  logDOM: logDOM2,
  logRoles: logRoles2,
  prettyDOM: prettyDOM2,
  queries: queries2,
  queryAllByAltText: queryAllByAltText2,
  queryAllByAttribute: queryAllByAttribute2,
  queryAllByDisplayValue: queryAllByDisplayValue2,
  queryAllByLabelText: queryAllByLabelText2,
  queryAllByPlaceholderText: queryAllByPlaceholderText2,
  queryAllByRole: queryAllByRole2,
  queryAllByTestId: queryAllByTestId2,
  queryAllByText: queryAllByText2,
  queryAllByTitle: queryAllByTitle2,
  queryByAltText: queryByAltText2,
  queryByAttribute: queryByAttribute2,
  queryByDisplayValue: queryByDisplayValue2,
  queryByLabelText: queryByLabelText2,
  queryByPlaceholderText: queryByPlaceholderText2,
  queryByRole: queryByRole2,
  queryByTestId: queryByTestId2,
  queryByText: queryByText2,
  queryByTitle: queryByTitle2,
  queryHelpers: queryHelpers2,
  screen: screen2,
  waitFor: waitFor2,
  waitForElementToBeRemoved: waitForElementToBeRemoved2,
  within,
  prettyFormat: prettyFormat2
} = testingLibrary, uninstrumentedUserEvent = userEvent, { userEvent: userEvent2 } = instrument(
  { userEvent },
  { intercept: !0, getKeys: (obj) => Object.keys(obj).filter((key) => key !== "eventWrapper") }
);

// src/test/index.ts
var { expect: expect3 } = instrument2(
  { expect: expect2 },
  {
    getKeys: (obj, depth) => {
      if ("constructor" in obj && obj.constructor === Assertion) {
        let privateApi = ["assert", "__methods", "__flags", "_obj"], keys2 = Object.keys(Object.getPrototypeOf(obj)).filter(
          (it) => !privateApi.includes(it)
        );
        return depth > 2 ? keys2 : [...keys2, "not"];
      }
      return "any" in obj ? Object.keys(obj).filter((it) => it !== "any") : Object.keys(obj);
    },
    mutate: !0,
    intercept: (method) => method !== "expect"
  }
), sb = {
  mock: () => {
  }
};
export {
  buildQueries2 as buildQueries,
  clearAllMocks,
  configure2 as configure,
  createEvent3 as createEvent,
  expect3 as expect,
  findAllByAltText2 as findAllByAltText,
  findAllByDisplayValue2 as findAllByDisplayValue,
  findAllByLabelText2 as findAllByLabelText,
  findAllByPlaceholderText2 as findAllByPlaceholderText,
  findAllByRole2 as findAllByRole,
  findAllByTestId2 as findAllByTestId,
  findAllByText2 as findAllByText,
  findAllByTitle2 as findAllByTitle,
  findByAltText2 as findByAltText,
  findByDisplayValue2 as findByDisplayValue,
  findByLabelText2 as findByLabelText,
  findByPlaceholderText2 as findByPlaceholderText,
  findByRole2 as findByRole,
  findByTestId2 as findByTestId,
  findByText2 as findByText,
  findByTitle2 as findByTitle,
  fireEvent2 as fireEvent,
  fn2 as fn,
  getAllByAltText2 as getAllByAltText,
  getAllByDisplayValue2 as getAllByDisplayValue,
  getAllByLabelText2 as getAllByLabelText,
  getAllByPlaceholderText2 as getAllByPlaceholderText,
  getAllByRole2 as getAllByRole,
  getAllByTestId2 as getAllByTestId,
  getAllByText2 as getAllByText,
  getAllByTitle2 as getAllByTitle,
  getByAltText2 as getByAltText,
  getByDisplayValue2 as getByDisplayValue,
  getByLabelText2 as getByLabelText,
  getByPlaceholderText2 as getByPlaceholderText,
  getByRole2 as getByRole,
  getByTestId2 as getByTestId,
  getByText2 as getByText,
  getByTitle2 as getByTitle,
  getConfig2 as getConfig,
  getDefaultNormalizer2 as getDefaultNormalizer,
  getElementError2 as getElementError,
  getNodeText2 as getNodeText,
  getQueriesForElement2 as getQueriesForElement,
  getRoles2 as getRoles,
  getSuggestedQuery2 as getSuggestedQuery,
  isInaccessible2 as isInaccessible,
  isMockFunction,
  logDOM2 as logDOM,
  logRoles2 as logRoles,
  mocked,
  mocks,
  onMockCall,
  prettyDOM2 as prettyDOM,
  prettyFormat2 as prettyFormat,
  queries2 as queries,
  queryAllByAltText2 as queryAllByAltText,
  queryAllByAttribute2 as queryAllByAttribute,
  queryAllByDisplayValue2 as queryAllByDisplayValue,
  queryAllByLabelText2 as queryAllByLabelText,
  queryAllByPlaceholderText2 as queryAllByPlaceholderText,
  queryAllByRole2 as queryAllByRole,
  queryAllByTestId2 as queryAllByTestId,
  queryAllByText2 as queryAllByText,
  queryAllByTitle2 as queryAllByTitle,
  queryByAltText2 as queryByAltText,
  queryByAttribute2 as queryByAttribute,
  queryByDisplayValue2 as queryByDisplayValue,
  queryByLabelText2 as queryByLabelText,
  queryByPlaceholderText2 as queryByPlaceholderText,
  queryByRole2 as queryByRole,
  queryByTestId2 as queryByTestId,
  queryByText2 as queryByText,
  queryByTitle2 as queryByTitle,
  queryHelpers2 as queryHelpers,
  resetAllMocks,
  restoreAllMocks,
  sb,
  screen2 as screen,
  spyOn2 as spyOn,
  uninstrumentedUserEvent,
  userEvent2 as userEvent,
  waitFor2 as waitFor,
  waitForElementToBeRemoved2 as waitForElementToBeRemoved,
  within
};
