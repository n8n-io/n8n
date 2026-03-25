"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
var _helperWrapFunction = require("@babel/helper-wrap-function");
var _helperAnnotateAsPure = require("@babel/helper-annotate-as-pure");
var _core = require("@babel/core");
var _traverse = require("@babel/traverse");
const {
  callExpression,
  cloneNode,
  isIdentifier,
  isThisExpression,
  yieldExpression
} = _core.types;
const awaitVisitor = _traverse.visitors.environmentVisitor({
  ArrowFunctionExpression(path) {
    path.skip();
  },
  AwaitExpression(path, {
    wrapAwait
  }) {
    const argument = path.get("argument");
    path.replaceWith(yieldExpression(wrapAwait ? callExpression(cloneNode(wrapAwait), [argument.node]) : argument.node));
  }
});
function _default(path, helpers, noNewArrows, ignoreFunctionLength) {
  path.traverse(awaitVisitor, {
    wrapAwait: helpers.wrapAwait
  });
  const isIIFE = checkIsIIFE(path);
  path.node.async = false;
  path.node.generator = true;
  (0, _helperWrapFunction.default)(path, cloneNode(helpers.wrapAsync), noNewArrows, ignoreFunctionLength);
  const isProperty = path.isObjectMethod() || path.isClassMethod() || path.parentPath.isObjectProperty() || path.parentPath.isClassProperty();
  if (!isProperty && !isIIFE && path.isExpression()) {
    (0, _helperAnnotateAsPure.default)(path);
  }
  function checkIsIIFE(path) {
    if (path.parentPath.isCallExpression({
      callee: path.node
    })) {
      return true;
    }
    const {
      parentPath
    } = path;
    if (parentPath.isMemberExpression()) {
      if (isIdentifier(parentPath.node.property, {
        name: "bind"
      })) {
        const {
          parentPath: bindCall
        } = parentPath;
        return (bindCall.isCallExpression() && bindCall.node.arguments.length === 1 && isThisExpression(bindCall.node.arguments[0]) && bindCall.parentPath.isCallExpression({
            callee: bindCall.node
          })
        );
      }
      return true;
    }
    return false;
  }
}

//# sourceMappingURL=index.js.map
