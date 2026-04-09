'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-is.js
/**
* @fileoverview enforce valid `v-is` directives
* @author Yosuke Ota
*/
var require_valid_v_is = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Check whether the given node is valid or not.
	* @param {VElement} node The element node to check.
	* @returns {boolean} `true` if the node is valid.
	*/
	function isValidElement(node) {
		if (utils.isHtmlElementNode(node) && !utils.isHtmlWellKnownElementName(node.rawName)) return false;
		return true;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-is` directives",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-is.html"
			},
			fixable: null,
			schema: [],
			messages: {
				unexpectedArgument: "'v-is' directives require no argument.",
				unexpectedModifier: "'v-is' directives require no modifier.",
				expectedValue: "'v-is' directives require that attribute value.",
				ownerMustBeHTMLElement: "'v-is' directive must be owned by a native HTML element, but '{{name}}' is not."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='is']"(node) {
				if (node.key.argument) context.report({
					node: node.key.argument,
					messageId: "unexpectedArgument"
				});
				const lastModifier = node.key.modifiers.at(-1);
				if (lastModifier) context.report({
					node,
					loc: {
						start: node.key.modifiers[0].loc.start,
						end: lastModifier.loc.end
					},
					messageId: "unexpectedModifier"
				});
				if (!node.value || utils.isEmptyValueDirective(node, context)) context.report({
					node,
					messageId: "expectedValue"
				});
				const element = node.parent.parent;
				if (!isValidElement(element)) {
					const name = element.name;
					context.report({
						node,
						messageId: "ownerMustBeHTMLElement",
						data: { name }
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_v_is();
  }
});