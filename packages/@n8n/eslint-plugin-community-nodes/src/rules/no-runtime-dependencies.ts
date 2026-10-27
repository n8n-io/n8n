import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

export const NoRuntimeDependenciesRule = createRule({
	name: 'no-runtime-dependencies',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-empty "dependencies" in community node package.json',
		},
		messages: {
			runtimeDependenciesForbidden:
				'The "dependencies" field must be empty or absent in community node packages. Runtime dependencies get bundled into the n8n instance and can conflict with other nodes or the n8n runtime itself. Move shared libraries to "peerDependencies" or bundle them into your build artifact.',
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

				const depsProp = findJsonProperty(node, 'dependencies');
				if (!depsProp) {
					return;
				}

				if (
					depsProp.value.type !== AST_NODE_TYPES.ObjectExpression ||
					depsProp.value.properties.length === 0
				) {
					return;
				}

				context.report({
					node: depsProp,
					messageId: 'runtimeDependenciesForbidden',
				});
			},
		};
	},
});
