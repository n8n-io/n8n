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

import { simpleTraverse } from '@typescript-eslint/typescript-estree';
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

		const reportIfMissingDefault = (node: TSESTree.ObjectExpression): void => {
			if (!isNodeParameter(node) || findObjectProperty(node, 'default') !== null) {
				return;
			}
			const nameProperty = findObjectProperty(node, 'name');
			context.report({
				node,
				messageId: 'missingDefault',
				data: { name: getStringLiteralValue(nameProperty?.value ?? null) ?? '' },
			});
		};

		return {
			// Scope to an INodeType class's `description`, then walk only that
			// subtree, so helper classes and object literals elsewhere in the file
			// (e.g. in method bodies) that share the parameter shape are ignored.
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;
				const description = findClassProperty(node, 'description');
				if (description?.value?.type !== AST_NODE_TYPES.ObjectExpression) return;

				simpleTraverse(description.value, {
					enter(child) {
						if (child.type === AST_NODE_TYPES.ObjectExpression) {
							reportIfMissingDefault(child);
						}
					},
				});
			},
		};
	},
});
