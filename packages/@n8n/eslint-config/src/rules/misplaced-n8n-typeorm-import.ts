import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * TypeORM operators and driver types that `@n8n/db` re-exports from `@n8n/typeorm`.
 * Importing one of these from `@n8n/db` in business logic relabels the dependency
 * without decoupling it, so it's flagged just like a direct `@n8n/typeorm` import.
 * Keep in sync with the `@n8n/typeorm` re-export block in `@n8n/db/src/index.ts`.
 */
const GUARDED_DB_REEXPORTS = new Set([
	'In',
	'Like',
	'MoreThanOrEqual',
	'Not',
	'DataSource',
	'FindManyOptions',
	'FindOptionsWhere',
	'EntityManager',
]);

export const MisplacedN8nTypeormImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure `@n8n/typeorm` is imported only from within the `@n8n/db` package.',
		},
		messages: {
			moveImport:
				'Import `@n8n/typeorm` only in the persistence layer (`@n8n/db` or a module’s `database/` folder). In business logic, add a use-case repository method instead — do not relabel the import to `@n8n/db`.',
			noTypeormViaDb:
				'`{{name}}` is a TypeORM operator/driver type re-exported by `@n8n/db`; importing it here relabels the dependency without decoupling. Add a use-case repository method instead of using TypeORM in business logic.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (context.filename.includes('@n8n/db')) return {};

		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (typeof source !== 'string') return;

				if (source === '@n8n/typeorm' || source.startsWith('@n8n/typeorm/')) {
					context.report({ node, messageId: 'moveImport' });
					return;
				}

				if (source === '@n8n/db') {
					for (const specifier of node.specifiers) {
						if (
							specifier.type === 'ImportSpecifier' &&
							specifier.imported.type === 'Identifier' &&
							GUARDED_DB_REEXPORTS.has(specifier.imported.name)
						) {
							context.report({
								node: specifier,
								messageId: 'noTypeormViaDb',
								data: { name: specifier.imported.name },
							});
						}
					}
				}
			},
		};
	},
});
