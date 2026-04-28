import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
} from '../utils/index.js';

const PARAM_TYPES = new Set([
	'string',
	'number',
	'boolean',
	'options',
	'multiOptions',
	'collection',
	'fixedCollection',
	'dateTime',
	'color',
	'json',
]);

function isNodeParam(node: TSESTree.ObjectExpression): boolean {
	const typeProp = findObjectProperty(node, 'type');
	const typeValue = getStringLiteralValue(typeProp?.value ?? null);
	if (!typeValue || !PARAM_TYPES.has(typeValue)) return false;
	return !!findObjectProperty(node, 'name');
}

export const NodeParamConventionsRule = createRule({
	name: 'node-param-conventions',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforces best practices on node parameter definitions: default must be present, required:false is redundant, and option names/values must be unique',
		},
		messages: {
			defaultMissing: 'Node parameter must have a `default` value',
			requiredFalse: '`required: false` is redundant — omit it',
			duplicateOptionName: 'Duplicate option name "{{name}}" in parameter options',
			duplicateOptionValue: 'Duplicate option value "{{value}}" in parameter options',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) return {};

		return {
			ObjectExpression(node) {
				if (!isNodeParam(node)) return;

				// Check for missing `default` property
				if (!findObjectProperty(node, 'default')) {
					context.report({ node, messageId: 'defaultMissing' });
				}

				// Check for `required: false`
				const requiredProp = findObjectProperty(node, 'required');
				if (
					requiredProp &&
					requiredProp.value.type === AST_NODE_TYPES.Literal &&
					requiredProp.value.value === false
				) {
					context.report({ node: requiredProp.value, messageId: 'requiredFalse' });
				}

				// Check for duplicate option names/values
				const optionsProp = findObjectProperty(node, 'options');
				if (!optionsProp || optionsProp.value.type !== AST_NODE_TYPES.ArrayExpression) return;

				const seenNames = new Set<string>();
				const seenValues = new Set<string>();

				for (const element of optionsProp.value.elements) {
					if (!element || element.type !== AST_NODE_TYPES.ObjectExpression) continue;

					const nameProp = findObjectProperty(element, 'name');
					const nameValue = nameProp ? getStringLiteralValue(nameProp.value) : null;
					if (nameValue !== null) {
						if (seenNames.has(nameValue)) {
							context.report({
								node: nameProp!.value,
								messageId: 'duplicateOptionName',
								data: { name: nameValue },
							});
						} else {
							seenNames.add(nameValue);
						}
					}

					const valueProp = findObjectProperty(element, 'value');
					const optionValue = valueProp ? getStringLiteralValue(valueProp.value) : null;
					if (optionValue !== null) {
						if (seenValues.has(optionValue)) {
							context.report({
								node: valueProp!.value,
								messageId: 'duplicateOptionValue',
								data: { value: optionValue },
							});
						} else {
							seenValues.add(optionValue);
						}
					}
				}
			},
		};
	},
});
