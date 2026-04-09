'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-custom-modifiers-on-v-model.js
/**
* @author Przemyslaw Falowski (@przemkow)
* @fileoverview This rule checks whether v-model used on the component do not have custom modifiers
*/
var require_no_custom_modifiers_on_v_model = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const VALID_MODIFIERS = new Set([
		"lazy",
		"number",
		"trim"
	]);
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow custom modifiers on v-model used on the component",
				categories: ["vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-custom-modifiers-on-v-model.html"
			},
			fixable: null,
			schema: [],
			messages: { notSupportedModifier: "'v-model' directives don't support the modifier '{{name}}'." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='model']"(node) {
				const element = node.parent.parent;
				if (utils.isCustomComponent(element)) {
					for (const modifier of node.key.modifiers) if (!VALID_MODIFIERS.has(modifier.name)) context.report({
						node,
						loc: node.loc,
						messageId: "notSupportedModifier",
						data: { name: modifier.name }
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_custom_modifiers_on_v_model();
  }
});