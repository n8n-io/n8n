import { getStaticValue, findVariable } from "@eslint-community/eslint-utils";
import estraverse from "estraverse";
const functionTypes = /* @__PURE__ */ new Set([
  "FunctionExpression",
  "ArrowFunctionExpression",
  "FunctionDeclaration"
]);
const isFunctionType = (node) => !!node && functionTypes.has(node.type);
function isNormalFunctionExpression(node) {
  return !node.generator && !node.async;
}
function isRuleTesterConstruction(node) {
  return node.type === "NewExpression" && (node.callee.type === "Identifier" && node.callee.name === "RuleTester" || node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier" && node.callee.property.name === "RuleTester");
}
const interestingRuleKeys = ["create", "meta"];
const INTERESTING_RULE_KEYS = new Set(interestingRuleKeys);
const isInterestingRuleKey = (key) => INTERESTING_RULE_KEYS.has(key);
function collectInterestingProperties(properties, interestingKeys) {
  return properties.reduce(
    (parsedProps, prop) => {
      const keyValue = getKeyName(prop);
      if (prop.type === "Property" && keyValue && interestingKeys.has(keyValue)) {
        parsedProps[keyValue] = prop.value.type === "TSAsExpression" ? prop.value.expression : prop.value;
      }
      return parsedProps;
    },
    {}
  );
}
function hasObjectReturn(node) {
  let foundMatch = false;
  estraverse.traverse(node, {
    enter(child) {
      if (child.type === "ReturnStatement" && child.argument && child.argument.type === "ObjectExpression") {
        foundMatch = true;
      }
    },
    fallback: "iteration"
    // Don't crash on unexpected node types.
  });
  return foundMatch;
}
function isFunctionRule(node) {
  return isFunctionType(node) && // Is a function expression or declaration.
  isNormalFunctionExpression(node) && // Is a function definition.
  node.params.length === 1 && // The function has a single `context` argument.
  hasObjectReturn(node);
}
function isTypeScriptRuleHelper(node) {
  return node.type === "CallExpression" && node.arguments.length === 1 && node.arguments[0].type === "ObjectExpression" && // Check various TypeScript rule helper formats.
  // createESLintRule({ ... })
  (node.callee.type === "Identifier" || // util.createRule({ ... })
  node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" && node.callee.property.type === "Identifier" || // ESLintUtils.RuleCreator(docsUrl)({ ... })
  node.callee.type === "CallExpression" && node.callee.callee.type === "MemberExpression" && node.callee.callee.object.type === "Identifier" && node.callee.callee.property.type === "Identifier");
}
function getRuleExportsESM(ast, scopeManager) {
  const possibleNodes = [];
  for (const statement of ast.body) {
    switch (statement.type) {
      // export default rule;
      case "ExportDefaultDeclaration": {
        possibleNodes.push(statement.declaration);
        break;
      }
      // export = rule;
      case "TSExportAssignment": {
        possibleNodes.push(statement.expression);
        break;
      }
      // export const rule = { ... };
      // or export {rule};
      case "ExportNamedDeclaration": {
        for (const specifier of statement.specifiers) {
          possibleNodes.push(specifier.local);
        }
        if (statement.declaration) {
          const nodes = statement.declaration.type === "VariableDeclaration" ? statement.declaration.declarations.map((declarator) => declarator.init).filter((init) => !!init) : [statement.declaration];
          possibleNodes.push(
            ...nodes.filter((node) => node && !isFunctionType(node))
          );
        }
        break;
      }
    }
  }
  return possibleNodes.reduce((currentExports, node) => {
    if (node.type === "ObjectExpression") {
      return collectInterestingProperties(
        node.properties,
        INTERESTING_RULE_KEYS
      );
    } else if (isFunctionRule(node)) {
      return { create: node, meta: void 0, isNewStyle: false };
    } else if (isTypeScriptRuleHelper(node)) {
      return collectInterestingProperties(
        node.arguments[0].properties,
        INTERESTING_RULE_KEYS
      );
    } else if (node.type === "Identifier") {
      const possibleRule = findVariableValue(node, scopeManager);
      if (possibleRule) {
        if (possibleRule.type === "ObjectExpression") {
          return collectInterestingProperties(
            possibleRule.properties,
            INTERESTING_RULE_KEYS
          );
        } else if (isFunctionRule(possibleRule)) {
          return { create: possibleRule, meta: void 0, isNewStyle: false };
        } else if (isTypeScriptRuleHelper(possibleRule)) {
          return collectInterestingProperties(
            possibleRule.arguments[0].properties,
            INTERESTING_RULE_KEYS
          );
        }
      }
    }
    return currentExports;
  }, {});
}
function getRuleExportsCJS(ast, scopeManager) {
  let exportsVarOverridden = false;
  let exportsIsFunction = false;
  return ast.body.filter((statement) => statement.type === "ExpressionStatement").map((statement) => statement.expression).filter((expression) => expression.type === "AssignmentExpression").filter((expression) => expression.left.type === "MemberExpression").reduce((currentExports, node) => {
    const leftExpression = node.left;
    if (leftExpression.type !== "MemberExpression") return currentExports;
    if (leftExpression.object.type === "Identifier" && leftExpression.object.name === "module" && leftExpression.property.type === "Identifier" && leftExpression.property.name === "exports") {
      exportsVarOverridden = true;
      if (isFunctionRule(node.right)) {
        exportsIsFunction = true;
        return { create: node.right, meta: void 0, isNewStyle: false };
      } else if (node.right.type === "ObjectExpression") {
        return collectInterestingProperties(
          node.right.properties,
          INTERESTING_RULE_KEYS
        );
      } else if (node.right.type === "Identifier") {
        const possibleRule = findVariableValue(node.right, scopeManager);
        if (possibleRule) {
          if (possibleRule.type === "ObjectExpression") {
            return collectInterestingProperties(
              possibleRule.properties,
              INTERESTING_RULE_KEYS
            );
          } else if (isFunctionRule(possibleRule)) {
            return {
              create: possibleRule,
              meta: void 0,
              isNewStyle: false
            };
          }
        }
      }
      return {};
    } else if (!exportsIsFunction && leftExpression.object.type === "MemberExpression" && leftExpression.object.object.type === "Identifier" && leftExpression.object.object.name === "module" && leftExpression.object.property.type === "Identifier" && leftExpression.object.property.name === "exports" && leftExpression.property.type === "Identifier" && isInterestingRuleKey(leftExpression.property.name)) {
      currentExports[leftExpression.property.name] = node.right;
    } else if (!exportsVarOverridden && leftExpression.object.type === "Identifier" && leftExpression.object.name === "exports" && leftExpression.property.type === "Identifier" && isInterestingRuleKey(leftExpression.property.name)) {
      currentExports[leftExpression.property.name] = node.right;
    }
    return currentExports;
  }, {});
}
function findObjectPropertyValueByKeyName(obj, keyName) {
  const property = obj.properties.find(
    (prop) => prop.type === "Property" && prop.key.type === "Identifier" && prop.key.name === keyName
  );
  return property ? property.value : void 0;
}
function findVariableValue(node, scopeManager) {
  const variable = findVariable(
    scopeManager.acquire(node) || scopeManager.globalScope,
    node
  );
  if (variable && variable.defs && variable.defs[0] && variable.defs[0].node) {
    const variableDefNode = variable.defs[0].node;
    if (variableDefNode.type === "VariableDeclarator" && variableDefNode.init) {
      return variableDefNode.init;
    } else if (variableDefNode.type === "FunctionDeclaration") {
      return variableDefNode;
    }
  }
}
function collectArrayElements(node) {
  if (!node) {
    return [];
  }
  if (node.type === "ArrayExpression") {
    return node.elements.filter((element) => element !== null);
  }
  if (node.type === "ConditionalExpression") {
    return [
      ...collectArrayElements(node.consequent),
      ...collectArrayElements(node.alternate)
    ];
  }
  return [];
}
function getRuleInfo({
  ast,
  scopeManager
}) {
  const exportNodes = ast.sourceType === "module" ? getRuleExportsESM(ast, scopeManager) : getRuleExportsCJS(ast, scopeManager);
  const createExists = "create" in exportNodes;
  if (!createExists) {
    return null;
  }
  for (const key of interestingRuleKeys) {
    const exportNode = exportNodes[key];
    if (exportNode && exportNode.type === "Identifier") {
      const value = findVariableValue(exportNode, scopeManager);
      if (value) {
        exportNodes[key] = value;
      }
    }
  }
  const { create, ...remainingExportNodes } = exportNodes;
  if (!(isFunctionType(create) && isNormalFunctionExpression(create))) {
    return null;
  }
  return { isNewStyle: true, create, ...remainingExportNodes };
}
function getContextIdentifiers(scopeManager, ast) {
  const ruleInfo = getRuleInfo({ ast, scopeManager });
  const firstCreateParam = ruleInfo?.create.params[0];
  if (!ruleInfo || ruleInfo.create?.params.length === 0 || firstCreateParam?.type !== "Identifier") {
    return /* @__PURE__ */ new Set();
  }
  return new Set(
    scopeManager.getDeclaredVariables(ruleInfo.create).find((variable) => variable.name === firstCreateParam.name).references.map((ref) => ref.identifier)
  );
}
function getKeyName(property, scope) {
  if (!("key" in property)) {
    return null;
  }
  if (property.key.type === "Identifier") {
    if (property.computed) {
      if (scope) {
        const staticValue = getStaticValue(property.key, scope);
        return staticValue && typeof staticValue.value === "string" ? staticValue.value : null;
      }
      return null;
    }
    return property.key.name;
  }
  if (property.key.type === "Literal") {
    return "" + property.key.value;
  }
  if (property.key.type === "TemplateLiteral" && property.key.quasis.length === 1) {
    return property.key.quasis[0].value.cooked ?? null;
  }
  return null;
}
function extractFunctionBody(node) {
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    if (node.body.type === "BlockStatement") {
      return node.body.body;
    }
    return [node.body];
  }
  return [];
}
function checkStatementsForTestInfo(context, statements, variableIdentifiers = /* @__PURE__ */ new Set()) {
  const sourceCode = context.sourceCode;
  const runCalls = [];
  for (const statement of statements) {
    if (statement.type === "VariableDeclaration") {
      for (const declarator of statement.declarations) {
        if (!declarator.init) {
          continue;
        }
        const extracted = extractFunctionBody(declarator.init);
        runCalls.push(
          ...checkStatementsForTestInfo(
            context,
            extracted,
            variableIdentifiers
          )
        );
        if (isRuleTesterConstruction(declarator.init) && declarator.id.type === "Identifier") {
          const vars = sourceCode.getDeclaredVariables(declarator);
          vars.forEach((variable) => {
            variable.references.filter((ref) => ref.isRead()).forEach((ref) => variableIdentifiers.add(ref.identifier));
          });
        }
      }
    }
    if (statement.type === "FunctionDeclaration") {
      runCalls.push(
        ...checkStatementsForTestInfo(
          context,
          statement.body.body,
          variableIdentifiers
        )
      );
    }
    if (statement.type === "IfStatement") {
      const body = statement.consequent.type === "BlockStatement" ? statement.consequent.body : [statement.consequent];
      runCalls.push(
        ...checkStatementsForTestInfo(context, body, variableIdentifiers)
      );
      continue;
    }
    const expression = statement.type === "ExpressionStatement" ? statement.expression : statement;
    if (expression.type !== "CallExpression") {
      continue;
    }
    for (const arg of expression.arguments) {
      const extracted = extractFunctionBody(arg);
      runCalls.push(
        ...checkStatementsForTestInfo(context, extracted, variableIdentifiers)
      );
    }
    if (expression.callee.type === "MemberExpression" && (isRuleTesterConstruction(expression.callee.object) || variableIdentifiers.has(expression.callee.object)) && expression.callee.property.type === "Identifier" && expression.callee.property.name === "run") {
      runCalls.push(expression);
    }
  }
  return runCalls;
}
function getTestInfo(context, ast) {
  const runCalls = checkStatementsForTestInfo(context, ast.body);
  return runCalls.filter((call) => call.arguments.length >= 3).map((call) => call.arguments[2]).filter((call) => call.type === "ObjectExpression").map((run) => {
    const validProperty = run.properties.find(
      (prop) => getKeyName(prop) === "valid"
    );
    const invalidProperty = run.properties.find(
      (prop) => getKeyName(prop) === "invalid"
    );
    return {
      valid: validProperty && validProperty.type !== "SpreadElement" && validProperty.value.type === "ArrayExpression" ? validProperty.value.elements.filter(Boolean) : [],
      invalid: invalidProperty && invalidProperty.type !== "SpreadElement" && invalidProperty.value.type === "ArrayExpression" ? invalidProperty.value.elements.filter(Boolean) : []
    };
  });
}
function getReportInfo(node, context) {
  const reportArgs = node.arguments;
  if (reportArgs.length === 0) {
    return null;
  }
  if (reportArgs.length === 1) {
    if (reportArgs[0].type === "ObjectExpression") {
      return reportArgs[0].properties.reduce(
        (reportInfo, property) => {
          const propName = getKeyName(property);
          if (propName !== null && "value" in property) {
            return Object.assign(reportInfo, { [propName]: property.value });
          }
          return reportInfo;
        },
        {}
      );
    }
    return null;
  }
  let keys;
  const sourceCode = context.sourceCode;
  const scope = sourceCode.getScope(node);
  const secondArgStaticValue = getStaticValue(reportArgs[1], scope);
  if (secondArgStaticValue && typeof secondArgStaticValue.value === "string" || reportArgs[1].type === "TemplateLiteral") {
    keys = ["node", "message", "data", "fix"];
  } else if (reportArgs[1].type === "ObjectExpression" || reportArgs[1].type === "ArrayExpression" || reportArgs[1].type === "Literal" && typeof reportArgs[1].value !== "string" || secondArgStaticValue && ["object", "number"].includes(typeof secondArgStaticValue.value)) {
    keys = ["node", "loc", "message", "data", "fix"];
  } else {
    return null;
  }
  return Object.fromEntries(
    keys.slice(0, reportArgs.length).map((key, index) => [key, reportArgs[index]])
  );
}
function getSourceCodeIdentifiers(scopeManager, ast) {
  return new Set(
    [...getContextIdentifiers(scopeManager, ast)].filter(
      (identifier) => identifier.parent && identifier.parent.type === "MemberExpression" && identifier === identifier.parent.object && identifier.parent.property.type === "Identifier" && identifier.parent.property.name === "getSourceCode" && identifier.parent.parent.type === "CallExpression" && identifier.parent === identifier.parent.parent.callee && identifier.parent.parent.parent.type === "VariableDeclarator" && identifier.parent.parent === identifier.parent.parent.parent.init && identifier.parent.parent.parent.id.type === "Identifier"
    ).flatMap(
      (identifier) => scopeManager.getDeclaredVariables(identifier.parent.parent.parent)
    ).flatMap((variable) => variable.references).map((ref) => ref.identifier)
  );
}
function insertProperty(fixer, node, propertyText, sourceCode) {
  if (node.properties.length === 0) {
    return fixer.replaceText(node, `{
${propertyText}
}`);
  }
  const lastProperty = node.properties.at(-1);
  if (!lastProperty) {
    return fixer.replaceText(node, `{
${propertyText}
}`);
  }
  return fixer.insertTextAfter(
    sourceCode.getLastToken(lastProperty),
    `,
${propertyText}`
  );
}
function collectReportViolationAndSuggestionData(reportInfo) {
  return [
    // Violation message
    {
      messageId: reportInfo.messageId,
      message: reportInfo.message,
      data: reportInfo.data,
      fix: reportInfo.fix
    },
    // Suggestion messages
    ...collectArrayElements(reportInfo.suggest).map((suggestObjNode) => {
      if (suggestObjNode.type !== "ObjectExpression") {
        return null;
      }
      return {
        messageId: findObjectPropertyValueByKeyName(
          suggestObjNode,
          "messageId"
        ),
        message: findObjectPropertyValueByKeyName(suggestObjNode, "desc"),
        // Note: suggestion message named `desc`
        data: findObjectPropertyValueByKeyName(suggestObjNode, "data"),
        fix: findObjectPropertyValueByKeyName(suggestObjNode, "fix")
      };
    }).filter((item) => item !== null)
  ];
}
function isAutoFixerFunction(node, contextIdentifiers, context) {
  const parent = node.parent;
  return ["FunctionExpression", "ArrowFunctionExpression"].includes(node.type) && parent.parent.type === "ObjectExpression" && parent.parent.parent.type === "CallExpression" && parent.parent.parent.callee.type === "MemberExpression" && contextIdentifiers.has(parent.parent.parent.callee.object) && parent.parent.parent.callee.property.type === "Identifier" && parent.parent.parent.callee.property.name === "report" && getReportInfo(parent.parent.parent, context)?.fix === node;
}
function isSuggestionFixerFunction(node, contextIdentifiers, context) {
  const parent = node.parent;
  return (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") && parent.type === "Property" && parent.key.type === "Identifier" && parent.key.name === "fix" && parent.parent.type === "ObjectExpression" && parent.parent.parent.type === "ArrayExpression" && parent.parent.parent.parent.type === "Property" && parent.parent.parent.parent.key.type === "Identifier" && parent.parent.parent.parent.key.name === "suggest" && parent.parent.parent.parent.parent.type === "ObjectExpression" && parent.parent.parent.parent.parent.parent.type === "CallExpression" && contextIdentifiers.has(
    // @ts-expect-error -- Property 'object' does not exist on type 'Expression | Super'.  Property 'object' does not exist on type 'ClassExpression'.ts(2339)
    parent.parent.parent.parent.parent.parent.callee.object
  ) && // @ts-expect-error -- Property 'property' does not exist on type 'Expression | Super'.  Property 'property' does not exist on type 'ClassExpression'.ts(2339)
  parent.parent.parent.parent.parent.parent.callee.property.name === "report" && getReportInfo(parent.parent.parent.parent.parent.parent, context)?.suggest === parent.parent.parent;
}
function evaluateObjectProperties(objectNode, scopeManager) {
  if (!objectNode || objectNode.type !== "ObjectExpression") {
    return [];
  }
  return objectNode.properties.flatMap((property) => {
    if (property.type === "SpreadElement") {
      const value = findVariableValue(
        property.argument,
        scopeManager
      );
      if (value && value.type === "ObjectExpression") {
        return value.properties;
      }
      return [];
    }
    return [property];
  });
}
function getMetaDocsProperty(propertyName, ruleInfo, scopeManager) {
  const metaNode = ruleInfo.meta ?? void 0;
  const docsNode = evaluateObjectProperties(metaNode, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === "docs");
  const metaPropertyNode = evaluateObjectProperties(
    docsNode?.value,
    scopeManager
  ).filter((node) => node.type === "Property").find((p) => getKeyName(p) === propertyName);
  return { docsNode, metaNode, metaPropertyNode };
}
function getMessagesNode(ruleInfo, scopeManager) {
  if (!ruleInfo) {
    return;
  }
  const metaNode = ruleInfo.meta ?? void 0;
  const messagesNode = evaluateObjectProperties(metaNode, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === "messages");
  if (messagesNode) {
    if (messagesNode.value.type === "ObjectExpression") {
      return messagesNode.value;
    }
    const value = findVariableValue(
      messagesNode.value,
      scopeManager
    );
    if (value && value.type === "ObjectExpression") {
      return value;
    }
  }
}
function getMessageIdNodes(ruleInfo, scopeManager) {
  const messagesNode = getMessagesNode(ruleInfo, scopeManager);
  return messagesNode && messagesNode.type === "ObjectExpression" ? evaluateObjectProperties(messagesNode, scopeManager) : void 0;
}
function getMessageIdNodeById(messageId, ruleInfo, scopeManager, scope) {
  return getMessageIdNodes(ruleInfo, scopeManager)?.filter((node) => node.type === "Property").find((p) => getKeyName(p, scope) === messageId);
}
function getMetaSchemaNode(metaNode, scopeManager) {
  return evaluateObjectProperties(metaNode, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === "schema");
}
function getMetaSchemaNodeProperty(schemaNode, scopeManager) {
  if (!schemaNode) {
    return null;
  }
  let { value } = schemaNode;
  if (value.type === "Identifier" && value.name !== "undefined") {
    const variable = findVariable(
      scopeManager.acquire(value) || scopeManager.globalScope,
      value
    );
    if (!variable || !variable.defs || !variable.defs[0] || !variable.defs[0].node || variable.defs[0].node.type !== "VariableDeclarator" || !variable.defs[0].node.init) {
      return null;
    }
    value = variable.defs[0].node.init;
  }
  return value;
}
function findPossibleVariableValues(node, scopeManager) {
  const variable = findVariable(
    scopeManager.acquire(node) || scopeManager.globalScope,
    node
  );
  return (variable && variable.references || []).flatMap((ref) => {
    if (ref.writeExpr && (ref.writeExpr.parent.type !== "AssignmentExpression" || ref.writeExpr.parent.operator === "=")) {
      return [ref.writeExpr];
    }
    return [];
  });
}
function isUndefinedIdentifier(node) {
  return node.type === "Identifier" && node.name === "undefined";
}
function isVariableFromParameter(node, scopeManager) {
  const variable = findVariable(
    scopeManager.acquire(node) || scopeManager.globalScope,
    node
  );
  return variable?.defs[0]?.type === "Parameter";
}
export {
  collectReportViolationAndSuggestionData,
  evaluateObjectProperties,
  findPossibleVariableValues,
  getContextIdentifiers,
  getKeyName,
  getMessageIdNodeById,
  getMessageIdNodes,
  getMessagesNode,
  getMetaDocsProperty,
  getMetaSchemaNode,
  getMetaSchemaNodeProperty,
  getReportInfo,
  getRuleInfo,
  getSourceCodeIdentifiers,
  getTestInfo,
  insertProperty,
  isAutoFixerFunction,
  isSuggestionFixerFunction,
  isUndefinedIdentifier,
  isVariableFromParameter
};
