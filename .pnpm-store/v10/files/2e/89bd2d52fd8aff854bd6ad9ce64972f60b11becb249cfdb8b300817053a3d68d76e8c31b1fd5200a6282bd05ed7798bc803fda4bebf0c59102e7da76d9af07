'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/no-deprecated-router-link-tag-prop.js
/**
* @author Marton Csordas
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_router_link_tag_prop = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/** @param {RuleContext} context */
	function getComponentNames(context) {
		let components = ["RouterLink"];
		if (context.options[0] && context.options[0].components) components = context.options[0].components;
		return new Set(components.flatMap((component) => [casing.kebabCase(component), casing.pascalCase(component)]));
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated `tag` property on `RouterLink` (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-router-link-tag-prop.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { components: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true,
					minItems: 1
				} },
				additionalProperties: false
			}],
			messages: { deprecated: "'tag' property on '{{element}}' component is deprecated. Use scoped slots instead." }
		},
		create(context) {
			const components = getComponentNames(context);
			return utils.defineTemplateBodyVisitor(context, { VElement(node) {
				if (!components.has(node.rawName)) return;
				/** @type VIdentifier | null */
				let tagKey = null;
				const tagAttr = utils.getAttribute(node, "tag");
				if (tagAttr) tagKey = tagAttr.key;
				else {
					const directive = utils.getDirective(node, "bind", "tag");
					if (directive) {
						const arg = directive.key.argument;
						if (arg && arg.type === "VIdentifier") tagKey = arg;
					}
				}
				if (tagKey) context.report({
					node: tagKey,
					messageId: "deprecated",
					data: { element: node.rawName }
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_router_link_tag_prop();
  }
});