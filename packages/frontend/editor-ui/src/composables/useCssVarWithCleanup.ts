import { useCssVar } from '@vueuse/core';
import { onBeforeUnmount } from 'vue';

/**
 * useCssVar from @vueuse/core with cleanup of the variable when the component is unmounted
 */
export function useCssVarWithCleanup(name: string) {
	const originalValue = document.documentElement.style.getPropertyValue(name);
	const variable = useCssVar(name);

	onBeforeUnmount(() => {
		document.documentElement.style.setProperty(name, originalValue ?? null);
	});

	return variable;
}
