import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getLiteralValue,
	getPropertyKeyName,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

type DisplayValue = string | number | boolean;

function getShowConditions(element: TSESTree.ArrayExpression['elements'][number]) {
	const conditions = new Map<string, Set<DisplayValue>>();
	if (element?.type !== AST_NODE_TYPES.ObjectExpression) return conditions;

	const displayOptions = findObjectProperty(element, 'displayOptions');
	if (displayOptions?.value.type !== AST_NODE_TYPES.ObjectExpression) return conditions;

	const show = findObjectProperty(displayOptions.value, 'show');
	if (show?.value.type !== AST_NODE_TYPES.ObjectExpression) return conditions;

	for (const property of show.value.properties) {
		if (
			property.type !== AST_NODE_TYPES.Property ||
			property.value.type !== AST_NODE_TYPES.ArrayExpression
		) {
			continue;
		}

		const name = getPropertyKeyName(property);
		if (!name) continue;

		const values = new Set<DisplayValue>();
		for (const valueNode of property.value.elements) {
			const value = getLiteralValue(valueNode);
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				values.add(value);
			}
		}

		if (values.size > 0) conditions.set(name, values);
	}

	return conditions;
}

function areMutuallyExclusive(
	left: TSESTree.ArrayExpression['elements'][number],
	right: TSESTree.ArrayExpression['elements'][number],
): boolean {
	const leftConditions = getShowConditions(left);
	const rightConditions = getShowConditions(right);

	for (const [name, leftValues] of leftConditions) {
		const rightValues = rightConditions.get(name);
		if (rightValues && [...leftValues].every((value) => !rightValues.has(value))) {
			return true;
		}
	}

	return false;
}

export const SingleCredentialPerNodeRule = createRule({
	name: 'single-credential-per-node',
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure a node uses only one credential at a time',
		},
		messages: {
			multipleCredentials:
				'A node can use only one credential at a time. Use mutually exclusive displayOptions for alternative authentication methods. Move non-authentication settings to a node property or collection so users can set them with expressions.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) return {};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				if (!description) return;

				const credentials = findArrayLiteralProperty(description, 'credentials');
				if (!credentials || credentials.elements.length < 2) return;

				for (let leftIndex = 0; leftIndex < credentials.elements.length - 1; leftIndex++) {
					for (
						let rightIndex = leftIndex + 1;
						rightIndex < credentials.elements.length;
						rightIndex++
					) {
						const leftCredential = credentials.elements[leftIndex] ?? null;
						const rightCredential = credentials.elements[rightIndex] ?? null;
						if (!areMutuallyExclusive(leftCredential, rightCredential)) {
							context.report({ node: credentials, messageId: 'multipleCredentials' });
							return;
						}
					}
				}
			},
		};
	},
});
