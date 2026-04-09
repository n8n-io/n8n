'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-irregular-whitespace.js
/**
* @author Yosuke Ota
* @fileoverview Rule to disalow whitespace that is not a tab or space, whitespace inside strings and comments are allowed
*/
var require_no_irregular_whitespace = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const ALL_IRREGULARS = /[\f\v\u0085\uFEFF\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u202F\u205F\u3000\u2028\u2029]/u;
	const IRREGULAR_WHITESPACE = /[\f\v\u0085\uFEFF\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u202F\u205F\u3000]+/gmu;
	const IRREGULAR_LINE_TERMINATORS = /[\u2028\u2029]/gmu;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow irregular whitespace in `.vue` files",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-irregular-whitespace.html",
				extensionSource: {
					url: "https://eslint.org/docs/rules/no-irregular-whitespace",
					name: "ESLint core"
				}
			},
			schema: [{
				type: "object",
				properties: {
					skipComments: { type: "boolean" },
					skipStrings: { type: "boolean" },
					skipTemplates: { type: "boolean" },
					skipRegExps: { type: "boolean" },
					skipHTMLAttributeValues: { type: "boolean" },
					skipHTMLTextContents: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: { disallow: "Irregular whitespace not allowed." }
		},
		create(context) {
			/** @type {number[]} */
			let errorIndexes = [];
			const options = context.options[0] || {};
			const skipComments = !!options.skipComments;
			const skipStrings = options.skipStrings !== false;
			const skipRegExps = !!options.skipRegExps;
			const skipTemplates = !!options.skipTemplates;
			const skipHTMLAttributeValues = !!options.skipHTMLAttributeValues;
			const skipHTMLTextContents = !!options.skipHTMLTextContents;
			const sourceCode = context.sourceCode;
			/**
			* Removes errors that occur inside a string node
			* @param {ASTNode | Token} node to check for matching errors.
			* @returns {void}
			* @private
			*/
			function removeWhitespaceError(node) {
				const [startIndex, endIndex] = node.range;
				errorIndexes = errorIndexes.filter((errorIndex) => errorIndex < startIndex || endIndex <= errorIndex);
			}
			/**
			* Checks literal nodes for errors that we are choosing to ignore and calls the relevant methods to remove the errors
			* @param {Literal} node to check for matching errors.
			* @returns {void}
			* @private
			*/
			function removeInvalidNodeErrorsInLiteral(node) {
				const shouldCheckStrings = skipStrings && typeof node.value === "string";
				const shouldCheckRegExps = skipRegExps && Boolean(node.regex);
				if ((shouldCheckStrings || shouldCheckRegExps) && ALL_IRREGULARS.test(sourceCode.getText(node))) removeWhitespaceError(node);
			}
			/**
			* Checks template string literal nodes for errors that we are choosing to ignore and calls the relevant methods to remove the errors
			* @param {TemplateElement} node to check for matching errors.
			* @returns {void}
			* @private
			*/
			function removeInvalidNodeErrorsInTemplateLiteral(node) {
				if (ALL_IRREGULARS.test(node.value.raw)) removeWhitespaceError(node);
			}
			/**
			* Checks HTML attribute value nodes for errors that we are choosing to ignore and calls the relevant methods to remove the errors
			* @param {VLiteral} node to check for matching errors.
			* @returns {void}
			* @private
			*/
			function removeInvalidNodeErrorsInHTMLAttributeValue(node) {
				if (ALL_IRREGULARS.test(sourceCode.getText(node))) removeWhitespaceError(node);
			}
			/**
			* Checks HTML text content nodes for errors that we are choosing to ignore and calls the relevant methods to remove the errors
			* @param {VText} node to check for matching errors.
			* @returns {void}
			* @private
			*/
			function removeInvalidNodeErrorsInHTMLTextContent(node) {
				if (ALL_IRREGULARS.test(sourceCode.getText(node))) removeWhitespaceError(node);
			}
			/**
			* Checks comment nodes for errors that we are choosing to ignore and calls the relevant methods to remove the errors
			* @param {Comment | HTMLComment | HTMLBogusComment} node to check for matching errors.
			* @returns {void}
			* @private
			*/
			function removeInvalidNodeErrorsInComment(node) {
				if (ALL_IRREGULARS.test(node.value)) removeWhitespaceError(node);
			}
			/**
			* Checks the program source for irregular whitespaces and irregular line terminators
			* @returns {void}
			* @private
			*/
			function checkForIrregularWhitespace() {
				const source = sourceCode.getText();
				let match;
				while ((match = IRREGULAR_WHITESPACE.exec(source)) !== null) errorIndexes.push(match.index);
				while ((match = IRREGULAR_LINE_TERMINATORS.exec(source)) !== null) errorIndexes.push(match.index);
			}
			checkForIrregularWhitespace();
			if (errorIndexes.length === 0) return {};
			const bodyVisitor = utils.defineTemplateBodyVisitor(context, {
				...skipHTMLAttributeValues ? { "VAttribute[directive=false] > VLiteral": removeInvalidNodeErrorsInHTMLAttributeValue } : {},
				...skipHTMLTextContents ? { VText: removeInvalidNodeErrorsInHTMLTextContent } : {},
				Literal: removeInvalidNodeErrorsInLiteral,
				...skipTemplates ? { TemplateElement: removeInvalidNodeErrorsInTemplateLiteral } : {}
			});
			return {
				...bodyVisitor,
				Literal: removeInvalidNodeErrorsInLiteral,
				...skipTemplates ? { TemplateElement: removeInvalidNodeErrorsInTemplateLiteral } : {},
				"Program:exit"(node) {
					if (bodyVisitor["Program:exit"]) bodyVisitor["Program:exit"](node);
					const templateBody = node.templateBody;
					if (skipComments) {
						for (const node$1 of sourceCode.getAllComments()) removeInvalidNodeErrorsInComment(node$1);
						if (templateBody) for (const node$1 of templateBody.comments) removeInvalidNodeErrorsInComment(node$1);
					}
					const [scriptStart, scriptEnd] = node.range;
					const [templateStart, templateEnd] = templateBody ? templateBody.range : [0, 0];
					errorIndexes = errorIndexes.filter((errorIndex) => scriptStart <= errorIndex && errorIndex < scriptEnd || templateStart <= errorIndex && errorIndex < templateEnd);
					for (const errorIndex of errorIndexes) context.report({
						loc: sourceCode.getLocFromIndex(errorIndex),
						messageId: "disallow"
					});
				}
			};
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_irregular_whitespace();
  }
});