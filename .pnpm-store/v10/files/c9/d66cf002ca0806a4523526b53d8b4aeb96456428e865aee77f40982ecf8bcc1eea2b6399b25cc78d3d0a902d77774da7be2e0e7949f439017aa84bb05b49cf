'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_html_comments$1 = require('../utils/html-comments.js');

//#region lib/rules/html-comment-content-spacing.js
/**
* @author Yosuke ota
* See LICENSE file in root directory for full license.
*/
var require_html_comment_content_spacing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const htmlComments = require_html_comments$1.default;
	/**
	* @typedef { import('../utils/html-comments').ParsedHTMLComment } ParsedHTMLComment
	*/
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce unified spacing in HTML comments",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/html-comment-content-spacing.html"
			},
			fixable: "whitespace",
			schema: [{ enum: ["always", "never"] }, {
				type: "object",
				properties: { exceptions: {
					type: "array",
					items: { type: "string" }
				} },
				additionalProperties: false
			}],
			messages: {
				expectedAfterHTMLCommentOpen: "Expected space after '<!--'.",
				expectedBeforeHTMLCommentOpen: "Expected space before '-->'.",
				expectedAfterExceptionBlock: "Expected space after exception block.",
				expectedBeforeExceptionBlock: "Expected space before exception block.",
				unexpectedAfterHTMLCommentOpen: "Unexpected space after '<!--'.",
				unexpectedBeforeHTMLCommentOpen: "Unexpected space before '-->'."
			}
		},
		create(context) {
			const requireSpace = context.options[0] !== "never";
			return htmlComments.defineVisitor(context, context.options[1], (comment) => {
				checkCommentOpen(comment);
				checkCommentClose(comment);
			}, { includeDirectives: true });
			/**
			* Reports the space before the contents of a given comment if it's invalid.
			* @param {ParsedHTMLComment} comment - comment data.
			* @returns {void}
			*/
			function checkCommentOpen(comment) {
				const { value, openDecoration, open } = comment;
				if (!value) return;
				const beforeToken = openDecoration || open;
				if (beforeToken.loc.end.line !== value.loc.start.line) return;
				if (requireSpace) {
					if (beforeToken.range[1] < value.range[0]) return;
					context.report({
						loc: {
							start: beforeToken.loc.end,
							end: value.loc.start
						},
						messageId: openDecoration ? "expectedAfterExceptionBlock" : "expectedAfterHTMLCommentOpen",
						fix: openDecoration ? void 0 : (fixer) => fixer.insertTextAfter(beforeToken, " ")
					});
				} else {
					if (openDecoration) return;
					if (beforeToken.range[1] === value.range[0]) return;
					context.report({
						loc: {
							start: beforeToken.loc.end,
							end: value.loc.start
						},
						messageId: "unexpectedAfterHTMLCommentOpen",
						fix: (fixer) => fixer.removeRange([beforeToken.range[1], value.range[0]])
					});
				}
			}
			/**
			* Reports the space after the contents of a given comment if it's invalid.
			* @param {ParsedHTMLComment} comment - comment data.
			* @returns {void}
			*/
			function checkCommentClose(comment) {
				const { value, closeDecoration, close } = comment;
				if (!value) return;
				const afterToken = closeDecoration || close;
				if (value.loc.end.line !== afterToken.loc.start.line) return;
				if (requireSpace) {
					if (value.range[1] < afterToken.range[0]) return;
					context.report({
						loc: {
							start: value.loc.end,
							end: afterToken.loc.start
						},
						messageId: closeDecoration ? "expectedBeforeExceptionBlock" : "expectedBeforeHTMLCommentOpen",
						fix: closeDecoration ? void 0 : (fixer) => fixer.insertTextBefore(afterToken, " ")
					});
				} else {
					if (closeDecoration) return;
					if (value.range[1] === afterToken.range[0]) return;
					context.report({
						loc: {
							start: value.loc.end,
							end: afterToken.loc.start
						},
						messageId: "unexpectedBeforeHTMLCommentOpen",
						fix: (fixer) => fixer.removeRange([value.range[1], afterToken.range[0]])
					});
				}
			}
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_html_comment_content_spacing();
  }
});