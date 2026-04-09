'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_key_aliases$1 = require('../utils/key-aliases.js');

//#region lib/rules/valid-v-on.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_v_on = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const keyAliases = require_key_aliases$1.default;
	const VALID_MODIFIERS = new Set([
		"stop",
		"prevent",
		"capture",
		"self",
		"ctrl",
		"shift",
		"alt",
		"meta",
		"native",
		"once",
		"left",
		"right",
		"middle",
		"passive",
		"esc",
		"tab",
		"enter",
		"space",
		"up",
		"left",
		"right",
		"down",
		"delete",
		"exact"
	]);
	const VERB_MODIFIERS = new Set(["stop", "prevent"]);
	const KEY_ALIASES = new Set(keyAliases);
	/**
	* @param {VIdentifier} modifierNode
	* @param {Set<string>} customModifiers
	*/
	function isValidModifier(modifierNode, customModifiers) {
		const modifier = modifierNode.name;
		return VALID_MODIFIERS.has(modifier) || Number.isInteger(Number.parseInt(modifier, 10)) || [...modifier].length === 1 || KEY_ALIASES.has(modifier) || customModifiers.has(modifier);
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-on` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-on.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { modifiers: { type: "array" } },
				additionalProperties: false
			}],
			messages: {
				unsupportedModifier: "'v-on' directives don't support the modifier '{{modifier}}'.",
				avoidKeyword: "Avoid using JavaScript keyword as \"v-on\" value: {{value}}.",
				expectedValueOrVerb: "'v-on' directives require a value or verb modifier (like 'stop' or 'prevent')."
			}
		},
		create(context) {
			const options = context.options[0] || {};
			/** @type {Set<string>} */
			const customModifiers = new Set(options.modifiers || []);
			const sourceCode = context.sourceCode;
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='on']"(node) {
				for (const modifier of node.key.modifiers) if (!isValidModifier(modifier, customModifiers)) context.report({
					node: modifier,
					messageId: "unsupportedModifier",
					data: { modifier: modifier.name }
				});
				if ((!node.value || !node.value.expression) && !node.key.modifiers.some((modifier) => VERB_MODIFIERS.has(modifier.name))) if (node.value && !utils.isEmptyValueDirective(node, context)) {
					const valueText = sourceCode.getText(node.value);
					let innerText = valueText;
					if ((valueText[0] === "\"" || valueText[0] === "'") && valueText[0] === valueText.at(-1)) innerText = valueText.slice(1, -1);
					if (/^\w+$/.test(innerText)) context.report({
						node: node.value,
						messageId: "avoidKeyword",
						data: { value: valueText }
					});
				} else context.report({
					node,
					messageId: "expectedValueOrVerb"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_v_on();
  }
});