'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/component-options-name-casing.js
/**
* @author Pig Fang
* See LICENSE file in root directory for full license.
*/
var require_component_options_name_casing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* @param {import('../../typings/eslint-plugin-vue/util-types/ast').Expression} node
	* @returns {string | null}
	*/
	function getOptionsComponentName(node) {
		if (node.type === "Identifier") return node.name;
		if (node.type === "Literal") return typeof node.value === "string" ? node.value : null;
		return null;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce the casing of component name in `components` options",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/component-options-name-casing.html"
			},
			fixable: "code",
			hasSuggestions: true,
			schema: [{ enum: casing.allowedCaseOptions }],
			messages: {
				caseNotMatched: "Component name \"{{component}}\" is not {{caseType}}.",
				possibleRenaming: "Rename component name to be in {{caseType}}."
			}
		},
		create(context) {
			const caseType = context.options[0] || "PascalCase";
			const canAutoFix = caseType === "PascalCase";
			const checkCase = casing.getChecker(caseType);
			const convert = casing.getConverter(caseType);
			return utils.executeOnVue(context, (obj) => {
				const node = utils.findProperty(obj, "components");
				if (!node || node.value.type !== "ObjectExpression") return;
				for (const property of node.value.properties) {
					if (property.type !== "Property") continue;
					const name = getOptionsComponentName(property.key);
					if (!name || checkCase(name)) continue;
					context.report({
						node: property.key,
						messageId: "caseNotMatched",
						data: {
							component: name,
							caseType
						},
						fix: canAutoFix ? (fixer) => {
							const converted = convert(name);
							return property.shorthand ? fixer.replaceText(property, `${converted}: ${name}`) : fixer.replaceText(property.key, converted);
						} : void 0,
						suggest: canAutoFix ? void 0 : [{
							messageId: "possibleRenaming",
							data: { caseType },
							fix: (fixer) => {
								const converted = convert(name);
								if (caseType === "kebab-case") return property.shorthand ? fixer.replaceText(property, `'${converted}': ${name}`) : fixer.replaceText(property.key, `'${converted}'`);
								return property.shorthand ? fixer.replaceText(property, `${converted}: ${name}`) : fixer.replaceText(property.key, converted);
							}
						}]
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
    return require_component_options_name_casing();
  }
});