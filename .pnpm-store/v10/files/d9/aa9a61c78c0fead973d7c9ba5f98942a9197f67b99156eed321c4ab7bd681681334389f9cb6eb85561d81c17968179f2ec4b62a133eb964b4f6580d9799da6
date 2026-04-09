'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');

//#region lib/rules/no-multi-spaces.js
/**
* @fileoverview This rule warns about the usage of extra whitespaces between attributes
* @author Armano
*/
var require_no_multi_spaces = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const path = require("node:path");
	/**
	* @param {RuleContext} context
	* @param {Token} node
	*/
	const isProperty = (context, node) => {
		const sourceCode = context.sourceCode;
		return node.type === "Punctuator" && sourceCode.getText(node) === ":";
	};
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "disallow multiple spaces",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/no-multi-spaces.html"
			},
			fixable: "whitespace",
			schema: [{
				type: "object",
				properties: {
					ignoreProperties: { type: "boolean" },
					ignoreEOLComments: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: {
				multipleSpaces: "Multiple spaces found before '{{displayValue}}'.",
				useLatestParser: "Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error."
			}
		},
		create(context) {
			const options = context.options[0] || {};
			const ignoreProperties = options.ignoreProperties === true;
			const ignoreEOLComments = options.ignoreEOLComments === true;
			return { Program(node) {
				const sourceCode = context.sourceCode;
				if (sourceCode.parserServices.getTemplateBodyTokenStore == null) {
					const filename = context.filename;
					if (path.extname(filename) === ".vue") context.report({
						loc: {
							line: 1,
							column: 0
						},
						messageId: "useLatestParser"
					});
					return;
				}
				if (!node.templateBody) return;
				const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore();
				const tokens = tokenStore.getTokens(node.templateBody, { includeComments: true });
				let prevToken = tokens.shift();
				for (const token of tokens) {
					const spaces = token.range[0] - prevToken.range[1];
					let shouldIgnore = ignoreProperties && (isProperty(context, token) || isProperty(context, prevToken));
					if (!shouldIgnore && ignoreEOLComments && (token.type === "Line" || token.type === "Block")) {
						const nextToken = tokenStore.getTokenAfter(token, { includeComments: true });
						if (!nextToken || nextToken.loc.start.line > token.loc.end.line) shouldIgnore = true;
					}
					if (spaces > 1 && token.loc.start.line === prevToken.loc.start.line && !shouldIgnore) context.report({
						node: token,
						loc: {
							start: prevToken.loc.end,
							end: token.loc.start
						},
						messageId: "multipleSpaces",
						fix: (fixer) => fixer.replaceTextRange([prevToken.range[1], token.range[0]], " "),
						data: { displayValue: sourceCode.getText(token) }
					});
					prevToken = token;
				}
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_multi_spaces();
  }
});