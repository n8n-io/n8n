import { useCssVar } from '@vueuse/core';
import { onBeforeUnmount } from 'vue';

/**
 * useCssVar from @vueuse/core with cleanup of the variable when the component is unmounted
 */
export function useCssVarWithCleanup(name: string) {
	const variable = useCssVar(name);

	onBeforeUnmount(() => {
		document.documentElement.style.removeProperty(name);
	});

	return variable;
}
