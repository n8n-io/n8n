'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_index$1 = require('../utils/style-variables/index.js');

//#region lib/rules/no-extra-parens.js
/**
* @author Yosuke Ota
*/
var require_no_extra_parens = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { isParenthesized } = require("@eslint-community/eslint-utils");
	const { wrapStylisticOrCoreRule } = require_index.default;
	const { getStyleVariablesContext } = require_index$1.default;
	module.exports = wrapStylisticOrCoreRule("no-extra-parens", {
		skipDynamicArguments: true,
		applyDocument: true,
		create: createForVueSyntax
	});
	/**
	* Check whether the given token is a left parenthesis.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a left parenthesis.
	*/
	function isLeftParen(token) {
		return token.type === "Punctuator" && token.value === "(";
	}
	/**
	* Check whether the given token is a right parenthesis.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a right parenthesis.
	*/
	function isRightParen(token) {
		return token.type === "Punctuator" && token.value === ")";
	}
	/**
	* Check whether the given token is a left brace.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a left brace.
	*/
	function isLeftBrace(token) {
		return token.type === "Punctuator" && token.value === "{";
	}
	/**
	* Check whether the given token is a right brace.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a right brace.
	*/
	function isRightBrace(token) {
		return token.type === "Punctuator" && token.value === "}";
	}
	/**
	* Check whether the given token is a left bracket.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a left bracket.
	*/
	function isLeftBracket(token) {
		return token.type === "Punctuator" && token.value === "[";
	}
	/**
	* Check whether the given token is a right bracket.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a right bracket.
	*/
	function isRightBracket(token) {
		return token.type === "Punctuator" && token.value === "]";
	}
	/**
	* Determines if a given expression node is an IIFE
	* @param {Expression} node The node to check
	* @returns {node is CallExpression & { callee: FunctionExpression } } `true` if the given node is an IIFE
	*/
	function isIIFE(node) {
		return node.type === "CallExpression" && node.callee.type === "FunctionExpression";
	}
	/**
	* @param {RuleContext} context - The rule context.
	* @returns {TemplateListener} AST event handlers.
	*/
	function createForVueSyntax(context) {
		const sourceCode = context.sourceCode;
		if (!sourceCode.parserServices.getTemplateBodyTokenStore) return {};
		const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore();
		/**
		* Checks if the given node turns into a filter when unwraped.
		* @param {Expression} expression node to evaluate
		* @returns {boolean} `true` if the given node turns into a filter when unwraped.
		*/
		function isUnwrapChangeToFilter(expression) {
			let parenStack = null;
			for (const token of tokenStore.getTokens(expression)) {
				if (parenStack) {
					if (parenStack.isUpToken(token)) {
						parenStack = parenStack.upper;
						continue;
					}
				} else if (token.value === "|") return true;
				if (isLeftParen(token)) parenStack = {
					isUpToken: isRightParen,
					upper: parenStack
				};
				else if (isLeftBracket(token)) parenStack = {
					isUpToken: isRightBracket,
					upper: parenStack
				};
				else if (isLeftBrace(token)) parenStack = {
					isUpToken: isRightBrace,
					upper: parenStack
				};
			}
			return false;
		}
		/**
		* Checks if the given node is CSS v-bind() without quote.
		* @param {VExpressionContainer} node
		* @param {Expression} expression
		*/
		function isStyleVariableWithoutQuote(node, expression) {
			const styleVars = getStyleVariablesContext(context);
			if (!styleVars || !styleVars.vBinds.includes(node)) return false;
			const vBindToken = tokenStore.getFirstToken(node);
			return tokenStore.getTokensBetween(vBindToken, expression).every(isLeftParen);
		}
		/**
		* @param {VExpressionContainer & { expression: Expression | VFilterSequenceExpression | null }} node
		*/
		function verify(node) {
			if (!node.expression) return;
			const expression = node.expression.type === "VFilterSequenceExpression" ? node.expression.expression : node.expression;
			if (!isParenthesized(expression, tokenStore)) return;
			if (!isParenthesized(2, expression, tokenStore)) {
				if (isIIFE(expression) && !isParenthesized(expression.callee, tokenStore)) return;
				if (isUnwrapChangeToFilter(expression)) return;
				if (isStyleVariableWithoutQuote(node, expression)) return;
			}
			report(expression);
		}
		/**
		* Report the node
		* @param {Expression} node node to evaluate
		* @returns {void}
		* @private
		*/
		function report(node) {
			const sourceCode$1 = context.sourceCode;
			const leftParenToken = tokenStore.getTokenBefore(node);
			const rightParenToken = tokenStore.getTokenAfter(node);
			context.report({
				node,
				loc: leftParenToken.loc,
				messageId: "unexpected",
				fix(fixer) {
					const parenthesizedSource = sourceCode$1.text.slice(leftParenToken.range[1], rightParenToken.range[0]);
					return fixer.replaceTextRange([leftParenToken.range[0], rightParenToken.range[1]], parenthesizedSource);
				}
			});
		}
		return {
			"VAttribute[directive=true][key.name.name='bind'] > VExpressionContainer": verify,
			"VElement > VExpressionContainer": verify
		};
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_extra_parens();
  }
});