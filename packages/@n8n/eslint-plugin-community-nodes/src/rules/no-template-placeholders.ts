import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../utils/index.js';

const ANGLE_PLACEHOLDER = /<[^<>\n]+?>/;
const MUSTACHE_PLACEHOLDER = /\{\{[^{}\n]+?\}\}/;

function findPlaceholder(value: string): { pattern: string; type: 'angle' | 'mustache' } | null {
	const angleMatch = ANGLE_PLACEHOLDER.exec(value);
	if (angleMatch) {
		return { pattern: angleMatch[0], type: 'angle' };
	}
	const mustacheMatch = MUSTACHE_PLACEHOLDER.exec(value);
	if (mustacheMatch) {
		return { pattern: mustacheMatch[0], type: 'mustache' };
	}
	return null;
}

export const NoTemplatePlaceholdersRule = createRule({
	name: 'no-template-placeholders',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unresolved template placeholders in package.json',
		},
		messages: {
			unresolvedPlaceholder:
				'String value contains an unresolved template placeholder "{{ pattern }}". Replace it with a real value before publishing.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			Literal(node: TSESTree.Literal) {
				if (typeof node.value !== 'string') {
					return;
				}

				// Skip property keys — only flag values.
				if (
					node.parent?.type === AST_NODE_TYPES.Property &&
					node.parent.key === node &&
					!node.parent.computed
				) {
					return;
				}

				const placeholder = findPlaceholder(node.value);
				if (!placeholder) {
					return;
				}

				context.report({
					node,
					messageId: 'unresolvedPlaceholder',
					data: { pattern: placeholder.pattern },
				});
			},
		};
	},
});
