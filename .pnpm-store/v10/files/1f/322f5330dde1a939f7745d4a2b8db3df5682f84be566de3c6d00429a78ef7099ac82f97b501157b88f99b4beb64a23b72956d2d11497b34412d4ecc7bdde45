'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-duplicate-attr-inheritance.js
/**
* @fileoverview Disable inheritAttrs when using v-bind="$attrs"
* @author Hiroki Osame
*/
var require_no_duplicate_attr_inheritance = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/** @param {VElement[]} elements */
	function isConditionalGroup(elements) {
		const firstElement = elements[0];
		const lastElement = elements.at(-1);
		if (!lastElement || elements.length < 2) return false;
		const inBetweenElements = elements.slice(1, -1);
		return utils.hasDirective(firstElement, "if") && (utils.hasDirective(lastElement, "else-if") || utils.hasDirective(lastElement, "else")) && inBetweenElements.every((element) => utils.hasDirective(element, "else-if"));
	}
	/** @param {VElement[]} elements */
	function isMultiRootNodes(elements) {
		if (elements.length > 1 && !isConditionalGroup(elements)) return true;
		return false;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce `inheritAttrs` to be set to `false` when using `v-bind=\"$attrs\"`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-duplicate-attr-inheritance.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { checkMultiRootNodes: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: { noDuplicateAttrInheritance: "Set \"inheritAttrs\" to false." }
		},
		create(context) {
			const checkMultiRootNodes = (context.options[0] || {}).checkMultiRootNodes === true;
			/** @type {Literal['value']} */
			let inheritsAttrs = true;
			/** @type {VReference[]} */
			const attrsRefs = [];
			/** @param {ObjectExpression} node */
			function processOptions(node) {
				const inheritAttrsProp = utils.findProperty(node, "inheritAttrs");
				if (inheritAttrsProp && inheritAttrsProp.value.type === "Literal") inheritsAttrs = inheritAttrsProp.value.value;
			}
			return utils.compositingVisitors(utils.executeOnVue(context, processOptions), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				if (node.arguments.length === 0) return;
				const define = node.arguments[0];
				if (define.type !== "ObjectExpression") return;
				processOptions(define);
			} }), utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind'][key.argument=null] > VExpressionContainer"(node) {
				if (!inheritsAttrs) return;
				const reference = node.references.find((reference$1) => {
					if (reference$1.variable != null) return false;
					return reference$1.id.name === "$attrs";
				});
				if (reference) attrsRefs.push(reference);
			} }), { "Program:exit"(program) {
				const element = program.templateBody;
				if (element == null) return;
				const rootElements = element.children.filter(utils.isVElement);
				if (!checkMultiRootNodes && isMultiRootNodes(rootElements)) return;
				if (attrsRefs.length > 0) for (const attrsRef of attrsRefs) context.report({
					node: attrsRef.id,
					messageId: "noDuplicateAttrInheritance"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_duplicate_attr_inheritance();
  }
});