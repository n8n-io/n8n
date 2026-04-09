'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/new-line-between-multi-line-property.js
/**
* @fileoverview Enforce new lines between multi-line properties in Vue components.
* @author IWANABETHATGUY
*/
var require_new_line_between_multi_line_property = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @param {Token} node
	*/
	function isComma(node) {
		return node.type === "Punctuator" && node.value === ",";
	}
	/**
	* Check whether the between given nodes has empty line.
	* @param {SourceCode} sourceCode
	* @param {ASTNode} pre
	* @param {ASTNode} cur
	*/
	function* iterateBetweenTokens(sourceCode, pre, cur) {
		yield sourceCode.getLastToken(pre);
		yield* sourceCode.getTokensBetween(pre, cur, { includeComments: true });
		yield sourceCode.getFirstToken(cur);
	}
	/**
	* Check whether the between given nodes has empty line.
	* @param {SourceCode} sourceCode
	* @param {ASTNode} pre
	* @param {ASTNode} cur
	*/
	function hasEmptyLine(sourceCode, pre, cur) {
		/** @type {Token|null} */
		let preToken = null;
		for (const token of iterateBetweenTokens(sourceCode, pre, cur)) {
			if (preToken && token.loc.start.line - preToken.loc.end.line >= 2) return true;
			preToken = token;
		}
		return false;
	}
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce new lines between multi-line properties in Vue components",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/new-line-between-multi-line-property.html"
			},
			fixable: "whitespace",
			schema: [{
				type: "object",
				properties: { minLineOfMultilineProperty: {
					type: "number",
					minimum: 2
				} },
				additionalProperties: false
			}],
			messages: { missingEmptyLine: "Enforce new lines between multi-line properties in Vue components." }
		},
		create(context) {
			let minLineOfMultilineProperty = 2;
			if (context.options && context.options[0] && context.options[0].minLineOfMultilineProperty) minLineOfMultilineProperty = context.options[0].minLineOfMultilineProperty;
			/** @type {CallExpression[]} */
			const callStack = [];
			const sourceCode = context.sourceCode;
			return Object.assign(utils.defineVueVisitor(context, {
				CallExpression(node) {
					callStack.push(node);
				},
				"CallExpression:exit"() {
					callStack.pop();
				},
				ObjectExpression(node) {
					if (callStack.length > 0) return;
					const properties = node.properties;
					for (let i = 1; i < properties.length; i++) {
						const cur = properties[i];
						const pre = properties[i - 1];
						if (pre.loc.end.line - pre.loc.start.line + 1 < minLineOfMultilineProperty) continue;
						if (hasEmptyLine(sourceCode, pre, cur)) continue;
						context.report({
							node: pre,
							loc: {
								start: pre.loc.end,
								end: cur.loc.start
							},
							messageId: "missingEmptyLine",
							fix(fixer) {
								/** @type {Token|null} */
								let preToken = null;
								for (const token of iterateBetweenTokens(sourceCode, pre, cur)) {
									if (preToken && preToken.loc.end.line < token.loc.start.line) return fixer.insertTextAfter(preToken, "\n");
									preToken = token;
								}
								const commaToken = sourceCode.getTokenAfter(pre, isComma);
								return fixer.insertTextAfter(commaToken || pre, "\n\n");
							}
						});
					}
				}
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_new_line_between_multi_line_property();
  }
});