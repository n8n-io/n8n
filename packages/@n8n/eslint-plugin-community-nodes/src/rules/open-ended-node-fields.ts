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

export const OpenEndedNodeFieldsRule = createRule({
	name: 'open-ended-node-fields',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Discourage optional open-ended JSON fields in node properties',
		},
		messages: {
			optionalJson:
				'Optional JSON fields can hide configuration. Use typed parameters under Additional Options or Additional Fields instead.',
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

					const type = findObjectProperty(property, 'type');
					if (getStringLiteralValue(type?.value ?? null) !== 'json') continue;

					const required = findObjectProperty(property, 'required');
					if (getBooleanLiteralValue(required?.value ?? null) === true) continue;

					context.report({ node: property, messageId: 'optionalJson' });
				}
			},
		};
	},
});
