import { ESLintUtils } from '@typescript-eslint/utils';

export const NoImportEnterpriseEditionRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow imports from .ee directories in non-enterprise code. Only code in .ee directories can import from other .ee directories.',
		},
		messages: {
			noImportEnterpriseEdition:
				'Non-enterprise code cannot import from .ee directories. Only code in .ee directories can import from other .ee directories.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const filename = context.filename;
		const isEnterpriseEditionFile = filename.includes('.ee/');
		const isIntegrationTestFile = filename.includes('packages/cli/test/integration/');

		if (isEnterpriseEditionFile || isIntegrationTestFile) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				const importPath = node.source.value;

				const isEnterpriseEditionImport = importPath.includes('.ee/');

				if (isEnterpriseEditionImport) {
					context.report({
						node: node.source,
						messageId: 'noImportEnterpriseEdition',
					});
				}
			},
		};
	},
});
