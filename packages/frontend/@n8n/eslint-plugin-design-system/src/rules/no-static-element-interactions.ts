import { ESLintUtils } from '@typescript-eslint/utils';
import type { VAttribute, VDirective, VElement } from 'vue-eslint-parser/ast/nodes';

import {
	getAttribute,
	getRole,
	INTERACTIVE_ROLES,
	isCustomElement,
	isDynamicAttribute,
	isNativeInteractiveElement,
	toESTreeNode,
	type VueParserServices,
} from './a11y-utils.js';

const INTERACTION_EVENTS = new Set([
	'click',
	'dblclick',
	'mousedown',
	'mouseup',
	'pointerdown',
	'pointerup',
	'touchend',
	'touchstart',
]);

function isPropagationOnlyHandler(attribute: VAttribute | VDirective): boolean {
	if (!attribute.directive || attribute.key.name.name !== 'on') return false;
	const hasStopModifier = attribute.key.modifiers.some(function isStopModifier(modifier) {
		return modifier.name === 'stop';
	});
	return hasStopModifier && !attribute.value?.expression;
}

function isInteractionHandler(attribute: VAttribute | VDirective): boolean {
	return (
		attribute.directive &&
		attribute.key.name.name === 'on' &&
		attribute.key.argument?.type === 'VIdentifier' &&
		INTERACTION_EVENTS.has(attribute.key.argument.name) &&
		!isPropagationOnlyHandler(attribute)
	);
}

function hasInteractionHandler(node: VElement): boolean {
	return node.startTag.attributes.some(isInteractionHandler);
}

export const NoStaticElementInteractionsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require interactive semantics on static elements with interaction handlers',
		},
		messages: {
			staticInteraction: 'Use an interactive HTML element or add an appropriate interactive role.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};
		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				if (
					isCustomElement(node) ||
					isNativeInteractiveElement(node) ||
					!hasInteractionHandler(node)
				)
					return;
				const roleAttribute = getAttribute(node, 'role');
				if (isDynamicAttribute(roleAttribute) || INTERACTIVE_ROLES.has(getRole(node) ?? '')) return;
				const handler = node.startTag.attributes.find(isInteractionHandler);
				context.report({ node: toESTreeNode(handler ?? node), messageId: 'staticInteraction' });
			},
		});
	},
});
