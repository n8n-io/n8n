'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_html_comments$1 = require('../utils/html-comments.js');

//#region lib/rules/html-comment-content-newline.js
/**
* @author Yosuke ota
* See LICENSE file in root directory for full license.
*/
var require_html_comment_content_newline = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const htmlComments = require_html_comments$1.default;
	/**
	* @typedef { import('../utils/html-comments').ParsedHTMLComment } ParsedHTMLComment
	*/
	/**
	* @param {any} param
	*/
	function parseOption(param) {
		if (param && typeof param === "string") return {
			singleline: param,
			multiline: param
		};
		return Object.assign({
			singleline: "never",
			multiline: "always"
		}, param);
	}
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce unified line break in HTML comments",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/html-comment-content-newline.html"
			},
			fixable: "whitespace",
			schema: [{ oneOf: [{ enum: ["always", "never"] }, {
				type: "object",
				properties: {
					singleline: { enum: [
						"always",
						"never",
						"ignore"
					] },
					multiline: { enum: [
						"always",
						"never",
						"ignore"
					] }
				},
				additionalProperties: false
			}] }, {
				type: "object",
				properties: { exceptions: {
					type: "array",
					items: { type: "string" }
				} },
				additionalProperties: false
			}],
			messages: {
				expectedAfterHTMLCommentOpen: "Expected line break after '<!--'.",
				expectedBeforeHTMLCommentOpen: "Expected line break before '-->'.",
				expectedAfterExceptionBlock: "Expected line break after exception block.",
				expectedBeforeExceptionBlock: "Expected line break before exception block.",
				unexpectedAfterHTMLCommentOpen: "Unexpected line breaks after '<!--'.",
				unexpectedBeforeHTMLCommentOpen: "Unexpected line breaks before '-->'."
			}
		},
		create(context) {
			const option = parseOption(context.options[0]);
			return htmlComments.defineVisitor(context, context.options[1], (comment) => {
				const { value, openDecoration, closeDecoration } = comment;
				if (!value) return;
				const newlineType = (openDecoration ? openDecoration.loc.end.line : value.loc.start.line) === (closeDecoration ? closeDecoration.loc.start.line : value.loc.end.line) ? option.singleline : option.multiline;
				if (newlineType === "ignore") return;
				checkCommentOpen(comment, newlineType !== "never");
				checkCommentClose(comment, newlineType !== "never");
			});
			/**
			* Reports the newline before the contents of a given comment if it's invalid.
			* @param {ParsedHTMLComment} comment - comment data.
			* @param {boolean} requireNewline - `true` if line breaks are required.
			* @returns {void}
			*/
			function checkCommentOpen(comment, requireNewline) {
				const { value, openDecoration, open } = comment;
				if (!value) return;
				const beforeToken = openDecoration || open;
				if (requireNewline) {
					if (beforeToken.loc.end.line < value.loc.start.line) return;
					context.report({
						loc: {
							start: beforeToken.loc.end,
							end: value.loc.start
						},
						messageId: openDecoration ? "expectedAfterExceptionBlock" : "expectedAfterHTMLCommentOpen",
						fix: openDecoration ? void 0 : (fixer) => fixer.insertTextAfter(beforeToken, "\n")
					});
				} else {
					if (beforeToken.loc.end.line === value.loc.start.line) return;
					context.report({
						loc: {
							start: beforeToken.loc.end,
							end: value.loc.start
						},
						messageId: "unexpectedAfterHTMLCommentOpen",
						fix: (fixer) => fixer.replaceTextRange([beforeToken.range[1], value.range[0]], " ")
					});
				}
			}
			/**
			* Reports the space after the contents of a given comment if it's invalid.
			* @param {ParsedHTMLComment} comment - comment data.
			* @param {boolean} requireNewline - `true` if line breaks are required.
			* @returns {void}
			*/
			function checkCommentClose(comment, requireNewline) {
				const { value, closeDecoration, close } = comment;
				if (!value) return;
				const afterToken = closeDecoration || close;
				if (requireNewline) {
					if (value.loc.end.line < afterToken.loc.start.line) return;
					context.report({
						loc: {
							start: value.loc.end,
							end: afterToken.loc.start
						},
						messageId: closeDecoration ? "expectedBeforeExceptionBlock" : "expectedBeforeHTMLCommentOpen",
						fix: closeDecoration ? void 0 : (fixer) => fixer.insertTextBefore(afterToken, "\n")
					});
				} else {
					if (value.loc.end.line === afterToken.loc.start.line) return;
					context.report({
						loc: {
							start: value.loc.end,
							end: afterToken.loc.start
						},
						messageId: "unexpectedBeforeHTMLCommentOpen",
						fix: (fixer) => fixer.replaceTextRange([value.range[1], afterToken.range[0]], " ")
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
    return require_html_comment_content_newline();
  }
});