'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var helperPluginUtils = require('@babel/helper-plugin-utils');
var core = require('@babel/core');
var pluginTransformParameters = require('@babel/plugin-transform-parameters');
var helperCompilationTargets = require('@babel/helper-compilation-targets');
var pluginTransformDestructuring = require('@babel/plugin-transform-destructuring');

function shouldStoreRHSInTemporaryVariable(node) {
  if (!node) return false;
  if (node.type === "ArrayPattern") {
    const nonNullElements = node.elements.filter(element => element !== null && element.type !== "VoidPattern");
    if (nonNullElements.length > 1) return true;else return shouldStoreRHSInTemporaryVariable(nonNullElements[0]);
  } else if (node.type === "ObjectPattern") {
    const {
      properties
    } = node;
    if (properties.length > 1) return true;else if (properties.length === 0) return false;else {
      const firstProperty = properties[0];
      if (firstProperty.type === "ObjectProperty") {
        return shouldStoreRHSInTemporaryVariable(firstProperty.value);
      } else {
        return shouldStoreRHSInTemporaryVariable(firstProperty);
      }
    }
  } else if (node.type === "AssignmentPattern") {
    return shouldStoreRHSInTemporaryVariable(node.left);
  } else if (node.type === "RestElement") {
    if (node.argument.type === "Identifier") return true;
    return shouldStoreRHSInTemporaryVariable(node.argument);
  } else {
    return false;
  }
}

var compatData = {
  "Object.assign": {
    chrome: "49",
    opera: "36",
    edge: "13",
    firefox: "36",
    safari: "10",
    node: "6",
    deno: "1",
    ios: "10",
    samsung: "5",
    opera_mobile: "36",
    electron: "0.37"
  }
};

