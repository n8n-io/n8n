import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

const REQUIRED_KEYWORD = 'n8n-community-node-package';

export const RequireCommunityNodeKeywordRule = createRule({
	name: 'require-community-node-keyword',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require the "n8n-community-node-package" keyword in community node package.json',
		},
		fixable: 'code',
		messages: {
			missingKeyword: `The "keywords" array must include "${REQUIRED_KEYWORD}". This keyword is required for n8n to discover community node packages.`,
			missingKeywordsArray: `The package.json must have a "keywords" array containing "${REQUIRED_KEYWORD}".`,
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
				const topLevel = getTopLevelObjectInJson(node);
				if (!topLevel) {
					return;
				}

				const keywordsProp = findJsonProperty(topLevel, 'keywords');

				if (!keywordsProp) {
					context.report({
						node: topLevel,
						messageId: 'missingKeywordsArray',
						fix(fixer) {
							const lastProp = topLevel.properties[topLevel.properties.length - 1];
							if (!lastProp) {
								return fixer.replaceText(topLevel, `{ "keywords": ["${REQUIRED_KEYWORD}"] }`);
							}
							return fixer.insertTextAfter(lastProp, `, "keywords": ["${REQUIRED_KEYWORD}"]`);
						},
					});
					return;
				}

				if (keywordsProp.value.type !== AST_NODE_TYPES.ArrayExpression) {
					return;
				}

				const keywordsArray = keywordsProp.value;
				const hasRequiredKeyword = keywordsArray.elements.some(
					(element) =>
						element?.type === AST_NODE_TYPES.Literal && element.value === REQUIRED_KEYWORD,
				);

				if (!hasRequiredKeyword) {
					context.report({
						node: keywordsProp,
						messageId: 'missingKeyword',
						fix(fixer) {
							const lastElement = keywordsArray.elements[keywordsArray.elements.length - 1];
							if (!lastElement) {
								return fixer.replaceText(keywordsArray, `["${REQUIRED_KEYWORD}"]`);
							}
							return fixer.insertTextAfter(lastElement, `, "${REQUIRED_KEYWORD}"`);
						},
					});
				}
			},
		};
	},
});
