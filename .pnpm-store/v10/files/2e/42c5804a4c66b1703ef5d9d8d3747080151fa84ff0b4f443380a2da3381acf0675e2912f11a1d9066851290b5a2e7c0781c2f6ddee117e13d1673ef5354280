'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/custom-event-name-casing.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_custom_event_name_casing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const { toRegExpGroupMatcher } = require_regexp$1.default;
	/**
	* @typedef {import('../utils').VueObjectData} VueObjectData
	*/
	const ALLOWED_CASE_OPTIONS = ["kebab-case", "camelCase"];
	const DEFAULT_CASE = "camelCase";
	/**
	* @typedef {object} NameWithLoc
	* @property {string} name
	* @property {SourceLocation} loc
	*/
	/**
	* Get the name param node from the given CallExpression
	* @param {CallExpression} node CallExpression
	* @returns { NameWithLoc | null }
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
				description: "enforce specific casing for custom event name",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/custom-event-name-casing.html"
			},
			fixable: null,
			schema: [{ enum: ALLOWED_CASE_OPTIONS }, {
				type: "object",
				properties: { ignores: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true,
					additionalItems: false
				} },
				additionalProperties: false
			}],
			messages: { unexpected: "Custom event name '{{name}}' must be {{caseType}}." }
		},
		create(context) {
			/** @type {Map<ObjectExpression|Program, {contextReferenceIds:Set<Identifier>,emitReferenceIds:Set<Identifier>}>} */
			const setupContexts = /* @__PURE__ */ new Map();
			let emitParamName = "";
			const caseType = context.options[0] || DEFAULT_CASE;
			const objectOption = context.options[1] || {};
			const caseChecker = casing.getChecker(caseType);
			const isIgnored = toRegExpGroupMatcher(objectOption.ignores);
			/**
			* Check whether the given event name is valid.
			* @param {string} name The name to check.
			* @returns {boolean} `true` if the given event name is valid.
			*/
			function isValidEventName(name) {
				return caseChecker(name) || name.startsWith("update:");
			}
			/**
			* @param { NameWithLoc } nameWithLoc
			*/
			function verify(nameWithLoc) {
				const name = nameWithLoc.name;
				if (isValidEventName(name) || isIgnored(name)) return;
				context.report({
					loc: nameWithLoc.loc,
					messageId: "unexpected",
					data: {
						name,
						caseType
					}
				});
			}
			const programNode = context.sourceCode.ast;
			const callVisitor = { CallExpression(node, info) {
				const nameWithLoc = getNameParamNode(node);
				if (!nameWithLoc) return;
				const setupContext = setupContexts.get(info ? info.node : programNode);
				if (setupContext) {
					const { contextReferenceIds, emitReferenceIds } = setupContext;
					if (node.callee.type === "Identifier" && emitReferenceIds.has(node.callee)) verify(nameWithLoc);
					else {
						const emit = getCalleeMemberNode(node);
						if (emit && emit.name === "emit" && emit.member.object.type === "Identifier" && contextReferenceIds.has(emit.member.object)) verify(nameWithLoc);
					}
				}
			} };
			return utils.defineTemplateBodyVisitor(context, { CallExpression(node) {
				const callee = node.callee;
				const nameWithLoc = getNameParamNode(node);
				if (!nameWithLoc) return;
				if (callee.type === "Identifier" && (callee.name === "$emit" || callee.name === emitParamName)) verify(nameWithLoc);
			} }, utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
				onDefineEmitsEnter(node) {
					if (!node.parent || node.parent.type !== "VariableDeclarator" || node.parent.init !== node) return;
					const emitParam = node.parent.id;
					if (emitParam.type !== "Identifier") return;
					emitParamName = emitParam.name;
					const variable = findVariable(utils.getScope(context, emitParam), emitParam);
					if (!variable) return;
					const emitReferenceIds = /* @__PURE__ */ new Set();
					for (const reference of variable.references) emitReferenceIds.add(reference.identifier);
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
						const emitParam = emitProperty.value;
						const variable = findVariable(utils.getScope(context, emitParam), emitParam);
						if (!variable) return;
						for (const reference of variable.references) emitReferenceIds.add(reference.identifier);
					} else {
						const variable = findVariable(utils.getScope(context, contextParam), contextParam);
						if (!variable) return;
						for (const reference of variable.references) contextReferenceIds.add(reference.identifier);
					}
					setupContexts.set(vueNode, {
						contextReferenceIds,
						emitReferenceIds
					});
				},
				...callVisitor,
				onVueObjectExit(node) {
					setupContexts.delete(node);
				}
			}), { CallExpression(node) {
				const nameLiteralNode = getNameParamNode(node);
				if (!nameLiteralNode) return;
				const emit = getCalleeMemberNode(node);
				if (emit && emit.name === "$emit") verify(nameLiteralNode);
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_custom_event_name_casing();
  }
});