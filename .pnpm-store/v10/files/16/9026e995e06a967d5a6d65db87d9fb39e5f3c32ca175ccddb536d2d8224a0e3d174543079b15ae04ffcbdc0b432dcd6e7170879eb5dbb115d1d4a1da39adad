"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _traverse = require("@babel/traverse");
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)(({
  types: t,
  assertVersion
}) => {
  assertVersion(7);
  const containsClassExpressionVisitor = {
    ClassExpression(path, state) {
      state.found = true;
      path.stop();
    },
    Function(path) {
      path.skip();
    }
  };
  const containsYieldOrAwaitVisitor = _traverse.visitors.environmentVisitor({
    YieldExpression(path, state) {
      state.yield = true;
      if (state.await) path.stop();
    },
    AwaitExpression(path, state) {
      state.await = true;
      if (state.yield) path.stop();
    }
  });
  function containsClassExpression(path) {
    if (t.isClassExpression(path.node)) return true;
    if (t.isFunction(path.node)) return false;
    const state = {
      found: false
    };
    {
      path.traverse(containsClassExpressionVisitor, state);
    }
    return state.found;
  }
  function wrap(path) {
    const context = {
      yield: t.isYieldExpression(path.node),
      await: t.isAwaitExpression(path.node)
    };
    {
      path.traverse(containsYieldOrAwaitVisitor, context);
    }
    let replacement;
    if (context.yield) {
      const fn = t.functionExpression(null, [], t.blockStatement([t.returnStatement(path.node)]), true, context.await);
      replacement = t.yieldExpression(t.callExpression(t.memberExpression(fn, t.identifier("call")), [t.thisExpression(), t.identifier("arguments")]), true);
    } else {
      const fn = t.arrowFunctionExpression([], path.node, context.await);
      replacement = t.callExpression(fn, []);
      if (context.await) replacement = t.awaitExpression(replacement);
    }
    path.replaceWith(replacement);
  }
  return {
    name: "bugfix-firefox-class-in-computed-class-key",
    visitor: {
      Class(path) {
        const hasPrivateElement = path.node.body.body.some(node => t.isPrivate(node));
        if (!hasPrivateElement) return;
        for (const elem of path.get("body.body")) {
          if ("computed" in elem.node && elem.node.computed && containsClassExpression(elem.get("key"))) {
            wrap(elem.get("key"));
          }
        }
      }
    }
  };
});

//# sourceMappingURL=index.js.map
