import { ESLintUtils } from '@typescript-eslint/utils';

import { getAttributeName, toESTreeNode, type VueParserServices } from './a11y-utils.js';

export const NoAccessKeyRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Disallow accesskey because it can conflict with keyboard shortcuts' },
		messages: { noAccessKey: 'Do not use `accesskey`. It can conflict with keyboard shortcuts.' },
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				for (const attribute of node.startTag.attributes) {
					if (getAttributeName(attribute) !== 'accesskey') continue;
					context.report({ node: toESTreeNode(attribute), messageId: 'noAccessKey' });
				}
			},
		});
	},
});
