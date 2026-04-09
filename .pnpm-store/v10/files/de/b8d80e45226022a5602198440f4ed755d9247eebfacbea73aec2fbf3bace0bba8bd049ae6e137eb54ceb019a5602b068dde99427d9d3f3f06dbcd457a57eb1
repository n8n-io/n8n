'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-setup-props-reactivity-loss.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_setup_props_reactivity_loss = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {'props'|'prop'} PropIdKind
	*    - `'props'`: A node is a container object that has props.
	*    - `'prop'`: A node is a variable with one prop.
	*/
	/**
	* @typedef {object} PropId
	* @property {Pattern} node
	* @property {PropIdKind} kind
	*/
	/**
	* Iterates over Prop identifiers by parsing the given pattern
	* in the left operand of defineProps().
	* @param {Pattern} node
	* @returns {IterableIterator<PropId>}
	*/
	function* iteratePropIds(node) {
		switch (node.type) {
			case "ObjectPattern":
				for (const prop of node.properties) yield prop.type === "Property" ? {
					node: unwrapAssignment(prop.value),
					kind: "prop"
				} : {
					node: unwrapAssignment(prop.argument),
					kind: "props"
				};
				break;
			default: yield {
				node: unwrapAssignment(node),
				kind: "props"
			};
		}
	}
	/**
	* @template {Pattern} T
	* @param {T} node
	* @returns {Pattern}
	*/
	function unwrapAssignment(node) {
		if (node.type === "AssignmentPattern") return node.left;
		return node;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow usages that lose the reactivity of `props` passed to `setup`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-setup-props-reactivity-loss.html"
			},
			fixable: null,
			schema: [],
			messages: {
				destructuring: "Destructuring the `props` will cause the value to lose reactivity.",
				getProperty: "Getting a value from the `props` in root scope of `{{scopeName}}` will cause the value to lose reactivity."
			}
		},
		create(context) {
			/**
			* @typedef {object} ScopePropsReferences
			* @property {object} refs
			* @property {Set<Identifier>} refs.props A set of references to container objects with multiple props.
			* @property {Set<Identifier>} refs.prop A set of references a variable with one property.
			* @property {string} scopeName
			*/
			/** @type {Map<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program, ScopePropsReferences>} */
			const setupScopePropsReferenceIds = /* @__PURE__ */ new Map();
			const wrapperExpressionTypes = new Set(["ArrayExpression", "ObjectExpression"]);
			/**
			* @param {ESNode} node
			* @param {string} messageId
			* @param {string} scopeName
			*/
			function report(node, messageId, scopeName) {
				context.report({
					node,
					messageId,
					data: { scopeName }
				});
			}
			/**
			* @param {Pattern} left
			* @param {Expression | null} right
			* @param {ScopePropsReferences} propsReferences
			*/
			function verify(left, right, propsReferences) {
				if (!right) return;
				const rightNode = utils.skipChainExpression(right);
				if (wrapperExpressionTypes.has(rightNode.type) && isPropsMemberAccessed(rightNode, propsReferences)) {
					report(rightNode, "getProperty", propsReferences.scopeName);
					return;
				}
				/** @type {Expression | Super} */
				let expression = rightNode;
				while (expression.type === "MemberExpression") expression = utils.skipChainExpression(expression.object);
				/** @type {Expression[]} A list of expression nodes to verify */
				const expressions = [];
				switch (expression.type) {
					case "TemplateLiteral":
						expressions.push(...expression.expressions);
						break;
					case "ConditionalExpression":
						expressions.push(expression.test, expression.consequent, expression.alternate);
						break;
					case "Identifier":
						expressions.push(expression);
						break;
				}
				if ((left.type === "ArrayPattern" || left.type === "ObjectPattern") && expressions.some((expr) => expr.type === "Identifier" && propsReferences.refs.props.has(expr))) {
					report(left, "getProperty", propsReferences.scopeName);
					return;
				}
				const reportNode = expressions.find((expr) => isPropsMemberAccessed(expr, propsReferences));
				if (reportNode) report(reportNode, "getProperty", propsReferences.scopeName);
			}
			/**
			* @param {Expression | Super} node
			* @param {ScopePropsReferences} propsReferences
			*/
			function isPropsMemberAccessed(node, propsReferences) {
				for (const props of propsReferences.refs.props) {
					const isPropsInExpressionRange = utils.inRange(node.range, props);
					const isPropsMemberExpression = props.parent.type === "MemberExpression" && props.parent.object === props;
					if (isPropsInExpressionRange && isPropsMemberExpression) return true;
				}
				for (const prop of propsReferences.refs.prop) if (utils.inRange(node.range, prop)) return true;
				return false;
			}
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program} scopeNode
			*/
			/**
			* @type {ScopeStack | null}
			*/
			let scopeStack = null;
			/**
			* @param {PropId} propId
			* @param {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program} scopeNode
			* @param {import('eslint').Scope.Scope} currentScope
			* @param {string} scopeName
			*/
			function processPropId({ node, kind }, scopeNode, currentScope, scopeName) {
				if (node.type === "RestElement" || node.type === "AssignmentPattern" || node.type === "MemberExpression") return;
				if (node.type === "ArrayPattern" || node.type === "ObjectPattern") {
					report(node, "destructuring", scopeName);
					return;
				}
				const variable = findVariable(currentScope, node);
				if (!variable) return;
				let scopePropsReferences = setupScopePropsReferenceIds.get(scopeNode);
				if (!scopePropsReferences) {
					scopePropsReferences = {
						refs: {
							props: /* @__PURE__ */ new Set(),
							prop: /* @__PURE__ */ new Set()
						},
						scopeName
					};
					setupScopePropsReferenceIds.set(scopeNode, scopePropsReferences);
				}
				const propsReferenceIds = scopePropsReferences.refs[kind];
				for (const reference of variable.references) {
					if (reference.from !== currentScope) continue;
					if (!reference.isRead()) continue;
					propsReferenceIds.add(reference.identifier);
				}
			}
			return utils.compositingVisitors({
				"Program, :function"(node) {
					scopeStack = {
						upper: scopeStack,
						scopeNode: node
					};
				},
				"Program, :function:exit"(node) {
					scopeStack = scopeStack && scopeStack.upper;
					setupScopePropsReferenceIds.delete(node);
				},
				CallExpression(node) {
					if (!scopeStack) return;
					const propsReferenceIds = setupScopePropsReferenceIds.get(scopeStack.scopeNode);
					if (!propsReferenceIds) return;
					if (isPropsMemberAccessed(node, propsReferenceIds)) report(node, "getProperty", propsReferenceIds.scopeName);
				},
				VariableDeclarator(node) {
					if (!scopeStack) return;
					const propsReferenceIds = setupScopePropsReferenceIds.get(scopeStack.scopeNode);
					if (!propsReferenceIds) return;
					verify(node.id, node.init, propsReferenceIds);
				},
				AssignmentExpression(node) {
					if (!scopeStack) return;
					const propsReferenceIds = setupScopePropsReferenceIds.get(scopeStack.scopeNode);
					if (!propsReferenceIds) return;
					verify(node.left, node.right, propsReferenceIds);
				}
			}, utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(node) {
				let target = node;
				if (target.parent && target.parent.type === "CallExpression" && target.parent.arguments[0] === target && target.parent.callee.type === "Identifier" && target.parent.callee.name === "withDefaults") target = target.parent;
				if (!target.parent) return;
				/** @type {Pattern|null} */
				let id = null;
				if (target.parent.type === "VariableDeclarator") id = target.parent.init === target ? target.parent.id : null;
				else if (target.parent.type === "AssignmentExpression") id = target.parent.right === target ? target.parent.left : null;
				if (!id) return;
				const currentScope = utils.getScope(context, node);
				for (const propId of iteratePropIds(id)) processPropId(propId, context.sourceCode.ast, currentScope, "<script setup>");
			} }), utils.defineVueVisitor(context, { onSetupFunctionEnter(node) {
				const currentScope = utils.getScope(context, node);
				const propsParam = utils.skipDefaultParamValue(node.params[0]);
				if (!propsParam) return;
				processPropId({
					node: propsParam,
					kind: "props"
				}, node, currentScope, "setup()");
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_setup_props_reactivity_loss();
  }
});