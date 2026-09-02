import { ESLintUtils } from '@typescript-eslint/utils';
import type { Node, VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getRole,
	getStaticAttributeValue,
	isDynamicAttribute,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

const IMPLICIT_ROLES: Record<string, string> = {
	article: 'article',
	aside: 'complementary',
	blockquote: 'blockquote',
	button: 'button',
	caption: 'caption',
	code: 'code',
	datalist: 'listbox',
	del: 'deletion',
	details: 'group',
	dialog: 'dialog',
	em: 'emphasis',
	fieldset: 'group',
	figure: 'figure',
	h1: 'heading',
	h2: 'heading',
	h3: 'heading',
	h4: 'heading',
	h5: 'heading',
	h6: 'heading',
	hr: 'separator',
	ins: 'insertion',
	li: 'listitem',
	main: 'main',
	mark: 'mark',
	menu: 'list',
	meter: 'meter',
	nav: 'navigation',
	ol: 'list',
	option: 'option',
	output: 'status',
	progress: 'progressbar',
	table: 'table',
	tbody: 'rowgroup',
	textarea: 'textbox',
	tfoot: 'rowgroup',
	thead: 'rowgroup',
	tr: 'row',
	ul: 'list',
};

function isInsideSectioningElement(node: VElement): boolean {
	const sectioningElements = new Set(['article', 'aside', 'main', 'nav', 'section']);
	let parent: Node | null | undefined = node.parent;
	while (parent) {
		if (parent.type === 'VElement' && sectioningElements.has(parent.rawName.toLowerCase())) {
			return true;
		}
		parent = parent.parent;
	}
	return false;
}

function getImplicitRole(node: VElement): string | undefined {
	const name = node.rawName.toLowerCase();
	if (name === 'header') return isInsideSectioningElement(node) ? undefined : 'banner';
	if (name === 'footer') return isInsideSectioningElement(node) ? undefined : 'contentinfo';
	if (name === 'form') {
		const label = getAttribute(node, 'aria-label') ?? getAttribute(node, 'aria-labelledby');
		return label && !isDynamicAttribute(label) ? 'form' : undefined;
	}
	if (name === 'a' || name === 'area') {
		const href = getAttribute(node, 'href');
		return href && !isDynamicAttribute(href) ? 'link' : undefined;
	}
	if (name === 'img') {
		const alt = getAttribute(node, 'alt');
		if (isDynamicAttribute(alt)) return undefined;
		return getStaticAttributeValue(alt) === '' ? undefined : 'img';
	}
	if (name === 'select') {
		const multiple = getAttribute(node, 'multiple');
		const size = getAttribute(node, 'size');
		if (isDynamicAttribute(multiple) || isDynamicAttribute(size)) return undefined;
		const hasMultiple = Boolean(multiple && getStaticAttributeValue(multiple) !== 'false');
		return hasMultiple || Number(getStaticAttributeValue(size) ?? '0') > 1 ? 'listbox' : 'combobox';
	}
	if (name === 'input') {
		const typeAttribute = getAttribute(node, 'type');
		if (isDynamicAttribute(typeAttribute)) return undefined;
		const type = getStaticAttributeValue(typeAttribute)?.toLowerCase() ?? 'text';
		if (getAttribute(node, 'list') && ['email', 'search', 'tel', 'text', 'url'].includes(type)) {
			return 'combobox';
		}
		if (type === 'checkbox') return 'checkbox';
		if (type === 'radio') return 'radio';
		if (type === 'range') return 'slider';
		if (type === 'number') return 'spinbutton';
		if (type === 'search') return 'searchbox';
		if (type === 'button' || type === 'image' || type === 'reset' || type === 'submit') {
			return 'button';
		}
		if (type === 'email' || type === 'tel' || type === 'text' || type === 'url') {
			return 'textbox';
		}
		return undefined;
	}
	return IMPLICIT_ROLES[name];
}

export const NoRedundantRolesRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow ARIA roles that duplicate native HTML semantics' },
		messages: {
			redundantRole:
				'`role="{{role}}"` duplicates the native semantics of `<{{element}}>`. Remove the role.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				const role = getRole(node);
				if (!role || role !== getImplicitRole(node)) return;
				const attribute = getAttribute(node, 'role');
				if (!attribute) return;
				context.report({
					node: toESTreeNode(attribute),
					messageId: 'redundantRole',
					data: { role, element: node.rawName },
				});
			},
		});
	},
});
