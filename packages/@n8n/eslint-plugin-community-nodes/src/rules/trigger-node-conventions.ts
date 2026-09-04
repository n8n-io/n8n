import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	isTriggerNodeClass,
	findNodeDescriptionObject,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

export const TriggerNodeConventionsRule = createRule({
	name: 'trigger-node-conventions',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Trigger nodes (class name ends with `Trigger`) must label themselves consistently as triggers',
		},
		messages: {
			nameMissingSuffix: "Trigger node `description.name` '{{value}}' must end with 'Trigger'",
			displayNameMissingTrigger:
				"Trigger node `description.displayName` '{{value}}' must contain 'Trigger'",
			inputsNotEmpty: 'Trigger node `description.inputs` must be an empty array `[]`',
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

				if (!isTriggerNodeClass(node)) {
					return;
				}

				const description = findNodeDescriptionObject(node);
				if (!description) {
					return;
				}

				const displayNameProperty = findObjectProperty(description, 'displayName');
				const displayNameValue = displayNameProperty
					? getStringLiteralValue(displayNameProperty.value)
					: null;
				if (
					displayNameProperty &&
					displayNameValue !== null &&
					!displayNameValue.includes('Trigger')
				) {
					context.report({
						node: displayNameProperty.value,
						messageId: 'displayNameMissingTrigger',
						data: { value: displayNameValue },
					});
				}

				const nameProperty = findObjectProperty(description, 'name');
				const nameValue = nameProperty ? getStringLiteralValue(nameProperty.value) : null;
				if (nameProperty && nameValue !== null && !nameValue.endsWith('Trigger')) {
					context.report({
						node: nameProperty.value,
						messageId: 'nameMissingSuffix',
						data: { value: nameValue },
					});
				}

				const inputsProperty = findObjectProperty(description, 'inputs');
				if (
					inputsProperty &&
					!(
						inputsProperty.value.type === TSESTree.AST_NODE_TYPES.ArrayExpression &&
						inputsProperty.value.elements.length === 0
					)
				) {
					context.report({
						node: inputsProperty.value,
						messageId: 'inputsNotEmpty',
					});
				}
			},
		};
	},
});
