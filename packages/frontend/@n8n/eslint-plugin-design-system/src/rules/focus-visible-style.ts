import { ESLintUtils } from '@typescript-eslint/utils';
import type { VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getStaticAttributeValue,
	isFocusableElement,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

const FOCUS_PSEUDO_CLASS = /:focus(?:-visible)?(?![-\w])/;

function getFocusSelectors(source: string): string[] {
	const styles = Array.from(source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi));
	const selectors: string[] = [];
	for (const style of styles) {
		const content = style[1] ?? '';
		for (const nested of content.matchAll(/([^{}]+)\{[^{}]*?(&[^{}]+)\{/g)) {
			const parents = nested[1]?.split(',') ?? [];
			const children = nested[2]?.split(',') ?? [];
			for (const parent of parents) {
				for (const child of children) {
					const selector = child.replaceAll('&', parent.trim()).trim();
					if (FOCUS_PSEUDO_CLASS.test(selector)) selectors.push(selector);
				}
			}
		}
		for (const match of content.matchAll(/([^{}]+)\{/g)) {
			for (const selector of match[1]?.split(',') ?? []) {
				if (FOCUS_PSEUDO_CLASS.test(selector)) selectors.push(selector.trim());
			}
		}
	}
	return selectors;
}

function selectorMatchesElement(selector: string, node: VElement): boolean {
	const focusPosition = selector.search(FOCUS_PSEUDO_CLASS);
	if (focusPosition < 0) return false;
	const subject = selector.slice(0, focusPosition).trim();
	if (subject === '' || subject === '*') return true;
	if (/[\s>+~&:]/.test(subject)) return false;

	const tag = subject.match(/^[a-z][\w-]*/i)?.[0];
	if (tag && tag.toLowerCase() !== node.rawName.toLowerCase()) return false;

	const id = getStaticAttributeValue(getAttribute(node, 'id'));
	for (const match of subject.matchAll(/#([\w-]+)/g)) {
		if (match[1] !== id) return false;
	}
	const classes = new Set(getStaticAttributeValue(getAttribute(node, 'class'))?.split(/\s+/) ?? []);
	for (const match of subject.matchAll(/\.([\w-]+)/g)) {
		if (!match[1] || !classes.has(match[1])) return false;
	}
	for (const match of subject.matchAll(/\[([\w-]+)(?:=['"]?([^'"\]]+)['"]?)?\]/g)) {
		const attribute = getAttribute(node, match[1] ?? '');
		if (!attribute) return false;
		if (match[2] !== undefined && getStaticAttributeValue(attribute) !== match[2]) return false;
	}
	return /^(?:[a-z][\w-]*)?(?:[.#][\w-]+|\[[^\]]+\])+$|^[a-z][\w-]*$/i.test(subject);
}

export const FocusVisibleStyleRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Require a focus or focus-visible style for focusable elements' },
		messages: {
			missingFocusStyle:
				'Add a matching `:focus-visible` or `:focus` style for this focusable element.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		const selectors = getFocusSelectors(context.sourceCode.text);
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				if (!isFocusableElement(node)) return;
				if (
					selectors.some(function matches(selector) {
						return selectorMatchesElement(selector, node);
					})
				)
					return;
				context.report({ node: toESTreeNode(node), messageId: 'missingFocusStyle' });
			},
		});
	},
});
