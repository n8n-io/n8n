import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

export const RequireHomepageRule = createRule({
	name: 'require-homepage',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require a "homepage" field with a valid URL in package.json',
		},
		messages: {
			homepageMissing: 'package.json must have a "homepage" field.',
			homepageInvalid: 'The "homepage" field must be a valid URL (e.g. "https://example.com").',
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

				const homepageProp = findJsonProperty(root, 'homepage');
				if (!homepageProp) {
					context.report({ node: root, messageId: 'homepageMissing' });
					return;
				}

				const homepageValue = homepageProp.value;
				const isValidHomepage =
					homepageValue.type === AST_NODE_TYPES.Literal &&
					typeof homepageValue.value === 'string' &&
					isValidUrl(homepageValue.value);

				if (!isValidHomepage) {
					context.report({ node: homepageProp, messageId: 'homepageInvalid' });
				}
			},
		};
	},
});
