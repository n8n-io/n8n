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

import {
	createRule,
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

		// Only lint object literals inside an INodeType class, so helper classes
		// in the same file that happen to share the parameter shape are ignored.
		let nodeClassDepth = 0;

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) nodeClassDepth++;
			},
			'ClassDeclaration:exit'(node) {
				if (isNodeTypeClass(node)) nodeClassDepth--;
			},
			ObjectExpression(node) {
				if (nodeClassDepth === 0 || !isNodeParameter(node)) {
					return;
				}
				if (findObjectProperty(node, 'default') !== null) {
					return;
				}

				const nameProperty = findObjectProperty(node, 'name');
				context.report({
					node,
					messageId: 'missingDefault',
					data: { name: getStringLiteralValue(nameProperty?.value ?? null) ?? '' },
				});
			},
		};
	},
});
