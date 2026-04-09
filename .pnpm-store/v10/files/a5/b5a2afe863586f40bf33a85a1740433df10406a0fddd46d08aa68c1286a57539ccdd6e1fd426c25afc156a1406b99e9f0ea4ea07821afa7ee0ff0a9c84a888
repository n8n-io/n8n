'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/v-bind-style.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_v_bind_style = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* @typedef { VDirectiveKey & { name: VIdentifier & { name: 'bind' }, argument: VExpressionContainer | VIdentifier } } VBindDirectiveKey
	* @typedef { VDirective & { key: VBindDirectiveKey } } VBindDirective
	*/
	/**
	* @param {string} name
	* @returns {string}
	*/
	function kebabCaseToCamelCase(name) {
		return casing.isKebabCase(name) ? casing.camelCase(name) : name;
	}
	/**
	* @param {VBindDirective} node
	* @returns {boolean}
	*/
	function isSameName(node) {
		const attrName = node.key.argument.type === "VIdentifier" ? node.key.argument.rawName : null;
		const valueName = node.value?.expression?.type === "Identifier" ? node.value.expression.name : null;
		if (!attrName || !valueName) return false;
		return kebabCaseToCamelCase(attrName) === kebabCaseToCamelCase(valueName);
	}
	/**
	* @param {VBindDirectiveKey} key
	* @returns {number}
	*/
	function getCutStart(key) {
		const lastModifier = key.modifiers.at(-1);
		return lastModifier ? lastModifier.range[1] : key.argument.range[1];
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce `v-bind` directive style",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/v-bind-style.html"
			},
			fixable: "code",
			schema: [{ enum: ["shorthand", "longform"] }, {
				type: "object",
				properties: { sameNameShorthand: { enum: [
					"always",
					"never",
					"ignore"
				] } },
				additionalProperties: false
			}],
			messages: {
				expectedLonghand: "Expected 'v-bind' before ':'.",
				unexpectedLonghand: "Unexpected 'v-bind' before ':'.",
				expectedLonghandForProp: "Expected 'v-bind:' instead of '.'.",
				expectedShorthand: "Expected same-name shorthand.",
				unexpectedShorthand: "Unexpected same-name shorthand."
			}
		},
		create(context) {
			const preferShorthand = context.options[0] !== "longform";
			/** @type {"always" | "never" | "ignore"} */
			const sameNameShorthand = context.options[1]?.sameNameShorthand || "ignore";
			/** @param {VBindDirective} node */
			function checkAttributeStyle(node) {
				const shorthandProp = node.key.name.rawName === ".";
				if ((node.key.name.rawName === ":" || shorthandProp) === preferShorthand) return;
				let messageId = "expectedLonghand";
				if (preferShorthand) messageId = "unexpectedLonghand";
				else if (shorthandProp) messageId = "expectedLonghandForProp";
				context.report({
					node,
					loc: node.loc,
					messageId,
					*fix(fixer) {
						if (preferShorthand) yield fixer.remove(node.key.name);
						else {
							yield fixer.insertTextBefore(node, "v-bind");
							if (shorthandProp) {
								yield fixer.replaceText(node.key.name, ":");
								const modifier = node.key.modifiers[0];
								if (modifier.name === "prop" && modifier.rawName === "") yield fixer.insertTextBefore(modifier, ".prop");
							}
						}
					}
				});
			}
			/** @param {VBindDirective} node */
			function checkAttributeSameName(node) {
				if (sameNameShorthand === "ignore" || !isSameName(node)) return;
				const preferShorthand$1 = sameNameShorthand === "always";
				if (utils.isVBindSameNameShorthand(node) === preferShorthand$1) return;
				const messageId = preferShorthand$1 ? "expectedShorthand" : "unexpectedShorthand";
				context.report({
					node,
					loc: node.loc,
					messageId,
					*fix(fixer) {
						if (preferShorthand$1) {
							/** @type {Range} */
							const valueRange = [getCutStart(node.key), node.range[1]];
							yield fixer.removeRange(valueRange);
						} else if (node.key.argument.type === "VIdentifier") yield fixer.insertTextAfter(node, `="${kebabCaseToCamelCase(node.key.argument.rawName)}"`);
					}
				});
			}
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind'][key.argument!=null]"(node) {
				checkAttributeSameName(node);
				checkAttributeStyle(node);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_bind_style();
  }
});