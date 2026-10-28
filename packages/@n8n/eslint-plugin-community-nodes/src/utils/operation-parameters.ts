import { TSESTree } from '@typescript-eslint/utils';
import { split } from 'change-case';
import pluralize from 'pluralize';

import { findObjectProperty, getStringLiteralValue } from './ast-utils.js';

export function isOperationParameter(node: TSESTree.ObjectExpression): boolean {
	const name = findObjectProperty(node, 'name');
	const type = findObjectProperty(node, 'type');
	return (
		getStringLiteralValue(name?.value ?? null) === 'operation' &&
		getStringLiteralValue(type?.value ?? null) === 'options' &&
		findObjectProperty(node, 'options')?.value.type === TSESTree.AST_NODE_TYPES.ArrayExpression
	);
}

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
	const values = resource.elements.map((element) => getStringLiteralValue(element));
	// A value the rule can't read could be another resource, so the list is unknown.
	return values.every((value): value is string => value !== null) ? values : [];
}

const ARTICLES = new Set(['a', 'an', 'the']);

/** The names the UX guidelines give the operations with these values, the first one being the default. */
export const STANDARD_OPERATION_NAMES = new Map([
	['getAll', ['Get Many']],
	['upsert', ['Create or Update', 'Insert or Update', 'Append or Update']],
]);

/** Standard operation names from the UX guidelines that have more than one word. */
const MULTI_WORD_ACTIONS = [
	'Get Many',
	'Create or Update',
	'Insert or Update',
	'Append or Update',
	'Insert or Append',
];

/** A note in brackets, like "(Account View)", is not part of the name. */
const BRACKETED_TEXT = /\([^)]*\)/g;

/**
 * Lowercase singular words without articles. "directoryContext",
 * "directory_context" and "Directory Contexts" all give ["directory", "context"].
 */
function normalizedWords(text: string): string[] {
	// split() handles camelCase, acronyms, separators and punctuation.
	return split(text.replace(BRACKETED_TEXT, ' '))
		.map((word) => pluralize.singular(word.toLowerCase()))
		.filter((word) => !ARTICLES.has(word));
}

/** The action at the start of an operation name: "Get Many" in "Get Many Contacts", "Delete" in "Delete Contact". */
export function operationAction(operationName: string): string {
	const words = operationName.trim().split(/\s+/);
	const standard = MULTI_WORD_ACTIONS.find((action) => {
		const actionWords = action.split(' ');
		return words.slice(0, actionWords.length).join(' ').toLowerCase() === action.toLowerCase();
	});
	return standard
		? words.slice(0, standard.split(' ').length).join(' ')
		: (words[0] ?? operationName);
}

/**
 * Whether an operation name is only a verb plus the resource ("Get Contact"
 * for the contact resource) or the resource itself. A name for an object that
 * is not the resource ("Create Payment Link" for the payment resource) is fine.
 */
export function repeatsResource(operationName: string, resource: string): boolean {
	const name = normalizedWords(operationName);
	const resourceWords = normalizedWords(resource).join(' ');
	const actionLength = normalizedWords(operationAction(operationName)).length;
	return (
		resourceWords !== '' &&
		(name.join(' ') === resourceWords || name.slice(actionLength).join(' ') === resourceWords)
	);
}
