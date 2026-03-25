"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hoist = hoist;
var _core = require("@babel/core");
function hoist(funPath) {
  _core.types.assertFunction(funPath.node);
  const vars = {
    __proto__: null
  };
  function varDeclToExpr({
    node: vdec,
    scope
  }, includeIdentifiers) {
    _core.types.assertVariableDeclaration(vdec);
    const exprs = [];
    vdec.declarations.forEach(function (dec) {
      vars[dec.id.name] = _core.types.identifier(dec.id.name);
      scope.removeBinding(dec.id.name);
      if (dec.init) {
        exprs.push(_core.types.assignmentExpression("=", dec.id, dec.init));
      } else if (includeIdentifiers) {
        exprs.push(dec.id);
      }
    });
    if (exprs.length === 0) return null;
    if (exprs.length === 1) return exprs[0];
    return _core.types.sequenceExpression(exprs);
  }
  funPath.get("body").traverse({
    VariableDeclaration: {
      exit: function (path) {
        const expr = varDeclToExpr(path, false);
        if (expr === null) {
          path.remove();
        } else {
          path.replaceWith(_core.types.expressionStatement(expr));
        }
        path.skip();
      }
    },
    ForStatement: function (path) {
      const init = path.get("init");
      if (init.isVariableDeclaration()) {
        const expr = varDeclToExpr(init, false);
        if (expr) {
          init.replaceWith(expr);
        } else {
          init.remove();
        }
      }
    },
    ForXStatement: function (path) {
      const left = path.get("left");
      if (left.isVariableDeclaration()) {
        left.replaceWith(varDeclToExpr(left, true));
      }
    },
    FunctionDeclaration: function (path) {
      const node = path.node;
      vars[node.id.name] = node.id;
      const assignment = _core.types.expressionStatement(_core.types.assignmentExpression("=", _core.types.cloneNode(node.id), _core.types.functionExpression(path.scope.generateUidIdentifierBasedOnNode(node), node.params, node.body, node.generator, node.async)));
      if (path.parentPath.isBlockStatement()) {
        path.parentPath.unshiftContainer("body", assignment);
        path.remove();
      } else {
        path.replaceWith(assignment);
      }
      path.scope.removeBinding(node.id.name);
      path.skip();
    },
    FunctionExpression: function (path) {
      path.skip();
    },
    ArrowFunctionExpression: function (path) {
      path.skip();
    }
  });
  const paramNames = {
    __proto__: null
  };
  funPath.get("params").forEach(function (paramPath) {
    const param = paramPath.node;
    if (_core.types.isIdentifier(param)) {
      paramNames[param.name] = param;
    } else {}
  });
  const declarations = [];
  Object.keys(vars).forEach(function (name) {
    if (!hasOwnProperty.call(paramNames, name)) {
      declarations.push(_core.types.variableDeclarator(vars[name], null));
    }
  });
  return declarations;
}

//# sourceMappingURL=hoist.js.map
