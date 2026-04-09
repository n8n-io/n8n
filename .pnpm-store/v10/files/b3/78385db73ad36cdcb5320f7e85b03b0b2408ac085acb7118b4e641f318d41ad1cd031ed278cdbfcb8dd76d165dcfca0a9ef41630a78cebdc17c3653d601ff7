'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-component-is.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_require_component_is = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require `v-bind:is` of `<component>` elements",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/require-component-is.html"
			},
			fixable: null,
			schema: [],
			messages: { requireComponentIs: "Expected '<component>' elements to have 'v-bind:is' attribute." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='component']"(node) {
				if (!utils.hasDirective(node, "bind", "is")) context.report({
					node,
					loc: node.loc,
					messageId: "requireComponentIs"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_component_is();
  }
});