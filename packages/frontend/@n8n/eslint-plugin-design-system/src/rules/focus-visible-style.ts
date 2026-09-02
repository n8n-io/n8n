import { ESLintUtils } from '@typescript-eslint/utils';
import type { VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getStaticAttributeValue,
	isFocusableElement,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFocusSelectors(source: string): string[] {
	const styles = Array.from(source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi));
	const selectors: string[] = [];
	for (const style of styles) {
		for (const match of style[1]?.matchAll(/([^{}]+)\{/g) ?? []) {
			for (const selector of match[1]?.split(',') ?? []) {
				if (/:focus(?:-visible)?\b/.test(selector)) selectors.push(selector.trim());
			}
		}
	}
	return selectors;
}

function selectorMatchesElement(selector: string, node: VElement): boolean {
	const focusPosition = selector.search(/:focus(?:-visible)?\b/);
	if (focusPosition < 0) return false;
	const subject = selector.slice(0, focusPosition);
	if (subject.trim() === '') return true;
	if (/(?:^|[\s>+~])\*[^\s>+~]*$/.test(subject)) return true;
	const tag = escapeRegExp(node.rawName.toLowerCase());
	if (new RegExp(`(?:^|[\\s>+~])${tag}(?:[.#[:][^\\s>+~]*)?$`, 'i').test(subject)) return true;
	const id = getStaticAttributeValue(getAttribute(node, 'id'));
	if (id && new RegExp(`#${escapeRegExp(id)}(?:[^\\s>+~]*)$`).test(subject)) return true;
	const classes = getStaticAttributeValue(getAttribute(node, 'class'))?.split(/\s+/) ?? [];
	if (
		classes.some(function classMatches(name) {
			return name.length > 0 && new RegExp(`\\.${escapeRegExp(name)}(?:[^\\s>+~]*)$`).test(subject);
		})
	)
		return true;
	if (getAttribute(node, 'tabindex') && /\[tabindex(?:[\^$*~|]?=[^\]]+)?\][^\s>+~]*$/.test(subject))
		return true;
	if (getAttribute(node, 'href') && /\[href(?:[\^$*~|]?=[^\]]+)?\][^\s>+~]*$/.test(subject))
		return true;
	return false;
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
