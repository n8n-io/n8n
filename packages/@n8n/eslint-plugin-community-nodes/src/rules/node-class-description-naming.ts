import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

export const NodeClassDescriptionNamingRule = createRule({
	name: 'node-class-description-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Validates naming conventions inside the `description` object of node classes (name must be camelCase, description must not be empty, credentials must be suffixed with "Api", color must not be the n8n core color)',
		},
		messages: {
			nameMustBeCamelCase: 'Node description `name` "{{name}}" must be camelCase',
			descriptionEmpty: 'Node description `description` field must not be an empty string',
			credentialNameUnsuffixed:
				'Credential reference "{{name}}" in node description must be suffixed with "Api"',
			coreColorPresent: 'Node description `color` must not use the n8n core color "{{color}}"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

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
					if (nameValue !== null && !/^[a-z][a-zA-Z0-9]*$/.test(nameValue)) {
						context.report({
							node: nameProp.value,
							messageId: 'nameMustBeCamelCase',
							data: { name: nameValue },
						});
					}
				}

				const descProp = findObjectProperty(descriptionObj, 'description');
				if (descProp) {
					const descValue = getStringLiteralValue(descProp.value);
					if (descValue === '') {
						context.report({
							node: descProp.value,
							messageId: 'descriptionEmpty',
						});
					}
				}

				const colorProp = findObjectProperty(descriptionObj, 'color');
				if (colorProp) {
					const colorValue = getStringLiteralValue(colorProp.value);
					if (colorValue !== null && colorValue.toLowerCase() === '#ff6d5a') {
						context.report({
							node: colorProp.value,
							messageId: 'coreColorPresent',
							data: { color: colorValue },
						});
					}
				}

				const credentialsProp = findObjectProperty(descriptionObj, 'credentials');
				if (credentialsProp?.value.type === AST_NODE_TYPES.ArrayExpression) {
					for (const element of credentialsProp.value.elements) {
						if (element?.type !== AST_NODE_TYPES.ObjectExpression) continue;
						const credNameProp = findObjectProperty(element, 'name');
						if (!credNameProp) continue;
						const credNameValue = getStringLiteralValue(credNameProp.value);
						if (credNameValue !== null && !credNameValue.endsWith('Api')) {
							context.report({
								node: credNameProp.value,
								messageId: 'credentialNameUnsuffixed',
								data: { name: credNameValue },
							});
						}
					}
				}
			},
		};
	},
});
