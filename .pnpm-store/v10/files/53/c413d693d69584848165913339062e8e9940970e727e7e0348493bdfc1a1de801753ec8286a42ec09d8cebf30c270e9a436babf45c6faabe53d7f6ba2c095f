'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-toggle-inside-transition.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_require_toggle_inside_transition = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @param {VDirective} vBindAppear
	*/
	function isValidBindAppear(vBindAppear) {
		if (vBindAppear.value?.expression && vBindAppear.value.expression.type === "Literal") return vBindAppear.value.expression?.value !== false;
		return true;
	}
	/**
	* @param {string[]} directives
	*/
	function createDirectiveList(directives) {
		let str = "";
		for (const [index, directive] of directives.entries()) if (index === 0) str += `\`v-${directive}\``;
		else if (index < directives.length - 1) str += `, \`v-${directive}\``;
		else str += ` or \`v-${directive}\``;
		return str;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require control the display of the content inside `<transition>`",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/require-toggle-inside-transition.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { additionalDirectives: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true
				} },
				additionalProperties: false
			}],
			messages: { expected: "The element inside `<transition>` is expected to have a {{allowedDirectives}} directive." }
		},
		create(context) {
			const allowedDirectives = [
				"if",
				"show",
				...context.options[0] && context.options[0].additionalDirectives || []
			];
			const allowedDirectivesString = createDirectiveList(allowedDirectives);
			/**
			* Check if the given element has display control.
			* @param {VElement} element The element node to check.
			*/
			function verifyInsideElement(element) {
				if (utils.isCustomComponent(element)) return;
				/** @type VElement */ const parent = element.parent;
				const vBindAppear = utils.getDirective(parent, "bind", "appear");
				if (utils.hasAttribute(parent, "appear") || vBindAppear && isValidBindAppear(vBindAppear)) return;
				if (element.name !== "slot" && !allowedDirectives.some((directive) => utils.hasDirective(element, directive)) && !utils.hasDirective(element, "bind", "key")) context.report({
					node: element.startTag,
					loc: element.startTag.loc,
					messageId: "expected",
					data: { allowedDirectives: allowedDirectivesString }
				});
			}
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='transition'] > VElement"(node) {
				if (node.parent.children.find(utils.isVElement) !== node) return;
				verifyInsideElement(node);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_toggle_inside_transition();
  }
});