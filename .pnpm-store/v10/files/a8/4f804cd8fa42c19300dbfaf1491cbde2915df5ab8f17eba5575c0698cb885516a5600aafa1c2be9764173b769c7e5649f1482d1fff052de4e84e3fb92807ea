'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-useless-v-bind.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_useless_v_bind = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const DOUBLE_QUOTES_RE = /"/gu;
	const SINGLE_QUOTES_RE = /'/gu;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow unnecessary `v-bind` directives",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-useless-v-bind.html"
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
			messages: { unexpected: "Unexpected `v-bind` with a string literal value." }
		},
		create(context) {
			const opts = context.options[0] || {};
			const ignoreIncludesComment = opts.ignoreIncludesComment;
			const ignoreStringEscape = opts.ignoreStringEscape;
			const sourceCode = context.sourceCode;
			/**
			* Report if the value expression is string literals
			* @param {VDirective} node the node to check
			*/
			function verify(node) {
				const { value, key } = node;
				if (!value || key.modifiers.length > 0) return;
				const { expression } = value;
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
				const hasComment = sourceCode.parserServices.getTemplateBodyTokenStore().getTokens(value, { includeComments: true }).some((t) => t.type === "Block" || t.type === "Line");
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
					*fix(fixer) {
						if (hasComment || hasEscape) return;
						const quoteChar = sourceCode.getText(value)[0];
						const shorthand = key.name.rawName === ":";
						/** @type {Range} */
						const keyDirectiveRange = [key.name.range[0], key.name.range[1] + (shorthand ? 0 : 1)];
						yield fixer.removeRange(keyDirectiveRange);
						let attrValue;
						if (quoteChar === "\"") {
							attrValue = strValue.replaceAll(DOUBLE_QUOTES_RE, "&quot;");
							attrValue = quoteChar + attrValue + quoteChar;
						} else if (quoteChar === "'") {
							attrValue = strValue.replaceAll(SINGLE_QUOTES_RE, "&apos;");
							attrValue = quoteChar + attrValue + quoteChar;
						} else attrValue = strValue.replaceAll(DOUBLE_QUOTES_RE, "&quot;").replaceAll(SINGLE_QUOTES_RE, "&apos;");
						yield fixer.replaceText(value, attrValue);
					}
				});
			}
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind'][key.argument!=null]": verify });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_useless_v_bind();
  }
});