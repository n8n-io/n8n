"use strict";

exports.__esModule = true;
exports.default = canSkipPolyfill;
var _babel = _interopRequireWildcard(require("@babel/core"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const {
  types: t
} = _babel.default || _babel;
function canSkipPolyfill(desc, path) {
  const {
    node,
    parent
  } = path;
  switch (desc.name) {
    case "es.string.split":
      {
        if (!t.isCallExpression(parent, {
          callee: node
        })) return false;
        if (parent.arguments.length < 1) return true;
        const splitter = parent.arguments[0];
        return t.isStringLiteral(splitter) || t.isTemplateLiteral(splitter);
      }
  }
}