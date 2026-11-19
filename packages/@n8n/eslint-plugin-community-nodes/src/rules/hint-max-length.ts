import { AST_NODE_TYPES, ASTUtils, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findObjectProperty,
	getPropertyKeyName,
	getStringLiteralValue,
} from '../utils/index.js';

/**
 * Almost all first-party hints are within this limit, so it only cuts the long
 * tail. A hint renders inline under the field, where long text pushes the rest
 * of the parameter panel down.
 */
const MAX_HINT_LENGTH = 120;

function isPropertyContext(node: TSESTree.ObjectExpression): boolean {
	const container = node.parent.type === AST_NODE_TYPES.ArrayExpression ? node.parent : node;
	const parent = container.parent;
	if (
		container.type === AST_NODE_TYPES.ArrayExpression &&
		parent.type === AST_NODE_TYPES.PropertyDefinition &&
		getPropertyKeyName(parent) === 'properties'
	) {
		return true;
	}
	if (
		parent.type === AST_NODE_TYPES.VariableDeclarator &&
		parent.id.type === AST_NODE_TYPES.Identifier
	) {
		const annotation = parent.id.typeAnnotation?.typeAnnotation;
		const type =
			container.type === AST_NODE_TYPES.ArrayExpression &&
			annotation?.type === AST_NODE_TYPES.TSArrayType
				? annotation.elementType
				: annotation;
		return (
			type?.type === AST_NODE_TYPES.TSTypeReference &&
			type.typeName.type === AST_NODE_TYPES.Identifier &&
			type.typeName.name === 'INodeProperties'
		);
	}
	if (
		container.type !== AST_NODE_TYPES.ArrayExpression ||
		parent.type !== AST_NODE_TYPES.Property ||
		parent.parent.type !== AST_NODE_TYPES.ObjectExpression
	) {
		return false;
	}

	const owner = parent.parent;
	const type = getStringLiteralValue(findObjectProperty(owner, 'type')?.value ?? null);
	switch (getPropertyKeyName(parent)) {
		case 'properties':
			return true;
		case 'options':
			return type === 'collection';
		case 'modes':
			return type === 'resourceLocator';
		case 'values': {
			const options = owner.parent;
			const optionsProperty =
				options.type === AST_NODE_TYPES.ArrayExpression ? options.parent : null;
			return (
				optionsProperty?.type === AST_NODE_TYPES.Property &&
				getPropertyKeyName(optionsProperty) === 'options' &&
				optionsProperty.parent.type === AST_NODE_TYPES.ObjectExpression &&
				getStringLiteralValue(findObjectProperty(optionsProperty.parent, 'type')?.value ?? null) ===
					'fixedCollection'
			);
		}
		default:
			return false;
	}
}

/** Match imported properties and locator modes by shape. A spread needs a property context. */
function isPropertyLike(node: TSESTree.ObjectExpression): boolean {
	return (
		['displayName', 'name', 'type'].every((key) => findObjectProperty(node, key) !== null) ||
		(node.properties.some((property) => property.type === AST_NODE_TYPES.SpreadElement) &&
			isPropertyContext(node))
	);
}

/**
 * The editor renders a hint as HTML, so count tags as nothing and each entity
 * as one character. A tag starts only with `<` and a letter, `/`, `!` or `?`,
 * so a plain `a < 10` stays text.
 */
function visibleLength(hint: string): number {
	return hint.replace(/<[a-zA-Z/!?][^>]*>/g, '').replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, '_')
		.length;
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
				const hint = hintProperty
					? ASTUtils.getStaticValue(
							hintProperty.value,
							context.sourceCode.getScope(hintProperty.value),
						)?.value
					: null;
				const length = typeof hint === 'string' ? visibleLength(hint) : 0;
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
