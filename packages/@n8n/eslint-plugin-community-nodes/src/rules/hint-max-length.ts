import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule, findObjectProperty, getStringLiteralValue } from '../utils/index.js';

/**
 * Almost all first-party hints are within this limit, so it only cuts the long
 * tail. A hint renders inline under the field, where long text pushes the rest
 * of the parameter panel down.
 */
const MAX_HINT_LENGTH = 120;

/**
 * Node properties and resource locator modes both have this shape. Matching on
 * shape instead of on the node class also checks properties that a node
 * imports from other files. A spread usually supplies the shape of a property
 * that only overrides some fields.
 */
function isPropertyLike(node: TSESTree.ObjectExpression): boolean {
	return (
		node.properties.some((property) => property.type === AST_NODE_TYPES.SpreadElement) ||
		['displayName', 'name', 'type'].every((key) => findObjectProperty(node, key) !== null)
	);
}

/** The editor renders a hint as HTML, so only the text takes up space. */
function visibleLength(hint: string): number {
	return hint.replace(/<[^>]*>/g, '').length;
}

export const HintMaxLengthRule = createRule({
	name: 'hint-max-length',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Limit the length of a node property "hint"',
		},
		messages: {
			hintTooLong:
				'The "hint" is {{ length }} characters long, over the limit of {{ max }}. A hint is a short inline nudge. Move the longer text to "description", which renders as the tooltip.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ObjectExpression(node) {
				if (!isPropertyLike(node)) {
					return;
				}

				const hintProperty = findObjectProperty(node, 'hint');
				const hint = getStringLiteralValue(hintProperty?.value ?? null);
				const length = hint === null ? 0 : visibleLength(hint);
				if (!hintProperty || length <= MAX_HINT_LENGTH) {
					return;
				}

				context.report({
					node: hintProperty.value,
					messageId: 'hintTooLong',
					data: { length, max: MAX_HINT_LENGTH },
				});
			},
		};
	},
});
