'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-dollar-scopedslots-api.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_dollar_scopedslots_api = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated `$scopedSlots` (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-dollar-scopedslots-api.html"
			},
			fixable: "code",
			schema: [],
			messages: { deprecated: "The `$scopedSlots` is deprecated." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { VExpressionContainer(node) {
				for (const reference of node.references) {
					if (reference.variable != null) continue;
					if (reference.id.name === "$scopedSlots") context.report({
						node: reference.id,
						messageId: "deprecated",
						fix(fixer) {
							return fixer.replaceText(reference.id, "$slots");
						}
					});
				}
			} }, utils.defineVueVisitor(context, { MemberExpression(node) {
				if (node.property.type !== "Identifier" || node.property.name !== "$scopedSlots") return;
				if (!utils.isThis(node.object, context)) return;
				context.report({
					node: node.property,
					messageId: "deprecated",
					fix(fixer) {
						return fixer.replaceText(node.property, "$slots");
					}
				});
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_dollar_scopedslots_api();
  }
});