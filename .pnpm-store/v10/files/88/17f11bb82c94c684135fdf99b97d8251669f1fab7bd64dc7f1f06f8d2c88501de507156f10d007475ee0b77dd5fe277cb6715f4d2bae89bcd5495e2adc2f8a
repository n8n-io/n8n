'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/v-on-style.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_v_on_style = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce `v-on` directive style",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/v-on-style.html"
			},
			fixable: "code",
			schema: [{ enum: ["shorthand", "longform"] }],
			messages: {
				expectedShorthand: "Expected '@' instead of 'v-on:'.",
				expectedLonghand: "Expected 'v-on:' instead of '@'."
			}
		},
		create(context) {
			const preferShorthand = context.options[0] !== "longform";
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='on'][key.argument!=null]"(node) {
				if (node.key.name.rawName === "@" === preferShorthand) return;
				const pos = node.range[0];
				context.report({
					node,
					loc: node.loc,
					messageId: preferShorthand ? "expectedShorthand" : "expectedLonghand",
					fix: (fixer) => preferShorthand ? fixer.replaceTextRange([pos, pos + 5], "@") : fixer.replaceTextRange([pos, pos + 1], "v-on:")
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_on_style();
  }
});