const node = core.types.identifier("a");
const property = core.types.objectProperty(core.types.identifier("key"), node);
const pattern = core.types.objectPattern([property]);
var ZERO_REFS = core.types.isReferenced(node, property, pattern) ? 1 : 0;
var index = helperPluginUtils.declare((api, opts) => {
  var _api$assumption, _api$assumption2, _api$assumption3, _api$assumption4;
  api.assertVersion("^7.0.0-0 || ^8.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  const targets = api.targets();
  const supportsObjectAssign = !helperCompilationTargets.isRequired("Object.assign", targets, {
    compatData
  });
  const {
    useBuiltIns = supportsObjectAssign,
    loose = false
  } = opts;
  if (typeof loose !== "boolean") {
    throw new Error(".loose must be a boolean, or undefined");
  }
  const ignoreFunctionLength = (_api$assumption = api.assumption("ignoreFunctionLength")) != null ? _api$assumption : loose;
  const objectRestNoSymbols = (_api$assumption2 = api.assumption("objectRestNoSymbols")) != null ? _api$assumption2 : loose;
  const pureGetters = (_api$assumption3 = api.assumption("pureGetters")) != null ? _api$assumption3 : loose;
  const setSpreadProperties = (_api$assumption4 = api.assumption("setSpreadProperties")) != null ? _api$assumption4 : loose;
  function getExtendsHelper(file) {
    return useBuiltIns ? core.types.memberExpression(core.types.identifier("Object"), core.types.identifier("assign")) : file.addHelper("extends");
  }
  function* iterateObjectRestElement(path) {
    switch (path.type) {
      case "ArrayPattern":
        for (const elementPath of path.get("elements")) {
          if (elementPath.isRestElement()) {
            yield* iterateObjectRestElement(elementPath.get("argument"));
          } else {
            yield* iterateObjectRestElement(elementPath);
          }
        }
        break;
      case "ObjectPattern":
        for (const propertyPath of path.get("properties")) {
          if (propertyPath.isRestElement()) {
            yield propertyPath;
          } else {
            yield* iterateObjectRestElement(propertyPath.get("value"));
          }
        }
        break;
      case "AssignmentPattern":
        yield* iterateObjectRestElement(path.get("left"));
        break;
    }
  }
  function hasObjectRestElement(path) {
    const objectRestPatternIterator = iterateObjectRestElement(path);
    return !objectRestPatternIterator.next().done;
  }
  function visitObjectRestElements(path, visitor) {
    for (const restElementPath of iterateObjectRestElement(path)) {
      visitor(restElementPath);
    }
  }
  function hasSpread(node) {
    for (const prop of node.properties) {
      if (core.types.isSpreadElement(prop)) {
        return true;
      }
    }
    return false;
  }
  function extractNormalizedKeys(pattern) {
    const propsList = pattern.get("properties").map(p => p.node);
    const keys = [];
    let allPrimitives = true;
    let hasTemplateLiteral = false;
    for (const prop of propsList) {
      const key = prop.key;
      if (core.types.isIdentifier(key) && !prop.computed) {
        keys.push(core.types.stringLiteral(key.name));
      } else if (core.types.isTemplateLiteral(key)) {
        keys.push(core.types.cloneNode(key));
        hasTemplateLiteral = true;
      } else if (core.types.isLiteral(key)) {
        keys.push(core.types.stringLiteral(String(key.value)));
      } else {
        if (core.types.isAssignmentExpression(key) && core.types.isIdentifier(key.left)) {
          keys.push(core.types.cloneNode(key.left));
        } else {
          keys.push(core.types.cloneNode(key));
        }
        const keyToCheck = core.types.isAssignmentExpression(key) ? key.right : key;
        if (core.types.isMemberExpression(keyToCheck, {
          computed: false
        }) && core.types.isIdentifier(keyToCheck.object, {
          name: "Symbol"
        }) || core.types.isCallExpression(keyToCheck) && core.types.matchesPattern(keyToCheck.callee, "Symbol.for")) ; else {
          allPrimitives = false;
        }
      }
    }
    return {
      keys,
      allPrimitives,
      hasTemplateLiteral
    };
  }
  function replaceImpureComputedKeys(properties, scope) {
    const tempVariableDeclarations = [];
    for (const property of properties) {
      const keyExpression = property.get("key");
      if (keyExpression.isAssignmentExpression() && keyExpression.get("left").isIdentifier()) {
        const identName = keyExpression.node.left.name;
        if (scope.hasUid(identName)) {
          continue;
        }
      }
      if (property.node.computed && !keyExpression.isPure()) {
        const tempVariableName = scope.generateUidBasedOnNode(keyExpression.node);
        const tempVariableDeclaration = core.types.variableDeclarator(core.types.identifier(tempVariableName), keyExpression.node);
        tempVariableDeclarations.push(tempVariableDeclaration);
        keyExpression.replaceWith(core.types.identifier(tempVariableName));
      }
    }
    return tempVariableDeclarations;
  }
  function removeUnusedExcludedKeys(path) {
    const bindings = path.getOuterBindingIdentifierPaths();
    Object.keys(bindings).forEach(bindingName => {
      const bindingParentPath = bindings[bindingName].parentPath;
      if (path.scope.getBinding(bindingName).references > ZERO_REFS || !bindingParentPath.isObjectProperty()) {
        return;
      }
      bindingParentPath.remove();
    });
  }
  function collectComputedKeysInSourceOrder(destructuringPattern) {
    const computedProperties = [];
    function visitPattern(pattern) {
      if (pattern.isObjectPattern()) {
        const properties = pattern.get("properties");
        for (const property of properties) {
          if (property.isRestElement()) continue;
          if (property.node.computed) {
            computedProperties.push(property);
          }
          const nestedPattern = property.get("value");
          visitPattern(nestedPattern);
        }
      } else if (pattern.isArrayPattern()) {
        for (const element of pattern.get("elements")) {
          if (!element) continue;
          if (element.isRestElement()) {
            const restArgument = element.get("argument");
            visitPattern(restArgument);
          } else {
            visitPattern(element);
          }
        }
      } else if (pattern.isAssignmentPattern()) {
        visitPattern(pattern.get("left"));
      }
    }
    visitPattern(destructuringPattern);
    return computedProperties;
  }
  function createObjectRest(path, file, objRef) {
    const props = path.get("properties");
    const last = props[props.length - 1];
    core.types.assertRestElement(last.node);
    const restElement = core.types.cloneNode(last.node);
    last.remove();
    const impureComputedPropertyDeclarators = replaceImpureComputedKeys(path.get("properties"), path.scope);
    const {
      keys,
      allPrimitives,
      hasTemplateLiteral
    } = extractNormalizedKeys(path);
    if (keys.length === 0) {
      return [impureComputedPropertyDeclarators, restElement.argument, core.types.callExpression(getExtendsHelper(file), [core.types.objectExpression([]), core.types.sequenceExpression([core.types.callExpression(file.addHelper("objectDestructuringEmpty"), [core.types.cloneNode(objRef)]), core.types.cloneNode(objRef)])])];
    }
    let keyExpression;
    if (!allPrimitives) {
      keyExpression = core.types.callExpression(core.types.memberExpression(core.types.arrayExpression(keys), core.types.identifier("map")), [file.addHelper("toPropertyKey")]);
    } else {
      keyExpression = core.types.arrayExpression(keys);
      if (!hasTemplateLiteral && !core.types.isProgram(path.scope.block)) {
        const program = path.findParent(path => path.isProgram());
        const id = path.scope.generateUidIdentifier("excluded");
        program.scope.push({
          id,
          init: keyExpression,
          kind: "const"
        });
        keyExpression = core.types.cloneNode(id);
      }
    }
    return [impureComputedPropertyDeclarators, restElement.argument, core.types.callExpression(file.addHelper(`objectWithoutProperties${objectRestNoSymbols ? "Loose" : ""}`), [core.types.cloneNode(objRef), keyExpression])];
  }
  function replaceRestElement(parentPath, paramPath, container) {
    if (paramPath.isAssignmentPattern()) {
      replaceRestElement(parentPath, paramPath.get("left"), container);
      return;
    }
    if (paramPath.isArrayPattern() && hasObjectRestElement(paramPath)) {
      const elements = paramPath.get("elements");
      for (let i = 0; i < elements.length; i++) {
        replaceRestElement(parentPath, elements[i], container);
      }
    }
    if (paramPath.isObjectPattern() && hasObjectRestElement(paramPath)) {
      const uid = parentPath.scope.generateUidIdentifier("ref");
      const declar = core.types.variableDeclaration("let", [core.types.variableDeclarator(paramPath.node, uid)]);
      if (container) {
        container.push(declar);
      } else {
        parentPath.ensureBlock();
        parentPath.get("body").unshiftContainer("body", declar);
      }
      paramPath.replaceWith(core.types.cloneNode(uid));
    }
  }
  return {
    name: "transform-object-rest-spread",
    manipulateOptions: (_, parser) => parser.plugins.push("objectRestSpread"),
    visitor: {
      Function(path) {
        const params = path.get("params");
        const paramsWithRestElement = new Set();
        const idsInRestParams = new Set();
        for (let i = 0; i < params.length; ++i) {
          const param = params[i];
          if (hasObjectRestElement(param)) {
            paramsWithRestElement.add(i);
            for (const name of Object.keys(param.getBindingIdentifiers())) {
              idsInRestParams.add(name);
            }
          }
        }
        let idInRest = false;
        const IdentifierHandler = function (path, functionScope) {
          const name = path.node.name;
          if (path.scope.getBinding(name) === functionScope.getBinding(name) && idsInRestParams.has(name)) {
            idInRest = true;
            path.stop();
          }
        };
        let i;
        for (i = 0; i < params.length && !idInRest; ++i) {
          const param = params[i];
          if (!paramsWithRestElement.has(i)) {
            if (param.isReferencedIdentifier() || param.isBindingIdentifier()) {
              IdentifierHandler(param, path.scope);
            } else {
              param.traverse({
                "Scope|TypeAnnotation|TSTypeAnnotation": path => path.skip(),
                "ReferencedIdentifier|BindingIdentifier": IdentifierHandler
              }, path.scope);
            }
          }
        }
        if (!idInRest) {
          for (let i = 0; i < params.length; ++i) {
            const param = params[i];
            if (paramsWithRestElement.has(i)) {
              replaceRestElement(path, param);
            }
          }
        } else {
          const shouldTransformParam = idx => idx >= i - 1 || paramsWithRestElement.has(idx);
          pluginTransformParameters.convertFunctionParams(path, ignoreFunctionLength, shouldTransformParam, replaceRestElement);
        }
      },
      VariableDeclarator(path, file) {
        if (!path.get("id").isObjectPattern()) {
          return;
        }
        let insertionPath = path;
        const originalPath = path;
        if (hasObjectRestElement(path.get("id"))) {
          const destructuringPattern = originalPath.get("id");
          const propertiesWithComputedKeys = collectComputedKeysInSourceOrder(destructuringPattern);
          for (const property of propertiesWithComputedKeys) {
            const computedKeyExpression = property.get("key");
            if (computedKeyExpression.isAssignmentExpression() && computedKeyExpression.get("left").isIdentifier() && originalPath.scope.hasUid(computedKeyExpression.node.left.name)) {
              continue;
            }
            if (!computedKeyExpression.isPure()) {
              const tempVariableName = originalPath.scope.generateUidBasedOnNode(computedKeyExpression.node);
              const tempIdentifier = core.types.identifier(tempVariableName);
              originalPath.scope.push({
                id: tempIdentifier,
                kind: "var"
              });
              computedKeyExpression.replaceWith(core.types.assignmentExpression("=", core.types.cloneNode(tempIdentifier), computedKeyExpression.node));
            }
          }
        }
        visitObjectRestElements(path.get("id"), path => {
          if (shouldStoreRHSInTemporaryVariable(originalPath.node.id) && !core.types.isIdentifier(originalPath.node.init)) {
            const initRef = path.scope.generateUidIdentifierBasedOnNode(originalPath.node.init, "ref");
            originalPath.insertBefore(core.types.variableDeclarator(initRef, originalPath.node.init));
            originalPath.replaceWith(core.types.variableDeclarator(originalPath.node.id, core.types.cloneNode(initRef)));
            return;
          }
          let ref = originalPath.node.init;
          const refPropertyPath = [];
          let kind;
          path.findParent(path => {
            if (path.isObjectProperty()) {
              refPropertyPath.unshift(path);
            } else if (path.isVariableDeclarator()) {
              kind = path.parentPath.node.kind;
              return true;
            }
          });
          const impureObjRefComputedDeclarators = replaceImpureComputedKeys(refPropertyPath, path.scope);
          refPropertyPath.forEach(prop => {
            const keyPath = prop.get("key");
            let keyForMemberExpression = keyPath.node;
            if (core.types.isAssignmentExpression(keyPath.node)) {
              keyForMemberExpression = keyPath.node.left;
            }
            ref = core.types.memberExpression(ref, core.types.cloneNode(keyForMemberExpression), prop.node.computed || core.types.isLiteral(keyPath.node));
          });
          const objectPatternPath = path.parentPath;
          const [impureComputedPropertyDeclarators, argument, callExpression] = createObjectRest(objectPatternPath, file, ref);
          if (pureGetters) {
            removeUnusedExcludedKeys(objectPatternPath);
          }
          core.types.assertIdentifier(argument);
          insertionPath.insertBefore(impureComputedPropertyDeclarators);
          insertionPath.insertBefore(impureObjRefComputedDeclarators);
          insertionPath = insertionPath.insertAfter(core.types.variableDeclarator(argument, callExpression))[0];
          path.scope.registerBinding(kind, insertionPath);
          if (objectPatternPath.node.properties.length === 0) {
            objectPatternPath.findParent(path => path.isObjectProperty() || path.isVariableDeclarator()).remove();
          }
        });
      },
      ExportNamedDeclaration(path) {
        var _path$splitExportDecl;
        const declaration = path.get("declaration");
        if (!declaration.isVariableDeclaration()) return;
        const hasRest = declaration.get("declarations").some(path => hasObjectRestElement(path.get("id")));
        if (!hasRest) return;
        (_path$splitExportDecl = path.splitExportDeclaration) != null ? _path$splitExportDecl : path.splitExportDeclaration = require("@babel/traverse").NodePath.prototype.splitExportDeclaration;
        path.splitExportDeclaration();
      },
      CatchClause(path) {
        const paramPath = path.get("param");
        replaceRestElement(path, paramPath);
      },
      AssignmentExpression(path, file) {
        const leftPath = path.get("left");
        if (leftPath.isObjectPattern() && hasObjectRestElement(leftPath)) {
          const nodes = [];
          const refName = path.scope.generateUidBasedOnNode(path.node.right, "ref");
          nodes.push(core.types.variableDeclaration("var", [core.types.variableDeclarator(core.types.identifier(refName), path.node.right)]));
          const [impureComputedPropertyDeclarators, argument, callExpression] = createObjectRest(leftPath, file, core.types.identifier(refName));
          if (impureComputedPropertyDeclarators.length > 0) {
            nodes.push(core.types.variableDeclaration("var", impureComputedPropertyDeclarators));
          }
          const nodeWithoutSpread = core.types.cloneNode(path.node);
          nodeWithoutSpread.right = core.types.identifier(refName);
          nodes.push(core.types.expressionStatement(nodeWithoutSpread));
          nodes.push(core.types.expressionStatement(core.types.assignmentExpression("=", argument, callExpression)));
          nodes.push(core.types.expressionStatement(core.types.identifier(refName)));
          path.replaceWithMultiple(nodes);
        }
      },
      ForXStatement(path) {
        const {
          node,
          scope
        } = path;
        const leftPath = path.get("left");
        if (!leftPath.isVariableDeclaration()) {
          if (!hasObjectRestElement(leftPath)) {
            return;
          }
          const temp = scope.generateUidIdentifier("ref");
          node.left = core.types.variableDeclaration("var", [core.types.variableDeclarator(temp)]);
          path.ensureBlock();
          const statementBody = path.node.body.body;
          const nodes = [];
          if (statementBody.length === 0 && path.isCompletionRecord()) {
            nodes.unshift(core.types.expressionStatement(scope.buildUndefinedNode()));
          }
          nodes.unshift(core.types.expressionStatement(core.types.assignmentExpression("=", leftPath.node, core.types.cloneNode(temp))));
          pluginTransformDestructuring.unshiftForXStatementBody(path, nodes);
          scope.crawl();
          return;
        } else {
          const patternPath = leftPath.get("declarations")[0].get("id");
          if (!hasObjectRestElement(patternPath)) {
            return;
          }
          const left = leftPath.node;
          const pattern = patternPath.node;
          const key = scope.generateUidIdentifier("ref");
          node.left = core.types.variableDeclaration(left.kind, [core.types.variableDeclarator(key, null)]);
          path.ensureBlock();
          pluginTransformDestructuring.unshiftForXStatementBody(path, [core.types.variableDeclaration(node.left.kind, [core.types.variableDeclarator(pattern, core.types.cloneNode(key))])]);
          scope.crawl();
          return;
        }
      },
      ArrayPattern(path) {
        const objectPatterns = [];
        const {
          scope
        } = path;
        const uidIdentifiers = [];
        visitObjectRestElements(path, path => {
          const objectPattern = path.parentPath;
          const uid = scope.generateUidIdentifier("ref");
          objectPatterns.push({
            left: objectPattern.node,
            right: uid
          });
          uidIdentifiers.push(uid);
          objectPattern.replaceWith(core.types.cloneNode(uid));
          path.skip();
        });
        if (objectPatterns.length > 0) {
          const patternParentPath = path.findParent(path => !(path.isPattern() || path.isObjectProperty()));
          const patternParent = patternParentPath.node;
          switch (patternParent.type) {
            case "VariableDeclarator":
              patternParentPath.insertAfter(objectPatterns.map(({
                left,
                right
              }) => core.types.variableDeclarator(left, right)));
              break;
            case "AssignmentExpression":
              {
                for (const uidIdentifier of uidIdentifiers) {
                  scope.push({
                    id: core.types.cloneNode(uidIdentifier)
                  });
                }
                patternParentPath.insertAfter(objectPatterns.map(({
                  left,
                  right
                }) => core.types.assignmentExpression("=", left, right)));
              }
              break;
            default:
              throw new Error(`Unexpected pattern parent type: ${patternParent.type}`);
          }
        }
      },
      ObjectExpression(path, file) {
        if (!hasSpread(path.node)) return;
        let helper;
        if (setSpreadProperties) {
          helper = getExtendsHelper(file);
        } else {
          try {
            helper = file.addHelper("objectSpread2");
          } catch (_unused) {
            this.file.declarations.objectSpread2 = null;
            helper = file.addHelper("objectSpread");
          }
        }
        let exp = null;
        let props = [];
        function make() {
          const hadProps = props.length > 0;
          const obj = core.types.objectExpression(props);
          props = [];
          if (!exp) {
            exp = core.types.callExpression(helper, [obj]);
            return;
          }
          if (pureGetters) {
            if (hadProps) {
              exp.arguments.push(obj);
            }
            return;
          }
          exp = core.types.callExpression(core.types.cloneNode(helper), [exp, ...(hadProps ? [core.types.objectExpression([]), obj] : [])]);
        }
        for (const prop of path.node.properties) {
          if (core.types.isSpreadElement(prop)) {
            make();
            exp.arguments.push(prop.argument);
          } else {
            props.push(prop);
          }
        }
        if (props.length) make();
        path.replaceWith(exp);
      }
    }
  };
});

exports.default = index;
//# sourceMappingURL=index.js.map
