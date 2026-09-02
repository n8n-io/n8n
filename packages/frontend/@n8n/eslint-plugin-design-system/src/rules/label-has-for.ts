import { ESLintUtils } from '@typescript-eslint/utils';
import type { Node, VDocumentFragment, VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getStaticAttributeValue,
	isDynamicAttribute,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

const LABELABLE_ELEMENTS = new Set([
	'button',
	'input',
	'meter',
	'output',
	'progress',
	'select',
	'textarea',
]);

function hasNestedControl(node: VElement): boolean {
	for (const child of node.children) {
		if (child.type !== 'VElement') continue;
		if (LABELABLE_ELEMENTS.has(child.rawName.toLowerCase())) return true;
		if (hasNestedControl(child)) return true;
	}
	return false;
}

function getTemplateRoot(node: VElement): VDocumentFragment | undefined {
	let current: Node | null | undefined = node.parent;
	while (current && current.type !== 'VDocumentFragment') current = current.parent;
	return current?.type === 'VDocumentFragment' ? current : undefined;
}

function containsControlId(root: VDocumentFragment, id: string): boolean {
	function inspect(elements: VElement[]): boolean {
		for (const element of elements) {
			if (
				LABELABLE_ELEMENTS.has(element.rawName.toLowerCase()) &&
				getStaticAttributeValue(getAttribute(element, 'id')) === id
			) {
				return true;
			}
			const children = element.children.filter(function isElement(child): child is VElement {
				return child.type === 'VElement';
			});
			if (inspect(children)) return true;
		}
		return false;
	}
	return inspect(
		root.children.filter(function isElement(child): child is VElement {
			return child.type === 'VElement';
		}),
	);
}

export const LabelHasForRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Require labels to contain a form control or reference one by ID' },
		messages: {
			labelHasFor: 'Nest a form control in this label or match its `for` value to a control `id`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				if (node.rawName.toLowerCase() !== 'label' || hasNestedControl(node)) return;
				const forAttribute = getAttribute(node, 'for');
				if (isDynamicAttribute(forAttribute)) return;
				const target = getStaticAttributeValue(forAttribute);
				const root = getTemplateRoot(node);
				if (target && root && containsControlId(root, target)) return;
				context.report({ node: toESTreeNode(node), messageId: 'labelHasFor' });
			},
		});
	},
});
