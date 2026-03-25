"use strict";

exports.__esModule = true;
exports.default = void 0;
var _utils = require("../utils");
function isRemoved(path) {
  if (path.removed) return true;
  if (!path.parentPath) return false;
  if (path.listKey) {
    var _path$parentPath$node;
    if (!((_path$parentPath$node = path.parentPath.node) != null && (_path$parentPath$node = _path$parentPath$node[path.listKey]) != null && _path$parentPath$node.includes(path.node))) return true;
  } else {
    var _path$parentPath$node2;
    if (((_path$parentPath$node2 = path.parentPath.node) == null ? void 0 : _path$parentPath$node2[path.key]) !== path.node) return true;
  }
  return isRemoved(path.parentPath);
}
var _default = callProvider => {
  function property(object, key, placement, path) {
    return callProvider({
      kind: "property",
      object,
      key,
      placement
    }, path);
  }
  function handleReferencedIdentifier(path) {
    const {
      node: {
        name
      },
      scope
    } = path;
    if (scope.getBindingIdentifier(name)) return;
    callProvider({
      kind: "global",
      name
    }, path);
  }
  function analyzeMemberExpression(path) {
    const key = (0, _utils.resolveKey)(path.get("property"), path.node.computed);
    return {
      key,
      handleAsMemberExpression: !!key && key !== "prototype"
    };
  }
  return {
    // Symbol(), new Promise
    ReferencedIdentifier(path) {
      const {
        parentPath
      } = path;
      if (parentPath.isMemberExpression({
        object: path.node
      }) && analyzeMemberExpression(parentPath).handleAsMemberExpression) {
        return;
      }
      handleReferencedIdentifier(path);
    },
    "MemberExpression|OptionalMemberExpression"(path) {
      const {
        key,
        handleAsMemberExpression
      } = analyzeMemberExpression(path);
      if (!handleAsMemberExpression) return;
      const object = path.get("object");
      let objectIsGlobalIdentifier = object.isIdentifier();
      if (objectIsGlobalIdentifier) {
        const binding = object.scope.getBinding(object.node.name);
        if (binding) {
          if (binding.path.isImportNamespaceSpecifier()) return;
          objectIsGlobalIdentifier = false;
        }
      }
      const source = (0, _utils.resolveSource)(object);
      let skipObject = property(source.id, key, source.placement, path);
      skipObject || (skipObject = !objectIsGlobalIdentifier || path.shouldSkip || object.shouldSkip || isRemoved(object));
      if (!skipObject) handleReferencedIdentifier(object);
    },
    ObjectPattern(path) {
      const {
        parentPath,
        parent
      } = path;
      let obj;

      // const { keys, values } = Object
      if (parentPath.isVariableDeclarator()) {
        obj = parentPath.get("init");
        // ({ keys, values } = Object)
      } else if (parentPath.isAssignmentExpression()) {
        obj = parentPath.get("right");
        // !function ({ keys, values }) {...} (Object)
        // resolution does not work after properties transform :-(
      } else if (parentPath.isFunction()) {
        const grand = parentPath.parentPath;
        if (grand.isCallExpression() || grand.isNewExpression()) {
          if (grand.node.callee === parent) {
            obj = grand.get("arguments")[path.key];
          }
        }
      }
      let id = null;
      let placement = null;
      if (obj) ({
        id,
        placement
      } = (0, _utils.resolveSource)(obj));
      for (const prop of path.get("properties")) {
        if (prop.isObjectProperty()) {
          const key = (0, _utils.resolveKey)(prop.get("key"));
          if (key) property(id, key, placement, prop);
        }
      }
    },
    BinaryExpression(path) {
      if (path.node.operator !== "in") return;
      const source = (0, _utils.resolveSource)(path.get("right"));
      const key = (0, _utils.resolveKey)(path.get("left"), true);
      if (!key) return;
      callProvider({
        kind: "in",
        object: source.id,
        key,
        placement: source.placement
      }, path);
    }
  };
};
exports.default = _default;