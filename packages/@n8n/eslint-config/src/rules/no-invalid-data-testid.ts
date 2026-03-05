import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';
import type { VueParserServices } from './vue-parser-services.js';

/**
 * Disallow spaces in `data-testid` attribute values.
 *
 * `data-testid` must be a single value (no spaces or multiple values).
 * Use 'my-element' not 'my element other'.
 * See AGENTS.md for guidance.
 */
export const NoInvalidDataTestidRule: AnyRuleModule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow spaces in `data-testid` attribute values.',
		},
		messages: {
			noSpacesInTestId:
				'`data-testid` must be a single value (no spaces). Use "my-element" not "my element other". See AGENTS.md for guidance.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as VueParserServices | undefined;

		// When vue-eslint-parser is available, use defineTemplateBodyVisitor
		if (parserServices?.defineTemplateBodyVisitor) {
			return parserServices.defineTemplateBodyVisitor({
				// eslint-disable-next-line @typescript-eslint/naming-convention
				VAttribute(node: {
					directive: boolean;
					key: { name: string };
					value?: { value: string } | null;
				}) {
					if (node.directive) return;
					checkAttribute(node);
				},
			});
		}

		// Fallback: no-op for non-Vue files
		return {};

		function checkAttribute(node: {
			key: { name: string };
			value?: { value: string } | null;
		}) {
			if (node.key.name !== 'data-testid') return;
			if (!node.value) return;

			if (/\s/.test(node.value.value)) {
				context.report({
					// @ts-expect-error Vue AST node is compatible with ESLint report
					node,
					messageId: 'noSpacesInTestId',
				});
			}
		}
	},
};
