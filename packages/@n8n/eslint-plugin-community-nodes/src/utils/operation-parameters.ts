import { TSESTree } from '@typescript-eslint/utils';

import { findObjectProperty, getStringLiteralValue } from './ast-utils.js';

/**
 * Whether an object is the operation parameter of a node:
 * `{ name: 'operation', type: 'options', options: [...] }`. Most nodes define it
 * in a description file outside the node class, so rules match it by shape.
 */
export function isOperationParameter(node: TSESTree.ObjectExpression): boolean {
	const name = findObjectProperty(node, 'name');
	const type = findObjectProperty(node, 'type');
	return (
		getStringLiteralValue(name?.value ?? null) === 'operation' &&
		getStringLiteralValue(type?.value ?? null) === 'options' &&
		findObjectProperty(node, 'options')?.value.type === TSESTree.AST_NODE_TYPES.ArrayExpression
	);
}

/** The option objects of an options parameter. */
export function getOptionObjects(node: TSESTree.ObjectExpression): TSESTree.ObjectExpression[] {
	const options = findObjectProperty(node, 'options')?.value;
	if (options?.type !== TSESTree.AST_NODE_TYPES.ArrayExpression) {
		return [];
	}
	return options.elements.filter(
		(element): element is TSESTree.ObjectExpression =>
			element?.type === TSESTree.AST_NODE_TYPES.ObjectExpression,
	);
}
