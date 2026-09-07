import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

export const RequireFilesArrayRule = createRule({
	name: 'require-files-array',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require a non-empty "files" array in package.json',
		},
		messages: {
			filesMissing:
				'package.json must have a "files" field with a non-empty array of files to publish.',
			filesEmpty: 'The "files" field must be a non-empty array.',
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
				const root = getTopLevelObjectInJson(node);
				if (!root) {
					return;
				}

				const filesProp = findJsonProperty(root, 'files');
				if (!filesProp) {
					context.report({ node: root, messageId: 'filesMissing' });
					return;
				}

				const filesValue = filesProp.value;

				if (
					filesValue.type !== AST_NODE_TYPES.ArrayExpression ||
					filesValue.elements.length === 0
				) {
					context.report({ node: filesProp, messageId: 'filesEmpty' });
				}
			},
		};
	},
});
