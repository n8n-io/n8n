/**
 * Requires every node parameter to declare a `default` property.
 *
 * A parameter is any object literal inside a node's `description` that has both
 * a `name` and a `type` whose value is one of n8n's known parameter types.
 * Without a `default`, n8n cannot reliably initialise the parameter's value,
 * which leads to inconsistent runtime behaviour in the editor and on execution.
 */

import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

/** n8n's known node parameter types (see NodePropertyTypes in n8n-workflow). */
const KNOWN_PARAM_TYPES = new Set([
	'boolean',
	'button',
	'collection',
	'color',
	'dateTime',
	'fixedCollection',
	'hidden',
	'icon',
	'json',
	'callout',
	'notice',
	'multiOptions',
	'number',
	'options',
	'string',
	'credentialsSelect',
	'resourceLocator',
	'curlImport',
	'resourceMapper',
	'filter',
	'assignmentCollection',
	'credentials',
	'workflowSelector',
]);

/** Returns true when the object literal looks like a node parameter. */
function isNodeParameter(node: TSESTree.ObjectExpression): boolean {
	const nameProperty = findObjectProperty(node, 'name');
	if (nameProperty === null || getStringLiteralValue(nameProperty.value) === null) {
		return false;
	}

	const typeProperty = findObjectProperty(node, 'type');
	if (typeProperty === null) {
		return false;
	}

	const typeValue = getStringLiteralValue(typeProperty.value);
	return typeValue !== null && KNOWN_PARAM_TYPES.has(typeValue);
}

export const RequireParamDefaultRule = createRule({
	name: 'require-param-default',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require every node parameter to declare a default value.',
		},
		messages: {
			missingDefault:
				"Node parameter '{{ name }}' is missing a `default` value. Add a `default` property so the parameter initialises consistently.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const traverse = (node: TSESTree.Node): void => {
			if (node.type === AST_NODE_TYPES.ObjectExpression && isNodeParameter(node)) {
				if (findObjectProperty(node, 'default') === null) {
					const nameProperty = findObjectProperty(node, 'name');
					const name = getStringLiteralValue(nameProperty?.value ?? null) ?? '';
					context.report({
						node,
						messageId: 'missingDefault',
						data: { name },
					});
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
