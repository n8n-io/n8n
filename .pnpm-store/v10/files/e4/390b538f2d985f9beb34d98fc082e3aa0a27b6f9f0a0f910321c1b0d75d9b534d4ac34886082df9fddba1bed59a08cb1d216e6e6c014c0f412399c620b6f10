'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-useless-mustaches.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_useless_mustaches = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Strip quotes string
	* @param {string} text
	* @returns {string|null}
	*/
	function stripQuotesForHTML(text) {
		if ((text[0] === "\"" || text[0] === "'" || text[0] === "`") && text[0] === text.at(-1)) return text.slice(1, -1);
		const re = /^(?:&(?:quot|apos|#\d+|#x[\da-f]+);|["'`])([\s\S]*)(?:&(?:quot|apos|#\d+|#x[\da-f]+);|["'`])$/u.exec(text);
		if (!re) return null;
		return re[1];
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow unnecessary mustache interpolations",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-useless-mustaches.html"
			},
			fixable: "code",
			schema: [{
				type: "object",
				properties: {
					ignoreIncludesComment: { type: "boolean" },
					ignoreStringEscape: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: { unexpected: "Unexpected mustache interpolation with a string literal value." }
		},
		create(context) {
			const opts = context.options[0] || {};
			const ignoreIncludesComment = opts.ignoreIncludesComment;
			const ignoreStringEscape = opts.ignoreStringEscape;
			const sourceCode = context.sourceCode;
			/**
			* Report if the value expression is string literals
			* @param {VExpressionContainer} node the node to check
			*/
			function verify(node) {
				const { expression } = node;
				if (!expression) return;
				/** @type {string} */
				let strValue;
				/** @type {string} */
				let rawValue;
				if (expression.type === "Literal") {
					if (typeof expression.value !== "string") return;
					strValue = expression.value;
					rawValue = sourceCode.getText(expression).slice(1, -1);
				} else if (expression.type === "TemplateLiteral") {
					if (expression.expressions.length > 0) return;
					strValue = expression.quasis[0].value.cooked;
					rawValue = expression.quasis[0].value.raw;
				} else return;
				const hasComment = sourceCode.parserServices.getTemplateBodyTokenStore().getTokens(node, { includeComments: true }).some((t) => t.type === "Block" || t.type === "Line");
				if (ignoreIncludesComment && hasComment) return;
				let hasEscape = false;
				if (rawValue !== strValue) {
					const chars = [...rawValue];
					let c = chars.shift();
					while (c) {
						if (c === "\\") {
							c = chars.shift();
							if (c == null || "nrvtbfux".includes(c)) {
								hasEscape = true;
								break;
							}
						}
						c = chars.shift();
					}
				}
				if (ignoreStringEscape && hasEscape) return;
				context.report({
					node,
					messageId: "unexpected",
					fix(fixer) {
						if (hasComment || hasEscape) return null;
						const text = stripQuotesForHTML(sourceCode.getText(expression));
						if (text == null) return null;
						if (text.includes("\n") || /^\s|\s$/u.test(text)) return null;
						const escaped = text.replaceAll("<", "&lt;");
						return fixer.replaceText(node, escaped.replaceAll(/\\([\S\s])/g, "$1"));
					}
				});
			}
			return utils.defineTemplateBodyVisitor(context, { "VElement > VExpressionContainer": verify });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_useless_mustaches();
  }
});