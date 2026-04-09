'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-else.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_v_else = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-else` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-else.html"
			},
			fixable: null,
			schema: [],
			messages: {
				missingVIf: "'v-else' directives require being preceded by the element which has a 'v-if' or 'v-else-if' directive.",
				withVIf: "'v-else' and 'v-if' directives can't exist on the same element. You may want 'v-else-if' directives.",
				withVElseIf: "'v-else' and 'v-else-if' directives can't exist on the same element.",
				unexpectedArgument: "'v-else' directives require no argument.",
				unexpectedModifier: "'v-else' directives require no modifier.",
				unexpectedValue: "'v-else' directives require no attribute value."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='else']"(node) {
				const element = node.parent.parent;
				if (!utils.prevElementHasIf(element)) context.report({
					node,
					messageId: "missingVIf"
				});
				if (utils.hasDirective(element, "if")) context.report({
					node,
					messageId: "withVIf"
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
				if (node.value) context.report({
					node: node.value,
					messageId: "unexpectedValue"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_v_else();
  }
});