import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

export const NoMonorepoRule = createRule({
	name: 'no-monorepo',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require community nodes to use a single-package repository',
		},
		messages: {
			monorepoNotSupported:
				'Community nodes must use a single-package repository. Monorepo packages are not supported.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				const repository = findJsonProperty(node, 'repository');
				if (repository?.value.type !== AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				const directory = findJsonProperty(repository.value, 'directory');
				if (
					directory &&
					(directory.value.type !== AST_NODE_TYPES.Literal ||
						typeof directory.value.value !== 'string' ||
						!/^\.(?:[\\/]\.)*[\\/]?$/.test(directory.value.value))
				) {
					context.report({
						node: directory,
						messageId: 'monorepoNotSupported',
					});
				}
			},
		};
	},
});
