import sanitize from 'sanitize-html';
import type { DirectiveBinding, ObjectDirective } from 'vue';

const configuredSanitize = (html: string) =>
	sanitize(html, {
		allowedTags: sanitize.defaults.allowedTags.concat(['img', 'input']),
		allowedAttributes: {
			...sanitize.defaults.allowedAttributes,
			img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
			input: ['type', 'id', 'checked'],
		},
	});

export const n8nHtml: ObjectDirective = {
	beforeMount(el: HTMLElement, binding: DirectiveBinding<string>) {
		el.innerHTML = configuredSanitize(binding.value);
	},
	beforeUpdate(el: HTMLElement, binding: DirectiveBinding<string>) {
		el.innerHTML = configuredSanitize(binding.value);
	},
};
