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
	isTriggerNode,
} from '../utils/index.js';

function getDisplayValue(node: TSESTree.Node | null): string | null {
	const literal = getLiteralValue(node);
	if (typeof literal === 'string' || typeof literal === 'number' || typeof literal === 'boolean') {
		return `${typeof literal}:${String(literal)}`;
	}

	if (node?.type === AST_NODE_TYPES.Identifier) return `identifier:${node.name}`;

	if (
		node?.type === AST_NODE_TYPES.MemberExpression &&
		node.object.type === AST_NODE_TYPES.Identifier &&
		!node.computed &&
		node.property.type === AST_NODE_TYPES.Identifier
	) {
		return `member:${node.object.name}.${node.property.name}`;
	}

	return null;
}

function getShowConditions(element: TSESTree.ArrayExpression['elements'][number]) {
	const conditions = new Map<string, Set<string>>();
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

		const values = new Set<string>();
		for (const valueNode of property.value.elements) {
			const value = getDisplayValue(valueNode);
			if (value === null) {
				values.clear();
				break;
			}
			values.add(value);
		}

		if (values.size > 0) conditions.set(name, values);
	}

	return conditions;
}

function getMultiOptionPropertyNames(description: TSESTree.ObjectExpression): Set<string> {
	const names = new Set<string>();
	const properties = findArrayLiteralProperty(description, 'properties');

	for (const element of properties?.elements ?? []) {
		if (element?.type !== AST_NODE_TYPES.ObjectExpression) continue;

		const name = findObjectProperty(element, 'name');
		const type = findObjectProperty(element, 'type');
		if (
			name &&
			type?.value.type === AST_NODE_TYPES.Literal &&
			type.value.value === 'multiOptions'
		) {
			const nameValue = getLiteralValue(name.value);
			if (typeof nameValue === 'string') names.add(nameValue);
		}
	}

	return names;
}

function areMutuallyExclusive(
	left: TSESTree.ArrayExpression['elements'][number],
	right: TSESTree.ArrayExpression['elements'][number],
	multiOptionPropertyNames: Set<string>,
): boolean {
	const leftConditions = getShowConditions(left);
	const rightConditions = getShowConditions(right);

	for (const [name, leftValues] of leftConditions) {
		if (multiOptionPropertyNames.has(name)) continue;

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
			description: 'Ensure a regular node uses only one credential at a time',
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
				if (isTriggerNode(node, description)) return;

				const credentials = findArrayLiteralProperty(description, 'credentials');
				if (!credentials || credentials.elements.length < 2) return;
				const multiOptionPropertyNames = getMultiOptionPropertyNames(description);

				for (let leftIndex = 0; leftIndex < credentials.elements.length - 1; leftIndex++) {
					for (
						let rightIndex = leftIndex + 1;
						rightIndex < credentials.elements.length;
						rightIndex++
					) {
						const leftCredential = credentials.elements[leftIndex] ?? null;
						const rightCredential = credentials.elements[rightIndex] ?? null;
						if (!areMutuallyExclusive(leftCredential, rightCredential, multiOptionPropertyNames)) {
							context.report({ node: credentials, messageId: 'multipleCredentials' });
							return;
						}
					}
				}
			},
		};
	},
});
