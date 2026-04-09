'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-cloak.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_v_cloak = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-cloak` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-cloak.html"
			},
			fixable: null,
			schema: [],
			messages: {
				unexpectedArgument: "'v-cloak' directives require no argument.",
				unexpectedModifier: "'v-cloak' directives require no modifier.",
				unexpectedValue: "'v-cloak' directives require no attribute value."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='cloak']"(node) {
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
    return require_valid_v_cloak();
  }
});