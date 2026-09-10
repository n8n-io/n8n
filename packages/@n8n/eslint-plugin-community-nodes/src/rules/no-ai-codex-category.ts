import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createCodexObjectVisitor,
	findCodexProperty,
	removeArrayElement,
} from '../utils/codex-utils.js';
import { createRule } from '../utils/index.js';

const RESERVED_CATEGORY = 'AI';

export const NoAiCodexCategoryRule = createRule({
	name: 'no-ai-codex-category',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow the reserved "AI" codex category in community nodes that do not import the AI Node SDK',
		},
		messages: {
			aiCategoryNotAllowed:
				'The "AI" codex category is reserved for built-in n8n AI nodes and nodes built with @n8n/ai-node-sdk. n8n\'s node panel special-cases this value when deciding what to show in the main "Add node" search, so a node that declares it without the SDK can be silently misclassified. Remove "AI" from codex.categories, or import from @n8n/ai-node-sdk if this node is meant to be an AI node.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return createCodexObjectVisitor(context, (codexObject) => {
			const categoriesProperty = findCodexProperty(codexObject, 'categories');
			if (!categoriesProperty || categoriesProperty.value.type !== AST_NODE_TYPES.ArrayExpression) {
				return;
			}

			const elements = categoriesProperty.value.elements;
			for (const element of elements) {
				if (
					element?.type === AST_NODE_TYPES.Literal &&
					typeof element.value === 'string' &&
					element.value === RESERVED_CATEGORY
				) {
					context.report({
						node: element,
						messageId: 'aiCategoryNotAllowed',
						fix(fixer) {
							return removeArrayElement(fixer, context.sourceCode, elements, element);
						},
					});
				}
			}
		});
	},
});
