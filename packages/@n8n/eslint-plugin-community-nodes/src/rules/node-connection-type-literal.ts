import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { createRequire } from 'node:module';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	createRule,
} from '../utils/index.js';

// n8n-workflow's ESM dist uses bare module specifiers that Node's native ESM
// loader cannot resolve. Loading via CJS (createRequire) sidesteps this.
const { NodeConnectionTypes } = createRequire(import.meta.url)('n8n-workflow') as {
	NodeConnectionTypes: Record<string, string>;
};

// Reverse map: string value (e.g. 'main') → enum key name (e.g. 'Main').
// Derived directly from NodeConnectionTypes so it stays in sync automatically.
const VALUE_TO_ENUM_KEY: Record<string, string> = Object.fromEntries(
	Object.entries(NodeConnectionTypes).map(([key, value]) => [value, key]),
);

export const NodeConnectionTypeLiteralRule = createRule({
	name: 'node-connection-type-literal',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow string literals in node description `inputs`/`outputs` — use `NodeConnectionTypes` enum instead',
		},
		messages: {
			stringLiteralInInputs:
				'Use NodeConnectionTypes.{{enumKey}} from "n8n-workflow" instead of the string literal "{{value}}" in "inputs".',
			stringLiteralInOutputs:
				'Use NodeConnectionTypes.{{enumKey}} from "n8n-workflow" instead of the string literal "{{value}}" in "outputs".',
			unknownStringLiteralInInputs:
				'Use the NodeConnectionTypes enum from "n8n-workflow" instead of the string literal "{{value}}" in "inputs".',
			unknownStringLiteralInOutputs:
				'Use the NodeConnectionTypes enum from "n8n-workflow" instead of the string literal "{{value}}" in "outputs".',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		function checkArrayElements(
			elements: TSESTree.ArrayExpression['elements'],
			property: 'inputs' | 'outputs',
		) {
			for (const element of elements) {
				if (element?.type !== AST_NODE_TYPES.Literal) continue;
				if (typeof element.value !== 'string') continue;

				const value = element.value;
				const enumKey = VALUE_TO_ENUM_KEY[value];

				if (enumKey) {
					context.report({
						node: element,
						messageId: property === 'inputs' ? 'stringLiteralInInputs' : 'stringLiteralInOutputs',
						data: { value, enumKey },
						fix(fixer) {
							return fixer.replaceText(element, `NodeConnectionTypes.${enumKey}`);
						},
					});
				} else {
					context.report({
						node: element,
						messageId:
							property === 'inputs'
								? 'unknownStringLiteralInInputs'
								: 'unknownStringLiteralInOutputs',
						data: { value },
					});
				}
			}
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty) return;

				const descriptionValue = descriptionProperty.value;
				if (descriptionValue?.type !== AST_NODE_TYPES.ObjectExpression) return;

				for (const prop of ['inputs', 'outputs'] as const) {
					const property = findObjectProperty(descriptionValue, prop);
					if (property?.value.type !== AST_NODE_TYPES.ArrayExpression) continue;
					checkArrayElements(property.value.elements, prop);
				}
			},
		};
	},
});
