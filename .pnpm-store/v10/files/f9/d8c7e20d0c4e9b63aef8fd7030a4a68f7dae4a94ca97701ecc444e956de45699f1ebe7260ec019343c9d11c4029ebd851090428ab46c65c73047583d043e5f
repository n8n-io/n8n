"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _helperCreateClassFeaturesPlugin = require("@babel/helper-create-class-features-plugin");
function generateUid(scope, denyList) {
  const name = "";
  let uid;
  let i = 1;
  do {
    uid = `_${name}`;
    if (i > 1) uid += i;
    i++;
  } while (denyList.has(uid));
  return uid;
}
function mapLast(arr, fn) {
  if (arr.length === 0) return arr;
  return [...arr.slice(0, -1), fn(arr[arr.length - 1])];
}
var _default = exports.default = (0, _helperPluginUtils.declare)(({
  types: t,
  template,
  traverse,
  assertVersion
}) => {
  assertVersion("^7.12.0 || ^8.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  const rawNamedEvaluationVisitor = (0, _helperCreateClassFeaturesPlugin.buildNamedEvaluationVisitor)(path => {
    if (!path.isClassExpression()) return false;
    for (let i = path.node.body.body.length - 1; i >= 0; i--) {
      const el = path.node.body.body[i];
      if (t.isStaticBlock(el)) {
        return true;
      }
      if ((t.isClassProperty(el) || t.isClassPrivateProperty(el)) && el.static) {
        break;
      }
    }
    return false;
  }, (classPath, state, name) => {
    const nameNode = typeof name === "string" ? t.stringLiteral(name) : name;
    classPath.get("body").unshiftContainer("body", t.staticBlock([template.statement.ast`
            ${state.addHelper("setFunctionName")}(this, ${nameNode});
          `]));
  });
  if (!t.classAccessorProperty) {
    delete rawNamedEvaluationVisitor.ClassAccessorProperty;
  }
  const namedEvaluationVisitor = traverse.visitors.explode(rawNamedEvaluationVisitor);
  const maybeSequenceExpression = expressions => {
    if (expressions.length === 1) {
      return expressions[0];
    } else {
      return t.sequenceExpression(expressions);
    }
  };
  const blocksToExpressions = blocks => blocks.map(block => {
    const {
      body
    } = block;
    if (body.length === 1 && t.isExpressionStatement(body[0])) {
      return t.inheritsComments(t.inheritsComments(body[0].expression, body[0]), block);
    }
    return t.inheritsComments(template.expression.ast`(() => { ${body} })()`, block);
  });
  const prependToInitializer = (prop, expressions) => {
    prop.value = prop.value ? t.sequenceExpression([...expressions, prop.value]) : maybeSequenceExpression(mapLast(expressions, expr => t.unaryExpression("void", expr)));
  };
  return {
    name: "transform-class-static-block",
    manipulateOptions: (_, parser) => parser.plugins.push("classStaticBlock"),
    pre() {
      (0, _helperCreateClassFeaturesPlugin.enableFeature)(this.file, _helperCreateClassFeaturesPlugin.FEATURES.staticBlocks, false);
    },
    visitor: {
      ClassBody(classBody) {
        const {
          scope
        } = classBody;
        let parentPath = classBody.parentPath;
        if (parentPath.isClassExpression() && !parentPath.node.id) {
          do ({
            parentPath
          } = parentPath); while (parentPath && !namedEvaluationVisitor[parentPath.type] && !parentPath.isStatement());
          if (parentPath) {
            var _namedEvaluationVisit;
            (_namedEvaluationVisit = namedEvaluationVisitor[parentPath.type]) == null || _namedEvaluationVisit.enter.forEach(f => f.call(this, parentPath, this));
          }
        }
        const pendingStaticBlocks = [];
        let lastStaticProp = null;
        for (const path of classBody.get("body")) {
          if (path.isStaticBlock()) {
            pendingStaticBlocks.push(path.node);
            path.remove();
          } else if (path.isClassProperty({
            static: true
          }) || path.isClassPrivateProperty({
            static: true
          })) {
            lastStaticProp = path;
            if (pendingStaticBlocks.length > 0) {
              prependToInitializer(path.node, blocksToExpressions(pendingStaticBlocks));
              pendingStaticBlocks.length = 0;
            }
          }
        }
        if (pendingStaticBlocks.length > 0) {
          const tmp = scope.generateDeclaredUidIdentifier("staticBlock");
          let arrowBody;
          const needsCompletionValue = classBody.parentPath.isExpression();
          if (pendingStaticBlocks.length > 1 || pendingStaticBlocks[0].body.length === 1 && t.isExpressionStatement(pendingStaticBlocks[0].body[0])) {
            const expressions = blocksToExpressions(pendingStaticBlocks);
            if (needsCompletionValue) {
              expressions.push(t.thisExpression());
            }
            arrowBody = maybeSequenceExpression(expressions);
          } else {
            arrowBody = t.blockStatement(pendingStaticBlocks[0].body);
            if (needsCompletionValue) {
              arrowBody.body.push(t.returnStatement(t.thisExpression()));
            }
          }
          const init = template.expression.ast`${tmp} = () => ${arrowBody}`;
          if (lastStaticProp) {
            prependToInitializer(lastStaticProp.node, [init]);
          } else {
            const privateNames = new Set();
            for (const path of classBody.get("body")) {
              if (path.isPrivate()) {
                privateNames.add(path.get("key.id").node.name);
              }
            }
            const staticBlockPrivateId = generateUid(scope, privateNames);
            const staticBlockRef = t.privateName(t.identifier(staticBlockPrivateId));
            classBody.pushContainer("body", [t.classPrivateProperty(staticBlockRef, init, [], true)]);
          }
          const staticBlockClosureCall = t.callExpression(t.cloneNode(tmp), []);
          if (classBody.parentPath.isClassExpression()) {
            classBody.parentPath.replaceWith(t.sequenceExpression([classBody.parent, staticBlockClosureCall]));
          } else {
            classBody.parentPath.insertAfter(t.expressionStatement(staticBlockClosureCall));
          }
        }
      }
    }
  };
});

//# sourceMappingURL=index.js.map
