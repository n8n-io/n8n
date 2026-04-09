'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/padding-line-between-blocks.js
/**
* @fileoverview Require or disallow padding lines between blocks
* @author Yosuke Ota
*/
var require_padding_line_between_blocks = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Split the source code into multiple lines based on the line delimiters.
	* @param {string} text Source code as a string.
	* @returns {string[]} Array of source code lines.
	*/
	function splitLines(text) {
		return text.split(/\r\n|[\r\n\u2028\u2029]/gu);
	}
	/**
	* Check and report blocks for `never` configuration.
	* This autofix removes blank lines between the given 2 blocks.
	* @param {RuleContext} context The rule context to report.
	* @param {VElement} prevBlock The previous block to check.
	* @param {VElement} nextBlock The next block to check.
	* @param {Token[]} betweenTokens The array of tokens between blocks.
	* @returns {void}
	* @private
	*/
	function verifyForNever(context, prevBlock, nextBlock, betweenTokens) {
		if (prevBlock.loc.end.line === nextBlock.loc.start.line) return;
		const tokenOrNodes = [...betweenTokens, nextBlock];
		/** @type {ASTNode | Token} */
		let prev = prevBlock;
		/** @type {[ASTNode | Token, ASTNode | Token][]} */
		const paddingLines = [];
		for (const tokenOrNode of tokenOrNodes) {
			if (tokenOrNode.loc.start.line - prev.loc.end.line > 1) paddingLines.push([prev, tokenOrNode]);
			prev = tokenOrNode;
		}
		if (paddingLines.length === 0) return;
		context.report({
			node: nextBlock,
			messageId: "never",
			*fix(fixer) {
				for (const [prevToken, nextToken] of paddingLines) {
					const start = prevToken.range[1];
					const end = nextToken.range[0];
					const lastSpaces = splitLines(context.sourceCode.text.slice(start, end)).pop();
					yield fixer.replaceTextRange([start, end], `\n${lastSpaces}`);
				}
			}
		});
	}
	/**
	* Check and report blocks for `always` configuration.
	* This autofix inserts a blank line between the given 2 blocks.
	* @param {RuleContext} context The rule context to report.
	* @param {VElement} prevBlock The previous block to check.
	* @param {VElement} nextBlock The next block to check.
	* @param {Token[]} betweenTokens The array of tokens between blocks.
	* @returns {void}
	* @private
	*/
	function verifyForAlways(context, prevBlock, nextBlock, betweenTokens) {
		const tokenOrNodes = [...betweenTokens, nextBlock];
		/** @type {ASTNode | Token} */
		let prev = prevBlock;
		/** @type {ASTNode | Token | undefined} */
		let linebreak;
		for (const tokenOrNode of tokenOrNodes) {
			const numOfLineBreaks = tokenOrNode.loc.start.line - prev.loc.end.line;
			if (numOfLineBreaks > 1) return;
			if (!linebreak && numOfLineBreaks > 0) linebreak = prev;
			prev = tokenOrNode;
		}
		context.report({
			node: nextBlock,
			messageId: "always",
			fix(fixer) {
				if (linebreak) return fixer.insertTextAfter(linebreak, "\n");
				return fixer.insertTextAfter(prevBlock, "\n\n");
			}
		});
	}
	/**
	* Types of blank lines.
	* `never` and `always` are defined.
	* Those have `verify` method to check and report statements.
	* @private
	*/
	const PaddingTypes = {
		never: { verify: verifyForNever },
		always: { verify: verifyForAlways }
	};
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "require or disallow padding lines between blocks",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/padding-line-between-blocks.html"
			},
			fixable: "whitespace",
			schema: [{ enum: Object.keys(PaddingTypes) }],
			messages: {
				never: "Unexpected blank line before this block.",
				always: "Expected blank line before this block."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			if (!sourceCode.parserServices.getDocumentFragment) return {};
			const df = sourceCode.parserServices.getDocumentFragment();
			if (!df) return {};
			const documentFragment = df;
			const paddingType = PaddingTypes[context.options[0] || "always"];
			/** @type {Token[]} */
			let tokens;
			/**
			* @returns {VElement[]}
			*/
			function getTopLevelHTMLElements() {
				return documentFragment.children.filter(utils.isVElement);
			}
			/**
			* @param {VElement} prev
			* @param {VElement} next
			*/
			function getTokenAndCommentsBetween(prev, next) {
				if (!tokens) tokens = [...documentFragment.tokens.filter((token$1) => token$1.type !== "HTMLWhitespace"), ...documentFragment.comments].sort((a, b) => {
					if (a.range[0] > b.range[0]) return 1;
					return a.range[0] < b.range[0] ? -1 : 0;
				});
				let token = tokens.shift();
				const results = [];
				while (token) {
					if (prev.range[1] <= token.range[0]) if (next.range[0] <= token.range[0]) {
						tokens.unshift(token);
						break;
					} else results.push(token);
					token = tokens.shift();
				}
				return results;
			}
			return utils.defineTemplateBodyVisitor(context, {}, { Program(node) {
				if (utils.hasInvalidEOF(node)) return;
				const elements = [...getTopLevelHTMLElements()];
				let prev = elements.shift();
				for (const element of elements) {
					if (!prev) return;
					const betweenTokens = getTokenAndCommentsBetween(prev, element);
					paddingType.verify(context, prev, element, betweenTokens);
					prev = element;
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_padding_line_between_blocks();
  }
});