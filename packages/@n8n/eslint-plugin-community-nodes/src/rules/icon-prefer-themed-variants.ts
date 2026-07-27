import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	isFileType,
	createRule,
} from '../utils/index.js';

const messages = {
	missingThemedVariants:
		'Icon is defined as a single file. Provide both light and dark variants using the `{ light, dark }` form so the icon renders well on both themes.',
} as const;

export const IconPreferThemedVariantsRule = createRule({
	name: 'icon-prefer-themed-variants',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Encourage node and credential icons to provide light/dark variants instead of a single icon file',
		},
		messages,
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (
			!isFileType(context.filename, '.node.ts') &&
			!isFileType(context.filename, '.credentials.ts')
		) {
			return {};
		}

		const checkIconValue = (iconValue: TSESTree.Node) => {
			if (
				iconValue.type === TSESTree.AST_NODE_TYPES.Literal &&
				typeof iconValue.value === 'string'
			) {
				context.report({
					node: iconValue,
					messageId: 'missingThemedVariants',
				});
			}
		};

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) {
					const descriptionProperty = findClassProperty(node, 'description');
					if (descriptionProperty?.value?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
						return;
					}

					const iconProperty = findObjectProperty(descriptionProperty.value, 'icon');
					if (iconProperty) {
						checkIconValue(iconProperty.value);
					}
				} else if (isCredentialTypeClass(node)) {
					const iconProperty = findClassProperty(node, 'icon');
					if (iconProperty?.value) {
						checkIconValue(iconProperty.value);
					}
				}
			},
		};
	},
});
