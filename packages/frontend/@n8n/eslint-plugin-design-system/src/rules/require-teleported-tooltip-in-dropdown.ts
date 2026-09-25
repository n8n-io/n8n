import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';
import type { Node, VAttribute, VDirective, VElement } from 'vue-eslint-parser/ast/nodes';

const TOOLTIP_NAMES = new Set(['N8nTooltip', 'n8n-tooltip']);
const DROPDOWN_NAMES = new Set(['N8nDropdownMenu', 'n8n-dropdown-menu']);

type TemplateVisitor = Record<string, (node: VElement) => void>;

type VueParserServices = {
	defineTemplateBodyVisitor: (visitor: TemplateVisitor) => RuleListener;
};

const isInsideDropdown = (node: VElement) => {
	let parent: Node | null | undefined = node.parent;

	while (parent) {
		if (parent.type === 'VElement' && DROPDOWN_NAMES.has(parent.rawName)) return true;
		parent = parent.parent;
	}

	return false;
};

const isTeleportedAttribute = (attribute: VAttribute | VDirective) => {
	if (!attribute.directive) return attribute.key.name === 'teleported';

	return (
		attribute.key.name.name === 'bind' &&
		attribute.key.argument?.type === 'VIdentifier' &&
		attribute.key.argument.name === 'teleported'
	);
};

const guaranteesTeleportation = (attribute: VAttribute | VDirective) => {
	if (!attribute.directive) {
		return (
			attribute.value === null || attribute.value.value === '' || attribute.value.value === 'true'
		);
	}

	const expression = attribute.value?.expression;
	return expression?.type === 'Literal' && expression.value === true;
};

export const RequireTeleportedTooltipInDropdownRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require tooltips inside dropdown menus to be teleported to avoid clipping',
		},
		messages: {
			requireTeleported:
				'N8nTooltip inside N8nDropdownMenu must be teleported to avoid being clipped by the menu.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};

		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				if (!TOOLTIP_NAMES.has(node.rawName) || !isInsideDropdown(node)) return;

				const attribute = node.startTag.attributes.find(isTeleportedAttribute);
				if (!attribute || guaranteesTeleportation(attribute)) return;

				context.report({
					node: attribute as unknown as TSESTree.Node,
					messageId: 'requireTeleported',
				});
			},
		});
	},
});
