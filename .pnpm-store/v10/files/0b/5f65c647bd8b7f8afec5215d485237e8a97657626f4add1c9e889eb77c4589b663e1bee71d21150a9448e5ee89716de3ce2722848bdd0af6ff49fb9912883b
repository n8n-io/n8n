'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_ref_object_references$1 = require('../utils/ref-object-references.js');

//#region lib/rules/no-ref-as-operand.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_ref_as_operand = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const { extractRefObjectReferences } = require_ref_object_references$1.default;
	const utils = require_index.default;
	/**
	* @typedef {import('../utils/ref-object-references').RefObjectReferences} RefObjectReferences
	* @typedef {import('../utils/ref-object-references').RefObjectReferenceForIdentifier} RefObjectReferenceForIdentifier
	*/
	/**
	* Checks whether the given identifier reference has been initialized with a ref object.
	* @param {RefObjectReferenceForIdentifier | null} data
	* @returns {data is RefObjectReferenceForIdentifier}
	*/
	function isRefInit(data) {
		const init = data && data.variableDeclarator && data.variableDeclarator.init;
		if (!init) return false;
		return data.defineChain.includes(init);
	}
	/**
	* Get the callee member node from the given CallExpression
	* @param {CallExpression} node CallExpression
	*/
	function getNameParamNode(node) {
		const nameLiteralNode = node.arguments[0];
		if (nameLiteralNode && utils.isStringLiteral(nameLiteralNode)) {
			const name = utils.getStringLiteralValue(nameLiteralNode);
			if (name != null) return {
				name,
				loc: nameLiteralNode.loc
			};
		}
		return null;
	}
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
			type: "suggestion",
			docs: {
				description: "disallow use of value wrapped by `ref()` (Composition API) as an operand",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-ref-as-operand.html"
			},
			fixable: "code",
			schema: [],
			messages: { requireDotValue: "Must use `.value` to read or write the value wrapped by `{{method}}()`." }
		},
		create(context) {
			/** @type {RefObjectReferences} */
			let refReferences;
			const setupContexts = /* @__PURE__ */ new Map();
			/**
			* Collect identifier id
			* @param {Identifier} node
			* @param {Set<Identifier>} referenceIds
			*/
			function collectReferenceIds(node, referenceIds) {
				const variable = findVariable(utils.getScope(context, node), node);
				if (!variable) return;
				for (const reference of variable.references) referenceIds.add(reference.identifier);
			}
			/**
			* @param {Identifier} node
			*/
			function reportIfRefWrapped(node) {
				const data = refReferences.get(node);
				if (!isRefInit(data)) return;
				context.report({
					node,
					messageId: "requireDotValue",
					data: { method: data.method },
					fix(fixer) {
						return fixer.insertTextAfter(node, ".value");
					}
				});
			}
			/**
			* @param {CallExpression} node
			*/
			function reportWrappedIdentifiers(node) {
				const nodes = node.arguments.filter((node$1) => node$1.type === "Identifier");
				for (const node$1 of nodes) reportIfRefWrapped(node$1);
			}
			const programNode = context.sourceCode.ast;
			const callVisitor = { CallExpression(node, info) {
				if (!getNameParamNode(node)) return;
				const setupContext = setupContexts.get(info ? info.node : programNode);
				if (!setupContext) return;
				const { contextReferenceIds, emitReferenceIds } = setupContext;
				if (node.callee.type === "Identifier" && emitReferenceIds.has(node.callee)) reportWrappedIdentifiers(node);
				else {
					const emit = getCalleeMemberNode(node);
					if (emit && emit.name === "emit" && emit.member.object.type === "Identifier" && contextReferenceIds.has(emit.member.object)) reportWrappedIdentifiers(node);
				}
			} };
			return utils.compositingVisitors({
				Program() {
					refReferences = extractRefObjectReferences(context);
				},
				"IfStatement>Identifier"(node) {
					reportIfRefWrapped(node);
				},
				"SwitchStatement>Identifier"(node) {
					reportIfRefWrapped(node);
				},
				"UnaryExpression>Identifier"(node) {
					reportIfRefWrapped(node);
				},
				"UpdateExpression>Identifier"(node) {
					reportIfRefWrapped(node);
				},
				"BinaryExpression>Identifier"(node) {
					reportIfRefWrapped(node);
				},
				"AssignmentExpression>Identifier"(node) {
					if (node.parent.operator === "=" && node.parent.left !== node) return;
					reportIfRefWrapped(node);
				},
				"LogicalExpression>Identifier"(node) {
					if (node.parent.left !== node) return;
					const data = refReferences.get(node);
					if (!data || !data.variableDeclaration || data.variableDeclaration.kind !== "const") return;
					reportIfRefWrapped(node);
				},
				"ConditionalExpression>Identifier"(node) {
					if (node.parent.test !== node) return;
					reportIfRefWrapped(node);
				},
				":not(TaggedTemplateExpression)>TemplateLiteral>Identifier"(node) {
					reportIfRefWrapped(node);
				},
				"MemberExpression>Identifier"(node) {
					if (node.parent.object !== node) return;
					const name = utils.getStaticPropertyName(node.parent);
					if (name === "value" || name == null || name === "effect") return;
					reportIfRefWrapped(node);
				}
			}, utils.defineScriptSetupVisitor(context, {
				onDefineEmitsEnter(node) {
					if (!node.parent || node.parent.type !== "VariableDeclarator" || node.parent.init !== node) return;
					const emitParam = node.parent.id;
					if (emitParam.type !== "Identifier") return;
					const emitReferenceIds = /* @__PURE__ */ new Set();
					collectReferenceIds(emitParam, emitReferenceIds);
					setupContexts.set(programNode, {
						contextReferenceIds: /* @__PURE__ */ new Set(),
						emitReferenceIds
					});
				},
				...callVisitor
			}), utils.defineVueVisitor(context, {
				onSetupFunctionEnter(node, { node: vueNode }) {
					const contextParam = utils.skipDefaultParamValue(node.params[1]);
					if (!contextParam) return;
					if (contextParam.type === "RestElement" || contextParam.type === "ArrayPattern") return;
					const contextReferenceIds = /* @__PURE__ */ new Set();
					const emitReferenceIds = /* @__PURE__ */ new Set();
					if (contextParam.type === "ObjectPattern") {
						const emitProperty = utils.findAssignmentProperty(contextParam, "emit");
						if (!emitProperty || emitProperty.value.type !== "Identifier") return;
						collectReferenceIds(emitProperty.value, emitReferenceIds);
					} else collectReferenceIds(contextParam, contextReferenceIds);
					setupContexts.set(vueNode, {
						contextReferenceIds,
						emitReferenceIds
					});
				},
				...callVisitor,
				onVueObjectExit(node) {
					setupContexts.delete(node);
				}
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_ref_as_operand();
  }
});