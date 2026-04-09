"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _helperCompilationTargets = require("@babel/helper-compilation-targets");
var _helperAnnotateAsPure = require("@babel/helper-annotate-as-pure");
var _core = require("@babel/core");
var _transformClass = require("./transformClass.js");
const globalsBrowserUpper = require("@babel/helper-globals/data/browser-upper.json"),
  globalsBuiltinUpper = require("@babel/helper-globals/data/builtin-upper.json");
const builtinClasses = new Set([...globalsBrowserUpper, ...globalsBuiltinUpper]);
builtinClasses.delete("Iterator");
var _default = exports.default = (0, _helperPluginUtils.declare)((api, options) => {
  var _api$assumption, _api$assumption2, _api$assumption3, _api$assumption4;
  api.assertVersion(7);
  const {
    loose = false
  } = options;
  const setClassMethods = (_api$assumption = api.assumption("setClassMethods")) != null ? _api$assumption : loose;
  const constantSuper = (_api$assumption2 = api.assumption("constantSuper")) != null ? _api$assumption2 : loose;
  const superIsCallableConstructor = (_api$assumption3 = api.assumption("superIsCallableConstructor")) != null ? _api$assumption3 : loose;
  const noClassCalls = (_api$assumption4 = api.assumption("noClassCalls")) != null ? _api$assumption4 : loose;
  const supportUnicodeId = !(0, _helperCompilationTargets.isRequired)("transform-unicode-escapes", api.targets());
  const VISITED = new WeakSet();
  return {
    name: "transform-classes",
    visitor: {
      ExportDefaultDeclaration(path) {
        var _path$splitExportDecl;
        if (!path.get("declaration").isClassDeclaration()) return;
        (_path$splitExportDecl = path.splitExportDeclaration) != null ? _path$splitExportDecl : path.splitExportDeclaration = require("@babel/traverse").NodePath.prototype.splitExportDeclaration;
        path.splitExportDeclaration();
      },
      ClassDeclaration(path) {
        const {
          node
        } = path;
        const ref = node.id ? _core.types.cloneNode(node.id) : path.scope.generateUidIdentifier("class");
        path.replaceWith(_core.types.variableDeclaration("let", [_core.types.variableDeclarator(ref, _core.types.toExpression(node))]));
      },
      ClassExpression(path, state) {
        var _path$ensureFunctionN;
        const {
          node
        } = path;
        if (VISITED.has(node)) return;
        (_path$ensureFunctionN = path.ensureFunctionName) != null ? _path$ensureFunctionN : path.ensureFunctionName = require("@babel/traverse").NodePath.prototype.ensureFunctionName;
        const replacement = path.ensureFunctionName(supportUnicodeId);
        if (replacement && replacement.node !== node) return;
        VISITED.add(node);
        const [replacedPath] = path.replaceWith((0, _transformClass.default)(path, state.file, builtinClasses, loose, {
          setClassMethods,
          constantSuper,
          superIsCallableConstructor,
          noClassCalls
        }, supportUnicodeId));
        if (replacedPath.isCallExpression()) {
          (0, _helperAnnotateAsPure.default)(replacedPath);
          const callee = replacedPath.get("callee");
          if (callee.isArrowFunctionExpression()) {
            callee.arrowFunctionToExpression();
          }
        }
      }
    }
  };
});

//# sourceMappingURL=index.js.map
