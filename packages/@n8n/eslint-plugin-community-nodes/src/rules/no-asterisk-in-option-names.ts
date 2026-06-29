import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

export const NoAsteriskInOptionNamesRule = createRule({
	name: 'no-asterisk-in-option-names',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow asterisk characters in node option name values',
		},
		hasSuggestions: true,
		messages: {
			asteriskInOptionName:
				'Option name "{{ name }}" contains "*", which renders ambiguously in the n8n UI. Use bracketed notation like "[All]" instead.',
			replaceAsterisk: 'Replace "*" with "[All]".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		// Check every object that is a direct element of an `options` array.
		const checkOptionsArray = (optionsArray: TSESTree.ArrayExpression): void => {
			for (const option of optionsArray.elements) {
				if (!option || option.type !== AST_NODE_TYPES.ObjectExpression) {
					continue;
				}

				const valueNode = findObjectProperty(option, 'name')?.value;
				if (!valueNode) {
					continue;
				}

				const name = getStringLiteralValue(valueNode);
				if (!name?.includes('*')) {
					continue;
				}

				context.report({
					node: valueNode,
					messageId: 'asteriskInOptionName',
					data: { name },
					suggest: [
						{
							messageId: 'replaceAsterisk',
							fix(fixer) {
								const quote = context.sourceCode.getText(valueNode).at(0) ?? "'";
								return fixer.replaceText(
									valueNode,
									`${quote}${name.replaceAll('*', '[All]')}${quote}`,
								);
							},
						},
					],
				});
			}
		};

		const traverse = (node: TSESTree.Node): void => {
			if (node.type === AST_NODE_TYPES.ObjectExpression) {
				const optionsProperty = findObjectProperty(node, 'options');
				if (optionsProperty?.value.type === AST_NODE_TYPES.ArrayExpression) {
					checkOptionsArray(optionsProperty.value);
				}
			}

			for (const key in node) {
				if (key === 'parent') {
					continue;
				}
				const child = node[key as keyof TSESTree.Node] as unknown;
				if (Array.isArray(child)) {
					for (const item of child) {
						if (item && typeof item === 'object' && 'type' in item) {
							traverse(item as TSESTree.Node);
						}
					}
				} else if (child && typeof child === 'object' && 'type' in child) {
					traverse(child as TSESTree.Node);
				}
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty?.value) {
					return;
				}

				traverse(descriptionProperty.value);
			},
		};
	},
});
