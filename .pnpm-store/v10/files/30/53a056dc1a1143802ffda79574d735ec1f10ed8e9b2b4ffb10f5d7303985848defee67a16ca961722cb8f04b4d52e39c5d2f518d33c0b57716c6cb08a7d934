'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-unused-emit-declarations.js
/**
* @author ItMaga
* See LICENSE file in root directory for full license.
*/
var require_no_unused_emit_declarations = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').ComponentEmit} ComponentEmit
	* @typedef {import('../utils').VueObjectData} VueObjectData
	*/
	/**
	* @typedef {object} SetupContext
	* @property {Set<Identifier>} contextReferenceIds
	* @property {Set<Identifier>} emitReferenceIds
	*/
	/**
	* @typedef {object} NameWithLoc
	* @property {string} name
	* @property {SourceLocation} loc
	* @property {Range} range
	*/
	/**
	* Get the name param node from the given CallExpression
	* @param {CallExpression} node CallExpression
	* @returns {NameWithLoc | null}
	*/
	function getNameParamNode(node) {
		const nameLiteralNode = node.arguments[0];
		if (nameLiteralNode && utils.isStringLiteral(nameLiteralNode)) {
			const name = utils.getStringLiteralValue(nameLiteralNode);
			if (name != null) return {
				name,
				loc: nameLiteralNode.loc,
				range: nameLiteralNode.range
			};
		}
		return null;
	}
	/**
	* Check if the given node is a reference of setup context
	* @param {Expression | Super | SpreadElement} value
	* @param {SetupContext} setupContext
	* @returns {boolean}
	* */
	function hasReferenceId(value, setupContext) {
		const { contextReferenceIds, emitReferenceIds } = setupContext;
		return value.type === "Identifier" && (emitReferenceIds.has(value) || contextReferenceIds.has(value));
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow unused emit declarations",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-unused-emit-declarations.html"
			},
			fixable: null,
			schema: [],
			messages: { unused: "`{{name}}` is defined as emit but never used." }
		},
		create(context) {
			/** @type {Map<string, ComponentEmit>} */
			const emitDeclarations = /* @__PURE__ */ new Map();
			/** @type {Map<string, Expression>} */
			const emitCalls = /* @__PURE__ */ new Map();
			/** @type {Map<ObjectExpression | Program, SetupContext>} */
			const setupContexts = /* @__PURE__ */ new Map();
			const programNode = context.sourceCode.ast;
			let emitParamName = "";
			/**
			* @param {CallExpression} node
			* */
			function addEmitCall(node) {
				const nameParamNode = getNameParamNode(node);
				if (nameParamNode) emitCalls.set(nameParamNode.name, node);
			}
			function clearEmits() {
				emitCalls.clear();
				emitDeclarations.clear();
			}
			/**
			* @param {Expression | SpreadElement} expression
			* @param {SetupContext} setupContext
			* @returns {boolean}
			* */
			function checkExpressionReference(expression, setupContext) {
				if (expression.type === "MemberExpression") {
					if (hasReferenceId(utils.skipChainExpression(expression.object), setupContext)) {
						clearEmits();
						return true;
					}
				}
				if (hasReferenceId(expression, setupContext)) {
					clearEmits();
					return true;
				}
				return false;
			}
			/**
			*
			* @param {Array<Expression | SpreadElement>} args
			* @param {SetupContext} setupContext
			* @returns {boolean}
			*/
			function verifyArgumentsReferences(args, setupContext) {
				for (const argument of args) {
					if (argument.type === "ObjectExpression") {
						for (const property of argument.properties) if (property.type === "Property" && checkExpressionReference(property.value, setupContext)) return true;
					}
					if (argument.type === "ArrayExpression") for (const element of argument.elements) {
						if (!element) continue;
						if (checkExpressionReference(element, setupContext)) return true;
					}
					if (checkExpressionReference(argument, setupContext)) return true;
				}
				return false;
			}
			/**
			* @param {Expression | Super} callee
			* @param {Set<Identifier>} referenceIds
			* @param {CallExpression} node
			* */
			function addEmitCallByReference(callee, referenceIds, node) {
				if (callee.type === "Identifier" && referenceIds.has(callee)) addEmitCall(node);
			}
			const callVisitor = { CallExpression(node, info) {
				const callee = utils.skipChainExpression(node.callee);
				let emit = null;
				if (callee.type === "MemberExpression") {
					const name = utils.getStaticPropertyName(callee);
					if (name === "emit" || name === "$emit") emit = {
						name,
						member: callee
					};
				}
				const vueDefineNode = info ? info.node : programNode;
				const setupContext = setupContexts.get(vueDefineNode);
				if (setupContext) {
					if (callee.parent.type === "CallExpression" && callee.parent.arguments && verifyArgumentsReferences(callee.parent.arguments, setupContext)) return;
					const { contextReferenceIds, emitReferenceIds } = setupContext;
					addEmitCallByReference(callee, emitReferenceIds, node);
					if (emit && emit.name === "emit") addEmitCallByReference(utils.skipChainExpression(emit.member.object), contextReferenceIds, node);
				}
				if (emit && emit.name === "$emit") {
					const memObject = utils.skipChainExpression(emit.member.object);
					if (utils.isThis(memObject, context)) addEmitCall(node);
				}
				if (callee.type === "Identifier" && (callee.name === "$emit" || callee.name === emitParamName)) addEmitCall(node);
			} };
			return utils.compositingVisitors(utils.defineTemplateBodyVisitor(context, callVisitor), utils.defineVueVisitor(context, {
				...callVisitor,
				onVueObjectEnter(node) {
					for (const emit of utils.getComponentEmitsFromOptions(node)) if (emit.emitName) emitDeclarations.set(emit.emitName, emit);
				},
				onSetupFunctionEnter(node, { node: vueNode }) {
					const contextParam = node.params[1];
					if (!contextParam || contextParam.type === "RestElement" || contextParam.type === "ArrayPattern") return;
					/** @type {Set<Identifier>} */
					const contextReferenceIds = /* @__PURE__ */ new Set();
					/** @type {Set<Identifier>} */
					const emitReferenceIds = /* @__PURE__ */ new Set();
					if (contextParam.type === "ObjectPattern") {
						const emitProperty = utils.findAssignmentProperty(contextParam, "emit");
						if (!emitProperty) return;
						const emitParam = emitProperty.value;
						const variable = emitParam.type === "Identifier" ? findVariable(utils.getScope(context, emitParam), emitParam) : null;
						if (!variable) return;
						for (const reference of variable.references) emitReferenceIds.add(reference.identifier);
					} else if (contextParam.type === "Identifier") {
						const variable = findVariable(utils.getScope(context, contextParam), contextParam);
						for (const reference of variable.references) contextReferenceIds.add(reference.identifier);
					}
					setupContexts.set(vueNode, {
						contextReferenceIds,
						emitReferenceIds
					});
				}
			}), utils.defineScriptSetupVisitor(context, {
				onDefineEmitsEnter(node, emits) {
					for (const emit of emits) if (emit.emitName) emitDeclarations.set(emit.emitName, emit);
					if (!node.parent || node.parent.type !== "VariableDeclarator" || node.parent.init !== node) return;
					const emitParam = node.parent.id;
					if (emitParam.type !== "Identifier") return;
					emitParamName = emitParam.name;
					const variable = findVariable(utils.getScope(context, emitParam), emitParam);
					if (!variable) return;
					/** @type {Set<Identifier>} */
					const emitReferenceIds = /* @__PURE__ */ new Set();
					for (const reference of variable.references) emitReferenceIds.add(reference.identifier);
					setupContexts.set(programNode, {
						contextReferenceIds: /* @__PURE__ */ new Set(),
						emitReferenceIds
					});
				},
				onDefineModelEnter(node, model) {
					if (node.parent && node.parent.type === "VariableDeclarator" && node.parent.init === node) emitCalls.set(`update:${model.name.modelName}`, node);
				},
				...callVisitor
			}), { "Program:exit"() {
				for (const [name, emit] of emitDeclarations) if (!emitCalls.has(name) && emit.node) context.report({
					node: emit.node,
					loc: emit.node.loc,
					messageId: "unused",
					data: { name }
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_unused_emit_declarations();
  }
});