import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';
import type { VueParserServices } from './vue-parser-services.js';

/**
 * Attributes that commonly contain user-visible text in Vue templates.
 * These should use i18n ($t or i18n.baseText) instead of hardcoded strings.
 */
const UI_TEXT_ATTRIBUTES = new Set([
	'label',
	'placeholder',
	'title',
	'description',
	'tooltip',
	'message',
	'subtitle',
	'heading',
	'button-label',
	'confirm-text',
	'cancel-text',
	'empty-text',
]);

/**
 * Patterns that are NOT i18n violations — technical values that happen to be
 * string literals in the attributes above.
 */
function isTechnicalValue(value: string): boolean {
	// CSS classes, selectors, or layout values
	if (/^[a-z][\w-]*$/.test(value)) return true;
	// Numbers or number-like values
	if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw)?$/.test(value)) return true;
	// URLs or paths
	if (/^(https?:\/\/|\/|#)/.test(value)) return true;
	// Empty strings
	if (value.trim() === '') return true;
	// Single character (likely icon or separator)
	if (value.length === 1) return true;
	// kebab-case or snake_case identifiers (technical values, not user-visible text)
	if (/^[a-z][a-z0-9]*([_-][a-z0-9]+)+$/.test(value)) return true;
	// camelCase or PascalCase identifiers
	if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(value) && !/[A-Z].*[a-z].*\s/.test(value)) return true;

	return false;
}

/**
 * Disallow hardcoded user-visible text in Vue template attributes.
 *
 * All UI text must use i18n — add translations to the @n8n/i18n package.
 * Use $t('key') or i18n.baseText('key') in templates.
 * See AGENTS.md for guidance.
 */
export const NoHardcodedUiTextRule: AnyRuleModule = {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow hardcoded user-visible text in Vue template attributes. Use i18n instead.',
		},
		messages: {
			useI18n:
				"UI text must use i18n. Use `$t('key')` or `i18n.baseText('key')` instead of hardcoded \"{{ text }}\". Add translations to the @n8n/i18n package. See AGENTS.md for guidance.",
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
					key: { name: string; rawName: string };
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
			key: { name: string; rawName: string };
			value?: { value: string } | null;
		}) {
			const attrName = node.key.rawName.toLowerCase();
			if (!UI_TEXT_ATTRIBUTES.has(attrName)) return;
			if (!node.value) return;

			const text = node.value.value;
			if (isTechnicalValue(text)) return;

			context.report({
				// @ts-expect-error Vue AST node is compatible with ESLint report
				node,
				messageId: 'useI18n',
				data: { text },
			});
		}
	},
};
