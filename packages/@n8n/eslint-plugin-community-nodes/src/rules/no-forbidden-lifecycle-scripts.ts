import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

const FORBIDDEN_SCRIPTS = [
	'prepare',
	'preinstall',
	'install',
	'postinstall',
	'prepublish',
	'preprepare',
	'postprepare',
];

export const NoForbiddenLifecycleScriptsRule = createRule({
	name: 'no-forbidden-lifecycle-scripts',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ban lifecycle scripts (prepare, preinstall, postinstall, etc.) in community node packages',
		},
		messages: {
			forbiddenScript:
				'Lifecycle script "{{ scriptName }}" is not allowed in community node packages. These scripts execute arbitrary code during installation.',
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
				// Only process the root object, not nested ones
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				const scriptsProp = findJsonProperty(node, 'scripts');
				if (!scriptsProp || scriptsProp.value.type !== AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				for (const property of scriptsProp.value.properties) {
					if (property.type !== AST_NODE_TYPES.Property) continue;

					const key =
						property.key.type === AST_NODE_TYPES.Identifier
							? property.key.name
							: property.key.type === AST_NODE_TYPES.Literal
								? String(property.key.value)
								: null;

					if (key !== null && FORBIDDEN_SCRIPTS.includes(key)) {
						context.report({
							node: property,
							messageId: 'forbiddenScript',
							data: { scriptName: key },
						});
					}
				}
			},
		};
	},
});
