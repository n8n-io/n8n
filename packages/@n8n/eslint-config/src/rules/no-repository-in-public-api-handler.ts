import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Public API handlers and controllers must go through a service, never a
 * repository. Direct repository access couples the transport layer to the
 * persistence layer — the same leak the handler-pattern migration (API-70) is
 * removing. This rule flags repository imports from `@n8n/db` and
 * `Container.get(...Repository)` so new endpoints can't reintroduce it.
 *
 * Scoped to `public-api/v1/handlers|controllers/**` via the `files` glob in
 * `packages/cli/eslint.config.mjs`. Only repository symbols are flagged — other
 * `@n8n/db` imports (`AuthenticatedRequest`, `User`, entity classes) are legit
 * and used by the reference controller itself.
 */
const isRepositoryName = (name: string) => name.endsWith('Repository');

export const NoRepositoryInPublicApiHandlerRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow direct repository access in public API handlers and controllers.',
		},
		messages: {
			noRepositoryImport:
				'`{{name}}` is a repository — public API handlers must not access the persistence layer directly. Call a service (e.g. `TagService`) instead.',
			noRepositoryContainerGet:
				'`Container.get({{name}})` reaches the persistence layer directly — public API handlers must go through a service instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				if (node.source.value !== '@n8n/db') return;

				for (const specifier of node.specifiers) {
					if (
						specifier.type === 'ImportSpecifier' &&
						specifier.imported.type === 'Identifier' &&
						isRepositoryName(specifier.imported.name)
					) {
						context.report({
							node: specifier,
							messageId: 'noRepositoryImport',
							data: { name: specifier.imported.name },
						});
					}
				}
			},
			CallExpression(node) {
				const { callee } = node;
				if (
					callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
					callee.object.type !== TSESTree.AST_NODE_TYPES.Identifier ||
					callee.object.name !== 'Container' ||
					callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
					callee.property.name !== 'get'
				) {
					return;
				}

				const [arg] = node.arguments;
				if (arg?.type === TSESTree.AST_NODE_TYPES.Identifier && isRepositoryName(arg.name)) {
					context.report({
						node: arg,
						messageId: 'noRepositoryContainerGet',
						data: { name: arg.name },
					});
				}
			},
		};
	},
});
