'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-expose-after-await.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_expose_after_await = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* Get the callee member node from the given CallExpression
	* @param {CallExpression} node CallExpression
	*/
	function getCalleeMemberNode(node) {
		const callee = utils.skipChainExpression(node.callee);
		if (callee.type === "MemberExpression") {
			const name = utils.getStaticPropertyName(callee);
			if (name) return {
				name,
				member: callee
			};
		}
		return null;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow asynchronously registered `expose`",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-expose-after-await.html"
			},
			fixable: null,
			schema: [],
			messages: { forbidden: "`{{name}}` is forbidden after an `await` expression." }
		},
		create(context) {
			/**
			* @typedef {object} SetupScopeData
			* @property {boolean} afterAwait
			* @property {[number,number]} range
			* @property {(node: Identifier, callNode: CallExpression) => boolean} isExposeReferenceId
			* @property {(node: Identifier) => boolean} isContextReferenceId
			*/
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program} scopeNode
			*/
			/** @type {Map<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program, SetupScopeData>} */
			const setupScopes = /* @__PURE__ */ new Map();
			/** @type {ScopeStack | null} */
			let scopeStack = null;
			return utils.compositingVisitors({ Program(node) {
				scopeStack = {
					upper: scopeStack,
					scopeNode: node
				};
			} }, {
				":function"(node) {
					scopeStack = {
						upper: scopeStack,
						scopeNode: node
					};
				},
				":function:exit"() {
					scopeStack = scopeStack && scopeStack.upper;
				},
				AwaitExpression(node) {
					if (!scopeStack) return;
					const setupScope = setupScopes.get(scopeStack.scopeNode);
					if (!setupScope || !utils.inRange(setupScope.range, node)) return;
					setupScope.afterAwait = true;
				},
				CallExpression(node) {
					if (!scopeStack) return;
					const setupScope = setupScopes.get(scopeStack.scopeNode);
					if (!setupScope || !setupScope.afterAwait || !utils.inRange(setupScope.range, node)) return;
					const { isContextReferenceId, isExposeReferenceId } = setupScope;
					if (node.callee.type === "Identifier" && isExposeReferenceId(node.callee, node)) context.report({
						node,
						messageId: "forbidden",
						data: { name: node.callee.name }
					});
					else {
						const expose = getCalleeMemberNode(node);
						if (expose && expose.name === "expose" && expose.member.object.type === "Identifier" && isContextReferenceId(expose.member.object)) context.report({
							node,
							messageId: "forbidden",
							data: { name: expose.name }
						});
					}
				}
			}, (() => {
				const scriptSetup = utils.getScriptSetupElement(context);
				if (!scriptSetup) return {};
				return { Program(node) {
					setupScopes.set(node, {
						afterAwait: false,
						range: scriptSetup.range,
						isExposeReferenceId: (id, callNode) => callNode.parent.type === "ExpressionStatement" && callNode.parent.parent === node && id.name === "defineExpose",
						isContextReferenceId: () => false
					});
				} };
			})(), utils.defineVueVisitor(context, {
				onSetupFunctionEnter(node) {
					const contextParam = node.params[1];
					if (!contextParam) return;
					if (contextParam.type === "RestElement") return;
					if (contextParam.type === "ArrayPattern") return;
					/** @type {Set<Identifier>} */
					const contextReferenceIds = /* @__PURE__ */ new Set();
					/** @type {Set<Identifier>} */
					const exposeReferenceIds = /* @__PURE__ */ new Set();
					if (contextParam.type === "ObjectPattern") {
						const exposeProperty = utils.findAssignmentProperty(contextParam, "expose");
						if (!exposeProperty) return;
						const exposeParam = exposeProperty.value;
						const variable = exposeParam.type === "Identifier" ? findVariable(utils.getScope(context, exposeParam), exposeParam) : null;
						if (!variable) return;
						for (const reference of variable.references) {
							if (!reference.isRead()) continue;
							exposeReferenceIds.add(reference.identifier);
						}
					} else if (contextParam.type === "Identifier") {
						const variable = findVariable(utils.getScope(context, contextParam), contextParam);
						if (!variable) return;
						for (const reference of variable.references) {
							if (!reference.isRead()) continue;
							contextReferenceIds.add(reference.identifier);
						}
					}
					setupScopes.set(node, {
						afterAwait: false,
						range: node.range,
						isExposeReferenceId: (id) => exposeReferenceIds.has(id),
						isContextReferenceId: (id) => contextReferenceIds.has(id)
					});
				},
				onSetupFunctionExit(node) {
					setupScopes.delete(node);
				}
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_expose_after_await();
  }
});