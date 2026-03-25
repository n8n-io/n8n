import {ConfigCommentParser} from '@eslint/plugin-kit';

const MESSAGE_ID = 'no-abusive-eslint-disable';
const messages = {
	[MESSAGE_ID]: 'Specify the rules you want to disable.',
};

// https://github.com/eslint/eslint/blob/ecd0ede7fd2ccbb4c0daf0e4732e97ea0f49db1b/lib/linter/linter.js#L509-L512
const eslintDisableDirectives = new Set([
	'eslint-disable',
	'eslint-disable-line',
	'eslint-disable-next-line',
]);

let commentParser;
/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* Program(node) {
		for (const comment of node.comments) {
			commentParser ??= new ConfigCommentParser();
			const result = commentParser.parseDirective(comment.value);

			if (!(
				// It's a eslint-disable comment
				eslintDisableDirectives.has(result?.label)
				// But it did not specify any rules
				&& !result?.value
			)) {
				return;
			}

			const {sourceCode} = context;

			yield {
				// Can't set it at the given location as the warning
				// will be ignored due to the disable comment
				loc: {
					start: {
						...sourceCode.getLoc(comment).start,
						column: -1,
					},
					end: sourceCode.getLoc(comment).end,
				},
				messageId: MESSAGE_ID,
			};
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce specifying rules to disable in `eslint-disable` comments.',
			recommended: true,
		},
		messages,
	},
};

export default config;
