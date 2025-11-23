import { ESLintUtils } from '@typescript-eslint/utils';

export const NoSkippedTestsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Tests must not be skipped.',
		},
		messages: {
			removeSkip: 'Remove `.skip()` call',
			removeOnly: 'Remove `.only()` call',
			removeXPrefix: 'Remove `x` prefix',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const TESTING_FUNCTIONS = new Set(['test', 'it', 'describe']);
		const SKIPPING_METHODS = new Set(['skip', 'only']);
		const PREFIXED_TESTING_FUNCTIONS = new Set(['xtest', 'xit', 'xdescribe']);
		const toMessageId = (s: string) =>
			('remove' + s.charAt(0).toUpperCase() + s.slice(1)) as
				| 'removeSkip'
				| 'removeOnly'
				| 'removeXPrefix';

		return {
			MemberExpression(node) {
				if (
					node.object.type === 'Identifier' &&
					TESTING_FUNCTIONS.has(node.object.name) &&
					node.property.type === 'Identifier' &&
					SKIPPING_METHODS.has(node.property.name)
				) {
					context.report({
						messageId: toMessageId(node.property.name),
						node,
						fix: (fixer) => {
							const [start, end] = node.property.range;
							return fixer.removeRange([start - '.'.length, end]);
						},
					});
				}
			},
			CallExpression(node) {
				if (node.callee.type === 'Identifier' && PREFIXED_TESTING_FUNCTIONS.has(node.callee.name)) {
					context.report({
						messageId: 'removeXPrefix',
						node,
						fix: (fixer) => fixer.replaceText(node.callee, 'test'),
					});
				}
			},
		};
	},
});
