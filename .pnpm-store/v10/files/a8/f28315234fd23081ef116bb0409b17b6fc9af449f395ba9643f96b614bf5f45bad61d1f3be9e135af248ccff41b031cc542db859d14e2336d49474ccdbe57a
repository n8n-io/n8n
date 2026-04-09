"use strict";

exports.__esModule = true;
exports.PossibleGlobalObjects = void 0;
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
const PossibleGlobalObjects = exports.PossibleGlobalObjects = new Set(["global", "globalThis", "self", "window"]);
function intersection(a, b) {
  const result = new Set();
  a.forEach(v => b.has(v) && result.add(v));
  return result;
}
function has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
function resolve(path, seen = new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  if (path.isVariableDeclarator()) {
    if (path.get("id").isIdentifier()) {
      return resolve(path.get("init"), seen);
    }
  } else if (path.isReferencedIdentifier()) {
    const binding = path.scope.getBinding(path.node.name);
    if (!binding) return path;
    if (!binding.constant) return;
    return resolve(binding.path, seen);
  }
  return path;
}
function resolveId(path) {
  if (path.isIdentifier() && !path.scope.hasBinding(path.node.name, /* noGlobals */true)) {
    return path.node.name;
  }

  // globalThis.Object / window.Array / self.Map / global.Set -> resolve to
  // the property name, because accessing a built-in through a global object
  // reference is equivalent to accessing it directly.
  if (path.isMemberExpression() && !path.node.computed) {
    const object = path.get("object");
    const property = path.get("property");
    if (object.isIdentifier() && !object.scope.hasBinding(object.node.name, /* noGlobals */true) && PossibleGlobalObjects.has(object.node.name) && property.isIdentifier()) {
      return property.node.name;
    }
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
function resolveInstance(obj, seen) {
  const source = resolveSource(obj, seen);
  return source.placement === "prototype" ? source.id : null;
}
function resolveSource(obj, seen) {
  if (seen.has(obj)) {
    return {
      id: null,
      placement: null
    };
  }
  seen.add(obj);
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
    case "NullLiteral":
      return {
        id: null,
        placement: null
      };
    case "RegExpLiteral":
      return {
        id: "RegExp",
        placement: "prototype"
      };
    case "StringLiteral":
    case "TemplateLiteral":
      return {
        id: "String",
        placement: "prototype"
      };
    case "NumericLiteral":
      return {
        id: "Number",
        placement: "prototype"
      };
    case "BooleanLiteral":
      return {
        id: "Boolean",
        placement: "prototype"
      };
    case "BigIntLiteral":
      return {
        id: "BigInt",
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
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "ClassExpression":
      return {
        id: "Function",
        placement: "prototype"
      };
    // new Constructor() -> resolve the constructor name
    case "NewExpression":
      {
        const calleeId = resolveId(path.get("callee"));
        if (calleeId) return {
          id: calleeId,
          placement: "prototype"
        };
        return {
          id: null,
          placement: null
        };
      }
    // Unary expressions -> result type depends on operator
    case "UnaryExpression":
      {
        const {
          operator
        } = path.node;
        if (operator === "typeof") return {
          id: "String",
          placement: "prototype"
        };
        if (operator === "!" || operator === "delete") return {
          id: "Boolean",
          placement: "prototype"
        };
        // Unary + always produces Number (throws on BigInt)
        if (operator === "+") return {
          id: "Number",
          placement: "prototype"
        };
        // Unary - and ~ can produce Number or BigInt depending on operand
        if (operator === "-" || operator === "~") {
          const arg = resolveInstance(path.get("argument"), seen);
          if (arg === "BigInt") return {
            id: "BigInt",
            placement: "prototype"
          };
          if (arg !== null) return {
            id: "Number",
            placement: "prototype"
          };
          return {
            id: null,
            placement: null
          };
        }
        return {
          id: null,
          placement: null
        };
      }
    // ++i, i++ produce Number or BigInt depending on the argument
    case "UpdateExpression":
      {
        const arg = resolveInstance(path.get("argument"), seen);
        if (arg === "BigInt") return {
          id: "BigInt",
          placement: "prototype"
        };
        if (arg !== null) return {
          id: "Number",
          placement: "prototype"
        };
        return {
          id: null,
          placement: null
        };
      }
    // Binary expressions -> result type depends on operator
    case "BinaryExpression":
      {
        const {
          operator
        } = path.node;
        if (operator === "==" || operator === "!=" || operator === "===" || operator === "!==" || operator === "<" || operator === ">" || operator === "<=" || operator === ">=" || operator === "instanceof" || operator === "in") {
          return {
            id: "Boolean",
            placement: "prototype"
          };
        }
        // >>> always produces Number
        if (operator === ">>>") {
          return {
            id: "Number",
            placement: "prototype"
          };
        }
        // Arithmetic and bitwise operators can produce Number or BigInt
        if (operator === "-" || operator === "*" || operator === "/" || operator === "%" || operator === "**" || operator === "&" || operator === "|" || operator === "^" || operator === "<<" || operator === ">>") {
          const left = resolveInstance(path.get("left"), seen);
          const right = resolveInstance(path.get("right"), seen);
          if (left === "BigInt" && right === "BigInt") {
            return {
              id: "BigInt",
              placement: "prototype"
            };
          }
          if (left !== null && right !== null) {
            return {
              id: "Number",
              placement: "prototype"
            };
          }
          return {
            id: null,
            placement: null
          };
        }
        // + depends on operand types: string wins, otherwise number or bigint
        if (operator === "+") {
          const left = resolveInstance(path.get("left"), seen);
          const right = resolveInstance(path.get("right"), seen);
          if (left === "String" || right === "String") {
            return {
              id: "String",
              placement: "prototype"
            };
          }
          if (left === "Number" && right === "Number") {
            return {
              id: "Number",
              placement: "prototype"
            };
          }
          if (left === "BigInt" && right === "BigInt") {
            return {
              id: "BigInt",
              placement: "prototype"
            };
          }
        }
        return {
          id: null,
          placement: null
        };
      }
    // (a, b, c) -> the result is the last expression
    case "SequenceExpression":
      {
        const expressions = path.get("expressions");
        return resolveSource(expressions[expressions.length - 1], seen);
      }
    // a = b -> the result is the right side
    case "AssignmentExpression":
      {
        if (path.node.operator === "=") {
          return resolveSource(path.get("right"), seen);
        }
        return {
          id: null,
          placement: null
        };
      }
    // a ? b : c -> if both branches resolve to the same type, use it
    case "ConditionalExpression":
      {
        const consequent = resolveSource(path.get("consequent"), seen);
        const alternate = resolveSource(path.get("alternate"), seen);
        if (consequent.id && consequent.id === alternate.id) {
          return consequent;
        }
        return {
          id: null,
          placement: null
        };
      }
    // (expr) -> unwrap parenthesized expressions
    case "ParenthesizedExpression":
      return resolveSource(path.get("expression"), seen);
    // TypeScript / Flow type wrappers -> unwrap to the inner expression
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "TSInstantiationExpression":
    case "TSTypeAssertion":
    case "TypeCastExpression":
      return resolveSource(path.get("expression"), seen);
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