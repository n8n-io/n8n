'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-data-object-declaration.js
/**
* @fileoverview disallow using deprecated object declaration on data
* @author yoyo930021
*/
var require_no_deprecated_data_object_declaration = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/** @param {Token} token */
	function isOpenParen(token) {
		return token.type === "Punctuator" && token.value === "(";
	}
	/** @param {Token} token */
	function isCloseParen(token) {
		return token.type === "Punctuator" && token.value === ")";
	}
	/**
	* @param {Expression} node
	* @param {SourceCode} sourceCode
	*/
	function getFirstAndLastTokens(node, sourceCode) {
		let first = sourceCode.getFirstToken(node);
		let last = sourceCode.getLastToken(node);
		while (true) {
			const prev = sourceCode.getTokenBefore(first);
			const next = sourceCode.getTokenAfter(last);
			if (isOpenParen(prev) && isCloseParen(next)) {
				first = prev;
				last = next;
			} else return {
				first,
				last
			};
		}
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated object declaration on data (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-data-object-declaration.html"
			},
			fixable: "code",
			schema: [],
			messages: { objectDeclarationIsDeprecated: "Object declaration on 'data' property is deprecated. Using function declaration instead." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			return utils.executeOnVue(context, (obj) => {
				const invalidData = utils.findProperty(obj, "data", (p) => p.value.type !== "FunctionExpression" && p.value.type !== "ArrowFunctionExpression" && p.value.type !== "Identifier");
				if (invalidData) context.report({
					node: invalidData,
					messageId: "objectDeclarationIsDeprecated",
					fix(fixer) {
						const tokens = getFirstAndLastTokens(invalidData.value, sourceCode);
						return [fixer.insertTextBefore(tokens.first, "function() {\nreturn "), fixer.insertTextAfter(tokens.last, ";\n}")];
					}
				});
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_data_object_declaration();
  }
});