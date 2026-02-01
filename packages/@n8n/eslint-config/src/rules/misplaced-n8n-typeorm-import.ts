import { ESLintUtils } from '@typescript-eslint/utils';

export const MisplacedN8nTypeormImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure `@n8n/typeorm` is imported only from within the `@n8n/db` package.',
		},
		messages: {
			moveImport: 'Please move this import to `@n8n/db`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				if (node.source.value === '@n8n/typeorm' && !context.filename.includes('@n8n/db')) {
					context.report({ node, messageId: 'moveImport' });
				}
			},
		};
	},
});
