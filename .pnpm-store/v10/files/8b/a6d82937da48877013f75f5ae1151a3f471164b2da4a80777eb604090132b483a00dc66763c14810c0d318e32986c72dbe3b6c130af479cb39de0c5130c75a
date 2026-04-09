import { findVariable, getStaticValue } from "@eslint-community/eslint-utils";
import estraverse from "estraverse";

//#region lib/utils.ts
const functionTypes = new Set([
	"FunctionExpression",
	"ArrowFunctionExpression",
	"FunctionDeclaration"
]);
const isFunctionType = (node) => !!node && functionTypes.has(node.type);
/**
* Determines whether a node is a 'normal' (i.e. non-async, non-generator) function expression.
* @param node The node in question
* @returns `true` if the node is a normal function expression
*/
function isNormalFunctionExpression(node) {
	return !node.generator && !node.async;
}
/**
* Determines whether a node is constructing a RuleTester instance
* @param {ASTNode} node The node in question
* @returns `true` if the node is probably constructing a RuleTester instance
*/
function isRuleTesterConstruction(node) {
	return node.type === "NewExpression" && (node.callee.type === "Identifier" && node.callee.name === "RuleTester" || node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier" && node.callee.property.name === "RuleTester");
}
const interestingRuleKeys = ["create", "meta"];
const INTERESTING_RULE_KEYS = new Set(interestingRuleKeys);
const isInterestingRuleKey = (key) => INTERESTING_RULE_KEYS.has(key);
/**
* Collect properties from an object that have interesting key names into a new object
* @param properties
* @param interestingKeys
*/
function collectInterestingProperties(properties, interestingKeys) {
	return properties.reduce((parsedProps, prop) => {
		const keyValue = getKeyName(prop);
		if (prop.type === "Property" && keyValue && interestingKeys.has(keyValue)) parsedProps[keyValue] = prop.value.type === "TSAsExpression" ? prop.value.expression : prop.value;
		return parsedProps;
	}, {});
}
/**
* Check if there is a return statement that returns an object somewhere inside the given node.
*/
function hasObjectReturn(node) {
	let foundMatch = false;
	estraverse.traverse(node, {
		enter(child) {
			if (child.type === "ReturnStatement" && child.argument && child.argument.type === "ObjectExpression") foundMatch = true;
		},
		fallback: "iteration"
	});
	return foundMatch;
}
/**
* Determine if the given node is likely to be a function-style rule.
* @param node
*/
function isFunctionRule(node) {
	return isFunctionType(node) && isNormalFunctionExpression(node) && node.params.length === 1 && hasObjectReturn(node);
}
/**
* Check if the given node is a function call representing a known TypeScript rule creator format.
*/
function isTypeScriptRuleHelper(node) {
	return node.type === "CallExpression" && node.arguments.length === 1 && node.arguments[0].type === "ObjectExpression" && (node.callee.type === "Identifier" || node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" && node.callee.property.type === "Identifier" || node.callee.type === "CallExpression" && node.callee.callee.type === "MemberExpression" && node.callee.callee.object.type === "Identifier" && node.callee.callee.property.type === "Identifier");
}
/**
* Helper for `getRuleInfo`. Handles ESM and TypeScript rules.
*/
function getRuleExportsESM(ast, scopeManager) {
	const possibleNodes = [];
	for (const statement of ast.body) switch (statement.type) {
		case "ExportDefaultDeclaration":
			possibleNodes.push(statement.declaration);
			break;
		case "TSExportAssignment":
			possibleNodes.push(statement.expression);
			break;
		case "ExportNamedDeclaration":
			for (const specifier of statement.specifiers) possibleNodes.push(specifier.local);
			if (statement.declaration) {
				const nodes = statement.declaration.type === "VariableDeclaration" ? statement.declaration.declarations.map((declarator) => declarator.init).filter((init) => !!init) : [statement.declaration];
				possibleNodes.push(...nodes.filter((node) => node && !isFunctionType(node)));
			}
			break;
	}
	return possibleNodes.reduce((currentExports, node) => {
		if (node.type === "ObjectExpression") return collectInterestingProperties(node.properties, INTERESTING_RULE_KEYS);
		else if (isFunctionRule(node)) return {
			create: node,
			meta: void 0,
			isNewStyle: false
		};
		else if (isTypeScriptRuleHelper(node)) return collectInterestingProperties(node.arguments[0].properties, INTERESTING_RULE_KEYS);
		else if (node.type === "Identifier") {
			const possibleRule = findVariableValue(node, scopeManager);
			if (possibleRule) {
				if (possibleRule.type === "ObjectExpression") return collectInterestingProperties(possibleRule.properties, INTERESTING_RULE_KEYS);
				else if (isFunctionRule(possibleRule)) return {
					create: possibleRule,
					meta: void 0,
					isNewStyle: false
				};
				else if (isTypeScriptRuleHelper(possibleRule)) return collectInterestingProperties(possibleRule.arguments[0].properties, INTERESTING_RULE_KEYS);
			}
		}
		return currentExports;
	}, {});
}
/**
* Helper for `getRuleInfo`. Handles CJS rules.
*/
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
				return {
					create: node.right,
					meta: void 0,
					isNewStyle: false
				};
			} else if (node.right.type === "ObjectExpression") return collectInterestingProperties(node.right.properties, INTERESTING_RULE_KEYS);
			else if (node.right.type === "Identifier") {
				const possibleRule = findVariableValue(node.right, scopeManager);
				if (possibleRule) {
					if (possibleRule.type === "ObjectExpression") return collectInterestingProperties(possibleRule.properties, INTERESTING_RULE_KEYS);
					else if (isFunctionRule(possibleRule)) return {
						create: possibleRule,
						meta: void 0,
						isNewStyle: false
					};
				}
			}
			return {};
		} else if (!exportsIsFunction && leftExpression.object.type === "MemberExpression" && leftExpression.object.object.type === "Identifier" && leftExpression.object.object.name === "module" && leftExpression.object.property.type === "Identifier" && leftExpression.object.property.name === "exports" && leftExpression.property.type === "Identifier" && isInterestingRuleKey(leftExpression.property.name)) currentExports[leftExpression.property.name] = node.right;
		else if (!exportsVarOverridden && leftExpression.object.type === "Identifier" && leftExpression.object.name === "exports" && leftExpression.property.type === "Identifier" && isInterestingRuleKey(leftExpression.property.name)) currentExports[leftExpression.property.name] = node.right;
		return currentExports;
	}, {});
}
/**
* Find the value of a property in an object by its property key name.
* @param obj
* @returns property value
*/
function findObjectPropertyValueByKeyName(obj, keyName) {
	const property = obj.properties.find((prop) => prop.type === "Property" && prop.key.type === "Identifier" && prop.key.name === keyName);
	return property ? property.value : void 0;
}
/**
* Get the first value (or function) that a variable is initialized to.
* @param node - the Identifier node for the variable.
* @returns the first value (or function) that the given variable is initialized to.
*/
function findVariableValue(node, scopeManager) {
	const variable = findVariable(scopeManager.acquire(node) || scopeManager.globalScope, node);
	if (variable && variable.defs && variable.defs[0] && variable.defs[0].node) {
		const variableDefNode = variable.defs[0].node;
		if (variableDefNode.type === "VariableDeclarator" && variableDefNode.init) return variableDefNode.init;
		else if (variableDefNode.type === "FunctionDeclaration") return variableDefNode;
	}
}
/**
* Retrieve all possible elements from an array.
* If a ternary conditional expression is involved, retrieve the elements that may exist on both sides of it.
* Ex: [a, b, c] will return [a, b, c]
* Ex: foo ? [a, b, c] : [d, e, f] will return [a, b, c, d, e, f]
* @returns the list of elements
*/
function collectArrayElements(node) {
	if (!node) return [];
	if (node.type === "ArrayExpression") return node.elements.filter((element) => element !== null);
	if (node.type === "ConditionalExpression") return [...collectArrayElements(node.consequent), ...collectArrayElements(node.alternate)];
	return [];
}
/**
* Performs static analysis on an AST to try to determine the final value of `module.exports`.
* @param sourceCode The object contains `Program` AST node, and optional `scopeManager`
* @returns An object with keys `meta`, `create`, and `isNewStyle`. `meta` and `create` correspond to the AST nodes
for the final values of `module.exports.meta` and `module.exports.create`. `isNewStyle` will be `true` if `module.exports`
is an object, and `false` if `module.exports` is just the `create` function. If no valid ESLint rule info can be extracted
from the file, the return value will be `null`.
*/
function getRuleInfo({ ast, scopeManager }) {
	const exportNodes = ast.sourceType === "module" ? getRuleExportsESM(ast, scopeManager) : getRuleExportsCJS(ast, scopeManager);
	if (!("create" in exportNodes)) return null;
	for (const key of interestingRuleKeys) {
		const exportNode = exportNodes[key];
		if (exportNode && exportNode.type === "Identifier") {
			const value = findVariableValue(exportNode, scopeManager);
			if (value) exportNodes[key] = value;
		}
	}
	const { create, ...remainingExportNodes } = exportNodes;
	if (!(isFunctionType(create) && isNormalFunctionExpression(create))) return null;
	return {
		isNewStyle: true,
		create,
		...remainingExportNodes
	};
}
/**
* Gets all the identifiers referring to the `context` variable in a rule source file. Note that this function will
* only work correctly after traversing the AST has started (e.g. in the first `Program` node).
* @param scopeManager
* @param ast The `Program` node for the file
* @returns A Set of all `Identifier` nodes that are references to the `context` value for the file
*/
function getContextIdentifiers(scopeManager, ast) {
	const ruleInfo = getRuleInfo({
		ast,
		scopeManager
	});
	const firstCreateParam = ruleInfo?.create.params[0];
	if (!ruleInfo || ruleInfo.create?.params.length === 0 || firstCreateParam?.type !== "Identifier") return /* @__PURE__ */ new Set();
	return new Set(scopeManager.getDeclaredVariables(ruleInfo.create).find((variable) => variable.name === firstCreateParam.name).references.map((ref) => ref.identifier));
}
/**
* Gets the key name of a Property, if it can be determined statically.
* @param node The `Property` node
* @param scope
* @returns The key name, or `null` if the name cannot be determined statically.
*/
function getKeyName(property, scope) {
	if (!("key" in property)) return null;
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
	if (property.key.type === "Literal") return "" + property.key.value;
	if (property.key.type === "TemplateLiteral" && property.key.quasis.length === 1) return property.key.quasis[0].value.cooked ?? null;
	return null;
}
/**
* Extracts the body of a function if the given node is a function
*
* @param node
*/
function extractFunctionBody(node) {
	if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
		if (node.body.type === "BlockStatement") return node.body.body;
		return [node.body];
	}
	return [];
}
/**
* Checks the given statements for possible test info
*
* @param context The `context` variable for the source file itself
* @param statements The statements to check
* @param variableIdentifiers
*/
function checkStatementsForTestInfo(context, statements, variableIdentifiers = /* @__PURE__ */ new Set()) {
	const sourceCode = context.sourceCode;
	const runCalls = [];
	for (const statement of statements) {
		if (statement.type === "VariableDeclaration") for (const declarator of statement.declarations) {
			if (!declarator.init) continue;
			const extracted = extractFunctionBody(declarator.init);
			runCalls.push(...checkStatementsForTestInfo(context, extracted, variableIdentifiers));
			if (isRuleTesterConstruction(declarator.init) && declarator.id.type === "Identifier") sourceCode.getDeclaredVariables(declarator).forEach((variable) => {
				variable.references.filter((ref) => ref.isRead()).forEach((ref) => variableIdentifiers.add(ref.identifier));
			});
		}
		if (statement.type === "FunctionDeclaration") runCalls.push(...checkStatementsForTestInfo(context, statement.body.body, variableIdentifiers));
		if (statement.type === "IfStatement") {
			const body = statement.consequent.type === "BlockStatement" ? statement.consequent.body : [statement.consequent];
			runCalls.push(...checkStatementsForTestInfo(context, body, variableIdentifiers));
			continue;
		}
		const expression = statement.type === "ExpressionStatement" ? statement.expression : statement;
		if (expression.type !== "CallExpression") continue;
		for (const arg of expression.arguments) {
			const extracted = extractFunctionBody(arg);
			runCalls.push(...checkStatementsForTestInfo(context, extracted, variableIdentifiers));
		}
		if (expression.callee.type === "MemberExpression" && (isRuleTesterConstruction(expression.callee.object) || variableIdentifiers.has(expression.callee.object)) && expression.callee.property.type === "Identifier" && expression.callee.property.name === "run") runCalls.push(expression);
	}
	return runCalls;
}
/**
* Performs static analysis on an AST to try to find test cases
* @param context The `context` variable for the source file itself
* @param ast The `Program` node for the file.
* @returns A list of objects with `valid` and `invalid` keys containing a list of AST nodes corresponding to tests
*/
function getTestInfo(context, ast) {
	return checkStatementsForTestInfo(context, ast.body).filter((call) => call.arguments.length >= 3).map((call) => call.arguments[2]).filter((call) => call.type === "ObjectExpression").map((run) => {
		const validProperty = run.properties.find((prop) => getKeyName(prop) === "valid");
		const invalidProperty = run.properties.find((prop) => getKeyName(prop) === "invalid");
		return {
			valid: validProperty && validProperty.type !== "SpreadElement" && validProperty.value.type === "ArrayExpression" ? validProperty.value.elements.filter(Boolean) : [],
			invalid: invalidProperty && invalidProperty.type !== "SpreadElement" && invalidProperty.value.type === "ArrayExpression" ? invalidProperty.value.elements.filter(Boolean) : []
		};
	});
}
/**
* Gets information on a report, given the ASTNode of context.report().
* @param node The ASTNode of context.report()
*/
function getReportInfo(node, context) {
	const reportArgs = node.arguments;
	if (reportArgs.length === 0) return null;
	if (reportArgs.length === 1) {
		if (reportArgs[0].type === "ObjectExpression") return reportArgs[0].properties.reduce((reportInfo, property) => {
			const propName = getKeyName(property);
			if (propName !== null && "value" in property) return Object.assign(reportInfo, { [propName]: property.value });
			return reportInfo;
		}, {});
		return null;
	}
	let keys;
	const scope = context.sourceCode.getScope(node);
	const secondArgStaticValue = getStaticValue(reportArgs[1], scope);
	if (secondArgStaticValue && typeof secondArgStaticValue.value === "string" || reportArgs[1].type === "TemplateLiteral") keys = [
		"node",
		"message",
		"data",
		"fix"
	];
	else if (reportArgs[1].type === "ObjectExpression" || reportArgs[1].type === "ArrayExpression" || reportArgs[1].type === "Literal" && typeof reportArgs[1].value !== "string" || secondArgStaticValue && ["object", "number"].includes(typeof secondArgStaticValue.value)) keys = [
		"node",
		"loc",
		"message",
		"data",
		"fix"
	];
	else return null;
	return Object.fromEntries(keys.slice(0, reportArgs.length).map((key, index) => [key, reportArgs[index]]));
}
/**
* Gets a set of all `sourceCode` identifiers.
* @param scopeManager
* @param ast The AST of the file. This must have `parent` properties.
* @returns A set of all identifiers referring to the `SourceCode` object.
*/
function getSourceCodeIdentifiers(scopeManager, ast) {
	return new Set([...getContextIdentifiers(scopeManager, ast)].filter((identifier) => identifier.parent && identifier.parent.type === "MemberExpression" && identifier === identifier.parent.object && identifier.parent.property.type === "Identifier" && identifier.parent.property.name === "getSourceCode" && identifier.parent.parent.type === "CallExpression" && identifier.parent === identifier.parent.parent.callee && identifier.parent.parent.parent.type === "VariableDeclarator" && identifier.parent.parent === identifier.parent.parent.parent.init && identifier.parent.parent.parent.id.type === "Identifier").flatMap((identifier) => scopeManager.getDeclaredVariables(identifier.parent.parent.parent)).flatMap((variable) => variable.references).map((ref) => ref.identifier));
}
/**
* Insert a given property into a given object literal.
* @param fixer The fixer.
* @param node The ObjectExpression node to insert a property.
* @param propertyText The property code to insert.
*/
function insertProperty(fixer, node, propertyText, sourceCode) {
	if (node.properties.length === 0) return fixer.replaceText(node, `{\n${propertyText}\n}`);
	const lastProperty = node.properties.at(-1);
	if (!lastProperty) return fixer.replaceText(node, `{\n${propertyText}\n}`);
	return fixer.insertTextAfter(sourceCode.getLastToken(lastProperty), `,\n${propertyText}`);
}
/**
* Collect all context.report({...}) violation/suggestion-related nodes into a standardized array for convenience.
* @param reportInfo - Result of getReportInfo().
* @returns {messageId?: String, message?: String, data?: Object, fix?: Function}[]
*/
function collectReportViolationAndSuggestionData(reportInfo) {
	return [{
		messageId: reportInfo.messageId,
		message: reportInfo.message,
		data: reportInfo.data,
		fix: reportInfo.fix
	}, ...collectArrayElements(reportInfo.suggest).map((suggestObjNode) => {
		if (suggestObjNode.type !== "ObjectExpression") return null;
		return {
			messageId: findObjectPropertyValueByKeyName(suggestObjNode, "messageId"),
			message: findObjectPropertyValueByKeyName(suggestObjNode, "desc"),
			data: findObjectPropertyValueByKeyName(suggestObjNode, "data"),
			fix: findObjectPropertyValueByKeyName(suggestObjNode, "fix")
		};
	}).filter((item) => item !== null)];
}
/**
* Whether the provided node represents an autofixer function.
* @param node
* @param contextIdentifiers
*/
function isAutoFixerFunction(node, contextIdentifiers, context) {
	const parent = node.parent;
	return ["FunctionExpression", "ArrowFunctionExpression"].includes(node.type) && parent.parent.type === "ObjectExpression" && parent.parent.parent.type === "CallExpression" && parent.parent.parent.callee.type === "MemberExpression" && contextIdentifiers.has(parent.parent.parent.callee.object) && parent.parent.parent.callee.property.type === "Identifier" && parent.parent.parent.callee.property.name === "report" && getReportInfo(parent.parent.parent, context)?.fix === node;
}
/**
* Whether the provided node represents a suggestion fixer function.
* @param node
* @param contextIdentifiers
* @param context
*/
function isSuggestionFixerFunction(node, contextIdentifiers, context) {
	const parent = node.parent;
	return (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") && parent.type === "Property" && parent.key.type === "Identifier" && parent.key.name === "fix" && parent.parent.type === "ObjectExpression" && parent.parent.parent.type === "ArrayExpression" && parent.parent.parent.parent.type === "Property" && parent.parent.parent.parent.key.type === "Identifier" && parent.parent.parent.parent.key.name === "suggest" && parent.parent.parent.parent.parent.type === "ObjectExpression" && parent.parent.parent.parent.parent.parent.type === "CallExpression" && contextIdentifiers.has(parent.parent.parent.parent.parent.parent.callee.object) && parent.parent.parent.parent.parent.parent.callee.property.name === "report" && getReportInfo(parent.parent.parent.parent.parent.parent, context)?.suggest === parent.parent.parent;
}
/**
* List all properties contained in an object.
* Evaluates and includes any properties that may be behind spreads.
* @param objectNode
* @param scopeManager
* @returns the list of all properties that could be found
*/
function evaluateObjectProperties(objectNode, scopeManager) {
	if (!objectNode || objectNode.type !== "ObjectExpression") return [];
	return objectNode.properties.flatMap((property) => {
		if (property.type === "SpreadElement") {
			const value = findVariableValue(property.argument, scopeManager);
			if (value && value.type === "ObjectExpression") return value.properties;
			return [];
		}
		return [property];
	});
}
function getMetaDocsProperty(propertyName, ruleInfo, scopeManager) {
	const metaNode = ruleInfo.meta ?? void 0;
	const docsNode = evaluateObjectProperties(metaNode, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === "docs");
	return {
		docsNode,
		metaNode,
		metaPropertyNode: evaluateObjectProperties(docsNode?.value, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === propertyName)
	};
}
/**
* Get the `meta.messages` node from a rule.
* @param ruleInfo
* @param scopeManager
*/
function getMessagesNode(ruleInfo, scopeManager) {
	if (!ruleInfo) return;
	const messagesNode = evaluateObjectProperties(ruleInfo.meta ?? void 0, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === "messages");
	if (messagesNode) {
		if (messagesNode.value.type === "ObjectExpression") return messagesNode.value;
		const value = findVariableValue(messagesNode.value, scopeManager);
		if (value && value.type === "ObjectExpression") return value;
	}
}
/**
* Get the list of messageId properties from `meta.messages` for a rule.
* @param ruleInfo
* @param scopeManager
*/
function getMessageIdNodes(ruleInfo, scopeManager) {
	const messagesNode = getMessagesNode(ruleInfo, scopeManager);
	return messagesNode && messagesNode.type === "ObjectExpression" ? evaluateObjectProperties(messagesNode, scopeManager) : void 0;
}
/**
* Get the messageId property from a rule's `meta.messages` that matches the given `messageId`.
* @param messageId - the messageId to check for
* @param ruleInfo
* @param scopeManager
* @param scope
* @returns The matching messageId property from `meta.messages`.
*/
function getMessageIdNodeById(messageId, ruleInfo, scopeManager, scope) {
	return getMessageIdNodes(ruleInfo, scopeManager)?.filter((node) => node.type === "Property").find((p) => getKeyName(p, scope) === messageId);
}
function getMetaSchemaNode(metaNode, scopeManager) {
	return evaluateObjectProperties(metaNode, scopeManager).filter((node) => node.type === "Property").find((p) => getKeyName(p) === "schema");
}
function getMetaSchemaNodeProperty(schemaNode, scopeManager) {
	if (!schemaNode) return null;
	let { value } = schemaNode;
	if (value.type === "Identifier" && value.name !== "undefined") {
		const variable = findVariable(scopeManager.acquire(value) || scopeManager.globalScope, value);
		if (!variable || !variable.defs || !variable.defs[0] || !variable.defs[0].node || variable.defs[0].node.type !== "VariableDeclarator" || !variable.defs[0].node.init) return null;
		value = variable.defs[0].node.init;
	}
	return value;
}
/**
* Get the possible values that a variable was initialized to at some point.
* @param node - the Identifier node for the variable.
* @param scopeManager
* @returns the values that the given variable could be initialized to.
*/
function findPossibleVariableValues(node, scopeManager) {
	const variable = findVariable(scopeManager.acquire(node) || scopeManager.globalScope, node);
	return (variable && variable.references || []).flatMap((ref) => {
		if (ref.writeExpr && (ref.writeExpr.parent.type !== "AssignmentExpression" || ref.writeExpr.parent.operator === "=")) return [ref.writeExpr];
		return [];
	});
}
/**
* @param node
* @returns Whether the node is an Identifier with name `undefined`.
*/
function isUndefinedIdentifier(node) {
	return node.type === "Identifier" && node.name === "undefined";
}
function isStringLiteral(node) {
	return node.type === "Literal" && typeof node.value === "string";
}
/**
* Check whether a variable's definition is from a function parameter.
* @param node - the Identifier node for the variable.
* @param scopeManager
* @returns whether the variable comes from a function parameter
*/
function isVariableFromParameter(node, scopeManager) {
	return findVariable(scopeManager.acquire(node) || scopeManager.globalScope, node)?.defs[0]?.type === "Parameter";
}

//#endregion
export { collectReportViolationAndSuggestionData, evaluateObjectProperties, findPossibleVariableValues, getContextIdentifiers, getKeyName, getMessageIdNodeById, getMessageIdNodes, getMessagesNode, getMetaDocsProperty, getMetaSchemaNode, getMetaSchemaNodeProperty, getReportInfo, getRuleInfo, getSourceCodeIdentifiers, getTestInfo, insertProperty, isAutoFixerFunction, isStringLiteral, isSuggestionFixerFunction, isUndefinedIdentifier, isVariableFromParameter };