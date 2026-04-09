'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-bind.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_v_bind = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const VALID_MODIFIERS = new Set([
		"prop",
		"camel",
		"sync",
		"attr"
	]);
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-bind` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-bind.html"
			},
			fixable: null,
			schema: [],
			messages: {
				unsupportedModifier: "'v-bind' directives don't support the modifier '{{name}}'.",
				expectedValue: "'v-bind' directives require an attribute value."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind']"(node) {
				for (const modifier of node.key.modifiers) if (!VALID_MODIFIERS.has(modifier.name)) context.report({
					node: modifier,
					messageId: "unsupportedModifier",
					data: { name: modifier.name }
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
    return require_valid_v_bind();
  }
});