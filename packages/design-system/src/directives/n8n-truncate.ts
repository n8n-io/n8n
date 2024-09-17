import type { DirectiveBinding, ObjectDirective } from 'vue';
import { truncate } from '../utils/string';

export const n8nTruncate: ObjectDirective = {
	mounted(el: HTMLElement, binding: DirectiveBinding) {
		el.textContent = truncate(el.textContent ?? '', Number(binding.arg) || undefined);
	},
	updated(el: HTMLElement, binding: DirectiveBinding) {
		el.textContent = truncate(el.textContent ?? '', Number(binding.arg) || undefined);
	},
};
