import { ESLintUtils } from '@typescript-eslint/utils';

export const NoRawEnumRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require const enums to avoid runtime enum objects.',
		},
		messages: {
			noRawEnum:
				'Do not declare raw enums as it leads to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			TSEnumDeclaration(node) {
				if (!node.const) context.report({ node, messageId: 'noRawEnum' });
			},
		};
	},
});
