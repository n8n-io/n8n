import { useMutationObserver, usePreferredDark } from '@vueuse/core';
import { computed, ref } from 'vue';

export type AppliedTheme = 'light' | 'dark';

/**
 * The theme the editor shows. The editor sets `data-theme` on the body, or removes it to follow
 * the system. A module cannot read the editor's UI store, so it reads the same signal.
 */
export function useAppliedTheme() {
	const prefersDark = usePreferredDark();
	const bodyTheme = ref(document.body.getAttribute('data-theme'));

	useMutationObserver(
		document.body,
		() => {
			bodyTheme.value = document.body.getAttribute('data-theme');
		},
		{ attributes: true, attributeFilter: ['data-theme'] },
	);

	return computed<AppliedTheme>(() => {
		if (bodyTheme.value === 'dark' || bodyTheme.value === 'light') return bodyTheme.value;
		return prefersDark.value ? 'dark' : 'light';
	});
}
