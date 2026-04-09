'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-use-v-if-with-v-for.js
/**
* @author Yosuke Ota
*
* Style guide: https://vuejs.org/style-guide/rules-essential.html#avoid-v-if-with-v-for
*/
var require_no_use_v_if_with_v_for = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Check whether the given `v-if` node is using the variable which is defined by the `v-for` directive.
	* @param {VDirective} vIf The `v-if` attribute node to check.
	* @returns {boolean} `true` if the `v-if` is using the variable which is defined by the `v-for` directive.
	*/
	function isUsingIterationVar(vIf) {
		return !!getVForUsingIterationVar(vIf);
	}
	/** @param {VDirective} vIf */
	function getVForUsingIterationVar(vIf) {
		if (!vIf.value) return null;
		const element = vIf.parent.parent;
		for (const reference of vIf.value.references) {
			const targetVFor = element.variables.find((variable) => variable.id.name === reference.id.name && variable.kind === "v-for");
			if (targetVFor) return targetVFor;
		}
		return null;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow using `v-if` on the same element as `v-for`",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-use-v-if-with-v-for.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { allowUsingIterationVar: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				movedToWrapper: "This 'v-if' should be moved to the wrapper element.",
				shouldUseComputed: "The '{{iteratorName}}' {{kind}} inside 'v-for' directive should be replaced with a computed property that returns filtered array instead. You should not mix 'v-for' with 'v-if'."
			}
		},
		create(context) {
			const allowUsingIterationVar = (context.options[0] || {}).allowUsingIterationVar === true;
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='if']"(node) {
				const element = node.parent.parent;
				if (utils.hasDirective(element, "for")) if (isUsingIterationVar(node)) {
					if (!allowUsingIterationVar) {
						const vForVar = getVForUsingIterationVar(node);
						if (!vForVar) return;
						let targetVForExpr = vForVar.id.parent;
						while (targetVForExpr.type !== "VForExpression") targetVForExpr = targetVForExpr.parent;
						const iteratorNode = targetVForExpr.right;
						context.report({
							node,
							loc: node.loc,
							messageId: "shouldUseComputed",
							data: {
								iteratorName: iteratorNode.type === "Identifier" ? iteratorNode.name : context.sourceCode.getText(iteratorNode),
								kind: iteratorNode.type === "Identifier" ? "variable" : "expression"
							}
						});
					}
				} else context.report({
					node,
					loc: node.loc,
					messageId: "movedToWrapper"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_use_v_if_with_v_for();
  }
});