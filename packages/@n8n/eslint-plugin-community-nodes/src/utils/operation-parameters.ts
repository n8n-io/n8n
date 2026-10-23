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

/** The resource values an operation parameter is shown for (`displayOptions.show.resource`). */
export function getShownResources(node: TSESTree.ObjectExpression): string[] {
	const displayOptions = findObjectProperty(node, 'displayOptions')?.value;
	if (displayOptions?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
		return [];
	}
	const show = findObjectProperty(displayOptions, 'show')?.value;
	if (show?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
		return [];
	}
	const resource = findObjectProperty(show, 'resource')?.value;
	if (resource?.type !== TSESTree.AST_NODE_TYPES.ArrayExpression) {
		return [];
	}
	return resource.elements
		.map((element) => getStringLiteralValue(element))
		.filter((value): value is string => value !== null);
}

const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * Lowercase words without plural "s" or articles. Text in brackets is left out.
 * "directoryContext", "directory_context" and "Directory Contexts" all give
 * ["directory", "context"].
 */
function normalizedWords(text: string): string[] {
	return text
		.replace(/\([^)]*\)/g, ' ')
		.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
		.split(/[\s_-]+/)
		.map((word) =>
			word
				.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '')
				.toLowerCase()
				.replace(/s$/, ''),
		)
		.filter((word) => word !== '' && !ARTICLES.has(word));
}

/**
 * Whether an operation name is only a verb plus the resource ("Get Contact"
 * for the contact resource) or the resource itself. A name for an object that
 * is not the resource ("Create Payment Link" for the payment resource) is fine.
 */
export function repeatsResource(operationName: string, resource: string): boolean {
	const name = normalizedWords(operationName);
	const resourceWords = normalizedWords(resource).join(' ');
	return (
		resourceWords !== '' &&
		(name.join(' ') === resourceWords || name.slice(1).join(' ') === resourceWords)
	);
}
