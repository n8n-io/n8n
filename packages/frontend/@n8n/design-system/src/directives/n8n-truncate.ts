import { truncate } from '@n8n/utils/string/truncate';
import type { DirectiveBinding, ObjectDirective } from 'vue';

/**
 * Custom directive `n8nTruncate` to truncate text content of an HTML element.
 *
 * Usage:
 * In your Vue template, use the directive `v-n8n-truncate` with an argument to specify the length to truncate to.
 *
 * Example:
 * <p v-n8n-truncate:10>Some long text that will be truncated</p>
 *
 * This will truncate the text content of the paragraph to 10 characters.
 *
 * Hint: Do not use it on components
 * https://vuejs.org/guide/reusability/custom-directives#usage-on-components
 */

export const n8nTruncate: ObjectDirective = {
	mounted(el: HTMLElement, binding: DirectiveBinding) {
		el.textContent = truncate(el.textContent ?? '', Number(binding.arg) || undefined);
	},
	updated(el: HTMLElement, binding: DirectiveBinding) {
		el.textContent = truncate(el.textContent ?? '', Number(binding.arg) || undefined);
	},
};
