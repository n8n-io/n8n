import sanitize from 'sanitize-html';
import type { DirectiveBinding, ObjectDirective } from 'vue';

const configuredSanitize = (html: string) => sanitize(html, {
	allowedTags: sanitize.defaults.allowedTags.concat([ 'img' ])
});

export const n8nHtml: ObjectDirective = {
	beforeMount(el: HTMLElement, binding: DirectiveBinding) {
		el.innerHTML = configuredSanitize(binding.value);
	},
	beforeUpdate(el: HTMLElement, binding: DirectiveBinding) {
		el.innerHTML = configuredSanitize(binding.value);
	},
};
