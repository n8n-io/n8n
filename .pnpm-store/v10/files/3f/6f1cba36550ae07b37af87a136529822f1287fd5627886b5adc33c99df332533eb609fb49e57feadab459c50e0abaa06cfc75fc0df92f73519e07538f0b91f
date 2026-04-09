'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-if.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_v_if = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-if` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-if.html"
			},
			fixable: null,
			schema: [],
			messages: {
				withVElse: "'v-if' and 'v-else' directives can't exist on the same element. You may want 'v-else-if' directives.",
				withVElseIf: "'v-if' and 'v-else-if' directives can't exist on the same element.",
				unexpectedArgument: "'v-if' directives require no argument.",
				unexpectedModifier: "'v-if' directives require no modifier.",
				expectedValue: "'v-if' directives require that attribute value."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='if']"(node) {
				const element = node.parent.parent;
				if (utils.hasDirective(element, "else")) context.report({
					node,
					messageId: "withVElse"
				});
				if (utils.hasDirective(element, "else-if")) context.report({
					node,
					messageId: "withVElseIf"
				});
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
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_v_if();
  }
});