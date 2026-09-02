import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';
import type { VAttribute, VDirective, VElement } from 'vue-eslint-parser/ast/nodes';

export interface TemplateVisitor {
	[selector: string]: {
		(node: VElement): void;
	};
}

export interface VueParserServices {
	defineTemplateBodyVisitor(visitor: TemplateVisitor): RuleListener;
}

export const ABSTRACT_ROLES = new Set([
	'command',
	'composite',
	'input',
	'landmark',
	'range',
	'roletype',
	'section',
	'sectionhead',
	'select',
	'structure',
	'widget',
	'window',
]);

export const VALID_ROLES = new Set([
	'alert',
	'alertdialog',
	'application',
	'article',
	'banner',
	'blockquote',
	'button',
	'caption',
	'cell',
	'checkbox',
	'code',
	'columnheader',
	'combobox',
	'complementary',
	'contentinfo',
	'definition',
	'deletion',
	'dialog',
	'directory',
	'document',
	'emphasis',
	'feed',
	'figure',
	'form',
	'generic',
	'grid',
	'gridcell',
	'group',
	'heading',
	'img',
	'insertion',
	'link',
	'list',
	'listbox',
	'listitem',
	'log',
	'main',
	'mark',
	'marquee',
	'math',
	'menu',
	'menubar',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'meter',
	'navigation',
	'none',
	'note',
	'option',
	'paragraph',
	'presentation',
	'progressbar',
	'radio',
	'radiogroup',
	'region',
	'row',
	'rowgroup',
	'rowheader',
	'scrollbar',
	'search',
	'searchbox',
	'separator',
	'slider',
	'spinbutton',
	'status',
	'strong',
	'subscript',
	'superscript',
	'switch',
	'tab',
	'table',
	'tablist',
	'tabpanel',
	'term',
	'textbox',
	'time',
	'timer',
	'toolbar',
	'tooltip',
	'tree',
	'treegrid',
	'treeitem',
]);

export const INTERACTIVE_ROLES = new Set([
	'button',
	'checkbox',
	'combobox',
	'gridcell',
	'link',
	'listbox',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'radio',
	'scrollbar',
	'searchbox',
	'slider',
	'spinbutton',
	'switch',
	'tab',
	'textbox',
	'treeitem',
]);

export const NATIVE_INTERACTIVE_ELEMENTS = new Set([
	'button',
	'input',
	'option',
	'select',
	'summary',
	'textarea',
]);

export function getAttribute(node: VElement, name: string): VAttribute | VDirective | undefined {
	return node.startTag.attributes.find(function findAttribute(attribute) {
		return getAttributeName(attribute) === name;
	});
}

export function getAttributeName(attribute: VAttribute | VDirective): string | undefined {
	if (!attribute.directive) return attribute.key.name;
	if (attribute.key.name.name !== 'bind' || attribute.key.argument?.type !== 'VIdentifier') {
		return undefined;
	}
	return attribute.key.argument.name;
}

export function getStaticAttributeValue(
	attribute: VAttribute | VDirective | undefined,
): string | undefined {
	if (!attribute) return undefined;
	if (!attribute.directive) return attribute.value?.value ?? '';
	const expression = attribute.value?.expression;
	if (expression?.type !== 'Literal') return undefined;
	if (
		typeof expression.value !== 'boolean' &&
		typeof expression.value !== 'string' &&
		typeof expression.value !== 'number'
	) {
		return undefined;
	}
	return String(expression.value);
}

export function isDynamicAttribute(attribute: VAttribute | VDirective | undefined): boolean {
	return Boolean(attribute?.directive && attribute.value?.expression?.type !== 'Literal');
}

export function getRole(node: VElement): string | undefined {
	return getStaticAttributeValue(getAttribute(node, 'role'))?.trim().split(/\s+/)[0];
}

export function isCustomElement(node: VElement): boolean {
	return node.rawName.includes('-') || /^[A-Z]/.test(node.rawName);
}

export function isNativeInteractiveElement(node: VElement): boolean {
	const name = node.rawName.toLowerCase();
	if (NATIVE_INTERACTIVE_ELEMENTS.has(name)) return true;
	if ((name === 'a' || name === 'area') && getAttribute(node, 'href')) return true;
	if ((name === 'audio' || name === 'video') && getAttribute(node, 'controls')) return true;
	return name === 'iframe';
}

export function isFocusableElement(node: VElement): boolean {
	const name = node.rawName.toLowerCase();
	if (getAttribute(node, 'hidden')) return false;
	if (
		['button', 'input', 'option', 'select', 'textarea'].includes(name) &&
		getAttribute(node, 'disabled')
	) {
		return false;
	}
	if (name === 'input' && getStaticAttributeValue(getAttribute(node, 'type')) === 'hidden') {
		return false;
	}
	const tabIndex = getStaticAttributeValue(getAttribute(node, 'tabindex'));
	if (tabIndex !== undefined && Number.isFinite(Number(tabIndex))) return true;
	const contentEditable = getAttribute(node, 'contenteditable');
	const contentEditableValue = getStaticAttributeValue(contentEditable);
	if (contentEditable && contentEditableValue !== 'false') return true;
	return isNativeInteractiveElement(node);
}

export function toESTreeNode(node: VElement | VAttribute | VDirective): TSESTree.Node {
	return node as unknown as TSESTree.Node;
}
