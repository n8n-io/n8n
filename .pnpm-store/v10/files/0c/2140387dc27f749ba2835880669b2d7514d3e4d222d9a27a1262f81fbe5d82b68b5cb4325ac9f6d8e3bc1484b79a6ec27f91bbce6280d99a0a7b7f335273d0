'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_vue_component_options$1 = require('../utils/vue-component-options.js');

//#region lib/rules/no-potential-component-option-typo.js
/**
* @fileoverview detect if there is a potential typo in your component property
* @author IWANABETHATGUY
*/
var require_no_potential_component_option_typo = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const vueComponentOptions = require_vue_component_options$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow a potential typo in your component property",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-potential-component-option-typo.html"
			},
			fixable: null,
			hasSuggestions: true,
			schema: [{
				type: "object",
				properties: {
					presets: {
						type: "array",
						items: {
							type: "string",
							enum: [
								"all",
								"vue",
								"vue-router",
								"nuxt"
							]
						},
						uniqueItems: true,
						minItems: 0
					},
					custom: {
						type: "array",
						minItems: 0,
						items: { type: "string" },
						uniqueItems: true
					},
					threshold: {
						type: "number",
						minimum: 1
					}
				},
				additionalProperties: false
			}],
			messages: { potentialTypo: `'{{name}}' may be a typo, which is similar to option [{{option}}].` }
		},
		create(context) {
			const option = context.options[0] || {};
			const custom = option.custom || [];
			/** @type {('all' | 'vue' | 'vue-router' | 'nuxt')[]} */
			const presets = option.presets || ["vue"];
			const threshold = option.threshold || 1;
			/** @type {Set<string>} */
			const candidateOptionSet = new Set(custom);
			for (const preset of presets) if (preset === "all") for (const opts of Object.values(vueComponentOptions)) for (const opt of opts) candidateOptionSet.add(opt);
			else for (const opt of vueComponentOptions[preset]) candidateOptionSet.add(opt);
			const candidateOptionList = [...candidateOptionSet];
			if (candidateOptionList.length === 0) return {};
			return utils.executeOnVue(context, (obj) => {
				const componentInstanceOptions = obj.properties.map((p) => {
					if (p.type === "Property") {
						const name = utils.getStaticPropertyName(p);
						if (name != null) return {
							name,
							key: p.key
						};
					}
					return null;
				}).filter(utils.isDef);
				if (componentInstanceOptions.length === 0) return;
				for (const option$1 of componentInstanceOptions) {
					const id = option$1.key;
					const name = option$1.name;
					if (candidateOptionSet.has(name)) continue;
					const potentialTypoList = candidateOptionList.map((o) => ({
						option: o,
						distance: utils.editDistance(o, name)
					})).filter(({ distance }) => distance <= threshold && distance > 0).sort((a, b) => a.distance - b.distance);
					if (potentialTypoList.length > 0) context.report({
						node: id,
						messageId: "potentialTypo",
						data: {
							name,
							option: potentialTypoList.map(({ option: option$2 }) => option$2).join(",")
						},
						suggest: potentialTypoList.map(({ option: option$2 }) => ({
							desc: `Replace property '${name}' to '${option$2}'`,
							fix(fixer) {
								return fixer.replaceText(id, option$2);
							}
						}))
					});
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_potential_component_option_typo();
  }
});