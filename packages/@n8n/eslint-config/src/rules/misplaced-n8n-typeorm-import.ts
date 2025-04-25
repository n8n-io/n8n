import { ESLintUtils } from '@typescript-eslint/utils';

export const MisplacedN8nTypeormImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensure `@n8n/typeorm` is imported only from within the `packages/cli/src/databases` directory.',
		},
		messages: {
			moveImport: 'Move this import to `packages/cli/src/databases/**/*.ts`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				if (
					node.source.value === '@n8n/typeorm' &&
					!context.filename.includes('packages/cli/src/databases/')
				) {
					context.report({ node, messageId: 'moveImport' });
				}
			},
		};
	},
});
