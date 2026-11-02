import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findNodeDescriptionObject,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

/**
 * The 95th percentile of `hint` length in first-party nodes, so the limit only
 * cuts the long tail. A hint renders inline under the field, where long text
 * pushes the rest of the parameter panel down.
 */
const MAX_HINT_LENGTH = 120;

function isHintKey(key: TSESTree.Node): boolean {
	return (
		(key.type === AST_NODE_TYPES.Identifier && key.name === 'hint') ||
		(key.type === AST_NODE_TYPES.Literal && key.value === 'hint')
	);
}

export const HintMaxLengthRule = createRule({
	name: 'hint-max-length',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Limit the length of a node property "hint"',
		},
		messages: {
			hintTooLong:
				'The "hint" is {{ length }} characters long, over the limit of {{ max }}. A hint is a short inline nudge. Move the longer text to "description", which renders as the tooltip.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const checkHint = (valueNode: TSESTree.Node): void => {
			const hint = getStringLiteralValue(valueNode);
			if (hint === null || hint.length <= MAX_HINT_LENGTH) {
				return;
			}

			context.report({
				node: valueNode,
				messageId: 'hintTooLong',
				data: { length: hint.length, max: MAX_HINT_LENGTH },
			});
		};

		// Properties nest through `properties` and the `options` of a collection,
		// so walk object and array values to reach every hint.
		const visit = (node: TSESTree.Node): void => {
			if (node.type === AST_NODE_TYPES.ObjectExpression) {
				for (const property of node.properties) {
					if (property.type !== AST_NODE_TYPES.Property) {
						continue;
					}
					if (isHintKey(property.key)) {
						checkHint(property.value);
					}
					visit(property.value);
				}
			} else if (node.type === AST_NODE_TYPES.ArrayExpression) {
				for (const element of node.elements) {
					if (element) {
						visit(element);
					}
				}
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const description = findNodeDescriptionObject(node);
				if (description) {
					visit(description);
				}
			},
		};
	},
});
