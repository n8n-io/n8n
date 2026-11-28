import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

const PAGINATION_NAMES = new Set([
	'offset',
	'cursor',
	'page',
	'pageToken',
	'page_token',
	'pageSize',
	'page_size',
	'skip',
	'perPage',
	'per_page',
	'startIndex',
	'nextToken',
]);

export const NoRawPaginationParametersRule = createRule({
	name: 'no-raw-pagination-parameters',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow user-facing pagination parameters in node properties',
		},
		messages: {
			rawPaginationParameter:
				'`{{ name }}` exposes a pagination token to the user. Nodes should page internally: offer a `Return All` boolean and a `Limit` shown only when Return All is off, and follow the cursor or offset in the execute path until the results run out or the limit is reached.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		function checkProperties(properties: TSESTree.ArrayExpression): void {
			for (const property of properties.elements) {
				if (property?.type !== AST_NODE_TYPES.ObjectExpression) continue;

				const nameProperty = findObjectProperty(property, 'name');
				const name = getStringLiteralValue(nameProperty?.value ?? null);
				const typeProperty = findObjectProperty(property, 'type');
				const type = getStringLiteralValue(typeProperty?.value ?? null);
				if (
					nameProperty &&
					name &&
					PAGINATION_NAMES.has(name) &&
					typeProperty &&
					type !== 'hidden'
				) {
					context.report({
						node: nameProperty.value,
						messageId: 'rawPaginationParameter',
						data: { name },
					});
				}

				for (const key of ['options', 'values']) {
					const nested = findArrayLiteralProperty(property, key);
					if (nested) checkProperties(nested);
				}
			}
		}

		return {
			ClassDeclaration(node) {
				if (!isFileType(context.filename, '.node.ts') || !isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				const properties = description && findArrayLiteralProperty(description, 'properties');
				if (properties) checkProperties(properties);
			},
			VariableDeclarator(node) {
				if (
					node.parent.parent.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
					node.id.type !== AST_NODE_TYPES.Identifier ||
					node.init?.type !== AST_NODE_TYPES.ArrayExpression
				) {
					return;
				}

				const annotation = node.id.typeAnnotation?.typeAnnotation;
				if (
					annotation?.type === AST_NODE_TYPES.TSArrayType &&
					annotation.elementType.type === AST_NODE_TYPES.TSTypeReference &&
					annotation.elementType.typeName.type === AST_NODE_TYPES.Identifier &&
					annotation.elementType.typeName.name === 'INodeProperties'
				) {
					checkProperties(node.init);
				}
			},
		};
	},
});
