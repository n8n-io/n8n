import { ESLintUtils } from '@typescript-eslint/utils';
import type { VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getStaticAttributeValue,
	isCustomElement,
	isFocusableElement,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

const FOCUS_PSEUDO_CLASS = /:focus(?:-visible)?(?![-\w])/;

function getFocusSelectors(source: string): string[] {
	const styles = Array.from(source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi));
	const focusSelectors: string[] = [];
	for (const style of styles) {
		const content = style[1] ?? '';
		const selectorStack: string[][] = [];
		let statementStart = 0;
		for (let index = 0; index < content.length; index++) {
			const character = content[index];
			if (character === ';') {
				statementStart = index + 1;
				continue;
			}
			if (character === '}') {
				selectorStack.pop();
				statementStart = index + 1;
				continue;
			}
			if (character !== '{') continue;

			const selectors = content
				.slice(statementStart, index)
				.trim()
				.split(',')
				.map(function trimSelector(selector) {
					return selector.trim();
				});
			const parents = selectorStack.at(-1) ?? [];
			const resolvedSelectors = selectors.flatMap(function resolveSelector(selector) {
				if (!selector.includes('&') || parents.length === 0) return [selector];
				return parents.map(function resolveParent(parent) {
					return selector.replaceAll('&', parent);
				});
			});
			for (const selector of resolvedSelectors) {
				if (FOCUS_PSEUDO_CLASS.test(selector)) focusSelectors.push(selector);
			}
			selectorStack.push(resolvedSelectors);
			statementStart = index + 1;
		}
	}
	return focusSelectors;
}

function getElementClasses(node: VElement): Set<string> {
	const classes = new Set(getStaticAttributeValue(getAttribute(node, 'class'))?.split(/\s+/) ?? []);
	const classAttribute = getAttribute(node, 'class');
	if (!classAttribute?.directive) return classes;

	const expression = classAttribute.value?.expression;
	if (
		expression?.type === 'MemberExpression' &&
		expression.object.type === 'Identifier' &&
		expression.object.name === '$style'
	) {
		if (!expression.computed && expression.property.type === 'Identifier') {
			classes.add(expression.property.name);
		} else if (expression.computed && expression.property.type === 'Literal') {
			classes.add(String(expression.property.value));
		}
	}
	return classes;
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
	const classes = getElementClasses(node);
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
				if (isCustomElement(node) || !isFocusableElement(node)) return;
				const tabIndex = getStaticAttributeValue(getAttribute(node, 'tabindex'))?.trim();
				if (tabIndex !== undefined && Number(tabIndex) < 0) return;
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
