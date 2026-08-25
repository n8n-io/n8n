import sanitize from 'sanitize-html';
import type { DirectiveBinding, FunctionDirective } from 'vue';

/**
 * Custom directive `n8nHtml` to replace v-html from Vue to sanitize content.
 *
 * Usage:
 * In your Vue template, use the directive `v-n8n-html` passing the unsafe HTML.
 *
 * Register it locally in the component that uses it:
 * `import { n8nHtml as vN8nHtml } from '../../directives';`
 *
 * Do not rely on the global registration from `N8nPlugin`. A consumer that
 * installed no plugin gets an empty element, with no error and no console
 * warning in a production build. `n8n-html.registration.test.ts` guards this.
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

// Nullish is accepted because the bound value is usually an optional prop.
// Local registration type-checks the binding, and `string` alone would push a
// `?? ''` onto every call site instead of handling it once, here.
export const n8nHtml: FunctionDirective<HTMLElement, string | null | undefined> = (
	el: HTMLElement,
	binding: DirectiveBinding<string | null | undefined>,
) => {
	if (binding.value !== binding.oldValue) {
		el.innerHTML = configuredSanitize(binding.value ?? '');
	}
};
