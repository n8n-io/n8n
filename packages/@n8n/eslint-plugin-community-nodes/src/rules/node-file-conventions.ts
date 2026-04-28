import path from 'node:path';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isNodeTypeClass,
} from '../utils/index.js';

export const NodeFileConventionsRule = createRule({
	name: 'node-file-conventions',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Node files must be named "[NodeClassName].node.ts"; trigger nodes must have name ending with "Trigger" and displayName containing "Trigger"',
		},
		messages: {
			filenameAgainstConvention: 'Node filename must follow the pattern "[NodeClassName].node.ts"',
			triggerNameUnsuffixed: 'Trigger node description `name` "{{value}}" must end with "Trigger"',
			triggerDisplayNameUnsuffixed: 'Trigger node `displayName` "{{value}}" must include "Trigger"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const className = node.id?.type === AST_NODE_TYPES.Identifier ? node.id.name : null;
				if (!className) return;

				const filename = path.basename(context.filename);
				const expectedFilename = `${className}.node.ts`;
				if (filename !== expectedFilename) {
					context.report({
						node: node.id ?? node,
						messageId: 'filenameAgainstConvention',
					});
				}

				if (!className.endsWith('Trigger')) return;

				const descriptionProperty = findClassProperty(node, 'description');
				if (
					!descriptionProperty?.value ||
					descriptionProperty.value.type !== AST_NODE_TYPES.ObjectExpression
				) {
					return;
				}

				const descriptionObj = descriptionProperty.value;

				const nameProp = findObjectProperty(descriptionObj, 'name');
				if (nameProp) {
					const nameValue = getStringLiteralValue(nameProp.value);
					if (nameValue !== null && !nameValue.endsWith('Trigger')) {
						context.report({
							node: nameProp.value,
							messageId: 'triggerNameUnsuffixed',
							data: { value: nameValue },
						});
					}
				}

				const displayNameProp = findObjectProperty(descriptionObj, 'displayName');
				if (displayNameProp) {
					const displayNameValue = getStringLiteralValue(displayNameProp.value);
					if (displayNameValue !== null && !displayNameValue.includes('Trigger')) {
						context.report({
							node: displayNameProp.value,
							messageId: 'triggerDisplayNameUnsuffixed',
							data: { value: displayNameValue },
						});
					}
				}
			},
		};
	},
});
