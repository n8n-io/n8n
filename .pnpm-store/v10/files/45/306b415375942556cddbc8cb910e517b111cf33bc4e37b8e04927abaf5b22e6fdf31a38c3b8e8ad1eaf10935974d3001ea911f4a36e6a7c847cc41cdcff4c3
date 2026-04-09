'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/html-quotes.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_html_quotes = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce quotes style of HTML attributes",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/html-quotes.html"
			},
			fixable: "code",
			schema: [{ enum: ["double", "single"] }, {
				type: "object",
				properties: { avoidEscape: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: { expected: "Expected to be enclosed by {{kind}}." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const double = context.options[0] !== "single";
			const avoidEscape = context.options[1] && context.options[1].avoidEscape === true;
			const quoteChar = double ? "\"" : "'";
			const quoteName = double ? "double quotes" : "single quotes";
			/** @type {boolean} */
			let hasInvalidEOF;
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[value!=null]"(node) {
				if (hasInvalidEOF) return;
				if (utils.isVBindSameNameShorthand(node)) return;
				const text = sourceCode.getText(node.value);
				const firstChar = text[0];
				if (firstChar !== quoteChar) {
					const quoted = firstChar === "'" || firstChar === "\"";
					if (avoidEscape && quoted) {
						if (text.slice(1, -1).includes(quoteChar)) return;
					}
					context.report({
						node: node.value,
						loc: node.value.loc,
						messageId: "expected",
						data: { kind: quoteName },
						fix(fixer) {
							const contentText = quoted ? text.slice(1, -1) : text;
							let fixToDouble = double;
							if (avoidEscape && !quoted && contentText.includes(quoteChar)) fixToDouble = double ? contentText.includes("'") : !contentText.includes("\"");
							const quotePattern = fixToDouble ? /"/g : /'/g;
							const quoteEscaped = fixToDouble ? "&quot;" : "&apos;";
							const fixQuoteChar = fixToDouble ? "\"" : "'";
							const replacement = fixQuoteChar + contentText.replace(quotePattern, quoteEscaped) + fixQuoteChar;
							return fixer.replaceText(node.value, replacement);
						}
					});
				}
			} }, { Program(node) {
				hasInvalidEOF = utils.hasInvalidEOF(node);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_html_quotes();
  }
});