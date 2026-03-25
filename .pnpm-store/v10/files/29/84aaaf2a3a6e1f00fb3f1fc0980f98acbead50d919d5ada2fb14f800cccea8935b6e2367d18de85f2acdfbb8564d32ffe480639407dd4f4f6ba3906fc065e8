"use strict";

exports.__esModule = true;
exports.BABEL_RUNTIME = void 0;
exports.callMethod = callMethod;
exports.coreJSModule = coreJSModule;
exports.coreJSPureHelper = coreJSPureHelper;
exports.extractOptionalCheck = extractOptionalCheck;
exports.isCoreJSSource = isCoreJSSource;
exports.maybeMemoizeContext = maybeMemoizeContext;
var _babel = _interopRequireWildcard(require("@babel/core"));
var _entries = _interopRequireDefault(require("../core-js-compat/entries.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const {
  types: t
} = _babel.default || _babel;
const BABEL_RUNTIME = exports.BABEL_RUNTIME = "@babel/runtime-corejs3";
function callMethod(path, id, optionalCall, wrapCallee) {
  const [context1, context2] = maybeMemoizeContext(path.node, path.scope);
  let callee = t.callExpression(id, [context1]);
  if (wrapCallee) callee = wrapCallee(callee);
  const call = t.identifier("call");
  path.replaceWith(optionalCall ? t.optionalMemberExpression(callee, call, false, true) : t.memberExpression(callee, call));
  path.parentPath.unshiftContainer("arguments", context2);
}
function maybeMemoizeContext(node, scope) {
  const {
    object
  } = node;
  let context1, context2;
  if (t.isIdentifier(object)) {
    context2 = object;
    context1 = t.cloneNode(object);
  } else {
    context2 = scope.generateDeclaredUidIdentifier("context");
    context1 = t.assignmentExpression("=", t.cloneNode(context2), object);
  }
  return [context1, context2];
}
function extractOptionalCheck(scope, node) {
  let optionalNode = node;
  while (!optionalNode.optional && t.isOptionalMemberExpression(optionalNode.object)) {
    optionalNode = optionalNode.object;
  }
  optionalNode.optional = false;
  const ctx = scope.generateDeclaredUidIdentifier("context");
  const assign = t.assignmentExpression("=", ctx, optionalNode.object);
  optionalNode.object = t.cloneNode(ctx);
  return ifNotNullish => t.conditionalExpression(t.binaryExpression("==", assign, t.nullLiteral()), t.unaryExpression("void", t.numericLiteral(0)), ifNotNullish);
}
function isCoreJSSource(source) {
  if (typeof source === "string") {
    source = source.replace(/\\/g, "/").replace(/(\/(index)?)?(\.js)?$/i, "").toLowerCase();
  }
  return Object.prototype.hasOwnProperty.call(_entries.default, source) && _entries.default[source];
}
function coreJSModule(name) {
  return `core-js/modules/${name}.js`;
}
function coreJSPureHelper(name, useBabelRuntime, ext) {
  return useBabelRuntime ? `${BABEL_RUNTIME}/core-js/${name}${ext}` : `core-js-pure/features/${name}.js`;
}