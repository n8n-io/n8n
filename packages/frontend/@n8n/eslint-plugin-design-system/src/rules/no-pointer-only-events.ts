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

const POINTER_EVENTS = new Set(['mousedown', 'mouseup', 'pointerdown', 'pointerup']);
const KEYBOARD_EVENTS = new Set(['keydown', 'keyup', 'keypress']);

function getStaticEventName(attribute: VAttribute | VDirective): string | undefined {
	if (!attribute.directive || attribute.key.name.name !== 'on') return undefined;
	if (attribute.key.argument?.type !== 'VIdentifier') return undefined;
	return attribute.key.argument.name.toLowerCase();
}

function isPropagationOnlyHandler(attribute: VAttribute | VDirective): boolean {
	if (!attribute.directive || attribute.key.name.name !== 'on') return false;
	const hasStopModifier = attribute.key.modifiers.some(function isStopModifier(modifier) {
		return modifier.name === 'stop';
	});
	return hasStopModifier && !attribute.value?.expression;
}

function findEventHandler(
	node: VElement,
	events: ReadonlySet<string>,
): VAttribute | VDirective | undefined {
	return node.startTag.attributes.find(function matchesEvent(attribute) {
		const eventName = getStaticEventName(attribute);
		return eventName !== undefined && events.has(eventName) && !isPropagationOnlyHandler(attribute);
	});
}

export const NoPointerOnlyEventsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require keyboard or semantic activation for pointer event handlers',
		},
		messages: {
			pointerOnly:
				'Use an interactive HTML element, add an interactive role, or add an equivalent keyboard handler.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};

		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				const pointerHandler = findEventHandler(node, POINTER_EVENTS);
				if (!pointerHandler) return;
				if (isCustomElement(node) || isNativeInteractiveElement(node)) return;
				if (findEventHandler(node, KEYBOARD_EVENTS)) return;

				const roleAttribute = getAttribute(node, 'role');
				if (isDynamicAttribute(roleAttribute) || INTERACTIVE_ROLES.has(getRole(node) ?? '')) return;

				context.report({ node: toESTreeNode(pointerHandler), messageId: 'pointerOnly' });
			},
		});
	},
});
