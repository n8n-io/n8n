import { ESLintUtils } from '@typescript-eslint/utils';

import {
	ABSTRACT_ROLES,
	getAttribute,
	getStaticAttributeValue,
	isDynamicAttribute,
	toESTreeNode,
	type VueParserServices,
	VALID_ROLES,
} from './a11y-utils.js';

export const NoInvalidAriaRoleRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Require ARIA roles to be valid and non-abstract' },
		messages: {
			abstractRole: '`{{role}}` is an abstract ARIA role. Use a non-abstract role.',
			invalidRole: '`{{role}}` is not a valid WAI-ARIA 1.2 role.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				const attribute = getAttribute(node, 'role');
				if (!attribute || isDynamicAttribute(attribute)) return;
				const roles = getStaticAttributeValue(attribute)?.trim().split(/\s+/) ?? [];
				for (const role of roles) {
					if (ABSTRACT_ROLES.has(role)) {
						context.report({
							node: toESTreeNode(attribute),
							messageId: 'abstractRole',
							data: { role },
						});
						return;
					}
					if (VALID_ROLES.has(role)) continue;
					context.report({
						node: toESTreeNode(attribute),
						messageId: 'invalidRole',
						data: { role },
					});
					return;
				}
			},
		});
	},
});
