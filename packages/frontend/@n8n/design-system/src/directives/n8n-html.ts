import xss, { whiteList } from 'xss';
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
	xss(html, {
		whiteList: {
			...whiteList,
			img: ['src', 'alt', 'title', 'width', 'height'],
			input: ['type', 'id', 'checked'],
			code: ['class'],
			a: [...(whiteList.a || []), 'data-*'],
			div: ['class'],
		},
		stripIgnoreTag: true,
		stripIgnoreTagBody: ['script'],
	});

export const n8nHtml: FunctionDirective<HTMLElement, string> = (
	el: HTMLElement,
	binding: DirectiveBinding<string>,
) => {
	if (binding.value !== binding.oldValue) {
		el.innerHTML = configuredSanitize(binding.value);
	}
};
