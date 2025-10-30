import sanitize from 'sanitize-html';
import type { DirectiveBinding, FunctionDirective } from 'vue';

/**
 * Custom directive `n8nHtml` to replace v-html from Vue to sanitize content.
 *
 * Usage:
 * In your Vue template, use the directive `v-n8n-html` passing the unsafe HTML.
 *
 * Example:
 * <p v-n8n-html="'<a href="https://site.com" onclick="alert(1)">link</a>'">
 *
 * Compiles to: <p><a href="https://site.com">link</a></p>
 *
 * Hint: Do not use it on components
 * https://vuejs.org/guide/reusability/custom-directives#usage-on-components
 */

const configuredSanitize = (html: string) =>
	sanitize(html, {
		allowedTags: sanitize.defaults.allowedTags.concat(['img', 'input']),
		allowedAttributes: {
			...sanitize.defaults.allowedAttributes,
			input: ['type', 'id', 'checked'],
			code: ['class'],
			a: sanitize.defaults.allowedAttributes.a.concat(['data-*']),
			div: ['class'],
		},
	});

export const n8nHtml: FunctionDirective<HTMLElement, string> = (
	el: HTMLElement,
	binding: DirectiveBinding<string>,
) => {
	if (binding.value !== binding.oldValue) {
		el.innerHTML = configuredSanitize(binding.value);
	}
};
