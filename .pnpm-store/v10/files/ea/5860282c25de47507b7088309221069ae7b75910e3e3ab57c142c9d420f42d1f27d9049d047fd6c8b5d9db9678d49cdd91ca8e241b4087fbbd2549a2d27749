'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/prefer-true-attribute-shorthand.js
/**
* @author Pig Fang
* See LICENSE file in root directory for full license.
*/
var require_prefer_true_attribute_shorthand = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { toRegExpGroupMatcher } = require_regexp$1.default;
	const utils = require_index.default;
	/**
	* @typedef { 'always' | 'never' } PreferOption
	*/
	/**
	* @param {VDirective | VAttribute} node
	* @returns {string | null}
	*/
	function getAttributeName(node) {
		if (!node.directive) return node.key.rawName;
		if ((node.key.name.name === "bind" || node.key.name.name === "model") && node.key.argument && node.key.argument.type === "VIdentifier") return node.key.argument.rawName;
		return null;
	}
	/**
	* @param {VAttribute | VDirective} node
	* @param {boolean} isExcepted
	* @param {PreferOption} option
	*/
	function shouldConvertToLongForm(node, isExcepted, option) {
		return !node.directive && !node.value && (option === "always" ? isExcepted : !isExcepted);
	}
	/**
	* @param {VAttribute | VDirective} node
	* @param {boolean} isExcepted
	* @param {PreferOption} option
	*/
	function shouldConvertToShortForm(node, isExcepted, option) {
		return node.directive && node.value?.expression?.type === "Literal" && node.value.expression.value === true && Boolean(node.key.argument) && (option === "always" ? !isExcepted : isExcepted);
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require shorthand form attribute when `v-bind` value is `true`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/prefer-true-attribute-shorthand.html"
			},
			fixable: null,
			hasSuggestions: true,
			schema: [{ enum: ["always", "never"] }, {
				type: "object",
				properties: { except: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true
				} },
				additionalProperties: false
			}],
			messages: {
				expectShort: "Boolean prop with 'true' value should be written in shorthand form.",
				expectLong: "Boolean prop with 'true' value should be written in long form.",
				rewriteIntoShort: "Rewrite this prop into shorthand form.",
				rewriteIntoLongVueProp: "Rewrite this prop into long-form Vue component prop.",
				rewriteIntoLongHtmlAttr: "Rewrite this prop into long-form HTML attribute."
			}
		},
		create(context) {
			/** @type {'always' | 'never'} */
			const option = context.options[0] || "always";
			const exceptMatcher = toRegExpGroupMatcher(context.options[1]?.except);
			/**
			* @param {VAttribute | VDirective} node
			* @param {string} messageId
			* @param {string} longVuePropText
			* @param {string} longHtmlAttrText
			*/
			function reportLongForm(node, messageId, longVuePropText, longHtmlAttrText) {
				context.report({
					node,
					messageId,
					suggest: [{
						messageId: "rewriteIntoLongVueProp",
						fix: (fixer) => fixer.replaceText(node, longVuePropText)
					}, {
						messageId: "rewriteIntoLongHtmlAttr",
						fix: (fixer) => fixer.replaceText(node, longHtmlAttrText)
					}]
				});
			}
			/**
			* @param {VAttribute | VDirective} node
			* @param {string} messageId
			* @param {string} shortFormText
			*/
			function reportShortForm(node, messageId, shortFormText) {
				context.report({
					node,
					messageId,
					suggest: [{
						messageId: "rewriteIntoShort",
						fix: (fixer) => fixer.replaceText(node, shortFormText)
					}]
				});
			}
			return utils.defineTemplateBodyVisitor(context, { VAttribute(node) {
				if (!utils.isCustomComponent(node.parent.parent)) return;
				const name = getAttributeName(node);
				if (name === null) return;
				const isExcepted = exceptMatcher(name);
				if (shouldConvertToLongForm(node, isExcepted, option)) {
					const key = node.key;
					reportLongForm(node, "expectLong", `:${key.rawName}="true"`, `${key.rawName}="${key.rawName}"`);
				} else if (shouldConvertToShortForm(node, isExcepted, option)) {
					const directiveKey = node.key;
					if (directiveKey.argument && directiveKey.argument.type === "VIdentifier") reportShortForm(node, "expectShort", directiveKey.argument.rawName);
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_prefer_true_attribute_shorthand();
  }
});