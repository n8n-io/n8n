'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-shared-component-data.js
/**
* @fileoverview Enforces component's data property to be a function.
* @author Armano
*/
var require_no_shared_component_data = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/** @param {Token} token  */
	function isOpenParen(token) {
		return token.type === "Punctuator" && token.value === "(";
	}
	/** @param {Token} token  */
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
				description: "enforce component's data property to be a function",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-shared-component-data.html"
			},
			fixable: "code",
			schema: [],
			messages: { dataPropertyMustBeFunction: "`data` property in component must be a function." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			return utils.executeOnVueComponent(context, (obj) => {
				const invalidData = utils.findProperty(obj, "data", (p) => p.value.type !== "FunctionExpression" && p.value.type !== "ArrowFunctionExpression" && p.value.type !== "Identifier");
				if (invalidData) context.report({
					node: invalidData,
					messageId: "dataPropertyMustBeFunction",
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
    return require_no_shared_component_data();
  }
});