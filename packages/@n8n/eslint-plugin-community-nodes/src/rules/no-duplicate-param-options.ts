import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	getLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

export const NoDuplicateParamOptionsRule = createRule({
	name: 'no-duplicate-param-options',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow duplicate option names or values within a single node parameter',
		},
		messages: {
			duplicateName: 'Duplicate option name "{{ value }}" in parameter "{{ displayName }}".',
			duplicateValue: 'Duplicate option value "{{ value }}" in parameter "{{ displayName }}".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const checkProperty = (property: TSESTree.ObjectExpression): void => {
			const typeProperty = findObjectProperty(property, 'type');
			const type = typeProperty ? getStringLiteralValue(typeProperty.value) : null;
			if (type !== 'options' && type !== 'multiOptions') {
				return;
			}

			const optionsProperty = findObjectProperty(property, 'options');
			if (
				!optionsProperty?.value ||
				optionsProperty.value.type !== AST_NODE_TYPES.ArrayExpression
			) {
				return;
			}

			const displayNameProperty = findObjectProperty(property, 'displayName');
			const displayName =
				(displayNameProperty ? getStringLiteralValue(displayNameProperty.value) : null) ??
				'unknown';

			const seenNames = new Set<string>();
			const seenValues = new Set<string | number | boolean>();

			for (const option of optionsProperty.value.elements) {
				if (!option || option.type !== AST_NODE_TYPES.ObjectExpression) {
					continue;
				}

				const nameProperty = findObjectProperty(option, 'name');
				const name = nameProperty ? getStringLiteralValue(nameProperty.value) : null;
				if (name !== null) {
					if (seenNames.has(name)) {
						context.report({
							node: nameProperty!.value,
							messageId: 'duplicateName',
							data: { value: name, displayName },
						});
					}
					seenNames.add(name);
				}

				const valueProperty = findObjectProperty(option, 'value');
				const value = valueProperty ? getLiteralValue(valueProperty.value) : null;
				if (value !== null) {
					if (seenValues.has(value)) {
						context.report({
							node: valueProperty!.value,
							messageId: 'duplicateValue',
							data: { value: String(value), displayName },
						});
					}
					seenValues.add(value);
				}
			}
		};

		const analyzeNodeDescription = (descriptionValue: TSESTree.Expression | null): void => {
			if (!descriptionValue || descriptionValue.type !== AST_NODE_TYPES.ObjectExpression) {
				return;
			}

			const propertiesProperty = findObjectProperty(descriptionValue, 'properties');
			if (
				!propertiesProperty?.value ||
				propertiesProperty.value.type !== AST_NODE_TYPES.ArrayExpression
			) {
				return;
			}

			for (const property of propertiesProperty.value.elements) {
				if (!property || property.type !== AST_NODE_TYPES.ObjectExpression) {
					continue;
				}
				checkProperty(property);
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty) {
					return;
				}

				analyzeNodeDescription(descriptionProperty.value);
			},
		};
	},
});
