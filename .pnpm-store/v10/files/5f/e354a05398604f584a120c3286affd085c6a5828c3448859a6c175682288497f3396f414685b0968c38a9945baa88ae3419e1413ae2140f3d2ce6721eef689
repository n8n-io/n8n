/**
 * @fileoverview Rule to disallow empty static blocks.
 * @author Sosuke Suzuki
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../types').Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",

		docs: {
			description: "Disallow empty static blocks",
			recommended: true,
			url: "https://eslint.org/docs/latest/rules/no-empty-static-block",
		},

		schema: [],

		messages: {
			unexpected: "Unexpected empty static block.",
		},
	},

	create(context) {
		const sourceCode = context.sourceCode;

		return {
			StaticBlock(node) {
				if (node.body.length === 0) {
					const closingBrace = sourceCode.getLastToken(node);

					if (
						sourceCode.getCommentsBefore(closingBrace).length === 0
					) {
						context.report({
							node,
							messageId: "unexpected",
						});
					}
				}
			},
		};
	},
};
