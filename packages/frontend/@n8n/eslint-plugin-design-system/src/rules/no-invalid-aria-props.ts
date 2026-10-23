import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';
import type { VAttribute, VDirective, VElement } from 'vue-eslint-parser/ast/nodes';

const VALID_ARIA_PROPERTIES = new Set([
	'aria-activedescendant',
	'aria-atomic',
	'aria-autocomplete',
	'aria-braillelabel',
	'aria-brailleroledescription',
	'aria-busy',
	'aria-checked',
	'aria-colcount',
	'aria-colindex',
	'aria-colindextext',
	'aria-colspan',
	'aria-controls',
	'aria-current',
	'aria-describedby',
	'aria-description',
	'aria-details',
	'aria-disabled',
	'aria-dropeffect',
	'aria-errormessage',
	'aria-expanded',
	'aria-flowto',
	'aria-grabbed',
	'aria-haspopup',
	'aria-hidden',
	'aria-invalid',
	'aria-keyshortcuts',
	'aria-label',
	'aria-labelledby',
	'aria-level',
	'aria-live',
	'aria-modal',
	'aria-multiline',
	'aria-multiselectable',
	'aria-orientation',
	'aria-owns',
	'aria-placeholder',
	'aria-posinset',
	'aria-pressed',
	'aria-readonly',
	'aria-relevant',
	'aria-required',
	'aria-roledescription',
	'aria-rowcount',
	'aria-rowindex',
	'aria-rowindextext',
	'aria-rowspan',
	'aria-selected',
	'aria-setsize',
	'aria-sort',
	'aria-valuemax',
	'aria-valuemin',
	'aria-valuenow',
	'aria-valuetext',
]);

type TemplateVisitor = Record<string, (node: VElement) => void>;

type VueParserServices = {
	defineTemplateBodyVisitor: (visitor: TemplateVisitor) => RuleListener;
};

function getAriaPropertyName(attribute: VAttribute | VDirective) {
	if (!attribute.directive) return attribute.key.name;

	if (attribute.key.name.name === 'bind' && attribute.key.argument?.type === 'VIdentifier') {
		return attribute.key.argument.name;
	}

	return undefined;
}

function isInvalidAriaProperty(name: string | undefined): name is string {
	return name?.startsWith('aria-') === true && !VALID_ARIA_PROPERTIES.has(name);
}

export const NoInvalidAriaPropsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow ARIA attributes that are not defined by WAI-ARIA 1.2',
		},
		messages: {
			invalidAriaProp: '`{{name}}` is not a valid WAI-ARIA 1.2 attribute.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};

		return parserServices.defineTemplateBodyVisitor({
			VElement(node) {
				for (const attribute of node.startTag.attributes) {
					const name = getAriaPropertyName(attribute);
					if (!isInvalidAriaProperty(name)) continue;

					context.report({
						node: attribute.key as unknown as TSESTree.Node,
						messageId: 'invalidAriaProp',
						data: { name },
					});
				}
			},
		});
	},
});
