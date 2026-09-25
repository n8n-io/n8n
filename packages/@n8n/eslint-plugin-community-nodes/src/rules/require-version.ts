import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

// Official SemVer 2.0.0 regex (https://semver.org/), anchored.
const SEMVER_REGEX =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const RequireVersionRule = createRule({
	name: 'require-version',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require a valid "version" field in community node package.json',
		},
		messages: {
			missingVersion:
				'The package.json must have a "version" field. npm requires a valid semantic version (e.g. "1.0.0") to publish the package.',
			invalidVersion:
				'The "version" field must be a valid semantic version string (e.g. "1.0.0"), got {{ value }}.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				const versionProp = findJsonProperty(node, 'version');

				if (!versionProp) {
					context.report({
						node,
						messageId: 'missingVersion',
					});
					return;
				}

				const valueNode = versionProp.value;
				const value = valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : null;

				if (typeof value !== 'string' || !SEMVER_REGEX.test(value)) {
					const rawValue =
						valueNode.type === AST_NODE_TYPES.Literal ? String(valueNode.raw) : 'non-literal';
					context.report({
						node: versionProp,
						messageId: 'invalidVersion',
						data: { value: rawValue },
					});
				}
			},
		};
	},
});
