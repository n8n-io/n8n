"use strict";

exports.__esModule = true;
exports.createUtilsGetter = createUtilsGetter;
exports.getImportSource = getImportSource;
exports.getRequireSource = getRequireSource;
exports.has = has;
exports.intersection = intersection;
exports.resolveKey = resolveKey;
exports.resolveSource = resolveSource;
var _babel = _interopRequireWildcard(require("@babel/core"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const {
  types: t,
  template: template
} = _babel.default || _babel;
function intersection(a, b) {
  const result = new Set();
  a.forEach(v => b.has(v) && result.add(v));
  return result;
}
function has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
function resolve(path, resolved = new Set()) {
  if (resolved.has(path)) return;
  resolved.add(path);
  if (path.isVariableDeclarator()) {
    if (path.get("id").isIdentifier()) {
      return resolve(path.get("init"), resolved);
    }
  } else if (path.isReferencedIdentifier()) {
    const binding = path.scope.getBinding(path.node.name);
    if (!binding) return path;
    if (!binding.constant) return;
    return resolve(binding.path, resolved);
  }
  return path;
}
function resolveId(path) {
  if (path.isIdentifier() && !path.scope.hasBinding(path.node.name, /* noGlobals */true)) {
    return path.node.name;
  }
  const resolved = resolve(path);
  if (resolved != null && resolved.isIdentifier()) {
    return resolved.node.name;
  }
}
function resolveKey(path, computed = false) {
  const {
    scope
  } = path;
  if (path.isStringLiteral()) return path.node.value;
  const isIdentifier = path.isIdentifier();
  if (isIdentifier && !(computed || path.parent.computed)) {
    return path.node.name;
  }
  if (computed && path.isMemberExpression() && path.get("object").isIdentifier({
    name: "Symbol"
  }) && !scope.hasBinding("Symbol", /* noGlobals */true)) {
    const sym = resolveKey(path.get("property"), path.node.computed);
    if (sym) return "Symbol." + sym;
  }
  if (isIdentifier ? scope.hasBinding(path.node.name, /* noGlobals */true) : path.isPure()) {
    const {
      value
    } = path.evaluate();
    if (typeof value === "string") return value;
  }
}
function resolveSource(obj) {
  if (obj.isMemberExpression() && obj.get("property").isIdentifier({
    name: "prototype"
  })) {
    const id = resolveId(obj.get("object"));
    if (id) {
      return {
        id,
        placement: "prototype"
      };
    }
    return {
      id: null,
      placement: null
    };
  }
  const id = resolveId(obj);
  if (id) {
    return {
      id,
      placement: "static"
    };
  }
  const path = resolve(obj);
  switch (path == null ? void 0 : path.type) {
    case "RegExpLiteral":
      return {
        id: "RegExp",
        placement: "prototype"
      };
    case "FunctionExpression":
      return {
        id: "Function",
        placement: "prototype"
      };
    case "StringLiteral":
      return {
        id: "String",
        placement: "prototype"
      };
    case "NumberLiteral":
      return {
        id: "Number",
        placement: "prototype"
      };
    case "BooleanLiteral":
      return {
        id: "Boolean",
        placement: "prototype"
      };
    case "ObjectExpression":
      return {
        id: "Object",
        placement: "prototype"
      };
    case "ArrayExpression":
      return {
        id: "Array",
        placement: "prototype"
      };
  }
  return {
    id: null,
    placement: null
  };
}
function getImportSource({
  node
}) {
  if (node.specifiers.length === 0) return node.source.value;
}
function getRequireSource({
  node
}) {
  if (!t.isExpressionStatement(node)) return;
  const {
    expression
  } = node;
  if (t.isCallExpression(expression) && t.isIdentifier(expression.callee) && expression.callee.name === "require" && expression.arguments.length === 1 && t.isStringLiteral(expression.arguments[0])) {
    return expression.arguments[0].value;
  }
}
function hoist(node) {
  // @ts-expect-error
  node._blockHoist = 3;
  return node;
}
function createUtilsGetter(cache) {
  return path => {
    const prog = path.findParent(p => p.isProgram());
    return {
      injectGlobalImport(url, moduleName) {
        cache.storeAnonymous(prog, url, moduleName, (isScript, source) => {
          return isScript ? template.statement.ast`require(${source})` : t.importDeclaration([], source);
        });
      },
      injectNamedImport(url, name, hint = name, moduleName) {
        return cache.storeNamed(prog, url, name, moduleName, (isScript, source, name) => {
          const id = prog.scope.generateUidIdentifier(hint);
          return {
            node: isScript ? hoist(template.statement.ast`
                  var ${id} = require(${source}).${name}
                `) : t.importDeclaration([t.importSpecifier(id, name)], source),
            name: id.name
          };
        });
      },
      injectDefaultImport(url, hint = url, moduleName) {
        return cache.storeNamed(prog, url, "default", moduleName, (isScript, source) => {
          const id = prog.scope.generateUidIdentifier(hint);
          return {
            node: isScript ? hoist(template.statement.ast`var ${id} = require(${source})`) : t.importDeclaration([t.importDefaultSpecifier(id)], source),
            name: id.name
          };
        });
      }
    };
  };
}