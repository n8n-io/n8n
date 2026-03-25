"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getVisitor = void 0;
var _assert = require("assert");
var _hoist = require("./hoist.js");
var _emit = require("./emit.js");
var _replaceShorthandObjectMethod = require("./replaceShorthandObjectMethod.js");
var util = require("./util.js");
var _core = require("@babel/core");
const getVisitor = () => ({
  Method(path, state) {
    const node = path.node;
    if (!shouldRegenerate(node, state)) return;
    const container = _core.types.functionExpression(null, [], _core.types.cloneNode(node.body, false), node.generator, node.async);
    path.get("body").set("body", [_core.types.returnStatement(_core.types.callExpression(container, []))]);
    node.async = false;
    node.generator = false;
    path.get("body.body.0.argument.callee").unwrapFunctionEnvironment();
  },
  Function: {
    exit(path, state) {
      let node = path.node;
      if (!shouldRegenerate(node, state)) return;
      path = (0, _replaceShorthandObjectMethod.default)(path);
      node = path.node;
      const contextId = path.scope.generateUidIdentifier("context");
      const argsId = path.scope.generateUidIdentifier("args");
      path.ensureBlock();
      const bodyBlockPath = path.get("body");
      if (node.async) {
        bodyBlockPath.traverse(awaitVisitor, this);
      }
      bodyBlockPath.traverse(functionSentVisitor, {
        context: contextId,
        pluginPass: this
      });
      const outerBody = [];
      const innerBody = [];
      bodyBlockPath.get("body").forEach(function (childPath) {
        const node = childPath.node;
        if (_core.types.isExpressionStatement(node) && _core.types.isStringLiteral(node.expression)) {
          outerBody.push(node);
        } else if ((node == null ? void 0 : node._blockHoist) != null) {
          outerBody.push(node);
        } else {
          innerBody.push(node);
        }
      });
      if (outerBody.length > 0) {
        bodyBlockPath.node.body = innerBody;
      }
      const outerFnExpr = getOuterFnExpr(this, path);
      _core.types.assertIdentifier(node.id);
      const vars = (0, _hoist.hoist)(path);
      const context = {
        usesThis: false,
        usesArguments: false,
        getArgsId: () => _core.types.cloneNode(argsId)
      };
      path.traverse(argumentsThisVisitor, context);
      if (context.usesArguments) {
        vars.push(_core.types.variableDeclarator(_core.types.cloneNode(argsId), _core.types.identifier("arguments")));
      }
      const emitter = new _emit.Emitter(contextId, path.scope, vars, this);
      emitter.explode(path.get("body"));
      if (vars.length > 0) {
        outerBody.push(_core.types.variableDeclaration("var", vars));
      }
      const wrapArgs = [emitter.getContextFunction()];
      const tryLocsList = emitter.getTryLocsList();
      if (node.generator) {
        wrapArgs.push(outerFnExpr);
      } else if (context.usesThis || tryLocsList || node.async) {
        wrapArgs.push(_core.types.nullLiteral());
      }
      if (context.usesThis) {
        wrapArgs.push(_core.types.thisExpression());
      } else if (tryLocsList || node.async) {
        wrapArgs.push(_core.types.nullLiteral());
      }
      if (tryLocsList) {
        wrapArgs.push(tryLocsList);
      } else if (node.async) {
        wrapArgs.push(_core.types.nullLiteral());
      }
      if (node.async) {
        let currentScope = path.scope;
        do {
          if (currentScope.hasOwnBinding("Promise")) currentScope.rename("Promise");
        } while (currentScope = currentScope.parent);
        wrapArgs.push(_core.types.identifier("Promise"));
      }
      const wrapCall = _core.types.callExpression(util.newHelpersAvailable(this) ? !node.async ? _core.types.memberExpression(_core.types.callExpression(this.addHelper("regenerator"), []), _core.types.identifier("w")) : node.generator ? this.addHelper("regeneratorAsyncGen") : this.addHelper("regeneratorAsync") : util.runtimeProperty(this, node.async ? "async" : "wrap"), wrapArgs);
      outerBody.push(_core.types.returnStatement(wrapCall));
      node.body = _core.types.blockStatement(outerBody);
      path.get("body.body").forEach(p => p.scope.registerDeclaration(p));
      const oldDirectives = bodyBlockPath.node.directives;
      if (oldDirectives) {
        node.body.directives = oldDirectives;
      }
      const wasGeneratorFunction = node.generator;
      if (wasGeneratorFunction) {
        node.generator = false;
      }
      if (node.async) {
        node.async = false;
      }
      if (wasGeneratorFunction && _core.types.isExpression(node)) {
        path.replaceWith(_core.types.callExpression(util.newHelpersAvailable(this) ? _core.types.memberExpression(_core.types.callExpression(this.addHelper("regenerator"), []), _core.types.identifier("m")) : util.runtimeProperty(this, "mark"), [node]));
        path.addComment("leading", "#__PURE__");
      }
      const insertedLocs = emitter.getInsertedLocs();
      path.traverse({
        NumericLiteral(path) {
          if (!insertedLocs.has(path.node)) {
            return;
          }
          path.replaceWith(_core.types.numericLiteral(path.node.value));
        }
      });
      path.requeue();
    }
  }
});
exports.getVisitor = getVisitor;
function shouldRegenerate(node, state) {
  if (node.generator) {
    if (node.async) {
      return state.opts.asyncGenerators !== false;
    } else {
      return state.opts.generators !== false;
    }
  } else if (node.async) {
    return state.opts.async !== false;
  } else {
    return false;
  }
}
function getOuterFnExpr(state, funPath) {
  const node = funPath.node;
  _core.types.assertFunction(node);
  if (!node.id) {
    node.id = funPath.scope.parent.generateUidIdentifier("callee");
  }
  if (node.generator && _core.types.isFunctionDeclaration(node)) {
    return getMarkedFunctionId(state, funPath);
  }
  return _core.types.cloneNode(node.id);
}
const markInfo = new WeakMap();
function getMarkInfo(node) {
  if (!markInfo.has(node)) {
    markInfo.set(node, {});
  }
  return markInfo.get(node);
}
function getMarkedFunctionId(state, funPath) {
  const node = funPath.node;
  _core.types.assertIdentifier(node.id);
  const blockPath = funPath.findParent(function (path) {
    return path.isProgram() || path.isBlockStatement();
  });
  if (!blockPath) {
    return node.id;
  }
  const block = blockPath.node;
  _assert.ok(Array.isArray(block.body));
  const info = getMarkInfo(block);
  if (!info.decl) {
    info.decl = _core.types.variableDeclaration("var", []);
    blockPath.unshiftContainer("body", info.decl);
    info.declPath = blockPath.get("body.0");
  }
  _assert.strictEqual(info.declPath.node, info.decl);
  const markedId = blockPath.scope.generateUidIdentifier("marked");
  const markCallExp = _core.types.callExpression(util.newHelpersAvailable(state) ? _core.types.memberExpression(_core.types.callExpression(state.addHelper("regenerator"), []), _core.types.identifier("m")) : util.runtimeProperty(state, "mark"), [_core.types.cloneNode(node.id)]);
  const index = info.decl.declarations.push(_core.types.variableDeclarator(markedId, markCallExp)) - 1;
  const markCallExpPath = info.declPath.get("declarations." + index + ".init");
  _assert.strictEqual(markCallExpPath.node, markCallExp);
  markCallExpPath.addComment("leading", "#__PURE__");
  return _core.types.cloneNode(markedId);
}
const argumentsThisVisitor = {
  "FunctionExpression|FunctionDeclaration|Method": function (path) {
    path.skip();
  },
  Identifier: function (path, state) {
    if (path.node.name === "arguments" && util.isReference(path)) {
      path.replaceWith(state.getArgsId());
      state.usesArguments = true;
    }
  },
  ThisExpression: function (path, state) {
    state.usesThis = true;
  }
};
const functionSentVisitor = {
  MetaProperty(path, state) {
    const {
      node
    } = path;
    if (node.meta.name === "function" && node.property.name === "sent") {
      path.replaceWith(_core.types.memberExpression(_core.types.cloneNode(state.context), _core.types.identifier(util.newHelpersAvailable(state.pluginPass) ? "v" : "_sent")));
    }
  }
};
const awaitVisitor = {
  Function: function (path) {
    path.skip();
  },
  AwaitExpression: function (path) {
    const argument = path.node.argument;
    const helper = util.newHelpersAvailable(this) ? this.addHelper("awaitAsyncGenerator") : util.runtimeProperty(this, "awrap");
    path.replaceWith(_core.types.yieldExpression(_core.types.callExpression(helper, [argument]), false));
  }
};

//# sourceMappingURL=visit.js.map
