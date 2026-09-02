import { ESLintUtils } from '@typescript-eslint/utils';
import type { Node, VAttribute, VDirective, VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getStaticAttributeValue,
	isFocusableElement,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

function findHiddenAttributes(node: VElement): Array<VAttribute | VDirective> {
	const attributes: Array<VAttribute | VDirective> = [];
	let current: Node | null | undefined = node;
	while (current) {
		if (current.type === 'VElement' && current.rawName.toLowerCase() !== 'template') {
			const attribute = getAttribute(current, 'aria-hidden');
			if (getStaticAttributeValue(attribute)?.trim().toLowerCase() === 'true' && attribute) {
				attributes.push(attribute);
			}
		}
		current = current.parent;
	}
	return attributes;
}

export const NoAriaHiddenOnFocusableRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Disallow aria-hidden on focusable elements and their ancestors' },
		messages: { hiddenFocusable: '`aria-hidden="true"` must not hide a focusable element.' },
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		const reported = new Set<VAttribute | VDirective>();
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				if (!isFocusableElement(node)) return;
				for (const attribute of findHiddenAttributes(node)) {
					if (reported.has(attribute)) continue;
					reported.add(attribute);
					context.report({ node: toESTreeNode(attribute), messageId: 'hiddenFocusable' });
				}
			},
		});
	},
});
