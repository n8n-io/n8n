import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

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

export const NoConfirmationCheckboxRule = createRule({
	name: 'no-confirmation-checkbox',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow confirmation checkboxes that gate node operations',
		},
		messages: {
			confirmationCheckbox:
				'`{{ name }}` asks the user to confirm an operation they have already selected. n8n has no confirmation-checkbox convention, and a workflow running unattended has nobody to tick it. Remove the field; if the operation is destructive, say so in its `description`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const propertyArrays = new Set<TSESTree.Node>();

		return {
			ClassDeclaration(node) {
				if (!isFileType(context.filename, '.node.ts') || !isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				const properties = description && findArrayLiteralProperty(description, 'properties');
				if (properties) propertyArrays.add(properties);
			},
			VariableDeclarator(node) {
				if (
					node.parent.parent.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
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
					propertyArrays.add(node.init);
				}
			},
			ObjectExpression(node) {
				const type = findObjectProperty(node, 'type');
				const defaultValue = findObjectProperty(node, 'default');
				if (
					getStringLiteralValue(type?.value ?? null) !== 'boolean' ||
					getBooleanLiteralValue(defaultValue?.value ?? null) !== false
				) {
					return;
				}

				const name = getStringLiteralValue(findObjectProperty(node, 'name')?.value ?? null);
				const displayName = getStringLiteralValue(
					findObjectProperty(node, 'displayName')?.value ?? null,
				);
				if (
					name === null ||
					(!/^confirm/i.test(name) && !/^(confirm|i confirm|are you sure)/i.test(displayName ?? ''))
				) {
					return;
				}
				if (
					!context.sourceCode.getAncestors(node).some((ancestor) => propertyArrays.has(ancestor))
				) {
					return;
				}

				context.report({ node, messageId: 'confirmationCheckbox', data: { name } });
			},
		};
	},
});
