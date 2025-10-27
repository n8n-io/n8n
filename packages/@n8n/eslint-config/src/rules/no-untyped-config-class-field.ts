import { ESLintUtils } from '@typescript-eslint/utils';

export const NoUntypedConfigClassFieldRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce explicit typing of config class fields',
		},
		messages: {
			noUntypedConfigClassField:
				'Class field must have an explicit type annotation, e.g. `field: type = value`. See: https://github.com/n8n-io/n8n/pull/10433',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			PropertyDefinition(node) {
				if (!node.typeAnnotation) {
					context.report({ node: node.key, messageId: 'noUntypedConfigClassField' });
				}
			},
		};
	},
});
