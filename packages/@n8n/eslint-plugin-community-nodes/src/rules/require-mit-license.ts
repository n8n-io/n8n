import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getStringLiteralValue } from '../utils/index.js';

const REQUIRED_LICENSE = 'MIT';

export const RequireMitLicenseRule = createRule({
	name: 'require-mit-license',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require the "license" field in community node package.json to be "MIT"',
		},
		fixable: 'code',
		messages: {
			missingLicense: `The package.json must have a "license" field set to "${REQUIRED_LICENSE}".`,
			wrongLicense: `The "license" field must be "${REQUIRED_LICENSE}".`,
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

				const licenseProp = findJsonProperty(node, 'license');

				if (!licenseProp) {
					context.report({
						node,
						messageId: 'missingLicense',
						fix(fixer) {
							const lastProp = node.properties[node.properties.length - 1];
							if (!lastProp) {
								return fixer.replaceText(node, `{ "license": "${REQUIRED_LICENSE}" }`);
							}
							return fixer.insertTextAfter(lastProp, `, "license": "${REQUIRED_LICENSE}"`);
						},
					});
					return;
				}

				if (getStringLiteralValue(licenseProp.value) === REQUIRED_LICENSE) {
					return;
				}

				context.report({
					node: licenseProp.value,
					messageId: 'wrongLicense',
					fix(fixer) {
						return fixer.replaceText(licenseProp.value, `"${REQUIRED_LICENSE}"`);
					},
				});
			},
		};
	},
});
