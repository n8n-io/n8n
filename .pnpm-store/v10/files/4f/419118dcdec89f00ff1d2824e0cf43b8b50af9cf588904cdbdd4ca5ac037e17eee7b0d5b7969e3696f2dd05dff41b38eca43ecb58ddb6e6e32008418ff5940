"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion("^7.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  const {
    types: t,
    template
  } = api;
  function build(left, right) {
    return t.callExpression(t.memberExpression(t.identifier("Math"), t.identifier("pow")), [left, right]);
  }
  function maybeMemoize(node, scope) {
    if (scope.isStatic(node)) {
      return {
        assign: node,
        ref: t.cloneNode(node)
      };
    }
    if (scope.path.isPattern()) {
      return null;
    }
    const id = scope.generateUidIdentifierBasedOnNode(node);
    scope.push({
      id
    });
    return {
      assign: t.assignmentExpression("=", t.cloneNode(id), node),
      ref: t.cloneNode(id)
    };
  }
  return {
    name: "transform-exponentiation-operator",
    visitor: {
      AssignmentExpression(path) {
        const {
          node,
          scope
        } = path;
        if (node.operator !== "**=") return;
        if (t.isMemberExpression(node.left)) {
          let member1;
          let member2;
          const object = maybeMemoize(node.left.object, scope);
          if (!object) {
            path.replaceWith(template.expression.ast`(() => ${path.node})()`);
            return;
          }
          const {
            property,
            computed
          } = node.left;
          if (computed) {
            const prop = maybeMemoize(property, scope);
            member1 = t.memberExpression(object.assign, prop.assign, true);
            member2 = t.memberExpression(object.ref, prop.ref, true);
          } else {
            member1 = t.memberExpression(object.assign, property, false);
            member2 = t.memberExpression(object.ref, t.cloneNode(property), false);
          }
          path.replaceWith(t.assignmentExpression("=", member1, build(member2, node.right)));
        } else {
          path.replaceWith(t.assignmentExpression("=", node.left, build(t.cloneNode(node.left), node.right)));
        }
      },
      BinaryExpression(path) {
        const {
          node
        } = path;
        if (node.operator === "**") {
          path.replaceWith(build(node.left, node.right));
        }
      }
    }
  };
});

//# sourceMappingURL=index.js.map
