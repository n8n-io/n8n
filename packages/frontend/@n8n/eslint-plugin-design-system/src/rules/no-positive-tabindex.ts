import { ESLintUtils } from '@typescript-eslint/utils';

import {
	getAttribute,
	getStaticAttributeValue,
	isDynamicAttribute,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

export const NoPositiveTabindexRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Disallow positive tabindex values' },
		messages: {
			positiveTabindex: 'Use `tabindex="0"` or `tabindex="-1"` instead of a positive value.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				const attribute = getAttribute(node, 'tabindex');
				if (!attribute || isDynamicAttribute(attribute)) return;
				const value = Number(getStaticAttributeValue(attribute));
				if (!Number.isFinite(value) || value <= 0) return;
				context.report({ node: toESTreeNode(attribute), messageId: 'positiveTabindex' });
			},
		});
	},
});
