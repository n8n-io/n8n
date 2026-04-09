'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-explicit-slots.js
/**
* @author Mussin Benarbia
* See LICENSE file in root directory for full license.
*/
var require_require_explicit_slots = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('@typescript-eslint/types').TSESTree.TypeNode} TypeNode
	* @typedef {import('@typescript-eslint/types').TSESTree.TypeElement} TypeElement
	*/
	/**
	* @param {TypeElement} node
	* @return {string | null}
	*/
	function getSlotsName(node) {
		if (node.type !== "TSMethodSignature" && node.type !== "TSPropertySignature") return null;
		const key = node.key;
		if (key.type === "Literal") return typeof key.value === "string" ? key.value : null;
		if (key.type === "Identifier") return key.name;
		return null;
	}
	/**
	* @param {VElement} node
	* @return {VAttribute | VDirective | undefined}
	*/
	function getSlotNameNode(node) {
		return node.startTag.attributes.find((node$1) => !node$1.directive && node$1.key.name === "name" || node$1.directive && node$1.key.name.name === "bind" && node$1.key.argument?.type === "VIdentifier" && node$1.key.argument?.name === "name");
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require slots to be explicitly defined",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/require-explicit-slots.html"
			},
			fixable: null,
			schema: [],
			messages: {
				requireExplicitSlots: "Slots must be explicitly defined.",
				alreadyDefinedSlot: "Slot {{slotName}} is already defined."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const documentFragment = sourceCode.parserServices.getDocumentFragment && sourceCode.parserServices.getDocumentFragment();
			if (!documentFragment) return {};
			if (documentFragment.children.filter(
				/** @returns {element is VElement} */
				(element) => utils.isVElement(element) && element.name === "script"
			).every((script) => !utils.hasAttribute(script, "lang", "ts"))) return {};
			const slotsDefined = /* @__PURE__ */ new Set();
			/**
			* @param {VElement} node
			* @param {string | undefined} slotName
			*/
			function reportMissingSlot(node, slotName) {
				if (!slotsDefined.has(slotName)) context.report({
					node,
					messageId: "requireExplicitSlots"
				});
			}
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefineSlotsEnter(_node, slots) {
				for (const slot of slots) {
					if (!slot.slotName) continue;
					if (slotsDefined.has(slot.slotName)) context.report({
						node: slot.node,
						messageId: "alreadyDefinedSlot",
						data: { slotName: slot.slotName }
					});
					else slotsDefined.add(slot.slotName);
				}
			} }), utils.executeOnVue(context, (obj) => {
				const slotsProperty = utils.findProperty(obj, "slots");
				if (!slotsProperty) return;
				const slotsTypeHelper = slotsProperty.value.type === "TSAsExpression" && slotsProperty.value.typeAnnotation?.typeName.name === "SlotsType" && slotsProperty.value.typeAnnotation;
				if (!slotsTypeHelper) return;
				const param = ("typeArguments" in slotsTypeHelper ? slotsTypeHelper.typeArguments : slotsTypeHelper.typeParameters)?.params[0];
				if (!param) return;
				if (param.type === "TSTypeLiteral") for (const memberNode of param.members) {
					const slotName = getSlotsName(memberNode);
					if (!slotName) continue;
					if (slotsDefined.has(slotName)) context.report({
						node: memberNode,
						messageId: "alreadyDefinedSlot",
						data: { slotName }
					});
					else slotsDefined.add(slotName);
				}
			}), utils.defineTemplateBodyVisitor(context, { "VElement[name='slot']"(node) {
				const nameNode = getSlotNameNode(node);
				if (!nameNode) {
					reportMissingSlot(node, "default");
					return;
				}
				if (nameNode.directive) {
					const expression = nameNode.value?.expression;
					if (!expression || !utils.isStringLiteral(expression)) return;
					reportMissingSlot(node, utils.getStringLiteralValue(expression) || void 0);
				} else reportMissingSlot(node, nameNode.value?.value);
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_explicit_slots();
  }
});