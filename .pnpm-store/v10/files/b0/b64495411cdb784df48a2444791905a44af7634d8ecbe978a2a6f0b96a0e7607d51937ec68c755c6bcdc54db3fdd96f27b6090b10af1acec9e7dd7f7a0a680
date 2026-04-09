'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-v-for-key.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_require_v_for_key = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require `v-bind:key` with `v-for` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/require-v-for-key.html"
			},
			fixable: null,
			schema: [],
			messages: { requireKey: "Elements in iteration expect to have 'v-bind:key' directives." }
		},
		create(context) {
			/**
			* Check the given element about `v-bind:key` attributes.
			* @param {VElement} element The element node to check.
			*/
			function checkKey(element) {
				if (utils.hasDirective(element, "bind", "key")) return;
				if (element.name === "template" || element.name === "slot") {
					for (const child of element.children) if (child.type === "VElement") checkKey(child);
				} else if (!utils.isCustomComponent(element)) context.report({
					node: element.startTag,
					loc: element.startTag.loc,
					messageId: "requireKey"
				});
			}
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='for']"(node) {
				checkKey(node.parent.parent);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_v_for_key();
  }
});