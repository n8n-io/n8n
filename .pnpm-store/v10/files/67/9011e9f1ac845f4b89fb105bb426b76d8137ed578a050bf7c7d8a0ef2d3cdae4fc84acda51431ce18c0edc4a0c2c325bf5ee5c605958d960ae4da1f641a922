"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = replaceShorthandObjectMethod;
var _core = require("@babel/core");
function replaceShorthandObjectMethod(path) {
  if (!path.node || !_core.types.isFunction(path.node)) {
    throw new Error("replaceShorthandObjectMethod can only be called on Function AST node paths.");
  }
  if (!_core.types.isObjectMethod(path.node)) {
    return path;
  }
  if (!path.node.generator) {
    return path;
  }
  const parameters = path.node.params.map(function (param) {
    return _core.types.cloneNode(param);
  });
  const functionExpression = _core.types.functionExpression(null, parameters, _core.types.cloneNode(path.node.body), path.node.generator, path.node.async);
  path.replaceWith(_core.types.objectProperty(_core.types.cloneNode(path.node.key), functionExpression, path.node.computed, false));
  return path.get("value");
}

//# sourceMappingURL=replaceShorthandObjectMethod.js.map
