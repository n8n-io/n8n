import { ESLintUtils } from '@typescript-eslint/utils';

import { getAttribute, getRole, toESTreeNode, type VueParserServices } from './a11y-utils.js';

const REQUIRED_PROPERTIES: Record<string, string[]> = {
	checkbox: ['aria-checked'],
	combobox: ['aria-controls', 'aria-expanded'],
	heading: ['aria-level'],
	menuitemcheckbox: ['aria-checked'],
	menuitemradio: ['aria-checked'],
	meter: ['aria-valuenow'],
	option: ['aria-selected'],
	radio: ['aria-checked'],
	scrollbar: ['aria-controls', 'aria-valuenow'],
	slider: ['aria-valuenow'],
	spinbutton: ['aria-valuenow'],
	switch: ['aria-checked'],
	tab: ['aria-selected'],
};

export const RoleHasRequiredAriaPropsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Require the ARIA properties that an explicit role needs' },
		messages: { missingProperty: '`role="{{role}}"` requires `{{property}}`.' },
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				const role = getRole(node);
				if (!role) return;
				for (const property of REQUIRED_PROPERTIES[role] ?? []) {
					if (getAttribute(node, property)) continue;
					const roleAttribute = getAttribute(node, 'role');
					if (!roleAttribute) return;
					context.report({
						node: toESTreeNode(roleAttribute),
						messageId: 'missingProperty',
						data: { role, property },
					});
				}
			},
		});
	},
});
