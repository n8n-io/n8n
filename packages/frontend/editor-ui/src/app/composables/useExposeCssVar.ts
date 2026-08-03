import { useCssVar } from '@vueuse/core';
import { onBeforeUnmount, toValue, watch, type MaybeRef } from 'vue';

/**
 * Composable to exposes CSS variable globally
 */
export function useExposeCssVar(name: string, value: MaybeRef<string>) {
	const originalValue = document.documentElement.style.getPropertyValue(name);
	const variable = useCssVar(name);

	watch(
		() => toValue(value),
		(latest) => {
			variable.value = latest;
		},
		{ immediate: true },
	);

	onBeforeUnmount(() => {
		document.documentElement.style.setProperty(name, originalValue ?? null);
	});
}
