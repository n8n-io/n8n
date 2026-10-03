import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	getPropertyKeyName,
	getStringLiteralValue,
	isFileType,
} from '../utils/index.js';

const CONFIGURABLE_ID_NAME =
	/^(?:partner|affiliate|reseller|account|tenant|customer|client)(?:[_-]?id)$/i;

export const NoHardcodedIdsRule = createRule({
	name: 'no-hardcoded-ids',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow fixed partner and other account identifiers in community node source.',
		},
		messages: {
			hardcodedId:
				'Hardcoded `{{ name }}`. Read this ID from a node parameter or credential so users can configure it.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts') && !isFileType(context.filename, '.node.js')) {
			return {};
		}

		const check = (name: string | null, value: TSESTree.Node | null | undefined) => {
			if (
				!name ||
				!value ||
				!CONFIGURABLE_ID_NAME.test(name) ||
				getStringLiteralValue(value) === null
			) {
				return;
			}

			context.report({ node: value, messageId: 'hardcodedId', data: { name } });
		};

		return {
			VariableDeclarator(node) {
				if (node.id.type === AST_NODE_TYPES.Identifier) check(node.id.name, node.init);
			},
			PropertyDefinition(node) {
				check(getPropertyKeyName(node), node.value);
			},
			Property(node) {
				check(getPropertyKeyName(node), node.value);
			},
			AssignmentExpression(node) {
				if (node.left.type === AST_NODE_TYPES.Identifier) {
					check(node.left.name, node.right);
				} else if (node.left.type === AST_NODE_TYPES.MemberExpression) {
					const name = node.left.computed
						? getStringLiteralValue(node.left.property)
						: node.left.property.type === AST_NODE_TYPES.Identifier
							? node.left.property.name
							: null;
					check(name, node.right);
				}
			},
		};
	},
});
