import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

function getWords(value: string): string[] {
	return value
		.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.split(/[\s_-]+/)
		.filter((word) => word && !/^(a|an|the)$/i.test(word));
}

function matchesResource(words: string[], resource: string): boolean {
	const name = words.join(' ').toLowerCase();
	return (
		name === resource ||
		['s', 'es'].some((suffix) => name === resource + suffix || name + suffix === resource)
	);
}

export const OperationNameRepeatsResourceRule = createRule({
	name: 'operation-name-repeats-resource',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow operation names that repeat the resource',
		},
		messages: {
			repeatsResource:
				'The operation name "{{ name }}" repeats the resource "{{ resource }}", which the editor shows above it. Name only the action (for example "{{ verb }}"). Name an object only when it is not the resource (for example "Get Columns" for a table).',
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
				if (!isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				if (!description) return;

				const properties = findArrayLiteralProperty(description, 'properties');
				for (const parameter of properties?.elements ?? []) {
					if (parameter?.type !== AST_NODE_TYPES.ObjectExpression) continue;

					const nameProperty = findObjectProperty(parameter, 'name');
					const typeProperty = findObjectProperty(parameter, 'type');
					if (
						!nameProperty ||
						getStringLiteralValue(nameProperty.value) !== 'operation' ||
						!typeProperty ||
						getStringLiteralValue(typeProperty.value) !== 'options'
					) {
						continue;
					}

					const displayOptions = findObjectProperty(parameter, 'displayOptions');
					if (displayOptions?.value.type !== AST_NODE_TYPES.ObjectExpression) continue;

					const show = findObjectProperty(displayOptions.value, 'show');
					if (show?.value.type !== AST_NODE_TYPES.ObjectExpression) continue;

					const resources = findArrayLiteralProperty(show.value, 'resource');
					if (resources?.elements.length !== 1) continue;

					const resourceNode = resources.elements[0];
					const resource = resourceNode ? getStringLiteralValue(resourceNode) : null;
					if (!resource) continue;

					const normalizedResource = getWords(resource).join(' ').toLowerCase();
					if (!normalizedResource) continue;

					const options = findArrayLiteralProperty(parameter, 'options');
					for (const option of options?.elements ?? []) {
						if (option?.type !== AST_NODE_TYPES.ObjectExpression) continue;

						const optionName = findObjectProperty(option, 'name');
						const name = optionName ? getStringLiteralValue(optionName.value) : null;
						if (!optionName || !name) continue;

						const words = getWords(name);
						const resourceIndex = words.findIndex((_, index) =>
							matchesResource(words.slice(index), normalizedResource),
						);
						if (resourceIndex === -1) continue;

						context.report({
							node: optionName.value,
							messageId: 'repeatsResource',
							data: {
								name,
								resource,
								verb: resourceIndex === 0 ? 'Get' : words.slice(0, resourceIndex).join(' '),
							},
						});
					}
				}
			},
		};
	},
});
