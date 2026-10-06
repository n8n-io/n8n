import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { minimatch } from 'minimatch';

type Options = [{ allowedFilePatterns?: string[] }];
type MessageIds = 'moveImport' | 'noTypeormViaDb';

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

const getImportedName = (specifier: TSESTree.ImportSpecifier) =>
	specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;

const isMatchingDecorator = (decorator: TSESTree.Decorator, names: Set<string>) => {
	const expression = decorator.expression;
	if (expression.type === 'Identifier') return names.has(expression.name);

	return expression.type === 'CallExpression' && expression.callee.type === 'Identifier'
		? names.has(expression.callee.name)
		: false;
};

export const MisplacedN8nTypeormImportRule = ESLintUtils.RuleCreator.withoutDocs<
	Options,
	MessageIds
>({
	meta: {
		type: 'problem',
		docs: {
			description: 'Keep TypeORM imports in persistence adapters.',
		},
		messages: {
			moveImport:
				'Import `@n8n/typeorm` only in a persistence adapter. In business logic, add a use-case repository method instead — do not relabel the import to `@n8n/db`.',
			noTypeormViaDb:
				'`{{name}}` is a TypeORM operator/driver type re-exported by `@n8n/db`; importing it here relabels the dependency without decoupling. Add a use-case repository method instead of using TypeORM in business logic.',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					allowedFilePatterns: {
						type: 'array',
						items: { type: 'string', minLength: 1 },
						uniqueItems: true,
					},
				},
			},
		],
	},
	defaultOptions: [{}],
	create(context, [options]) {
		const filename = context.filename.replaceAll('\\', '/');
		if (filename.includes('/packages/@n8n/db/')) return {};

		const isExplicitlyAllowed = options.allowedFilePatterns?.some((pattern) =>
			minimatch(filename, pattern, { dot: true }),
		);
		if (isExplicitlyAllowed) return {};

		const entityDecoratorNames = new Set<string>();
		const repositoryBaseNames = new Set<string>();
		const typeormImports: TSESTree.ImportDeclaration[] = [];
		const guardedDbImports: Array<{ node: TSESTree.ImportSpecifier; name: string }> = [];
		const classes: Array<TSESTree.ClassDeclaration | TSESTree.ClassExpression> = [];
		const inspectClass = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
			classes.push(node);
		};
		const isPersistenceAdapter = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
			if (
				node.decorators.some((decorator) => isMatchingDecorator(decorator, entityDecoratorNames))
			) {
				return true;
			}

			if (node.superClass?.type === 'Identifier' && repositoryBaseNames.has(node.superClass.name)) {
				return true;
			}

			return false;
		};

		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (typeof source !== 'string') return;

				if (source === '@n8n/typeorm' || source.startsWith('@n8n/typeorm/')) {
					typeormImports.push(node);
					if (source === '@n8n/typeorm') {
						for (const specifier of node.specifiers) {
							if (specifier.type !== 'ImportSpecifier') continue;

							const importedName = getImportedName(specifier);
							if (importedName === 'Entity') entityDecoratorNames.add(specifier.local.name);
							if (importedName === 'Repository') repositoryBaseNames.add(specifier.local.name);
						}
					}
					return;
				}

				if (source === '@n8n/db') {
					for (const specifier of node.specifiers) {
						if (specifier.type !== 'ImportSpecifier') continue;

						const importedName = getImportedName(specifier);
						if (importedName === 'BaseRepository') repositoryBaseNames.add(specifier.local.name);
						if (GUARDED_DB_REEXPORTS.has(importedName)) {
							guardedDbImports.push({ node: specifier, name: importedName });
						}
					}
				}
			},
			ClassDeclaration: inspectClass,
			ClassExpression: inspectClass,
			'Program:exit'() {
				if (classes.some(isPersistenceAdapter)) return;

				for (const node of typeormImports) context.report({ node, messageId: 'moveImport' });
				for (const { node, name } of guardedDbImports) {
					context.report({ node, messageId: 'noTypeormViaDb', data: { name } });
				}
			},
		};
	},
});
