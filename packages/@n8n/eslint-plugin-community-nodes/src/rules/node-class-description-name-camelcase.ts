import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

// `description.name` must be camelCase: a lowercase letter followed by
// letters/digits, with no separators.
const CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Converts an arbitrary node name to camelCase by splitting on any
 * non-alphanumeric separators, upper-casing the first character of each
 * subsequent segment, and lower-casing the very first character.
 * Examples: `My Node` -> `myNode`, `my-node` -> `myNode`, `GitHub` -> `gitHub`.
 */
function toCamelCase(value: string): string {
	const segments = value.split(/[^a-zA-Z0-9]+/).filter(Boolean);
	if (segments.length === 0) {
		return value;
	}

	const joined = segments
		.map((segment, index) =>
			index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1),
		)
		.join('');

	return joined.charAt(0).toLowerCase() + joined.slice(1);
}

// Serialize a value as a string literal using the original quote character,
// escaping any characters that would otherwise break the literal so the
// autofix never emits invalid code.
function toStringLiteral(value: string, quote: string): string {
	const escaped = value
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.split(quote)
		.join(`\\${quote}`);
	return `${quote}${escaped}${quote}`;
}

export const NodeClassDescriptionNameCamelCaseRule = createRule({
	name: 'node-class-description-name-camelcase',
	meta: {
		type: 'problem',
		docs: {
			description: 'Node class `description.name` must be camelCase',
		},
		messages: {
			notCamelCase: "Node `description.name` '{{value}}' must be camelCase",
		},
		fixable: 'code',
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
				if (descriptionProperty?.value?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				const nameProperty = findObjectProperty(descriptionProperty.value, 'name');
				if (!nameProperty) {
					return;
				}

				const nameValue = getStringLiteralValue(nameProperty.value);
				if (nameValue === null) {
					return;
				}

				if (CAMEL_CASE_PATTERN.test(nameValue)) {
					return;
				}

				const valueNode = nameProperty.value;
				const fixedValue = toCamelCase(nameValue);
				// Only offer an autofix when it actually yields a valid camelCase
				// value (e.g. names starting with a digit cannot be repaired).
				const canFix = fixedValue !== nameValue && CAMEL_CASE_PATTERN.test(fixedValue);

				context.report({
					node: valueNode,
					messageId: 'notCamelCase',
					data: { value: nameValue },
					fix: canFix
						? (fixer) => {
								const quote = context.sourceCode.getText(valueNode).charAt(0);
								return fixer.replaceText(valueNode, toStringLiteral(fixedValue, quote));
							}
						: undefined,
				});
			},
		};
	},
});
