import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getBooleanLiteralValue,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

const EXEMPT_NAMES = new Set([
	'resource',
	'operation',
	'returnAll',
	'limit',
	'simplify',
	'authentication',
]);
const EXEMPT_TYPES = new Set(['collection', 'fixedCollection', 'notice']);

export const OptionalFieldsInCollectionRule = createRule({
	name: 'optional-fields-in-collection',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Place optional node parameters inside a collection',
		},
		messages: {
			optionalField:
				'Optional parameter "{{ name }}" sits at the top level of the node form. Optional parameters belong inside an Additional Fields or Options collection so the default view shows only what the operation requires.',
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

				const properties = findArrayLiteralProperty(description, 'properties');
				if (!properties) return;

				for (const property of properties.elements) {
					if (property?.type !== AST_NODE_TYPES.ObjectExpression) continue;

					const name = getStringLiteralValue(findObjectProperty(property, 'name')?.value ?? null);
					const type = getStringLiteralValue(findObjectProperty(property, 'type')?.value ?? null);
					if (name === null || type === null || EXEMPT_NAMES.has(name) || EXEMPT_TYPES.has(type)) {
						continue;
					}

					const required = findObjectProperty(property, 'required');
					const noDataExpression = findObjectProperty(property, 'noDataExpression');
					if (
						getBooleanLiteralValue(required?.value ?? null) === true ||
						getBooleanLiteralValue(noDataExpression?.value ?? null) === true
					) {
						continue;
					}

					context.report({ node: property, messageId: 'optionalField', data: { name } });
				}
			},
		};
	},
});
