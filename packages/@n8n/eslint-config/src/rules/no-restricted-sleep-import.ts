// `n8n-workflow` re-exports `sleep` only as a backwards-compat layer for community
// nodes. Internal code must reach the canonical implementation in `@n8n/utils/sleep`
// directly, so the shim stays inert and can be dropped once it is no longer needed.
//
// Scope (intentional): only a named `sleep` specifier is reported. A namespace import
// (`import * as x from 'n8n-workflow'`) is left alone — it is the generated
// `import type * as _importType0` shape used with `vi.importActual`, and flagging it
// would report every namespace import of the package regardless of what it uses.
import { ESLintUtils } from '@typescript-eslint/utils';

const RESTRICTED_SOURCE = 'n8n-workflow';

export const NoRestrictedSleepImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow importing `sleep` from `n8n-workflow`.',
		},
		messages: {
			noRestrictedSleepImport:
				'Do not import `sleep` from `n8n-workflow`. Import it from `@n8n/utils/sleep` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				if (node.source.value !== RESTRICTED_SOURCE) return;

				for (const specifier of node.specifiers) {
					if (specifier.type !== 'ImportSpecifier') continue;

					// `imported` is the name in `n8n-workflow`, so an alias
					// (`sleep as delay`) is still reported.
					const importedName =
						specifier.imported.type === 'Identifier'
							? specifier.imported.name
							: specifier.imported.value;

					if (importedName === 'sleep') {
						context.report({ node: specifier, messageId: 'noRestrictedSleepImport' });
					}
				}
			},
		};
	},
});
