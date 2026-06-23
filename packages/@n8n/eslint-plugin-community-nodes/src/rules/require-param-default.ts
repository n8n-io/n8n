/**
 * Requires every node parameter to declare a `default` property.
 *
 * A parameter is detected structurally: an object literal inside a node's
 * `description` with `displayName`, `name`, and `type` all set to string
 * literals — the shape every `INodeProperties` entry has. This avoids
 * hardcoding the `NodePropertyTypes` union (which would silently go stale as
 * new types are added) and naturally excludes `options`-array entries, which
 * carry `name`/`value` but no `displayName`/`type`.
 *
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

/** Property keys an `INodeProperties` parameter always carries as string literals. */
const REQUIRED_PARAM_KEYS = ['displayName', 'name', 'type'] as const;

/** Returns true when the object literal has the shape of a node parameter. */
function isNodeParameter(node: TSESTree.ObjectExpression): boolean {
	return REQUIRED_PARAM_KEYS.every((key) => {
		const property = findObjectProperty(node, key);
		return property !== null && getStringLiteralValue(property.value) !== null;
	});
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
