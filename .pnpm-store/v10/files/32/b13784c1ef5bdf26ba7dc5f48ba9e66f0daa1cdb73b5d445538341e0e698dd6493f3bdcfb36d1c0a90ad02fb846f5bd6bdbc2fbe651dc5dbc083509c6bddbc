"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _pluginTransformDestructuring = require("@babel/plugin-transform-destructuring");
var _core = require("@babel/core");
function isAnonymousFunctionDefinition(node) {
  return _core.types.isArrowFunctionExpression(node) || (_core.types.isFunctionExpression(node) || _core.types.isClassExpression(node)) && !node.id;
}
function emitSetFunctionNameCall(state, expression, name) {
  return _core.types.callExpression(state.addHelper("setFunctionName"), [expression, _core.types.stringLiteral(name)]);
}
var _default = exports.default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion("^7.23.9 || ^8.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  const TOP_LEVEL_USING = new Map();
  function isUsingDeclaration(node) {
    if (!_core.types.isVariableDeclaration(node)) return false;
    return node.kind === "using" || node.kind === "await using" || TOP_LEVEL_USING.has(node);
  }
  const transformUsingDeclarationsVisitor = {
    ForOfStatement(path) {
      const {
        left
      } = path.node;
      if (!isUsingDeclaration(left)) return;
      const {
        id
      } = left.declarations[0];
      const tmpId = path.scope.generateUidIdentifierBasedOnNode(id);
      left.declarations[0].id = tmpId;
      left.kind = "const";
      path.ensureBlock();
      (0, _pluginTransformDestructuring.unshiftForXStatementBody)(path, [_core.types.variableDeclaration("using", [_core.types.variableDeclarator(id, _core.types.cloneNode(tmpId))])]);
    },
    "BlockStatement|StaticBlock"(path, state) {
      let ctx = null;
      let needsAwait = false;
      const scope = path.scope;
      for (const node of path.node.body) {
        if (!isUsingDeclaration(node)) continue;
        ctx != null ? ctx : ctx = scope.generateUidIdentifier("usingCtx");
        const isAwaitUsing = node.kind === "await using" || TOP_LEVEL_USING.get(node) === 1;
        needsAwait || (needsAwait = isAwaitUsing);
        if (!TOP_LEVEL_USING.delete(node)) {
          node.kind = "const";
        }
        for (const decl of node.declarations) {
          const currentInit = decl.init;
          decl.init = _core.types.callExpression(_core.types.memberExpression(_core.types.cloneNode(ctx), isAwaitUsing ? _core.types.identifier("a") : _core.types.identifier("u")), [isAnonymousFunctionDefinition(currentInit) && _core.types.isIdentifier(decl.id) ? emitSetFunctionNameCall(state, currentInit, decl.id.name) : currentInit]);
        }
      }
      if (!ctx) return;
      const disposeCall = _core.types.callExpression(_core.types.memberExpression(_core.types.cloneNode(ctx), _core.types.identifier("d")), []);
      const replacement = _core.template.statement.ast`
        try {
          var ${_core.types.cloneNode(ctx)} = ${state.addHelper("usingCtx")}();
          ${path.node.body}
        } catch (_) {
          ${_core.types.cloneNode(ctx)}.e = _;
        } finally {
          ${needsAwait ? _core.types.awaitExpression(disposeCall) : disposeCall}
        }
      `;
      _core.types.inherits(replacement, path.node);
      const {
        parentPath
      } = path;
      if (parentPath.isFunction() || parentPath.isTryStatement() || parentPath.isCatchClause()) {
        path.replaceWith(_core.types.blockStatement([replacement]));
      } else if (path.isStaticBlock()) {
        path.node.body = [replacement];
      } else {
        path.replaceWith(replacement);
      }
    }
  };
  const transformUsingDeclarationsVisitorSkipFn = _core.traverse.visitors.merge([transformUsingDeclarationsVisitor, {
    Function(path) {
      path.skip();
    }
  }]);
  return {
    name: "transform-explicit-resource-management",
    manipulateOptions: (_, p) => p.plugins.push("explicitResourceManagement"),
    visitor: _core.traverse.visitors.merge([transformUsingDeclarationsVisitor, {
      Program(path) {
        TOP_LEVEL_USING.clear();
        if (path.node.sourceType !== "module") return;
        if (!path.node.body.some(isUsingDeclaration)) return;
        const innerBlockBody = [];
        for (const stmt of path.get("body")) {
          if (stmt.isFunctionDeclaration() || stmt.isImportDeclaration()) {
            continue;
          }
          let node = stmt.node;
          let shouldRemove = true;
          if (stmt.isExportDefaultDeclaration()) {
            let {
              declaration
            } = stmt.node;
            let varId;
            if (_core.types.isClassDeclaration(declaration)) {
              varId = declaration.id;
              declaration.id = _core.types.cloneNode(varId);
              declaration = _core.types.toExpression(declaration);
            } else if (!_core.types.isExpression(declaration)) {
              continue;
            }
            varId != null ? varId : varId = path.scope.generateUidIdentifier("_default");
            innerBlockBody.push(_core.types.variableDeclaration("var", [_core.types.variableDeclarator(varId, declaration)]));
            stmt.replaceWith(_core.types.exportNamedDeclaration(null, [_core.types.exportSpecifier(_core.types.cloneNode(varId), _core.types.identifier("default"))]));
            continue;
          }
          if (stmt.isExportNamedDeclaration()) {
            node = stmt.node.declaration;
            if (!node || _core.types.isFunction(node)) continue;
            stmt.replaceWith(_core.types.exportNamedDeclaration(null, Object.keys(_core.types.getOuterBindingIdentifiers(node, false)).map(id => _core.types.exportSpecifier(_core.types.identifier(id), _core.types.identifier(id)))));
            shouldRemove = false;
          } else if (stmt.isExportDeclaration()) {
            continue;
          }
          if (_core.types.isClassDeclaration(node)) {
            const {
              id
            } = node;
            node.id = _core.types.cloneNode(id);
            innerBlockBody.push(_core.types.variableDeclaration("var", [_core.types.variableDeclarator(id, _core.types.toExpression(node))]));
          } else if (_core.types.isVariableDeclaration(node)) {
            if (node.kind === "using") {
              TOP_LEVEL_USING.set(stmt.node, 0);
            } else if (node.kind === "await using") {
              TOP_LEVEL_USING.set(stmt.node, 1);
            }
            node.kind = "var";
            innerBlockBody.push(node);
          } else {
            innerBlockBody.push(stmt.node);
          }
          if (shouldRemove) stmt.remove();
        }
        path.pushContainer("body", _core.types.blockStatement(innerBlockBody));
      },
      Function(path, state) {
        if (path.node.async) {
          path.traverse(transformUsingDeclarationsVisitorSkipFn, state);
        }
      }
    }])
  };
});

//# sourceMappingURL=index.js.map
