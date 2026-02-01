import { ESLintUtils } from '@typescript-eslint/utils';

export const NoInternalPackageImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow imports from internal package paths (e.g. `@n8n/pkg/src/...`).',
		},
		messages: {
			noInternalPackageImport:
				'Import from "{{ packageRoot }}", not from the internal `/src/` path.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const INTERNAL_IMPORT_REGEX = /^(?<packageRoot>@n8n\/[^/]+)\/src\//;

		return {
			ImportDeclaration(node) {
				if (typeof node.source.type !== 'string') return;

				const match = node.source.value.match(INTERNAL_IMPORT_REGEX);

				if (!match?.groups) return;

				const { packageRoot } = match.groups;

				context.report({
					node: node.source,
					messageId: 'noInternalPackageImport',
					fix: (fixer) => fixer.replaceText(node.source, `"${packageRoot}"`),
					data: { packageRoot },
				});
			},
		};
	},
});
